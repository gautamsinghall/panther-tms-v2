"""
Tests for 8 Nov 2026 Live Re-test Bug Fixes:
1. Destination parsed from combined message (not dropped; Route shows Delhi -> Mumbai).
2. Label stripping across all fields (no 'Destination Mumbai' or 'To Mumbai' in values).
3. 'change consignee' succeeds; when value unchanged, reports 'already set', not rejected.
4. 'Track LR12345' returns exact message 'No LR records found matching LR12345.' with no cards.
5. 'Find vehicle DL01' searches Company, Market, and LRs, and returns top matches with links.
6. Combined message with all LR data opens draft without showing the 'Start LR Booking' gate.
7. Roman Hinglish queries are preserved in Roman script.
8. No-POD query respects active branch scope.
9. Package count properly saved and displayed (not 0 packages when weight/cargo present).
10. HARD RULE 0: Strict deletion block preserved.
"""
import pytest
from unittest.mock import MagicMock
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

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
    AIOperationIdempotency,
    PODRecord,
)
from app.control.models import ControlBase, Tenant, Plan, Entitlement
from app.modules.ai.schemas import ChatRequest, ChatMessage
from app.modules.ai.draft_store import lr_draft_store
from app.modules.ai.lr_draft_service import (
    strip_field_label,
    parse_lr_entities_from_text,
    handle_conversational_lr_booking,
    is_lr_booking_intent,
)
from app.modules.ai.tools import (
    classify_operational_intent,
    execute_tracking_tool,
    execute_vehicle_tool,
    execute_pod_tool,
    execute_lr_tool,
)
from app.modules.ai.router import chat_with_copilot


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_live_fix_test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=True)

    async with session_maker() as session:
        delhi_branch = Branch(
            id=101, code="DEL", name="Delhi Office", is_head_office=True, is_active=True
        )
        mumbai_branch = Branch(
            id=102, code="MUM", name="Mumbai Office", is_head_office=False, is_active=True
        )
        session.add_all([delhi_branch, mumbai_branch])

        perms = [
            RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True),
            RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="tracking", permission="view", is_allowed=True),
            RolePermission(module="tracking", feature="tracking", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="pod_records", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="company_vehicles", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="market_vehicles", permission="view", is_allowed=True),
        ]
        role_admin = Role(id=1, name="Company Admin", description="Full TMS Administration", permissions=perms)
        session.add(role_admin)

        user_delhi = User(
            id=1,
            email="admin@alpha.test",
            password_hash="dummy",
            full_name="Delhi Dispatcher",
            role="COMPANY_ADMIN",
            is_active=True,
            custom_role=role_admin,
        )
        session.add(user_delhi)

        loc_del = Location(id=1, country="India", state="Delhi", city_name="Delhi", location_code="DEL", is_active=True)
        loc_mum = Location(id=2, country="India", state="Maharashtra", city_name="Mumbai", location_code="BOM", is_active=True)
        session.add_all([loc_del, loc_mum])

        cr = Consigner(id=1, name="Test Consigner Delhi C", code="CR01", is_active=True, issuing_office_id=101)
        ce = Consignee(id=1, name="Test Consignee Mumbai C", code="CE01", is_active=True, issuing_office_id=102)
        session.add_all([cr, ce])

        sm = SeriesMaster(
            id=1,
            document_type="LR",
            prefix="PLPL-",
            starting_number=1,
            current_number=105,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            is_active=True,
            is_default=True,
            issuing_office_id=101,
        )
        session.add(sm)

        # LR on Delhi branch with DL01AB1234
        lr1 = LR(
            id=1,
            lr_number="PLPL-0104",
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="DL01AB1234",
            total_freight_amount=Decimal("1500.00"),
            actual_weight_mt=Decimal("0.10"),
            chargeable_weight_mt=Decimal("0.10"),
            package_count=0,  # Legacy 0 package to test display fallback
            issuing_office_id=101,
            booking_status="Booked",
        )
        # LR on Delhi branch with DL01AC5678
        lr2 = LR(
            id=2,
            lr_number="PLPL-0105",
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="DL01AC5678",
            total_freight_amount=Decimal("1500.00"),
            actual_weight_mt=Decimal("0.10"),
            chargeable_weight_mt=Decimal("0.10"),
            package_count=1,
            issuing_office_id=101,
            booking_status="Booked",
        )
        # LR on Mumbai branch (MUM-LR-2026-0001) without POD
        lr_mum = LR(
            id=3,
            lr_number="MUM-LR-2026-0001",
            consigner_id=1,
            consignee_id=1,
            origin_location_id=2,
            destination_location_id=1,
            vehicle_number="MH01AA1111",
            total_freight_amount=Decimal("5000.00"),
            actual_weight_mt=Decimal("1.00"),
            issuing_office_id=102,
            booking_status="In Transit",
        )
        session.add_all([lr1, lr2, lr_mum])
        await session.commit()

    yield session_maker
    await engine.dispose()


def test_strip_field_label():
    """Fix 2: Strips field label words, prefixes, copulas from extracted values."""
    assert strip_field_label("Destination Mumbai", "destination") == "Mumbai"
    assert strip_field_label("Destination: Mumbai", "destination") == "Mumbai"
    assert strip_field_label("To Mumbai", "destination") == "Mumbai"
    assert strip_field_label("dest: Mumbai", "destination") == "Mumbai"
    assert strip_field_label("Mumbai", "destination") == "Mumbai"

    assert strip_field_label("Origin Delhi", "origin") == "Delhi"
    assert strip_field_label("Origin: Delhi", "origin") == "Delhi"
    assert strip_field_label("From Delhi", "origin") == "Delhi"
    assert strip_field_label("Delhi", "origin") == "Delhi"

    assert strip_field_label("Consigner is Test Consigner Delhi C", "consigner") == "Test Consigner Delhi C"
    assert strip_field_label("Consignee: Test Consignee Mumbai C", "consignee") == "Test Consignee Mumbai C"
    assert strip_field_label("Vehicle DL01AD1111", "vehicle") == "DL01AD1111"
    assert strip_field_label("Goods: Test Electronics", "goods") == "Test Electronics"


def test_parse_combined_lr_message_captures_all_fields():
    """Fix 1 & 6: Combined message captures Consigner, Consignee, Origin, Destination, Vehicle, Freight, Weight, Goods."""
    msg = (
        "Consigner Test Consigner Delhi C, Consignee Test Consignee Mumbai C, "
        "Origin Delhi, Destination Mumbai, Goods Test Electronics, "
        "Weight 100 kg, Vehicle DL01AD1111, Freight Rs 2000"
    )
    entities = parse_lr_entities_from_text(msg)
    assert entities.get("consigner_candidate") == "Test Consigner Delhi C"
    assert entities.get("consignee_candidate") == "Test Consignee Mumbai C"
    assert entities.get("origin_candidate") == "Delhi"
    assert entities.get("destination_candidate") == "Mumbai"
    assert entities.get("vehicle_number") == "DL01AD1111"
    assert entities.get("particulars") == "Test Electronics"
    assert entities.get("actual_weight_mt") == 0.1
    assert entities.get("freight_amount") == 2000.0


@pytest.mark.asyncio
async def test_combined_message_opens_draft_without_start_gate(setup_live_fix_test_db):
    """Fix 6: Single message with booking details parses straight into draft without start gate."""
    session_maker = setup_live_fix_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        req = ChatRequest(
            messages=[
                ChatMessage(
                    role="user",
                    content=(
                        "Consigner Test Consigner Delhi C, Consignee Test Consignee Mumbai C, "
                        "Origin Delhi, Destination Mumbai, Goods Test Electronics, "
                        "Weight 100 kg, Vehicle DL01AD1111, Freight Rs 2000"
                    ),
                )
            ]
        )
        resp = await chat_with_copilot(
            data=req,
            db=db,
            current_user=user,
            tenant=tenant,
            current_office=branch,
        )
        assert len(resp.cards) >= 1
        card = resp.cards[0]
        assert card.card_type == "lr_draft"
        assert card.badge["text"] == "Ready to Confirm"
        assert card.can_confirm is True
        metric_labels = {m["label"]: m["value"] for m in card.metrics}
        assert "Delhi" in metric_labels.get("Route", "")
        assert "Mumbai" in metric_labels.get("Route", "")
        assert "Destination" not in metric_labels.get("Route", "")
        assert "Origin" not in metric_labels.get("Route", "")


@pytest.mark.asyncio
async def test_change_consignee_when_already_set(setup_live_fix_test_db):
    """Fix 3: 'change consignee' succeeds or reports already set, never rejects valid value."""
    session_maker = setup_live_fix_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)
        await lr_draft_store.clear_active_draft(tenant.id, user.id)

        # Initialize draft with Test Consignee Mumbai C
        await handle_conversational_lr_booking(
            db, user, tenant, branch,
            "Consigner Test Consigner Delhi C, Consignee Test Consignee Mumbai C, Origin Delhi, Destination Mumbai, Vehicle DL01AD1111, Freight 2000, Weight 100 kg"
        )

        # Try changing to the exact same value
        msg, cards = await handle_conversational_lr_booking(
            db, user, tenant, branch,
            "change consignee to Test Consignee Mumbai C"
        )
        assert "Consignee is already Test Consignee Mumbai C." in msg
        assert "⚠️ Could not update" not in msg

        # Try changing to a new valid value
        msg2, cards2 = await handle_conversational_lr_booking(
            db, user, tenant, branch,
            "change consignee to Test Consignee Mumbai Next"
        )
        assert "updated **consignee**" in msg2.lower()


@pytest.mark.asyncio
async def test_track_lr12345_exact_not_found_message(setup_live_fix_test_db):
    """Fix 4: 'Track LR12345' returns exact message 'No LR records found matching LR12345.' with no cards."""
    session_maker = setup_live_fix_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    intent = classify_operational_intent("Track LR12345")
    assert intent is not None
    assert intent.get("tool") == "tracking"
    assert intent.get("lr_number") == "LR12345"

    async with session_maker() as db:
        user = await db.get(User, 1)
        msg, cards = await execute_tracking_tool(
            db=db,
            user=user,
            tenant=tenant,
            lr_number="LR12345",
            lang="en",
        )
        assert msg == "No LR records found matching LR12345."
        assert cards == []


@pytest.mark.asyncio
async def test_find_vehicle_dl01_searches_lrs(setup_live_fix_test_db):
    """Fix 5: Partial-prefix vehicle search searches Company, Market, and LRs, and returns top 5 with links."""
    session_maker = setup_live_fix_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    intent = classify_operational_intent("Find vehicle DL01")
    assert intent is not None
    assert intent.get("tool") == "vehicle"
    assert intent.get("query") == "DL01"

    async with session_maker() as db:
        user = await db.get(User, 1)
        msg, cards = await execute_vehicle_tool(
            db=db,
            user=user,
            tenant=tenant,
            query="DL01",
            lang="en",
        )
        assert "DL01AB1234" in msg
        assert "DL01AC5678" in msg
        assert "[View](/transport/lr-booking?search=DL01AB1234)" in msg
        assert len(cards) == 1
        assert cards[0].card_type == "vehicle_list"
        assert len(cards[0].items) >= 2


@pytest.mark.asyncio
async def test_pod_unverified_branch_scoped(setup_live_fix_test_db):
    """Minor: 'Which LRs have no POD?' respects active branch scope (Delhi: 2 LRs, excluding Mumbai)."""
    session_maker = setup_live_fix_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        delhi_branch = await db.get(Branch, 101)

        msg, cards = await execute_pod_tool(
            db=db,
            user=user,
            tenant=tenant,
            current_office=delhi_branch,
            is_pending=True,
            lang="en",
        )
        # Delhi branch has PLPL-0104 and PLPL-0105 without POD
        assert "PLPL-0104" in msg
        assert "PLPL-0105" in msg
        # Mumbai LR must NOT be included
        assert "MUM-LR-2026-0001" not in msg
        assert len(cards) == 1
        assert cards[0].badge["text"] == "2 Pending"


@pytest.mark.asyncio
async def test_lr_package_count_fallback(setup_live_fix_test_db):
    """Minor: PLPL-0104 had 0 packages stored, displays 1 package fallback instead of 0 packages."""
    session_maker = setup_live_fix_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        delhi_branch = await db.get(Branch, 101)

        msg, cards = await execute_lr_tool(
            db=db,
            user=user,
            tenant=tenant,
            current_office=delhi_branch,
            query="PLPL-0104",
            is_detail=True,
            lang="en",
        )
        assert "1 packages" in msg or "1 package" in msg
        assert "0 packages" not in msg


@pytest.mark.asyncio
async def test_hard_rule_0_delete_blocked(setup_live_fix_test_db):
    """Hard Rule 0: No user can delete any LR. Strict exact message."""
    session_maker = setup_live_fix_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Alpha", company_code="ALPHA", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user = await db.get(User, 1)
        branch = await db.get(Branch, 101)

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="delete LR PLPL-0104")]
        )
        resp = await chat_with_copilot(
            data=req,
            db=db,
            current_user=user,
            tenant=tenant,
            current_office=branch,
        )
        exact_expected = (
            "You cannot delete this LR. Deletion is not allowed in Panther TMS. "
            "Please contact your Company Admin if this LR needs correction or cancellation."
        )
        assert exact_expected in resp.content
