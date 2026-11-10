"""
Comprehensive Acceptance Test Suite for Panther AI Copilot
Validates all 16 specific prompt tests and TMS guidance/navigation/context regressions.
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
    Driver,
    Voucher,
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
async def setup_test_tms_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=True)

    async with session_maker() as session:
        delhi_branch = Branch(id=101, code="DEL", name="Delhi Logistics Hub", is_head_office=True, is_active=True)
        session.add(delhi_branch)

        perms = [
            RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True),
            RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="tracking", permission="view", is_allowed=True),
            RolePermission(module="tracking", feature="tracking", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="company_vehicles", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="market_vehicles", permission="view", is_allowed=True),
            RolePermission(module="accounts", feature="master_ledger", permission="view", is_allowed=True),
            RolePermission(module="accounts", feature="vouchers", permission="view", is_allowed=True),
        ]
        role_admin = Role(id=1, name="Company Admin", permissions=perms)
        session.add(role_admin)

        user = User(
            id=1,
            email="admin@panther.test",
            password_hash="dummy",
            full_name="Admin Dispatcher",
            role="COMPANY_ADMIN",
            is_active=True,
            custom_role=role_admin,
        )
        session.add(user)

        loc_del = Location(id=1, country="India", state="Delhi", city_name="Delhi", location_code="DEL", is_active=True)
        loc_mum = Location(id=2, country="India", state="Maharashtra", city_name="Mumbai", location_code="BOM", is_active=True)
        session.add_all([loc_del, loc_mum])

        c1 = Consigner(id=1, name="Haldiram Foods Pvt Ltd", code="HAL01", is_active=True, issuing_office_id=101)
        ce1 = Consignee(id=1, name="Reliance Retail Mumbai", code="REL01", is_active=True, issuing_office_id=101)
        session.add_all([c1, ce1])

        # Driver Parth
        driver_parth = Driver(
            id=1,
            name="Parth",
            phone="9876543210",
            license_number="DL0120200001",
            is_active=True,
        )
        session.add(driver_parth)

        import datetime
        from app.tenant_db.models import VoucherType
        pv1 = Voucher(
            id=1,
            voucher_number="PV-2026-0001",
            voucher_type=VoucherType.PAYMENT_VOUCHER.value,
            voucher_date=datetime.date(2026, 11, 7),
            driver_id=1,
            net_amount=Decimal("100.00"),
            is_void=False,
            issuing_office_id=101,
        )
        pv2 = Voucher(
            id=2,
            voucher_number="PV-2026-0002",
            voucher_type=VoucherType.PAYMENT_VOUCHER.value,
            voucher_date=datetime.date(2026, 11, 1),
            driver_id=1,
            net_amount=Decimal("1000.00"),
            is_void=False,
            issuing_office_id=101,
        )
        pv3 = Voucher(
            id=3,
            voucher_number="PV-2026-0003",
            voucher_type=VoucherType.PAYMENT_VOUCHER.value,
            voucher_date=datetime.date(2026, 11, 2),
            driver_id=1,
            net_amount=Decimal("1000.00"),
            is_void=False,
            issuing_office_id=101,
        )
        pv4 = Voucher(
            id=4,
            voucher_number="PV-2026-0004",
            voucher_type=VoucherType.PAYMENT_VOUCHER.value,
            voucher_date=datetime.date(2026, 11, 3),
            driver_id=1,
            net_amount=Decimal("1000.00"),
            is_void=False,
            issuing_office_id=101,
        )
        session.add_all([pv1, pv2, pv3, pv4])

        # Vehicles: DL01AB1234 (Company) and DL01AC9999 (in LR)
        v_comp = CompanyVehicle(id=1, vehicle_number="DL01AB1234", vehicle_type="Container 32ft", capacity_mt=Decimal("15.0"), is_active=True)
        session.add(v_comp)

        lr_v = LR(
            id=1,
            lr_number="PLPL-0104",
            consigner_id=1,
            consignee_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="DL01AC9999",
            total_freight_amount=Decimal("20000.00"),
            actual_weight_mt=Decimal("10.0"),
            chargeable_weight_mt=Decimal("10.0"),
            package_count=50,
            issuing_office_id=101,
            booking_status="Booked",
        )
        session.add(lr_v)

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

        await session.commit()

    yield session_maker
    await engine.dispose()


@pytest.fixture
def copilot_env():
    plan = Plan(id=1, code="ENTERPRISE", name="Enterprise Plan")
    tenant = Tenant(id=1, company_name="Panther Logistics", status="ACTIVE", plan=plan, db_name="panther_tenant_demo")
    user = User(id=1, email="admin@panther.test", role="COMPANY_ADMIN", full_name="Admin Dispatcher")
    branch = Branch(id=101, code="DEL", name="Delhi Logistics Hub")
    return tenant, user, branch


# ------------------------------------------------------------------------------
# 1. FIX 1: REFUSE GENERAL-PURPOSE REQUESTS WITHOUT ANSWERING THEM
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_python_coding_refusal_only(setup_test_tms_db, copilot_env):
    """Test A: Write a Python function to sort a list -> Polite refusal only, zero code."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content="Write a Python function to sort a list")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Must refuse
        assert "cannot help with general coding" in res.content.lower() or "cannot assist" in res.content.lower()
        # Strictly prohibited
        assert "def " not in res.content
        assert "sorted(" not in res.content
        assert ".sort()" not in res.content
        assert "return" not in res.content
        assert len(res.cards) == 0


@pytest.mark.asyncio
async def test_translation_refusal_only(setup_test_tms_db, copilot_env):
    """Test B: Translate 'good morning' to Hindi -> Polite refusal only, zero translation."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content="Translate 'good morning' to Hindi")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Must refuse
        assert "cannot assist with general language translation" in res.content.lower() or "cannot assist" in res.content.lower()
        # Strictly prohibited
        assert "शुभ प्रभात" not in res.content
        assert "Shubh Prabhat" not in res.content
        assert "नमस्ते" not in res.content
        assert len(res.cards) == 0


@pytest.mark.asyncio
async def test_leave_email_refusal_only(setup_test_tms_db, copilot_env):
    """Test C: Help me write an email to my boss asking for leave -> Polite refusal only, zero email."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content="Help me write an email to my boss asking for leave")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Must refuse
        assert "cannot assist with drafting leave emails" in res.content.lower() or "cannot assist" in res.content.lower()
        # Strictly prohibited
        assert "Subject:" not in res.content
        assert "Dear " not in res.content
        assert "leave of absence" not in res.content
        assert len(res.cards) == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("prompt", [
    "weather in Delhi today",
    "flight from Delhi to Mumbai tomorrow",
    "Reliance share price",
])
async def test_existing_offtopic_refusals_preserved(setup_test_tms_db, copilot_env, prompt):
    """Weather, flight, share price must continue receiving refusal without opening drafts."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        req = ChatRequest(messages=[ChatMessage(role="user", content=prompt)])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is None
        assert not any(c.card_type == "lr_draft" for c in res.cards)


# ------------------------------------------------------------------------------
# 2. FIX 2: GENUINE TMS LOOKUPS REACH CORRECT LOOKUP PATH
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_driver_advance_balance_lookup(setup_test_tms_db, copilot_env):
    """Test D: What is Parth's driver advance balance? -> Driver Parth (DRV-0001) recoverable balance."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content="What is Parth's driver advance balance?")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Expected result: "Driver Parth (DRV-0001): Current Balance ₹3,100.00 Recoverable (Total Advances ₹3,100.00, Settled ₹0.00, 4 records, last payment 7 Nov 2026 (PV-2026-0001, ₹100.00))."
        expected = "Driver Parth (DRV-0001): Current Balance ₹3,100.00 Recoverable (Total Advances ₹3,100.00, Settled ₹0.00, 4 records, last payment 7 Nov 2026 (PV-2026-0001, ₹100.00))."
        assert expected in res.content
        assert len(res.cards) == 1
        assert res.cards[0].card_type == "party_ledger"
        assert res.cards[0].badge["text"] == "Advances (Recoverable)"


@pytest.mark.asyncio
async def test_find_vehicle_dl01_searches_both_masters_and_lrs(setup_test_tms_db, copilot_env):
    """Test E: Find vehicle DL01 -> Searches Company Vehicle (DL01AB1234) and LR Vehicle (DL01AC9999)."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content="Find vehicle DL01")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        assert "DL01AB1234" in res.content
        assert "DL01AC9999" in res.content
        assert len(res.cards) == 1
        assert res.cards[0].card_type == "vehicle_list"
        assert len(res.cards[0].items) >= 2


# ------------------------------------------------------------------------------
# 3. FIX 3: ACTIVE LR DRAFT PRIORITIZES SLOT-FILLING
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_active_draft_destination_slot_filling(setup_test_tms_db, copilot_env):
    """Test 9: With active draft pending fields, 'Destination Mumbai' fills destination only."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")

        # Step 1: Open draft
        req1 = ChatRequest(messages=[ChatMessage(role="user", content="book LR from Delhi to Bangalore")])
        res1 = await chat_with_copilot(req1, current_user=user, current_office=branch, tenant=tenant, db=db)
        active_draft = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert active_draft is not None
        assert active_draft.is_confirmed is False

        # Step 2: User provides 'Destination Mumbai'
        req2 = ChatRequest(
            messages=[
                ChatMessage(role="user", content="book LR from Delhi to Bangalore"),
                ChatMessage(role="assistant", content=res1.content),
                ChatMessage(role="user", content="Destination Mumbai"),
            ]
        )
        res2 = await chat_with_copilot(req2, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Verification:
        # 1. Draft remains active
        draft_after = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert draft_after is not None
        assert draft_after.is_confirmed is False

        # 2. Destination updated to Mumbai (id=2 in setup db)
        assert draft_after.data.get("destination_location_id") == 2 or draft_after.preview_labels.get("destination_name") == "Mumbai"

        # 3. Consigner remains missing
        assert not draft_after.data.get("consigner_id")
        assert draft_after.preview_labels.get("consigner_name") != "Mumbai"

        # 4. Draft is NOT declared ready
        assert draft_after.is_valid is False or draft_after.missing_fields
        card = res2.cards[0]
        assert card.badge["text"] != "Ready to Confirm"
        assert card.can_confirm is False


# ------------------------------------------------------------------------------
# 4. CURRENT-PAGE AWARENESS TESTS
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_page_awareness_which_page(setup_test_tms_db, copilot_env):
    """Which page am I in? -> Identifies actual open page from page_context."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Which page am I in?")],
            page_context="/transport/company-vehicles",
        )
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert "You are currently on the Vehicle Master page in Panther TMS." in res.content


@pytest.mark.asyncio
async def test_page_awareness_what_does_page_do(setup_test_tms_db, copilot_env):
    """What does this page do? -> Explains actual open page functionality."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(
            messages=[ChatMessage(role="user", content="What does this page do?")],
            page_context="/transport/company-vehicles",
        )
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert "You are on the Vehicle Master page." in res.content
        assert "search vehicle records" in res.content


@pytest.mark.asyncio
async def test_page_awareness_missing_context_clarification(setup_test_tms_db, copilot_env):
    """Which page am I in? without page_context -> Returns helpful clarification, not off-topic refusal."""
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Which page am I in?")],
            page_context=None,
        )
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert "I cannot determine your currently open page right now" in res.content
        assert "cannot assist" not in res.content


# ------------------------------------------------------------------------------
# 5. TMS NAVIGATION & GUIDANCE TESTS
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("query,expected_path", [
    ("Where can I find the LR booking page?", "/transport/lr-booking"),
    ("How do I open the vehicle master?", "/transport/company-vehicles"),
    ("Where can I view driver balances?", "/accounts/master-ledger?category=DRIVER"),
    ("Which section contains the payment vouchers?", "/accounts/payment-vouchers"),
])
async def test_tms_navigation_queries(setup_test_tms_db, copilot_env, query, expected_path):
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content=query)])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert expected_path in res.content or any(expected_path in (n.href or "") for n in res.navigation_suggestions)
        assert "cannot assist" not in res.content


@pytest.mark.asyncio
@pytest.mark.parametrize("query,expected_keyword", [
    ("How do I create an LR?", "To create an LR"),
    ("How do I add a new vehicle?", "To add a new vehicle"),
    ("How do I check a driver's advance?", "To check a driver's advance balance"),
    ("Explain the View Ledger section.", "View Ledger (Master Ledger)"),
    ("How can I track an LR?", "To track an LR"),
    ("What is the process for creating a Hire Challan?", "Hire Challan"),
])
async def test_tms_guidance_queries(setup_test_tms_db, copilot_env, query, expected_keyword):
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content=query)])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert expected_keyword in res.content
        assert "cannot assist" not in res.content


# ------------------------------------------------------------------------------
# 6. INVARIANTS: HARD RULE 0, BOOKING, CANCEL
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hard_rule_0_delete_blocked(setup_test_tms_db, copilot_env):
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        req = ChatRequest(messages=[ChatMessage(role="user", content="Delete my LR")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)
        exact = "You cannot delete this LR. Deletion is not allowed in Panther TMS. Please contact your Company Admin if this LR needs correction or cancellation."
        assert exact in res.content


@pytest.mark.asyncio
async def test_genuine_booking_opens_draft(setup_test_tms_db, copilot_env):
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        req = ChatRequest(messages=[ChatMessage(role="user", content="book LR from Delhi to Mumbai")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)
        draft = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert draft is not None
        assert any(c.card_type == "lr_draft" for c in res.cards)


@pytest.mark.asyncio
async def test_cancel_discards_draft(setup_test_tms_db, copilot_env):
    session_maker = setup_test_tms_db
    tenant, user, branch = copilot_env
    async with session_maker() as db:
        # Open draft
        req1 = ChatRequest(messages=[ChatMessage(role="user", content="book LR from Delhi to Mumbai")])
        await chat_with_copilot(req1, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is not None

        # Cancel
        req2 = ChatRequest(messages=[ChatMessage(role="user", content="cancel")])
        res2 = await chat_with_copilot(req2, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr") is None
        assert "cancelled" in res2.content.lower()
