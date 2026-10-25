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
    GroupInPrimary,
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
    linked in the chart of accounts without requiring manual setup.
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

        if not account:
            # Find Sundry Debtors group
            grp_stmt = select(GroupInPrimary).where(
                or_(GroupInPrimary.code == "DEBTORS", GroupInPrimary.name.ilike("%Debtor%"))
            )
            grp_res = await session.execute(grp_stmt)
            grp = grp_res.scalar_one_or_none()
            group_id = grp.id if grp else 1

            account = Account(
                name=party_name,
                code=party_code or f"BC_{party_id:04d}",
                group_id=group_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type="DR",
                billing_client_id=party_id,
                is_active=True,
            )
            session.add(account)
            await session.flush()
        elif not account.billing_client_id:
            account.billing_client_id = party_id
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

        if not account:
            # Find Sundry Creditors group
            grp_stmt = select(GroupInPrimary).where(
                or_(GroupInPrimary.code == "CREDITORS", GroupInPrimary.name.ilike("%Creditor%"))
            )
            grp_res = await session.execute(grp_stmt)
            grp = grp_res.scalar_one_or_none()
            group_id = grp.id if grp else 1

            account = Account(
                name=party_name,
                code=party_code or f"VEND_{party_id:04d}",
                group_id=group_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type="CR",
                vendor_id=party_id,
                is_active=True,
            )
            session.add(account)
            await session.flush()
        elif not account.vendor_id:
            account.vendor_id = party_id
            await session.flush()

    elif party_type == "DRIVER":
        stmt = select(Account).where(
            or_(
                Account.driver_id == party_id,
                Account.code == f"DRV_{party_id}",
                Account.name == party_name,
            )
        )
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()

        if not account:
            grp_stmt = select(GroupInPrimary).where(
                or_(GroupInPrimary.code == "EXP_DIRECT", GroupInPrimary.name.ilike("%Direct%"))
            )
            grp_res = await session.execute(grp_stmt)
            grp = grp_res.scalar_one_or_none()
            group_id = grp.id if grp else 1

            account = Account(
                name=f"Driver - {party_name}",
                code=party_code or f"DRV_{party_id:04d}",
                group_id=group_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type="DR",
                driver_id=party_id,
                is_active=True,
            )
            session.add(account)
            await session.flush()
        elif not account.driver_id:
            account.driver_id = party_id
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
        s_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Driver.name.ilike(s_term),
                Driver.phone.ilike(s_term),
                Driver.license_number.ilike(s_term),
            )
        )

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
