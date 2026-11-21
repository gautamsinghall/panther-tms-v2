import io
import re
import csv
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import select, func, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.tenant_db.models import (
    Job,
    JobStatus,
    LR,
    LRStatus,
    Branch,
    Consigner,
    Consignee,
    Location,
    BillingClient,
    SeriesMaster,
    CompanyVehicle,
    MarketVehicle,
    LoadType,
)
from app.core.errors import AppException
from app.modules.settings.series_service import (
    allocate_or_validate_voucher_number,
    get_real_voucher_usage,
    compute_series_display_data,
    format_series_number,
)

# ---------------------------------------------------------------------------
# Excel Template Generation (Strictly Real Input Fields — ZERO Demo Data)
# ---------------------------------------------------------------------------

HEADER_FILL_COLOR = "1E293B"      # Slate 800
HEADER_FONT_COLOR = "FFFFFF"      # White
BORDER_COLOR = "E2E8F0"           # Slate 200

# Exactly matching the real Job Order form inputs in the UI:
REAL_INPUT_COLUMNS = [
    {
        "key": "job_number",
        "header": "Job Number",
        "required": False,
        "width": 20,
    },
    {
        "key": "billing_client",
        "header": "Billing Client",
        "required": True,
        "width": 28,
    },
    {
        "key": "origin_location",
        "header": "Origin Location",
        "required": True,
        "width": 24,
    },
    {
        "key": "destination_location",
        "header": "Destination Location",
        "required": True,
        "width": 24,
    },
    {
        "key": "job_date",
        "header": "Date of Job Creation",
        "required": True,
        "width": 24,
    },
    {
        "key": "scheduled_dispatch_date",
        "header": "Scheduled Dispatch Date",
        "required": False,
        "width": 24,
    },
    {
        "key": "consigner",
        "header": "Consigner",
        "required": True,
        "width": 28,
    },
    {
        "key": "consignee",
        "header": "Consignee",
        "required": True,
        "width": 28,
    },
    {
        "key": "cargo_description",
        "header": "Cargo Description",
        "required": False,
        "width": 32,
    },
    {
        "key": "estimated_weight_mt",
        "header": "Estimated Weight",
        "required": False,
        "width": 20,
    },
    {
        "key": "estimated_packages",
        "header": "Total Packages",
        "required": False,
        "width": 20,
    },
]


async def generate_job_import_template(db: AsyncSession) -> io.BytesIO:
    """
    Generates a clean, professional Excel template with ONLY the real input headers
    matching the Job Order Creation UI.
    Contains ZERO demo data — row 2 onwards are clean empty rows ready for user data entry.
    """
    wb = openpyxl.Workbook()

    ws = wb.active
    ws.title = "Job_Orders_Import"
    ws.views.sheetView[0].showGridLines = True

    # Styling elements
    header_font = Font(name="Segoe UI", size=11, bold=True, color=HEADER_FONT_COLOR)
    header_fill = PatternFill(start_color=HEADER_FILL_COLOR, end_color=HEADER_FILL_COLOR, fill_type="solid")
    regular_font = Font(name="Segoe UI", size=10)
    thin_border_side = Side(border_style="thin", color=BORDER_COLOR)
    cell_border = Border(
        left=thin_border_side,
        right=thin_border_side,
        top=thin_border_side,
        bottom=thin_border_side
    )
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")

    # Set Header row (Row 1)
    ws.row_dimensions[1].height = 32
    for col_idx, col_def in enumerate(REAL_INPUT_COLUMNS, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.value = col_def["header"] + (" *" if col_def["required"] else "")
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = cell_border
        ws.column_dimensions[get_column_letter(col_idx)].width = col_def["width"]

    # Provide 50 clean, pre-bordered blank rows ready for direct data entry (NO DEMO DATA)
    for r in range(2, 52):
        ws.row_dimensions[r].height = 22
        for col_idx in range(1, len(REAL_INPUT_COLUMNS) + 1):
            cell = ws.cell(row=r, column=col_idx)
            cell.border = cell_border
            cell.font = regular_font
            cell.alignment = left_align

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# ---------------------------------------------------------------------------
# Excel Import & Deduplication Engine
# ---------------------------------------------------------------------------

def _normalize_header(header: str) -> str:
    """Normalize column header to canonical key matching real input fields."""
    clean = re.sub(r"[^a-zA-Z0-9]", "_", str(header or "").strip().lower())
    clean = re.sub(r"_+", "_", clean).strip("_")

    if any(k in clean for k in ["job_no", "job_number", "job_#", "order_no", "order_number"]):
        return "job_number"
    if any(k in clean for k in ["billing_client", "billing_party", "customer", "bill_to"]):
        return "billing_client"
    if any(k in clean for k in ["origin_location", "origin_city", "origin", "from_city", "pickup_location"]):
        return "origin_location"
    if any(k in clean for k in ["destination_location", "destination_city", "destination", "to_city", "drop_location"]):
        return "destination_location"
    if any(k in clean for k in ["date_of_job", "creation_date", "job_date", "booking_date"]):
        return "job_date"
    if any(k in clean for k in ["dispatch_date", "scheduled_dispatch", "expected_dispatch", "dispatch"]):
        return "scheduled_dispatch_date"
    if any(k in clean for k in ["consigner", "shipper", "sender"]):
        return "consigner"
    if any(k in clean for k in ["consignee", "receiver", "recipient"]):
        return "consignee"
    if any(k in clean for k in ["cargo_description", "cargo", "material", "goods", "commodity", "item"]):
        return "cargo_description"
    if any(k in clean for k in ["estimated_weight", "weight", "mt", "ton", "tonnage"]):
        return "estimated_weight_mt"
    if any(k in clean for k in ["total_packages", "estimated_packages", "packages", "pkg", "box", "carton", "units", "quantity"]):
        return "estimated_packages"
    if any(k in clean for k in ["instruction", "remark", "note"]):
        return "special_instructions"

    return clean


def _parse_date(val: Any) -> Optional[date]:
    """Parse various date formats into date object."""
    if not val:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()

    val_str = str(val).strip()
    if not val_str:
        return None

    # Try common formats
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(val_str[:10], fmt[:len(val_str[:10])]).date()
        except Exception:
            continue

    return None


async def _resolve_or_create_location(
    db: AsyncSession,
    raw_location: str,
    resolved_office_id: Optional[int],
    location_cache: Dict[str, Location],
) -> Location:
    clean = str(raw_location or "").strip()
    key = clean.lower()
    if key in location_cache:
        return location_cache[key]

    # Parse components if formatted as "City, State, Pincode" or "City, State"
    parts = [p.strip() for p in clean.split(",") if p.strip()]
    city_name = parts[0] if parts else clean
    state_name = None
    pincode_val = None

    if len(parts) >= 3:
        city_name = parts[0]
        state_name = parts[1]
        last = parts[-1]
        if last.isdigit() and len(last) in (5, 6):
            pincode_val = last
        else:
            state_name = ", ".join(parts[1:])
    elif len(parts) == 2:
        city_name = parts[0]
        if parts[1].isdigit() and len(parts[1]) in (5, 6):
            pincode_val = parts[1]
        else:
            state_name = parts[1]

    # 1. Look up existing active location from DB (fast indexed query, limit 1)
    base_stmt = select(Location).where(Location.is_active == True)
    loc_obj = None

    # Priority 1: Match by city_name and pincode (and state if present)
    if pincode_val:
        pincode_stmt = (
            base_stmt
            .where(
                func.lower(Location.city_name) == city_name.lower(),
                Location.pincode == pincode_val,
            )
        )
        if state_name:
            pincode_stmt = pincode_stmt.where(func.lower(Location.state) == state_name.lower())
        if resolved_office_id:
            pincode_stmt = pincode_stmt.order_by(
                case((Location.issuing_office_id == resolved_office_id, 1), else_=0).desc(),
                Location.id.asc(),
            )
        else:
            pincode_stmt = pincode_stmt.order_by(Location.id.asc())
        res = await db.execute(pincode_stmt.limit(1))
        loc_obj = res.scalar_one_or_none()

    # Priority 2: Match by city_name and state
    if not loc_obj and state_name:
        state_stmt = (
            base_stmt
            .where(
                func.lower(Location.city_name) == city_name.lower(),
                func.lower(Location.state) == state_name.lower(),
            )
        )
        if resolved_office_id:
            state_stmt = state_stmt.order_by(
                case((Location.issuing_office_id == resolved_office_id, 1), else_=0).desc(),
                Location.id.asc(),
            )
        else:
            state_stmt = state_stmt.order_by(Location.id.asc())
        res = await db.execute(state_stmt.limit(1))
        loc_obj = res.scalar_one_or_none()

    # Priority 3: Match by location_code, city_name == clean, or city_name == city_name
    if not loc_obj:
        general_stmt = (
            base_stmt
            .where(
                or_(
                    func.lower(Location.location_code) == key,
                    func.lower(Location.city_name) == key,
                    func.lower(Location.city_name) == city_name.lower(),
                )
            )
        )
        if resolved_office_id:
            general_stmt = general_stmt.order_by(
                case((Location.issuing_office_id == resolved_office_id, 1), else_=0).desc(),
                Location.id.asc(),
            )
        else:
            general_stmt = general_stmt.order_by(Location.id.asc())
        res = await db.execute(general_stmt.limit(1))
        loc_obj = res.scalar_one_or_none()

    # 2. If not found in database, auto-create
    if not loc_obj:
        loc_obj = Location(
            city_name=city_name.title()[:100],
            state=(state_name.title() if state_name else "General")[:100],
            country="India",
            location_code=None,
            address=None,
            pincode=pincode_val,
            is_pickup_point=True,
            is_drop_point=True,
            is_active=True,
            issuing_office_id=resolved_office_id,
        )
        db.add(loc_obj)
        await db.flush()

    location_cache[key] = loc_obj
    location_cache[loc_obj.city_name.lower()] = loc_obj
    if loc_obj.location_code:
        location_cache[loc_obj.location_code.lower()] = loc_obj

    return loc_obj


MANDATORY_JOB_COLUMNS = [
    ("billing_client", "Billing Client"),
    ("origin_location", "Origin Location"),
    ("destination_location", "Destination Location"),
    ("consigner", "Consigner"),
    ("consignee", "Consignee"),
]


async def import_jobs_from_excel(
    db: AsyncSession,
    file_bytes: bytes,
    filename: str,
    user_id: Optional[int] = None,
    apply_series_prefix_suffix: bool = True,
    office_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Parses Excel (.xlsx/.xls) or CSV file, performs deep 2-level deduplication:
    1. Within-Excel duplicate check (job_number, exact business trip duplicate).
    2. Database duplicate check (existing job_number, existing trip matching route, dates, parties).
    Sorts rows chronologically by date (oldest date gets next available sequence number,
    first-come first-served on identical dates), resolves/auto-creates sub-fields,
    and returns a comprehensive audit summary report.
    """
    resolved_office_id = office_id
    if not resolved_office_id or resolved_office_id == 0:
        br_res = await db.execute(
            select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1)
        )
        resolved_office_id = br_res.scalar_one_or_none()

    rows_data: List[Dict[str, Any]] = []

    # 1. Parse File into List of dicts with exception handling for corrupted files
    try:
        is_csv = filename.lower().endswith(".csv")
        if is_csv:
            content_str = file_bytes.decode("utf-8-sig", errors="replace")
            csv_reader = csv.reader(io.StringIO(content_str))
            headers_raw = next(csv_reader, [])
            header_map = {idx: _normalize_header(h) for idx, h in enumerate(headers_raw)}
            header_row = 1
            for row_idx, row in enumerate(csv_reader, start=2):
                if not any(row):
                    continue
                row_dict = {"_row_num": row_idx}
                for col_idx, val in enumerate(row):
                    key = header_map.get(col_idx)
                    if key:
                        row_dict[key] = val
                rows_data.append(row_dict)
        else:
            # Excel .xlsx / .xls
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet_name = "Job_Orders_Import" if "Job_Orders_Import" in wb.sheetnames else wb.sheetnames[0]
            ws = wb[sheet_name]

            header_row = None
            for r in range(1, min(10, ws.max_row + 1)):
                row_vals = [ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
                normalized = [_normalize_header(v) for v in row_vals if v]
                if any(k in normalized for k in ["consigner", "consignee", "origin_location", "billing_client", "job_number"]):
                    header_row = r
                    break

            if not header_row:
                header_row = 1

            header_map = {}
            for c in range(1, ws.max_column + 1):
                val = ws.cell(row=header_row, column=c).value
                if val is not None and str(val).strip() != "":
                    header_map[c] = _normalize_header(str(val))

            for r in range(header_row + 1, ws.max_row + 1):
                row_dict = {"_row_num": r}
                has_val = False
                for c in range(1, ws.max_column + 1):
                    key = header_map.get(c)
                    if key:
                        val = ws.cell(row=r, column=c).value
                        if val is not None and str(val).strip() != "":
                            has_val = True
                            row_dict[key] = val
                if has_val:
                    rows_data.append(row_dict)
    except Exception as parse_ex:
        return {
            "status": "FAILED",
            "total_rows": 0,
            "imported_count": 0,
            "skipped_duplicate_count": 0,
            "failed_count": 1,
            "missing_headers": [],
            "skipped_duplicates": [],
            "errors": [
                {
                    "row": 0,
                    "reason": f"Failed to parse uploaded spreadsheet: {str(parse_ex)}. Please ensure it is a valid Excel or CSV file.",
                }
            ],
            "imported_jobs": [],
            "summary_report": {
                "status": "FAILED",
                "total_rows": 0,
                "imported_count": 0,
                "skipped_duplicate_count": 0,
                "failed_count": 1,
                "success_rate_percent": 0.0,
                "missing_columns": [],
                "execution_summary": f"Spreadsheet read failure: {str(parse_ex)}",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    # 2. Check for Missing Mandatory Headers
    present_canonical_keys = set(header_map.values())
    missing_headers = [col_display for col_key, col_display in MANDATORY_JOB_COLUMNS if col_key not in present_canonical_keys]
    if missing_headers:
        missing_desc = ", ".join(missing_headers)
        return {
            "status": "FAILED",
            "total_rows": 0,
            "imported_count": 0,
            "skipped_duplicate_count": 0,
            "failed_count": 1,
            "missing_headers": missing_headers,
            "skipped_duplicates": [],
            "errors": [
                {
                    "row": header_row,
                    "column": missing_desc,
                    "reason": f"Uploaded file is missing required columns: {missing_desc}. Please download the template or ensure the header row includes these columns.",
                }
            ],
            "imported_jobs": [],
            "summary_report": {
                "status": "FAILED",
                "total_rows": 0,
                "imported_count": 0,
                "skipped_duplicate_count": 0,
                "failed_count": 1,
                "success_rate_percent": 0.0,
                "missing_columns": missing_headers,
                "execution_summary": f"Import failed: Missing required column(s): {missing_desc}.",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    if not rows_data:
        return {
            "status": "FAILED",
            "total_rows": 0,
            "imported_count": 0,
            "skipped_duplicate_count": 0,
            "failed_count": 0,
            "missing_headers": [],
            "skipped_duplicates": [],
            "errors": [{"row": 1, "reason": "No data rows found in the uploaded file."}],
            "imported_jobs": [],
            "summary_report": {
                "status": "FAILED",
                "total_rows": 0,
                "imported_count": 0,
                "skipped_duplicate_count": 0,
                "failed_count": 0,
                "success_rate_percent": 0.0,
                "missing_columns": [],
                "execution_summary": "No data rows found in the uploaded file.",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    # Extract & validate fields before sorting
    valid_rows: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    skipped_duplicates: List[Dict[str, Any]] = []
    imported_jobs: List[Dict[str, Any]] = []

    for row in rows_data:
        row_num = row.get("_row_num", 0)

        # Extract values
        raw_job_no = str(row.get("job_number") or "").strip()
        raw_client = str(row.get("billing_client") or "").strip()
        raw_origin = str(row.get("origin_location") or "").strip()
        raw_dest = str(row.get("destination_location") or "").strip()
        raw_consigner = str(row.get("consigner") or "").strip()
        raw_consignee = str(row.get("consignee") or "").strip()
        raw_cargo = str(row.get("cargo_description") or "").strip()
        raw_weight = row.get("estimated_weight_mt")
        raw_packages = row.get("estimated_packages")
        raw_instructions = str(row.get("special_instructions") or "").strip()

        # Parse & Validate Dates with exception handling
        raw_job_date = row.get("job_date")
        if raw_job_date is not None and str(raw_job_date).strip() != "":
            parsed_job_date = _parse_date(raw_job_date)
            if parsed_job_date is None:
                errors.append({
                    "row": row_num,
                    "job_number": raw_job_no,
                    "field": "Date of Job Creation",
                    "reason": f"Invalid date format for Date of Job Creation: '{raw_job_date}'. Expected format: YYYY-MM-DD or DD/MM/YYYY.",
                })
                continue
            job_creation_date = parsed_job_date
        else:
            job_creation_date = date.today()

        raw_dispatch_date = row.get("scheduled_dispatch_date")
        if raw_dispatch_date is not None and str(raw_dispatch_date).strip() != "":
            parsed_dispatch = _parse_date(raw_dispatch_date)
            if parsed_dispatch is None:
                errors.append({
                    "row": row_num,
                    "job_number": raw_job_no,
                    "field": "Scheduled Dispatch Date",
                    "reason": f"Invalid date format for Scheduled Dispatch Date: '{raw_dispatch_date}'. Expected format: YYYY-MM-DD or DD/MM/YYYY.",
                })
                continue
            dispatch_date = parsed_dispatch
        else:
            dispatch_date = job_creation_date

        # Check Required Fields (Matching the Real Form)
        if not raw_client:
            errors.append({"row": row_num, "job_number": raw_job_no, "field": "Billing Client", "reason": "Missing mandatory field 'Billing Client'."})
            continue
        if not raw_origin:
            errors.append({"row": row_num, "job_number": raw_job_no, "field": "Origin Location", "reason": "Missing mandatory field 'Origin Location'."})
            continue
        if not raw_dest:
            errors.append({"row": row_num, "job_number": raw_job_no, "field": "Destination Location", "reason": "Missing mandatory field 'Destination Location'."})
            continue
        if not raw_consigner:
            errors.append({"row": row_num, "job_number": raw_job_no, "field": "Consigner", "reason": "Missing mandatory field 'Consigner'."})
            continue
        if not raw_consignee:
            errors.append({"row": row_num, "job_number": raw_job_no, "field": "Consignee", "reason": "Missing mandatory field 'Consignee'."})
            continue

        # Validate numeric format exceptions
        weight_val = Decimal("0.000")
        if raw_weight is not None and str(raw_weight).strip() != "":
            try:
                clean_w = str(raw_weight).replace(",", "").strip()
                w_parsed = Decimal(clean_w)
                if w_parsed < 0:
                    raise ValueError("Must be non-negative")
                weight_val = w_parsed
            except Exception:
                errors.append({
                    "row": row_num,
                    "job_number": raw_job_no,
                    "field": "Estimated Weight",
                    "reason": f"Invalid numeric format for Estimated Weight: '{raw_weight}'.",
                })
                continue

        packages_val = 0
        if raw_packages is not None and str(raw_packages).strip() != "":
            try:
                clean_p = str(raw_packages).replace(",", "").strip()
                p_parsed = int(float(clean_p))
                if p_parsed < 0:
                    raise ValueError("Must be non-negative")
                packages_val = p_parsed
            except Exception:
                errors.append({
                    "row": row_num,
                    "job_number": raw_job_no,
                    "field": "Total Packages",
                    "reason": f"Invalid integer format for Total Packages: '{raw_packages}'.",
                })
                continue

        valid_rows.append({
            "_row_num": row_num,
            "raw_job_no": raw_job_no,
            "raw_client": raw_client,
            "raw_origin": raw_origin,
            "raw_dest": raw_dest,
            "raw_consigner": raw_consigner,
            "raw_consignee": raw_consignee,
            "raw_cargo": raw_cargo,
            "weight_val": weight_val,
            "packages_val": packages_val,
            "raw_instructions": raw_instructions,
            "job_creation_date": job_creation_date,
            "dispatch_date": dispatch_date,
        })

    # -----------------------------------------------------------------------
    # CRITICAL SORTING: Chronological Order by Date (Oldest Date First)
    # If same date: First-Come, First-Served based on original row index
    # -----------------------------------------------------------------------
    valid_rows.sort(key=lambda r: (r["job_creation_date"], r["_row_num"]))

    # In-memory caches to speed up master resolution (office-scoped and global templates)
    consigner_office_cache: Dict[str, Consigner] = {}
    consigner_global_cache: Dict[str, Consigner] = {}
    consignee_office_cache: Dict[str, Consignee] = {}
    consignee_global_cache: Dict[str, Consignee] = {}
    location_cache: Dict[str, Location] = {}
    billing_client_office_cache: Dict[str, BillingClient] = {}
    billing_client_global_cache: Dict[str, BillingClient] = {}

    # Pre-populate caches with existing active masters
    try:
        all_c_res = await db.execute(select(Consigner).where(Consigner.is_active == True))
        for c in all_c_res.scalars().all():
            k_name = c.name.strip().lower()
            consigner_global_cache[k_name] = c
            if c.code:
                consigner_global_cache[c.code.strip().lower()] = c
            if c.issuing_office_id == resolved_office_id or c.issuing_office_id is None:
                consigner_office_cache[k_name] = c
                if c.code:
                    consigner_office_cache[c.code.strip().lower()] = c

        all_ce_res = await db.execute(select(Consignee).where(Consignee.is_active == True))
        for ce in all_ce_res.scalars().all():
            k_name = ce.name.strip().lower()
            consignee_global_cache[k_name] = ce
            if ce.code:
                consignee_global_cache[ce.code.strip().lower()] = ce
            if ce.issuing_office_id == resolved_office_id or ce.issuing_office_id is None:
                consignee_office_cache[k_name] = ce
                if ce.code:
                    consignee_office_cache[ce.code.strip().lower()] = ce

        all_bc_res = await db.execute(select(BillingClient).where(BillingClient.is_active == True))
        for bc in all_bc_res.scalars().all():
            k_name = bc.name.strip().lower()
            billing_client_global_cache[k_name] = bc
            if bc.code:
                billing_client_global_cache[bc.code.strip().lower()] = bc
            if bc.issuing_office_id == resolved_office_id or bc.issuing_office_id is None:
                billing_client_office_cache[k_name] = bc
                if bc.code:
                    billing_client_office_cache[bc.code.strip().lower()] = bc
    except Exception:
        pass

    # Fetch active SeriesMaster for JOB to determine prefix and suffix
    job_series = None
    try:
        stmt_s = (
            select(SeriesMaster)
            .where(
                SeriesMaster.document_type.in_(["JOB", "TRIP"]),
                SeriesMaster.is_active == True,
            )
        )
        if resolved_office_id:
            stmt_s = stmt_s.where(
                or_(
                    SeriesMaster.issuing_office_id == resolved_office_id,
                    SeriesMaster.issuing_office_id.is_(None),
                )
            ).order_by(
                case((SeriesMaster.issuing_office_id == resolved_office_id, 1), else_=0).desc(),
                SeriesMaster.is_default.desc(),
                SeriesMaster.id.desc(),
            )
        else:
            stmt_s = stmt_s.order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.desc())
        series_res = await db.execute(stmt_s)
        job_series = series_res.scalars().first()

        # Fallback to active company default series if branch has no office-specific series
        if not job_series and resolved_office_id:
            stmt_fallback = (
                select(SeriesMaster)
                .where(
                    SeriesMaster.document_type.in_(["JOB", "TRIP"]),
                    SeriesMaster.is_active == True,
                )
                .order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.desc())
            )
            series_res = await db.execute(stmt_fallback)
            job_series = series_res.scalars().first()
    except Exception:
        pass

    branch_code = ""
    if resolved_office_id:
        try:
            br_obj = await db.get(Branch, resolved_office_id)
            if br_obj and br_obj.code:
                branch_code = br_obj.code.strip().upper()
        except Exception:
            pass

    series_prefix = (job_series.prefix or "") if job_series else (f"{branch_code}-JOB-2026-" if branch_code else "JOB-2026-")
    series_suffix = (job_series.suffix or "") if job_series else ""

    # Tracking sets for deduplication & collision prevention
    seen_excel_job_numbers: Dict[str, int] = {}    # job_number.lower() -> row_num
    seen_excel_signatures: Dict[str, int] = {}     # business signature -> row_num
    used_job_numbers: Set[str] = set()

    # Pre-populate used job numbers from database
    try:
        existing_jobs_q = await db.execute(select(Job.job_number))
        for (jno,) in existing_jobs_q.all():
            if jno:
                used_job_numbers.add(str(jno).strip().lower())
    except Exception:
        pass

    for row in valid_rows:
        row_num = row["_row_num"]
        raw_job_no = row["raw_job_no"]
        raw_client = row["raw_client"]
        raw_origin = row["raw_origin"]
        raw_dest = row["raw_dest"]
        raw_consigner = row["raw_consigner"]
        raw_consignee = row["raw_consignee"]
        raw_cargo = row["raw_cargo"]
        weight_val = row["weight_val"]
        packages_val = row["packages_val"]
        raw_instructions = row["raw_instructions"]
        job_creation_date = row["job_creation_date"]
        dispatch_date = row["dispatch_date"]

        # Determine effective job number based on series prefix/postfix setting
        if raw_job_no:
            if apply_series_prefix_suffix:
                formatted_job_no = raw_job_no
                if series_prefix and not formatted_job_no.lower().startswith(series_prefix.lower()):
                    formatted_job_no = f"{series_prefix}{formatted_job_no}"
                if series_suffix and not formatted_job_no.lower().endswith(series_suffix.lower()):
                    formatted_job_no = f"{formatted_job_no}{series_suffix}"
                effective_job_no = formatted_job_no
            else:
                effective_job_no = raw_job_no
        else:
            effective_job_no = None

        # -------------------------------------------------------------------
        # Level 1 Deduplication: Within Excel File
        # -------------------------------------------------------------------
        if effective_job_no:
            lower_job = effective_job_no.lower()
            if lower_job in seen_excel_job_numbers:
                first_row = seen_excel_job_numbers[lower_job]
                skipped_duplicates.append({
                    "row": row_num,
                    "job_number": effective_job_no,
                    "route": f"{raw_origin} → {raw_dest}",
                    "dispatch_date": dispatch_date.isoformat(),
                    "reason": f"Duplicate Job Number '{effective_job_no}' repeated within Excel file (first seen on Row {first_row}).",
                    "duplicate_type": "EXCEL_FILE_DUPLICATE"
                })
                continue
            seen_excel_job_numbers[lower_job] = row_num

        # Compute business signature for identical trip order in Excel
        row_signature = (
            f"{raw_client.lower()}|{raw_consigner.lower()}|{raw_consignee.lower()}|{raw_origin.lower()}|"
            f"{raw_dest.lower()}|{dispatch_date.isoformat()}|{raw_cargo.lower()}"
        )
        if row_signature in seen_excel_signatures:
            first_row = seen_excel_signatures[row_signature]
            skipped_duplicates.append({
                "row": row_num,
                "job_number": effective_job_no or "AUTO",
                "route": f"{raw_origin} → {raw_dest}",
                "dispatch_date": dispatch_date.isoformat(),
                "reason": f"Duplicate trip order repeated within Excel file: Same Client, Consigner, Consignee, Route ({raw_origin} → {raw_dest}), and Date ({dispatch_date.isoformat()}) (matches Row {first_row}).",
                "duplicate_type": "EXCEL_FILE_DUPLICATE"
            })
            continue
        seen_excel_signatures[row_signature] = row_num

        # -------------------------------------------------------------------
        # Level 2 Deduplication: Database Check
        # -------------------------------------------------------------------
        # 2a. Check if explicit Job Number already exists in DB
        if effective_job_no:
            check_nums = [effective_job_no.lower()]
            if raw_job_no and raw_job_no.lower() not in check_nums:
                check_nums.append(raw_job_no.lower())
            existing_job_res = await db.execute(
                select(Job.id, Job.job_number, Job.status).where(func.lower(Job.job_number).in_(check_nums))
            )
            existing_job = existing_job_res.first()
            if existing_job:
                skipped_duplicates.append({
                    "row": row_num,
                    "job_number": effective_job_no,
                    "route": f"{raw_origin} → {raw_dest}",
                    "dispatch_date": dispatch_date.isoformat(),
                    "reason": f"Job Number '{effective_job_no}' already exists in database (Job #{existing_job.job_number}, Status: {existing_job.status}).",
                    "duplicate_type": "DATABASE_DUPLICATE"
                })
                continue

        # -------------------------------------------------------------------
        # Sub-field Resolution & Auto-creation (Office-isolated with template inheritance)
        # -------------------------------------------------------------------
        # 1. Billing Client
        client_key = raw_client.lower()
        client_obj = billing_client_office_cache.get(client_key)
        if not client_obj:
            existing_template = billing_client_global_cache.get(client_key)
            client_obj = BillingClient(
                name=raw_client,
                code=existing_template.code if existing_template else None,
                company_name=existing_template.company_name if existing_template else None,
                contact_person=existing_template.contact_person if existing_template else None,
                phone=existing_template.phone if existing_template else None,
                email=existing_template.email if existing_template else None,
                gstin=existing_template.gstin if existing_template else None,
                pan=existing_template.pan if existing_template else None,
                tds_rate=existing_template.tds_rate if existing_template else Decimal("0.00"),
                credit_period_days=existing_template.credit_period_days if existing_template else 30,
                credit_limit=existing_template.credit_limit if existing_template else Decimal("0.00"),
                payment_terms=existing_template.payment_terms if existing_template else None,
                address=existing_template.address if existing_template else None,
                city=existing_template.city if existing_template else None,
                state=existing_template.state if existing_template else None,
                pincode=existing_template.pincode if existing_template else None,
                country=existing_template.country if existing_template else "India",
                is_active=True,
                issuing_office_id=resolved_office_id,
            )
            db.add(client_obj)
            await db.flush()
            billing_client_office_cache[client_key] = client_obj
            billing_client_global_cache[client_key] = client_obj

        # 2. Consigner
        consigner_key = raw_consigner.lower()
        consigner_obj = consigner_office_cache.get(consigner_key)
        if not consigner_obj:
            existing_template = consigner_global_cache.get(consigner_key)
            consigner_obj = Consigner(
                name=raw_consigner,
                code=existing_template.code if existing_template else None,
                contact_person=existing_template.contact_person if existing_template else None,
                phone=existing_template.phone if existing_template else None,
                email=existing_template.email if existing_template else None,
                gstin=existing_template.gstin if existing_template else None,
                pan=existing_template.pan if existing_template else None,
                address=existing_template.address if existing_template else None,
                city=existing_template.city if existing_template else None,
                state=existing_template.state if existing_template else None,
                pincode=existing_template.pincode if existing_template else None,
                country=existing_template.country if existing_template else "India",
                is_active=True,
                issuing_office_id=resolved_office_id,
            )
            db.add(consigner_obj)
            await db.flush()
            consigner_office_cache[consigner_key] = consigner_obj
            consigner_global_cache[consigner_key] = consigner_obj

        # 3. Consignee
        consignee_key = raw_consignee.lower()
        consignee_obj = consignee_office_cache.get(consignee_key)
        if not consignee_obj:
            existing_template = consignee_global_cache.get(consignee_key)
            consignee_obj = Consignee(
                name=raw_consignee,
                code=existing_template.code if existing_template else None,
                contact_person=existing_template.contact_person if existing_template else None,
                phone=existing_template.phone if existing_template else None,
                email=existing_template.email if existing_template else None,
                gstin=existing_template.gstin if existing_template else None,
                pan=existing_template.pan if existing_template else None,
                address=existing_template.address if existing_template else None,
                city=existing_template.city if existing_template else None,
                state=existing_template.state if existing_template else None,
                pincode=existing_template.pincode if existing_template else None,
                country=existing_template.country if existing_template else "India",
                is_active=True,
                issuing_office_id=resolved_office_id,
            )
            db.add(consignee_obj)
            await db.flush()
            consignee_office_cache[consignee_key] = consignee_obj
            consignee_global_cache[consignee_key] = consignee_obj

        # 4. Origin Location
        origin_obj = await _resolve_or_create_location(
            db=db,
            raw_location=raw_origin,
            resolved_office_id=resolved_office_id,
            location_cache=location_cache,
        )

        # 5. Destination Location
        dest_obj = await _resolve_or_create_location(
            db=db,
            raw_location=raw_dest,
            resolved_office_id=resolved_office_id,
            location_cache=location_cache,
        )

        # -------------------------------------------------------------------
        # 2b. Database Business Duplicate Check
        # Check if an identical active job with same consigner, consignee, route, and dispatch date already exists for this issuing office
        # -------------------------------------------------------------------
        db_dup_query = (
            select(Job.id, Job.job_number, Job.status)
            .where(
                Job.consigner_id == consigner_obj.id,
                Job.consignee_id == consignee_obj.id,
                Job.origin_location_id == origin_obj.id,
                Job.destination_location_id == dest_obj.id,
                Job.expected_dispatch_date == dispatch_date,
                Job.status != JobStatus.CANCELLED.value,
            )
        )
        if resolved_office_id:
            db_dup_query = db_dup_query.where(Job.issuing_office_id == resolved_office_id)

        if raw_cargo:
            db_dup_query = db_dup_query.where(
                or_(
                    Job.cargo_description == None,
                    func.lower(Job.cargo_description) == raw_cargo.lower()
                )
            )

        db_dup_res = await db.execute(db_dup_query)
        db_dup = db_dup_res.first()
        if db_dup:
            skipped_duplicates.append({
                "row": row_num,
                "job_number": effective_job_no or raw_job_no or f"Job #{db_dup.job_number}",
                "route": f"{origin_obj.city_name} → {dest_obj.city_name}",
                "dispatch_date": dispatch_date.isoformat(),
                "reason": f"Active duplicate trip order already exists in database: Job #{db_dup.job_number} for {consigner_obj.name} -> {consignee_obj.name} ({origin_obj.city_name} to {dest_obj.city_name}) on {dispatch_date}.",
                "duplicate_type": "DATABASE_DUPLICATE"
            })
            continue

        # -------------------------------------------------------------------
        # Allocate Voucher Number & Create Job
        # -------------------------------------------------------------------
        try:
            allocated_job_number = None
            if apply_series_prefix_suffix:
                try:
                    allocated_job_number = await allocate_or_validate_voucher_number(
                        db,
                        "JOB",
                        manual_number=effective_job_no if effective_job_no else None,
                        issuing_office_id=resolved_office_id,
                    )
                except AppException as ae:
                    if ae.error_code in ("SERIES_NOT_CONFIGURED", "MANUAL_SERIES_NOT_CONFIGURED"):
                        if effective_job_no:
                            allocated_job_number = effective_job_no
                        else:
                            real_usage = await get_real_voucher_usage(db, "JOB", prefix=series_prefix)
                            disp = compute_series_display_data(job_series, real_usage=real_usage) if job_series else {"next_number": 1}
                            next_seq = disp["next_number"]
                            prefix_to_use = series_prefix or (f"{branch_code}-JOB-2026-" if branch_code else "JOB-2026-")
                            while f"{prefix_to_use}{str(next_seq).zfill(4)}".lower() in used_job_numbers:
                                next_seq += 1
                            allocated_job_number = f"{prefix_to_use}{str(next_seq).zfill(4)}"
                    else:
                        raise ae
            else:
                if effective_job_no:
                    allocated_job_number = effective_job_no
                    digits = "".join(filter(str.isdigit, effective_job_no))
                    if digits and job_series:
                        try:
                            n_val = int(digits)
                            if n_val > (job_series.current_number or 0):
                                job_series.current_number = n_val
                                db.add(job_series)
                        except ValueError:
                            pass
                else:
                    real_usage = await get_real_voucher_usage(db, "JOB")
                    disp = compute_series_display_data(job_series, real_usage=real_usage) if job_series else {"next_number": 1}
                    next_seq = disp["next_number"]
                    while str(next_seq).lower() in used_job_numbers:
                        next_seq += 1
                    allocated_job_number = str(next_seq)
                    if job_series:
                        job_series.current_number = next_seq
                        db.add(job_series)

            used_job_numbers.add(allocated_job_number.lower())

            new_job = Job(
                job_number=allocated_job_number,
                job_date=job_creation_date,
                expected_dispatch_date=dispatch_date,
                consigner_id=consigner_obj.id,
                consignee_id=consignee_obj.id,
                origin_location_id=origin_obj.id,
                destination_location_id=dest_obj.id,
                billing_client_id=client_obj.id,
                billing_party=client_obj.name,
                cargo_description=raw_cargo or None,
                estimated_weight_mt=weight_val,
                estimated_packages=packages_val,
                special_instructions=raw_instructions or None,
                status=JobStatus.OPEN.value,
                created_by_user_id=user_id,
                issuing_office_id=resolved_office_id,
            )
            db.add(new_job)
            await db.flush()

            imported_jobs.append({
                "id": new_job.id,
                "job_number": new_job.job_number,
                "issuing_office_id": new_job.issuing_office_id,
                "consigner": consigner_obj.name,
                "consignee": consignee_obj.name,
                "origin": origin_obj.city_name,
                "destination": dest_obj.city_name,
                "dispatch_date": dispatch_date.isoformat(),
            })
        except AppException as ae:
            skipped_duplicates.append({
                "row": row_num,
                "job_number": effective_job_no or raw_job_no,
                "route": f"{origin_obj.city_name if 'origin_obj' in locals() and origin_obj else raw_origin} → {dest_obj.city_name if 'dest_obj' in locals() and dest_obj else raw_dest}",
                "dispatch_date": dispatch_date.isoformat(),
                "reason": ae.message,
                "duplicate_type": "DATABASE_DUPLICATE" if ae.error_code == "VOUCHER_NUMBER_ALREADY_USED" else "SERIES_ERROR"
            })
        except Exception as create_err:
            errors.append({
                "row": row_num,
                "job_number": effective_job_no or raw_job_no,
                "reason": f"Failed to create job: {str(create_err)}"
            })

    # Commit all successful inserts
    if imported_jobs:
        await db.commit()

    total_rows_count = len(rows_data)
    imported_count = len(imported_jobs)
    skipped_count = len(skipped_duplicates)
    failed_count = len(errors)

    if imported_count > 0 and failed_count == 0 and skipped_count == 0:
        overall_status = "COMPLETED"
    elif imported_count > 0:
        overall_status = "PARTIAL_SUCCESS"
    else:
        overall_status = "FAILED"

    success_rate = round((imported_count / total_rows_count * 100), 1) if total_rows_count > 0 else 0.0

    summary_report = {
        "status": overall_status,
        "total_rows": total_rows_count,
        "imported_count": imported_count,
        "skipped_duplicate_count": skipped_count,
        "failed_count": failed_count,
        "success_rate_percent": success_rate,
        "missing_columns": [],
        "execution_summary": f"Processed {total_rows_count} rows: {imported_count} jobs imported successfully, {skipped_count} skipped duplicates, {failed_count} exceptions/errors.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "status": overall_status,
        "total_rows": total_rows_count,
        "imported_count": imported_count,
        "skipped_duplicate_count": skipped_count,
        "failed_count": failed_count,
        "missing_headers": [],
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
        "imported_jobs": imported_jobs,
        "summary_report": summary_report,
    }


# ---------------------------------------------------------------------------
# LR Excel Template Generation & Mass Import Engine
# ---------------------------------------------------------------------------

REAL_LR_INPUT_COLUMNS = [
    {
        "key": "lr_number",
        "header": "LR Number",
        "required": False,
        "width": 20,
    },
    {
        "key": "lr_date",
        "header": "Date of LR / Booking Date",
        "required": True,
        "width": 26,
    },
    {
        "key": "billing_client",
        "header": "Billing Customer",
        "required": True,
        "width": 28,
    },
    {
        "key": "consigner",
        "header": "Consignor",
        "required": True,
        "width": 28,
    },
    {
        "key": "consignee",
        "header": "Consignee",
        "required": True,
        "width": 28,
    },
    {
        "key": "origin_location",
        "header": "Origin Hub / City",
        "required": True,
        "width": 24,
    },
    {
        "key": "destination_location",
        "header": "Destination Hub / City",
        "required": True,
        "width": 24,
    },
    {
        "key": "vehicle_number",
        "header": "Truck Number",
        "required": True,
        "width": 20,
    },
    {
        "key": "driver_name",
        "header": "Driver Name",
        "required": False,
        "width": 22,
    },
    {
        "key": "driver_phone",
        "header": "Driver Mobile No.",
        "required": False,
        "width": 20,
    },
    {
        "key": "cargo_description",
        "header": "Cargo Description",
        "required": False,
        "width": 30,
    },
    {
        "key": "package_count",
        "header": "No. of Packages",
        "required": False,
        "width": 18,
    },
    {
        "key": "actual_weight_mt",
        "header": "Actual Weight (MT)",
        "required": False,
        "width": 20,
    },
    {
        "key": "chargeable_weight_mt",
        "header": "Charged Weight (MT)",
        "required": False,
        "width": 20,
    },
    {
        "key": "freight_amount",
        "header": "Freight Amount (₹)",
        "required": False,
        "width": 20,
    },
    {
        "key": "advance_amount",
        "header": "Advance Amount (₹)",
        "required": False,
        "width": 20,
    },
    {
        "key": "payment_type",
        "header": "Payment Type",
        "required": False,
        "width": 18,
    },
    {
        "key": "invoice_no",
        "header": "Invoice No.",
        "required": False,
        "width": 20,
    },
    {
        "key": "invoice_value",
        "header": "Invoice Value (₹)",
        "required": False,
        "width": 20,
    },
    {
        "key": "eway_bill_number",
        "header": "E-Way Bill No.",
        "required": False,
        "width": 22,
    },
    {
        "key": "remarks",
        "header": "Remarks / Instructions",
        "required": False,
        "width": 32,
    },
]


async def generate_lr_import_template(db: AsyncSession) -> io.BytesIO:
    """
    Generates a clean, professional Excel template with ONLY the real input headers
    matching the LR Booking UI.
    Contains ZERO demo data — row 2 onwards are clean empty rows ready for user data entry.
    """
    wb = openpyxl.Workbook()

    ws = wb.active
    ws.title = "LR_Booking_Import"
    ws.views.sheetView[0].showGridLines = True

    # Styling elements
    header_font = Font(name="Segoe UI", size=11, bold=True, color=HEADER_FONT_COLOR)
    header_fill = PatternFill(start_color=HEADER_FILL_COLOR, end_color=HEADER_FILL_COLOR, fill_type="solid")
    regular_font = Font(name="Segoe UI", size=10)
    thin_border_side = Side(border_style="thin", color=BORDER_COLOR)
    cell_border = Border(
        left=thin_border_side,
        right=thin_border_side,
        top=thin_border_side,
        bottom=thin_border_side
    )
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")

    # Set Header row (Row 1)
    ws.row_dimensions[1].height = 32
    for col_idx, col_def in enumerate(REAL_LR_INPUT_COLUMNS, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.value = col_def["header"] + (" *" if col_def["required"] else "")
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = cell_border
        ws.column_dimensions[get_column_letter(col_idx)].width = col_def["width"]

    # Provide 50 clean, pre-bordered blank rows ready for direct data entry (NO DEMO DATA)
    for r in range(2, 52):
        ws.row_dimensions[r].height = 22
        for col_idx in range(1, len(REAL_LR_INPUT_COLUMNS) + 1):
            cell = ws.cell(row=r, column=col_idx)
            cell.border = cell_border
            cell.font = regular_font
            cell.alignment = left_align

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def _normalize_lr_header(header: str) -> str:
    """Normalize column header to canonical key matching real LR input fields."""
    clean = re.sub(r"[^a-zA-Z0-9]", "_", str(header or "").strip().lower())
    clean = re.sub(r"_+", "_", clean).strip("_")

    if any(k in clean for k in ["lr_no", "lr_number", "lr_#", "gr_no", "gr_number", "cn_no", "consignment_note", "consignment_no"]):
        return "lr_number"
    if any(k in clean for k in ["date_of_lr", "lr_date", "booking_date", "date_of_booking", "gr_date", "consignment_date", "date"]):
        return "lr_date"
    if any(k in clean for k in ["dispatch_date", "scheduled_dispatch", "expected_dispatch"]):
        return "dispatch_date"
    if any(k in clean for k in ["billing_client", "billing_party", "billing_customer", "customer", "bill_to", "client"]):
        return "billing_client"
    if any(k in clean for k in ["consigner", "consignor", "shipper", "sender"]):
        return "consigner"
    if any(k in clean for k in ["consignee", "receiver", "recipient"]):
        return "consignee"
    if any(k in clean for k in ["origin_location", "origin_city", "origin", "from_city", "pickup_location", "from"]):
        return "origin_location"
    if any(k in clean for k in ["destination_location", "destination_city", "destination", "to_city", "drop_location", "to"]):
        return "destination_location"
    if any(k in clean for k in ["vehicle_number", "truck_no", "truck_number", "vehicle_no", "lorry_no", "vehicle", "truck"]):
        return "vehicle_number"
    if any(k in clean for k in ["driver_name", "driver"]):
        return "driver_name"
    if any(k in clean for k in ["driver_phone", "driver_mobile", "driver_contact", "phone", "mobile"]):
        return "driver_phone"
    if any(k in clean for k in ["cargo_description", "cargo", "material", "goods", "commodity", "item", "particulars"]):
        return "cargo_description"
    if any(k in clean for k in ["load_type", "load"]):
        return "load_type"
    if any(k in clean for k in ["no_of_packages", "package_count", "total_packages", "packages", "pkg", "box", "carton", "units", "quantity"]):
        return "package_count"
    if any(k in clean for k in ["actual_weight_mt", "actual_weight", "act_weight", "weight_mt"]):
        return "actual_weight_mt"
    if any(k in clean for k in ["chargeable_weight_mt", "chargeable_weight", "charged_weight_mt", "charged_weight", "chrg_weight"]):
        return "chargeable_weight_mt"
    if any(k in clean for k in ["freight_amount", "freight", "basic_freight", "freight_rate", "rate"]):
        return "freight_amount"
    if any(k in clean for k in ["advance_amount", "advance", "adv_amount"]):
        return "advance_amount"
    if any(k in clean for k in ["payment_type", "payment_mode", "payment_terms", "pay_type"]):
        return "payment_type"
    if any(k in clean for k in ["invoice_no", "invoice_number", "inv_no", "invoice"]):
        return "invoice_no"
    if any(k in clean for k in ["invoice_value", "inv_value", "declared_value"]):
        return "invoice_value"
    if any(k in clean for k in ["eway_bill_number", "eway_bill", "ewb_no", "eway_bill_no", "ewb"]):
        return "eway_bill_number"
    if any(k in clean for k in ["job_no", "job_number", "job_#"]):
        return "job_number"
    if any(k in clean for k in ["instruction", "remark", "note", "remarks", "special_instructions"]):
        return "remarks"

    return clean


MANDATORY_LR_COLUMNS = [
    ("billing_client", "Billing Customer"),
    ("consigner", "Consignor"),
    ("consignee", "Consignee"),
    ("origin_location", "Origin Hub / City"),
    ("destination_location", "Destination Hub / City"),
    ("vehicle_number", "Truck Number"),
]


async def import_lrs_from_excel(
    db: AsyncSession,
    file_bytes: bytes,
    filename: str,
    user_id: Optional[int] = None,
    apply_series_prefix_suffix: bool = True,
    office_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Parses Excel (.xlsx/.xls) or CSV file for Lorry Receipts (LR/GR),
    sorts rows chronologically by date (oldest date gets next available series number,
    first-come first-served on identical dates), auto-creates linked Jobs for every LR,
    and performs deep 2-level deduplication.
    """
    resolved_office_id = office_id
    if not resolved_office_id or resolved_office_id == 0:
        br_res = await db.execute(
            select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1)
        )
        resolved_office_id = br_res.scalar_one_or_none()

    rows_data: List[Dict[str, Any]] = []

    # 1. Parse File into List of dicts with exception handling for corrupted files
    try:
        is_csv = filename.lower().endswith(".csv")
        if is_csv:
            content_str = file_bytes.decode("utf-8-sig", errors="replace")
            csv_reader = csv.reader(io.StringIO(content_str))
            headers_raw = next(csv_reader, [])
            header_map = {idx: _normalize_lr_header(h) for idx, h in enumerate(headers_raw)}
            header_row = 1
            for row_idx, row in enumerate(csv_reader, start=2):
                if not any(row):
                    continue
                row_dict = {"_row_num": row_idx}
                for col_idx, val in enumerate(row):
                    key = header_map.get(col_idx)
                    if key:
                        row_dict[key] = val
                rows_data.append(row_dict)
        else:
            # Excel .xlsx / .xls
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet_name = "LR_Booking_Import" if "LR_Booking_Import" in wb.sheetnames else wb.sheetnames[0]
            ws = wb[sheet_name]

            header_row = None
            for r in range(1, min(10, ws.max_row + 1)):
                row_vals = [ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
                normalized = [_normalize_lr_header(v) for v in row_vals if v]
                if any(k in normalized for k in ["consigner", "consignee", "billing_client", "vehicle_number", "lr_number", "origin_location"]):
                    header_row = r
                    break

            if not header_row:
                header_row = 1

            header_map = {}
            for c in range(1, ws.max_column + 1):
                val = ws.cell(row=header_row, column=c).value
                if val is not None and str(val).strip() != "":
                    header_map[c] = _normalize_lr_header(str(val))

            for r in range(header_row + 1, ws.max_row + 1):
                row_dict = {"_row_num": r}
                has_val = False
                for c in range(1, ws.max_column + 1):
                    key = header_map.get(c)
                    if key:
                        val = ws.cell(row=r, column=c).value
                        if val is not None and str(val).strip() != "":
                            has_val = True
                            row_dict[key] = val
                if has_val:
                    rows_data.append(row_dict)
    except Exception as parse_ex:
        return {
            "status": "FAILED",
            "total_rows": 0,
            "imported_count": 0,
            "skipped_duplicate_count": 0,
            "failed_count": 1,
            "missing_headers": [],
            "skipped_duplicates": [],
            "errors": [
                {
                    "row": 0,
                    "reason": f"Failed to parse uploaded spreadsheet: {str(parse_ex)}. Please ensure it is a valid Excel or CSV file.",
                }
            ],
            "imported_lrs": [],
            "summary_report": {
                "status": "FAILED",
                "total_rows": 0,
                "imported_count": 0,
                "skipped_duplicate_count": 0,
                "failed_count": 1,
                "success_rate_percent": 0.0,
                "missing_columns": [],
                "execution_summary": f"Spreadsheet read failure: {str(parse_ex)}",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    # 2. Check for Missing Mandatory Headers
    present_canonical_keys = set(header_map.values())
    missing_headers = [col_display for col_key, col_display in MANDATORY_LR_COLUMNS if col_key not in present_canonical_keys]
    if missing_headers:
        missing_desc = ", ".join(missing_headers)
        return {
            "status": "FAILED",
            "total_rows": 0,
            "imported_count": 0,
            "skipped_duplicate_count": 0,
            "failed_count": 1,
            "missing_headers": missing_headers,
            "skipped_duplicates": [],
            "errors": [
                {
                    "row": header_row,
                    "column": missing_desc,
                    "reason": f"Uploaded file is missing required columns: {missing_desc}. Please download the template or ensure the header row includes these columns.",
                }
            ],
            "imported_lrs": [],
            "summary_report": {
                "status": "FAILED",
                "total_rows": 0,
                "imported_count": 0,
                "skipped_duplicate_count": 0,
                "failed_count": 1,
                "success_rate_percent": 0.0,
                "missing_columns": missing_headers,
                "execution_summary": f"Import failed: Missing required column(s): {missing_desc}.",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    if not rows_data:
        return {
            "status": "FAILED",
            "total_rows": 0,
            "imported_count": 0,
            "skipped_duplicate_count": 0,
            "failed_count": 0,
            "missing_headers": [],
            "skipped_duplicates": [],
            "errors": [{"row": 1, "reason": "No data rows found in the uploaded file."}],
            "imported_lrs": [],
            "summary_report": {
                "status": "FAILED",
                "total_rows": 0,
                "imported_count": 0,
                "skipped_duplicate_count": 0,
                "failed_count": 0,
                "success_rate_percent": 0.0,
                "missing_columns": [],
                "execution_summary": "No data rows found in the uploaded file.",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    # Extract & validate fields before sorting
    valid_rows: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    skipped_duplicates: List[Dict[str, Any]] = []
    imported_lrs: List[Dict[str, Any]] = []

    for row in rows_data:
        row_num = row.get("_row_num", 0)
        raw_lr_no = str(row.get("lr_number") or "").strip()
        raw_client = str(row.get("billing_client") or "").strip()
        raw_consigner = str(row.get("consigner") or "").strip()
        raw_consignee = str(row.get("consignee") or "").strip()
        raw_origin = str(row.get("origin_location") or "").strip()
        raw_dest = str(row.get("destination_location") or "").strip()
        raw_vehicle = str(row.get("vehicle_number") or "").strip().upper()
        raw_driver_name = str(row.get("driver_name") or "").strip()
        raw_driver_phone = str(row.get("driver_phone") or "").strip()
        raw_cargo = str(row.get("cargo_description") or "").strip()
        raw_load_type = str(row.get("load_type") or "").strip()
        raw_package_count = row.get("package_count")
        raw_actual_weight = row.get("actual_weight_mt")
        raw_chargeable_weight = row.get("chargeable_weight_mt")
        raw_freight = row.get("freight_amount")
        raw_advance = row.get("advance_amount")
        raw_payment_type = str(row.get("payment_type") or "").strip()
        raw_invoice_no = str(row.get("invoice_no") or "").strip()
        raw_invoice_value = row.get("invoice_value")
        raw_eway_bill = str(row.get("eway_bill_number") or "").strip()
        raw_job_no = str(row.get("job_number") or "").strip()
        raw_remarks = str(row.get("remarks") or "").strip()

        # Parse & Validate Dates with exception handling
        raw_lr_date = row.get("lr_date")
        if raw_lr_date is not None and str(raw_lr_date).strip() != "":
            parsed_lr_date = _parse_date(raw_lr_date)
            if parsed_lr_date is None:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "Booking Date",
                    "reason": f"Invalid date format for Booking Date: '{raw_lr_date}'. Expected format: YYYY-MM-DD or DD/MM/YYYY.",
                })
                continue
            lr_date = parsed_lr_date
        else:
            lr_date = date.today()

        raw_dispatch_date = row.get("dispatch_date")
        if raw_dispatch_date is not None and str(raw_dispatch_date).strip() != "":
            parsed_dispatch = _parse_date(raw_dispatch_date)
            if parsed_dispatch is None:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "Scheduled Dispatch Date",
                    "reason": f"Invalid date format for Dispatch Date: '{raw_dispatch_date}'. Expected format: YYYY-MM-DD or DD/MM/YYYY.",
                })
                continue
            dispatch_date = parsed_dispatch
        else:
            dispatch_date = lr_date

        # Check required fields
        if not raw_client:
            errors.append({"row": row_num, "lr_number": raw_lr_no, "field": "Billing Customer", "reason": "Missing mandatory field 'Billing Customer'."})
            continue
        if not raw_consigner:
            errors.append({"row": row_num, "lr_number": raw_lr_no, "field": "Consignor", "reason": "Missing mandatory field 'Consignor'."})
            continue
        if not raw_consignee:
            errors.append({"row": row_num, "lr_number": raw_lr_no, "field": "Consignee", "reason": "Missing mandatory field 'Consignee'."})
            continue
        if not raw_origin:
            errors.append({"row": row_num, "lr_number": raw_lr_no, "field": "Origin Hub / City", "reason": "Missing mandatory field 'Origin Hub / City'."})
            continue
        if not raw_dest:
            errors.append({"row": row_num, "lr_number": raw_lr_no, "field": "Destination Hub / City", "reason": "Missing mandatory field 'Destination Hub / City'."})
            continue
        if not raw_vehicle:
            errors.append({"row": row_num, "lr_number": raw_lr_no, "field": "Truck Number", "reason": "Missing mandatory field 'Truck Number'."})
            continue

        # Validate numeric format exceptions
        if raw_freight is not None and str(raw_freight).strip() != "":
            try:
                clean_f = str(raw_freight).replace(",", "").strip()
                f_val = Decimal(clean_f)
                if f_val < 0:
                    raise ValueError("Must be non-negative")
            except Exception:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "Freight Amount",
                    "reason": f"Invalid numeric format for Freight Amount: '{raw_freight}'.",
                })
                continue

        if raw_advance is not None and str(raw_advance).strip() != "":
            try:
                clean_a = str(raw_advance).replace(",", "").strip()
                a_val = Decimal(clean_a)
                if a_val < 0:
                    raise ValueError("Must be non-negative")
            except Exception:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "Advance Amount",
                    "reason": f"Invalid numeric format for Advance Amount: '{raw_advance}'.",
                })
                continue

        if raw_package_count is not None and str(raw_package_count).strip() != "":
            try:
                clean_p = str(raw_package_count).replace(",", "").strip()
                p_val = int(float(clean_p))
                if p_val < 0:
                    raise ValueError("Must be non-negative")
            except Exception:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "No. of Packages",
                    "reason": f"Invalid integer format for Packages: '{raw_package_count}'.",
                })
                continue

        if raw_actual_weight is not None and str(raw_actual_weight).strip() != "":
            try:
                clean_w = str(raw_actual_weight).replace(",", "").strip()
                w_val = Decimal(clean_w)
                if w_val < 0:
                    raise ValueError("Must be non-negative")
            except Exception:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "Actual Weight",
                    "reason": f"Invalid numeric format for Actual Weight: '{raw_actual_weight}'.",
                })
                continue

        if raw_chargeable_weight is not None and str(raw_chargeable_weight).strip() != "":
            try:
                clean_cw = str(raw_chargeable_weight).replace(",", "").strip()
                cw_val = Decimal(clean_cw)
                if cw_val < 0:
                    raise ValueError("Must be non-negative")
            except Exception:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "Charged Weight",
                    "reason": f"Invalid numeric format for Charged Weight: '{raw_chargeable_weight}'.",
                })
                continue

        if raw_invoice_value is not None and str(raw_invoice_value).strip() != "":
            try:
                clean_iv = str(raw_invoice_value).replace(",", "").strip()
                iv_val = Decimal(clean_iv)
                if iv_val < 0:
                    raise ValueError("Must be non-negative")
            except Exception:
                errors.append({
                    "row": row_num,
                    "lr_number": raw_lr_no,
                    "field": "Invoice Value",
                    "reason": f"Invalid numeric format for Invoice Value: '{raw_invoice_value}'.",
                })
                continue

        valid_rows.append({
            "_row_num": row_num,
            "raw_lr_no": raw_lr_no,
            "lr_date": lr_date,
            "dispatch_date": dispatch_date,
            "raw_client": raw_client,
            "raw_consigner": raw_consigner,
            "raw_consignee": raw_consignee,
            "raw_origin": raw_origin,
            "raw_dest": raw_dest,
            "raw_vehicle": raw_vehicle,
            "raw_driver_name": raw_driver_name,
            "raw_driver_phone": raw_driver_phone,
            "raw_cargo": raw_cargo,
            "raw_load_type": raw_load_type,
            "raw_package_count": raw_package_count,
            "raw_actual_weight": raw_actual_weight,
            "raw_chargeable_weight": raw_chargeable_weight,
            "raw_freight": raw_freight,
            "raw_advance": raw_advance,
            "raw_payment_type": raw_payment_type,
            "raw_invoice_no": raw_invoice_no,
            "raw_invoice_value": raw_invoice_value,
            "raw_eway_bill": raw_eway_bill,
            "raw_job_no": raw_job_no,
            "raw_remarks": raw_remarks,
        })

    # -----------------------------------------------------------------------
    # CRITICAL SORTING: Chronological Order by Date (Oldest Date First)
    # If same date: First-Come, First-Served based on original row index
    # -----------------------------------------------------------------------
    valid_rows.sort(key=lambda r: (r["lr_date"], r["_row_num"]))

    # In-memory caches to speed up master resolution
    consigner_office_cache: Dict[str, Consigner] = {}
    consigner_global_cache: Dict[str, Consigner] = {}
    consignee_office_cache: Dict[str, Consignee] = {}
    consignee_global_cache: Dict[str, Consignee] = {}
    location_cache: Dict[str, Location] = {}
    billing_client_office_cache: Dict[str, BillingClient] = {}
    billing_client_global_cache: Dict[str, BillingClient] = {}

    try:
        all_c_res = await db.execute(select(Consigner).where(Consigner.is_active == True))
        for c in all_c_res.scalars().all():
            k_name = c.name.strip().lower()
            consigner_global_cache[k_name] = c
            if c.code:
                consigner_global_cache[c.code.strip().lower()] = c
            if c.issuing_office_id == resolved_office_id or c.issuing_office_id is None:
                consigner_office_cache[k_name] = c
                if c.code:
                    consigner_office_cache[c.code.strip().lower()] = c

        all_ce_res = await db.execute(select(Consignee).where(Consignee.is_active == True))
        for ce in all_ce_res.scalars().all():
            k_name = ce.name.strip().lower()
            consignee_global_cache[k_name] = ce
            if ce.code:
                consignee_global_cache[ce.code.strip().lower()] = ce
            if ce.issuing_office_id == resolved_office_id or ce.issuing_office_id is None:
                consignee_office_cache[k_name] = ce
                if ce.code:
                    consignee_office_cache[ce.code.strip().lower()] = ce

        all_bc_res = await db.execute(select(BillingClient).where(BillingClient.is_active == True))
        for bc in all_bc_res.scalars().all():
            k_name = bc.name.strip().lower()
            billing_client_global_cache[k_name] = bc
            if bc.code:
                billing_client_global_cache[bc.code.strip().lower()] = bc
            if bc.issuing_office_id == resolved_office_id or bc.issuing_office_id is None:
                billing_client_office_cache[k_name] = bc
                if bc.code:
                    billing_client_office_cache[bc.code.strip().lower()] = bc
    except Exception:
        pass

    # Branch Code for default prefix
    branch_code = ""
    if resolved_office_id:
        try:
            br_obj = await db.get(Branch, resolved_office_id)
            if br_obj and br_obj.code:
                branch_code = br_obj.code.strip().upper()
        except Exception:
            pass

    # Fetch active SeriesMaster for LR
    lr_series = None
    try:
        stmt_lr_s = (
            select(SeriesMaster)
            .where(
                SeriesMaster.document_type == "LR",
                SeriesMaster.is_active == True,
            )
        )
        if resolved_office_id:
            stmt_lr_s = stmt_lr_s.where(
                or_(
                    SeriesMaster.issuing_office_id == resolved_office_id,
                    SeriesMaster.issuing_office_id.is_(None),
                )
            ).order_by(
                case((SeriesMaster.issuing_office_id == resolved_office_id, 1), else_=0).desc(),
                SeriesMaster.is_default.desc(),
                SeriesMaster.id.desc(),
            )
        else:
            stmt_lr_s = stmt_lr_s.order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.desc())
        series_res = await db.execute(stmt_lr_s)
        lr_series = series_res.scalars().first()

        if not lr_series and resolved_office_id:
            stmt_fallback = (
                select(SeriesMaster)
                .where(
                    SeriesMaster.document_type == "LR",
                    SeriesMaster.is_active == True,
                )
                .order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.desc())
            )
            series_res = await db.execute(stmt_fallback)
            lr_series = series_res.scalars().first()
    except Exception:
        pass

    lr_series_prefix = (lr_series.prefix or "") if lr_series else (f"{branch_code}-LR-2026-" if branch_code else "LR-2026-")
    lr_series_suffix = (lr_series.suffix or "") if lr_series else ""

    # Fetch active SeriesMaster for JOB
    job_series = None
    try:
        stmt_job_s = (
            select(SeriesMaster)
            .where(
                SeriesMaster.document_type.in_(["JOB", "TRIP"]),
                SeriesMaster.is_active == True,
            )
        )
        if resolved_office_id:
            stmt_job_s = stmt_job_s.where(
                or_(
                    SeriesMaster.issuing_office_id == resolved_office_id,
                    SeriesMaster.issuing_office_id.is_(None),
                )
            ).order_by(
                case((SeriesMaster.issuing_office_id == resolved_office_id, 1), else_=0).desc(),
                SeriesMaster.is_default.desc(),
                SeriesMaster.id.desc(),
            )
        else:
            stmt_job_s = stmt_job_s.order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.desc())
        jseries_res = await db.execute(stmt_job_s)
        job_series = jseries_res.scalars().first()

        if not job_series and resolved_office_id:
            stmt_jfallback = (
                select(SeriesMaster)
                .where(
                    SeriesMaster.document_type.in_(["JOB", "TRIP"]),
                    SeriesMaster.is_active == True,
                )
                .order_by(SeriesMaster.is_default.desc(), SeriesMaster.id.desc())
            )
            jseries_res = await db.execute(stmt_jfallback)
            job_series = jseries_res.scalars().first()
    except Exception:
        pass

    job_series_prefix = (job_series.prefix or "") if job_series else (f"{branch_code}-JOB-2026-" if branch_code else "JOB-2026-")
    job_series_suffix = (job_series.suffix or "") if job_series else ""

    # Tracking sets for deduplication & collision prevention
    seen_excel_lr_numbers: Dict[str, int] = {}
    seen_excel_signatures: Dict[str, int] = {}
    used_lr_numbers: Set[str] = set()
    used_job_numbers: Set[str] = set()

    # Pre-populate used numbers from database
    try:
        existing_lrs_q = await db.execute(select(LR.lr_number))
        for (eno,) in existing_lrs_q.all():
            if eno:
                used_lr_numbers.add(str(eno).strip().lower())
        existing_jobs_q = await db.execute(select(Job.job_number))
        for (jno,) in existing_jobs_q.all():
            if jno:
                used_job_numbers.add(str(jno).strip().lower())
    except Exception:
        pass

    # Process all rows in sorted chronological order
    for row in valid_rows:
        row_num = row["_row_num"]
        raw_lr_no = row["raw_lr_no"]
        lr_date = row["lr_date"]
        dispatch_date = row["dispatch_date"]
        raw_client = row["raw_client"]
        raw_consigner = row["raw_consigner"]
        raw_consignee = row["raw_consignee"]
        raw_origin = row["raw_origin"]
        raw_dest = row["raw_dest"]
        raw_vehicle = row["raw_vehicle"]
        raw_driver_name = row["raw_driver_name"]
        raw_driver_phone = row["raw_driver_phone"]
        raw_cargo = row["raw_cargo"]
        raw_load_type = row["raw_load_type"]
        raw_package_count = row["raw_package_count"]
        raw_actual_weight = row["raw_actual_weight"]
        raw_chargeable_weight = row["raw_chargeable_weight"]
        raw_freight = row["raw_freight"]
        raw_advance = row["raw_advance"]
        raw_payment_type = row["raw_payment_type"]
        raw_invoice_no = row["raw_invoice_no"]
        raw_invoice_value = row["raw_invoice_value"]
        raw_eway_bill = row["raw_eway_bill"]
        raw_job_no = row["raw_job_no"]
        raw_remarks = row["raw_remarks"]

        # Determine effective manual LR number if provided
        if raw_lr_no:
            if apply_series_prefix_suffix:
                formatted_lr_no = raw_lr_no
                if lr_series_prefix and not formatted_lr_no.lower().startswith(lr_series_prefix.lower()):
                    formatted_lr_no = f"{lr_series_prefix}{formatted_lr_no}"
                if lr_series_suffix and not formatted_lr_no.lower().endswith(lr_series_suffix.lower()):
                    formatted_lr_no = f"{formatted_lr_no}{lr_series_suffix}"
                effective_lr_no = formatted_lr_no
            else:
                effective_lr_no = raw_lr_no
        else:
            effective_lr_no = None

        # -------------------------------------------------------------------
        # Level 1 Deduplication: Within Excel File
        # -------------------------------------------------------------------
        if effective_lr_no:
            lower_lr = effective_lr_no.lower()
            if lower_lr in seen_excel_lr_numbers:
                first_row = seen_excel_lr_numbers[lower_lr]
                skipped_duplicates.append({
                    "row": row_num,
                    "lr_number": effective_lr_no,
                    "vehicle_number": raw_vehicle,
                    "route": f"{raw_origin} → {raw_dest}",
                    "lr_date": lr_date.isoformat(),
                    "reason": f"Duplicate LR Number '{effective_lr_no}' repeated within Excel file (first seen on Row {first_row}).",
                    "duplicate_type": "EXCEL_FILE_DUPLICATE"
                })
                continue
            seen_excel_lr_numbers[lower_lr] = row_num

        row_signature = (
            f"{raw_client.lower()}|{raw_consigner.lower()}|{raw_consignee.lower()}|{raw_origin.lower()}|"
            f"{raw_dest.lower()}|{raw_vehicle.lower()}|{lr_date.isoformat()}"
        )
        if row_signature in seen_excel_signatures:
            first_row = seen_excel_signatures[row_signature]
            skipped_duplicates.append({
                "row": row_num,
                "lr_number": effective_lr_no or "AUTO",
                "vehicle_number": raw_vehicle,
                "route": f"{raw_origin} → {raw_dest}",
                "lr_date": lr_date.isoformat(),
                "reason": f"Duplicate consignment repeated within Excel file: Same Client, Consignor, Consignee, Route ({raw_origin} → {raw_dest}), Vehicle ({raw_vehicle}), and Date ({lr_date.isoformat()}) (matches Row {first_row}).",
                "duplicate_type": "EXCEL_FILE_DUPLICATE"
            })
            continue
        seen_excel_signatures[row_signature] = row_num

        # -------------------------------------------------------------------
        # Level 2 Deduplication: Database Check
        # -------------------------------------------------------------------
        if effective_lr_no:
            check_nums = [effective_lr_no.lower()]
            if raw_lr_no and raw_lr_no.lower() not in check_nums:
                check_nums.append(raw_lr_no.lower())
            existing_lr_res = await db.execute(
                select(LR.id, LR.lr_number, LR.status).where(func.lower(LR.lr_number).in_(check_nums))
            )
            existing_lr = existing_lr_res.first()
            if existing_lr:
                skipped_duplicates.append({
                    "row": row_num,
                    "lr_number": effective_lr_no,
                    "vehicle_number": raw_vehicle,
                    "route": f"{raw_origin} → {raw_dest}",
                    "lr_date": lr_date.isoformat(),
                    "reason": f"LR Number '{effective_lr_no}' already exists in database (LR #{existing_lr.lr_number}, Status: {existing_lr.status}).",
                    "duplicate_type": "DATABASE_DUPLICATE"
                })
                continue

        # -------------------------------------------------------------------
        # Sub-field Resolution & Auto-creation
        # -------------------------------------------------------------------
        # 1. Billing Client
        client_key = raw_client.lower()
        client_obj = billing_client_office_cache.get(client_key)
        if not client_obj:
            existing_template = billing_client_global_cache.get(client_key)
            client_obj = BillingClient(
                name=raw_client,
                code=existing_template.code if existing_template else None,
                company_name=existing_template.company_name if existing_template else None,
                contact_person=existing_template.contact_person if existing_template else None,
                phone=existing_template.phone if existing_template else None,
                email=existing_template.email if existing_template else None,
                gstin=existing_template.gstin if existing_template else None,
                pan=existing_template.pan if existing_template else None,
                tds_rate=existing_template.tds_rate if existing_template else Decimal("0.00"),
                credit_period_days=existing_template.credit_period_days if existing_template else 30,
                credit_limit=existing_template.credit_limit if existing_template else Decimal("0.00"),
                payment_terms=existing_template.payment_terms if existing_template else None,
                address=existing_template.address if existing_template else None,
                city=existing_template.city if existing_template else None,
                state=existing_template.state if existing_template else None,
                pincode=existing_template.pincode if existing_template else None,
                country=existing_template.country if existing_template else "India",
                is_active=True,
                issuing_office_id=resolved_office_id,
            )
            db.add(client_obj)
            await db.flush()
            billing_client_office_cache[client_key] = client_obj
            billing_client_global_cache[client_key] = client_obj

        # 2. Consigner
        consigner_key = raw_consigner.lower()
        consigner_obj = consigner_office_cache.get(consigner_key)
        if not consigner_obj:
            existing_template = consigner_global_cache.get(consigner_key)
            consigner_obj = Consigner(
                name=raw_consigner,
                code=existing_template.code if existing_template else None,
                contact_person=existing_template.contact_person if existing_template else None,
                phone=existing_template.phone if existing_template else None,
                email=existing_template.email if existing_template else None,
                gstin=existing_template.gstin if existing_template else None,
                pan=existing_template.pan if existing_template else None,
                address=existing_template.address if existing_template else None,
                city=existing_template.city if existing_template else None,
                state=existing_template.state if existing_template else None,
                pincode=existing_template.pincode if existing_template else None,
                country=existing_template.country if existing_template else "India",
                is_active=True,
                issuing_office_id=resolved_office_id,
            )
            db.add(consigner_obj)
            await db.flush()
            consigner_office_cache[consigner_key] = consigner_obj
            consigner_global_cache[consigner_key] = consigner_obj

        # 3. Consignee
        consignee_key = raw_consignee.lower()
        consignee_obj = consignee_office_cache.get(consignee_key)
        if not consignee_obj:
            existing_template = consignee_global_cache.get(consignee_key)
            consignee_obj = Consignee(
                name=raw_consignee,
                code=existing_template.code if existing_template else None,
                contact_person=existing_template.contact_person if existing_template else None,
                phone=existing_template.phone if existing_template else None,
                email=existing_template.email if existing_template else None,
                gstin=existing_template.gstin if existing_template else None,
                pan=existing_template.pan if existing_template else None,
                address=existing_template.address if existing_template else None,
                city=existing_template.city if existing_template else None,
                state=existing_template.state if existing_template else None,
                pincode=existing_template.pincode if existing_template else None,
                country=existing_template.country if existing_template else "India",
                is_active=True,
                issuing_office_id=resolved_office_id,
            )
            db.add(consignee_obj)
            await db.flush()
            consignee_office_cache[consignee_key] = consignee_obj
            consignee_global_cache[consignee_key] = consignee_obj

        # 4. Origin Location
        origin_obj = await _resolve_or_create_location(
            db=db,
            raw_location=raw_origin,
            resolved_office_id=resolved_office_id,
            location_cache=location_cache,
        )

        # 5. Destination Location
        dest_obj = await _resolve_or_create_location(
            db=db,
            raw_location=raw_dest,
            resolved_office_id=resolved_office_id,
            location_cache=location_cache,
        )

        # 6. Database Business Duplicate Check
        db_dup_query = (
            select(LR.id, LR.lr_number, LR.status)
            .where(
                LR.consigner_id == consigner_obj.id,
                LR.consignee_id == consignee_obj.id,
                LR.origin_location_id == origin_obj.id,
                LR.destination_location_id == dest_obj.id,
                func.upper(LR.vehicle_number) == raw_vehicle.upper(),
                LR.lr_date == lr_date,
                LR.status != LRStatus.CANCELLED.value,
            )
        )
        if resolved_office_id:
            db_dup_query = db_dup_query.where(LR.issuing_office_id == resolved_office_id)

        db_dup_res = await db.execute(db_dup_query)
        db_dup = db_dup_res.first()
        if db_dup:
            skipped_duplicates.append({
                "row": row_num,
                "lr_number": effective_lr_no or raw_lr_no or f"LR #{db_dup.lr_number}",
                "vehicle_number": raw_vehicle,
                "route": f"{origin_obj.city_name} → {dest_obj.city_name}",
                "lr_date": lr_date.isoformat(),
                "reason": f"Active duplicate LR already exists in database: LR #{db_dup.lr_number} for {consigner_obj.name} -> {consignee_obj.name} ({raw_vehicle}) on {lr_date}.",
                "duplicate_type": "DATABASE_DUPLICATE"
            })
            continue

        # 7. Vehicle Source Identification
        vehicle_source = "MARKET"
        cv_stmt = select(CompanyVehicle.id).where(func.upper(CompanyVehicle.vehicle_number) == raw_vehicle.upper())
        cv_res = await db.execute(cv_stmt)
        if cv_res.scalar_one_or_none():
            vehicle_source = "COMPANY"

        # Parse numeric and weight fields safely
        actual_weight_val = Decimal("0.000")
        if raw_actual_weight is not None and str(raw_actual_weight).strip() != "":
            try:
                actual_weight_val = Decimal(str(raw_actual_weight).replace(",", "").strip())
            except Exception:
                actual_weight_val = Decimal("0.000")

        chargeable_weight_val = Decimal("0.000")
        if raw_chargeable_weight is not None and str(raw_chargeable_weight).strip() != "":
            try:
                chargeable_weight_val = Decimal(str(raw_chargeable_weight).replace(",", "").strip())
            except Exception:
                chargeable_weight_val = actual_weight_val
        else:
            chargeable_weight_val = actual_weight_val

        packages_val = 0
        if raw_package_count is not None and str(raw_package_count).strip() != "":
            try:
                packages_val = int(float(str(raw_package_count).replace(",", "").strip()))
            except Exception:
                packages_val = 0

        freight_val = Decimal("0.00")
        if raw_freight is not None and str(raw_freight).strip() != "":
            try:
                freight_val = Decimal(str(raw_freight).replace(",", "").strip())
            except Exception:
                freight_val = Decimal("0.00")

        advance_val = Decimal("0.00")
        if raw_advance is not None and str(raw_advance).strip() != "":
            try:
                advance_val = Decimal(str(raw_advance).replace(",", "").strip())
            except Exception:
                advance_val = Decimal("0.00")

        balance_val = max(Decimal("0.00"), freight_val - advance_val)

        inv_val = Decimal("0.00")
        if raw_invoice_value is not None and str(raw_invoice_value).strip() != "":
            try:
                inv_val = Decimal(str(raw_invoice_value).replace(",", "").strip())
            except Exception:
                inv_val = Decimal("0.00")

        # -------------------------------------------------------------------
        # Allocate LR Number & Job Number, Auto-Create Linked Job Order
        # -------------------------------------------------------------------
        try:
            # 1. Allocate LR Number
            allocated_lr_number = None
            if effective_lr_no:
                allocated_lr_number = effective_lr_no
                used_lr_numbers.add(allocated_lr_number.lower())
            elif apply_series_prefix_suffix:
                try:
                    allocated_lr_number = await allocate_or_validate_voucher_number(
                        db,
                        "LR",
                        manual_number=None,
                        issuing_office_id=resolved_office_id,
                    )
                    while allocated_lr_number.lower() in used_lr_numbers:
                        # Collision with previous row in same batch: generate next
                        real_usage = await get_real_voucher_usage(db, "LR", prefix=lr_series_prefix)
                        disp = compute_series_display_data(lr_series, real_usage=real_usage) if lr_series else {"next_number": 1}
                        n_seq = disp["next_number"] + len(used_lr_numbers)
                        allocated_lr_number = format_series_number(lr_series_prefix, n_seq, lr_series_suffix)
                    used_lr_numbers.add(allocated_lr_number.lower())
                except AppException as ae:
                    if ae.error_code in ("SERIES_NOT_CONFIGURED", "MANUAL_SERIES_NOT_CONFIGURED"):
                        real_usage = await get_real_voucher_usage(db, "LR", prefix=lr_series_prefix)
                        disp = compute_series_display_data(lr_series, real_usage=real_usage) if lr_series else {"next_number": 1}
                        next_seq = disp["next_number"]
                        prefix_to_use = lr_series_prefix or (f"{branch_code}-LR-2026-" if branch_code else "LR-2026-")
                        fmt_num = format_series_number(prefix_to_use, next_seq, lr_series_suffix)
                        while fmt_num.lower() in used_lr_numbers:
                            next_seq += 1
                            fmt_num = format_series_number(prefix_to_use, next_seq, lr_series_suffix)
                        allocated_lr_number = fmt_num
                        used_lr_numbers.add(allocated_lr_number.lower())
                        if lr_series:
                            lr_series.current_number = next_seq
                            db.add(lr_series)
                    else:
                        raise ae
            else:
                # Without series prefix/postfix: sequential integer string
                real_usage = await get_real_voucher_usage(db, "LR")
                disp = compute_series_display_data(lr_series, real_usage=real_usage) if lr_series else {"next_number": 1}
                next_seq = disp["next_number"]
                while str(next_seq).lower() in used_lr_numbers:
                    next_seq += 1
                allocated_lr_number = str(next_seq)
                used_lr_numbers.add(allocated_lr_number.lower())
                if lr_series:
                    lr_series.current_number = next_seq
                    db.add(lr_series)

            # 2. Auto-Create Linked Job Order (Auto-allocated Job Number in exact chronological sequence)
            allocated_job_number = None
            if raw_job_no:
                allocated_job_number = raw_job_no
                used_job_numbers.add(allocated_job_number.lower())
            elif apply_series_prefix_suffix:
                try:
                    allocated_job_number = await allocate_or_validate_voucher_number(
                        db,
                        "JOB",
                        manual_number=None,
                        issuing_office_id=resolved_office_id,
                    )
                    while allocated_job_number.lower() in used_job_numbers:
                        real_usage = await get_real_voucher_usage(db, "JOB", prefix=job_series_prefix)
                        disp = compute_series_display_data(job_series, real_usage=real_usage) if job_series else {"next_number": 1}
                        j_seq = disp["next_number"] + len(used_job_numbers)
                        allocated_job_number = format_series_number(job_series_prefix, j_seq, job_series_suffix)
                    used_job_numbers.add(allocated_job_number.lower())
                except AppException as ae:
                    if ae.error_code in ("SERIES_NOT_CONFIGURED", "MANUAL_SERIES_NOT_CONFIGURED"):
                        real_usage = await get_real_voucher_usage(db, "JOB", prefix=job_series_prefix)
                        disp = compute_series_display_data(job_series, real_usage=real_usage) if job_series else {"next_number": 1}
                        next_j_seq = disp["next_number"]
                        j_prefix_to_use = job_series_prefix or (f"{branch_code}-JOB-2026-" if branch_code else "JOB-2026-")
                        j_fmt_num = format_series_number(j_prefix_to_use, next_j_seq, job_series_suffix)
                        while j_fmt_num.lower() in used_job_numbers:
                            next_j_seq += 1
                            j_fmt_num = format_series_number(j_prefix_to_use, next_j_seq, job_series_suffix)
                        allocated_job_number = j_fmt_num
                        used_job_numbers.add(allocated_job_number.lower())
                        if job_series:
                            job_series.current_number = next_j_seq
                            db.add(job_series)
                    else:
                        raise ae
            else:
                real_usage = await get_real_voucher_usage(db, "JOB")
                disp = compute_series_display_data(job_series, real_usage=real_usage) if job_series else {"next_number": 1}
                next_j_seq = disp["next_number"]
                while str(next_j_seq).lower() in used_job_numbers:
                    next_j_seq += 1
                allocated_job_number = str(next_j_seq)
                used_job_numbers.add(allocated_job_number.lower())
                if job_series:
                    job_series.current_number = next_j_seq
                    db.add(job_series)

            new_job = Job(
                job_number=allocated_job_number,
                job_date=lr_date,
                expected_dispatch_date=dispatch_date,
                consigner_id=consigner_obj.id,
                consignee_id=consignee_obj.id,
                origin_location_id=origin_obj.id,
                destination_location_id=dest_obj.id,
                billing_client_id=client_obj.id,
                billing_party=client_obj.name,
                cargo_description=raw_cargo or None,
                estimated_weight_mt=chargeable_weight_val or actual_weight_val or Decimal("0.000"),
                estimated_packages=packages_val,
                special_instructions=raw_remarks or None,
                status=JobStatus.BOOKED.value,
                created_by_user_id=user_id,
                issuing_office_id=resolved_office_id,
            )
            db.add(new_job)
            await db.flush()

            # 3. Create LR Linked to the Auto-Created Job
            inv_items = []
            if raw_invoice_no or raw_eway_bill or inv_val > 0:
                inv_items.append({
                    "invoice_no": raw_invoice_no or "",
                    "invoice_date": lr_date.isoformat(),
                    "invoice_value": float(inv_val),
                    "eway_bill_number": raw_eway_bill or "",
                    "eway_bill_date": lr_date.isoformat(),
                    "eway_bill_expiry": None,
                    "packages": packages_val,
                    "weight_mt": float(chargeable_weight_val or actual_weight_val),
                    "description": raw_cargo or "",
                })

            new_lr = LR(
                lr_number=allocated_lr_number,
                lr_date=lr_date,
                dispatch_date=dispatch_date,
                job_id=new_job.id,
                consigner_id=consigner_obj.id,
                consignee_id=consignee_obj.id,
                origin_location_id=origin_obj.id,
                destination_location_id=dest_obj.id,
                billing_customer_id=client_obj.id,
                vehicle_source=vehicle_source,
                vehicle_number=raw_vehicle,
                driver_name=raw_driver_name or None,
                driver_phone=raw_driver_phone or None,
                package_count=packages_val,
                actual_weight_mt=actual_weight_val,
                chargeable_weight_mt=chargeable_weight_val,
                freight_rate=freight_val,
                freight_amount=freight_val,
                loading_charges=Decimal("0.00"),
                unloading_charges=Decimal("0.00"),
                other_charges=Decimal("0.00"),
                total_freight_amount=freight_val,
                advance_amount=advance_val,
                balance_amount=balance_val,
                payment_type=raw_payment_type or "To Be Billed",
                invoice_no=raw_invoice_no or None,
                invoice_value=inv_val,
                eway_bill_number=raw_eway_bill or None,
                particulars=raw_cargo or None,
                booking_status="Booked",
                status=LRStatus.BOOKED.value,
                remarks=raw_remarks or None,
                created_by_user_id=user_id,
                issuing_office_id=resolved_office_id,
                invoice_items=inv_items,
            )
            new_lr.job = new_job
            db.add(new_lr)
            await db.flush()

            imported_lrs.append({
                "id": new_lr.id,
                "lr_number": new_lr.lr_number,
                "job_id": new_job.id,
                "job_number": new_job.job_number,
                "issuing_office_id": new_lr.issuing_office_id,
                "consigner": consigner_obj.name,
                "consignee": consignee_obj.name,
                "origin": origin_obj.city_name,
                "destination": dest_obj.city_name,
                "vehicle_number": raw_vehicle,
                "lr_date": lr_date.isoformat(),
            })

        except AppException as ae:
            skipped_duplicates.append({
                "row": row_num,
                "lr_number": effective_lr_no or raw_lr_no,
                "vehicle_number": raw_vehicle,
                "route": f"{origin_obj.city_name if 'origin_obj' in locals() and origin_obj else raw_origin} → {dest_obj.city_name if 'dest_obj' in locals() and dest_obj else raw_dest}",
                "lr_date": lr_date.isoformat(),
                "reason": ae.message,
                "duplicate_type": "DATABASE_DUPLICATE" if ae.error_code == "VOUCHER_NUMBER_ALREADY_USED" else "SERIES_ERROR"
            })
        except Exception as create_err:
            errors.append({
                "row": row_num,
                "lr_number": effective_lr_no or raw_lr_no,
                "reason": f"Failed to create LR: {str(create_err)}"
            })

    # Commit all successful inserts
    if imported_lrs:
        await db.commit()

    total_rows_count = len(rows_data)
    imported_count = len(imported_lrs)
    skipped_count = len(skipped_duplicates)
    failed_count = len(errors)

    if imported_count > 0 and failed_count == 0 and skipped_count == 0:
        overall_status = "COMPLETED"
    elif imported_count > 0:
        overall_status = "PARTIAL_SUCCESS"
    else:
        overall_status = "FAILED"

    success_rate = round((imported_count / total_rows_count * 100), 1) if total_rows_count > 0 else 0.0

    summary_report = {
        "status": overall_status,
        "total_rows": total_rows_count,
        "imported_count": imported_count,
        "skipped_duplicate_count": skipped_count,
        "failed_count": failed_count,
        "success_rate_percent": success_rate,
        "missing_columns": [],
        "execution_summary": f"Processed {total_rows_count} rows: {imported_count} LRs imported successfully, {skipped_count} skipped duplicates, {failed_count} exceptions/errors.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "status": overall_status,
        "total_rows": total_rows_count,
        "imported_count": imported_count,
        "skipped_duplicate_count": skipped_count,
        "failed_count": failed_count,
        "missing_headers": [],
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
        "imported_lrs": imported_lrs,
        "summary_report": summary_report,
    }

