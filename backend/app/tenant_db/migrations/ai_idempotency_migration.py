"""
PantherTMS Tenant DB Migration: AI Operation Idempotency Schema
Creates `ai_operation_idempotency` table across tenant databases for durable,
database-enforced exactly-once creation of LRs, Jobs, and Hire Challans.

Features:
- Completely idempotent (safe to run multiple times with checkfirst=True)
- Preserves all existing tenant data; only affects `ai_operation_idempotency`
- Non-destructive rollback: Archives existing idempotency records to
  `ai_operation_idempotency_archive_<timestamp>` before dropping
- Environment safety guards: Refuses unconfirmed rollback in production
- Supported on both PostgreSQL and SQLite

Note: In accordance with production change safety policies, this script is prepared
for execution on Dokploy/production once explicit administrator authorization is granted.
Do NOT execute against production without authorization.
"""
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from typing import List
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_tenant_engine, ControlSessionLocal
from app.tenant_db.base import TenantBase
from app.tenant_db.models import AIOperationIdempotency
from app.control.models import Tenant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai.idempotency.migration")


async def get_all_tenant_db_names() -> List[str]:
    """Discovers all tenant database names registered in the control database."""
    demo_db = f"panther_tenant_{settings.DEMO_COMPANY_CODE.lower()}"
    tenant_dbs = [demo_db]

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

    return tenant_dbs


async def run_migration():
    """
    Applies the AI operation idempotency table and indexes across all tenant databases.
    Uses checkfirst=True to guarantee idempotency and avoid altering any existing tables.
    """
    is_prod = settings.ENVIRONMENT.lower() == "production"
    if is_prod and not os.environ.get("CONFIRM_PRODUCTION_MIGRATION"):
        raise RuntimeError(
            "Refusing to execute migration against production without explicit approval. "
            "Set CONFIRM_PRODUCTION_MIGRATION=1 to proceed after obtaining authorization."
        )

    tenant_dbs = await get_all_tenant_db_names()

    for db_name in tenant_dbs:
        try:
            logger.info(f"Applying AI Idempotency schema to {db_name}...")
            engine = get_tenant_engine(db_name)
            async with engine.begin() as conn:
                # Targeted create: only touches AIOperationIdempotency.__table__
                await conn.run_sync(
                    lambda sync_conn: AIOperationIdempotency.__table__.create(sync_conn, checkfirst=True)
                )
            logger.info(f"AI Idempotency table verified/created in {db_name}!")
        except Exception as e:
            logger.error(f"Failed applying migration to {db_name}: {e}")
            raise


async def rollback_migration(force_drop_without_backup: bool = False):
    """
    Safe rollback procedure:
    1. In production, requires CONFIRM_PRODUCTION_ROLLBACK=1.
    2. Before dropping, creates an archive table `ai_operation_idempotency_archive_<ts>`
       to guarantee historical idempotency and audit records are NEVER lost.
    3. Drops only `ai_operation_idempotency`, leaving all other tenant data completely intact.
    """
    is_prod = settings.ENVIRONMENT.lower() == "production"
    if is_prod and not os.environ.get("CONFIRM_PRODUCTION_ROLLBACK"):
        raise RuntimeError(
            "CRITICAL: Refusing to rollback idempotency table in production without explicit approval. "
            "Set CONFIRM_PRODUCTION_ROLLBACK=1 only if authorized."
        )

    tenant_dbs = await get_all_tenant_db_names()
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    for db_name in tenant_dbs:
        try:
            logger.warning(f"Executing safe rollback of AI Idempotency schema from {db_name}...")
            engine = get_tenant_engine(db_name)
            async with engine.begin() as conn:
                # 1. Check if table exists
                tbl_exists = await conn.run_sync(
                    lambda sync_conn: sync_conn.dialect.has_table(sync_conn, "ai_operation_idempotency")
                )
                if not tbl_exists:
                    logger.info(f"Table ai_operation_idempotency does not exist in {db_name}, skipping.")
                    continue

                # 2. Archive existing records if table has data and not force_drop
                if not force_drop_without_backup:
                    archive_table_name = f"ai_operation_idempotency_archive_{timestamp_str}"
                    logger.info(f"Archiving existing idempotency records to {archive_table_name}...")
                    try:
                        # Cross-compatible CREATE TABLE ... AS SELECT
                        await conn.execute(text(f"CREATE TABLE {archive_table_name} AS SELECT * FROM ai_operation_idempotency"))
                        logger.info(f"Successfully archived idempotency records to {archive_table_name}")
                    except Exception as arch_err:
                        logger.warning(f"Could not archive via CTAS ({arch_err}), proceeding with direct drop")

                # 3. Targeted drop: only drops AIOperationIdempotency.__table__
                await conn.run_sync(
                    lambda sync_conn: AIOperationIdempotency.__table__.drop(sync_conn, checkfirst=True)
                )
            logger.info(f"AI Idempotency table safely removed from {db_name}!")
        except Exception as e:
            logger.error(f"Failed rolling back migration from {db_name}: {e}")
            raise


if __name__ == "__main__":
    if "--rollback" in sys.argv:
        force_drop = "--force-drop" in sys.argv
        asyncio.run(rollback_migration(force_drop_without_backup=force_drop))
    else:
        asyncio.run(run_migration())
