import pytest
from datetime import date
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.tenant_db.models import (
    TenantBase,
    Voucher,
    VoucherType,
    Branch,
    BillingClient,
    Vendor,
    TaxCategory,
    SeriesMaster,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import (
    GeneralInvoiceCreate,
    GeneralInvoiceItemCreate,
    PurchaseBillCreate,
    PurchaseBillItemCreate,
    CreditDebitNoteCreate,
    VoidVoucherRequest,
)


@pytest.fixture
async def e2e_session():
    """Isolated in-memory SQLite database configured with full test fixtures."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Seed Branch
        ho = Branch(id=1, name="Mumbai Central Hub", code="MUM-HO", is_head_office=True, state="Maharashtra")
        session.add(ho)

        # 2. Seed Billing Client
        client = BillingClient(
            id=1,
            name="Reliance Logistics Ltd",
            gstin="27AAACR1234F1Z5",
            state="Maharashtra",
            is_active=True,
        )
        session.add(client)

        # 3. Seed Vendor
        vendor = Vendor(
            id=1,
            name="Shree Transport Co",
            gstin="27AABCS5678M1Z2",
            state="Maharashtra",
            is_active=True,
        )
        session.add(vendor)

        # 4. Seed Tax Category (18% GST)
        tc_18 = TaxCategory(
            id=1,
            name="GST 18%",
            code="GST_18",
            igst_rate=Decimal("18.00"),
            cgst_rate=Decimal("9.00"),
            sgst_rate=Decimal("9.00"),
            is_rcm=False,
            is_active=True,
        )
        session.add(tc_18)

        # 5. Seed Series for Credit and Debit Notes, General Invoice, Purchase Bill
        s_cn = SeriesMaster(
            id=1,
            document_type="CREDIT_NOTE",
            prefix="CN-2026-",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Credit Note Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        s_dn = SeriesMaster(
            id=2,
            document_type="DEBIT_NOTE",
            prefix="DN-2026-",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Debit Note Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        s_gi = SeriesMaster(
            id=3,
            document_type="GENERAL_INVOICE",
            prefix="GI-2026-",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default General Invoice Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        s_pb = SeriesMaster(
            id=4,
            document_type="NORMAL_PURCHASE",
            prefix="PB-2026-",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Purchase Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        session.add_all([s_cn, s_dn, s_gi, s_pb])
        await session.flush()

        # 6. Seed Chart of Accounts
        await accounts_service.ensure_standard_accounts(session)
        await session.commit()

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_sales_credit_note_reduces_customer_invoice_balance(e2e_session: AsyncSession):
    """
    Scenario 1: Customer Credit Note (Reduce Customer Bill)
    - Original Invoice: ₹25,000 + 18% GST (₹4,500) = ₹29,500
    - Credit Note: ₹5,000 + 18% GST (₹900) = ₹5,900
    - Double Entry:
        Dr. ACC_FREIGHT_REV ₹5,000
        Dr. ACC_GST_OUT_CGST ₹450
        Dr. ACC_GST_OUT_SGST ₹450
        Cr. ACC_SUNDRY_DEBTORS ₹5,900
    - Balance Effect:
        Invoice balance reduced to ₹23,600, payment_status becomes PARTIAL.
    """
    session = e2e_session

    # Create original customer invoice
    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_date=date(2026, 4, 1),
            items=[
                GeneralInvoiceItemCreate(
                    description="Freight Services Mumbai-Pune",
                    quantity=Decimal("1.00"),
                    rate=Decimal("25000.00"),
                    tax_category_id=1,
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )
    assert inv.net_amount == Decimal("29500.00")
    assert inv.balance_amount == Decimal("29500.00")

    # Issue Customer Credit Note (Sec 34 GST Note)
    cn = await accounts_service.create_credit_debit_note(
        session,
        CreditDebitNoteCreate(
            note_type="CREDIT_NOTE",
            note_category="SALES_CREDIT_NOTE",
            voucher_date=date(2026, 4, 5),
            is_gst_note=True,
            against_voucher_id=inv.id,
            billing_client_id=1,
            reason_code="02",
            reason_description="Volume Rebate / Approved Rate Difference",
            total_taxable_amount=Decimal("5000.00"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("900.00"),
            cgst_amount=Decimal("450.00"),
            sgst_amount=Decimal("450.00"),
            net_amount=Decimal("5900.00"),
            narration="Credit note for volume rebate on Mumbai-Pune freight",
        ),
        office_id=1,
    )

    assert cn.voucher_number.startswith("CN-")
    assert cn.voucher_type == "CREDIT_NOTE"
    assert cn.note_category == "SALES_CREDIT_NOTE"
    assert cn.net_amount == Decimal("5900.00")

    # Check balanced double-entry
    entries = cn.ledger_entries
    assert len(entries) >= 4
    total_debit = sum(e.debit_amount for e in entries)
    total_credit = sum(e.credit_amount for e in entries)
    assert total_debit == total_credit == Decimal("5900.00")

    debtor_entry = next(e for e in entries if e.account.code == "ACC_SUNDRY_DEBTORS")
    assert debtor_entry.credit_amount == Decimal("5900.00")
    rev_entry = next(e for e in entries if e.account.code == "ACC_FREIGHT_REV")
    assert rev_entry.debit_amount == Decimal("5000.00")

    # Verify original invoice balance
    inv_updated = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_updated.balance_amount == Decimal("23600.00")
    assert inv_updated.paid_amount == Decimal("5900.00")
    assert inv_updated.payment_status == "PARTIAL"


@pytest.mark.asyncio
async def test_sales_debit_note_increases_customer_receivable(e2e_session: AsyncSession):
    """
    Scenario 2: Customer Debit Note (Add Extra Customer Charge)
    - Additional detention charge: ₹3,000 + 18% GST (₹540) = ₹3,540
    - Double Entry:
        Dr. ACC_SUNDRY_DEBTORS ₹3,540
        Cr. ACC_FREIGHT_REV ₹3,000
        Cr. ACC_GST_OUT_CGST ₹270
        Cr. ACC_GST_OUT_SGST ₹270
    - Balance Effect:
        Invoice receivable balance increased by ₹3,540.
    """
    session = e2e_session

    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_date=date(2026, 4, 1),
            items=[
                GeneralInvoiceItemCreate(
                    description="Transportation to Nashik",
                    quantity=Decimal("1.00"),
                    rate=Decimal("10000.00"),
                    tax_category_id=1,
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )
    initial_balance = inv.balance_amount

    # Issue Customer Debit Note
    dn = await accounts_service.create_credit_debit_note(
        session,
        CreditDebitNoteCreate(
            note_type="DEBIT_NOTE",
            note_category="SALES_DEBIT_NOTE",
            voucher_date=date(2026, 4, 6),
            is_gst_note=True,
            against_voucher_id=inv.id,
            billing_client_id=1,
            reason_code="06",
            reason_description="Vehicle Detention at unloading warehouse (48 hrs)",
            total_taxable_amount=Decimal("3000.00"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("540.00"),
            cgst_amount=Decimal("270.00"),
            sgst_amount=Decimal("270.00"),
            net_amount=Decimal("3540.00"),
            narration="Detention charge approved by consignee",
        ),
        office_id=1,
    )

    assert dn.voucher_number.startswith("DN-")
    assert dn.voucher_type == "DEBIT_NOTE"
    assert dn.note_category == "SALES_DEBIT_NOTE"

    entries = dn.ledger_entries
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("3540.00")
    debtor_entry = next(e for e in entries if e.account.code == "ACC_SUNDRY_DEBTORS")
    assert debtor_entry.debit_amount == Decimal("3540.00")

    # Target invoice balance increased
    inv_updated = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_updated.balance_amount == initial_balance + Decimal("3540.00")


@pytest.mark.asyncio
async def test_purchase_debit_note_reverses_itc_and_reduces_vendor_payable(e2e_session: AsyncSession):
    """
    Scenario 3: Vendor Debit Note / Purchase Return (Reduce Supplier Bill)
    - Purchase Bill: ₹40,000 + 18% GST (₹7,200) = ₹47,200
    - Shortage deduction / purchase return: ₹10,000 + 18% GST (₹1,800) = ₹11,800
    - Double Entry:
        Dr. ACC_SUNDRY_CREDITORS ₹11,800
        Cr. ACC_TRUCK_HIRE_EXP ₹10,000
        Cr. ACC_GST_IN_CGST ₹900 (ITC Reversal u/s 34(2))
        Cr. ACC_GST_IN_SGST ₹900 (ITC Reversal u/s 34(2))
    - Balance Effect:
        Purchase bill balance reduced to ₹35,400.
    """
    session = e2e_session

    bill = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="NORMAL_PURCHASE",
            vendor_id=1,
            bill_number="SHREE/2026/088",
            bill_date=date(2026, 4, 1),
            items=[
                PurchaseBillItemCreate(
                    description="Truck Hire Charges Pune-Delhi",
                    quantity=Decimal("1.00"),
                    rate=Decimal("40000.00"),
                    tax_category_id=1,
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )
    assert bill.net_amount == Decimal("47200.00")

    # Issue Purchase Debit Note (Transporter shortage deduction)
    pdn = await accounts_service.create_credit_debit_note(
        session,
        CreditDebitNoteCreate(
            note_type="DEBIT_NOTE",
            note_category="PURCHASE_DEBIT_NOTE",
            voucher_date=date(2026, 4, 7),
            is_gst_note=True,
            against_voucher_id=bill.id,
            vendor_id=1,
            reason_code="03",
            reason_description="Transit shortage deduction as per consignee delivery receipt",
            total_taxable_amount=Decimal("10000.00"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("1800.00"),
            cgst_amount=Decimal("900.00"),
            sgst_amount=Decimal("900.00"),
            net_amount=Decimal("11800.00"),
            narration="Shortage deduction for 5 damaged cartons",
        ),
        office_id=1,
    )

    assert pdn.voucher_type == "DEBIT_NOTE"
    assert pdn.note_category == "PURCHASE_DEBIT_NOTE"

    entries = pdn.ledger_entries
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("11800.00")
    creditor_dr = next(e for e in entries if e.account.code == "ACC_SUNDRY_CREDITORS")
    assert creditor_dr.debit_amount == Decimal("11800.00")
    cgst_itc_rev = next(e for e in entries if e.account.code == "ACC_GST_IN_CGST")
    assert cgst_itc_rev.credit_amount == Decimal("900.00")

    # Target bill balance reduced
    bill_updated = await accounts_service.get_voucher_by_id(session, bill.id)
    assert bill_updated.balance_amount == Decimal("35400.00")
    assert bill_updated.paid_amount == Decimal("11800.00")


@pytest.mark.asyncio
async def test_purchase_credit_note_records_additional_supplier_charge(e2e_session: AsyncSession):
    """
    Scenario 4: Vendor Credit Note / Supplier Additional Charge
    - Rate escalation / extra toll: ₹2,000 + 18% GST (₹360) = ₹2,360
    - Double Entry:
        Dr. ACC_TRUCK_HIRE_EXP ₹2,000
        Dr. ACC_GST_IN_CGST ₹180
        Dr. ACC_GST_IN_SGST ₹180
        Cr. ACC_SUNDRY_CREDITORS ₹2,360
    - Balance Effect:
        Purchase bill balance increased by ₹2,360.
    """
    session = e2e_session

    bill = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="NORMAL_PURCHASE",
            vendor_id=1,
            bill_number="SHREE/2026/092",
            bill_date=date(2026, 4, 1),
            items=[
                PurchaseBillItemCreate(
                    description="Truck Hire Local",
                    quantity=Decimal("1.00"),
                    rate=Decimal("10000.00"),
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    pcn = await accounts_service.create_credit_debit_note(
        session,
        CreditDebitNoteCreate(
            note_type="CREDIT_NOTE",
            note_category="PURCHASE_CREDIT_NOTE",
            voucher_date=date(2026, 4, 8),
            is_gst_note=True,
            against_voucher_id=bill.id,
            vendor_id=1,
            reason_code="06",
            reason_description="Route diversion toll charges reimbursed",
            total_taxable_amount=Decimal("2000.00"),
            tax_rate=Decimal("18.00"),
            tax_amount=Decimal("360.00"),
            cgst_amount=Decimal("180.00"),
            sgst_amount=Decimal("180.00"),
            net_amount=Decimal("2360.00"),
        ),
        office_id=1,
    )

    entries = pcn.ledger_entries
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("2360.00")
    creditor_cr = next(e for e in entries if e.account.code == "ACC_SUNDRY_CREDITORS")
    assert creditor_cr.credit_amount == Decimal("2360.00")

    bill_updated = await accounts_service.get_voucher_by_id(session, bill.id)
    assert bill_updated.balance_amount == Decimal("12360.00")


@pytest.mark.asyncio
async def test_commercial_note_without_gst_adjustment(e2e_session: AsyncSession):
    """
    Scenario 5: Pure Commercial / Financial Credit Note
    - Post-sale commercial settlement without altering statutory GST liability.
    - Double Entry:
        Dr. ACC_FREIGHT_REV ₹4,000
        Cr. ACC_SUNDRY_DEBTORS ₹4,000
    - Zero tax ledger entries generated.
    """
    session = e2e_session

    cn = await accounts_service.create_credit_debit_note(
        session,
        CreditDebitNoteCreate(
            note_type="CREDIT_NOTE",
            note_category="SALES_CREDIT_NOTE",
            voucher_date=date(2026, 4, 10),
            is_gst_note=False,
            billing_client_id=1,
            reason_code="02",
            reason_description="Financial volume discount",
            total_taxable_amount=Decimal("4000.00"),
            tax_amount=Decimal("0.00"),
            net_amount=Decimal("4000.00"),
            narration="Commercial adjustment - Non-GST financial credit note",
        ),
        office_id=1,
    )

    entries = cn.ledger_entries
    assert len(entries) == 2
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("4000.00")
    # Verify no tax ledger touched
    assert not any("GST" in e.account.name for e in entries)


@pytest.mark.asyncio
async def test_credit_note_over_adjustment_prevention(e2e_session: AsyncSession):
    """
    Scenario 6: Prevents issuing a credit note exceeding original invoice gross amount.
    """
    session = e2e_session

    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            items=[
                GeneralInvoiceItemCreate(
                    description="Short Trip Freight",
                    quantity=Decimal("1.00"),
                    rate=Decimal("5000.00"),
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )
    assert inv.net_amount == Decimal("5000.00")

    # Try to issue credit note of ₹6,000 against ₹5,000 invoice
    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.create_credit_debit_note(
            session,
            CreditDebitNoteCreate(
                note_type="CREDIT_NOTE",
                note_category="SALES_CREDIT_NOTE",
                against_voucher_id=inv.id,
                billing_client_id=1,
                total_taxable_amount=Decimal("6000.00"),
                net_amount=Decimal("6000.00"),
            ),
            office_id=1,
        )
    assert exc_info.value.status_code == 400
    assert "cannot exceed original invoice" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_void_credit_note_reverses_and_restores_invoice_balance(e2e_session: AsyncSession):
    """
    Scenario 7: Voiding a credit note restores original invoice balance and generates reversing entries.
    """
    session = e2e_session

    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            items=[
                GeneralInvoiceItemCreate(
                    description="Full Truck Load",
                    quantity=Decimal("1.00"),
                    rate=Decimal("10000.00"),
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    cn = await accounts_service.create_credit_debit_note(
        session,
        CreditDebitNoteCreate(
            note_type="CREDIT_NOTE",
            note_category="SALES_CREDIT_NOTE",
            against_voucher_id=inv.id,
            billing_client_id=1,
            total_taxable_amount=Decimal("3000.00"),
            net_amount=Decimal("3000.00"),
        ),
        office_id=1,
    )

    inv_credited = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_credited.balance_amount == Decimal("7000.00")

    # Void credit note
    await accounts_service.void_voucher(
        session,
        cn.id,
        VoidVoucherRequest(void_reason="Issued in error - client dispute resolved"),
    )

    # Verify invoice balance is restored to ₹10,000
    inv_restored = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_restored.balance_amount == Decimal("10000.00")
    assert inv_restored.paid_amount == Decimal("0.00")
    assert inv_restored.payment_status == "UNPAID"

    # Verify reversing entries exist
    cn_voided = await accounts_service.get_voucher_by_id(session, cn.id)
    assert cn_voided.is_void is True
    reversals = [e for e in cn_voided.ledger_entries if e.is_reversal]
    assert len(reversals) == 2


@pytest.mark.asyncio
async def test_get_eligible_invoices_for_note(e2e_session: AsyncSession):
    """
    Scenario 8: Querying eligible invoices returns active customer bills with balance and allowable adjustment.
    """
    session = e2e_session

    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            items=[
                GeneralInvoiceItemCreate(
                    description="Service Bill",
                    quantity=Decimal("1.00"),
                    rate=Decimal("15000.00"),
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    eligible = await accounts_service.get_eligible_invoices_for_note(session, "CUSTOMER", party_id=1)
    assert len(eligible) >= 1
    found = next(e for e in eligible if e.id == inv.id)
    assert found.net_amount == Decimal("15000.00")
    assert found.balance_amount == Decimal("15000.00")
    assert found.allowable_adjustment == Decimal("15000.00")
