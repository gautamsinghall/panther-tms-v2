import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from app.modules.transport_reports.service import get_hire_challan_register
from app.modules.transport_reports.schemas import HireChallanRegisterRow


def test_hire_challan_register_row_schema():
    row = HireChallanRegisterRow(
        id=1,
        challan_number="HC-2026-001",
        challan_date=date(2026, 5, 10),
        vehicle_number="MH12AB1234",
        owner_id=5,
        owner_name="Sharma Transport Co.",
        driver_name="Ramesh Singh",
        driver_phone="9876543210",
        from_location="Mumbai",
        to_location="Delhi",
        hire_rate=Decimal("45000.00"),
        advance_amount=Decimal("15000.00"),
        balance_amount=Decimal("30000.00"),
        net_payable_amount=Decimal("44550.00"),
        tds_rate=Decimal("1.00"),
        tds_amount=Decimal("450.00"),
        tds_category="194C_INDIVIDUAL_1",
        detention_charge=Decimal("0.00"),
        mamul_charges=Decimal("0.00"),
        status="ISSUED",
        issuing_office_id=1,
        issuing_office_name="Head Office-Delhi",
        issuing_office_code="DEL",
        vendor_ref_no="VREF-9988",
        remarks="Urgent delivery",
        lr_id=101,
        lr_number="LR-10101",
    )
    assert row.challan_number == "HC-2026-001"
    assert row.issuing_office_name == "Head Office-Delhi"
    assert row.owner_name == "Sharma Transport Co."
    assert row.driver_phone == "9876543210"
    assert row.hire_rate == Decimal("45000.00")
    assert row.advance_amount == Decimal("15000.00")
    assert row.balance_amount == Decimal("30000.00")
    assert row.status == "ISSUED"
    assert row.lr_number == "LR-10101"


@pytest.mark.asyncio
async def test_get_hire_challan_register_service():
    mock_db = AsyncMock()
    mock_result = MagicMock()

    mock_hc = MagicMock()
    mock_hc.id = 1
    mock_hc.challan_number = "HC-2026-001"
    mock_hc.challan_date = date(2026, 5, 10)
    mock_hc.vehicle_number = "MH12AB1234"
    mock_hc.owner_id = 5
    mock_hc.driver_id = 12
    mock_hc.driver_name = "Ramesh Singh"
    mock_hc.driver_phone = "9876543210"
    mock_hc.from_location = "Mumbai"
    mock_hc.to_location = "Delhi"
    mock_hc.hire_rate = Decimal("45000.00")
    mock_hc.advance_amount = Decimal("15000.00")
    mock_hc.balance_amount = Decimal("30000.00")
    mock_hc.net_payable_amount = Decimal("44550.00")
    mock_hc.tds_rate = Decimal("1.00")
    mock_hc.tds_amount = Decimal("450.00")
    mock_hc.tds_category = "194C_INDIVIDUAL_1"
    mock_hc.detention_charge = Decimal("0.00")
    mock_hc.mamul_charges = Decimal("0.00")
    mock_hc.status = "ISSUED"
    mock_hc.vendor_ref_no = "VREF-9988"
    mock_hc.remarks = "Urgent delivery"
    mock_hc.issuing_office_id = 1
    mock_hc.lr_id = 101

    mock_office = MagicMock()
    mock_office.name = "HEAD OFFICE-DELHI"
    mock_office.code = "DEL"
    mock_hc.issuing_office = mock_office

    mock_owner = MagicMock()
    mock_owner.name = "Sharma Transport Co."
    mock_hc.owner = mock_owner

    mock_lr = MagicMock()
    mock_lr.lr_number = "LR-10101"
    mock_hc.lr = mock_lr

    mock_result.scalars.return_value.all.return_value = [mock_hc]
    mock_db.execute.return_value = mock_result

    rows = await get_hire_challan_register(
        mock_db,
        office_id=1,
        include_unassigned=True,
        from_date=date(2026, 4, 1),
        to_date=date(2026, 10, 31),
        owner_id=5,
    )

    assert len(rows) == 1
    r = rows[0]
    assert r.challan_number == "HC-2026-001"
    assert r.owner_name == "Sharma Transport Co."
    assert r.issuing_office_name == "HEAD OFFICE-DELHI"
    assert r.issuing_office_code == "DEL"
    assert r.driver_phone == "9876543210"
    assert r.lr_number == "LR-10101"
    assert r.hire_rate == Decimal("45000.00")
    assert r.balance_amount == Decimal("30000.00")

