import asyncio
import logging
from app.core.config import settings
from app.core.database import get_tenant_engine, close_all_connections
from app.tenant_db.base import TenantBase
import app.tenant_db.models  # Ensure all models are registered

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("phase2.migration")

async def run_migration():
    demo_db = f"panther_tenant_{settings.DEMO_TENANT_SUBDOMAIN}"
    logger.info(f"Connecting to {demo_db} and applying Phase 2 Transport tables...")
    engine = get_tenant_engine(demo_db)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    logger.info(f"Phase 2 Transport tables successfully created in {demo_db}!")
    await close_all_connections()

if __name__ == "__main__":
    asyncio.run(run_migration())
