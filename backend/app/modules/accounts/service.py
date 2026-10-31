import logging
import re
from datetime import datetime, date, timezone, timedelta

logger = logging.getLogger(__name__)
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, update, delete
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
    Branch,
    BillingClient,
    Vendor,
    Driver,
    BillAllocation,
    GroupInPrimary,
    PrimaryGroup,
    CompanyBankAccount,
)
from app.modules.accounts import schemas
from app.modules.accounts.schemas import (
    CreditDebitNoteCreate,
    CreditDebitNoteItem,
    EligibleInvoiceItem,
    VoucherCreate,
    GeneralInvoiceCreate,
    PurchaseBillCreate,
    PurchasePaymentCreate,
    GeneralInvoiceItemCreate,
    TransportInvoiceCreate,
    ATHPaymentCreate,
    BTHPaymentCreate,
    VoidVoucherRequest,
    ReceiptAgainstInvoiceCreate,
    ReceiptAllocationItem,
    ReceiptVoucherCreate,
    OpenInvoiceItem,
    PaymentAllocationItem,
    PaymentVoucherCreate,
    OpenBillItem,
    ContraAccountItem,
    ContraVoucherCreate,
)
from app.modules.accounts.master_ledger_service import get_or_create_party_account
from app.modules.settings.series_service import allocate_or_validate_voucher_number

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

async def ensure_standard_accounts(session: AsyncSession) -> None:
    """
    Ensure core chart of accounts hierarchy exists for Tally double-entry bookkeeping.
    """
    # 1. Ensure basic groups exist
    groups = {
        "ASSET": ("Assets", "DEBIT"),
        "LIABILITY": ("Liabilities", "CREDIT"),
        "INCOME": ("Income / Revenue", "CREDIT"),
        "EXPENSE": ("Expenses", "DEBIT"),
    }
    pg_map: Dict[str, int] = {}
    for code, (name, nature) in groups.items():
        stmt = select(PrimaryGroup).where(PrimaryGroup.code == code)
        pg = (await session.execute(stmt)).scalar_one_or_none()
        if not pg:
            pg = PrimaryGroup(code=code, name=name, nature=nature)
            session.add(pg)
            await session.flush()
        pg_map[code] = pg.id

    sub_groups = {
        "REV_DIRECT": ("Direct Income", "INCOME"),
        "EXP_DIRECT": ("Direct Expenses", "EXPENSE"),
        "EXP_INDIRECT": ("Indirect Expenses", "EXPENSE"),
        "TAX": ("Duties & Taxes", "LIABILITY"),
        "BANK": ("Bank Accounts", "ASSET"),
        "BANK_OD": ("Bank OD A/c", "LIABILITY"),
        "BANK_OCC": ("Bank OCC A/c", "LIABILITY"),
        "CASH": ("Cash-in-hand", "ASSET"),
        "DEBTORS": ("Sundry Debtors", "ASSET"),
        "CREDITORS": ("Sundry Creditors", "LIABILITY"),
        "CA": ("Current Assets", "ASSET"),
        "FA": ("Fixed Assets", "ASSET"),
        "CL": ("Current Liabilities", "LIABILITY"),
    }
    grp_map: Dict[str, int] = {}
    for g_code, (g_name, p_code) in sub_groups.items():
        stmt = select(GroupInPrimary).where(GroupInPrimary.code == g_code)
        grp = (await session.execute(stmt)).scalar_one_or_none()
        if not grp:
            grp = GroupInPrimary(
                code=g_code,
                name=g_name,
                primary_group_id=pg_map.get(p_code, 1),
            )
            session.add(grp)
            await session.flush()
        grp_map[g_code] = grp.id

    # 2. Standard Accounts List
    accounts_seed = [
        ("ACC_FREIGHT_REV", "Freight Revenue Account", "REV_DIRECT", "CR"),
        ("ACC_GST_OUT_CGST", "GST Output CGST", "TAX", "CR"),
        ("ACC_GST_OUT_SGST", "GST Output SGST", "TAX", "CR"),
        ("ACC_GST_OUT_IGST", "GST Output IGST", "TAX", "CR"),
        ("ACC_GST_IN_CGST", "GST Input CGST", "TAX", "DR"),
        ("ACC_GST_IN_SGST", "GST Input SGST", "TAX", "DR"),
        ("ACC_GST_IN_IGST", "GST Input IGST", "TAX", "DR"),
        ("ACC_TDS_RECEIVABLE", "TDS Receivable Account (Sec 194C)", "CA", "DR"),
        ("ACC_DISCOUNT_ALLOWED", "Consignment Discount Allowed", "EXP_INDIRECT", "DR"),
        ("ACC_HDFC_BANK", "HDFC Bank Operating Account", "BANK", "DR"),
        ("ACC_CASH", "Cash-in-hand Account", "CASH", "DR"),
        ("ACC_SUNDRY_DEBTORS", "General Trade Debtors", "DEBTORS", "DR"),
        ("ACC_SUNDRY_CREDITORS", "General Trade Creditors", "CREDITORS", "CR"),
        ("ACC_TRUCK_HIRE_EXP", "Truck Hire Expense", "EXP_DIRECT", "DR"),
        ("ACC_FUEL_EXP", "Diesel & Fuel Expense", "EXP_DIRECT", "DR"),
        ("ACC_TOLL_EXP", "Toll Expense", "EXP_DIRECT", "DR"),
        ("ACC_GENERAL_SALES_REV", "General Sales & Service Revenue", "REV_DIRECT", "CR"),
        ("ACC_WAREHOUSE_REV", "Warehousing & Storage Income", "REV_DIRECT", "CR"),
        ("ACC_HANDLING_REV", "Loading & Handling Income", "REV_DIRECT", "CR"),
        ("ACC_TDS_194J_RECV", "TDS Receivable Account (Sec 194J)", "CA", "DR"),
        ("ACC_VEHICLE_MAINT_EXP", "Vehicle Maintenance & Repair Expense", "EXP_DIRECT", "DR"),
        ("ACC_TYRE_EXP", "Tyres & Tubes Expense", "EXP_DIRECT", "DR"),
        ("ACC_SPARES_EXP", "Vehicle Spare Parts Expense", "EXP_DIRECT", "DR"),
        ("ACC_OFFICE_EXP", "Office Supplies & Admin Expense", "EXP_INDIRECT", "DR"),
        ("ACC_EQUIPMENT_ASSET", "Office Equipment & Hardware", "FA", "DR"),
        ("ACC_TDS_PAYABLE_194C", "TDS Payable u/s 194C (Transporter/Contractor)", "TAX", "CR"),
        ("ACC_TDS_PAYABLE_194J", "TDS Payable u/s 194J (Professional/Technical)", "TAX", "CR"),
        ("ACC_TDS_PAYABLE_194Q", "TDS Payable u/s 194Q (Purchase of Goods)", "TAX", "CR"),
        ("ACC_DISCOUNT_RECEIVED", "Discount Received on Purchases", "REV_DIRECT", "CR"),
        ("ACC_GST_RCM_LIABILITY", "GST RCM Output Liability", "TAX", "CR"),
        ("ACC_CUSTOMER_ADVANCES", "Customer Advances & Unapplied Receipts", "CL", "CR"),
        ("ACC_CHEQUE_CLEARING", "Cheques in Hand / Clearing Account", "BANK", "DR"),
        ("ACC_SUPPLIER_ADVANCES", "Supplier Advances & Prepaid Expenses", "CA", "DR"),
        ("ACC_DRIVER_ADVANCES", "Driver Trip Advances", "CA", "DR"),
        ("ACC_HANDLING_EXP", "Loading, Unloading & Labour Expense", "EXP_DIRECT", "DR"),
        ("ACC_STATUTORY_DUES", "Statutory Dues Payable", "TAX", "CR"),
        ("ACC_PETTY_CASH", "Petty Cash Account", "CASH", "DR"),
        ("ACC_ICICI_BANK", "ICICI Bank Operating Account", "BANK", "DR"),
        ("ACC_SBI_BANK", "State Bank of India (SBI) Account", "BANK", "DR"),
        ("ACC_BANK_CHARGES_EXP", "Bank Charges & Commission Expense", "EXP_INDIRECT", "DR"),
    ]

    for acc_code, acc_name, grp_code, bal_type in accounts_seed:
        acc = await get_account_by_code(session, acc_code)
        if not acc:
            gid = grp_map.get(grp_code, 1)
            new_acc = Account(
                code=acc_code,
                name=acc_name,
                group_id=gid,
                opening_balance=Decimal("0.00"),
                opening_balance_type=bal_type,
                is_active=True,
            )
            session.add(new_acc)
            await session.flush()

async def get_fallback_account_id(session: AsyncSession, preferred_code: str, fallback_type: str) -> int:
    acc = await get_account_by_code(session, preferred_code)
    if acc:
        return acc.id
    # Lazily ensure standard chart of accounts exists
    await ensure_standard_accounts(session)
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
async def ensure_tally_schema(session: AsyncSession) -> None:
    """
    Idempotent schema healing for Transport Invoice and Tally Prime bookkeeping.
    Ensures missing columns on accounts_vouchers, transport_lrs, and accounts_bill_allocations
    are safely created without data loss.
    """
    from sqlalchemy import text
    try:
        await session.rollback()
    except Exception:
        pass

    ddl_statements = [
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS due_date DATE;",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS credit_period_days INTEGER DEFAULT 30;",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'UNPAID';",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS gst_treatment VARCHAR(50) DEFAULT 'FCM';",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100);",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS party_gstin VARCHAR(15);",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100);",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS note_category VARCHAR(50);",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS reason_code VARCHAR(50);",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS tax_breakup JSONB DEFAULT '{}'::jsonb;",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS against_voucher_id INTEGER;",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS attachment_url TEXT;",
        "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS itc_eligibility VARCHAR(50) DEFAULT 'ELIGIBLE';",
        "UPDATE accounts_vouchers SET itc_eligibility = 'ELIGIBLE' WHERE itc_eligibility IS NULL;",
        "ALTER TABLE transport_lrs ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT FALSE;",
        """
        CREATE TABLE IF NOT EXISTS accounts_bill_allocations (
            id SERIAL PRIMARY KEY,
            voucher_id INTEGER NOT NULL REFERENCES accounts_vouchers(id) ON DELETE CASCADE,
            invoice_id INTEGER NOT NULL REFERENCES accounts_vouchers(id) ON DELETE CASCADE,
            allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            tds_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            total_settled NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            adjustment_type VARCHAR(50) NOT NULL DEFAULT 'AGAINST_REF',
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_accounts_vouchers_payment_status ON accounts_vouchers (payment_status);",
        "CREATE INDEX IF NOT EXISTS ix_accounts_vouchers_due_date ON accounts_vouchers (due_date);",
        "CREATE INDEX IF NOT EXISTS ix_transport_lrs_is_billed ON transport_lrs (is_billed);",
        "CREATE INDEX IF NOT EXISTS ix_accounts_bill_allocations_voucher_id ON accounts_bill_allocations (voucher_id);",
        "CREATE INDEX IF NOT EXISTS ix_accounts_bill_allocations_invoice_id ON accounts_bill_allocations (invoice_id);",
        "UPDATE accounts_vouchers SET balance_amount = net_amount WHERE balance_amount IS NULL OR (balance_amount = 0.00 AND (paid_amount = 0.00 OR paid_amount IS NULL));",
        "UPDATE accounts_vouchers SET payment_status = 'UNPAID' WHERE payment_status IS NULL;",
        "UPDATE accounts_vouchers SET gst_treatment = 'FCM' WHERE gst_treatment IS NULL;",
        "ALTER TABLE accounts_voucher_items ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20);",
        "ALTER TABLE accounts_voucher_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00;",
    ]

    for stmt in ddl_statements:
        try:
            await session.execute(text(stmt))
            await session.commit()
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass


async def get_vouchers(
    session: AsyncSession,
    voucher_type: Optional[str] = None,
    lr_id: Optional[int] = None,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
) -> List[Voucher]:
    stmt = select(Voucher).options(
        selectinload(Voucher.items).selectinload(VoucherItem.charge_head),
        selectinload(Voucher.items).selectinload(VoucherItem.tax_category),
        selectinload(Voucher.ledger_entries).selectinload(LedgerEntry.account),
        selectinload(Voucher.bill_allocations),
        selectinload(Voucher.lr),
        selectinload(Voucher.hire_challan),
        selectinload(Voucher.einvoice),
        selectinload(Voucher.issuing_office),
        selectinload(Voucher.billing_client),
        selectinload(Voucher.vendor),
        selectinload(Voucher.driver),
    ).order_by(Voucher.id.desc())

    if voucher_type:
        v_upper = voucher_type.upper()
        if v_upper in ("ATH_PAYMENT", "PAYMENT_ATH", "ATH"):
            stmt = stmt.where(Voucher.voucher_type.in_(["ATH_PAYMENT", "PAYMENT_ATH"]))
        elif v_upper in ("BTH_PAYMENT", "PAYMENT_BTH", "BTH"):
            stmt = stmt.where(Voucher.voucher_type.in_(["BTH_PAYMENT", "PAYMENT_BTH"]))
        elif v_upper in ("PAYMENT_VOUCHER", "PAYMENT"):
            stmt = stmt.where(Voucher.voucher_type.in_(["PAYMENT_VOUCHER", "PAYMENT"]))
        elif v_upper in ("CREDIT_DEBIT_NOTE", "CREDIT_DEBIT_NOTES", "CD_NOTE"):
            stmt = stmt.where(Voucher.voucher_type.in_(["CREDIT_NOTE", "DEBIT_NOTE"]))
        else:
            stmt = stmt.where(Voucher.voucher_type == voucher_type)
    if lr_id:
        stmt = stmt.where(Voucher.lr_id == lr_id)
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(Voucher.issuing_office_id == office_id)

    try:
        res = await session.execute(stmt)
        return list(res.scalars().all())
    except Exception as e:
        err_msg = str(e).lower()
        if any(k in err_msg for k in ("does not exist", "due_date", "accounts_vouchers", "column", "programmingerror", "undefinedcolumn")):
            try:
                logger.warning(f"Schema mismatch detected in get_vouchers, auto-healing schema: {e}")
            except Exception:
                pass
            await ensure_tally_schema(session)
            res = await session.execute(stmt)
            return list(res.scalars().all())
        raise

async def get_voucher_by_id(session: AsyncSession, voucher_id: int) -> Voucher:
    stmt = select(Voucher).options(
        selectinload(Voucher.items).selectinload(VoucherItem.charge_head),
        selectinload(Voucher.items).selectinload(VoucherItem.tax_category),
        selectinload(Voucher.ledger_entries).selectinload(LedgerEntry.account),
        selectinload(Voucher.bill_allocations),
        selectinload(Voucher.lr),
        selectinload(Voucher.hire_challan),
        selectinload(Voucher.einvoice),
        selectinload(Voucher.issuing_office),
        selectinload(Voucher.billing_client),
        selectinload(Voucher.vendor),
        selectinload(Voucher.driver),
    ).where(Voucher.id == voucher_id).execution_options(populate_existing=True)

    try:
        res = await session.execute(stmt)
        voucher = res.scalar_one_or_none()
    except Exception as e:
        err_msg = str(e).lower()
        if any(k in err_msg for k in ("does not exist", "due_date", "accounts_vouchers", "column", "programmingerror", "undefinedcolumn")):
            try:
                logger.warning(f"Schema mismatch detected in get_voucher_by_id, auto-healing schema: {e}")
            except Exception:
                pass
            await ensure_tally_schema(session)
            res = await session.execute(stmt)
            voucher = res.scalar_one_or_none()
        else:
            raise

    if not voucher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    return voucher


# ------------------------------------------------------------------------------
# Double-Entry Posting Engine
# ------------------------------------------------------------------------------
async def post_voucher(session: AsyncSession, data: VoucherCreate, office_id: Optional[int] = None) -> Voucher:
    target_office_id = getattr(data, "issuing_office_id", None) or office_id
    if not target_office_id:
        br_res = await session.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()

    v_num = await allocate_or_validate_voucher_number(
        session,
        data.voucher_type,
        manual_number=data.voucher_number,
        issuing_office_id=target_office_id,
        series_id=getattr(data, "series_id", None),
    )

    net_amt = data.net_amount
    tot_amt = data.total_amount
    tax_amt = data.tax_amount

    # Recalculate net if zero and totals provided
    if net_amt == Decimal("0.00") and tot_amt > Decimal("0.00"):
        net_amt = tot_amt + tax_amt

    # Auto-resolve party account if party link is provided but account_id is not
    party_acc_id = data.account_id
    b_client_id = getattr(data, "billing_client_id", None)
    v_vendor_id = getattr(data, "vendor_id", None)
    d_driver_id = getattr(data, "driver_id", None)

    if not party_acc_id:
        from app.modules.accounts.master_ledger_service import get_or_create_party_account
        if b_client_id:
            c_acc = await get_or_create_party_account(session, "BILLING_CLIENT", b_client_id, data.party_name or "Billing Client")
            party_acc_id = c_acc.id
        elif v_vendor_id:
            vend_acc = await get_or_create_party_account(session, "VENDOR", v_vendor_id, data.party_name or "Vendor")
            party_acc_id = vend_acc.id
        elif d_driver_id:
            drv_acc = await get_or_create_party_account(session, "DRIVER", d_driver_id, data.party_name or "Driver")
            party_acc_id = drv_acc.id

    gst_treatment = getattr(data, "gst_treatment", "FCM") or "FCM"
    is_rcm = gst_treatment.upper() == "RCM"

    # Under RCM (Reverse Charge Mechanism), debtor is billed taxable amount only; tax is not added to receivable
    if data.voucher_type == VoucherType.TRANSPORT_INVOICE.value and is_rcm:
        net_amt = tot_amt
        tax_amt = Decimal("0.00")

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
        account_id=party_acc_id,
        lr_id=data.lr_id,
        hire_challan_id=data.hire_challan_id,
        issuing_office_id=target_office_id,
        billing_client_id=b_client_id,
        vendor_id=v_vendor_id,
        driver_id=d_driver_id,
        due_date=getattr(data, "due_date", None),
        credit_period_days=getattr(data, "credit_period_days", 30),
        paid_amount=getattr(data, "paid_amount", Decimal("0.00")),
        balance_amount=net_amt,
        payment_status="UNPAID",
        gst_treatment=gst_treatment,
        place_of_supply=getattr(data, "place_of_supply", None),
        party_gstin=getattr(data, "party_gstin", None),
        cost_center=getattr(data, "cost_center", None),
        tax_breakup=getattr(data, "tax_breakup", {}),
        against_voucher_id=getattr(data, "against_voucher_id", None),
    )
    session.add(voucher)
    await session.flush()

    # Add line items
    for item in data.items:
        v_item = VoucherItem(
            voucher_id=voucher.id,
            charge_head_id=item.charge_head_id if hasattr(item, "charge_head_id") else item.get("charge_head_id"),
            description=item.description if hasattr(item, "description") else item.get("description", "Item"),
            quantity=item.quantity if hasattr(item, "quantity") else item.get("quantity", Decimal("1.00")),
            rate=item.rate if hasattr(item, "rate") else item.get("rate", Decimal("0.00")),
            tax_category_id=item.tax_category_id if hasattr(item, "tax_category_id") else item.get("tax_category_id"),
            tax_amount=item.tax_amount if hasattr(item, "tax_amount") else item.get("tax_amount", Decimal("0.00")),
            total_amount=item.total_amount if hasattr(item, "total_amount") else item.get("total_amount", Decimal("0.00")),
        )
        session.add(v_item)

    # Double-entry ledger entries posting
    debit_acc_id = party_acc_id
    credit_acc_id = data.credit_account_id

    if data.voucher_type == VoucherType.TRANSPORT_INVOICE.value:
        # Transport Sales Invoice
        debtor_id = debit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")
        rev_id = await get_fallback_account_id(session, "ACC_FREIGHT_REV", "REVENUE")

        tax_breakup = getattr(data, "tax_breakup", {}) or {}
        cgst_amt = Decimal(str(tax_breakup.get("cgst_amount", 0)))
        sgst_amt = Decimal(str(tax_breakup.get("sgst_amount", 0)))
        igst_amt = Decimal(str(tax_breakup.get("igst_amount", 0)))

        # Fallback if tax_amount > 0 and no specific split passed
        if tax_amt > Decimal("0.00") and (cgst_amt == 0 and sgst_amt == 0 and igst_amt == 0):
            pos = str(getattr(data, "place_of_supply", "") or "").lower()
            if "maharashtra" in pos or pos in ("27", "mh"):
                cgst_amt = (tax_amt / Decimal("2.00")).quantize(Decimal("0.01"))
                sgst_amt = tax_amt - cgst_amt
            else:
                igst_amt = tax_amt

        if is_rcm:
            # Under Reverse Charge Mechanism (GTA RCM under Sec 9(3)):
            # Recipient pays GST to Govt. GTA does not charge output GST.
            # Entry: Debtor Dr. [Taxable Amount], Freight Income Cr. [Taxable Amount]
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=debtor_id,
                entry_date=data.voucher_date,
                debit_amount=tot_amt,
                credit_amount=Decimal("0.00"),
                narration=f"Freight Invoice (GTA RCM) {v_num} - {data.party_name or 'Client'}",
            ))
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=rev_id,
                entry_date=data.voucher_date,
                debit_amount=Decimal("0.00"),
                credit_amount=tot_amt,
                narration=f"Freight Revenue (RCM) {v_num}",
            ))
        else:
            # Forward Charge Mechanism (FCM)
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
            # 3. Credit Separate Output GST Accounts
            if cgst_amt > Decimal("0.00"):
                cgst_id = await get_fallback_account_id(session, "ACC_GST_OUT_CGST", "TAX")
                session.add(LedgerEntry(
                    voucher_id=voucher.id,
                    account_id=cgst_id,
                    entry_date=data.voucher_date,
                    debit_amount=Decimal("0.00"),
                    credit_amount=cgst_amt,
                    narration=f"CGST Output for {v_num}",
                ))
            if sgst_amt > Decimal("0.00"):
                sgst_id = await get_fallback_account_id(session, "ACC_GST_OUT_SGST", "TAX")
                session.add(LedgerEntry(
                    voucher_id=voucher.id,
                    account_id=sgst_id,
                    entry_date=data.voucher_date,
                    debit_amount=Decimal("0.00"),
                    credit_amount=sgst_amt,
                    narration=f"SGST Output for {v_num}",
                ))
            if igst_amt > Decimal("0.00"):
                igst_id = await get_fallback_account_id(session, "ACC_GST_OUT_IGST", "TAX")
                session.add(LedgerEntry(
                    voucher_id=voucher.id,
                    account_id=igst_id,
                    entry_date=data.voucher_date,
                    debit_amount=Decimal("0.00"),
                    credit_amount=igst_amt,
                    narration=f"IGST Output for {v_num}",
                ))

        # Mark linked LR as invoiced
        if voucher.lr_id:
            lr_stmt = select(LR).where(LR.id == voucher.lr_id)
            lr_res = await session.execute(lr_stmt)
            lr_obj = lr_res.scalar_one_or_none()
            if lr_obj:
                lr_obj.is_billed = True

    elif data.voucher_type == VoucherType.GENERAL_INVOICE.value:
        debtor_id = debit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")
        rev_id = credit_acc_id or await get_fallback_account_id(session, "ACC_GENERAL_SALES_REV", "REVENUE")
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
        # Receipt Voucher:
        # DEBIT: Bank or Cash A/c (Liquidity Asset increases)
        # CREDIT: Debtor / Customer A/c (Trade Receivable decreases)
        bank_id = data.credit_account_id or (await get_fallback_account_id(session, "ACC_CASH" if data.party_type == "CASH" else "ACC_HDFC_BANK", "BANK"))
        debtor_id = debit_acc_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")

        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=bank_id,
            entry_date=data.voucher_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Bank/Cash receipt from {data.party_name or 'Party'} via {v_num}",
        ))
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=debtor_id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Credit to {data.party_name or 'Debtor'} for receipt {v_num}",
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
# Specialized Transport Invoice Workflow
# ------------------------------------------------------------------------------
async def create_transport_invoice_from_lr(
    session: AsyncSession,
    data: TransportInvoiceCreate,
    office_id: Optional[int] = None,
) -> Voucher:
    # 1. Fetch LR with relationships
    stmt = select(LR).options(
        selectinload(LR.consigner),
        selectinload(LR.consignee),
        selectinload(LR.billing_customer),
        selectinload(LR.issuing_office),
    ).where(LR.id == data.lr_id)
    res = await session.execute(stmt)
    lr = res.scalar_one_or_none()
    if not lr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"LR with id {data.lr_id} not found")

    # Check if already billed in an active invoice
    if getattr(lr, "is_billed", False):
        existing_stmt = select(Voucher).where(
            Voucher.lr_id == lr.id,
            Voucher.voucher_type == VoucherType.TRANSPORT_INVOICE.value,
            Voucher.is_void == False,
        )
        existing_res = await session.execute(existing_stmt)
        existing_v = existing_res.scalar_one_or_none()
        if existing_v:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"LR {lr.lr_number} is already invoiced under Voucher {existing_v.voucher_number}"
            )

    # 2. Determine Billing Client & Billed Party
    b_client_id = data.billing_client_id or lr.billing_customer_id
    b_client = None
    if b_client_id:
        bc_stmt = select(BillingClient).where(BillingClient.id == b_client_id)
        b_client = (await session.execute(bc_stmt)).scalar_one_or_none()

    party_name = (
        (b_client.name or b_client.company_name) if b_client
        else (lr.consigner.name if lr.consigner else (lr.consignee.name if lr.consignee else "Transport Client"))
    )
    party_gstin = (
        b_client.gstin if b_client and b_client.gstin
        else (lr.consigner.gstin if lr.consigner and lr.consigner.gstin else None)
    )
    credit_days = data.credit_period_days or (b_client.credit_period_days if b_client and b_client.credit_period_days else 30)
    v_date = data.voucher_date or date.today()
    due_date = data.due_date or (v_date + timedelta(days=credit_days))

    # 3. Determine Supplier State & Place of Supply
    target_office = office_id or lr.issuing_office_id
    supplier_state = "Maharashtra"
    if target_office:
        br_stmt = select(Branch).where(Branch.id == target_office)
        branch = (await session.execute(br_stmt)).scalar_one_or_none()
        if branch and branch.state:
            supplier_state = branch.state

    recipient_state = (
        data.place_of_supply
        or (b_client.state if b_client and b_client.state else None)
        or (lr.consignee.state if lr.consignee and lr.consignee.state else None)
        or (lr.consigner.state if lr.consigner and lr.consigner.state else supplier_state)
    )

    # 4. Itemize Transport Charges
    basic_freight = data.basic_freight if data.basic_freight is not None else (lr.freight_amount or Decimal("0.00"))
    loading_amt = data.loading_charges if data.loading_charges is not None else (lr.loading_charges or Decimal("0.00"))
    unloading_amt = data.unloading_charges if data.unloading_charges is not None else (lr.unloading_charges or Decimal("0.00"))
    detention_amt = data.detention_charges if data.detention_charges is not None else Decimal("0.00")
    toll_amt = data.toll_charges if data.toll_charges is not None else Decimal("0.00")
    other_amt = data.other_charges if data.other_charges is not None else (lr.other_charges or Decimal("0.00"))
    discount_amt = data.discount_amount if data.discount_amount is not None else Decimal("0.00")

    add_items_total = sum(item.total_amount for item in data.additional_charges)
    taxable_freight = max(
        Decimal("0.00"),
        basic_freight + loading_amt + unloading_amt + detention_amt + toll_amt + other_amt - discount_amt + add_items_total
    )

    # 5. GST Treatment & Calculation
    tax_cat = None
    if data.tax_category_id:
        t_stmt = select(TaxCategory).where(TaxCategory.id == data.tax_category_id)
        tax_cat = (await session.execute(t_stmt)).scalar_one_or_none()

    total_rate = Decimal(str(tax_cat.igst_rate)) if tax_cat else Decimal("0.00")
    gst_treatment = data.gst_treatment or ("RCM" if (tax_cat and tax_cat.is_rcm) else "FCM")
    is_rcm = gst_treatment.upper() == "RCM"

    s_clean = "".join(c for c in supplier_state.lower() if c.isalpha())
    r_clean = "".join(c for c in recipient_state.lower() if c.isalpha())
    is_intra_state = bool(s_clean and r_clean and (s_clean == r_clean))

    if is_rcm or gst_treatment.upper() in ("EXEMPT", "NIL_RATED"):
        cgst_rate = Decimal("0.00")
        sgst_rate = Decimal("0.00")
        igst_rate = Decimal("0.00")
        cgst_amt = Decimal("0.00")
        sgst_amt = Decimal("0.00")
        igst_amt = Decimal("0.00")
        tax_amount = Decimal("0.00")
        net_amount = taxable_freight
    elif is_intra_state:
        # Intra-state: CGST + SGST (50% each)
        cgst_rate = (total_rate / Decimal("2.00")).quantize(Decimal("0.01"))
        sgst_rate = total_rate - cgst_rate
        igst_rate = Decimal("0.00")
        cgst_amt = (taxable_freight * cgst_rate / Decimal("100.00")).quantize(Decimal("0.01"))
        sgst_amt = (taxable_freight * sgst_rate / Decimal("100.00")).quantize(Decimal("0.01"))
        igst_amt = Decimal("0.00")
        tax_amount = cgst_amt + sgst_amt
        net_amount = taxable_freight + tax_amount
    else:
        # Inter-state: IGST
        cgst_rate = Decimal("0.00")
        sgst_rate = Decimal("0.00")
        igst_rate = total_rate
        cgst_amt = Decimal("0.00")
        sgst_amt = Decimal("0.00")
        igst_amt = (taxable_freight * igst_rate / Decimal("100.00")).quantize(Decimal("0.01"))
        tax_amount = igst_amt
        net_amount = taxable_freight + tax_amount

    # Build line items
    items = []
    items.append({
        "charge_head_id": None,
        "description": f"Freight Charges for LR {lr.lr_number} ({lr.package_count} pkgs, {lr.chargeable_weight_mt} MT)",
        "quantity": lr.chargeable_weight_mt or Decimal("1.00"),
        "rate": lr.freight_rate or basic_freight,
        "tax_category_id": data.tax_category_id,
        "tax_amount": tax_amount,
        "total_amount": basic_freight,
    })
    if loading_amt > Decimal("0.00"):
        items.append({
            "charge_head_id": None,
            "description": f"Hamali / Loading Charges for LR {lr.lr_number}",
            "quantity": Decimal("1.00"),
            "rate": loading_amt,
            "tax_category_id": data.tax_category_id,
            "tax_amount": Decimal("0.00"),
            "total_amount": loading_amt,
        })
    if unloading_amt > Decimal("0.00"):
        items.append({
            "charge_head_id": None,
            "description": f"Unloading Charges for LR {lr.lr_number}",
            "quantity": Decimal("1.00"),
            "rate": unloading_amt,
            "tax_category_id": data.tax_category_id,
            "tax_amount": Decimal("0.00"),
            "total_amount": unloading_amt,
        })
    if detention_amt > Decimal("0.00"):
        items.append({
            "charge_head_id": None,
            "description": f"Detention / Halting Charges for LR {lr.lr_number}",
            "quantity": Decimal("1.00"),
            "rate": detention_amt,
            "tax_category_id": data.tax_category_id,
            "tax_amount": Decimal("0.00"),
            "total_amount": detention_amt,
        })
    if toll_amt > Decimal("0.00"):
        items.append({
            "charge_head_id": None,
            "description": f"Toll Charges for LR {lr.lr_number}",
            "quantity": Decimal("1.00"),
            "rate": toll_amt,
            "tax_category_id": data.tax_category_id,
            "tax_amount": Decimal("0.00"),
            "total_amount": toll_amt,
        })
    for itm in data.additional_charges:
        items.append(itm.model_dump())

    tax_breakup = {
        "taxable_amount": float(taxable_freight),
        "cgst_rate": float(cgst_rate),
        "cgst_amount": float(cgst_amt),
        "sgst_rate": float(sgst_rate),
        "sgst_amount": float(sgst_amt),
        "igst_rate": float(igst_rate),
        "igst_amount": float(igst_amt),
        "total_tax": float(tax_amount),
        "is_rcm": is_rcm,
        "is_intra_state": is_intra_state,
        "supplier_state": supplier_state,
        "place_of_supply": recipient_state,
    }

    voucher_create = VoucherCreate(
        voucher_number=data.voucher_number or data.invoice_number,
        voucher_type=VoucherType.TRANSPORT_INVOICE.value,
        voucher_date=v_date,
        due_date=due_date,
        credit_period_days=credit_days,
        party_name=party_name,
        party_type="BILLING_CLIENT" if b_client_id else "CONSIGNER",
        reference_number=lr.lr_number,
        reference_date=lr.lr_date,
        total_amount=taxable_freight,
        tax_amount=tax_amount,
        net_amount=net_amount,
        narration=data.narration or f"Freight Billing for Consignment LR {lr.lr_number}",
        account_id=data.party_account_id,
        lr_id=lr.id,
        issuing_office_id=target_office,
        series_id=data.series_id,
        billing_client_id=b_client_id,
        gst_treatment=gst_treatment,
        place_of_supply=recipient_state,
        party_gstin=party_gstin,
        tax_breakup=tax_breakup,
        items=items,
    )

    return await post_voucher(session, voucher_create, office_id=target_office)


# ------------------------------------------------------------------------------
# Specialized General Sales & Service Invoice Workflow
# ------------------------------------------------------------------------------
async def create_general_invoice(
    session: AsyncSession,
    data: GeneralInvoiceCreate,
    office_id: Optional[int] = None,
) -> Voucher:
    """
    Creates and posts a comprehensive Tally Prime style General Sales / Services Invoice
    with itemized lines, SAC/HSN codes, configurable GST (FCM/RCM/Exempt/Nil), bill-wise credit terms,
    and balanced double-entry ledger postings:
      - Dr. Customer / Debtor A/c (Net Invoice Receivable)
      - Cr. General Sales / Service Income A/c (Taxable Amount)
      - Cr. Applicable Output GST A/c (CGST + SGST or IGST)
    """
    from app.modules.accounts.master_ledger_service import get_or_create_party_account

    target_office = office_id or getattr(data, "issuing_office_id", None)
    
    # 1. Determine issuing office & supplier state
    supplier_state = "Maharashtra"
    if target_office:
        br_stmt = select(Branch).where(Branch.id == target_office)
        br_res = await session.execute(br_stmt)
        branch = br_res.scalar_one_or_none()
        if branch and branch.state:
            supplier_state = branch.state

    # 2. Determine Customer / Billing Client details
    b_client = None
    b_client_id = data.billing_client_id
    if b_client_id:
        bc_stmt = select(BillingClient).where(BillingClient.id == b_client_id)
        bc_res = await session.execute(bc_stmt)
        b_client = bc_res.scalar_one_or_none()

    if b_client:
        party_name = b_client.name
        party_gstin = data.party_gstin or b_client.gstin
        recipient_state = data.place_of_supply or b_client.state or supplier_state
        credit_days = data.credit_period_days if data.credit_period_days is not None else (b_client.credit_period_days or 30)
        debtor_account = data.party_account_id or await get_or_create_party_account(
            session, "BILLING_CLIENT", b_client.id, b_client.name, b_client.code
        )
        debtor_acc_id = debtor_account.id if hasattr(debtor_account, "id") else debtor_account
    else:
        party_name = data.party_name or "Direct Customer"
        party_gstin = data.party_gstin
        recipient_state = data.place_of_supply or supplier_state
        credit_days = data.credit_period_days if data.credit_period_days is not None else 30
        debtor_acc_id = data.party_account_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")

    v_date = data.voucher_date or date.today()
    due_date = data.due_date or (v_date + timedelta(days=credit_days))

    # 3. Determine Tax Treatment and Place of Supply
    s_clean = "".join(c for c in supplier_state.lower() if c.isalpha())
    r_clean = "".join(c for c in recipient_state.lower() if c.isalpha())
    is_intra_state = bool(s_clean and r_clean and (s_clean == r_clean))

    gst_treatment = (data.gst_treatment or "FCM").upper()
    is_rcm = gst_treatment == "RCM"
    is_exempt = gst_treatment in ("EXEMPT", "NIL_RATED")

    # 4. Process Itemized Line Items & Calculate Taxes
    items_to_create = []
    tot_taxable = Decimal("0.00")
    tot_cgst = Decimal("0.00")
    tot_sgst = Decimal("0.00")
    tot_igst = Decimal("0.00")
    tot_tax = Decimal("0.00")

    raw_items = data.items or [
        GeneralInvoiceItemCreate(
            description="General Business Services / Charges",
            hsn_sac="9967",
            quantity=Decimal("1.00"),
            rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
        )
    ]

    for itm in raw_items:
        qty = itm.quantity if itm.quantity is not None else Decimal("1.00")
        rate = itm.rate if itm.rate is not None else Decimal("0.00")
        disc = itm.discount_amount if itm.discount_amount is not None else Decimal("0.00")
        line_taxable = max(Decimal("0.00"), (qty * rate) - disc)

        tax_cat = None
        if itm.tax_category_id:
            tc_stmt = select(TaxCategory).where(TaxCategory.id == itm.tax_category_id)
            tc_res = await session.execute(tc_stmt)
            tax_cat = tc_res.scalar_one_or_none()

        line_igst_rate = Decimal(str(tax_cat.igst_rate)) if tax_cat else Decimal("0.00")
        line_cgst_rate = line_igst_rate / Decimal("2.00")
        line_sgst_rate = line_cgst_rate

        line_tax = Decimal("0.00")
        if is_rcm or is_exempt or line_igst_rate == Decimal("0.00"):
            line_tax = Decimal("0.00")
        elif is_intra_state:
            l_cgst = (line_taxable * line_cgst_rate / Decimal("100.00")).quantize(Decimal("0.01"))
            l_sgst = (line_taxable * line_sgst_rate / Decimal("100.00")).quantize(Decimal("0.01"))
            tot_cgst += l_cgst
            tot_sgst += l_sgst
            line_tax = l_cgst + l_sgst
        else:
            l_igst = (line_taxable * line_igst_rate / Decimal("100.00")).quantize(Decimal("0.01"))
            tot_igst += l_igst
            line_tax = l_igst

        tot_taxable += line_taxable
        tot_tax += line_tax
        line_total = line_taxable + line_tax

        items_to_create.append({
            "charge_head_id": itm.charge_head_id,
            "description": itm.description,
            "hsn_sac": itm.hsn_sac or "9967",
            "quantity": qty,
            "rate": rate,
            "discount_amount": disc,
            "tax_category_id": itm.tax_category_id,
            "tax_amount": line_tax,
            "total_amount": line_total,
        })

    net_invoice_amount = tot_taxable + tot_tax

    # 5. Allocate / Validate Voucher Number
    v_num = await allocate_or_validate_voucher_number(
        session,
        VoucherType.GENERAL_INVOICE.value,
        series_id=data.series_id,
        issuing_office_id=target_office,
        manual_number=data.invoice_number or data.voucher_number,
    )

    # 6. Build Tax Breakup JSON
    tax_breakup = {
        "taxable_amount": float(tot_taxable),
        "cgst_amount": float(tot_cgst),
        "sgst_amount": float(tot_sgst),
        "igst_amount": float(tot_igst),
        "total_tax": float(tot_tax),
        "is_rcm": is_rcm,
        "is_intra_state": is_intra_state,
        "supplier_state": supplier_state,
        "place_of_supply": recipient_state,
        "gst_treatment": gst_treatment,
    }

    # 7. Create Voucher
    voucher = Voucher(
        voucher_number=v_num,
        voucher_type=VoucherType.GENERAL_INVOICE.value,
        voucher_date=v_date,
        due_date=due_date,
        credit_period_days=credit_days,
        party_name=party_name,
        party_type="BILLING_CLIENT" if b_client_id else "CUSTOMER",
        reference_number=data.reference_number,
        reference_date=data.reference_date,
        total_amount=tot_taxable,
        tax_amount=tot_tax,
        net_amount=net_invoice_amount,
        paid_amount=Decimal("0.00"),
        balance_amount=net_invoice_amount,
        payment_status="UNPAID",
        gst_treatment=gst_treatment,
        place_of_supply=recipient_state,
        party_gstin=party_gstin,
        cost_center=data.cost_center,
        tax_breakup=tax_breakup,
        narration=data.narration or f"General Sales & Service Invoice {v_num} for {party_name}",
        account_id=debtor_acc_id,
        issuing_office_id=target_office,
        billing_client_id=b_client_id,
    )
    session.add(voucher)
    await session.flush()

    # 8. Create Line Items
    for itm_dict in items_to_create:
        v_item = VoucherItem(
            voucher_id=voucher.id,
            charge_head_id=itm_dict["charge_head_id"],
            description=itm_dict["description"],
            hsn_sac=itm_dict["hsn_sac"],
            quantity=itm_dict["quantity"],
            rate=itm_dict["rate"],
            discount_amount=itm_dict["discount_amount"],
            tax_category_id=itm_dict["tax_category_id"],
            tax_amount=itm_dict["tax_amount"],
            total_amount=itm_dict["total_amount"],
        )
        session.add(v_item)

    # 9. Post Double-Entry Ledger Postings
    # Account 1: Debit Debtor A/c (Full Net Receivable)
    session.add(LedgerEntry(
        voucher_id=voucher.id,
        account_id=debtor_acc_id,
        entry_date=v_date,
        debit_amount=net_invoice_amount,
        credit_amount=Decimal("0.00"),
        narration=f"General Invoice {v_num} - {party_name}",
    ))

    # Account 2: Credit Sales / Service Revenue
    income_acc_id = data.income_account_id or await get_fallback_account_id(session, "ACC_GENERAL_SALES_REV", "REVENUE")
    session.add(LedgerEntry(
        voucher_id=voucher.id,
        account_id=income_acc_id,
        entry_date=v_date,
        debit_amount=Decimal("0.00"),
        credit_amount=tot_taxable,
        narration=f"General Sales / Service Revenue for {v_num}",
    ))

    # Account 3 & 4: Credit Output GST Ledgers (if FCM and tax > 0)
    if not is_rcm and not is_exempt and tot_tax > Decimal("0.00"):
        if is_intra_state:
            cgst_acc_id = await get_fallback_account_id(session, "ACC_GST_OUT_CGST", "TAX")
            sgst_acc_id = await get_fallback_account_id(session, "ACC_GST_OUT_SGST", "TAX")
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=cgst_acc_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=tot_cgst,
                narration=f"Output CGST for {v_num}",
            ))
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=sgst_acc_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=tot_sgst,
                narration=f"Output SGST for {v_num}",
            ))
        else:
            igst_acc_id = await get_fallback_account_id(session, "ACC_GST_OUT_IGST", "TAX")
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=igst_acc_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=tot_igst,
                narration=f"Output IGST for {v_num}",
            ))

    v_id = voucher.id
    await session.commit()
    return await get_voucher_by_id(session, v_id)


# ------------------------------------------------------------------------------
# Bill-Wise Receipt Against Transport / General Invoice
# ------------------------------------------------------------------------------
async def create_receipt_against_invoice(
    session: AsyncSession,
    data: ReceiptAgainstInvoiceCreate,
    office_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Voucher:
    """
    Records customer payment against a specific transport invoice,
    allocating the settlement, deducting Sec 194C TDS if applicable,
    and updating the invoice's paid and balance amount atomically.
    """
    invoice = await get_voucher_by_id(session, data.invoice_id)
    if invoice.is_void:
        raise HTTPException(status_code=400, detail="Cannot record payment against a voided invoice")

    bal = invoice.balance_amount if invoice.balance_amount is not None else invoice.net_amount
    if bal <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="This invoice is already fully paid")

    tds = data.tds_amount or Decimal("0.00")
    disc = data.discount_amount or Decimal("0.00")
    total_settled = data.amount + tds + disc

    if total_settled > bal:
        raise HTTPException(
            status_code=400,
            detail=f"Total settlement amount (₹{total_settled}) exceeds remaining invoice balance (₹{bal})"
        )

    target_office = office_id or invoice.issuing_office_id
    v_num = await allocate_or_validate_voucher_number(
        session,
        VoucherType.RECEIPT_VOUCHER.value,
        issuing_office_id=target_office,
    )

    # Determine bank / cash account
    if data.bank_account_id:
        bank_id = data.bank_account_id
    elif data.payment_mode.upper() == "CASH":
        bank_id = await get_fallback_account_id(session, "ACC_CASH", "BANK")
    else:
        bank_id = await get_fallback_account_id(session, "ACC_HDFC_BANK", "BANK")

    debtor_id = invoice.account_id or await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")

    receipt = Voucher(
        voucher_number=v_num,
        voucher_type=VoucherType.RECEIPT_VOUCHER.value,
        voucher_date=data.voucher_date or date.today(),
        party_name=invoice.party_name,
        party_type="BILLING_CLIENT",
        reference_number=data.reference_number or invoice.voucher_number,
        reference_date=invoice.voucher_date,
        total_amount=total_settled,
        tax_amount=Decimal("0.00"),
        net_amount=total_settled,
        narration=data.narration or f"Payment received against Invoice {invoice.voucher_number}",
        account_id=debtor_id,
        billing_client_id=invoice.billing_client_id,
        issuing_office_id=target_office,
        against_voucher_id=invoice.id,
    )
    session.add(receipt)
    await session.flush()

    # 1. Debit Bank/Cash (Net received)
    session.add(LedgerEntry(
        voucher_id=receipt.id,
        account_id=bank_id,
        entry_date=receipt.voucher_date,
        debit_amount=data.amount,
        credit_amount=Decimal("0.00"),
        narration=f"Payment received via {data.payment_mode} for Inv {invoice.voucher_number}",
    ))

    # 2. Debit TDS Receivable (Sec 194C or Sec 194J TDS deduction by client)
    if tds > Decimal("0.00"):
        sec = getattr(data, "tds_section", "194C") or "194C"
        if sec == "194J":
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_194J_RECV", "ASSET")
            tds_narr = f"TDS u/s 194J deducted by {invoice.party_name} for Inv {invoice.voucher_number}"
        else:
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_RECEIVABLE", "ASSET")
            tds_narr = f"TDS u/s 194C deducted by {invoice.party_name} for Inv {invoice.voucher_number}"

        session.add(LedgerEntry(
            voucher_id=receipt.id,
            account_id=tds_acc_id,
            entry_date=receipt.voucher_date,
            debit_amount=tds,
            credit_amount=Decimal("0.00"),
            narration=tds_narr,
        ))

    # 3. Debit Discount Allowed
    if disc > Decimal("0.00"):
        disc_acc_id = await get_fallback_account_id(session, "ACC_DISCOUNT_ALLOWED", "EXPENSE")
        session.add(LedgerEntry(
            voucher_id=receipt.id,
            account_id=disc_acc_id,
            entry_date=receipt.voucher_date,
            debit_amount=disc,
            credit_amount=Decimal("0.00"),
            narration=f"Discount/Deduction allowed for Inv {invoice.voucher_number}",
        ))

    # 4. Credit Debtor Account (Total settled amount)
    session.add(LedgerEntry(
        voucher_id=receipt.id,
        account_id=debtor_id,
        entry_date=receipt.voucher_date,
        debit_amount=Decimal("0.00"),
        credit_amount=total_settled,
        narration=f"Settlement credit for Inv {invoice.voucher_number}",
    ))

    # Record Bill Allocation
    allocation = BillAllocation(
        voucher_id=receipt.id,
        invoice_id=invoice.id,
        allocated_amount=data.amount,
        tds_amount=tds,
        discount_amount=disc,
        total_settled=total_settled,
        adjustment_type="AGAINST_REF",
        notes=f"Settlement against {invoice.voucher_number}",
    )
    session.add(allocation)
    if hasattr(invoice, 'bill_allocations') and invoice.bill_allocations is not None:
        invoice.bill_allocations.append(allocation)

    # Update Invoice Balance & Payment Status
    invoice.paid_amount = (invoice.paid_amount or Decimal("0.00")) + total_settled
    invoice.balance_amount = max(Decimal("0.00"), invoice.net_amount - invoice.paid_amount)
    if invoice.balance_amount == Decimal("0.00"):
        invoice.payment_status = "PAID"
    else:
        invoice.payment_status = "PARTIALLY_PAID"

    receipt_id = receipt.id
    await session.commit()
    return await get_voucher_by_id(session, receipt_id)


# ------------------------------------------------------------------------------
# Open Invoices for Client (FIFO Bill-wise Allocation)
# ------------------------------------------------------------------------------
async def get_open_invoices_for_client(session: AsyncSession, client_id: int) -> List[OpenInvoiceItem]:
    """
    Fetch all unpaid or partially paid transport and general sales invoices
    for a billing client, ordered by date ASC (FIFO).
    """
    stmt = (
        select(Voucher)
        .where(
            Voucher.billing_client_id == client_id,
            Voucher.is_void == False,
            Voucher.voucher_type.in_([VoucherType.TRANSPORT_INVOICE.value, VoucherType.GENERAL_INVOICE.value]),
            Voucher.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
        )
        .order_by(Voucher.voucher_date.asc(), Voucher.id.asc())
    )
    res = await session.execute(stmt)
    vouchers = res.scalars().all()

    today = date.today()
    items = []
    for v in vouchers:
        bal = v.balance_amount if v.balance_amount is not None else v.net_amount
        if bal <= Decimal("0.00"):
            continue
        days_overdue = 0
        if v.due_date and today > v.due_date:
            days_overdue = (today - v.due_date).days

        items.append(
            OpenInvoiceItem(
                id=v.id,
                voucher_number=v.voucher_number,
                voucher_date=v.voucher_date,
                voucher_type=v.voucher_type,
                total_amount=v.total_amount,
                tax_amount=v.tax_amount,
                net_amount=v.net_amount,
                paid_amount=v.paid_amount or Decimal("0.00"),
                balance_amount=bal,
                due_date=v.due_date,
                lr_number=v.lr.lr_number if v.lr else None,
                party_name=v.party_name,
                gst_treatment=v.gst_treatment,
                credit_period_days=v.credit_period_days,
                days_overdue=days_overdue,
            )
        )
    return items


# ------------------------------------------------------------------------------
# Comprehensive Tally-Style Receipt Voucher Posting
# ------------------------------------------------------------------------------
async def create_receipt_voucher(
    session: AsyncSession,
    data: ReceiptVoucherCreate,
    office_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Voucher:
    """
    Records customer payments according to Indian double-entry bookkeeping and Tally Prime:
    1. Multi-invoice bill-wise settlement (AGAINST_REF) with partial payments.
    2. Customer advances (ADVANCE) and lump-sum on account (ON_ACCOUNT).
    3. Customer TDS deductions (Sec 194C freight 1%/2%, Sec 194J 2%/10%).
    4. Cash discount / settlement deduction allowed.
    5. Overpayment handling (excess credited to Customer Advances).
    6. Balanced double-entry ledger entries.
    """
    await ensure_standard_accounts(session)

    # 1. Resolve Billing Client & Debtor Account
    client: Optional[BillingClient] = None
    party_name = (data.party_name or "").strip()
    party_gstin = None

    if data.billing_client_id:
        c_res = await session.execute(select(BillingClient).where(BillingClient.id == data.billing_client_id))
        client = c_res.scalar_one_or_none()
        if not client:
            raise HTTPException(status_code=404, detail=f"Billing Client #{data.billing_client_id} not found")
        party_name = client.name
        party_gstin = client.gstin
        debtor_acc = await get_or_create_party_account(
            session, "BILLING_CLIENT", client.id, client.name, client.code
        )
        debtor_id = debtor_acc.id
    elif data.party_account_id:
        debtor_id = data.party_account_id
        if not party_name:
            acc_obj = await get_account_by_id(session, debtor_id)
            party_name = acc_obj.name if acc_obj else "Customer"
    else:
        party_name = party_name or "Cash Customer"
        debtor_id = await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")

    # 2. Resolve Bank or Cash Ledger Account
    resolved_company_bank_id: Optional[int] = None
    if data.bank_account_id:
        cb_res = await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.id == data.bank_account_id))
        cb_obj = cb_res.scalar_one_or_none()
        if cb_obj:
            if not cb_obj.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected company bank account is deactivated and cannot be used for new transactions.")
            bank_id = cb_obj.account_id
            resolved_company_bank_id = cb_obj.id
        else:
            acc_res = await session.execute(select(Account).where(Account.id == data.bank_account_id))
            acc_obj = acc_res.scalar_one_or_none()
            if acc_obj and not acc_obj.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected ledger account is inactive.")
            bank_id = data.bank_account_id
            if acc_obj:
                cba_res = await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.account_id == acc_obj.id))
                cba_obj = cba_res.scalar_one_or_none()
                if cba_obj:
                    resolved_company_bank_id = cba_obj.id
    elif data.bank_account_code:
        bank_id = await get_fallback_account_id(session, data.bank_account_code, "BANK")
    elif (data.payment_mode or "").upper() == "CASH":
        bank_id = await get_fallback_account_id(session, "ACC_CASH", "CASH")
    else:
        default_ba = await get_default_bank_account_for_office(session, office_id) if office_id else None
        if default_ba:
            bank_id = default_ba.account_id
            resolved_company_bank_id = default_ba.id
        else:
            bank_id = await get_fallback_account_id(session, "ACC_HDFC_BANK", "BANK")

    # 3. Voucher numbering
    v_num = await allocate_or_validate_voucher_number(
        session,
        VoucherType.RECEIPT_VOUCHER.value,
        issuing_office_id=office_id,
        series_id=data.series_id,
    )

    net_cash = data.amount
    tds_total = data.tds_amount or Decimal("0.00")
    disc_total = data.discount_amount or Decimal("0.00")
    gross_receipt_val = net_cash + tds_total + disc_total

    # 4. Bill Allocation Processing (AGAINST_REF)
    allocated_bills: List[Dict[str, Any]] = []
    sum_alloc_net = Decimal("0.00")
    sum_alloc_total = Decimal("0.00")

    receipt_type = (data.receipt_type or "AGAINST_REF").upper()
    if receipt_type == "AGAINST_REF" and data.allocations:
        for item in data.allocations:
            a_net = item.allocated_amount or Decimal("0.00")
            a_tds = item.tds_amount or Decimal("0.00")
            a_disc = item.discount_amount or Decimal("0.00")
            a_tot = a_net + a_tds + a_disc
            if a_tot <= Decimal("0.00"):
                continue

            inv_res = await session.execute(select(Voucher).where(Voucher.id == item.invoice_id))
            inv = inv_res.scalar_one_or_none()
            if not inv:
                raise HTTPException(status_code=404, detail=f"Invoice #{item.invoice_id} not found")
            if inv.is_void:
                raise HTTPException(status_code=400, detail=f"Cannot allocate payment to voided invoice {inv.voucher_number}")

            bal = inv.balance_amount if inv.balance_amount is not None else inv.net_amount
            # 1 paisa tolerance for floating point rounding
            if a_tot > bal + Decimal("0.01"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Settlement ₹{a_tot} exceeds remaining balance ₹{bal} for invoice {inv.voucher_number}"
                )

            inv.paid_amount = (inv.paid_amount or Decimal("0.00")) + a_tot
            inv.balance_amount = max(Decimal("0.00"), inv.net_amount - inv.paid_amount)
            if inv.balance_amount == Decimal("0.00"):
                inv.payment_status = "PAID"
            else:
                inv.payment_status = "PARTIALLY_PAID"

            allocated_bills.append({
                "invoice": inv,
                "allocated_amount": a_net,
                "tds_amount": a_tds,
                "discount_amount": a_disc,
                "total_settled": a_tot,
            })
            sum_alloc_net += a_net
            sum_alloc_total += a_tot

        # Unapplied excess received over allocated bills
        unapplied_advance = max(Decimal("0.00"), net_cash - sum_alloc_net)
    elif receipt_type in ["ADVANCE", "ON_ACCOUNT"]:
        unapplied_advance = net_cash
    else:
        unapplied_advance = net_cash

    ref_num = data.reference_number or data.cheque_number
    ref_dt = data.cheque_date

    tax_breakup = {
        "receipt_type": receipt_type,
        "payment_mode": data.payment_mode,
        "reference_number": ref_num,
        "cheque_number": data.cheque_number,
        "cheque_date": str(data.cheque_date) if data.cheque_date else None,
        "cheque_bank": data.cheque_bank,
        "clearance_status": data.clearance_status or "CLEARED",
        "tds_section": data.tds_section or "194C",
        "tds_rate": float(data.tds_rate or 0),
        "tds_amount": float(tds_total),
        "discount_amount": float(disc_total),
        "unapplied_advance_amount": float(unapplied_advance),
        "settled_invoices_count": len(allocated_bills),
    }

    # Primary against voucher if single bill
    primary_against_id = allocated_bills[0]["invoice"].id if len(allocated_bills) == 1 else None

    # Status: PENDING if cheque not cleared yet, else PAID
    init_payment_status = "PENDING" if (data.payment_mode or "").upper() == "CHEQUE" and data.clearance_status == "PENDING" else "PAID"

    receipt = Voucher(
        voucher_number=v_num,
        voucher_type=VoucherType.RECEIPT_VOUCHER.value,
        voucher_date=data.voucher_date or date.today(),
        party_name=party_name,
        party_type="BILLING_CLIENT",
        reference_number=ref_num,
        reference_date=ref_dt,
        total_amount=gross_receipt_val,
        tax_amount=Decimal("0.00"),
        net_amount=net_cash,
        paid_amount=net_cash,
        balance_amount=Decimal("0.00"),
        payment_status=init_payment_status,
        narration=data.narration or f"Payment received from {party_name} via {data.payment_mode}",
        account_id=debtor_id,
        billing_client_id=data.billing_client_id,
        issuing_office_id=office_id,
        company_bank_account_id=resolved_company_bank_id,
        against_voucher_id=primary_against_id,
        tax_breakup=tax_breakup,
        attachment_url=data.attachment_url,
        cost_center=data.cost_center,
    )
    session.add(receipt)
    await session.flush()

    # 5. Record Bill Allocations
    for b in allocated_bills:
        inv = b["invoice"]
        ba = BillAllocation(
            voucher_id=receipt.id,
            invoice_id=inv.id,
            allocated_amount=b["allocated_amount"],
            tds_amount=b["tds_amount"],
            discount_amount=b["discount_amount"],
            total_settled=b["total_settled"],
            adjustment_type="AGAINST_REF",
            notes=f"Settlement against {inv.voucher_number}",
        )
        session.add(ba)

    # 6. Balanced Double-Entry Postings
    # 6a. DEBIT: Bank or Cash Account (Net actual money received)
    mode_desc = f"via {data.payment_mode}" + (f" (Ref/Cheque #{ref_num})" if ref_num else "")
    session.add(LedgerEntry(
        voucher_id=receipt.id,
        account_id=bank_id,
        entry_date=receipt.voucher_date,
        debit_amount=net_cash,
        credit_amount=Decimal("0.00"),
        narration=f"Payment received {mode_desc} from {party_name}",
    ))

    # 6b. DEBIT: TDS Receivable (Tax deducted at source by debtor under 194C / 194J)
    if tds_total > Decimal("0.00"):
        sec = (data.tds_section or "194C").upper()
        if "194J" in sec:
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_194J_RECV", "ASSET")
            tds_narr = f"TDS u/s 194J deducted by {party_name}"
        else:
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_RECEIVABLE", "ASSET")
            tds_narr = f"TDS u/s 194C deducted by {party_name}"

        session.add(LedgerEntry(
            voucher_id=receipt.id,
            account_id=tds_acc_id,
            entry_date=receipt.voucher_date,
            debit_amount=tds_total,
            credit_amount=Decimal("0.00"),
            narration=tds_narr,
        ))

    # 6c. DEBIT: Discount Allowed (Cash discount / agreed deduction)
    if disc_total > Decimal("0.00"):
        disc_acc_id = await get_fallback_account_id(session, "ACC_DISCOUNT_ALLOWED", "EXPENSE")
        session.add(LedgerEntry(
            voucher_id=receipt.id,
            account_id=disc_acc_id,
            entry_date=receipt.voucher_date,
            debit_amount=disc_total,
            credit_amount=Decimal("0.00"),
            narration=f"Discount/Deduction allowed to {party_name}",
        ))

    # 6d. CREDIT: Debtor / Customer Ledger & Customer Advances
    if receipt_type == "AGAINST_REF":
        if sum_alloc_total > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=receipt.id,
                account_id=debtor_id,
                entry_date=receipt.voucher_date,
                debit_amount=Decimal("0.00"),
                credit_amount=sum_alloc_total,
                narration=f"Payment received against {len(allocated_bills)} invoice(s) from {party_name}",
            ))
        if unapplied_advance > Decimal("0.00"):
            adv_acc_id = await get_fallback_account_id(session, "ACC_CUSTOMER_ADVANCES", "LIABILITY")
            session.add(LedgerEntry(
                voucher_id=receipt.id,
                account_id=adv_acc_id,
                entry_date=receipt.voucher_date,
                debit_amount=Decimal("0.00"),
                credit_amount=unapplied_advance,
                narration=f"Unapplied excess payment / advance from {party_name}",
            ))
    elif receipt_type == "ADVANCE":
        adv_acc_id = await get_fallback_account_id(session, "ACC_CUSTOMER_ADVANCES", "LIABILITY")
        session.add(LedgerEntry(
            voucher_id=receipt.id,
            account_id=adv_acc_id,
            entry_date=receipt.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=gross_receipt_val,
            narration=f"Customer advance received from {party_name}",
        ))
    elif receipt_type == "ON_ACCOUNT":
        session.add(LedgerEntry(
            voucher_id=receipt.id,
            account_id=debtor_id,
            entry_date=receipt.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=gross_receipt_val,
            narration=f"On-account receipt from {party_name}",
        ))

    receipt_id = receipt.id
    await session.commit()
    return await get_voucher_by_id(session, receipt_id)


# ------------------------------------------------------------------------------
# ATH and BTH Transporter Payments
# ------------------------------------------------------------------------------
async def create_ath_payment(session: AsyncSession, data: ATHPaymentCreate, office_id: Optional[int] = None) -> Voucher:
    stmt = select(HireChallan).options(selectinload(HireChallan.owner)).where(HireChallan.id == data.hire_challan_id)
    res = await session.execute(stmt)
    hc = res.scalar_one_or_none()
    if not hc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Hire Challan {data.hire_challan_id} not found")

    bank_code = "ACC_CASH" if data.payment_mode.upper() == "CASH" else "ACC_HDFC_BANK"
    bank_id = data.bank_account_id or await get_fallback_account_id(session, bank_code, "BANK")
    hire_exp_id = await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")

    owner_name = hc.owner.name if getattr(hc, "owner", None) else (hc.driver_name or "Vehicle Owner")
    target_office = office_id or hc.issuing_office_id
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
        driver_id=hc.driver_id,
        vendor_id=hc.owner_id,
        issuing_office_id=target_office,
        items=[],
    )
    voucher = await post_voucher(session, voucher_create, office_id=target_office)

    hc.advance_amount = (hc.advance_amount or Decimal("0.00")) + data.amount
    hc.balance_amount = max(Decimal("0.00"), (hc.hire_rate or Decimal("0.00")) - hc.advance_amount)
    await session.commit()
    return voucher


async def create_bth_payment(session: AsyncSession, data: BTHPaymentCreate, office_id: Optional[int] = None) -> Voucher:
    stmt = select(HireChallan).options(selectinload(HireChallan.owner)).where(HireChallan.id == data.hire_challan_id)
    res = await session.execute(stmt)
    hc = res.scalar_one_or_none()
    if not hc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Hire Challan {data.hire_challan_id} not found")

    bank_code = "ACC_CASH" if data.payment_mode.upper() == "CASH" else "ACC_HDFC_BANK"
    bank_id = data.bank_account_id or await get_fallback_account_id(session, bank_code, "BANK")
    hire_exp_id = await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")

    owner_name = hc.owner.name if getattr(hc, "owner", None) else (hc.driver_name or "Vehicle Owner")
    target_office = office_id or hc.issuing_office_id
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
        driver_id=hc.driver_id,
        vendor_id=hc.owner_id,
        issuing_office_id=target_office,
        items=[],
    )
    voucher = await post_voucher(session, voucher_create, office_id=target_office)

    hc.balance_amount = max(Decimal("0.00"), (hc.balance_amount or Decimal("0.00")) - data.amount)
    if hc.balance_amount == Decimal("0.00"):
        hc.status = "SETTLED"
    await session.commit()
    return voucher


# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Purchase Bills & Supplier Accounting
# ------------------------------------------------------------------------------
async def check_duplicate_purchase_bill(
    session: AsyncSession,
    bill_number: Optional[str],
    vendor_id: Optional[int],
    party_name: Optional[str],
    exclude_voucher_id: Optional[int] = None,
) -> None:
    if not bill_number or not bill_number.strip():
        return
    ref = bill_number.strip()
    stmt = select(Voucher).where(
        Voucher.reference_number == ref,
        Voucher.is_void == False,
        Voucher.voucher_type.in_([VoucherType.NORMAL_PURCHASE.value, VoucherType.GENERAL_PURCHASE.value]),
    )
    if vendor_id:
        stmt = stmt.where(Voucher.vendor_id == vendor_id)
    elif party_name:
        stmt = stmt.where(Voucher.party_name == party_name.strip())
    if exclude_voucher_id:
        stmt = stmt.where(Voucher.id != exclude_voucher_id)
    existing = (await session.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supplier invoice '{ref}' from vendor '{party_name or 'selected supplier'}' has already been recorded (Voucher #{existing.voucher_number}). Duplicate invoice entry prevented.",
        )


async def create_purchase_bill(
    session: AsyncSession,
    data: PurchaseBillCreate,
    office_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Voucher:
    """
    Records and posts a vendor purchase bill with itemized SAC/HSN lines,
    automatic intra/inter-state Input GST calculation, ITC eligibility check,
    RCM treatment, and balanced double-entry ledger postings.
    """
    from app.modules.accounts.master_ledger_service import get_or_create_party_account
    await ensure_standard_accounts(session)

    # 1. Check duplicate supplier invoice
    await check_duplicate_purchase_bill(
        session,
        bill_number=data.bill_number,
        vendor_id=data.vendor_id,
        party_name=data.party_name,
    )

    # 2. Resolve issuing office and branch state
    target_office = office_id
    branch_state = None
    if target_office:
        b_stmt = select(Branch).where(Branch.id == target_office)
        b_res = await session.execute(b_stmt)
        br = b_res.scalar_one_or_none()
        if br and br.state:
            branch_state = br.state.strip().upper()

    # 3. Resolve Vendor & Creditor Account
    vendor_obj = None
    v_state = None
    party_gstin = data.party_gstin
    party_name = data.party_name or "Direct Vendor"

    if data.vendor_id:
        v_stmt = select(Vendor).where(Vendor.id == data.vendor_id)
        v_res = await session.execute(v_stmt)
        vendor_obj = v_res.scalar_one_or_none()
        if vendor_obj:
            party_name = vendor_obj.name
            party_gstin = party_gstin or vendor_obj.gstin
            v_state = vendor_obj.state or vendor_obj.billing_state
            if not target_office and vendor_obj.issuing_office_id:
                target_office = vendor_obj.issuing_office_id
            vend_acc = await get_or_create_party_account(
                session, "VENDOR", vendor_obj.id, vendor_obj.name, vendor_obj.pan
            )
            creditor_id = vend_acc.id
        else:
            creditor_id = data.party_account_id or (await get_fallback_account_id(session, "ACC_SUNDRY_CREDITORS", "CREDITORS"))
    elif data.party_account_id:
        creditor_id = data.party_account_id
    else:
        creditor_id = await get_fallback_account_id(session, "ACC_SUNDRY_CREDITORS", "CREDITORS")

    supplier_state = (data.vendor_state or v_state or data.place_of_supply or "").strip().upper()
    place_of_supply = data.place_of_supply or supplier_state or branch_state or "DELHI"

    # 4. Resolve Expense / Purchase Debit Account
    category_acc_map = {
        "FUEL": "ACC_FUEL_EXP",
        "TYRES": "ACC_TYRE_EXP",
        "SPARES": "ACC_SPARES_EXP",
        "MAINTENANCE": "ACC_VEHICLE_MAINT_EXP",
        "TOLL": "ACC_TOLL_EXP",
        "TRUCK_HIRE": "ACC_TRUCK_HIRE_EXP",
        "OFFICE_ADMIN": "ACC_OFFICE_EXP",
        "EQUIPMENT": "ACC_EQUIPMENT_ASSET",
        "OTHER": "ACC_SPARES_EXP",
    }
    cat = (data.purchase_category or "SPARES").upper()
    pref_acc_code = category_acc_map.get(cat, "ACC_SPARES_EXP")
    fallback_grp = "ASSET" if cat == "EQUIPMENT" else "EXPENSE"
    exp_account_id = data.expense_account_id or (await get_fallback_account_id(session, pref_acc_code, fallback_grp))

    # 5. Voucher numbering
    v_type = data.purchase_type or ("GENERAL_PURCHASE" if cat in ["OFFICE_ADMIN", "EQUIPMENT"] else "NORMAL_PURCHASE")
    if data.voucher_number:
        v_num = data.voucher_number
    else:
        v_num = await allocate_or_validate_voucher_number(session, v_type, issuing_office_id=target_office)

    # 6. Calculate Line Items & Taxes
    is_rcm = (data.gst_treatment or "FCM").upper() == "RCM"
    is_exempt = (data.gst_treatment or "FCM").upper() in ["EXEMPT", "NIL_RATED"]
    itc_eligible = (data.itc_eligibility or "ELIGIBLE").upper() == "ELIGIBLE"

    tot_taxable = Decimal("0.00")
    tot_cgst = Decimal("0.00")
    tot_sgst = Decimal("0.00")
    tot_igst = Decimal("0.00")
    tot_tax = Decimal("0.00")
    items_to_create = []

    for itm in data.items:
        q = Decimal(str(itm.quantity or "1.00"))
        r = Decimal(str(itm.rate or "0.00"))
        disc = Decimal(str(itm.discount_amount or "0.00"))
        line_taxable = max(Decimal("0.00"), (q * r) - disc)
        line_tax = Decimal("0.00")

        if not is_exempt:
            if itm.tax_category_id:
                tc_stmt = select(TaxCategory).where(TaxCategory.id == itm.tax_category_id)
                tc_res = await session.execute(tc_stmt)
                tc = tc_res.scalar_one_or_none()
                if tc:
                    rate_pct = Decimal(str(tc.igst_rate or "0.00"))
                    if rate_pct == Decimal("0.00"):
                        rate_pct = Decimal(str(tc.cgst_rate or "0.00")) + Decimal(str(tc.sgst_rate or "0.00"))
                    line_tax = ((line_taxable * rate_pct) / Decimal("100.00")).quantize(Decimal("0.01"))
            elif itm.tax_amount and itm.tax_amount > Decimal("0.00"):
                line_tax = Decimal(str(itm.tax_amount)).quantize(Decimal("0.01"))

        tot_taxable += line_taxable
        tot_tax += line_tax
        items_to_create.append({
            "charge_head_id": itm.charge_head_id,
            "description": itm.description,
            "hsn_sac": itm.hsn_sac or "9967",
            "quantity": q,
            "rate": r,
            "discount_amount": disc,
            "tax_category_id": itm.tax_category_id,
            "tax_amount": line_tax,
            "total_amount": line_taxable + (Decimal("0.00") if is_rcm else line_tax),
        })

    # Tax split: Intra vs Inter state
    is_interstate = (branch_state and supplier_state and branch_state != supplier_state)
    if is_interstate:
        tot_igst = tot_tax
    else:
        half = (tot_tax / Decimal("2.00")).quantize(Decimal("0.01"))
        tot_cgst = half
        tot_sgst = tot_tax - half

    # Supplier Payable: Under RCM, supplier is paid taxable amount only
    supplier_payable = tot_taxable if is_rcm else (tot_taxable + tot_tax)
    net_amt = supplier_payable

    v_date = data.voucher_date or date.today()
    c_days = data.credit_period_days or 30
    d_date = data.due_date or (v_date + timedelta(days=c_days))

    # 7. Create Master Voucher
    voucher = Voucher(
        voucher_number=v_num,
        voucher_type=v_type,
        voucher_date=v_date,
        due_date=d_date,
        credit_period_days=c_days,
        party_name=party_name,
        party_type="VENDOR",
        party_gstin=party_gstin,
        reference_number=data.bill_number or None,
        reference_date=data.bill_date or v_date,
        total_amount=tot_taxable,
        tax_amount=tot_tax,
        net_amount=net_amt,
        paid_amount=Decimal("0.00"),
        balance_amount=net_amt,
        payment_status="UNPAID",
        gst_treatment=data.gst_treatment or "FCM",
        itc_eligibility=data.itc_eligibility or "ELIGIBLE",
        place_of_supply=place_of_supply,
        cost_center=data.vehicle_number or data.cost_center,
        narration=data.narration or f"Purchase Bill {data.bill_number or v_num} from {party_name} for {cat}",
        account_id=creditor_id,
        vendor_id=data.vendor_id,
        hire_challan_id=data.hire_challan_id,
        issuing_office_id=target_office,
        attachment_url=data.attachment_url,
        tax_breakup={
            "taxable_amount": float(tot_taxable),
            "cgst_amount": float(tot_cgst),
            "sgst_amount": float(tot_sgst),
            "igst_amount": float(tot_igst),
            "total_tax": float(tot_tax),
            "is_interstate": is_interstate,
            "itc_eligibility": data.itc_eligibility or "ELIGIBLE",
            "purchase_category": cat,
            "vehicle_number": data.vehicle_number,
        },
    )
    session.add(voucher)
    await session.flush()

    # 8. Create Voucher Items
    for itm_data in items_to_create:
        session.add(VoucherItem(
            voucher_id=voucher.id,
            charge_head_id=itm_data["charge_head_id"],
            description=itm_data["description"],
            hsn_sac=itm_data["hsn_sac"],
            quantity=itm_data["quantity"],
            rate=itm_data["rate"],
            discount_amount=itm_data["discount_amount"],
            tax_category_id=itm_data["tax_category_id"],
            tax_amount=itm_data["tax_amount"],
            total_amount=itm_data["total_amount"],
        ))

    # 9. Double-Entry Postings
    # A. DEBIT: Expense / Asset
    # If ITC is ineligible/blocked, GST is added to the expense/asset
    exp_debit_amount = tot_taxable if itc_eligible else (tot_taxable + tot_tax)
    session.add(LedgerEntry(
        voucher_id=voucher.id,
        account_id=exp_account_id,
        entry_date=v_date,
        debit_amount=exp_debit_amount,
        credit_amount=Decimal("0.00"),
        narration=f"Purchase: {cat} - Bill {data.bill_number or v_num} from {party_name}",
    ))

    # B. DEBIT: Input GST (Only if ITC is eligible and tax > 0)
    if itc_eligible and tot_tax > Decimal("0.00"):
        if is_interstate:
            igst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_IGST", "TAX")
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=igst_in_id,
                entry_date=v_date,
                debit_amount=tot_igst,
                credit_amount=Decimal("0.00"),
                narration=f"Input IGST on Purchase Bill {data.bill_number or v_num}",
            ))
        else:
            cgst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_CGST", "TAX")
            sgst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_SGST", "TAX")
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=cgst_in_id,
                entry_date=v_date,
                debit_amount=tot_cgst,
                credit_amount=Decimal("0.00"),
                narration=f"Input CGST on Purchase Bill {data.bill_number or v_num}",
            ))
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=sgst_in_id,
                entry_date=v_date,
                debit_amount=tot_sgst,
                credit_amount=Decimal("0.00"),
                narration=f"Input SGST on Purchase Bill {data.bill_number or v_num}",
            ))

    # C. CREDIT: Reverse Charge Mechanism Liability (if RCM)
    if is_rcm and tot_tax > Decimal("0.00"):
        rcm_liab_id = await get_fallback_account_id(session, "ACC_GST_RCM_LIABILITY", "TAX")
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=rcm_liab_id,
            entry_date=v_date,
            debit_amount=Decimal("0.00"),
            credit_amount=tot_tax,
            narration=f"GST RCM Liability on Purchase Bill {data.bill_number or v_num}",
        ))

    # D. CREDIT: Supplier / Creditor Account (Total Payable)
    session.add(LedgerEntry(
        voucher_id=voucher.id,
        account_id=creditor_id,
        entry_date=v_date,
        debit_amount=Decimal("0.00"),
        credit_amount=supplier_payable,
        narration=f"Payable for Bill {data.bill_number or v_num} to {party_name}",
    ))

    await session.commit()
    return await get_voucher_by_id(session, voucher.id)


async def create_payment_against_purchase(
    session: AsyncSession,
    purchase_id: int,
    data: PurchasePaymentCreate,
    office_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Voucher:
    """
    Records supplier payment against an existing purchase bill with bill-wise settlement,
    Section 194C / 194J / 194Q TDS deduction, and cash discount received.
    """
    await ensure_standard_accounts(session)
    purchase = await get_voucher_by_id(session, purchase_id)
    if purchase.is_void:
        raise HTTPException(status_code=400, detail="Cannot record payment against a voided purchase bill")

    bal = purchase.balance_amount if purchase.balance_amount is not None else purchase.net_amount
    if bal <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="This purchase bill is already fully paid")

    tds = Decimal(str(data.tds_amount or "0.00"))
    disc = Decimal(str(data.discount_amount or "0.00"))
    pmt_amt = Decimal(str(data.amount or "0.00"))
    total_settled = pmt_amt + tds + disc

    if total_settled > bal:
        raise HTTPException(
            status_code=400,
            detail=f"Total settlement amount (₹{total_settled}) exceeds remaining bill balance (₹{bal})"
        )

    target_office = office_id or purchase.issuing_office_id
    v_num = await allocate_or_validate_voucher_number(
        session,
        VoucherType.PAYMENT_VOUCHER.value,
        issuing_office_id=target_office,
    )

    # Determine bank / cash account
    if data.bank_account_id:
        bank_id = data.bank_account_id
    elif data.payment_mode.upper() == "CASH":
        bank_id = await get_fallback_account_id(session, "ACC_CASH", "BANK")
    else:
        bank_id = await get_fallback_account_id(session, data.bank_account_code or "ACC_HDFC_BANK", "BANK")

    creditor_id = purchase.account_id or await get_fallback_account_id(session, "ACC_SUNDRY_CREDITORS", "CREDITORS")

    pmt = Voucher(
        voucher_number=v_num,
        voucher_type=VoucherType.PAYMENT_VOUCHER.value,
        voucher_date=data.payment_date or date.today(),
        party_name=purchase.party_name,
        party_type="VENDOR",
        reference_number=data.reference_number or purchase.reference_number or purchase.voucher_number,
        reference_date=purchase.voucher_date,
        total_amount=total_settled,
        tax_amount=Decimal("0.00"),
        net_amount=total_settled,
        narration=data.narration or f"Payment made against Purchase Bill {purchase.reference_number or purchase.voucher_number}",
        account_id=creditor_id,
        vendor_id=purchase.vendor_id,
        hire_challan_id=purchase.hire_challan_id,
        issuing_office_id=target_office,
        against_voucher_id=purchase.id,
    )
    session.add(pmt)
    await session.flush()

    # 1. DEBIT: Creditor Account (Total Settled decreases liability)
    session.add(LedgerEntry(
        voucher_id=pmt.id,
        account_id=creditor_id,
        entry_date=pmt.voucher_date,
        debit_amount=total_settled,
        credit_amount=Decimal("0.00"),
        narration=f"Settlement of Purchase Bill {purchase.reference_number or purchase.voucher_number}",
    ))

    # 2. CREDIT: Bank/Cash (Net paid out)
    session.add(LedgerEntry(
        voucher_id=pmt.id,
        account_id=bank_id,
        entry_date=pmt.voucher_date,
        debit_amount=Decimal("0.00"),
        credit_amount=pmt_amt,
        narration=f"Disbursement via {data.payment_mode} for Bill {purchase.reference_number or purchase.voucher_number}",
    ))

    # 3. CREDIT: TDS Payable (if TDS deducted u/s 194C, 194J, or 194Q)
    if tds > Decimal("0.00"):
        sec = (data.tds_section or "194C").upper()
        if sec == "194J":
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_PAYABLE_194J", "TAX")
            tds_narr = f"TDS u/s 194J deducted on Bill {purchase.reference_number or purchase.voucher_number}"
        elif sec == "194Q":
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_PAYABLE_194Q", "TAX")
            tds_narr = f"TDS u/s 194Q deducted on Bill {purchase.reference_number or purchase.voucher_number}"
        else:
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_PAYABLE_194C", "TAX")
            tds_narr = f"TDS u/s 194C deducted on Bill {purchase.reference_number or purchase.voucher_number}"

        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=tds_acc_id,
            entry_date=pmt.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=tds,
            narration=tds_narr,
        ))

    # 4. CREDIT: Discount Received on Purchases
    if disc > Decimal("0.00"):
        disc_acc_id = await get_fallback_account_id(session, "ACC_DISCOUNT_RECEIVED", "INCOME")
        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=disc_acc_id,
            entry_date=pmt.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=disc,
            narration=f"Discount received on Bill {purchase.reference_number or purchase.voucher_number}",
        ))

    # 5. Atomically update Purchase Bill
    purchase.paid_amount = (purchase.paid_amount or Decimal("0.00")) + total_settled
    purchase.balance_amount = max(Decimal("0.00"), purchase.net_amount - purchase.paid_amount)
    purchase.payment_status = "PAID" if purchase.balance_amount <= Decimal("0.00") else "PARTIALLY_PAID"

    # 6. Record Bill Allocation
    session.add(BillAllocation(
        voucher_id=pmt.id,
        invoice_id=purchase.id,
        allocated_amount=pmt_amt,
        tds_amount=tds,
        discount_amount=disc,
        total_settled=total_settled,
        adjustment_type="AGAINST_REF",
        notes=f"Settled against Bill {purchase.reference_number or purchase.voucher_number}",
    ))

    await session.commit()
    return await get_voucher_by_id(session, pmt.id)

# ------------------------------------------------------------------------------
# Open Bills for Vendor (FIFO Bill-wise Allocation)
# ------------------------------------------------------------------------------
async def get_open_bills_for_vendor(session: AsyncSession, vendor_id: int) -> List[OpenBillItem]:
    """
    Fetch all unpaid or partially paid purchase bills and supplier invoices
    for a vendor, ordered by date ASC (FIFO).
    """
    stmt = (
        select(Voucher)
        .where(
            Voucher.vendor_id == vendor_id,
            Voucher.is_void == False,
            Voucher.voucher_type.in_([VoucherType.NORMAL_PURCHASE.value, VoucherType.GENERAL_PURCHASE.value]),
            Voucher.payment_status.in_(["UNPAID", "PARTIALLY_PAID"]),
        )
        .order_by(Voucher.voucher_date.asc(), Voucher.id.asc())
    )
    res = await session.execute(stmt)
    vouchers = res.scalars().all()

    today = date.today()
    items = []
    for v in vouchers:
        bal = v.balance_amount if v.balance_amount is not None else v.net_amount
        if bal <= Decimal("0.00"):
            continue
        days_overdue = 0
        if v.due_date and today > v.due_date:
            days_overdue = (today - v.due_date).days

        items.append(
            OpenBillItem(
                id=v.id,
                voucher_number=v.voucher_number,
                voucher_date=v.voucher_date,
                voucher_type=v.voucher_type,
                reference_number=v.reference_number,
                total_amount=v.total_amount,
                tax_amount=v.tax_amount,
                net_amount=v.net_amount,
                paid_amount=v.paid_amount or Decimal("0.00"),
                balance_amount=bal,
                due_date=v.due_date,
                party_name=v.party_name,
                credit_period_days=v.credit_period_days,
                days_overdue=days_overdue,
                hire_challan_id=v.hire_challan_id,
            )
        )
    return items


# ------------------------------------------------------------------------------
# Comprehensive Tally-Style Payment Voucher Posting
# ------------------------------------------------------------------------------
async def create_payment_voucher(
    session: AsyncSession,
    data: PaymentVoucherCreate,
    office_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Voucher:
    """
    Records business payments according to Indian double-entry bookkeeping and Tally Prime:
    1. Multi-bill purchase settlements (AGAINST_REF) with partial payments.
    2. Transporter / Market vehicle settlements (HIRE_CHALLAN / ATH / BTH) without duplicate expenses.
    3. Driver advances (DRIVER_ADVANCE as Current Asset) and driver trip reimbursements (DRIVER_EXPENSE).
    4. Direct business expenses (DIRECT_EXPENSE).
    5. Supplier advances (ADVANCE as Current Asset).
    6. Statutory / Tax payments (STATUTORY_PAYMENT).
    7. TDS deduction handling (Sec 194C / 194J / 194Q) and vendor discounts received.
    8. Overpayment handling (excess debited to Supplier Advances).
    9. Balanced double-entry ledger entries.
    """
    await ensure_standard_accounts(session)

    # 1. Resolve Bank or Cash Ledger Account
    resolved_company_bank_id: Optional[int] = None
    if data.bank_account_id:
        cb_res = await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.id == data.bank_account_id))
        cb_obj = cb_res.scalar_one_or_none()
        if cb_obj:
            if not cb_obj.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected company bank account is deactivated and cannot be used for new transactions.")
            bank_id = cb_obj.account_id
            resolved_company_bank_id = cb_obj.id
        else:
            acc_res = await session.execute(select(Account).where(Account.id == data.bank_account_id))
            acc_obj = acc_res.scalar_one_or_none()
            if acc_obj and not acc_obj.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected ledger account is inactive.")
            bank_id = data.bank_account_id
            if acc_obj:
                cba_res = await session.execute(select(CompanyBankAccount).where(CompanyBankAccount.account_id == acc_obj.id))
                cba_obj = cba_res.scalar_one_or_none()
                if cba_obj:
                    resolved_company_bank_id = cba_obj.id
    elif data.bank_account_code:
        bank_id = await get_fallback_account_id(session, data.bank_account_code, "BANK")
    elif (data.payment_mode or "").upper() == "CASH":
        bank_id = await get_fallback_account_id(session, "ACC_CASH", "CASH")
    else:
        default_ba = await get_default_bank_account_for_office(session, office_id) if office_id else None
        if default_ba:
            bank_id = default_ba.account_id
            resolved_company_bank_id = default_ba.id
        else:
            bank_id = await get_fallback_account_id(session, "ACC_HDFC_BANK", "BANK")

    # 2. Voucher Numbering (with resilient fallback to PAYMENT_VOUCHER series)
    v_type = VoucherType.PAYMENT_VOUCHER.value
    if data.payment_type == "HIRE_CHALLAN" and data.hire_challan_payment_type == "ATH":
        v_type = VoucherType.PAYMENT_ATH.value
    elif data.payment_type == "HIRE_CHALLAN" and data.hire_challan_payment_type == "BTH":
        v_type = VoucherType.PAYMENT_BTH.value

    try:
        v_num = await allocate_or_validate_voucher_number(
            session,
            v_type,
            issuing_office_id=office_id,
            series_id=data.series_id,
        )
    except Exception:
        v_num = await allocate_or_validate_voucher_number(
            session,
            VoucherType.PAYMENT_VOUCHER.value,
            issuing_office_id=office_id,
            series_id=data.series_id,
        )

    net_cash = data.amount
    tds_total = data.tds_amount or Decimal("0.00")
    disc_total = data.discount_amount or Decimal("0.00")
    gross_disbursement_val = net_cash + tds_total + disc_total

    # 3. Party & Target Debit Account Resolution
    party_name = (data.party_name or "").strip()
    party_type = "VENDOR"
    vendor_id = data.vendor_id
    driver_id = data.driver_id
    hire_challan_id = data.hire_challan_id
    creditor_id = None
    debit_target_id = None

    p_type = (data.payment_type or "AGAINST_REF").upper()

    if p_type in ["AGAINST_REF", "ADVANCE"]:
        if vendor_id:
            v_res = await session.execute(select(Vendor).where(Vendor.id == vendor_id))
            vendor = v_res.scalar_one_or_none()
            if not vendor:
                raise HTTPException(status_code=404, detail=f"Vendor #{vendor_id} not found")
            party_name = vendor.name
            vend_acc = await get_or_create_party_account(
                session, "VENDOR", vendor.id, vendor.name, vendor.pan
            )
            creditor_id = vend_acc.id
        elif data.party_account_id:
            creditor_id = data.party_account_id
            if not party_name:
                acc_obj = await get_account_by_id(session, creditor_id)
                party_name = acc_obj.name if acc_obj else "Vendor"
        else:
            party_name = party_name or "General Vendor"
            creditor_id = await get_fallback_account_id(session, "ACC_SUNDRY_CREDITORS", "CREDITORS")

    elif p_type == "HIRE_CHALLAN":
        party_type = "VEHICLE_OWNER"
        if hire_challan_id:
            hc_res = await session.execute(
                select(HireChallan).options(selectinload(HireChallan.owner)).where(HireChallan.id == hire_challan_id)
            )
            hc = hc_res.scalar_one_or_none()
            if not hc:
                raise HTTPException(status_code=404, detail=f"Hire Challan #{hire_challan_id} not found")
            owner_name = hc.owner.name if getattr(hc, "owner", None) else (hc.driver_name or "Vehicle Owner")
            party_name = owner_name
            vendor_id = hc.owner_id
            driver_id = hc.driver_id

            # Check if this hire challan has a booked Purchase Bill (NORMAL_PURCHASE)
            pb_res = await session.execute(
                select(Voucher).where(
                    Voucher.hire_challan_id == hc.id,
                    Voucher.is_void == False,
                    Voucher.voucher_type == VoucherType.NORMAL_PURCHASE.value,
                )
            )
            pb = pb_res.scalar_one_or_none()
            if pb:
                creditor_id = pb.account_id
            elif hc.owner_id:
                owner_acc = await get_or_create_party_account(session, "VENDOR", hc.owner_id, owner_name)
                creditor_id = owner_acc.id
            else:
                creditor_id = await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")
        else:
            party_name = party_name or "Market Transporter"
            creditor_id = await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")

    elif p_type == "DRIVER_ADVANCE":
        party_type = "DRIVER"
        if driver_id:
            d_res = await session.execute(select(Driver).where(Driver.id == driver_id))
            drv = d_res.scalar_one_or_none()
            if not drv:
                raise HTTPException(status_code=404, detail=f"Driver #{driver_id} not found")
            party_name = drv.name
        else:
            party_name = party_name or "Company Driver"
        debit_target_id = await get_fallback_account_id(session, "ACC_DRIVER_ADVANCES", "CA")

    elif p_type == "DRIVER_EXPENSE":
        party_type = "DRIVER"
        if driver_id:
            d_res = await session.execute(select(Driver).where(Driver.id == driver_id))
            drv = d_res.scalar_one_or_none()
            party_name = drv.name if drv else (party_name or "Driver")
        else:
            party_name = party_name or "Company Driver"
        debit_target_id = data.party_account_id or await get_fallback_account_id(session, "ACC_FUEL_EXP", "EXPENSE")

    elif p_type == "DIRECT_EXPENSE":
        party_type = "EXPENSE"
        party_name = party_name or "Direct Expense"
        debit_target_id = data.party_account_id or await get_fallback_account_id(session, "ACC_OFFICE_EXP", "EXPENSE")

    elif p_type == "STATUTORY_PAYMENT":
        party_type = "TAX_AUTHORITY"
        party_name = party_name or "Tax Authority / Government"
        debit_target_id = data.party_account_id or await get_fallback_account_id(session, "ACC_TDS_PAYABLE_194C", "TAX")

    # 4. Bill Allocation Processing (AGAINST_REF)
    allocated_bills: List[Dict[str, Any]] = []
    sum_alloc_net = Decimal("0.00")
    sum_alloc_total = Decimal("0.00")

    if p_type == "AGAINST_REF" and data.allocations:
        for item in data.allocations:
            if not item.invoice_id:
                continue
            a_net = item.allocated_amount or Decimal("0.00")
            a_tds = item.tds_amount or Decimal("0.00")
            a_disc = item.discount_amount or Decimal("0.00")
            a_tot = a_net + a_tds + a_disc
            if a_tot <= Decimal("0.00"):
                continue

            inv_res = await session.execute(select(Voucher).where(Voucher.id == item.invoice_id))
            inv = inv_res.scalar_one_or_none()
            if not inv:
                raise HTTPException(status_code=404, detail=f"Bill #{item.invoice_id} not found")
            if inv.is_void:
                raise HTTPException(status_code=400, detail=f"Cannot allocate payment to voided bill {inv.voucher_number}")

            bal = inv.balance_amount if inv.balance_amount is not None else inv.net_amount
            if a_tot > bal + Decimal("0.01"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Settlement ₹{a_tot} exceeds remaining balance ₹{bal} for bill {inv.reference_number or inv.voucher_number}"
                )

            inv.paid_amount = (inv.paid_amount or Decimal("0.00")) + a_tot
            inv.balance_amount = max(Decimal("0.00"), inv.net_amount - inv.paid_amount)
            if inv.balance_amount == Decimal("0.00"):
                inv.payment_status = "PAID"
            else:
                inv.payment_status = "PARTIALLY_PAID"

            allocated_bills.append({
                "invoice": inv,
                "allocated_amount": a_net,
                "tds_amount": a_tds,
                "discount_amount": a_disc,
                "total_settled": a_tot,
            })
            sum_alloc_net += a_net
            sum_alloc_total += a_tot

        # Excess money disbursed over allocated bills becomes Supplier Advance
        unapplied_advance = max(Decimal("0.00"), net_cash - sum_alloc_net)
    elif p_type in ["ADVANCE"]:
        unapplied_advance = net_cash
    else:
        unapplied_advance = Decimal("0.00")

    # If settling Hire Challan directly
    if p_type == "HIRE_CHALLAN" and hire_challan_id:
        hc_res = await session.execute(select(HireChallan).where(HireChallan.id == hire_challan_id))
        hc_obj = hc_res.scalar_one_or_none()
        if hc_obj:
            hc_obj.advance_amount = (hc_obj.advance_amount or Decimal("0.00")) + net_cash
            hc_obj.balance_amount = max(Decimal("0.00"), (hc_obj.hire_rate or Decimal("0.00")) - hc_obj.advance_amount)
            if hc_obj.balance_amount == Decimal("0.00"):
                hc_obj.status = "SETTLED"

    ref_num = data.reference_number or data.cheque_number
    ref_dt = data.cheque_date

    tax_breakup = {
        "payment_type": p_type,
        "payment_mode": data.payment_mode,
        "reference_number": ref_num,
        "cheque_number": data.cheque_number,
        "cheque_date": str(data.cheque_date) if data.cheque_date else None,
        "cheque_bank": data.cheque_bank,
        "clearance_status": data.clearance_status or "CLEARED",
        "tds_section": data.tds_section or "194C",
        "tds_rate": float(data.tds_rate or 0),
        "tds_amount": float(tds_total),
        "discount_amount": float(disc_total),
        "unapplied_advance_amount": float(unapplied_advance),
        "hire_challan_id": hire_challan_id,
        "settled_bills_count": len(allocated_bills),
    }

    primary_against_id = allocated_bills[0]["invoice"].id if len(allocated_bills) == 1 else None
    init_payment_status = "PENDING" if (data.payment_mode or "").upper() == "CHEQUE" and data.clearance_status == "PENDING" else "PAID"

    pmt = Voucher(
        voucher_number=v_num,
        voucher_type=v_type,
        voucher_date=data.voucher_date or date.today(),
        party_name=party_name,
        party_type=party_type,
        reference_number=ref_num,
        reference_date=ref_dt,
        total_amount=gross_disbursement_val,
        tax_amount=Decimal("0.00"),
        net_amount=net_cash,
        paid_amount=net_cash,
        balance_amount=Decimal("0.00"),
        payment_status=init_payment_status,
        narration=data.narration or f"Payment made to {party_name} via {data.payment_mode}",
        account_id=creditor_id or debit_target_id,
        vendor_id=vendor_id,
        driver_id=driver_id,
        hire_challan_id=hire_challan_id,
        issuing_office_id=office_id,
        company_bank_account_id=resolved_company_bank_id,
        against_voucher_id=primary_against_id,
        tax_breakup=tax_breakup,
        attachment_url=data.attachment_url,
        cost_center=data.cost_center,
    )
    session.add(pmt)
    await session.flush()

    # 5. Record Bill Allocations
    for b in allocated_bills:
        inv = b["invoice"]
        ba = BillAllocation(
            voucher_id=pmt.id,
            invoice_id=inv.id,
            allocated_amount=b["allocated_amount"],
            tds_amount=b["tds_amount"],
            discount_amount=b["discount_amount"],
            total_settled=b["total_settled"],
            adjustment_type="AGAINST_REF",
            notes=f"Settled against Bill {inv.reference_number or inv.voucher_number}",
        )
        session.add(ba)

    # 6. Balanced Double-Entry Postings
    # 6a. CREDIT: Bank or Cash Account (Net disbursement)
    mode_desc = f"via {data.payment_mode}" + (f" (Ref/Cheque #{ref_num})" if ref_num else "")
    session.add(LedgerEntry(
        voucher_id=pmt.id,
        account_id=bank_id,
        entry_date=pmt.voucher_date,
        debit_amount=Decimal("0.00"),
        credit_amount=net_cash,
        narration=f"Disbursement {mode_desc} to {party_name}",
    ))

    # 6b. CREDIT: TDS Payable (TDS retained / deducted on payment)
    if tds_total > Decimal("0.00"):
        sec = (data.tds_section or "194C").upper()
        if "194J" in sec:
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_PAYABLE_194J", "TAX")
            tds_narr = f"TDS u/s 194J retained on payment to {party_name}"
        elif "194Q" in sec:
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_PAYABLE_194Q", "TAX")
            tds_narr = f"TDS u/s 194Q retained on payment to {party_name}"
        else:
            tds_acc_id = await get_fallback_account_id(session, "ACC_TDS_PAYABLE_194C", "TAX")
            tds_narr = f"TDS u/s 194C retained on payment to {party_name}"

        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=tds_acc_id,
            entry_date=pmt.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=tds_total,
            narration=tds_narr,
        ))

    # 6c. CREDIT: Discount Received (Cash discount / rebate given by vendor)
    if disc_total > Decimal("0.00"):
        disc_acc_id = await get_fallback_account_id(session, "ACC_DISCOUNT_RECEIVED", "REV_DIRECT")
        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=disc_acc_id,
            entry_date=pmt.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=disc_total,
            narration=f"Discount received from {party_name}",
        ))

    # 6d. DEBIT ENTRIES (Where did the money go?)
    if p_type == "AGAINST_REF":
        if sum_alloc_total > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=pmt.id,
                account_id=creditor_id,
                entry_date=pmt.voucher_date,
                debit_amount=sum_alloc_total,
                credit_amount=Decimal("0.00"),
                narration=f"Settlement of {len(allocated_bills)} purchase bill(s) for {party_name}",
            ))
        if unapplied_advance > Decimal("0.00"):
            adv_acc_id = await get_fallback_account_id(session, "ACC_SUPPLIER_ADVANCES", "CA")
            session.add(LedgerEntry(
                voucher_id=pmt.id,
                account_id=adv_acc_id,
                entry_date=pmt.voucher_date,
                debit_amount=unapplied_advance,
                credit_amount=Decimal("0.00"),
                narration=f"Unapplied excess payment / advance to {party_name}",
            ))
    elif p_type == "HIRE_CHALLAN":
        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=creditor_id,
            entry_date=pmt.voucher_date,
            debit_amount=gross_disbursement_val,
            credit_amount=Decimal("0.00"),
            narration=f"Truck hire settlement for Challan {data.reference_number or hire_challan_id} ({party_name})",
        ))
    elif p_type == "DRIVER_ADVANCE":
        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=debit_target_id,
            entry_date=pmt.voucher_date,
            debit_amount=gross_disbursement_val,
            credit_amount=Decimal("0.00"),
            narration=f"Trip advance issued to Driver {party_name}",
        ))
    elif p_type in ["DRIVER_EXPENSE", "DIRECT_EXPENSE"]:
        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=debit_target_id,
            entry_date=pmt.voucher_date,
            debit_amount=gross_disbursement_val,
            credit_amount=Decimal("0.00"),
            narration=f"Expense payment to {party_name}",
        ))
    elif p_type == "ADVANCE":
        adv_acc_id = await get_fallback_account_id(session, "ACC_SUPPLIER_ADVANCES", "CA")
        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=adv_acc_id,
            entry_date=pmt.voucher_date,
            debit_amount=gross_disbursement_val,
            credit_amount=Decimal("0.00"),
            narration=f"Supplier advance paid to {party_name}",
        ))
    elif p_type == "STATUTORY_PAYMENT":
        session.add(LedgerEntry(
            voucher_id=pmt.id,
            account_id=debit_target_id,
            entry_date=pmt.voucher_date,
            debit_amount=gross_disbursement_val,
            credit_amount=Decimal("0.00"),
            narration=f"Statutory payment ({party_name})",
        ))

    pmt_id = pmt.id
    await session.commit()
    return await get_voucher_by_id(session, pmt_id)


# ------------------------------------------------------------------------------
# Void Voucher (Reversing Entry per Rules §7)
# ------------------------------------------------------------------------------



# ------------------------------------------------------------------------------
# Contra Voucher Engine (Tally-Style Cash/Bank Transfers)
# ------------------------------------------------------------------------------
async def get_contra_eligible_accounts(session: AsyncSession) -> List[ContraAccountItem]:
    """
    Returns only genuine Bank Accounts and Cash-in-hand accounts for Contra transfers.
    Calculates live running double-entry balance for each account.
    Strictly excludes trade debtors, creditors, expense heads, and third-party ledgers.
    """
    await ensure_standard_accounts(session)

    stmt = (
        select(Account)
        .options(
            selectinload(Account.group),
            selectinload(Account.company_bank_account).selectinload(CompanyBankAccount.issuing_office),
        )
        .where(
            Account.is_active == True,
            Account.billing_client_id.is_(None),
            Account.vendor_id.is_(None),
            Account.driver_id.is_(None),
        )
    )
    res = await session.execute(stmt)
    all_accounts = res.scalars().all()

    eligible: List[ContraAccountItem] = []
    for acc in all_accounts:
        grp_code = (acc.group.code if acc.group else "").upper()
        acc_code = (acc.code or "").upper()
        acc_name = (acc.name or "").lower()
        c_bank = acc.company_bank_account

        is_bank = grp_code in ("BANK", "BANK_OD", "BANK_OCC") or "bank" in acc_name or "bank" in acc_code.lower() or (c_bank is not None)
        is_cash = grp_code == "CASH" or "cash" in acc_name or "cash" in acc_code.lower()

        if not (is_bank or is_cash):
            continue

        acc_type = "BANK" if is_bank else "CASH"

        # Calculate live running double-entry balance
        le_stmt = select(
            func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
            func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
        ).where(
            LedgerEntry.account_id == acc.id,
            LedgerEntry.is_reversal == False,
        )
        le_res = await session.execute(le_stmt)
        tot_dr, tot_cr = le_res.one()

        open_bal = Decimal(str(acc.opening_balance or "0.00"))
        open_dr = open_bal if acc.opening_balance_type == "DR" else Decimal("0.00")
        open_cr = open_bal if acc.opening_balance_type == "CR" else Decimal("0.00")

        net_bal = (open_dr + tot_dr) - (open_cr + tot_cr)
        if net_bal >= Decimal("0.00"):
            b_type = "DR"
            b_amt = net_bal
        else:
            b_type = "CR"
            b_amt = abs(net_bal)

        off_id = c_bank.issuing_office_id if c_bank else None
        off_name = c_bank.issuing_office.name if (c_bank and c_bank.issuing_office) else None
        masked_num = mask_account_number(c_bank.account_number) if c_bank else None

        eligible.append(
            ContraAccountItem(
                id=acc.id,
                name=acc.name,
                code=acc.code,
                account_type=acc_type,
                current_balance=b_amt,
                balance_type=b_type,
                issuing_office_id=off_id,
                issuing_office_name=off_name,
                account_number_masked=masked_num,
            )
        )

    return sorted(eligible, key=lambda a: (a.account_type, a.name))


async def create_contra_voucher(
    session: AsyncSession,
    data: ContraVoucherCreate,
    office_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Voucher:
    """
    Creates a double-entry Contra Voucher for internal fund movements:
    1. CASH_TO_BANK: Dr. Bank, Cr. Cash
    2. BANK_TO_CASH: Dr. Cash, Cr. Bank
    3. BANK_TO_BANK: Dr. Dest Bank, Cr. Src Bank
    4. CASH_TO_CASH: Dr. Dest Cash, Cr. Src Cash
    Strictly preserves net assets and generates zero trading profit/loss or GST liabilities.
    """
    await ensure_standard_accounts(session)

    # 1. Validate Amount
    if data.amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer amount must be strictly greater than zero.",
        )

    # 2. Prevent Same Account Transfer
    if data.source_account_id == data.destination_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and Destination accounts cannot be the same. Please choose two distinct accounts.",
        )

    # 3. Retrieve and Validate Accounts
    src_stmt = select(Account).options(selectinload(Account.group)).where(Account.id == data.source_account_id)
    src_res = await session.execute(src_stmt)
    source_acc = src_res.scalar_one_or_none()
    if not source_acc or not source_acc.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source account does not exist or is inactive.",
        )

    dest_stmt = select(Account).options(selectinload(Account.group)).where(Account.id == data.destination_account_id)
    dest_res = await session.execute(dest_stmt)
    dest_acc = dest_res.scalar_one_or_none()
    if not dest_acc or not dest_acc.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination account does not exist or is inactive.",
        )

    # Third-Party Account Safeguard:
    # Under Indian accounting principles, payments to debtors/creditors/drivers cannot be booked as Contra
    if source_acc.billing_client_id or source_acc.vendor_id or source_acc.driver_id or        dest_acc.billing_client_id or dest_acc.vendor_id or dest_acc.driver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contra vouchers are strictly for internal fund movements. Payments to or collections from third parties (customers, vendors, drivers) must be recorded using Receipt Voucher or Payment Voucher.",
        )

    # Determine Account Types
    def is_bank_acc(a: Account) -> bool:
        grp = (a.group.code if a.group else "").upper()
        code = (a.code or "").upper()
        name = (a.name or "").lower()
        return grp in ("BANK", "BANK_OD", "BANK_OCC") or "bank" in name or "bank" in code.lower() or (a.company_bank_account is not None)

    def is_cash_acc(a: Account) -> bool:
        grp = (a.group.code if a.group else "").upper()
        code = (a.code or "").upper()
        name = (a.name or "").lower()
        return grp == "CASH" or "cash" in name or "cash" in code.lower()

    src_is_bank = is_bank_acc(source_acc)
    src_is_cash = is_cash_acc(source_acc)
    dest_is_bank = is_bank_acc(dest_acc)
    dest_is_cash = is_cash_acc(dest_acc)

    c_type = (data.contra_type or "").upper()
    if c_type == "CASH_TO_BANK":
        if not src_is_cash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"For 'Deposit Cash into Bank', source must be a Cash account. '{source_acc.name}' is not recognized as a Cash account.",
            )
        if not dest_is_bank:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"For 'Deposit Cash into Bank', destination must be a Bank account. '{dest_acc.name}' is not recognized as a Bank account.",
            )
        type_desc = f"Cash Deposit ({source_acc.name} -> {dest_acc.name})"
    elif c_type == "BANK_TO_CASH":
        if not src_is_bank:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"For 'Withdraw Cash from Bank', source must be a Bank account. '{source_acc.name}' is not recognized as a Bank account.",
            )
        if not dest_is_cash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"For 'Withdraw Cash from Bank', destination must be a Cash account. '{dest_acc.name}' is not recognized as a Cash account.",
            )
        type_desc = f"Cash Withdrawal ({source_acc.name} -> {dest_acc.name})"
    elif c_type == "BANK_TO_BANK":
        if not (src_is_bank and dest_is_bank):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="For 'Transfer Between Bank Accounts', both source and destination must be Bank accounts.",
            )
        type_desc = f"Inter-Bank Transfer ({source_acc.name} -> {dest_acc.name})"
    elif c_type == "CASH_TO_CASH":
        if not (src_is_cash and dest_is_cash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="For 'Transfer Between Cash Accounts', both source and destination must be Cash accounts.",
            )
        type_desc = f"Internal Cash Transfer ({source_acc.name} -> {dest_acc.name})"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid contra type '{data.contra_type}'. Allowed types are CASH_TO_BANK, BANK_TO_CASH, BANK_TO_BANK, CASH_TO_CASH.",
        )

    # 4. Duplicate Check
    if data.reference_number and data.reference_number.strip():
        dup_stmt = select(Voucher).where(
            Voucher.voucher_type == VoucherType.CONTRA_VOUCHER.value,
            Voucher.voucher_date == data.voucher_date,
            Voucher.net_amount == data.amount,
            Voucher.reference_number == data.reference_number.strip(),
            Voucher.is_void == False,
        )
        dup = (await session.execute(dup_stmt)).scalar_one_or_none()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A Contra Voucher #{dup.voucher_number} already exists for this date, amount, and reference #{data.reference_number}.",
            )

    # 5. Voucher Numbering (with resilient fallback to auto series)
    try:
        v_num = await allocate_or_validate_voucher_number(
            session,
            VoucherType.CONTRA_VOUCHER.value,
            issuing_office_id=office_id,
            series_id=data.series_id,
        )
    except Exception:
        v_num = await generate_voucher_number(session, VoucherType.CONTRA_VOUCHER.value)

    # 6. Bank Charges Handling
    bank_charges = data.bank_charges or Decimal("0.00")
    bank_charges_acc_id = None
    if bank_charges > Decimal("0.00"):
        bank_charges_acc_id = data.bank_charges_account_id or (
            await get_fallback_account_id(session, "ACC_BANK_CHARGES_EXP", "EXP_INDIRECT")
        )

    # 7. Construct Metadata
    contra_meta = {
        "contra_type": c_type,
        "transfer_mode": data.transfer_mode or "BANK_TRANSFER",
        "source_account_id": source_acc.id,
        "source_account_name": source_acc.name,
        "source_account_code": source_acc.code,
        "destination_account_id": dest_acc.id,
        "destination_account_name": dest_acc.name,
        "destination_account_code": dest_acc.code,
        "transferred_amount": str(data.amount),
        "bank_charges": str(bank_charges),
        "cheque_number": data.cheque_number,
        "cheque_date": str(data.cheque_date) if data.cheque_date else None,
        "reference_number": data.reference_number,
    }

    total_disbursed = data.amount + bank_charges

    # 8. Create Voucher Record
    voucher = Voucher(
        voucher_number=v_num,
        voucher_type=VoucherType.CONTRA_VOUCHER.value,
        voucher_date=data.voucher_date,
        party_name=type_desc,
        party_type="CONTRA",
        reference_number=data.reference_number,
        total_amount=total_disbursed,
        tax_amount=Decimal("0.00"),
        net_amount=data.amount,
        paid_amount=data.amount,
        balance_amount=Decimal("0.00"),
        payment_status="CLEARED",
        narration=data.narration.strip() if data.narration else type_desc,
        tax_breakup=contra_meta,
        issuing_office_id=office_id,
        company_bank_account_id=dest_acc.company_bank_account.id if dest_acc.company_bank_account else (source_acc.company_bank_account.id if source_acc.company_bank_account else None),
        is_void=False,
    )
    session.add(voucher)
    await session.flush()

    # 9. Post Balanced Double-Entry Postings
    mode_str = f" via {data.transfer_mode or 'Transfer'}"
    ref_str = f" (Ref #{data.reference_number})" if data.reference_number else ""

    # 9a. DEBIT: Destination Account (Money In - Asset Increases)
    session.add(
        LedgerEntry(
            voucher_id=voucher.id,
            account_id=dest_acc.id,
            entry_date=data.voucher_date,
            debit_amount=data.amount,
            credit_amount=Decimal("0.00"),
            narration=f"Transfer In from {source_acc.name}{mode_str}{ref_str}",
        )
    )

    # 9b. DEBIT: Bank Charges Expense (if any)
    if bank_charges > Decimal("0.00") and bank_charges_acc_id:
        session.add(
            LedgerEntry(
                voucher_id=voucher.id,
                account_id=bank_charges_acc_id,
                entry_date=data.voucher_date,
                debit_amount=bank_charges,
                credit_amount=Decimal("0.00"),
                narration=f"Bank charges incurred on transfer #{v_num}",
            )
        )

    # 9c. CREDIT: Source Account (Money Out - Asset Decreases)
    session.add(
        LedgerEntry(
            voucher_id=voucher.id,
            account_id=source_acc.id,
            entry_date=data.voucher_date,
            debit_amount=Decimal("0.00"),
            credit_amount=total_disbursed,
            narration=f"Transfer Out to {dest_acc.name}{mode_str}{ref_str}",
        )
    )

    await session.flush()

    # Commit and return fresh
    final_id = voucher.id
    await session.commit()
    return await get_voucher_by_id(session, final_id)



# ------------------------------------------------------------------------------
# Credit & Debit Note Management (Tally Prime & Indian GST Sec 34)
# ------------------------------------------------------------------------------
async def create_credit_debit_note(
    session: AsyncSession,
    data: schemas.CreditDebitNoteCreate,
    office_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Voucher:
    """
    Creates a Tally Prime compliant Credit Note or Debit Note with proper double-entry accounting.
    Distinguishes 4 operational categories:
    1. SALES_CREDIT_NOTE: Customer Credit Note (Bill Reduction)
       - Dr. Sales Returns / Freight Adjustment (ACC_FREIGHT_REV) [Taxable amount]
       - Dr. Output GST CGST/SGST/IGST [Tax amount] (if statutory GST note)
       - Cr. Sundry Debtors (Customer Ledger) [Total Net amount]
    2. SALES_DEBIT_NOTE: Customer Debit Note (Additional Charge / Detention)
       - Dr. Sundry Debtors (Customer Ledger) [Total Net amount]
       - Cr. Additional Freight / Detention Income (ACC_FREIGHT_REV) [Taxable amount]
       - Cr. Output GST CGST/SGST/IGST [Tax amount] (if statutory GST note)
    3. PURCHASE_DEBIT_NOTE: Vendor Debit Note (Purchase Return / Shortage Deduction)
       - Dr. Sundry Creditors (Vendor Ledger) [Total Net amount]
       - Cr. Truck Hire / Purchase Expense (ACC_TRUCK_HIRE_EXP) [Taxable amount]
       - Cr. Input GST ITC Reversal CGST/SGST/IGST [Tax amount] (if statutory GST note)
    4. PURCHASE_CREDIT_NOTE: Vendor Credit Note (Supplier Additional Charge)
       - Dr. Truck Hire / Purchase Expense (ACC_TRUCK_HIRE_EXP) [Taxable amount]
       - Dr. Input GST CGST/SGST/IGST [Tax amount] (if statutory GST note)
       - Cr. Sundry Creditors (Vendor Ledger) [Total Net amount]
    """
    # 1. Resolve Office
    target_office = office_id
    if not target_office:
        br_res = await session.execute(
            select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1)
        )
        target_office = br_res.scalar_one_or_none()

    # 2. Party Validation & Account Resolution
    party_name = data.party_name
    party_gstin = data.party_gstin
    place_of_supply = data.place_of_supply

    if data.note_category in ("SALES_CREDIT_NOTE", "SALES_DEBIT_NOTE"):
        if not data.billing_client_id:
            raise HTTPException(status_code=400, detail="Customer (Billing Client) is required for Sales Credit / Debit Notes.")
        client_res = await session.execute(select(BillingClient).where(BillingClient.id == data.billing_client_id))
        client = client_res.scalar_one_or_none()
        if not client:
            raise HTTPException(status_code=404, detail="Customer not found.")
        party_name = party_name or client.name
        party_gstin = party_gstin or client.gstin
        place_of_supply = place_of_supply or client.state
        debtor_acc_id = await get_fallback_account_id(session, "ACC_SUNDRY_DEBTORS", "DEBTORS")
    else:
        if not data.vendor_id:
            raise HTTPException(status_code=400, detail="Vendor / Supplier is required for Purchase Debit / Credit Notes.")
        vend_res = await session.execute(select(Vendor).where(Vendor.id == data.vendor_id))
        vend = vend_res.scalar_one_or_none()
        if not vend:
            raise HTTPException(status_code=404, detail="Vendor not found.")
        party_name = party_name or vend.name
        party_gstin = party_gstin or vend.gstin
        place_of_supply = place_of_supply or vend.state
        creditor_acc_id = await get_fallback_account_id(session, "ACC_SUNDRY_CREDITORS", "CREDITORS")

    # 3. Check against target invoice if provided
    target_invoice = None
    if data.against_voucher_id:
        target_res = await session.execute(
            select(Voucher).options(selectinload(Voucher.bill_allocations)).where(Voucher.id == data.against_voucher_id)
        )
        target_invoice = target_res.scalar_one_or_none()
        if not target_invoice:
            raise HTTPException(status_code=404, detail=f"Target invoice #{data.against_voucher_id} not found.")
        if target_invoice.is_void:
            raise HTTPException(status_code=400, detail="Cannot adjust against a voided invoice.")

        # Ensure party matches target invoice
        if data.note_category.startswith("SALES") and target_invoice.billing_client_id != data.billing_client_id:
            raise HTTPException(status_code=400, detail="Selected invoice does not belong to this customer.")
        if data.note_category.startswith("PURCHASE") and target_invoice.vendor_id != data.vendor_id:
            raise HTTPException(status_code=400, detail="Selected bill does not belong to this vendor.")

        # For SALES_CREDIT_NOTE or PURCHASE_DEBIT_NOTE: prevent adjustments exceeding target invoice total
        if data.note_category in ("SALES_CREDIT_NOTE", "PURCHASE_DEBIT_NOTE"):
            existing_adj = sum(
                (ba.total_settled for ba in (target_invoice.bill_allocations or []) if ba.adjustment_type in ("CREDIT_NOTE", "DEBIT_NOTE")),
                Decimal("0.00")
            )
            if existing_adj + data.net_amount > target_invoice.net_amount + Decimal("0.05"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Total adjustments (₹{existing_adj + data.net_amount}) cannot exceed original invoice gross amount (₹{target_invoice.net_amount})."
                )

    # 4. Allocate Voucher Number
    v_num = await allocate_or_validate_voucher_number(
        session,
        data.note_type,
        issuing_office_id=target_office,
        series_id=data.series_id,
    )

    # 5. Calculate GST breakdown
    is_gst = bool(data.is_gst_note)
    taxable_amt = Decimal(str(data.total_taxable_amount))
    tax_amt = Decimal(str(data.tax_amount)) if is_gst else Decimal("0.00")
    net_amt = Decimal(str(data.net_amount))

    # Validate net amount equals taxable + tax
    expected_net = taxable_amt + tax_amt
    if abs(net_amt - expected_net) > Decimal("0.05"):
        net_amt = expected_net

    cgst_amt = Decimal(str(data.cgst_amount or "0.00")) if is_gst else Decimal("0.00")
    sgst_amt = Decimal(str(data.sgst_amount or "0.00")) if is_gst else Decimal("0.00")
    igst_amt = Decimal(str(data.igst_amount or "0.00")) if is_gst else Decimal("0.00")

    if is_gst and tax_amt > Decimal("0.00") and cgst_amt == 0 and sgst_amt == 0 and igst_amt == 0:
        br_stmt = select(Branch).where(Branch.id == target_office)
        br_obj = (await session.execute(br_stmt)).scalar_one_or_none()
        is_interstate = False
        if br_obj and br_obj.state and place_of_supply:
            is_interstate = br_obj.state.strip().lower() != place_of_supply.strip().lower()

        if is_interstate:
            igst_amt = tax_amt
        else:
            cgst_amt = (tax_amt / Decimal("2.00")).quantize(Decimal("0.01"))
            sgst_amt = tax_amt - cgst_amt

    tax_breakup = {
        "is_gst_note": is_gst,
        "tax_rate": float(data.tax_rate or 0),
        "taxable_amount": float(taxable_amt),
        "tax_amount": float(tax_amt),
        "cgst_amount": float(cgst_amt),
        "sgst_amount": float(sgst_amt),
        "igst_amount": float(igst_amt),
        "reason_code": data.reason_code,
        "reason_description": data.reason_description,
    }

    # 6. Create Voucher Header
    v_date = data.voucher_date or date.today()
    voucher = Voucher(
        voucher_number=v_num,
        voucher_type=data.note_type,
        note_category=data.note_category,
        reason_code=data.reason_code,
        voucher_date=v_date,
        party_name=party_name,
        party_type="CUSTOMER" if data.note_category.startswith("SALES") else "VENDOR",
        party_gstin=party_gstin,
        place_of_supply=place_of_supply,
        gst_treatment=data.gst_treatment or "FCM",
        reference_number=data.reference_number,
        reference_date=data.reference_date,
        total_amount=taxable_amt,
        tax_amount=tax_amt,
        net_amount=net_amt,
        narration=data.narration or f"{data.note_category.replace('_', ' ').title()} - Ref #{data.reference_number or v_num}",
        cost_center=data.cost_center,
        attachment_url=data.attachment_url,
        issuing_office_id=target_office,
        billing_client_id=data.billing_client_id,
        vendor_id=data.vendor_id,
        against_voucher_id=data.against_voucher_id,
        tax_breakup=tax_breakup,
        payment_status="POSTED",
        balance_amount=Decimal("0.00"),
        paid_amount=Decimal("0.00"),
    )
    session.add(voucher)
    await session.flush()

    # 7. Create Line Item(s)
    if data.items:
        for itm in data.items:
            session.add(
                VoucherItem(
                    voucher_id=voucher.id,
                    description=itm.description,
                    quantity=itm.quantity,
                    rate=itm.rate,
                    tax_amount=itm.tax_amount if is_gst else Decimal("0.00"),
                    total_amount=itm.total_amount,
                )
            )
    else:
        reason_label = data.reason_description or (f"Reason Code {data.reason_code}" if data.reason_code else "Adjustment")
        session.add(
            VoucherItem(
                voucher_id=voucher.id,
                description=f"{data.note_category.replace('_', ' ').title()} ({reason_label})",
                quantity=Decimal("1.00"),
                rate=taxable_amt,
                tax_amount=tax_amt,
                total_amount=net_amt,
            )
        )

    # 8. Post Balanced Double-Entry Ledger Entries
    rev_acc_id = await get_fallback_account_id(session, "ACC_FREIGHT_REV", "REVENUE")
    exp_acc_id = await get_fallback_account_id(session, "ACC_TRUCK_HIRE_EXP", "EXPENSE")
    cgst_out_id = await get_fallback_account_id(session, "ACC_GST_OUT_CGST", "TAX")
    sgst_out_id = await get_fallback_account_id(session, "ACC_GST_OUT_SGST", "TAX")
    igst_out_id = await get_fallback_account_id(session, "ACC_GST_OUT_IGST", "TAX")
    cgst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_CGST", "TAX")
    sgst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_SGST", "TAX")
    igst_in_id = await get_fallback_account_id(session, "ACC_GST_IN_IGST", "TAX")

    if data.note_category == "SALES_CREDIT_NOTE":
        # DEBIT: Sales / Revenue Reduction
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=rev_acc_id,
            entry_date=v_date,
            debit_amount=taxable_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Revenue reduction / claim via {v_num}",
        ))
        # DEBIT: Output GST Reduction (if GST note)
        if is_gst and cgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=cgst_out_id,
                entry_date=v_date,
                debit_amount=cgst_amt,
                credit_amount=Decimal("0.00"),
                narration=f"CGST Output reduction for {v_num}",
            ))
        if is_gst and sgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=sgst_out_id,
                entry_date=v_date,
                debit_amount=sgst_amt,
                credit_amount=Decimal("0.00"),
                narration=f"SGST Output reduction for {v_num}",
            ))
        if is_gst and igst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=igst_out_id,
                entry_date=v_date,
                debit_amount=igst_amt,
                credit_amount=Decimal("0.00"),
                narration=f"IGST Output reduction for {v_num}",
            ))
        # CREDIT: Sundry Debtors (Customer Ledger)
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=debtor_acc_id,
            entry_date=v_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Credit note {v_num} issued to {party_name}",
        ))

        # Update Target Invoice Balance
        if target_invoice:
            applied = min(target_invoice.balance_amount or Decimal("0.00"), net_amt)
            target_invoice.paid_amount = (target_invoice.paid_amount or Decimal("0.00")) + applied
            target_invoice.balance_amount = max(Decimal("0.00"), (target_invoice.balance_amount or Decimal("0.00")) - applied)
            if target_invoice.balance_amount == Decimal("0.00"):
                target_invoice.payment_status = "PAID"
            elif target_invoice.paid_amount > Decimal("0.00"):
                target_invoice.payment_status = "PARTIAL"
            session.add(
                BillAllocation(
                    voucher_id=voucher.id,
                    invoice_id=target_invoice.id,
                    allocated_amount=applied,
                    tds_amount=Decimal("0.00"),
                    discount_amount=Decimal("0.00"),
                    total_settled=net_amt,
                    adjustment_type="CREDIT_NOTE",
                    notes=f"Credit Note {v_num} applied",
                )
            )

    elif data.note_category == "SALES_DEBIT_NOTE":
        # DEBIT: Sundry Debtors (Customer Ledger)
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=debtor_acc_id,
            entry_date=v_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Debit note {v_num} issued to {party_name}",
        ))
        # CREDIT: Revenue / Detention / Extra Income
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=rev_acc_id,
            entry_date=v_date,
            debit_amount=Decimal("0.00"),
            credit_amount=taxable_amt,
            narration=f"Additional freight / detention charge via {v_num}",
        ))
        # CREDIT: Output GST (if GST note)
        if is_gst and cgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=cgst_out_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=cgst_amt,
                narration=f"CGST Output on Debit Note {v_num}",
            ))
        if is_gst and sgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=sgst_out_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=sgst_amt,
                narration=f"SGST Output on Debit Note {v_num}",
            ))
        if is_gst and igst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=igst_out_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=igst_amt,
                narration=f"IGST Output on Debit Note {v_num}",
            ))

        # Update Target Invoice Balance (increases receivable)
        if target_invoice:
            target_invoice.balance_amount = (target_invoice.balance_amount or Decimal("0.00")) + net_amt
            if target_invoice.payment_status == "PAID":
                target_invoice.payment_status = "PARTIAL"
            session.add(
                BillAllocation(
                    voucher_id=voucher.id,
                    invoice_id=target_invoice.id,
                    allocated_amount=net_amt,
                    tds_amount=Decimal("0.00"),
                    discount_amount=Decimal("0.00"),
                    total_settled=net_amt,
                    adjustment_type="DEBIT_NOTE",
                    notes=f"Debit Note {v_num} added charges",
                )
            )

    elif data.note_category == "PURCHASE_DEBIT_NOTE":
        # DEBIT: Sundry Creditors (Vendor Ledger)
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=creditor_acc_id,
            entry_date=v_date,
            debit_amount=net_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Debit note {v_num} to supplier {party_name}",
        ))
        # CREDIT: Purchase / Truck Hire Expense Reduction
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=exp_acc_id,
            entry_date=v_date,
            debit_amount=Decimal("0.00"),
            credit_amount=taxable_amt,
            narration=f"Expense reduction / shortage claim via {v_num}",
        ))
        # CREDIT: Input GST ITC Reversal (if GST note u/s 34(2))
        if is_gst and cgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=cgst_in_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=cgst_amt,
                narration=f"CGST Input ITC Reversal on {v_num}",
            ))
        if is_gst and sgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=sgst_in_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=sgst_amt,
                narration=f"SGST Input ITC Reversal on {v_num}",
            ))
        if is_gst and igst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=igst_in_id,
                entry_date=v_date,
                debit_amount=Decimal("0.00"),
                credit_amount=igst_amt,
                narration=f"IGST Input ITC Reversal on {v_num}",
            ))

        # Update Target Bill Balance
        if target_invoice:
            applied = min(target_invoice.balance_amount or Decimal("0.00"), net_amt)
            target_invoice.paid_amount = (target_invoice.paid_amount or Decimal("0.00")) + applied
            target_invoice.balance_amount = max(Decimal("0.00"), (target_invoice.balance_amount or Decimal("0.00")) - applied)
            if target_invoice.balance_amount == Decimal("0.00"):
                target_invoice.payment_status = "PAID"
            elif target_invoice.paid_amount > Decimal("0.00"):
                target_invoice.payment_status = "PARTIAL"
            session.add(
                BillAllocation(
                    voucher_id=voucher.id,
                    invoice_id=target_invoice.id,
                    allocated_amount=applied,
                    tds_amount=Decimal("0.00"),
                    discount_amount=Decimal("0.00"),
                    total_settled=net_amt,
                    adjustment_type="DEBIT_NOTE",
                    notes=f"Debit Note {v_num} purchase return/deduction",
                )
            )

    elif data.note_category == "PURCHASE_CREDIT_NOTE":
        # DEBIT: Expense Account (Supplier additional charge)
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=exp_acc_id,
            entry_date=v_date,
            debit_amount=taxable_amt,
            credit_amount=Decimal("0.00"),
            narration=f"Additional supplier charge via {v_num}",
        ))
        # DEBIT: Input GST (if GST note)
        if is_gst and cgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=cgst_in_id,
                entry_date=v_date,
                debit_amount=cgst_amt,
                credit_amount=Decimal("0.00"),
                narration=f"CGST Input ITC on {v_num}",
            ))
        if is_gst and sgst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=sgst_in_id,
                entry_date=v_date,
                debit_amount=sgst_amt,
                credit_amount=Decimal("0.00"),
                narration=f"SGST Input ITC on {v_num}",
            ))
        if is_gst and igst_amt > Decimal("0.00"):
            session.add(LedgerEntry(
                voucher_id=voucher.id,
                account_id=igst_in_id,
                entry_date=v_date,
                debit_amount=igst_amt,
                credit_amount=Decimal("0.00"),
                narration=f"IGST Input ITC on {v_num}",
            ))
        # CREDIT: Sundry Creditors (Vendor Ledger)
        session.add(LedgerEntry(
            voucher_id=voucher.id,
            account_id=creditor_acc_id,
            entry_date=v_date,
            debit_amount=Decimal("0.00"),
            credit_amount=net_amt,
            narration=f"Credit note {v_num} recorded for supplier {party_name}",
        ))

        # Update Target Bill Balance (increases payable)
        if target_invoice:
            target_invoice.balance_amount = (target_invoice.balance_amount or Decimal("0.00")) + net_amt
            session.add(
                BillAllocation(
                    voucher_id=voucher.id,
                    invoice_id=target_invoice.id,
                    allocated_amount=net_amt,
                    tds_amount=Decimal("0.00"),
                    discount_amount=Decimal("0.00"),
                    total_settled=net_amt,
                    adjustment_type="CREDIT_NOTE",
                    notes=f"Credit Note {v_num} additional supplier charge",
                )
            )

    await session.flush()
    final_id = voucher.id
    await session.commit()
    return await get_voucher_by_id(session, final_id)


async def get_eligible_invoices_for_note(
    session: AsyncSession,
    party_type: str,
    party_id: int,
    category: Optional[str] = None,
    office_id: Optional[int] = None,
) -> List[schemas.EligibleInvoiceItem]:
    """
    Fetches eligible invoices or bills for credit/debit note adjustments.
    Filters out voided records and computes current remaining balance and allowable adjustments.
    """
    items = []
    if party_type.upper() == "CUSTOMER":
        stmt = (
            select(Voucher)
            .options(selectinload(Voucher.bill_allocations))
            .where(
                Voucher.billing_client_id == party_id,
                Voucher.is_void == False,
                Voucher.voucher_type.in_([VoucherType.TRANSPORT_INVOICE.value, VoucherType.GENERAL_INVOICE.value]),
            )
            .order_by(Voucher.voucher_date.desc(), Voucher.id.desc())
        )
        res = await session.execute(stmt)
        vouchers = res.scalars().all()
        for v in vouchers:
            allocs = [ba for ba in (v.bill_allocations or []) if ba.adjustment_type == "CREDIT_NOTE"]
            tot_adjusted = sum((ba.total_settled for ba in allocs), Decimal("0.00"))
            allowable = max(Decimal("0.00"), v.net_amount - tot_adjusted)
            items.append(
                schemas.EligibleInvoiceItem(
                    id=v.id,
                    voucher_number=v.voucher_number,
                    voucher_date=v.voucher_date,
                    voucher_type=v.voucher_type,
                    party_name=v.party_name,
                    party_gstin=v.party_gstin,
                    place_of_supply=v.place_of_supply,
                    gst_treatment=v.gst_treatment,
                    total_amount=v.total_amount,
                    tax_amount=v.tax_amount,
                    net_amount=v.net_amount,
                    paid_amount=v.paid_amount or Decimal("0.00"),
                    balance_amount=v.balance_amount if v.balance_amount is not None else v.net_amount,
                    tax_breakup=v.tax_breakup or {},
                    total_adjusted=tot_adjusted,
                    allowable_adjustment=allowable,
                )
            )
    else:  # VENDOR
        stmt = (
            select(Voucher)
            .options(selectinload(Voucher.bill_allocations))
            .where(
                Voucher.vendor_id == party_id,
                Voucher.is_void == False,
                Voucher.voucher_type.in_([VoucherType.NORMAL_PURCHASE.value, VoucherType.GENERAL_PURCHASE.value]),
            )
            .order_by(Voucher.voucher_date.desc(), Voucher.id.desc())
        )
        res = await session.execute(stmt)
        vouchers = res.scalars().all()
        for v in vouchers:
            allocs = [ba for ba in (v.bill_allocations or []) if ba.adjustment_type == "DEBIT_NOTE"]
            tot_adjusted = sum((ba.total_settled for ba in allocs), Decimal("0.00"))
            allowable = max(Decimal("0.00"), v.net_amount - tot_adjusted)
            items.append(
                schemas.EligibleInvoiceItem(
                    id=v.id,
                    voucher_number=v.voucher_number,
                    voucher_date=v.voucher_date,
                    voucher_type=v.voucher_type,
                    party_name=v.party_name,
                    party_gstin=v.party_gstin,
                    place_of_supply=v.place_of_supply,
                    gst_treatment=v.gst_treatment,
                    total_amount=v.total_amount,
                    tax_amount=v.tax_amount,
                    net_amount=v.net_amount,
                    paid_amount=v.paid_amount or Decimal("0.00"),
                    balance_amount=v.balance_amount if v.balance_amount is not None else v.net_amount,
                    tax_breakup=v.tax_breakup or {},
                    total_adjusted=tot_adjusted,
                    allowable_adjustment=allowable,
                )
            )
    return items


async def void_voucher(
    session: AsyncSession,
    voucher_id: int,
    data: VoidVoucherRequest,
    user_id: Optional[int] = None,
) -> Voucher:
    voucher = await get_voucher_by_id(session, voucher_id)
    if voucher.is_void:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Voucher is already voided")

    # If this is a Transport, General Invoice, or Purchase Bill, check if active settlements exist
    if voucher.voucher_type in [VoucherType.TRANSPORT_INVOICE.value, VoucherType.GENERAL_INVOICE.value, VoucherType.NORMAL_PURCHASE.value, VoucherType.GENERAL_PURCHASE.value]:
        if voucher.paid_amount and voucher.paid_amount > Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot void voucher {voucher.voucher_number} because active receipts / payments totaling ₹{voucher.paid_amount} exist against it. Please void the linked settlements first."
            )
        # Restore LR unbilled status
        if voucher.lr_id:
            lr_stmt = select(LR).where(LR.id == voucher.lr_id)
            lr_res = await session.execute(lr_stmt)
            lr_obj = lr_res.scalar_one_or_none()
            if lr_obj:
                lr_obj.is_billed = False

        voucher.payment_status = "VOID"

    # If this is a Receipt or Payment Voucher, unallocate from linked invoice/bill(s)
    if voucher.voucher_type in [VoucherType.CREDIT_NOTE.value, VoucherType.DEBIT_NOTE.value]:
        alloc_stmt = select(BillAllocation).where(BillAllocation.voucher_id == voucher.id)
        alloc_res = await session.execute(alloc_stmt)
        allocations = alloc_res.scalars().all()
        cat = getattr(voucher, "note_category", None) or ""
        for alloc in allocations:
            inv_stmt = select(Voucher).where(Voucher.id == alloc.invoice_id)
            inv_res = await session.execute(inv_stmt)
            target = inv_res.scalar_one_or_none()
            if not target:
                continue
            if voucher.voucher_type == VoucherType.CREDIT_NOTE.value:
                if cat == "PURCHASE_CREDIT_NOTE":
                    target.balance_amount = max(Decimal("0.00"), (target.balance_amount or Decimal("0.00")) - voucher.net_amount)
                else:
                    target.paid_amount = max(Decimal("0.00"), (target.paid_amount or Decimal("0.00")) - alloc.allocated_amount)
                    target.balance_amount = min(target.net_amount, (target.balance_amount or Decimal("0.00")) + alloc.allocated_amount)
                    target.payment_status = "UNPAID" if target.balance_amount == target.net_amount else "PARTIAL"
            elif voucher.voucher_type == VoucherType.DEBIT_NOTE.value:
                if cat == "SALES_DEBIT_NOTE":
                    target.balance_amount = max(Decimal("0.00"), (target.balance_amount or Decimal("0.00")) - voucher.net_amount)
                else:
                    target.paid_amount = max(Decimal("0.00"), (target.paid_amount or Decimal("0.00")) - alloc.allocated_amount)
                    target.balance_amount = min(target.net_amount, (target.balance_amount or Decimal("0.00")) + alloc.allocated_amount)
                    target.payment_status = "UNPAID" if target.balance_amount == target.net_amount else "PARTIAL"

    if voucher.voucher_type in [VoucherType.RECEIPT_VOUCHER.value, VoucherType.PAYMENT_VOUCHER.value, VoucherType.PAYMENT_ATH.value, VoucherType.PAYMENT_BTH.value]:
        alloc_stmt = select(BillAllocation).where(BillAllocation.voucher_id == voucher.id)
        alloc_res = await session.execute(alloc_stmt)
        allocations = alloc_res.scalars().all()
        for alloc in allocations:
            inv_stmt = select(Voucher).where(Voucher.id == alloc.invoice_id)
            inv_res = await session.execute(inv_stmt)
            inv = inv_res.scalar_one_or_none()
            if inv:
                inv.paid_amount = max(Decimal("0.00"), (inv.paid_amount or Decimal("0.00")) - alloc.total_settled)
                inv.balance_amount = min(inv.net_amount, (inv.balance_amount or Decimal("0.00")) + alloc.total_settled)
                if inv.paid_amount == Decimal("0.00"):
                    inv.payment_status = "UNPAID"
                else:
                    inv.payment_status = "PARTIALLY_PAID"

        # If linked to a Hire Challan, restore its advance and balance amounts
        if voucher.hire_challan_id:
            hc_stmt = select(HireChallan).where(HireChallan.id == voucher.hire_challan_id)
            hc_res = await session.execute(hc_stmt)
            hc_obj = hc_res.scalar_one_or_none()
            if hc_obj:
                hc_obj.advance_amount = max(Decimal("0.00"), (hc_obj.advance_amount or Decimal("0.00")) - voucher.net_amount)
                hc_obj.balance_amount = min(hc_obj.hire_rate or Decimal("0.00"), (hc_obj.balance_amount or Decimal("0.00")) + voucher.net_amount)
                if hc_obj.balance_amount > Decimal("0.00"):
                    hc_obj.status = "ISSUED"

    # Mark voucher as void
    voucher.is_void = True
    voucher.void_reason = data.void_reason
    voucher.voided_at = datetime.now(timezone.utc)
    voucher.voided_by = user_id

    # Create exact reversing ledger entries
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
    return await get_voucher_by_id(session, v_id)


# ==============================================================================
# Company Bank Accounts Management & Accounting Integration
# ==============================================================================

INDIAN_BANKS_MAP: Dict[str, str] = {
    "HDFC": "HDFC Bank",
    "SBIN": "State Bank of India",
    "ICIC": "ICICI Bank",
    "UTIB": "Axis Bank",
    "KKBK": "Kotak Mahindra Bank",
    "PUNB": "Punjab National Bank",
    "BARB": "Bank of Baroda",
    "CNRB": "Canara Bank",
    "UBIN": "Union Bank of India",
    "IDIB": "Indian Bank",
    "IOBA": "Indian Overseas Bank",
    "MAHB": "Bank of Maharashtra",
    "PSIB": "Punjab & Sind Bank",
    "UCOB": "UCO Bank",
    "CUBK": "City Union Bank",
    "CSBK": "CSB Bank",
    "DCBL": "DCB Bank",
    "FDRL": "Federal Bank",
    "IDFB": "IDFC First Bank",
    "INDB": "IndusInd Bank",
    "JAKA": "Jammu & Kashmir Bank",
    "KVBL": "Karur Vysya Bank",
    "RATN": "RBL Bank",
    "SIBL": "South Indian Bank",
    "TMBL": "Tamilnad Mercantile Bank",
    "YESB": "Yes Bank",
}


def mask_account_number(account_number: Optional[str]) -> str:
    if not account_number:
        return ""
    num = str(account_number).strip()
    return f"XXXX{num[-4:]}" if len(num) >= 4 else num


def validate_ifsc_code(ifsc: str) -> bool:
    if not ifsc:
        return False
    return bool(re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifsc.strip().upper()))


async def lookup_ifsc(ifsc: str) -> schemas.IFSCDetailsResponse:
    clean_ifsc = (ifsc or "").strip().upper()
    if not validate_ifsc_code(clean_ifsc):
        return schemas.IFSCDetailsResponse(
            ifsc=clean_ifsc,
            bank_name="",
            branch_name="",
            is_valid=False,
        )

    prefix = clean_ifsc[:4]
    guessed_bank = INDIAN_BANKS_MAP.get(prefix, f"{prefix} Bank")

    # Attempt live Razorpay IFSC lookup if network is reachable
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"https://ifsc.razorpay.com/{clean_ifsc}")
            if resp.status_code == 200:
                data = resp.json()
                return schemas.IFSCDetailsResponse(
                    ifsc=clean_ifsc,
                    bank_name=data.get("BANK") or guessed_bank,
                    branch_name=data.get("BRANCH"),
                    address=data.get("ADDRESS"),
                    city=data.get("CITY"),
                    state=data.get("STATE"),
                    micr=data.get("MICR"),
                    is_valid=True,
                )
    except Exception as exc:
        logger.debug("IFSC remote lookup skipped: %s", exc)

    return schemas.IFSCDetailsResponse(
        ifsc=clean_ifsc,
        bank_name=guessed_bank,
        branch_name=f"Branch {clean_ifsc[5:]}",
        is_valid=True,
    )


async def calculate_bank_account_balance(
    session: AsyncSession,
    account_id: int,
    account: Optional[Account] = None,
) -> Tuple[Decimal, str, Decimal, Decimal]:
    """
    Computes live running double-entry balance, total debit, and total credit.
    """
    if not account:
        account = await session.get(Account, account_id)
        if not account:
            return Decimal("0.00"), "DR", Decimal("0.00"), Decimal("0.00")

    le_stmt = select(
        func.coalesce(func.sum(LedgerEntry.debit_amount), Decimal("0.00")),
        func.coalesce(func.sum(LedgerEntry.credit_amount), Decimal("0.00")),
    ).where(
        LedgerEntry.account_id == account_id,
        LedgerEntry.is_reversal == False,
    )
    le_res = await session.execute(le_stmt)
    tot_dr, tot_cr = le_res.one()

    open_bal = Decimal(str(account.opening_balance or "0.00"))
    open_dr = open_bal if account.opening_balance_type == "DR" else Decimal("0.00")
    open_cr = open_bal if account.opening_balance_type == "CR" else Decimal("0.00")

    net_bal = (open_dr + tot_dr) - (open_cr + tot_cr)
    if net_bal >= Decimal("0.00"):
        return net_bal, "DR", tot_dr, tot_cr
    else:
        return abs(net_bal), "CR", tot_dr, tot_cr


async def get_default_bank_account_for_office(
    session: AsyncSession,
    office_id: int,
) -> Optional[CompanyBankAccount]:
    """
    Auto-select default company bank account for an issuing office.
    """
    # 1. Direct active default bank account for this office
    stmt = (
        select(CompanyBankAccount)
        .options(selectinload(CompanyBankAccount.account))
        .where(
            CompanyBankAccount.issuing_office_id == office_id,
            CompanyBankAccount.is_active == True,
            CompanyBankAccount.is_default == True,
        )
    )
    res = await session.execute(stmt)
    account = res.scalar_one_or_none()
    if account:
        return account

    # 2. First active bank account for this office
    stmt_any = (
        select(CompanyBankAccount)
        .options(selectinload(CompanyBankAccount.account))
        .where(
            CompanyBankAccount.issuing_office_id == office_id,
            CompanyBankAccount.is_active == True,
        )
        .order_by(CompanyBankAccount.id.asc())
    )
    res_any = await session.execute(stmt_any)
    account = res_any.scalars().first()
    if account:
        return account

    # 3. Head office default bank account as fallback
    ho_stmt = (
        select(CompanyBankAccount)
        .join(Branch, CompanyBankAccount.issuing_office_id == Branch.id)
        .options(selectinload(CompanyBankAccount.account))
        .where(
            Branch.is_head_office == True,
            CompanyBankAccount.is_active == True,
        )
        .order_by(CompanyBankAccount.is_default.desc(), CompanyBankAccount.id.asc())
    )
    ho_res = await session.execute(ho_stmt)
    return ho_res.scalars().first()


async def list_company_bank_accounts(
    session: AsyncSession,
    office_id: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    account_type: Optional[str] = None,
    bank_name: Optional[str] = None,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> List[schemas.CompanyBankAccountResponse]:
    """
    List company bank accounts with office isolation, masked numbers, and live double-entry balances.
    """
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
    bank_accounts = res.scalars().all()

    items: List[schemas.CompanyBankAccountResponse] = []
    for ba in bank_accounts:
        cur_bal, bal_type, tot_dr, tot_cr = await calculate_bank_account_balance(
            session, ba.account_id, ba.account
        )

        items.append(
            schemas.CompanyBankAccountResponse(
                id=ba.id,
                bank_name=ba.bank_name,
                custom_bank_name=ba.custom_bank_name,
                account_holder_name=ba.account_holder_name,
                account_number_masked=mask_account_number(ba.account_number),
                account_number=ba.account_number if is_admin else None,
                account_type=ba.account_type,
                ifsc_code=ba.ifsc_code,
                branch_name=ba.branch_name,
                branch_address=ba.branch_address,
                micr_code=ba.micr_code,
                upi_id=ba.upi_id,
                currency=ba.currency,
                issuing_office_id=ba.issuing_office_id,
                issuing_office_name=ba.issuing_office.name if ba.issuing_office else None,
                issuing_office_code=ba.issuing_office.code if ba.issuing_office else None,
                is_default=ba.is_default,
                account_id=ba.account_id,
                ledger_name=ba.ledger_name,
                ledger_group=ba.ledger_group,
                opening_balance=ba.opening_balance,
                opening_balance_date=ba.opening_balance_date,
                opening_balance_type=ba.opening_balance_type,
                current_balance=cur_bal,
                balance_type=bal_type,
                total_debit=tot_dr,
                total_credit=tot_cr,
                reconciliation_start_date=ba.reconciliation_start_date,
                is_active=ba.is_active,
                created_at=ba.created_at,
                updated_at=ba.updated_at,
            )
        )

    return items


async def get_company_bank_account(
    session: AsyncSession,
    bank_account_id: int,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> schemas.CompanyBankAccountResponse:
    stmt = (
        select(CompanyBankAccount)
        .options(
            selectinload(CompanyBankAccount.issuing_office),
            selectinload(CompanyBankAccount.account),
        )
        .where(CompanyBankAccount.id == bank_account_id)
    )
    res = await session.execute(stmt)
    ba = res.scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company Bank Account not found")

    if not is_admin and user_office_ids is not None and ba.issuing_office_id not in user_office_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access bank accounts of this issuing office.",
        )

    cur_bal, bal_type, tot_dr, tot_cr = await calculate_bank_account_balance(
        session, ba.account_id, ba.account
    )

    return schemas.CompanyBankAccountResponse(
        id=ba.id,
        bank_name=ba.bank_name,
        custom_bank_name=ba.custom_bank_name,
        account_holder_name=ba.account_holder_name,
        account_number_masked=mask_account_number(ba.account_number),
        account_number=ba.account_number,
        account_type=ba.account_type,
        ifsc_code=ba.ifsc_code,
        branch_name=ba.branch_name,
        branch_address=ba.branch_address,
        micr_code=ba.micr_code,
        upi_id=ba.upi_id,
        currency=ba.currency,
        issuing_office_id=ba.issuing_office_id,
        issuing_office_name=ba.issuing_office.name if ba.issuing_office else None,
        issuing_office_code=ba.issuing_office.code if ba.issuing_office else None,
        is_default=ba.is_default,
        account_id=ba.account_id,
        ledger_name=ba.ledger_name,
        ledger_group=ba.ledger_group,
        opening_balance=ba.opening_balance,
        opening_balance_date=ba.opening_balance_date,
        opening_balance_type=ba.opening_balance_type,
        current_balance=cur_bal,
        balance_type=bal_type,
        total_debit=tot_dr,
        total_credit=tot_cr,
        reconciliation_start_date=ba.reconciliation_start_date,
        is_active=ba.is_active,
        created_at=ba.created_at,
        updated_at=ba.updated_at,
    )


async def create_company_bank_account(
    session: AsyncSession,
    data: schemas.CompanyBankAccountCreate,
    user_id: Optional[int] = None,
) -> schemas.CompanyBankAccountResponse:
    await ensure_standard_accounts(session)

    # 1. Validate IFSC
    clean_ifsc = (data.ifsc_code or "").strip().upper()
    if not validate_ifsc_code(clean_ifsc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid IFSC Code format. Must be 11 characters (4 alphabetic, 0, 6 alphanumeric). Example: HDFC0001234",
        )

    # 2. Confirm Bank Account Number validation
    clean_acc_num = str(data.account_number or "").strip()
    if not clean_acc_num:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bank account number cannot be empty.",
        )
    if data.confirm_account_number and data.confirm_account_number.strip() != clean_acc_num:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account number and confirmation account number do not match.",
        )

    # 3. Check for Duplicate Active Account
    dup_stmt = select(CompanyBankAccount).where(
        CompanyBankAccount.account_number == clean_acc_num,
        CompanyBankAccount.bank_name == data.bank_name.strip(),
        CompanyBankAccount.is_active == True,
    )
    existing_ba = (await session.execute(dup_stmt)).scalar_one_or_none()
    if existing_ba:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An active bank account with number '{clean_acc_num}' at {data.bank_name} already exists.",
        )

    # 4. Validate Issuing Office
    office = await session.get(Branch, data.issuing_office_id)
    if not office or not office.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified issuing office does not exist or is inactive.",
        )

    # 5. Determine Tally-style Accounting Group
    is_od = data.account_type in ("Overdraft", "Cash Credit")
    target_group_code = "BANK_OD" if is_od else "BANK"
    grp_stmt = select(GroupInPrimary).where(GroupInPrimary.code == target_group_code)
    grp = (await session.execute(grp_stmt)).scalar_one_or_none()
    if not grp:
        grp = (await session.execute(select(GroupInPrimary).where(GroupInPrimary.code == "BANK"))).scalar_one_or_none()
        group_id = grp.id if grp else 1
        group_name = grp.name if grp else "Bank Accounts"
    else:
        group_id = grp.id
        group_name = grp.name

    # 6. Automatic Unique Ledger Creation
    last4 = clean_acc_num[-4:] if len(clean_acc_num) >= 4 else clean_acc_num
    ledger_name = (data.ledger_name or "").strip() or f"{data.bank_name} - {office.name} ({last4})"

    # Generate unique account code
    bank_slug = re.sub(r"[^A-Z0-9]", "", data.bank_name.upper())[:4] or "BANK"
    office_slug = re.sub(r"[^A-Z0-9]", "", (office.code or office.name).upper())[:4] or "OFF"
    base_code = f"ACC_{bank_slug}_{office_slug}_{last4}"
    acc_code = base_code
    suffix = 1
    while True:
        existing_acc = await get_account_by_code(session, acc_code)
        if not existing_acc:
            break
        acc_code = f"{base_code}_{suffix}"
        suffix += 1

    open_bal = Decimal(str(data.opening_balance or "0.00"))
    open_type = data.opening_balance_type or ("CR" if is_od else "DR")

    new_account = Account(
        name=ledger_name,
        code=acc_code,
        group_id=group_id,
        opening_balance=open_bal,
        opening_balance_type=open_type,
        is_active=data.is_active,
    )
    session.add(new_account)
    await session.flush()

    # 7. Default Account Management per Issuing Office
    should_be_default = data.is_default
    if should_be_default:
        await session.execute(
            update(CompanyBankAccount)
            .where(CompanyBankAccount.issuing_office_id == data.issuing_office_id)
            .values(is_default=False)
        )
    else:
        count_stmt = select(func.count(CompanyBankAccount.id)).where(
            CompanyBankAccount.issuing_office_id == data.issuing_office_id,
            CompanyBankAccount.is_active == True,
        )
        existing_count = (await session.execute(count_stmt)).scalar() or 0
        if existing_count == 0:
            should_be_default = True

    # 8. Create CompanyBankAccount record
    ba = CompanyBankAccount(
        bank_name=data.bank_name.strip(),
        custom_bank_name=(data.custom_bank_name or "").strip() or None,
        account_holder_name=data.account_holder_name.strip(),
        account_number=clean_acc_num,
        account_type=data.account_type,
        ifsc_code=clean_ifsc,
        branch_name=(data.branch_name or "").strip() or None,
        branch_address=(data.branch_address or "").strip() or None,
        micr_code=(data.micr_code or "").strip() or None,
        upi_id=(data.upi_id or "").strip() or None,
        currency=data.currency or "INR",
        issuing_office_id=data.issuing_office_id,
        is_default=should_be_default,
        account_id=new_account.id,
        ledger_name=ledger_name,
        ledger_group=group_name,
        opening_balance=open_bal,
        opening_balance_date=data.opening_balance_date,
        opening_balance_type=open_type,
        reconciliation_start_date=data.reconciliation_start_date,
        is_active=data.is_active,
        created_by_id=user_id,
        updated_by_id=user_id,
    )
    session.add(ba)
    await session.commit()
    await session.refresh(ba)

    return await get_company_bank_account(session, ba.id, is_admin=True)


async def update_company_bank_account(
    session: AsyncSession,
    bank_account_id: int,
    data: schemas.CompanyBankAccountUpdate,
    user_id: Optional[int] = None,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> schemas.CompanyBankAccountResponse:
    ba = await session.get(CompanyBankAccount, bank_account_id)
    if not ba:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company Bank Account not found")

    if not is_admin and user_office_ids is not None and ba.issuing_office_id not in user_office_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update bank accounts of this issuing office.",
        )

    account = await session.get(Account, ba.account_id)

    if data.bank_name is not None:
        ba.bank_name = data.bank_name.strip()
    if data.custom_bank_name is not None:
        ba.custom_bank_name = data.custom_bank_name.strip() or None
    if data.account_holder_name is not None:
        ba.account_holder_name = data.account_holder_name.strip()
    if data.ifsc_code is not None:
        clean_ifsc = data.ifsc_code.strip().upper()
        if not validate_ifsc_code(clean_ifsc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid IFSC Code format.")
        ba.ifsc_code = clean_ifsc
    if data.branch_name is not None:
        ba.branch_name = data.branch_name.strip() or None
    if data.branch_address is not None:
        ba.branch_address = data.branch_address.strip() or None
    if data.micr_code is not None:
        ba.micr_code = data.micr_code.strip() or None
    if data.upi_id is not None:
        ba.upi_id = data.upi_id.strip() or None
    if data.currency is not None:
        ba.currency = data.currency
    if data.reconciliation_start_date is not None:
        ba.reconciliation_start_date = data.reconciliation_start_date

    if data.issuing_office_id is not None and data.issuing_office_id != ba.issuing_office_id:
        office = await session.get(Branch, data.issuing_office_id)
        if not office or not office.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or inactive issuing office.")
        ba.issuing_office_id = data.issuing_office_id

    if data.is_default is True and not ba.is_default:
        await session.execute(
            update(CompanyBankAccount)
            .where(
                CompanyBankAccount.issuing_office_id == ba.issuing_office_id,
                CompanyBankAccount.id != ba.id,
            )
            .values(is_default=False)
        )
        ba.is_default = True
    elif data.is_default is False and ba.is_default:
        ba.is_default = False

    if data.is_active is not None:
        ba.is_active = data.is_active
        if account:
            account.is_active = data.is_active

    if data.ledger_name is not None and data.ledger_name.strip():
        ba.ledger_name = data.ledger_name.strip()
        if account:
            account.name = data.ledger_name.strip()

    if data.account_type is not None and data.account_type != ba.account_type:
        ba.account_type = data.account_type
        is_od = data.account_type in ("Overdraft", "Cash Credit")
        target_group_code = "BANK_OD" if is_od else "BANK"
        grp = (await session.execute(select(GroupInPrimary).where(GroupInPrimary.code == target_group_code))).scalar_one_or_none()
        if grp:
            ba.ledger_group = grp.name
            if account:
                account.group_id = grp.id

    if data.opening_balance is not None:
        ba.opening_balance = data.opening_balance
        if account:
            account.opening_balance = data.opening_balance
    if data.opening_balance_type is not None:
        ba.opening_balance_type = data.opening_balance_type
        if account:
            account.opening_balance_type = data.opening_balance_type
    if data.opening_balance_date is not None:
        ba.opening_balance_date = data.opening_balance_date

    ba.updated_by_id = user_id
    await session.commit()
    await session.refresh(ba)

    return await get_company_bank_account(session, ba.id, is_admin=True)


async def toggle_bank_account_status(
    session: AsyncSession,
    bank_account_id: int,
    user_id: Optional[int] = None,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> schemas.CompanyBankAccountResponse:
    ba = await session.get(CompanyBankAccount, bank_account_id)
    if not ba:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company Bank Account not found")

    if not is_admin and user_office_ids is not None and ba.issuing_office_id not in user_office_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    ba.is_active = not ba.is_active
    account = await session.get(Account, ba.account_id)
    if account:
        account.is_active = ba.is_active

    if not ba.is_active and ba.is_default:
        ba.is_default = False
        other_ba = (
            await session.execute(
                select(CompanyBankAccount).where(
                    CompanyBankAccount.issuing_office_id == ba.issuing_office_id,
                    CompanyBankAccount.id != ba.id,
                    CompanyBankAccount.is_active == True,
                )
            )
        ).scalars().first()
        if other_ba:
            other_ba.is_default = True

    ba.updated_by_id = user_id
    await session.commit()
    await session.refresh(ba)

    return await get_company_bank_account(session, ba.id, is_admin=True)


async def set_default_bank_account(
    session: AsyncSession,
    bank_account_id: int,
    user_id: Optional[int] = None,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> schemas.CompanyBankAccountResponse:
    ba = await session.get(CompanyBankAccount, bank_account_id)
    if not ba:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company Bank Account not found")

    if not ba.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot set an inactive bank account as default.")

    if not is_admin and user_office_ids is not None and ba.issuing_office_id not in user_office_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    await session.execute(
        update(CompanyBankAccount)
        .where(
            CompanyBankAccount.issuing_office_id == ba.issuing_office_id,
            CompanyBankAccount.id != ba.id,
        )
        .values(is_default=False)
    )

    ba.is_default = True
    ba.updated_by_id = user_id
    await session.commit()
    await session.refresh(ba)

    return await get_company_bank_account(session, ba.id, is_admin=True)


async def delete_company_bank_account(
    session: AsyncSession,
    bank_account_id: int,
    user_id: Optional[int] = None,
    user_office_ids: Optional[List[int]] = None,
    is_admin: bool = True,
) -> Dict[str, Any]:
    ba = await session.get(CompanyBankAccount, bank_account_id)
    if not ba:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company Bank Account not found")

    if not is_admin and user_office_ids is not None and ba.issuing_office_id not in user_office_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    le_cnt = (
        await session.execute(
            select(func.count(LedgerEntry.id)).where(LedgerEntry.account_id == ba.account_id)
        )
    ).scalar() or 0

    v_cnt = (
        await session.execute(
            select(func.count(Voucher.id)).where(Voucher.company_bank_account_id == ba.id)
        )
    ).scalar() or 0

    if le_cnt > 0 or v_cnt > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete Bank Account with existing accounting transactions. Deactivate the account instead to preserve ledger audit trail.",
        )

    acc_id = ba.account_id
    await session.delete(ba)
    if acc_id:
        acc = await session.get(Account, acc_id)
        if acc:
            await session.delete(acc)

    await session.commit()
    return {"status": "SUCCESS", "message": "Bank account and associated unused ledger deleted successfully."}
