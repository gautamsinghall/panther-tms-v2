"""
PantherTMS Tenant DB Migration: Transport Invoice & Tally Prime Bookkeeping Schema
Adds bill-wise tracking, payment status, GST treatment, and bill allocation table across tenant databases.
"""
import asyncio
import logging
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_tenant_engine, ControlSessionLocal, close_all_connections
from app.tenant_db.base import TenantBase
from app.control.models import Tenant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transport.invoice.migration")


async def run_migration():
    demo_db = f"panther_tenant_{settings.DEMO_COMPANY_CODE.lower()}"
    tenant_dbs = [demo_db]

    try:
        async with ControlSessionLocal() as session:
            from sqlalchemy import select
            res = await session.execute(select(Tenant.db_name).where(Tenant.db_name.isnot(None)))
            for db in res.scalars().all():
                if db and db not in tenant_dbs:
                    tenant_dbs.append(db)
    except Exception as e:
        logger.warning(f"Could not read control DB tenants: {e}")

    for db_name in tenant_dbs:
        logger.info(f"Applying Transport Invoice & Tally schema migration to {db_name}...")
        try:
            engine = get_tenant_engine(db_name)
            async with engine.begin() as conn:
                await conn.run_sync(TenantBase.metadata.create_all)
                # Ensure columns for existing tables
                statements = [
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS due_date DATE;",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS credit_period_days INTEGER DEFAULT 30;",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0.00;",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0.00;",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'UNPAID';",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS gst_treatment VARCHAR(50) DEFAULT 'FCM';",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100);",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS party_gstin VARCHAR(15);",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100);",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS tax_breakup JSON;",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS against_voucher_id INTEGER;",
                    "ALTER TABLE transport_lrs ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT FALSE;",
                ]
                for stmt in statements:
                    try:
                        await conn.execute(text(stmt))
                    except Exception as col_err:
                        logger.debug(f"Column check statement '{stmt}' result: {col_err}")

            logger.info(f"Successfully migrated {db_name}!")
        except Exception as e:
            logger.warning(f"Error migrating {db_name}: {e}")

    await close_all_connections()


if __name__ == "__main__":
    asyncio.run(run_migration())

