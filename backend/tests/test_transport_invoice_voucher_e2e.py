import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.tenant_db.models import (
    TenantBase,
    Branch,
    SeriesMaster,
    BillingClient,
    Consigner,
    Consignee,
    LR,
    LRStatus,
    TaxCategory,
    ChargeHead,
    Voucher,
    VoucherType,
    BillAllocation,
    LedgerEntry,
)
from app.modules.accounts import service as accounts_service, master_ledger_service
from app.modules.accounts.schemas import (
    TransportInvoiceCreate,
    ReceiptAgainstInvoiceCreate,
    VoidVoucherRequest,
)
from app.modules.transport_reports import service as reports_service
from app.modules.statements import service as statements_service


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
        series_ti = SeriesMaster(
            id=1,
            document_type="TRANSPORT_INVOICE",
            prefix="TI-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Transport Invoice Series",
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
        session.add_all([series_ti, series_rcpt])

        # 2. Tax Categories: GST 12% (FCM), GST 5% (GTA RCM), Exempt
        tc_12 = TaxCategory(
            id=1,
            name="GST 12% (Forward Charge)",
            code="GST_12",
            igst_rate=Decimal("12.00"),
            cgst_rate=Decimal("6.00"),
            sgst_rate=Decimal("6.00"),
            is_rcm=False,
            is_active=True,
        )
        tc_rcm = TaxCategory(
            id=2,
            name="GST 5% (GTA RCM)",
            code="GTA_RCM_5",
            igst_rate=Decimal("5.00"),
            cgst_rate=Decimal("2.50"),
            sgst_rate=Decimal("2.50"),
            is_rcm=True,
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
        session.add_all([tc_12, tc_rcm, tc_exempt])

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

        # 4. Consigner & Consignee
        consigner = Consigner(
            id=1,
            name="Tata Steel Stockyard",
            gstin="27AABCT1332L1Z4",
            state="Maharashtra",
            city="Mumbai",
            is_active=True,
        )
        consignee_pune = Consignee(
            id=1,
            name="Automotive Stampings Pune",
            gstin="27AABCA9999P1Z2",
            state="Maharashtra",
            city="Pune",
            is_active=True,
        )
        consignee_surat = Consignee(
            id=2,
            name="Hazira Port Plant",
            gstin="24AAACA0001A1Z8",
            state="Gujarat",
            city="Surat",
            is_active=True,
        )
        session.add_all([consigner, consignee_pune, consignee_surat])

        # 5. Consignment LRs
        # LR 1: Intra-state delivery (Mumbai -> Pune)
        lr1 = LR(
            id=1,
            lr_number="LR-2026-0001",
            lr_date=date(2026, 4, 10),
            consigner_id=1,
            consignee_id=1,
            billing_customer_id=1,
            vehicle_number="MH-04-GP-1234",
            package_count=50,
            chargeable_weight_mt=Decimal("20.00"),
            freight_rate=Decimal("2000.00"),
            freight_amount=Decimal("40000.00"),
            loading_charges=Decimal("1500.00"),
            unloading_charges=Decimal("1000.00"),
            other_charges=Decimal("500.00"),
            total_freight_amount=Decimal("43000.00"),
            status=LRStatus.POD_VERIFIED.value,
            issuing_office_id=1,
            is_billed=False,
        )
        # LR 2: Inter-state delivery (Mumbai -> Surat)
        lr2 = LR(
            id=2,
            lr_number="LR-2026-0002",
            lr_date=date(2026, 4, 12),
            consigner_id=1,
            consignee_id=2,
            billing_customer_id=2,
            vehicle_number="GJ-05-XX-9876",
            package_count=100,
            chargeable_weight_mt=Decimal("25.00"),
            freight_rate=Decimal("2000.00"),
            freight_amount=Decimal("50000.00"),
            total_freight_amount=Decimal("50000.00"),
            status=LRStatus.POD_VERIFIED.value,
            issuing_office_id=1,
            is_billed=False,
        )
        # LR 3: GTA RCM delivery
        lr3 = LR(
            id=3,
            lr_number="LR-2026-0003",
            lr_date=date(2026, 4, 15),
            consigner_id=1,
            consignee_id=1,
            billing_customer_id=1,
            vehicle_number="MH-12-PQ-5555",
            package_count=40,
            chargeable_weight_mt=Decimal("15.00"),
            freight_rate=Decimal("2000.00"),
            freight_amount=Decimal("30000.00"),
            total_freight_amount=Decimal("30000.00"),
            status=LRStatus.POD_VERIFIED.value,
            issuing_office_id=1,
            is_billed=False,
        )
        session.add_all([lr1, lr2, lr3])
        await session.commit()

        # Seed standard accounting chart
        await accounts_service.ensure_standard_accounts(session)

        yield session


@pytest.mark.asyncio
async def test_intra_state_transport_invoice_fcm(e2e_session: AsyncSession):
    """
    Scenario 1: Intra-state Transport Invoice (Forward Charge 12%)
    Supplier: Maharashtra, Recipient: Maharashtra
    Base Freight: 40,000 + Loading: 1,500 + Detention: 2,500 - Discount: 1,000 = Taxable: 43,000
    Intra-state Tax: CGST 6% (2,580) + SGST 6% (2,580) = Total Tax: 5,160
    Total Net Receivable: 48,160.00
    Double-Entry:
      Debtor A/c Dr. 48,160
      Freight Revenue Cr. 43,000
      GST Output CGST Cr. 2,580
      GST Output SGST Cr. 2,580
    """
    session = e2e_session

    ti_create = TransportInvoiceCreate(
        lr_id=1,
        voucher_number="TI-2026-0001",
        voucher_date=date(2026, 4, 11),
        tax_category_id=1,  # 12%
        gst_treatment="FCM",
        place_of_supply="Maharashtra",
        basic_freight=Decimal("40000.00"),
        loading_charges=Decimal("1500.00"),
        unloading_charges=Decimal("0.00"),
        detention_charges=Decimal("2500.00"),
        other_charges=Decimal("0.00"),
        discount_amount=Decimal("1000.00"),
        narration="Freight for Steel Coils Mumbai to Pune",
    )

    voucher = await accounts_service.create_transport_invoice_from_lr(session, ti_create, office_id=1)

    assert voucher.voucher_number == "TI-2026-0001"
    assert voucher.voucher_type == VoucherType.TRANSPORT_INVOICE.value
    assert voucher.total_amount == Decimal("43000.00")  # 40k + 1.5k + 2.5k - 1k
    assert voucher.tax_amount == Decimal("5160.00")
    assert voucher.net_amount == Decimal("48160.00")
    assert voucher.balance_amount == Decimal("48160.00")
    assert voucher.paid_amount == Decimal("0.00")
    assert voucher.payment_status == "UNPAID"
    assert voucher.gst_treatment == "FCM"
    assert voucher.place_of_supply == "Maharashtra"

    # Verify Double-Entry Postings
    entries = voucher.ledger_entries
    assert len(entries) >= 4, f"Expected at least 4 ledger entries (Debtor, Revenue, CGST, SGST), got {len(entries)}"

    total_dr = sum(e.debit_amount for e in entries)
    total_cr = sum(e.credit_amount for e in entries)
    assert total_dr == total_cr == Decimal("48160.00"), f"Double entry unbalanced! Dr={total_dr}, Cr={total_cr}"

    # Verify specific debits & credits
    dr_entry = next(e for e in entries if e.debit_amount > 0)
    assert dr_entry.account_id == voucher.account_id
    assert dr_entry.debit_amount == Decimal("48160.00")

    cgst_cr = next(e for e in entries if "CGST" in (e.narration or ""))
    assert cgst_cr.credit_amount == Decimal("2580.00")

    sgst_cr = next(e for e in entries if "SGST" in (e.narration or ""))
    assert sgst_cr.credit_amount == Decimal("2580.00")

    # Verify LR is now marked as billed
    lr = (await session.execute(select(LR).where(LR.id == 1))).scalar_one()
    assert lr.is_billed is True


@pytest.mark.asyncio
async def test_inter_state_transport_invoice_and_bill_wise_receipts(e2e_session: AsyncSession):
    """
    Scenario 2: Inter-state Transport Invoice (Surat to Mumbai)
    Supplier: Maharashtra, Recipient: Gujarat (Adani Ports)
    Base Freight: 50,000. Tax 12% IGST: 6,000. Total Invoice: 56,000.
    Followed by:
    - Partial payment: 30,000 NEFT + 1,000 TDS u/s 194C = 31,000 settled -> Balance: 25,000
    - Full payment: Remaining 25,000 settled -> Balance: 0, status: PAID
    """
    session = e2e_session

    ti_create = TransportInvoiceCreate(
        lr_id=2,
        voucher_number="TI-2026-0002",
        voucher_date=date(2026, 4, 13),
        tax_category_id=1,  # 12%
        gst_treatment="FCM",
        place_of_supply="Gujarat",
        basic_freight=Decimal("50000.00"),
        narration="Container haulage Mumbai to Hazira",
    )

    invoice = await accounts_service.create_transport_invoice_from_lr(session, ti_create, office_id=1)

    assert invoice.net_amount == Decimal("56000.00")
    assert invoice.tax_amount == Decimal("6000.00")
    assert invoice.balance_amount == Decimal("56000.00")
    assert invoice.payment_status == "UNPAID"

    # Verify IGST posted
    igst_cr = next(e for e in invoice.ledger_entries if "IGST" in (e.narration or ""))
    assert igst_cr.credit_amount == Decimal("6000.00")

    # 1. Partial Payment with Sec 194C TDS deduction
    # Client pays 30,000 in bank, deducts 1,000 TDS
    rcpt1_data = ReceiptAgainstInvoiceCreate(
        invoice_id=invoice.id,
        amount=Decimal("30000.00"),
        tds_amount=Decimal("1000.00"),
        discount_amount=Decimal("0.00"),
        payment_mode="BANK",
        reference_number="NEFT-TATA-998877",
        narration="Partial payment received with 2% TDS on freight",
    )

    rcpt1 = await accounts_service.create_receipt_against_invoice(session, rcpt1_data, office_id=1)

    assert rcpt1.voucher_type == VoucherType.RECEIPT_VOUCHER.value
    assert rcpt1.net_amount == Decimal("31000.00")

    # Double-entry check for Receipt 1:
    # Dr. Bank: 30,000
    # Dr. TDS Receivable: 1,000
    # Cr. Debtor: 31,000
    r1_dr = sum(e.debit_amount for e in rcpt1.ledger_entries)
    r1_cr = sum(e.credit_amount for e in rcpt1.ledger_entries)
    assert r1_dr == r1_cr == Decimal("31000.00")

    bank_dr = next(e for e in rcpt1.ledger_entries if e.debit_amount == Decimal("30000.00"))
    assert bank_dr is not None

    tds_dr = next(e for e in rcpt1.ledger_entries if e.debit_amount == Decimal("1000.00"))
    assert "TDS" in tds_dr.narration

    debtor_cr = next(e for e in rcpt1.ledger_entries if e.credit_amount == Decimal("31000.00"))
    assert debtor_cr.account_id == invoice.account_id

    # Refresh invoice state
    inv_refreshed = await accounts_service.get_voucher_by_id(session, invoice.id)
    assert inv_refreshed.paid_amount == Decimal("31000.00")
    assert inv_refreshed.balance_amount == Decimal("25000.00")
    assert inv_refreshed.payment_status == "PARTIALLY_PAID"

    # 2. Final Payment: Settle remaining 25,000
    rcpt2_data = ReceiptAgainstInvoiceCreate(
        invoice_id=invoice.id,
        amount=Decimal("25000.00"),
        tds_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        payment_mode="BANK",
        reference_number="NEFT-TATA-998899",
        narration="Final settlement of balance",
    )
    rcpt2 = await accounts_service.create_receipt_against_invoice(session, rcpt2_data, office_id=1)

    inv_final = await accounts_service.get_voucher_by_id(session, invoice.id)
    assert inv_final.paid_amount == Decimal("56000.00")
    assert inv_final.balance_amount == Decimal("0.00")
    assert inv_final.payment_status == "PAID"

    # Bill allocations recorded
    assert len(inv_final.bill_allocations) == 2


@pytest.mark.asyncio
async def test_gta_rcm_transport_invoice(e2e_session: AsyncSession):
    """
    Scenario 3: Goods Transport Agency under Reverse Charge Mechanism (GTA RCM 5%)
    Section 9(3) CGST Act: Tax is paid directly by the service recipient.
    GTA does NOT add tax to debtor receivable and does NOT credit output GST in books.
    Base Freight: 30,000. Net Receivable: 30,000.
    Double-Entry:
      Debtor Dr. 30,000
      Freight Revenue Cr. 30,000
    """
    session = e2e_session

    ti_create = TransportInvoiceCreate(
        lr_id=3,
        voucher_number="TI-2026-0003",
        voucher_date=date(2026, 4, 16),
        tax_category_id=2,  # GTA RCM 5%
        gst_treatment="RCM",
        basic_freight=Decimal("30000.00"),
        narration="GTA corridor consignment under RCM",
    )

    voucher = await accounts_service.create_transport_invoice_from_lr(session, ti_create, office_id=1)

    assert voucher.gst_treatment == "RCM"
    assert voucher.total_amount == Decimal("30000.00")
    assert voucher.tax_amount == Decimal("0.00")  # No tax added to customer bill
    assert voucher.net_amount == Decimal("30000.00")
    assert voucher.balance_amount == Decimal("30000.00")

    # Double entry check: Exactly 2 entries (Debtor Dr 30,000, Revenue Cr 30,000)
    entries = voucher.ledger_entries
    assert len(entries) == 2
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("30000.00")


@pytest.mark.asyncio
async def test_voiding_protection_and_reversal(e2e_session: AsyncSession):
    """
    Scenario 4: Voiding safety & Audit trail
    - Cannot void invoice with active receipts.
    - Voiding receipt restores invoice balance.
    - Voiding invoice restores LR to unbilled status.
    """
    session = e2e_session

    # Create new invoice
    lr = LR(
        id=4,
        lr_number="LR-2026-0004",
        lr_date=date(2026, 4, 18),
        consigner_id=1,
        consignee_id=1,
        billing_customer_id=1,
        vehicle_number="MH-04-AB-1111",
        freight_amount=Decimal("20000.00"),
        total_freight_amount=Decimal("20000.00"),
        status=LRStatus.POD_VERIFIED.value,
        issuing_office_id=1,
        is_billed=False,
    )
    session.add(lr)
    await session.commit()

    inv = await accounts_service.create_transport_invoice_from_lr(
        session,
        TransportInvoiceCreate(lr_id=4, basic_freight=Decimal("20000.00")),
        office_id=1,
    )

    # Receive payment of 10,000
    rcpt = await accounts_service.create_receipt_against_invoice(
        session,
        ReceiptAgainstInvoiceCreate(invoice_id=inv.id, amount=Decimal("10000.00")),
        office_id=1,
    )

    # Try to void the invoice while receipt is active -> Must fail!
    with pytest.raises(Exception) as excinfo:
        await accounts_service.void_voucher(session, inv.id, VoidVoucherRequest(void_reason="Cancelled order"))
    assert "active receipts" in str(excinfo.value)

    # Void the receipt voucher first
    void_rcpt = await accounts_service.void_voucher(
        session, rcpt.id, VoidVoucherRequest(void_reason="Cheque bounced by bank")
    )
    assert void_rcpt.is_void is True

    # Invoice balance is restored
    inv_restored = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_restored.paid_amount == Decimal("0.00")
    assert inv_restored.payment_status == "UNPAID"

    # Now void the invoice
    void_inv = await accounts_service.void_voucher(
        session, inv.id, VoidVoucherRequest(void_reason="Client cancelled consignment billing")
    )
    assert void_inv.is_void is True
    assert void_inv.payment_status == "VOID"

    # LR unbilled status is restored
    lr_restored = (await session.execute(select(LR).where(LR.id == 4))).scalar_one()
    assert lr_restored.is_billed is False


@pytest.mark.asyncio
async def test_unbilled_and_invoice_register_reports(e2e_session: AsyncSession):
    """
    Scenario 5: Report Integration
    - Unbilled report shows only non-invoiced LRs.
    - Invoicing an LR excludes it from unbilled LRs.
    - Invoice register shows real invoices with accurate GST and balances.
    """
    session = e2e_session

    # 1. Before invoicing: LRs 1, 2, 3 are in unbilled report
    unbilled_initial = await reports_service.get_unbilled_lrs(session, office_id=1)
    initial_ids = [u.id for u in unbilled_initial]
    assert 1 in initial_ids
    assert 2 in initial_ids
    assert 3 in initial_ids

    # 2. Invoice LR 1 and LR 2
    inv1 = await accounts_service.create_transport_invoice_from_lr(
        session,
        TransportInvoiceCreate(lr_id=1, voucher_number="TI-2026-0001", basic_freight=Decimal("40000.00")),
        office_id=1,
    )
    inv2 = await accounts_service.create_transport_invoice_from_lr(
        session,
        TransportInvoiceCreate(lr_id=2, voucher_number="TI-2026-0002", basic_freight=Decimal("50000.00")),
        office_id=1,
    )

    # 3. After invoicing: LR 1 & 2 must NOT be in unbilled, LR 3 remains unbilled
    unbilled_after = await reports_service.get_unbilled_lrs(session, office_id=1)
    after_ids = [u.id for u in unbilled_after]
    assert 1 not in after_ids
    assert 2 not in after_ids
    assert 3 in after_ids

    # 4. Query Invoice Register
    inv_reg = await reports_service.get_invoice_register(session, office_id=1)
    assert len(inv_reg) == 2
    inv_numbers = [r.invoice_number for r in inv_reg]
    assert "TI-2026-0001" in inv_numbers
    assert "TI-2026-0002" in inv_numbers
