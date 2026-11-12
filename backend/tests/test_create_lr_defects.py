import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.tenant_db.models import (
    TenantBase,
    Branch,
    User,
    Role,
    RolePermission,
    LR,
    Job,
    Consigner,
    Consignee,
    Location,
    CompanyVehicle,
    MarketVehicle,
    SeriesMaster,
)
from app.control.models import ControlBase
from app.modules.transport.schemas import LRCreate, LRUpdate
from app.modules.transport.service import create_lr, update_lr


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=True)

    async with session_maker() as session:
        # Branch
        branch = Branch(id=1, name="Delhi Hub", code="DEL-01", is_active=True, is_head_office=True)
        session.add(branch)

        # Series for LR
        series = SeriesMaster(
            id=1,
            document_type="LR",
            series_name="Default LR",
            prefix="LR-",
            starting_number=1,
            current_number=1,
            is_active=True,
            issuing_office_id=1,
        )
        session.add(series)

        # Company Vehicle
        cv = CompanyVehicle(
            id=1,
            vehicle_number="MH12AB1234",
            vehicle_type="32 FT MX CONTAINER",
            capacity_mt=Decimal("15.000"),
            is_active=True,
        )
        # Market Vehicle
        mv = MarketVehicle(
            id=1,
            vehicle_number="DL01XY9999",
            vehicle_type="20 FT OPEN",
            capacity_mt=Decimal("2.500"),
        )
        session.add_all([cv, mv])

        # Parties & Locations
        c = Consigner(id=1, name="Consigner A", code="CA", is_active=True)
        ce = Consignee(id=1, name="Consignee B", code="CB", is_active=True)
        loc = Location(id=1, city_name="Mumbai", state="Maharashtra", is_active=True)
        session.add_all([c, ce, loc])

        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_company_vehicle_label_resolution(db_session: AsyncSession):
    """Defect 2: Vehicle registered as Company Truck must resolve vehicle_source to COMPANY."""
    data = LRCreate(
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=1,
        vehicle_number="mh12ab1234",  # lowercase input
        package_count=10,
        actual_weight_mt=Decimal("8.400"),
        chargeable_weight_mt=Decimal("8.400"),
        dispatch_date=date(2026, 11, 20),
    )
    lr = await create_lr(db_session, data, user_id=1, office_id=1)
    assert lr.vehicle_source == "COMPANY"
    assert lr.vehicle_number == "MH12AB1234"


@pytest.mark.asyncio
async def test_booking_date_synchronization(db_session: AsyncSession):
    """Defect 3: Booking date and dispatch date must be single and synchronized."""
    target_date = date(2026, 11, 25)
    data = LRCreate(
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=1,
        vehicle_number="DL01XY9999",
        package_count=5,
        actual_weight_mt=Decimal("2.000"),
        chargeable_weight_mt=Decimal("2.000"),
        dispatch_date=target_date,
    )
    lr = await create_lr(db_session, data, user_id=1, office_id=1)
    assert lr.dispatch_date == target_date
    assert lr.lr_date == target_date


@pytest.mark.asyncio
async def test_blank_invoice_line_exclusion(db_session: AsyncSession):
    """Defect 5: Blank invoice rows (no invoice no, no eway bill, 0 value) must NOT be saved on LR."""
    data = LRCreate(
        consigner_id=1,
        consignee_id=1,
        origin_location_id=1,
        destination_location_id=1,
        vehicle_number="MH12AB1234",
        package_count=20,
        actual_weight_mt=Decimal("5.000"),
        chargeable_weight_mt=Decimal("5.000"),
        dispatch_date=date(2026, 11, 15),
        invoice_items=[
            # Valid item
            {
                "invoice_no": "INV-101",
                "invoice_date": "2026-11-15",
                "invoice_value": 50000.0,
                "particulars": "Heavy Machinery",
            },
            # Blank item: no invoice number, no eway bill, zero value
            {
                "invoice_no": "",
                "invoice_date": "2026-11-15",
                "invoice_value": 0.0,
                "eway_bill_number": "",
                "particulars": "Empty row",
            },
        ],
    )
    lr = await create_lr(db_session, data, user_id=1, office_id=1)
    # Only 1 valid invoice item should be stored
    assert len(lr.invoice_items) == 1
    assert lr.invoice_items[0]["invoice_no"] == "INV-101"
