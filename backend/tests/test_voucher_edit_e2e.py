import pytest
from datetime import date
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
    BillingClient,
    Vendor,
    VoucherItem,
    TaxCategory,
)
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import (
    ContraVoucherCreate,
    JournalVoucherCreate,
    ReceiptVoucherCreate,
    PaymentVoucherCreate,
    PurchaseBillCreate,
    PurchaseBillItemCreate,
    CreditDebitNoteCreate,
    JournalEntryLineCreate,
    VoidVoucherRequest,
)


@pytest.fixture
async def test_session():
    """Isolated SQLite in-memory test database."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # Branch
        ho = Branch(id=1, name="Mumbai HO", code="MUM-HO", is_head_office=True, state="Maharashtra")
        session.add(ho)

        # Series masters
        series_configs = [
            ("CONTRA_VOUCHER", "CV-2026-"),
            ("JOURNAL_VOUCHER", "JV-2026-"),
            ("RECEIPT_VOUCHER", "RV-2026-"),
            ("PAYMENT_VOUCHER", "PV-2026-"),
            ("NORMAL_PURCHASE", "NP-2026-"),
            ("CREDIT_NOTE", "CN-2026-"),
            ("DEBIT_NOTE", "DN-2026-"),
        ]
        for idx, (doc_type, prefix) in enumerate(series_configs, start=1):
            session.add(
                SeriesMaster(
                    id=idx,
                    document_type=doc_type,
                    prefix=prefix,
                    suffix="",
                    starting_number=1,
                    current_number=0,
                    financial_year="2026-2027",
                    series_mode="AUTOMATIC",
                    series_name=f"Default {doc_type}",
                    issuing_office_id=1,
                    is_default=True,
                    is_active=True,
                )
            )

        # Standard accounts
        await accounts_service.ensure_standard_accounts(session)

        # Seed Client & Vendor
        client = BillingClient(id=1, name="Reliance Industries", gstin="27AAACR5055K1Z1", state="Maharashtra")
        vendor = Vendor(id=1, name="MRF Tyres Ltd", gstin="27AAACM1234F1Z5", state="Maharashtra")
        tc_18 = TaxCategory(
            id=1,
            name="GST 18%",
            code="GST_18",
            igst_rate=Decimal("18.00"),
            cgst_rate=Decimal("9.00"),
            sgst_rate=Decimal("9.00"),
            is_rcm=False,
        )
        session.add_all([client, vendor, tc_18])
        await session.commit()

    async with async_session() as session:
        yield session


@pytest.mark.asyncio
async def test_update_contra_voucher(test_session: AsyncSession):
    cash_acc = await accounts_service.get_account_by_code(test_session, "ACC_CASH")
    bank_acc = await accounts_service.get_account_by_code(test_session, "ACC_HDFC_BANK")

    # Create contra voucher
    create_dto = ContraVoucherCreate(
        contra_type="CASH_TO_BANK",
        source_account_id=cash_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("10000.00"),
        voucher_date=date(2026, 4, 10),
        transfer_mode="CASH_DEPOSIT",
        reference_number="REF-100",
        bank_charges=Decimal("50.00"),
    )
    v = await accounts_service.create_contra_voucher(test_session, create_dto, office_id=1)
    original_number = v.voucher_number
    assert original_number == "CV-2026-0001"
    assert v.net_amount == Decimal("10000.00")

    # Update contra voucher: amount changed to 15000, reference REF-200
    update_dto = ContraVoucherCreate(
        contra_type="CASH_TO_BANK",
        source_account_id=cash_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("15000.00"),
        voucher_date=date(2026, 4, 11),
        transfer_mode="CASH_DEPOSIT",
        reference_number="REF-200",
        bank_charges=Decimal("75.00"),
    )
    updated = await accounts_service.update_contra_voucher(test_session, v.id, update_dto, office_id=1)
    assert updated.voucher_number == original_number  # Sequence number preserved
    assert updated.net_amount == Decimal("15000.00")
    assert updated.total_amount == Decimal("15075.00")

    # Check that ledger entries are balanced
    entries = (await test_session.execute(
        select(LedgerEntry).where(LedgerEntry.voucher_id == updated.id)
    )).scalars().all()
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == tot_cr == Decimal("15075.00")


@pytest.mark.asyncio
async def test_update_journal_voucher(test_session: AsyncSession):
    depr_acc = await accounts_service.get_account_by_code(test_session, "ACC_DEPRECIATION_EXP")
    acc_depr = await accounts_service.get_account_by_code(test_session, "ACC_ACCUMULATED_DEP")

    create_dto = JournalVoucherCreate(
        issuing_office_id=1,
        voucher_date=date(2026, 4, 10),
        adjustment_type="DEPRECIATION",
        narration="Monthly vehicle depreciation",
        entries=[
            JournalEntryLineCreate(account_id=depr_acc.id, debit_amount=Decimal("25000.00"), credit_amount=Decimal("0")),
            JournalEntryLineCreate(account_id=acc_depr.id, debit_amount=Decimal("0"), credit_amount=Decimal("25000.00")),
        ],
    )
    jv = await accounts_service.create_journal_voucher(test_session, create_dto, office_id=1)
    assert jv.voucher_number == "JV-2026-0001"
    assert jv.net_amount == Decimal("25000.00")

    # Update to 35000.00
    update_dto = JournalVoucherCreate(
        issuing_office_id=1,
        voucher_date=date(2026, 4, 15),
        adjustment_type="DEPRECIATION",
        narration="Revised monthly vehicle depreciation",
        entries=[
            JournalEntryLineCreate(account_id=depr_acc.id, debit_amount=Decimal("35000.00"), credit_amount=Decimal("0")),
            JournalEntryLineCreate(account_id=acc_depr.id, debit_amount=Decimal("0"), credit_amount=Decimal("35000.00")),
        ],
    )
    updated = await accounts_service.update_journal_voucher(test_session, jv.id, update_dto, office_id=1)
    assert updated.voucher_number == "JV-2026-0001"
    assert updated.net_amount == Decimal("35000.00")

    entries = (await test_session.execute(
        select(LedgerEntry).where(LedgerEntry.voucher_id == updated.id)
    )).scalars().all()
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == tot_cr == Decimal("35000.00")


@pytest.mark.asyncio
async def test_update_receipt_voucher(test_session: AsyncSession):
    bank_acc = await accounts_service.get_account_by_code(test_session, "ACC_HDFC_BANK")

    create_dto = ReceiptVoucherCreate(
        billing_client_id=1,
        party_name="Reliance Industries",
        voucher_date=date(2026, 4, 10),
        receipt_type="ADVANCE",
        payment_mode="BANK",
        bank_account_id=bank_acc.id,
        amount=Decimal("50000.00"),
        tds_amount=Decimal("1000.00"),
        unapplied_advance_amount=Decimal("50000.00"),
        narration="Advance payment for freight",
    )
    rv = await accounts_service.create_receipt_voucher(test_session, create_dto, office_id=1)
    assert rv.voucher_number == "RV-2026-0001"
    assert rv.net_amount == Decimal("50000.00")

    # Update receipt amount to 60000
    update_dto = ReceiptVoucherCreate(
        billing_client_id=1,
        party_name="Reliance Industries",
        voucher_date=date(2026, 4, 12),
        receipt_type="ADVANCE",
        payment_mode="BANK",
        bank_account_id=bank_acc.id,
        amount=Decimal("60000.00"),
        tds_amount=Decimal("1200.00"),
        unapplied_advance_amount=Decimal("60000.00"),
        narration="Revised advance payment",
    )
    updated = await accounts_service.update_receipt_voucher(test_session, rv.id, update_dto, office_id=1)
    assert updated.voucher_number == "RV-2026-0001"
    assert updated.net_amount == Decimal("60000.00")

    entries = (await test_session.execute(
        select(LedgerEntry).where(LedgerEntry.voucher_id == updated.id)
    )).scalars().all()
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == tot_cr == Decimal("61200.00")  # 60000 net + 1200 TDS


@pytest.mark.asyncio
async def test_update_payment_voucher(test_session: AsyncSession):
    bank_acc = await accounts_service.get_account_by_code(test_session, "ACC_HDFC_BANK")

    create_dto = PaymentVoucherCreate(
        vendor_id=1,
        party_name="MRF Tyres Ltd",
        voucher_date=date(2026, 4, 10),
        payment_type="ADVANCE",
        payment_mode="BANK",
        bank_account_id=bank_acc.id,
        amount=Decimal("40000.00"),
        tds_amount=Decimal("800.00"),
        unapplied_advance_amount=Decimal("40000.00"),
        narration="Advance for tyre supply",
    )
    pv = await accounts_service.create_payment_voucher(test_session, create_dto, office_id=1)
    assert pv.voucher_number == "PV-2026-0001"
    assert pv.net_amount == Decimal("40000.00")

    update_dto = PaymentVoucherCreate(
        vendor_id=1,
        party_name="MRF Tyres Ltd",
        voucher_date=date(2026, 4, 11),
        payment_type="ADVANCE",
        payment_mode="BANK",
        bank_account_id=bank_acc.id,
        amount=Decimal("45000.00"),
        tds_amount=Decimal("900.00"),
        unapplied_advance_amount=Decimal("45000.00"),
        narration="Updated advance for tyre supply",
    )
    updated = await accounts_service.update_payment_voucher(test_session, pv.id, update_dto, office_id=1)
    assert updated.voucher_number == "PV-2026-0001"
    assert updated.net_amount == Decimal("45000.00")

    entries = (await test_session.execute(
        select(LedgerEntry).where(LedgerEntry.voucher_id == updated.id)
    )).scalars().all()
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == tot_cr == Decimal("45900.00")  # 45000 net + 900 TDS


@pytest.mark.asyncio
async def test_cannot_edit_void_voucher(test_session: AsyncSession):
    cash_acc = await accounts_service.get_account_by_code(test_session, "ACC_CASH")
    bank_acc = await accounts_service.get_account_by_code(test_session, "ACC_HDFC_BANK")

    create_dto = ContraVoucherCreate(
        contra_type="CASH_TO_BANK",
        source_account_id=cash_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("5000.00"),
        voucher_date=date(2026, 4, 10),
    )
    v = await accounts_service.create_contra_voucher(test_session, create_dto, office_id=1)
    # Void the voucher
    await accounts_service.void_voucher(test_session, v.id, VoidVoucherRequest(void_reason="Entered in error for testing void check"))

    update_dto = ContraVoucherCreate(
        contra_type="CASH_TO_BANK",
        source_account_id=cash_acc.id,
        destination_account_id=bank_acc.id,
        amount=Decimal("6000.00"),
        voucher_date=date(2026, 4, 11),
    )
    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.update_contra_voucher(test_session, v.id, update_dto, office_id=1)
    assert exc_info.value.status_code == 400
    assert "void" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_update_purchase_bill(test_session: AsyncSession):
    bill_create = PurchaseBillCreate(
        purchase_type="NORMAL_PURCHASE",
        purchase_category="TYRES",
        vendor_id=1,
        party_name="MRF Tyres Ltd",
        party_gstin="27AAACM1234F1Z5",
        vendor_state="Maharashtra",
        place_of_supply="Maharashtra",
        voucher_date=date(2026, 4, 10),
        bill_number="MRF-001",
        bill_date=date(2026, 4, 10),
        items=[
            PurchaseBillItemCreate(
                description="MRF Steel Muscle Tyres",
                quantity=Decimal("2.00"),
                rate=Decimal("10000.00"),
                tax_category_id=1,
            )
        ],
    )
    pb = await accounts_service.create_purchase_bill(test_session, bill_create, office_id=1)
    assert pb.voucher_number == "NP-2026-0001"
    assert pb.net_amount == Decimal("23600.00")

    # Update: quantity 3 -> 30000 + 18% = 35400
    bill_update = PurchaseBillCreate(
        purchase_type="NORMAL_PURCHASE",
        purchase_category="TYRES",
        vendor_id=1,
        party_name="MRF Tyres Ltd",
        party_gstin="27AAACM1234F1Z5",
        vendor_state="Maharashtra",
        place_of_supply="Maharashtra",
        voucher_date=date(2026, 4, 12),
        bill_number="MRF-001-REV",
        bill_date=date(2026, 4, 12),
        items=[
            PurchaseBillItemCreate(
                description="MRF Steel Muscle Tyres",
                quantity=Decimal("3.00"),
                rate=Decimal("10000.00"),
                tax_category_id=1,
            )
        ],
    )
    updated = await accounts_service.update_purchase_bill(test_session, pb.id, bill_update, office_id=1)
    assert updated.voucher_number == "NP-2026-0001"
    assert updated.net_amount == Decimal("35400.00")
    assert updated.balance_amount == Decimal("35400.00")

    entries = (await test_session.execute(
        select(LedgerEntry).where(LedgerEntry.voucher_id == updated.id)
    )).scalars().all()
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == tot_cr == Decimal("35400.00")


@pytest.mark.asyncio
async def test_update_credit_debit_note(test_session: AsyncSession):
    note_create = CreditDebitNoteCreate(
        note_type="CREDIT_NOTE",
        note_category="SALES_CREDIT_NOTE",
        voucher_date=date(2026, 4, 10),
        is_gst_note=True,
        party_type="CUSTOMER",
        billing_client_id=1,
        party_name="Reliance Industries",
        party_gstin="27AAACR5055K1Z1",
        place_of_supply="Maharashtra",
        reason_code="04",
        total_taxable_amount=Decimal("10000.00"),
        tax_rate=Decimal("18.00"),
        tax_amount=Decimal("1800.00"),
        cgst_amount=Decimal("900.00"),
        sgst_amount=Decimal("900.00"),
        igst_amount=Decimal("0.00"),
        net_amount=Decimal("11800.00"),
        narration="Rate difference rebate",
    )
    cn = await accounts_service.create_credit_debit_note(test_session, note_create, office_id=1)
    assert cn.voucher_number == "CN-2026-0001"
    assert cn.net_amount == Decimal("11800.00")

    # Update to taxable 15000 + 18% = 17700
    note_update = CreditDebitNoteCreate(
        note_type="CREDIT_NOTE",
        note_category="SALES_CREDIT_NOTE",
        voucher_date=date(2026, 4, 12),
        is_gst_note=True,
        party_type="CUSTOMER",
        billing_client_id=1,
        party_name="Reliance Industries",
        party_gstin="27AAACR5055K1Z1",
        place_of_supply="Maharashtra",
        reason_code="04",
        total_taxable_amount=Decimal("15000.00"),
        tax_rate=Decimal("18.00"),
        tax_amount=Decimal("2700.00"),
        cgst_amount=Decimal("1350.00"),
        sgst_amount=Decimal("1350.00"),
        igst_amount=Decimal("0.00"),
        net_amount=Decimal("17700.00"),
        narration="Revised rate difference rebate",
    )
    updated = await accounts_service.update_credit_debit_note(test_session, cn.id, note_update, office_id=1)
    assert updated.voucher_number == "CN-2026-0001"
    assert updated.net_amount == Decimal("17700.00")

    entries = (await test_session.execute(
        select(LedgerEntry).where(LedgerEntry.voucher_id == updated.id)
    )).scalars().all()
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == tot_cr == Decimal("17700.00")

