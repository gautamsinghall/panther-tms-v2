from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.tenant_db.models import (
    BillingClient,
    Vendor,
    Driver,
    Account,
    Voucher,
    VoucherType,
    LedgerEntry,
    HireChallan,
    TripAdvance,
    TripExpense,
    LR,
    Branch,
    PrimaryGroup,
    GroupInPrimary,
    SubgroupInGroup,
    CompanyBankAccount,
    CompanyVehicle,
)
from app.modules.accounts import schemas


# ------------------------------------------------------------------------------
# Helpers: Account auto-linking and resolution
# ------------------------------------------------------------------------------

async def get_or_create_party_account(
    session: AsyncSession,
    party_type: str,
    party_id: int,
    party_name: str,
    party_code: Optional[str] = None,
) -> Account:
    """
    Ensure every Billing Client, Vendor, and Driver has a dedicated Account
    properly bound to Primary Group, Group in Primary, and Subgroup in Group
    per Indian Accounting Standards and Tally Prime.
    """
    account: Optional[Account] = None

    if party_type == "BILLING_CLIENT":
        stmt = select(Account).where(
            or_(
                Account.billing_client_id == party_id,
                Account.code == f"BC_{party_id}",
                Account.name == party_name,
            )
        )
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()

        # Find Sundry Debtors group
        grp_stmt = select(GroupInPrimary).where(
            or_(GroupInPrimary.code == "DEBTORS", GroupInPrimary.name.ilike("%Debtor%"))
        )
        grp = (await session.execute(grp_stmt)).scalars().first()
        group_id = grp.id if grp else 1

        # Find Corporate Debtors subgroup under DEBTORS
        subgrp_stmt = select(SubgroupInGroup).where(
            SubgroupInGroup.group_id == group_id,
            or_(SubgroupInGroup.code == "DEBTORS_CORP", SubgroupInGroup.name.ilike("%Corporate%"))
        )
        subgrp = (await session.execute(subgrp_stmt)).scalars().first()
        if not subgrp:
            subgrp = (await session.execute(select(SubgroupInGroup).where(SubgroupInGroup.group_id == group_id))).scalars().first()
        subgroup_id = subgrp.id if subgrp else None

        if not account:
            account = Account(
                name=party_name,
                code=party_code or f"BC_{party_id:04d}",
                group_id=group_id,
                subgroup_id=subgroup_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type="DR",
                billing_client_id=party_id,
                is_active=True,
            )
            session.add(account)
            await session.flush()
        else:
            updated = False
            if not account.billing_client_id:
                account.billing_client_id = party_id
                updated = True
            if account.group_id != group_id:
                account.group_id = group_id
                updated = True
            if subgroup_id and account.subgroup_id != subgroup_id:
                account.subgroup_id = subgroup_id
                updated = True
            if updated:
                await session.flush()

    elif party_type == "VENDOR":
        stmt = select(Account).where(
            or_(
                Account.vendor_id == party_id,
                Account.code == f"VEND_{party_id}",
                Account.name == party_name,
            )
        )
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()

        # Find Sundry Creditors group
        grp_stmt = select(GroupInPrimary).where(
            or_(GroupInPrimary.code == "CREDITORS", GroupInPrimary.name.ilike("%Creditor%"))
        )
        grp = (await session.execute(grp_stmt)).scalars().first()
        group_id = grp.id if grp else 1

        # Find Market Vehicle / General Creditors subgroup
        subgrp_stmt = select(SubgroupInGroup).where(
            SubgroupInGroup.group_id == group_id,
            or_(SubgroupInGroup.code == "CRED_MARKET_VEHICLES", SubgroupInGroup.name.ilike("%Market Vehicle%"))
        )
        subgrp = (await session.execute(subgrp_stmt)).scalars().first()
        if not subgrp:
            subgrp = (await session.execute(select(SubgroupInGroup).where(SubgroupInGroup.group_id == group_id))).scalars().first()
        subgroup_id = subgrp.id if subgrp else None

        if not account:
            account = Account(
                name=party_name,
                code=party_code or f"VEND_{party_id:04d}",
                group_id=group_id,
                subgroup_id=subgroup_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type="CR",
                vendor_id=party_id,
                is_active=True,
            )
            session.add(account)
            await session.flush()
        else:
            updated = False
            if not account.vendor_id:
                account.vendor_id = party_id
                updated = True
            if account.group_id != group_id:
                account.group_id = group_id
                updated = True
            if subgroup_id and account.subgroup_id != subgroup_id:
                account.subgroup_id = subgroup_id
                updated = True
            if updated:
                await session.flush()

    elif party_type == "DRIVER":
        stmt = select(Account).where(
            or_(
                Account.driver_id == party_id,
                Account.code == f"DRV_{party_id}",
                Account.name == party_name,
                Account.name == f"Driver - {party_name}",
            )
        )
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()

        # Driver Trip Advances belong under LOANS_ADV_ASSET (Loans & Advances Asset)
        grp_stmt = select(GroupInPrimary).where(GroupInPrimary.code == "LOANS_ADV_ASSET")
        grp = (await session.execute(grp_stmt)).scalars().first()
        if not grp:
            grp_stmt = select(GroupInPrimary).where(
                or_(GroupInPrimary.name.ilike("%Loans & Advances%"), GroupInPrimary.code == "CA")
            )
            grp = (await session.execute(grp_stmt)).scalars().first()
        group_id = grp.id if grp else 1

        # Find Driver Trip Advances subgroup
        subgrp_stmt = select(SubgroupInGroup).where(
            SubgroupInGroup.group_id == group_id,
            or_(SubgroupInGroup.code == "ADV_DRIVER_TRIP", SubgroupInGroup.name.ilike("%Driver%"))
        )
        subgrp = (await session.execute(subgrp_stmt)).scalars().first()
        if not subgrp:
            subgrp = (await session.execute(select(SubgroupInGroup).where(SubgroupInGroup.group_id == group_id))).scalars().first()
        subgroup_id = subgrp.id if subgrp else None

        if not account:
            account = Account(
                name=f"Driver - {party_name}",
                code=party_code or f"DRV_{party_id:04d}",
                group_id=group_id,
                subgroup_id=subgroup_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type="DR",
                driver_id=party_id,
                is_active=True,
            )
            session.add(account)
            await session.flush()
        else:
            updated = False
            if not account.driver_id:
                account.driver_id = party_id
                updated = True
            if account.group_id != group_id:
                account.group_id = group_id
                updated = True
            if subgroup_id and account.subgroup_id != subgroup_id:
                account.subgroup_id = subgroup_id
                updated = True
            if account.opening_balance_type != "DR":
                account.opening_balance_type = "DR"
                updated = True
            if updated:
                await session.flush()

    elif party_type == "COMPANY_VEHICLE":
        clean_v_name = party_name if party_name.startswith("Vehicle - ") else f"Vehicle - {party_name}"
        raw_reg = party_name.replace("Vehicle - ", "").strip()
        code_val = party_code or f"VEH_{party_id:04d}"

        stmt = select(Account).where(
            or_(
                Account.company_vehicle_id == party_id,
                Account.code == code_val,
                Account.code == f"VEH_{party_id}",
                Account.name == clean_v_name,
                Account.name == raw_reg,
            )
        )
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()

        # Fixed Assets group (FA) under ASSET (Assets - Nature: DEBIT)
        grp_stmt = select(GroupInPrimary).where(
            or_(GroupInPrimary.code == "FA", GroupInPrimary.name.ilike("%Fixed Asset%"))
        )
        grp = (await session.execute(grp_stmt)).scalars().first()
        group_id = grp.id if grp else 1

        # Subgroup under FA (Company Owned Fleet Vehicles / Heavy Commercial Vehicles)
        subgrp_stmt = select(SubgroupInGroup).where(
            SubgroupInGroup.group_id == group_id,
            or_(
                SubgroupInGroup.code == "FA_COMPANY_VEHICLES",
                SubgroupInGroup.code == "FA_HEAVY_VEHICLES",
                SubgroupInGroup.name.ilike("%Company%Vehicle%"),
                SubgroupInGroup.name.ilike("%Commercial%Vehicle%"),
            )
        )
        subgrp = (await session.execute(subgrp_stmt)).scalars().first()
        if not subgrp:
            subgrp = (await session.execute(select(SubgroupInGroup).where(SubgroupInGroup.group_id == group_id))).scalars().first()
        subgroup_id = subgrp.id if subgrp else None

        if not account:
            account = Account(
                name=clean_v_name,
                code=code_val,
                group_id=group_id,
                subgroup_id=subgroup_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type="DR",
                company_vehicle_id=party_id,
                is_active=True,
            )
            session.add(account)
            await session.flush()
        else:
            updated = False
            if hasattr(account, "company_vehicle_id") and not account.company_vehicle_id:
                account.company_vehicle_id = party_id
                updated = True
            if account.group_id != group_id:
                account.group_id = group_id
                updated = True
            if subgroup_id and account.subgroup_id != subgroup_id:
                account.subgroup_id = subgroup_id
                updated = True
            if account.opening_balance_type != "DR":
                account.opening_balance_type = "DR"
                updated = True
            if updated:
                await session.flush()

        # Ensure CompanyVehicle master has account_id bound
        veh = await session.get(CompanyVehicle, party_id)
        if veh and hasattr(veh, "account_id") and veh.account_id != account.id:
            veh.account_id = account.id
            await session.flush()

    return account


# ------------------------------------------------------------------------------
# 1. Master Ledger Overview Summary
# ------------------------------------------------------------------------------

async def get_master_ledger_summary(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> schemas.MasterLedgerOverviewResponse:
    """
    Overview metrics for the 3 categories:
    1. Billing Clients (Receivables)
    2. Vendors (Payables)
    3. Drivers (Imprest / Advances & Settlements)
    """
    # 1. Billing Clients Summary
    bc_list = await list_billing_client_ledgers(session, office_id=office_id, include_unassigned=include_unassigned)
    bc_total_accounts = len(bc_list)
    bc_total_debit = sum(item.total_debit for item in bc_list)
    bc_total_credit = sum(item.total_credit for item in bc_list)
    bc_total_outstanding = sum(item.outstanding_balance for item in bc_list if item.balance_type == "DR")
    bc_settled = sum(1 for item in bc_list if item.balance_type == "NIL" or item.outstanding_balance == Decimal("0.00"))
    bc_pending = bc_total_accounts - bc_settled

    # 2. Vendors Summary
    vend_list = await list_vendor_ledgers(session, office_id=office_id, include_unassigned=include_unassigned)
    vend_total_accounts = len(vend_list)
    vend_total_debit = sum(item.total_debit for item in vend_list)
    vend_total_credit = sum(item.total_credit for item in vend_list)
    vend_total_outstanding = sum(item.outstanding_payable for item in vend_list if item.balance_type == "CR")
    vend_settled = sum(1 for item in vend_list if item.balance_type == "NIL" or item.outstanding_payable == Decimal("0.00"))
    vend_pending = vend_total_accounts - vend_settled

    # 3. Drivers Summary
    drv_list = await list_driver_ledgers(session, office_id=office_id, include_unassigned=include_unassigned)
    drv_total_accounts = len(drv_list)
    drv_total_advances = sum(item.total_advances for item in drv_list)
    drv_total_expenses = sum(item.total_expenses for item in drv_list)
    drv_net_balance = sum(item.current_balance for item in drv_list if item.balance_type == "DR") - sum(item.current_balance for item in drv_list if item.balance_type == "CR")
    drv_settled = sum(1 for item in drv_list if item.balance_type == "NIL" or item.current_balance == Decimal("0.00"))
    drv_pending = drv_total_accounts - drv_settled

    # 4. Company Vehicles (Fixed Assets / Tangible Fleet PPE) Summary
    veh_list = await list_company_vehicle_ledgers(session, office_id=office_id)
    veh_total_accounts = len(veh_list)
    veh_total_debit = sum(item.total_debit for item in veh_list)
    veh_total_credit = sum(item.total_credit for item in veh_list)
    veh_book_value = sum(item.current_balance for item in veh_list if item.balance_type == "DR")
    veh_active = sum(1 for item in veh_list if item.is_active)
    veh_inactive = veh_total_accounts - veh_active

    # 5. Company Bank Accounts Summary
    bank_list = await list_company_bank_account_ledgers(session, office_id=office_id)
    bank_total_accounts = len(bank_list)
    bank_total_debit = sum(item.total_debit for item in bank_list)
    bank_total_credit = sum(item.total_credit for item in bank_list)
    bank_net_balance = sum(item.current_balance for item in bank_list if item.balance_type == "DR") - sum(item.current_balance for item in bank_list if item.balance_type == "CR")
    bank_active = sum(1 for item in bank_list if item.is_active)
    bank_inactive = bank_total_accounts - bank_active

    # 5. Duties & Taxes (Statutory GST / TDS) Summary
    tax_list = await list_duties_and_taxes_ledgers(session, office_id=office_id)
    tax_total_accounts = len(tax_list)
    tax_total_debit = sum(item.total_debit for item in tax_list)
    tax_total_credit = sum(item.total_credit for item in tax_list)
    tax_net_payable = sum(item.current_balance for item in tax_list if item.balance_type == "CR")
    tax_settled = sum(1 for item in tax_list if item.balance_type == "NIL" or item.current_balance == Decimal("0.00"))
    tax_pending = tax_total_accounts - tax_settled

    # 6. Live Hierarchy Counts (Ind AS / Tally 3-tier)
    pg_count = (await session.execute(select(func.count(PrimaryGroup.id)))).scalar() or 0
    g_count = (await session.execute(select(func.count(GroupInPrimary.id)))).scalar() or 0
    sg_count = (await session.execute(select(func.count(SubgroupInGroup.id)))).scalar() or 0

    if pg_count == 0 or g_count == 0 or sg_count == 0:
        from app.modules.misc.tally_chart_of_accounts import seed_indian_accounting_chart_of_accounts
        seed_res = await seed_indian_accounting_chart_of_accounts(session)
        pg_count = seed_res.get("total_primary_groups", pg_count)
        g_count = seed_res.get("total_groups", g_count)
        sg_count = seed_res.get("total_subgroups", sg_count)

    return schemas.MasterLedgerOverviewResponse(
        billing_clients=schemas.CategoryOverviewStat(
            total_accounts=bc_total_accounts,
            total_outstanding=bc_total_outstanding,
            total_debit=bc_total_debit,
            total_credit=bc_total_credit,
            settled_count=bc_settled,
            pending_count=bc_pending,
        ),
        vendors=schemas.CategoryOverviewStat(
            total_accounts=vend_total_accounts,
            total_outstanding=vend_total_outstanding,
            total_debit=vend_total_debit,
            total_credit=vend_total_credit,
            settled_count=vend_settled,
            pending_count=vend_pending,
        ),
        drivers=schemas.CategoryOverviewStat(
            total_accounts=drv_total_accounts,
            total_outstanding=drv_net_balance if drv_net_balance > Decimal("0.00") else Decimal("0.00"),
            total_debit=drv_total_advances,
            total_credit=drv_total_expenses,
            settled_count=drv_settled,
            pending_count=drv_pending,
        ),
        company_vehicles=schemas.CategoryOverviewStat(
            total_accounts=veh_total_accounts,
            total_outstanding=veh_book_value,
            total_debit=veh_total_debit,
            total_credit=veh_total_credit,
            settled_count=veh_active,
            pending_count=veh_inactive,
        ),
        company_bank_accounts=schemas.CategoryOverviewStat(
            total_accounts=bank_total_accounts,
            total_outstanding=bank_net_balance if bank_net_balance > Decimal("0.00") else Decimal("0.00"),
            total_debit=bank_total_debit,
            total_credit=bank_total_credit,
            settled_count=bank_active,
            pending_count=bank_inactive,
        ),
        duties_and_taxes=schemas.CategoryOverviewStat(
            total_accounts=tax_total_accounts,
            total_outstanding=tax_net_payable,
            total_debit=tax_total_debit,
            total_credit=tax_total_credit,
            settled_count=tax_settled,
            pending_count=tax_pending,
        ),
        hierarchy=schemas.HierarchyOverviewStat(
            primary_groups_count=pg_count,
            groups_count=g_count,
            subgroups_count=sg_count,
            status="100% Compliant" if (pg_count >= 5 and g_count >= 25 and sg_count >= 63) else "Compliant",
        ),
    )


# ------------------------------------------------------------------------------
# 5. Duties & Taxes (Statutory GST, TDS, TCS) Ledgers
# ------------------------------------------------------------------------------

async def list_duties_and_taxes_ledgers(
    session: AsyncSession,
    office_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[schemas.DutiesAndTaxesLedgerListItem]:
    """
    Fetch all statutory tax and duties ledgers (GST Output/Input/RCM, TDS u/s 194C/194J/194Q, TCS)
    bound under Duties & Taxes (TAX) and Current Assets (CA - TDS Receivable).
    Calculates live debits, credits, and current balances across all voucher postings.
    """
    from app.modules.misc.tally_chart_of_accounts import seed_indian_accounting_chart_of_accounts
    # Ensure standard accounts and hierarchy exist
    await seed_indian_accounting_chart_of_accounts(session)

    stmt = (
        select(Account)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group),
            selectinload(Account.subgroup),
        )
        .join(Account.group)
        .where(
            or_(
                GroupInPrimary.code == "TAX",
                Account.code.like("ACC_GST_%"),
                Account.code.like("ACC_TDS_%"),
                Account.code.like("ACC_TCS_%"),
                Account.code == "ACC_STATUTORY_DUES",
            )
        )
        .order_by(Account.code.asc())
    )
    accounts = (await session.execute(stmt)).scalars().all()

    items: List[schemas.DutiesAndTaxesLedgerListItem] = []
    for acc in accounts:
        open_bal = Decimal(str(acc.opening_balance or "0.00"))
        open_type = acc.opening_balance_type or "CR"

        # Query all LedgerEntry records for this account
        tx_query = (
            select(
                func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
                func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
                func.count(LedgerEntry.id),
                func.max(LedgerEntry.entry_date),
            )
            .join(LedgerEntry.voucher)
            .where(
                LedgerEntry.account_id == acc.id,
                LedgerEntry.is_reversal == False,
                Voucher.is_void == False,
            )
        )
        if office_id:
            tx_query = tx_query.where(
                or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None))
            )

        tot_dr, tot_cr, tx_count, max_date = (await session.execute(tx_query)).one()
        tot_dr = Decimal(str(tot_dr or "0.00"))
        tot_cr = Decimal(str(tot_cr or "0.00"))

        if open_type == "CR":
            net_balance = open_bal + tot_cr - tot_dr
            if net_balance > Decimal("0.00"):
                bal_type = "CR"
                cur_bal = net_balance
            elif net_balance < Decimal("0.00"):
                bal_type = "DR"
                cur_bal = abs(net_balance)
            else:
                bal_type = "NIL"
                cur_bal = Decimal("0.00")
        else:
            net_balance = open_bal + tot_dr - tot_cr
            if net_balance > Decimal("0.00"):
                bal_type = "DR"
                cur_bal = net_balance
            elif net_balance < Decimal("0.00"):
                bal_type = "CR"
                cur_bal = abs(net_balance)
            else:
                bal_type = "NIL"
                cur_bal = Decimal("0.00")

        upper_code = acc.code.upper()
        upper_name = acc.name.upper()
        if "GST" in upper_code or "GST" in upper_name:
            t_type = "GST"
        elif "TDS" in upper_code or "TDS" in upper_name:
            t_type = "TDS"
        elif "TCS" in upper_code or "TCS" in upper_name:
            t_type = "TCS"
        else:
            t_type = "STATUTORY"

        grp = acc.group
        subgrp = acc.subgroup
        pg = grp.primary_group if grp else None

        item = schemas.DutiesAndTaxesLedgerListItem(
            id=acc.id,
            name=acc.name,
            code=acc.code,
            primary_group_name=pg.name if pg else "Liabilities",
            primary_group_code=pg.code if pg else "LIABILITY",
            group_name=grp.name if grp else "Duties & Taxes",
            group_code=grp.code if grp else "TAX",
            subgroup_name=subgrp.name if subgrp else ("GST Duties" if t_type == "GST" else "TDS Withholdings"),
            subgroup_code=subgrp.code if subgrp else None,
            opening_balance=open_bal,
            opening_balance_type=open_type,
            total_debit=tot_dr,
            total_credit=tot_cr,
            current_balance=cur_bal,
            balance_type=bal_type,
            last_transaction_date=max_date,
            transaction_count=tx_count or 0,
            tax_type=t_type,
        )
        items.append(item)

    if search:
        st = search.strip().lower()
        items = [
            it for it in items
            if st in it.name.lower() or st in it.code.lower() or (it.subgroup_name and st in it.subgroup_name.lower())
        ]

    return items


# ------------------------------------------------------------------------------
# 6. Universal Ledger Statement (For Any Ledger in Chart of Accounts)
# ------------------------------------------------------------------------------

async def get_generic_account_ledger_detail(
    session: AsyncSession,
    account_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    tx_type: Optional[str] = None,
    office_id: Optional[int] = None,
) -> schemas.DetailedLedgerResponse:
    """
    Universal chronological ledger statement for ANY ledger account in the chart of accounts,
    including all Duties & Taxes ledgers, Bank, Cash, Expenses, Revenue, and Party accounts.
    Calculates prior opening balance, running balances, particulars, voucher references, and double-entry postings.
    """
    stmt = (
        select(Account)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group),
            selectinload(Account.subgroup),
            selectinload(Account.company_bank_account).selectinload(CompanyBankAccount.issuing_office),
            selectinload(Account.billing_client).selectinload(BillingClient.issuing_office),
            selectinload(Account.vendor),
            selectinload(Account.driver),
        )
        .where(Account.id == account_id)
    )
    acc = (await session.execute(stmt)).scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account #{account_id} not found")

    grp = acc.group
    subgrp = acc.subgroup
    pg = grp.primary_group if grp else None

    init_open = Decimal(str(acc.opening_balance or "0.00"))
    init_open_type = acc.opening_balance_type or ("CR" if (pg and pg.nature == "CREDIT") else "DR")

    init_dr = init_open if init_open_type == "DR" else Decimal("0.00")
    init_cr = init_open if init_open_type == "CR" else Decimal("0.00")

    if from_date:
        prior_stmt = (
            select(
                func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
                func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
            )
            .join(LedgerEntry.voucher)
            .where(
                LedgerEntry.account_id == acc.id,
                LedgerEntry.is_reversal == False,
                Voucher.is_void == False,
                LedgerEntry.entry_date < from_date,
            )
        )
        if office_id:
            prior_stmt = prior_stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))
        p_dr, p_cr = (await session.execute(prior_stmt)).one()
        eff_dr = init_dr + Decimal(str(p_dr or "0.00"))
        eff_cr = init_cr + Decimal(str(p_cr or "0.00"))
    else:
        eff_dr = init_dr
        eff_cr = init_cr

    is_credit_nature = (init_open_type == "CR") or (pg and pg.nature == "CREDIT")

    if is_credit_nature:
        net_prior = eff_cr - eff_dr
        if net_prior >= Decimal("0.00"):
            opening_balance = net_prior
            opening_balance_type = "CR"
        else:
            opening_balance = abs(net_prior)
            opening_balance_type = "DR"
    else:
        net_prior = eff_dr - eff_cr
        if net_prior >= Decimal("0.00"):
            opening_balance = net_prior
            opening_balance_type = "DR"
        else:
            opening_balance = abs(net_prior)
            opening_balance_type = "CR"

    tx_stmt = (
        select(LedgerEntry)
        .options(
            selectinload(LedgerEntry.voucher).selectinload(Voucher.issuing_office),
            selectinload(LedgerEntry.voucher).selectinload(Voucher.lr),
        )
        .join(LedgerEntry.voucher)
        .where(
            LedgerEntry.account_id == acc.id,
            LedgerEntry.is_reversal == False,
            Voucher.is_void == False,
        )
    )
    if from_date:
        tx_stmt = tx_stmt.where(LedgerEntry.entry_date >= from_date)
    if to_date:
        tx_stmt = tx_stmt.where(LedgerEntry.entry_date <= to_date)
    if office_id:
        tx_stmt = tx_stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))

    tx_stmt = tx_stmt.order_by(LedgerEntry.entry_date.asc(), LedgerEntry.id.asc())
    entries = (await session.execute(tx_stmt)).scalars().all()

    current_running = (opening_balance if opening_balance_type == "CR" else -opening_balance) if is_credit_nature else (opening_balance if opening_balance_type == "DR" else -opening_balance)
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    transactions: List[schemas.LedgerTransaction] = []

    for entry in entries:
        v = entry.voucher
        if v and v.is_void:
            continue
        if tx_type and tx_type.upper() != "ALL":
            if v and v.voucher_type.upper() != tx_type.upper():
                continue

        dr = Decimal(str(entry.debit_amount or "0.00"))
        cr = Decimal(str(entry.credit_amount or "0.00"))
        total_debit += dr
        total_credit += cr

        if is_credit_nature:
            current_running += (cr - dr)
            bal_type = "CR" if current_running >= Decimal("0.00") else "DR"
        else:
            current_running += (dr - cr)
            bal_type = "DR" if current_running >= Decimal("0.00") else "CR"

        part = entry.narration
        if not part and v:
            part = v.narration or (f"{v.party_name} - {v.voucher_type.replace('_', ' ').title()}" if v.party_name else f"{v.voucher_type.replace('_', ' ').title()} - {v.voucher_number}")
        if not part:
            part = acc.name

        v_num = v.voucher_number if v else f"TX-{entry.id}"
        v_type = v.voucher_type if v else "JOURNAL_VOUCHER"
        ref_no = v.reference_number if v else None
        v_id = v.id if v else entry.voucher_id

        transactions.append(
            schemas.LedgerTransaction(
                id=entry.id,
                entry_date=entry.entry_date,
                voucher_id=v_id,
                voucher_number=v_num,
                voucher_type=v_type,
                reference_number=ref_no,
                particulars=part,
                debit_amount=dr,
                credit_amount=cr,
                running_balance=abs(current_running),
                balance_type=bal_type,
                status="CLEARED",
            )
        )

    if search:
        s_term = search.strip().lower()
        transactions = [
            t for t in transactions
            if s_term in t.voucher_number.lower()
            or (t.reference_number and s_term in t.reference_number.lower())
            or (t.particulars and s_term in t.particulars.lower())
        ]

    if is_credit_nature:
        if current_running >= Decimal("0.00"):
            closing_balance = current_running
            closing_balance_type = "CR"
        else:
            closing_balance = abs(current_running)
            closing_balance_type = "DR"
    else:
        if current_running >= Decimal("0.00"):
            closing_balance = current_running
            closing_balance_type = "DR"
        else:
            closing_balance = abs(current_running)
            closing_balance_type = "CR"

    if grp and grp.code == "TAX":
        cat_name = "DUTIES_AND_TAXES"
    elif acc.billing_client_id:
        cat_name = "BILLING_CLIENT"
    elif acc.vendor_id:
        cat_name = "VENDOR"
    elif acc.driver_id:
        cat_name = "DRIVER"
    elif acc.company_bank_account:
        cat_name = "COMPANY_BANK_ACCOUNT"
    else:
        cat_name = "GENERAL_LEDGER"

    party_details = schemas.PartyDetails(
        id=acc.id,
        name=acc.name,
        code=acc.code,
        group_name=grp.name if grp else None,
        subgroup_name=subgrp.name if subgrp else None,
        primary_group_name=pg.name if pg else None,
        account_type=grp.name if grp else "General Ledger",
    )

    return schemas.DetailedLedgerResponse(
        category=cat_name,
        party=party_details,
        from_date=from_date,
        to_date=to_date,
        opening_balance=opening_balance,
        opening_balance_type=opening_balance_type,
        total_debit=total_debit,
        total_credit=total_credit,
        closing_balance=closing_balance,
        closing_balance_type=closing_balance_type,
        total_transactions=len(transactions),
        transactions=transactions,
    )


# ------------------------------------------------------------------------------
# 7. Verification & Hierarchy Healing
# ------------------------------------------------------------------------------

async def verify_and_heal_chart_of_accounts(session: AsyncSession) -> schemas.HierarchyVerificationResponse:
    """
    Explicitly verifies and binds all master ledgers to their Primary Groups,
    Groups in Primary, and Subgroups in Group per Indian Accounting Standards / Tally Prime.
    Auto-seeds all standard Duties & Taxes (GST, TDS, TCS) and core operational ledgers.
    """
    from app.modules.misc.tally_chart_of_accounts import seed_indian_accounting_chart_of_accounts
    result = await seed_indian_accounting_chart_of_accounts(session)
    return schemas.HierarchyVerificationResponse(
        status=result["status"],
        primary_groups_seeded=result["primary_groups_seeded"],
        groups_seeded=result["groups_seeded"],
        subgroups_seeded=result["subgroups_seeded"],
        core_accounts_seeded=result["core_accounts_seeded"],
        accounts_healed=result["accounts_healed"],
        total_primary_groups=result["total_primary_groups"],
        total_groups=result["total_groups"],
        total_subgroups=result["total_subgroups"],
        message="Master ledger hierarchy verified and bound to Indian Accounting Standards & Tally Prime successfully.",
    )


# ------------------------------------------------------------------------------
# 2. Billing Client Ledger Listing & Detailed Statement
# ------------------------------------------------------------------------------

async def list_billing_client_ledgers(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
    search: Optional[str] = None,
) -> List[schemas.BillingClientLedgerListItem]:
    """
    Fetch all Billing Clients from Billing Client Master and compute
    their opening balance, total debits, total credits, and outstanding receivables.
    """
    stmt = (
        select(BillingClient)
        .options(selectinload(BillingClient.issuing_office))
        .where(or_(BillingClient.is_active == True, BillingClient.is_active.is_(None)))
        .order_by(BillingClient.name.asc())
    )

    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(BillingClient.issuing_office_id == office_id, BillingClient.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(BillingClient.issuing_office_id == office_id)

    if search:
        s_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                BillingClient.name.ilike(s_term),
                BillingClient.code.ilike(s_term),
                BillingClient.company_name.ilike(s_term),
                BillingClient.phone.ilike(s_term),
                BillingClient.gstin.ilike(s_term),
            )
        )

    res = await session.execute(stmt)
    clients = list(res.scalars().all())

    # Fetch all vouchers for quick aggregation
    v_stmt = (
        select(Voucher)
        .options(selectinload(Voucher.lr))
        .where(Voucher.is_void == False)
    )
    if office_id:
        if include_unassigned:
            v_stmt = v_stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))
        else:
            v_stmt = v_stmt.where(Voucher.issuing_office_id == office_id)

    v_res = await session.execute(v_stmt)
    vouchers = list(v_res.scalars().all())

    # Fetch all accounts linked to billing clients
    acc_stmt = select(Account).where(Account.billing_client_id.is_not(None))
    acc_res = await session.execute(acc_stmt)
    acc_map = {acc.billing_client_id: acc for acc in acc_res.scalars().all()}

    # Group vouchers by client
    items: List[schemas.BillingClientLedgerListItem] = []
    for client in clients:
        c_acc = acc_map.get(client.id)
        open_bal = Decimal(str(c_acc.opening_balance if c_acc else "0.00"))
        open_type = c_acc.opening_balance_type if c_acc else "DR"

        # Match vouchers
        c_vouchers = [
            v for v in vouchers
            if (
                v.billing_client_id == client.id
                or (v.lr and v.lr.billing_customer_id == client.id)
                or (v.party_name and v.party_name.strip().lower() == client.name.strip().lower())
                or (client.company_name and v.party_name and v.party_name.strip().lower() == client.company_name.strip().lower())
            )
        ]

        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")
        last_date: Optional[date] = None

        for v in c_vouchers:
            v_amt = Decimal(str(v.net_amount or "0.00"))
            v_date = v.voucher_date
            if not last_date or (v_date and v_date > last_date):
                last_date = v_date

            # Invoice, Debit Note = Debit (+DR to Client receivable)
            if v.voucher_type in [
                VoucherType.TRANSPORT_INVOICE.value,
                VoucherType.GENERAL_INVOICE.value,
                VoucherType.DEBIT_NOTE.value,
            ]:
                total_debit += v_amt
            # Receipt, Credit Note = Credit (+CR from Client)
            elif v.voucher_type in [
                VoucherType.RECEIPT_VOUCHER.value,
                VoucherType.CREDIT_NOTE.value,
            ]:
                total_credit += v_amt

        # Opening balance effect
        net_opening = open_bal if open_type == "DR" else -open_bal
        net_outstanding = net_opening + total_debit - total_credit

        if net_outstanding > Decimal("0.00"):
            bal_type = "DR"
            outstanding_abs = net_outstanding
        elif net_outstanding < Decimal("0.00"):
            bal_type = "CR"
            outstanding_abs = abs(net_outstanding)
        else:
            bal_type = "NIL"
            outstanding_abs = Decimal("0.00")

        items.append(
            schemas.BillingClientLedgerListItem(
                id=client.id,
                name=client.name,
                code=client.code or f"BC-{client.id:04d}",
                company_name=client.company_name,
                contact_person=client.contact_person,
                phone=client.phone,
                email=client.email,
                gstin=client.gstin,
                pan=client.pan,
                opening_balance=open_bal,
                opening_balance_type=open_type,
                total_debit=total_debit,
                total_credit=total_credit,
                outstanding_balance=outstanding_abs,
                balance_type=bal_type,
                last_transaction_date=last_date,
                transaction_count=len(c_vouchers),
                issuing_office_id=client.issuing_office_id,
                issuing_office_name=client.issuing_office.name if client.issuing_office else None,
            )
        )

    return items


async def get_billing_client_ledger_detail(
    session: AsyncSession,
    client_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    tx_type: Optional[str] = None,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> schemas.DetailedLedgerResponse:
    """
    Get complete chronological financial statement for a specific billing client.
    Includes date range filters, search, voucher type filter, running balance,
    and link back to original document.
    """
    stmt = (
        select(BillingClient)
        .options(selectinload(BillingClient.issuing_office))
        .where(BillingClient.id == client_id)
    )
    res = await session.execute(stmt)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Billing Client #{client_id} not found")

    # Auto-link or fetch dedicated Account
    account = await get_or_create_party_account(
        session, "BILLING_CLIENT", client.id, client.name, client.code
    )

    initial_bal = Decimal(str(account.opening_balance or "0.00"))
    initial_dr = initial_bal if account.opening_balance_type == "DR" else Decimal("0.00")
    initial_cr = initial_bal if account.opening_balance_type == "CR" else Decimal("0.00")

    # Fetch all vouchers relevant to client
    v_stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.lr),
            selectinload(Voucher.hire_challan),
            selectinload(Voucher.issuing_office),
            selectinload(Voucher.ledger_entries),
        )
        .where(
            or_(
                Voucher.billing_client_id == client.id,
                Voucher.account_id == account.id,
                Voucher.party_name.ilike(client.name),
                Voucher.party_name.ilike(client.company_name or client.name),
            )
        )
    )
    if office_id:
        if include_unassigned:
            v_stmt = v_stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))
        else:
            v_stmt = v_stmt.where(Voucher.issuing_office_id == office_id)

    v_res = await session.execute(v_stmt)
    all_vouchers = list(v_res.scalars().all())

    # Calculate prior opening balance if from_date is supplied
    prior_dr = Decimal("0.00")
    prior_cr = Decimal("0.00")

    if from_date:
        for v in all_vouchers:
            if not v.is_void and v.voucher_date and v.voucher_date < from_date:
                amt = Decimal(str(v.net_amount or "0.00"))
                if v.voucher_type in [VoucherType.TRANSPORT_INVOICE.value, VoucherType.GENERAL_INVOICE.value, VoucherType.DEBIT_NOTE.value]:
                    prior_dr += amt
                elif v.voucher_type in [VoucherType.RECEIPT_VOUCHER.value, VoucherType.CREDIT_NOTE.value]:
                    prior_cr += amt

    eff_dr = initial_dr + prior_dr
    eff_cr = initial_cr + prior_cr
    if eff_dr >= eff_cr:
        opening_balance = eff_dr - eff_cr
        opening_balance_type = "DR"
    else:
        opening_balance = eff_cr - eff_dr
        opening_balance_type = "CR"

    # Filter period vouchers
    period_vouchers = []
    for v in all_vouchers:
        if from_date and v.voucher_date and v.voucher_date < from_date:
            continue
        if to_date and v.voucher_date and v.voucher_date > to_date:
            continue
        if tx_type and tx_type.upper() != "ALL":
            if v.voucher_type.upper() != tx_type.upper():
                continue
        period_vouchers.append(v)

    # Sort chronologically
    period_vouchers.sort(key=lambda x: (x.voucher_date or date.min, x.id))

    # Compute running balance
    transactions: List[schemas.LedgerTransaction] = []
    current_running = (opening_balance if opening_balance_type == "DR" else -opening_balance)
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for v in period_vouchers:
        amt = Decimal(str(v.net_amount or "0.00"))
        is_void = v.is_void

        dr_amt = Decimal("0.00")
        cr_amt = Decimal("0.00")

        if v.voucher_type in [
            VoucherType.TRANSPORT_INVOICE.value,
            VoucherType.GENERAL_INVOICE.value,
            VoucherType.DEBIT_NOTE.value,
        ]:
            dr_amt = amt
        elif v.voucher_type in [
            VoucherType.RECEIPT_VOUCHER.value,
            VoucherType.CREDIT_NOTE.value,
        ]:
            cr_amt = amt
        else:
            dr_amt = amt

        if is_void:
            v_status = "VOIDED"
            # Voided vouchers don't alter running balance
        else:
            v_status = "POSTED"
            current_running += (dr_amt - cr_amt)
            total_debit += dr_amt
            total_credit += cr_amt

        # Format reference & particulars
        ref_no = v.reference_number
        if not ref_no and v.lr:
            ref_no = f"LR {v.lr.lr_number}"
        particulars = v.narration or f"{v.voucher_type.replace('_', ' ').title()} - {v.voucher_number}"

        bal_type = "DR" if current_running >= Decimal("0.00") else "CR"

        transactions.append(
            schemas.LedgerTransaction(
                id=v.id,
                entry_date=v.voucher_date,
                voucher_id=v.id,
                voucher_number=v.voucher_number,
                voucher_type=v.voucher_type,
                reference_number=ref_no,
                particulars=particulars,
                debit_amount=dr_amt,
                credit_amount=cr_amt,
                running_balance=abs(current_running),
                balance_type=bal_type,
                status=v_status,
                is_void=is_void,
                is_reversal=False,
                source_type="LR" if v.lr_id else "VOUCHER",
                source_id=v.lr_id or v.id,
            )
        )

    # Search filter within transactions
    if search:
        s_term = search.strip().lower()
        transactions = [
            t for t in transactions
            if s_term in t.voucher_number.lower()
            or (t.reference_number and s_term in t.reference_number.lower())
            or (t.particulars and s_term in t.particulars.lower())
        ]

    # Closing Balance
    if current_running >= Decimal("0.00"):
        closing_balance = current_running
        closing_balance_type = "DR"
    else:
        closing_balance = abs(current_running)
        closing_balance_type = "CR"

    party_details = schemas.PartyDetails(
        id=client.id,
        name=client.name,
        code=client.code or f"BC-{client.id:04d}",
        company_name=client.company_name,
        contact_person=client.contact_person,
        phone=client.phone,
        email=client.email,
        gstin=client.gstin,
        pan=client.pan,
        address=client.address,
        city=client.city,
        state=client.state,
        pincode=client.pincode,
        credit_period_days=client.credit_period_days,
        credit_limit=client.credit_limit,
        payment_terms=client.payment_terms,
        issuing_office_name=client.issuing_office.name if client.issuing_office else None,
    )

    return schemas.DetailedLedgerResponse(
        category="BILLING_CLIENT",
        party=party_details,
        from_date=from_date,
        to_date=to_date,
        opening_balance=opening_balance,
        opening_balance_type=opening_balance_type,
        total_debit=total_debit,
        total_credit=total_credit,
        closing_balance=closing_balance,
        closing_balance_type=closing_balance_type,
        total_transactions=len(transactions),
        transactions=transactions,
    )


# ------------------------------------------------------------------------------
# 3. Vendor Ledger Listing & Detailed Statement
# ------------------------------------------------------------------------------

async def list_vendor_ledgers(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
    search: Optional[str] = None,
) -> List[schemas.VendorLedgerListItem]:
    """
    Fetch all Vendors from Vendor Master and compute their opening balance,
    total payables/credits (Purchases & confirmed Hire Challans), total debits (Payments),
    and outstanding payable balance.
    """
    stmt = (
        select(Vendor)
        .options(selectinload(Vendor.issuing_office))
        .where(or_(Vendor.is_active == True, Vendor.is_active.is_(None)))
        .order_by(Vendor.name.asc())
    )

    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(Vendor.issuing_office_id == office_id, Vendor.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(Vendor.issuing_office_id == office_id)

    if search:
        s_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Vendor.name.ilike(s_term),
                Vendor.phone.ilike(s_term),
                Vendor.gstin.ilike(s_term),
                Vendor.pan.ilike(s_term),
            )
        )

    res = await session.execute(stmt)
    vendors = list(res.scalars().all())

    # Fetch all vouchers relevant to vendors
    v_stmt = (
        select(Voucher)
        .where(Voucher.is_void == False)
    )
    if office_id:
        if include_unassigned:
            v_stmt = v_stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))
        else:
            v_stmt = v_stmt.where(Voucher.issuing_office_id == office_id)

    v_res = await session.execute(v_stmt)
    vouchers = list(v_res.scalars().all())

    # Fetch confirmed Hire Challans that generate freight payables
    hc_stmt = (
        select(HireChallan)
        .options(selectinload(HireChallan.owner))
        .where(HireChallan.status != "DRAFT")
    )
    if office_id:
        if include_unassigned:
            hc_stmt = hc_stmt.where(or_(HireChallan.issuing_office_id == office_id, HireChallan.issuing_office_id.is_(None)))
        else:
            hc_stmt = hc_stmt.where(HireChallan.issuing_office_id == office_id)

    hc_res = await session.execute(hc_stmt)
    hire_challans = list(hc_res.scalars().all())

    # Map accounts
    acc_stmt = select(Account).where(Account.vendor_id.is_not(None))
    acc_res = await session.execute(acc_stmt)
    acc_map = {acc.vendor_id: acc for acc in acc_res.scalars().all()}

    items: List[schemas.VendorLedgerListItem] = []
    for vendor in vendors:
        v_acc = acc_map.get(vendor.id)
        open_bal = Decimal(str(v_acc.opening_balance if v_acc else "0.00"))
        open_type = v_acc.opening_balance_type if v_acc else "CR"

        total_debit = Decimal("0.00")   # Payments, Debit Notes
        total_credit = Decimal("0.00")  # Purchase bills, Hire liabilities
        last_date: Optional[date] = None
        tx_count = 0

        # Match vouchers
        for v in vouchers:
            is_match = (
                v.vendor_id == vendor.id
                or (v.party_name and v.party_name.strip().lower() == vendor.name.strip().lower())
            )
            if is_match:
                tx_count += 1
                amt = Decimal(str(v.net_amount or "0.00"))
                if not last_date or (v.voucher_date and v.voucher_date > last_date):
                    last_date = v.voucher_date

                # Payment, ATH, BTH, Debit Note = Debit (-DR, reduces payable)
                if v.voucher_type in [
                    VoucherType.PAYMENT_VOUCHER.value,
                    VoucherType.PAYMENT_ATH.value,
                    VoucherType.PAYMENT_BTH.value,
                    "ATH_PAYMENT",
                    "BTH_PAYMENT",
                    VoucherType.DEBIT_NOTE.value,
                ]:
                    total_debit += amt
                # Purchase, Credit Note = Credit (+CR to Vendor payable)
                elif v.voucher_type in [
                    VoucherType.NORMAL_PURCHASE.value,
                    VoucherType.GENERAL_PURCHASE.value,
                    VoucherType.CREDIT_NOTE.value,
                ]:
                    total_credit += amt

        # Match confirmed Hire Challans for this vendor
        for hc in hire_challans:
            is_hc_match = (
                (hc.owner and hc.owner.name.strip().lower() == vendor.name.strip().lower())
                or (hc.vendor_ref_no and hc.vendor_ref_no.strip().lower() == vendor.name.strip().lower())
            )
            if is_hc_match:
                tx_count += 1
                # The freight payable amount
                hc_payable = Decimal(str(hc.net_payable_amount or hc.hire_rate or "0.00"))
                total_credit += hc_payable
                if not last_date or (hc.challan_date and hc.challan_date > last_date):
                    last_date = hc.challan_date

        # Net outstanding payable
        net_opening = open_bal if open_type == "CR" else -open_bal
        net_payable = net_opening + total_credit - total_debit

        if net_payable > Decimal("0.00"):
            bal_type = "CR"
            outstanding_abs = net_payable
        elif net_payable < Decimal("0.00"):
            bal_type = "DR"
            outstanding_abs = abs(net_payable)
        else:
            bal_type = "NIL"
            outstanding_abs = Decimal("0.00")

        items.append(
            schemas.VendorLedgerListItem(
                id=vendor.id,
                name=vendor.name,
                code=f"VEND-{vendor.id:04d}",
                phone=vendor.phone,
                email=vendor.email,
                gstin=vendor.gstin,
                pan=vendor.pan,
                opening_balance=open_bal,
                opening_balance_type=open_type,
                total_debit=total_debit,
                total_credit=total_credit,
                outstanding_payable=outstanding_abs,
                balance_type=bal_type,
                last_transaction_date=last_date,
                transaction_count=tx_count,
                issuing_office_id=vendor.issuing_office_id,
                issuing_office_name=vendor.issuing_office.name if vendor.issuing_office else None,
            )
        )

    return items


async def get_vendor_ledger_detail(
    session: AsyncSession,
    vendor_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    tx_type: Optional[str] = None,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> schemas.DetailedLedgerResponse:
    """
    Get complete chronological financial statement for a specific vendor.
    Captures Purchases, Freight Payables (Hire Challans), ATH/BTH disbursements,
    vendor payments, and Debit/Credit notes.
    """
    stmt = (
        select(Vendor)
        .options(selectinload(Vendor.issuing_office))
        .where(Vendor.id == vendor_id)
    )
    res = await session.execute(stmt)
    vendor = res.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendor #{vendor_id} not found")

    # Auto-link or fetch dedicated Account
    account = await get_or_create_party_account(
        session, "VENDOR", vendor.id, vendor.name, f"VEND-{vendor.id:04d}"
    )

    initial_bal = Decimal(str(account.opening_balance or "0.00"))
    initial_cr = initial_bal if account.opening_balance_type == "CR" else Decimal("0.00")
    initial_dr = initial_bal if account.opening_balance_type == "DR" else Decimal("0.00")

    # Gather matching vouchers
    v_stmt = (
        select(Voucher)
        .options(selectinload(Voucher.hire_challan), selectinload(Voucher.lr))
        .where(
            or_(
                Voucher.vendor_id == vendor.id,
                Voucher.account_id == account.id,
                Voucher.party_name.ilike(vendor.name),
            )
        )
    )
    if office_id:
        if include_unassigned:
            v_stmt = v_stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))
        else:
            v_stmt = v_stmt.where(Voucher.issuing_office_id == office_id)

    v_res = await session.execute(v_stmt)
    all_vouchers = list(v_res.scalars().all())

    # Gather matching confirmed Hire Challans
    hc_stmt = (
        select(HireChallan)
        .options(selectinload(HireChallan.owner), selectinload(HireChallan.lr))
        .where(
            HireChallan.status != "DRAFT",
            or_(
                HireChallan.owner.has(name=vendor.name),
                HireChallan.vendor_ref_no.ilike(vendor.name),
            )
        )
    )
    if office_id:
        if include_unassigned:
            hc_stmt = hc_stmt.where(or_(HireChallan.issuing_office_id == office_id, HireChallan.issuing_office_id.is_(None)))
        else:
            hc_stmt = hc_stmt.where(HireChallan.issuing_office_id == office_id)

    hc_res = await session.execute(hc_stmt)
    hire_challans = list(hc_res.scalars().all())

    # Build raw transaction timeline
    raw_txs: List[Dict[str, Any]] = []

    for v in all_vouchers:
        amt = Decimal(str(v.net_amount or "0.00"))
        is_payment = v.voucher_type in [
            VoucherType.PAYMENT_VOUCHER.value,
            VoucherType.PAYMENT_ATH.value,
            VoucherType.PAYMENT_BTH.value,
            "ATH_PAYMENT",
            "BTH_PAYMENT",
            VoucherType.DEBIT_NOTE.value,
        ]
        debit = amt if is_payment else Decimal("0.00")
        credit = Decimal("0.00") if is_payment else amt

        raw_txs.append({
            "id": f"v-{v.id}",
            "date": v.voucher_date,
            "voucher_id": v.id,
            "voucher_number": v.voucher_number,
            "voucher_type": v.voucher_type,
            "reference_number": v.reference_number or (f"LR {v.lr.lr_number}" if v.lr else None),
            "particulars": v.narration or f"{v.voucher_type.replace('_', ' ').title()} - {v.voucher_number}",
            "debit_amount": debit,
            "credit_amount": credit,
            "status": "VOIDED" if v.is_void else "POSTED",
            "is_void": v.is_void,
            "source_type": "HIRE_CHALLAN" if v.hire_challan_id else ("LR" if v.lr_id else "VOUCHER"),
            "source_id": v.hire_challan_id or v.lr_id or v.id,
        })

    for hc in hire_challans:
        # Check if already posted as voucher to avoid duplicates
        existing_v = any(v.hire_challan_id == hc.id for v in all_vouchers)
        if not existing_v:
            hc_payable = Decimal(str(hc.net_payable_amount or hc.hire_rate or "0.00"))
            raw_txs.append({
                "id": f"hc-{hc.id}",
                "date": hc.challan_date,
                "voucher_id": None,
                "voucher_number": hc.challan_number,
                "voucher_type": "HIRE_CHALLAN_LIABILITY",
                "reference_number": f"Truck {hc.vehicle_number}" + (f" | LR {hc.lr.lr_number}" if hc.lr else ""),
                "particulars": f"Freight Payable for Hired Vehicle {hc.vehicle_number} ({hc.from_location or 'Origin'} -> {hc.to_location or 'Dest'})",
                "debit_amount": Decimal("0.00"),
                "credit_amount": hc_payable,
                "status": hc.status,
                "is_void": False,
                "source_type": "HIRE_CHALLAN",
                "source_id": hc.id,
            })

    # Calculate prior opening balance if from_date is set
    prior_dr = Decimal("0.00")
    prior_cr = Decimal("0.00")
    if from_date:
        for tx in raw_txs:
            if not tx["is_void"] and tx["date"] and tx["date"] < from_date:
                prior_dr += tx["debit_amount"]
                prior_cr += tx["credit_amount"]

    eff_cr = initial_cr + prior_cr
    eff_dr = initial_dr + prior_dr
    if eff_cr >= eff_dr:
        opening_balance = eff_cr - eff_dr
        opening_balance_type = "CR"
    else:
        opening_balance = eff_dr - eff_cr
        opening_balance_type = "DR"

    # Filter by period
    period_txs = []
    for tx in raw_txs:
        if from_date and tx["date"] and tx["date"] < from_date:
            continue
        if to_date and tx["date"] and tx["date"] > to_date:
            continue
        if tx_type and tx_type.upper() != "ALL":
            if tx["voucher_type"].upper() != tx_type.upper():
                continue
        period_txs.append(tx)

    # Chronological sort
    period_txs.sort(key=lambda x: (x["date"] or date.min, str(x["id"])))

    # Compute running balance (CR is positive for payables)
    transactions: List[schemas.LedgerTransaction] = []
    current_running = (opening_balance if opening_balance_type == "CR" else -opening_balance)
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for tx in period_txs:
        dr = tx["debit_amount"]
        cr = tx["credit_amount"]
        if not tx["is_void"]:
            current_running += (cr - dr)
            total_debit += dr
            total_credit += cr

        bal_type = "CR" if current_running >= Decimal("0.00") else "DR"

        transactions.append(
            schemas.LedgerTransaction(
                id=tx["id"],
                entry_date=tx["date"],
                voucher_id=tx["voucher_id"],
                voucher_number=tx["voucher_number"],
                voucher_type=tx["voucher_type"],
                reference_number=tx["reference_number"],
                particulars=tx["particulars"],
                debit_amount=dr,
                credit_amount=cr,
                running_balance=abs(current_running),
                balance_type=bal_type,
                status=tx["status"],
                is_void=tx["is_void"],
                is_reversal=False,
                source_type=tx["source_type"],
                source_id=tx["source_id"],
            )
        )

    # Search filter
    if search:
        s_term = search.strip().lower()
        transactions = [
            t for t in transactions
            if s_term in t.voucher_number.lower()
            or (t.reference_number and s_term in t.reference_number.lower())
            or (t.particulars and s_term in t.particulars.lower())
        ]

    # Closing Balance
    if current_running >= Decimal("0.00"):
        closing_balance = current_running
        closing_balance_type = "CR"
    else:
        closing_balance = abs(current_running)
        closing_balance_type = "DR"

    party_details = schemas.PartyDetails(
        id=vendor.id,
        name=vendor.name,
        code=f"VEND-{vendor.id:04d}",
        phone=vendor.phone,
        email=vendor.email,
        gstin=vendor.gstin,
        pan=vendor.pan,
        address=vendor.address,
        city=vendor.city,
        state=vendor.state,
        pincode=vendor.pincode,
        issuing_office_name=vendor.issuing_office.name if vendor.issuing_office else None,
    )

    return schemas.DetailedLedgerResponse(
        category="VENDOR",
        party=party_details,
        from_date=from_date,
        to_date=to_date,
        opening_balance=opening_balance,
        opening_balance_type=opening_balance_type,
        total_debit=total_debit,
        total_credit=total_credit,
        closing_balance=closing_balance,
        closing_balance_type=closing_balance_type,
        total_transactions=len(transactions),
        transactions=transactions,
    )


# ------------------------------------------------------------------------------
# 4. Driver Ledger Listing & Detailed Statement
# ------------------------------------------------------------------------------

async def list_driver_ledgers(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
    search: Optional[str] = None,
) -> List[schemas.DriverLedgerListItem]:
    """
    Fetch all Drivers from Driver Master and compute their opening balance,
    total advances (Trip Advances + Payments), total settled expenses (Trip Expenses),
    and current net balance (Recoverable / Payable).
    """
    stmt = (
        select(Driver)
        .where(or_(Driver.is_active == True, Driver.is_active.is_(None)))
        .order_by(Driver.name.asc())
    )

    if search:
        clean_s = re.sub(r"^(?:driver|chalak|sarathi)\s+", "", search.strip(), flags=re.I).strip()
        s_term = f"%{clean_s}%"
        conds = [
            Driver.name.ilike(s_term),
            Driver.phone.ilike(s_term),
            Driver.license_number.ilike(s_term),
        ]
        # Also match individual tokens if search includes name and code (e.g. "Parth DRV-0001")
        for tok in clean_s.split():
            if len(tok) >= 2 and not tok.upper().startswith("DRV"):
                conds.append(Driver.name.ilike(f"%{tok}%"))
            m_id = re.search(r"^(?:DRV-?)?(\d+)$", tok, re.I)
            if m_id:
                try:
                    conds.append(Driver.id == int(m_id.group(1)))
                except ValueError:
                    pass
        stmt = stmt.where(or_(*conds))

    res = await session.execute(stmt)
    drivers = list(res.scalars().all())

    # Fetch trip advances
    adv_stmt = select(TripAdvance)
    adv_res = await session.execute(adv_stmt)
    advances = list(adv_res.scalars().all())

    # Fetch trip expenses
    exp_stmt = select(TripExpense)
    exp_res = await session.execute(exp_stmt)
    expenses = list(exp_res.scalars().all())

    # Fetch vouchers linked to drivers
    v_stmt = select(Voucher).where(Voucher.is_void == False, Voucher.driver_id.is_not(None))
    v_res = await session.execute(v_stmt)
    vouchers = list(v_res.scalars().all())

    # Map accounts
    acc_stmt = select(Account).where(Account.driver_id.is_not(None))
    acc_res = await session.execute(acc_stmt)
    acc_map = {acc.driver_id: acc for acc in acc_res.scalars().all()}

    items: List[schemas.DriverLedgerListItem] = []
    for driver in drivers:
        d_acc = acc_map.get(driver.id)
        open_bal = Decimal(str(d_acc.opening_balance if d_acc else "0.00"))
        open_type = d_acc.opening_balance_type if d_acc else "DR"

        total_advances = Decimal("0.00")   # Debits (Money given to driver)
        total_expenses = Decimal("0.00")   # Credits (Expenses settled by driver)
        last_date: Optional[date] = None
        tx_count = 0

        # Trip Advances
        for adv in advances:
            if adv.driver_id == driver.id or (adv.driver_name and adv.driver_name.strip().lower() == driver.name.strip().lower()):
                tx_count += 1
                adv_amt = Decimal(str(adv.advance_amount or "0.00"))
                settled_amt = Decimal(str(adv.settled_amount or "0.00"))
                total_advances += adv_amt
                if settled_amt > Decimal("0.00"):
                    total_expenses += settled_amt
                if not last_date or (adv.advance_date and adv.advance_date > last_date):
                    last_date = adv.advance_date

        # Trip Expenses
        for exp in expenses:
            if exp.driver_id == driver.id or (exp.driver_name and exp.driver_name.strip().lower() == driver.name.strip().lower()):
                tx_count += 1
                exp_amt = Decimal(str(exp.amount or "0.00"))
                total_expenses += exp_amt
                if not last_date or (exp.expense_date and exp.expense_date > last_date):
                    last_date = exp.expense_date

        # Direct Vouchers
        for v in vouchers:
            if v.driver_id == driver.id or (v.party_name and v.party_name.strip().lower() == driver.name.strip().lower()):
                tx_count += 1
                v_amt = Decimal(str(v.net_amount or "0.00"))
                if v.voucher_type in [VoucherType.PAYMENT_VOUCHER.value, VoucherType.PAYMENT_ATH.value, "ATH_PAYMENT"]:
                    total_advances += v_amt
                else:
                    total_expenses += v_amt
                if not last_date or (v.voucher_date and v.voucher_date > last_date):
                    last_date = v.voucher_date

        # Net Driver Balance (DR is recoverable from driver)
        net_opening = open_bal if open_type == "DR" else -open_bal
        net_balance = net_opening + total_advances - total_expenses

        if net_balance > Decimal("0.00"):
            bal_type = "DR"  # Driver owes company money (Recoverable)
            cur_bal = net_balance
        elif net_balance < Decimal("0.00"):
            bal_type = "CR"  # Company owes driver reimbursement (Payable)
            cur_bal = abs(net_balance)
        else:
            bal_type = "NIL"
            cur_bal = Decimal("0.00")

        items.append(
            schemas.DriverLedgerListItem(
                id=driver.id,
                name=driver.name,
                driver_id=f"DRV-{driver.id:04d}",
                phone=driver.phone,
                license_number=driver.license_number,
                dl_status=driver.dl_status,
                opening_balance=open_bal,
                opening_balance_type=open_type,
                total_advances=total_advances,
                total_expenses=total_expenses,
                current_balance=cur_bal,
                balance_type=bal_type,
                last_transaction_date=last_date,
                transaction_count=tx_count,
            )
        )

    return items


async def get_driver_ledger_detail(
    session: AsyncSession,
    driver_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    tx_type: Optional[str] = None,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> schemas.DetailedLedgerResponse:
    """
    Get complete chronological financial statement for a specific driver.
    Captures Trip Advances, Approved Trip Expenses (Fuel, Toll, Mamul, Repair),
    Direct driver disbursements, and Balance settlements.
    """
    stmt = select(Driver).where(Driver.id == driver_id)
    res = await session.execute(stmt)
    driver = res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Driver #{driver_id} not found")

    account = await get_or_create_party_account(
        session, "DRIVER", driver.id, driver.name, f"DRV-{driver.id:04d}"
    )

    initial_bal = Decimal(str(account.opening_balance or "0.00"))
    initial_dr = initial_bal if account.opening_balance_type == "DR" else Decimal("0.00")
    initial_cr = initial_bal if account.opening_balance_type == "CR" else Decimal("0.00")

    # Fetch Trip Advances
    adv_stmt = select(TripAdvance).options(selectinload(TripAdvance.lr)).where(
        or_(
            TripAdvance.driver_id == driver.id,
            TripAdvance.driver_name.ilike(driver.name),
        )
    )
    adv_res = await session.execute(adv_stmt)
    advances = list(adv_res.scalars().all())

    # Fetch Trip Expenses
    exp_stmt = select(TripExpense).options(selectinload(TripExpense.lr)).where(
        or_(
            TripExpense.driver_id == driver.id,
            TripExpense.driver_name.ilike(driver.name),
        )
    )
    exp_res = await session.execute(exp_stmt)
    expenses = list(exp_res.scalars().all())

    # Fetch Direct Vouchers
    v_stmt = select(Voucher).options(selectinload(Voucher.lr)).where(
        or_(
            Voucher.driver_id == driver.id,
            Voucher.account_id == account.id,
            Voucher.party_name.ilike(driver.name),
        )
    )
    v_res = await session.execute(v_stmt)
    vouchers = list(v_res.scalars().all())

    # Build transaction timeline
    raw_txs: List[Dict[str, Any]] = []

    # 1. Trip Advances
    for adv in advances:
        adv_amt = Decimal(str(adv.advance_amount or "0.00"))
        settled_amt = Decimal(str(adv.settled_amount or "0.00"))
        raw_txs.append({
            "id": f"adv-{adv.id}",
            "date": adv.advance_date,
            "voucher_id": None,
            "voucher_number": adv.advance_number,
            "voucher_type": "TRIP_ADVANCE",
            "reference_number": (f"LR {adv.lr.lr_number}" if adv.lr else f"Vehicle {adv.vehicle_number}"),
            "particulars": f"Trip Cash/Fuel Advance via {adv.payment_mode or 'Cash'}" + (f" - {adv.remarks}" if adv.remarks else ""),
            "debit_amount": adv_amt,
            "credit_amount": Decimal("0.00"),
            "status": adv.status or "POSTED",
            "is_void": False,
            "source_type": "TRIP_ADVANCE",
            "source_id": adv.id,
        })
        # If there is direct advance settlement recorded
        if settled_amt > Decimal("0.00"):
            raw_txs.append({
                "id": f"adv-set-{adv.id}",
                "date": adv.settlement_date or adv.advance_date,
                "voucher_id": None,
                "voucher_number": f"{adv.advance_number}-SET",
                "voucher_type": "ADVANCE_SETTLEMENT",
                "reference_number": adv.advance_number,
                "particulars": f"Advance balance refund/settlement for {adv.advance_number}",
                "debit_amount": Decimal("0.00"),
                "credit_amount": settled_amt,
                "status": "SETTLED",
                "is_void": False,
                "source_type": "TRIP_ADVANCE",
                "source_id": adv.id,
            })

    # 2. Trip Expenses
    for exp in expenses:
        exp_amt = Decimal(str(exp.amount or "0.00"))
        cat = exp.expense_category or "GENERAL"
        raw_txs.append({
            "id": f"exp-{exp.id}",
            "date": exp.expense_date,
            "voucher_id": None,
            "voucher_number": exp.expense_number,
            "voucher_type": "TRIP_EXPENSE",
            "reference_number": (f"Receipt #{exp.receipt_number}" if exp.receipt_number else f"Vehicle {exp.vehicle_number}"),
            "particulars": f"En-route {cat} Expense" + (f" at {exp.plaza_name}" if exp.plaza_name else "") + (f" ({exp.remarks})" if exp.remarks else ""),
            "debit_amount": Decimal("0.00"),
            "credit_amount": exp_amt,
            "status": exp.status or "APPROVED",
            "is_void": False,
            "source_type": "TRIP_EXPENSE",
            "source_id": exp.id,
        })

    # 3. Direct Vouchers
    for v in vouchers:
        v_amt = Decimal(str(v.net_amount or "0.00"))
        is_payment = v.voucher_type in [
            VoucherType.PAYMENT_VOUCHER.value,
            VoucherType.PAYMENT_ATH.value,
            "ATH_PAYMENT",
        ]
        raw_txs.append({
            "id": f"v-{v.id}",
            "date": v.voucher_date,
            "voucher_id": v.id,
            "voucher_number": v.voucher_number,
            "voucher_type": v.voucher_type,
            "reference_number": v.reference_number or (f"LR {v.lr.lr_number}" if v.lr else None),
            "particulars": v.narration or f"Driver Disbursement {v.voucher_number}",
            "debit_amount": v_amt if is_payment else Decimal("0.00"),
            "credit_amount": Decimal("0.00") if is_payment else v_amt,
            "status": "VOIDED" if v.is_void else "POSTED",
            "is_void": v.is_void,
            "source_type": "VOUCHER",
            "source_id": v.id,
        })

    # Calculate prior opening balance if from_date is set
    prior_dr = Decimal("0.00")
    prior_cr = Decimal("0.00")
    if from_date:
        for tx in raw_txs:
            if not tx["is_void"] and tx["date"] and tx["date"] < from_date:
                prior_dr += tx["debit_amount"]
                prior_cr += tx["credit_amount"]

    eff_dr = initial_dr + prior_dr
    eff_cr = initial_cr + prior_cr
    if eff_dr >= eff_cr:
        opening_balance = eff_dr - eff_cr
        opening_balance_type = "DR"
    else:
        opening_balance = eff_cr - eff_dr
        opening_balance_type = "CR"

    # Filter period
    period_txs = []
    for tx in raw_txs:
        if from_date and tx["date"] and tx["date"] < from_date:
            continue
        if to_date and tx["date"] and tx["date"] > to_date:
            continue
        if tx_type and tx_type.upper() != "ALL":
            if tx["voucher_type"].upper() != tx_type.upper():
                continue
        period_txs.append(tx)

    # Sort chronologically
    period_txs.sort(key=lambda x: (x["date"] or date.min, str(x["id"])))

    # Compute running balance (DR is positive = Driver owes company)
    transactions: List[schemas.LedgerTransaction] = []
    current_running = (opening_balance if opening_balance_type == "DR" else -opening_balance)
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for tx in period_txs:
        dr = tx["debit_amount"]
        cr = tx["credit_amount"]
        if not tx["is_void"]:
            current_running += (dr - cr)
            total_debit += dr
            total_credit += cr

        bal_type = "DR" if current_running >= Decimal("0.00") else "CR"

        transactions.append(
            schemas.LedgerTransaction(
                id=tx["id"],
                entry_date=tx["date"],
                voucher_id=tx["voucher_id"],
                voucher_number=tx["voucher_number"],
                voucher_type=tx["voucher_type"],
                reference_number=tx["reference_number"],
                particulars=tx["particulars"],
                debit_amount=dr,
                credit_amount=cr,
                running_balance=abs(current_running),
                balance_type=bal_type,
                status=tx["status"],
                is_void=tx["is_void"],
                is_reversal=False,
                source_type=tx["source_type"],
                source_id=tx["source_id"],
            )
        )

    # Search filter
    if search:
        s_term = search.strip().lower()
        transactions = [
            t for t in transactions
            if s_term in t.voucher_number.lower()
            or (t.reference_number and s_term in t.reference_number.lower())
            or (t.particulars and s_term in t.particulars.lower())
        ]

    # Closing Balance
    if current_running >= Decimal("0.00"):
        closing_balance = current_running
        closing_balance_type = "DR"
    else:
        closing_balance = abs(current_running)
        closing_balance_type = "CR"

    party_details = schemas.PartyDetails(
        id=driver.id,
        name=driver.name,
        code=f"DRV-{driver.id:04d}",
        phone=driver.phone,
        license_number=driver.license_number,
        pan=driver.pan_no,
        address=driver.current_address,
    )

    return schemas.DetailedLedgerResponse(
        category="DRIVER",
        party=party_details,
        from_date=from_date,
        to_date=to_date,
        opening_balance=opening_balance,
        opening_balance_type=opening_balance_type,
        total_debit=total_debit,
        total_credit=total_credit,
        closing_balance=closing_balance,
        closing_balance_type=closing_balance_type,
        total_transactions=len(transactions),
        transactions=transactions,
    )


# ------------------------------------------------------------------------------
# 5. Company Bank Accounts Master Ledger Listing & Detailed Statement
# ------------------------------------------------------------------------------

async def list_company_bank_account_ledgers(
    session: AsyncSession,
    office_id: Optional[int] = None,
    search: Optional[str] = None,
    bank_name: Optional[str] = None,
    account_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> List[schemas.CompanyBankAccountLedgerListItem]:
    stmt = (
        select(CompanyBankAccount)
        .options(
            selectinload(CompanyBankAccount.issuing_office),
            selectinload(CompanyBankAccount.account),
        )
        .order_by(CompanyBankAccount.is_default.desc(), CompanyBankAccount.bank_name.asc())
    )

    if office_id:
        stmt = stmt.where(CompanyBankAccount.issuing_office_id == office_id)

    if not is_admin and user_office_ids is not None:
        stmt = stmt.where(CompanyBankAccount.issuing_office_id.in_(user_office_ids))

    if is_active is not None:
        stmt = stmt.where(CompanyBankAccount.is_active == is_active)

    if account_type:
        stmt = stmt.where(CompanyBankAccount.account_type == account_type)

    if bank_name:
        stmt = stmt.where(CompanyBankAccount.bank_name == bank_name)

    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                CompanyBankAccount.bank_name.ilike(s),
                CompanyBankAccount.custom_bank_name.ilike(s),
                CompanyBankAccount.account_holder_name.ilike(s),
                CompanyBankAccount.account_number.ilike(s),
                CompanyBankAccount.ifsc_code.ilike(s),
                CompanyBankAccount.branch_name.ilike(s),
                CompanyBankAccount.ledger_name.ilike(s),
            )
        )

    res = await session.execute(stmt)
    accounts = res.scalars().all()

    # Locate canonical Cash-in-hand ledger account
    cash_acc = (await session.execute(
        select(Account).where(
            or_(Account.code == "ACC_CASH", Account.code == "CASH", Account.name.ilike("%Cash-in-hand%"))
        ).order_by(Account.id.asc()).limit(1)
    )).scalar_one_or_none()

    items: List[schemas.CompanyBankAccountLedgerListItem] = []
    has_cash_account_row = False

    for ba in accounts:
        is_ba_cash = (
            "cash" in (ba.bank_name or "").lower() or
            "cash" in (ba.ledger_name or "").lower() or
            (ba.account_type or "").upper() == "CASH" or
            (cash_acc and ba.account_id == cash_acc.id)
        )
        target_account_ids = [ba.account_id]
        if is_ba_cash:
            has_cash_account_row = True
            if cash_acc and cash_acc.id not in target_account_ids:
                target_account_ids.append(cash_acc.id)

        # Query ledger entries for debits, credits, and tx counts
        le_q = select(
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
            func.count(LedgerEntry.id),
            func.max(LedgerEntry.entry_date),
        ).where(
            LedgerEntry.account_id.in_(target_account_ids),
            LedgerEntry.is_reversal == False,
        )
        if from_date:
            le_q = le_q.where(LedgerEntry.entry_date >= from_date)
        if to_date:
            le_q = le_q.where(LedgerEntry.entry_date <= to_date)

        le_res = await session.execute(le_q)
        tot_dr, tot_cr, tx_cnt, last_dt = le_res.one()

        open_bal = Decimal(str(ba.opening_balance or "0.00"))
        open_dr = open_bal if ba.opening_balance_type == "DR" else Decimal("0.00")
        open_cr = open_bal if ba.opening_balance_type == "CR" else Decimal("0.00")

        # If date range given, prior transactions adjust opening balance
        if from_date:
            prior_q = select(
                func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
                func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
            ).where(
                LedgerEntry.account_id.in_(target_account_ids),
                LedgerEntry.is_reversal == False,
                LedgerEntry.entry_date < from_date,
            )
            p_dr, p_cr = (await session.execute(prior_q)).one()
            effective_open = (open_dr + p_dr) - (open_cr + p_cr)
            if effective_open >= Decimal("0.00"):
                open_bal = effective_open
                open_type = "DR"
            else:
                open_bal = abs(effective_open)
                open_type = "CR"
            open_dr = open_bal if open_type == "DR" else Decimal("0.00")
            open_cr = open_bal if open_type == "CR" else Decimal("0.00")
        else:
            open_type = ba.opening_balance_type

        net = (open_dr + tot_dr) - (open_cr + tot_cr)
        if net >= Decimal("0.00"):
            cur_bal = net
            bal_type = "DR"
        else:
            cur_bal = abs(net)
            bal_type = "CR"

        last4 = ba.account_number[-4:] if len(ba.account_number) >= 4 else ba.account_number
        masked = f"XXXX{last4}"

        items.append(
            schemas.CompanyBankAccountLedgerListItem(
                id=ba.id,
                bank_name=ba.bank_name,
                account_number=ba.account_number,
                account_number_masked=masked,
                account_type=ba.account_type,
                ifsc_code=ba.ifsc_code,
                branch_name=ba.branch_name,
                issuing_office_id=ba.issuing_office_id,
                issuing_office_name=ba.issuing_office.name if ba.issuing_office else "N/A",
                issuing_office_code=ba.issuing_office.code if ba.issuing_office else None,
                opening_balance=open_bal,
                opening_balance_type=open_type,
                total_debit=tot_dr,
                total_credit=tot_cr,
                current_balance=cur_bal,
                balance_type=bal_type,
                status="Active" if ba.is_active else "Inactive",
                is_default=ba.is_default,
                is_active=ba.is_active,
                ledger_id=ba.account_id,
                ledger_name=ba.ledger_name,
                transaction_count=tx_cnt or 0,
                last_transaction_date=last_dt,
            )
        )

    # Ensure Cash-in-hand GL is guaranteed to be included in Bank Accounts tab
    if not has_cash_account_row and cash_acc:
        le_cash_q = select(
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
            func.count(LedgerEntry.id),
            func.max(LedgerEntry.entry_date),
        ).where(
            LedgerEntry.account_id == cash_acc.id,
            LedgerEntry.is_reversal == False,
        )
        if from_date:
            le_cash_q = le_cash_q.where(LedgerEntry.entry_date >= from_date)
        if to_date:
            le_cash_q = le_cash_q.where(LedgerEntry.entry_date <= to_date)

        c_dr, c_cr, c_cnt, c_last_dt = (await session.execute(le_cash_q)).one()
        c_open = Decimal(str(cash_acc.opening_balance or "0.00"))
        c_open_dr = c_open if cash_acc.opening_balance_type == "DR" else Decimal("0.00")
        c_open_cr = c_open if cash_acc.opening_balance_type == "CR" else Decimal("0.00")

        c_net = (c_open_dr + c_dr) - (c_open_cr + c_cr)
        if c_net >= Decimal("0.00"):
            c_cur = c_net
            c_bal_type = "DR"
        else:
            c_cur = abs(c_net)
            c_bal_type = "CR"

        items.append(
            schemas.CompanyBankAccountLedgerListItem(
                id=cash_acc.id,
                bank_name="Cash-in-hand Account",
                account_number="CASH",
                account_number_masked="CASH",
                account_type="CASH",
                ifsc_code="CASH0000000",
                branch_name="Main Operating Cash Vault",
                issuing_office_id=office_id or 1,
                issuing_office_name="All Offices",
                issuing_office_code="ALL",
                opening_balance=c_open,
                opening_balance_type=cash_acc.opening_balance_type or "DR",
                total_debit=c_dr,
                total_credit=c_cr,
                current_balance=c_cur,
                balance_type=c_bal_type,
                status="Active",
                is_default=False,
                is_active=True,
                ledger_id=cash_acc.id,
                ledger_name=cash_acc.name,
                transaction_count=c_cnt or 0,
                last_transaction_date=c_last_dt,
            )
        )

    return items


async def get_company_bank_account_ledger_detail(
    session: AsyncSession,
    bank_account_id: Optional[int] = None,
    account_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> schemas.DetailedLedgerResponse:
    ba: Optional[CompanyBankAccount] = None
    if bank_account_id:
        stmt = (
            select(CompanyBankAccount)
            .options(
                selectinload(CompanyBankAccount.issuing_office),
                selectinload(CompanyBankAccount.account),
            )
            .where(CompanyBankAccount.id == bank_account_id)
        )
        ba = (await session.execute(stmt)).scalar_one_or_none()
    elif account_id:
        stmt = (
            select(CompanyBankAccount)
            .options(
                selectinload(CompanyBankAccount.issuing_office),
                selectinload(CompanyBankAccount.account),
            )
            .where(CompanyBankAccount.account_id == account_id)
        )
        ba = (await session.execute(stmt)).scalar_one_or_none()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bank_account_id or account_id is required.")

    if not ba:
        account = await session.get(Account, account_id or (ba.account_id if ba else None))
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank Account not found.")
        acc_id = account.id
        ledger_name = account.name
        bank_name = account.name
        acc_num = account.code
        office_name = "Company Operating"
        is_default = False
        is_active = account.is_active
        init_open = Decimal(str(account.opening_balance or "0.00"))
        init_open_type = account.opening_balance_type
        ifsc = ""
        acc_type = "Current"
        br_name = ""
    else:
        if not is_admin and user_office_ids is not None and ba.issuing_office_id not in user_office_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        acc_id = ba.account_id
        ledger_name = ba.ledger_name
        bank_name = ba.bank_name
        acc_num = ba.account_number
        office_name = ba.issuing_office.name if ba.issuing_office else "N/A"
        is_default = ba.is_default
        is_active = ba.is_active
        init_open = Decimal(str(ba.opening_balance or "0.00"))
        init_open_type = ba.opening_balance_type
        ifsc = ba.ifsc_code
        acc_type = ba.account_type
        br_name = ba.branch_name or ""

    cash_acc = (await session.execute(
        select(Account).where(
            or_(Account.code == "ACC_CASH", Account.code == "CASH", Account.name.ilike("%Cash-in-hand%"))
        ).order_by(Account.id.asc()).limit(1)
    )).scalar_one_or_none()

    is_cash_detail = (
        "cash" in (bank_name or "").lower() or
        "cash" in (ledger_name or "").lower() or
        (acc_type or "").upper() == "CASH" or
        (cash_acc and acc_id == cash_acc.id)
    )
    target_acc_ids = [acc_id]
    if is_cash_detail and cash_acc and cash_acc.id not in target_acc_ids:
        target_acc_ids.append(cash_acc.id)

    init_dr = init_open if init_open_type == "DR" else Decimal("0.00")
    init_cr = init_open if init_open_type == "CR" else Decimal("0.00")

    if from_date:
        prior_stmt = select(
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
        ).where(
            LedgerEntry.account_id.in_(target_acc_ids),
            LedgerEntry.is_reversal == False,
            LedgerEntry.entry_date < from_date,
        )
        p_dr, p_cr = (await session.execute(prior_stmt)).one()
        eff_dr = init_dr + p_dr
        eff_cr = init_cr + p_cr
    else:
        eff_dr = init_dr
        eff_cr = init_cr

    if eff_dr >= eff_cr:
        opening_balance = eff_dr - eff_cr
        opening_balance_type = "DR"
    else:
        opening_balance = eff_cr - eff_dr
        opening_balance_type = "CR"

    tx_stmt = (
        select(LedgerEntry)
        .options(
            selectinload(LedgerEntry.voucher).selectinload(Voucher.issuing_office),
            selectinload(LedgerEntry.voucher).selectinload(Voucher.lr),
        )
        .where(
            LedgerEntry.account_id.in_(target_acc_ids),
            LedgerEntry.is_reversal == False,
        )
    )
    if from_date:
        tx_stmt = tx_stmt.where(LedgerEntry.entry_date >= from_date)
    if to_date:
        tx_stmt = tx_stmt.where(LedgerEntry.entry_date <= to_date)

    tx_stmt = tx_stmt.order_by(LedgerEntry.entry_date.asc(), LedgerEntry.id.asc())
    entries = (await session.execute(tx_stmt)).scalars().all()

    current_running = opening_balance if opening_balance_type == "DR" else -opening_balance
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    transactions: List[schemas.LedgerTransaction] = []

    for entry in entries:
        v = entry.voucher
        if v and v.is_void:
            continue

        dr = Decimal(str(entry.debit_amount or "0.00"))
        cr = Decimal(str(entry.credit_amount or "0.00"))
        total_debit += dr
        total_credit += cr

        current_running += (dr - cr)
        bal_type = "DR" if current_running >= Decimal("0.00") else "CR"

        part = entry.narration
        if not part and v:
            part = v.narration or f"{v.voucher_type.replace('_', ' ').title()} - {v.voucher_number}"
        if not part:
            part = "Bank Transaction"

        v_num = v.voucher_number if v else f"TX-{entry.id}"
        v_type = v.voucher_type if v else "LEDGER_ENTRY"
        ref_no = v.reference_number if v else None
        v_id = v.id if v else entry.voucher_id

        transactions.append(
            schemas.LedgerTransaction(
                id=entry.id,
                entry_date=entry.entry_date,
                voucher_id=v_id,
                voucher_number=v_num,
                voucher_type=v_type,
                reference_number=ref_no,
                particulars=part,
                debit_amount=dr,
                credit_amount=cr,
                running_balance=abs(current_running),
                balance_type=bal_type,
                status="CLEARED",
            )
        )

    if search:
        s_term = search.strip().lower()
        transactions = [
            t for t in transactions
            if s_term in t.voucher_number.lower()
            or (t.reference_number and s_term in t.reference_number.lower())
            or (t.particulars and s_term in t.particulars.lower())
        ]

    if current_running >= Decimal("0.00"):
        closing_balance = current_running
        closing_balance_type = "DR"
    else:
        closing_balance = abs(current_running)
        closing_balance_type = "CR"

    last4 = acc_num[-4:] if len(acc_num) >= 4 else acc_num
    masked = f"XXXX{last4}"

    party_details = schemas.PartyDetails(
        id=ba.id if ba else acc_id,
        name=ledger_name,
        code=acc_num,
        bank_name=bank_name,
        account_number=acc_num if is_admin else None,
        account_number_masked=masked,
        account_type=acc_type,
        ifsc_code=ifsc,
        branch_name=br_name,
        issuing_office_name=office_name,
        is_default=is_default,
        is_active=is_active,
    )

    return schemas.DetailedLedgerResponse(
        category="COMPANY_BANK_ACCOUNT",
        party=party_details,
        from_date=from_date,
        to_date=to_date,
        opening_balance=opening_balance,
        opening_balance_type=opening_balance_type,
        total_debit=total_debit,
        total_credit=total_credit,
        closing_balance=closing_balance,
        closing_balance_type=closing_balance_type,
        total_transactions=len(transactions),
        transactions=transactions,
    )


# ------------------------------------------------------------------------------
# 6. Company Vehicles Master Ledger Listing & Detailed Statement
# ------------------------------------------------------------------------------

async def list_company_vehicle_ledgers(
    session: AsyncSession,
    office_id: Optional[int] = None,
    search: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> List[schemas.CompanyVehicleLedgerListItem]:
    """
    Fetch all Company-owned vehicles from Company Vehicle Master and compute
    their Fixed Asset capitalization (DR), depreciation/credits (CR),
    current asset book value (WDV), and connected operational trip expenses
    (Fuel, Toll/FASTag, Maintenance) per Indian Transport Accounting Standards.
    Ensures every company vehicle has a dedicated leaf ledger account bound to:
    - Primary Group: Assets (ASSET - Debit)
    - Group in Primary: Fixed Assets (FA)
    - Subgroup in Group: Heavy Commercial Vehicles (FA_HEAVY_VEHICLES) or Company Fleet (FA_COMPANY_VEHICLES)
    """
    stmt = (
        select(CompanyVehicle)
        .options(
            selectinload(CompanyVehicle.default_driver),
        )
        .order_by(CompanyVehicle.vehicle_number.asc())
    )

    if is_active is not None:
        stmt = stmt.where(CompanyVehicle.is_active == is_active)

    if vehicle_type:
        stmt = stmt.where(CompanyVehicle.vehicle_type == vehicle_type)

    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                CompanyVehicle.vehicle_number.ilike(s),
                CompanyVehicle.vehicle_type.ilike(s),
                CompanyVehicle.chassis_number.ilike(s),
                CompanyVehicle.engine_number.ilike(s),
            )
        )

    res = await session.execute(stmt)
    vehicles = list(res.scalars().all())

    # Map accounts linked to company vehicles (mirrors billing clients, vendors, drivers)
    acc_stmt = (
        select(Account)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group),
            selectinload(Account.subgroup),
        )
        .where(Account.company_vehicle_id.is_not(None))
    )
    acc_res = await session.execute(acc_stmt)
    acc_map = {acc.company_vehicle_id: acc for acc in acc_res.scalars().all()}

    items: List[schemas.CompanyVehicleLedgerListItem] = []
    for v in vehicles:
        acc = acc_map.get(v.id) or getattr(v, "account", None)
        if not acc:
            acc = await get_or_create_party_account(
                session,
                party_type="COMPANY_VEHICLE",
                party_id=v.id,
                party_name=v.vehicle_number,
                party_code=f"VEH_{v.id:04d}",
            )
            acc_map[v.id] = acc

        open_bal = Decimal(str(acc.opening_balance or "0.00")) if acc else Decimal("0.00")
        open_dr = open_bal if (acc and acc.opening_balance_type == "DR") else Decimal("0.00")
        open_cr = open_bal if (acc and acc.opening_balance_type == "CR") else Decimal("0.00")

        tot_dr = Decimal("0.00")
        tot_cr = Decimal("0.00")
        tx_cnt = 0
        last_dt = None
        if acc:
            le_q = select(
                func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
                func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
                func.count(LedgerEntry.id),
                func.max(LedgerEntry.entry_date),
            ).where(
                LedgerEntry.account_id == acc.id,
                LedgerEntry.is_reversal == False,
            )
            le_res = await session.execute(le_q)
            tot_dr, tot_cr, tx_cnt, last_dt = le_res.one()

        net = (open_dr + tot_dr) - (open_cr + tot_cr)
        if net >= Decimal("0.00"):
            cur_bal = net
            bal_type = "DR"
        else:
            cur_bal = abs(net)
            bal_type = "CR"

        exp_q = select(
            TripExpense.expense_category,
            func.coalesce(func.sum(TripExpense.amount), Decimal("0.00")),
        ).where(
            TripExpense.vehicle_number == v.vehicle_number,
            TripExpense.status == "APPROVED",
        ).group_by(TripExpense.expense_category)
        exp_res = await session.execute(exp_q)
        exp_map = {cat: amt for cat, amt in exp_res.all()}

        diesel_exp = exp_map.get("DIESEL", Decimal("0.00"))
        toll_exp = exp_map.get("TOLL", Decimal("0.00"))
        maint_exp = exp_map.get("MAINTENANCE", Decimal("0.00"))
        other_exp = sum(amt for cat, amt in exp_map.items() if cat not in ("DIESEL", "TOLL", "MAINTENANCE"))
        total_op_exp = diesel_exp + toll_exp + maint_exp + other_exp

        lr_cnt_q = select(func.count(LR.id)).where(LR.vehicle_number == v.vehicle_number)
        trips_cnt = (await session.execute(lr_cnt_q)).scalar() or 0

        sg_name = acc.subgroup.name if (acc and acc.subgroup) else "Company Owned Fleet Vehicles"
        sg_code = acc.subgroup.code if (acc and acc.subgroup) else "FA_COMPANY_VEHICLES"
        g_name = acc.group.name if (acc and acc.group) else "Fixed Assets"
        g_code = acc.group.code if (acc and acc.group) else "FA"
        pg_name = acc.group.primary_group.name if (acc and acc.group and acc.group.primary_group) else "Assets"
        pg_code = acc.group.primary_group.code if (acc and acc.group and acc.group.primary_group) else "ASSET"

        items.append(
            schemas.CompanyVehicleLedgerListItem(
                id=v.id,
                vehicle_number=v.vehicle_number,
                vehicle_type=v.vehicle_type,
                capacity_mt=Decimal(str(v.capacity_mt or "0.000")),
                chassis_number=v.chassis_number,
                engine_number=v.engine_number,
                registration_date=v.registration_date,
                insurance_expiry=v.insurance_expiry,
                fitness_expiry=v.fitness_expiry,
                national_permit_expiry=v.national_permit_expiry,
                default_driver_id=v.default_driver_id,
                default_driver_name=v.default_driver.name if v.default_driver else None,
                current_odometer_km=v.current_odometer_km or 0,
                is_active=v.is_active,
                status="Active" if v.is_active else "Inactive",
                primary_group_code=pg_code,
                primary_group_name=pg_name,
                group_code=g_code,
                group_name=g_name,
                subgroup_code=sg_code,
                subgroup_name=sg_name,
                ledger_id=acc.id if acc else None,
                ledger_name=acc.name if acc else f"Vehicle - {v.vehicle_number}",
                ledger_code=acc.code if acc else f"VEH_{v.id:04d}",
                opening_balance=open_bal,
                opening_balance_type="DR",
                total_debit=tot_dr,
                total_credit=tot_cr,
                current_balance=cur_bal,
                balance_type=bal_type,
                total_diesel_expense=diesel_exp,
                total_toll_expense=toll_exp,
                total_maintenance_expense=maint_exp,
                total_other_trip_expenses=other_exp,
                total_operational_expense=total_op_exp,
                total_trips_count=trips_cnt,
                transaction_count=tx_cnt or 0,
                last_transaction_date=last_dt,
            )
        )

    return items


async def get_company_vehicle_ledger_detail(
    session: AsyncSession,
    vehicle_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    tx_type: Optional[str] = None,
) -> schemas.DetailedLedgerResponse:
    """
    Detailed ledger statement for a Company Vehicle:
    - Primary Group: Assets (ASSET)
    - Group in Primary: Fixed Assets (FA)
    - Subgroup in Group: Heavy Commercial Vehicles (HCV) / Fleet Vehicles
    Shows capital asset additions, depreciation entries, and connected trip operational vouchers.
    """
    v = await session.get(CompanyVehicle, vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Company vehicle not found.")

    acc = await get_or_create_party_account(
        session,
        party_type="COMPANY_VEHICLE",
        party_id=v.id,
        party_name=v.vehicle_number,
        party_code=f"VEH_{v.id:04d}",
    )

    acc_stmt = (
        select(Account)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group),
            selectinload(Account.subgroup),
        )
        .where(Account.id == acc.id)
    )
    acc = (await session.execute(acc_stmt)).scalar_one()

    open_bal = Decimal(str(acc.opening_balance or "0.00"))
    open_dr = open_bal if acc.opening_balance_type == "DR" else Decimal("0.00")
    open_cr = open_bal if acc.opening_balance_type == "CR" else Decimal("0.00")

    if from_date:
        prior_q = select(
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
        ).where(
            LedgerEntry.account_id == acc.id,
            LedgerEntry.is_reversal == False,
            LedgerEntry.entry_date < from_date,
        )
        p_dr, p_cr = (await session.execute(prior_q)).one()
        eff_open = (open_dr + p_dr) - (open_cr + p_cr)
        if eff_open >= Decimal("0.00"):
            open_bal = eff_open
            open_type = "DR"
        else:
            open_bal = abs(eff_open)
            open_type = "CR"
    else:
        open_type = acc.opening_balance_type

    le_stmt = (
        select(LedgerEntry)
        .options(selectinload(LedgerEntry.voucher))
        .where(
            LedgerEntry.account_id == acc.id,
            LedgerEntry.is_reversal == False,
        )
        .order_by(LedgerEntry.entry_date.asc(), LedgerEntry.id.asc())
    )
    if from_date:
        le_stmt = le_stmt.where(LedgerEntry.entry_date >= from_date)
    if to_date:
        le_stmt = le_stmt.where(LedgerEntry.entry_date <= to_date)

    entries = list((await session.execute(le_stmt)).scalars().all())

    te_stmt = (
        select(TripExpense)
        .options(selectinload(TripExpense.lr), selectinload(TripExpense.driver))
        .where(TripExpense.vehicle_number == v.vehicle_number)
        .order_by(TripExpense.expense_date.asc(), TripExpense.id.asc())
    )
    if from_date:
        te_stmt = te_stmt.where(TripExpense.expense_date >= from_date)
    if to_date:
        te_stmt = te_stmt.where(TripExpense.expense_date <= to_date)
    trip_expenses = list((await session.execute(te_stmt)).scalars().all())

    running = open_bal if open_type == "DR" else -open_bal
    transactions: List[schemas.LedgerTransaction] = []
    tot_dr = Decimal("0.00")
    tot_cr = Decimal("0.00")

    for entry in entries:
        dr = Decimal(str(entry.debit_amount or "0.00"))
        cr = Decimal(str(entry.credit_amount or "0.00"))
        running += (dr - cr)
        tot_dr += dr
        tot_cr += cr

        v_type = entry.voucher.voucher_type if entry.voucher else "JOURNAL_VOUCHER"
        v_num = entry.voucher.voucher_number if entry.voucher else f"TX_{entry.id}"
        particulars = entry.narration or (entry.voucher.narration if entry.voucher else f"Asset Entry: {acc.name}")

        transactions.append(
            schemas.LedgerTransaction(
                id=entry.id,
                entry_date=entry.entry_date,
                voucher_id=entry.voucher_id,
                voucher_number=v_num,
                voucher_type=v_type,
                reference_number=entry.voucher.reference_number if entry.voucher else None,
                particulars=particulars,
                debit_amount=dr,
                credit_amount=cr,
                running_balance=abs(running),
                balance_type="DR" if running >= Decimal("0.00") else "CR",
                status="POSTED",
                is_void=entry.voucher.is_void if entry.voucher else False,
                is_reversal=entry.is_reversal,
                source_type="VOUCHER",
                source_id=entry.voucher_id,
            )
        )

    for te in trip_expenses:
        amt = Decimal(str(te.amount or "0.00"))
        transactions.append(
            schemas.LedgerTransaction(
                id=f"TE_{te.id}",
                entry_date=te.expense_date,
                voucher_id=None,
                voucher_number=te.expense_number,
                voucher_type=f"EXP_{te.expense_category}",
                reference_number=te.receipt_number or (te.lr.lr_number if te.lr else None),
                particulars=f"Trip Expense: {te.expense_category} ({te.payment_mode}) - {te.remarks or 'Vehicle en-route operational expense'}",
                debit_amount=amt,
                credit_amount=Decimal("0.00"),
                running_balance=abs(running),
                balance_type="DR" if running >= Decimal("0.00") else "CR",
                status=te.status,
                is_void=False,
                is_reversal=False,
                source_type="TRIP_EXPENSE",
                source_id=te.id,
            )
        )

    if search:
        s_lower = search.strip().lower()
        transactions = [
            t for t in transactions
            if s_lower in t.voucher_number.lower()
            or s_lower in t.particulars.lower()
            or (t.reference_number and s_lower in t.reference_number.lower())
        ]

    if tx_type and tx_type != "ALL":
        transactions = [t for t in transactions if t.voucher_type == tx_type]

    transactions.sort(key=lambda t: (t.entry_date, str(t.id)))

    net_close = (open_dr + tot_dr) - (open_cr + tot_cr)
    if net_close >= Decimal("0.00"):
        close_bal = net_close
        close_type = "DR"
    else:
        close_bal = abs(net_close)
        close_type = "CR"

    driver_name = v.default_driver.name if v.default_driver else None

    party_info = schemas.PartyDetails(
        id=v.id,
        name=acc.name,
        code=acc.code,
        vehicle_number=v.vehicle_number,
        vehicle_type=v.vehicle_type,
        capacity_mt=Decimal(str(v.capacity_mt or "0.000")),
        chassis_number=v.chassis_number,
        engine_number=v.engine_number,
        registration_date=v.registration_date,
        insurance_expiry=v.insurance_expiry,
        fitness_expiry=v.fitness_expiry,
        national_permit_expiry=v.national_permit_expiry,
        current_odometer_km=v.current_odometer_km or 0,
        driver_name=driver_name,
        is_active=v.is_active,
        group_name=acc.group.name if acc.group else "Fixed Assets",
        subgroup_name=acc.subgroup.name if acc.subgroup else "Company Owned Fleet Vehicles",
        primary_group_name=acc.group.primary_group.name if (acc.group and acc.group.primary_group) else "Assets",
    )

    return schemas.DetailedLedgerResponse(
        category="COMPANY_VEHICLE",
        party=party_info,
        from_date=from_date,
        to_date=to_date,
        opening_balance=open_bal,
        opening_balance_type=open_type,
        total_debit=tot_dr,
        total_credit=tot_cr,
        closing_balance=close_bal,
        closing_balance_type=close_type,
        total_transactions=len(transactions),
        transactions=transactions,
    )
