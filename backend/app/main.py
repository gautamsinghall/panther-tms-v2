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
            from sqlalchemy import text
            ctrl_lock = await conn.execute(text("SELECT pg_try_advisory_xact_lock(91827364);"))
            has_ctrl_lock = ctrl_lock.scalar()
            if has_ctrl_lock:
                try:
                    await conn.run_sync(ControlBase.metadata.create_all)
                except Exception as ca_err:
                    if "pg_type_typname_nsp_index" not in str(ca_err) and "already exists" not in str(ca_err):
                        raise
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
                await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fastag_credits_left INTEGER DEFAULT 0;"))
                await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sim_wallet_balance NUMERIC(12, 2) DEFAULT 0.00;"))
                # Only initialize to 0 if NULL (new or uninitialized column); never overwrite existing/recharged credits on re-runs
                await conn.execute(text("UPDATE tenants SET fastag_credits_left = 0 WHERE fastag_credits_left IS NULL;"))
                await conn.execute(text("UPDATE tenants SET sim_wallet_balance = 0.00 WHERE sim_wallet_balance IS NULL;"))
                # fastag_wallet_transactions must NEVER be in panther_control; only in tenant DBs
                await conn.execute(text("DROP TABLE IF EXISTS fastag_wallet_transactions;"))
                await conn.execute(text("DROP TABLE IF EXISTS sim_wallet_transactions;"))
                # Backfill existing records if any
                await conn.execute(text("UPDATE tenants SET tenant_id = 'demo123456' WHERE (tenant_id IS NULL OR tenant_id = '') AND (company_name ILIKE '%demo%');"))
                await conn.execute(text("UPDATE tenants SET company_code = 'DEMOLOGISTICS' WHERE (company_code IS NULL OR company_code = '') AND (company_name ILIKE '%demo%');"))
                await conn.execute(text("UPDATE tenants SET tenant_id = SUBSTRING(MD5(id::text || clock_timestamp()::text) FROM 1 FOR 10) WHERE tenant_id IS NULL OR tenant_id = '';"))
                await conn.execute(text("UPDATE tenants SET company_code = UPPER(REGEXP_REPLACE(company_name, '[^a-zA-Z]', '', 'g')) WHERE company_code IS NULL OR company_code = '';"))
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

            # Ensure active tenant tables have required schema and columns
            res = await session.execute(select(Tenant.db_name).where(Tenant.db_name.isnot(None)))
            tenant_dbs = [db for db in res.scalars().all() if db]
            for t_db in tenant_dbs:
                try:
                    t_engine = get_tenant_engine(t_db)
                    async with t_engine.begin() as t_conn:
                        # Transaction advisory lock prevents concurrent worker DDL collisions (UniqueViolationError in pg_type)
                        t_lock = await t_conn.execute(text("SELECT pg_try_advisory_xact_lock(84729104);"))
                        if not t_lock.scalar():
                            # Another worker process is actively running migrations on this tenant database
                            continue

                        try:
                            await t_conn.run_sync(TenantBase.metadata.create_all)
                        except Exception as ca_err:
                            if "pg_type_typname_nsp_index" not in str(ca_err) and "already exists" not in str(ca_err):
                                raise

                        await t_conn.execute(text("ALTER TABLE general_billing_clients ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        await t_conn.execute(text("ALTER TABLE general_consignees ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        await t_conn.execute(text("ALTER TABLE general_consigners ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                        await t_conn.execute(text("ALTER TABLE transport_jobs ADD COLUMN IF NOT EXISTS billing_client_id INTEGER REFERENCES general_billing_clients(id);"))
                        await t_conn.execute(text("ALTER TABLE transport_jobs ALTER COLUMN estimated_weight_mt DROP NOT NULL;"))
                        await t_conn.execute(text("ALTER TABLE transport_jobs ALTER COLUMN estimated_packages DROP NOT NULL;"))
                        await t_conn.execute(text("ALTER TABLE transport_drivers ALTER COLUMN license_number DROP NOT NULL;"))
                        for drv_col in [
                            "dl_status VARCHAR(50)",
                            "vehicle_classes VARCHAR(255)",
                            "valid_from DATE",
                            "valid_upto DATE",
                            "aadhar_no VARCHAR(50)",
                            "pan_no VARCHAR(50)",
                            "license_doc TEXT",
                            "aadhar_doc TEXT",
                            "pan_doc TEXT",
                        ]:
                            await t_conn.execute(text(f"ALTER TABLE transport_drivers ADD COLUMN IF NOT EXISTS {drv_col};"))
                        for cs_col in [
                            "city VARCHAR(100)", "state VARCHAR(100)", "pincode VARCHAR(20)", "phone VARCHAR(50)", "email VARCHAR(255)",
                            "bank_name VARCHAR(150)", "bank_account_no VARCHAR(50)", "bank_ifsc VARCHAR(20)", "bank_branch VARCHAR(150)",
                            "website VARCHAR(255)", "logo_url TEXT", "signature_url TEXT",
                            "signing_authority_name VARCHAR(255)", "signing_authority_designation VARCHAR(255)",
                            "issuing_office VARCHAR(255)", "default_issuing_office_id INTEGER",
                            "ewb_username VARCHAR(100)", "ewb_password VARCHAR(255)", "ewb_gstin VARCHAR(20)",
                            "is_ewb_active BOOLEAN DEFAULT TRUE",
                            "gsp_client_id_override VARCHAR(255)", "gsp_client_secret_override VARCHAR(255)", "gsp_base_url_override VARCHAR(255)",
                            "ft_base_url VARCHAR(255) DEFAULT 'https://api.freighttiger.com/api/tether'",
                            "ft_auth_token TEXT", "is_ft_active BOOLEAN DEFAULT TRUE",
                            "fastag_cooldown_minutes INTEGER DEFAULT 10"
                        ]:
                            await t_conn.execute(text(f"ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS {cs_col};"))
                        await t_conn.execute(text("ALTER TABLE company_settings ALTER COLUMN logo_url TYPE TEXT;"))
                        await t_conn.execute(text("UPDATE company_settings SET ft_base_url = 'https://api.freighttiger.com/api/tether' WHERE ft_base_url LIKE '%integration.freighttiger.com%' OR ft_base_url IS NULL;"))

                        # Freight Tiger SIM Tracking Schema Evolution
                        await t_conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS transport_sim_trips (
                                id SERIAL PRIMARY KEY,
                                feed_unique_id VARCHAR(100) UNIQUE NOT NULL,
                                ft_trip_id BIGINT,
                                lr_id INTEGER REFERENCES transport_lrs(id),
                                vehicle_number VARCHAR(20) NOT NULL,
                                driver_name VARCHAR(150),
                                driver_phone VARCHAR(20) NOT NULL,
                                consent_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
                                is_consent_done BOOLEAN DEFAULT FALSE NOT NULL,
                                status VARCHAR(50) DEFAULT 'Open' NOT NULL,
                                status_code INTEGER DEFAULT 1 NOT NULL,
                                share_url TEXT,
                                last_latitude NUMERIC(9, 6),
                                last_longitude NUMERIC(9, 6),
                                last_location_address TEXT,
                                recorded_at TIMESTAMP WITH TIME ZONE,
                                eta TIMESTAMP WITH TIME ZONE,
                                eta_updated_at TIMESTAMP WITH TIME ZONE,
                                distance_remaining_km NUMERIC(10, 2),
                                total_distance_km NUMERIC(10, 2),
                                origin_address TEXT,
                                destination_address TEXT,
                                route_code VARCHAR(100),
                                last_synced_at TIMESTAMP WITH TIME ZONE,
                                closed_at TIMESTAMP WITH TIME ZONE,
                                close_comment TEXT,
                                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
                            );
                        """))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_sim_trips_feed_unique_id ON transport_sim_trips (feed_unique_id);"))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_sim_trips_vehicle_number ON transport_sim_trips (vehicle_number);"))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_sim_trips_driver_phone ON transport_sim_trips (driver_phone);"))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_sim_trips_lr_id ON transport_sim_trips (lr_id);"))
                        await t_conn.execute(text("ALTER TABLE transport_pod_records ALTER COLUMN document_path TYPE TEXT;"))
                        for br_col in [
                            "pan VARCHAR(10)", "bank_name VARCHAR(150)", "bank_account_no VARCHAR(50)",
                            "bank_ifsc VARCHAR(20)", "bank_branch VARCHAR(150)", "document_notes TEXT"
                        ]:
                            await t_conn.execute(text(f"ALTER TABLE profile_branches ADD COLUMN IF NOT EXISTS {br_col};"))
                        await t_conn.execute(text("ALTER TABLE settings_series_masters ADD COLUMN IF NOT EXISTS series_mode VARCHAR(20) DEFAULT 'AUTOMATIC';"))

                        # FASTag Wallet Transactions Table (Isolated in Tenant DB)
                        await t_conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS fastag_wallet_transactions (
                                id SERIAL PRIMARY KEY,
                                transaction_type VARCHAR(20) NOT NULL,
                                api_calls_count INTEGER NOT NULL DEFAULT 1,
                                rate_per_call NUMERIC(10, 2) NOT NULL DEFAULT 1.50,
                                amount NUMERIC(10, 2) NOT NULL DEFAULT 1.50,
                                vehicle_number VARCHAR(30),
                                description VARCHAR(255) NOT NULL,
                                balance_after INTEGER NOT NULL,
                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                            );
                        """))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_fastag_wallet_tx_created_at ON fastag_wallet_transactions(created_at);"))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_fastag_wallet_tx_vehicle ON fastag_wallet_transactions(vehicle_number);"))

                        # SIM Tracking Schema Evolution & Wallet Transactions (Isolated in Tenant DB)
                        await t_conn.execute(text("ALTER TABLE transport_sim_trips ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ;"))
                        await t_conn.execute(text("ALTER TABLE transport_sim_trips ADD COLUMN IF NOT EXISTS billing_cycles_charged INTEGER DEFAULT 1;"))
                        await t_conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS sim_wallet_transactions (
                                id SERIAL PRIMARY KEY,
                                transaction_type VARCHAR(20) NOT NULL,
                                amount NUMERIC(10, 2) NOT NULL,
                                rate_per_day NUMERIC(10, 2) DEFAULT 8.50 NOT NULL,
                                days_billed INTEGER DEFAULT 1 NOT NULL,
                                vehicle_number VARCHAR(30),
                                trip_id VARCHAR(100),
                                description VARCHAR(255) NOT NULL,
                                balance_after NUMERIC(10, 2) NOT NULL,
                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                            );
                        """))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sim_wallet_tx_created_at ON sim_wallet_transactions(created_at);"))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sim_wallet_tx_vehicle ON sim_wallet_transactions(vehicle_number);"))
                        await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sim_wallet_tx_trip_id ON sim_wallet_transactions(trip_id);"))
                        
                        # Issuing Office Schema Evolution & Backfill
                        for office_col_tbl in [
                            "transport_lrs", "transport_jobs", "transport_hire_challans",
                            "accounts_vouchers", "settings_series_masters"
                        ]:
                            await t_conn.execute(text(f"ALTER TABLE {office_col_tbl} ADD COLUMN IF NOT EXISTS issuing_office_id INTEGER REFERENCES profile_branches(id);"))
                            await t_conn.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{office_col_tbl}_issuing_office_id ON {office_col_tbl} (issuing_office_id);"))

                        # 36-Field Standard LR Schema Evolution
                        for lr_col in [
                            "booking_status VARCHAR(50) DEFAULT 'Booked'",
                            "dispatch_date DATE DEFAULT CURRENT_DATE",
                            "appointment_date DATE",
                            "billing_customer_id INTEGER REFERENCES general_billing_clients(id)",
                            "via VARCHAR(255)",
                            "vehicle_type VARCHAR(100)",
                            "eway_bill_date DATE",
                            "eway_bill_expiry DATE",
                            "invoice_no VARCHAR(100)",
                            "invoice_date DATE",
                            "invoice_value NUMERIC(14, 2) DEFAULT 0.00",
                            "cha_job_number VARCHAR(100)",
                            "bill_of_entry VARCHAR(100)",
                            "container_no VARCHAR(100)",
                            "load_type_id INTEGER REFERENCES general_load_types(id)",
                            "load_type VARCHAR(100)",
                            "payment_type VARCHAR(50) DEFAULT 'To Be Billed'",
                            "eta VARCHAR(100)",
                            "particulars TEXT",
                            "lr_series_id INTEGER REFERENCES settings_series_masters(id)",
                            "invoice_items JSONB DEFAULT '[]'::jsonb",
                        ]:
                            await t_conn.execute(text(f"ALTER TABLE transport_lrs ADD COLUMN IF NOT EXISTS {lr_col};"))

                        # Hire Challan Standard Fields Evolution
                        for hc_col in [
                            "hc_series_id INTEGER REFERENCES settings_series_masters(id)",
                            "vendor_ref_no VARCHAR(100)",
                            "tds_category VARCHAR(100)",
                            "loading_expenses JSONB DEFAULT '[]'::jsonb",
                            "unloading_expenses JSONB DEFAULT '[]'::jsonb",
                        ]:
                            await t_conn.execute(text(f"ALTER TABLE transport_hire_challans ADD COLUMN IF NOT EXISTS {hc_col};"))

                        # Market Vehicle Extended 4-Step Fields Evolution
                        for mv_col in [
                            "ownership_type VARCHAR(50) DEFAULT 'Market Vehicle'",
                            "vehicle_description VARCHAR(255)",
                            "registration_date DATE",
                            "vehicle_class VARCHAR(100)",
                            "engine_number VARCHAR(100)",
                            "chassis_number VARCHAR(100)",
                            "financier VARCHAR(150)",
                            "gvw_kg NUMERIC(10, 2)",
                            "unladen_weight_kg NUMERIC(10, 2)",
                            "emission_norms VARCHAR(50)",
                            "color VARCHAR(50)",
                            "cylinders INTEGER",
                            "seating_capacity INTEGER",
                            "rc_status VARCHAR(50) DEFAULT 'ACTIVE'",
                            "tax_validity DATE",
                            "permit_validity DATE",
                            "has_jack BOOLEAN DEFAULT FALSE",
                            "has_raad BOOLEAN DEFAULT FALSE",
                            "has_pana BOOLEAN DEFAULT FALSE",
                            "has_stepney BOOLEAN DEFAULT FALSE",
                            "has_tarpaulin_rassi BOOLEAN DEFAULT FALSE",
                            "last_service_km INTEGER",
                            "last_service_done_at VARCHAR(150)",
                            "last_service_status VARCHAR(50)",
                            "driver_at_last_service VARCHAR(150)",
                            "driver_phone_at_last_service VARCHAR(20)",
                            "tyre_numbers VARCHAR(100)",
                            "rc_original_status VARCHAR(100)",
                            "rc_copy_doc TEXT",
                            "last_repair_bill_doc TEXT",
                        ]:
                            await t_conn.execute(text(f"ALTER TABLE transport_market_vehicles ADD COLUMN IF NOT EXISTS {mv_col};"))

                        # Seed default Load Types if empty
                        lt_check = await t_conn.execute(text("SELECT COUNT(*) FROM general_load_types;"))
                        if (lt_check.scalar() or 0) == 0:
                            default_load_types = [
                                ("Full Truck Load (FTL)", "FTL", "Full vehicle dedicated exclusively to one consignment"),
                                ("Part Truck Load (PTL / LTL)", "PTL", "Partial truck capacity sharing transit corridor"),
                                ("Parcel / Sundry", "PARCEL", "Small package or loose parcel consignment"),
                                ("Containerized Cargo", "CONTAINER", "ISO Standard 20ft / 40ft maritime and domestic container"),
                                ("Over Dimensional Cargo (ODC)", "ODC", "Heavy machinery / extra width/length cargo exceeding normal trailer"),
                                ("Bulk Cargo", "BULK", "Raw material / uncontained aggregates or loose commodity"),
                            ]
                            for lt_name, lt_code, lt_desc in default_load_types:
                                await t_conn.execute(
                                    text("INSERT INTO general_load_types (name, code, description, is_active, created_at, updated_at) VALUES (:name, :code, :desc, TRUE, NOW(), NOW()) ON CONFLICT (name) DO NOTHING;"),
                                    {"name": lt_name, "code": lt_code, "desc": lt_desc}
                                )

                        # Ensure at least one default branch exists
                        br_check = await t_conn.execute(text("SELECT id FROM profile_branches ORDER BY is_head_office DESC, id ASC LIMIT 1;"))
                        default_branch_id = br_check.scalar()
                        if not default_branch_id:
                            cs_res = await t_conn.execute(text("SELECT company_name, city, state, address, pincode, phone, email, gstin FROM company_settings LIMIT 1;"))
                            cs_row = cs_res.fetchone()
                            c_name = cs_row[0] if cs_row and cs_row[0] else "Head Office"
                            c_city = cs_row[1] if cs_row and cs_row[1] else "Headquarters"
                            c_state = cs_row[2] if cs_row and cs_row[2] else "Delhi"
                            ins_br = await t_conn.execute(
                                text("""
                                    INSERT INTO profile_branches (code, name, city, state, is_head_office, is_active, created_at, updated_at)
                                    VALUES ('HQ', :name, :city, :state, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                    RETURNING id;
                                """),
                                {"name": f"{c_name} (HQ)", "city": c_city, "state": c_state}
                            )
                            default_branch_id = ins_br.scalar()

                        # Backfill existing unassigned records to default branch
                        if default_branch_id:
                            for tbl in ["transport_lrs", "transport_jobs", "transport_hire_challans", "accounts_vouchers", "settings_series_masters"]:
                                await t_conn.execute(
                                    text(f"UPDATE {tbl} SET issuing_office_id = :bid WHERE issuing_office_id IS NULL;"),
                                    {"bid": default_branch_id}
                                )
                            # Backfill user_office_assignments for existing users with no assignments
                            await t_conn.execute(
                                text("""
                                    INSERT INTO user_office_assignments (user_id, office_id, is_default, created_at)
                                    SELECT u.id, :bid, true, CURRENT_TIMESTAMP
                                    FROM users u
                                    WHERE NOT EXISTS (
                                        SELECT 1 FROM user_office_assignments uoa WHERE uoa.user_id = u.id
                                    );
                                """),
                                {"bid": default_branch_id}
                            )

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

# Response compression (added BEFORE CORS so CORS wraps the outermost layer)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration — use allow_origins=["*"] for broadest compatibility.
# NOTE: When allow_origins=["*"], allow_credentials must be False per spec.
# So we use allow_origin_regex to allow all origins WITH credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Explicit preflight handler for any route — guarantees CORS headers on OPTIONS
@app.options("/{full_path:path}")
async def preflight_handler(request: Request, full_path: str):
    from fastapi.responses import Response
    origin = request.headers.get("origin", "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers", "*"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
        },
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
app.include_router(profile_router)
app.include_router(transport_router)


