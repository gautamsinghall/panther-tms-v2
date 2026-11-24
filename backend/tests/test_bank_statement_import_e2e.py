import os
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
    BillingClient,
    Driver,
    HireChallan,
    BillAllocation,
    SeriesMaster,
    CompanyBankAccount,
    BankStatementImport,
    BankStatementLine,
    MasterAlias,
    User,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts import bank_statement_service
from app.modules.accounts import schemas


FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "ICICI_TODAYS.xls")


@pytest.fixture
async def bank_recon_session():
    """Isolated in-memory SQLite database configured with complete test fixtures."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Branch
        ho = Branch(id=1, name="Panther Logistics HQ", code="HO-MUM", is_head_office=True, state="Maharashtra")
        session.add(ho)

        # 2. User
        admin_user = User(
            id=1,
            email="admin@pantherlogistics.in",
            full_name="Accounts Admin",
            password_hash="dummy",
            role="COMPANY_ADMIN",
            is_active=True,
        )
        session.add(admin_user)

        # 3. Series Masters
        session.add_all([
            SeriesMaster(
                id=1, document_type="PAYMENT_VOUCHER", prefix="PV-2026-", suffix="",
                starting_number=1, current_number=0, financial_year="2026-2027",
                series_mode="AUTOMATIC", series_name="Default PV", issuing_office_id=1, is_default=True, is_active=True
            ),
            SeriesMaster(
                id=2, document_type="RECEIPT_VOUCHER", prefix="RV-2026-", suffix="",
                starting_number=1, current_number=0, financial_year="2026-2027",
                series_mode="AUTOMATIC", series_name="Default RV", issuing_office_id=1, is_default=True, is_active=True
            ),
            SeriesMaster(
                id=3, document_type="CONTRA_VOUCHER", prefix="CONTRA-2026-", suffix="",
                starting_number=1, current_number=0, financial_year="2026-2027",
                series_mode="AUTOMATIC", series_name="Default Contra", issuing_office_id=1, is_default=True, is_active=True
            ),
            SeriesMaster(
                id=4, document_type="NORMAL_PURCHASE", prefix="NP-2026-", suffix="",
                starting_number=1, current_number=0, financial_year="2026-2027",
                series_mode="AUTOMATIC", series_name="Default NP", issuing_office_id=1, is_default=True, is_active=True
            ),
            SeriesMaster(
                id=5, document_type="TRANSPORT_INVOICE", prefix="TI-2026-", suffix="",
                starting_number=1, current_number=0, financial_year="2026-2027",
                series_mode="AUTOMATIC", series_name="Default TI", issuing_office_id=1, is_default=True, is_active=True
            ),
        ])

        # 4. Master Accounts (Bank, GST, Charges, Advances)
        icici_acc = Account(id=1, name="ICICI Bank Current A/c", code="ICICI-0022", group_id=1, is_active=True)
        hdfc_acc = Account(id=2, name="HDFC Bank Current A/c", code="HDFC-4445", group_id=1, is_active=True)
        gst_acc = Account(id=3, name="Duties & Taxes (GST)", code="DUTIES-GST", group_id=2, is_active=True)
        chg_acc = Account(id=4, name="Bank Charges & Commission", code="BANK-CHG", group_id=3, is_active=True)
        drv_adv_acc = Account(id=5, name="Driver Trip Advances", code="DRV-ADV", group_id=4, is_active=True)
        vendor_ctrl = Account(id=6, name="Sundry Creditors (Vendors)", code="VEND-CTRL", group_id=5, is_active=True)
        client_ctrl = Account(id=7, name="Sundry Debtors (Clients)", code="CLIENT-CTRL", group_id=6, is_active=True)
        cash_acc = Account(id=8, name="Cash in Hand", code="CASH", group_id=1, is_active=True)
        session.add_all([icici_acc, hdfc_acc, gst_acc, chg_acc, drv_adv_acc, vendor_ctrl, client_ctrl, cash_acc])

        # 5. Company Bank Accounts
        # ICICI Bank account matches the example file: account_number = 755605000022 (...0022)
        icici_cba = CompanyBankAccount(
            id=1,
            bank_name="ICICI Bank",
            account_holder_name="PANTHER LOGISTICS PRIVATE LIMITED",
            account_number="755605000022",
            account_type="Current",
            ifsc_code="ICIC0007556",
            issuing_office_id=1,
            account_id=1,
            ledger_name="ICICI Bank Current A/c",
            is_active=True,
            is_default=True,
        )
        # HDFC Bank account with ...4445 (for wrong-bank tests)
        hdfc_cba = CompanyBankAccount(
            id=2,
            bank_name="HDFC Bank",
            account_holder_name="PANTHER LOGISTICS PRIVATE LIMITED",
            account_number="50200012344445",
            account_type="Current",
            ifsc_code="HDFC0001234",
            issuing_office_id=1,
            account_id=2,
            ledger_name="HDFC Bank Current A/c",
            is_active=True,
            is_default=False,
        )
        session.add_all([icici_cba, hdfc_cba])

        # 6. Parties: Drivers, Vendors, Clients
        driver_himanshu = Driver(
            id=1,
            name="Himanshu Sharma",
            phone="9876543210",
            is_active=True,
        )
        vendor_neelkanth = Vendor(
            id=1,
            name="NEELKANTH MOTORS",
            is_active=True,
        )
        vendor_sharma_1 = Vendor(
            id=2,
            name="Sharma Traders Delhi",
            is_active=True,
        )
        vendor_sharma_2 = Vendor(
            id=3,
            name="Sharma Logistics Hub",
            is_active=True,
        )
        client_tata = BillingClient(
            id=1,
            name="Tata Motors Commercial",
            is_active=True,
        )
        session.add_all([driver_himanshu, vendor_neelkanth, vendor_sharma_1, vendor_sharma_2, client_tata])

        await session.commit()

    async with async_session() as session:
        yield session


# ==============================================================================
# TEST 1 & 12: Real Example File (ICICI_TODAYS.xls) + Bank Account Validation
# ==============================================================================

@pytest.mark.asyncio
async def test_icici_todays_import_and_rules(bank_recon_session: AsyncSession):
    """
    Acceptance Test 1 & 12:
    - Upload ICICI_TODAYS.xls (3 rows, all DR): total out ₹14,695.00, 0 Receipt candidates.
    - Row 3 (GST ₹3,195) -> Ready to Confirm as Direct Expense / GST.
    - Row 1 (Himanshu ₹5,000) & Row 2 (ELECTRONIC ₹6,500) -> Needs Decision, 0 vouchers auto-created.
    - Step 0 Bank verification: if HDFC ...4445 selected, reject whole import.
    - Re-upload same file -> duplicate guard rejects (0 new rows).
    """
    session = bank_recon_session
    with open(FIXTURE_PATH, "rb") as f:
        file_bytes = f.read()

    # 1. Wrong bank test (Selected HDFC id=2 (...4445) while file is ICICI ...0022)
    with pytest.raises(Exception) as exc_info:
        await bank_statement_service.import_and_queue_bank_statement(
            session=session,
            bank_account_id=2,  # HDFC ...4445
            file_bytes=file_bytes,
            file_name="ICICI_TODAYS.xls",
            current_user_id=1,
        )
    assert "This statement is for A/C ...0022" in str(exc_info.value.detail)
    assert "you selected HDFC Bank ...4445" in str(exc_info.value.detail)

    # 2. Correct bank test (Selected ICICI id=1 (...0022))
    imp = await bank_statement_service.import_and_queue_bank_statement(
        session=session,
        bank_account_id=1,
        file_bytes=file_bytes,
        file_name="ICICI_TODAYS.xls",
        current_user_id=1,
    )

    assert imp.total_lines == 3
    assert imp.money_out_count == 3
    assert imp.money_out_amount == Decimal("14695.00")
    assert imp.money_in_count == 0
    assert imp.money_in_amount == Decimal("0.00")
    assert imp.ready_count == 1
    assert imp.needs_decision_count == 2
    assert imp.vouchers_created_count == 0  # 0 vouchers auto-created!

    lines = imp.lines
    assert len(lines) == 3

    # Row 1: HIMANSHU FOR OP -> Needs Decision
    r1 = next(l for l in lines if "HIMANSHU" in l.description)
    assert r1.status == "NEEDS_DECISION"
    assert "Who is Himanshu" in r1.question_prompt
    assert r1.amount == Decimal("5000.00")
    assert r1.cr_dr == "DR"

    # Row 2: ELECTRONIC -> Needs Decision
    r2 = next(l for l in lines if "ELECTRONIC" in l.description)
    assert r2.status == "NEEDS_DECISION"
    assert "No party name" in r2.skip_reason
    assert r2.amount == Decimal("6500.00")

    # Row 3: GST -> Ready to Confirm as STATUTORY_PAYMENT
    r3 = next(l for l in lines if "GST" in l.description)
    assert r3.status == "READY"
    assert r3.suggested_party_type == "STATUTORY"
    assert r3.suggested_payment_type == "STATUTORY_PAYMENT"
    assert r3.amount == Decimal("3195.00")

    # Post Row 3 voucher
    v3 = await bank_statement_service.confirm_and_post_line(session, r3.id)
    assert v3 is not None
    assert v3.voucher_type == "PAYMENT_VOUCHER"
    assert v3.total_amount == Decimal("3195.00")
    assert v3.voucher_number.startswith("PV-2026-")

    # Verify double-entry balance on v3
    dr_total = sum(le.debit_amount for le in v3.ledger_entries)
    cr_total = sum(le.credit_amount for le in v3.ledger_entries)
    assert dr_total == Decimal("3195.00")
    assert cr_total == Decimal("3195.00")

    # 3. Re-upload duplicate file -> rejected with 0 new rows
    with pytest.raises(Exception) as exc_dup:
        await bank_statement_service.import_and_queue_bank_statement(
            session=session,
            bank_account_id=1,
            file_bytes=file_bytes,
            file_name="ICICI_TODAYS.xls",
            current_user_id=1,
        )
    assert "already imported" in str(exc_dup.value.detail)


# ==============================================================================
# TEST 2: Part Payment on Vendor Bill
# ==============================================================================

@pytest.mark.asyncio
async def test_part_payment_vendor_bill(bank_recon_session: AsyncSession):
    """
    Acceptance Test 2:
    - Vendor bill ₹10,000, statement payment ₹5,000
    - Voucher posts, bill shows PARTIALLY PAID, Paid ₹5,000 of ₹10,000, Remaining ₹5,000.
    - Second ₹5,000 payment -> bill becomes PAID, Remaining ₹0.
    - Vendor balance falls by ₹5,000 each time.
    """
    session = bank_recon_session

    # Create Vendor Bill for ₹10,000
    bill = Voucher(
        voucher_number="NP-2026-0001",
        voucher_type="NORMAL_PURCHASE",
        voucher_date=date(2026, 11, 20),
        party_name="NEELKANTH MOTORS",
        party_type="VENDOR",
        vendor_id=1,
        total_amount=Decimal("10000.00"),
        tax_amount=Decimal("0.00"),
        net_amount=Decimal("10000.00"),
        paid_amount=Decimal("0.00"),
        balance_amount=Decimal("10000.00"),
        payment_status="UNPAID",
    )
    session.add(bill)
    await session.commit()
    await session.refresh(bill)

    # 1. First statement payment: ₹5,000
    p1 = bank_statement_service.ParsedStatementRow(
        row_number=1,
        transaction_id="TXN-P1",
        value_date=date(2026, 11, 24),
        txn_posted_date="24/11/2026",
        cheque_number=None,
        description="NEFT/TXN-P1/NEELKANTH MOTORS/NP-2026-0001",
        cr_dr="DR",
        amount=Decimal("5000.00"),
        available_balance=None,
    )
    ba = (await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.id == 1))).scalar_one()
    vendors = (await session.execute(select(Vendor))).scalars().all()
    aliases = (await session.execute(select(MasterAlias))).scalars().all()

    match_res = await bank_statement_service.resolve_line_matching(
        session=session,
        line=p1,
        bank_account=ba,
        all_bank_accounts=[ba],
        vendors=vendors,
        clients=[],
        drivers=[],
        aliases=aliases,
        duties_taxes_account=None,
        bank_charges_account=None,
    )

    assert match_res["status"] == "READY"
    assert match_res["suggested_party_id"] == 1
    assert match_res["bill_allocations_data"] is not None
    alloc = match_res["bill_allocations_data"][0]
    assert alloc["allocated_amount"] == 5000.0
    assert alloc["remaining_balance"] == 5000.0

    # Post payment voucher
    pv1_data = schemas.PaymentVoucherCreate(
        vendor_id=1,
        party_name="NEELKANTH MOTORS",
        voucher_date=date(2026, 11, 24),
        payment_type="AGAINST_REF",
        bank_account_id=1,
        amount=Decimal("5000.00"),
        allocations=[
            schemas.PaymentAllocationItem(invoice_id=bill.id, allocated_amount=Decimal("5000.00"))
        ],
    )
    v1 = await accounts_service.create_payment_voucher(session, pv1_data)
    await session.refresh(bill)

    assert bill.payment_status == "PARTIALLY_PAID"
    assert bill.paid_amount == Decimal("5000.00")
    assert bill.balance_amount == Decimal("5000.00")

    # 2. Second statement payment: ₹5,000 closes the bill
    pv2_data = schemas.PaymentVoucherCreate(
        vendor_id=1,
        party_name="NEELKANTH MOTORS",
        voucher_date=date(2026, 11, 25),
        payment_type="AGAINST_REF",
        bank_account_id=1,
        amount=Decimal("5000.00"),
        allocations=[
            schemas.PaymentAllocationItem(invoice_id=bill.id, allocated_amount=Decimal("5000.00"))
        ],
    )
    v2 = await accounts_service.create_payment_voucher(session, pv2_data)
    await session.refresh(bill)

    assert bill.payment_status == "PAID"
    assert bill.paid_amount == Decimal("10000.00")
    assert bill.balance_amount == Decimal("0.00")


# ==============================================================================
# TEST 3 & 5: Two Bills for One Vendor (Exact Match & Split)
# ==============================================================================

@pytest.mark.asyncio
async def test_two_bills_exact_and_split(bank_recon_session: AsyncSession):
    """
    Acceptance Test 3 & 5:
    - Bills ₹8,000 + ₹6,000.
    - Statement payment ₹8,000 -> exact amount matches the ₹8,000 bill only (READY).
    - Statement payment ₹5,000 -> Needs Decision, human splits across bills.
    - Statement payment ₹14,000 -> splits ₹8,000 + ₹6,000, both PAID.
    """
    session = bank_recon_session
    b1 = Voucher(
        voucher_number="NP-2026-0002", voucher_type="NORMAL_PURCHASE", voucher_date=date(2026, 11, 10),
        party_name="NEELKANTH MOTORS", party_type="VENDOR", vendor_id=1,
        total_amount=Decimal("8000.00"), tax_amount=Decimal("0.00"), net_amount=Decimal("8000.00"),
        paid_amount=Decimal("0.00"), balance_amount=Decimal("8000.00"), payment_status="UNPAID",
    )
    b2 = Voucher(
        voucher_number="NP-2026-0003", voucher_type="NORMAL_PURCHASE", voucher_date=date(2026, 11, 15),
        party_name="NEELKANTH MOTORS", party_type="VENDOR", vendor_id=1,
        total_amount=Decimal("6000.00"), tax_amount=Decimal("0.00"), net_amount=Decimal("6000.00"),
        paid_amount=Decimal("0.00"), balance_amount=Decimal("6000.00"), payment_status="UNPAID",
    )
    session.add_all([b1, b2])
    await session.commit()

    # Case A: ₹8,000 exact match
    allocs_8k, status_8k = await bank_statement_service.find_bill_allocations_for_party(
        session, "VENDOR", 1, Decimal("8000.00"), "NEELKANTH MOTORS"
    )
    assert status_8k == "READY"
    assert len(allocs_8k) == 1
    assert allocs_8k[0]["bill_number"] == "NP-2026-0002"
    assert allocs_8k[0]["allocated_amount"] == 8000.0

    # Case B: ₹5,000 payment (less than single bill) -> NEEDS_DECISION
    allocs_5k, status_5k = await bank_statement_service.find_bill_allocations_for_party(
        session, "VENDOR", 1, Decimal("5000.00"), "NEELKANTH MOTORS"
    )
    assert status_5k == "NEEDS_DECISION"
    assert len(allocs_5k) == 2

    # Case C: ₹14,000 payment (covers both bills)
    pv_14k = schemas.PaymentVoucherCreate(
        vendor_id=1, party_name="NEELKANTH MOTORS", voucher_date=date(2026, 11, 24),
        payment_type="AGAINST_REF", bank_account_id=1, amount=Decimal("14000.00"),
        allocations=[
            schemas.PaymentAllocationItem(invoice_id=b1.id, allocated_amount=Decimal("8000.00")),
            schemas.PaymentAllocationItem(invoice_id=b2.id, allocated_amount=Decimal("6000.00")),
        ],
    )
    v14 = await accounts_service.create_payment_voucher(session, pv_14k)
    await session.refresh(b1)
    await session.refresh(b2)
    assert b1.payment_status == "PAID"
    assert b2.payment_status == "PAID"


# ==============================================================================
# TEST 4: Overpayment on Bill
# ==============================================================================

@pytest.mark.asyncio
async def test_overpayment_on_bill(bank_recon_session: AsyncSession):
    """
    Acceptance Test 4:
    - Bill ₹4,000, statement payment ₹5,000
    - Allocates ₹4,000 to the bill (PAID), excess ₹1,000 goes to Excess/Advance with warning.
    - Bill never shows more than ₹4,000 allocated.
    """
    session = bank_recon_session
    b_small = Voucher(
        voucher_number="NP-2026-0004", voucher_type="NORMAL_PURCHASE", voucher_date=date(2026, 11, 10),
        party_name="NEELKANTH MOTORS", party_type="VENDOR", vendor_id=1,
        total_amount=Decimal("4000.00"), tax_amount=Decimal("0.00"), net_amount=Decimal("4000.00"),
        paid_amount=Decimal("0.00"), balance_amount=Decimal("4000.00"), payment_status="UNPAID",
    )
    session.add(b_small)
    await session.commit()

    allocs, st = await bank_statement_service.find_bill_allocations_for_party(
        session, "VENDOR", 1, Decimal("5000.00"), "NP-2026-0004"
    )
    assert st == "NEEDS_DECISION"
    assert allocs[0]["allocated_amount"] == 4000.0
    assert allocs[0]["is_excess"] is True
    assert allocs[0]["excess_amount"] == 1000.0


# ==============================================================================
# TEST 6 & 13: UPI Unknown, Ask While Importing & Alias Learning
# ==============================================================================

@pytest.mark.asyncio
async def test_upi_unknown_and_alias_learning(bank_recon_session: AsyncSession):
    """
    Acceptance Test 6 & 13:
    - UPI line with no name and no alias -> Skipped, 0 vouchers.
    - Row 1 (Himanshu): interactive question asked inside review queue.
    - Tap Driver -> saves alias "HIMANSHU" -> Himanshu Sharma.
    - Second file with same text -> suggested at 100% by alias!
    """
    session = bank_recon_session
    ba = (await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.id == 1))).scalar_one()

    # 1. UPI line without alias -> SKIPPED
    upi_line = bank_statement_service.ParsedStatementRow(
        row_number=1, transaction_id="UPI-9999", value_date=date(2026, 11, 24),
        txn_posted_date="24/11/2026", cheque_number=None,
        description="UPI/432198765432/PAYMENT/randommerchant@icici",
        cr_dr="DR", amount=Decimal("1500.00"), available_balance=None,
    )
    res_upi = await bank_statement_service.resolve_line_matching(
        session=session, line=upi_line, bank_account=ba, all_bank_accounts=[ba],
        vendors=[], clients=[], drivers=[], aliases=[],
        duties_taxes_account=None, bank_charges_account=None,
    )
    assert res_upi["status"] == "SKIPPED"
    assert "UPI — unknown party" in res_upi["skip_reason"]

    # 2. Himanshu Row 1: question asked
    him_line = bank_statement_service.ParsedStatementRow(
        row_number=2, transaction_id="S21293751", value_date=date(2026, 11, 24),
        txn_posted_date="24/11/2026", cheque_number=None,
        description="INF/INFT/046804044461/HIMANSHU FOR OP/HIMANSHUSHARMAS",
        cr_dr="DR", amount=Decimal("5000.00"), available_balance=None,
    )
    res_him = await bank_statement_service.resolve_line_matching(
        session=session, line=him_line, bank_account=ba, all_bank_accounts=[ba],
        vendors=[], clients=[], drivers=[], aliases=[],
        duties_taxes_account=None, bank_charges_account=None,
    )
    assert res_him["status"] == "NEEDS_DECISION"
    assert "Who is Himanshu" in res_him["question_prompt"]

    # Create dummy import and line in DB to test answer_line_question
    imp = BankStatementImport(
        company_bank_account_id=1, file_name="test.xls", file_hash="hash123", total_lines=1
    )
    session.add(imp)
    await session.flush()

    db_line = BankStatementLine(
        import_id=imp.id, row_number=1, transaction_id="S21293751", value_date=date(2026, 11, 24),
        description="INF/INFT/046804044461/HIMANSHU FOR OP/HIMANSHUSHARMAS", cr_dr="DR",
        amount=Decimal("5000.00"), status="NEEDS_DECISION", question_prompt="Who is Himanshu?",
    )
    session.add(db_line)
    await session.commit()

    # User answers: DRIVER (Himanshu Sharma id=1)
    ans_req = schemas.ResolveQuestionRequest(
        party_type="DRIVER",
        party_id=1,
        party_name="Himanshu Sharma",
        save_alias=True,
    )
    updated_line = await bank_statement_service.answer_line_question(session, db_line.id, ans_req, current_user_id=1)
    assert updated_line.status == "READY"
    assert updated_line.suggested_party_name == "Himanshu Sharma"
    assert updated_line.suggested_payment_type == "DRIVER_ADVANCE"

    # Verify MasterAlias saved
    alias_rec = (await session.execute(select(MasterAlias).where(MasterAlias.party_id == 1))).scalar_one_or_none()
    assert alias_rec is not None
    assert alias_rec.party_type == "DRIVER"

    # 3. Next time: same text matches at 100% by alias!
    aliases_updated = (await session.execute(select(MasterAlias))).scalars().all()
    res_him_second = await bank_statement_service.resolve_line_matching(
        session=session, line=him_line, bank_account=ba, all_bank_accounts=[ba],
        vendors=[], clients=[], drivers=[], aliases=aliases_updated,
        duties_taxes_account=None, bank_charges_account=None,
    )
    assert res_him_second["status"] == "READY"
    assert res_him_second["confidence_score"] == 100
    assert res_him_second["suggested_party_name"] == "Himanshu Sharma"


# ==============================================================================
# TEST 7 & 8: Duplicate Match & Internal Contra Transfer
# ==============================================================================

@pytest.mark.asyncio
async def test_duplicate_match_and_contra(bank_recon_session: AsyncSession):
    """
    Acceptance Test 7 & 8:
    - Already entered voucher in TMS matches statement line -> MATCHED (0 new vouchers).
    - Transfer between HDFC and ICICI -> CONTRA voucher, not Payment or Receipt.
    """
    session = bank_recon_session

    # 1. Pre-existing voucher in TMS
    pre_v = Voucher(
        voucher_number="PV-2026-0005", voucher_type="PAYMENT_VOUCHER", voucher_date=date(2026, 11, 24),
        total_amount=Decimal("2500.00"), tax_amount=Decimal("0.00"), net_amount=Decimal("2500.00"),
        paid_amount=Decimal("2500.00"), balance_amount=Decimal("0.00"), payment_status="PAID",
        company_bank_account_id=1, reference_number="REF-ALREADY-ENTERED", is_void=False,
    )
    session.add(pre_v)
    await session.commit()

    ba1 = (await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.id == 1))).scalar_one()
    ba2 = (await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.id == 2))).scalar_one()

    # Statement line matching pre-existing voucher
    stmt_line = bank_statement_service.ParsedStatementRow(
        row_number=1, transaction_id="REF-ALREADY-ENTERED", value_date=date(2026, 11, 24),
        txn_posted_date="24/11/2026", cheque_number=None,
        description="INF/INFT/REF-ALREADY-ENTERED/SOME PAYMENT",
        cr_dr="DR", amount=Decimal("2500.00"), available_balance=None,
    )
    res_dup = await bank_statement_service.resolve_line_matching(
        session=session, line=stmt_line, bank_account=ba1, all_bank_accounts=[ba1, ba2],
        vendors=[], clients=[], drivers=[], aliases=[],
        duties_taxes_account=None, bank_charges_account=None,
    )
    assert res_dup["status"] == "MATCHED"
    assert res_dup["matched_voucher_number"] == "PV-2026-0005"

    # 2. Contra internal transfer: ICICI to HDFC (...4445)
    contra_line = bank_statement_service.ParsedStatementRow(
        row_number=2, transaction_id="CONTRA-101", value_date=date(2026, 11, 24),
        txn_posted_date="24/11/2026", cheque_number=None,
        description="TRANSFER TO OWN HDFC A/C 50200012344445",
        cr_dr="DR", amount=Decimal("20000.00"), available_balance=None,
    )
    res_contra = await bank_statement_service.resolve_line_matching(
        session=session, line=contra_line, bank_account=ba1, all_bank_accounts=[ba1, ba2],
        vendors=[], clients=[], drivers=[], aliases=[],
        duties_taxes_account=None, bank_charges_account=None,
    )
    assert res_contra["suggested_voucher_type"] == "CONTRA_VOUCHER"
    assert res_contra["confidence_score"] >= 90


# ==============================================================================
# TEST 9: Name Mismatch & Multiple Parties Ambiguity
# ==============================================================================

@pytest.mark.asyncio
async def test_name_mismatch_and_multiple_similar_parties(bank_recon_session: AsyncSession):
    """
    Acceptance Test 9:
    - Description 'NEELKANTH MOT' suggests NEELKANTH MOTORS at >=90%.
    - Description with two similar vendors ('SHARMA') forces human pick (Needs Decision).
    """
    session = bank_recon_session
    ba = (await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.id == 1))).scalar_one()
    vendors = (await session.execute(select(Vendor))).scalars().all()

    # Case 1: NEELKANTH MOT
    l1 = bank_statement_service.ParsedStatementRow(
        row_number=1, transaction_id="TXN-N1", value_date=date(2026, 11, 24),
        txn_posted_date="24/11/2026", cheque_number=None,
        description="RTGS/NEELKANTH MOT/SUPPLIER PAYMENT",
        cr_dr="DR", amount=Decimal("3000.00"), available_balance=None,
    )
    r1 = await bank_statement_service.resolve_line_matching(
        session=session, line=l1, bank_account=ba, all_bank_accounts=[ba],
        vendors=vendors, clients=[], drivers=[], aliases=[],
        duties_taxes_account=None, bank_charges_account=None,
    )
    assert r1["confidence_score"] >= 90
    assert r1["suggested_party_name"] == "NEELKANTH MOTORS"

    # Case 2: SHARMA (matches both Sharma Traders Delhi and Sharma Logistics Hub)
    l2 = bank_statement_service.ParsedStatementRow(
        row_number=2, transaction_id="TXN-S1", value_date=date(2026, 11, 24),
        txn_posted_date="24/11/2026", cheque_number=None,
        description="NEFT/SHARMA/SUPPLIER PAYMENT",
        cr_dr="DR", amount=Decimal("4000.00"), available_balance=None,
    )
    r2 = await bank_statement_service.resolve_line_matching(
        session=session, line=l2, bank_account=ba, all_bank_accounts=[ba],
        vendors=vendors, clients=[], drivers=[], aliases=[],
        duties_taxes_account=None, bank_charges_account=None,
    )
    assert r2["status"] == "NEEDS_DECISION"
    assert len(r2["question_options"]) >= 2  # Shows both options to choose


# ==============================================================================
# TEST 14: Skipped Entries Report
# ==============================================================================

@pytest.mark.asyncio
async def test_skipped_entries_report(bank_recon_session: AsyncSession):
    """
    Acceptance Test 14:
    - Row 2 (ELECTRONIC ₹6,500) skipped -> appears in Skipped Entries Report.
    - Transaction ID S21462641, reason 'No party name', total ₹6,500.
    - Map to party later -> shows as re-processed with voucher number.
    - Closing and re-opening import preserves skipped entry.
    """
    session = bank_recon_session
    imp = BankStatementImport(
        company_bank_account_id=1, file_name="ICICI_TODAYS.xls", file_hash="hash987", total_lines=1
    )
    session.add(imp)
    await session.flush()

    line = BankStatementLine(
        import_id=imp.id, row_number=2, transaction_id="S21462641", value_date=date(2026, 11, 24),
        description="BIL/ONL/001263656959/ELECTRONIC", cr_dr="DR", amount=Decimal("6500.00"),
        status="SKIPPED", skip_reason="No party name — ELECTRONIC",
    )
    session.add(line)
    await session.commit()

    # 1. Fetch Skipped Entries Report
    report = await bank_statement_service.get_skipped_entries_report(session, bank_account_id=1)
    assert len(report) >= 1
    item = next(r for r in report if r.transaction_id == "S21462641")
    assert item.amount == Decimal("6500.00")
    assert item.skip_reason == "No party name — ELECTRONIC"
    assert item.status == "SKIPPED"

    # 2. Map line to vendor (NEELKANTH MOTORS id=1) and re-process
    map_req = schemas.MapPartyRequest(
        party_type="VENDOR",
        party_id=1,
        party_name="NEELKANTH MOTORS",
        alias_text="ELECTRONIC",
    )
    mapped_line = await bank_statement_service.map_party_and_reprocess(session, line.id, map_req, current_user_id=1)
    assert mapped_line.status == "READY"
    assert mapped_line.suggested_party_name == "NEELKANTH MOTORS"

    # Post voucher
    v = await bank_statement_service.confirm_and_post_line(session, mapped_line.id)
    assert v.voucher_number.startswith("PV-2026-")

    # 3. Check report again: shows REPROCESSED with created voucher number
    report_after = await bank_statement_service.get_skipped_entries_report(session, bank_account_id=1)
    item_after = next(r for r in report_after if r.transaction_id == "S21462641")
    assert item_after.status == "REPROCESSED"
    assert item_after.created_voucher_number == v.voucher_number
