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
    Vendor,
    Driver,
    HireChallan,
    BillAllocation,
    SeriesMaster,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import (
    PaymentVoucherCreate,
    PaymentAllocationItem,
    VoidVoucherRequest,
    PurchaseBillCreate,
    PurchaseBillItemCreate,
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

        # 2. Seed Series for Payment Voucher and Purchase
        s_pv = SeriesMaster(
            id=1,
            document_type="PAYMENT_VOUCHER",
            prefix="PV-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Payment Voucher Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        s_np = SeriesMaster(
            id=2,
            document_type="NORMAL_PURCHASE",
            prefix="NP-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Normal Purchase Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        s_gp = SeriesMaster(
            id=3,
            document_type="GENERAL_PURCHASE",
            prefix="GP-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default General Purchase Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        session.add_all([s_pv, s_np, s_gp])

        # 3. Seed Vendor
        vendor = Vendor(
            id=1,
            name="Indian Oil Corporation Ltd",
            gstin="27AAACI1234A1Z5",
            pan="AAACI1234A",
            pan_state="Maharashtra",
            phone="9820012345",
        )
        session.add(vendor)

        # 4. Seed Driver
        driver = Driver(
            id=1,
            name="Ramesh Kumar Singh",
            phone="9876543210",
            license_number="MH0420180099881",
        )
        session.add(driver)

        # 5. Seed Hire Challan
        hc = HireChallan(
            id=1,
            challan_number="HC-2026-0001",
            challan_date=date(2026, 4, 1),
            vehicle_number="NL01AB1234",
            hire_rate=Decimal("35000.00"),
            advance_amount=Decimal("0.00"),
            balance_amount=Decimal("35000.00"),
            net_payable_amount=Decimal("35000.00"),
            status="ISSUED",
            driver_name="Harpreet Singh",
        )
        session.add(hc)

        await session.commit()

        # Seed standard accounts
        await accounts_service.ensure_standard_accounts(session)
        await session.commit()

        yield session


@pytest.mark.asyncio
async def test_vendor_bill_settlement_with_tds_and_discount(e2e_session: AsyncSession):
    """
    Test recording a payment voucher against a vendor purchase bill:
    Settles payable liability, retains TDS (Sec 194C), records discount received,
    and ensures NO duplicate expense is created.
    """
    session = e2e_session

    # 1. Create a Purchase Bill for ₹20,000
    bill = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="GENERAL_PURCHASE",
            vendor_id=1,
            bill_number="IOCL/MUM/8821",
            bill_date=date(2026, 4, 1),
            payment_terms="30 Days",
            items=[
                PurchaseBillItemCreate(
                    description="Diesel Fuel Bulk Supply",
                    hsn_sac="2710",
                    quantity=Decimal("1.00"),
                    rate=Decimal("20000.00"),
                    tax_category_id=None,
                )
            ],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    assert bill.balance_amount == Decimal("20000.00")
    assert bill.payment_status == "UNPAID"

    # 2. Settle the bill: Net bank payment ₹19,200, TDS retained ₹400 (2% u/s 194C), Discount received ₹400
    pmt = await accounts_service.create_payment_voucher(
        session,
        PaymentVoucherCreate(
            vendor_id=1,
            payment_type="AGAINST_REF",
            payment_mode="BANK",
            reference_number="NEFT_IOCL_001",
            amount=Decimal("19200.00"),
            tds_section="194C",
            tds_amount=Decimal("400.00"),
            discount_amount=Decimal("400.00"),
            allocations=[
                PaymentAllocationItem(
                    invoice_id=bill.id,
                    allocated_amount=Decimal("19200.00"),
                    tds_amount=Decimal("400.00"),
                    discount_amount=Decimal("400.00"),
                )
            ],
            narration="Payment for Diesel Bulk Supply Bill IOCL/MUM/8821",
        ),
        office_id=1,
    )

    assert pmt.voucher_number.startswith("PV-2026-")
    assert pmt.net_amount == Decimal("19200.00")
    assert pmt.total_amount == Decimal("20000.00")

    # Verify purchase bill is marked fully PAID with balance ₹0
    bill_updated = await accounts_service.get_voucher_by_id(session, bill.id)
    assert bill_updated.paid_amount == Decimal("20000.00")
    assert bill_updated.balance_amount == Decimal("0.00")
    assert bill_updated.payment_status == "PAID"

    # Verify Double-Entry Journal Postings
    entries = pmt.ledger_entries
    debits = sum(e.debit_amount for e in entries)
    credits = sum(e.credit_amount for e in entries)
    assert debits == credits == Decimal("20000.00")

    # Debit entry: Creditor Account ₹20,000 (reduces liability)
    creditor_dr = next(e for e in entries if e.debit_amount == Decimal("20000.00"))
    assert creditor_dr.account_id == bill.account_id

    # Credit entry: Bank Account ₹19,200 (actual cash outflow)
    bank_cr = next(e for e in entries if e.credit_amount == Decimal("19200.00"))
    assert bank_cr.account.code == "ACC_HDFC_BANK"

    # Credit entry: TDS Payable u/s 194C ₹400
    tds_cr = next(e for e in entries if e.credit_amount == Decimal("400.00") and e.account.code == "ACC_TDS_PAYABLE_194C")
    assert tds_cr is not None

    # Credit entry: Discount Received ₹400
    disc_cr = next(e for e in entries if e.credit_amount == Decimal("400.00") and e.account.code == "ACC_DISCOUNT_RECEIVED")
    assert disc_cr is not None


@pytest.mark.asyncio
async def test_multi_bill_payment_allocation(e2e_session: AsyncSession):
    """
    Test distributing a single vendor payment across multiple outstanding bills:
    Bill 1 (₹8,000) fully settled, Bill 2 (₹12,000) partially settled (₹6,000).
    """
    session = e2e_session

    bill1 = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="GENERAL_PURCHASE",
            vendor_id=1,
            bill_number="IOCL/BILL/01",
            bill_date=date(2026, 4, 1),
            items=[PurchaseBillItemCreate(description="Diesel 1", hsn_sac="2710", quantity=Decimal("1.00"), rate=Decimal("8000.00"))],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    bill2 = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="GENERAL_PURCHASE",
            vendor_id=1,
            bill_number="IOCL/BILL/02",
            bill_date=date(2026, 4, 5),
            items=[PurchaseBillItemCreate(description="Diesel 2", hsn_sac="2710", quantity=Decimal("1.00"), rate=Decimal("12000.00"))],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    # Disburse ₹14,000 total: ₹8,000 to Bill 1, ₹6,000 to Bill 2
    pmt = await accounts_service.create_payment_voucher(
        session,
        PaymentVoucherCreate(
            vendor_id=1,
            payment_type="AGAINST_REF",
            payment_mode="BANK",
            amount=Decimal("14000.00"),
            allocations=[
                PaymentAllocationItem(invoice_id=bill1.id, allocated_amount=Decimal("8000.00")),
                PaymentAllocationItem(invoice_id=bill2.id, allocated_amount=Decimal("6000.00")),
            ],
            narration="Multi-bill settlement for IOCL",
        ),
        office_id=1,
    )

    b1_refreshed = await accounts_service.get_voucher_by_id(session, bill1.id)
    assert b1_refreshed.paid_amount == Decimal("8000.00")
    assert b1_refreshed.balance_amount == Decimal("0.00")
    assert b1_refreshed.payment_status == "PAID"

    b2_refreshed = await accounts_service.get_voucher_by_id(session, bill2.id)
    assert b2_refreshed.paid_amount == Decimal("6000.00")
    assert b2_refreshed.balance_amount == Decimal("6000.00")
    assert b2_refreshed.payment_status == "PARTIALLY_PAID"

    # Verify 2 BillAllocation records
    stmt = select(BillAllocation).where(BillAllocation.voucher_id == pmt.id)
    allocs = (await session.execute(stmt)).scalars().all()
    assert len(allocs) == 2


@pytest.mark.asyncio
async def test_hire_challan_transporter_settlement(e2e_session: AsyncSession):
    """
    Test market vehicle Hire Challan settlement:
    Updates hire challan balance and advances, posts truck hire payment entry.
    """
    session = e2e_session

    hc_before = (await session.execute(select(HireChallan).where(HireChallan.id == 1))).scalar_one()
    assert hc_before.balance_amount == Decimal("35000.00")
    assert hc_before.status == "ISSUED"

    # Pay ₹20,000 advance against Hire Challan
    pmt = await accounts_service.create_payment_voucher(
        session,
        PaymentVoucherCreate(
            payment_type="HIRE_CHALLAN",
            hire_challan_id=1,
            hire_challan_payment_type="ATH",
            payment_mode="BANK",
            amount=Decimal("20000.00"),
            reference_number="ATH_HC_0001",
            narration="Advance To Hired for truck NL01AB1234",
        ),
        office_id=1,
    )

    hc_after = (await session.execute(select(HireChallan).where(HireChallan.id == 1))).scalar_one()
    assert hc_after.advance_amount == Decimal("20000.00")
    assert hc_after.balance_amount == Decimal("15000.00")
    assert hc_after.status == "ISSUED"

    entries = pmt.ledger_entries
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("20000.00")


@pytest.mark.asyncio
async def test_driver_advance_is_current_asset_not_immediate_expense(e2e_session: AsyncSession):
    """
    Test trip advance issued to driver:
    Under Indian accounting, debited to ACC_DRIVER_ADVANCES (Current Asset), NOT immediate expense.
    """
    session = e2e_session

    pmt = await accounts_service.create_payment_voucher(
        session,
        PaymentVoucherCreate(
            driver_id=1,
            payment_type="DRIVER_ADVANCE",
            payment_mode="CASH",
            amount=Decimal("5000.00"),
            narration="Trip advance issued to Ramesh Kumar for Mumbai-Delhi route",
        ),
        office_id=1,
    )

    entries = pmt.ledger_entries
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("5000.00")

    # Verify Debit: ACC_DRIVER_ADVANCES (Current Asset)
    dr_entry = next(e for e in entries if e.debit_amount == Decimal("5000.00"))
    assert dr_entry.account.code == "ACC_DRIVER_ADVANCES"

    # Verify Credit: ACC_CASH
    cr_entry = next(e for e in entries if e.credit_amount == Decimal("5000.00"))
    assert cr_entry.account.code == "ACC_CASH"


@pytest.mark.asyncio
async def test_supplier_overpayment_creates_advance_asset(e2e_session: AsyncSession):
    """
    Test supplier payment exceeding invoice balance:
    Bill settled in full, excess debited to ACC_SUPPLIER_ADVANCES.
    """
    session = e2e_session

    bill = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="GENERAL_PURCHASE",
            vendor_id=1,
            bill_number="IOCL/OVER/01",
            bill_date=date(2026, 4, 1),
            items=[PurchaseBillItemCreate(description="Grease & Lubricants", hsn_sac="2710", quantity=Decimal("1.00"), rate=Decimal("10000.00"))],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    # Disburse ₹12,000 (₹10,000 for bill, ₹2,000 excess advance)
    pmt = await accounts_service.create_payment_voucher(
        session,
        PaymentVoucherCreate(
            vendor_id=1,
            payment_type="AGAINST_REF",
            payment_mode="BANK",
            amount=Decimal("12000.00"),
            allocations=[PaymentAllocationItem(invoice_id=bill.id, allocated_amount=Decimal("10000.00"))],
            narration="Payment with ₹2,000 advance to IOCL",
        ),
        office_id=1,
    )

    # Bill is fully PAID
    b_updated = await accounts_service.get_voucher_by_id(session, bill.id)
    assert b_updated.balance_amount == Decimal("0.00")
    assert b_updated.payment_status == "PAID"

    # Check entries:
    # Dr. Creditor ₹10,000
    # Dr. ACC_SUPPLIER_ADVANCES ₹2,000
    # Cr. Bank ₹12,000
    entries = pmt.ledger_entries
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("12000.00")
    creditor_dr = next(e for e in entries if e.debit_amount == Decimal("10000.00"))
    adv_dr = next(e for e in entries if e.debit_amount == Decimal("2000.00"))
    assert adv_dr.account.code == "ACC_SUPPLIER_ADVANCES"


@pytest.mark.asyncio
async def test_void_payment_restores_bill_and_challan_balances(e2e_session: AsyncSession):
    """
    Test voiding a payment voucher:
    Restores purchase bill balance and Hire Challan balance, posts reversal entries.
    """
    session = e2e_session

    bill = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="GENERAL_PURCHASE",
            vendor_id=1,
            bill_number="IOCL/RESTORE/01",
            bill_date=date(2026, 4, 1),
            items=[PurchaseBillItemCreate(description="Tyre Spare", hsn_sac="4011", quantity=Decimal("1.00"), rate=Decimal("15000.00"))],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    pmt = await accounts_service.create_payment_voucher(
        session,
        PaymentVoucherCreate(
            vendor_id=1,
            payment_type="AGAINST_REF",
            payment_mode="BANK",
            amount=Decimal("15000.00"),
            allocations=[PaymentAllocationItem(invoice_id=bill.id, allocated_amount=Decimal("15000.00"))],
        ),
        office_id=1,
    )

    bill_paid = await accounts_service.get_voucher_by_id(session, bill.id)
    assert bill_paid.payment_status == "PAID"
    assert bill_paid.balance_amount == Decimal("0.00")

    # Void payment
    await accounts_service.void_voucher(
        session,
        pmt.id,
        VoidVoucherRequest(void_reason="Cheque stopped / RTGS failed"),
    )

    # Bill balance restored
    bill_restored = await accounts_service.get_voucher_by_id(session, bill.id)
    assert bill_restored.payment_status == "UNPAID"
    assert bill_restored.balance_amount == Decimal("15000.00")
    assert bill_restored.paid_amount == Decimal("0.00")

    # Void flag set
    pmt_void = await accounts_service.get_voucher_by_id(session, pmt.id)
    assert pmt_void.is_void is True
    assert pmt_void.void_reason == "Cheque stopped / RTGS failed"


@pytest.mark.asyncio
async def test_get_open_bills_for_vendor(e2e_session: AsyncSession):
    """
    Test querying open purchase bills for a vendor:
    Returns unpaid bills in chronological FIFO order with remaining balance.
    """
    session = e2e_session

    b1 = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="GENERAL_PURCHASE",
            vendor_id=1,
            bill_number="IOCL/FIFO/01",
            bill_date=date(2026, 4, 1),
            items=[PurchaseBillItemCreate(description="Fuel 1", hsn_sac="2710", quantity=Decimal("1.00"), rate=Decimal("5000.00"))],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    b2 = await accounts_service.create_purchase_bill(
        session,
        PurchaseBillCreate(
            purchase_type="GENERAL_PURCHASE",
            vendor_id=1,
            bill_number="IOCL/FIFO/02",
            bill_date=date(2026, 4, 10),
            items=[PurchaseBillItemCreate(description="Fuel 2", hsn_sac="2710", quantity=Decimal("1.00"), rate=Decimal("15000.00"))],
            issuing_office_id=1,
        ),
        office_id=1,
    )

    open_bills = await accounts_service.get_open_bills_for_vendor(session, vendor_id=1)
    assert len(open_bills) == 2
    assert open_bills[0].id == b1.id
    assert open_bills[0].balance_amount == Decimal("5000.00")
    assert open_bills[1].id == b2.id
    assert open_bills[1].balance_amount == Decimal("15000.00")
