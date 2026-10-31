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
                try:
                    await conn.run_sync(TenantBase.metadata.create_all)
                except Exception as ca_err:
                    logger.debug(f"Metadata create_all notice on {db_name}: {ca_err}")

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
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS tax_breakup JSONB DEFAULT '{}'::jsonb;",
                    "ALTER TABLE accounts_vouchers ADD COLUMN IF NOT EXISTS against_voucher_id INTEGER;",
                    "ALTER TABLE transport_lrs ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT FALSE;",
                    """
                    CREATE TABLE IF NOT EXISTS accounts_bill_allocations (
                        id SERIAL PRIMARY KEY,
                        voucher_id INTEGER NOT NULL REFERENCES accounts_vouchers(id) ON DELETE CASCADE,
                        invoice_id INTEGER NOT NULL REFERENCES accounts_vouchers(id) ON DELETE CASCADE,
                        allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                        tds_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                        discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                        total_settled NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                        adjustment_type VARCHAR(50) NOT NULL DEFAULT 'AGAINST_REF',
                        notes TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """,
                    "CREATE INDEX IF NOT EXISTS ix_accounts_vouchers_payment_status ON accounts_vouchers (payment_status);",
                    "CREATE INDEX IF NOT EXISTS ix_accounts_vouchers_due_date ON accounts_vouchers (due_date);",
                    "CREATE INDEX IF NOT EXISTS ix_accounts_vouchers_against_voucher_id ON accounts_vouchers (against_voucher_id);",
                    "CREATE INDEX IF NOT EXISTS ix_transport_lrs_is_billed ON transport_lrs (is_billed);",
                    "CREATE INDEX IF NOT EXISTS ix_accounts_bill_allocations_voucher_id ON accounts_bill_allocations (voucher_id);",
                    "CREATE INDEX IF NOT EXISTS ix_accounts_bill_allocations_invoice_id ON accounts_bill_allocations (invoice_id);",
                    "UPDATE accounts_vouchers SET balance_amount = net_amount WHERE balance_amount IS NULL OR (balance_amount = 0.00 AND (paid_amount = 0.00 OR paid_amount IS NULL));",
                    "UPDATE accounts_vouchers SET payment_status = 'UNPAID' WHERE payment_status IS NULL;",
                    "UPDATE accounts_vouchers SET gst_treatment = 'FCM' WHERE gst_treatment IS NULL;",
                    "ALTER TABLE accounts_voucher_items ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20);",
                    "ALTER TABLE accounts_voucher_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00;",
                ]
                for stmt in statements:
                    try:
                        await conn.execute(text(stmt))
                    except Exception as col_err:
                        logger.debug(f"Statement execution notice: {col_err}")

            logger.info(f"Successfully migrated {db_name}!")
        except Exception as e:
            logger.warning(f"Error migrating {db_name}: {e}")

    await close_all_connections()


if __name__ == "__main__":
    asyncio.run(run_migration())
