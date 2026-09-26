from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import control_engine, close_all_connections, ControlSessionLocal
from app.core.errors import register_error_handlers
from app.control.models import ControlBase
from app.control.service import seed_plans_and_entitlements
from app.control.router import router as control_router
from app.auth.router import router as auth_router
from app.modules.general.router import router as general_router
from app.modules.settings.router import router as settings_router
from app.modules.transport.router import router as transport_router
from app.modules.transport_reports.router import router as transport_reports_router
from app.modules.misc.router import router as misc_router
from app.modules.accounts.router import router as accounts_router
from app.modules.einvoicing.router import router as einvoicing_router
from app.modules.reports.router import router as reports_router
from app.modules.statements.router import router as statements_router
from app.modules.fleet.router import router as fleet_router
from app.modules.home.router import router as home_router
from app.modules.profile.router import router as profile_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure control-plane tables exist and plans are seeded
    try:
        async with control_engine.begin() as conn:
            await conn.run_sync(ControlBase.metadata.create_all)
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ACTIVE';"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(100);"))

        async with ControlSessionLocal() as session:
            await seed_plans_and_entitlements(session)

            # Check and auto-provision demo tenant if missing
            from sqlalchemy import select, text
            from app.control.models import Tenant
            from app.control.schemas import TenantProvisionRequest
            from app.control.service import provision_tenant
            from app.core.database import get_tenant_engine

            stmt = select(Tenant).where(Tenant.subdomain == settings.DEMO_TENANT_SUBDOMAIN)
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                req = TenantProvisionRequest(
                    subdomain=settings.DEMO_TENANT_SUBDOMAIN,
                    company_name=settings.DEMO_TENANT_NAME,
                    admin_email=settings.DEMO_ADMIN_EMAIL,
                    admin_password=settings.DEMO_ADMIN_PASSWORD,
                    admin_full_name="Operations Manager",
                    plan_code="PRO",
                )
                await provision_tenant(req, session)

            # Ensure tenant tables have country column and extra settings
            res = await session.execute(select(Tenant.db_name))
            tenant_dbs = list(res.scalars().all())
            demo_db = f"panther_tenant_{settings.DEMO_TENANT_SUBDOMAIN}"
            if demo_db not in tenant_dbs:
                tenant_dbs.append(demo_db)
            for t_db in tenant_dbs:
                try:
                    t_engine = get_tenant_engine(t_db)
                    async with t_engine.begin() as t_conn:
                        await t_conn.execute(text("ALTER TABLE general_consignees ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        await t_conn.execute(text("ALTER TABLE general_consigners ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        for cs_col in ["city VARCHAR(100)", "state VARCHAR(100)", "pincode VARCHAR(20)", "phone VARCHAR(50)", "email VARCHAR(255)", "bank_name VARCHAR(150)", "bank_account_no VARCHAR(50)", "bank_ifsc VARCHAR(20)", "logo_url VARCHAR(500)"]:
                            await t_conn.execute(text(f"ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS {cs_col};"))
                        await t_conn.execute(
                            text("UPDATE users SET is_active = true WHERE lower(email) = lower(:email);"),
                            {"email": settings.DEMO_ADMIN_EMAIL.lower().strip()}
                        )
                except Exception as t_err:
                    print(f"Notice: Tenant {t_db} setup: {t_err}")
    except Exception as e:
        print(f"Startup initialization notice: {e}")

    yield

    # Shutdown: Close all database engines cleanly
    try:
        await close_all_connections()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Multi-tenant SaaS Transport Management System",
    lifespan=lifespan,
)

# Register error handlers for standardized API error envelopes
register_error_handlers(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_origins=[
        "https://bharat.panthertms.com",
        "http://bharat.panthertms.com",
        "https://api.panthertms.com",
        "https://panthertms.com",
        "https://panthertms.in",
        "http://panthertms.in",
        "https://demo.panthertms.in",
        "https://demo.panthertms.com",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Base health & info
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
    }

# Include API Routers
app.include_router(control_router)  # /control/plans, /control/signup, /control/webhooks
app.include_router(control_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(general_router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_router, prefix=settings.API_V1_PREFIX)
app.include_router(transport_router, prefix=settings.API_V1_PREFIX)
app.include_router(transport_reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(misc_router, prefix=settings.API_V1_PREFIX)
app.include_router(accounts_router, prefix=settings.API_V1_PREFIX)
app.include_router(einvoicing_router, prefix=settings.API_V1_PREFIX)
app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(statements_router, prefix=settings.API_V1_PREFIX)
app.include_router(fleet_router, prefix=settings.API_V1_PREFIX)
app.include_router(home_router, prefix=settings.API_V1_PREFIX)
app.include_router(profile_router, prefix=settings.API_V1_PREFIX)


