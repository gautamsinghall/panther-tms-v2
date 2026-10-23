import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from app.modules.home.service import get_business_overview
from app.modules.home.schemas import BusinessOverviewData, RecentOperationItem, MonthlyTrendPoint


@pytest.mark.asyncio
async def test_business_overview_handles_db_exception():
    mock_session = AsyncMock()
    mock_session.execute.side_effect = Exception("Database connection failure")
    res = await get_business_overview(mock_session, office_id=1, include_unassigned=True)
    assert isinstance(res, BusinessOverviewData)
    assert res.total_movements == 0
    assert res.net_billed_revenue == Decimal("0.00")
    assert len(res.monthly_trends) == 1


def test_business_overview_schema_null_resilience():
    # Verify that RecentOperationItem accepts null dates and vehicle numbers without 500 crashes
    item = RecentOperationItem(
        id=99,
        lr_number="LR-TEST-01",
        lr_date=None,
        consigner_name=None,
        consignee_name=None,
        origin_city=None,
        destination_city=None,
        vehicle_number=None,
        freight_amount=Decimal("0.00"),
        status=None,
    )
    assert item.lr_date is None
    assert item.vehicle_number is None
    assert item.lr_number == "LR-TEST-01"

    trend = MonthlyTrendPoint(period=None, revenue=Decimal("0.00"), trips=0, invoices=0)
    assert trend.period is None or trend.period == "N/A"
