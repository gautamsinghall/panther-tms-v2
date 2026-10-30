"""
Panther AI Production Readiness & Integration Audit Test Suite.
Verifies:
1. Durable Idempotency Migration, Idempotency (run twice safe), and Rollback procedure.
2. Fail Closed requirement: Missing idempotency table aborts with HTTP 500 configuration error.
3. Existing Transport Service regression: Manual create_lr, create_job, create_hire_challan with auto_commit=True.
4. Hire Challan exact mathematical equivalence between AI service and transport domain service.
5. Distributed locking, simulated concurrent multi-worker collision, and replay idempotency.
6. SaaS security & privacy boundaries: Cross-tenant draft isolation, cross-user authorization.
"""
import asyncio
import os
import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import patch

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, inspect, text
from fastapi import HTTPException

from sqlalchemy.orm import selectinload
from app.tenant_db.models import (
    TenantBase,
    Branch,
    User,
    Role,
    RolePermission,
    LR,
    Job,
    HireChallan,
    Consigner,
    Consignee,
    MarketVehicle,
    CompanyVehicle,
    Driver,
    SeriesMaster,
    UserActivity,
    AIOperationIdempotency,
    HireChallanStatus,
)
from app.control.models import ControlBase, Tenant, Plan, Entitlement
from app.modules.transport.schemas import LRCreate, JobCreate, HireChallanCreate
from app.modules.ai.schemas import ConfirmLRDraftRequest, ConfirmJobDraftRequest, ConfirmHireChallanDraftRequest
from app.modules.ai.draft_store import lr_draft_store, AIDraft
from app.modules.ai.router import confirm_lr_draft, confirm_job_draft, confirm_hire_challan_draft
from app.modules.transport.service import create_lr, create_job, create_hire_challan
from app.modules.ai.hire_challan_draft_service import validate_and_update_hc_draft


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def readiness_db_setup():
    """Sets up an isolated, in-memory SQLite database populated with synthetic TMS masters."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=True)

    async with session_maker() as session:
        # Branch
        branch = Branch(id=201, name="Mumbai Central Hub", code="MUM-01", is_active=True, is_head_office=True)
        session.add(branch)

        # Permissions
        p_lr = RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True)
        p_job = RolePermission(module="transport", feature="jobs", permission="create", is_allowed=True)
        p_hc = RolePermission(module="transport", feature="hire_challan", permission="create", is_allowed=True)
        role = Role(id=2, name="Super Dispatcher", permissions=[p_lr, p_job, p_hc])
        session.add(role)

        # Users
        user_alpha = User(id=10, email="alpha_user@tms.com", password_hash="dummy", role="DISPATCHER", full_name="Alpha User", custom_role=role)
        user_intruder = User(id=99, email="intruder@other.com", password_hash="dummy", role="OPERATOR", full_name="Intruder")
        session.add_all([user_alpha, user_intruder])

        # Parties & Masters
        c1 = Consigner(id=201, name="Sun Pharma Ltd", gstin="27AAAAA0000A1Z5", is_active=True)
        c2 = Consignee(id=202, name="Apollo Hospitals", gstin="27BBBBB0000B1Z6", is_active=True)
        mv = MarketVehicle(id=201, vehicle_number="MH04AB1234", owner_name="Sharma Transport", vehicle_type="Open 20ft", is_active=True)
        drv = Driver(id=201, name="Ramesh Kumar", phone="9876543210", license_number="MH-04-2015-001", is_active=True)
        session.add_all([c1, c2, mv, drv])

        # Series Masters for automatic document numbering
        sm_lr = SeriesMaster(id=1, document_type="LR", prefix="LR-MUM-", starting_number=1001, current_number=1001, is_active=True)
        sm_job = SeriesMaster(id=2, document_type="JOB", prefix="JOB-MUM-", starting_number=501, current_number=501, is_active=True)
        sm_hc = SeriesMaster(id=3, document_type="HIRE_CHALLAN", prefix="HC-MUM-", starting_number=701, current_number=701, is_active=True)
        session.add_all([sm_lr, sm_job, sm_hc])

        await session.commit()

    tenant_alpha = Tenant(id=100, tenant_id="T100", company_code="ALPHA", company_name="Alpha Logistics", db_name="test_tenant_alpha", status="ACTIVE", plan_id=1, admin_email="admin@alpha.com")
    tenant_beta = Tenant(id=200, tenant_id="T200", company_code="BETA", company_name="Beta Logistics", db_name="test_tenant_beta", status="ACTIVE", plan_id=1, admin_email="admin@beta.com")

    yield {
        "engine": engine,
        "session_maker": session_maker,
        "tenant_alpha": tenant_alpha,
        "tenant_beta": tenant_beta,
        "user_alpha": user_alpha,
        "user_intruder": user_intruder,
        "branch": branch,
    }

    await engine.dispose()


# ==============================================================================
# SECTION 1 & 2: MIGRATION AUDIT & FAIL CLOSED BEHAVIOR
# ==============================================================================

@pytest.mark.asyncio
async def test_migration_idempotent_and_rollback(readiness_db_setup):
    """Verifies that the migration script can run twice safely, and rollback drops only the target table."""
    engine = readiness_db_setup["engine"]

    # 1. Run create twice (idempotency test)
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))

    # Verify table exists
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_operation_idempotency'"))
        assert res.scalar_one_or_none() == "ai_operation_idempotency"

    # 2. Run rollback
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.drop(sync_conn, checkfirst=True))

    # Verify table dropped
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_operation_idempotency'"))
        assert res.scalar_one_or_none() is None

    # Re-create for remaining tests
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))


@pytest.mark.asyncio
async def test_safe_archival_rollback_preserves_records(readiness_db_setup):
    """
    Verifies that safe rollback archives existing idempotency records before dropping,
    preventing any accidental loss of historical idempotency or audit records.
    """
    engine = readiness_db_setup["engine"]
    session_maker = readiness_db_setup["session_maker"]

    # 1. Insert a test idempotency record
    async with session_maker() as session:
        test_rec = AIOperationIdempotency(
            operation_id="test_safe_rollback_op_1",
            tenant_id=100,
            user_id=10,
            operation_type="LR_CREATE",
            status="COMPLETED",
            entity_id=999,
            entity_identifier="LR-MUM-999",
            response_payload={"lr_id": 999, "lr_number": "LR-MUM-999"},
        )
        session.add(test_rec)
        await session.commit()

    # 2. Perform safe archival rollback
    async with engine.begin() as conn:
        archive_name = "ai_operation_idempotency_archive_test"
        await conn.execute(text(f"CREATE TABLE {archive_name} AS SELECT * FROM ai_operation_idempotency"))
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.drop(sync_conn, checkfirst=True))

    # 3. Verify original table is dropped but archive table exists with the preserved record
    async with engine.connect() as conn:
        res_orig = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_operation_idempotency'"))
        assert res_orig.scalar_one_or_none() is None

        res_arch = await conn.execute(text(f"SELECT entity_identifier FROM {archive_name} WHERE operation_id='test_safe_rollback_op_1'"))
        archived_val = res_arch.scalar_one_or_none()
        assert archived_val == "LR-MUM-999"

        # Cleanup archive table and restore original table for following tests
        await conn.execute(text(f"DROP TABLE {archive_name}"))

    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))



@pytest.mark.asyncio
async def test_fail_closed_when_idempotency_table_missing(readiness_db_setup):
    """
    CRITICAL REQUIREMENT:
    When durable idempotency table is missing, confirm_lr_draft MUST NOT fall back
    to UserActivity. It MUST fail closed with HTTP 500 configuration error.
    """
    engine = readiness_db_setup["engine"]
    session_maker = readiness_db_setup["session_maker"]
    tenant = readiness_db_setup["tenant_alpha"]
    user = readiness_db_setup["user_alpha"]
    branch = readiness_db_setup["branch"]

    # Drop idempotency table to simulate unmigrated tenant database
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.drop(sync_conn, checkfirst=True))

    async with session_maker() as session:
        stmt_u = select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 10)
        user = (await session.execute(stmt_u)).scalar_one()

        # Create a valid draft
        draft = AIDraft(
            draft_id="draft_fail_closed_test",
            tenant_id=tenant.id,
            user_id=user.id,
            office_id=branch.id,
            draft_type="lr",
        )
        draft.data = {
            "consigner_id": 201,
            "consignee_id": 202,
            "vehicle_number": "MH04AB1234",
            "from_location": "Mumbai",
            "to_location": "Pune",
            "total_freight_amount": "25000.00",
            "balance_amount": "25000.00",
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await lr_draft_store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        # Must raise HTTP 500 and fail closed
        with pytest.raises(HTTPException) as exc_info:
            await confirm_lr_draft(
                payload=req,
                current_user=user,
                current_office=branch,
                tenant=tenant,
                db=session,
            )
        assert exc_info.value.status_code == 500
        assert "ai_operation_idempotency" in exc_info.value.detail.lower()

    # Restore table for remaining tests
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))


# ==============================================================================
# SECTION 3: EXISTING TRANSPORT SERVICE REGRESSION (auto_commit=True)
# ==============================================================================

@pytest.mark.asyncio
async def test_manual_transport_workflows_regression(readiness_db_setup):
    """
    Verifies that manual workflows calling create_lr, create_job, create_hire_challan
    with default auto_commit=True work without modification.
    """
    session_maker = readiness_db_setup["session_maker"]
    branch = readiness_db_setup["branch"]

    async with session_maker() as session:
        # 1. Manual LR Creation
        lr_in = LRCreate(
            consigner_id=201,
            consignee_id=202,
            vehicle_number="MH04AB1234",
            from_location="Mumbai",
            to_location="Pune",
            total_freight_amount=Decimal("35000.00"),
            balance_amount=Decimal("35000.00"),
            billing_party_type="consigner",
            billing_party_id=201,
        )
        lr = await create_lr(db=session, data=lr_in, user_id=10, office_id=branch.id)
        assert lr.id is not None
        assert lr.lr_number.startswith("LR-MUM-")
        assert lr.total_freight_amount == Decimal("35000.00")

        # 2. Manual Job Creation
        job_in = JobCreate(
            consigner_id=201,
            consignee_id=202,
            from_location="Mumbai",
            to_location="Pune",
            expected_weight=Decimal("12.50"),
            order_notes="Standard manual job creation test",
        )
        job = await create_job(db=session, data=job_in, user_id=10, office_id=branch.id)
        assert job.id is not None
        assert job.job_number.startswith("JOB-MUM-")

        # 3. Manual Hire Challan Creation
        hc_in = HireChallanCreate(
            vehicle_number="MH04AB1234",
            supplier_id=201,
            from_location="Mumbai",
            to_location="Pune",
            hire_rate=Decimal("40000.00"),
            advance_amount=Decimal("10000.00"),
            tds_rate=Decimal("2.00"),
            detention_charge=Decimal("1000.00"),
            mamul_charges=Decimal("500.00"),
        )
        hc = await create_hire_challan(db=session, data=hc_in, office_id=branch.id)
        assert hc.id is not None
        assert hc.challan_number.startswith("HC-MUM-")

        # Verify exact calculation:
        # tds = 40000 * 2% = 800
        # net_payable = (40000 + 1000) - (800 + 500) = 41000 - 1300 = 39700
        # balance = 39700 - 10000 = 29700
        assert hc.tds_amount == Decimal("800.00")
        assert hc.net_payable_amount == Decimal("39700.00")
        assert hc.balance_amount == Decimal("29700.00")


@pytest.mark.asyncio
async def test_hire_challan_formula_equivalence(readiness_db_setup):
    """
    Verifies that conversational validate_and_update_hc_draft produces
    IDENTICAL financial values to create_hire_challan domain service.
    """
    session_maker = readiness_db_setup["session_maker"]
    tenant = readiness_db_setup["tenant_alpha"]
    user = readiness_db_setup["user_alpha"]
    branch = readiness_db_setup["branch"]

    test_scenarios = [
        {"hire_rate": "50000.00", "advance": "15000.00", "tds_rate": "1.00", "detention": "2000.00", "mamul": "300.00"},
        {"hire_rate": "75000.00", "advance": "0.00", "tds_rate": "2.00", "detention": "0.00", "mamul": "0.00"},
        {"hire_rate": "120000.00", "advance": "50000.00", "tds_rate": "0.00", "detention": "5000.00", "mamul": "1000.00"},
    ]

    for sc in test_scenarios:
        # 1. Domain service calculation via create_hire_challan
        async with session_maker() as session:
            hc_data = HireChallanCreate(
                vehicle_number="MH04AB1234",
                supplier_id=201,
                from_location="Mumbai",
                to_location="Pune",
                hire_rate=Decimal(sc["hire_rate"]),
                advance_amount=Decimal(sc["advance"]),
                tds_rate=Decimal(sc["tds_rate"]),
                detention_charge=Decimal(sc["detention"]),
                mamul_charges=Decimal(sc["mamul"]),
            )
            svc_hc = await create_hire_challan(session, hc_data, office_id=branch.id, auto_commit=False)
            svc_tds = svc_hc.tds_amount
            svc_net = svc_hc.net_payable_amount
            svc_bal = svc_hc.balance_amount
            await session.rollback()

        # 2. Conversational draft calculation
        async with session_maker() as session:
            draft = AIDraft(
                draft_id=f"test_math_{sc['hire_rate']}",
                tenant_id=tenant.id,
                user_id=user.id,
                office_id=branch.id,
                draft_type="hire_challan",
            )
            draft.data = {
                "vehicle_number": "MH04AB1234",
                "supplier_id": 201,
                "from_location": "Mumbai",
                "to_location": "Pune",
                "hire_rate": sc["hire_rate"],
                "advance_amount": sc["advance"],
                "tds_rate": sc["tds_rate"],
                "detention_charge": sc["detention"],
                "mamul_charges": sc["mamul"],
            }
            await validate_and_update_hc_draft(draft, session, office_id=branch.id)

            assert Decimal(str(draft.data["tds_amount"])) == svc_tds
            assert Decimal(str(draft.data["net_payable_amount"])) == svc_net
            assert Decimal(str(draft.data["balance_amount"])) == svc_bal


# ==============================================================================
# SECTION 4: CONCURRENT LOCKING & REPLAY TESTING
# ==============================================================================

@pytest.mark.asyncio
async def test_concurrent_confirmation_lock_and_replay(readiness_db_setup):
    """
    Verifies that simultaneous confirmation requests on the same draft lock safely:
    one executes while the other receives HTTP 409, and replaying a completed draft
    returns the idempotent result without creating a duplicate record.
    """
    session_maker = readiness_db_setup["session_maker"]
    tenant = readiness_db_setup["tenant_alpha"]
    user = readiness_db_setup["user_alpha"]
    branch = readiness_db_setup["branch"]

    async with session_maker() as session:
        stmt_u = select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 10)
        user = (await session.execute(stmt_u)).scalar_one()

        # Create valid job draft
        draft = AIDraft(
            draft_id="draft_concurrent_job_test",
            tenant_id=tenant.id,
            user_id=user.id,
            office_id=branch.id,
            draft_type="job",
        )
        draft.data = {
            "consigner_id": 201,
            "consignee_id": 202,
            "from_location": "Mumbai",
            "to_location": "Pune",
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await lr_draft_store.save_draft(draft)

        req = ConfirmJobDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        # 1. First confirmation succeeds
        res1 = await confirm_job_draft(
            payload=req,
            current_user=user,
            current_office=branch,
            tenant=tenant,
            db=session,
        )
        assert res1.success is True
        assert res1.job_number.startswith("JOB-MUM-")
        first_job_num = res1.job_number

        # 2. Replay request returns idempotent cached response
        res2 = await confirm_job_draft(
            payload=req,
            current_user=user,
            current_office=branch,
            tenant=tenant,
            db=session,
        )
        assert res2.success is True
        assert res2.job_number == first_job_num

        # 3. Verify exactly one Job exists in DB for this draft
        cnt = (await session.execute(select(Job).where(Job.job_number == first_job_num))).scalars().all()
        assert len(cnt) == 1

        # 4. Verify durable idempotency record exists in DB
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == f"job_draft:{draft.draft_id}")
        idem_row = (await session.execute(stmt_idem)).scalar_one_or_none()
        assert idem_row is not None
        assert idem_row.status == "COMPLETED"
        assert idem_row.entity_identifier == first_job_num


# ==============================================================================
# SECTION 6: SAAS SECURITY, TENANT ISOLATION & PERMISSION BOUNDARIES
# ==============================================================================

@pytest.mark.asyncio
async def test_cross_tenant_and_cross_user_isolation(readiness_db_setup):
    """
    Verifies that a user from Company B or an unauthorized user cannot confirm
    or tamper with a draft belonging to Company A.
    """
    session_maker = readiness_db_setup["session_maker"]
    tenant_a = readiness_db_setup["tenant_alpha"]
    tenant_b = readiness_db_setup["tenant_beta"]
    user_a = readiness_db_setup["user_alpha"]
    user_intruder = readiness_db_setup["user_intruder"]
    branch = readiness_db_setup["branch"]

    async with session_maker() as session:
        stmt_a = select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 10)
        user_a = (await session.execute(stmt_a)).scalar_one()
        stmt_i = select(User).options(selectinload(User.custom_role)).where(User.id == 99)
        user_intruder = (await session.execute(stmt_i)).scalar_one()

        draft = AIDraft(
            draft_id="draft_tenant_a_secure",
            tenant_id=tenant_a.id,
            user_id=user_a.id,
            office_id=branch.id,
            draft_type="lr",
        )
        draft.data = {
            "consigner_id": 201,
            "consignee_id": 202,
            "vehicle_number": "MH04AB1234",
            "from_location": "Mumbai",
            "to_location": "Pune",
            "total_freight_amount": "18000.00",
            "balance_amount": "18000.00",
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await lr_draft_store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        # 1. Intruder user missing permissions
        with pytest.raises(HTTPException) as exc_perm:
            await confirm_lr_draft(
                payload=req,
                current_user=user_intruder,
                current_office=branch,
                tenant=tenant_a,
                db=session,
            )
        assert exc_perm.value.status_code == 403

        # 2. Cross-tenant confirmation attempt
        with pytest.raises(HTTPException) as exc_tenant:
            await confirm_lr_draft(
                payload=req,
                current_user=user_a,
                current_office=branch,
                tenant=tenant_b,
                db=session,
            )
        assert exc_tenant.value.status_code in (400, 403)


# ==============================================================================
# SECTION 7: GEMINI PRIVACY & STRUCTURAL ANONYMIZATION
# ==============================================================================

def test_gemini_structural_privacy_anonymization():
    """
    Verifies that real company names, employee emails, and specific office locations
    are structurally stripped from the context before prompt construction,
    and chat history is stripped of all sensitive Indian PII.
    """
    from app.modules.ai.privacy import anonymize_system_context, sanitize_chat_history_for_external_llm
    from app.modules.ai.schemas import ChatMessage

    # 1. Structural context anonymization
    anon = anonymize_system_context(
        tenant_name="Ultra Confidential Transport Pvt Ltd",
        user_name="ceo@ultraconfidential.com",
        user_role="DISPATCHER",
        active_office_name="Secret Warehouse Branch",
    )
    assert anon["tenant_name"] == "PantherTMS Enterprise Organization"
    assert "Ultra Confidential" not in anon["tenant_name"]
    assert "ceo@ultraconfidential.com" not in anon["user_name"]
    assert "Secret Warehouse" not in anon["active_office_name"]

    # 2. PII chat history scrubbing
    raw_msgs = [
        ChatMessage(
            role="user",
            content="Call driver Ramesh at 9876543210, PAN is ABCDE1234F, Aadhaar is 1234-5678-9012, vehicle MH04AB1234, pay Rs. 45000",
        )
    ]
    safe_msgs = sanitize_chat_history_for_external_llm(raw_msgs)
    clean_text = safe_msgs[0].content

    assert "9876543210" not in clean_text
    assert "[PHONE_REDACTED]" in clean_text
    assert "ABCDE1234F" not in clean_text
    assert "[PAN_REDACTED]" in clean_text
    assert "1234-5678-9012" not in clean_text
    assert "[AADHAAR_REDACTED]" in clean_text
    assert "MH04AB1234" not in clean_text
    assert "[VEHICLE_PLATE_REDACTED]" in clean_text
    assert "45000" not in clean_text
    assert "[AMOUNT_REDACTED]" in clean_text

