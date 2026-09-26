import asyncio
import logging
from sqlalchemy import select
from app.core.config import settings
from app.core.database import control_engine, ControlSessionLocal, close_all_connections
from app.control.models import ControlBase, Tenant
from app.control.schemas import TenantProvisionRequest
from app.control.service import seed_plans_and_entitlements, provision_tenant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("panther.seed")

async def seed_demo():
    logger.info("Starting PantherTMS Phase 0 Seeding...")

    # 1. Initialize control database tables
    async with control_engine.begin() as conn:
        logger.info("Creating control-plane tables if not exist...")
        await conn.run_sync(ControlBase.metadata.create_all)

    # 2. Seed plans
    async with ControlSessionLocal() as session:
        logger.info("Seeding subscription plans & entitlements...")
        await seed_plans_and_entitlements(session)

        # 3. Check if demo tenant already exists
        stmt = select(Tenant).where(Tenant.subdomain == settings.DEMO_TENANT_SUBDOMAIN)
        result = await session.execute(stmt)
        demo_tenant = result.scalar_one_or_none()

        if demo_tenant:
            logger.info(f"Demo tenant '{settings.DEMO_TENANT_SUBDOMAIN}' already exists. (DB: {demo_tenant.db_name})")
            from sqlalchemy import text
            from app.core.database import get_tenant_engine
            try:
                demo_engine = get_tenant_engine(demo_tenant.db_name)
                async with demo_engine.begin() as conn:
                    await conn.execute(
                        text("UPDATE users SET is_active = true WHERE lower(email) = lower(:email);"),
                        {"email": settings.DEMO_ADMIN_EMAIL.lower().strip()}
                    )
                logger.info(f"Ensured demo admin '{settings.DEMO_ADMIN_EMAIL}' is active.")
            except Exception as e:
                logger.warning(f"Could not reactivate demo admin in {demo_tenant.db_name}: {e}")
        else:
            logger.info(f"Provisioning demo tenant '{settings.DEMO_TENANT_SUBDOMAIN}'...")
            req = TenantProvisionRequest(
                subdomain=settings.DEMO_TENANT_SUBDOMAIN,
                company_name=settings.DEMO_TENANT_NAME,
                admin_email=settings.DEMO_ADMIN_EMAIL,
                admin_password=settings.DEMO_ADMIN_PASSWORD,
                admin_full_name="Company Admin",
                plan_code="PRO",
            )
            demo_tenant = await provision_tenant(req, session)
            logger.info(f"Demo tenant successfully provisioned with ID {demo_tenant.id}!")

    await close_all_connections()
    logger.info("PantherTMS Phase 0 Seeding Complete.")

if __name__ == "__main__":
    asyncio.run(seed_demo())
