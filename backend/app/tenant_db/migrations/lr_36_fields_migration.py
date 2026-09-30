import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import ControlSessionLocal, get_tenant_engine, close_all_connections
from app.control.models import Tenant
from app.tenant_db.base import TenantBase
import app.tenant_db.models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lr_migration")

async def run_migration():
    logger.info("Starting LR 36-field & Load Type migration...")
    tenant_dbs = []
    try:
        async with ControlSessionLocal() as c_session:
            stmt = select(Tenant.db_name)
            result = await c_session.execute(stmt)
            tenant_dbs = list(result.scalars().all())
    except Exception as e:
        logger.warning(f"Could not fetch tenants from control DB: {e}")

    demo_db = f"panther_tenant_{settings.DEMO_COMPANY_CODE.lower()}"
    if demo_db not in tenant_dbs:
        tenant_dbs.append(demo_db)

    for db_name in tenant_dbs:
        if not db_name:
            continue
        logger.info(f"Migrating tenant database: {db_name}")
        try:
            engine = get_tenant_engine(db_name)
            async with engine.begin() as conn:
                await conn.run_sync(TenantBase.metadata.create_all)
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
                    await conn.execute(text(f"ALTER TABLE transport_lrs ADD COLUMN IF NOT EXISTS {lr_col};"))

                lt_check = await conn.execute(text("SELECT COUNT(*) FROM general_load_types;"))
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
                        await conn.execute(
                            text("INSERT INTO general_load_types (name, code, description, is_active, created_at, updated_at) VALUES (:name, :code, :desc, TRUE, NOW(), NOW()) ON CONFLICT (name) DO NOTHING;"),
                            {"name": lt_name, "code": lt_code, "desc": lt_desc}
                        )
            logger.info(f"Successfully migrated {db_name}")
        except Exception as e:
            logger.error(f"Error migrating {db_name}: {e}")

    await close_all_connections()
    logger.info("LR & Load Type migration finished.")

if __name__ == "__main__":
    asyncio.run(run_migration())
