from datetime import date
from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.tenant_db.models import Branch, Consigner, Location, TenantBase
from app.modules.settings.series_service import check_series_status
from app.modules.transport.schemas import LoadingSlipCreate, LoadingSlipUpdate
from app.modules.transport.service import (
    create_loading_slip,
    get_all_loading_slips,
    update_loading_slip,
)


@pytest.mark.asyncio
async def test_loading_slip_series_and_lifecycle():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        branch = Branch(code="DEL", name="Delhi Branch", is_head_office=True, is_active=True)
        consigner = Consigner(
            name="Apex Steels Pvt Ltd",
            phone="9876543210",
            email="logistics@apexsteels.in",
            pan="AAACA1234B",
            is_active=True,
        )
        loc_from = Location(country="India", state="Delhi", city_name="Delhi", pincode="110001", is_active=True)
        loc_to = Location(country="India", state="Maharashtra", city_name="Mumbai", pincode="400001", is_active=True)
        session.add_all([branch, consigner, loc_from, loc_to])
        await session.commit()

        # 1. Series check auto-provisions LOADING_SLIP automatic series in Series Master
        series_status = await check_series_status(session, "LOADING_SLIP", issuing_office_id=branch.id)
        assert series_status["configured"] is True
        assert series_status["series_mode"] == "AUTOMATIC"
        assert series_status["next_number_formatted"] == "DEL-LS-0001"

        # 2. Create Loading Slip with full fields & auto-generated slip number
        payload = LoadingSlipCreate(
            slip_date=date(2026, 11, 26),
            slip_series_id=series_status["id"],
            issuing_office_id=branch.id,
            vehicle_number="mh12pq4567",
            consigner_id=consigner.id,
            phone="9876543210",
            email="",
            pan="aaaca1234b",
            lorry_coordinator="Vikram Singh",
            lorry_coordinator_phone="9811122233",
            origin_location_id=loc_from.id,
            destination_location_id=loc_to.id,
            loading_date=date(2026, 11, 26),
            remark="Priority dispatch",
            total_freight=Decimal("50000.00"),
            advance_amount=Decimal("15000.00"),
            detention_charge=Decimal("2000.00"),
            commission_amount=Decimal("1500.00"),
            mamul_hammali=Decimal("500.00"),
        )
        slip = await create_loading_slip(session, payload, user_id=1, office_id=branch.id)
        assert slip.slip_number == "DEL-LS-0001"
        assert slip.vehicle_number == "MH12PQ4567"
        assert slip.consigner_name == "Apex Steels Pvt Ltd"
        assert slip.pan == "AAACA1234B"
        assert slip.loading_point == "Delhi"
        assert slip.unloading_point == "Mumbai"
        # Total = (50000 + 2000) - (15000 + 1500 + 500) = 35000.00
        assert slip.total_amount == Decimal("35000.00")

        # 3. Series counter advances automatically for next slip
        next_status = await check_series_status(session, "LOADING_SLIP", issuing_office_id=branch.id)
        assert next_status["next_number_formatted"] == "DEL-LS-0002"

        # 4. Update Loading Slip recalculates total_amount
        updated = await update_loading_slip(
            session,
            slip.id,
            LoadingSlipUpdate(detention_charge=Decimal("3000.00"), commission_amount=Decimal("2000.00")),
        )
        # Total = (50000 + 3000) - (15000 + 2000 + 500) = 35500.00
        assert updated.total_amount == Decimal("35500.00")

        all_slips = await get_all_loading_slips(session, office_id=branch.id, include_unassigned=True)
        assert len(all_slips) == 1
        assert all_slips[0].slip_number == "DEL-LS-0001"

    await engine.dispose()
