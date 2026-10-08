import asyncio
import logging
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_tenant_engine, get_control_db, ControlSessionLocal
from app.tenant_db.base import TenantBase
import app.tenant_db.models  # Ensure all models are registered
from app.control.models import Tenant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastag.migration")


async def run_migration():
    # 1. Apply to demo tenant DB
    demo_db = f"panther_tenant_{settings.DEMO_COMPANY_CODE.lower()}"
    tenant_dbs = [demo_db]

    # 2. Also check if control plane has other tenant databases
    try:
        async with ControlSessionLocal() as session:
            from sqlalchemy import select
            res = await session.execute(select(Tenant.db_name).where(Tenant.db_name.isnot(None)))
            found_dbs = res.scalars().all()
            for db in found_dbs:
                if db and db not in tenant_dbs:
                    tenant_dbs.append(db)
    except Exception as e:
        logger.warning(f"Could not read control DB tenants: {e}")

    for db_name in tenant_dbs:
        try:
            logger.info(f"Applying FASTag Tracking schema to {db_name}...")
            engine = get_tenant_engine(db_name)
            async with engine.begin() as conn:
                await conn.run_sync(TenantBase.metadata.create_all)
            logger.info(f"FASTag Tracking tables successfully verified/created in {db_name}!")
        except Exception as e:
            logger.error(f"Failed applying migration to {db_name}: {e}")


if __name__ == "__main__":
    asyncio.run(run_migration())
