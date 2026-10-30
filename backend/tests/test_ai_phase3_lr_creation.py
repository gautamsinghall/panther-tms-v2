"""
Panther AI Phase 3 Comprehensive Test Suite.
Tests conversational LR creation, entity extraction, multi-turn dialogue,
party disambiguation, draft validation, single-use token lifecycle,
two-stage confirmation, quota gating, activity logging, and rollback safety.
"""
import asyncio
import pytest
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from unittest.mock import patch, MagicMock

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi import HTTPException

from app.tenant_db.models import (
    TenantBase,
    Branch,
    User,
    Role,
    RolePermission,
    LR,
    Consigner,
    Consignee,
    Location,
    CompanyVehicle,
    MarketVehicle,
    Driver,
    SeriesMaster,
    UserActivity,
    PrimaryGroup,
    GroupInPrimary,
)
from app.control.models import ControlBase, Tenant, Plan, Entitlement
from app.modules.transport.schemas import LRCreate
from app.modules.ai.schemas import ConfirmLRDraftRequest
from app.modules.ai.draft_store import lr_draft_store, LRDraft
from app.modules.ai.lr_draft_service import (
    handle_conversational_lr_booking,
    is_lr_booking_intent,
    is_instructional_inquiry,
    is_cancel_intent,
    parse_lr_entities_from_text,
)
from app.modules.ai.router import confirm_lr_draft


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_phase3_test_db():
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
        # 1. Branch Office
        branch_main = Branch(
            id=101,
            name="Delhi Logistics Hub",
            code="DEL-01",
            is_active=True,
            is_head_office=True,
        )
        session.add(branch_main)

        # 2. Roles & Permissions
        perm_create = RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True)
        perm_view = RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True)
        role_dispatcher = Role(id=1, name="Senior Dispatcher", permissions=[perm_create, perm_view])
        session.add(role_dispatcher)

        # 3. Users
        user_authorized = User(id=1, email="dispatcher@alpha.com", password_hash="dummy", role="DISPATCHER", full_name="Rajesh Kumar", custom_role=role_dispatcher)
        user_no_create = User(id=2, email="viewer@alpha.com", password_hash="dummy", role="EMPLOYEE", full_name="Viewer Only", custom_role=None)
        session.add_all([user_authorized, user_no_create])

        # 4. Consigners
        c1 = Consigner(id=1, name="ABC Corp Logistics", code="ABC01", is_active=True, issuing_office_id=101)
        c2 = Consigner(id=2, name="Sharma Transporters Delhi", code="SH01", is_active=True, issuing_office_id=101)
        c3 = Consigner(id=3, name="Sharma Logistics Global", code="SH02", is_active=True, issuing_office_id=101)
        session.add_all([c1, c2, c3])

        # 5. Consignees
        ce1 = Consignee(id=1, name="XYZ Retail Traders", code="XYZ01", is_active=True, issuing_office_id=101)
        ce2 = Consignee(id=2, name="Patel Freight Depot", code="PAT01", is_active=True, issuing_office_id=101)
        session.add_all([ce1, ce2])

        # 6. Locations
        loc_delhi = Location(id=1, country="India", state="Delhi", city_name="Delhi", location_code="DEL", is_active=True)
        loc_mumbai = Location(id=2, country="India", state="Maharashtra", city_name="Mumbai", location_code="BOM", is_active=True)
        session.add_all([loc_delhi, loc_mumbai])

        # 7. Vehicles
        cv = CompanyVehicle(id=1, vehicle_number="DL01AA1111", vehicle_type="Container 32ft", is_active=True)
        mv = MarketVehicle(id=1, vehicle_number="MH12BB2222", vehicle_type="Open 20ft", is_active=True)
        session.add_all([cv, mv])

        # 8. Series Master for LR auto-numbering
        series_lr = SeriesMaster(
            id=1,
            document_type="LR",
            prefix="LR-DEL-",
            starting_number=1,
            current_number=100,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            is_active=True,
            is_default=True,
            issuing_office_id=101,
        )
        session.add(series_lr)

        await session.commit()

    yield session_maker

    await engine.dispose()


# ==============================================================================
# 1. INTENT CLASSIFICATION & INSTRUCTIONAL DISCRIMINATION
# ==============================================================================

def test_intent_classification_instructional_vs_booking():
    """Verifies that 'how to' questions do not trigger booking, while booking requests do."""
    # Conceptual inquiries -> must be instructional
    assert is_instructional_inquiry("How do I create an LR?") is True
    assert is_instructional_inquiry("Explain the LR booking process") is True
    assert is_instructional_inquiry("LR kaise banate hain?") is True
    assert is_instructional_inquiry("Steps to create an LR") is True
    assert is_lr_booking_intent("How do I book an LR?") is False

    # Actionable booking requests -> must trigger booking
    assert is_lr_booking_intent("Mujhe ek LR book karni hai.") is True
    assert is_lr_booking_intent("Book an LR for me.") is True
    assert is_lr_booking_intent("LR banani hai") is True
    assert is_lr_booking_intent("Start LR draft for vehicle DL01AA1111") is True
    assert is_instructional_inquiry("Mujhe ek LR book karni hai.") is False

    # Cancellation triggers
    assert is_cancel_intent("Cancel draft") is True
    assert is_cancel_intent("Discard draft") is True
    assert is_cancel_intent("Clear draft") is True


# ==============================================================================
# 2. CONVERSATIONAL MULTI-TURN LR DRAFT CREATION (ENGLISH, HINGLISH, HINDI)
# ==============================================================================

@pytest.mark.asyncio
async def test_conversational_lr_creation_multiturn_english(setup_phase3_test_db):
    """
    Tests complete multi-turn conversational LR drafting in English:
    Turn 1: User says 'Book an LR for me' -> AI starts draft and reports missing fields.
    Turn 2: User provides consigner, consignee, route, and vehicle -> AI validates and enables confirmation token.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha Logistics", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)

        # Clear active draft before start
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        # Turn 1: Initiation
        msg1, cards1 = await handle_conversational_lr_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text="Book an LR for me.", lang="en"
        )
        assert len(cards1) == 1
        card1 = cards1[0]
        assert card1.badge["text"] == "Draft: Incomplete"
        assert card1.can_confirm is False
        assert card1.confirmation_token is None
        assert "Consigner" in card1.missing_fields
        assert "Vehicle Number" in card1.missing_fields

        # Turn 2: Provide details
        user_turn2 = "Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight is 45000"
        msg2, cards2 = await handle_conversational_lr_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text=user_turn2, lang="en"
        )
        assert len(cards2) == 1
        card2 = cards2[0]
        assert card2.badge["text"] == "Ready to Confirm"
        assert card2.can_confirm is True
        assert card2.confirmation_token is not None
        assert card2.confirmation_token.startswith("tok_")
        assert len(card2.missing_fields) == 0

        # Verify preview metrics
        metric_labels = {m["label"]: m["value"] for m in card2.metrics}
        assert "ABC Corp Logistics" in metric_labels["Consigner"]
        assert "XYZ Retail Traders" in metric_labels["Consignee"]
        assert "DL01AA1111" in metric_labels["Vehicle"]
        assert "₹45,000.00" in metric_labels["Freight Amount"]


@pytest.mark.asyncio
async def test_conversational_lr_creation_hinglish(setup_phase3_test_db):
    """
    Tests Hinglish conversational booking:
    'Mujhe ek LR book karni hai.'
    AI responds in Hinglish and requests loading/delivery locations.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha Logistics", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        msg, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Mujhe ek LR book karni hai.",
            lang="hinglish",
        )
        assert "Main aapki LR create karne mein help karunga" in msg
        assert cards[0].badge["text"] == "Draft: Incomplete"
        assert cards[0].can_confirm is False


# ==============================================================================
# 3. VALIDATION, DISAMBIGUATION, AND INVALID INPUTS
# ==============================================================================

@pytest.mark.asyncio
async def test_invalid_vehicle_number_handling(setup_phase3_test_db):
    """Verifies that non-standard or malformed vehicle numbers are flagged."""
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        msg, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Create LR with vehicle 123",
            lang="en",
        )
        assert "Invalid vehicle number" in msg
        assert cards[0].can_confirm is False


@pytest.mark.asyncio
async def test_party_disambiguation_when_multiple_matches(setup_phase3_test_db):
    """
    Verifies that when multiple consigners match (e.g. 'Sharma Transporters' and 'Sharma Logistics'),
    the assistant does not guess, and instead asks the user to clarify.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        msg, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Consigner is Sharma and vehicle is DL01AA1111",
            lang="en",
        )
        assert "Multiple consigners match 'Sharma'" in msg
        assert "Sharma Transporters Delhi" in msg
        assert "Sharma Logistics Global" in msg
        # Consigner cannot be confirmed while ambiguous
        assert "Consigner" in cards[0].missing_fields
        assert cards[0].can_confirm is False


@pytest.mark.asyncio
async def test_draft_cancellation(setup_phase3_test_db):
    """Verifies that user can cancel/discard an active draft."""
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)

        # Start draft
        await handle_conversational_lr_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text="Book LR", lang="en"
        )
        active_id = await lr_draft_store.backend.get_active_draft_id(tenant.id, user.id)
        assert active_id is not None

        # Cancel draft
        msg, cards = await handle_conversational_lr_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text="Cancel draft", lang="en"
        )
        assert cards[0].badge["text"] == "Cancelled"
        assert await lr_draft_store.backend.get_active_draft_id(tenant.id, user.id) is None


# ==============================================================================
# 4. TWO-STAGE CONFIRMATION, REPLAY, AND EXPIRATION PROTECTION
# ==============================================================================

@pytest.mark.asyncio
async def test_two_stage_confirmation_and_real_lr_creation(setup_phase3_test_db):
    """
    Tests the complete two-stage confirmation execution:
    1. Prepares a complete, valid draft.
    2. Submits draft_id and confirmation_token to /ai/lr-draft/confirm.
    3. Verifies that the authoritative create_lr() service is executed.
    4. Verifies SeriesMaster allocates voucher sequence (e.g. LR-DEL-0101).
    5. Verifies UserActivity is logged.
    6. Verifies token cannot be replayed.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Alpha Logistics", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        # 1. Prepare valid draft
        user_input = "Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 50000"
        _, cards = await handle_conversational_lr_booking(
            db=db, user=user, tenant=tenant, current_office=branch, user_text=user_input, lang="en"
        )
        draft_card = cards[0]
        assert draft_card.can_confirm is True
        token = draft_card.confirmation_token
        d_id = draft_card.draft_id

        # 2. Confirm & Create LR
        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        res = await confirm_lr_draft(
            payload=req,
            current_user=user,
            current_office=branch,
            tenant=tenant,
            db=db,
        )

        assert res.success is True
        assert res.lr_number.startswith("LR-DEL-")
        assert res.card.card_type == "lr_created"
        assert res.card.badge["text"] == "Created"

        # 3. Verify actual record created in database
        lr_in_db = await db.get(LR, res.lr_id)
        assert lr_in_db is not None
        assert lr_in_db.lr_number == res.lr_number
        assert lr_in_db.vehicle_number == "DL01AA1111"
        assert float(lr_in_db.total_freight_amount) == 50000.0
        assert lr_in_db.issuing_office_id == 101

        # 4. Verify UserActivity log
        from sqlalchemy import select
        stmt_log = select(UserActivity).where(UserActivity.entity_id == str(res.lr_id))
        log_entry = (await db.execute(stmt_log)).scalar_one_or_none()
        assert log_entry is not None
        assert log_entry.action == "LR_CREATED"
        assert log_entry.details_json.get("created_via") == "Panther AI Conversational Assistant"

        # 5. Layer 1 Idempotency: Immediate retry returns existing LR from cache without duplicate
        res_retry = await confirm_lr_draft(
            payload=req,
            current_user=user,
            current_office=branch,
            tenant=tenant,
            db=db,
        )
        assert res_retry.success is True
        assert res_retry.lr_id == res.lr_id
        assert res_retry.lr_number == res.lr_number

        stmt_all_lrs = select(LR).where(LR.vehicle_number == "DL01AA1111")
        all_lrs = (await db.execute(stmt_all_lrs)).scalars().all()
        assert len(all_lrs) == 1

        # 6. Layer 2 Durable DB Idempotency: Even if cache is purged, DB audit trail returns existing LR
        if hasattr(lr_draft_store.backend, "_confirmed"):
            lr_draft_store.backend._confirmed.pop(d_id, None)
        res_durable = await confirm_lr_draft(
            payload=req,
            current_user=user,
            current_office=branch,
            tenant=tenant,
            db=db,
        )
        assert res_durable.success is True
        assert res_durable.lr_id == res.lr_id

        all_lrs_after = (await db.execute(stmt_all_lrs)).scalars().all()
        assert len(all_lrs_after) == 1

        # 7. Concurrency Lock: Worker lock conflict returns 409 Conflict
        await lr_draft_store.acquire_lock("d_test_lock")
        draft_test_lock = LRDraft(draft_id="d_test_lock", tenant_id=tenant.id, user_id=user.id)
        await lr_draft_store.save_draft(draft_test_lock)
        with pytest.raises(HTTPException) as exc_lock:
            await confirm_lr_draft(
                payload=ConfirmLRDraftRequest(draft_id="d_test_lock", confirmation_token="tok_dummy"),
                current_user=user,
                current_office=branch,
                tenant=tenant,
                db=db,
            )
        assert exc_lock.value.status_code == 409
        assert "in progress" in exc_lock.value.detail
        await lr_draft_store.release_lock("d_test_lock")


@pytest.mark.asyncio
async def test_token_expiration_fails_safely():
    """Verifies that expired confirmation tokens fail with 400 Bad Request."""
    draft = LRDraft(draft_id="d_expired", tenant_id=1, user_id=1)
    draft.data = {"consigner_id": 1, "consignee_id": 1, "vehicle_number": "DL01AA1111"}
    draft.is_valid = True
    token = draft.generate_confirmation_token(ttl_minutes=10)

    # Artificially expire token
    draft.token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)

    ok, reason = draft.consume_confirmation_token(token, tenant_id=1, user_id=1)
    assert ok is False
    assert reason == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_cross_tenant_isolation_on_draft_confirmation():
    """Verifies that a confirmation token from Tenant A cannot be used by Tenant B."""
    draft = LRDraft(draft_id="d_tenant_a", tenant_id=1, user_id=1)
    draft.data = {"consigner_id": 1, "consignee_id": 1, "vehicle_number": "DL01AA1111"}
    draft.is_valid = True
    token = draft.generate_confirmation_token()

    # User from Tenant B attempts to consume Tenant A's token
    ok, reason = draft.consume_confirmation_token(token, tenant_id=2, user_id=2)
    assert ok is False
    assert reason == "UNAUTHORIZED_TENANT_OR_USER"


@pytest.mark.asyncio
async def test_quota_enforcement_blocks_lr_creation(setup_phase3_test_db):
    """
    Verifies that if tenant's monthly LR quota is exceeded,
    confirmation is rejected with QuotaExceededException.
    """
    session_maker = setup_phase3_test_db

    # Quota of 0 monthly LRs on entitled transport plan
    ent_trans = Entitlement(feature_key="module_transport", limit_value="true", is_enabled=True)
    ent_quota = Entitlement(feature_key="max_lrs_per_month", limit_value="0", is_enabled=True)
    plan_limited = Plan(id=2, code="TRIAL", name="Trial Plan", entitlements=[ent_trans, ent_quota])
    tenant_limited = Tenant(id=5, status="ACTIVE", plan=plan_limited)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant_limited.id, user.id)

        # Prepare draft
        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant_limited,
            current_office=branch,
            user_text="Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 10000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)

        from app.core.errors import QuotaExceededException
        with pytest.raises(QuotaExceededException):
            await confirm_lr_draft(
                payload=req,
                current_user=user,
                current_office=branch,
                tenant=tenant_limited,
                db=db,
            )


@pytest.mark.asyncio
async def test_manual_lr_creation_service_unaffected(setup_phase3_test_db):
    """Verifies that the existing service.create_lr() continues to work normally."""
    from app.modules.transport.service import create_lr

    session_maker = setup_phase3_test_db
    async with session_maker() as db:
        payload = LRCreate(
            consigner_id=1,
            consignee_id=1,
            vehicle_number="MH12BB2222",
            total_freight_amount=Decimal("35000.00"),
            issuing_office_id=101,
        )
        lr = await create_lr(db=db, data=payload, user_id=1, office_id=101)
        assert lr is not None
        assert lr.lr_number.startswith("LR-DEL-")
        assert lr.vehicle_number == "MH12BB2222"


# ==============================================================================
# 5. PRODUCTION HARDENING: CONCURRENCY, TAMPERING, & SAFETY GATES
# ==============================================================================

@pytest.mark.asyncio
async def test_draft_modification_invalidates_confirmation_token(setup_phase3_test_db):
    """
    Verifies that if any field in the draft is modified after the confirmation
    token was issued (content hash mismatch), confirmation fails immediately with 400.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        # 1. Create initial valid draft
        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 50000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # 2. Tamper/modify draft data without generating a new token
        draft = await lr_draft_store.get_draft(d_id)
        draft.data["total_freight_amount"] = Decimal("99999.00")
        draft.version += 1
        await lr_draft_store.save_draft(draft)

        # 3. Attempt confirmation with old token -> Must be rejected
        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        with pytest.raises(HTTPException) as exc_info:
            await confirm_lr_draft(
                payload=req,
                current_user=user,
                current_office=branch,
                tenant=tenant,
                db=db,
            )
        assert exc_info.value.status_code == 400
        assert "modified since approval" in exc_info.value.detail


@pytest.mark.asyncio
async def test_concurrent_confirmation_distributed_lock(setup_phase3_test_db):
    """
    Simulates concurrent requests from multiple Dokploy workers or rapid double-clicks.
    Guarantees exactly one database record is created.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 42000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)

        # Simulate concurrent submission from two workers
        res1, res2 = await asyncio.gather(
            confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db),
            confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db),
            return_exceptions=True,
        )

        # Both returned successfully with the same LR ID, or one returned LR and one got 409
        results = [res1, res2]
        successes = [r for r in results if not isinstance(r, Exception)]
        conflicts = [r for r in results if isinstance(r, HTTPException) and r.status_code == 409]

        assert len(successes) >= 1
        lr_id = successes[0].lr_id
        if len(successes) == 2:
            assert successes[0].lr_id == successes[1].lr_id

        # Verify exactly one LR was created in the database
        from sqlalchemy import select
        stmt = select(LR).where(LR.vehicle_number == "DL01AA1111", LR.total_freight_amount == Decimal("42000.00"))
        lrs = (await db.execute(stmt)).scalars().all()
        assert len(lrs) == 1


@pytest.mark.asyncio
async def test_production_safety_gate_disabled_by_default(setup_phase3_test_db):
    """
    Verifies that when AI_ENABLE_LR_CREATION=False in production,
    calls to confirm_lr_draft are strictly blocked with 403 Forbidden.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)

        req = ConfirmLRDraftRequest(draft_id="d_test", confirmation_token="tok_test")

        from app.core.config import settings
        with patch.object(settings, "ENVIRONMENT", "production"), \
             patch.object(settings, "AI_ENABLE_LR_CREATION", False):
            with pytest.raises(HTTPException) as exc_info:
                await confirm_lr_draft(
                    payload=req,
                    current_user=user,
                    current_office=branch,
                    tenant=tenant,
                    db=db,
                )
            assert exc_info.value.status_code == 403
            assert "disabled in production" in exc_info.value.detail


@pytest.mark.asyncio
async def test_multi_worker_shared_store_retrieval():
    """
    Simulates Worker 1 writing a draft and Worker 2 reading the same draft
    from the shared backend across instance boundaries.
    """
    draft = LRDraft(draft_id="d_shared_worker_test", tenant_id=1, user_id=1, office_id=101)
    draft.data = {
        "consigner_id": 1,
        "consignee_id": 2,
        "vehicle_number": "DL01AA1111",
        "total_freight_amount": 55000.0,
    }
    draft.is_valid = True
    token = draft.generate_confirmation_token()

    # Worker 1 writes
    await lr_draft_store.save_draft(draft)

    # Worker 2 reads
    loaded = await lr_draft_store.get_draft("d_shared_worker_test")
    assert loaded is not None
    assert loaded.draft_id == "d_shared_worker_test"
    assert loaded.confirmation_token == token
    assert loaded.verify_content_integrity() is True
    assert loaded.data["total_freight_amount"] == 55000.0

@pytest.mark.asyncio
async def test_draft_modification_to_remarks_invalidates_token(setup_phase3_test_db):
    """Verifies that altering remarks after approval invalidates token with 400 Bad Request."""
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 50000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # Alter remarks
        draft = await lr_draft_store.get_draft(d_id)
        draft.data["remarks"] = "Fragile glass items - handle with care"
        draft.version += 1
        await lr_draft_store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        with pytest.raises(HTTPException) as exc_info:
            await confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert exc_info.value.status_code == 400
        assert "modified since approval" in exc_info.value.detail


@pytest.mark.asyncio
async def test_draft_modification_to_payment_terms_invalidates_token(setup_phase3_test_db):
    """Verifies that changing payment terms from TO_PAY to PAID invalidates token."""
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 50000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # Alter payment terms
        draft = await lr_draft_store.get_draft(d_id)
        draft.data["payment_terms"] = "PAID"
        draft.version += 1
        await lr_draft_store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        with pytest.raises(HTTPException) as exc_info:
            await confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert exc_info.value.status_code == 400
        assert "modified since approval" in exc_info.value.detail


@pytest.mark.asyncio
async def test_draft_modification_to_invoice_items_invalidates_token(setup_phase3_test_db):
    """Verifies that modifying nested invoice items invalidates the confirmation token."""
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 50000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # Alter nested invoice items
        draft = await lr_draft_store.get_draft(d_id)
        draft.data["invoice_items"] = [{"invoice_no": "INV-999", "invoice_value": Decimal("150000.00")}]
        draft.version += 1
        await lr_draft_store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        with pytest.raises(HTTPException) as exc_info:
            await confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert exc_info.value.status_code == 400
        assert "modified since approval" in exc_info.value.detail


@pytest.mark.asyncio
async def test_draft_modification_to_package_count_invalidates_token(setup_phase3_test_db):
    """Verifies that altering package count after approval invalidates token."""
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 50000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        # Alter package count
        draft = await lr_draft_store.get_draft(d_id)
        draft.data["package_count"] = 250
        draft.version += 1
        await lr_draft_store.save_draft(draft)

        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        with pytest.raises(HTTPException) as exc_info:
            await confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert exc_info.value.status_code == 400
        assert "modified since approval" in exc_info.value.detail


@pytest.mark.asyncio
async def test_atomic_database_idempotency_record_created(setup_phase3_test_db):
    """
    Verifies that confirm_lr_draft commits AIOperationIdempotency table record
    with status COMPLETED and exact payload in the same transaction.
    """
    session_maker = setup_phase3_test_db
    plan = Plan(id=1, code="PRO")
    tenant = Tenant(id=1, company_name="Alpha Logistics", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        _, cards = await handle_conversational_lr_booking(
            db=db,
            user=user,
            tenant=tenant,
            current_office=branch,
            user_text="Book LR: Consigner is ABC Corp, consignee is XYZ Retail, vehicle DL01AA1111, from Delhi to Mumbai, freight 60000",
            lang="en",
        )
        token = cards[0].confirmation_token
        d_id = cards[0].draft_id

        req = ConfirmLRDraftRequest(draft_id=d_id, confirmation_token=token)
        res = await confirm_lr_draft(payload=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert res.success is True

        from sqlalchemy import select
        from app.tenant_db.models import AIOperationIdempotency
        op_id = f"lr_draft:{d_id}"
        stmt = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == op_id)
        idem = (await db.execute(stmt)).scalar_one_or_none()

        assert idem is not None
        assert idem.status == "COMPLETED"
        assert idem.operation_type == "LR_CREATE"
        assert idem.entity_id == res.lr_id
        assert idem.entity_identifier == res.lr_number
        assert idem.response_payload["lr_number"] == res.lr_number

