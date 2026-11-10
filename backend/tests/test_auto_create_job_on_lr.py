"""
Acceptance Test Suite: Auto-create a Job Order when an LR is created without a Job Number.

Verifies:
1. LR saved without Job Number automatically creates ONE Job Order with matching details and status.
2. The Job is linked both ways (LR has job_number and job_id; Job has LR in job.lrs).
3. Second LR without Job Number gets a distinct new Job Number from the series counter.
4. LR saved with an existing Job Number uses that Job and does NOT create a new Job (count before == after).
5. Validation failures do not save an LR or create any Job.
6. Conversational / Chatbot LR creation also auto-creates and links the Job.
7. Job listing returns linked LR number, vehicle number, etc.
"""
import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func
from pydantic import ValidationError

from app.tenant_db.models import (
    TenantBase,
    Branch,
    User,
    Role,
    RolePermission,
    LR,
    Job,
    Consigner,
    Consignee,
    Location,
    BillingClient,
    SeriesMaster,
    JobStatus,
    LRStatus,
)
from app.control.models import ControlBase, Tenant, Plan
from app.modules.transport.schemas import LRCreate
from app.modules.transport.service import create_lr, get_all_jobs, get_all_lrs, get_lr_by_id
from app.modules.transport.router import _build_job_response, _build_lr_response
from app.modules.ai.schemas import ConfirmLRDraftRequest
from app.modules.ai.draft_store import lr_draft_store
from app.modules.ai.lr_draft_service import handle_conversational_lr_booking
from app.modules.ai.router import confirm_lr_draft


@pytest.fixture
async def setup_test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=True)

    async with session_maker() as session:
        # Branch (Head Office)
        branch = Branch(id=1, name="Delhi Hub", code="DEL-01", is_active=True, is_head_office=True)
        session.add(branch)

        # Permissions & Role
        perm = RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True)
        role = Role(id=1, name="Admin", permissions=[perm])
        user = User(id=1, email="admin@demo.com", password_hash="dummy", role="ADMIN", full_name="Admin User", custom_role=role)
        session.add_all([role, user])

        # Parties & Locations
        c = Consigner(id=1, name="Acme Corp", code="ACME", is_active=True, issuing_office_id=1)
        ce = Consignee(id=1, name="Beta Retail", code="BETA", is_active=True, issuing_office_id=1)
        loc1 = Location(id=1, city_name="Ghaziabad", state="UP", is_active=True)
        loc2 = Location(id=2, city_name="Faridabad", state="Haryana", is_active=True)
        client = BillingClient(id=1, name="National Client Ltd", is_active=True)
        session.add_all([c, ce, loc1, loc2, client])

        # LR Series
        lr_series = SeriesMaster(
            document_type="LR",
            series_name="LR Manual Series",
            prefix="LR-2026-",
            starting_number=1,
            current_number=0,
            series_mode="MANUAL",
            financial_year="2026-2027",
            is_active=True,
            is_default=True,
            issuing_office_id=1,
        )
        # Job Series
        job_series = SeriesMaster(
            document_type="JOB",
            series_name="Job Series",
            prefix="JOB-2026-",
            starting_number=100,
            current_number=99,
            series_mode="AUTOMATIC",
            financial_year="2026-2027",
            is_active=True,
            is_default=True,
            issuing_office_id=1,
        )
        session.add_all([lr_series, job_series])
        await session.commit()

    yield session_maker
    await engine.dispose()


@pytest.mark.asyncio
async def test_auto_create_job_when_lr_has_no_job(setup_test_db):
    """
    Acceptance Test 1:
    Create an LR WITHOUT selecting any Job Number.
    - LR saves successfully.
    - Exactly ONE Job Order is auto-created.
    - LR shows the new Job Number.
    - Job shows the LR number and vehicle.
    - Job count increases by 1.
    """
    session_maker = setup_test_db
    async with session_maker() as db:
        jobs_before = await db.scalar(select(func.count(Job.id)))
        assert jobs_before == 0

        payload = LRCreate(
            lr_number="LR-2026-0001",
            lr_date=date(2026, 11, 10),
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            billing_customer_id=1,
            vehicle_source="MARKET",
            vehicle_number="MH04AB1234",
            driver_name="Ramesh",
            driver_phone="9876543210",
            package_count=45,
            chargeable_weight_mt=Decimal("12.500"),
            actual_weight_mt=Decimal("12.500"),
            freight_rate=Decimal("1500.00"),
            freight_amount=Decimal("18750.00"),
            total_freight_amount=Decimal("18750.00"),
            advance_amount=Decimal("3000.00"),
            balance_amount=Decimal("15750.00"),
            booking_status="Booked",
            particulars="Industrial Machinery Components",
            remarks="Handle with care",
            job_id=None,  # Left blank!
        )

        lr = await create_lr(db=db, data=payload, user_id=1, office_id=1, auto_commit=True)

        # 1. Job count check
        jobs_after = await db.scalar(select(func.count(Job.id)))
        assert jobs_after == jobs_before + 1

        # 2. Both-ways linking
        assert lr.job_id is not None
        assert lr.job is not None
        assert lr.job.job_number.startswith("JOB-2026-")

        # 3. Job details copied faithfully from LR
        auto_job = lr.job
        assert auto_job.consigner_id == 1
        assert auto_job.consignee_id == 1
        assert auto_job.origin_location_id == 1
        assert auto_job.destination_location_id == 2
        assert auto_job.billing_client_id == 1
        assert auto_job.billing_party == "National Client Ltd"
        assert auto_job.estimated_weight_mt == Decimal("12.500")
        assert auto_job.estimated_packages == 45
        assert auto_job.cargo_description == "Industrial Machinery Components"
        assert auto_job.status == JobStatus.BOOKED.value
        assert auto_job.special_instructions == "Handle with care"

        # 4. Opening the Job shows the LR
        job_res = _build_job_response(auto_job)
        assert job_res.lr_id == lr.id
        assert job_res.lr_number == "LR-2026-0001"
        assert job_res.vehicle_number == "MH04AB1234"
        assert job_res.driver_name == "Ramesh"

        # 5. Opening the LR shows the Job Number
        lr_res = _build_lr_response(lr)
        assert lr_res.job_number == auto_job.job_number


@pytest.mark.asyncio
async def test_second_lr_gets_different_job_number_in_series(setup_test_db):
    """
    Acceptance Test 2:
    Create a second LR without a Job Number — it gets a DIFFERENT new Job Number
    (next in series counter), not the first LR's Job.
    """
    session_maker = setup_test_db
    async with session_maker() as db:
        lr1_payload = LRCreate(
            lr_number="LR-2026-0002",
            consigner_id=1,
            consignee_id=1,
            vehicle_number="MH04AB2222",
            job_id=None,
        )
        lr1 = await create_lr(db=db, data=lr1_payload, user_id=1, office_id=1, auto_commit=True)

        lr2_payload = LRCreate(
            lr_number="LR-2026-0003",
            consigner_id=1,
            consignee_id=1,
            vehicle_number="MH04AB3333",
            job_id=None,
        )
        lr2 = await create_lr(db=db, data=lr2_payload, user_id=1, office_id=1, auto_commit=True)

        assert lr1.job_id != lr2.job_id
        assert lr1.job.job_number != lr2.job.job_number
        assert lr1.job.job_number == "JOB-2026-0100"
        assert lr2.job.job_number == "JOB-2026-0101"


@pytest.mark.asyncio
async def test_lr_created_with_existing_job_does_not_create_new_job(setup_test_db):
    """
    Acceptance Test 3:
    Create an LR BY selecting an existing Job Number — it uses that Job,
    and NO new Job is created. Job count does not increase.
    """
    session_maker = setup_test_db
    async with session_maker() as db:
        # Pre-existing Job in OPEN status
        existing_job = Job(
            job_number="JOB-EXISTING-001",
            job_date=date.today(),
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            status=JobStatus.OPEN.value,
            issuing_office_id=1,
        )
        db.add(existing_job)
        await db.commit()
        await db.refresh(existing_job)

        jobs_before = await db.scalar(select(func.count(Job.id)))

        payload = LRCreate(
            lr_number="LR-2026-0004",
            consigner_id=1,
            consignee_id=1,
            vehicle_number="MH04AB4444",
            job_id=existing_job.id,  # Selected existing job!
        )
        lr = await create_lr(db=db, data=payload, user_id=1, office_id=1, auto_commit=True)

        jobs_after = await db.scalar(select(func.count(Job.id)))
        # Count check: NO new job created
        assert jobs_after == jobs_before
        assert lr.job_id == existing_job.id
        assert lr.job.job_number == "JOB-EXISTING-001"
        # Existing job transitioned from OPEN to BOOKED
        assert lr.job.status == JobStatus.BOOKED.value


@pytest.mark.asyncio
async def test_validation_failure_creates_no_lr_and_no_job(setup_test_db):
    """
    Acceptance Test 4:
    Try to save an LR without a Job Number with a required field missing —
    validation fails, NO LR is saved, and NO Job is created.
    """
    session_maker = setup_test_db
    async with session_maker() as db:
        jobs_before = await db.scalar(select(func.count(Job.id)))
        lrs_before = await db.scalar(select(func.count(LR.id)))

        # vehicle_number is required on LRCreate
        with pytest.raises(ValidationError):
            LRCreate(
                lr_number="LR-2026-0005",
                consigner_id=1,
                consignee_id=1,
                vehicle_number="",  # Invalid / empty
            )

        jobs_after = await db.scalar(select(func.count(Job.id)))
        lrs_after = await db.scalar(select(func.count(LR.id)))
        assert jobs_after == jobs_before
        assert lrs_after == lrs_before


@pytest.mark.asyncio
async def test_chatbot_lr_creation_auto_creates_job(setup_test_db):
    """
    Acceptance Test 5:
    Create an LR without a Job via the chatbot — the same auto-Job
    is created and linked atomically in the single transaction.
    """
    session_maker = setup_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Demo Logistics", company_code="DEMO", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 1)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        jobs_before = await db.scalar(select(func.count(Job.id)))

        # 1. Natural language draft
        user_text = "Book LR: Consigner is Acme Corp, consignee is Beta Retail, vehicle DL01AA9999, from Ghaziabad to Faridabad, freight 25000"
        _, cards = await handle_conversational_lr_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text=user_text, lang="en"
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # 2. Confirm and create LR via chatbot endpoint
        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        res = await confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert res.success is True

        jobs_after = await db.scalar(select(func.count(Job.id)))
        assert jobs_after == jobs_before + 1

        # Check that the created LR has the auto-created Job
        created_lr = await get_lr_by_id(db, res.lr_id)
        assert created_lr.job_id is not None
        assert created_lr.job is not None
        assert created_lr.job.job_number.startswith("JOB-2026-")
        assert created_lr.job.status == JobStatus.BOOKED.value


@pytest.mark.asyncio
async def test_job_listing_shows_linked_lr_and_vehicle(setup_test_db):
    """
    Acceptance Test 6:
    Job list shows the auto-created Job with LR number, route, vehicle, and status.
    """
    session_maker = setup_test_db
    async with session_maker() as db:
        payload = LRCreate(
            lr_number="LR-2026-0009",
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="KA01HH7777",
            driver_name="Deepak",
            freight_amount=Decimal("35000.00"),
            total_freight_amount=Decimal("35000.00"),
            job_id=None,
        )
        lr = await create_lr(db=db, data=payload, user_id=1, office_id=1, auto_commit=True)

        jobs = await get_all_jobs(db=db, office_id=1)
        matching_job = next(j for j in jobs if j.id == lr.job_id)

        job_view = _build_job_response(matching_job)
        assert job_view.lr_number == "LR-2026-0009"
        assert job_view.vehicle_number == "KA01HH7777"
        assert job_view.driver_name == "Deepak"
        assert job_view.origin_city == "Ghaziabad"
        assert job_view.destination_city == "Faridabad"
        assert job_view.status == JobStatus.BOOKED
