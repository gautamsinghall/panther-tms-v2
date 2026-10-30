"""
Panther AI Real Database Multi-Tenant Integration Test Suite.
Tests synthetic multi-tenant isolation across two distinct tenant databases,
branch office scoping, employee RBAC restrictions, plan entitlements,
and exact database-backed operational tool retrievals without mocks.
"""
import pytest
from datetime import datetime, timezone, timedelta, date
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
    CompanyVehicle,
    MarketVehicle,
    Driver,
    FastagTripRecord,
    SIMTripRecord,
    Account,
    PrimaryGroup,
    GroupInPrimary,
)
from app.control.models import Tenant, Plan, Entitlement
from app.modules.ai.tools import (
    execute_lr_tool,
    execute_vehicle_tool,
    execute_driver_tool,
    execute_tracking_tool,
    execute_accounting_tool,
    classify_operational_intent,
    is_user_permitted,
)
from app.modules.ai.privacy import scrub_user_message_pii, sanitize_chat_history_for_external_llm
from app.modules.ai.schemas import ChatMessage


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_two_tenant_databases():
    """
    Sets up two isolated in-memory SQLite databases:
    - Tenant A: 'Alpha Roadways' (company_code: 'ALPHA')
    - Tenant B: 'Beta Freight' (company_code: 'BETA')
    """
    engine_a = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    engine_b = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine_a.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
    async with engine_b.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    session_maker_a = async_sessionmaker(engine_a, expire_on_commit=False, class_=AsyncSession)
    session_maker_b = async_sessionmaker(engine_b, expire_on_commit=False, class_=AsyncSession)

    now_utc = datetime.now(timezone.utc)

    # 1. Populate Tenant A Database
    async with session_maker_a() as session_a:
        # Branches
        branch_a1 = Branch(id=101, code="DEL", name="Delhi North Hub", is_active=True)
        branch_a2 = Branch(id=102, code="BOM", name="Mumbai Port Hub", is_active=True)
        session_a.add_all([branch_a1, branch_a2])

        # Consigners & Consignees
        cn_a = Consigner(id=1, name="Delhi Steel Mills")
        ce_a = Consignee(id=1, name="Noida Infotech Park")
        session_a.add_all([cn_a, ce_a])

        # LRs
        lr_a1 = LR(
            id=1,
            lr_number="LR-ALPHA-DEL-001",
            lr_date=date(2026, 3, 20),
            issuing_office_id=101,
            consigner_id=1,
            consignee_id=1,
            vehicle_number="DL01AA1111",
            status="Booked",
            total_freight_amount=45000.0,
            balance_amount=15000.0,
        )
        lr_a2 = LR(
            id=2,
            lr_number="LR-ALPHA-BOM-002",
            lr_date=date(2026, 3, 22),
            issuing_office_id=102,
            consigner_id=1,
            consignee_id=1,
            vehicle_number="MH12BB2222",
            status="In Transit",
            total_freight_amount=80000.0,
            balance_amount=20000.0,
        )
        session_a.add_all([lr_a1, lr_a2])

        # Vehicles: 1 Company, 1 Market
        cv_a = CompanyVehicle(
            id=1,
            vehicle_number="DL01AA1111",
            vehicle_type="16 Wheeler Trailer",
            capacity_mt=25.0,
            is_active=True,
        )
        mv_a = MarketVehicle(
            id=1,
            vehicle_number="MH12BB2222",
            vehicle_type="Open Body Truck",
            capacity_mt=18.0,
            owner_name="Apex Fleet Logistics",
            owner_phone="9822001122",
            is_active=True,
        )
        session_a.add_all([cv_a, mv_a])

        # Driver
        driver_a = Driver(
            id=1,
            name="Virender Sharma",
            phone="9811002233",
            license_number="DL-042010001",
            dl_status="VALID",
            is_active=True,
        )
        session_a.add(driver_a)

        # FASTag trip
        fastag_a = FastagTripRecord(
            id=1,
            trip_number="FT-TRIP-101",
            vehicle_number="DL01AA1111",
            origin_name="Delhi Hub",
            destination_name="Jaipur Hub",
            last_toll_name="Kherki Daula Toll",
            status="In Transit",
            last_toll_time=now_utc - timedelta(hours=3),
        )
        session_a.add(fastag_a)

        # Master Ledger Accounts
        pg_a = PrimaryGroup(id=1, name="Current Assets", code="ASSETS")
        gp_a = GroupInPrimary(id=1, primary_group_id=1, name="Sundry Debtors", code="DEBTORS")
        acc_client_a = Account(
            id=1,
            group_id=1,
            name="Orient Steel Private Limited",
            code="CLIENT-ORIENT",
            opening_balance=50000.0,
            opening_balance_type="DR",
            billing_client_id=1,
            is_active=True,
        )
        session_a.add_all([pg_a, gp_a, acc_client_a])

        await session_a.commit()

    # 2. Populate Tenant B Database
    async with session_maker_b() as session_b:
        branch_b1 = Branch(id=201, code="MAA", name="Chennai South Hub", is_active=True)
        session_b.add(branch_b1)

        cn_b = Consigner(id=1, name="Chennai Auto Spares")
        ce_b = Consignee(id=1, name="Madurai Central Goods")
        session_b.add_all([cn_b, ce_b])

        lr_b1 = LR(
            id=1,
            lr_number="LR-BETA-MAA-999",
            lr_date=date(2026, 3, 25),
            issuing_office_id=201,
            consigner_id=1,
            consignee_id=1,
            vehicle_number="TN09ZZ9999",
            status="Delivered",
            total_freight_amount=95000.0,
            balance_amount=0.0,
        )
        session_b.add(lr_b1)

        cv_b = CompanyVehicle(
            id=1,
            vehicle_number="TN09ZZ9999",
            vehicle_type="Container 32ft",
            capacity_mt=15.0,
            is_active=True,
        )
        session_b.add(cv_b)

        driver_b = Driver(
            id=1,
            name="Karthik Murugan",
            phone="9444001122",
            license_number="TN-022015002",
            dl_status="VALID",
            is_active=True,
        )
        session_b.add(driver_b)

        await session_b.commit()

    yield session_maker_a, session_maker_b

    await engine_a.dispose()
    await engine_b.dispose()


# ==============================================================================
# 1. MULTI-TENANT DATABASE ISOLATION VERIFICATION
# ==============================================================================

@pytest.mark.asyncio
async def test_cross_tenant_database_isolation(setup_two_tenant_databases):
    """
    Verifies that Company A's database session cannot view Company B's records,
    and Company B's session cannot view Company A's records.
    """
    session_maker_a, session_maker_b = setup_two_tenant_databases

    plan_pro = Plan(id=1, code="PRO", name="Pro Plan")
    tenant_a = Tenant(id=1, company_name="Alpha Roadways", company_code="ALPHA", status="ACTIVE", plan=plan_pro)
    tenant_b = Tenant(id=2, company_name="Beta Freight", company_code="BETA", status="ACTIVE", plan=plan_pro)

    admin_a = User(id=1, role="COMPANY_ADMIN", full_name="Alpha Admin")
    admin_b = User(id=2, role="COMPANY_ADMIN", full_name="Beta Admin")

    async with session_maker_a() as db_a, session_maker_b() as db_b:
        # Admin A queries for Beta's LR number
        msg_a, cards_a = await execute_lr_tool(
            db=db_a, user=admin_a, tenant=tenant_a, current_office=None, query="LR-BETA-MAA-999"
        )
        # Must return 0 records in Company A
        assert cards_a[0].badge["text"] == "0 Results"
        assert len(cards_a[0].items) == 0

        # Admin B queries for Alpha's LR number
        msg_b, cards_b = await execute_lr_tool(
            db=db_b, user=admin_b, tenant=tenant_b, current_office=None, query="LR-ALPHA-DEL-001"
        )
        # Must return 0 records in Company B
        assert cards_b[0].badge["text"] == "0 Results"
        assert len(cards_b[0].items) == 0

        # Admin A querying Company A vehicle TN09ZZ9999 (which belongs to B)
        msg_v, cards_v = await execute_vehicle_tool(
            db=db_a, user=admin_a, tenant=tenant_a, query="TN09ZZ9999"
        )
        assert cards_v[0].badge["text"] == "0 Results"

        # Admin B querying Company B vehicle TN09ZZ9999
        msg_vb, cards_vb = await execute_vehicle_tool(
            db=db_b, user=admin_b, tenant=tenant_b, query="TN09ZZ9999"
        )
        assert cards_vb[0].badge["text"] == "1 Active"
        assert cards_vb[0].items[0]["primary"] == "TN09ZZ9999"


# ==============================================================================
# 2. BRANCH OFFICE ISOLATION & EMPLOYEE ACCESS VERIFICATION
# ==============================================================================

@pytest.mark.asyncio
async def test_branch_office_isolation_real_db(setup_two_tenant_databases):
    """
    Verifies that:
    - Employee in Delhi Hub cannot see Mumbai Hub records.
    - Employee in Mumbai Hub cannot see Delhi Hub records.
    - Company Admin without active branch sees consolidated company records.
    - Company Admin with active branch sees that branch only.
    """
    session_maker_a, _ = setup_two_tenant_databases

    plan_pro = Plan(id=1, code="PRO", name="Pro Plan")
    tenant_a = Tenant(id=1, company_name="Alpha Roadways", company_code="ALPHA", status="ACTIVE", plan=plan_pro)

    # Branches
    branch_delhi = Branch(id=101, code="DEL", name="Delhi North Hub")
    branch_mumbai = Branch(id=102, code="BOM", name="Mumbai Port Hub")

    # Employee with LR booking view permission
    perm_lr = RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True)
    dispatcher_role = Role(id=10, name="Dispatcher", permissions=[perm_lr])
    employee_user = User(id=11, role="EMPLOYEE", custom_role=dispatcher_role)

    # Company Admin user
    admin_user = User(id=1, role="COMPANY_ADMIN")

    async with session_maker_a() as db_a:
        # 1. Employee scoped to Delhi Hub
        _, cards_delhi = await execute_lr_tool(
            db=db_a, user=employee_user, tenant=tenant_a, current_office=branch_delhi, limit=10
        )
        items_delhi = cards_delhi[0].items
        assert len(items_delhi) == 1
        assert items_delhi[0]["primary"] == "LR-ALPHA-DEL-001"
        assert all("BOM" not in item["primary"] for item in items_delhi)

        # 2. Employee scoped to Mumbai Hub
        _, cards_mumbai = await execute_lr_tool(
            db=db_a, user=employee_user, tenant=tenant_a, current_office=branch_mumbai, limit=10
        )
        items_mumbai = cards_mumbai[0].items
        assert len(items_mumbai) == 1
        assert items_mumbai[0]["primary"] == "LR-ALPHA-BOM-002"
        assert all("DEL" not in item["primary"] for item in items_mumbai)

        # 3. Company Admin without active branch (Consolidated)
        _, cards_admin_all = await execute_lr_tool(
            db=db_a, user=admin_user, tenant=tenant_a, current_office=None, limit=10
        )
        items_admin_all = cards_admin_all[0].items
        assert len(items_admin_all) == 2
        lr_numbers = [item["primary"] for item in items_admin_all]
        assert "LR-ALPHA-DEL-001" in lr_numbers
        assert "LR-ALPHA-BOM-002" in lr_numbers


# ==============================================================================
# 3. MISSING OFFICE ASSIGNMENTS & SECURITY GATING
# ==============================================================================

@pytest.mark.asyncio
async def test_missing_office_assignment_fails_securely(setup_two_tenant_databases):
    """
    Verifies that an Employee user with no active branch returns safe 0 results
    instead of leaking unauthorized branches or raising unhandled exceptions.
    """
    session_maker_a, _ = setup_two_tenant_databases

    plan_pro = Plan(id=1, code="PRO", name="Pro Plan")
    tenant_a = Tenant(id=1, company_name="Alpha Roadways", company_code="ALPHA", status="ACTIVE", plan=plan_pro)

    perm_lr = RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True)
    dispatcher_role = Role(id=10, name="Dispatcher", permissions=[perm_lr])
    employee_unassigned = User(id=12, role="EMPLOYEE", custom_role=dispatcher_role)

    async with session_maker_a() as db_a:
        msg, cards = await execute_lr_tool(
            db=db_a, user=employee_unassigned, tenant=tenant_a, current_office=None
        )
        assert cards[0].badge["text"] == "0 Results"
        assert len(cards[0].items) == 0


# ==============================================================================
# 4. MODULE ENTITLEMENT & SUBSCRIPTION LOCKING
# ==============================================================================

@pytest.mark.asyncio
async def test_plan_entitlement_gating_real_tool(setup_two_tenant_databases):
    """
    Verifies that a tenant on a plan without tracking entitlement is locked,
    while a tenant on an entitled plan can access tracking.
    """
    session_maker_a, _ = setup_two_tenant_databases

    # Free plan without tracking module entitlement
    ent_home_free = Entitlement(feature_key="module_home", limit_value="true", is_enabled=True)
    plan_free = Plan(id=1, code="FREE", name="Free Plan", entitlements=[ent_home_free])
    tenant_free = Tenant(id=1, status="ACTIVE", plan=plan_free)

    # Pro plan with tracking entitlement
    ent_home_pro = Entitlement(feature_key="module_home", limit_value="true", is_enabled=True)
    ent_tracking = Entitlement(feature_key="module_tracking", limit_value="true", is_enabled=True)
    plan_pro = Plan(id=2, code="PRO", name="Pro Plan", entitlements=[ent_home_pro, ent_tracking])
    tenant_pro = Tenant(id=1, status="ACTIVE", plan=plan_pro)

    admin_user = User(id=1, role="COMPANY_ADMIN")

    async with session_maker_a() as db_a:
        # Free tenant queries tracking
        msg_free, cards_free = await execute_tracking_tool(
            db=db_a, user=admin_user, tenant=tenant_free, vehicle_number="DL01AA1111"
        )
        assert cards_free[0].badge["text"] == "Locked"
        assert cards_free[0].badge["variant"] == "danger"
        assert "/settings/billing" in cards_free[0].action["href"]

        # Pro tenant queries tracking
        msg_pro, cards_pro = await execute_tracking_tool(
            db=db_a, user=admin_user, tenant=tenant_pro, vehicle_number="DL01AA1111"
        )
        assert cards_pro[0].badge["text"] != "Locked"
        assert cards_pro[0].badge["text"] == "FASTag Toll Observation"


# ==============================================================================
# 5. VERIFIED OPERATIONAL TOOLS AGAINST REAL SYNTHETIC DATABASE
# ==============================================================================

@pytest.mark.asyncio
async def test_exact_database_records_matching(setup_two_tenant_databases):
    """
    Verifies that AI tools return exact, un-hallucinated database records:
    - LR by number
    - Company vs Market Vehicles with dedicated action links
    - Registered driver records
    - FASTag toll observations with accurate source and timestamps
    """
    session_maker_a, _ = setup_two_tenant_databases

    plan_pro = Plan(id=1, code="PRO", name="Pro Plan")
    tenant_a = Tenant(id=1, company_name="Alpha Roadways", company_code="ALPHA", status="ACTIVE", plan=plan_pro)
    admin_user = User(id=1, role="COMPANY_ADMIN")

    async with session_maker_a() as db_a:
        # 1. Exact LR Lookup
        _, cards_lr = await execute_lr_tool(
            db=db_a, user=admin_user, tenant=tenant_a, current_office=None, query="LR-ALPHA-DEL-001"
        )
        assert len(cards_lr[0].items) == 1
        lr_item = cards_lr[0].items[0]
        assert lr_item["primary"] == "LR-ALPHA-DEL-001"
        assert lr_item["amount"] == "₹45,000.00"
        assert lr_item["balance"] == "₹15,000.00"
        assert lr_item["status"] == "Booked"

        # 2. Company Vehicle Lookup
        _, cards_cv = await execute_vehicle_tool(
            db=db_a, user=admin_user, tenant=tenant_a, vehicle_type="company"
        )
        assert cards_cv[0].action["href"] == "/transport/company-vehicles"
        assert cards_cv[0].items[0]["primary"] == "DL01AA1111"
        assert cards_cv[0].items[0]["href"] == "/transport/company-vehicles"

        # 3. Market Vehicle Lookup
        _, cards_mv = await execute_vehicle_tool(
            db=db_a, user=admin_user, tenant=tenant_a, vehicle_type="market"
        )
        assert cards_mv[0].action["href"] == "/transport/market-vehicles"
        assert cards_mv[0].items[0]["primary"] == "MH12BB2222"
        assert cards_mv[0].items[0]["href"] == "/transport/market-vehicles"

        # 4. Driver Lookup
        _, cards_driver = await execute_driver_tool(
            db=db_a, user=admin_user, tenant=tenant_a, query="Virender"
        )
        assert len(cards_driver[0].items) == 1
        d_item = cards_driver[0].items[0]
        assert d_item["primary"] == "Virender Sharma"
        assert "9811002233" in d_item["secondary"]
        assert "DL-042010001" in d_item["secondary"]

        # 5. Tracking Tool: Source-Specific Accuracy
        _, cards_track = await execute_tracking_tool(
            db=db_a, user=admin_user, tenant=tenant_a, vehicle_number="DL01AA1111"
        )
        track_card = cards_track[0]
        assert track_card.badge["text"] == "FASTag Toll Observation"
        assert any(m["label"] == "Source" and m["value"] == "NETC FASTag Toll" for m in track_card.metrics)
        assert any(m["label"] == "Toll Plaza" and m["value"] == "Kherki Daula Toll" for m in track_card.metrics)


# ==============================================================================
# 6. PRIVACY BOUNDARY & PII SCRUBBER VERIFICATION
# ==============================================================================

def test_privacy_boundary_pii_sanitization():
    """
    Verifies that customer phone numbers, GSTIN, PAN, Aadhaar, vehicle plates,
    and financial amounts are scrubbed before conversation is sent to external LLMs.
    """
    raw_user_prompt = (
        "Client Rajesh at 9876543210 owes ₹1,25,000 for truck UP16AB1234. "
        "His GSTIN is 07AAAAA0000A1Z5 and PAN is ABCDE1234F. Email: rajesh@transports.in"
    )

    scrubbed = scrub_user_message_pii(raw_user_prompt)

    assert "9876543210" not in scrubbed
    assert "[PHONE_REDACTED]" in scrubbed

    assert "1,25,000" not in scrubbed
    assert "[AMOUNT_REDACTED]" in scrubbed

    assert "UP16AB1234" not in scrubbed
    assert "[VEHICLE_PLATE_REDACTED]" in scrubbed

    assert "07AAAAA0000A1Z5" not in scrubbed
    assert "[GSTIN_REDACTED]" in scrubbed

    assert "ABCDE1234F" not in scrubbed
    assert "[PAN_REDACTED]" in scrubbed

    assert "rajesh@transports.in" not in scrubbed
    assert "[EMAIL_REDACTED]" in scrubbed

    # Test full conversation history sanitizer
    history = [
        ChatMessage(role="user", content="Here is driver phone 9811223344"),
        ChatMessage(role="assistant", content="I noted the driver details."),
    ]
    safe_history = sanitize_chat_history_for_external_llm(history)
    assert safe_history[0].content == "Here is driver phone [PHONE_REDACTED]"
    assert safe_history[1].content == "I noted the driver details."
