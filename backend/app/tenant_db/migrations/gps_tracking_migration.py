"""
Tenant Database Migration: Add WheelsEye GPS Tracking fields to company_settings
"""
import asyncio
from sqlalchemy import text
from app.core.database import control_engine, get_tenant_engine
from app.control.models import Tenant
from sqlalchemy import select

async def run_migration():
    print("Starting WheelsEye GPS Tracking migration...")
    async with control_engine.connect() as conn:
        res = await conn.execute(select(Tenant.db_name).where(Tenant.db_name.isnot(None)))
        tenant_dbs = [db for db in res.scalars().all() if db]

    columns = [
        "wheelseye_api_token VARCHAR(255)",
        "wheelseye_base_url VARCHAR(255) DEFAULT 'https://api.wheelseye.com'",
        "is_wheelseye_active BOOLEAN DEFAULT TRUE",
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

    print("WheelsEye GPS Tracking migration complete.")

if __name__ == "__main__":
    asyncio.run(run_migration())

