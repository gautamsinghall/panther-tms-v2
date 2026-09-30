"""
Tenant Database Migration: Add API Center & E-Way Bill fields to company_settings
"""
import asyncio
from sqlalchemy import text
from app.core.config import settings
from app.core.database import control_engine, get_tenant_engine
from app.control.models import Tenant
from sqlalchemy import select

async def run_migration():
    print("Starting API Center migration...")
    async with control_engine.connect() as conn:
        res = await conn.execute(select(Tenant.db_name).where(Tenant.db_name.isnot(None)))
        tenant_dbs = [db for db in res.scalars().all() if db]

    columns = [
        "ewb_username VARCHAR(100)",
        "ewb_password VARCHAR(255)",
        "ewb_gstin VARCHAR(20)",
        "is_ewb_active BOOLEAN DEFAULT TRUE",
        "gsp_client_id_override VARCHAR(255)",
        "gsp_client_secret_override VARCHAR(255)",
        "gsp_base_url_override VARCHAR(255)",
    ]

    for t_db in tenant_dbs:
        print(f"Migrating tenant db: {t_db}...")
        try:
            t_engine = get_tenant_engine(t_db)
            async with t_engine.begin() as t_conn:
                for col in columns:
                    await t_conn.execute(text(f"ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS {col};"))
            print(f"Successfully migrated {t_db}")
        except Exception as e:
            print(f"Error migrating {t_db}: {e}")

    print("API Center migration complete.")

if __name__ == "__main__":
    asyncio.run(run_migration())
