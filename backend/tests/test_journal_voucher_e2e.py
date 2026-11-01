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
from app.modules.accounts import schemas


@pytest.fixture
async def journal_session():
    """In-memory SQLite database configured with complete test fixtures."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Seed Branch
        ho = Branch(id=1, name="Delhi Central Office", code="DEL-01", is_head_office=True, state="Delhi", is_active=True)
        session.add(ho)

        # 2. Seed Series for Journal Voucher
        s_jv = SeriesMaster(
            id=1,
            document_type="JOURNAL_VOUCHER",
            prefix="JV-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Journal Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        session.add(s_jv)
        await session.flush()

        # 3. Seed Standard Accounts
        await accounts_service.ensure_standard_accounts(session)
        await session.commit()

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_depreciation_journal_entry(journal_session: AsyncSession):
    """
    Test 1: Record periodic depreciation on fleet vehicles per AS-10.
    Debit: Depreciation Expense (₹10,000)
    Credit: Accumulated Depreciation (₹10,000)
    """
    dep_exp_acc = await accounts_service.get_account_by_code(journal_session, "ACC_DEPRECIATION_EXP")
    accum_dep_acc = await accounts_service.get_account_by_code(journal_session, "ACC_ACCUMULATED_DEP")

    assert dep_exp_acc is not None
    assert accum_dep_acc is not None

    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="DEPRECIATION",
        reference_number="ASSET-DEP-NOV26",
        narration="Depreciation charge on commercial transport vehicles for November 2026 per AS-10",
        cost_center="Fleet Operations",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=dep_exp_acc.id,
                debit_amount=Decimal("10000.00"),
                credit_amount=Decimal("0.00"),
                narration="Vehicle depreciation expense",
            ),
            schemas.JournalEntryLineCreate(
                account_id=accum_dep_acc.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("10000.00"),
                narration="Accumulated depreciation on fleet",
            ),
        ],
    )

    voucher = await accounts_service.create_journal_voucher(journal_session, req)
    assert voucher.id is not None
    assert voucher.voucher_type == VoucherType.JOURNAL_VOUCHER.value
    assert voucher.net_amount == Decimal("10000.00")
    assert voucher.payment_status == "POSTED"
    assert voucher.is_void is False
    assert len(voucher.ledger_entries) == 2

    # Check debit and credit balance
    total_dr = sum(le.debit_amount for le in voucher.ledger_entries)
    total_cr = sum(le.credit_amount for le in voucher.ledger_entries)
    assert total_dr == Decimal("10000.00")
    assert total_cr == Decimal("10000.00")

    # Verify running balance
    bal_dep, type_dep, _, _ = await accounts_service.calculate_account_balance(journal_session, dep_exp_acc.id)
    assert bal_dep == Decimal("10000.00")
    assert type_dep == "DR"

    bal_acc, type_acc, _, _ = await accounts_service.calculate_account_balance(journal_session, accum_dep_acc.id)
    assert bal_acc == Decimal("10000.00")
    assert type_acc == "CR"


@pytest.mark.asyncio
async def test_multi_line_journal_entry(journal_session: AsyncSession):
    """
    Test 2: Multi-line compound journal entry (1 Debit, 2 Credits).
    Debit: Truck Hire Expense ₹15,000
    Credit: TDS Payable 194C ₹150 (1%)
    Credit: Outstanding Expense ₹14,850
    """
    hire_acc = await accounts_service.get_account_by_code(journal_session, "ACC_TRUCK_HIRE_EXP")
    tds_acc = await accounts_service.get_account_by_code(journal_session, "ACC_TDS_PAYABLE_194C")
    out_exp_acc = await accounts_service.get_account_by_code(journal_session, "ACC_OUTSTANDING_EXP")

    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="EXPENSE_ADJUSTMENT",
        reference_number="COMPOUND-JV-001",
        narration="Accrual of truck hire expense with statutory TDS deduction",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=hire_acc.id,
                debit_amount=Decimal("15000.00"),
                credit_amount=Decimal("0.00"),
                narration="Gross truck hire charges",
            ),
            schemas.JournalEntryLineCreate(
                account_id=tds_acc.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("150.00"),
                narration="TDS payable u/s 194C @ 1%",
            ),
            schemas.JournalEntryLineCreate(
                account_id=out_exp_acc.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("14850.00"),
                narration="Net payable for truck hire",
            ),
        ],
    )

    voucher = await accounts_service.create_journal_voucher(journal_session, req)
    assert len(voucher.ledger_entries) == 3
    total_dr = sum(le.debit_amount for le in voucher.ledger_entries)
    total_cr = sum(le.credit_amount for le in voucher.ledger_entries)
    assert total_dr == Decimal("15000.00")
    assert total_cr == Decimal("15000.00")


@pytest.mark.asyncio
async def test_unbalanced_entry_rejected(journal_session: AsyncSession):
    """
    Test 3: Unbalanced entry prevention (Debits != Credits).
    """
    hire_acc = await accounts_service.get_account_by_code(journal_session, "ACC_TRUCK_HIRE_EXP")
    out_exp_acc = await accounts_service.get_account_by_code(journal_session, "ACC_OUTSTANDING_EXP")

    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="GENERAL",
        narration="Unbalanced test entry",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=hire_acc.id,
                debit_amount=Decimal("10000.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=out_exp_acc.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("8500.00"),
            ),
        ],
    )

    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.create_journal_voucher(journal_session, req)

    assert exc_info.value.status_code == 400
    assert "unbalanced" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_outstanding_expense_accounting(journal_session: AsyncSession):
    """
    Test 4: Outstanding Expense Accounting.
    Debit: Office & Admin Expense ₹8,000
    Credit: Outstanding Expenses Payable ₹8,000
    """
    office_exp = await accounts_service.get_account_by_code(journal_session, "ACC_OFFICE_EXP")
    out_exp = await accounts_service.get_account_by_code(journal_session, "ACC_OUTSTANDING_EXP")

    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="OUTSTANDING_EXPENSE",
        narration="Provision for November office utilities and maintenance",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=office_exp.id,
                debit_amount=Decimal("8000.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=out_exp.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("8000.00"),
            ),
        ],
    )

    voucher = await accounts_service.create_journal_voucher(journal_session, req)
    assert voucher.payment_status == "POSTED"
    assert voucher.note_category == "OUTSTANDING_EXPENSE"


@pytest.mark.asyncio
async def test_prepaid_expense_accounting(journal_session: AsyncSession):
    """
    Test 5: Prepaid Expense Amortization.
    Debit: Expense Account ₹6,000
    Credit: Prepaid Expense Asset ₹6,000
    """
    office_exp = await accounts_service.get_account_by_code(journal_session, "ACC_OFFICE_EXP")
    prepaid_exp = await accounts_service.get_account_by_code(journal_session, "ACC_PREPAID_EXP")

    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="PREPAID_EXPENSE",
        narration="Monthly recognition of annual prepaid insurance expense",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=office_exp.id,
                debit_amount=Decimal("6000.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=prepaid_exp.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("6000.00"),
            ),
        ],
    )

    voucher = await accounts_service.create_journal_voucher(journal_session, req)
    assert voucher.net_amount == Decimal("6000.00")


@pytest.mark.asyncio
async def test_accrued_income_accounting(journal_session: AsyncSession):
    """
    Test 6: Accrued Freight Revenue Accounting.
    Debit: Accrued Freight Income (Asset) ₹20,000
    Credit: Freight Revenue Account (Revenue) ₹20,000
    """
    accrued_inc = await accounts_service.get_account_by_code(journal_session, "ACC_ACCRUED_INCOME")
    freight_rev = await accounts_service.get_account_by_code(journal_session, "ACC_FREIGHT_REV")

    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="ACCRUED_INCOME",
        narration="Accrual of delivered freight revenue awaiting final customer POD verification",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=accrued_inc.id,
                debit_amount=Decimal("20000.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=freight_rev.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("20000.00"),
            ),
        ],
    )

    voucher = await accounts_service.create_journal_voucher(journal_session, req)
    assert voucher.net_amount == Decimal("20000.00")
    bal, bal_type, _, _ = await accounts_service.calculate_account_balance(journal_session, accrued_inc.id)
    assert bal == Decimal("20000.00")
    assert bal_type == "DR"


@pytest.mark.asyncio
async def test_cash_bank_restricted_by_default(journal_session: AsyncSession):
    """
    Test 7: Direct Cash/Bank entries restricted by default in Journal Voucher.
    """
    bank_acc = await accounts_service.get_account_by_code(journal_session, "ACC_HDFC_BANK")
    office_exp = await accounts_service.get_account_by_code(journal_session, "ACC_OFFICE_EXP")

    # 1. Attempt with allow_cash_bank=False -> Must fail
    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="GENERAL",
        narration="Trying to post bank disbursement via journal",
        allow_cash_bank=False,
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=office_exp.id,
                debit_amount=Decimal("5000.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=bank_acc.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("5000.00"),
            ),
        ],
    )

    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.create_journal_voucher(journal_session, req)

    assert exc_info.value.status_code == 400
    assert "cash/bank account" in exc_info.value.detail.lower()

    # 2. Attempt with allow_cash_bank=True -> Allowed for exceptional authorized adjustments
    req.allow_cash_bank = True
    voucher = await accounts_service.create_journal_voucher(journal_session, req)
    assert voucher.id is not None
    assert voucher.payment_status == "POSTED"


@pytest.mark.asyncio
async def test_preview_journal_voucher(journal_session: AsyncSession):
    """
    Test 8: Dry-run accounting preview and impact explanations.
    """
    dep_exp = await accounts_service.get_account_by_code(journal_session, "ACC_DEPRECIATION_EXP")
    accum_dep = await accounts_service.get_account_by_code(journal_session, "ACC_ACCUMULATED_DEP")

    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="DEPRECIATION",
        narration="Fleet depreciation preview",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=dep_exp.id,
                debit_amount=Decimal("12000.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=accum_dep.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("12000.00"),
            ),
        ],
    )

    preview = await accounts_service.preview_journal_voucher(journal_session, req)
    assert preview.is_balanced is True
    assert preview.total_debit == Decimal("12000.00")
    assert preview.total_credit == Decimal("12000.00")
    assert preview.difference == Decimal("0.00")
    assert len(preview.lines) == 2
    assert "Increases Expenses" in preview.lines[0].accounting_impact
    assert len(preview.validation_errors) == 0


@pytest.mark.asyncio
async def test_draft_and_post_journal_voucher(journal_session: AsyncSession):
    """
    Test 9: Save as DRAFT then POST workflow.
    """
    office_exp = await accounts_service.get_account_by_code(journal_session, "ACC_OFFICE_EXP")
    out_exp = await accounts_service.get_account_by_code(journal_session, "ACC_OUTSTANDING_EXP")

    # Step A: Save Draft
    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="OUTSTANDING_EXPENSE",
        narration="Draft provision for utilities",
        is_draft=True,
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=office_exp.id,
                debit_amount=Decimal("7500.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=out_exp.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("7500.00"),
            ),
        ],
    )

    draft_v = await accounts_service.create_journal_voucher(journal_session, req)
    assert draft_v.payment_status == "DRAFT"
    # Draft should have 0 active ledger entries
    assert len(draft_v.ledger_entries) == 0

    # Step B: Post Draft
    posted_v = await accounts_service.post_draft_journal_voucher(journal_session, draft_v.id)
    assert posted_v.payment_status == "POSTED"
    assert len(posted_v.ledger_entries) == 2
    assert sum(le.debit_amount for le in posted_v.ledger_entries) == Decimal("7500.00")


@pytest.mark.asyncio
async def test_reverse_journal_voucher(journal_session: AsyncSession):
    """
    Test 10: Reversal of posted Journal Voucher creates balanced reversing entries.
    """
    hire_acc = await accounts_service.get_account_by_code(journal_session, "ACC_TRUCK_HIRE_EXP")
    out_exp = await accounts_service.get_account_by_code(journal_session, "ACC_OUTSTANDING_EXP")

    # 1. Post voucher
    req = schemas.JournalVoucherCreate(
        voucher_date=date(2026, 11, 1),
        issuing_office_id=1,
        adjustment_type="EXPENSE_ADJUSTMENT",
        narration="Temporary accrual for month-end",
        entries=[
            schemas.JournalEntryLineCreate(
                account_id=hire_acc.id,
                debit_amount=Decimal("9000.00"),
                credit_amount=Decimal("0.00"),
            ),
            schemas.JournalEntryLineCreate(
                account_id=out_exp.id,
                debit_amount=Decimal("0.00"),
                credit_amount=Decimal("9000.00"),
            ),
        ],
    )
    v = await accounts_service.create_journal_voucher(journal_session, req)
    assert v.payment_status == "POSTED"

    # 2. Reverse voucher
    rev_req = schemas.JournalVoucherReverseRequest(
        reversal_reason="Reversing temporary month-end accrual upon receipt of actual supplier bill",
    )
    reversed_v = await accounts_service.reverse_journal_voucher(journal_session, v.id, rev_req)
    assert reversed_v.is_void is True
    assert "Reversing temporary" in reversed_v.void_reason
    # Total ledger entries should be 4 (2 original + 2 reversing)
    assert len(reversed_v.ledger_entries) == 4

    # Verify net running balance of the accounts is restored to 0
    bal_hire, _, _, _ = await accounts_service.calculate_account_balance(journal_session, hire_acc.id)
    assert bal_hire == Decimal("0.00")


@pytest.mark.asyncio
async def test_adjustment_types_list(journal_session: AsyncSession):
    """
    Test 11: 14 Indian accounting adjustment categories metadata.
    """
    adj_types = accounts_service.get_journal_adjustment_types_list()
    assert len(adj_types) == 14
    codes = [a["code"] for a in adj_types]
    assert "DEPRECIATION" in codes
    assert "OUTSTANDING_EXPENSE" in codes
    assert "PREPAID_EXPENSE" in codes
    assert "ACCRUED_INCOME" in codes
    assert "GST_ADJUSTMENT" in codes
    assert "TDS_ADJUSTMENT" in codes

