import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.tenant_db.models import (
    TenantBase,
    LR,
    HireChallan,
    ArrivalReport,
    Branch,
    Location,
    BillingClient,
    SeriesCategory,
    SeriesMaster,
)
from app.modules.transport import service as transport_service
from app.modules.transport.schemas import ArrivalReportCreate, ArrivalReportUpdate


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # 1. Setup Branch
        branch = Branch(id=1, name="Delhi Head Office", code="DEL", is_active=True, is_head_office=True)
        session.add(branch)

        # 2. Setup Series Category & Automatic Series for Arrival Report
        cat = SeriesCategory(id=1, name="Transport Documents", code="TRANSPORT", is_active=True)
        session.add(cat)
        await session.flush()

        series = SeriesMaster(
            id=1,
            category_id=cat.id,
            document_type="ARRIVAL_REPORT",
            series_name="Standard Arrival Report Series",
            prefix="AR-",
            suffix="",
            starting_number=1,
            current_number=0,
            series_mode="AUTOMATIC",
            financial_year="2026-2027",
            is_active=True,
            is_default=True,
            issuing_office_id=branch.id,
        )
        session.add(series)

        # 3. Locations
        loc_del = Location(id=1, city_name="Delhi", state="Delhi", is_active=True)
        loc_mum = Location(id=2, city_name="Mumbai", state="Maharashtra", is_active=True)
        session.add_all([loc_del, loc_mum])

        # 4. Billing Client
        client = BillingClient(id=1, name="Tata Steel Ltd", is_active=True)
        session.add(client)
        await session.flush()

        # 5. LR 1
        lr1 = LR(
            id=1,
            lr_number="LR-2026-0001",
            lr_date=date(2026, 11, 20),
            billing_customer_id=client.id,
            origin_location_id=loc_del.id,
            destination_location_id=loc_mum.id,
            eta="2026-11-25",
            package_count=120,
            actual_weight_mt=Decimal("15.500"),
            chargeable_weight_mt=Decimal("16.000"),
            vehicle_number="MH12AB1234",
            status="IN_TRANSIT",
            issuing_office_id=branch.id,
        )
        session.add(lr1)

        # 6. Hire Challan 1 tagged to LR 1
        hc1 = HireChallan(
            id=1,
            challan_number="HC-2026-0001",
            challan_date=date(2026, 11, 20),
            lr_id=lr1.id,
            vehicle_number="MH12AB1234",
            driver_name="Ramesh Singh",
            driver_phone="9876543210",
            created_by_user_id=1,
            created_by_user_name="Vijay Sharma",
            issuing_office_id=branch.id,
        )
        session.add(hc1)

        # 7. LR 2 with another Hire Challan
        lr2 = LR(
            id=2,
            lr_number="LR-2026-0002",
            lr_date=date(2026, 11, 22),
            billing_customer_id=client.id,
            origin_location_id=loc_del.id,
            destination_location_id=loc_mum.id,
            eta="2026-11-28",
            package_count=80,
            actual_weight_mt=Decimal("10.000"),
            chargeable_weight_mt=Decimal("10.000"),
            vehicle_number="DL01XY9999",
            status="BOOKED",
            issuing_office_id=branch.id,
        )
        session.add(lr2)

        hc2 = HireChallan(
            id=2,
            challan_number="HC-2026-0002",
            challan_date=date(2026, 11, 22),
            lr_id=lr2.id,
            vehicle_number="DL01XY9999",
            driver_name="Suresh Yadav",
            created_by_user_id=2,
            created_by_user_name="Pooja Verma",
            issuing_office_id=branch.id,
        )
        session.add(hc2)
        await session.commit()

        yield session


@pytest.mark.asyncio
async def test_arrival_lr_options_and_auto_series(test_session: AsyncSession):
    # Test get_arrival_lr_options: only tagged HCs returned for each LR
    options = await transport_service.get_arrival_lr_options(test_session, office_id=1)
    assert len(options) == 2

    # LR 1
    lr1_opt = next(o for o in options if o["id"] == 1)
    assert lr1_opt["lr_number"] == "LR-2026-0001"
    assert lr1_opt["customer_name"] == "Tata Steel Ltd"
    assert lr1_opt["from_location"] == "Delhi"
    assert lr1_opt["to_location"] == "Mumbai"
    assert lr1_opt["package_count"] == 120
    assert lr1_opt["weight"] == 15.5
    assert lr1_opt["transit_days"] == 5  # 2026-11-20 to 2026-11-25

    # Tagged HCs for LR 1 must ONLY include HC 1
    assert len(lr1_opt["hcs"]) == 1
    hc_opt = lr1_opt["hcs"][0]
    assert hc_opt["id"] == 1
    assert hc_opt["challan_number"] == "HC-2026-0001"
    assert hc_opt["vehicle_number"] == "MH12AB1234"
    assert hc_opt["issued_by"] == "Vijay Sharma"


@pytest.mark.asyncio
async def test_create_and_update_arrival_report(test_session: AsyncSession):
    # Create Arrival Report using automatic series allocation
    create_payload = ArrivalReportCreate(
        lr_id=1,
        hire_challan_id=1,
        arrival_date=date(2026, 11, 26),
        delivered_date=date(2026, 11, 26),
        # Delivery details
        delivered_packages=118,
        delivered_weight=Decimal("15.200"),
        shortage_packages=2,
        shortage_weight=Decimal("0.300"),
        damage_packages=1,
        damage_remarks="Slight carton tear on side",
        # Deductions
        deduction_shortage=Decimal("500.00"),
        deduction_others=Decimal("100.00"),
        deduction_damage=Decimal("200.00"),
        deduction_delay=Decimal("300.00"),
        # Additional payable
        payable_detention=Decimal("1200.00"),
        payable_mis_others=Decimal("200.00"),
        payable_labour=Decimal("400.00"),
        payable_border_expense=Decimal("300.00"),
    )

    class MockUser:
        id = 10
        full_name = "Admin User"

    ar = await transport_service.create_arrival_report(
        test_session,
        create_payload,
        current_user=MockUser(),
        office_id=1,
    )

    # 1. Automatic series check
    assert ar.report_number.startswith("AR-")
    assert ar.status == "COMPLETED"

    # 2. Auto-filled LR & HC snapshots
    assert ar.customer_name == "Tata Steel Ltd"
    assert ar.from_location == "Delhi"
    assert ar.to_location == "Mumbai"
    assert ar.vehicle_number == "MH12AB1234"
    assert ar.issued_by == "Vijay Sharma"
    assert ar.booked_packages == 120
    assert ar.booked_weight == Decimal("15.500")

    # 3. Delivery Details
    assert ar.delivered_packages == 118
    assert ar.shortage_packages == 2
    assert ar.damage_packages == 1

    # 4. Financial Calculations
    # Total deductions = 500 + 100 + 200 + 300 = 1100.00
    assert ar.total_deductions == Decimal("1100.00")
    # Total additional payable = 1200 + 200 + 400 + 300 = 2100.00
    assert ar.total_additional_payable == Decimal("2100.00")
    # Net amount = 2100.00 - 1100.00 = 1000.00
    assert ar.net_amount == Decimal("1000.00")

    # 5. Check LR status transition
    lr = await test_session.get(LR, 1)
    assert lr.status == "ARRIVED"

    # 6. Test list & get by id & router response builder
    from app.modules.transport.router import _build_arrival_report_response
    resp = _build_arrival_report_response(ar)
    assert resp.id == ar.id
    assert resp.report_number.startswith("AR-")
    assert resp.customer_name == "Tata Steel Ltd"
    assert resp.lr_number == "LR-2026-0001"
    assert resp.challan_number == "HC-2026-0001"

    all_reports = await transport_service.get_all_arrival_reports(test_session, office_id=1)
    assert len(all_reports) == 1
    resp_list = [_build_arrival_report_response(r) for r in all_reports]
    assert len(resp_list) == 1
    assert resp_list[0].customer_name == "Tata Steel Ltd"

    fetched = await transport_service.get_arrival_report_by_id(test_session, ar.id)
    assert fetched is not None
    assert fetched.id == ar.id
    resp_fetched = _build_arrival_report_response(fetched)
    assert resp_fetched.id == fetched.id

    # Test empty string payload coercion
    empty_str_payload = ArrivalReportCreate(
        lr_id=2,
        arrival_date="2026-11-27",
        delivered_date="",
        deduction_shortage="",
        delivered_packages="",
    )
    ar2 = await transport_service.create_arrival_report(
        test_session,
        empty_str_payload,
        office_id=1,
    )
    resp2 = _build_arrival_report_response(ar2)
    assert resp2.id == ar2.id
    assert resp2.deduction_shortage == Decimal("0.00")
    assert resp2.delivered_packages == 0

    # 7. Test delete
    deleted = await transport_service.delete_arrival_report(test_session, ar.id)
    assert deleted is True
    assert await transport_service.get_arrival_report_by_id(test_session, ar.id) is None
