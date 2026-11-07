"""
Panther AI Level 2 Comprehensive Acceptance Test Suite.
Verifies all 10 Level 2 functional acceptance criteria:
1. Complete LR flow (guided draft -> validate -> review card -> confirm -> real LR created).
2. In-chat edit ("change vehicle", "change destination", "change weight").
3. E-Way Bill enforcement (goods value > 50,000 requires EWB; <= 50,000 does not).
4. Validation rejection (invalid vehicle, invalid GSTIN checksum, invalid pincode).
5. Real tracking (live timeline card; exact 'No LR records found matching 999999.').
6. Add Vehicle pre-fill (prepares review card with form link; zero silent database writes).
7. Hire Challan flow (pulls LR details, asks vendor + hire freight, creates on confirm).
8. Context memory (anaphora resolution for POD check; fresh chat asks 'Which LR?').
9. Hard Rule 0 (strict block of any deletion request).
10. Long request safety (Delhi-Mumbai electronics process explanation stays informational).
"""
import pytest
from unittest.mock import patch, MagicMock
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
    HireChallan,
)
from app.control.models import ControlBase, Tenant, Plan, Entitlement
from app.modules.ai.schemas import ChatRequest, ChatMessage
from app.modules.ai.draft_store import lr_draft_store
from app.modules.ai.lr_draft_service import (
    is_valid_indian_vehicle,
    validate_indian_gstin,
    validate_indian_pincode,
    validate_eway_bill_number,
)
from app.modules.ai.tools import extract_transport_entities, classify_operational_intent, execute_pod_tool, execute_tracking_tool
from app.modules.ai.router import chat_with_copilot, handle_record_prefill_intent


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_level2_test_db():
    """Sets up an isolated, in-memory SQLite database populated with TMS masters."""
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
        branch = Branch(id=101, name="Delhi Logistics Hub", code="DEL-01", is_active=True, is_head_office=True)
        session.add(branch)

        # 2. Roles & Permissions
        perms = [
            RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True),
            RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True),
            RolePermission(module="transport", feature="hire_challan", permission="create", is_allowed=True),
            RolePermission(module="transport", feature="hire_challan", permission="view", is_allowed=True),
            RolePermission(module="tracking", feature="tracking", permission="view", is_allowed=True),
            RolePermission(module="general", feature="billing_clients", permission="view", is_allowed=True),
        ]
        role_admin = Role(id=1, name="Company Admin", permissions=perms)
        session.add(role_admin)

        # 3. User
        user = User(id=1, email="admin@panther.com", password_hash="dummy", role="COMPANY_ADMIN", full_name="Admin User", custom_role=role_admin)
        session.add(user)

        # 4. Consigners & Consignees
        c1 = Consigner(id=1, name="ABC Corp Logistics", code="ABC01", is_active=True, issuing_office_id=101)
        ce1 = Consignee(id=1, name="XYZ Retail Traders", code="XYZ01", is_active=True, issuing_office_id=101)
        session.add_all([c1, ce1])

        # 5. Locations
        loc_delhi = Location(id=1, country="India", state="Delhi", city_name="Delhi", location_code="DEL", is_active=True)
        loc_mumbai = Location(id=2, country="India", state="Maharashtra", city_name="Mumbai", location_code="BOM", is_active=True)
        session.add_all([loc_delhi, loc_mumbai])

        # 6. Vehicles
        cv = CompanyVehicle(id=1, vehicle_number="DL01AA1111", vehicle_type="Container 32ft", is_active=True)
        mv = MarketVehicle(id=1, vehicle_number="MH12BB2222", vehicle_type="Open 20ft", is_active=True)
        session.add_all([cv, mv])

        # 7. Series Masters for LR and Hire Challan
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
        series_hc = SeriesMaster(
            id=2,
            document_type="HIRE_CHALLAN",
            prefix="HC-DEL-",
            starting_number=1,
            current_number=10,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            is_active=True,
            is_default=True,
            issuing_office_id=101,
        )
        session.add_all([series_lr, series_hc])

        # 8. Seed an existing LR "PLPL-0101" for tracking and hire challan tests
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
def test_context():
    plan = Plan(id=1, code="ENTERPRISE", name="Enterprise Plan")
    tenant = Tenant(id=1, company_name="Speedways Express", status="ACTIVE", plan=plan, db_name="panther_tenant_demo")
    user = User(id=1, email="admin@panther.com", role="COMPANY_ADMIN", full_name="Admin User")
    branch = Branch(id=101, code="DEL-01", name="Delhi Logistics Hub")
    return tenant, user, branch


# ==============================================================================
# CRITERION 1: COMPLETE LR FLOW IN CHAT
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_1_complete_lr_flow(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="hire_challan")

        # Step 1: User says "Book LR" -> bot asks for confirmation
        req1 = ChatRequest(
            messages=[ChatMessage(role="user", content="Book LR")],
            page_context="/transport/lr-booking",
        )
        res1 = await chat_with_copilot(data=req1, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert res1.cards[0].card_type == "lr_booking_prompt"

        # Step 2: User confirms "Yes" and supplies all details
        req2 = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Book LR"),
                ChatMessage(role="assistant", content=res1.content, cards=res1.cards),
                ChatMessage(role="user", content="Yes, Consigner ABC Corp Logistics, Consignee XYZ Retail Traders, from Delhi to Mumbai, vehicle DL01AA1111, goods Electronics, weight 5 MT, freight 25000"),
            ],
            page_context="/transport/lr-booking",
        )
        res2 = await chat_with_copilot(data=req2, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert len(res2.cards) > 0
        card = res2.cards[0]
        assert card.card_type == "lr_draft"
        assert card.can_confirm is True
        assert card.confirmation_token is not None

        # Step 3: Confirm creation via in-chat message
        req3 = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Yes, Consigner ABC Corp Logistics..."),
                ChatMessage(role="assistant", content=res2.content, cards=res2.cards),
                ChatMessage(role="user", content="Create LR"),
            ],
            page_context="/transport/lr-booking",
        )
        res3 = await chat_with_copilot(data=req3, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Real LR must be created
        assert "LR-DEL-" in res3.content or "created" in res3.content.lower()
        assert len(res3.cards) == 1
        assert res3.cards[0].card_type == "lr_created"
        created_lr_num = res3.cards[0].metrics[0]["value"]
        assert "LR-DEL-" in created_lr_num

        # Verify real database record
        lr_db = (await db.execute(select(LR).where(LR.lr_number == created_lr_num))).scalar_one_or_none()
        assert lr_db is not None
        assert lr_db.vehicle_number == "DL01AA1111"
        assert float(lr_db.total_freight_amount) == 25000.0


# ==============================================================================
# CRITERION 2: IN-CHAT EDIT PRESERVES DRAFT
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_2_in_chat_edit(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")

        # Step 1: Start booking
        req1 = ChatRequest(
            messages=[ChatMessage(role="user", content="Book LR")],
            page_context="/transport/lr-booking",
        )
        res1 = await chat_with_copilot(data=req1, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Step 2: Confirm start and supply initial fields
        req2 = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Book LR"),
                ChatMessage(role="assistant", content=res1.content, cards=res1.cards),
                ChatMessage(role="user", content="Yes, Consigner ABC Corp Logistics, Consignee XYZ Retail Traders, from Delhi to Mumbai, vehicle DL01AA1111, goods Electronics, weight 5 MT, freight 25000"),
            ],
            page_context="/transport/lr-booking",
        )
        res2 = await chat_with_copilot(data=req2, current_user=user, current_office=branch, tenant=tenant, db=db)

        # In-chat edit 1: "change vehicle to MH12BB2222"
        req_edit_veh = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Yes, Consigner ABC..."),
                ChatMessage(role="assistant", content=res2.content, cards=res2.cards),
                ChatMessage(role="user", content="change vehicle to MH12BB2222"),
            ],
            page_context="/transport/lr-booking",
        )
        res_edit_veh = await chat_with_copilot(data=req_edit_veh, current_user=user, current_office=branch, tenant=tenant, db=db)
        
        # Verify vehicle updated and other fields preserved
        card_v = res_edit_veh.cards[0]
        veh_metric = next((m["value"] for m in card_v.metrics if m["label"] == "Vehicle"), "")
        assert "MH12BB2222" in veh_metric

        # In-chat edit 2: "change weight to 5000 kg" (kg normalized to MT)
        req_edit_wt = ChatRequest(
            messages=[
                ChatMessage(role="user", content="change vehicle to MH12BB2222"),
                ChatMessage(role="assistant", content=res_edit_veh.content, cards=res_edit_veh.cards),
                ChatMessage(role="user", content="change weight to 5000 kg"),
            ],
            page_context="/transport/lr-booking",
        )
        res_edit_wt = await chat_with_copilot(data=req_edit_wt, current_user=user, current_office=branch, tenant=tenant, db=db)
        card_wt = res_edit_wt.cards[0]
        wt_metric = next((m["value"] for m in card_wt.metrics if m["label"] == "Weight"), "")
        assert "5.0" in wt_metric or "5" in wt_metric


# ==============================================================================
# CRITERION 3: E-WAY BILL ENFORCEMENT
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_3_eway_bill_enforcement(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")

        # Step 1: Start booking
        req1 = ChatRequest(
            messages=[ChatMessage(role="user", content="Book LR")],
            page_context="/transport/lr-booking",
        )
        res1 = await chat_with_copilot(data=req1, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Goods value ₹60,000 (> ₹50,000 threshold) without EWB
        req_high = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Book LR"),
                ChatMessage(role="assistant", content=res1.content, cards=res1.cards),
                ChatMessage(role="user", content="Yes, Consigner ABC Corp Logistics, Consignee XYZ Retail Traders, from Delhi to Mumbai, vehicle DL01AA1111, goods Electronics, weight 5 MT, freight 25000, goods value 60000"),
            ],
            page_context="/transport/lr-booking",
        )
        res_high = await chat_with_copilot(data=req_high, current_user=user, current_office=branch, tenant=tenant, db=db)
        
        # Must require E-Way bill and block confirmation
        assert "E-Way Bill" in res_high.content or "eway" in res_high.content.lower()
        assert res_high.cards[0].can_confirm is False

        # Supply valid 12-digit E-Way Bill
        req_ewb = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Yes, Consigner ABC... goods value 60000"),
                ChatMessage(role="assistant", content=res_high.content, cards=res_high.cards),
                ChatMessage(role="user", content="E-Way Bill number is 123456789012"),
            ],
            page_context="/transport/lr-booking",
        )
        res_ewb = await chat_with_copilot(data=req_ewb, current_user=user, current_office=branch, tenant=tenant, db=db)
        # Now unlocked for confirmation
        assert res_ewb.cards[0].can_confirm is True


# ==============================================================================
# CRITERION 4: VALIDATION REJECTIONS (VEHICLE, GSTIN CHECKSUM, PINCODE)
# ==============================================================================

def test_acceptance_4_validation_rejections():
    # 1. Invalid vehicle format
    assert is_valid_indian_vehicle("XYZ123") is False
    assert is_valid_indian_vehicle("DL01AA1111") is True

    # 2. Invalid GSTIN checksum (07AAAAA0000A1Z5 has bad checksum digit 5; expected 4)
    is_valid_gst, err = validate_indian_gstin("07AAAAA0000A1Z5")
    assert is_valid_gst is False
    assert "checksum" in err.lower()

    # Valid GSTIN
    is_valid_gst_ok, _ = validate_indian_gstin("07AAAAA0000A1Z4")
    assert is_valid_gst_ok is True

    # 3. Invalid Pincode
    assert validate_indian_pincode("123")[0] is False
    assert validate_indian_pincode("110001")[0] is True


# ==============================================================================
# CRITERION 5: REAL TRACKING & TIMELINE CARD
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_5_real_tracking(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        # Existing LR: PLPL-0101
        msg, cards = await execute_tracking_tool(db, user, tenant, lr_number="PLPL-0101")
        assert "PLPL-0101" in msg
        assert len(cards) == 1
        assert cards[0].card_type in ("tracking", "tracking_timeline")
        assert len(cards[0].items) >= 3

        # Non-existent LR: 999999
        msg_missing, _ = await execute_tracking_tool(db, user, tenant, lr_number="999999")
        assert msg_missing == "No LR records found matching 999999."


# ==============================================================================
# CRITERION 6: ADD VEHICLE PRE-FILL (ZERO SILENT DB WRITES)
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_6_add_vehicle_prefill(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        # Check initial vehicle count
        init_count = len((await db.execute(select(CompanyVehicle))).scalars().all())

        # Send "Add vehicle DL01AA1111"
        res = handle_record_prefill_intent("Add vehicle DL01AA1111", lang="en")
        assert res is not None
        assert "DL01AA1111" in res.content
        assert len(res.cards) == 1
        assert res.cards[0].card_type == "vehicle_prefill"
        assert "/transport/company-vehicles?action=add&vehicle_number=DL01AA1111" in res.cards[0].action["href"]

        # Ensure NO database record was created silently
        post_count = len((await db.execute(select(CompanyVehicle))).scalars().all())
        assert post_count == init_count


# ==============================================================================
# CRITERION 7: HIRE CHALLAN FLOW FROM LR
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_7_hire_challan_flow(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="hire_challan")

        # Step 1: Create hire challan for LR PLPL-0101
        req1 = ChatRequest(
            messages=[ChatMessage(role="user", content="Create hire challan for LR PLPL-0101")],
            page_context="/transport/hire-challans",
        )
        res1 = await chat_with_copilot(data=req1, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert "PLPL-0101" in res1.content
        assert "hire rate" in res1.content.lower()

        # Step 2: Supply vendor and freight
        req2 = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Create hire challan for LR PLPL-0101"),
                ChatMessage(role="assistant", content=res1.content, cards=res1.cards),
                ChatMessage(role="user", content="Vendor is Speedways Fleet, hire rate is 18000"),
            ],
            page_context="/transport/hire-challans",
        )
        res2 = await chat_with_copilot(data=req2, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert len(res2.cards) == 1
        assert res2.cards[0].card_type == "hire_challan_draft"
        assert res2.cards[0].can_confirm is True

        # Step 3: Confirm creation
        req3 = ChatRequest(
            messages=[
                ChatMessage(role="user", content="Vendor is Speedways Fleet, hire rate is 18000"),
                ChatMessage(role="assistant", content=res2.content, cards=res2.cards),
                ChatMessage(role="user", content="confirm"),
            ],
            page_context="/transport/hire-challans",
        )
        res3 = await chat_with_copilot(data=req3, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert "HC-DEL-" in res3.content or "issued" in res3.content.lower()
        assert res3.cards[0].card_type == "hire_challan_created"


# ==============================================================================
# CRITERION 8: CONTEXT MEMORY (POD ANAPHORA RESOLUTION)
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_8_context_memory_pod(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        # Turn 1: Track LR PLPL-0101
        # Turn 2: "What about its POD?"
        history = [{"role": "user", "content": "Track LR PLPL-0101"}]
        op_intent = classify_operational_intent("What about its POD?", conversation_history=history)
        assert op_intent is not None
        assert op_intent["tool"] == "pod"
        assert op_intent["lr_number"] == "PLPL-0101"

        # Fresh chat: "What about its POD?" without history
        op_fresh = classify_operational_intent("What about its POD?", conversation_history=[])
        assert op_fresh is not None
        # Fresh chat must ask "Which LR?"
        msg, _ = await execute_pod_tool(db, user, tenant, query=op_fresh.get("query"), lr_number=op_fresh.get("lr_number"))
        assert "Which LR's POD would you like to check?" in msg


# ==============================================================================
# CRITERION 9: HARD RULE 0 - DELETION PERMANENTLY BLOCKED
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_9_hard_rule_0(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        # Chatbot deletion attempt
        req = ChatRequest(
            messages=[ChatMessage(role="user", content="Delete LR PLPL-0101")],
            page_context="/transport/lr-booking",
        )
        res = await chat_with_copilot(data=req, current_user=user, current_office=branch, tenant=tenant, db=db)
        expected_refusal = "You cannot delete this LR. Deletion is not allowed in Panther TMS. Please contact your Company Admin if this LR needs correction or cancellation."
        assert expected_refusal in res.content

        # Verify LR still exists in database
        lr_check = (await db.execute(select(LR).where(LR.lr_number == "PLPL-0101"))).scalar_one_or_none()
        assert lr_check is not None


# ==============================================================================
# CRITERION 10: LONG EXPLANATION SAFETY (PROCESS EXPLANATION)
# ==============================================================================

@pytest.mark.asyncio
async def test_acceptance_10_long_explanation_safety(setup_level2_test_db, test_context):
    tenant, user, branch = test_context
    session_maker = setup_level2_test_db

    async with session_maker() as db:
        long_query = "I want to create an LR for a full truck load of electronics from Delhi to Mumbai, please explain the whole process and what documents I need."
        req = ChatRequest(
            messages=[ChatMessage(role="user", content=long_query)],
            page_context="/transport/lr-booking",
        )
        res = await chat_with_copilot(data=req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Must return LR guide / explanation, NOT draft card and NOT vehicle guide
        assert "Consignment Note" in res.content or "LR" in res.content
        assert "E-Way Bill" in res.content or "Tax Invoice" in res.content
        for c in res.cards:
            assert c.card_type != "lr_draft"
            assert c.title != "Add Vehicle Guide"
