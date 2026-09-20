import asyncio
from sqlalchemy import text
from app.core.database import control_engine

async def update_demo_plan():
    async with control_engine.begin() as conn:
        await conn.execute(text("UPDATE tenants SET plan_id = (SELECT id FROM plans WHERE code = 'ENTERPRISE') WHERE subdomain = 'demo'"))
    print("Updated demo tenant to ENTERPRISE plan!")

if __name__ == "__main__":
    asyncio.run(update_demo_plan())
