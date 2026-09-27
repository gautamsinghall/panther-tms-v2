import io
import re
import csv
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.tenant_db.models import (
    Job,
    JobStatus,
    Consigner,
    Consignee,
    Location,
    BillingClient,
)
from app.modules.settings.series_service import allocate_or_validate_voucher_number

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


async def import_jobs_from_excel(
    db: AsyncSession,
    file_bytes: bytes,
    filename: str,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Parses Excel (.xlsx/.xls) or CSV file, performs deep 2-level deduplication:
    1. Within-Excel duplicate check (job_number, exact business trip duplicate).
    2. Database duplicate check (existing job_number, existing trip matching route, dates, parties).
    Resolves/auto-creates sub-fields (Billing Client, Origin, Destination, Consigner, Consignee).
    """
    rows_data: List[Dict[str, Any]] = []

    # 1. Parse File into List of dicts
    is_csv = filename.lower().endswith(".csv")
    if is_csv:
        content_str = file_bytes.decode("utf-8-sig", errors="replace")
        csv_reader = csv.reader(io.StringIO(content_str))
        headers_raw = next(csv_reader, [])
        header_map = {idx: _normalize_header(h) for idx, h in enumerate(headers_raw)}
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
            if "consigner" in normalized or "consignee" in normalized or "origin_location" in normalized or "billing_client" in normalized:
                header_row = r
                break

        if not header_row:
            header_row = 1

        header_map = {}
        for c in range(1, ws.max_column + 1):
            val = ws.cell(row=header_row, column=c).value
            if val is not None:
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

    if not rows_data:
        return {
            "total_rows": 0,
            "imported_count": 0,
            "skipped_duplicate_count": 0,
            "failed_count": 0,
            "skipped_duplicates": [],
            "errors": [{"row": 1, "reason": "No data rows found in the uploaded file."}],
            "imported_jobs": [],
        }

    # In-memory caches to speed up master resolution
    consigner_cache: Dict[str, Consigner] = {}
    consignee_cache: Dict[str, Consignee] = {}
    location_cache: Dict[str, Location] = {}
    billing_client_cache: Dict[str, BillingClient] = {}

    # Pre-populate caches with existing active masters
    try:
        all_c_res = await db.execute(select(Consigner))
        for c in all_c_res.scalars().all():
            consigner_cache[c.name.strip().lower()] = c
            if c.code:
                consigner_cache[c.code.strip().lower()] = c

        all_ce_res = await db.execute(select(Consignee))
        for ce in all_ce_res.scalars().all():
            consignee_cache[ce.name.strip().lower()] = ce
            if ce.code:
                consignee_cache[ce.code.strip().lower()] = ce

        all_loc_res = await db.execute(select(Location))
        for loc in all_loc_res.scalars().all():
            location_cache[loc.city_name.strip().lower()] = loc
            if loc.location_code:
                location_cache[loc.location_code.strip().lower()] = loc

        all_bc_res = await db.execute(select(BillingClient))
        for bc in all_bc_res.scalars().all():
            billing_client_cache[bc.name.strip().lower()] = bc
            if bc.code:
                billing_client_cache[bc.code.strip().lower()] = bc
    except Exception:
        pass

    # Tracking sets for In-Excel Duplication Check
    seen_excel_job_numbers: Dict[str, int] = {}    # job_number.lower() -> row_num
    seen_excel_signatures: Dict[str, int] = {}     # business signature -> row_num

    imported_jobs: List[Dict[str, Any]] = []
    skipped_duplicates: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

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

        # Parse Dates
        job_creation_date = _parse_date(row.get("job_date")) or date.today()
        dispatch_date = _parse_date(row.get("scheduled_dispatch_date")) or job_creation_date

        # Check Required Fields (Matching the Real Form)
        if not raw_client:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Billing Client'."})
            continue
        if not raw_origin:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Origin Location'."})
            continue
        if not raw_dest:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Destination Location'."})
            continue
        if not raw_consigner:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Consigner'."})
            continue
        if not raw_consignee:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Consignee'."})
            continue

        # -------------------------------------------------------------------
        # Level 1 Deduplication: Within Excel File
        # -------------------------------------------------------------------
        if raw_job_no:
            lower_job = raw_job_no.lower()
            if lower_job in seen_excel_job_numbers:
                first_row = seen_excel_job_numbers[lower_job]
                skipped_duplicates.append({
                    "row": row_num,
                    "job_number": raw_job_no,
                    "reason": f"Duplicate Job Number '{raw_job_no}' repeated within Excel file (first seen on Row {first_row}).",
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
                "job_number": raw_job_no or "AUTO",
                "reason": f"Duplicate trip order repeated within Excel file: Same Client, Consigner, Consignee, Route, and Date (matches Row {first_row}).",
                "duplicate_type": "EXCEL_FILE_DUPLICATE"
            })
            continue
        seen_excel_signatures[row_signature] = row_num

        # -------------------------------------------------------------------
        # Level 2 Deduplication: Database Check
        # -------------------------------------------------------------------
        # 2a. Check if explicit Job Number already exists in DB
        if raw_job_no:
            existing_job_res = await db.execute(
                select(Job.id, Job.job_number, Job.status).where(func.lower(Job.job_number) == raw_job_no.lower())
            )
            existing_job = existing_job_res.first()
            if existing_job:
                skipped_duplicates.append({
                    "row": row_num,
                    "job_number": raw_job_no,
                    "reason": f"Job Number '{raw_job_no}' already exists in database (Job #{existing_job.job_number}, Status: {existing_job.status}).",
                    "duplicate_type": "DATABASE_DUPLICATE"
                })
                continue

        # -------------------------------------------------------------------
        # Sub-field Resolution & Auto-creation
        # -------------------------------------------------------------------
        # 1. Billing Client
        client_key = raw_client.lower()
        client_obj = billing_client_cache.get(client_key)
        if not client_obj:
            client_obj = BillingClient(
                name=raw_client,
                country="India",
                is_active=True
            )
            db.add(client_obj)
            await db.flush()
            billing_client_cache[client_key] = client_obj

        # 2. Consigner
        consigner_key = raw_consigner.lower()
        consigner_obj = consigner_cache.get(consigner_key)
        if not consigner_obj:
            consigner_obj = Consigner(
                name=raw_consigner,
                country="India",
                is_active=True
            )
            db.add(consigner_obj)
            await db.flush()
            consigner_cache[consigner_key] = consigner_obj

        # 3. Consignee
        consignee_key = raw_consignee.lower()
        consignee_obj = consignee_cache.get(consignee_key)
        if not consignee_obj:
            consignee_obj = Consignee(
                name=raw_consignee,
                country="India",
                is_active=True
            )
            db.add(consignee_obj)
            await db.flush()
            consignee_cache[consignee_key] = consignee_obj

        # 4. Origin Location
        origin_key = raw_origin.lower()
        origin_obj = location_cache.get(origin_key)
        if not origin_obj:
            origin_obj = Location(
                city_name=raw_origin.title(),
                state="General",
                country="India",
                is_pickup_point=True,
                is_drop_point=True,
                is_active=True
            )
            db.add(origin_obj)
            await db.flush()
            location_cache[origin_key] = origin_obj

        # 5. Destination Location
        dest_key = raw_dest.lower()
        dest_obj = location_cache.get(dest_key)
        if not dest_obj:
            dest_obj = Location(
                city_name=raw_dest.title(),
                state="General",
                country="India",
                is_pickup_point=True,
                is_drop_point=True,
                is_active=True
            )
            db.add(dest_obj)
            await db.flush()
            location_cache[dest_key] = dest_obj

        # -------------------------------------------------------------------
        # 2b. Database Business Duplicate Check
        # Check if an identical active job with same consigner, consignee, route, and dispatch date already exists
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
                "job_number": raw_job_no or db_dup.job_number,
                "reason": f"Active duplicate trip order already exists in database: Job #{db_dup.job_number} for {consigner_obj.name} -> {consignee_obj.name} ({origin_obj.city_name} to {dest_obj.city_name}) on {dispatch_date}.",
                "duplicate_type": "DATABASE_DUPLICATE"
            })
            continue

        # Parse numeric fields safely
        weight_val = Decimal("0.000")
        if raw_weight is not None and str(raw_weight).strip() != "":
            try:
                weight_val = Decimal(str(raw_weight).replace(",", "").strip())
            except Exception:
                weight_val = Decimal("0.000")

        packages_val = 0
        if raw_packages is not None and str(raw_packages).strip() != "":
            try:
                packages_val = int(float(str(raw_packages).replace(",", "").strip()))
            except Exception:
                packages_val = 0

        # -------------------------------------------------------------------
        # Allocate Voucher Number & Create Job
        # -------------------------------------------------------------------
        try:
            allocated_job_number = await allocate_or_validate_voucher_number(
                db,
                "JOB",
                manual_number=raw_job_no if raw_job_no else None
            )

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
            )
            db.add(new_job)
            await db.flush()

            imported_jobs.append({
                "id": new_job.id,
                "job_number": new_job.job_number,
                "consigner": consigner_obj.name,
                "consignee": consignee_obj.name,
                "origin": origin_obj.city_name,
                "destination": dest_obj.city_name,
                "dispatch_date": dispatch_date.isoformat(),
            })
        except Exception as create_err:
            errors.append({
                "row": row_num,
                "job_number": raw_job_no,
                "reason": f"Failed to create job: {str(create_err)}"
            })

    # Commit all successful inserts
    if imported_jobs:
        await db.commit()

    return {
        "total_rows": len(rows_data),
        "imported_count": len(imported_jobs),
        "skipped_duplicate_count": len(skipped_duplicates),
        "failed_count": len(errors),
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
        "imported_jobs": imported_jobs,
    }
