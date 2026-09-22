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
        # Ensure tenant tables have country column
        try:
            from sqlalchemy import select, text
            from app.control.models import Tenant
            from app.core.database import get_tenant_engine
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
                except Exception:
                    pass
        except Exception:
            pass

    yield

    # Shutdown: Close all database engines cleanly
    await close_all_connections()

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
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


