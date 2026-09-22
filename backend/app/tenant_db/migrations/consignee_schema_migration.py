import asyncio
import logging
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import control_engine, ControlSessionLocal, get_tenant_engine, close_all_connections
from app.control.models import Tenant
from app.tenant_db.base import TenantBase
import app.tenant_db.models  # Ensure all models are loaded

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("consignee.migration")

async def run_migration():
    logger.info("Starting consignee & consigner schema migration across all tenant databases...")
    
    # 1. Fetch all tenant DBs from control plane
    async with ControlSessionLocal() as c_session:
        stmt = select(Tenant.db_name)
        result = await c_session.execute(stmt)
        tenant_dbs = list(result.scalars().all())

    # Fallback to demo DB if no tenants returned
    demo_db = f"panther_tenant_{settings.DEMO_TENANT_SUBDOMAIN}"
    if demo_db not in tenant_dbs:
        tenant_dbs.append(demo_db)

    logger.info(f"Target tenant databases: {tenant_dbs}")

    for db_name in tenant_dbs:
        logger.info(f"Migrating tenant database: {db_name}")
        engine = get_tenant_engine(db_name)
        try:
            async with engine.begin() as conn:
                # Ensure all tables exist
                await conn.run_sync(TenantBase.metadata.create_all)
                # Alter general_consignees and general_consigners to ensure country column exists
                await conn.execute(text("ALTER TABLE general_consignees ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                await conn.execute(text("ALTER TABLE general_consigners ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
            logger.info(f"Successfully migrated {db_name}")
        except Exception as e:
            logger.error(f"Error migrating {db_name}: {e}")

    await close_all_connections()
    logger.info("Consignee schema migration complete!")

if __name__ == "__main__":
    asyncio.run(run_migration())
