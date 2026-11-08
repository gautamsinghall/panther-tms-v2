"""
Security RBAC & Tenant/Office Isolation Tests for Panther AI Copilot.

Verifies:
1. User without transport access typing "lr book" / "creat lr" / "Mujhe LR book karni hai"
   gets exact refusal message:
   "You don't have access to create LRs. Your allowed issuing office is {office}. Please contact your Company Admin if you need access."
   Cards list is empty, no draft is created.
2. Office scoping: User locked to MUM office cannot track or view DEL LR:
   returns "I couldn't find that record in your tenant / issuing office."
3. Blocked RBAC attempts are recorded in UserActivity audit log with status="BLOCKED".
4. Hard Rule 0: LR delete attempts remain strictly blocked with exact refusal message:
   "You cannot delete this LR. Deletion is not allowed in Panther TMS. Please contact your Company Admin if this LR needs correction or cancellation."
   and no deletion occurs.
"""
import pytest
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
    UserActivity,
    UserOfficeAssignment,
)
from app.control.models import ControlBase, Tenant, Plan
from app.modules.ai.schemas import ChatRequest, ChatMessage
from app.modules.ai.router import chat_with_copilot, get_active_lr_draft
from app.modules.ai.tools import execute_tracking_tool, execute_lr_tool


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_rbac_test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=True)

    async with session_maker() as session:
        delhi_branch = Branch(
            id=101, code="DEL", name="DEL Delhi", is_head_office=True, is_active=True
        )
        mumbai_branch = Branch(
            id=102, code="MUM", name="MUM Mumbai", is_head_office=False, is_active=True
        )
        session.add_all([delhi_branch, mumbai_branch])

        # Accounts only role (NO transport permissions)
        role_accounts = Role(
            id=2,
            name="Operations Manager Accounts Only",
            description="Accounts view only",
            permissions=[
                RolePermission(module="accounts", feature="master_ledger", permission="view", is_allowed=True),
                RolePermission(module="accounts", feature="vouchers", permission="view", is_allowed=True),
            ],
        )
        session.add(role_accounts)

        # Transport allowed role for Delhi branch
        role_delhi_dispatch = Role(
            id=3,
            name="Delhi Dispatcher",
            description="Delhi transport",
            permissions=[
                RolePermission(module="transport", feature="lr_booking", permission="view", is_allowed=True),
                RolePermission(module="transport", feature="lr_booking", permission="create", is_allowed=True),
                RolePermission(module="tracking", feature="tracking", permission="view", is_allowed=True),
            ],
        )
        session.add(role_delhi_dispatch)

        # User 10: Operations Manager locked to MUM office with accounts only
        user_ops_mum = User(
            id=10,
            email="ops.mum@example.com",
            password_hash="dummy",
            full_name="Operations Manager",
            role="OPERATIONS",
            is_active=True,
            custom_role=role_accounts,
        )
        session.add(user_ops_mum)

        # User 20: Delhi Dispatcher locked to DEL office
        user_delhi_disp = User(
            id=20,
            email="disp.del@example.com",
            password_hash="dummy",
            full_name="Delhi Dispatcher",
            role="OPERATIONS",
            is_active=True,
            custom_role=role_delhi_dispatch,
        )
        session.add(user_delhi_disp)

        # Office assignments
        assign_mum = UserOfficeAssignment(id=1, user_id=10, office_id=102, is_default=True)
        assign_del = UserOfficeAssignment(id=2, user_id=20, office_id=101, is_default=True)
        session.add_all([assign_mum, assign_del])

        # Consigner and Consignee
        cr = Consigner(id=1, name="Consigner A", code="CRA", is_active=True, issuing_office_id=101)
        ce = Consignee(id=1, name="Consignee B", code="CEB", is_active=True, issuing_office_id=102)
        session.add_all([cr, ce])

        # Existing LRs
        lr_del = LR(
            id=1,
            lr_number="DEL-LR-2026-0001",
            consigner_id=1,
            consignee_id=1,
            vehicle_number="DL01AC1111",
            total_freight_amount=Decimal("2500.00"),
            issuing_office_id=101,
            booking_status="Booked",
        )
        lr_mum = LR(
            id=2,
            lr_number="MUM-LR-2026-0001",
            consigner_id=1,
            consignee_id=1,
            vehicle_number="MH01AB2222",
            total_freight_amount=Decimal("3500.00"),
            issuing_office_id=102,
            booking_status="Booked",
        )
        session.add_all([lr_del, lr_mum])
        await session.commit()

    return session_maker


@pytest.mark.asyncio
async def test_user_without_transport_blocked_from_booking_lr(setup_rbac_test_db):
    """User without transport permissions gets clean refusal, no cards, no booking prompt."""
    session_maker = setup_rbac_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Demo Logistics Pvt Ltd", company_code="DEMOLOGISTICS", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user_ops = await db.get(User, 10)
        mum_office = await db.get(Branch, 102)

        # 1. English "lr book"
        req = ChatRequest(messages=[ChatMessage(role="user", content="lr book")])
        res = await chat_with_copilot(
            data=req,
            current_user=user_ops,
            tenant=tenant,
            current_office=mum_office,
            db=db,
        )
        expected_en = "You don't have access to create LRs. Your allowed issuing office is MUM Mumbai. Please contact your Company Admin if you need access."
        assert res.content == expected_en
        assert res.cards == []
        assert res.navigation_suggestions == []

        # 2. Hinglish "Mujhe LR book karni hai"
        req_hi = ChatRequest(messages=[ChatMessage(role="user", content="Mujhe LR book karni hai")])
        res_hi = await chat_with_copilot(
            data=req_hi,
            current_user=user_ops,
            tenant=tenant,
            current_office=mum_office,
            db=db,
        )
        expected_hi = "Aapke paas LRs create karne ka access nahi hai. Aapka allowed issuing office MUM Mumbai hai. Kripya access ke liye apne Company Admin se sampark karein."
        assert res_hi.content == expected_hi
        assert res_hi.cards == []

        # 3. Active draft check must return None
        active_draft = await get_active_lr_draft(
            current_user=user_ops,
            current_office=mum_office,
            tenant=tenant,
        )
        assert active_draft == {"draft": None}


@pytest.mark.asyncio
async def test_blocked_attempt_is_logged_in_audit(setup_rbac_test_db):
    """Blocked RBAC attempt is logged to UserActivity with status='BLOCKED'."""
    session_maker = setup_rbac_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Demo Logistics Pvt Ltd", company_code="DEMOLOGISTICS", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user_ops = await db.get(User, 10)
        mum_office = await db.get(Branch, 102)

        req = ChatRequest(messages=[ChatMessage(role="user", content="lr book")])
        await chat_with_copilot(
            data=req,
            current_user=user_ops,
            tenant=tenant,
            current_office=mum_office,
            db=db,
        )

        stmt = (
            select(UserActivity)
            .where(
                UserActivity.user_id == 10,
                UserActivity.status == "BLOCKED",
                UserActivity.action == "BLOCKED_CREATE_LR",
            )
        )
        activities = list((await db.execute(stmt)).scalars().all())
        assert len(activities) >= 1
        latest = activities[-1]
        assert latest.module == "transport"
        assert latest.status == "BLOCKED"
        assert latest.details_json.get("missing_permission") == "transport.lr_booking.create"


@pytest.mark.asyncio
async def test_office_isolation_cannot_view_or_track_other_office_records(setup_rbac_test_db):
    """User in MUM cannot view or track DEL records: returns exact record not found message."""
    session_maker = setup_rbac_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Demo Logistics Pvt Ltd", company_code="DEMOLOGISTICS", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user_disp = await db.get(User, 20)  # Has transport permissions, but assigned to DEL (101)
        del_office = await db.get(Branch, 101)

        # DEL user searching for MUM LR
        msg, cards = await execute_tracking_tool(
            db=db,
            user=user_disp,
            tenant=tenant,
            current_office=del_office,
            lr_number="MUM-LR-2026-0001",
            lang="en",
        )
        assert msg == "I couldn't find that record in your tenant / issuing office."
        assert cards == []

        # DEL user querying LR tool for MUM LR
        msg_lr, cards_lr = await execute_lr_tool(
            db=db,
            user=user_disp,
            tenant=tenant,
            current_office=del_office,
            query="MUM-LR-2026-0001",
            lang="en",
        )
        assert msg_lr == "I couldn't find that record in your tenant / issuing office."
        assert cards_lr == []


@pytest.mark.asyncio
async def test_hard_rule_0_delete_blocked(setup_rbac_test_db):
    """Hard Rule 0: No user can delete any LR. Strict exact refusal message and no deletion."""
    session_maker = setup_rbac_test_db
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Demo Logistics Pvt Ltd", company_code="DEMOLOGISTICS", status="ACTIVE", plan=plan)

    async with session_maker() as db:
        user_disp = await db.get(User, 20)
        del_office = await db.get(Branch, 101)

        req = ChatRequest(messages=[ChatMessage(role="user", content="delete LR DEL-LR-2026-0001")])
        res = await chat_with_copilot(
            data=req,
            current_user=user_disp,
            tenant=tenant,
            current_office=del_office,
            db=db,
        )
        expected_delete_refusal = (
            "You cannot delete this LR. Deletion is not allowed in Panther TMS. "
            "Please contact your Company Admin if this LR needs correction or cancellation."
        )
        assert res.content == expected_delete_refusal
        assert res.cards == []

        # Verify LR still exists in DB
        lr_still_exists = await db.get(LR, 1)
        assert lr_still_exists is not None
        assert lr_still_exists.lr_number == "DEL-LR-2026-0001"


def test_permission_matching_wildcard_and_hyphenation():
    """Validates _matches_permission handles wildcard features, wildcards in custom roles, and hyphen/underscore variants."""
    from app.auth.dependencies import _matches_permission

    # Wildcard in user permission (p_feat='*')
    assert _matches_permission(
        req_mod="accounts",
        req_feat="master_ledger",
        req_perm="view",
        p_mod="accounts",
        p_feat="*",
        p_perm="view",
        p_allowed=True,
    ) is True

    # Hyphenated vs underscore feature name
    assert _matches_permission(
        req_mod="accounts",
        req_feat="master_ledger",
        req_perm="view",
        p_mod="accounts",
        p_feat="master-ledger",
        p_perm="view",
        p_allowed=True,
    ) is True

    # Wildcard in request feature
    assert _matches_permission(
        req_mod="accounts",
        req_feat="*",
        req_perm="view",
        p_mod="accounts",
        p_feat="master_ledger",
        p_perm="view",
        p_allowed=True,
    ) is True

    # Module mismatch
    assert _matches_permission(
        req_mod="transport",
        req_feat="lr_booking",
        req_perm="view",
        p_mod="accounts",
        p_feat="*",
        p_perm="view",
        p_allowed=True,
    ) is False


@pytest.mark.asyncio
async def test_activity_log_scoping_for_single_office_employee(setup_rbac_test_db):
    """
    Verifies that when a single-office employee requests activity logs without an office filter
    or with office_id='all', the query automatically scopes to their assigned office instead of
    raising 403 'Consolidated multi-office access is restricted'.
    """
    from app.services.activity_logger import query_activity_logs, log_activity
    from app.core.errors import ForbiddenException

    session_maker = setup_rbac_test_db
    async with session_maker() as db:
        user_mum = await db.get(User, 10)  # Assigned to MUM (102)

        # Log an activity for MUM and one for DEL
        await log_activity(
            db=db,
            user=user_mum,
            action="VOUCHER_CREATE",
            module="accounts",
            entity_type="Voucher",
            entity_id="V-1",
            office_id=102,
            office_name="MUM Mumbai",
            commit=True,
        )

        user_del = await db.get(User, 20)  # Assigned to DEL (101)
        await log_activity(
            db=db,
            user=user_del,
            action="LR_CREATE",
            module="transport",
            entity_type="LR",
            entity_id="LR-1",
            office_id=101,
            office_name="DEL Delhi",
            commit=True,
        )

        # Query with office_id="all" should NOT throw 403 for MUM employee, but scope to office 102
        records, count = await query_activity_logs(
            db=db,
            current_user=user_mum,
            office_id="all",
        )
        assert count >= 1
        assert all(r.office_id == 102 for r in records)

        # Query with unauthorized office (101) MUST throw ForbiddenException
        with pytest.raises(ForbiddenException) as exc_info:
            await query_activity_logs(
                db=db,
                current_user=user_mum,
                office_id="101",
            )
        assert "forbidden" in exc_info.value.message.lower()


def test_token_response_schema_user_auth_summary():
    """Verifies TokenResponse includes user UserAuthSummary with role and designation."""
    from app.auth.schemas import TokenResponse, UserAuthSummary

    user_summary = UserAuthSummary(
        id=42,
        email="akash@example.com",
        full_name="akash",
        role="EMPLOYEE",
        designation="Operations Director",
        is_active=True,
    )
    token_resp = TokenResponse(
        access_token="fake.access.token",
        refresh_token="fake.refresh.token",
        token_type="bearer",
        expires_in=3600,
        tenant_id="demo123456",
        company_code="DEMOLOGISTICS",
        tenant_name="Demo Logistics Pvt Ltd",
        user=user_summary,
    )
    assert token_resp.user is not None
    assert token_resp.user.email == "akash@example.com"
    assert token_resp.user.role == "EMPLOYEE"
    assert token_resp.user.designation == "Operations Director"

