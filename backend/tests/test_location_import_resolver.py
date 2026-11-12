import pytest
from unittest.mock import AsyncMock, MagicMock
from app.modules.transport.excel_import import _resolve_or_create_location
from app.tenant_db.models import Location

@pytest.mark.asyncio
async def test_resolve_location_city_state_pincode():
    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = Location(
        id=10, city_name="Connaught Place", state="Delhi", pincode="110001"
    )
    db.execute.return_value = mock_res
    cache = {}

    loc = await _resolve_or_create_location(db, "Connaught Place, Delhi, 110001", 1, cache)
    assert loc.city_name == "Connaught Place"
    assert loc.pincode == "110001"
    assert "connaught place, delhi, 110001" in cache

    # Cache hit check
    loc_cached = await _resolve_or_create_location(db, "Connaught Place, Delhi, 110001", 1, cache)
    assert loc_cached is loc
    assert db.execute.call_count == 1

@pytest.mark.asyncio
async def test_resolve_location_autocreate_when_missing():
    db = AsyncMock()
    db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_res
    cache = {}

    loc = await _resolve_or_create_location(db, "Special Hub, Punjab, 141001", 2, cache)
    assert loc.city_name == "Special Hub"
    assert loc.state == "Punjab"
    assert loc.pincode == "141001"
    assert loc.issuing_office_id == 2
    assert db.add.called
    assert db.flush.called
