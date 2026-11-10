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
        "is_gst_active BOOLEAN DEFAULT TRUE",
        "is_pan_active BOOLEAN DEFAULT TRUE",
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
                await t_conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS tax_api_transactions (
                        id SERIAL PRIMARY KEY,
                        api_type VARCHAR(10) NOT NULL,
                        query_value VARCHAR(50) NOT NULL,
                        state_code VARCHAR(10),
                        trade_name VARCHAR(255),
                        legal_name VARCHAR(255),
                        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
                        source VARCHAR(50) DEFAULT 'API_CENTER',
                        description VARCHAR(255),
                        credits_deducted INTEGER DEFAULT 1,
                        balance_after INTEGER,
                        counter_after INTEGER NOT NULL DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
                    );
                """))
                await t_conn.execute(text("ALTER TABLE tax_api_transactions ADD COLUMN IF NOT EXISTS credits_deducted INTEGER DEFAULT 1;"))
                await t_conn.execute(text("ALTER TABLE tax_api_transactions ADD COLUMN IF NOT EXISTS balance_after INTEGER;"))
                await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tax_api_transactions_api_type ON tax_api_transactions (api_type);"))
                await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tax_api_transactions_query_value ON tax_api_transactions (query_value);"))
                await t_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tax_api_transactions_created_at ON tax_api_transactions (created_at);"))
            print(f"Successfully migrated {t_db}")
        except Exception as e:
            print(f"Error migrating {t_db}: {e}")

    print("API Center migration complete.")

if __name__ == "__main__":
    asyncio.run(run_migration())
