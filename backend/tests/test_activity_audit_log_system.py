import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.errors import ForbiddenException
from app.tenant_db.models import (
    TenantBase,
    User,
    Branch,
    UserOfficeAssignment,
    Consigner,
    Consignee,
    Location,
    LR,
    Job,
    UserActivity,
)
from app.services.activity_logger import log_activity, query_activity_logs, get_activity_stats, get_activity_filters


@pytest.fixture
async def audit_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Seed 2 Branches: Delhi (ID 1, Head Office) and Mumbai (ID 2)
        delhi = Branch(
            id=1,
            code="DEL",
            name="Delhi Regional Office",
            city="New Delhi",
            state="Delhi",
            is_head_office=True,
            is_active=True,
        )
        mumbai = Branch(
            id=2,
            code="BOM",
            name="Mumbai Hub Office",
            city="Navi Mumbai",
            state="Maharashtra",
            is_head_office=False,
            is_active=True,
        )
        session.add_all([delhi, mumbai])

        # Seed Users
        admin = User(
            id=1,
            email="admin@company.com",
            full_name="Rajesh Admin",
            password_hash="hash",
            role="COMPANY_ADMIN",
            is_active=True,
        )
        delhi_user = User(
            id=2,
            email="akash@company.com",
            full_name="Akash Delhi",
            password_hash="hash",
            role="EMPLOYEE",
            is_active=True,
        )
        mumbai_user = User(
            id=3,
            email="priya@company.com",
            full_name="Priya Mumbai",
            password_hash="hash",
            role="EMPLOYEE",
            is_active=True,
        )
        session.add_all([admin, delhi_user, mumbai_user])

        # Assign offices: Akash -> Delhi only; Priya -> Mumbai only
        session.add(UserOfficeAssignment(user_id=2, office_id=1, is_default=True))
        session.add(UserOfficeAssignment(user_id=3, office_id=2, is_default=True))

        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_activity_logging_records_exact_details(audit_db: AsyncSession):
    session = audit_db

    mumbai_user = (await session.execute(select(User).where(User.id == 3))).scalar_one()

    # 1. Log LR creation from Mumbai branch
    act = await log_activity(
        db=session,
        user=mumbai_user,
        action="LR_CREATED",
        module="transport",
        entity_type="LR",
        entity_id="101",
        entity_identifier="LR-MUM-2026-0001",
        office_id=2,
        details_json={
            "lr_number": "LR-MUM-2026-0001",
            "consigner_name": "Tata Steel Ltd",
            "consignee_name": "Larsen & Toubro",
            "origin": "Mumbai",
            "destination": "Pune",
            "vehicle_number": "MH04XY5678",
            "total_freight_amount": 45000.0,
            "status": "Booked",
        },
        ip_address="192.168.1.100",
    )

    assert act is not None
    assert act.action == "LR_CREATED"
    assert act.module == "transport"
    assert act.entity_type == "LR"
    assert act.entity_id == "101"
    assert act.entity_identifier == "LR-MUM-2026-0001"
    assert act.user_email == "priya@company.com"
    assert act.user_name == "Priya Mumbai"
    assert act.user_role == "EMPLOYEE"
    assert act.office_id == 2
    assert act.office_code == "BOM"
    assert act.office_name == "Mumbai Hub Office"
    assert "Tata Steel Ltd" in act.details
    assert "Larsen & Toubro" in act.details
    assert "₹45,000.00" in act.details
    assert act.ip_address == "192.168.1.100"


@pytest.mark.asyncio
async def test_issuing_office_isolation_and_visibility(audit_db: AsyncSession):
    session = audit_db

    admin = (await session.execute(select(User).where(User.id == 1))).scalar_one()
    delhi_user = (await session.execute(select(User).where(User.id == 2))).scalar_one()
    mumbai_user = (await session.execute(select(User).where(User.id == 3))).scalar_one()

    # Seed 1 Mumbai action and 1 Delhi action
    await log_activity(
        db=session,
        user=mumbai_user,
        action="LR_CREATED",
        module="transport",
        entity_type="LR",
        entity_id="201",
        entity_identifier="LR-BOM-001",
        office_id=2,
        details="Created Mumbai LR",
    )
    await log_activity(
        db=session,
        user=delhi_user,
        action="JOB_CREATED",
        module="transport",
        entity_type="Job",
        entity_id="301",
        entity_identifier="JOB-DEL-001",
        office_id=1,
        details="Created Delhi Job",
    )

    # 1. Priya (Mumbai Employee): Can view only Mumbai logs
    mumbai_logs, m_count = await query_activity_logs(
        db=session,
        current_user=mumbai_user,
        office_id=2,
    )
    assert m_count == 1
    assert len(mumbai_logs) == 1
    assert mumbai_logs[0].entity_identifier == "LR-BOM-001"
    assert mumbai_logs[0].office_code == "BOM"

    # 2. Priya querying without office_id: defaults to assigned office (Mumbai only)
    mumbai_def_logs, m_def_count = await query_activity_logs(
        db=session,
        current_user=mumbai_user,
    )
    assert m_def_count == 1
    assert mumbai_def_logs[0].entity_identifier == "LR-BOM-001"

    # 3. Security Violation: Priya attempts to query Delhi office (office_id=1) -> 403 Forbidden
    with pytest.raises(ForbiddenException) as exc_delhi:
        await query_activity_logs(
            db=session,
            current_user=mumbai_user,
            office_id=1,
        )
    assert "Access to issuing office ID 1 is forbidden" in exc_delhi.value.message

    # 4. Security Violation: Priya attempts to query 'All Issuing Offices' -> 403 Forbidden
    with pytest.raises(ForbiddenException) as exc_all:
        await query_activity_logs(
            db=session,
            current_user=mumbai_user,
            office_id="all",
        )
    assert "Consolidated multi-office access is restricted to Company Administrators" in exc_all.value.message

    # 5. Akash (Delhi Employee): Can view only Delhi logs
    delhi_logs, d_count = await query_activity_logs(
        db=session,
        current_user=delhi_user,
    )
    assert d_count == 1
    assert len(delhi_logs) == 1
    assert delhi_logs[0].entity_identifier == "JOB-DEL-001"
    assert delhi_logs[0].office_code == "DEL"

    # 6. Security Violation: Akash attempts to query Mumbai office (office_id=2) -> 403 Forbidden
    with pytest.raises(ForbiddenException) as exc_akash_bom:
        await query_activity_logs(
            db=session,
            current_user=delhi_user,
            office_id=2,
        )
    assert "Access to issuing office ID 2 is forbidden" in exc_akash_bom.value.message


@pytest.mark.asyncio
async def test_all_issuing_offices_view_for_company_admin(audit_db: AsyncSession):
    session = audit_db

    admin = (await session.execute(select(User).where(User.id == 1))).scalar_one()
    delhi_user = (await session.execute(select(User).where(User.id == 2))).scalar_one()
    mumbai_user = (await session.execute(select(User).where(User.id == 3))).scalar_one()

    # Seed actions in Mumbai and Delhi, and a global admin setting action
    await log_activity(
        db=session,
        user=mumbai_user,
        action="LR_CREATED",
        module="transport",
        entity_identifier="LR-BOM-002",
        office_id=2,
        details="Mumbai LR 002",
    )
    await log_activity(
        db=session,
        user=delhi_user,
        action="LR_CREATED",
        module="transport",
        entity_identifier="LR-DEL-002",
        office_id=1,
        details="Delhi LR 002",
    )
    await log_activity(
        db=session,
        user=admin,
        action="ADMIN_SETTINGS_UPDATED",
        module="settings",
        entity_identifier="company_settings",
        office_id=None,
        details="Company Wide Admin Settings Updated",
    )

    # 1. Company Admin queries 'All Issuing Offices' (office_id='all' or 0 or None)
    all_logs, count = await query_activity_logs(
        db=session,
        current_user=admin,
        office_id="all",
    )
    assert count == 3
    assert len(all_logs) == 3
    identifiers = {l.entity_identifier for l in all_logs}
    assert "LR-BOM-002" in identifiers
    assert "LR-DEL-002" in identifiers
    assert "company_settings" in identifiers

    # Verify each entry clearly identifies the issuing office
    bom_entry = next(l for l in all_logs if l.entity_identifier == "LR-BOM-002")
    assert bom_entry.office_id == 2
    assert bom_entry.office_code == "BOM"
    assert bom_entry.office_name == "Mumbai Hub Office"

    del_entry = next(l for l in all_logs if l.entity_identifier == "LR-DEL-002")
    assert del_entry.office_id == 1
    assert del_entry.office_code == "DEL"
    assert del_entry.office_name == "Delhi Regional Office"

    # 2. Company Admin can filter down to specific office on the fly
    admin_mumbai_only, m_cnt = await query_activity_logs(
        db=session,
        current_user=admin,
        office_id=2,
    )
    assert m_cnt == 1
    assert admin_mumbai_only[0].entity_identifier == "LR-BOM-002"


@pytest.mark.asyncio
async def test_activity_stats_and_filter_options(audit_db: AsyncSession):
    session = audit_db

    admin = (await session.execute(select(User).where(User.id == 1))).scalar_one()
    mumbai_user = (await session.execute(select(User).where(User.id == 3))).scalar_one()

    # Seed 2 entries
    await log_activity(
        db=session,
        user=mumbai_user,
        action="LR_CREATED",
        module="transport",
        entity_identifier="LR-BOM-100",
        office_id=2,
    )
    await log_activity(
        db=session,
        user=admin,
        action="SERIES_CREATED",
        module="settings",
        entity_identifier="PLPL-",
        office_id=1,
    )

    # Check stats for admin
    stats = await get_activity_stats(session, current_user=admin, office_id="all")
    assert stats["total_activities"] == 2
    assert stats["active_users"] == 2
    assert stats["critical_mutations"] == 2
    assert stats["active_offices"] == 2

    # Check filter options for admin
    filters_admin = await get_activity_filters(session, current_user=admin)
    assert len(filters_admin["offices"]) == 2
    assert "transport" in filters_admin["modules"]
    assert "settings" in filters_admin["modules"]
    assert any(u["email"] == "priya@company.com" for u in filters_admin["users"])

    # Check filter options for Priya (restricted to Mumbai)
    filters_priya = await get_activity_filters(session, current_user=mumbai_user)
    assert len(filters_priya["offices"]) == 1
    filters_priya = await get_activity_filters(session, current_user=mumbai_user)
    assert len(filters_priya["offices"]) == 1
    assert filters_priya["offices"][0]["code"] == "BOM"


@pytest.mark.asyncio
async def test_log_activity_sanitizes_zero_and_invalid_offices(audit_db: AsyncSession):
    session = audit_db
    admin = (await session.execute(select(User).where(User.id == 1))).scalar_one()

    # office_id = 0 should be sanitized to None (prevents FK violation)
    act_zero = await log_activity(
        db=session,
        user=admin,
        action="LR_CREATED",
        module="transport",
        entity_identifier="LR-SAN-001",
        office_id=0,
    )
    assert act_zero is not None
    assert act_zero.office_id is None

    # office_id = "0" or "all" string should also be sanitized to None
    act_str_zero = await log_activity(
        db=session,
        user=admin,
        action="LR_CREATED",
        module="transport",
        entity_identifier="LR-SAN-002",
        office_id="0",
    )
    assert act_str_zero.office_id is None

    # office_id = 9999 (non-existent branch in DB) should safely fall back to None
    act_nonexistent = await log_activity(
        db=session,
        user=admin,
        action="LR_CREATED",
        module="transport",
        entity_identifier="LR-SAN-003",
        office_id=9999,
    )
    assert act_nonexistent.office_id is None


@pytest.mark.asyncio
async def test_lr_creation_activity_with_or_without_current_office(audit_db: AsyncSession):
    session = audit_db
    admin = (await session.execute(select(User).where(User.id == 1))).scalar_one()

    # Scenario 1: User is operating under "All Issuing Offices" (current_office is None)
    # but creates LR for Mumbai branch (issuing_office_id = 2)
    current_office = None
    input_issuing_office_id = 2
    eff_office_id = input_issuing_office_id or (current_office.id if current_office else None)

    act = await log_activity(
        db=session,
        user=admin,
        action="LR_CREATED",
        module="transport",
        entity_type="LR",
        entity_id="501",
        entity_identifier="LR-BOM-999",
        office_id=eff_office_id,
        details_json={
            "lr_number": "LR-BOM-999",
            "consigner_name": "ABC Logistics",
            "consignee_name": "XYZ Retail",
            "origin": "Mumbai",
            "destination": "Bangalore",
            "vehicle_number": "MH12AB1234",
            "total_freight_amount": 55000.0,
            "status": "Booked",
        },
    )
    assert act is not None
    assert act.office_id == 2
    assert act.office_name == "Mumbai Hub Office"
    assert act.office_code == "BOM"
    assert "ABC Logistics" in act.details
    assert "XYZ Retail" in act.details

    # Querying logs as admin under "all" returns this entry
    logs, cnt = await query_activity_logs(session, current_user=admin, office_id="all")
    assert any(l.entity_identifier == "LR-BOM-999" for l in logs)

    # Querying logs as admin under office_id 2 returns this entry
    m_logs, m_cnt = await query_activity_logs(session, current_user=admin, office_id=2)
    assert any(l.entity_identifier == "LR-BOM-999" for l in m_logs)


@pytest.mark.asyncio
async def test_multi_module_mutation_activity_logging(audit_db: AsyncSession):
    session = audit_db
    admin = (await session.execute(select(User).where(User.id == 1))).scalar_one()

    # Test Branch mutation logging
    b_act = await log_activity(
        db=session,
        user=admin,
        action="BRANCH_CREATED",
        module="profile",
        entity_type="branch",
        entity_id="3",
        entity_identifier="Pune Branch",
        office_id=None,
        details="Created branch Pune Branch (PUN)",
    )
    assert b_act.action == "BRANCH_CREATED"
    assert b_act.module == "profile"

    # Test General master mutation logging
    c_act = await log_activity(
        db=session,
        user=admin,
        action="CONSIGNEE_CREATED",
        module="general",
        entity_type="consignee",
        entity_id="10",
        entity_identifier="Reliance Industries",
        details="Created consignee Reliance Industries",
    )
    assert c_act.action == "CONSIGNEE_CREATED"
    assert c_act.module == "general"

    # Test Settings mutation logging
    r_act = await log_activity(
        db=session,
        user=admin,
        action="ROLE_CREATED",
        module="settings",
        entity_type="role",
        entity_id="5",
        entity_identifier="Dispatcher",
        details="Created role 'Dispatcher'",
    )
    assert r_act.action == "ROLE_CREATED"
    assert r_act.module == "settings"

    # Test Telemetry / Tracking trip mutation logging
    t_act = await log_activity(
        db=session,
        user=admin,
        action="SIM_TRIP_STARTED",
        module="transport",
        entity_type="sim_tracking",
        entity_id="99",
        entity_identifier="9876543210",
        office_id=1,
        details="Started SIM trip for 9876543210 (Driver: Ramesh)",
    )
    assert t_act.action == "SIM_TRIP_STARTED"
    assert t_act.office_id == 1
