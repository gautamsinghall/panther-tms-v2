import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

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
)
from app.control.models import ControlBase
from app.modules.transport.schemas import JobCreate, JobUpdate
from app.modules.transport.service import create_job, update_job
from app.modules.transport.router import _build_job_response


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    # Note: expire_on_commit=True simulates PostgreSQL real production session behavior!
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=True, autoflush=True)

    async with session_maker() as session:
        # Branch
        branch = Branch(id=1, name="Delhi Hub", code="DEL-01", is_active=True, is_head_office=True)
        session.add(branch)

        # Job Series
        series = SeriesMaster(
            id=1,
            document_type="JOB",
            series_name="Default Job",
            prefix="JOB-",
            starting_number=100,
            current_number=99,
            is_active=True,
            issuing_office_id=1,
        )
        lr_series = SeriesMaster(
            id=2,
            document_type="LR",
            series_name="Default LR",
            prefix="LR-",
            starting_number=1,
            current_number=1,
            is_active=True,
            issuing_office_id=1,
        )
        session.add_all([series, lr_series])

        # Parties & Locations
        c = Consigner(id=1, name="Consigner A", code="CA", is_active=True)
        ce = Consignee(id=1, name="Consignee B", code="CB", is_active=True)
        loc1 = Location(id=1, city_name="Delhi", state="Delhi", pincode="110001", is_active=True)
        loc2 = Location(id=2, city_name="Mumbai", state="Maharashtra", pincode="400001", is_active=True)
        bc = BillingClient(id=1, name="Jubilant", is_active=True)
        session.add_all([c, ce, loc1, loc2, bc])

        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_job_create_and_update_with_locations(db_session):
    create_payload = JobCreate(
        billing_client_id=1,
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=2,
        job_date=date(2026, 11, 12),
        cargo_description="Test Cargo",
        estimated_weight_mt=Decimal("10.000"),
        estimated_packages=50,
    )
    job = await create_job(db=db_session, data=create_payload, user_id=1, office_id=1, auto_commit=True)
    assert job.origin_location_id == 1
    assert job.destination_location_id == 2

    # Now verify building job response (this will fail with greenlet_spawn if relationships are expired!)
    res = _build_job_response(job)
    assert res.origin_location_id == 1
    assert res.destination_location_id == 2
    assert res.origin_city == "Delhi"
    assert res.destination_city == "Mumbai"

    # Now test update_job with log_activity like the router does!
    from app.services.activity_logger import log_activity

    update_payload = JobUpdate(
        origin_location_id=2,
        destination_location_id=1,
        cargo_description="Updated Cargo",
    )
    updated_job = await update_job(db=db_session, job_id=job.id, data=update_payload)
    res_updated = _build_job_response(updated_job)
    await log_activity(
        db=db_session,
        action="JOB_UPDATED",
        module="transport",
        entity_type="Job",
        entity_id=str(updated_job.id),
        entity_identifier=updated_job.job_number,
    )
    assert res_updated.origin_location_id == 2
    assert res_updated.destination_location_id == 1
    assert res_updated.origin_city == "Mumbai"
    assert res_updated.destination_city == "Delhi"


@pytest.mark.asyncio
async def test_job_locked_when_used_in_lr(db_session):
    from app.modules.transport.service import create_lr
    from app.modules.transport.schemas import LRCreate
    from app.core.exceptions import AppException

    # 1. Create a job
    job = await create_job(
        db=db_session,
        data=JobCreate(
            billing_client_id=1,
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            job_date=date(2026, 11, 12),
        ),
        user_id=1,
        office_id=1,
        auto_commit=True,
    )

    # 2. Before LR is linked, job is fully editable
    job = await update_job(
        db=db_session,
        job_id=job.id,
        data=JobUpdate(cargo_description="Editable because no LR linked"),
    )
    assert job.cargo_description == "Editable because no LR linked"

    # 3. Create an LR linked to this job
    lr = await create_lr(
        db=db_session,
        data=LRCreate(
            lr_number="LR-2026-9999",
            job_id=job.id,
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="DL01AA1111",
        ),
        user_id=1,
        office_id=1,
        auto_commit=True,
    )

    # 4. Now attempt to edit the job — it must be locked!
    with pytest.raises(AppException) as exc_info:
        await update_job(
            db=db_session,
            job_id=job.id,
            data=JobUpdate(cargo_description="Should fail"),
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "JOB_LOCKED_LR_ATTACHED"
    assert f"Job number {job.job_number} is used in LR #{lr.lr_number} and cannot be edited." == exc_info.value.message


@pytest.mark.asyncio
async def test_lr_cannot_link_already_linked_job(db_session):
    from app.modules.transport.service import create_lr, update_lr, get_all_jobs
    from app.modules.transport.schemas import LRCreate, LRUpdate
    from app.core.exceptions import AppException

    # 1. Create a job
    job = await create_job(
        db=db_session,
        data=JobCreate(
            billing_client_id=1,
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            job_date=date(2026, 11, 12),
        ),
        user_id=1,
        office_id=1,
        auto_commit=True,
    )
    saved_job_id = job.id

    # 2. Create first LR with this job
    lr1 = await create_lr(
        db=db_session,
        data=LRCreate(
            lr_number="LR-2026-0001",
            job_id=saved_job_id,
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="DL01AA1111",
        ),
        user_id=1,
        office_id=1,
        auto_commit=True,
    )
    lr1_number = lr1.lr_number

    # 3. Create second LR attempting to link same job -> MUST FAIL
    with pytest.raises(AppException) as exc_info:
        await create_lr(
            db=db_session,
            data=LRCreate(
                lr_number="LR-2026-0002",
                job_id=saved_job_id,
                consigner_id=1,
                consignee_id=1,
                origin_location_id=1,
                destination_location_id=2,
                vehicle_number="DL01AA2222",
            ),
            user_id=1,
            office_id=1,
            auto_commit=True,
        )
    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "JOB_ALREADY_LINKED"

    # 4. Create second LR without job
    lr2 = await create_lr(
        db=db_session,
        data=LRCreate(
            lr_number="LR-2026-0003",
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="DL01AA3333",
        ),
        user_id=1,
        office_id=1,
        auto_commit=True,
    )
    saved_lr2_id = lr2.id

    # 5. Attempt update_lr to link the already-linked job -> MUST FAIL
    with pytest.raises(AppException) as exc_info2:
        await update_lr(
            db=db_session,
            lr_id=saved_lr2_id,
            data=LRUpdate(job_id=saved_job_id),
        )
    assert exc_info2.value.status_code == 400
    assert exc_info2.value.error_code == "JOB_ALREADY_LINKED"

    # 6. Verify get_all_jobs returns job with lr_number populated
    jobs = await get_all_jobs(db=db_session)
    job_match = next((j for j in jobs if j.id == saved_job_id), None)
    assert job_match is not None
    job_res = _build_job_response(job_match)
    assert job_res.lr_number == lr1_number
    assert job_res.linked_lrs == [lr1_number]

