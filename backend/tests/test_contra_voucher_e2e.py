import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.tenant_db.models import (
    TenantBase,
    Voucher,
    LedgerEntry,
    VoucherType,
    Account,
    Branch,
    SeriesMaster,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import (
    ContraVoucherCreate,
    VoidVoucherRequest,
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

        # 2. Seed Series for Contra Voucher
        s_cv = SeriesMaster(
            id=1,
            document_type="CONTRA_VOUCHER",
            prefix="CV-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Contra Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        session.add(s_cv)
        await session.flush()

        # 3. Seed Standard Accounts
        await accounts_service.ensure_standard_accounts(session)
        await session.commit()

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_cash_to_bank_deposit(e2e_session: AsyncSession):
    """
    Scenario 1: Cash to Bank (Cash Deposit)
    Moving ₹50,000 cash into HDFC Bank Account.
    Accounting Effect:
      Dr. HDFC Bank Operating Account ₹50,000
      Cr. Cash-in-hand Account ₹50,000
    P&L Effect: NIL.
    """
    cash_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_CASH")
    bank_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_HDFC_BANK")

    data = ContraVoucherCreate(
        contra_type="CASH_TO_BANK",
        source_account_id=cash_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("50000.00"),
        voucher_date=date.today(),
        transfer_mode="CASH_DEPOSIT",
        reference_number="DEP-SLIP-9901",
        narration="Cash deposited into HDFC Bank Mumbai Central branch",
    )

    voucher = await accounts_service.create_contra_voucher(
        e2e_session, data, office_id=1, user_id=99
    )

    assert voucher.voucher_type == VoucherType.CONTRA_VOUCHER.value
    assert voucher.voucher_number == "CV-2026-0001"
    assert voucher.net_amount == Decimal("50000.00")
    assert voucher.total_amount == Decimal("50000.00")
    assert voucher.tax_amount == Decimal("0.00")
    assert voucher.is_void is False

    entries = voucher.ledger_entries
    assert len(entries) == 2

    # Verify Double Entry Postings
    dr_entry = next(e for e in entries if e.debit_amount > Decimal("0.00"))
    cr_entry = next(e for e in entries if e.credit_amount > Decimal("0.00"))

    assert dr_entry.account_id == bank_acc.id
    assert dr_entry.debit_amount == Decimal("50000.00")
    assert dr_entry.credit_amount == Decimal("0.00")

    assert cr_entry.account_id == cash_acc.id
    assert cr_entry.credit_amount == Decimal("50000.00")
    assert cr_entry.debit_amount == Decimal("0.00")

    # Invariant: Debits == Credits
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("50000.00")


@pytest.mark.asyncio
async def test_bank_to_cash_withdrawal(e2e_session: AsyncSession):
    """
    Scenario 2: Bank to Cash (Withdrawal / Self Cheque / ATM)
    Withdrawing ₹20,000 from HDFC Bank for office operational cash.
    Accounting Effect:
      Dr. Cash-in-hand Account ₹20,000
      Cr. HDFC Bank Operating Account ₹20,000
    """
    cash_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_CASH")
    bank_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_HDFC_BANK")

    data = ContraVoucherCreate(
        contra_type="BANK_TO_CASH",
        source_account_id=bank_acc.id,
        destination_account_id=cash_acc.id,
        amount=Decimal("20000.00"),
        voucher_date=date.today(),
        transfer_mode="CHEQUE",
        cheque_number="CHQ-445566",
        cheque_date=date.today(),
        reference_number="CHQ-445566",
        narration="Self cheque drawn for office petty cash needs",
    )

    voucher = await accounts_service.create_contra_voucher(
        e2e_session, data, office_id=1, user_id=99
    )

    assert voucher.net_amount == Decimal("20000.00")
    entries = voucher.ledger_entries
    assert len(entries) == 2

    dr_entry = next(e for e in entries if e.debit_amount > Decimal("0.00"))
    cr_entry = next(e for e in entries if e.credit_amount > Decimal("0.00"))

    assert dr_entry.account_id == cash_acc.id
    assert dr_entry.debit_amount == Decimal("20000.00")
    assert cr_entry.account_id == bank_acc.id
    assert cr_entry.credit_amount == Decimal("20000.00")


@pytest.mark.asyncio
async def test_bank_to_bank_transfer_with_charges(e2e_session: AsyncSession):
    """
    Scenario 3: Inter-Bank Transfer with Bank Charges
    Transferring ₹1,00,000 from HDFC Bank to ICICI Bank with ₹50 bank charges.
    Accounting Effect:
      Dr. ICICI Bank Operating Account ₹1,00,000
      Dr. Bank Charges Expense Account ₹50
      Cr. HDFC Bank Operating Account ₹1,00,050
    Total Debits = ₹1,00,050 == Total Credits = ₹1,00,050.
    """
    hdfc_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_HDFC_BANK")
    icici_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_ICICI_BANK")
    charges_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_BANK_CHARGES_EXP")

    data = ContraVoucherCreate(
        contra_type="BANK_TO_BANK",
        source_account_id=hdfc_acc.id,
        destination_account_id=icici_acc.id,
        amount=Decimal("100000.00"),
        bank_charges=Decimal("50.00"),
        bank_charges_account_id=charges_acc.id,
        voucher_date=date.today(),
        transfer_mode="NEFT_RTGS",
        reference_number="RTGS-HDFC-9988221",
        narration="Interbank liquidity rebalancing from HDFC to ICICI",
    )

    voucher = await accounts_service.create_contra_voucher(
        e2e_session, data, office_id=1, user_id=99
    )

    assert voucher.net_amount == Decimal("100000.00")
    assert voucher.total_amount == Decimal("100050.00")

    entries = voucher.ledger_entries
    assert len(entries) == 3

    # Check ICICI Debit (Principal)
    icici_dr = next(e for e in entries if e.account_id == icici_acc.id)
    assert icici_dr.debit_amount == Decimal("100000.00")
    assert icici_dr.credit_amount == Decimal("0.00")

    # Check Bank Charges Debit
    charges_dr = next(e for e in entries if e.account_id == charges_acc.id)
    assert charges_dr.debit_amount == Decimal("50.00")
    assert charges_dr.credit_amount == Decimal("0.00")

    # Check HDFC Credit (Principal + Charges)
    hdfc_cr = next(e for e in entries if e.account_id == hdfc_acc.id)
    assert hdfc_cr.credit_amount == Decimal("100050.00")
    assert hdfc_cr.debit_amount == Decimal("0.00")

    # Invariant: Total Debits == Total Credits
    assert sum(e.debit_amount for e in entries) == sum(e.credit_amount for e in entries) == Decimal("100050.00")


@pytest.mark.asyncio
async def test_cash_to_cash_internal_transfer(e2e_session: AsyncSession):
    """
    Scenario 4: Cash to Cash (Main Cash to Petty Cash)
    Transferring ₹5,000 from Main Cash to Petty Cash.
    Accounting Effect:
      Dr. Petty Cash Account ₹5,000
      Cr. Cash-in-hand Account ₹5,000
    """
    main_cash = await accounts_service.get_account_by_code(e2e_session, "ACC_CASH")
    petty_cash = await accounts_service.get_account_by_code(e2e_session, "ACC_PETTY_CASH")

    data = ContraVoucherCreate(
        contra_type="CASH_TO_CASH",
        source_account_id=main_cash.id,
        destination_account_id=petty_cash.id,
        amount=Decimal("5000.00"),
        voucher_date=date.today(),
        transfer_mode="INTERNAL_TRANSFER",
        reference_number="PETTY-TOPUP-01",
        narration="Branch petty cash replenishment from main cashier",
    )

    voucher = await accounts_service.create_contra_voucher(
        e2e_session, data, office_id=1, user_id=99
    )

    assert voucher.net_amount == Decimal("5000.00")
    entries = voucher.ledger_entries
    assert len(entries) == 2

    dr_entry = next(e for e in entries if e.debit_amount > Decimal("0.00"))
    cr_entry = next(e for e in entries if e.credit_amount > Decimal("0.00"))

    assert dr_entry.account_id == petty_cash.id
    assert dr_entry.debit_amount == Decimal("5000.00")
    assert cr_entry.account_id == main_cash.id
    assert cr_entry.credit_amount == Decimal("5000.00")


@pytest.mark.asyncio
async def test_same_account_transfer_rejection(e2e_session: AsyncSession):
    """
    Scenario 5: Prevent selecting the same account for source and destination.
    """
    bank_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_HDFC_BANK")

    data = ContraVoucherCreate(
        contra_type="BANK_TO_BANK",
        source_account_id=bank_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("10000.00"),
        voucher_date=date.today(),
    )

    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.create_contra_voucher(e2e_session, data, office_id=1)

    assert exc_info.value.status_code == 400
    assert "cannot be the same" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_invalid_account_type_rejection(e2e_session: AsyncSession):
    """
    Scenario 6: Prevent selecting a third-party debtor/creditor ledger in Contra.
    """
    debtor_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_SUNDRY_DEBTORS")
    bank_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_HDFC_BANK")

    # Manually mark debtor with a billing_client_id to simulate party ledger
    debtor_acc.billing_client_id = 999
    await e2e_session.flush()

    data = ContraVoucherCreate(
        contra_type="CASH_TO_BANK",
        source_account_id=debtor_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("15000.00"),
        voucher_date=date.today(),
    )

    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.create_contra_voucher(e2e_session, data, office_id=1)

    assert exc_info.value.status_code == 400
    assert "third parties" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_contra_voiding_reversal(e2e_session: AsyncSession):
    """
    Scenario 7: Voiding a Contra Voucher creates exact reversing entries and restores balances.
    """
    cash_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_CASH")
    bank_acc = await accounts_service.get_account_by_code(e2e_session, "ACC_HDFC_BANK")

    data = ContraVoucherCreate(
        contra_type="CASH_TO_BANK",
        source_account_id=cash_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("30000.00"),
        voucher_date=date.today(),
        reference_number="VOID-TEST-REF",
    )

    voucher = await accounts_service.create_contra_voucher(
        e2e_session, data, office_id=1, user_id=99
    )
    v_id = voucher.id

    # Void voucher
    void_req = VoidVoucherRequest(void_reason="Deposit slip cancelled by bank cashier - insufficient denomination")
    voided = await accounts_service.void_voucher(e2e_session, v_id, void_req, user_id=101)

    assert voided.is_void is True
    assert voided.void_reason == void_req.void_reason
    assert voided.voided_by == 101

    # Check that reversal entries exist
    reversal_entries = [e for e in voided.ledger_entries if e.is_reversal]
    assert len(reversal_entries) == 2

    # Reversal for Bank (Cr. 30,000)
    bank_rev = next(e for e in reversal_entries if e.account_id == bank_acc.id)
    assert bank_rev.credit_amount == Decimal("30000.00")
    assert bank_rev.debit_amount == Decimal("0.00")

    # Reversal for Cash (Dr. 30,000)
    cash_rev = next(e for e in reversal_entries if e.account_id == cash_acc.id)
    assert cash_rev.debit_amount == Decimal("30000.00")
    assert cash_rev.credit_amount == Decimal("0.00")


@pytest.mark.asyncio
async def test_get_contra_eligible_accounts(e2e_session: AsyncSession):
    """
    Scenario 8: Eligible accounts list only returns Bank and Cash accounts with live balances.
    """
    eligible = await accounts_service.get_contra_eligible_accounts(e2e_session)
    assert len(eligible) >= 4  # Cash, Petty Cash, HDFC, ICICI, SBI

    types = {a.account_type for a in eligible}
    assert types == {"BANK", "CASH"}

    # None of the accounts should be Debtor or Creditor
    for a in eligible:
        assert a.account_type in ("BANK", "CASH")
        assert a.current_balance >= Decimal("0.00")
        assert a.balance_type in ("DR", "CR")
