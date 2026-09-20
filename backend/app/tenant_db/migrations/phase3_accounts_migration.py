import asyncio
import logging
from decimal import Decimal
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_tenant_engine, get_tenant_session_maker, close_all_connections
from app.tenant_db.base import TenantBase
import app.tenant_db.models as models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("phase3.migration")

async def run_migration():
    demo_db = f"panther_tenant_{settings.DEMO_TENANT_SUBDOMAIN}"
    logger.info(f"Connecting to {demo_db} and creating Phase 3 Accounts, Misc Masters, and E-Invoicing tables...")
    engine = get_tenant_engine(demo_db)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    logger.info("Phase 3 tables created. Now seeding standard Chart of Accounts & Masters...")
    session_factory = get_tenant_session_maker(demo_db)
    async with session_factory() as session:
        # 1. Primary Groups
        primary_groups_data = [
            {"code": "ASSET", "name": "Assets", "nature": "DEBIT", "description": "Economic resources owned by the business"},
            {"code": "LIABILITY", "name": "Liabilities", "nature": "CREDIT", "description": "Obligations and debts of the business"},
            {"code": "EQUITY", "name": "Equity & Capital", "nature": "CREDIT", "description": "Owners equity and retained earnings"},
            {"code": "INCOME", "name": "Income / Revenue", "nature": "CREDIT", "description": "Freight and operational revenue"},
            {"code": "EXPENSE", "name": "Expenses", "nature": "DEBIT", "description": "Direct and indirect operating expenses"},
        ]
        primary_map = {}
        for pg_data in primary_groups_data:
            stmt = select(models.PrimaryGroup).where(models.PrimaryGroup.code == pg_data["code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                existing = models.PrimaryGroup(**pg_data)
                session.add(existing)
                await session.flush()
            primary_map[pg_data["code"]] = existing.id

        # 2. Groups in Primary
        groups_data = [
            {"primary": "ASSET", "code": "CA", "name": "Current Assets", "description": "Short-term operating assets"},
            {"primary": "ASSET", "code": "DEBTORS", "name": "Sundry Debtors", "description": "Trade receivables from clients"},
            {"primary": "ASSET", "code": "BANK", "name": "Bank Accounts", "description": "Operating bank balances"},
            {"primary": "ASSET", "code": "CASH", "name": "Cash-in-hand", "description": "Petty cash and drawer balances"},
            {"primary": "LIABILITY", "code": "CL", "name": "Current Liabilities", "description": "Short term trade obligations"},
            {"primary": "LIABILITY", "code": "CREDITORS", "name": "Sundry Creditors", "description": "Trade payables to suppliers and vehicle owners"},
            {"primary": "LIABILITY", "code": "TAX", "name": "Duties & Taxes", "description": "GST output, input, and TDS payable"},
            {"primary": "INCOME", "code": "REV_DIRECT", "name": "Direct Income", "description": "Freight charges and transport billing"},
            {"primary": "INCOME", "code": "REV_INDIRECT", "name": "Indirect Income", "description": "Interest and non-freight revenue"},
            {"primary": "EXPENSE", "code": "EXP_DIRECT", "name": "Direct Expenses", "description": "Truck hire, diesel, driver allowances, toll, loading"},
            {"primary": "EXPENSE", "code": "EXP_INDIRECT", "name": "Indirect Expenses", "description": "Office rent, salaries, utilities, marketing"},
        ]
        group_map = {}
        for g_data in groups_data:
            stmt = select(models.GroupInPrimary).where(models.GroupInPrimary.code == g_data["code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                existing = models.GroupInPrimary(
                    primary_group_id=primary_map[g_data["primary"]],
                    code=g_data["code"],
                    name=g_data["name"],
                    description=g_data["description"]
                )
                session.add(existing)
                await session.flush()
            group_map[g_data["code"]] = existing.id

        # 3. Tax Categories
        taxes_data = [
            {"code": "GST_5", "name": "GST 5%", "igst_rate": Decimal("5.00"), "cgst_rate": Decimal("2.50"), "sgst_rate": Decimal("2.50"), "is_rcm": False},
            {"code": "GST_12", "name": "GST 12%", "igst_rate": Decimal("12.00"), "cgst_rate": Decimal("6.00"), "sgst_rate": Decimal("6.00"), "is_rcm": False},
            {"code": "GST_18", "name": "GST 18%", "igst_rate": Decimal("18.00"), "cgst_rate": Decimal("9.00"), "sgst_rate": Decimal("9.00"), "is_rcm": False},
            {"code": "GST_28", "name": "GST 28%", "igst_rate": Decimal("28.00"), "cgst_rate": Decimal("14.00"), "sgst_rate": Decimal("14.00"), "is_rcm": False},
            {"code": "GTA_RCM_5", "name": "GST 5% (GTA RCM)", "igst_rate": Decimal("5.00"), "cgst_rate": Decimal("2.50"), "sgst_rate": Decimal("2.50"), "is_rcm": True},
            {"code": "EXEMPT", "name": "Exempt / Nil Rated", "igst_rate": Decimal("0.00"), "cgst_rate": Decimal("0.00"), "sgst_rate": Decimal("0.00"), "is_rcm": False},
        ]
        tax_map = {}
        for t_data in taxes_data:
            stmt = select(models.TaxCategory).where(models.TaxCategory.code == t_data["code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                existing = models.TaxCategory(**t_data)
                session.add(existing)
                await session.flush()
            tax_map[t_data["code"]] = existing.id

        # 4. Charge Heads
        charges_data = [
            {"code": "FREIGHT", "name": "Freight Charges", "charge_type": "ADDITION", "default_rate": Decimal("0.00"), "tax_category_id": tax_map["GST_12"]},
            {"code": "HAMALI", "name": "Hamali / Loading Charges", "charge_type": "ADDITION", "default_rate": Decimal("0.00"), "tax_category_id": tax_map["GST_18"]},
            {"code": "UNLOADING", "name": "Unloading Charges", "charge_type": "ADDITION", "default_rate": Decimal("0.00"), "tax_category_id": tax_map["GST_18"]},
            {"code": "DETENTION", "name": "Detention Charges", "charge_type": "ADDITION", "default_rate": Decimal("0.00"), "tax_category_id": tax_map["GST_18"]},
            {"code": "TOLL", "name": "Toll Charges", "charge_type": "ADDITION", "default_rate": Decimal("0.00"), "tax_category_id": tax_map["EXEMPT"]},
            {"code": "DIESEL_SUR", "name": "Diesel Surcharge", "charge_type": "ADDITION", "default_rate": Decimal("0.00"), "tax_category_id": tax_map["GST_18"]},
            {"code": "DISCOUNT", "name": "Consignment Discount", "charge_type": "DEDUCTION", "default_rate": Decimal("0.00"), "tax_category_id": None},
        ]
        for c_data in charges_data:
            stmt = select(models.ChargeHead).where(models.ChargeHead.code == c_data["code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                existing = models.ChargeHead(**c_data)
                session.add(existing)
                await session.flush()

        # 5. Core Accounts
        accounts_data = [
            {"code": "ACC_FREIGHT_REV", "name": "Freight Revenue Account", "group": "REV_DIRECT", "opening_balance": Decimal("0.00"), "opening_balance_type": "CR"},
            {"code": "ACC_CASH", "name": "Cash Account", "group": "CASH", "opening_balance": Decimal("50000.00"), "opening_balance_type": "DR"},
            {"code": "ACC_HDFC_BANK", "name": "HDFC Bank Operating Account", "group": "BANK", "opening_balance": Decimal("250000.00"), "opening_balance_type": "DR"},
            {"code": "ACC_GST_OUT_CGST", "name": "GST Output CGST", "group": "TAX", "opening_balance": Decimal("0.00"), "opening_balance_type": "CR"},
            {"code": "ACC_GST_OUT_SGST", "name": "GST Output SGST", "group": "TAX", "opening_balance": Decimal("0.00"), "opening_balance_type": "CR"},
            {"code": "ACC_GST_OUT_IGST", "name": "GST Output IGST", "group": "TAX", "opening_balance": Decimal("0.00"), "opening_balance_type": "CR"},
            {"code": "ACC_GST_IN_CGST", "name": "GST Input CGST", "group": "TAX", "opening_balance": Decimal("0.00"), "opening_balance_type": "DR"},
            {"code": "ACC_GST_IN_SGST", "name": "GST Input SGST", "group": "TAX", "opening_balance": Decimal("0.00"), "opening_balance_type": "DR"},
            {"code": "ACC_GST_IN_IGST", "name": "GST Input IGST", "group": "TAX", "opening_balance": Decimal("0.00"), "opening_balance_type": "DR"},
            {"code": "ACC_TRUCK_HIRE_EXP", "name": "Truck Hire Expense", "group": "EXP_DIRECT", "opening_balance": Decimal("0.00"), "opening_balance_type": "DR"},
            {"code": "ACC_FUEL_EXP", "name": "Diesel & Fuel Expense", "group": "EXP_DIRECT", "opening_balance": Decimal("0.00"), "opening_balance_type": "DR"},
            {"code": "ACC_TOLL_EXP", "name": "Toll Expense", "group": "EXP_DIRECT", "opening_balance": Decimal("0.00"), "opening_balance_type": "DR"},
            {"code": "ACC_SUNDRY_DEBTORS", "name": "General Trade Debtors", "group": "DEBTORS", "opening_balance": Decimal("0.00"), "opening_balance_type": "DR"},
            {"code": "ACC_SUNDRY_CREDITORS", "name": "General Trade Creditors", "group": "CREDITORS", "opening_balance": Decimal("0.00"), "opening_balance_type": "CR"},
        ]
        for acc_data in accounts_data:
            stmt = select(models.Account).where(models.Account.code == acc_data["code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                existing = models.Account(
                    code=acc_data["code"],
                    name=acc_data["name"],
                    group_id=group_map[acc_data["group"]],
                    opening_balance=acc_data["opening_balance"],
                    opening_balance_type=acc_data["opening_balance_type"]
                )
                session.add(existing)
                await session.flush()

        await session.commit()
        logger.info("Chart of accounts & initial masters successfully seeded in demo tenant DB!")

    await close_all_connections()

if __name__ == "__main__":
    asyncio.run(run_migration())
