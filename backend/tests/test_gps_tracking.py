import time
import pytest
from app.modules.transport.service import extract_location_text, format_wheelseye_vehicle
from app.modules.transport.schemas import (
    GPSConfigResponse,
    GPSVehicleItem,
    GPSFleetCounts,
    GPSFleetResponse,
    GPSTripInfo,
    GPSTrackResponse,
    GPSHistoryResponse,
)
from app.modules.profile.schemas import (
    ApiCenterSettingResponse,
    ApiCenterSettingUpdate,
    WheelsEyeTestRequest,
    WheelsEyeTestResponse,
)


def test_extract_location_text():
    # Test flat string
    sample1 = {"address": "Near Toll Plaza, NH-48, Jaipur, Rajasthan"}
    assert extract_location_text(sample1) == "Near Toll Plaza, NH-48, Jaipur, Rajasthan"

    # Test dictionary address
    sample2 = {
        "location": {
            "address": "Opposite Petrol Pump",
            "city": "Gurugram",
            "state": "Haryana",
            "pincode": "122001",
        }
    }
    assert "Gurugram" in extract_location_text(sample2)

    # Test nested position
    sample3 = {"position": {"lastLocation": "Delhi-Mumbai Expressway, Sector 25"}}
    assert extract_location_text(sample3) == "Delhi-Mumbai Expressway, Sector 25"

    # Test empty or coordinates fallback
    assert extract_location_text({}) is None
    assert extract_location_text({"address": "Coordinates: 28.12, 77.34"}) is None


def test_format_wheelseye_vehicle():
    raw_vehicle = {
        "vehicleNumber": "DL01AA1234",
        "speed": 45,
        "ignition": True,
        "gpsTime": int(time.time() * 1000),
        "latitude": 28.5152,
        "longitude": 77.0189,
        "address": "NH-8 Cyber City, Gurugram",
        "battery": 95,
        "todayDistance": 142500,  # in meters -> 142.5 km
        "groupName": "Panther Fleet",
    }
    company_set = {"DL01AA1234"}

    item = format_wheelseye_vehicle(raw_vehicle, company_set)
    assert item is not None
    assert item.vehicleNumber == "DL01AA1234"
    assert item.speed == 45
    assert item.ignition is True
    assert item.status == "running"
    assert item.isCompany is True
    assert item.fleetType == "Company Vehicle"
    assert item.todayKm == 142.5
    assert item.address == "NH-8 Cyber City, Gurugram"


def test_format_wheelseye_stopped_market_vehicle():
    raw_vehicle = {
        "vehicleNumber": "MH04AB5678",
        "speed": 0,
        "ignition": False,
        "gpsTime": "2026-10-29T10:00:00Z",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "address": "JNPT Port Yard, Navi Mumbai",
    }
    company_set = set()  # Not in company set

    item = format_wheelseye_vehicle(raw_vehicle, company_set)
    assert item is not None
    assert item.vehicleNumber == "MH04AB5678"
    assert item.speed == 0
    assert item.ignition is False
    assert item.status == "stopped"


def test_gps_config_schema():
    cfg = GPSConfigResponse(
        is_configured=True,
        wheelseye_active=True,
        google_maps_configured=True,
        default_map_engine="google",
        google_maps_api_key="AIzaSyDummyKey",
    )
    assert cfg.is_configured is True
    assert cfg.google_maps_api_key == "AIzaSyDummyKey"


def test_api_center_wheelseye_schema():
    req = WheelsEyeTestRequest(
        wheelseye_api_token="test-token-1234",
        wheelseye_base_url="https://api.wheelseye.com",
    )
    assert req.wheelseye_api_token == "test-token-1234"

    res = WheelsEyeTestResponse(
        success=True,
        message="Connected to WheelsEye",
        total_vehicles_detected=12,
    )
    assert res.success is True
    assert res.total_vehicles_detected == 12

    update = ApiCenterSettingUpdate(
        wheelseye_api_token="new-token-9999",
        is_wheelseye_active=True,
    )
    assert update.wheelseye_api_token == "new-token-9999"
