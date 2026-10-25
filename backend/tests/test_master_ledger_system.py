import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.tenant_db.models import (
    TenantBase,
    Branch,
    BillingClient,
    Vendor,
    Driver,
    Account,
    Voucher,
    VoucherType,
    PrimaryGroup,
    GroupInPrimary,
    TripAdvance,
    TripExpense,
)
from app.modules.accounts import master_ledger_service, service as accounts_service
from app.modules.accounts.schemas import VoucherCreate


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Branch
        branch = Branch(
            id=1,
            code="HO",
            name="Head Office Mumbai",
            city="Mumbai",
            state="Maharashtra",
            is_head_office=True,
            is_active=True,
        )
        session.add(branch)

        # Chart of accounts groups
        pg_asset = PrimaryGroup(id=1, name="Current Assets", code="ASSETS", nature="ASSET")
        pg_liab = PrimaryGroup(id=2, name="Current Liabilities", code="LIAB", nature="LIABILITY")
        session.add_all([pg_asset, pg_liab])
        await session.flush()

        grp_debtors = GroupInPrimary(id=1, name="Sundry Debtors", code="DEBTORS", primary_group_id=1)
        grp_creditors = GroupInPrimary(id=2, name="Sundry Creditors", code="CREDITORS", primary_group_id=2)
        grp_bank = GroupInPrimary(id=3, name="Bank Accounts", code="BANK", primary_group_id=1)
        session.add_all([grp_debtors, grp_creditors, grp_bank])
        await session.flush()

        # Bank Account & Revenue Account
        acc_bank = Account(id=1, name="HDFC Bank", code="ACC_HDFC_BANK", group_id=3, opening_balance=Decimal("100000.00"), opening_balance_type="DR")
        acc_rev = Account(id=2, name="Freight Revenue", code="ACC_FREIGHT_REV", group_id=1, opening_balance=Decimal("0.00"), opening_balance_type="CR")
        acc_exp = Account(id=3, name="Truck Hire Expense", code="ACC_TRUCK_HIRE_EXP", group_id=2, opening_balance=Decimal("0.00"), opening_balance_type="DR")
        session.add_all([acc_bank, acc_rev, acc_exp])
        await session.commit()

        yield session


@pytest.mark.asyncio
async def test_billing_client_ledger_lifecycle(test_session: AsyncSession):
    session = test_session

    # 1. Create a Billing Client
    client = BillingClient(
        name="Tata Steel Logistics Ltd",
        code="BC-TATA",
        company_name="Tata Steel Limited",
        phone="9876543210",
        gstin="27AAACT2727Q1ZW",
        issuing_office_id=1,
        is_active=True,
    )
    session.add(client)
    await session.commit()
    await session.refresh(client)

    # 2. Check initial ledger list
    ledgers = await master_ledger_service.list_billing_client_ledgers(session)
    assert len(ledgers) == 1
    assert ledgers[0].name == "Tata Steel Logistics Ltd"
    assert ledgers[0].outstanding_balance == Decimal("0.00")
    assert ledgers[0].balance_type == "NIL"

    # 3. Post a Customer Freight Invoice of ₹50,000
    v1 = await accounts_service.post_voucher(
        session,
        VoucherCreate(
            voucher_number="TI-2026-0001",
            voucher_type=VoucherType.TRANSPORT_INVOICE.value,
            voucher_date=date(2026, 4, 10),
            party_name="Tata Steel Logistics Ltd",
            party_type="CONSIGNER",
            reference_number="LR-1001",
            total_amount=Decimal("50000.00"),
            tax_amount=Decimal("0.00"),
            net_amount=Decimal("50000.00"),
            narration="Freight Charges for LR-1001 to Jamshedpur",
            billing_client_id=client.id,
            issuing_office_id=1,
            items=[],
        )
    )
    assert v1.id is not None

    # 4. Verify client ledger updated with ₹50,000 Receivable (DR)
    ledgers = await master_ledger_service.list_billing_client_ledgers(session)
    assert len(ledgers) == 1
    assert ledgers[0].total_debit == Decimal("50000.00")
    assert ledgers[0].total_credit == Decimal("0.00")
    assert ledgers[0].outstanding_balance == Decimal("50000.00")
    assert ledgers[0].balance_type == "DR"
    assert ledgers[0].transaction_count == 1

    # 5. Post a Receipt Voucher of ₹30,000 from client
    v2 = await accounts_service.post_voucher(
        session,
        VoucherCreate(
            voucher_number="RV-2026-0001",
            voucher_type=VoucherType.RECEIPT_VOUCHER.value,
            voucher_date=date(2026, 4, 15),
            party_name="Tata Steel Logistics Ltd",
            party_type="CONSIGNER",
            reference_number="NEFT-987654",
            total_amount=Decimal("30000.00"),
            net_amount=Decimal("30000.00"),
            narration="Received NEFT on account of TI-2026-0001",
            billing_client_id=client.id,
            issuing_office_id=1,
            items=[],
        )
    )
    assert v2.id is not None

    # 6. Verify outstanding reduced to ₹20,000
    ledgers = await master_ledger_service.list_billing_client_ledgers(session)
    assert ledgers[0].total_debit == Decimal("50000.00")
    assert ledgers[0].total_credit == Decimal("30000.00")
    assert ledgers[0].outstanding_balance == Decimal("20000.00")
    assert ledgers[0].balance_type == "DR"
    assert ledgers[0].transaction_count == 2

    # 7. Check Detailed Statement
    detail = await master_ledger_service.get_billing_client_ledger_detail(session, client.id)
    assert detail.party.name == "Tata Steel Logistics Ltd"
    assert len(detail.transactions) == 2
    assert detail.total_debit == Decimal("50000.00")
    assert detail.total_credit == Decimal("30000.00")
    assert detail.closing_balance == Decimal("20000.00")
    assert detail.closing_balance_type == "DR"

    # Row 1 running balance = 50,000
    assert detail.transactions[0].voucher_number == "TI-2026-0001"
    assert detail.transactions[0].debit_amount == Decimal("50000.00")
    assert detail.transactions[0].running_balance == Decimal("50000.00")

    # Row 2 running balance = 20,000
    assert detail.transactions[1].voucher_number == "RV-2026-0001"
    assert detail.transactions[1].credit_amount == Decimal("30000.00")
    assert detail.transactions[1].running_balance == Decimal("20000.00")


@pytest.mark.asyncio
async def test_vendor_and_driver_ledgers(test_session: AsyncSession):
    session = test_session

    # 1. Vendor
    vendor = Vendor(
        name="Apex Logistics & Fleet",
        phone="9123456789",
        pan="ABCDE1234F",
        gstin="27ABCDE1234F1Z5",
        issuing_office_id=1,
        is_active=True,
    )
    session.add(vendor)

    # 2. Driver
    driver = Driver(
        name="Ramesh Kumar",
        phone="9811223344",
        license_number="DL-0420200012345",
        is_active=True,
    )
    session.add(driver)
    await session.commit()
    await session.refresh(vendor)
    await session.refresh(driver)

    # 3. Post a Vendor Purchase Bill of ₹40,000
    await accounts_service.post_voucher(
        session,
        VoucherCreate(
            voucher_number="NP-2026-0001",
            voucher_type=VoucherType.NORMAL_PURCHASE.value,
            voucher_date=date(2026, 4, 12),
            party_name="Apex Logistics & Fleet",
            party_type="VENDOR",
            reference_number="BILL-990",
            total_amount=Decimal("40000.00"),
            net_amount=Decimal("40000.00"),
            narration="Trailer tyre replacement & maintenance",
            vendor_id=vendor.id,
            issuing_office_id=1,
            items=[],
        )
    )

    # Check vendor ledger
    v_ledgers = await master_ledger_service.list_vendor_ledgers(session)
    assert len(v_ledgers) == 1
    assert v_ledgers[0].outstanding_payable == Decimal("40000.00")
    assert v_ledgers[0].balance_type == "CR"

    # Post Vendor Payment of ₹25,000
    await accounts_service.post_voucher(
        session,
        VoucherCreate(
            voucher_number="PV-2026-0001",
            voucher_type=VoucherType.PAYMENT_VOUCHER.value,
            voucher_date=date(2026, 4, 18),
            party_name="Apex Logistics & Fleet",
            party_type="VENDOR",
            reference_number="CHQ-123456",
            total_amount=Decimal("25000.00"),
            net_amount=Decimal("25000.00"),
            narration="Part payment against BILL-990",
            vendor_id=vendor.id,
            issuing_office_id=1,
            items=[],
        )
    )

    v_detail = await master_ledger_service.get_vendor_ledger_detail(session, vendor.id)
    assert v_detail.closing_balance == Decimal("15000.00")
    assert v_detail.closing_balance_type == "CR"

    # 4. Driver: Trip Advance & Trip Expense
    adv = TripAdvance(
        advance_number="ADV-2026-0001",
        vehicle_number="MH12AB1234",
        driver_id=driver.id,
        driver_name=driver.name,
        advance_amount=Decimal("15000.00"),
        settled_amount=Decimal("0.00"),
        balance_due=Decimal("15000.00"),
        payment_mode="CASH",
        advance_date=date(2026, 4, 10),
        status="PENDING",
    )
    session.add(adv)

    exp = TripExpense(
        expense_number="EXP-2026-0001",
        vehicle_number="MH12AB1234",
        driver_id=driver.id,
        driver_name=driver.name,
        expense_category="DIESEL",
        amount=Decimal("9500.00"),
        payment_mode="CASH",
        expense_date=date(2026, 4, 14),
        receipt_number="HPCL-887",
        status="APPROVED",
    )
    session.add(exp)
    await session.commit()

    # Check driver ledger
    d_ledgers = await master_ledger_service.list_driver_ledgers(session)
    assert len(d_ledgers) == 1
    assert d_ledgers[0].name == "Ramesh Kumar"
    assert d_ledgers[0].total_advances == Decimal("15000.00")
    assert d_ledgers[0].total_expenses == Decimal("9500.00")
    assert d_ledgers[0].current_balance == Decimal("5500.00")
    assert d_ledgers[0].balance_type == "DR"  # Driver owes company ₹5,500

    d_detail = await master_ledger_service.get_driver_ledger_detail(session, driver.id)
    assert d_detail.closing_balance == Decimal("5500.00")
    assert d_detail.closing_balance_type == "DR"
    assert len(d_detail.transactions) == 2

    # 5. Check Overall Master Ledger Summary
    summary = await master_ledger_service.get_master_ledger_summary(session)
    assert summary.vendors.total_accounts == 1
    assert summary.vendors.total_outstanding == Decimal("15000.00")
    assert summary.drivers.total_accounts == 1
    assert summary.drivers.total_debit == Decimal("15000.00")
    assert summary.drivers.total_credit == Decimal("9500.00")
