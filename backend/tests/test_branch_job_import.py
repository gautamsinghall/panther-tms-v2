import pytest
import io
import openpyxl
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.tenant_db.models import (
    TenantBase,
    User,
    Branch,
    Consigner,
    Consignee,
    Location,
    BillingClient,
    Job,
    SeriesMaster,
)
from app.modules.transport.excel_import import import_jobs_from_excel

@pytest.fixture
async def test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Create Head Office (id=1)
        hq = Branch(
            id=1,
            code="DEL",
            name="Delhi Head Office",
            city="New Delhi",
            is_head_office=True,
            is_active=True,
        )
        # Create Branch Office (id=2)
        branch = Branch(
            id=2,
            code="MUM",
            name="Mumbai Branch Office",
            city="Mumbai",
            is_head_office=False,
            is_active=True,
        )
        session.add_all([hq, branch])
        await session.commit()

    yield async_session
    await engine.dispose()

def create_sample_excel(job_prefix="JOB"):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Job_Orders_Import"
    ws.append([
        "Job Number",
        "Billing Client *",
        "Origin Location *",
        "Destination Location *",
        "Date of Job Creation *",
        "Scheduled Dispatch Date",
        "Consigner *",
        "Consignee *",
        "Cargo Description",
        "Estimated Weight",
        "Total Packages",
    ])
    ws.append([
        f"{job_prefix}-001",
        f"Client {job_prefix}",
        "Mumbai",
        "Pune",
        "2026-10-17",
        "2026-10-18",
        f"Shipper {job_prefix}",
        f"Receiver {job_prefix}",
        "Industrial Parts",
        "15.5",
        "100",
    ])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

@pytest.mark.asyncio
async def test_import_jobs_hq_vs_branch(test_db):
    # 1. Test importing in Head Office (office_id=1)
    async with test_db() as session:
        # Seed HQ default series for JOB (issuing_office_id=1)
        hq_series = SeriesMaster(
            document_type="JOB",
            series_name="HQ Job Series",
            prefix="JOB-DEL-",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            is_default=True,
            is_active=True,
            issuing_office_id=1,
        )
        session.add(hq_series)
        await session.commit()

        res_hq = await import_jobs_from_excel(
            db=session,
            file_bytes=create_sample_excel("HQ"),
            filename="test_hq.xlsx",
            office_id=1,
            apply_series_prefix_suffix=True,
        )
        print("\nHQ IMPORT RESULT:", res_hq)
        assert res_hq["imported_count"] == 1

    # 2. Test importing in Branch (office_id=2) with apply_series_prefix_suffix=True
    # (Branch 2 has NO office-specific series; it should fall back to HQ/default series or auto-numbering)
    async with test_db() as session:
        # Create Excel for branch that uses fresh consignor, consignee, client
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Job_Orders_Import"
        ws.append([
            "Job Number", "Billing Client *", "Origin Location *", "Destination Location *",
            "Date of Job Creation *", "Scheduled Dispatch Date", "Consigner *", "Consignee *",
            "Cargo Description", "Estimated Weight", "Total Packages",
        ])
        ws.append([
            "BRANCH-JOB-100", "Branch Client Ltd", "Ahmedabad", "Surat", "2026-10-20", "2026-10-21",
            "Branch Shipper Co", "Branch Receiver Co", "Textiles", "12.0", "80",
        ])
        buf = io.BytesIO()
        wb.save(buf)

        res_branch = await import_jobs_from_excel(
            db=session,
            file_bytes=buf.getvalue(),
            filename="test_branch.xlsx",
            office_id=2,
            apply_series_prefix_suffix=True,
        )
        print("\nBRANCH IMPORT WITH AUTO-SERIES RESULT:", res_branch)
        assert res_branch["imported_count"] == 1
        assert len(res_branch["imported_jobs"]) == 1
        imported_job = res_branch["imported_jobs"][0]
        assert imported_job["issuing_office_id"] == 2
        assert imported_job["consigner"] == "Branch Shipper Co"
        assert imported_job["consignee"] == "Branch Receiver Co"

        # Check if masters are saved and visible to Branch 2
        from app.modules.general.service import list_consigners, list_billing_clients, list_consignees, list_locations
        b2_consigners = await list_consigners(session, office_id=2, include_unassigned=True)
        consigner_names = [c.name for c in b2_consigners]
        print("\nBRANCH 2 VISIBLE CONSIGNERS:", consigner_names)
        assert "Branch Shipper Co" in consigner_names

        b2_clients = await list_billing_clients(session, office_id=2, include_unassigned=True)
        client_names = [b.name for b in b2_clients]
        print("BRANCH 2 VISIBLE BILLING CLIENTS:", client_names)
        assert "Branch Client Ltd" in client_names

        b2_consignees = await list_consignees(session, office_id=2, include_unassigned=True)
        consignee_names = [ce.name for ce in b2_consignees]
        print("BRANCH 2 VISIBLE CONSIGNEES:", consignee_names)
        assert "Branch Receiver Co" in consignee_names

        b2_locations = await list_locations(session, office_id=2, include_unassigned=True)
        location_names = [loc.city_name for loc in b2_locations]
        print("BRANCH 2 VISIBLE LOCATIONS:", location_names)
        assert "Ahmedabad" in location_names
        assert "Surat" in location_names

        # Check if Job details are returned properly
        from app.modules.transport.service import get_all_jobs
        b2_jobs = await get_all_jobs(session, office_id=2, include_unassigned=False)
        print(f"\nBRANCH 2 JOBS ({len(b2_jobs)}):")
        assert len(b2_jobs) == 1
        j = b2_jobs[0]
        assert j.issuing_office_id == 2
        assert j.consigner.name == "Branch Shipper Co"
        assert j.consignee.name == "Branch Receiver Co"
        assert j.billing_client.name == "Branch Client Ltd"
        assert j.origin_location.city_name == "Ahmedabad"
        assert j.destination_location.city_name == "Surat"
        print("Job Successfully Verified:", j.job_number, j.issuing_office_id, j.consigner.name, j.billing_client.name)


@pytest.mark.asyncio
async def test_job_import_missing_mandatory_headers(test_db):
    """
    Verify:
    When an uploaded Job Excel/CSV is missing mandatory header columns (e.g. Origin Location and Consignee),
    the import halts early, notifies the user of the exact missing columns, and does not create partial records.
    """
    async with test_db() as session:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Job_Orders_Import"
        ws.append([
            "Job Number",
            "Billing Client *",
            # "Origin Location *" is intentionally omitted!
            "Destination Location *",
            "Date of Job Creation *",
            "Consigner *",
            # "Consignee *" is intentionally omitted!
            "Cargo Description",
        ])
        ws.append([
            "", "Test Client", "Delhi", "2026-11-10", "Shipper A", "Electronics"
        ])
        buf = io.BytesIO()
        wb.save(buf)

        res = await import_jobs_from_excel(
            db=session,
            file_bytes=buf.getvalue(),
            filename="missing_job_headers.xlsx",
            user_id=1,
            office_id=1,
        )

        assert res["status"] == "FAILED"
        assert "Origin Location" in res["missing_headers"]
        assert "Consignee" in res["missing_headers"]
        assert res["imported_count"] == 0
        assert res["failed_count"] == 1
        assert res["summary_report"]["status"] == "FAILED"
        assert "Origin Location" in res["summary_report"]["missing_columns"]
        assert "Consignee" in res["summary_report"]["missing_columns"]


@pytest.mark.asyncio
async def test_job_import_date_and_numeric_exceptions(test_db):
    """
    Verify:
    1. Unparseable date format in job creation date logs an error for 'Date of Job Creation'.
    2. Non-numeric value in estimated weight or packages logs an error.
    3. Valid rows still succeed (partial success).
    4. Comprehensive summary report reflects accurate statistics.
    """
    async with test_db() as session:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Job_Orders_Import"
        ws.append([
            "Job Number",
            "Billing Client *",
            "Origin Location *",
            "Destination Location *",
            "Date of Job Creation *",
            "Scheduled Dispatch Date",
            "Consigner *",
            "Consignee *",
            "Cargo Description",
            "Estimated Weight",
            "Total Packages",
        ])
        # Row 1: Invalid date format
        ws.append([
            "", "Client 1", "Delhi", "Mumbai", "INVALID_DATE", "2026-11-15",
            "Shipper 1", "Receiver 1", "Cargo 1", "10.0", "50"
        ])
        # Row 2: Valid Row
        ws.append([
            "", "Client 2", "Delhi", "Mumbai", "2026-11-12", "2026-11-15",
            "Shipper 2", "Receiver 2", "Cargo 2", "12.5", "60"
        ])
        # Row 3: Invalid numeric weight
        ws.append([
            "", "Client 3", "Delhi", "Mumbai", "2026-11-13", "2026-11-15",
            "Shipper 3", "Receiver 3", "Cargo 3", "NOT_A_NUMBER", "70"
        ])
        buf = io.BytesIO()
        wb.save(buf)

        res = await import_jobs_from_excel(
            db=session,
            file_bytes=buf.getvalue(),
            filename="job_exceptions.xlsx",
            user_id=1,
            office_id=1,
        )

        assert res["status"] == "PARTIAL_SUCCESS"
        assert res["imported_count"] == 1
        assert res["failed_count"] == 2
        assert len(res["errors"]) == 2

        date_err = next((e for e in res["errors"] if e.get("field") == "Date of Job Creation"), None)
        assert date_err is not None
        assert "Invalid date format" in date_err["reason"]

        weight_err = next((e for e in res["errors"] if e.get("field") == "Estimated Weight"), None)
        assert weight_err is not None
        assert "Invalid numeric format" in weight_err["reason"]

        report = res["summary_report"]
        assert report["status"] == "PARTIAL_SUCCESS"
        assert report["total_rows"] == 3
        assert report["imported_count"] == 1
        assert report["failed_count"] == 2
        assert report["success_rate_percent"] == 33.3


@pytest.mark.asyncio
async def test_job_import_chronological_ordering_and_duplicates(test_db):
    """
    Verify:
    1. Jobs entered out of order are sorted by creation date ascending (oldest first).
    2. Duplicates within Excel are detected, skipped, and reported with rich metadata.
    """
    async with test_db() as session:
        # Seed HQ series
        hq_series = SeriesMaster(
            document_type="JOB",
            series_name="HQ Job Series Chrono",
            prefix="JOB-CHRONO-",
            starting_number=1,
            current_number=0,
            series_mode="AUTOMATIC",
            financial_year="2026-2027",
            is_active=True,
            is_default=True,
            issuing_office_id=1,
        )
        session.add(hq_series)
        await session.commit()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Job_Orders_Import"
        ws.append([
            "Job Number",
            "Billing Client *",
            "Origin Location *",
            "Destination Location *",
            "Date of Job Creation *",
            "Scheduled Dispatch Date",
            "Consigner *",
            "Consignee *",
            "Cargo Description",
            "Estimated Weight",
            "Total Packages",
        ])
        # Row A: Nov 20, 2026 (Newer)
        ws.append([
            "", "Chrono Client", "Delhi", "Kolkata", "2026-11-20", "2026-11-21",
            "Shipper Chrono", "Receiver Chrono", "Textiles", "5.0", "25"
        ])
        # Row B: Nov 10, 2026 (Oldest -> must get first sequence!)
        ws.append([
            "", "Chrono Client", "Delhi", "Chennai", "2026-11-10", "2026-11-11",
            "Shipper Chrono 2", "Receiver Chrono 2", "Machinery", "8.0", "40"
        ])
        # Row C: Duplicate of Row B (same client, consigner, consignee, route, date, cargo)
        ws.append([
            "", "Chrono Client", "Delhi", "Chennai", "2026-11-10", "2026-11-11",
            "Shipper Chrono 2", "Receiver Chrono 2", "Machinery", "8.0", "40"
        ])
        buf = io.BytesIO()
        wb.save(buf)

        res = await import_jobs_from_excel(
            db=session,
            file_bytes=buf.getvalue(),
            filename="chrono_jobs.xlsx",
            user_id=1,
            apply_series_prefix_suffix=True,
            office_id=1,
        )

        assert res["imported_count"] == 2
        assert res["skipped_duplicate_count"] == 1
        assert len(res["skipped_duplicates"]) == 1

        dup = res["skipped_duplicates"][0]
        assert dup["duplicate_type"] == "EXCEL_FILE_DUPLICATE"
        assert "Delhi" in dup["route"] and "Chennai" in dup["route"]

        # Check that the oldest date (Nov 10) was allocated the earlier job number
        nov10_job = await session.scalar(select(Job).where(Job.destination_location_id != None, Job.job_date == date(2026, 11, 10)))
        nov20_job = await session.scalar(select(Job).where(Job.destination_location_id != None, Job.job_date == date(2026, 11, 20)))

        assert nov10_job is not None
        assert nov20_job is not None
        assert nov10_job.job_number == "JOB-CHRONO-0001"
        assert nov20_job.job_number == "JOB-CHRONO-0002"








