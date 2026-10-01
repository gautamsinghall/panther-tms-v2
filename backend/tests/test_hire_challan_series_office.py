import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.tenant_db.models import TenantBase, Branch, SeriesMaster, HireChallan, Driver, VehicleOwner, LR
from app.modules.transport.schemas import HireChallanCreate
from app.modules.transport.service import create_hire_challan, get_all_hire_challans
from app.modules.settings.series_service import get_manual_series_ranges, check_series_status


@pytest.mark.asyncio
async def test_hire_challan_office_series_autofill_and_expenses():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # 1. Create 2 branches
        delhi_branch = Branch(
            id=1,
            code="DEL",
            name="Delhi Regional Office",
            city="New Delhi",
            state="Delhi",
            is_head_office=True,
            is_active=True,
        )
        mumbai_branch = Branch(
            id=2,
            code="BOM",
            name="Mumbai Hub Office",
            city="Mumbai",
            state="Maharashtra",
            is_head_office=False,
            is_active=True,
        )
        session.add_all([delhi_branch, mumbai_branch])

        # 2. Configure HC Series for Delhi
        delhi_hc_series = SeriesMaster(
            id=10,
            document_type="HIRE_CHALLAN",
            series_name="Delhi HC Booklet",
            prefix="HC-DEL-26-",
            suffix="",
            starting_number=1,
            end_number=100,
            current_number=0,
            financial_year="2026-2027",
            series_mode="MANUAL",
            is_default=True,
            is_active=True,
            issuing_office_id=1,
        )
        # Configure HC Series for Mumbai
        mumbai_hc_series = SeriesMaster(
            id=20,
            document_type="HIRE_CHALLAN",
            series_name="Mumbai HC Booklet",
            prefix="HC-BOM-26-",
            suffix="",
            starting_number=1,
            end_number=100,
            current_number=0,
            financial_year="2026-2027",
            series_mode="MANUAL",
            is_default=True,
            is_active=True,
            issuing_office_id=2,
        )
        session.add_all([delhi_hc_series, mumbai_hc_series])

        # 3. Create a driver and vendor
        driver = Driver(
            id=1,
            name="Joginder Singh",
            phone="9876543210",
            license_number="DL-01-2020-00123",
            is_active=True,
        )
        owner = VehicleOwner(
            id=1,
            name="National Fleet Operators",
            phone="9811122334",
            pan="AAACN1234D",
            is_active=True,
        )
        session.add_all([driver, owner])
        await session.commit()

        # 4. Verify get_manual_series_ranges for Delhi branch
        ranges_delhi = await get_manual_series_ranges(session, "HIRE_CHALLAN", office_id=1)
        assert ranges_delhi["default_series_id"] == 10
        assert len(ranges_delhi["ranges"]) >= 1
        assert ranges_delhi["ranges"][0]["prefix"] == "HC-DEL-26-"
        assert ranges_delhi["ranges"][0]["available_options"][0]["value"] == "HC-DEL-26-0001"

        # 5. Verify get_manual_series_ranges for Mumbai branch
        ranges_bom = await get_manual_series_ranges(session, "HIRE_CHALLAN", office_id=2)
        assert ranges_bom["default_series_id"] == 20
        assert ranges_bom["ranges"][0]["prefix"] == "HC-BOM-26-"
        assert ranges_bom["ranges"][0]["available_options"][0]["value"] == "HC-BOM-26-0001"

        # 6. Create Hire Challan for Delhi with Loading & Unloading Expenses
        create_data = HireChallanCreate(
            issuing_office_id=1,
            hc_series_id=10,
            challan_number="HC-DEL-26-0001",
            challan_date=date.today(),
            from_location="New Delhi",
            to_location="Mumbai Hub",
            vehicle_number="DL-01-AB-1234",
            driver_id=1,
            owner_id=1,
            tds_category="194C - Individual / Sole Prop (1%)",
            tds_rate=Decimal("1.0"),
            advance_amount=Decimal("5000.00"),
            vendor_ref_no="VREF-99881",
            loading_expenses=[
                {
                    "lr_no": "LR-001",
                    "pkg_count": 50,
                    "gross_weight": "1.25",
                    "charge_head": "Loading Charges",
                    "narration": "Labour charges for loading",
                    "tds_applicable": True,
                    "inr_amount": 15000.00,
                }
            ],
            unloading_expenses=[
                {
                    "lr_no": "LR-001",
                    "pkg_count": 50,
                    "gross_weight": "1.25",
                    "charge_head": "Unloading Charges",
                    "narration": "Unloading at destination hub",
                    "tds_applicable": True,
                    "inr_amount": 10000.00,
                }
            ],
        )

        hc = await create_hire_challan(session, create_data, office_id=1)
        assert hc.id is not None
        assert hc.challan_number == "HC-DEL-26-0001"
        assert hc.issuing_office_id == 1
        assert hc.driver_name == "Joginder Singh"
        assert hc.driver_phone == "9876543210"
        assert hc.vendor_ref_no == "VREF-99881"
        assert hc.tds_category == "194C - Individual / Sole Prop (1%)"
        # Total hire_rate auto-computed from loading (15000) + unloading (10000) = 25000
        assert hc.hire_rate == Decimal("25000.00")
        # TDS 1% of 25000 = 250
        assert hc.tds_amount == Decimal("250.00")
        # Net payable = 25000 - 250 = 24750
        assert hc.net_payable_amount == Decimal("24750.00")
        # Balance = 24750 - advance (5000) = 19750
        assert hc.balance_amount == Decimal("19750.00")
        assert len(hc.loading_expenses) == 1
        assert len(hc.unloading_expenses) == 1

        # 7. Verify subsequent autofill for Delhi now gives next number 0002
        ranges_delhi_2 = await get_manual_series_ranges(session, "HIRE_CHALLAN", office_id=1)
        assert ranges_delhi_2["ranges"][0]["available_options"][0]["value"] == "HC-DEL-26-0002"

    await engine.dispose()
