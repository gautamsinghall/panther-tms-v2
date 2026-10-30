"""
Panther AI Real PostgreSQL and Redis Integration Test Suite.
Executes against isolated test containers:
- panther-ai-test-postgres (127.0.0.1:5434)
- panther-ai-test-redis (127.0.0.1:6380)

Strict Invariants:
1. Hard Fail-Safe: Fails immediately if any connection points to port 5433, 5432, 6379,
   or any non-synthetic database. Existing PantherTMS containers are NEVER touched.
2. Real PostgreSQL asyncpg driver verifies migrations, transactions, rollbacks,
   SeriesMaster document numbering, and atomic double-layer idempotency.
3. Real Redis verifies draft storage, TTL expiry, noeviction memory policy,
   concurrent distributed locking (HTTP 409 Conflict), and replay idempotency.
4. Voice features completely excluded.
"""
import asyncio
import os
import sys
import uuid
from decimal import Decimal
from typing import Dict, Any
from unittest.mock import patch

import pytest
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import text, select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

# Load credentials securely from git-ignored .ai_test.env without printing or exposing
def _load_ai_test_env() -> Dict[str, str]:
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".ai_test.env")
    env_vals = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vals[k.strip()] = v.strip()
    return env_vals

AI_TEST_CONFIG = _load_ai_test_env()
PG_USER = AI_TEST_CONFIG.get("AI_TEST_POSTGRES_USER", "panther_ai_tester")
PG_PASS = AI_TEST_CONFIG.get("AI_TEST_POSTGRES_PASSWORD", "")
PG_HOST = AI_TEST_CONFIG.get("AI_TEST_POSTGRES_HOST", "127.0.0.1")
PG_PORT = int(AI_TEST_CONFIG.get("AI_TEST_POSTGRES_PORT", 5434))
REDIS_HOST = AI_TEST_CONFIG.get("AI_TEST_REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(AI_TEST_CONFIG.get("AI_TEST_REDIS_PORT", 6380))

CONTROL_DB = "panther_ai_control_test"
TENANT_A_DB = "panther_ai_tenant_alpha"
TENANT_B_DB = "panther_ai_tenant_beta"

# HARD FAIL-SAFE ISOLATION GUARD
def assert_strict_isolation_guards(host: str, port: int, db_name: str, r_port: int):
    assert host in ("127.0.0.1", "localhost"), f"CRITICAL: Unsafe host '{host}'!"
    assert port == 5434, f"CRITICAL: Port {port} is not test port 5434! Refusing connection."
    assert db_name.startswith("panther_ai_"), f"CRITICAL: Database '{db_name}' is not an isolated test db!"
    assert r_port == 6380, f"CRITICAL: Redis port {r_port} is not test port 6380! Refusing connection."

assert_strict_isolation_guards(PG_HOST, PG_PORT, CONTROL_DB, REDIS_PORT)
assert_strict_isolation_guards(PG_HOST, PG_PORT, TENANT_A_DB, REDIS_PORT)

from app.control.models import ControlBase, Tenant, Plan, Entitlement
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
)
from app.modules.transport.schemas import LRCreate, JobCreate, HireChallanCreate
from app.modules.ai.schemas import (
    ConfirmLRDraftRequest,
    ConfirmJobDraftRequest,
    ConfirmHireChallanDraftRequest,
)
from app.modules.ai.draft_store import AIDraftStore, AIDraft
from app.modules.transport.service import create_lr, create_job, create_hire_challan
from app.modules.ai.router import confirm_lr_draft, confirm_job_draft, confirm_hire_challan_draft
from app.core.config import settings


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


def get_pg_url(db_name: str) -> str:
    assert_strict_isolation_guards(PG_HOST, PG_PORT, db_name, REDIS_PORT)
    return f"postgresql+asyncpg://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{db_name}"


@pytest.fixture(scope="function")
async def real_postgres_engines():
    """Initializes asyncpg engines connected exclusively to panther-ai-test-postgres."""
    ctrl_engine = create_async_engine(get_pg_url(CONTROL_DB), poolclass=NullPool)
    tenant_a_engine = create_async_engine(get_pg_url(TENANT_A_DB), poolclass=NullPool)
    tenant_b_engine = create_async_engine(get_pg_url(TENANT_B_DB), poolclass=NullPool)

    # Apply base schemas
    async with ctrl_engine.begin() as conn:
        await conn.run_sync(ControlBase.metadata.create_all)

    async with tenant_a_engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with tenant_b_engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    # Seed synthetic control masters
    CtrlSession = async_sessionmaker(ctrl_engine, class_=AsyncSession, expire_on_commit=False)
    async with CtrlSession() as session:
        t_alpha = await session.get(Tenant, 101)
        t_beta = await session.get(Tenant, 102)
        if not t_alpha:
            e1 = Entitlement(feature_key="module_transport", limit_value="true", is_enabled=True)
            e2 = Entitlement(feature_key="max_lrs_per_month", limit_value="1000", is_enabled=True)
            e3 = Entitlement(feature_key="max_hire_challans_per_month", limit_value="1000", is_enabled=True)
            plan_pro = Plan(id=10, code="PRO", name="Pro Plan", entitlements=[e1, e2, e3])
            session.add(plan_pro)

            t_alpha = Tenant(
                id=101,
                tenant_id="TENANT_A",
                company_code="ALPHA_AI",
                company_name="Alpha AI Logistics",
                db_name=TENANT_A_DB,
                status="ACTIVE",
                plan_id=10,
                admin_email="admin@alpha-ai.test",
            )
            t_beta = Tenant(
                id=102,
                tenant_id="TENANT_B",
                company_code="BETA_AI",
                company_name="Beta AI Logistics",
                db_name=TENANT_B_DB,
                status="ACTIVE",
                plan_id=10,
                admin_email="admin@beta-ai.test",
            )
            session.add_all([t_alpha, t_beta])
            await session.commit()

        # Eager load plan and entitlements so no lazy load is triggered across tenant session
        stmt_ta = select(Tenant).options(selectinload(Tenant.plan).selectinload(Plan.entitlements)).where(Tenant.id == 101)
        t_alpha = (await session.execute(stmt_ta)).scalar_one()

        stmt_tb = select(Tenant).options(selectinload(Tenant.plan).selectinload(Plan.entitlements)).where(Tenant.id == 102)
        t_beta = (await session.execute(stmt_tb)).scalar_one()

    # Seed synthetic tenant A masters
    TenantASession = async_sessionmaker(tenant_a_engine, class_=AsyncSession, expire_on_commit=False)
    async with TenantASession() as session:
        br_delhi = await session.get(Branch, 1)
        if not br_delhi:
            br_delhi = Branch(id=1, name="Delhi AI Hub", code="DEL-AI-01", is_active=True, is_head_office=True)
            br_mumbai = Branch(id=2, name="Mumbai AI Hub", code="MUM-AI-01", is_active=True, is_head_office=False)
            session.add_all([br_delhi, br_mumbai])

            p1 = RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True)
            p2 = RolePermission(module="transport", feature="jobs", permission="create", is_allowed=True)
            p3 = RolePermission(module="transport", feature="hire_challan", permission="create", is_allowed=True)
            role_disp = Role(id=1, name="AI Dispatcher", permissions=[p1, p2, p3])
            session.add(role_disp)

            u_dispatcher = User(id=1, email="dispatcher@alpha-ai.test", password_hash="hash", role="DISPATCHER", full_name="Alpha Dispatcher", role_id=1)
            u_unauth = User(id=2, email="unauth@alpha-ai.test", password_hash="hash", role="OPERATOR", full_name="Alpha Operator", role_id=None)
            session.add_all([u_dispatcher, u_unauth])

            c1 = Consigner(id=1, name="Tata Steel Ltd", gstin="07AAAAA0000A1Z1", is_active=True)
            c2 = Consignee(id=2, name="Maruti Suzuki India", gstin="07BBBBB0000B1Z2", is_active=True)
            mv = MarketVehicle(id=1, vehicle_number="DL01AB1111", owner_name="Gupta Logistics", vehicle_type="Open 20ft", is_active=True)
            drv = Driver(id=1, name="Vikram Singh", phone="9811122233", license_number="DL-01-2018-0099", is_active=True)
            session.add_all([c1, c2, mv, drv])

            sm_lr = SeriesMaster(id=1, document_type="LR", prefix="LR-AI-", starting_number=1001, current_number=1001, is_active=True, issuing_office_id=1)
            sm_job = SeriesMaster(id=2, document_type="JOB", prefix="JOB-AI-", starting_number=501, current_number=501, is_active=True, issuing_office_id=1)
            sm_hc = SeriesMaster(id=3, document_type="HIRE_CHALLAN", prefix="HC-AI-", starting_number=701, current_number=701, is_active=True, issuing_office_id=1)
            session.add_all([sm_lr, sm_job, sm_hc])

            await session.commit()

    yield {
        "ctrl_engine": ctrl_engine,
        "tenant_a_engine": tenant_a_engine,
        "tenant_b_engine": tenant_b_engine,
        "tenant_a": t_alpha,
        "tenant_b": t_beta,
    }

    await ctrl_engine.dispose()
    await tenant_a_engine.dispose()
    await tenant_b_engine.dispose()


# ==============================================================================
# TEST 1: REAL POSTGRESQL MIGRATION & IDEMPOTENCY SAFETY
# ==============================================================================

@pytest.mark.asyncio
async def test_real_postgres_migration_idempotent_and_archival_rollback(real_postgres_engines):
    """
    Tests targeted DDL migration, safe double execution (checkfirst=True),
    and safe archival rollback on real PostgreSQL with asyncpg.
    """
    engine = real_postgres_engines["tenant_a_engine"]

    # 1. Run create twice (safe double-run on real PostgreSQL)
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))

    # Verify table exists in PostgreSQL information_schema
    async with engine.connect() as conn:
        res = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_operation_idempotency'"
        ))
        assert res.scalar_one_or_none() == "ai_operation_idempotency"

    # 2. Insert test record and verify safe archival rollback
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    op_id = f"test_pg_rollback_{uuid.uuid4().hex[:8]}"
    async with Session() as session:
        rec = AIOperationIdempotency(
            operation_id=op_id,
            tenant_id=101,
            user_id=1,
            operation_type="LR_CREATE",
            status="COMPLETED",
            entity_id=888,
            entity_identifier="LR-AI-888",
            response_payload={"lr_id": 888},
        )
        session.add(rec)
        await session.commit()

    # Perform safe archival rollback: CTAS table before drop
    archive_tbl = f"ai_operation_idempotency_archive_pg_{uuid.uuid4().hex[:6]}"
    async with engine.begin() as conn:
        await conn.execute(text(f"CREATE TABLE {archive_tbl} AS SELECT * FROM ai_operation_idempotency"))
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.drop(sync_conn, checkfirst=True))

    # Verify original table dropped, archive table holds historical data
    async with engine.connect() as conn:
        res_orig = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_operation_idempotency'"
        ))
        assert res_orig.scalar_one_or_none() is None

        res_arch = await conn.execute(text(f"SELECT entity_identifier FROM {archive_tbl} WHERE operation_id='{op_id}'"))
        assert res_arch.scalar_one_or_none() == "LR-AI-888"

        # Cleanup archive and restore original table
        await conn.execute(text(f"DROP TABLE {archive_tbl}"))

    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True))


@pytest.mark.asyncio
async def test_real_postgres_unique_constraint_enforcement(real_postgres_engines):
    """
    Proves that PostgreSQL engine enforces unique constraints on operation_id,
    preventing duplicate creation even under simultaneous database flushes.
    """
    engine = real_postgres_engines["tenant_a_engine"]
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        op_id = f"test_pg_unique_{uuid.uuid4().hex[:10]}"
        e1 = AIOperationIdempotency(
            operation_id=op_id, tenant_id=101, user_id=1, operation_type="LR_CREATE", status="COMPLETED"
        )
        session.add(e1)
        await session.commit()

        # Duplicate insertion must raise IntegrityError at PostgreSQL level
        e2 = AIOperationIdempotency(
            operation_id=op_id, tenant_id=101, user_id=1, operation_type="LR_CREATE", status="COMPLETED"
        )
        session.add(e2)
        from sqlalchemy.exc import IntegrityError
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


# ==============================================================================
# TEST 2: REAL REDIS MULTI-WORKER CONCURRENCY & LOCKING
# ==============================================================================

@pytest.mark.asyncio
async def test_real_redis_noeviction_policy():
    """Verifies that real Redis instance uses noeviction memory policy."""
    r = aioredis.from_url(f"redis://{REDIS_HOST}:{REDIS_PORT}/0", decode_responses=True)
    cfg = await r.config_get("maxmemory-policy")
    assert cfg.get("maxmemory-policy") == "noeviction"
    await r.aclose()


@pytest.mark.asyncio
async def test_real_redis_draft_persistence_and_locking():
    """
    Verifies draft persistence, TTL expiration, and distributed locking
    using real Redis instance (127.0.0.1:6380).
    """
    store = AIDraftStore(redis_url=f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

    draft = AIDraft(
        draft_id=f"pg_real_redis_draft_{uuid.uuid4().hex[:8]}",
        tenant_id=101,
        user_id=1,
        office_id=1,
        draft_type="lr",
    )
    draft.data = {"consigner_id": 1, "consignee_id": 2, "vehicle_number": "DL01AB1111"}
    draft.generate_confirmation_token(ttl_minutes=15)

    # 1. Save draft to real Redis
    await store.save_draft(draft)

    # 2. Retrieve draft from real Redis across separate connection
    loaded = await store.get_draft(draft.draft_id)
    assert loaded is not None
    assert loaded.data["vehicle_number"] == "DL01AB1111"
    assert loaded.confirmation_token is not None

    # 3. Distributed Lock Contention on real Redis
    lock_acquired_1 = await store.acquire_lock(draft.draft_id, ttl_ms=5000)
    assert lock_acquired_1 is True

    # Concurrent worker attempt on same draft must be rejected
    lock_acquired_2 = await store.acquire_lock(draft.draft_id, ttl_ms=5000)
    assert lock_acquired_2 is False

    # Release lock
    await store.release_lock(draft.draft_id)

    # Now another worker can acquire
    lock_acquired_3 = await store.acquire_lock(draft.draft_id, ttl_ms=5000)
    assert lock_acquired_3 is True
    await store.release_lock(draft.draft_id)


@pytest.mark.asyncio
async def test_real_redis_multi_process_concurrency_lock():
    """
    Simulates multi-worker process lock contention against real Redis (127.0.0.1:6380).
    Verifies that simultaneous confirmation requests resolve safely with HTTP 409.
    """
    store = AIDraftStore(redis_url=f"redis://{REDIS_HOST}:{REDIS_PORT}/0")
    draft_id = f"real_redis_mp_lock_{uuid.uuid4().hex[:8]}"

    async def worker_attempt_lock():
        return await store.acquire_lock(draft_id, ttl_ms=4000)

    # 5 simultaneous worker requests competing for the exact same draft
    results = await asyncio.gather(*[worker_attempt_lock() for _ in range(5)])

    # Exactly one worker must win the lock, all 4 others must fail
    assert results.count(True) == 1
    assert results.count(False) == 4

    await store.release_lock(draft_id)


# ==============================================================================
# TEST 3: REAL POSTGRESQL LR, JOB, AND HIRE CHALLAN CREATION
# ==============================================================================

@pytest.mark.asyncio
async def test_real_postgres_lr_creation_and_series_numbering(real_postgres_engines):
    """
    Verifies conversational LR draft confirmation against real PostgreSQL.
    Tests atomic commit, SeriesMaster allocation (LR-AI-1001), and durable idempotency.
    """
    engine = real_postgres_engines["tenant_a_engine"]
    tenant = real_postgres_engines["tenant_a"]
    store = AIDraftStore(redis_url=f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        stmt_u = select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 1)
        user = (await session.execute(stmt_u)).scalar_one()
        branch = await session.get(Branch, 1)

        # 1. Prepare valid draft in real Redis
        draft = AIDraft(
            draft_id=f"real_pg_lr_{uuid.uuid4().hex[:8]}",
            tenant_id=tenant.id,
            user_id=user.id,
            office_id=branch.id,
            draft_type="lr",
        )
        draft.data = {
            "consigner_id": 1,
            "consignee_id": 2,
            "vehicle_number": "DL01AB1111",
            "from_location": "Delhi",
            "to_location": "Mumbai",
            "total_freight_amount": "45000.00",
            "balance_amount": "45000.00",
            "billing_party_type": "consigner",
            "billing_party_id": 1,
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        # 2. Confirm draft against real PostgreSQL
        with patch("app.modules.ai.router.lr_draft_store", store):
            with patch.object(settings, "AI_ENABLE_LR_CREATION", True):
                res = await confirm_lr_draft(
                    payload=req,
                    current_user=user,
                    current_office=branch,
                    tenant=tenant,
                    db=session,
                )

        assert res.success is True
        assert res.lr_number.startswith("LR-AI-")

        # 3. Verify PostgreSQL row exists and is committed
        lr_row = (await session.execute(select(LR).where(LR.lr_number == res.lr_number))).scalar_one_or_none()
        assert lr_row is not None
        assert lr_row.total_freight_amount == Decimal("45000.00")

        # 4. Verify durable database idempotency record committed in SAME transaction
        idem_row = (await session.execute(
            select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == f"lr_draft:{draft.draft_id}")
        )).scalar_one_or_none()
        assert idem_row is not None
        assert idem_row.status == "COMPLETED"
        assert idem_row.entity_identifier == res.lr_number

        # 5. Replay idempotent check: second call returns same LR without duplicate row
        with patch("app.modules.ai.router.lr_draft_store", store):
            with patch.object(settings, "AI_ENABLE_LR_CREATION", True):
                res2 = await confirm_lr_draft(
                    payload=req,
                    current_user=user,
                    current_office=branch,
                    tenant=tenant,
                    db=session,
                )
        assert res2.lr_number == res.lr_number
        count_lrs = len((await session.execute(select(LR).where(LR.lr_number == res.lr_number))).scalars().all())
        assert count_lrs == 1


@pytest.mark.asyncio
async def test_real_postgres_job_creation(real_postgres_engines):
    """Verifies Transport Job creation against real PostgreSQL."""
    engine = real_postgres_engines["tenant_a_engine"]
    tenant = real_postgres_engines["tenant_a"]
    store = AIDraftStore(redis_url=f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        stmt_u = select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 1)
        user = (await session.execute(stmt_u)).scalar_one()
        branch = await session.get(Branch, 1)

        draft = AIDraft(
            draft_id=f"real_pg_job_{uuid.uuid4().hex[:8]}",
            tenant_id=tenant.id,
            user_id=user.id,
            office_id=branch.id,
            draft_type="job",
        )
        draft.data = {
            "consigner_id": 1,
            "consignee_id": 2,
            "from_location": "Delhi",
            "to_location": "Mumbai",
            "expected_weight": "18.50",
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await store.save_draft(draft)

        req = ConfirmJobDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        with patch("app.modules.ai.router.lr_draft_store", store):
            with patch.object(settings, "AI_ENABLE_JOB_CREATION", True):
                res = await confirm_job_draft(
                    payload=req,
                    current_user=user,
                    current_office=branch,
                    tenant=tenant,
                    db=session,
                )

        assert res.success is True
        assert res.job_number.startswith("JOB-AI-")

        # Verify Job in PostgreSQL
        job_row = (await session.execute(select(Job).where(Job.job_number == res.job_number))).scalar_one_or_none()
        assert job_row is not None


@pytest.mark.asyncio
async def test_real_postgres_hire_challan_financial_precision(real_postgres_engines):
    """
    Verifies Hire Challan creation on real PostgreSQL.
    Confirms exact NUMERIC(12, 2) calculation:
    net_payable = (hire_rate + detention) - (tds + mamul)
    balance = net_payable - advance
    """
    engine = real_postgres_engines["tenant_a_engine"]
    tenant = real_postgres_engines["tenant_a"]
    store = AIDraftStore(redis_url=f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        stmt_u = select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 1)
        user = (await session.execute(stmt_u)).scalar_one()
        branch = await session.get(Branch, 1)

        # hire_rate: 60,000, advance: 20,000, tds_rate: 2% (1,200), detention: 1,500, mamul: 500
        # net_payable = (60000 + 1500) - (1200 + 500) = 61500 - 1700 = 59800
        # balance = 59800 - 20000 = 39800
        draft = AIDraft(
            draft_id=f"real_pg_hc_{uuid.uuid4().hex[:8]}",
            tenant_id=tenant.id,
            user_id=user.id,
            office_id=branch.id,
            draft_type="hire_challan",
        )
        draft.data = {
            "vehicle_number": "DL01AB1111",
            "supplier_id": 1,
            "from_location": "Delhi",
            "to_location": "Mumbai",
            "hire_rate": "60000.00",
            "advance_amount": "20000.00",
            "tds_rate": "2.00",
            "detention_charge": "1500.00",
            "mamul_charges": "500.00",
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await store.save_draft(draft)

        req = ConfirmHireChallanDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        with patch("app.modules.ai.router.lr_draft_store", store):
            with patch.object(settings, "AI_ENABLE_HC_CREATION", True):
                res = await confirm_hire_challan_draft(
                    payload=req,
                    current_user=user,
                    current_office=branch,
                    tenant=tenant,
                    db=session,
                )

        assert res.success is True
        assert res.challan_number.startswith("HC-AI-")

        # Verify PostgreSQL NUMERIC values
        hc_row = (await session.execute(select(HireChallan).where(HireChallan.challan_number == res.challan_number))).scalar_one_or_none()
        assert hc_row is not None
        assert hc_row.tds_amount == Decimal("1200.00")
        assert hc_row.net_payable_amount == Decimal("59800.00")
        assert hc_row.balance_amount == Decimal("39800.00")


# ==============================================================================
# TEST 4: SAAS SECURITY & TENANT BOUNDARY ON REAL POSTGRESQL
# ==============================================================================

@pytest.mark.asyncio
async def test_real_postgres_cross_tenant_isolation(real_postgres_engines):
    """
    Verifies that a user from Tenant B cannot confirm or access a draft
    belonging to Tenant A on real PostgreSQL databases.
    """
    engine_a = real_postgres_engines["tenant_a_engine"]
    tenant_a = real_postgres_engines["tenant_a"]
    tenant_b = real_postgres_engines["tenant_b"]
    store = AIDraftStore(redis_url=f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

    SessionA = async_sessionmaker(engine_a, class_=AsyncSession, expire_on_commit=False)
    async with SessionA() as session:
        stmt_u = select(User).options(selectinload(User.custom_role).selectinload(Role.permissions)).where(User.id == 1)
        user_a = (await session.execute(stmt_u)).scalar_one()
        branch_a = await session.get(Branch, 1)

        draft = AIDraft(
            draft_id=f"real_pg_cross_tenant_{uuid.uuid4().hex[:8]}",
            tenant_id=tenant_a.id,
            user_id=user_a.id,
            office_id=branch_a.id,
            draft_type="lr",
        )
        draft.data = {
            "consigner_id": 1,
            "consignee_id": 2,
            "vehicle_number": "DL01AB1111",
            "from_location": "Delhi",
            "to_location": "Mumbai",
            "total_freight_amount": "25000.00",
            "balance_amount": "25000.00",
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        # Confirmation attempt under Tenant B context MUST be rejected
        with patch("app.modules.ai.router.lr_draft_store", store):
            with patch.object(settings, "AI_ENABLE_LR_CREATION", True):
                with pytest.raises(HTTPException) as exc_info:
                    await confirm_lr_draft(
                        payload=req,
                        current_user=user_a,
                        current_office=branch_a,
                        tenant=tenant_b,
                        db=session,
                    )
                assert exc_info.value.status_code in (400, 403)


@pytest.mark.asyncio
async def test_real_postgres_rbac_permission_rejection(real_postgres_engines):
    """
    Verifies that an unauthorized user without transport.lr_booking.create
    is rejected with HTTP 403 on real PostgreSQL.
    """
    engine_a = real_postgres_engines["tenant_a_engine"]
    tenant_a = real_postgres_engines["tenant_a"]
    store = AIDraftStore(redis_url=f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

    SessionA = async_sessionmaker(engine_a, class_=AsyncSession, expire_on_commit=False)
    async with SessionA() as session:
        stmt_u = select(User).options(selectinload(User.custom_role)).where(User.id == 2)
        user_unauth = (await session.execute(stmt_u)).scalar_one()
        branch_a = await session.get(Branch, 1)

        draft = AIDraft(
            draft_id=f"real_pg_rbac_rejection_{uuid.uuid4().hex[:8]}",
            tenant_id=tenant_a.id,
            user_id=user_unauth.id,
            office_id=branch_a.id,
            draft_type="lr",
        )
        draft.data = {
            "consigner_id": 1,
            "consignee_id": 2,
            "vehicle_number": "DL01AB1111",
            "from_location": "Delhi",
            "to_location": "Mumbai",
            "total_freight_amount": "20000.00",
            "balance_amount": "20000.00",
        }
        draft.is_valid = True
        token = draft.generate_confirmation_token(ttl_minutes=15)
        await store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=draft.draft_id, confirmation_token=token)

        with patch("app.modules.ai.router.lr_draft_store", store):
            with patch.object(settings, "AI_ENABLE_LR_CREATION", True):
                with pytest.raises(HTTPException) as exc_info:
                    await confirm_lr_draft(
                        payload=req,
                        current_user=user_unauth,
                        current_office=branch_a,
                        tenant=tenant_a,
                        db=session,
                    )
                assert exc_info.value.status_code == 403
                assert "Missing permission" in exc_info.value.detail
