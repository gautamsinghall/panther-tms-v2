"""
Acceptance Test Suite for Panther AI Chatbot Router Gate.
Verifies that:
1. Router gate intercepts non-LR queries before slot-filling.
2. The 6 specific prompts do NOT open a draft or create master records:
   - weather in Delhi today
   - Python sort function
   - flight Delhi to Mumbai tomorrow
   - Reliance share price
   - translate "good morning" to Hindi
   - leave email to boss
3. Track LR12345 does NOT open a draft and does NOT create master records.
4. Genuine 'book LR from Delhi to Mumbai' opens an LR draft.
5. Invariants remain intact:
   - 'Hi' returns a greeting with zero drafts opened.
   - 'Delete my LR' triggers Hard Rule 0 word-for-word message with zero drafts opened.
   - 'View Ledger' triggers ledger tool with zero drafts opened.
   - 'cancel' successfully cancels any active draft.
"""
import pytest
from unittest.mock import patch
from decimal import Decimal
from sqlalchemy import select, func
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
    SeriesMaster,
)
from app.control.models import ControlBase, Tenant, Plan
from app.modules.ai.schemas import ChatRequest, ChatMessage
from app.modules.ai.draft_store import lr_draft_store
from app.modules.ai.router import chat_with_copilot


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_router_gate_db():
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
        branch = Branch(id=101, name="Delhi Logistics Hub", code="DEL-01", is_active=True, is_head_office=True)
        session.add(branch)

        perms = [
            RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True),
            RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="hire_challan", permission="create", is_allowed=True),
            RolePermission(module="transport", feature="hire_challan", permission="view", is_allowed=True),
            RolePermission(module="tracking", feature="tracking", permission="view", is_allowed=True),
            RolePermission(module="accounts", feature="ledger", permission="view", is_allowed=True),
            RolePermission(module="general", feature="billing_clients", permission="view", is_allowed=True),
        ]
        role_admin = Role(id=1, name="Company Admin", permissions=perms)
        session.add(role_admin)

        user = User(id=1, email="admin@panther.com", password_hash="dummy", role="COMPANY_ADMIN", full_name="Admin User", custom_role=role_admin)
        session.add(user)

        c1 = Consigner(id=1, name="ABC Corp Logistics", code="ABC01", is_active=True, issuing_office_id=101)
        ce1 = Consignee(id=1, name="XYZ Retail Traders", code="XYZ01", is_active=True, issuing_office_id=101)
        session.add_all([c1, ce1])

        loc_delhi = Location(id=1, country="India", state="Delhi", city_name="Delhi", location_code="DEL", is_active=True)
        loc_mumbai = Location(id=2, country="India", state="Maharashtra", city_name="Mumbai", location_code="BOM", is_active=True)
        session.add_all([loc_delhi, loc_mumbai])

        cv = CompanyVehicle(id=1, vehicle_number="DL01AA1111", vehicle_type="Container 32ft", is_active=True)
        session.add(cv)

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

        # Seed real LR PLPL-0101
        seed_lr = LR(
            id=101,
            lr_number="PLPL-0101",
            vehicle_number="DL01AA1111",
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            issuing_office_id=101,
            status="Booked",
            total_freight_amount=Decimal("25000.00"),
            balance_amount=Decimal("5000.00"),
        )
        session.add(seed_lr)

        await session.commit()

    yield session_maker
    await engine.dispose()


@pytest.fixture
def gate_context():
    plan = Plan(id=1, code="ENTERPRISE", name="Enterprise Plan")
    tenant = Tenant(id=1, company_name="Speedways Express", status="ACTIVE", plan=plan, db_name="panther_tenant_demo")
    user = User(id=1, email="admin@panther.com", role="COMPANY_ADMIN", full_name="Admin User")
    branch = Branch(id=101, code="DEL-01", name="Delhi Logistics Hub")
    return tenant, user, branch


NON_DRAFT_PROMPTS = [
    "weather in Delhi today",
    "Python sort function",
    "flight Delhi to Mumbai tomorrow",
    "Reliance share price",
    'translate "good morning" to Hindi',
    "leave email to boss",
]


@pytest.mark.asyncio
@pytest.mark.parametrize("prompt", NON_DRAFT_PROMPTS)
async def test_six_prompts_do_not_open_draft(setup_router_gate_db, gate_context, prompt):
    tenant, user, branch = gate_context
    session_maker = setup_router_gate_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        initial_consigners = (await db.execute(select(func.count(Consigner.id)))).scalar()
        initial_consignees = (await db.execute(select(func.count(Consignee.id)))).scalar()

        req = ChatRequest(
            messages=[ChatMessage(role="user", content=prompt)],
            page_context="/dashboard",
        )
        with patch("app.services.activity_logger.log_activity"):
            res = await chat_with_copilot(data=req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Check: zero drafts opened
        active_draft = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert active_draft is None, f"Draft was opened for prompt: {prompt}"

        # Check: no draft cards returned
        card_types = [c.card_type for c in res.cards]
        assert "lr_draft" not in card_types
        assert "lr_booking_prompt" not in card_types

        # Check: zero master records created
        consigners_after = (await db.execute(select(func.count(Consigner.id)))).scalar()
        consignees_after = (await db.execute(select(func.count(Consignee.id)))).scalar()
        assert consigners_after == initial_consigners
        assert consignees_after == initial_consignees


@pytest.mark.asyncio
async def test_track_lr12345_no_draft_no_records(setup_router_gate_db, gate_context):
    tenant, user, branch = gate_context
    session_maker = setup_router_gate_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        initial_consigners = (await db.execute(select(func.count(Consigner.id)))).scalar()
        initial_consignees = (await db.execute(select(func.count(Consignee.id)))).scalar()

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Track LR12345")],
            page_context="/dashboard",
        )
        with patch("app.services.activity_logger.log_activity"):
            res = await chat_with_copilot(data=req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Acceptance: returns exactly "No LR records found matching LR12345."
        assert res.content == "No LR records found matching LR12345."

        active_draft = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert active_draft is None
        assert len(res.cards) == 0

        consigners_after = (await db.execute(select(func.count(Consigner.id)))).scalar()
        consignees_after = (await db.execute(select(func.count(Consignee.id)))).scalar()
        assert consigners_after == initial_consigners
        assert consignees_after == initial_consignees


@pytest.mark.asyncio
async def test_track_lr_plpl_0101_shows_timeline(setup_router_gate_db, gate_context):
    tenant, user, branch = gate_context
    session_maker = setup_router_gate_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Track LR PLPL-0101")],
            page_context="/dashboard",
        )
        with patch("app.services.activity_logger.log_activity"):
            res = await chat_with_copilot(data=req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Acceptance: shows its tracking timeline only, opens no draft
        assert "PLPL-0101" in res.content
        assert len(res.cards) == 1
        assert res.cards[0].card_type in ("tracking", "tracking_timeline")
        assert len(res.cards[0].items) >= 3

        active_draft = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert active_draft is None


@pytest.mark.asyncio
async def test_genuine_booking_opens_draft(setup_router_gate_db, gate_context):
    tenant, user, branch = gate_context
    session_maker = setup_router_gate_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")

        req = ChatRequest(
            messages=[ChatMessage(role="user", content="book LR from Delhi to Mumbai")],
            page_context="/dashboard",
        )
        with patch("app.services.activity_logger.log_activity"):
            res = await chat_with_copilot(data=req, current_user=user, current_office=branch, tenant=tenant, db=db)

        active_draft = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert active_draft is not None
        assert active_draft.data.get("origin_location_id") == 1 or active_draft.data.get("origin_location_name") == "Delhi"
        assert active_draft.data.get("destination_location_id") == 2 or active_draft.data.get("destination_location_name") == "Mumbai"
        card_types = [c.card_type for c in res.cards]
        assert "lr_draft" in card_types


@pytest.mark.asyncio
async def test_invariants_preserved(setup_router_gate_db, gate_context):
    tenant, user, branch = gate_context
    session_maker = setup_router_gate_db

    async with session_maker() as db:
        # Invariant 1: "Hi"
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        req_hi = ChatRequest(messages=[ChatMessage(role="user", content="Hi")], page_context="/dashboard")
        with patch("app.services.activity_logger.log_activity"):
            res_hi = await chat_with_copilot(data=req_hi, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is None
        assert "Hello!" in res_hi.content or "How can I help" in res_hi.content

        # Invariant 2: "Delete my LR" - Hard Rule 0 word for word
        req_del = ChatRequest(messages=[ChatMessage(role="user", content="Delete my LR")], page_context="/dashboard")
        with patch("app.services.activity_logger.log_activity"):
            res_del = await chat_with_copilot(data=req_del, current_user=user, current_office=branch, tenant=tenant, db=db)
        expected_hard_rule_0 = "You cannot delete this LR. Deletion is not allowed in Panther TMS. Please contact your Company Admin if this LR needs correction or cancellation."
        assert expected_hard_rule_0 in res_del.content
        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is None

        # Invariant 3: "View Ledger"
        from app.modules.ai.schemas import StructuredCard
        req_ledger = ChatRequest(messages=[ChatMessage(role="user", content="View Ledger")], page_context="/dashboard")
        mock_ledger_card = StructuredCard(
            card_type="ledger_summary",
            title="Master Ledger Overview",
            subtitle="Branch: Delhi Logistics Hub",
            badge={"text": "Live Accounts", "variant": "success"},
        )
        with patch("app.services.activity_logger.log_activity"), \
             patch("app.modules.ai.router.execute_accounting_tool", return_value=("Master Ledger summary", [mock_ledger_card])):
            res_ledger = await chat_with_copilot(data=req_ledger, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert any(c.card_type == "ledger_summary" for c in res_ledger.cards) or "ledger" in res_ledger.content.lower()
        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is None

        # Invariant 4: "cancel" on active draft
        # Open draft first
        req_book = ChatRequest(messages=[ChatMessage(role="user", content="book LR from Delhi to Mumbai")], page_context="/dashboard")
        with patch("app.services.activity_logger.log_activity"):
            await chat_with_copilot(data=req_book, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is not None

        # Send cancel
        req_cancel = ChatRequest(messages=[ChatMessage(role="user", content="cancel")], page_context="/dashboard")
        with patch("app.services.activity_logger.log_activity"):
            res_cancel = await chat_with_copilot(data=req_cancel, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert "cancelled" in res_cancel.content.lower() or "discarded" in res_cancel.content.lower()
        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is None
