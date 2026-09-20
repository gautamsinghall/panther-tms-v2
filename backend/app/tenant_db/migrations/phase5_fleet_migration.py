import asyncio
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_tenant_engine, get_tenant_session_maker, close_all_connections
from app.tenant_db.base import TenantBase
import app.tenant_db.models as models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("phase5.migration")

async def run_migration():
    demo_db = f"panther_tenant_{settings.DEMO_TENANT_SUBDOMAIN}"
    logger.info(f"Connecting to {demo_db} and creating Phase 5 Fleet Management tables...")
    engine = get_tenant_engine(demo_db)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    logger.info("Phase 5 tables created. Now seeding standard Fleet Management data...")
    session_factory = get_tenant_session_maker(demo_db)
    async with session_factory() as session:
        # 1. Company Vehicles
        vehicles_data = [
            {
                "vehicle_number": "MH-12-RN-4821",
                "vehicle_type": "Tata Prima 4028.S (14 Wheeler)",
                "capacity_mt": Decimal("28.000"),
                "chassis_number": "MAT613028N8K12041",
                "engine_number": "ENG992104B8",
                "current_odometer_km": 124500,
                "registration_date": date(2023, 4, 15),
                "insurance_expiry": date(2026, 12, 31),
                "fitness_expiry": date(2027, 4, 15),
                "national_permit_expiry": date(2029, 4, 30),
            },
            {
                "vehicle_number": "DL-01-AB-1290",
                "vehicle_type": "BharatBenz 3528C (12 Wheeler)",
                "capacity_mt": Decimal("25.000"),
                "chassis_number": "MBL3528C9N4K88120",
                "engine_number": "ENG440192A4",
                "current_odometer_km": 89400,
                "registration_date": date(2023, 11, 20),
                "insurance_expiry": date(2026, 11, 20),
                "fitness_expiry": date(2026, 11, 20),
                "national_permit_expiry": date(2028, 11, 19),
            },
            {
                "vehicle_number": "KA-04-DE-5567",
                "vehicle_type": "Eicher Pro 6028 (10 Wheeler)",
                "capacity_mt": Decimal("20.000"),
                "chassis_number": "MEP60280K9B55104",
                "engine_number": "ENG110294C1",
                "current_odometer_km": 45200,
                "registration_date": date(2024, 8, 10),
                "insurance_expiry": date(2027, 3, 31),
                "fitness_expiry": date(2027, 8, 10),
                "national_permit_expiry": date(2029, 8, 9),
            },
        ]

        for v_data in vehicles_data:
            stmt = select(models.CompanyVehicle).where(models.CompanyVehicle.vehicle_number == v_data["vehicle_number"])
            res = await session.execute(stmt)
            existing_v = res.scalar_one_or_none()
            if not existing_v:
                session.add(models.CompanyVehicle(**v_data))
                await session.flush()

        # 2. Vehicle Health Records
        health_data = [
            {
                "vehicle_number": "MH-12-RN-4821",
                "odometer_km": 124500,
                "engine_health": "GOOD",
                "battery_status": "HEALTHY",
                "last_service_km": 115000,
                "last_service_date": date(2026, 8, 20),
                "next_service_km": 130000,
                "next_service_due_date": date(2026, 11, 20),
                "fitness_expiry": date(2027, 4, 15),
                "insurance_expiry": date(2026, 12, 31),
                "puc_expiry": date(2027, 1, 10),
                "status": "ROADWORTHY",
                "current_status": "IN_TRANSIT",
                "current_location": "Pune - Mumbai Expressway",
                "last_inspected_at": datetime.now(timezone.utc),
            },
            {
                "vehicle_number": "DL-01-AB-1290",
                "odometer_km": 89400,
                "engine_health": "ATTENTION_NEEDED",
                "battery_status": "CHECK_VOLTAGE",
                "last_service_km": 70000,
                "last_service_date": date(2026, 6, 10),
                "next_service_km": 85000,
                "next_service_due_date": date(2026, 9, 15),
                "fitness_expiry": date(2026, 11, 20),
                "insurance_expiry": date(2026, 11, 20),
                "puc_expiry": date(2026, 9, 24),
                "status": "SERVICE_OVERDUE",
                "current_status": "UNDER_MAINTENANCE",
                "current_location": "Delhi Commercial Workshop",
                "last_inspected_at": datetime.now(timezone.utc),
            },
            {
                "vehicle_number": "KA-04-DE-5567",
                "odometer_km": 45200,
                "engine_health": "GOOD",
                "battery_status": "HEALTHY",
                "last_service_km": 35000,
                "last_service_date": date(2026, 7, 5),
                "next_service_km": 50000,
                "next_service_due_date": date(2026, 10, 5),
                "fitness_expiry": date(2027, 8, 10),
                "insurance_expiry": date(2027, 3, 31),
                "puc_expiry": date(2027, 2, 18),
                "status": "ROADWORTHY",
                "current_status": "AVAILABLE",
                "current_location": "Bangalore Central Hub",
                "last_inspected_at": datetime.now(timezone.utc),
            },
        ]

        for h_data in health_data:
            stmt = select(models.VehicleHealthRecord).where(models.VehicleHealthRecord.vehicle_number == h_data["vehicle_number"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.VehicleHealthRecord(**h_data))

        # 3. Vehicle Compliance Documents
        docs_data = [
            {
                "vehicle_number": "MH-12-RN-4821",
                "vehicle_type": "COMPANY",
                "doc_type": "INSURANCE",
                "document_number": "NIC-COMM-992102",
                "issuing_authority": "National Insurance Co Ltd",
                "valid_from": date(2026, 1, 1),
                "valid_till": date(2026, 12, 31),
                "status": "VALID",
            },
            {
                "vehicle_number": "MH-12-RN-4821",
                "vehicle_type": "COMPANY",
                "doc_type": "NATIONAL_PERMIT",
                "document_number": "NP-MH-2024-8839",
                "issuing_authority": "Ministry of Road Transport & Highways",
                "valid_from": date(2024, 5, 1),
                "valid_till": date(2029, 4, 30),
                "status": "VALID",
            },
            {
                "vehicle_number": "MH-12-RN-4821",
                "vehicle_type": "COMPANY",
                "doc_type": "FITNESS_CERT",
                "document_number": "FIT-MH-2025-0104",
                "issuing_authority": "RTO Pune",
                "valid_from": date(2025, 4, 16),
                "valid_till": date(2027, 4, 15),
                "status": "VALID",
            },
            {
                "vehicle_number": "DL-01-AB-1290",
                "vehicle_type": "COMPANY",
                "doc_type": "PUC",
                "document_number": "PUC-DL-88201",
                "issuing_authority": "Delhi Transport Dept",
                "valid_from": date(2026, 3, 25),
                "valid_till": date(2026, 9, 24),
                "status": "EXPIRING_SOON",
            },
            {
                "vehicle_number": "DL-01-AB-1290",
                "vehicle_type": "COMPANY",
                "doc_type": "INSURANCE",
                "document_number": "ICICI-LOMB-3301",
                "issuing_authority": "ICICI Lombard General Insurance",
                "valid_from": date(2025, 11, 21),
                "valid_till": date(2026, 11, 20),
                "status": "VALID",
            },
            {
                "vehicle_number": "KA-04-DE-5567",
                "vehicle_type": "COMPANY",
                "doc_type": "FITNESS_CERT",
                "document_number": "FIT-KA-2025-0012",
                "issuing_authority": "RTO Bangalore Central",
                "valid_from": date(2025, 8, 11),
                "valid_till": date(2027, 8, 10),
                "status": "VALID",
            },
        ]

        for d_data in docs_data:
            stmt = select(models.VehicleDocument).where(
                (models.VehicleDocument.vehicle_number == d_data["vehicle_number"]) &
                (models.VehicleDocument.document_number == d_data["document_number"])
            )
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.VehicleDocument(**d_data))

        # 4. Tyre Records
        tyres_data = [
            {
                "serial_number": "MRF-99210-A",
                "brand": "MRF Steel Muscle",
                "size": "295/90 R20",
                "vehicle_number": "MH-12-RN-4821",
                "axle_position": "Front Right (FR)",
                "initial_tread_depth_mm": Decimal("15.00"),
                "current_tread_depth_mm": Decimal("11.20"),
                "installed_date": date(2025, 11, 10),
                "installed_odometer_km": 82500,
                "total_km_run": 42000,
                "purchase_cost": Decimal("24500.00"),
                "status": "MOUNTED_GOOD",
            },
            {
                "serial_number": "APL-44211-B",
                "brand": "Apollo EnduRace",
                "size": "295/90 R20",
                "vehicle_number": "MH-12-RN-4821",
                "axle_position": "Front Left (FL)",
                "initial_tread_depth_mm": Decimal("15.00"),
                "current_tread_depth_mm": Decimal("10.80"),
                "installed_date": date(2025, 11, 10),
                "installed_odometer_km": 82500,
                "total_km_run": 42000,
                "purchase_cost": Decimal("23800.00"),
                "status": "MOUNTED_GOOD",
            },
            {
                "serial_number": "JKT-11829-C",
                "brand": "JK Tyre JetSteel",
                "size": "10.00 R20",
                "vehicle_number": "DL-01-AB-1290",
                "axle_position": "Rear Axle 1 Outer (R1O)",
                "initial_tread_depth_mm": Decimal("15.00"),
                "current_tread_depth_mm": Decimal("3.40"),
                "installed_date": date(2025, 2, 14),
                "installed_odometer_km": 11400,
                "total_km_run": 78000,
                "purchase_cost": Decimal("21000.00"),
                "status": "RETREAD_DUE",
            },
            {
                "serial_number": "MRF-77441-D",
                "brand": "MRF Steel Muscle",
                "size": "295/90 R20",
                "vehicle_number": "KA-04-DE-5567",
                "axle_position": "Front Right (FR)",
                "initial_tread_depth_mm": Decimal("15.00"),
                "current_tread_depth_mm": Decimal("13.50"),
                "installed_date": date(2026, 1, 15),
                "installed_odometer_km": 23200,
                "total_km_run": 22000,
                "purchase_cost": Decimal("24500.00"),
                "status": "MOUNTED_GOOD",
            },
        ]

        for t_data in tyres_data:
            stmt = select(models.TyreRecord).where(models.TyreRecord.serial_number == t_data["serial_number"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.TyreRecord(**t_data))

        # 5. Workshop Repair & Service Records
        services_data = [
            {
                "job_card_number": "JC-2026-081",
                "vehicle_number": "MH-12-RN-4821",
                "service_type": "OIL_CHANGE",
                "workshop_name": "Tata Authorized Service Hub, Vashi",
                "service_date": date(2026, 8, 20),
                "completion_date": date(2026, 8, 21),
                "odometer_km": 115000,
                "description_of_work": "Engine oil 15W-40 drain & refill, lube filter replacement, coolant top-up",
                "parts_cost": Decimal("11200.00"),
                "labor_cost": Decimal("3000.00"),
                "total_cost": Decimal("14200.00"),
                "invoice_number": "TATA-VAS-4491",
                "status": "COMPLETED",
            },
            {
                "job_card_number": "JC-2026-094",
                "vehicle_number": "DL-01-AB-1290",
                "service_type": "BRAKE_OVERHAUL",
                "workshop_name": "Delhi Commercial Truck Care",
                "service_date": date(2026, 9, 18),
                "odometer_km": 89400,
                "description_of_work": "Brake shoe relining, drum skimming, brake booster pneumatic valve check",
                "parts_cost": Decimal("14000.00"),
                "labor_cost": Decimal("4500.00"),
                "total_cost": Decimal("18500.00"),
                "invoice_number": "DTC-2026-881",
                "status": "IN_PROGRESS",
            },
            {
                "job_card_number": "JC-2026-099",
                "vehicle_number": "KA-04-DE-5567",
                "service_type": "SCHEDULED_PM",
                "workshop_name": "Eicher Motors Workshop, Electronic City",
                "service_date": date(2026, 9, 25),
                "odometer_km": 50000,
                "description_of_work": "50,000 KM major periodic maintenance: gear oil, differential oil, greasing, air filter",
                "parts_cost": Decimal("8500.00"),
                "labor_cost": Decimal("2500.00"),
                "total_cost": Decimal("11000.00"),
                "status": "SCHEDULED",
            },
        ]

        for s_data in services_data:
            stmt = select(models.RepairServiceRecord).where(models.RepairServiceRecord.job_card_number == s_data["job_card_number"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.RepairServiceRecord(**s_data))

        # 6. Find existing LR to link trip expenses/advances if present
        lr_stmt = select(models.LR).order_by(models.LR.id.asc())
        lr_res = await session.execute(lr_stmt)
        seeded_lr = lr_res.scalars().first()
        seeded_lr_id = seeded_lr.id if seeded_lr else None

        # 7. Trip Expenses (Diesel, Toll/FASTag, Maintenance, Driver Allowance)
        expenses_data = [
            {
                "expense_number": "EXP-2026-0041",
                "lr_id": seeded_lr_id,
                "vehicle_number": "MH-12-RN-4821",
                "driver_name": "Ramesh Pawar",
                "expense_category": "DIESEL",
                "amount": Decimal("14500.00"),
                "payment_mode": "PETROCARD",
                "expense_date": date(2026, 9, 18),
                "receipt_number": "BPCL-PUN-8812",
                "odometer_km": 123800,
                "fuel_liters": Decimal("158.50"),
                "status": "APPROVED",
                "remarks": "High-speed diesel 158.5L filled at BPCL Hinjewadi",
            },
            {
                "expense_number": "EXP-2026-0042",
                "lr_id": seeded_lr_id,
                "vehicle_number": "MH-12-RN-4821",
                "driver_name": "Ramesh Pawar",
                "expense_category": "TOLL",
                "amount": Decimal("2850.00"),
                "payment_mode": "FASTAG",
                "expense_date": date(2026, 9, 18),
                "plaza_name": "Khed Shivapur Plaza & Khalapur Plaza",
                "status": "APPROVED",
                "remarks": "NHAI FASTag toll auto-debited",
            },
            {
                "expense_number": "EXP-2026-0043",
                "lr_id": None,
                "vehicle_number": "DL-01-AB-1290",
                "driver_name": "Suresh Kumar",
                "expense_category": "MAINTENANCE",
                "amount": Decimal("3200.00"),
                "payment_mode": "CASH",
                "expense_date": date(2026, 9, 19),
                "receipt_number": "BILL-LOC-221",
                "status": "PENDING",
                "remarks": "En-route fan belt tensioner repair and coolant hose replacement",
            },
            {
                "expense_number": "EXP-2026-0044",
                "lr_id": None,
                "vehicle_number": "KA-04-DE-5567",
                "driver_name": "Mahesh Patil",
                "expense_category": "DIESEL",
                "amount": Decimal("18200.00"),
                "payment_mode": "PETROCARD",
                "expense_date": date(2026, 9, 20),
                "receipt_number": "HPCL-BLR-0091",
                "odometer_km": 44800,
                "fuel_liters": Decimal("198.00"),
                "status": "APPROVED",
                "remarks": "Diesel 198L filled at HPCL Electronic City",
            },
            {
                "expense_number": "EXP-2026-0045",
                "lr_id": seeded_lr_id,
                "vehicle_number": "MH-12-RN-4821",
                "driver_name": "Ramesh Pawar",
                "expense_category": "DRIVER_ALLOWANCE",
                "amount": Decimal("2500.00"),
                "payment_mode": "CASH",
                "expense_date": date(2026, 9, 18),
                "status": "APPROVED",
                "remarks": "On-road food allowance and night halt compensation",
            },
        ]

        for e_data in expenses_data:
            stmt = select(models.TripExpense).where(models.TripExpense.expense_number == e_data["expense_number"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.TripExpense(**e_data))

        # 8. Trip Advances
        advances_data = [
            {
                "advance_number": "ADV-2026-0120",
                "lr_id": seeded_lr_id,
                "vehicle_number": "MH-12-RN-4821",
                "driver_name": "Ramesh Pawar",
                "advance_amount": Decimal("15000.00"),
                "settled_amount": Decimal("14500.00"),
                "balance_due": Decimal("500.00"),
                "payment_mode": "BANK_TRANSFER",
                "advance_date": date(2026, 9, 17),
                "status": "PARTIALLY_SETTLED",
                "remarks": "Disbursed for fuel and transit expenses to Pune-Mumbai corridor",
            },
            {
                "advance_number": "ADV-2026-0121",
                "lr_id": None,
                "vehicle_number": "DL-01-AB-1290",
                "driver_name": "Suresh Kumar",
                "advance_amount": Decimal("12000.00"),
                "settled_amount": Decimal("0.00"),
                "balance_due": Decimal("12000.00"),
                "payment_mode": "UPI",
                "advance_date": date(2026, 9, 19),
                "status": "OPEN",
                "remarks": "Disbursed via UPI to driver mobile wallet for en-route diesel",
            },
            {
                "advance_number": "ADV-2026-0118",
                "lr_id": None,
                "vehicle_number": "KA-04-DE-5567",
                "driver_name": "Mahesh Patil",
                "advance_amount": Decimal("20000.00"),
                "settled_amount": Decimal("20000.00"),
                "balance_due": Decimal("0.00"),
                "payment_mode": "PETROCARD",
                "advance_date": date(2026, 9, 14),
                "settlement_date": date(2026, 9, 19),
                "status": "SETTLED",
                "remarks": "Fully settled against petrocard receipts and toll receipts",
            },
        ]

        for a_data in advances_data:
            stmt = select(models.TripAdvance).where(models.TripAdvance.advance_number == a_data["advance_number"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(models.TripAdvance(**a_data))

        await session.commit()

    logger.info("Phase 5 Fleet tables successfully created and seeded!")
    await close_all_connections()

if __name__ == "__main__":
    asyncio.run(run_migration())
