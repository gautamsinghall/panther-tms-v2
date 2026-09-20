import logging
from typing import List, Optional
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.config import settings
from app.core.errors import AppException
from app.core.security import get_password_hash
from app.control.models import ControlBase, Plan, Entitlement, Tenant
from app.control.schemas import TenantProvisionRequest
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
            ("max_users", "1"),
            ("max_vehicles", "1"),
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
            ("max_users", "5"),
            ("max_vehicles", "20"),
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
            ("max_users", "25"),
            ("max_vehicles", "100"),
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
            ("max_users", "unlimited"),
            ("max_vehicles", "unlimited"),
        ],
    },
]

async def seed_plans_and_entitlements(session: AsyncSession) -> None:
    """Seeds the standard subscription tiers if they do not exist."""
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
