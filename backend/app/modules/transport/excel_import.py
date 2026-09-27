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
# Excel Template Generation
# ---------------------------------------------------------------------------

HEADER_FILL_COLOR = "1E293B"      # Slate 800
HEADER_FONT_COLOR = "FFFFFF"      # White
EXAMPLE_FILL_COLOR = "F8FAFC"     # Slate 50
BORDER_COLOR = "CBD5E1"           # Slate 300

TEMPLATE_COLUMNS = [
    {
        "key": "job_number",
        "header": "Job Number",
        "required": False,
        "width": 20,
        "example1": "JOB-2026-0001",
        "example2": "",
        "notes": "Optional. Leave blank to auto-generate next sequence number."
    },
    {
        "key": "job_date",
        "header": "Date of Job Creation",
        "required": False,
        "width": 22,
        "example1": "2026-09-27",
        "example2": "2026-09-27",
        "notes": "Format: YYYY-MM-DD or DD/MM/YYYY. Defaults to today if blank."
    },
    {
        "key": "scheduled_dispatch_date",
        "header": "Scheduled Dispatch Date",
        "required": False,
        "width": 24,
        "example1": "2026-09-28",
        "example2": "2026-09-29",
        "notes": "Format: YYYY-MM-DD or DD/MM/YYYY. Expected vehicle loading date."
    },
    {
        "key": "billing_client",
        "header": "Billing Client",
        "required": False,
        "width": 28,
        "example1": "Tata Motors Logistics Division",
        "example2": "Reliance Retail Supply Chain",
        "notes": "Contracting customer party. Auto-created if not found."
    },
    {
        "key": "origin_location",
        "header": "Origin Location",
        "required": True,
        "width": 22,
        "example1": "Mumbai",
        "example2": "Pune",
        "notes": "Origin city/hub. Mandatory. Auto-created if not found."
    },
    {
        "key": "destination_location",
        "header": "Destination Location",
        "required": True,
        "width": 22,
        "example1": "Delhi",
        "example2": "Bangalore",
        "notes": "Destination city/hub. Mandatory. Auto-created if not found."
    },
    {
        "key": "consigner",
        "header": "Consigner",
        "required": True,
        "width": 28,
        "example1": "Tata Motors Ltd Chakan Plant",
        "example2": "Bajaj Auto Ltd Waluj",
        "notes": "Dispatching sender party. Mandatory. Auto-created if not found."
    },
    {
        "key": "consignee",
        "header": "Consignee",
        "required": True,
        "width": 28,
        "example1": "Tata Authorized Hub Delhi",
        "example2": "Reliance Central Hub Bangalore",
        "notes": "Receiving party. Mandatory. Auto-created if not found."
    },
    {
        "key": "cargo_description",
        "header": "Cargo Description",
        "required": False,
        "width": 32,
        "example1": "Automobile Spares & Assemblies",
        "example2": "FMCG Packaged Goods & Beverages",
        "notes": "Commodity / cargo description."
    },
    {
        "key": "estimated_weight_mt",
        "header": "Estimated Weight (MT)",
        "required": False,
        "width": 22,
        "example1": "16.500",
        "example2": "22.000",
        "notes": "Weight in Metric Tons (e.g. 16.5)."
    },
    {
        "key": "estimated_packages",
        "header": "Estimated Packages",
        "required": False,
        "width": 20,
        "example1": "120",
        "example2": "450",
        "notes": "Number of cartons, boxes, or pallets (integer)."
    },
    {
        "key": "special_instructions",
        "header": "Special Instructions",
        "required": False,
        "width": 34,
        "example1": "Tarpaulin cover mandatory. Express transit.",
        "example2": "Handle fragile cartons with care.",
        "notes": "Driver instructions or dispatch routing notes."
    },
]


async def generate_job_import_template(db: AsyncSession) -> io.BytesIO:
    """
    Generates a stylized Excel template for importing mass job orders.
    Includes:
    - Sheet 1: 'Job_Orders_Import' with styled header row and 2 example rows.
    - Sheet 2: 'Reference_Masters' listing existing Consigners, Consignees, Locations, and Billing Clients.
    """
    wb = openpyxl.Workbook()

    # Sheet 1: Template
    ws = wb.active
    ws.title = "Job_Orders_Import"
    ws.views.sheetView[0].showGridLines = True

    # Styling elements
    header_font = Font(name="Segoe UI", size=11, bold=True, color=HEADER_FONT_COLOR)
    header_fill = PatternFill(start_color=HEADER_FILL_COLOR, end_color=HEADER_FILL_COLOR, fill_type="solid")
    example_fill = PatternFill(start_color=EXAMPLE_FILL_COLOR, end_color=EXAMPLE_FILL_COLOR, fill_type="solid")
    regular_font = Font(name="Segoe UI", size=10)
    example_font = Font(name="Segoe UI", size=10, italic=True)
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
    ws.row_dimensions[1].height = 34
    for col_idx, col_def in enumerate(TEMPLATE_COLUMNS, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.value = col_def["header"] + (" *" if col_def["required"] else "")
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = cell_border
        ws.column_dimensions[get_column_letter(col_idx)].width = col_def["width"]

    # Sample Row 1 (Row 2)
    ws.row_dimensions[2].height = 24
    for col_idx, col_def in enumerate(TEMPLATE_COLUMNS, start=1):
        cell = ws.cell(row=2, column=col_idx)
        cell.value = col_def["example1"]
        cell.font = example_font
        cell.fill = example_fill
        cell.alignment = left_align
        cell.border = cell_border

    # Sample Row 2 (Row 3)
    ws.row_dimensions[3].height = 24
    for col_idx, col_def in enumerate(TEMPLATE_COLUMNS, start=1):
        cell = ws.cell(row=3, column=col_idx)
        cell.value = col_def["example2"]
        cell.font = example_font
        cell.fill = example_fill
        cell.alignment = left_align
        cell.border = cell_border

    # Blank row 4 for user input start
    ws.row_dimensions[4].height = 22
    for col_idx in range(1, len(TEMPLATE_COLUMNS) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.border = cell_border
        cell.font = regular_font

    # Sheet 2: Reference Masters from Database
    try:
        ws_ref = wb.create_sheet(title="Reference_Masters")
        ws_ref.views.sheetView[0].showGridLines = True
        ws_ref.row_dimensions[1].height = 28

        ref_header_fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
        ref_header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")

        # Fetch existing masters
        consigners_res = await db.execute(select(Consigner.name).where(Consigner.is_active == True).limit(200))
        consigners_list = [r[0] for r in consigners_res.fetchall()]

        consignees_res = await db.execute(select(Consignee.name).where(Consignee.is_active == True).limit(200))
        consignees_list = [r[0] for r in consignees_res.fetchall()]

        locations_res = await db.execute(select(Location.city_name).where(Location.is_active == True).limit(200))
        locations_list = [r[0] for r in locations_res.fetchall()]

        clients_res = await db.execute(select(BillingClient.name).where(BillingClient.is_active == True).limit(200))
        clients_list = [r[0] for r in clients_res.fetchall()]

        ref_cols = [
            ("Available Consigners", consigners_list, 32),
            ("Available Consignees", consignees_list, 32),
            ("Available Locations", locations_list, 26),
            ("Available Billing Clients", clients_list, 32),
        ]

        for c_idx, (col_name, data_list, width) in enumerate(ref_cols, start=1):
            h_cell = ws_ref.cell(row=1, column=c_idx, value=col_name)
            h_cell.font = ref_header_font
            h_cell.fill = ref_header_fill
            h_cell.alignment = center_align
            h_cell.border = cell_border
            ws_ref.column_dimensions[get_column_letter(c_idx)].width = width

            for r_idx, val in enumerate(data_list, start=2):
                d_cell = ws_ref.cell(row=r_idx, column=c_idx, value=val)
                d_cell.font = regular_font
                d_cell.border = cell_border
                d_cell.alignment = left_align
    except Exception as e:
        # If reference fetch fails, sheet 1 is still pristine
        pass

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# ---------------------------------------------------------------------------
# Excel Import & Deduplication Engine
# ---------------------------------------------------------------------------

def _normalize_header(header: str) -> str:
    """Normalize column header to canonical key."""
    clean = re.sub(r"[^a-zA-Z0-9]", "_", str(header or "").strip().lower())
    clean = re.sub(r"_+", "_", clean).strip("_")

    if any(k in clean for k in ["job_no", "job_number", "job_#", "order_no", "order_number"]):
        return "job_number"
    if any(k in clean for k in ["date_of_job", "creation_date", "job_date", "booking_date"]):
        return "job_date"
    if any(k in clean for k in ["dispatch_date", "scheduled_dispatch", "expected_dispatch", "dispatch"]):
        return "scheduled_dispatch_date"
    if any(k in clean for k in ["billing_client", "billing_party", "customer", "bill_to"]):
        return "billing_client"
    if any(k in clean for k in ["origin_location", "origin_city", "origin", "from_city", "pickup_location"]):
        return "origin_location"
    if any(k in clean for k in ["destination_location", "destination_city", "destination", "to_city", "drop_location"]):
        return "destination_location"
    if any(k in clean for k in ["consigner", "shipper", "sender"]):
        return "consigner"
    if any(k in clean for k in ["consignee", "receiver", "recipient"]):
        return "consignee"
    if any(k in clean for k in ["cargo_description", "cargo", "material", "goods", "commodity", "item"]):
        return "cargo_description"
    if any(k in clean for k in ["weight", "mt", "ton", "tonnage"]):
        return "estimated_weight_mt"
    if any(k in clean for k in ["package", "pkg", "box", "carton", "units", "quantity"]):
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
        # Select first sheet or 'Job_Orders_Import'
        sheet_name = "Job_Orders_Import" if "Job_Orders_Import" in wb.sheetnames else wb.sheetnames[0]
        ws = wb[sheet_name]

        header_row = None
        for r in range(1, min(10, ws.max_row + 1)):
            row_vals = [ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
            # If contains consigner or consignee or origin or destination
            normalized = [_normalize_header(v) for v in row_vals if v]
            if "consigner" in normalized or "consignee" in normalized or "origin_location" in normalized:
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

    # Filter out template example rows if present (e.g. 'JOB-2026-0001' with 'Tata Motors Ltd Chakan Plant')
    filtered_rows = []
    for r in rows_data:
        consigner_val = str(r.get("consigner") or "").strip()
        job_no_val = str(r.get("job_number") or "").strip()
        # If it's the exact sample row from template
        if job_no_val == "JOB-2026-0001" and "Chakan Plant" in consigner_val:
            continue
        filtered_rows.append(r)

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
    except Exception as e:
        pass

    # Tracking sets for In-Excel Duplication Check
    seen_excel_job_numbers: Dict[str, int] = {}    # job_number.lower() -> row_num
    seen_excel_signatures: Dict[str, int] = {}     # business signature -> row_num

    imported_jobs: List[Dict[str, Any]] = []
    skipped_duplicates: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    for row in filtered_rows:
        row_num = row.get("_row_num", 0)

        # Extract values
        raw_job_no = str(row.get("job_number") or "").strip()
        raw_consigner = str(row.get("consigner") or "").strip()
        raw_consignee = str(row.get("consignee") or "").strip()
        raw_origin = str(row.get("origin_location") or "").strip()
        raw_dest = str(row.get("destination_location") or "").strip()
        raw_client = str(row.get("billing_client") or "").strip()
        raw_cargo = str(row.get("cargo_description") or "").strip()
        raw_weight = row.get("estimated_weight_mt")
        raw_packages = row.get("estimated_packages")
        raw_instructions = str(row.get("special_instructions") or "").strip()

        # Parse Dates
        job_creation_date = _parse_date(row.get("job_date")) or date.today()
        dispatch_date = _parse_date(row.get("scheduled_dispatch_date")) or job_creation_date

        # Check Required Fields
        if not raw_consigner:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Consigner'."})
            continue
        if not raw_consignee:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Consignee'."})
            continue
        if not raw_origin:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Origin Location'."})
            continue
        if not raw_dest:
            errors.append({"row": row_num, "job_number": raw_job_no, "reason": "Missing mandatory field 'Destination Location'."})
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
            f"{raw_consigner.lower()}|{raw_consignee.lower()}|{raw_origin.lower()}|"
            f"{raw_dest.lower()}|{dispatch_date.isoformat()}|{raw_cargo.lower()}"
        )
        if row_signature in seen_excel_signatures:
            first_row = seen_excel_signatures[row_signature]
            skipped_duplicates.append({
                "row": row_num,
                "job_number": raw_job_no or "AUTO",
                "reason": f"Duplicate trip order repeated within Excel file: Same Consigner, Consignee, Route, and Date (matches Row {first_row}).",
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
        # 1. Consigner
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

        # 2. Consignee
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

        # 3. Origin Location
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

        # 4. Destination Location
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

        # 5. Billing Client
        billing_client_id = None
        billing_party_name = raw_client or raw_consigner
        if raw_client:
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
            billing_client_id = client_obj.id
            billing_party_name = client_obj.name

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
                billing_client_id=billing_client_id,
                billing_party=billing_party_name,
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
        "total_rows": len(filtered_rows),
        "imported_count": len(imported_jobs),
        "skipped_duplicate_count": len(skipped_duplicates),
        "failed_count": len(errors),
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
        "imported_jobs": imported_jobs,
    }
