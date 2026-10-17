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







