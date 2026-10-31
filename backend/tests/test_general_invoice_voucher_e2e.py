from datetime import date, datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.tenant_db.models import (
    TenantBase,
    Branch,
    SeriesMaster,
    TaxCategory,
    BillingClient,
    Account,
    Voucher,
    VoucherType,
    BillAllocation,
    LedgerEntry,
)
from app.modules.accounts import service as accounts_service, master_ledger_service
from app.modules.accounts.schemas import (
    GeneralInvoiceCreate,
    GeneralInvoiceItemCreate,
    ReceiptAgainstInvoiceCreate,
    VoidVoucherRequest,
)
from app.modules.statements import service as statements_service
from app.modules.reports import service as reports_service


@pytest.fixture
async def e2e_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # 1. Issuing Branch in Maharashtra
        branch_ho = Branch(
            id=1,
            code="MH-HO",
            name="Mumbai Central Office",
            city="Mumbai",
            state="Maharashtra",
            gstin="27AAACP0123M1Z1",
            is_head_office=True,
            is_active=True,
        )
        session.add(branch_ho)

        # Document Series Masters for Auto-numbering
        series_gi = SeriesMaster(
            id=1,
            document_type="GENERAL_INVOICE",
            prefix="GI-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default General Invoice Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        series_rcpt = SeriesMaster(
            id=2,
            document_type="RECEIPT_VOUCHER",
            prefix="RCPT-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Receipt Voucher Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        session.add_all([series_gi, series_rcpt])

        # 2. Tax Categories (Standard Indian GST Rates)
        tc_18 = TaxCategory(
            id=1,
            name="GST 18% (Standard Services)",
            code="GST_18",
            igst_rate=Decimal("18.00"),
            cgst_rate=Decimal("9.00"),
            sgst_rate=Decimal("9.00"),
            is_rcm=False,
            is_active=True,
        )
        tc_12 = TaxCategory(
            id=2,
            name="GST 12% (Storage/Warehousing)",
            code="GST_12",
            igst_rate=Decimal("12.00"),
            cgst_rate=Decimal("6.00"),
            sgst_rate=Decimal("6.00"),
            is_rcm=False,
            is_active=True,
        )
        tc_exempt = TaxCategory(
            id=3,
            name="GST Exempt (Agri/Food Grain)",
            code="EXEMPT",
            igst_rate=Decimal("0.00"),
            cgst_rate=Decimal("0.00"),
            sgst_rate=Decimal("0.00"),
            is_rcm=False,
            is_active=True,
        )
        session.add_all([tc_18, tc_12, tc_exempt])

        # 3. Billing Clients:
        # Client A: Intra-state (Maharashtra)
        client_intra = BillingClient(
            id=1,
            code="BC-MUMBAI-01",
            name="Tata Steel Logistics Ltd",
            company_name="Tata Steel Ltd",
            gstin="27AABCT1332L1Z4",
            state="Maharashtra",
            credit_period_days=30,
            issuing_office_id=1,
            is_active=True,
        )
        # Client B: Inter-state (Gujarat)
        client_inter = BillingClient(
            id=2,
            code="BC-GUJ-02",
            name="Adani Ports & SEZ Ltd",
            company_name="Adani Logistics",
            gstin="24AAACA0001A1Z8",
            state="Gujarat",
            credit_period_days=45,
            issuing_office_id=1,
            is_active=True,
        )
        session.add_all([client_intra, client_inter])

        await session.commit()

        # Seed standard chart of accounts
        await accounts_service.ensure_standard_accounts(session)

        yield session


@pytest.mark.asyncio
async def test_intra_state_general_invoice_fcm(e2e_session: AsyncSession):
    """
    Scenario 1: Intra-state General Sales/Service Invoice (Maharashtra -> Maharashtra)
    - Item 1: Warehousing (SAC 996729): 100 pallets @ 200 = 20,000. 18% GST.
    - Item 2: Material Handling (SAC 996719): 1 job @ 5,000 - 500 disc = 4,500. 18% GST.
    Total Taxable: 24,500.
    Output CGST @ 9%: 2,205.
    Output SGST @ 9%: 2,205.
    Total Invoice Value: 28,910.
    Debit Debtor: 28,910. Credit Revenue: 24,500. Credit CGST: 2,205. Credit SGST: 2,205.
    """
    session = e2e_session

    gi_create = GeneralInvoiceCreate(
        billing_client_id=1,
        voucher_number="GI-2026-0001",
        voucher_date=date(2026, 4, 10),
        credit_period_days=30,
        gst_treatment="FCM",
        place_of_supply="Maharashtra",
        reference_number="PO-TATA-WH-001",
        reference_date=date(2026, 4, 8),
        cost_center="WH-MUMBAI-CENTRAL",
        items=[
            GeneralInvoiceItemCreate(
                description="Cold Storage & Pallet Warehousing",
                hsn_sac="996729",
                quantity=Decimal("100.00"),
                rate=Decimal("200.00"),
                discount_amount=Decimal("0.00"),
                tax_category_id=1,  # 18%
            ),
            GeneralInvoiceItemCreate(
                description="Handling & Forklift Operations",
                hsn_sac="996719",
                quantity=Decimal("1.00"),
                rate=Decimal("5000.00"),
                discount_amount=Decimal("500.00"),
                tax_category_id=1,  # 18%
            ),
        ],
        narration="April 2026 Warehousing and Material Handling Billing",
    )

    invoice = await accounts_service.create_general_invoice(session, gi_create, office_id=1)

    assert invoice.voucher_type == VoucherType.GENERAL_INVOICE.value
    assert invoice.voucher_number == "GI-2026-0001"
    assert invoice.total_amount == Decimal("24500.00")
    assert invoice.tax_amount == Decimal("4410.00")
    assert invoice.net_amount == Decimal("28910.00")
    assert invoice.balance_amount == Decimal("28910.00")
    assert invoice.paid_amount == Decimal("0.00")
    assert invoice.payment_status == "UNPAID"
    assert invoice.due_date == date(2026, 5, 10)

    # Double-entry check: Sum(Dr) == Sum(Cr) == 28,910
    entries = invoice.ledger_entries
    dr_tot = sum(e.debit_amount for e in entries)
    cr_tot = sum(e.credit_amount for e in entries)
    assert dr_tot == cr_tot == Decimal("28910.00")

    # Verify Debtor Dr: 28,910
    debtor_dr = next(e for e in entries if e.debit_amount == Decimal("28910.00"))
    assert debtor_dr.account_id == invoice.account_id

    # Verify Revenue Cr: 24,500
    rev_cr = next(e for e in entries if e.credit_amount == Decimal("24500.00"))
    assert rev_cr is not None

    # Verify CGST & SGST Cr: 2,205 each
    cgst_cr = next(e for e in entries if "CGST" in (e.narration or ""))
    assert cgst_cr.credit_amount == Decimal("2205.00")

    sgst_cr = next(e for e in entries if "SGST" in (e.narration or ""))
    assert sgst_cr.credit_amount == Decimal("2205.00")

    # Verify line items count & HSN/SAC
    assert len(invoice.items) == 2
    assert invoice.items[0].hsn_sac == "996729"
    assert invoice.items[1].hsn_sac == "996719"


@pytest.mark.asyncio
async def test_inter_state_general_invoice_and_bill_wise_settlement(e2e_session: AsyncSession):
    """
    Scenario 2: Inter-state General Service Invoice (Maharashtra -> Gujarat)
    - Consulting / Logistics Support: 50,000 @ 18% IGST = 9,000. Total = 59,000.
    Followed by bill-wise customer payments:
    - Partial receipt: 30,000 Bank + 1,000 TDS u/s 194J = 31,000 settled -> Balance 28,000
    - Final receipt: 28,000 Bank -> Balance 0.00, status PAID
    """
    session = e2e_session

    gi_create = GeneralInvoiceCreate(
        billing_client_id=2,  # Adani Ports (Gujarat)
        voucher_number="GI-2026-0002",
        voucher_date=date(2026, 4, 12),
        credit_period_days=45,
        gst_treatment="FCM",
        place_of_supply="Gujarat",
        reference_number="PO-ADANI-CONSULT-99",
        items=[
            GeneralInvoiceItemCreate(
                description="Supply Chain Route Optimization Consulting",
                hsn_sac="998311",
                quantity=Decimal("1.00"),
                rate=Decimal("50000.00"),
                discount_amount=Decimal("0.00"),
                tax_category_id=1,  # 18%
            )
        ],
        narration="Logistics consultation charges for Hazira terminal",
    )

    invoice = await accounts_service.create_general_invoice(session, gi_create, office_id=1)

    assert invoice.net_amount == Decimal("59000.00")
    assert invoice.tax_amount == Decimal("9000.00")
    assert invoice.balance_amount == Decimal("59000.00")

    # Verify IGST posted
    igst_cr = next(e for e in invoice.ledger_entries if "IGST" in (e.narration or ""))
    assert igst_cr.credit_amount == Decimal("9000.00")

    # 1. Partial settlement with Sec 194J TDS (2%)
    rcpt1_data = ReceiptAgainstInvoiceCreate(
        invoice_id=invoice.id,
        amount=Decimal("30000.00"),
        tds_amount=Decimal("1000.00"),
        discount_amount=Decimal("0.00"),
        payment_mode="BANK",
        reference_number="NEFT-ADANI-443322",
        narration="Partial payment received with 2% TDS u/s 194J",
    )
    rcpt1 = await accounts_service.create_receipt_against_invoice(session, rcpt1_data, office_id=1)

    assert rcpt1.net_amount == Decimal("31000.00")
    r1_dr = sum(e.debit_amount for e in rcpt1.ledger_entries)
    r1_cr = sum(e.credit_amount for e in rcpt1.ledger_entries)
    assert r1_dr == r1_cr == Decimal("31000.00")

    # Refresh invoice state
    inv_refreshed = await accounts_service.get_voucher_by_id(session, invoice.id)
    assert inv_refreshed.paid_amount == Decimal("31000.00")
    assert inv_refreshed.balance_amount == Decimal("28000.00")
    assert inv_refreshed.payment_status == "PARTIALLY_PAID"

    # 2. Final settlement of 28,000
    rcpt2_data = ReceiptAgainstInvoiceCreate(
        invoice_id=invoice.id,
        amount=Decimal("28000.00"),
        tds_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        payment_mode="BANK",
        reference_number="NEFT-ADANI-443399",
        narration="Final settlement of balance consulting fee",
    )
    await accounts_service.create_receipt_against_invoice(session, rcpt2_data, office_id=1)

    inv_final = await accounts_service.get_voucher_by_id(session, invoice.id)
    assert inv_final.paid_amount == Decimal("59000.00")
    assert inv_final.balance_amount == Decimal("0.00")
    assert inv_final.payment_status == "PAID"
    assert len(inv_final.bill_allocations) == 2


@pytest.mark.asyncio
async def test_exempt_general_invoice(e2e_session: AsyncSession):
    """
    Scenario 3: Exempt Supply (Agricultural storage/handling)
    - Base: 15,000. GST: 0.00 (Exempt).
    - Invoice Value: 15,000.
    """
    session = e2e_session

    gi_create = GeneralInvoiceCreate(
        billing_client_id=1,
        voucher_number="GI-2026-0003",
        voucher_date=date(2026, 4, 15),
        gst_treatment="EXEMPT",
        place_of_supply="Maharashtra",
        items=[
            GeneralInvoiceItemCreate(
                description="Storage of Agricultural Produce (Food Grains)",
                hsn_sac="996719",
                quantity=Decimal("1.00"),
                rate=Decimal("15000.00"),
                tax_category_id=3,  # Exempt
            )
        ],
    )

    inv = await accounts_service.create_general_invoice(session, gi_create, office_id=1)
    assert inv.total_amount == Decimal("15000.00")
    assert inv.tax_amount == Decimal("0.00")
    assert inv.net_amount == Decimal("15000.00")

    # Only 2 ledger entries: Dr Debtor 15,000, Cr Revenue 15,000
    assert len(inv.ledger_entries) == 2
    assert sum(e.debit_amount for e in inv.ledger_entries) == Decimal("15000.00")
    assert sum(e.credit_amount for e in inv.ledger_entries) == Decimal("15000.00")


@pytest.mark.asyncio
async def test_general_invoice_void_protection_and_reversal(e2e_session: AsyncSession):
    """
    Scenario 4: Voiding safety & Reversal Audit Trail
    - Cannot void invoice with active receipts.
    - Voiding receipt restores invoice balance.
    - Voiding invoice creates reversing double-entry ledger entries.
    """
    session = e2e_session

    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_number="GI-2026-0004",
            items=[
                GeneralInvoiceItemCreate(
                    description="Administrative Services",
                    rate=Decimal("10000.00"),
                    quantity=Decimal("1.00"),
                )
            ],
        ),
        office_id=1,
    )

    # Receive payment of 5,000
    rcpt = await accounts_service.create_receipt_against_invoice(
        session,
        ReceiptAgainstInvoiceCreate(invoice_id=inv.id, amount=Decimal("5000.00")),
        office_id=1,
    )

    # Attempt to void invoice -> Must fail with active receipt error!
    with pytest.raises(Exception) as excinfo:
        await accounts_service.void_voucher(session, inv.id, VoidVoucherRequest(void_reason="Cancelled by management"))
    assert "active receipts" in str(excinfo.value)

    # Void the receipt first
    await accounts_service.void_voucher(
        session, rcpt.id, VoidVoucherRequest(void_reason="Wrong bank transaction reversed")
    )

    # Verify invoice balance is fully restored to 10,000
    inv_restored = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_restored.balance_amount == Decimal("10000.00")
    assert inv_restored.paid_amount == Decimal("0.00")
    assert inv_restored.payment_status == "UNPAID"

    # Now void the invoice
    voided_inv = await accounts_service.void_voucher(
        session, inv.id, VoidVoucherRequest(void_reason="Commercial terms amended")
    )
    assert voided_inv.is_void is True
    assert voided_inv.payment_status == "VOID"

    # Invariant: Reversals ensure cumulative Dr == Cr
    total_dr = sum(e.debit_amount for e in voided_inv.ledger_entries)
    total_cr = sum(e.credit_amount for e in voided_inv.ledger_entries)
    assert total_dr == total_cr
    assert any(e.is_reversal for e in voided_inv.ledger_entries)


@pytest.mark.asyncio
async def test_general_invoice_reporting_and_gst_statements(e2e_session: AsyncSession):
    """
    Scenario 5: Reporting Integration
    - General invoices appear in GSTR-1 Outward Statement.
    - Appears in Sales Register.
    - Customer outstanding tracked in OS Debtors.
    """
    session = e2e_session

    await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_number="GI-2026-0005",
            voucher_date=date(2026, 4, 20),
            gst_treatment="FCM",
            place_of_supply="Maharashtra",
            items=[
                GeneralInvoiceItemCreate(
                    description="Consulting & Technical Operations",
                    hsn_sac="998311",
                    quantity=Decimal("1.00"),
                    rate=Decimal("20000.00"),
                    tax_category_id=1,  # 18%
                )
            ],
        ),
        office_id=1,
    )

    # Query GSTR-1 outward statement
    gst_out = await statements_service.get_gst_output(session)
    assert len(gst_out.records) >= 1
    assert any("GI-" in r.voucher_number for r in gst_out.records)

    # Query Sales Register
    sales_reg = await reports_service.get_sales_register(session)
    assert len(sales_reg.invoices) >= 1
    assert any("GI-" in inv.voucher_number for inv in sales_reg.invoices)

    # Query OS Debtors Statement
    os_debtors = await statements_service.get_os_debtor(session, as_of_date=date(2026, 4, 30))
    assert len(os_debtors.debtors) >= 1
    assert os_debtors.total_outstanding > Decimal("0.00")
