"""
Panther AI Phase 4 Comprehensive Test Suite.
Tests conversational Job & Hire Challan creation, multilingual dialogue,
entity extraction, financial math fidelity, two-stage confirmation,
atomic database idempotency, quota gating, activity logging, and safety gates.
"""
import asyncio
import pytest
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from unittest.mock import patch

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi import HTTPException

from app.tenant_db.models import (
    TenantBase,
    Branch,
    User,
    Role,
    RolePermission,
    Job,
    HireChallan,
    LR,
    Consigner,
    Consignee,
    Location,
    CompanyVehicle,
    MarketVehicle,
    Driver,
    SeriesMaster,
    UserActivity,
    AIOperationIdempotency,
)
from app.control.models import ControlBase, Tenant, Plan, Entitlement
from app.modules.transport.schemas import JobCreate, HireChallanCreate
from app.modules.ai.schemas import (
    ConfirmJobDraftRequest,
    ConfirmHireChallanDraftRequest,
)
from app.modules.ai.draft_store import lr_draft_store, AIDraft
from app.modules.ai.job_draft_service import (
    handle_conversational_job_booking,
    is_job_booking_intent,
    is_instructional_job_inquiry,
    is_job_cancel_intent,
    parse_job_entities_from_text,
)
from app.modules.ai.hire_challan_draft_service import (
    handle_conversational_hc_booking,
    is_hire_challan_intent,
    is_instructional_hc_inquiry,
    is_hc_cancel_intent,
    parse_hc_entities_from_text,
)
from app.modules.ai.router import (
    confirm_job_draft,
    confirm_hire_challan_draft,
)


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_phase4_test_db():
    """Sets up an isolated in-memory SQLite database populated with synthetic TMS masters."""
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
        # 1. Branch Office
        branch_main = Branch(
            id=101,
            name="Delhi Logistics Hub",
            code="DEL-01",
            is_active=True,
            is_head_office=True,
        )
        session.add(branch_main)

        # 2. Roles & Permissions (Job and Hire Challan permissions)
        perm_job = RolePermission(module="transport", feature="jobs", permission="create", is_allowed=True)
        perm_hc = RolePermission(module="transport", feature="hire_challan", permission="create", is_allowed=True)
        role_dispatcher = Role(id=1, name="Senior Dispatcher", permissions=[perm_job, perm_hc])
        session.add(role_dispatcher)

        # 3. Users
        user_auth = User(id=1, email="dispatcher@alpha.com", password_hash="dummy", role="DISPATCHER", full_name="Rajesh Kumar", custom_role=role_dispatcher)
        user_no_perm = User(id=2, email="viewer@alpha.com", password_hash="dummy", role="EMPLOYEE", full_name="Viewer", custom_role=None)
        session.add_all([user_auth, user_no_perm])

        # 4. Consigners & Consignees
        c1 = Consigner(id=1, name="ABC Corp Logistics", code="ABC01", is_active=True, issuing_office_id=101)
        c2 = Consigner(id=2, name="Sharma Transporters Delhi", code="SH01", is_active=True, issuing_office_id=101)
        c3 = Consigner(id=3, name="Sharma Logistics Global", code="SH02", is_active=True, issuing_office_id=101)
        ce1 = Consignee(id=1, name="XYZ Retail Traders", code="XYZ01", is_active=True, issuing_office_id=101)
        session.add_all([c1, c2, c3, ce1])

        # 5. Locations
        loc_delhi = Location(id=1, country="India", state="Delhi", city_name="Delhi", location_code="DEL", is_active=True)
        loc_mumbai = Location(id=2, country="India", state="Maharashtra", city_name="Mumbai", location_code="BOM", is_active=True)
        session.add_all([loc_delhi, loc_mumbai])

        # 6. Vehicles & Drivers
        mv = MarketVehicle(id=1, vehicle_number="DL01AA1111", vehicle_type="Open 20ft", is_active=True)
        drv = Driver(id=1, name="Ramesh Singh", phone="9876543210", is_active=True)
        session.add_all([mv, drv])

        # 7. Series Masters for auto-numbering
        s_job = SeriesMaster(
            id=1,
            document_type="JOB",
            prefix="JOB-DEL-",
            starting_number=1,
            current_number=100,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            is_active=True,
            is_default=True,
            issuing_office_id=101,
        )
        s_hc = SeriesMaster(
            id=2,
            document_type="HIRE_CHALLAN",
            prefix="HC-DEL-",
            starting_number=1,
            current_number=100,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            is_active=True,
            is_default=True,
            issuing_office_id=101,
        )
        session.add_all([s_job, s_hc])

        await session.commit()

    yield session_maker
    await engine.dispose()


# ==============================================================================
# 1. TRANSPORT JOB TESTS
# ==============================================================================

def test_job_intent_classification():
    """Verifies intent separation between job creation and instructional questions."""
    assert is_job_booking_intent("Create a transport job") is True
    assert is_job_booking_intent("Book a job order for consigner ABC") is True
    assert is_job_booking_intent("Mujhe ek job banana hai") is True
    assert is_job_booking_intent("Ek transport job create karo") is True

    assert is_instructional_job_inquiry("What is a transport job?") is True
    assert is_instructional_job_inquiry("Job order kya hota hai?") is True
    assert is_instructional_job_inquiry("How do I create a job in TMS?") is True

    assert is_job_cancel_intent("Cancel job draft") is True
    assert is_job_cancel_intent("Discard job") is True


@pytest.mark.asyncio
async def test_job_conversational_multiturn_english(setup_phase4_test_db):
    """Tests multi-turn conversational drafting of a Transport Job order in English."""
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")

        # Turn 1: Initiate
        msg1, cards1 = await handle_conversational_job_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text="Create a transport job", lang="en"
        )
        assert cards1[0].card_type == "job_draft"
        assert cards1[0].badge["text"] == "Draft: Incomplete"
        assert cards1[0].can_confirm is False
        assert "Consigner" in cards1[0].missing_fields
        assert "Consignee" in cards1[0].missing_fields

        # Turn 2: Provide details
        turn2 = "Consigner is ABC Corp, consignee is XYZ Retail, from Delhi to Mumbai, cargo steel coils, weight 25 MT, 50 pkgs"
        msg2, cards2 = await handle_conversational_job_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text=turn2, lang="en"
        )
        card2 = cards2[0]
        assert card2.badge["text"] == "Ready to Confirm"
        assert card2.can_confirm is True
        assert card2.confirmation_token is not None
        assert card2.confirmation_token.startswith("tok_")
        assert len(card2.missing_fields) == 0

        metric_map = {m["label"]: m["value"] for m in card2.metrics}
        assert "ABC Corp Logistics" in metric_map["Consigner"]
        assert "XYZ Retail Traders" in metric_map["Consignee"]
        assert "Delhi ➔ Mumbai" in metric_map["Route"]


@pytest.mark.asyncio
async def test_job_conversational_hinglish(setup_phase4_test_db):
    """Tests Hinglish conversational job drafting."""
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")

        msg, cards = await handle_conversational_job_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text="Mujhe ek job banana hai", lang="hinglish"
        )
        assert "Transport Job draft bana raha hoon" in msg
        assert cards[0].badge["text"] == "Draft: Incomplete"


@pytest.mark.asyncio
async def test_job_party_disambiguation(setup_phase4_test_db):
    """Verifies that ambiguous party query (multiple matches) flags ambiguity."""
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")

        # "Sharma" matches both Sharma Transporters and Sharma Logistics
        _, cards = await handle_conversational_job_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text="Job for consigner Sharma", lang="en"
        )
        assert cards[0].can_confirm is False
        assert "Consigner" in cards[0].missing_fields


@pytest.mark.asyncio
async def test_job_two_stage_confirmation_and_atomic_db_record(setup_phase4_test_db):
    """
    Tests complete two-stage confirmation execution for Transport Job:
    1. Prepares valid job draft.
    2. Confirms via confirm_job_draft.
    3. Verifies Job created in database with sequential numbering.
    4. Verifies AIOperationIdempotency committed in same transaction.
    5. Verifies UserActivity logged.
    6. Verifies double-submit idempotency returns existing Job.
    """
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Alpha Logistics", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")

        _, cards = await handle_conversational_job_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Create job: Consigner is ABC Corp, consignee is XYZ Retail, from Delhi to Mumbai, cargo heavy machinery, weight 18 MT",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # Confirm
        req = ConfirmJobDraftRequest(draft_id=d_id, confirmation_token=token)
        res = await confirm_job_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert res.success is True
        assert res.job_number.startswith("JOB-DEL-")
        assert res.card.card_type == "job_created"

        # Verify DB Job record
        job_in_db = await db.get(Job, res.job_id)
        assert job_in_db is not None
        assert job_in_db.job_number == res.job_number
        assert job_in_db.status == "OPEN"
        assert job_in_db.issuing_office_id == 101

        # Verify AIOperationIdempotency in DB
        from sqlalchemy import select
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == f"job_draft:{d_id}")
        idem = (await db.execute(stmt_idem)).scalar_one_or_none()
        assert idem is not None
        assert idem.status == "COMPLETED"
        assert idem.operation_type == "JOB_CREATE"
        assert idem.entity_id == res.job_id

        # Verify UserActivity
        stmt_act = select(UserActivity).where(UserActivity.entity_id == str(res.job_id), UserActivity.action == "JOB_CREATED")
        act = (await db.execute(stmt_act)).scalar_one_or_none()
        assert act is not None

        # Verify Idempotency on repeated submission
        res2 = await confirm_job_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert res2.success is True
        assert res2.job_id == res.job_id


@pytest.mark.asyncio
async def test_job_tampering_invalidates_token(setup_phase4_test_db):
    """Verifies that altering cargo description after approval invalidates token with 400 Bad Request."""
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")

        _, cards = await handle_conversational_job_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Create job: Consigner is ABC Corp, consignee is XYZ Retail, cargo chemicals",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # Alter cargo
        draft = await lr_draft_store.get_draft(d_id)
        draft.data["cargo_description"] = "Explosives and hazardous chemicals"
        draft.version += 1
        await lr_draft_store.save_draft(draft)

        req = ConfirmJobDraftRequest(draft_id=d_id, confirmation_token=token)
        with pytest.raises(HTTPException) as exc_info:
            await confirm_job_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert exc_info.value.status_code == 400
        assert "modified since approval" in exc_info.value.detail


# ==============================================================================
# 2. HIRE CHALLAN TESTS
# ==============================================================================

def test_hc_intent_classification():
    """Verifies intent separation for Hire Challans."""
    assert is_hire_challan_intent("Create a hire challan for vehicle DL01AA1111") is True
    assert is_hire_challan_intent("Is vehicle ke liye hire challan banao") is True
    assert is_hire_challan_intent("Issue a truck hiring challan") is True
    assert is_hire_challan_intent("Mujhe ek hire challan banana hai") is True

    assert is_instructional_hc_inquiry("What is a hire challan?") is True
    assert is_instructional_hc_inquiry("Hire challan kya hota hai?") is True
    assert is_instructional_hc_inquiry("How to settle hire challan?") is True

    assert is_hc_cancel_intent("Cancel challan draft") is True
    assert is_hc_cancel_intent("Discard hire challan") is True


@pytest.mark.asyncio
async def test_hc_conversational_multiturn_and_math(setup_phase4_test_db):
    """
    Tests complete conversational drafting of Hire Challan and checks exact financial math:
    hire_rate = 40000, 2% TDS = 800, net_payable = 39200, advance = 10000, balance = 29200.
    """
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="hire_challan")

        # Turn 1: Initiate with partial
        msg1, cards1 = await handle_conversational_hc_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text="Hire challan for vehicle DL01AA1111", lang="en"
        )
        assert cards1[0].card_type == "hire_challan_draft"
        assert cards1[0].badge["text"] == "Draft: Incomplete"
        assert cards1[0].can_confirm is False
        assert "Hire Rate" in cards1[0].missing_fields

        # Turn 2: Complete details
        turn2 = "From Delhi to Mumbai, hire rate 40000, advance 10000, 2% TDS, driver Ramesh 9876543210"
        msg2, cards2 = await handle_conversational_hc_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text=turn2, lang="en"
        )
        card2 = cards2[0]
        assert card2.badge["text"] == "Ready to Confirm"
        assert card2.can_confirm is True
        assert card2.confirmation_token is not None

        metric_map = {m["label"]: m["value"] for m in card2.metrics}
        assert "DL01AA1111" in metric_map["Vehicle Number"]
        assert "₹40,000.00" in metric_map["Hire Rate"]
        assert "₹10,000.00" in metric_map["Advance Amount"]
        assert "₹39,200.00" in metric_map["Net Payable"]
        assert "₹29,200.00" in metric_map["Balance Due"]


@pytest.mark.asyncio
async def test_hc_two_stage_confirmation_and_atomic_db_record(setup_phase4_test_db):
    """
    Tests complete two-stage confirmation execution for Hire Challan:
    1. Prepares valid challan draft.
    2. Confirms via confirm_hire_challan_draft.
    3. Verifies HireChallan created in DB with status ISSUED and exact financials.
    4. Verifies AIOperationIdempotency committed in same transaction.
    5. Verifies UserActivity logged.
    6. Verifies double-submit idempotency returns existing Challan.
    """
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Alpha Logistics", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="hire_challan")

        _, cards = await handle_conversational_hc_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Issue hire challan: vehicle DL01AA1111, from Delhi to Mumbai, hire rate 45000, advance 15000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # Confirm
        req = ConfirmHireChallanDraftRequest(draft_id=d_id, confirmation_token=token)
        res = await confirm_hire_challan_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert res.success is True
        assert res.challan_number.startswith("HC-DEL-")
        assert res.card.card_type == "hire_challan_created"

        # Verify DB HireChallan record
        hc_in_db = await db.get(HireChallan, res.challan_id)
        assert hc_in_db is not None
        assert hc_in_db.challan_number == res.challan_number
        assert hc_in_db.status == "ISSUED"
        assert hc_in_db.vehicle_number == "DL01AA1111"
        assert float(hc_in_db.hire_rate) == 45000.0
        assert float(hc_in_db.advance_amount) == 15000.0
        assert float(hc_in_db.balance_amount) == 30000.0
        assert hc_in_db.issuing_office_id == 101

        # Verify AIOperationIdempotency in DB
        from sqlalchemy import select
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == f"hc_draft:{d_id}")
        idem = (await db.execute(stmt_idem)).scalar_one_or_none()
        assert idem is not None
        assert idem.status == "COMPLETED"
        assert idem.operation_type == "HIRE_CHALLAN_CREATE"
        assert idem.entity_id == res.challan_id

        # Verify UserActivity
        stmt_act = select(UserActivity).where(UserActivity.entity_id == str(res.challan_id), UserActivity.action == "HIRE_CHALLAN_CREATED")
        act = (await db.execute(stmt_act)).scalar_one_or_none()
        assert act is not None

        # Verify Idempotency on repeated submission
        res2 = await confirm_hire_challan_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert res2.success is True
        assert res2.challan_id == res.challan_id


@pytest.mark.asyncio
async def test_hc_quota_enforcement_blocks_creation(setup_phase4_test_db):
    """Verifies that if tenant's max_hire_challans_per_month is 0, creation is blocked."""
    session_maker = setup_phase4_test_db
    ent_trans = Entitlement(feature_key="module_transport", limit_value="true", is_enabled=True)
    ent_quota = Entitlement(feature_key="max_hire_challans_per_month", limit_value="0", is_enabled=True)
    plan_limited = Plan(id=2, code="LIMITED", entitlements=[ent_trans, ent_quota])
    tenant_limited = Tenant(id=5, status="ACTIVE", plan=plan_limited)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant_limited.id, user.id, draft_type="hire_challan")

        _, cards = await handle_conversational_hc_booking(
            db=db,
            user=user,
            tenant=tenant_limited,
            current_office=branch,
            user_text="Issue hire challan: vehicle DL01AA1111, from Delhi to Mumbai, hire rate 45000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        req = ConfirmHireChallanDraftRequest(draft_id=d_id, confirmation_token=token)
        from app.core.errors import QuotaExceededException
        with pytest.raises(QuotaExceededException):
            await confirm_hire_challan_draft(payload=req, current_user=user, current_office=branch, tenant=tenant_limited, db=db)


@pytest.mark.asyncio
async def test_hc_production_safety_gate_disabled_by_default(setup_phase4_test_db):
    """Verifies that when AI_ENABLE_HC_CREATION=False in production, confirmation is rejected with 403."""
    session_maker = setup_phase4_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        req = ConfirmHireChallanDraftRequest(draft_id="d_test", confirmation_token="tok_test")

        from app.core.config import settings
        with patch.object(settings, "ENVIRONMENT", "production"), \
             patch.object(settings, "AI_ENABLE_HC_CREATION", False):
            with pytest.raises(HTTPException) as exc_info:
                await confirm_hire_challan_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
            assert exc_info.value.status_code == 403
            assert "disabled in production" in exc_info.value.detail


@pytest.mark.asyncio
async def test_manual_job_and_hc_creation_services_unaffected(setup_phase4_test_db):
    """Verifies that existing service.create_job() and service.create_hire_challan() continue to function normally."""
    from app.modules.transport.service import create_job, create_hire_challan

    session_maker = setup_phase4_test_db
    async with session_maker() as db:
        # 1. Manual Job
        job_data = JobCreate(consigner_id=1, consignee_id=1, cargo_description="Manual Test Job")
        j = await create_job(db=db, data=job_data, user_id=1, office_id=101)
        assert j is not None
        assert j.job_number.startswith("JOB-DEL-")
        assert j.status == "OPEN"

        # 2. Manual Hire Challan
        hc_data = HireChallanCreate(vehicle_number="DL01AA1111", hire_rate=Decimal("35000.00"), from_location="Delhi", to_location="Mumbai")
        hc = await create_hire_challan(db=db, data=hc_data, office_id=101)
        assert hc is not None
        assert hc.challan_number.startswith("HC-DEL-")
        assert hc.status == "ISSUED"
