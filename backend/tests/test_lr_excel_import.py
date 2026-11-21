import pytest
import io
import openpyxl
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

from app.tenant_db.models import (
    TenantBase,
    User,
    Branch,
    Consigner,
    Consignee,
    Location,
    BillingClient,
    Job,
    LR,
    SeriesMaster,
    JobStatus,
    LRStatus,
)
from app.modules.transport.excel_import import (
    generate_lr_import_template,
    import_lrs_from_excel,
)


@pytest.fixture
async def test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Head Office (id=1)
        hq = Branch(
            id=1,
            code="DEL",
            name="Delhi Head Office",
            city="New Delhi",
            is_head_office=True,
            is_active=True,
        )
        session.add(hq)

        # LR Series for HQ
        lr_series = SeriesMaster(
            document_type="LR",
            series_name="HQ LR Series",
            prefix="LR-DEL-",
            starting_number=1,
            current_number=0,
            series_mode="AUTOMATIC",
            financial_year="2026-2027",
            is_active=True,
            is_default=True,
            issuing_office_id=1,
        )

        # Job Series for HQ
        job_series = SeriesMaster(
            document_type="JOB",
            series_name="HQ Job Series",
            prefix="JOB-DEL-",
            starting_number=1,
            current_number=0,
            series_mode="AUTOMATIC",
            financial_year="2026-2027",
            is_active=True,
            is_default=True,
            issuing_office_id=1,
        )
        session.add_all([lr_series, job_series])
        await session.commit()

    yield async_session
    await engine.dispose()


def create_sample_lr_excel(rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "LR_Booking_Import"
    ws.append([
        "LR Number",
        "Date of LR / Booking Date *",
        "Billing Customer *",
        "Consignor *",
        "Consignee *",
        "Origin Hub / City *",
        "Destination Hub / City *",
        "Truck Number *",
        "Driver Name",
        "Driver Mobile No.",
        "Cargo Description",
        "No. of Packages",
        "Actual Weight (MT)",
        "Charged Weight (MT)",
        "Freight Amount (₹)",
        "Advance Amount (₹)",
        "Payment Type",
        "Invoice No.",
        "Invoice Value (₹)",
        "E-Way Bill No.",
        "Remarks / Instructions",
    ])
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_lr_template_generation(test_db):
    async with test_db() as session:
        stream = await generate_lr_import_template(session)
        wb = openpyxl.load_workbook(stream)
        ws = wb.active
        assert ws.title == "LR_Booking_Import"
        headers = [ws.cell(1, col).value for col in range(1, ws.max_column + 1)]
        assert any("LR Number" in str(h) for h in headers)
        assert any("Booking Date" in str(h) for h in headers)
        assert any("Billing Customer" in str(h) for h in headers)
        assert any("Consignor" in str(h) for h in headers)
        assert any("Consignee" in str(h) for h in headers)
        assert any("Truck Number" in str(h) for h in headers)


@pytest.mark.asyncio
async def test_lr_import_chronological_ordering_and_job_autocreation(test_db):
    """
    Verify:
    1. Rows entered in non-chronological order are sorted by date ascending.
    2. The oldest date in LR gets LR #1 (e.g. LR-DEL-0001) and Job #1 (JOB-DEL-0001).
    3. Multiple LRs on the same date preserve their order in the file (first-come, first-served).
    4. Auto-created Job is linked both ways (lr.job_id == job.id, job.status == BOOKED).
    5. LR and Job numbers advance sequentially.
    """
    # Define 4 rows deliberately out of chronological order:
    # Row A: Nov 15, 2026 (Newest)
    # Row B: Nov 01, 2026 (Oldest -> must become LR #1 and Job #1!)
    # Row C: Nov 05, 2026 (Middle - 1st on Nov 5 -> must become LR #2 and Job #2!)
    # Row D: Nov 05, 2026 (Middle - 2nd on Nov 5 -> must become LR #3 and Job #3!)
    rows = [
        # Col 1: LR Number (blank = auto)
        # Col 2: Date
        # Col 3: Customer
        # Col 4: Consignor
        # Col 5: Consignee
        # Col 6: Origin
        # Col 7: Dest
        # Col 8: Truck
        [
            "", "2026-11-15", "National Corp", "Shipper A", "Receiver A",
            "Delhi", "Mumbai", "DL01AA1111", "Driver One", "9876543210",
            "Steel Bars", "50", "10.5", "10.5", "25000", "5000",
            "To Be Billed", "INV-101", "500000", "EWB-101", "Handle with care",
        ],
        [
            "", "2026-11-01", "National Corp", "Shipper B", "Receiver B",
            "Delhi", "Kolkata", "DL01AA2222", "Driver Two", "9876543211",
            "Chemical Drums", "30", "8.0", "8.0", "30000", "10000",
            "To Be Billed", "INV-102", "300000", "EWB-102", "Urgent delivery",
        ],
        [
            "", "2026-11-05", "National Corp", "Shipper C", "Receiver C",
            "Delhi", "Jaipur", "DL01AA3333", "Driver Three", "9876543212",
            "Electronics", "100", "5.0", "5.0", "15000", "0",
            "To Be Billed", "INV-103", "800000", "EWB-103", "Fragile",
        ],
        [
            "", "2026-11-05", "National Corp", "Shipper D", "Receiver D",
            "Delhi", "Ahmedabad", "DL01AA4444", "Driver Four", "9876543213",
            "Textiles", "80", "12.0", "12.0", "28000", "8000",
            "To Be Billed", "INV-104", "450000", "EWB-104", "Safe transit",
        ],
    ]

    excel_bytes = create_sample_lr_excel(rows)

    async with test_db() as session:
        res = await import_lrs_from_excel(
            db=session,
            file_bytes=excel_bytes,
            filename="test_lr_import.xlsx",
            user_id=1,
            apply_series_prefix_suffix=True,
            office_id=1,
        )

        assert res["total_rows"] == 4
        assert res["imported_count"] == 4
        assert res["skipped_duplicate_count"] == 0
        assert res["failed_count"] == 0

        # Query all LRs ordered by id asc (insertion order)
        lrs_query = await session.execute(
            select(LR).order_by(LR.id.asc())
        )
        imported_lrs = lrs_query.scalars().all()
        assert len(imported_lrs) == 4

        # 1. First imported LR must be Row B (date 2026-11-01) -> oldest date!
        first_lr = imported_lrs[0]
        assert first_lr.lr_date == date(2026, 11, 1)
        assert first_lr.lr_number == "LR-DEL-0001"
        assert first_lr.vehicle_number == "DL01AA2222"
        # Auto-created Job check
        assert first_lr.job_id is not None
        job1 = await session.get(Job, first_lr.job_id)
        assert job1 is not None
        assert job1.job_number == "JOB-DEL-0001"
        assert job1.job_date == date(2026, 11, 1)
        assert job1.status == JobStatus.BOOKED.value
        assert job1.cargo_description == "Chemical Drums"

        # 2. Second imported LR must be Row C (date 2026-11-05, first in file on Nov 5)
        second_lr = imported_lrs[1]
        assert second_lr.lr_date == date(2026, 11, 5)
        assert second_lr.lr_number == "LR-DEL-0002"
        assert second_lr.vehicle_number == "DL01AA3333"
        job2 = await session.get(Job, second_lr.job_id)
        assert job2.job_number == "JOB-DEL-0002"
        assert job2.job_date == date(2026, 11, 5)

        # 3. Third imported LR must be Row D (date 2026-11-05, second in file on Nov 5)
        third_lr = imported_lrs[2]
        assert third_lr.lr_date == date(2026, 11, 5)
        assert third_lr.lr_number == "LR-DEL-0003"
        assert third_lr.vehicle_number == "DL01AA4444"
        job3 = await session.get(Job, third_lr.job_id)
        assert job3.job_number == "JOB-DEL-0003"

        # 4. Fourth imported LR must be Row A (date 2026-11-15, newest date)
        fourth_lr = imported_lrs[3]
        assert fourth_lr.lr_date == date(2026, 11, 15)
        assert fourth_lr.lr_number == "LR-DEL-0004"
        assert fourth_lr.vehicle_number == "DL01AA1111"
        job4 = await session.get(Job, fourth_lr.job_id)
        assert job4.job_number == "JOB-DEL-0004"


@pytest.mark.asyncio
async def test_lr_import_deduplication(test_db):
    """
    Verify:
    1. In-file duplicate rows are skipped.
    2. Re-importing existing database LRs is safely detected and skipped.
    """
    rows = [
        [
            "", "2026-11-02", "Dedupe Client", "Sender X", "Receiver X",
            "Delhi", "Mumbai", "MH01AA9999", "Driver X", "9999999999",
            "Goods", "10", "1.0", "1.0", "5000", "0",
            "To Be Billed", "INV-D1", "10000", "EWB-D1", "",
        ],
        # In-file duplicate (same client, sender, receiver, route, truck, date)
        [
            "", "2026-11-02", "Dedupe Client", "Sender X", "Receiver X",
            "Delhi", "Mumbai", "MH01AA9999", "Driver X", "9999999999",
            "Goods", "10", "1.0", "1.0", "5000", "0",
            "To Be Billed", "INV-D1", "10000", "EWB-D1", "",
        ],
    ]
    excel_bytes = create_sample_lr_excel(rows)

    async with test_db() as session:
        # First import: 1 imported, 1 skipped duplicate
        res1 = await import_lrs_from_excel(
            db=session,
            file_bytes=excel_bytes,
            filename="dedupe.xlsx",
            user_id=1,
            apply_series_prefix_suffix=True,
            office_id=1,
        )
        assert res1["imported_count"] == 1
        assert res1["skipped_duplicate_count"] == 1
        assert res1["skipped_duplicates"][0]["duplicate_type"] == "EXCEL_FILE_DUPLICATE"

        # Second import of same file: database duplicate detected!
        res2 = await import_lrs_from_excel(
            db=session,
            file_bytes=excel_bytes,
            filename="dedupe.xlsx",
            user_id=1,
            apply_series_prefix_suffix=True,
            office_id=1,
        )
        assert res2["imported_count"] == 0
        assert res2["skipped_duplicate_count"] == 2


@pytest.mark.asyncio
async def test_lr_import_continues_from_last_series_count(test_db):
    """
    Verify:
    When LRs and Jobs already exist in the database, a subsequent Excel import continues
    numbering starting from the next unused sequence count (oldest imported date getting
    the next available sequence number).
    """
    async with test_db() as session:
        # Pre-populate masters
        c = Consigner(name="Pre Shipper", is_active=True, issuing_office_id=1)
        ce = Consignee(name="Pre Receiver", is_active=True, issuing_office_id=1)
        loc1 = Location(city_name="Pre Origin", state="Delhi", is_active=True)
        loc2 = Location(city_name="Pre Dest", state="Mumbai", is_active=True)
        client = BillingClient(name="Pre Client", is_active=True, issuing_office_id=1)
        session.add_all([c, ce, loc1, loc2, client])
        await session.flush()

        # Pre-populate an LR with number LR-DEL-0005 and Job JOB-DEL-0005
        existing_job = Job(
            job_number="JOB-DEL-0005",
            job_date=date(2026, 10, 1),
            consigner_id=c.id,
            consignee_id=ce.id,
            origin_location_id=loc1.id,
            destination_location_id=loc2.id,
            billing_client_id=client.id,
            status=JobStatus.BOOKED.value,
            issuing_office_id=1,
        )
        session.add(existing_job)
        await session.flush()

        existing_lr = LR(
            lr_number="LR-DEL-0005",
            lr_date=date(2026, 10, 1),
            job_id=existing_job.id,
            consigner_id=c.id,
            consignee_id=ce.id,
            origin_location_id=loc1.id,
            destination_location_id=loc2.id,
            billing_customer_id=client.id,
            vehicle_number="MH01AA1234",
            status=LRStatus.BOOKED.value,
            issuing_office_id=1,
        )
        session.add(existing_lr)
        await session.commit()

        # Update the series current_number to 5 to reflect existing usage
        lr_s = await session.scalar(select(SeriesMaster).where(SeriesMaster.document_type == "LR"))
        if lr_s:
            lr_s.current_number = 5
        job_s = await session.scalar(select(SeriesMaster).where(SeriesMaster.document_type == "JOB"))
        if job_s:
            job_s.current_number = 5
        await session.commit()

        # Import 2 new rows with dates Nov 2 and Nov 1
        new_rows = [
            [
                "", "2026-11-02", "Series Client", "Shipper 1", "Receiver 1",
                "Delhi", "Mumbai", "KA01BB1111", "Driver A", "9876543210",
                "Cargo A", "10", "2.0", "2.0", "10000", "0",
                "To Be Billed", "INV-S1", "50000", "EWB-S1", "",
            ],
            [
                "", "2026-11-01", "Series Client", "Shipper 2", "Receiver 2",
                "Delhi", "Pune", "KA01BB2222", "Driver B", "9876543211",
                "Cargo B", "20", "3.0", "3.0", "15000", "0",
                "To Be Billed", "INV-S2", "80000", "EWB-S2", "",
            ],
        ]
        excel_bytes = create_sample_lr_excel(new_rows)

        res = await import_lrs_from_excel(
            db=session,
            file_bytes=excel_bytes,
            filename="continue_series.xlsx",
            user_id=1,
            apply_series_prefix_suffix=True,
            office_id=1,
        )

        assert res["imported_count"] == 2
        # Nov 1 is older than Nov 2 -> gets LR-DEL-0006 and JOB-DEL-0006
        nov1_lr = await session.scalar(select(LR).where(LR.vehicle_number == "KA01BB2222"))
        assert nov1_lr is not None
        assert nov1_lr.lr_number == "LR-DEL-0006"
        assert nov1_lr.job.job_number == "JOB-DEL-0006"

        # Nov 2 is newer -> gets LR-DEL-0007 and JOB-DEL-0007
        nov2_lr = await session.scalar(select(LR).where(LR.vehicle_number == "KA01BB1111"))
        assert nov2_lr is not None
        assert nov2_lr.lr_number == "LR-DEL-0007"
        assert nov2_lr.job.job_number == "JOB-DEL-0007"


@pytest.mark.asyncio
async def test_lr_import_missing_mandatory_columns(test_db):
    """
    Verify:
    When an uploaded Excel or CSV file is missing mandatory columns in the header row
    (e.g. Truck Number and Consignee), the import fails early, notifies the user
    of the exact missing column names, and does not create any partial records.
    """
    async with test_db() as session:
        # Create Excel missing 'Truck Number' and 'Consignee'
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "LR_Booking_Import"
        ws.append([
            "LR Number",
            "Date of LR / Booking Date *",
            "Billing Customer *",
            "Consignor *",
            # "Consignee *" is intentionally omitted!
            "Origin Hub / City *",
            "Destination Hub / City *",
            # "Truck Number *" is intentionally omitted!
            "Cargo Description",
        ])
        ws.append([
            "", "2026-11-10", "Client A", "Shipper A", "Delhi", "Mumbai", "Steel Pipes"
        ])
        buf = io.BytesIO()
        wb.save(buf)

        res = await import_lrs_from_excel(
            db=session,
            file_bytes=buf.getvalue(),
            filename="missing_cols.xlsx",
            user_id=1,
            office_id=1,
        )

        assert res["status"] == "FAILED"
        assert "Consignee" in res["missing_headers"]
        assert "Truck Number" in res["missing_headers"]
        assert res["imported_count"] == 0
        assert res["failed_count"] == 1
        assert res["summary_report"]["status"] == "FAILED"
        assert "Consignee" in res["summary_report"]["missing_columns"]
        assert "Truck Number" in res["summary_report"]["missing_columns"]


@pytest.mark.asyncio
async def test_lr_import_date_and_numeric_exceptions(test_db):
    """
    Verify:
    1. Unparseable date format is flagged as an exception with field 'Booking Date'.
    2. Non-numeric text in freight or package count is flagged as a numeric exception.
    3. Valid rows still import successfully (partial success).
    4. Comprehensive summary report captures counts and success rate.
    """
    async with test_db() as session:
        rows = [
            # Row 1: Invalid Date format
            [
                "", "32-13-2026", "Test Client", "Shipper 1", "Receiver 1",
                "Delhi", "Mumbai", "DL01AA1111", "Driver 1", "9876543210",
                "Cargo 1", "10", "2.0", "2.0", "10000", "0",
                "To Be Billed", "INV-1", "50000", "EWB-1", "",
            ],
            # Row 2: Valid Row
            [
                "", "2026-11-12", "Test Client", "Shipper 2", "Receiver 2",
                "Delhi", "Mumbai", "DL01AA2222", "Driver 2", "9876543211",
                "Cargo 2", "15", "3.0", "3.0", "15000", "0",
                "To Be Billed", "INV-2", "75000", "EWB-2", "",
            ],
            # Row 3: Invalid numeric freight amount
            [
                "", "2026-11-13", "Test Client", "Shipper 3", "Receiver 3",
                "Delhi", "Mumbai", "DL01AA3333", "Driver 3", "9876543212",
                "Cargo 3", "20", "4.0", "4.0", "INVALID_AMOUNT", "0",
                "To Be Billed", "INV-3", "90000", "EWB-3", "",
            ],
        ]
        excel_bytes = create_sample_lr_excel(rows)

        res = await import_lrs_from_excel(
            db=session,
            file_bytes=excel_bytes,
            filename="exception_handling.xlsx",
            user_id=1,
            office_id=1,
        )

        assert res["status"] == "PARTIAL_SUCCESS"
        assert res["imported_count"] == 1
        assert res["failed_count"] == 2
        assert len(res["errors"]) == 2

        # Check errors detail
        date_err = next((e for e in res["errors"] if e.get("field") == "Booking Date"), None)
        assert date_err is not None
        assert "Invalid date format" in date_err["reason"]

        freight_err = next((e for e in res["errors"] if e.get("field") == "Freight Amount"), None)
        assert freight_err is not None
        assert "Invalid numeric format" in freight_err["reason"]

        # Check summary report
        report = res["summary_report"]
        assert report["status"] == "PARTIAL_SUCCESS"
        assert report["total_rows"] == 3
        assert report["imported_count"] == 1
        assert report["failed_count"] == 2
        assert report["success_rate_percent"] == 33.3


@pytest.mark.asyncio
async def test_lr_import_duplicates_reporting_with_metadata(test_db):
    """
    Verify:
    1. Duplicate consignments (same vehicle, route, date, shipper, receiver) are skipped.
    2. Rich metadata (vehicle_number, route, lr_date, duplicate_type) is provided.
    3. User notification detail is accurate and clear.
    """
    async with test_db() as session:
        rows = [
            # Row 1: Original
            [
                "", "2026-11-15", "Dup Client", "Dup Shipper", "Dup Receiver",
                "Delhi", "Jaipur", "RJ14AA9999", "Driver X", "9876543200",
                "Pipes", "50", "10.0", "10.0", "25000", "5000",
                "To Be Billed", "INV-D1", "120000", "EWB-D1", "",
            ],
            # Row 2: Exact duplicate of Row 1 within the same file
            [
                "", "2026-11-15", "Dup Client", "Dup Shipper", "Dup Receiver",
                "Delhi", "Jaipur", "RJ14AA9999", "Driver X", "9876543200",
                "Pipes", "50", "10.0", "10.0", "25000", "5000",
                "To Be Billed", "INV-D1", "120000", "EWB-D1", "",
            ],
        ]
        excel_bytes = create_sample_lr_excel(rows)

        res = await import_lrs_from_excel(
            db=session,
            file_bytes=excel_bytes,
            filename="duplicates.xlsx",
            user_id=1,
            office_id=1,
        )

        assert res["imported_count"] == 1
        assert res["skipped_duplicate_count"] == 1
        assert len(res["skipped_duplicates"]) == 1

        dup_info = res["skipped_duplicates"][0]
        assert dup_info["row"] == 3  # Excel row 3
        assert dup_info["vehicle_number"] == "RJ14AA9999"
        assert "Delhi" in dup_info["route"] and "Jaipur" in dup_info["route"]
        assert dup_info["duplicate_type"] == "EXCEL_FILE_DUPLICATE"
        assert "Duplicate consignment repeated" in dup_info["reason"]


