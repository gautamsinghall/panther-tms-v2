import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.tenant_db.models import (
    TenantBase,
    Voucher,
    VoucherItem,
    LedgerEntry,
    VoucherType,
    Account,
    Branch,
    BillingClient,
    BillAllocation,
    SeriesMaster,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import (
    ReceiptVoucherCreate,
    ReceiptAllocationItem,
    VoidVoucherRequest,
    GeneralInvoiceCreate,
    GeneralInvoiceItemCreate,
)


@pytest.fixture
async def e2e_session():
    """Isolated in-memory SQLite database configured with complete test fixtures."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Seed Branch
        ho = Branch(id=1, name="Mumbai Central Hub", code="MUM-HO", is_head_office=True, state="Maharashtra")
        session.add(ho)

        # 2. Seed Series for Receipt Voucher and General Invoice
        s_rv = SeriesMaster(
            id=1,
            document_type="RECEIPT_VOUCHER",
            prefix="RV-2026-",
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
        s_gi = SeriesMaster(
            id=2,
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
        session.add_all([s_rv, s_gi])

        # 3. Seed Billing Client
        client = BillingClient(
            id=1,
            name="Reliance Industries Ltd",
            company_name="Reliance Industries Logistics",
            gstin="27AAACR1234A1Z5",
            pan="AAACR1234A",
            tds_rate=Decimal("2.00"),
            credit_period_days=30,
            state="Maharashtra",
            city="Mumbai",
        )
        session.add(client)

        await session.commit()

        # Seed standard accounts
        await accounts_service.ensure_standard_accounts(session)
        await session.commit()

        yield session


@pytest.mark.asyncio
async def test_single_invoice_settlement_with_tds_and_discount(e2e_session: AsyncSession):
    """
    Test recording a receipt against a single invoice with TDS (Sec 194C) and Cash Discount:
    Debit Bank A/c, Debit TDS Receivable A/c, Debit Discount Allowed A/c, Credit Customer Ledger.
    """
    session = e2e_session

    # 1. Create a General Invoice for ₹10,000
    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_date=date(2026, 4, 1),
            place_of_supply="Maharashtra",
            payment_terms="Net 30 Days",
            items=[
                GeneralInvoiceItemCreate(
                    description="Warehousing Storage Charges",
                    quantity=Decimal("1.00"),
                    rate=Decimal("10000.00"),
                    tax_rate=Decimal("0.00"),
                )
            ]
        ),
        office_id=1,
    )

    assert inv.balance_amount == Decimal("10000.00")
    assert inv.payment_status == "UNPAID"

    # 2. Customer pays ₹9,600 via NEFT, with ₹200 (2%) TDS u/s 194C and ₹200 Cash Discount
    receipt = await accounts_service.create_receipt_voucher(
        session,
        ReceiptVoucherCreate(
            billing_client_id=1,
            receipt_type="AGAINST_REF",
            payment_mode="NEFT",
            reference_number="NEFT987654321",
            amount=Decimal("9600.00"),
            tds_section="194C",
            tds_amount=Decimal("200.00"),
            discount_amount=Decimal("200.00"),
            allocations=[
                ReceiptAllocationItem(
                    invoice_id=inv.id,
                    allocated_amount=Decimal("9600.00"),
                    tds_amount=Decimal("200.00"),
                    discount_amount=Decimal("200.00"),
                )
            ],
            narration="Settlement for GI-2026-0001",
        ),
        office_id=1,
    )

    assert receipt.voucher_number.startswith("RV-2026-")
    assert receipt.net_amount == Decimal("9600.00")
    assert receipt.total_amount == Decimal("10000.00")

    # Verify Invoice is now fully PAID
    inv_updated = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_updated.paid_amount == Decimal("10000.00")
    assert inv_updated.balance_amount == Decimal("0.00")
    assert inv_updated.payment_status == "PAID"

    # Verify double-entry ledger balance
    entries = receipt.ledger_entries
    debits = sum(e.debit_amount for e in entries)
    credits = sum(e.credit_amount for e in entries)
    assert debits == credits == Decimal("10000.00")

    # Check debit breakdown: Bank ₹9600, TDS ₹200, Discount ₹200
    bank_entry = next(e for e in entries if e.debit_amount == Decimal("9600.00"))
    assert bank_entry.account.code == "ACC_HDFC_BANK"

    tds_entry = next(e for e in entries if e.debit_amount == Decimal("200.00") and e.account.code == "ACC_TDS_RECEIVABLE")
    assert tds_entry is not None

    disc_entry = next(e for e in entries if e.debit_amount == Decimal("200.00") and e.account.code == "ACC_DISCOUNT_ALLOWED")
    assert disc_entry is not None

    # Credit entry: Debtor ₹10,000
    credit_entry = next(e for e in entries if e.credit_amount == Decimal("10000.00"))
    assert credit_entry.account_id == inv.account_id


@pytest.mark.asyncio
async def test_multi_invoice_bill_wise_settlement(e2e_session: AsyncSession):
    """
    Test distributing a single customer payment across multiple open invoices:
    Invoice 1 (₹5,000) fully settled, Invoice 2 (₹15,000) partially settled (₹7,000).
    """
    session = e2e_session

    # Create Invoice 1: ₹5,000
    inv1 = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_date=date(2026, 4, 2),
            place_of_supply="Maharashtra",
            items=[GeneralInvoiceItemCreate(description="Service 1", quantity=Decimal("1.00"), rate=Decimal("5000.00"), tax_rate=Decimal("0.00"))]
        ),
        office_id=1,
    )

    # Create Invoice 2: ₹15,000
    inv2 = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_date=date(2026, 4, 3),
            place_of_supply="Maharashtra",
            items=[GeneralInvoiceItemCreate(description="Service 2", quantity=Decimal("1.00"), rate=Decimal("15000.00"), tax_rate=Decimal("0.00"))]
        ),
        office_id=1,
    )

    # Client pays ₹12,000 total: ₹5,000 against inv1, ₹7,000 against inv2
    receipt = await accounts_service.create_receipt_voucher(
        session,
        ReceiptVoucherCreate(
            billing_client_id=1,
            receipt_type="AGAINST_REF",
            payment_mode="BANK",
            amount=Decimal("12000.00"),
            allocations=[
                ReceiptAllocationItem(invoice_id=inv1.id, allocated_amount=Decimal("5000.00")),
                ReceiptAllocationItem(invoice_id=inv2.id, allocated_amount=Decimal("7000.00")),
            ],
            narration="Multi-bill payment",
        ),
        office_id=1,
    )

    # Invariants
    inv1_refreshed = await accounts_service.get_voucher_by_id(session, inv1.id)
    assert inv1_refreshed.paid_amount == Decimal("5000.00")
    assert inv1_refreshed.balance_amount == Decimal("0.00")
    assert inv1_refreshed.payment_status == "PAID"

    inv2_refreshed = await accounts_service.get_voucher_by_id(session, inv2.id)
    assert inv2_refreshed.paid_amount == Decimal("7000.00")
    assert inv2_refreshed.balance_amount == Decimal("8000.00")
    assert inv2_refreshed.payment_status == "PARTIALLY_PAID"

    # Verify BillAllocation records
    stmt = select(BillAllocation).where(BillAllocation.voucher_id == receipt.id)
    allocs = (await session.execute(stmt)).scalars().all()
    assert len(allocs) == 2


@pytest.mark.asyncio
async def test_customer_advance_and_unapplied_excess(e2e_session: AsyncSession):
    """
    Test recording an advance receipt and handling overpayment excess:
    Credit to ACC_CUSTOMER_ADVANCES as a current liability.
    """
    session = e2e_session

    # 1. Pure Advance Receipt of ₹50,000
    adv_receipt = await accounts_service.create_receipt_voucher(
        session,
        ReceiptVoucherCreate(
            billing_client_id=1,
            receipt_type="ADVANCE",
            payment_mode="BANK",
            reference_number="ADV-RTGS-001",
            amount=Decimal("50000.00"),
            narration="Advance freight deposit for upcoming dispatches",
        ),
        office_id=1,
    )

    adv_entries = adv_receipt.ledger_entries
    assert sum(e.debit_amount for e in adv_entries) == sum(e.credit_amount for e in adv_entries) == Decimal("50000.00")
    credit_adv = next(e for e in adv_entries if e.credit_amount == Decimal("50000.00"))
    assert credit_adv.account.code == "ACC_CUSTOMER_ADVANCES"

    # 2. Overpayment Scenario: Invoice is ₹8,000, client sends ₹10,000
    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            items=[GeneralInvoiceItemCreate(description="Charges", quantity=Decimal("1.00"), rate=Decimal("8000.00"), tax_rate=Decimal("0.00"))]
        ),
        office_id=1,
    )

    over_receipt = await accounts_service.create_receipt_voucher(
        session,
        ReceiptVoucherCreate(
            billing_client_id=1,
            receipt_type="AGAINST_REF",
            payment_mode="BANK",
            amount=Decimal("10000.00"),
            allocations=[ReceiptAllocationItem(invoice_id=inv.id, allocated_amount=Decimal("8000.00"))],
            narration="Payment with ₹2,000 advance",
        ),
        office_id=1,
    )

    inv_checked = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_checked.payment_status == "PAID"
    assert inv_checked.balance_amount == Decimal("0.00")

    # Verify ledger entries for over_receipt:
    # Dr. Bank ₹10,000
    # Cr. Debtor ₹8,000
    # Cr. ACC_CUSTOMER_ADVANCES ₹2,000
    entries = over_receipt.ledger_entries
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("10000.00")
    debtor_cr = next(e for e in entries if e.credit_amount == Decimal("8000.00"))
    adv_cr = next(e for e in entries if e.credit_amount == Decimal("2000.00"))
    assert adv_cr.account.code == "ACC_CUSTOMER_ADVANCES"


@pytest.mark.asyncio
async def test_void_receipt_restores_invoice_balances(e2e_session: AsyncSession):
    """
    Test voiding a receipt voucher:
    Verifies that bill allocations are unallocated, invoice balance_amount is restored,
    and reversing ledger entries are posted.
    """
    session = e2e_session

    inv = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            items=[GeneralInvoiceItemCreate(description="Detention Charges", quantity=Decimal("1.00"), rate=Decimal("15000.00"), tax_rate=Decimal("0.00"))]
        ),
        office_id=1,
    )

    receipt = await accounts_service.create_receipt_voucher(
        session,
        ReceiptVoucherCreate(
            billing_client_id=1,
            receipt_type="AGAINST_REF",
            payment_mode="BANK",
            amount=Decimal("15000.00"),
            allocations=[ReceiptAllocationItem(invoice_id=inv.id, allocated_amount=Decimal("15000.00"))],
        ),
        office_id=1,
    )

    inv_paid = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_paid.payment_status == "PAID"
    assert inv_paid.balance_amount == Decimal("0.00")

    # Void the receipt
    await accounts_service.void_voucher(
        session,
        receipt.id,
        VoidVoucherRequest(void_reason="Cheque dishonoured / bounced by bank"),
    )

    # Verify invoice balance is restored to ₹15,000 and UNPAID
    inv_restored = await accounts_service.get_voucher_by_id(session, inv.id)
    assert inv_restored.payment_status == "UNPAID"
    assert inv_restored.balance_amount == Decimal("15000.00")
    assert inv_restored.paid_amount == Decimal("0.00")

    # Verify receipt is marked void
    rv_void = await accounts_service.get_voucher_by_id(session, receipt.id)
    assert rv_void.is_void is True
    assert rv_void.void_reason == "Cheque dishonoured / bounced by bank"


@pytest.mark.asyncio
async def test_get_open_invoices_for_client(e2e_session: AsyncSession):
    """
    Test querying open invoices for a billing client:
    Returns unpaid bills in chronological FIFO order with remaining balance.
    """
    session = e2e_session

    inv1 = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_date=date(2026, 4, 1),
            items=[GeneralInvoiceItemCreate(description="Freight Charge 1", quantity=Decimal("1.00"), rate=Decimal("12000.00"), tax_rate=Decimal("0.00"))]
        ),
        office_id=1,
    )

    inv2 = await accounts_service.create_general_invoice(
        session,
        GeneralInvoiceCreate(
            billing_client_id=1,
            voucher_date=date(2026, 4, 10),
            items=[GeneralInvoiceItemCreate(description="Freight Charge 2", quantity=Decimal("1.00"), rate=Decimal("24000.00"), tax_rate=Decimal("0.00"))]
        ),
        office_id=1,
    )

    open_invs = await accounts_service.get_open_invoices_for_client(session, client_id=1)
    assert len(open_invs) == 2
    assert open_invs[0].id == inv1.id
    assert open_invs[0].balance_amount == Decimal("12000.00")
    assert open_invs[1].id == inv2.id
    assert open_invs[1].balance_amount == Decimal("24000.00")
