import logging
from typing import Optional, List, Dict, Any, Set, Tuple, Union
from sqlalchemy import select, text, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.models import SeriesMaster, SeriesCategory
from app.core.errors import AppException

logger = logging.getLogger(__name__)

MANDATORY_MANUAL_DOC_TYPES: Set[str] = set()

DOC_TYPE_ALIASES = {
    "JOB": "JOB",
    "JOB_ORDER": "JOB",
    "TRIP": "JOB",
    "TRIP_ORDER": "JOB",
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

# Complete catalog of all 16 voucher & document types across Panther TMS
STANDARD_VOUCHER_METADATA: List[Dict[str, Any]] = [
    # 1. Transport Operations Documents
    {
        "document_type": "JOB",
        "code": "JOB",
        "name": "Trip / Job Order (Job Creation)",
        "category_code": "TRANSPORT",
        "category_name": "Transport Documents",
        "prefix": "JOB-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Freight trip booking and load dispatch job order.",
    },
    {
        "document_type": "LR",
        "code": "LR",
        "name": "Lorry Receipt (GR / LR)",
        "category_code": "TRANSPORT",
        "category_name": "Transport Documents",
        "prefix": "LR-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Consignment note issued to shipper / consignee for cargo transit.",
    },
    {
        "document_type": "HIRE_CHALLAN",
        "code": "HC",
        "name": "Truck Hire Challan (HC)",
        "category_code": "TRANSPORT",
        "category_name": "Transport Documents",
        "prefix": "HC-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Lorry hire contract slip issued to market truck owner / driver.",
    },
    # 2. Billing & Invoicing
    {
        "document_type": "TRANSPORT_INVOICE",
        "code": "TI",
        "name": "Transport / Freight Invoice",
        "category_code": "BILLING",
        "category_name": "Customer Invoicing",
        "prefix": "TI-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Tax invoice issued for freight charges linked to delivered LRs.",
    },
    {
        "document_type": "GENERAL_INVOICE",
        "code": "GI",
        "name": "General Commercial Invoice",
        "category_code": "BILLING",
        "category_name": "Customer Invoicing",
        "prefix": "GI-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Direct sales & services invoice with balanced double-entry ledger postings.",
    },
    {
        "document_type": "PROFORMA_INVOICE",
        "code": "PI",
        "name": "Proforma Invoice",
        "category_code": "BILLING",
        "category_name": "Customer Invoicing",
        "prefix": "PI-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Preliminary quotation / proforma invoice for advance billing estimation.",
    },
    # 3. Accounts & Double-Entry Vouchers
    {
        "document_type": "NORMAL_PURCHASE",
        "code": "NP",
        "name": "Purchase Invoice (Operational / Spares)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "NP-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Vendor purchase invoice for fuel, tyres, lubricants, and spare parts.",
    },
    {
        "document_type": "GENERAL_PURCHASE",
        "code": "GP",
        "name": "General Purchase (Admin / Expense)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "GP-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "General expense billings (office rent, utilities, legal fees).",
    },
    {
        "document_type": "RECEIPT_VOUCHER",
        "code": "RV",
        "name": "Receipt Voucher (Customer / Cash-Bank)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "RV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Customer payments received via NEFT, RTGS, Cheque, or Cash.",
    },
    {
        "document_type": "PAYMENT_VOUCHER",
        "code": "PV",
        "name": "Payment Voucher (Vendor / General)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "PV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "General vendor and supplier payments made from company bank accounts.",
    },
    {
        "document_type": "PAYMENT_ATH",
        "code": "ATH",
        "name": "Advance To Hired (ATH Payment)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "ATH-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Truck hire trip advance disbursed to vehicle owner / driver.",
    },
    {
        "document_type": "PAYMENT_BTH",
        "code": "BTH",
        "name": "Balance To Hired (BTH Settlement)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "BTH-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Final balance settlement paid to hired truck owner upon POD receipt.",
    },
    {
        "document_type": "CREDIT_NOTE",
        "code": "CN",
        "name": "Credit Note",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "CN-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Credit adjustment issued to customer for freight rebate or discount.",
    },
    {
        "document_type": "DEBIT_NOTE",
        "code": "DN",
        "name": "Debit Note",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "DN-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Debit adjustment issued to vendor or transporter for shortage / penalty.",
    },
    {
        "document_type": "GENERAL_VOUCHER",
        "code": "JV",
        "name": "Journal Voucher (General Journal)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "JV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "General non-cash double-entry adjustment voucher.",
    },
    {
        "document_type": "CONTRA_VOUCHER",
        "code": "CV",
        "name": "Contra Voucher (Bank-Cash Transfer)",
        "category_code": "ACCOUNTS",
        "category_name": "Accounting Vouchers",
        "prefix": "CV-2026-",
        "suffix": "",
        "starting_number": 1,
        "current_number": 0,
        "series_mode": "AUTOMATIC",
        "is_mandatory_manual": False,
        "description": "Internal fund transfer between company bank accounts and cash drawers.",
    },
]


def format_series_number(prefix: str, num: int, suffix: Optional[str] = "") -> str:
    s = suffix or ""
    return f"{prefix}{num:04d}{s}"


def extract_sequence_number(voucher: str, prefix: str = "", suffix: str = "") -> Optional[int]:
    """
    Extracts the pure integer sequence number from a formatted voucher string.
    Properly strips prefix and suffix (e.g. 'LR-2026-0001' with prefix 'LR-2026-' yields 1, not 20260001).
    Also detects and heals legacy corrupted numbers where prefix digits were concatenated (e.g. 'LR-2026-20260002').
    """
    if not voucher:
        return None
    core = str(voucher).strip()
    if prefix and core.lower().startswith(prefix.lower()):
        core = core[len(prefix):]
    if suffix and core.lower().endswith(suffix.lower()):
        core = core[:-len(suffix)]

    digits = "".join(filter(str.isdigit, core))
    if not digits:
        import re
        match = re.search(r"(\d+)(?:[^\d]*)$", str(voucher))
        if match:
            digits = match.group(1)

    if digits:
        # Check if digits were accidentally prefixed with year/digits from the prefix (e.g. '20260002' when prefix had '2026')
        pref_digits = "".join(filter(str.isdigit, prefix))
        if pref_digits and digits.startswith(pref_digits) and len(digits) > len(pref_digits):
            remainder = digits[len(pref_digits):]
            if remainder and remainder.isdigit():
                try:
                    return int(remainder)
                except ValueError:
                    pass
        try:
            return int(digits)
        except ValueError:
            pass

    return None



async def get_real_voucher_usage(db: AsyncSession, document_type: str, prefix: Optional[str] = None) -> Dict[str, Any]:
    """
    Connects Series Master directly to REAL vouchers in the database.
    Queries the actual table for the last used voucher number and count,
    optionally filtering by prefix to isolate series sequences.
    """
    raw_doc = document_type.upper().strip()
    norm = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    
    last_voucher_no = None
    real_count = 0
    
    try:
        from sqlalchemy import func
        if norm == "JOB":
            from app.tenant_db.models import Job
            stmt = select(Job.job_number)
            cnt_stmt = select(func.count(Job.id))
            if prefix:
                stmt = stmt.where(Job.job_number.ilike(f"{prefix}%"))
                cnt_stmt = cnt_stmt.where(Job.job_number.ilike(f"{prefix}%"))
            stmt = stmt.order_by(Job.id.desc()).limit(1)
            res = await db.execute(stmt)
            last_voucher_no = res.scalar_one_or_none()
            cnt_res = await db.execute(cnt_stmt)
            real_count = cnt_res.scalar() or 0
        elif norm == "LR":
            from app.tenant_db.models import LR
            stmt = select(LR.lr_number)
            cnt_stmt = select(func.count(LR.id))
            if prefix:
                stmt = stmt.where(LR.lr_number.ilike(f"{prefix}%"))
                cnt_stmt = cnt_stmt.where(LR.lr_number.ilike(f"{prefix}%"))
            stmt = stmt.order_by(LR.id.desc()).limit(1)
            res = await db.execute(stmt)
            last_voucher_no = res.scalar_one_or_none()
            cnt_res = await db.execute(cnt_stmt)
            real_count = cnt_res.scalar() or 0
        elif norm in ("HIRE_CHALLAN", "HC"):
            from app.tenant_db.models import HireChallan
            stmt = select(HireChallan.challan_number)
            cnt_stmt = select(func.count(HireChallan.id))
            if prefix:
                stmt = stmt.where(HireChallan.challan_number.ilike(f"{prefix}%"))
                cnt_stmt = cnt_stmt.where(HireChallan.challan_number.ilike(f"{prefix}%"))
            stmt = stmt.order_by(HireChallan.id.desc()).limit(1)
            res = await db.execute(stmt)
            last_voucher_no = res.scalar_one_or_none()
            cnt_res = await db.execute(cnt_stmt)
            real_count = cnt_res.scalar() or 0
        else:
            from app.tenant_db.models import Voucher
            v_types = [norm]
            if norm == "TRANSPORT_INVOICE":
                v_types = ["TRANSPORT_INVOICE", "INVOICE"]
            elif norm == "GENERAL_INVOICE":
                v_types = ["GENERAL_INVOICE"]
            elif norm == "PROFORMA_INVOICE":
                v_types = ["PROFORMA_INVOICE"]
            elif norm == "NORMAL_PURCHASE":
                v_types = ["NORMAL_PURCHASE", "PURCHASE"]
            elif norm == "GENERAL_PURCHASE":
                v_types = ["GENERAL_PURCHASE"]
            elif norm == "RECEIPT_VOUCHER":
                v_types = ["RECEIPT_VOUCHER", "RECEIPT"]
            elif norm == "PAYMENT_VOUCHER":
                v_types = ["PAYMENT_VOUCHER", "PAYMENT"]
            elif norm == "PAYMENT_ATH":
                v_types = ["PAYMENT_ATH", "ATH_PAYMENT", "ATH"]
            elif norm == "PAYMENT_BTH":
                v_types = ["PAYMENT_BTH", "BTH_PAYMENT", "BTH"]
            elif norm == "CREDIT_NOTE":
                v_types = ["CREDIT_NOTE"]
            elif norm == "DEBIT_NOTE":
                v_types = ["DEBIT_NOTE"]
            elif norm == "GENERAL_VOUCHER":
                v_types = ["GENERAL_VOUCHER", "JOURNAL", "JV"]
            elif norm == "CONTRA_VOUCHER":
                v_types = ["CONTRA_VOUCHER", "CONTRA"]
            
            stmt = select(Voucher.voucher_number).where(Voucher.voucher_type.in_(v_types))
            cnt_stmt = select(func.count(Voucher.id)).where(Voucher.voucher_type.in_(v_types))
            if prefix:
                stmt = stmt.where(Voucher.voucher_number.ilike(f"{prefix}%"))
                cnt_stmt = cnt_stmt.where(Voucher.voucher_number.ilike(f"{prefix}%"))
            stmt = stmt.order_by(Voucher.id.desc()).limit(1)
            res = await db.execute(stmt)
            last_voucher_no = res.scalar_one_or_none()
            cnt_res = await db.execute(cnt_stmt)
            real_count = cnt_res.scalar() or 0
    except Exception as e:
        logger.warning(f"Could not query real voucher usage for {norm}: {e}")
        try:
            await db.rollback()
        except Exception:
            pass

    return {
        "last_voucher_number": last_voucher_no,
        "count": real_count,
    }


def compute_series_display_data(s: SeriesMaster, real_usage: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Computes formatted last used series and formatted next series number based on REAL database vouchers.
    """
    start_num = s.starting_number if s.starting_number is not None else 1
    prefix = s.prefix or ""
    suffix = s.suffix or ""

    last_used_fmt = None
    curr_num = 0

    if real_usage and real_usage.get("count", 0) > 0 and real_usage.get("last_voucher_number"):
        last_used_fmt = real_usage["last_voucher_number"]
        parsed_seq = extract_sequence_number(last_used_fmt, prefix, suffix)
        if parsed_seq is not None:
            curr_num = parsed_seq
        else:
            curr_num = real_usage["count"]
    elif s.current_number and s.current_number >= start_num:
        # If current_number was accidentally corrupted by prefix digits (e.g. 20260001), heal it:
        c_num = s.current_number
        pref_digits = "".join(filter(str.isdigit, prefix))
        if pref_digits and str(c_num).startswith(pref_digits) and len(str(c_num)) > len(pref_digits):
            remainder = str(c_num)[len(pref_digits):]
            if remainder and remainder.isdigit():
                c_num = int(remainder)
        curr_num = c_num
        last_used_fmt = format_series_number(prefix, curr_num, suffix)

    if curr_num >= start_num:
        next_num = curr_num + 1
    else:
        next_num = start_num

    next_num_fmt = format_series_number(prefix, next_num, suffix)
    norm_doc = DOC_TYPE_ALIASES.get(s.document_type.upper().strip(), s.document_type.upper().strip())
    is_mandatory = norm_doc in MANDATORY_MANUAL_DOC_TYPES

    return {
        "current_number": curr_num,
        "last_used_formatted": last_used_fmt,
        "next_number": next_num,
        "next_number_formatted": next_num_fmt,
        "is_mandatory_manual": is_mandatory,
        "series_mode": s.series_mode or ("MANUAL" if is_mandatory else "AUTOMATIC"),
        "series_name": s.series_name,
        "is_default": bool(s.is_default),
    }


_VERIFIED_SERIES_DBS = set()


async def ensure_series_table_schema(db: AsyncSession) -> None:
    """
    Safely ensures the Series tables and new columns exist in tenant database.
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
            await db.execute(text("ALTER TABLE settings_series_masters ADD COLUMN IF NOT EXISTS series_name VARCHAR(100);"))
            await db.execute(text("ALTER TABLE settings_series_masters ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;"))
        elif bind.dialect.name == "sqlite":
            res = await db.execute(text("PRAGMA table_info(settings_series_masters);"))
            cols = [r[1] for r in res.fetchall()]
            if "series_mode" not in cols:
                await db.execute(text("ALTER TABLE settings_series_masters ADD COLUMN series_mode VARCHAR(20) DEFAULT 'AUTOMATIC';"))
            if "series_name" not in cols:
                await db.execute(text("ALTER TABLE settings_series_masters ADD COLUMN series_name VARCHAR(100);"))
            if "is_default" not in cols:
                await db.execute(text("ALTER TABLE settings_series_masters ADD COLUMN is_default BOOLEAN DEFAULT 0;"))
        # Clean up any unconfigured auto-seeded manual series with no range and 0 usage
        try:
            await db.execute(text("""
                DELETE FROM settings_series_masters 
                WHERE series_mode = 'MANUAL' 
                  AND end_number IS NULL 
                  AND (current_number IS NULL OR current_number = 0);
            """))
        except Exception:
            pass
        await db.commit()
        _VERIFIED_SERIES_DBS.add(db_name)
    except Exception as e:
        logger.warning(f"ensure_series_table_schema notice: {e}")
        try:
            await db.rollback()
        except Exception:
            pass


async def get_all_used_numbers_for_doc(db: AsyncSession, document_type: str) -> Set[str]:
    """
    Returns the set of all existing voucher numbers in the database for a document type.
    Used to guarantee that used numbers are never shown or reused in manual series selection.
    """
    raw_doc = document_type.upper().strip()
    norm = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    used_numbers: Set[str] = set()

    try:
        if norm == "JOB":
            from app.tenant_db.models import Job
            res = await db.execute(select(Job.job_number))
            for (no,) in res.all():
                if no:
                    used_numbers.add(str(no).strip())
        elif norm == "LR":
            from app.tenant_db.models import LR
            res = await db.execute(select(LR.lr_number))
            for (no,) in res.all():
                if no:
                    used_numbers.add(str(no).strip())
        elif norm in ("HIRE_CHALLAN", "HC"):
            from app.tenant_db.models import HireChallan
            res = await db.execute(select(HireChallan.challan_number))
            for (no,) in res.all():
                if no:
                    used_numbers.add(str(no).strip())
        else:
            from app.tenant_db.models import Voucher
            v_types = [norm]
            if norm == "TRANSPORT_INVOICE":
                v_types = ["TRANSPORT_INVOICE", "INVOICE"]
            elif norm == "GENERAL_INVOICE":
                v_types = ["GENERAL_INVOICE"]
            elif norm == "PROFORMA_INVOICE":
                v_types = ["PROFORMA_INVOICE"]
            elif norm == "NORMAL_PURCHASE":
                v_types = ["NORMAL_PURCHASE", "PURCHASE"]
            elif norm == "GENERAL_PURCHASE":
                v_types = ["GENERAL_PURCHASE"]
            elif norm == "RECEIPT_VOUCHER":
                v_types = ["RECEIPT_VOUCHER", "RECEIPT"]
            elif norm == "PAYMENT_VOUCHER":
                v_types = ["PAYMENT_VOUCHER", "PAYMENT"]
            elif norm == "PAYMENT_ATH":
                v_types = ["PAYMENT_ATH", "ATH_PAYMENT", "ATH"]
            elif norm == "PAYMENT_BTH":
                v_types = ["PAYMENT_BTH", "BTH_PAYMENT", "BTH"]
            elif norm == "CREDIT_NOTE":
                v_types = ["CREDIT_NOTE"]
            elif norm == "DEBIT_NOTE":
                v_types = ["DEBIT_NOTE"]
            elif norm == "GENERAL_VOUCHER":
                v_types = ["GENERAL_VOUCHER", "JOURNAL", "JV"]
            elif norm == "CONTRA_VOUCHER":
                v_types = ["CONTRA_VOUCHER", "CONTRA"]

            res = await db.execute(select(Voucher.voucher_number).where(Voucher.voucher_type.in_(v_types)))
            for (no,) in res.all():
                if no:
                    used_numbers.add(str(no).strip())
    except Exception as e:
        logger.warning(f"Error getting used voucher numbers for {norm}: {e}")
        try:
            await db.rollback()
        except Exception:
            pass

    return used_numbers


async def get_manual_series_ranges(
    db: AsyncSession,
    document_type: str,
    issuing_office_id: Optional[int] = None,
    office_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Returns all configured manual series ranges for a document type.
    Computes available (unused) voucher numbers for each range, filtering out already used vouchers.
    """
    issuing_office_id = issuing_office_id or office_id
    await ensure_series_table_schema(db)
    raw_doc = document_type.upper().strip()
    norm_type = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    is_mandatory_manual = norm_type in MANDATORY_MANUAL_DOC_TYPES

    stmt = select(SeriesMaster).where(
        SeriesMaster.document_type.in_([norm_type, raw_doc]),
        SeriesMaster.is_active == True,
    )
    if issuing_office_id:
        stmt = stmt.where(SeriesMaster.issuing_office_id == issuing_office_id).order_by(
            SeriesMaster.is_default.desc(),
            SeriesMaster.id.asc(),
        )
    else:
        stmt = stmt.order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.asc())
    res = await db.execute(stmt)
    all_series = res.scalars().all()

    used_numbers_set = await get_all_used_numbers_for_doc(db, norm_type)

    ranges_data = []
    default_series_id = None

    for s in all_series:
        start = s.starting_number or 1
        end = s.end_number

        # If range is not set, do not use any default range (e.g. 501) and do not show the series
        if end is None or end < start:
            continue

        prefix = s.prefix or ""
        suffix = s.suffix or ""
        total_in_range = end - start + 1

        available_options = []
        used_count_in_range = 0

        # Scan batch range
        for num in range(start, end + 1):
            formatted = format_series_number(prefix, num, suffix)
            alt_plain = f"{prefix}{num}{suffix}"
            if formatted in used_numbers_set or alt_plain in used_numbers_set:
                used_count_in_range += 1
            else:
                if len(available_options) < 500:
                    available_options.append({
                        "value": formatted,
                        "label": formatted,
                        "number": num,
                    })

        available_count = total_in_range - used_count_in_range
        name_str = f"{s.series_name} · " if s.series_name else ""
        range_label = f"{name_str}{prefix}[{start} – {end}] ({available_count} left)"
        if s.is_default:
            default_series_id = s.id

        ranges_data.append({
            "id": s.id,
            "document_type": s.document_type,
            "series_name": s.series_name or f"Series {prefix}",
            "prefix": prefix,
            "suffix": suffix,
            "starting_number": start,
            "end_number": s.end_number,
            "series_mode": s.series_mode or ("MANUAL" if is_mandatory_manual else "AUTOMATIC"),
            "is_default": bool(s.is_default),
            "total_count": total_in_range,
            "used_count": used_count_in_range,
            "available_count": available_count,
            "display_label": range_label,
            "available_options": available_options,
        })

    if not default_series_id and ranges_data:
        default_series_id = ranges_data[0]["id"]

    return {
        "document_type": norm_type,
        "is_mandatory_manual": is_mandatory_manual,
        "default_series_id": default_series_id,
        "ranges": ranges_data,
    }


async def set_default_series(db: AsyncSession, series_id: int) -> dict:
    """
    Sets the specified series as the active/default series for its document type.
    """
    await ensure_series_table_schema(db)
    target = (await db.execute(select(SeriesMaster).where(SeriesMaster.id == series_id))).scalar_one_or_none()
    if not target:
        raise AppException(status_code=404, error_code="SERIES_NOT_FOUND", message="Series master not found.")

    all_same_doc = (await db.execute(
        select(SeriesMaster).where(SeriesMaster.document_type == target.document_type)
    )).scalars().all()

    for s in all_same_doc:
        s.is_default = (s.id == target.id)
        db.add(s)

    await db.commit()
    await db.refresh(target)
    return {"message": f"Series '{target.prefix}' set as current active series for {target.document_type}.", "id": target.id, "is_default": True}


async def allocate_or_validate_voucher_number(
    db: AsyncSession,
    document_type: str,
    manual_number: Optional[str] = None,
    financial_year: str = "2026-2027",
    issuing_office_id: Optional[int] = None,
) -> str:
    """
    Allocates the voucher number according to configured SeriesMaster.
    - If document requires mandatory manual series and none is configured, raises AppException (400).
    - If configured as MANUAL: validates/formats provided manual sequence or auto-picks next number,
      and updates SeriesMaster current_number.
    - If configured as AUTOMATIC: auto-increments current_number and formats number with Prefix and Postfix.
    - If issuing_office_id is provided, prioritizes office-specific series with fallback to global company series.
    """
    raw_doc = document_type.upper().strip()
    norm_type = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    is_mandatory_manual = norm_type in MANDATORY_MANUAL_DOC_TYPES

    # Find active series for this document_type (prioritizing office if specified)
    stmt = select(SeriesMaster).where(
        SeriesMaster.document_type.in_([norm_type, raw_doc]),
        SeriesMaster.is_active == True,
    )
    if issuing_office_id:
        stmt = stmt.where(SeriesMaster.issuing_office_id == issuing_office_id).order_by(
            SeriesMaster.is_default.desc(),
            SeriesMaster.id.desc(),
        )
    else:
        stmt = stmt.order_by(SeriesMaster.id.desc())
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
                final_number = clean_val
                # Ensure configured series prefix and postfix are attached if not already present
                if prefix and not final_number.lower().startswith(prefix.lower()):
                    final_number = f"{prefix}{final_number}"
                if suffix and not final_number.lower().endswith(suffix.lower()):
                    final_number = f"{final_number}{suffix}"

                # Check if this voucher number is already used anywhere in database
                all_used = await get_all_used_numbers_for_doc(db, norm_type)
                if final_number in all_used or clean_val in all_used:
                    raise AppException(
                        status_code=400,
                        error_code="VOUCHER_NUMBER_ALREADY_USED",
                        message=f"Voucher number '{final_number}' is already used. Please choose an unused voucher number from the active series range.",
                    )

                # Find which series range owns this voucher number
                range_stmt = select(SeriesMaster).where(
                    SeriesMaster.document_type.in_([norm_type, raw_doc]),
                    SeriesMaster.is_active == True,
                )
                if issuing_office_id:
                    range_stmt = range_stmt.where(SeriesMaster.issuing_office_id == issuing_office_id).order_by(
                        SeriesMaster.is_default.desc(),
                        SeriesMaster.id.asc(),
                    )
                else:
                    range_stmt = range_stmt.order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.asc())
                all_ranges = (await db.execute(range_stmt)).scalars().all()

                # Extract pure sequence number by stripping prefix and suffix first
                num_val = extract_sequence_number(clean_val, prefix, suffix)

                matched_series = None
                for sr in all_ranges:
                    p = sr.prefix or ""
                    s_suf = sr.suffix or ""
                    if final_number.lower().startswith(p.lower()) and (not s_suf or final_number.lower().endswith(s_suf.lower())):
                        if num_val is not None:
                            start_n = sr.starting_number or 1
                            end_n = sr.end_number
                            if num_val >= start_n and (end_n is None or num_val <= end_n):
                                matched_series = sr
                                break

                active_target = matched_series or series
                if active_target and num_val is not None:
                    if active_target.end_number and num_val > active_target.end_number:
                        raise AppException(
                            status_code=400,
                            error_code="SERIES_EXHAUSTED",
                            message=f"Voucher number '{final_number}' exceeds configured series range limit ({active_target.end_number}).",
                        )
                    if num_val > (active_target.current_number or 0):
                        active_target.current_number = num_val
                        db.add(active_target)
                        await db.flush()
            else:
                real_usage = await get_real_voucher_usage(db, norm_type, prefix=prefix)
                disp = compute_series_display_data(series, real_usage=real_usage)
                next_num = disp["next_number"]
                final_number = format_series_number(prefix, next_num, suffix)
                all_used = await get_all_used_numbers_for_doc(db, norm_type)
                while final_number in all_used:
                    next_num += 1
                    final_number = format_series_number(prefix, next_num, suffix)
                series.current_number = next_num
        else:
            # AUTOMATIC Mode: Always auto-allocate next sequential number from series master
            real_usage = await get_real_voucher_usage(db, norm_type, prefix=prefix)
            disp = compute_series_display_data(series, real_usage=real_usage)
            next_num = disp["next_number"]
            final_number = format_series_number(prefix, next_num, suffix)
            all_used = await get_all_used_numbers_for_doc(db, norm_type)
            while final_number in all_used:
                next_num += 1
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

    # If series is NOT found, reject saving as per requirement
    readable_title = norm_type.replace("_", " ").title()
    raise AppException(
        status_code=400,
        error_code="SERIES_NOT_CONFIGURED",
        message=(
            f"No active series configured for this issuing office for {readable_title}. "
            "Please setup or import the default series template in Settings > Series Master before creating this entry."
        ),
    )


async def check_series_status(
    db: AsyncSession,
    document_type: str,
    issuing_office_id: Optional[int] = None,
    office_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Returns the series configuration and next available series number for a given document type.
    Enforces issuing office isolation: if an office is specified, only that office's active series qualifies.
    """
    target_office_id = issuing_office_id or office_id
    raw_doc = document_type.upper().strip()
    norm_type = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    readable_title = norm_type.replace("_", " ").title()

    stmt = select(SeriesMaster).where(
        SeriesMaster.document_type.in_([norm_type, raw_doc]),
        SeriesMaster.is_active == True,
    )
    if target_office_id:
        stmt = stmt.where(SeriesMaster.issuing_office_id == target_office_id).order_by(
            SeriesMaster.is_default.desc(),
            SeriesMaster.id.desc(),
        )
    else:
        stmt = stmt.order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.desc())

    res = await db.execute(stmt)
    series = res.scalars().first()

    # If target_office_id was specified, but no office-specific series was matched
    if not series:
        return {
            "configured": False,
            "document_type": norm_type,
            "display_name": readable_title,
            "is_mandatory_manual": False,
            "series_mode": "AUTOMATIC",
            "next_number_formatted": "",
            "message": f"No active series configured for issuing office for {readable_title}. Please setup the series in Settings > Series Master before creating this entry.",
        }

    real_usage = await get_real_voucher_usage(db, norm_type, prefix=series.prefix)
    disp = compute_series_display_data(series, real_usage=real_usage)
    next_fmt = disp["next_number_formatted"]
    next_num = disp["next_number"]
    all_used = await get_all_used_numbers_for_doc(db, norm_type)
    while next_fmt in all_used:
        next_num += 1
        next_fmt = format_series_number(series.prefix or "", next_num, series.suffix or "")

    # For manual series: if range is not set, treat series as not configured
    if disp["series_mode"] == "MANUAL" and (series.end_number is None or series.end_number < (series.starting_number or 1)):
        return {
            "configured": False,
            "document_type": norm_type,
            "display_name": readable_title,
            "is_mandatory_manual": False,
            "series_mode": "MANUAL",
            "next_number_formatted": "",
            "message": f"Manual series batch range is not configured for {readable_title}. Please set up a series range in Settings > Series Master.",
        }

    return {
        "configured": True,
        "id": series.id,
        "document_type": series.document_type,
        "display_name": readable_title,
        "series_name": series.series_name,
        "prefix": series.prefix,
        "suffix": series.suffix or "",
        "starting_number": series.starting_number,
        "current_number": disp["current_number"],
        "end_number": series.end_number,
        "last_used_formatted": disp["last_used_formatted"],
        "next_number": next_num,
        "next_number_formatted": next_fmt,
        "financial_year": series.financial_year,
        "series_mode": disp["series_mode"],
        "is_default": bool(series.is_default),
        "is_mandatory_manual": False,
        "is_active": series.is_active,
        "issuing_office_id": series.issuing_office_id,
    }


async def initialize_all_standard_series(
    db: AsyncSession,
    financial_year: str = "2026-2027",
    exclude_manual: bool = False,
    office_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Initializes default series templates for all 16 automatic voucher types.
    Can be targeted to a specific issuing office or all active offices.
    Each issuing office receives its own unique prefix with its branch code and separate sequence.
    """
    from app.tenant_db.models import Branch

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

    # 2. Resolve target issuing offices
    if office_id:
        target_branches = (await db.execute(select(Branch).where(Branch.id == office_id))).scalars().all()
    else:
        target_branches = (await db.execute(select(Branch).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()))).scalars().all()

    if not target_branches:
        any_branch = (await db.execute(select(Branch).order_by(Branch.id.asc()))).scalars().first()
        if any_branch:
            target_branches = [any_branch]
        else:
            default_ho = Branch(
                code="HO",
                name="Head Office",
                city="Delhi",
                state="Delhi",
                is_head_office=True,
                is_active=True,
            )
            db.add(default_ho)
            await db.flush()
            target_branches = [default_ho]

    # 3. Seed office-isolated standard series
    created_list = []
    for branch in target_branches:
        branch_code = (branch.code or f"OFF{branch.id}").upper().strip()
        for meta in STANDARD_VOUCHER_METADATA:
            doc_type = meta["document_type"]
            doc_tag = meta.get("code") or doc_type[:3]
            office_prefix = f"{branch_code}-{doc_tag}-2026-"

            stmt = select(SeriesMaster).where(
                SeriesMaster.document_type == doc_type,
                SeriesMaster.issuing_office_id == branch.id,
                SeriesMaster.financial_year == financial_year,
            )
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if not existing:
                cat_id = cat_map.get(meta["category_code"])
                series_obj = SeriesMaster(
                    category_id=cat_id,
                    issuing_office_id=branch.id,
                    document_type=doc_type,
                    series_name=f"{branch.name} {meta['name']}",
                    prefix=office_prefix,
                    suffix=meta.get("suffix", ""),
                    starting_number=meta.get("starting_number", 1),
                    current_number=0,
                    financial_year=financial_year,
                    series_mode="AUTOMATIC",
                    is_default=True,
                    is_active=True,
                )
                db.add(series_obj)
                await db.flush()
                real_usage = await get_real_voucher_usage(db, series_obj.document_type)
                disp = compute_series_display_data(series_obj, real_usage=real_usage)
                created_list.append({
                    "id": series_obj.id,
                    "document_type": series_obj.document_type,
                    "issuing_office_id": branch.id,
                    "issuing_office_name": branch.name,
                    "prefix": series_obj.prefix,
                    "suffix": series_obj.suffix,
                    "starting_number": series_obj.starting_number,
                    "current_number": disp["current_number"],
                    "last_used_formatted": disp["last_used_formatted"],
                    "next_number": disp["next_number"],
                    "next_number_formatted": disp["next_number_formatted"],
                    "financial_year": series_obj.financial_year,
                    "series_mode": disp["series_mode"],
                    "is_mandatory_manual": False,
                    "is_active": True,
                })

    await db.commit()
    return created_list
