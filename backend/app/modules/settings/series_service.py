import logging
from typing import Optional, List, Dict, Any
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.models import SeriesMaster, SeriesCategory
from app.core.errors import AppException

logger = logging.getLogger(__name__)

MANDATORY_MANUAL_DOC_TYPES = {
    "LR",
    "HIRE_CHALLAN",
    "HC",
    "GENERAL_INVOICE",
    "TRANSPORT_INVOICE",
}

DOC_TYPE_ALIASES = {
    "HC": "HIRE_CHALLAN",
    "HIRE_CHALLAN": "HIRE_CHALLAN",
    "LR": "LR",
    "INVOICE": "TRANSPORT_INVOICE",
    "TRANSPORT_INVOICE": "TRANSPORT_INVOICE",
    "GENERAL_INVOICE": "GENERAL_INVOICE",
    "ATH_PAYMENT": "PAYMENT_ATH",
    "BTH_PAYMENT": "PAYMENT_BTH",
    "JV": "GENERAL_VOUCHER",
}

# Complete catalog of all 15 voucher & document types across Panther TMS
STANDARD_VOUCHER_METADATA: List[Dict[str, Any]] = [
    # 1. Transport Documents (Mandatory Manual)
    {
        "document_type": "LR",
        "name": "Lorry Receipt (GR / LR)",
        "category_code": "TRANSPORT",
        "category_name": "Transport Documents",
        "prefix": "LR-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 85,
        "series_mode": "MANUAL",
        "is_mandatory_manual": True,
        "description": "Consignment note issued to shipper / consignee for cargo transit.",
    },
    {
        "document_type": "HIRE_CHALLAN",
        "name": "Truck Hire Challan (HC)",
        "category_code": "TRANSPORT",
        "category_name": "Transport Documents",
        "prefix": "HC-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 57,
        "series_mode": "MANUAL",
        "is_mandatory_manual": True,
        "description": "Lorry hire contract slip issued to market truck owner / driver.",
    },
    # 2. Billing & Invoicing (Mandatory Manual for TI & GI)
    {
        "document_type": "TRANSPORT_INVOICE",
        "name": "Transport / Freight Invoice",
        "category_code": "BILLING",
        "category_name": "Customer Invoicing",
        "prefix": "TI-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 43,
        "series_mode": "MANUAL",
        "is_mandatory_manual": True,
        "description": "Tax invoice issued for freight charges linked to delivered LRs.",
    },
    {
        "document_type": "GENERAL_INVOICE",
        "name": "General Commercial Invoice",
        "category_code": "BILLING",
        "category_name": "Customer Invoicing",
        "prefix": "GI-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 10,
        "series_mode": "MANUAL",
        "is_mandatory_manual": True,
        "description": "Direct sales & services invoice with balanced double-entry ledger postings.",
    },
    {
        "document_type": "PROFORMA_INVOICE",
        "name": "Proforma Invoice",
        "category_code": "BILLING",
        "category_name": "Customer Invoicing",
        "prefix": "PI-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 5,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Preliminary quotation / proforma invoice for advance billing estimation.",
    },
    # 3. Accounts & Double-Entry Vouchers (Automatic by default)
    {
        "document_type": "NORMAL_PURCHASE",
        "name": "Purchase Invoice (Operational / Spares)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "NP-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 20,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Vendor purchase invoice for fuel, tyres, lubricants, and spare parts.",
    },
    {
        "document_type": "GENERAL_PURCHASE",
        "name": "General Purchase (Admin / Expense)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "GP-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 8,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "General expense billings (office rent, utilities, legal fees).",
    },
    {
        "document_type": "RECEIPT_VOUCHER",
        "name": "Receipt Voucher (Customer / Cash-Bank)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "RV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 29,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Customer payments received via NEFT, RTGS, Cheque, or Cash.",
    },
    {
        "document_type": "PAYMENT_VOUCHER",
        "name": "Payment Voucher (Vendor / General)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "PV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 15,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "General vendor and supplier payments made from company bank accounts.",
    },
    {
        "document_type": "PAYMENT_ATH",
        "name": "Advance To Hired (ATH Payment)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "ATH-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 25,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Truck hire trip advance disbursed to vehicle owner / driver.",
    },
    {
        "document_type": "PAYMENT_BTH",
        "name": "Balance To Hired (BTH Settlement)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "BTH-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 18,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Final balance settlement paid to hired truck owner upon POD receipt.",
    },
    {
        "document_type": "CREDIT_NOTE",
        "name": "Credit Note",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "CN-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 4,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Credit adjustment issued to customer for freight rebate or discount.",
    },
    {
        "document_type": "DEBIT_NOTE",
        "name": "Debit Note",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "DN-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 3,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Debit adjustment issued to vendor or transporter for shortage / penalty.",
    },
    {
        "document_type": "GENERAL_VOUCHER",
        "name": "Journal Voucher (General Journal)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "JV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 6,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "General non-cash double-entry adjustment voucher.",
    },
    {
        "document_type": "CONTRA_VOUCHER",
        "name": "Contra Voucher (Bank-Cash Transfer)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "CV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 7,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Internal fund transfer between company bank accounts and cash drawers.",
    },
]


def format_series_number(prefix: str, num: int, suffix: Optional[str] = "") -> str:
    s = suffix or ""
    return f"{prefix}{num:04d}{s}"


def compute_series_display_data(s: SeriesMaster) -> Dict[str, Any]:
    """
    Computes formatted last used series and formatted next series number.
    """
    start_num = s.starting_number if s.starting_number is not None else 1
    curr_num = s.current_number if s.current_number is not None else 0
    prefix = s.prefix or ""
    suffix = s.suffix or ""

    if curr_num >= start_num:
        last_used_fmt = format_series_number(prefix, curr_num, suffix)
        next_num = curr_num + 1
    else:
        last_used_fmt = None
        next_num = start_num

    next_num_fmt = format_series_number(prefix, next_num, suffix)
    norm_doc = DOC_TYPE_ALIASES.get(s.document_type.upper().strip(), s.document_type.upper().strip())
    is_mandatory = norm_doc in MANDATORY_MANUAL_DOC_TYPES

    return {
        "last_used_formatted": last_used_fmt,
        "next_number": next_num,
        "next_number_formatted": next_num_fmt,
        "is_mandatory_manual": is_mandatory,
        "series_mode": s.series_mode or ("MANUAL" if is_mandatory else "AUTOMATIC"),
    }


_VERIFIED_SERIES_DBS = set()


async def ensure_series_table_schema(db: AsyncSession) -> None:
    """
    Safely ensures the Series tables and series_mode column exist in tenant database.
    Works transparently with Postgres and SQLite without leaving aborted transactions.
    Caches verified databases to eliminate redundant DDL on subsequent requests.
    """
    bind = db.get_bind()
    db_name = getattr(getattr(bind, "url", None), "database", None) or "default"
    if db_name in _VERIFIED_SERIES_DBS:
        return

    try:
        conn = await db.connection()
        from app.tenant_db.base import TenantBase
        await conn.run_sync(TenantBase.metadata.create_all)

        if bind.dialect.name == "postgresql":
            await db.execute(text("ALTER TABLE settings_series_masters ADD COLUMN IF NOT EXISTS series_mode VARCHAR(20) DEFAULT 'AUTOMATIC';"))
        elif bind.dialect.name == "sqlite":
            res = await db.execute(text("PRAGMA table_info(settings_series_masters);"))
            cols = [r[1] for r in res.fetchall()]
            if "series_mode" not in cols:
                await db.execute(text("ALTER TABLE settings_series_masters ADD COLUMN series_mode VARCHAR(20) DEFAULT 'AUTOMATIC';"))
        await db.commit()
        _VERIFIED_SERIES_DBS.add(db_name)
    except Exception as e:
        logger.warning(f"ensure_series_table_schema notice: {e}")
        try:
            await db.rollback()
        except Exception:
            pass


async def allocate_or_validate_voucher_number(
    db: AsyncSession,
    document_type: str,
    manual_number: Optional[str] = None,
    financial_year: str = "2026-2027",
) -> str:
    """
    Allocates the voucher number according to configured SeriesMaster.
    - If document requires mandatory manual series and none is configured, raises AppException (400).
    - If configured as MANUAL: validates/formats provided manual sequence or auto-picks next number,
      and updates SeriesMaster current_number.
    - If configured as AUTOMATIC: auto-increments current_number and formats number with Prefix and Postfix.
    """
    raw_doc = document_type.upper().strip()
    norm_type = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    is_mandatory_manual = norm_type in MANDATORY_MANUAL_DOC_TYPES

    # Find active series for this document_type
    stmt = (
        select(SeriesMaster)
        .where(
            SeriesMaster.document_type.in_([norm_type, raw_doc]),
            SeriesMaster.is_active == True,
        )
        .order_by(SeriesMaster.id.desc())
    )
    res = await db.execute(stmt)
    series = res.scalars().first()

    # Rule: LR, HC, General Invoice, Transport Invoice mandatory manual check
    if is_mandatory_manual and not series:
        readable_title = norm_type.replace("_", " ").title()
        raise AppException(
            status_code=400,
            error_code="MANUAL_SERIES_NOT_CONFIGURED",
            message=(
                f"Manual series is mandatory for {readable_title} and is not configured in Series Master. "
                "Please configure the desired Prefix, Postfix, and manual sequence in Settings > Series Master before creating this voucher."
            ),
        )

    # If series is found, apply rules
    if series:
        # Enforce manual mode if mandatory
        if is_mandatory_manual and series.series_mode != "MANUAL":
            series.series_mode = "MANUAL"

        mode = (series.series_mode or "AUTOMATIC").upper().strip()
        prefix = series.prefix or ""
        suffix = series.suffix or ""
        start_num = series.starting_number or 1

        if mode == "MANUAL":
            if manual_number and manual_number.strip():
                clean_val = manual_number.strip()
                # If user entered just sequence digits (e.g. "86" or "104")
                if clean_val.isdigit():
                    num_val = int(clean_val)
                    final_number = format_series_number(prefix, num_val, suffix)
                    if num_val > series.current_number:
                        series.current_number = num_val
                else:
                    # Check if already formatted with prefix & suffix
                    temp = clean_val
                    if not temp.startswith(prefix):
                        temp = f"{prefix}{temp}"
                    if suffix and not temp.endswith(suffix):
                        temp = f"{temp}{suffix}"
                    final_number = temp

                    # Extract digits to update current_number if it advances sequence
                    digits = "".join(filter(str.isdigit, clean_val))
                    if digits:
                        try:
                            num_val = int(digits)
                            if num_val > series.current_number:
                                series.current_number = num_val
                        except ValueError:
                            pass
            else:
                # Manual mode, but no manual number provided: assign next sequence number
                next_num = series.current_number + 1 if series.current_number >= start_num else start_num
                final_number = format_series_number(prefix, next_num, suffix)
                series.current_number = next_num
        else:
            # AUTOMATIC Mode
            if manual_number and manual_number.strip():
                # Allow override if provided
                clean_val = manual_number.strip()
                final_number = clean_val
                digits = "".join(filter(str.isdigit, clean_val))
                if digits:
                    try:
                        num_val = int(digits)
                        if num_val > series.current_number:
                            series.current_number = num_val
                    except ValueError:
                        pass
            else:
                next_num = series.current_number + 1 if series.current_number >= start_num else start_num
                final_number = format_series_number(prefix, next_num, suffix)
                series.current_number = next_num

        # Check end number bounds if configured
        if series.end_number and series.current_number > series.end_number:
            raise AppException(
                status_code=400,
                error_code="SERIES_EXHAUSTED",
                message=f"Series sequence for {norm_type} has reached its configured limit ({series.end_number}).",
            )

        db.add(series)
        await db.flush()
        return final_number

    # Fallback for optional voucher types if not configured
    next_num = 1
    return f"{raw_doc[:3]}-2026-{next_num:04d}"


async def check_series_status(db: AsyncSession, document_type: str) -> Dict[str, Any]:
    """
    Returns the series configuration and next available series number for a given document type.
    """
    raw_doc = document_type.upper().strip()
    norm_type = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    is_mandatory_manual = norm_type in MANDATORY_MANUAL_DOC_TYPES

    stmt = (
        select(SeriesMaster)
        .where(
            SeriesMaster.document_type.in_([norm_type, raw_doc]),
            SeriesMaster.is_active == True,
        )
        .order_by(SeriesMaster.id.desc())
    )
    res = await db.execute(stmt)
    series = res.scalars().first()

    if not series:
        readable_title = norm_type.replace("_", " ").title()
        return {
            "configured": False,
            "document_type": norm_type,
            "display_name": readable_title,
            "is_mandatory_manual": is_mandatory_manual,
            "series_mode": "MANUAL" if is_mandatory_manual else "AUTOMATIC",
            "message": f"Manual series is mandatory for {readable_title} and is not configured." if is_mandatory_manual else f"Series is not configured for {readable_title}.",
        }

    disp = compute_series_display_data(series)
    return {
        "configured": True,
        "id": series.id,
        "document_type": series.document_type,
        "display_name": norm_type.replace("_", " ").title(),
        "prefix": series.prefix,
        "suffix": series.suffix or "",
        "starting_number": series.starting_number,
        "current_number": series.current_number,
        "last_used_formatted": disp["last_used_formatted"],
        "next_number": disp["next_number"],
        "next_number_formatted": disp["next_number_formatted"],
        "financial_year": series.financial_year,
        "series_mode": disp["series_mode"],
        "is_mandatory_manual": disp["is_mandatory_manual"],
        "is_active": series.is_active,
    }


async def initialize_all_standard_series(db: AsyncSession, financial_year: str = "2026-2027") -> List[Dict[str, Any]]:
    """
    Initializes all 15 standard voucher series with their default prefix, postfix, and modes.
    """
    # 1. Ensure categories exist
    cat_map = {}
    categories = [
        {"code": "TRANSPORT", "name": "Transport Documents", "description": "LR, Hire Challan, POD, Dispatch"},
        {"code": "BILLING", "name": "Customer Invoicing", "description": "Transport Invoices, General Invoices, Proforma"},
        {"code": "ACCOUNTS", "name": "Accounting Vouchers", "description": "Purchases, Receipts, Payments, Notes, Contra"},
    ]
    for c in categories:
        existing_cat = (await db.execute(select(SeriesCategory).where(SeriesCategory.code == c["code"]))).scalar_one_or_none()
        if not existing_cat:
            cat_obj = SeriesCategory(
                name=c["name"],
                code=c["code"],
                description=c["description"],
                is_active=True,
            )
            db.add(cat_obj)
            await db.flush()
            cat_map[c["code"]] = cat_obj.id
        else:
            cat_map[c["code"]] = existing_cat.id

    # 2. Seed standard series
    created_list = []
    for meta in STANDARD_VOUCHER_METADATA:
        stmt = select(SeriesMaster).where(
            SeriesMaster.document_type == meta["document_type"],
            SeriesMaster.financial_year == financial_year,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            cat_id = cat_map.get(meta["category_code"])
            series_obj = SeriesMaster(
                category_id=cat_id,
                document_type=meta["document_type"],
                prefix=meta["prefix"],
                suffix=meta["suffix"],
                starting_number=meta["starting_number"],
                current_number=meta["current_number"],
                financial_year=financial_year,
                series_mode=meta["series_mode"],
                is_active=True,
            )
            db.add(series_obj)
            await db.flush()
            disp = compute_series_display_data(series_obj)
            created_list.append({
                "id": series_obj.id,
                "document_type": series_obj.document_type,
                "prefix": series_obj.prefix,
                "suffix": series_obj.suffix,
                "starting_number": series_obj.starting_number,
                "current_number": series_obj.current_number,
                "last_used_formatted": disp["last_used_formatted"],
                "next_number": disp["next_number"],
                "next_number_formatted": disp["next_number_formatted"],
                "financial_year": series_obj.financial_year,
                "series_mode": disp["series_mode"],
                "is_mandatory_manual": disp["is_mandatory_manual"],
                "is_active": True,
            })
    await db.commit()
    return created_list
