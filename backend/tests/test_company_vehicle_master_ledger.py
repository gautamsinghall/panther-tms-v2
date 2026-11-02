import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.tenant_db.models import (
    TenantBase,
    CompanyVehicle,
    Driver,
    Account,
    PrimaryGroup,
    GroupInPrimary,
    SubgroupInGroup,
    TripExpense,
)
from app.modules.accounts import master_ledger_service
from app.modules.transport import service as transport_service
from app.modules.transport.schemas import CompanyVehicleCreate, CompanyVehicleUpdate


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # 1. Primary Groups
        pg_asset = PrimaryGroup(id=1, name="Assets", code="ASSET", nature="DEBIT")
        pg_liab = PrimaryGroup(id=2, name="Liabilities", code="LIABILITY", nature="CREDIT")
        session.add_all([pg_asset, pg_liab])
        await session.flush()

        # 2. Groups in Primary
        grp_fa = GroupInPrimary(id=1, name="Fixed Assets", code="FA", primary_group_id=pg_asset.id)
        session.add(grp_fa)
        await session.flush()

        # 3. Subgroups in Group
        sg_comp = SubgroupInGroup(id=1, name="Company Owned Fleet Vehicles", code="FA_COMPANY_VEHICLES", group_id=grp_fa.id)
        sg_hcv = SubgroupInGroup(id=2, name="Heavy Commercial Vehicles (HCV)", code="FA_HEAVY_VEHICLES", group_id=grp_fa.id)
        session.add_all([sg_comp, sg_hcv])
        await session.flush()

        # 4. Default Driver
        driver = Driver(id=1, name="Ramesh Kumar", phone="9876543210", license_number="DL0420110012345")
        session.add(driver)
        await session.commit()

        yield session


@pytest.mark.asyncio
async def test_company_vehicle_automatic_ledger_creation(test_session: AsyncSession):
    session = test_session

    # 1. Create a Company Vehicle via transport service
    veh_create = CompanyVehicleCreate(
        vehicle_number="MH12AB1234",
        vehicle_type="HCV Multi-Axle 40ft",
        capacity_mt=Decimal("25.000"),
        chassis_number="MB1234567890CHAS",
        engine_number="ENG987654321",
        default_driver_id=1,
        current_odometer_km=45000,
    )

    vehicle = await transport_service.create_company_vehicle(session, veh_create)
    assert vehicle.id is not None
    assert vehicle.vehicle_number == "MH12AB1234"
    assert vehicle.account_id is not None

    # 2. Verify leaf ledger Account was automatically created and bound
    acc = await session.get(Account, vehicle.account_id)
    assert acc is not None
    assert acc.name == "Vehicle - MH12AB1234"
    assert acc.code == f"VEH_{vehicle.id:04d}"
    assert acc.opening_balance_type == "DR"
    assert acc.company_vehicle_id == vehicle.id

    # 3. Verify Indian Accounting Hierarchy: Primary Group -> Group -> Subgroup
    assert acc.group_id == 1  # Fixed Assets (FA)
    assert acc.subgroup_id in (1, 2)  # FA_COMPANY_VEHICLES or FA_HEAVY_VEHICLES


@pytest.mark.asyncio
async def test_company_vehicle_master_ledger_listing_and_summary(test_session: AsyncSession):
    session = test_session

    # Create two company vehicles
    v1 = await transport_service.create_company_vehicle(
        session,
        CompanyVehicleCreate(
            vehicle_number="DL01XY9999",
            vehicle_type="Heavy Commercial Truck",
            capacity_mt=Decimal("30.000"),
            default_driver_id=1,
        )
    )

    v2 = await transport_service.create_company_vehicle(
        session,
        CompanyVehicleCreate(
            vehicle_number="HR55ZZ1111",
            vehicle_type="Light Commercial Vehicle",
            capacity_mt=Decimal("4.500"),
        )
    )

    # Add a trip expense for v1
    exp = TripExpense(
        expense_number="EXP-2026-0001",
        vehicle_number="DL01XY9999",
        expense_category="DIESEL",
        amount=Decimal("12500.00"),
        payment_mode="PETROCARD",
        status="APPROVED",
    )
    session.add(exp)
    await session.commit()

    # Test list_company_vehicle_ledgers
    ledgers = await master_ledger_service.list_company_vehicle_ledgers(session)
    assert len(ledgers) == 2

    dl_item = next(item for item in ledgers if item.vehicle_number == "DL01XY9999")
    assert dl_item.primary_group_code == "ASSET"
    assert dl_item.group_code == "FA"
    assert dl_item.group_name == "Fixed Assets"
    assert dl_item.total_diesel_expense == Decimal("12500.00")
    assert dl_item.total_operational_expense == Decimal("12500.00")
    assert dl_item.ledger_code == f"VEH_{v1.id:04d}"

    # Test get_company_vehicle_ledger_detail
    detail = await master_ledger_service.get_company_vehicle_ledger_detail(session, v1.id)
    assert detail.category == "COMPANY_VEHICLE"
    assert detail.party.vehicle_number == "DL01XY9999"
    assert detail.party.primary_group_name == "Assets"
    assert detail.party.group_name == "Fixed Assets"
    assert detail.total_transactions >= 1

    # Test get_master_ledger_summary includes company_vehicles
    summary = await master_ledger_service.get_master_ledger_summary(session)
    assert summary.company_vehicles is not None
    assert summary.company_vehicles.total_accounts == 2
    assert summary.company_vehicles.settled_count == 2

