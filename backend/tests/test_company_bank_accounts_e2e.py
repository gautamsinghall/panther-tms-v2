import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from fastapi import HTTPException

from app.tenant_db.models import (
    TenantBase,
    Branch,
    BillingClient,
    Vendor,
    Account,
    Voucher,
    VoucherType,
    LedgerEntry,
    PrimaryGroup,
    GroupInPrimary,
    CompanyBankAccount,
    User,
    UserOfficeAssignment,
    SeriesMaster,
)
from app.modules.accounts import service as accounts_service, master_ledger_service, schemas
from app.modules.reports import service as reports_service


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Create 2 Issuing Offices
        delhi_office = Branch(
            id=1,
            code="DEL",
            name="Delhi Regional Office",
            city="New Delhi",
            state="Delhi",
            is_head_office=True,
            is_active=True,
        )
        mumbai_office = Branch(
            id=2,
            code="BOM",
            name="Mumbai Hub Office",
            city="Mumbai",
            state="Maharashtra",
            is_head_office=False,
            is_active=True,
        )
        session.add_all([delhi_office, mumbai_office])
        await session.commit()

        # Seed Series Masters for automatic voucher allocation
        series_rv = SeriesMaster(
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
        series_pv = SeriesMaster(
            id=2,
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
        series_cv = SeriesMaster(
            id=3,
            document_type="CONTRA_VOUCHER",
            prefix="CV-2026-",
            suffix="",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            series_name="Default Contra Voucher Series",
            issuing_office_id=1,
            is_default=True,
            is_active=True,
        )
        session.add_all([series_rv, series_pv, series_cv])
        await session.commit()

        # Seed standard chart of accounts
        await accounts_service.ensure_standard_accounts(session)
        await session.commit()

        yield session


@pytest.mark.asyncio
async def test_company_bank_accounts_comprehensive_lifecycle(test_session: AsyncSession):
    session = test_session

    # --------------------------------------------------------------------------
    # Scenario 1, 2, 3, 4, 5: Create bank accounts across offices, verify ledgers & opening balance
    # --------------------------------------------------------------------------
    # 1. Create HDFC Current Account under Delhi Office with opening balance ₹50,000 DR
    hdfc_create = schemas.CompanyBankAccountCreate(
        bank_name="HDFC Bank",
        account_holder_name="Panther Logistics Pvt Ltd",
        account_number="50200012344582",
        confirm_account_number="50200012344582",
        account_type="Current",
        ifsc_code="HDFC0001234",
        branch_name="Connaught Place",
        branch_address="12 Barakhamba Road, New Delhi",
        currency="INR",
        issuing_office_id=1,
        is_default=True,
        opening_balance=Decimal("50000.00"),
        opening_balance_type="DR",
        is_active=True,
    )
    hdfc_ba = await accounts_service.create_company_bank_account(session, hdfc_create, user_id=1)
    assert hdfc_ba.id is not None
    assert hdfc_ba.bank_name == "HDFC Bank"
    assert hdfc_ba.account_number_masked == "XXXX4582"
    assert hdfc_ba.is_default is True
    assert hdfc_ba.current_balance == Decimal("50000.00")
    assert hdfc_ba.balance_type == "DR"
    assert hdfc_ba.ledger_group == "Bank Accounts"

    # Verify automatic ledger was created in misc_accounts under Bank Accounts
    hdfc_ledger = await session.get(Account, hdfc_ba.account_id)
    assert hdfc_ledger is not None
    assert hdfc_ledger.opening_balance == Decimal("50000.00")
    assert hdfc_ledger.opening_balance_type == "DR"
    assert "HDFC" in hdfc_ledger.name

    # Scenario 4: Confirm creation did NOT create a false transaction voucher
    le_cnt = (await session.execute(select(func.count(LedgerEntry.id)).where(LedgerEntry.account_id == hdfc_ba.account_id))).scalar()
    assert le_cnt == 0, "Account creation must never create a financial voucher or false ledger entry."

    # 2. Create ICICI Overdraft Account under Mumbai Office with opening balance ₹20,000 CR
    icici_create = schemas.CompanyBankAccountCreate(
        bank_name="ICICI Bank",
        account_holder_name="Panther Logistics Pvt Ltd",
        account_number="000405007821",
        confirm_account_number="000405007821",
        account_type="Overdraft",
        ifsc_code="ICIC0000004",
        branch_name="Nariman Point",
        currency="INR",
        issuing_office_id=2,
        is_default=True,
        opening_balance=Decimal("20000.00"),
        opening_balance_type="CR",
        is_active=True,
    )
    icici_ba = await accounts_service.create_company_bank_account(session, icici_create, user_id=1)
    assert icici_ba.id is not None
    assert icici_ba.account_type == "Overdraft"
    assert icici_ba.ledger_group == "Bank OD A/c"
    assert icici_ba.current_balance == Decimal("20000.00")
    assert icici_ba.balance_type == "CR"

    # 3. Create a second bank account under Delhi Office (SBI Savings) to test multiple accounts per office
    sbi_create = schemas.CompanyBankAccountCreate(
        bank_name="State Bank of India",
        account_holder_name="Panther Logistics Pvt Ltd",
        account_number="300012349999",
        confirm_account_number="300012349999",
        account_type="Savings",
        ifsc_code="SBIN0000691",
        branch_name="Parliament Street",
        issuing_office_id=1,
        is_default=False,
        opening_balance=Decimal("10000.00"),
        opening_balance_type="DR",
        is_active=True,
    )
    sbi_ba = await accounts_service.create_company_bank_account(session, sbi_create, user_id=1)
    assert sbi_ba.is_default is False

    # Check default bank account resolution for Delhi Office
    delhi_def = await accounts_service.get_default_bank_account_for_office(session, 1)
    assert delhi_def is not None
    assert delhi_def.id == hdfc_ba.id

    # --------------------------------------------------------------------------
    # Scenario 6: Customer Receipt into selected Bank Account (DEBIT: Bank, CREDIT: Client)
    # --------------------------------------------------------------------------
    client = BillingClient(
        name="Apollo Tyres Ltd",
        code="BC-APOLLO",
        company_name="Apollo Tyres Ltd",
        issuing_office_id=1,
        is_active=True,
    )
    session.add(client)
    await session.commit()
    await session.refresh(client)

    client_acc = await master_ledger_service.get_or_create_party_account(
        session, "BILLING_CLIENT", client.id, client.name, client.code
    )

    # Post Receipt Voucher of ₹75,000 received into HDFC Bank
    rcpt = await accounts_service.create_receipt_voucher(
        session,
        schemas.ReceiptVoucherCreate(
            billing_client_id=client.id,
            party_name=client.name,
            voucher_date=date(2026, 4, 15),
            receipt_type="ON_ACCOUNT",
            payment_mode="NEFT",
            bank_account_id=hdfc_ba.id,
            amount=Decimal("75000.00"),
            reference_number="NEFT-APOLLO-9821",
            narration="Advance freight collection from Apollo Tyres",
        ),
        office_id=1,
    )
    assert rcpt.id is not None
    assert rcpt.company_bank_account_id == hdfc_ba.id

    # Verify Double-Entry Accounting Invariant (Debit == Credit)
    entries = (await session.execute(select(LedgerEntry).where(LedgerEntry.voucher_id == rcpt.id))).scalars().all()
    tot_dr = sum(e.debit_amount for e in entries)
    tot_cr = sum(e.credit_amount for e in entries)
    assert tot_dr == Decimal("75000.00")
    assert tot_cr == Decimal("75000.00")

    # Check that HDFC Bank was debited and Customer was credited
    bank_entry = next(e for e in entries if e.account_id == hdfc_ba.account_id)
    cust_entry = next(e for e in entries if e.account_id == client_acc.id)
    assert bank_entry.debit_amount == Decimal("75000.00")
    assert cust_entry.credit_amount == Decimal("75000.00")

    # Verify updated running balance on HDFC Bank (₹50,000 + ₹75,000 = ₹1,25,000 DR)
    updated_hdfc = await accounts_service.get_company_bank_account(session, hdfc_ba.id, is_admin=True)
    assert updated_hdfc.current_balance == Decimal("125000.00")
    assert updated_hdfc.balance_type == "DR"

    # --------------------------------------------------------------------------
    # Scenario 7: Vendor Payment disbursed from Bank Account (DEBIT: Vendor, CREDIT: Bank)
    # --------------------------------------------------------------------------
    vendor = Vendor(
        name="Bharat Petroleum Corp",
        phone="9876543210",
        issuing_office_id=1,
        is_active=True,
    )
    session.add(vendor)
    await session.commit()
    await session.refresh(vendor)

    vendor_acc = await master_ledger_service.get_or_create_party_account(
        session, "VENDOR", vendor.id, vendor.name, None
    )

    pmt = await accounts_service.create_payment_voucher(
        session,
        schemas.PaymentVoucherCreate(
            vendor_id=vendor.id,
            party_name=vendor.name,
            voucher_date=date(2026, 4, 18),
            payment_type="ADVANCE",
            payment_mode="RTGS",
            bank_account_id=hdfc_ba.id,
            amount=Decimal("30000.00"),
            reference_number="RTGS-BPCL-1002",
            narration="Bulk diesel fuel advance payment",
        ),
        office_id=1,
    )
    assert pmt.id is not None
    assert pmt.company_bank_account_id == hdfc_ba.id

    # Verify Double-Entry Balance
    pmt_entries = (await session.execute(select(LedgerEntry).where(LedgerEntry.voucher_id == pmt.id))).scalars().all()
    assert sum(e.debit_amount for e in pmt_entries) == Decimal("30000.00")
    assert sum(e.credit_amount for e in pmt_entries) == Decimal("30000.00")

    # Check running balance on HDFC Bank (₹1,25,000 - ₹30,000 = ₹95,000 DR)
    hdfc_after_pmt = await accounts_service.get_company_bank_account(session, hdfc_ba.id, is_admin=True)
    assert hdfc_after_pmt.current_balance == Decimal("95000.00")

    # --------------------------------------------------------------------------
    # Scenario 8 & 9: Inter-office Bank Transfer via Contra Voucher
    # Transfer ₹25,000 from HDFC Bank (Delhi) to ICICI Bank (Mumbai)
    # --------------------------------------------------------------------------
    contra = await accounts_service.create_contra_voucher(
        session,
        schemas.ContraVoucherCreate(
            contra_type="BANK_TO_BANK",
            source_account_id=hdfc_ba.account_id,
            destination_account_id=icici_ba.account_id,
            amount=Decimal("25000.00"),
            voucher_date=date(2026, 4, 20),
            transfer_mode="NEFT",
            reference_number="TXN-DEL-BOM-001",
            narration="Inter-branch funds transfer: Delhi to Mumbai",
        ),
        office_id=1,
    )
    assert contra.id is not None
    contra_entries = (await session.execute(select(LedgerEntry).where(LedgerEntry.voucher_id == contra.id))).scalars().all()
    assert len(contra_entries) == 2
    assert sum(e.debit_amount for e in contra_entries) == Decimal("25000.00")
    assert sum(e.credit_amount for e in contra_entries) == Decimal("25000.00")

    # Check individual sides
    dr_entry = next(e for e in contra_entries if e.debit_amount > 0)
    cr_entry = next(e for e in contra_entries if e.credit_amount > 0)
    assert dr_entry.account_id == icici_ba.account_id
    assert cr_entry.account_id == hdfc_ba.account_id

    # Running balance checks:
    # HDFC Bank: ₹95,000 - ₹25,000 = ₹70,000 DR
    hdfc_after_contra = await accounts_service.get_company_bank_account(session, hdfc_ba.id, is_admin=True)
    assert hdfc_after_contra.current_balance == Decimal("70000.00")
    assert hdfc_after_contra.balance_type == "DR"

    # ICICI Bank (OD): initial CR ₹20,000 (overdrawn), received ₹25,000 DR deposit -> now net ₹5,000 DR (surplus)!
    icici_after_contra = await accounts_service.get_company_bank_account(session, icici_ba.id, is_admin=True)
    assert icici_after_contra.current_balance == Decimal("5000.00")
    assert icici_after_contra.balance_type == "DR"

    # --------------------------------------------------------------------------
    # Scenario 10 & 12: Master Ledger Integration & Consolidated Balances
    # --------------------------------------------------------------------------
    ml_summary = await master_ledger_service.get_master_ledger_summary(session)
    assert ml_summary.company_bank_accounts is not None
    assert ml_summary.company_bank_accounts.total_accounts == 3
    assert ml_summary.company_bank_accounts.settled_count == 3  # 3 active

    # Verify Master Ledger Bank Accounts listing
    ml_list = await master_ledger_service.list_company_bank_account_ledgers(session)
    assert len(ml_list) == 3
    hdfc_ml_item = next(item for item in ml_list if item.id == hdfc_ba.id)
    assert hdfc_ml_item.bank_name == "HDFC Bank"
    assert hdfc_ml_item.account_number_masked == "XXXX4582"
    assert hdfc_ml_item.current_balance == Decimal("70000.00")
    assert hdfc_ml_item.issuing_office_name == "Delhi Regional Office"
    assert hdfc_ml_item.transaction_count == 3  # receipt, payment, contra

    # Verify detailed ledger statement for HDFC Bank
    hdfc_detail = await master_ledger_service.get_company_bank_account_ledger_detail(session, bank_account_id=hdfc_ba.id)
    assert hdfc_detail.category == "COMPANY_BANK_ACCOUNT"
    assert hdfc_detail.opening_balance == Decimal("50000.00")
    assert hdfc_detail.closing_balance == Decimal("70000.00")
    assert len(hdfc_detail.transactions) == 3
    # Check that running balance progresses correctly
    assert hdfc_detail.transactions[0].running_balance == Decimal("125000.00")
    assert hdfc_detail.transactions[1].running_balance == Decimal("95000.00")
    assert hdfc_detail.transactions[2].running_balance == Decimal("70000.00")

    # --------------------------------------------------------------------------
    # Scenario 11: Branch-level access restrictions
    # --------------------------------------------------------------------------
    # User restricted to Mumbai Office (id=2)
    mumbai_user_accounts = await accounts_service.list_company_bank_accounts(
        session, user_office_ids=[2], is_admin=False
    )
    assert len(mumbai_user_accounts) == 1
    assert mumbai_user_accounts[0].id == icici_ba.id

    # User trying to access Delhi account directly raises 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.get_company_bank_account(
            session, hdfc_ba.id, user_office_ids=[2], is_admin=False
        )
    assert exc_info.value.status_code == 403

    # Admin user sees all accounts
    admin_accounts = await accounts_service.list_company_bank_accounts(session, is_admin=True)
    assert len(admin_accounts) == 3

    # --------------------------------------------------------------------------
    # Scenario 14: Inactive account cannot be selected for new transactions
    # --------------------------------------------------------------------------
    await accounts_service.toggle_bank_account_status(session, sbi_ba.id, is_admin=True)
    sbi_deactivated = await session.get(CompanyBankAccount, sbi_ba.id)
    assert sbi_deactivated.is_active is False

    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.create_receipt_voucher(
            session,
            schemas.ReceiptVoucherCreate(
                billing_client_id=client.id,
                voucher_date=date(2026, 4, 22),
                amount=Decimal("5000.00"),
                bank_account_id=sbi_ba.id,
            ),
            office_id=1,
        )
    assert exc_info.value.status_code == 400
    assert "deactivated" in exc_info.value.detail.lower()

    # --------------------------------------------------------------------------
    # Scenario 15: Deactivation preserves history; Deletion blocked if tx exist
    # --------------------------------------------------------------------------
    # Attempting to delete HDFC Bank (has 3 transactions) must be blocked
    with pytest.raises(HTTPException) as exc_info:
        await accounts_service.delete_company_bank_account(session, hdfc_ba.id, is_admin=True)
    assert exc_info.value.status_code == 400
    assert "Cannot delete Bank Account with existing accounting transactions" in exc_info.value.detail

    # Historical transactions remain completely intact
    h_tx = (await session.execute(select(LedgerEntry).where(LedgerEntry.account_id == hdfc_ba.account_id))).scalars().all()
    assert len(h_tx) == 3

    # Deleting unused SBI account (0 transactions) succeeds cleanly
    del_res = await accounts_service.delete_company_bank_account(session, sbi_ba.id, is_admin=True)
    assert del_res["status"] == "SUCCESS"

    # --------------------------------------------------------------------------
    # Scenario 16: IFSC validation & lookup helper
    # --------------------------------------------------------------------------
    valid_lookup = await accounts_service.lookup_ifsc("HDFC0001234")
    assert valid_lookup.is_valid is True
    assert valid_lookup.bank_name == "HDFC Bank"

    invalid_lookup = await accounts_service.lookup_ifsc("INVALID_CODE")
    assert invalid_lookup.is_valid is False

    # --------------------------------------------------------------------------
    # Scenario 17: Bank Reconciliation integration
    # --------------------------------------------------------------------------
    recon = await reports_service.get_bank_reconciliation(session, bank_account_id=hdfc_ba.account_id)
    assert recon.account_id == hdfc_ba.account_id
    assert recon.balance_as_per_books == Decimal("70000.00")
    assert len(recon.transactions) == 3
