import logging
from typing import List, Optional
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.config import settings
from app.core.errors import AppException
from app.core.security import get_password_hash
import json
from datetime import datetime, timezone, timedelta
from app.control.models import ControlBase, Plan, Entitlement, Tenant, WebhookEvent
from app.control.schemas import (
    TenantProvisionRequest, SignupInitiateRequest, SignupInitiateResponse,
    SignupCompleteRequest, CreateSubscriptionRequest, CreateSubscriptionResponse,
    TenantResponse
)
from app.integrations.razorpay.client import razorpay_client
from app.tenant_db.base import TenantBase
from app.tenant_db.models import User, Role, CompanySetting
from app.core.database import get_tenant_session_maker

logger = logging.getLogger("panther.control.service")

DEFAULT_PLANS = [
    {
        "code": "FREE",
        "name": "Free Starter",
        "description": "Basic TMS for single-truck operators",
        "price_monthly": 0.00,
        "price_yearly": 0.00,
        "entitlements": [
            ("module_home", "true"),
            ("module_general", "true"),
            ("module_transport", "true"),
            ("module_accounts", "true"),
            ("module_misc", "true"),
            ("module_profile", "true"),
            ("module_settings", "true"),
            ("module_einvoicing", "false"),
            ("module_fleet", "false"),
            ("module_statements", "false"),
            ("module_transport_reports", "false"),
            ("module_reports", "false"),
            ("feature_eway_bill", "false"),
            ("feature_eway_alerts", "false"),
            ("feature_api_access", "false"),
            ("max_users", "1"),
            ("max_vehicles", "2"),
            ("max_lrs_per_month", "10"),
            ("max_hire_challans_per_month", "10"),
            ("max_vouchers_per_month", "10"),
            ("max_ledgers", "10"),
            ("max_masters", "10"),
        ],
    },
    {
        "code": "PRO",
        "name": "Pro Fleet",
        "description": "Full operations & accounting for small transport companies",
        "price_monthly": 2499.00,
        "price_yearly": 24990.00,
        "entitlements": [
            ("module_home", "true"),
            ("module_general", "true"),
            ("module_transport", "true"),
            ("module_transport_reports", "true"),
            ("module_accounts", "true"),
            ("module_misc", "true"),
            ("module_reports", "true"),
            ("module_profile", "true"),
            ("module_settings", "true"),
            ("feature_eway_bill", "true"),
            ("feature_eway_alerts", "true"),
            ("feature_api_access", "false"),
            ("max_users", "5"),
            ("max_vehicles", "20"),
            ("max_lrs_per_month", "200"),
            ("max_hire_challans_per_month", "200"),
            ("max_vouchers_per_month", "200"),
            ("max_ledgers", "unlimited"),
            ("max_masters", "unlimited"),
        ],
    },
    {
        "code": "BUSINESS",
        "name": "Business Scale",
        "description": "Complete operations, fleet, and financial management",
        "price_monthly": 5999.00,
        "price_yearly": 59990.00,
        "entitlements": [
            ("module_home", "true"),
            ("module_general", "true"),
            ("module_transport", "true"),
            ("module_transport_reports", "true"),
            ("module_einvoicing", "true"),
            ("module_accounts", "true"),
            ("module_misc", "true"),
            ("module_reports", "true"),
            ("module_statements", "true"),
            ("module_fleet", "true"),
            ("module_settings", "true"),
            ("module_profile", "true"),
            ("feature_eway_bill", "true"),
            ("feature_eway_alerts", "true"),
            ("feature_api_access", "true"),
            ("max_users", "25"),
            ("max_vehicles", "100"),
            ("max_lrs_per_month", "1000"),
            ("max_hire_challans_per_month", "1000"),
            ("max_vouchers_per_month", "1000"),
            ("max_ledgers", "unlimited"),
            ("max_masters", "unlimited"),
        ],
    },
    {
        "code": "ENTERPRISE",
        "name": "Enterprise Unlimited",
        "description": "Unlimited scale, multi-branch, priority support",
        "price_monthly": 14999.00,
        "price_yearly": 149990.00,
        "entitlements": [
            ("module_home", "true"),
            ("module_general", "true"),
            ("module_transport", "true"),
            ("module_transport_reports", "true"),
            ("module_einvoicing", "true"),
            ("module_accounts", "true"),
            ("module_misc", "true"),
            ("module_reports", "true"),
            ("module_statements", "true"),
            ("module_fleet", "true"),
            ("module_settings", "true"),
            ("module_profile", "true"),
            ("feature_eway_bill", "true"),
            ("feature_eway_alerts", "true"),
            ("feature_api_access", "true"),
            ("max_users", "unlimited"),
            ("max_vehicles", "unlimited"),
            ("max_lrs_per_month", "unlimited"),
            ("max_hire_challans_per_month", "unlimited"),
            ("max_vouchers_per_month", "unlimited"),
            ("max_ledgers", "unlimited"),
            ("max_masters", "unlimited"),
        ],
    },
]

async def seed_plans_and_entitlements(session: AsyncSession) -> None:
    """Seeds or synchronizes the standard subscription tiers and entitlements."""
    for plan_data in DEFAULT_PLANS:
        stmt = select(Plan).where(Plan.code == plan_data["code"])
        result = await session.execute(stmt)
        existing_plan = result.scalar_one_or_none()

        if not existing_plan:
            plan = Plan(
                code=plan_data["code"],
                name=plan_data["name"],
                description=plan_data["description"],
                price_monthly=plan_data["price_monthly"],
                price_yearly=plan_data["price_yearly"],
                is_active=True,
            )
            session.add(plan)
            await session.flush()

            for key, val in plan_data["entitlements"]:
                entitlement = Entitlement(
                    plan_id=plan.id,
                    feature_key=key,
                    limit_value=val,
                    is_enabled=True,
                )
                session.add(entitlement)
        else:
            # Synchronize plan details & entitlements
            existing_plan.name = plan_data["name"]
            existing_plan.description = plan_data["description"]
            existing_plan.price_monthly = plan_data["price_monthly"]
            existing_plan.price_yearly = plan_data["price_yearly"]

            ent_stmt = select(Entitlement).where(Entitlement.plan_id == existing_plan.id)
            ent_res = await session.execute(ent_stmt)
            existing_ents = {e.feature_key: e for e in ent_res.scalars().all()}

            for key, val in plan_data["entitlements"]:
                if key in existing_ents:
                    existing_ents[key].limit_value = val
                    existing_ents[key].is_enabled = True
                else:
                    session.add(Entitlement(
                        plan_id=existing_plan.id,
                        feature_key=key,
                        limit_value=val,
                        is_enabled=True,
                    ))
    await session.commit()


async def create_postgres_database(db_name: str) -> None:
    """Creates a new PostgreSQL database with autocommit mode."""
    # Connect to the default maintenance DB (e.g. postgres or control DB)
    maintenance_url = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/postgres"
    engine = create_async_engine(maintenance_url, isolation_level="AUTOCOMMIT")

    try:
        async with engine.connect() as conn:
            # Check if database already exists
            check_sql = text("SELECT 1 FROM pg_database WHERE datname = :dbname")
            result = await conn.execute(check_sql, {"dbname": db_name})
            exists = result.scalar() is not None

            if not exists:
                logger.info(f"Creating database: {db_name}")
                # Safe sanitized name check: only alphanumeric and underscores
                if not db_name.replace("_", "").isalnum():
                    raise ValueError(f"Invalid database name: {db_name}")
                await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    finally:
        await engine.dispose()

async def initialize_tenant_schema_and_admin(
    db_name: str,
    company_name: str,
    admin_email: str,
    admin_password: str,
    admin_full_name: str,
) -> None:
    """Creates the tables on the tenant DB and seeds initial Admin user and company settings."""
    tenant_url = settings.get_tenant_db_async_url(db_name)
    engine = create_async_engine(tenant_url)

    # 1. Create all tenant tables
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    # 2. Seed initial Company Admin and Company Settings
    session_maker = get_tenant_session_maker(db_name)
    async with session_maker() as session:
        # Check if company admin role exists
        role_stmt = select(Role).where(Role.name == "Company Admin")
        role_res = await session.execute(role_stmt)
        admin_role = role_res.scalar_one_or_none()

        if not admin_role:
            admin_role = Role(
                name="Company Admin",
                description="Tenant owner with full administrative access",
                is_system=True,
            )
            session.add(admin_role)
            await session.flush()

        # Check if user exists
        user_stmt = select(User).where(User.email == admin_email.lower().strip())
        user_res = await session.execute(user_stmt)
        existing_user = user_res.scalar_one_or_none()

        if not existing_user:
            admin_user = User(
                email=admin_email.lower().strip(),
                password_hash=get_password_hash(admin_password),
                full_name=admin_full_name,
                role="COMPANY_ADMIN",
                role_id=admin_role.id,
                is_active=True,
            )
            session.add(admin_user)

        # Company setting
        comp_stmt = select(CompanySetting).limit(1)
        comp_res = await session.execute(comp_stmt)
        if not comp_res.scalar_one_or_none():
            comp_setting = CompanySetting(
                company_name=company_name,
                email=admin_email,
            )
            session.add(comp_setting)

        await session.commit()
    await engine.dispose()

async def provision_tenant(
    data: TenantProvisionRequest,
    control_session: AsyncSession
) -> Tenant:
    """
    Main tenant provisioning routine:
    1. Validates subdomain uniqueness
    2. Resolves plan
    3. Creates PostgreSQL tenant database
    4. Initializes tenant schema and seeds Company Admin
    5. Saves Tenant record in Control DB
    """
    subdomain = data.subdomain.strip().lower()

    # 1. Subdomain check
    check_stmt = select(Tenant).where(Tenant.subdomain == subdomain)
    existing = (await control_session.execute(check_stmt)).scalar_one_or_none()
    if existing:
        raise AppException(
            status_code=409,
            error_code="SUBDOMAIN_EXISTS",
            message=f"Subdomain '{subdomain}' is already registered.",
            details={"subdomain": subdomain},
        )

    # 2. Plan check
    plan_stmt = select(Plan).where(Plan.code == data.plan_code.upper())
    plan = (await control_session.execute(plan_stmt)).scalar_one_or_none()
    if not plan:
        raise AppException(
            status_code=400,
            error_code="PLAN_NOT_FOUND",
            message=f"Plan '{data.plan_code}' does not exist.",
            details={"plan_code": data.plan_code},
        )

    # 3. Create isolated DB
    sanitized_subdomain = subdomain.replace("-", "_")
    db_name = f"panther_tenant_{sanitized_subdomain}"
    await create_postgres_database(db_name)

    # 4. Initialize tenant schema & seed admin
    await initialize_tenant_schema_and_admin(
        db_name=db_name,
        company_name=data.company_name,
        admin_email=data.admin_email,
        admin_password=data.admin_password,
        admin_full_name=data.admin_full_name,
    )

    # 5. Insert control record
    tenant = Tenant(
        subdomain=subdomain,
        company_name=data.company_name,
        db_name=db_name,
        status="ACTIVE",
        plan_id=plan.id,
        admin_email=data.admin_email.lower().strip(),
    )
    control_session.add(tenant)
    await control_session.commit()
    await control_session.refresh(tenant)

    logger.info(f"Successfully provisioned tenant: {subdomain} (DB: {db_name})")
    return tenant


async def initiate_signup(
    data: SignupInitiateRequest,
    control_session: AsyncSession
) -> SignupInitiateResponse:
    """
    Step 1 of self-serve onboarding:
    - Validates subdomain uniqueness and syntax
    - If FREE tier, immediately provisions isolated tenant database and seeds admin
    - If Paid tier, generates Razorpay subscription and pre-stages tenant in PENDING_SETUP
    """
    subdomain = data.subdomain.strip().lower()

    # 1. Subdomain check
    check_stmt = select(Tenant).where(Tenant.subdomain == subdomain)
    existing = (await control_session.execute(check_stmt)).scalar_one_or_none()
    if existing:
        raise AppException(
            status_code=409,
            error_code="SUBDOMAIN_EXISTS",
            message=f"Subdomain '{subdomain}' is already registered.",
            details={"subdomain": subdomain},
        )

    # 2. Plan check
    plan_stmt = select(Plan).where(Plan.code == data.plan_code.upper())
    plan = (await control_session.execute(plan_stmt)).scalar_one_or_none()
    if not plan:
        raise AppException(
            status_code=400,
            error_code="PLAN_NOT_FOUND",
            message=f"Plan '{data.plan_code}' does not exist.",
            details={"plan_code": data.plan_code},
        )

    amount = float(plan.price_yearly if data.billing_cycle == "yearly" else plan.price_monthly)

    # 3. Free plan (or 0 price) -> Immediate self-serve provisioning
    if plan.code == "FREE" or amount == 0.0:
        tenant = await provision_tenant(
            TenantProvisionRequest(
                subdomain=subdomain,
                company_name=data.company_name,
                admin_email=data.admin_email,
                admin_password=data.admin_password,
                admin_full_name=data.admin_full_name,
                plan_code=plan.code,
            ),
            control_session,
        )
        return SignupInitiateResponse(
            requires_payment=False,
            tenant=TenantResponse.model_validate(tenant),
            plan_code=plan.code,
            amount=0.0,
            subdomain=subdomain,
            redirect_url=f"/login?subdomain={subdomain}",
            message="Free Starter workspace provisioned successfully.",
        )

    # 4. Paid plan -> Create Razorpay subscription and stage tenant
    sub = razorpay_client.create_subscription(
        plan_code=plan.code,
        customer_email=str(data.admin_email),
        customer_name=data.company_name,
        notes={
            "subdomain": subdomain,
            "company_name": data.company_name,
            "admin_email": str(data.admin_email),
            "plan_code": plan.code,
            "billing_cycle": data.billing_cycle,
        },
        period=data.billing_cycle,
    )

    # Pre-provision database and admin, but leave tenant in PENDING_SETUP until payment completes
    sanitized_subdomain = subdomain.replace("-", "_")
    db_name = f"panther_tenant_{sanitized_subdomain}"
    await create_postgres_database(db_name)
    await initialize_tenant_schema_and_admin(
        db_name=db_name,
        company_name=data.company_name,
        admin_email=str(data.admin_email),
        admin_password=data.admin_password,
        admin_full_name=data.admin_full_name,
    )

    tenant = Tenant(
        subdomain=subdomain,
        company_name=data.company_name,
        db_name=db_name,
        status="PENDING_SETUP",
        plan_id=plan.id,
        admin_email=str(data.admin_email).lower().strip(),
        subscription_id=sub["id"],
        subscription_status="CREATED",
    )
    control_session.add(tenant)
    await control_session.commit()

    return SignupInitiateResponse(
        requires_payment=True,
        subscription_id=sub["id"],
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        plan_code=plan.code,
        amount=amount,
        subdomain=subdomain,
        redirect_url=None,
        message="Subscription initiated. Complete payment to activate workspace.",
    )


async def complete_signup(
    data: SignupCompleteRequest,
    control_session: AsyncSession
) -> TenantResponse:
    """
    Step 2 of self-serve onboarding:
    - Cryptographically validates payment signature (HMAC-SHA256) per rules.md §8
    - Activates tenant from PENDING_SETUP to ACTIVE
    - Sets 30-day period and records subscription status
    """
    subdomain = data.subdomain.strip().lower()

    # Find staged or already provisioned tenant
    tenant = (await control_session.execute(
        select(Tenant).where(Tenant.subdomain == subdomain)
    )).scalar_one_or_none()

    if tenant and tenant.status == "ACTIVE":
        return TenantResponse.model_validate(tenant)

    # Verify payment signature for paid signup if signature provided
    if data.signature:
        is_valid = razorpay_client.verify_payment_signature(
            subscription_id=data.subscription_id or (tenant.subscription_id if tenant else ""),
            payment_id=data.payment_id or "",
            signature=data.signature,
        )
        if not is_valid:
            raise AppException(
                status_code=400,
                error_code="INVALID_PAYMENT_SIGNATURE",
                message="Payment signature verification failed.",
            )

    if not tenant:
        if not (data.company_name and data.admin_email and data.admin_password and data.plan_code):
            raise AppException(
                status_code=404,
                error_code="TENANT_NOT_FOUND",
                message=f"No registration found for subdomain '{subdomain}'.",
            )
        tenant = await provision_tenant(
            TenantProvisionRequest(
                subdomain=subdomain,
                company_name=data.company_name,
                admin_email=data.admin_email,
                admin_password=data.admin_password,
                admin_full_name=data.admin_full_name or "Company Admin",
                plan_code=data.plan_code,
            ),
            control_session,
        )

    now = datetime.now(timezone.utc)
    tenant.status = "ACTIVE"
    tenant.subscription_id = data.subscription_id
    tenant.subscription_status = "ACTIVE"
    tenant.current_period_start = now
    tenant.current_period_end = now + timedelta(days=30)
    tenant.grace_period_until = None

    await control_session.commit()
    await control_session.refresh(tenant)

    logger.info(f"Self-serve signup successfully completed & activated for tenant: {subdomain}")
    return TenantResponse.model_validate(tenant)


async def process_razorpay_webhook_event(
    payload_bytes: bytes,
    signature: str,
    control_session: AsyncSession
) -> dict:
    """
    Cryptographically verifies the webhook signature and processes subscription events idempotently.
    Per rules.md §8 (security) & architecture.md §7 (Payments - Razorpay).
    """
    if not razorpay_client.verify_webhook_signature(payload_bytes, signature):
        raise AppException(
            status_code=400,
            error_code="INVALID_SIGNATURE",
            message="Razorpay webhook signature verification failed.",
        )

    try:
        data = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise AppException(
            status_code=400,
            error_code="INVALID_JSON",
            message=f"Malformed webhook JSON payload: {exc}",
        )

    event_id = data.get("id") or data.get("event_id") or f"evt_{datetime.now(timezone.utc).timestamp()}"
    event_type = data.get("event", "")

    # Idempotent deduplication check
    existing_evt = (await control_session.execute(
        select(WebhookEvent).where(WebhookEvent.event_id == event_id)
    )).scalar_one_or_none()

    if existing_evt:
        logger.info(f"Duplicate webhook event ignored: {event_id}")
        return {"status": "ignored", "reason": "duplicate_event", "event_id": event_id}

    # Record event
    webhook_rec = WebhookEvent(
        event_id=event_id,
        event_type=event_type,
        payload=payload_bytes.decode("utf-8"),
        status="PROCESSED",
    )
    control_session.add(webhook_rec)

    # Extract subscription / payment entity
    entity = data.get("payload", {}).get("subscription", {}).get("entity", {}) or \
             data.get("payload", {}).get("payment", {}).get("entity", {})
    sub_id = entity.get("id") if entity.get("entity") == "subscription" else entity.get("subscription_id")
    notes = entity.get("notes", {})
    subdomain = notes.get("subdomain")

    tenant = None
    if sub_id:
        tenant = (await control_session.execute(
            select(Tenant).where(Tenant.subscription_id == sub_id)
        )).scalar_one_or_none()

    if not tenant and subdomain:
        tenant = (await control_session.execute(
            select(Tenant).where(Tenant.subdomain == subdomain.lower().strip())
        )).scalar_one_or_none()

    if not tenant:
        logger.warning(f"Webhook received for unknown tenant (sub_id={sub_id}, subdomain={subdomain})")
        await control_session.commit()
        return {"status": "unmatched_tenant", "event_id": event_id}

    # Handle subscription states & grace periods
    now = datetime.now(timezone.utc)
    if event_type in ("subscription.activated", "subscription.authenticated"):
        tenant.subscription_status = "ACTIVE"
        tenant.status = "ACTIVE"
        tenant.grace_period_until = None
    elif event_type in ("subscription.charged", "payment.captured"):
        tenant.subscription_status = "ACTIVE"
        tenant.status = "ACTIVE"
        tenant.grace_period_until = None
        current_end = entity.get("current_end")
        if current_end:
            tenant.current_period_end = datetime.fromtimestamp(current_end, tz=timezone.utc)
        else:
            tenant.current_period_end = now + timedelta(days=30)
    elif event_type in ("payment.failed", "subscription.pending"):
        tenant.subscription_status = "PAST_DUE"
        tenant.grace_period_until = now + timedelta(days=settings.RAZORPAY_GRACE_PERIOD_DAYS)
    elif event_type in ("subscription.cancelled", "subscription.halted"):
        tenant.subscription_status = "CANCELLED"
        tenant.status = "SUSPENDED"
    elif event_type in ("subscription.updated", "subscription.plan_changed"):
        new_plan_code = notes.get("new_plan_code") or notes.get("plan_code")
        if new_plan_code:
            new_plan = (await control_session.execute(
                select(Plan).where(Plan.code == new_plan_code.upper())
            )).scalar_one_or_none()
            if new_plan:
                tenant.plan_id = new_plan.id

    await control_session.commit()
    logger.info(f"Processed webhook {event_type} for tenant: {tenant.subdomain}")
    return {"status": "processed", "event_id": event_id, "tenant": tenant.subdomain}


async def create_tenant_subscription(
    subdomain: str,
    data: CreateSubscriptionRequest,
    control_session: AsyncSession
) -> CreateSubscriptionResponse:
    """Creates a new recurring subscription for an existing tenant upgrading or changing plans."""
    tenant = (await control_session.execute(
        select(Tenant).where(Tenant.subdomain == subdomain.lower().strip())
    )).scalar_one_or_none()

    if not tenant:
        raise AppException(status_code=404, error_code="TENANT_NOT_FOUND", message=f"Tenant '{subdomain}' not found.")

    plan = (await control_session.execute(
        select(Plan).where(Plan.code == data.plan_code.upper())
    )).scalar_one_or_none()

    if not plan:
        raise AppException(status_code=400, error_code="PLAN_NOT_FOUND", message=f"Plan '{data.plan_code}' not found.")

    amount = float(plan.price_yearly if data.billing_cycle == "yearly" else plan.price_monthly)

    sub = razorpay_client.create_subscription(
        plan_code=plan.code,
        customer_email=tenant.admin_email,
        customer_name=tenant.company_name,
        notes={"subdomain": tenant.subdomain, "plan_code": plan.code, "billing_cycle": data.billing_cycle},
        period=data.billing_cycle,
    )

    tenant.subscription_id = sub["id"]
    await control_session.commit()

    return CreateSubscriptionResponse(
        subscription_id=sub["id"],
        plan_code=plan.code,
        amount=amount,
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        currency="INR",
    )

