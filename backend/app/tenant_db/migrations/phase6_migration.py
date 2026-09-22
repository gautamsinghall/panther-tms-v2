import asyncio
import logging
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import (
    get_tenant_engine, get_tenant_session_maker,
    control_engine, ControlSessionLocal, close_all_connections
)
from app.control.models import ControlBase
from app.control.service import seed_plans_and_entitlements
from app.tenant_db.base import TenantBase
import app.tenant_db.models as models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("phase6.migration")


async def run_migration():
    # 1. Sync Control DB plans & entitlements
    logger.info("Syncing control-plane tables, plans, and entitlements...")
    async with control_engine.begin() as conn:
        await conn.run_sync(ControlBase.metadata.create_all)
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ACTIVE';"))
        await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(100);"))

    async with ControlSessionLocal() as c_session:
        await seed_plans_and_entitlements(c_session)
    logger.info("Control DB synced successfully.")


    # 2. Sync Demo Tenant DB tables
    demo_db = f"panther_tenant_{settings.DEMO_TENANT_SUBDOMAIN}"
    logger.info(f"Connecting to {demo_db} and creating Phase 6 tables...")
    t_engine = get_tenant_engine(demo_db)

    async with t_engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        for col in [
            "city VARCHAR(100)",
            "state VARCHAR(100)",
            "pincode VARCHAR(20)",
            "phone VARCHAR(50)",
            "email VARCHAR(255)",
            "bank_name VARCHAR(150)",
            "bank_account_no VARCHAR(50)",
            "bank_ifsc VARCHAR(20)",
            "logo_url VARCHAR(500)"
        ]:
            await conn.execute(text(f"ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS {col};"))

    session_factory = get_tenant_session_maker(demo_db)
    async with session_factory() as session:
        # A. Series Categories
        categories_data = [
            {"code": "TRANSPORT", "name": "Transport Documents", "description": "LR, Hire Challan, POD, E-Way Bill"},
            {"code": "ACCOUNTS", "name": "Accounting Vouchers", "description": "Receipts, Payments, Contra, General Vouchers"},
            {"code": "BILLING", "name": "Invoices & Notes", "description": "Transport & General Invoices, Credit/Debit Notes"},
        ]
        created_cats = {}
        for cat_data in categories_data:
            stmt = select(models.SeriesCategory).where(models.SeriesCategory.code == cat_data["code"])
            res = await session.execute(stmt)
            cat = res.scalar_one_or_none()
            if not cat:
                cat = models.SeriesCategory(**cat_data)
                session.add(cat)
                await session.flush()
            created_cats[cat_data["code"]] = cat.id

        # B. Series Masters
        series_data = [
            {
                "category_id": created_cats.get("TRANSPORT"),
                "document_type": "LR",
                "prefix": "LR-2026-",
                "suffix": "",
                "starting_number": 1,
                "current_number": 85,
                "financial_year": "2026-2027",
                "is_active": True,
            },
            {
                "category_id": created_cats.get("TRANSPORT"),
                "document_type": "HIRE_CHALLAN",
                "prefix": "HC-2026-",
                "suffix": "",
                "starting_number": 1,
                "current_number": 57,
                "financial_year": "2026-2027",
                "is_active": True,
            },
            {
                "category_id": created_cats.get("BILLING"),
                "document_type": "INVOICE",
                "prefix": "INV-2026-",
                "suffix": "",
                "starting_number": 1,
                "current_number": 43,
                "financial_year": "2026-2027",
                "is_active": True,
            },
            {
                "category_id": created_cats.get("ACCOUNTS"),
                "document_type": "RECEIPT_VOUCHER",
                "prefix": "RCP-2026-",
                "suffix": "",
                "starting_number": 1,
                "current_number": 29,
                "financial_year": "2026-2027",
                "is_active": True,
            },
            {
                "category_id": created_cats.get("ACCOUNTS"),
                "document_type": "PAYMENT_VOUCHER",
                "prefix": "PAY-2026-",
                "suffix": "",
                "starting_number": 1,
                "current_number": 15,
                "financial_year": "2026-2027",
                "is_active": True,
            },
        ]
        for s_data in series_data:
            stmt = select(models.SeriesMaster).where(
                models.SeriesMaster.document_type == s_data["document_type"],
                models.SeriesMaster.financial_year == s_data["financial_year"]
            )
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.SeriesMaster(**s_data))

        # C. Admin Settings
        admin_settings_data = [
            {"setting_key": "timezone", "setting_value": "Asia/Kolkata (IST +5:30)", "category": "LOCALIZATION", "description": "Primary operating timezone"},
            {"setting_key": "currency", "setting_value": "INR (₹)", "category": "LOCALIZATION", "description": "Base financial currency"},
            {"setting_key": "sms_gateway", "setting_value": "Karix / Gupshup Enterprise API", "category": "GATEWAY", "description": "SMS dispatch alert gateway"},
            {"setting_key": "fastag_gateway", "setting_value": "NPCI NETC / ICICI Bank Gateway", "category": "GATEWAY", "description": "Automated toll reconciliation provider"},
            {"setting_key": "auto_lr_numbering", "setting_value": "true", "category": "SYSTEM", "description": "Automatically increment LR series numbers on booking"},
        ]
        for a_data in admin_settings_data:
            stmt = select(models.AdminSetting).where(models.AdminSetting.setting_key == a_data["setting_key"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.AdminSetting(**a_data))

        # D. Branches
        branches_data = [
            {
                "code": "B-MUM-01",
                "name": "Mumbai Central Hub & HQ",
                "city": "Navi Mumbai",
                "state": "Maharashtra",
                "address": "Plot 42, Transport Nagar, Vashi",
                "pincode": "400703",
                "phone": "+91 22 2345 6789",
                "email": "mumbai@demo.com",
                "gstin": "27AABCP1234F1Z5",
                "is_head_office": True,
                "is_active": True,
            },
            {
                "code": "B-DEL-01",
                "name": "Delhi NCR Transshipment Facility",
                "city": "New Delhi",
                "state": "Delhi",
                "address": "Sanjay Gandhi Transport Nagar, GT Karnal Road",
                "pincode": "110042",
                "phone": "+91 11 4567 8901",
                "email": "delhi@demo.com",
                "gstin": "07AABCP1234F1Z1",
                "is_head_office": False,
                "is_active": True,
            },
            {
                "code": "B-BLR-01",
                "name": "Bangalore Logistics Center",
                "city": "Bengaluru",
                "state": "Karnataka",
                "address": "Peenya Industrial Area, Phase 2",
                "pincode": "560058",
                "phone": "+91 80 3456 7890",
                "email": "bangalore@demo.com",
                "gstin": "29AABCP1234F1Z9",
                "is_head_office": False,
                "is_active": True,
            },
        ]
        for b_data in branches_data:
            stmt = select(models.Branch).where(models.Branch.code == b_data["code"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.Branch(**b_data))

        # E. Email Setting
        stmt = select(models.EmailSetting).limit(1)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(models.EmailSetting(
                smtp_host="smtp.mailgun.org",
                smtp_port=587,
                smtp_user="postmaster@demo.panthertms.com",
                smtp_password="demo_secure_smtp_password",
                sender_email="dispatch@demo.com",
                sender_name="Demo Logistics Dispatch",
                use_tls=True,
                is_active=True,
            ))

        # F. Initial User Activity
        user_stmt = select(models.User).where(models.User.email == "admin@demo.com")
        admin_user = (await session.execute(user_stmt)).scalar_one_or_none()
        if admin_user:
            act_stmt = select(models.UserActivity).limit(1)
            if not (await session.execute(act_stmt)).scalar_one_or_none():
                session.add(models.UserActivity(
                    user_id=admin_user.id,
                    user_email=admin_user.email,
                    user_role=admin_user.role,
                    action="WORKSPACE_INITIALIZED",
                    module="settings",
                    entity_type="tenant",
                    entity_id=settings.DEMO_TENANT_SUBDOMAIN,
                    details="Phase 6 Billing, Settings & Profile initialized successfully",
                    ip_address="127.0.0.1",
                    created_at=datetime.now(timezone.utc),
                ))

        await session.commit()

    logger.info("Phase 6 Migration & Seeding completed successfully!")
    await close_all_connections()


if __name__ == "__main__":
    asyncio.run(run_migration())
