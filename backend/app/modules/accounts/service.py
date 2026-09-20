from datetime import datetime, date, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.tenant_db.models import (
    Voucher,
    VoucherItem,
    LedgerEntry,
    VoucherType,
    Account,
    ChargeHead,
    TaxCategory,
    LR,
    HireChallan,
    EInvoiceRecord,
)
from app.modules.accounts.schemas import (
    VoucherCreate,
    TransportInvoiceCreate,
    ATHPaymentCreate,
    BTHPaymentCreate,
    VoidVoucherRequest,
)

VOUCHER_PREFIXES = {
    VoucherType.TRANSPORT_INVOICE.value: "TI",
    VoucherType.GENERAL_INVOICE.value: "GI",
    VoucherType.PROFORMA_INVOICE.value: "PI",
    VoucherType.NORMAL_PURCHASE.value: "NP",
    VoucherType.GENERAL_PURCHASE.value: "GP",
    VoucherType.RECEIPT_VOUCHER.value: "RV",
    VoucherType.PAYMENT_VOUCHER.value: "PV",
    VoucherType.PAYMENT_ATH.value: "ATH",
    VoucherType.PAYMENT_BTH.value: "BTH",
    VoucherType.CREDIT_NOTE.value: "CN",
    VoucherType.DEBIT_NOTE.value: "DN",
    VoucherType.GENERAL_VOUCHER.value: "JV",
    VoucherType.CONTRA_VOUCHER.value: "CV",
}

async def generate_voucher_number(session: AsyncSession, voucher_type: str) -> str:
    prefix = VOUCHER_PREFIXES.get(voucher_type, "VCH")
    year = datetime.now().year
    stmt = select(func.count(Voucher.id)).where(
        Voucher.voucher_type == voucher_type,
        Voucher.voucher_number.like(f"{prefix}-{year}-%")
    )
    res = await session.execute(stmt)
    count = res.scalar() or 0
    return f"{prefix}-{year}-{(count + 1):04d}"

async def get_account_by_code(session: AsyncSession, code: str) -> Optional[Account]:
    stmt = select(Account).where(Account.code == code)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def get_fallback_account_id(session: AsyncSession, preferred_code: str, fallback_type: str) -> int:
    acc = await get_account_by_code(session, preferred_code)
    if acc:
        return acc.id
    # Fallback to any account in the database
    stmt = select(Account.id).limit(1)
    res = await session.execute(stmt)
    first_id = res.scalar_one_or_none()
    if not first_id:
        raise HTTPException(status_code=500, detail=f"No account found for {preferred_code}. Please initialize chart of accounts.")
    return first_id


# ------------------------------------------------------------------------------
# Core Voucher Queries
# ------------------------------------------------------------------------------
async def get_vouchers(
    session: AsyncSession,
    voucher_type: Optional[str] = None,
    lr_id: Optional[int] = None,
) -> List[Voucher]:
    stmt = select(Voucher).options(
        selectinload(Voucher.items).selectinload(VoucherItem.charge_head),
        selectinload(Voucher.items).selectinload(VoucherItem.tax_category),
        selectinload(Voucher.ledger_entries).selectinload(LedgerEntry.account),
        selectinload(Voucher.lr),
        selectinload(Voucher.hire_challan),
        selectinload(Voucher.einvoice),
    ).order_by(Voucher.id.desc())

    if voucher_type:
        stmt = stmt.where(Voucher.voucher_type == voucher_type)
    if lr_id:
        stmt = stmt.where(Voucher.lr_id == lr_id)

    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_voucher_by_id(session: AsyncSession, voucher_id: int) -> Voucher:
    stmt = select(Voucher).options(
        selectinload(Voucher.items).selectinload(VoucherItem.charge_head),
        selectinload(Voucher.items).selectinload(VoucherItem.tax_category),
        selectinload(Voucher.ledger_entries).selectinload(LedgerEntry.account),
        selectinload(Voucher.lr),
        selectinload(Voucher.hire_challan),
        selectinload(Voucher.einvoice),
    ).where(Voucher.id == voucher_id)
    res = await session.execute(stmt)
    voucher = res.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    return voucher


# ------------------------------------------------------------------------------
# Double-Entry Posting Engine
# ------------------------------------------------------------------------------
async def post_voucher(session: AsyncSession, data: VoucherCreate) -> Voucher:
    v_num = await generate_voucher_number(session, data.voucher_type)

    net_amt = data.net_amount
    tot_amt = data.total_amount
    tax_amt = data.tax_amount

    # Recalculate net if zero and totals provided
    if net_amt == Decimal("0.00") and tot_amt > Decimal("0.00"):
        net_amt = tot_amt + tax_amt

    voucher = Voucher(
        voucher_number=v_num,
        voucher_type=data.voucher_type,
        voucher_date=data.voucher_date,
        party_name=data.party_name,
        party_type=data.party_type,
        reference_number=data.reference_number,
        reference_date=data.reference_date,
        total_amount=tot_amt,
        tax_amount=tax_amt,
        net_amount=net_amt,
        narration=data.narration,
        account_id=data.account_id,
        lr_id=data.lr_id,
        hire_challan_id=data.hire_challan_id,
    )
    session.add(voucher)
    await session.flush()

    # Add line items
    for item in data.items:
        v_item = VoucherItem(
            voucher_id=voucher.id,
            charge_head_id=item.charge_head_id,
            description=item.description,
            quantity=item.quantity,
            rate=item.rate,
            tax_category_id=item.tax_category_id,
            tax_amount=item.tax_amount,
            total_amount=item.total_amount,
        )
        session.add(v_item)

    # Double-entry ledger entries posting
    debit_acc_id = data.account_id
    credit_acc_id = data.credit_account_id

    if data.voucher_type == VoucherType.TRANSPORT_INVOICE.value:
        # Transport Sales Invoice: Debit Debtor, Credit Freight Revenue, Credit GST Output
        debtor_id = debit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")
        rev_id = await get_fallback_account_id(session, "ACC_FREIGHT_REV", "REVENUE")
        gst_out_id = await get_fallback_account_id(session, "ACC_GST_OUT_IGST", "TAX")

        # 1. Debit Debtor (Net Amount)
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=debtor_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Freight Invoice {v_num} - {data.party_name or 'Client'}",
        ))
        # 2. Credit Freight Revenue (Total Base Amount)
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=rev_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=tot_amt,
            narration=f"Freight Revenue {v_num}",
        ))
        # 3. Credit GST Output (if tax > 0)
        if tax_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=gst_out_id,
                entry_date=data.voucher_date,
                debit_amount=Decimal("0.00"),
                credit_amount=tax_amt,
                narration=f"GST Output for {v_num}",
            ))

    elif data.voucher_type == VoucherType.GENERAL_INVOICE.value:
        debtor_id = debit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")
        rev_id = await get_fallback_account_id(session, "ACC_FREIGHT_REV", "REVENUE")
        gst_out_id = await get_fallback_account_id(session, "ACC_GST_OUT_IGST", "TAX")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=debtor_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"General Invoice {v_num} - {data.party_name}",
        ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=rev_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=tot_amt,
            narration=f"Sales Revenue {v_num}",
        ))
        if tax_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=gst_out_id,
                entry_date=data.voucher_date,
                debit_amount=Decimal("0.00"),
                credit_amount=tax_amt,
                narration=f"GST Output for {v_num}",
            ))

    elif data.voucher_type in [VoucherType.NORMAL_PURCHASE.value, VoucherType.GENERAL_PURCHASE.value]:
        # Purchase: Debit Expense, Debit GST Input, Credit Creditor
        exp_id = debit_acc_id or await get_fallback_account_id(session, "ACC_FUEL_EXP", "EXPENSE")
        creditor_id = credit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_CREDITORS", "CREDITORS")
        gst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_IGST", "TAX")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=exp_id,
            entry_date=data.voucher_date,
            debit_amount=tot_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Purchase expense {v_num} - {data.party_name}",
        ))
        if tax_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=gst_in_id,
                entry_date=data.voucher_date,
                debit_amount=tax_amt,
                credit_amount=Decimal("0.00"),
                narration=f"GST Input for {v_num}",
            ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=creditor_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Payable for {v_num} to {data.party_name}",
        ))

    elif data.voucher_type == VoucherType.RECEIPT_VOUCHER.value:
        # Receipt: Debit Bank/Cash, Credit Debtor
        bank_id = debit_acc_id or await get_fallback_account_id(session, "ACC_HDFC_BANK", "BANK")
        debtor_id = credit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=bank_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Received from {data.party_name} via {v_num}",
        ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=debtor_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Credit to {data.party_name} for receipt {v_num}",
        ))

    elif data.voucher_type in [VoucherType.PAYMENT_VOUCHER.value, VoucherType.PAYMENT_ATH.value, VoucherType.PAYMENT_BTH.value]:
        # Payment: Debit Creditor / Expense, Credit Bank/Cash
        creditor_id = debit_acc_id or await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")
        bank_id = credit_acc_id or await get_fallback_account_id(session, "ACC_HDFC_BANK", "BANK")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=creditor_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Payment {v_num} to {data.party_name}",
        ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=bank_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Bank disbursement {v_num} to {data.party_name}",
        ))

    elif data.voucher_type == VoucherType.CONTRA_VOUCHER.value:
        # Contra: Debit Dest Account, Credit Source Account
        dest_id = debit_acc_id or await get_fallback_account_id(session, "ACC_CASH", "CASH")
        src_id = credit_acc_id or await get_fallback_account_id(session, "ACC_HDFC_BANK", "BANK")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=dest_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Contra transfer in {v_num}",
        ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=src_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Contra transfer out {v_num}",
        ))

    elif data.voucher_type == VoucherType.CREDIT_NOTE.value:
        # Credit Note: Debit Sales Return / Revenue, Credit Debtor
        rev_id = debit_acc_id or await get_fallback_account_id(session, "ACC_FREIGHT_REV", "REVENUE")
        debtor_id = credit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")
        gst_out_id = await get_fallback_account_id(session, "ACC_GST_OUT_IGST", "TAX")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=rev_id,
            entry_date=data.voucher_date,
            debit_amount=tot_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Credit note adjustment {v_num}",
        ))
        if tax_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=gst_out_id,
                entry_date=data.voucher_date,
                debit_amount=tax_amt,
                credit_amount=Decimal("0.00"),
                narration=f"GST reversal for credit note {v_num}",
            ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=debtor_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Credit note issued to {data.party_name}",
        ))

    elif data.voucher_type == VoucherType.DEBIT_NOTE.value:
        # Debit Note: Debit Creditor, Credit Expense, Credit GST Input Reversal
        creditor_id = debit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_CREDITORS", "CREDITORS")
        exp_id = credit_acc_id or await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")
        gst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_IGST", "TAX")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=creditor_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Debit note to {data.party_name} via {v_num}",
        ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=exp_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=tot_amt,
            narration=f"Expense reduction for debit note {v_num}",
        ))
        if tax_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=gst_in_id,
                entry_date=data.voucher_date,
                debit_amount=Decimal("0.00"),
                credit_amount=tax_amt,
                narration=f"GST input reduction for {v_num}",
            ))

    else:
        # General Journal Voucher: Balanced debit & credit
        acc1_id = debit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")
        acc2_id = credit_acc_id or await get_fallback_account_id(session, "ACC_FREIGHT_REV", "REVENUE")
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=acc1_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Journal voucher {v_num} debit",
        ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=acc2_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Journal voucher {v_num} credit",
        ))

    await session.commit()
    return await get_voucher_by_id(session, voucher.id)


# ------------------------------------------------------------------------------
# Specialized Workflows
# ------------------------------------------------------------------------------
async def create_transport_invoice_from_lr(
    session: AsyncSession,
    data: TransportInvoiceCreate,
) -> Voucher:
    # 1. Fetch LR
    stmt = select(LR).options(
        selectinload(LR.consigner),
        selectinload(LR.consignee),
    ).where(LR.id == data.lr_id)
    res = await session.execute(stmt)
    lr = res.scalar_one_or_none()
    if not lr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"LR with id {data.lr_id} not found")

    # 2. Compute freight and tax
    freight_amount = lr.freight_amount or Decimal("0.00")
    tax_rate = Decimal("0.00")
    tax_cat = None

    if data.tax_category_id:
        t_stmt = select(TaxCategory).where(TaxCategory.id == data.tax_category_id)
        tax_cat = (await session.execute(t_stmt)).scalar_one_or_none()
        if tax_cat:
            tax_rate = tax_cat.igst_rate

    tax_amount = (freight_amount * tax_rate / Decimal("100.00")).quantize(Decimal("0.01"))
    net_amount = freight_amount + tax_amount

    # Line item for freight
    freight_item = {
        "charge_head_id": None,
        "description": f"Freight Charges for LR {lr.lr_number} ({lr.package_count} pkgs, {lr.chargeable_weight_mt} MT)",
        "quantity": lr.chargeable_weight_mt or Decimal("1.00"),
        "rate": lr.freight_rate or freight_amount,
        "tax_category_id": data.tax_category_id,
        "tax_amount": tax_amount,
        "total_amount": freight_amount,
    }
    all_items = [freight_item] + [item.model_dump() for item in data.additional_charges]

    party_name = lr.consigner.name if lr.consigner else (lr.consignee.name if lr.consignee else "Transport Client")

    voucher_create = VoucherCreate(
        voucher_type=VoucherType.TRANSPORT_INVOICE.value,
        voucher_date=data.voucher_date or date.today(),
        party_name=party_name,
        party_type="CONSIGNER",
        reference_number=lr.lr_number,
        reference_date=lr.lr_date,
        total_amount=freight_amount,
        tax_amount=tax_amount,
        net_amount=net_amount,
        narration=data.narration or f"Transport Invoice for Consignment LR {lr.lr_number}",
        account_id=data.party_account_id,
        lr_id=lr.id,
        items=all_items,
    )

    return await post_voucher(session, voucher_create)


async def create_ath_payment(session: AsyncSession, data: ATHPaymentCreate) -> Voucher:
    stmt = select(HireChallan).options(selectinload(HireChallan.owner)).where(HireChallan.id == data.hire_challan_id)
    res = await session.execute(stmt)
    hc = res.scalar_one_or_none()
    if not hc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Hire Challan {data.hire_challan_id} not found")

    bank_code = "ACC_CASH" if data.payment_mode.upper() == "CASH" else "ACC_HDFC_BANK"
    bank_id = data.bank_account_id or await get_fallback_account_id(session, bank_code, "BANK")
    hire_exp_id = await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")

    owner_name = hc.owner.name if getattr(hc, "owner", None) else (hc.driver_name or "Vehicle Owner")
    voucher_create = VoucherCreate(
        voucher_type=VoucherType.PAYMENT_ATH.value,
        voucher_date=data.voucher_date or date.today(),
        party_name=owner_name,
        party_type="VEHICLE_OWNER",
        reference_number=hc.challan_number,
        total_amount=data.amount,
        tax_amount=Decimal("0.00"),
        net_amount=data.amount,
        narration=data.narration or f"Advance To Hired (ATH) payment for Challan {hc.challan_number}",
        account_id=hire_exp_id,
        credit_account_id=bank_id,
        hire_challan_id=hc.id,
        lr_id=hc.lr_id,
        items=[],
    )
    voucher = await post_voucher(session, voucher_create)

    # Update hire challan advance paid
    hc.advance_amount = (hc.advance_amount or Decimal("0.00")) + data.amount
    hc.balance_amount = max(Decimal("0.00"), (hc.hire_rate or Decimal("0.00")) - hc.advance_amount)
    await session.commit()
    return voucher


async def create_bth_payment(session: AsyncSession, data: BTHPaymentCreate) -> Voucher:
    stmt = select(HireChallan).options(selectinload(HireChallan.owner)).where(HireChallan.id == data.hire_challan_id)
    res = await session.execute(stmt)
    hc = res.scalar_one_or_none()
    if not hc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Hire Challan {data.hire_challan_id} not found")

    bank_code = "ACC_CASH" if data.payment_mode.upper() == "CASH" else "ACC_HDFC_BANK"
    bank_id = data.bank_account_id or await get_fallback_account_id(session, bank_code, "BANK")
    hire_exp_id = await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")

    owner_name = hc.owner.name if getattr(hc, "owner", None) else (hc.driver_name or "Vehicle Owner")
    voucher_create = VoucherCreate(
        voucher_type=VoucherType.PAYMENT_BTH.value,
        voucher_date=data.voucher_date or date.today(),
        party_name=owner_name,
        party_type="VEHICLE_OWNER",
        reference_number=hc.challan_number,
        total_amount=data.amount,
        tax_amount=Decimal("0.00"),
        net_amount=data.amount,
        narration=data.narration or f"Balance To Hired (BTH) settlement for Challan {hc.challan_number}",
        account_id=hire_exp_id,
        credit_account_id=bank_id,
        hire_challan_id=hc.id,
        lr_id=hc.lr_id,
        items=[],
    )
    voucher = await post_voucher(session, voucher_create)

    # Settle hire challan
    hc.balance_amount = max(Decimal("0.00"), (hc.balance_amount or Decimal("0.00")) - data.amount)
    if hc.balance_amount == Decimal("0.00"):
        hc.status = "SETTLED"
    await session.commit()
    return voucher


# ------------------------------------------------------------------------------
# Void Voucher (Reversing Entry per Rules.md §7)
# ------------------------------------------------------------------------------
async def void_voucher(
    session: AsyncSession,
    voucher_id: int,
    data: VoidVoucherRequest,
    user_id: Optional[int] = None,
) -> Voucher:
    voucher = await get_voucher_by_id(session, voucher_id)
    if voucher.is_void:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Voucher is already voided")

    # Mark as void
    voucher.is_void = True
    voucher.void_reason = data.void_reason
    voucher.voided_at = datetime.now(timezone.utc)
    voucher.voided_by = user_id

    # Create exact reversing ledger entries for every active ledger entry
    for original in voucher.ledger_entries:
        if original.is_reversal:
            continue
        reversal = LedgerEntry(
            voucher_id=voucher.id,
            account_id=original.account_id,
            entry_date=date.today(),
            debit_amount=original.credit_amount,
            credit_amount=original.debit_amount,
            narration=f"VOID REVERSAL: {data.void_reason} | Orig: {original.narration}",
            is_reversal=True,
        )
        session.add(reversal)

    v_id = voucher.id
    await session.commit()
    session.expire_all()
    return await get_voucher_by_id(session, v_id)
