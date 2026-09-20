from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.tenant_db.models import (
    Voucher,
    VoucherItem,
    LedgerEntry,
    VoucherType,
    Account,
    GroupInPrimary,
    PrimaryGroup,
    LR,
    HireChallan,
    TaxCategory,
)
from app.modules.reports.schemas import (
    DaybookEntry,
    DaybookResponse,
    LedgerTransaction,
    LedgerResponse,
    TrialBalanceAccount,
    TrialBalanceGroup,
    TrialBalancePrimaryGroup,
    TrialBalanceResponse,
    PnLAccountItem,
    PnLGroupItem,
    ProfitLossResponse,
    BalanceSheetAccountItem,
    BalanceSheetGroupItem,
    BalanceSheetResponse,
    SalesRegisterItem,
    SalesRegisterResponse,
    PurchaseRegisterItem,
    PurchaseRegisterResponse,
    BankReconTransaction,
    BankReconciliationResponse,
    SpecialReportTripItem,
    SpecialReportResponse,
)


# ==============================================================================
# 1. Daybook Service
# ==============================================================================

async def get_daybook(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    voucher_type: Optional[str] = None,
    account_id: Optional[int] = None,
) -> DaybookResponse:
    stmt = (
        select(LedgerEntry)
        .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
        .join(Account, LedgerEntry.account_id == Account.id)
        .options(
            selectinload(LedgerEntry.voucher),
            selectinload(LedgerEntry.account),
        )
        .where(Voucher.is_void == False)  # Exclude void vouchers
    )

    if from_date:
        stmt = stmt.where(LedgerEntry.entry_date >= from_date)
    if to_date:
        stmt = stmt.where(LedgerEntry.entry_date <= to_date)
    if voucher_type:
        stmt = stmt.where(Voucher.voucher_type == voucher_type)
    if account_id:
        stmt = stmt.where(LedgerEntry.account_id == account_id)

    stmt = stmt.order_by(LedgerEntry.entry_date.asc(), Voucher.id.asc(), LedgerEntry.id.asc())
    res = await session.execute(stmt)
    entries = res.scalars().all()

    items: List[DaybookEntry] = []
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for e in entries:
        debit = Decimal(str(e.debit_amount or "0.00"))
        credit = Decimal(str(e.credit_amount or "0.00"))
        total_debit += debit
        total_credit += credit

        items.append(
            DaybookEntry(
                id=e.id,
                voucher_id=e.voucher.id,
                voucher_number=e.voucher.voucher_number,
                voucher_type=e.voucher.voucher_type,
                entry_date=e.entry_date,
                account_id=e.account.id,
                account_name=e.account.name,
                account_code=e.account.code,
                party_name=e.voucher.party_name,
                debit_amount=debit,
                credit_amount=credit,
                narration=e.narration or e.voucher.narration,
                is_reversal=e.is_reversal,
            )
        )

    return DaybookResponse(
        entries=items,
        total_debit=total_debit,
        total_credit=total_credit,
        total_entries=len(items),
        from_date=from_date,
        to_date=to_date,
    )


# ==============================================================================
# 2. Account Ledger Service
# ==============================================================================

async def get_account_ledger(
    session: AsyncSession,
    account_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> LedgerResponse:
    # 1. Fetch Account and its groups
    acc_stmt = (
        select(Account)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group)
        )
        .where(Account.id == account_id)
    )
    acc_res = await session.execute(acc_stmt)
    account = acc_res.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )

    initial_bal = Decimal(str(account.opening_balance or "0.00"))
    initial_dr = initial_bal if account.opening_balance_type == "DR" else Decimal("0.00")
    initial_cr = initial_bal if account.opening_balance_type == "CR" else Decimal("0.00")

    # 2. Adjust opening balance for prior entries if from_date is given
    prior_dr = Decimal("0.00")
    prior_cr = Decimal("0.00")
    if from_date:
        prior_stmt = (
            select(
                func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
                func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
            )
            .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
            .where(
                LedgerEntry.account_id == account_id,
                LedgerEntry.entry_date < from_date,
                Voucher.is_void == False,
            )
        )
        prior_res = await session.execute(prior_stmt)
        p_dr, p_cr = prior_res.one()
        prior_dr = Decimal(str(p_dr or "0.00"))
        prior_cr = Decimal(str(p_cr or "0.00"))

    effective_opening_dr = initial_dr + prior_dr
    effective_opening_cr = initial_cr + prior_cr

    if effective_opening_dr >= effective_opening_cr:
        opening_balance = effective_opening_dr - effective_opening_cr
        opening_balance_type = "DR"
    else:
        opening_balance = effective_opening_cr - effective_opening_dr
        opening_balance_type = "CR"

    # 3. Query transactions within the period
    tx_stmt = (
        select(LedgerEntry)
        .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
        .options(selectinload(LedgerEntry.voucher))
        .where(
            LedgerEntry.account_id == account_id,
            Voucher.is_void == False,
        )
    )
    if from_date:
        tx_stmt = tx_stmt.where(LedgerEntry.entry_date >= from_date)
    if to_date:
        tx_stmt = tx_stmt.where(LedgerEntry.entry_date <= to_date)

    tx_stmt = tx_stmt.order_by(LedgerEntry.entry_date.asc(), Voucher.id.asc(), LedgerEntry.id.asc())
    tx_res = await session.execute(tx_stmt)
    entries = tx_res.scalars().all()

    # 4. Compute running balance
    transactions: List[LedgerTransaction] = []
    period_debit = Decimal("0.00")
    period_credit = Decimal("0.00")

    # Current net position (positive = Net DR, negative = Net CR)
    current_net = opening_balance if opening_balance_type == "DR" else -opening_balance

    for e in entries:
        debit = Decimal(str(e.debit_amount or "0.00"))
        credit = Decimal(str(e.credit_amount or "0.00"))
        period_debit += debit
        period_credit += credit

        current_net = current_net + debit - credit
        if current_net >= Decimal("0.00"):
            run_bal = current_net
            run_type = "DR"
        else:
            run_bal = abs(current_net)
            run_type = "CR"

        transactions.append(
            LedgerTransaction(
                id=e.id,
                entry_date=e.entry_date,
                voucher_id=e.voucher.id,
                voucher_number=e.voucher.voucher_number,
                voucher_type=e.voucher.voucher_type,
                party_name=e.voucher.party_name,
                debit_amount=debit,
                credit_amount=credit,
                narration=e.narration or e.voucher.narration,
                running_balance=run_bal,
                running_balance_type=run_type,
            )
        )

    if current_net >= Decimal("0.00"):
        closing_balance = current_net
        closing_balance_type = "DR"
    else:
        closing_balance = abs(current_net)
        closing_balance_type = "CR"

    return LedgerResponse(
        account_id=account.id,
        account_name=account.name,
        account_code=account.code,
        group_name=account.group.name if account.group else "Unassigned",
        primary_group_name=account.group.primary_group.name if account.group and account.group.primary_group else "Unassigned",
        from_date=from_date,
        to_date=to_date,
        opening_balance=opening_balance,
        opening_balance_type=opening_balance_type,
        transactions=transactions,
        period_debit=period_debit,
        period_credit=period_credit,
        closing_balance=closing_balance,
        closing_balance_type=closing_balance_type,
    )


# ==============================================================================
# 3. Trial Balance Service (Rules §9 strict reconciliation)
# ==============================================================================

async def get_trial_balance(
    session: AsyncSession,
    as_of_date: Optional[date] = None,
) -> TrialBalanceResponse:
    effective_date = as_of_date or date.today()

    # 1. Fetch all Primary Groups with hierarchy
    pg_stmt = (
        select(PrimaryGroup)
        .options(
            selectinload(PrimaryGroup.groups).selectinload(GroupInPrimary.accounts)
        )
        .order_by(PrimaryGroup.id.asc())
    )
    pg_res = await session.execute(pg_stmt)
    primary_groups = pg_res.scalars().all()

    # 2. Query ledger totals up to effective_date grouped by account_id
    le_stmt = (
        select(
            LedgerEntry.account_id,
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")).label("sum_debit"),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")).label("sum_credit"),
        )
        .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
        .where(
            LedgerEntry.entry_date <= effective_date,
            Voucher.is_void == False,
        )
        .group_by(LedgerEntry.account_id)
    )
    le_res = await session.execute(le_stmt)
    ledger_map = {row.account_id: (Decimal(str(row.sum_debit)), Decimal(str(row.sum_credit))) for row in le_res.all()}

    grand_total_debit = Decimal("0.00")
    grand_total_credit = Decimal("0.00")

    result_pgs: List[TrialBalancePrimaryGroup] = []

    for pg in primary_groups:
        pg_debit = Decimal("0.00")
        pg_credit = Decimal("0.00")
        result_groups: List[TrialBalanceGroup] = []

        for grp in pg.groups:
            grp_debit = Decimal("0.00")
            grp_credit = Decimal("0.00")
            result_accs: List[TrialBalanceAccount] = []

            for acc in grp.accounts:
                open_bal = Decimal(str(acc.opening_balance or "0.00"))
                init_dr = open_bal if acc.opening_balance_type == "DR" else Decimal("0.00")
                init_cr = open_bal if acc.opening_balance_type == "CR" else Decimal("0.00")

                txn_dr, txn_cr = ledger_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))

                total_dr = init_dr + txn_dr
                total_cr = init_cr + txn_cr

                # Net balance for Trial Balance presentation
                if total_dr > total_cr:
                    net_dr = total_dr - total_cr
                    net_cr = Decimal("0.00")
                elif total_cr > total_dr:
                    net_dr = Decimal("0.00")
                    net_cr = total_cr - total_dr
                else:
                    net_dr = Decimal("0.00")
                    net_cr = Decimal("0.00")

                # Include account if it has opening balance or ledger activity
                if net_dr > 0 or net_cr > 0 or open_bal > 0 or txn_dr > 0 or txn_cr > 0:
                    result_accs.append(
                        TrialBalanceAccount(
                            account_id=acc.id,
                            account_code=acc.code,
                            account_name=acc.name,
                            debit_balance=net_dr,
                            credit_balance=net_cr,
                        )
                    )
                    grp_debit += net_dr
                    grp_credit += net_cr

            if result_accs:
                result_groups.append(
                    TrialBalanceGroup(
                        group_id=grp.id,
                        group_name=grp.name,
                        group_code=grp.code,
                        accounts=result_accs,
                        group_debit=grp_debit,
                        group_credit=grp_credit,
                    )
                )
                pg_debit += grp_debit
                pg_credit += grp_credit

        if result_groups:
            result_pgs.append(
                TrialBalancePrimaryGroup(
                    primary_group_id=pg.id,
                    primary_group_name=pg.name,
                    primary_group_code=pg.code,
                    nature=pg.nature,
                    groups=result_groups,
                    primary_debit=pg_debit,
                    primary_credit=pg_credit,
                )
            )
            grand_total_debit += pg_debit
            grand_total_credit += pg_credit

    difference = abs(grand_total_debit - grand_total_credit)
    is_balanced = difference == Decimal("0.00")

    return TrialBalanceResponse(
        as_of_date=effective_date,
        primary_groups=result_pgs,
        total_debit=grand_total_debit,
        total_credit=grand_total_credit,
        difference=difference,
        is_balanced=is_balanced,
    )


# ==============================================================================
# 4. Profit & Loss Service
# ==============================================================================

async def get_profit_and_loss(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> ProfitLossResponse:
    effective_to = to_date or date.today()

    # Query groups and accounts under INCOME and EXPENSE
    stmt = (
        select(Account)
        .join(GroupInPrimary, Account.group_id == GroupInPrimary.id)
        .join(PrimaryGroup, GroupInPrimary.primary_group_id == PrimaryGroup.id)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group)
        )
        .where(PrimaryGroup.code.in_(["INCOME", "EXPENSE"]))
        .order_by(GroupInPrimary.code.asc(), Account.code.asc())
    )
    res = await session.execute(stmt)
    accounts = res.scalars().all()

    # Query period ledger totals
    le_stmt = (
        select(
            LedgerEntry.account_id,
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")).label("sum_debit"),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")).label("sum_credit"),
        )
        .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
        .where(
            LedgerEntry.entry_date <= effective_to,
            Voucher.is_void == False,
        )
    )
    if from_date:
        le_stmt = le_stmt.where(LedgerEntry.entry_date >= from_date)

    le_stmt = le_stmt.group_by(LedgerEntry.account_id)
    le_res = await session.execute(le_stmt)
    ledger_map = {row.account_id: (Decimal(str(row.sum_debit)), Decimal(str(row.sum_credit))) for row in le_res.all()}

    # Categorize into Direct Income, Indirect Income, Direct Expense, Indirect Expense
    direct_income_groups: Dict[str, List[PnLAccountItem]] = {}
    indirect_income_groups: Dict[str, List[PnLAccountItem]] = {}
    direct_expense_groups: Dict[str, List[PnLAccountItem]] = {}
    indirect_expense_groups: Dict[str, List[PnLAccountItem]] = {}

    for acc in accounts:
        grp = acc.group
        pg = grp.primary_group if grp else None
        if not grp or not pg:
            continue

        txn_dr, txn_cr = ledger_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))

        if pg.code == "INCOME":
            # Net credit balance
            net_amt = txn_cr - txn_dr
            if net_amt != 0 or acc.opening_balance > 0:
                item = PnLAccountItem(account_id=acc.id, account_code=acc.code, account_name=acc.name, amount=net_amt)
                target_dict = direct_income_groups if grp.code == "REV_DIRECT" else indirect_income_groups
                target_dict.setdefault(grp.name, []).append(item)

        elif pg.code == "EXPENSE":
            # Net debit balance
            net_amt = txn_dr - txn_cr
            if net_amt != 0 or acc.opening_balance > 0:
                item = PnLAccountItem(account_id=acc.id, account_code=acc.code, account_name=acc.name, amount=net_amt)
                target_dict = direct_expense_groups if grp.code == "EXP_DIRECT" else indirect_expense_groups
                target_dict.setdefault(grp.name, []).append(item)

    def _pack_groups(gdict: Dict[str, List[PnLAccountItem]]) -> (List[PnLGroupItem], Decimal):
        items = []
        tot = Decimal("0.00")
        for gname, accs in gdict.items():
            gtot = sum(a.amount for a in accs)
            items.append(PnLGroupItem(group_name=gname, accounts=accs, group_total=gtot))
            tot += gtot
        return items, tot

    dir_inc_items, total_direct_income = _pack_groups(direct_income_groups)
    indir_inc_items, total_indirect_income = _pack_groups(indirect_income_groups)
    total_revenue = total_direct_income + total_indirect_income

    dir_exp_items, total_direct_expenses = _pack_groups(direct_expense_groups)
    indir_exp_items, total_indirect_expenses = _pack_groups(indirect_expense_groups)
    total_expenses = total_direct_expenses + total_indirect_expenses

    gross_profit = total_direct_income - total_direct_expenses
    net_profit = gross_profit + total_indirect_income - total_indirect_expenses

    return ProfitLossResponse(
        from_date=from_date,
        to_date=effective_to,
        direct_income=dir_inc_items,
        total_direct_income=total_direct_income,
        indirect_income=indir_inc_items,
        total_indirect_income=total_indirect_income,
        total_revenue=total_revenue,
        direct_expenses=dir_exp_items,
        total_direct_expenses=total_direct_expenses,
        indirect_expenses=indir_exp_items,
        total_indirect_expenses=total_indirect_expenses,
        total_expenses=total_expenses,
        gross_profit=gross_profit,
        net_profit=net_profit,
    )


# ==============================================================================
# 5. Balance Sheet Service (Rules §9 strict tie-out)
# ==============================================================================

async def get_balance_sheet(
    session: AsyncSession,
    as_of_date: Optional[date] = None,
) -> BalanceSheetResponse:
    effective_date = as_of_date or date.today()

    # 1. First calculate Net Profit up to effective_date from P&L (inception to date)
    pnl = await get_profit_and_loss(session, from_date=None, to_date=effective_date)
    net_profit = pnl.net_profit

    # 2. Query all accounts under ASSET, LIABILITY, EQUITY
    stmt = (
        select(Account)
        .join(GroupInPrimary, Account.group_id == GroupInPrimary.id)
        .join(PrimaryGroup, GroupInPrimary.primary_group_id == PrimaryGroup.id)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group)
        )
        .where(PrimaryGroup.code.in_(["ASSET", "LIABILITY", "EQUITY"]))
        .order_by(PrimaryGroup.id.asc(), GroupInPrimary.id.asc(), Account.id.asc())
    )
    res = await session.execute(stmt)
    accounts = res.scalars().all()

    # 3. Query ledger sums up to effective_date
    le_stmt = (
        select(
            LedgerEntry.account_id,
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")).label("sum_debit"),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")).label("sum_credit"),
        )
        .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
        .where(
            LedgerEntry.entry_date <= effective_date,
            Voucher.is_void == False,
        )
        .group_by(LedgerEntry.account_id)
    )
    le_res = await session.execute(le_stmt)
    ledger_map = {row.account_id: (Decimal(str(row.sum_debit)), Decimal(str(row.sum_credit))) for row in le_res.all()}

    asset_dict: Dict[str, List[BalanceSheetAccountItem]] = {}
    liability_dict: Dict[str, List[BalanceSheetAccountItem]] = {}
    equity_dict: Dict[str, List[BalanceSheetAccountItem]] = {}

    for acc in accounts:
        grp = acc.group
        pg = grp.primary_group if grp else None
        if not grp or not pg:
            continue

        open_bal = Decimal(str(acc.opening_balance or "0.00"))
        init_dr = open_bal if acc.opening_balance_type == "DR" else Decimal("0.00")
        init_cr = open_bal if acc.opening_balance_type == "CR" else Decimal("0.00")

        txn_dr, txn_cr = ledger_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))

        tot_dr = init_dr + txn_dr
        tot_cr = init_cr + txn_cr

        if pg.code == "ASSET":
            # Net debit balance
            net_bal = tot_dr - tot_cr
            if net_bal != 0 or open_bal > 0:
                asset_dict.setdefault(grp.name, []).append(
                    BalanceSheetAccountItem(account_id=acc.id, account_code=acc.code, account_name=acc.name, amount=net_bal)
                )

        elif pg.code == "LIABILITY":
            # Net credit balance
            net_bal = tot_cr - tot_dr
            if net_bal != 0 or open_bal > 0:
                liability_dict.setdefault(grp.name, []).append(
                    BalanceSheetAccountItem(account_id=acc.id, account_code=acc.code, account_name=acc.name, amount=net_bal)
                )

        elif pg.code == "EQUITY":
            # Net credit balance
            net_bal = tot_cr - tot_dr
            if net_bal != 0 or open_bal > 0:
                equity_dict.setdefault(grp.name, []).append(
                    BalanceSheetAccountItem(account_id=acc.id, account_code=acc.code, account_name=acc.name, amount=net_bal)
                )

    def _pack_bs_groups(gdict: Dict[str, List[BalanceSheetAccountItem]]) -> (List[BalanceSheetGroupItem], Decimal):
        items = []
        tot = Decimal("0.00")
        for gname, accs in gdict.items():
            gtot = sum(a.amount for a in accs)
            items.append(BalanceSheetGroupItem(group_name=gname, accounts=accs, group_total=gtot))
            tot += gtot
        return items, tot

    asset_groups, total_assets = _pack_bs_groups(asset_dict)
    liability_groups, total_liabilities = _pack_bs_groups(liability_dict)
    equity_groups, equity_base = _pack_bs_groups(equity_dict)

    # Total Equity includes net profit from operations transferred into Retained Earnings
    total_equity = equity_base + net_profit
    total_liabilities_and_equity = total_liabilities + total_equity

    difference = abs(total_assets - total_liabilities_and_equity)
    is_balanced = difference == Decimal("0.00")

    return BalanceSheetResponse(
        as_of_date=effective_date,
        asset_groups=asset_groups,
        total_assets=total_assets,
        liability_groups=liability_groups,
        total_liabilities=total_liabilities,
        equity_groups=equity_groups,
        net_profit_transferred=net_profit,
        total_equity=total_equity,
        total_liabilities_and_equity=total_liabilities_and_equity,
        difference=difference,
        is_balanced=is_balanced,
    )


# ==============================================================================
# 6. Sales Register Service
# ==============================================================================

async def get_sales_register(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> SalesRegisterResponse:
    stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.items).selectinload(VoucherItem.tax_category),
            selectinload(Voucher.lr),
            selectinload(Voucher.einvoice),
        )
        .where(
            Voucher.voucher_type.in_([VoucherType.TRANSPORT_INVOICE.value, VoucherType.GENERAL_INVOICE.value]),
            Voucher.is_void == False,
        )
    )
    if from_date:
        stmt = stmt.where(Voucher.voucher_date >= from_date)
    if to_date:
        stmt = stmt.where(Voucher.voucher_date <= to_date)

    stmt = stmt.order_by(Voucher.voucher_date.asc(), Voucher.id.asc())
    res = await session.execute(stmt)
    vouchers = res.scalars().all()

    invoices: List[SalesRegisterItem] = []
    tot_taxable = Decimal("0.00")
    tot_cgst = Decimal("0.00")
    tot_sgst = Decimal("0.00")
    tot_igst = Decimal("0.00")
    tot_tax = Decimal("0.00")
    tot_net = Decimal("0.00")

    for v in vouchers:
        taxable = Decimal(str(v.total_amount or "0.00"))
        v_tax = Decimal(str(v.tax_amount or "0.00"))
        v_net = Decimal(str(v.net_amount or "0.00"))

        cgst = Decimal("0.00")
        sgst = Decimal("0.00")
        igst = Decimal("0.00")

        # Break down tax across items
        for itm in v.items:
            t_amt = Decimal(str(itm.tax_amount or "0.00"))
            tc = itm.tax_category
            if tc:
                if tc.igst_rate and tc.igst_rate > 0 and (tc.cgst_rate == 0 or tc.cgst_rate is None):
                    igst += t_amt
                else:
                    half = (t_amt / Decimal("2.00")).quantize(Decimal("0.01"))
                    cgst += half
                    sgst += half
            else:
                half = (t_amt / Decimal("2.00")).quantize(Decimal("0.01"))
                cgst += half
                sgst += half

        # Fallback if no items but tax amount exists
        if v_tax > 0 and (cgst + sgst + igst) == 0:
            cgst = (v_tax / Decimal("2.00")).quantize(Decimal("0.01"))
            sgst = (v_tax / Decimal("2.00")).quantize(Decimal("0.01"))

        tot_taxable += taxable
        tot_cgst += cgst
        tot_sgst += sgst
        tot_igst += igst
        tot_tax += v_tax
        tot_net += v_net

        invoices.append(
            SalesRegisterItem(
                voucher_id=v.id,
                voucher_number=v.voucher_number,
                voucher_date=v.voucher_date,
                party_name=v.party_name,
                party_gstin=v.lr.consigner.gstin if v.lr and v.lr.consigner else None,
                lr_number=v.lr.lr_number if v.lr else None,
                taxable_amount=taxable,
                cgst_amount=cgst,
                sgst_amount=sgst,
                igst_amount=igst,
                total_tax=v_tax,
                net_amount=v_net,
                irn=v.einvoice.irn if v.einvoice else None,
                irn_status=v.einvoice.status if v.einvoice else None,
            )
        )

    return SalesRegisterResponse(
        from_date=from_date,
        to_date=to_date,
        invoices=invoices,
        total_taxable=tot_taxable,
        total_cgst=tot_cgst,
        total_sgst=tot_sgst,
        total_igst=tot_igst,
        total_tax=tot_tax,
        total_net_amount=tot_net,
        invoice_count=len(invoices),
    )


# ==============================================================================
# 7. Purchase Register Service
# ==============================================================================

async def get_purchase_register(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> PurchaseRegisterResponse:
    purchase_types = [
        VoucherType.NORMAL_PURCHASE.value,
        VoucherType.GENERAL_PURCHASE.value,
        VoucherType.PAYMENT_ATH.value,
        VoucherType.PAYMENT_BTH.value,
    ]
    stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.items).selectinload(VoucherItem.tax_category)
        )
        .where(
            Voucher.voucher_type.in_(purchase_types),
            Voucher.is_void == False,
        )
    )
    if from_date:
        stmt = stmt.where(Voucher.voucher_date >= from_date)
    if to_date:
        stmt = stmt.where(Voucher.voucher_date <= to_date)

    stmt = stmt.order_by(Voucher.voucher_date.asc(), Voucher.id.asc())
    res = await session.execute(stmt)
    vouchers = res.scalars().all()

    purchases: List[PurchaseRegisterItem] = []
    tot_taxable = Decimal("0.00")
    tot_cgst = Decimal("0.00")
    tot_sgst = Decimal("0.00")
    tot_igst = Decimal("0.00")
    tot_tax = Decimal("0.00")
    tot_net = Decimal("0.00")

    for v in vouchers:
        taxable = Decimal(str(v.total_amount or "0.00"))
        v_tax = Decimal(str(v.tax_amount or "0.00"))
        v_net = Decimal(str(v.net_amount or "0.00"))

        cgst = Decimal("0.00")
        sgst = Decimal("0.00")
        igst = Decimal("0.00")

        for itm in v.items:
            t_amt = Decimal(str(itm.tax_amount or "0.00"))
            tc = itm.tax_category
            if tc:
                if tc.igst_rate and tc.igst_rate > 0 and (tc.cgst_rate == 0 or tc.cgst_rate is None):
                    igst += t_amt
                else:
                    half = (t_amt / Decimal("2.00")).quantize(Decimal("0.01"))
                    cgst += half
                    sgst += half
            else:
                half = (t_amt / Decimal("2.00")).quantize(Decimal("0.01"))
                cgst += half
                sgst += half

        tot_taxable += taxable
        tot_cgst += cgst
        tot_sgst += sgst
        tot_igst += igst
        tot_tax += v_tax
        tot_net += v_net

        purchases.append(
            PurchaseRegisterItem(
                voucher_id=v.id,
                voucher_number=v.voucher_number,
                voucher_date=v.voucher_date,
                voucher_type=v.voucher_type,
                supplier_name=v.party_name,
                reference_number=v.reference_number,
                reference_date=v.reference_date,
                taxable_amount=taxable,
                cgst_amount=cgst,
                sgst_amount=sgst,
                igst_amount=igst,
                total_tax=v_tax,
                net_amount=v_net,
            )
        )

    return PurchaseRegisterResponse(
        from_date=from_date,
        to_date=to_date,
        purchases=purchases,
        total_taxable=tot_taxable,
        total_cgst=tot_cgst,
        total_sgst=tot_sgst,
        total_igst=tot_igst,
        total_tax=tot_tax,
        total_net_amount=tot_net,
        purchase_count=len(purchases),
    )


# ==============================================================================
# 8. Bank Reconciliation Service
# ==============================================================================

async def get_bank_reconciliation(
    session: AsyncSession,
    bank_account_id: Optional[int] = None,
    as_of_date: Optional[date] = None,
) -> BankReconciliationResponse:
    effective_date = as_of_date or date.today()

    # 1. Resolve Bank Account
    if not bank_account_id:
        bank_stmt = (
            select(Account)
            .join(GroupInPrimary, Account.group_id == GroupInPrimary.id)
            .where(GroupInPrimary.code == "BANK")
            .limit(1)
        )
        bank_res = await session.execute(bank_stmt)
        bank_account = bank_res.scalar_one_or_none()
        if not bank_account:
            # Fallback to any account with 'bank' in name
            fallback_stmt = select(Account).where(Account.name.ilike("%bank%")).limit(1)
            f_res = await session.execute(fallback_stmt)
            bank_account = f_res.scalar_one_or_none()
    else:
        bank_account = await session.get(Account, bank_account_id)

    if not bank_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No operating bank account found for reconciliation",
        )

    # 2. Get Ledger Transactions on this Bank Account
    le_stmt = (
        select(LedgerEntry)
        .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
        .options(selectinload(LedgerEntry.voucher))
        .where(
            LedgerEntry.account_id == bank_account.id,
            LedgerEntry.entry_date <= effective_date,
            Voucher.is_void == False,
        )
        .order_by(LedgerEntry.entry_date.asc(), LedgerEntry.id.asc())
    )
    le_res = await session.execute(le_stmt)
    entries = le_res.scalars().all()

    init_bal = Decimal(str(bank_account.opening_balance or "0.00"))
    init_dr = init_bal if bank_account.opening_balance_type == "DR" else Decimal("0.00")
    init_cr = init_bal if bank_account.opening_balance_type == "CR" else Decimal("0.00")

    total_debit = init_dr
    total_credit = init_cr

    recon_txs: List[BankReconTransaction] = []
    unpresented = Decimal("0.00")
    uncredited = Decimal("0.00")

    for e in entries:
        dr = Decimal(str(e.debit_amount or "0.00"))
        cr = Decimal(str(e.credit_amount or "0.00"))
        total_debit += dr
        total_credit += cr

        recon_txs.append(
            BankReconTransaction(
                id=e.id,
                entry_date=e.entry_date,
                voucher_id=e.voucher.id,
                voucher_number=e.voucher.voucher_number,
                voucher_type=e.voucher.voucher_type,
                party_name=e.voucher.party_name,
                deposit_amount=dr,
                withdrawal_amount=cr,
                narration=e.narration or e.voucher.narration,
                is_cleared=True,
                clearance_date=e.entry_date,
            )
        )

    # Bank balance in books: Debits - Credits
    balance_as_per_books = total_debit - total_credit
    computed_bank_statement_balance = balance_as_per_books + unpresented - uncredited

    return BankReconciliationResponse(
        account_id=bank_account.id,
        account_name=bank_account.name,
        as_of_date=effective_date,
        balance_as_per_books=balance_as_per_books,
        unpresented_cheques=unpresented,
        uncredited_cheques=uncredited,
        computed_bank_statement_balance=computed_bank_statement_balance,
        transactions=recon_txs,
    )


# ==============================================================================
# 9. Special Report Service (Trip P&L Drilldown)
# ==============================================================================

async def get_special_report(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> SpecialReportResponse:
    # Query LRs with Consigner, Origin, Destination
    stmt = (
        select(LR)
        .options(
            selectinload(LR.consigner),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
        )
    )
    if from_date:
        stmt = stmt.where(LR.lr_date >= from_date)
    if to_date:
        stmt = stmt.where(LR.lr_date <= to_date)

    stmt = stmt.order_by(LR.id.desc())
    res = await session.execute(stmt)
    lrs = res.scalars().all()

    lr_ids = [l.id for l in lrs]
    # Query Hire Challans for these LRs
    hc_stmt = select(HireChallan).where(HireChallan.lr_id.in_(lr_ids))
    hc_res = await session.execute(hc_stmt)
    hcs = hc_res.scalars().all()
    lr_to_hc = {h.lr_id: h.id for h in hcs}
    hc_to_lr = {h.id: h.lr_id for h in hcs}
    hc_ids = [h.id for h in hcs]

    # Query vouchers linked to LR or Hire Challan
    lr_vouchers: Dict[int, List[Voucher]] = {}
    if lr_ids or hc_ids:
        conds = []
        if lr_ids:
            conds.append(Voucher.lr_id.in_(lr_ids))
        if hc_ids:
            conds.append(Voucher.hire_challan_id.in_(hc_ids))
        from sqlalchemy import or_
        v_stmt = select(Voucher).where(or_(*conds), Voucher.is_void == False)
        v_res = await session.execute(v_stmt)
        for v in v_res.scalars().all():
            matched_lr = v.lr_id or hc_to_lr.get(v.hire_challan_id)
            if matched_lr:
                lr_vouchers.setdefault(matched_lr, []).append(v)

    trips: List[SpecialReportTripItem] = []
    total_rev = Decimal("0.00")
    total_hire = Decimal("0.00")
    total_other = Decimal("0.00")
    total_margin = Decimal("0.00")

    for lr in lrs:
        vlist = lr_vouchers.get(lr.id, [])

        # Revenue from Transport Invoices
        ti_vouchers = [v for v in vlist if v.voucher_type == VoucherType.TRANSPORT_INVOICE.value]
        rev = sum(Decimal(str(v.total_amount or "0.00")) for v in ti_vouchers)
        if rev == 0 and lr.freight_amount:
            rev = Decimal(str(lr.freight_amount))

        # Vehicle hire costs from ATH / BTH / Hire Challans
        hire_vouchers = [v for v in vlist if v.voucher_type in [VoucherType.PAYMENT_ATH.value, VoucherType.PAYMENT_BTH.value]]
        hire_cost = sum(Decimal(str(v.net_amount or "0.00")) for v in hire_vouchers)
        if hire_cost == 0 and lr.advance_amount:
            hire_cost = Decimal(str(lr.advance_amount))

        # Other direct expenses
        other_cost = Decimal("0.00")

        gross_margin = rev - hire_cost - other_cost
        margin_pct = (gross_margin / rev * Decimal("100.00")).quantize(Decimal("0.01")) if rev > 0 else Decimal("0.00")

        total_rev += rev
        total_hire += hire_cost
        total_other += other_cost
        total_margin += gross_margin

        trips.append(
            SpecialReportTripItem(
                lr_id=lr.id,
                lr_number=lr.lr_number,
                booking_date=lr.lr_date,
                consigner_name=lr.consigner.name if lr.consigner else None,
                origin=lr.origin_location.city_name if lr.origin_location else None,
                destination=lr.destination_location.city_name if lr.destination_location else None,
                vehicle_number=lr.vehicle_number,
                vehicle_source=lr.vehicle_source,
                freight_revenue=rev,
                vehicle_hire_cost=hire_cost,
                other_direct_cost=other_cost,
                gross_margin=gross_margin,
                margin_percentage=margin_pct,
            )
        )

    avg_margin_pct = (total_margin / total_rev * Decimal("100.00")).quantize(Decimal("0.01")) if total_rev > 0 else Decimal("0.00")

    return SpecialReportResponse(
        from_date=from_date,
        to_date=to_date,
        trips=trips,
        total_revenue=total_rev,
        total_hire_cost=total_hire,
        total_other_cost=total_other,
        total_margin=total_margin,
        average_margin_percent=avg_margin_pct,
        trip_count=len(trips),
    )
