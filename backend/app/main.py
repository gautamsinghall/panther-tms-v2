from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.core.database import control_engine, close_all_connections, ControlSessionLocal
from app.core.errors import register_error_handlers
from app.control.models import ControlBase
from app.tenant_db.base import TenantBase
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
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(10);"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_code VARCHAR(100);"))
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_tenants_tenant_id ON tenants(tenant_id);"))
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_tenants_company_code ON tenants(company_code);"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ACTIVE';"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ;"))
            await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(100);"))
            # Backfill existing records if any
            await conn.execute(text("UPDATE tenants SET tenant_id = 'demo123456' WHERE (tenant_id IS NULL OR tenant_id = '') AND (company_name ILIKE '%demo%');"))
            await conn.execute(text("UPDATE tenants SET company_code = 'DEMOLOGISTICS' WHERE (company_code IS NULL OR company_code = '') AND (company_name ILIKE '%demo%');"))
            await conn.execute(text("UPDATE tenants SET tenant_id = SUBSTRING(MD5(id::text || clock_timestamp()::text) FROM 1 FOR 10) WHERE tenant_id IS NULL OR tenant_id = '';"))
            await conn.execute(text("UPDATE tenants SET company_code = UPPER(REGEXP_REPLACE(company_name, '[^a-zA-Z]', '', 'g')) WHERE company_code IS NULL OR company_code = '';"))
            # Drop subdomain column completely from database
            await conn.execute(text("ALTER TABLE tenants DROP COLUMN IF EXISTS subdomain CASCADE;"))
            # Ensure db_name is panther_tenant_companycode
            await conn.execute(text("UPDATE tenants SET db_name = 'panther_tenant_' || LOWER(company_code) WHERE company_code IS NOT NULL AND company_code != '';"))

        async with ControlSessionLocal() as session:
            await seed_plans_and_entitlements(session)

            # Check and auto-provision demo tenant if missing
            from sqlalchemy import select, text, or_
            from app.control.models import Tenant
            from app.control.schemas import TenantProvisionRequest
            from app.control.service import provision_tenant
            from app.core.database import get_tenant_engine

            stmt = select(Tenant).where(
                or_(
                    Tenant.company_code == "DEMOLOGISTICS",
                    Tenant.tenant_id == "demo123456",
                )
            )
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                req = TenantProvisionRequest(
                    company_name=settings.DEMO_TENANT_NAME,
                    company_code="DEMOLOGISTICS",
                    tenant_id="demo123456",
                    admin_email=settings.DEMO_ADMIN_EMAIL,
                    admin_password=settings.DEMO_ADMIN_PASSWORD,
                    admin_full_name="Operations Manager",
                    plan_code="PRO",
                )
                await provision_tenant(req, session)

            # Ensure tenant tables have country column and extra settings
            res = await session.execute(select(Tenant.db_name))
            tenant_dbs = list(res.scalars().all())
            demo_dbs = ["panther_tenant_demologistics", "panther_tenant_demo123456", "panther_tenant_demo"]
            for d_db in demo_dbs:
                if d_db not in tenant_dbs:
                    tenant_dbs.append(d_db)
            for t_db in tenant_dbs:
                try:
                    t_engine = get_tenant_engine(t_db)
                    async with t_engine.begin() as t_conn:
                        await t_conn.run_sync(TenantBase.metadata.create_all)
                        await t_conn.execute(text("ALTER TABLE general_billing_clients ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        await t_conn.execute(text("ALTER TABLE general_consignees ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        await t_conn.execute(text("ALTER TABLE general_consigners ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        await t_conn.execute(text("ALTER TABLE transport_jobs ADD COLUMN IF NOT EXISTS billing_client_id INTEGER REFERENCES general_billing_clients(id);"))
                        await t_conn.execute(text("ALTER TABLE transport_jobs ALTER COLUMN estimated_weight_mt DROP NOT NULL;"))
                        await t_conn.execute(text("ALTER TABLE transport_jobs ALTER COLUMN estimated_packages DROP NOT NULL;"))
                        for cs_col in ["city VARCHAR(100)", "state VARCHAR(100)", "pincode VARCHAR(20)", "phone VARCHAR(50)", "email VARCHAR(255)", "bank_name VARCHAR(150)", "bank_account_no VARCHAR(50)", "bank_ifsc VARCHAR(20)", "logo_url VARCHAR(500)"]:
                            await t_conn.execute(text(f"ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS {cs_col};"))
                        await t_conn.execute(text("ALTER TABLE settings_series_masters ADD COLUMN IF NOT EXISTS series_mode VARCHAR(20) DEFAULT 'AUTOMATIC';"))
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

# Response compression to reduce bandwidth, memory buffer retention, and network latency
app.add_middleware(GZipMiddleware, minimum_size=1000)

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


