import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from app.modules.transport_reports.service import get_lr_booking_register
from app.modules.transport_reports.schemas import LRRegisterRow


def test_lr_register_row_schema():
    row = LRRegisterRow(
        id=1,
        lr_number="41353",
        lr_date=date(2026, 5, 7),
        consigner_name="VELOCITY EXPRESS LOGISTICS",
        consignee_name="VELOCITY EXPRESS LOGISTICS",
        vehicle_number="EXPORT /IMPORT",
        package_count=100,
        actual_weight_mt=Decimal("15.500"),
        chargeable_weight_mt=Decimal("15.500"),
        total_freight_amount=Decimal("45000.00"),
        advance_amount=Decimal("10000.00"),
        balance_amount=Decimal("35000.00"),
        status="BOOKED",
        issuing_office_name="HEAD OFFICE-DELHI",
        booking_status="Booked",
        client_name="VELOCITY EXPRESS LOGISTICS (MAERSK)",
        party_invoice_no="1191",
        site_from="AHMEDNAGAR(Maharashtra)",
        site_to="MUNDRA PORT(Gujarat)",
        eway_bill_number="EWB-123456",
    )
    assert row.lr_number == "41353"
    assert row.issuing_office_name == "HEAD OFFICE-DELHI"
    assert row.booking_status == "Booked"
    assert row.client_name == "VELOCITY EXPRESS LOGISTICS (MAERSK)"
    assert row.site_from == "AHMEDNAGAR(Maharashtra)"
    assert row.site_to == "MUNDRA PORT(Gujarat)"
    assert row.party_invoice_no == "1191"
    assert row.balance_amount == Decimal("35000.00")


@pytest.mark.asyncio
async def test_get_lr_booking_register_service():
    mock_db = AsyncMock()
    mock_result = MagicMock()

    # Mock LR model objects
    mock_lr1 = MagicMock()
    mock_lr1.id = 41353
    mock_lr1.lr_number = "41353"
    mock_lr1.lr_date = date(2026, 5, 7)
    mock_lr1.vehicle_number = "DL1MA7362"
    mock_lr1.package_count = 50
    mock_lr1.actual_weight_mt = Decimal("12.500")
    mock_lr1.chargeable_weight_mt = Decimal("12.500")
    mock_lr1.freight_rate = Decimal("2000.00")
    mock_lr1.freight_amount = Decimal("25000.00")
    mock_lr1.total_freight_amount = Decimal("25000.00")
    mock_lr1.advance_amount = Decimal("5000.00")
    mock_lr1.balance_amount = Decimal("20000.00")
    mock_lr1.status = "BOOKED"
    mock_lr1.booking_status = "Booked"
    mock_lr1.invoice_no = "1191"
    mock_lr1.eway_bill_number = "2410998877"
    mock_lr1.payment_terms = "TO_BE_BILLED"
    mock_lr1.payment_type = "To Be Billed"
    mock_lr1.vehicle_type = "32FT SXL"
    mock_lr1.driver_name = "Rajesh Kumar"
    mock_lr1.driver_phone = "9876543210"

    mock_office = MagicMock()
    mock_office.name = "HEAD OFFICE-DELHI"
    mock_lr1.issuing_office = mock_office

    mock_client = MagicMock()
    mock_client.name = "VELOCITY EXPRESS LOGISTICS (MAERSK)"
    mock_lr1.billing_customer = mock_client

    mock_consigner = MagicMock()
    mock_consigner.name = "VELOCITY EXPRESS LOGISTICS"
    mock_lr1.consigner = mock_consigner

    mock_consignee = MagicMock()
    mock_consignee.name = "VELOCITY EXPRESS LOGISTICS"
    mock_lr1.consignee = mock_consignee

    mock_origin = MagicMock()
    mock_origin.city_name = "AHMEDNAGAR"
    mock_origin.state = "Maharashtra"
    mock_lr1.origin_location = mock_origin

    mock_dest = MagicMock()
    mock_dest.city_name = "MUNDRA PORT"
    mock_dest.state = "Gujarat"
    mock_lr1.destination_location = mock_dest

    mock_result.scalars.return_value.all.return_value = [mock_lr1]
    mock_db.execute.return_value = mock_result

    rows = await get_lr_booking_register(
        mock_db,
        office_id=1,
        include_unassigned=True,
        from_date=date(2026, 4, 1),
        to_date=date(2026, 10, 28),
        customer_id=10,
    )

    assert len(rows) == 1
    r = rows[0]
    assert r.lr_number == "41353"
    assert r.issuing_office_name == "HEAD OFFICE-DELHI"
    assert r.booking_status == "Booked"
    assert r.client_name == "VELOCITY EXPRESS LOGISTICS (MAERSK)"
    assert r.site_from == "AHMEDNAGAR(Maharashtra)"
    assert r.site_to == "MUNDRA PORT(Gujarat)"
    assert r.party_invoice_no == "1191"
    assert r.vehicle_number == "DL1MA7362"
    assert r.total_freight_amount == Decimal("25000.00")
    assert r.advance_amount == Decimal("5000.00")
    assert r.balance_amount == Decimal("20000.00")

