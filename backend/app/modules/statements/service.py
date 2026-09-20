from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
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
    Consigner,
    Consignee,
    VehicleOwner,
)
from app.modules.statements.schemas import (
    GSTOutputItem,
    GSTOutputResponse,
    GSTInputItem,
    GSTInputResponse,
    OSDebtorItem,
    OSDebtorResponse,
    OSCreditorItem,
    OSCreditorResponse,
    TDSPayableItem,
    TDSPayableResponse,
    TDSReturnSectionSummary,
    TDSReturnResponse,
    OpeningBalanceAccount,
    OpeningBalanceResponse,
)


# ==============================================================================
# 1. GST Output Statement Service (GSTR-1 Outward Supplies)
# ==============================================================================

async def get_gst_output(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> GSTOutputResponse:
    outward_types = [
        VoucherType.TRANSPORT_INVOICE.value,
        VoucherType.GENERAL_INVOICE.value,
        VoucherType.CREDIT_NOTE.value,
        VoucherType.DEBIT_NOTE.value,
    ]
    stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.items).selectinload(VoucherItem.tax_category),
            selectinload(Voucher.lr).selectinload(LR.consigner),
            selectinload(Voucher.einvoice),
        )
        .where(
            Voucher.voucher_type.in_(outward_types),
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

    records: List[GSTOutputItem] = []
    b2b_count = 0
    b2b_taxable = Decimal("0.00")
    b2b_tax = Decimal("0.00")
    rcm_count = 0
    rcm_taxable = Decimal("0.00")
    rcm_tax = Decimal("0.00")

    tot_taxable = Decimal("0.00")
    tot_cgst = Decimal("0.00")
    tot_sgst = Decimal("0.00")
    tot_igst = Decimal("0.00")
    tot_tax = Decimal("0.00")
    tot_inv_val = Decimal("0.00")

    for v in vouchers:
        taxable = Decimal(str(v.total_amount or "0.00"))
        v_tax = Decimal(str(v.tax_amount or "0.00"))
        inv_val = Decimal(str(v.net_amount or "0.00"))

        cgst = Decimal("0.00")
        sgst = Decimal("0.00")
        igst = Decimal("0.00")
        cgst_r = Decimal("0.00")
        sgst_r = Decimal("0.00")
        igst_r = Decimal("0.00")
        is_rcm = False

        gstin = None
        pos = None
        if v.lr and v.lr.consigner:
            gstin = v.lr.consigner.gstin
            pos = v.lr.consigner.state

        for itm in v.items:
            t_amt = Decimal(str(itm.tax_amount or "0.00"))
            tc = itm.tax_category
            if tc:
                if tc.is_rcm:
                    is_rcm = True
                if tc.igst_rate and tc.igst_rate > 0 and (tc.cgst_rate == 0 or tc.cgst_rate is None):
                    igst += t_amt
                    igst_r = Decimal(str(tc.igst_rate))
                else:
                    half = (t_amt / Decimal("2.00")).quantize(Decimal("0.01"))
                    cgst += half
                    sgst += half
                    if tc.cgst_rate:
                        cgst_r = Decimal(str(tc.cgst_rate))
                    if tc.sgst_rate:
                        sgst_r = Decimal(str(tc.sgst_rate))

        if v_tax > 0 and (cgst + sgst + igst) == 0:
            cgst = (v_tax / Decimal("2.00")).quantize(Decimal("0.01"))
            sgst = (v_tax / Decimal("2.00")).quantize(Decimal("0.01"))
            cgst_r = Decimal("6.00")
            sgst_r = Decimal("6.00")

        inv_type = "RCM" if is_rcm else ("B2B" if gstin else "B2C")

        if is_rcm:
            rcm_count += 1
            rcm_taxable += taxable
            rcm_tax += v_tax
        elif inv_type == "B2B":
            b2b_count += 1
            b2b_taxable += taxable
            b2b_tax += v_tax

        tot_taxable += taxable
        tot_cgst += cgst
        tot_sgst += sgst
        tot_igst += igst
        tot_tax += v_tax
        tot_inv_val += inv_val

        records.append(
            GSTOutputItem(
                voucher_id=v.id,
                voucher_number=v.voucher_number,
                voucher_date=v.voucher_date,
                customer_name=v.party_name,
                customer_gstin=gstin,
                place_of_supply=pos,
                invoice_type=inv_type,
                is_rcm=is_rcm,
                taxable_value=taxable,
                cgst_rate=cgst_r,
                cgst_amount=cgst,
                sgst_rate=sgst_r,
                sgst_amount=sgst,
                igst_rate=igst_r,
                igst_amount=igst,
                total_tax=v_tax,
                total_invoice_value=inv_val,
                irn=v.einvoice.irn if v.einvoice else None,
            )
        )

    return GSTOutputResponse(
        from_date=from_date,
        to_date=to_date,
        records=records,
        b2b_count=b2b_count,
        b2b_taxable=b2b_taxable,
        b2b_tax=b2b_tax,
        rcm_count=rcm_count,
        rcm_taxable=rcm_taxable,
        rcm_tax=rcm_tax,
        total_taxable=tot_taxable,
        total_cgst=tot_cgst,
        total_sgst=tot_sgst,
        total_igst=tot_igst,
        total_tax=tot_tax,
        total_invoice_value=tot_inv_val,
    )


# ==============================================================================
# 2. GST Input Statement Service (GSTR-2B Inward Supplies / ITC)
# ==============================================================================

async def get_gst_input(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> GSTInputResponse:
    inward_types = [
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
            Voucher.voucher_type.in_(inward_types),
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

    records: List[GSTInputItem] = []
    tot_taxable = Decimal("0.00")
    tot_cgst = Decimal("0.00")
    tot_sgst = Decimal("0.00")
    tot_igst = Decimal("0.00")
    tot_tax = Decimal("0.00")
    tot_amount = Decimal("0.00")
    tot_itc = Decimal("0.00")

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

        tot_taxable += taxable
        tot_cgst += cgst
        tot_sgst += sgst
        tot_igst += igst
        tot_tax += v_tax
        tot_amount += v_net
        tot_itc += v_tax

        records.append(
            GSTInputItem(
                voucher_id=v.id,
                voucher_number=v.voucher_number,
                voucher_date=v.voucher_date,
                supplier_name=v.party_name,
                supplier_gstin=None,
                reference_number=v.reference_number,
                reference_date=v.reference_date,
                taxable_value=taxable,
                cgst_amount=cgst,
                sgst_amount=sgst,
                igst_amount=igst,
                total_tax=v_tax,
                total_amount=v_net,
                itc_eligible=True,
                itc_remarks="Eligible ITC (Transport Inward)",
            )
        )

    return GSTInputResponse(
        from_date=from_date,
        to_date=to_date,
        records=records,
        total_taxable=tot_taxable,
        total_cgst=tot_cgst,
        total_sgst=tot_sgst,
        total_igst=tot_igst,
        total_tax=tot_tax,
        total_amount=tot_amount,
        total_itc_eligible=tot_itc,
        record_count=len(records),
    )


# ==============================================================================
# 3. O/S Debtor Statement Service (Accounts Receivable Aging)
# ==============================================================================

async def get_os_debtor(
    session: AsyncSession,
    as_of_date: Optional[date] = None,
) -> OSDebtorResponse:
    effective_date = as_of_date or date.today()

    # Find debtor accounts (Group code 'DEBTORS' or accounts with consignee/consigner)
    stmt = (
        select(Account)
        .join(GroupInPrimary, Account.group_id == GroupInPrimary.id)
        .options(
            selectinload(Account.group),
        )
        .where(
            GroupInPrimary.code == "DEBTORS",
            Account.is_active == True,
        )
    )
    res = await session.execute(stmt)
    debtor_accounts = res.scalars().all()

    # If no specific accounts under DEBTORS, include any account with DR balance or consigners
    if not debtor_accounts:
        stmt2 = select(Account).where(Account.consigner_id.isnot(None), Account.is_active == True)
        res2 = await session.execute(stmt2)
        debtor_accounts = res2.scalars().all()

    # Query ledger balances and vouchers for each debtor account
    debtor_items: List[OSDebtorItem] = []
    tot_outstanding = Decimal("0.00")
    b0_30 = Decimal("0.00")
    b31_60 = Decimal("0.00")
    b61_90 = Decimal("0.00")
    b_over90 = Decimal("0.00")

    for acc in debtor_accounts:
        init_bal = Decimal(str(acc.opening_balance or "0.00"))
        init_dr = init_bal if acc.opening_balance_type == "DR" else Decimal("0.00")
        init_cr = init_bal if acc.opening_balance_type == "CR" else Decimal("0.00")

        # Sum ledger entries
        le_stmt = (
            select(
                func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
                func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
            )
            .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
            .where(
                LedgerEntry.account_id == acc.id,
                LedgerEntry.entry_date <= effective_date,
                Voucher.is_void == False,
            )
        )
        le_res = await session.execute(le_stmt)
        dr_sum, cr_sum = le_res.one()
        total_dr = init_dr + Decimal(str(dr_sum))
        total_cr = init_cr + Decimal(str(cr_sum))

        net_receivable = total_dr - total_cr
        if net_receivable <= Decimal("0.00"):
            continue  # No outstanding balance

        # Fetch latest debit vouchers to compute aging breakdown
        v_stmt = (
            select(Voucher)
            .join(LedgerEntry, LedgerEntry.voucher_id == Voucher.id)
            .where(
                LedgerEntry.account_id == acc.id,
                LedgerEntry.debit_amount > Decimal("0.00"),
                LedgerEntry.entry_date <= effective_date,
                Voucher.is_void == False,
            )
            .order_by(Voucher.voucher_date.desc())
        )
        v_res = await session.execute(v_stmt)
        vouchers = v_res.scalars().all()

        rem_balance = net_receivable
        acc_b0_30 = Decimal("0.00")
        acc_b31_60 = Decimal("0.00")
        acc_b61_90 = Decimal("0.00")
        acc_b_over90 = Decimal("0.00")
        latest_inv_date = vouchers[0].voucher_date if vouchers else None
        days_overdue = (effective_date - latest_inv_date).days if latest_inv_date else 0

        for v in vouchers:
            if rem_balance <= 0:
                break
            v_amt = min(Decimal(str(v.net_amount or v.total_amount or "0.00")), rem_balance)
            days = (effective_date - v.voucher_date).days

            if days <= 30:
                acc_b0_30 += v_amt
            elif days <= 60:
                acc_b31_60 += v_amt
            elif days <= 90:
                acc_b61_90 += v_amt
            else:
                acc_b_over90 += v_amt

            rem_balance -= v_amt

        # Any unallocated balance goes to over 90 days (e.g. from opening balance)
        if rem_balance > 0:
            acc_b_over90 += rem_balance

        tot_outstanding += net_receivable
        b0_30 += acc_b0_30
        b31_60 += acc_b31_60
        b61_90 += acc_b61_90
        b_over90 += acc_b_over90

        debtor_items.append(
            OSDebtorItem(
                account_id=acc.id,
                debtor_name=acc.name,
                debtor_code=acc.code,
                current_balance=net_receivable,
                bucket_0_30=acc_b0_30,
                bucket_31_60=acc_b31_60,
                bucket_61_90=acc_b61_90,
                bucket_over_90=acc_b_over90,
                latest_invoice_date=latest_inv_date,
                days_overdue=days_overdue,
            )
        )

    return OSDebtorResponse(
        as_of_date=effective_date,
        debtors=debtor_items,
        total_outstanding=tot_outstanding,
        total_bucket_0_30=b0_30,
        total_bucket_31_60=b31_60,
        total_bucket_61_90=b61_90,
        total_bucket_over_90=b_over90,
        debtor_count=len(debtor_items),
    )


# ==============================================================================
# 4. O/S Creditor Statement Service (Accounts Payable Aging)
# ==============================================================================

async def get_os_creditor(
    session: AsyncSession,
    as_of_date: Optional[date] = None,
) -> OSCreditorResponse:
    effective_date = as_of_date or date.today()

    stmt = (
        select(Account)
        .join(GroupInPrimary, Account.group_id == GroupInPrimary.id)
        .where(
            GroupInPrimary.code == "CREDITORS",
            Account.is_active == True,
        )
    )
    res = await session.execute(stmt)
    creditor_accounts = res.scalars().all()

    if not creditor_accounts:
        stmt2 = select(Account).where(Account.vehicle_owner_id.isnot(None), Account.is_active == True)
        res2 = await session.execute(stmt2)
        creditor_accounts = res2.scalars().all()

    creditor_items: List[OSCreditorItem] = []
    tot_outstanding = Decimal("0.00")
    b0_30 = Decimal("0.00")
    b31_60 = Decimal("0.00")
    b61_90 = Decimal("0.00")
    b_over90 = Decimal("0.00")

    for acc in creditor_accounts:
        init_bal = Decimal(str(acc.opening_balance or "0.00"))
        init_dr = init_bal if acc.opening_balance_type == "DR" else Decimal("0.00")
        init_cr = init_bal if acc.opening_balance_type == "CR" else Decimal("0.00")

        le_stmt = (
            select(
                func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
                func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
            )
            .join(Voucher, LedgerEntry.voucher_id == Voucher.id)
            .where(
                LedgerEntry.account_id == acc.id,
                LedgerEntry.entry_date <= effective_date,
                Voucher.is_void == False,
            )
        )
        le_res = await session.execute(le_stmt)
        dr_sum, cr_sum = le_res.one()
        total_dr = init_dr + Decimal(str(dr_sum))
        total_cr = init_cr + Decimal(str(cr_sum))

        net_payable = total_cr - total_dr
        if net_payable <= Decimal("0.00"):
            continue

        v_stmt = (
            select(Voucher)
            .join(LedgerEntry, LedgerEntry.voucher_id == Voucher.id)
            .where(
                LedgerEntry.account_id == acc.id,
                LedgerEntry.credit_amount > Decimal("0.00"),
                LedgerEntry.entry_date <= effective_date,
                Voucher.is_void == False,
            )
            .order_by(Voucher.voucher_date.desc())
        )
        v_res = await session.execute(v_stmt)
        vouchers = v_res.scalars().all()

        rem_balance = net_payable
        acc_b0_30 = Decimal("0.00")
        acc_b31_60 = Decimal("0.00")
        acc_b61_90 = Decimal("0.00")
        acc_b_over90 = Decimal("0.00")
        latest_bill_date = vouchers[0].voucher_date if vouchers else None
        days_overdue = (effective_date - latest_bill_date).days if latest_bill_date else 0

        for v in vouchers:
            if rem_balance <= 0:
                break
            v_amt = min(Decimal(str(v.net_amount or v.total_amount or "0.00")), rem_balance)
            days = (effective_date - v.voucher_date).days

            if days <= 30:
                acc_b0_30 += v_amt
            elif days <= 60:
                acc_b31_60 += v_amt
            elif days <= 90:
                acc_b61_90 += v_amt
            else:
                acc_b_over90 += v_amt

            rem_balance -= v_amt

        if rem_balance > 0:
            acc_b_over90 += rem_balance

        tot_outstanding += net_payable
        b0_30 += acc_b0_30
        b31_60 += acc_b31_60
        b61_90 += acc_b61_90
        b_over90 += acc_b_over90

        creditor_items.append(
            OSCreditorItem(
                account_id=acc.id,
                creditor_name=acc.name,
                creditor_code=acc.code,
                current_balance=net_payable,
                bucket_0_30=acc_b0_30,
                bucket_31_60=acc_b31_60,
                bucket_61_90=acc_b61_90,
                bucket_over_90=acc_b_over90,
                latest_bill_date=latest_bill_date,
                days_overdue=days_overdue,
            )
        )

    return OSCreditorResponse(
        as_of_date=effective_date,
        creditors=creditor_items,
        total_outstanding=tot_outstanding,
        total_bucket_0_30=b0_30,
        total_bucket_31_60=b31_60,
        total_bucket_61_90=b61_90,
        total_bucket_over_90=b_over90,
        creditor_count=len(creditor_items),
    )


# ==============================================================================
# 5. TDS Payable Report Service
# ==============================================================================

async def get_tds_payable(
    session: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> TDSPayableResponse:
    # Query vouchers for ATH/BTH payments or purchases where TDS applies
    tds_types = [
        VoucherType.PAYMENT_ATH.value,
        VoucherType.PAYMENT_BTH.value,
        VoucherType.NORMAL_PURCHASE.value,
        VoucherType.GENERAL_PURCHASE.value,
    ]
    stmt = (
        select(Voucher)
        .where(
            Voucher.voucher_type.in_(tds_types),
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

    records: List[TDSPayableItem] = []
    total_gross = Decimal("0.00")
    total_tds = Decimal("0.00")
    total_dep = Decimal("0.00")
    total_pend = Decimal("0.00")

    for v in vouchers:
        gross = Decimal(str(v.total_amount or v.net_amount or "0.00"))
        # In Indian Transport Accounts, TDS under section 194C is deducted on truck hire payments
        tds_rate = Decimal("1.00")  # 1% for individual truck operators
        tds_amt = (gross * tds_rate / Decimal("100.00")).quantize(Decimal("0.01"))

        if tds_amt > Decimal("0.00"):
            total_gross += gross
            total_tds += tds_amt
            total_pend += tds_amt

            records.append(
                TDSPayableItem(
                    voucher_id=v.id,
                    voucher_number=v.voucher_number,
                    voucher_date=v.voucher_date,
                    party_name=v.party_name,
                    pan=None,
                    section="194C",
                    gross_amount=gross,
                    tds_rate=tds_rate,
                    tds_amount=tds_amt,
                    is_deposited=False,
                )
            )

    return TDSPayableResponse(
        from_date=from_date,
        to_date=to_date,
        records=records,
        total_gross_amount=total_gross,
        total_tds_deducted=total_tds,
        total_tds_deposited=total_dep,
        total_tds_pending=total_pend,
        record_count=len(records),
    )


# ==============================================================================
# 6. TDS Return Report Service (Form 26Q Quarterly Summary)
# ==============================================================================

async def get_tds_return(
    session: AsyncSession,
    quarter: Optional[str] = "Q1",
    financial_year: Optional[str] = "2026-27",
) -> TDSReturnResponse:
    # Summarize quarterly 26Q sections
    tds_data = await get_tds_payable(session)

    c_records = [r for r in tds_data.records if r.section == "194C"]
    j_records = [r for r in tds_data.records if r.section == "194J"]

    sec_194c = TDSReturnSectionSummary(
        section="194C",
        description="Payment of Contractors / Sub-contractors / Transporters",
        deductee_count=len(c_records),
        total_amount_paid=sum(r.gross_amount for r in c_records),
        total_tds_deducted=sum(r.tds_amount for r in c_records),
        total_tds_deposited=sum(r.tds_amount for r in c_records if r.is_deposited),
    )

    sec_194j = TDSReturnSectionSummary(
        section="194J",
        description="Fees for Technical or Professional Services",
        deductee_count=len(j_records),
        total_amount_paid=sum(r.gross_amount for r in j_records),
        total_tds_deducted=sum(r.tds_amount for r in j_records),
        total_tds_deposited=sum(r.tds_amount for r in j_records if r.is_deposited),
    )

    sections = [sec_194c, sec_194j]
    tot_deductees = sum(s.deductee_count for s in sections)
    tot_paid = sum(s.total_amount_paid for s in sections)
    tot_ded = sum(s.total_tds_deducted for s in sections)
    tot_dep = sum(s.total_tds_deposited for s in sections)

    return TDSReturnResponse(
        financial_year=financial_year or "2026-27",
        quarter=quarter or "Q1",
        sections=sections,
        total_deductees=tot_deductees,
        total_amount_paid=tot_paid,
        total_tax_deducted=tot_ded,
        total_tax_deposited=tot_dep,
    )


# ==============================================================================
# 7. Opening Balance Details Service
# ==============================================================================

async def get_opening_balance_details(
    session: AsyncSession,
) -> OpeningBalanceResponse:
    stmt = (
        select(Account)
        .options(
            selectinload(Account.group).selectinload(GroupInPrimary.primary_group)
        )
        .where(Account.is_active == True)
        .order_by(Account.code.asc())
    )
    res = await session.execute(stmt)
    accounts = res.scalars().all()

    items: List[OpeningBalanceAccount] = []
    tot_dr = Decimal("0.00")
    tot_cr = Decimal("0.00")

    for acc in accounts:
        open_bal = Decimal(str(acc.opening_balance or "0.00"))
        if acc.opening_balance_type == "DR":
            tot_dr += open_bal
        else:
            tot_cr += open_bal

        items.append(
            OpeningBalanceAccount(
                account_id=acc.id,
                account_code=acc.code,
                account_name=acc.name,
                group_name=acc.group.name if acc.group else "Unassigned",
                primary_group_name=acc.group.primary_group.name if acc.group and acc.group.primary_group else "Unassigned",
                opening_balance=open_bal,
                opening_balance_type=acc.opening_balance_type,
            )
        )

    difference = abs(tot_dr - tot_cr)
    is_balanced = difference == Decimal("0.00")

    return OpeningBalanceResponse(
        accounts=items,
        total_debit=tot_dr,
        total_credit=tot_cr,
        difference=difference,
        is_balanced=is_balanced,
        account_count=len(items),
    )
