import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.tenant_db.models import (
    TenantBase,
    Account,
    Branch,
    Vendor,
    Voucher,
    VoucherType,
    PrimaryGroup,
    GroupInPrimary,
    SeriesMaster,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import PurchaseBillCreate, PurchaseBillItemCreate
from app.modules.accounts import master_ledger_service
from app.modules.reports import service as reports_service
from app.modules.statements import service as statements_service
from app.modules.misc.tally_chart_of_accounts import seed_indian_accounting_chart_of_accounts


@pytest.fixture
async def tds_session():
    """Isolated in-memory database configured for TDS reconciliation testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with session_maker() as session:
        # 1. Seed Chart of Accounts
        await seed_indian_accounting_chart_of_accounts(session)

        # 2. Seed Branch
        ho = Branch(id=1, name="Mumbai Central Hub", code="MUM-HO", is_head_office=True, state="Maharashtra")
        session.add(ho)

        # 3. Seed Series
        s_np = SeriesMaster(
            id=1,
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
        session.add(s_np)

        # 4. Seed Vendor DSKNMCD without valid PAN (triggers Sec 206AA 20% higher rate)
        v_dsk = Vendor(
            id=1,
            name="DSKNMCD",
            gstin=None,
            state="Maharashtra",
            pan=None,  # No PAN furnished
            issuing_office_id=1,
            is_active=True,
        )
        session.add(v_dsk)
        await session.commit()

        yield session


@pytest.mark.asyncio
async def test_np_2026_0001_tds_reconciliation(tds_session: AsyncSession):
    session = tds_session

    # Base figures from source document NP-2026-0001 / HC-2026-0007
    gross_hire_expense = Decimal("97794241.00")
    tds_rate = Decimal("20.00")
    tds_amount = Decimal("19558848.20")
    net_payable = Decimal("78235392.80")

    # 1. Book purchase bill NP-2026-0001 for vehicle hire
    bill_create = PurchaseBillCreate(
        vendor_id=1,
        party_name="DSKNMCD",
        purchase_category="TRUCK_HIRE",
        purchase_type="NORMAL_PURCHASE",
        voucher_number="NP-2026-0001",
        voucher_date=date(2026, 4, 10),
        credit_period_days=30,
        bill_number="HC-2026-0007",
        bill_date=date(2026, 4, 10),
        gst_treatment="EXEMPT",
        itc_eligibility="INELIGIBLE",
        tds_section="194C",
        tds_rate=tds_rate,
        tds_amount=tds_amount,
        items=[
            PurchaseBillItemCreate(
                description="Vehicle hire charges under HC-2026-0007",
                hsn_sac="996511",
                quantity=Decimal("1.00"),
                rate=gross_hire_expense,
                discount_amount=Decimal("0.00"),
                tax_category_id=None,
            )
        ],
        narration="Vehicle hire charges under HC-2026-0007 from DSKNMCD",
    )

    voucher = await accounts_service.create_purchase_bill(session, bill_create, office_id=1)

    # 2. Verify Voucher Integrity
    assert voucher.voucher_number == "NP-2026-0001"
    assert voucher.total_amount == gross_hire_expense
    assert voucher.tax_amount == Decimal("0.00")  # GST is 0.00
    assert voucher.balance_amount == net_payable

    # 3. Verify Journal Postings Line by Line
    # Dr Vehicle Hire Expense ₹9,77,94,241.00 = Cr DSKNMCD Payable ₹7,82,35,392.80 + Cr TDS Payable ₹1,95,58,848.20
    entries = voucher.ledger_entries
    assert len(entries) == 3

    dr_entry = next(e for e in entries if e.debit_amount > Decimal("0.00"))
    cr_tds = next(e for e in entries if e.account.code == "ACC_TDS_PAYABLE_194C")
    cr_vendor = next(e for e in entries if e.credit_amount > Decimal("0.00") and e.account.code != "ACC_TDS_PAYABLE_194C")

    assert dr_entry.debit_amount == gross_hire_expense
    assert dr_entry.account.code == "ACC_TRUCK_HIRE_EXP"
    assert "HC-2026-0007" in dr_entry.narration

    assert cr_vendor.credit_amount == net_payable
    assert "20% TDS" in cr_vendor.narration or "DSKNMCD" in cr_vendor.narration

    assert cr_tds.credit_amount == tds_amount
    assert cr_tds.account.code == "ACC_TDS_PAYABLE_194C"
    assert "20% higher rate" in cr_tds.narration

    # Double-entry invariant
    assert dr_entry.debit_amount == cr_vendor.credit_amount + cr_tds.credit_amount

    # 4. Master Ledger & Duties & Taxes
    duties_taxes = await master_ledger_service.list_duties_and_taxes_ledgers(session)
    tds_ledger = next((l for l in duties_taxes if l.code == "ACC_TDS_PAYABLE_194C"), None)
    assert tds_ledger is not None
    assert tds_ledger.name == "TDS Payable u/s 194C (Transporters/Contractors)"
    assert tds_ledger.current_balance == tds_amount
    assert tds_ledger.balance_type == "CR"

    # 5. Trial Balance
    tb = await reports_service.get_trial_balance(session, as_of_date=date(2026, 4, 30))
    tb_tds = None
    for pg in tb.primary_groups:
        for grp in pg.groups:
            for acc in grp.accounts:
                if acc.account_code == "ACC_TDS_PAYABLE_194C":
                    tb_tds = acc
    assert tb_tds is not None
    assert tb_tds.credit_balance == tds_amount
    assert tb.total_debit == tb.total_credit

    # 6. Balance Sheet
    bs = await reports_service.get_balance_sheet(session, as_of_date=date(2026, 4, 30))
    bs_tds = None
    for lg in bs.liability_groups:
        for acc in lg.accounts:
            if acc.account_code == "ACC_TDS_PAYABLE_194C":
                bs_tds = acc
    assert bs_tds is not None
    assert bs_tds.amount == tds_amount
    assert bs_tds.account_name == "TDS Payable u/s 194C (Transporters/Contractors)"

    # 7. Daybook
    daybook = await reports_service.get_daybook(session, from_date=date(2026, 4, 1), to_date=date(2026, 4, 30))
    np_entries = [e for e in daybook.entries if e.voucher_number == "NP-2026-0001"]
    assert len(np_entries) == 3
    for e in np_entries:
        assert "NP-2026-0001" in e.narration

    daybook_tds = next(e for e in np_entries if e.account_code == "ACC_TDS_PAYABLE_194C")
    assert daybook_tds.credit_amount == tds_amount
    assert "20% higher rate for no PAN" in daybook_tds.narration

    # 8. Purchase Register
    pr = await reports_service.get_purchase_register(session, from_date=date(2026, 4, 1), to_date=date(2026, 4, 30))
    np_pr = next(p for p in pr.purchases if p.voucher_number == "NP-2026-0001")
    assert np_pr.taxable_amount == gross_hire_expense
    assert np_pr.total_tax == Decimal("0.00")  # GST is 0.00, not TDS
    assert np_pr.tds_amount == tds_amount
    assert np_pr.tds_rate == tds_rate
    assert np_pr.tax_label == "TDS Payable u/s 194C (20% higher rate u/s 206AA)"
    assert np_pr.net_amount == net_payable

    # 9. TDS Payable Report & TDS Return
    tds_payable_rep = await statements_service.get_tds_payable(session)
    np_tds_rec = next(r for r in tds_payable_rep.records if r.voucher_number == "NP-2026-0001")
    assert np_tds_rec.gross_amount == gross_hire_expense
    assert np_tds_rec.tds_amount == tds_amount
    assert np_tds_rec.tds_rate == tds_rate
    assert np_tds_rec.section == "194C"
    assert np_tds_rec.is_deposited is False

    tds_return = await statements_service.get_tds_return(session, quarter="Q1", financial_year="2026-27")
    sec_194c = next(s for s in tds_return.sections if s.section == "194C")
    assert sec_194c.deductee_count == 1
    assert sec_194c.total_amount_paid == gross_hire_expense
    assert sec_194c.total_tds_deducted == tds_amount
    assert sec_194c.total_tds_deposited == Decimal("0.00")
    assert tds_return.total_tax_deducted == tds_amount
    assert tds_return.total_tax_deposited == Decimal("0.00")

    # 10. Complete Reconciliation Across All 4 Statements
    assert tb_tds.credit_balance == tds_amount
    assert bs_tds.amount == tds_amount
    assert daybook_tds.credit_amount == tds_amount
    assert tds_return.total_tax_deducted == tds_amount
    assert tds_ledger.current_balance == tds_amount
    assert np_pr.tds_amount == tds_amount
