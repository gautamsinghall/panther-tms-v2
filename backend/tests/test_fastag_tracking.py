import unittest
from datetime import datetime, timezone
from decimal import Decimal
from app.integrations.fastag_provider.client import (
    clean_vehicle_number,
    haversine_distance_km,
    resolve_location_coordinates,
    parse_reader_read_time,
    FASTagProviderClient,
)
from app.modules.transport.schemas import (
    FastagTripCreate,
    FastagTripUpdate,
    FastagTripResponse,
    FastagTrackResponse,
    TollLogResponse,
    FastagTrackingMetrics,
)


class TestFASTagTracking(unittest.TestCase):
    def test_clean_vehicle_number(self):
        self.assertEqual(clean_vehicle_number("mh 04 gp 1234"), "MH04GP1234")
        self.assertEqual(clean_vehicle_number("rj-14-gb-5678"), "RJ14GB5678")
        self.assertEqual(clean_vehicle_number("DL 01 AA 9999"), "DL01AA9999")
        self.assertEqual(clean_vehicle_number(""), "")

    def test_haversine_distance_calculation(self):
        # Mumbai (19.0760, 72.8777) to Pune (18.5204, 73.8567) is approx ~120 km
        dist = haversine_distance_km(19.0760, 72.8777, 18.5204, 73.8567)
        self.assertGreater(dist, 110)
        self.assertLess(dist, 135)

    def test_resolve_location_coordinates(self):
        coords_mumbai = resolve_location_coordinates("Mumbai Port Trust (Nhava Sheva)")
        self.assertIsNotNone(coords_mumbai)
        self.assertAlmostEqual(coords_mumbai[0], 19.0760, places=2)

        coords_delhi = resolve_location_coordinates("Delhi NCR Logistics Hub")
        self.assertIsNotNone(coords_delhi)
        self.assertAlmostEqual(coords_delhi[0], 28.6139, places=2)

        coords_unknown = resolve_location_coordinates("NonExistentUnknownLocation999")
        self.assertIsNone(coords_unknown)

    def test_parse_reader_read_time(self):
        dt1 = parse_reader_read_time("2026-10-08 14:30:00")
        self.assertEqual(dt1.year, 2026)
        self.assertEqual(dt1.month, 10)
        self.assertEqual(dt1.day, 8)
        self.assertEqual(dt1.hour, 14)

        dt2 = parse_reader_read_time(None)
        self.assertIsInstance(dt2, datetime)

    def test_fastag_trip_create_schema(self):
        req = FastagTripCreate(
            vehicle_number="MH04GP1234",
            origin_name="Jaipur, Rajasthan",
            destination_name="Mumbai, Maharashtra",
            intermediate_stops=["Pali", "Ahmedabad", "Surat"],
            notes="Electronics transit consignment",
        )
        self.assertEqual(req.vehicle_number, "MH04GP1234")
        self.assertEqual(len(req.intermediate_stops), 3)

    def test_fastag_track_response_schema(self):
        toll = TollLogResponse(
            id=101,
            vehicle_number="RJ14GB5678",
            lr_no="LR-2026-001",
            toll_plaza_name="Pali Toll Plaza",
            geocode="25.7711,73.3234",
            latitude=Decimal("25.7711"),
            longitude=Decimal("73.3234"),
            reader_read_time=datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc),
            formatted_time="08 Oct 2026, 12:00 PM",
        )

        resp = FastagTrackResponse(
            vehicle="RJ14GB5678",
            api_called=True,
            cooldown_active=True,
            seconds_since_last_sync=120,
            trip={
                "from_location": "Jaipur",
                "to_location": "Mumbai",
                "waypoints": ["Jaipur", "Mumbai"],
            },
            route=[toll],
            metrics=FastagTrackingMetrics(
                covered_km=450.0,
                remaining_km=600.0,
                total_km=1050.0,
                progress_pct=43,
                status="In Transit",
            ),
        )
        self.assertEqual(resp.vehicle, "RJ14GB5678")
        self.assertTrue(resp.api_called)
        self.assertEqual(len(resp.route), 1)
        self.assertEqual(resp.metrics.progress_pct, 43)

    def test_fastag_client_initialization_no_hardcoding(self):
        client = FASTagProviderClient(api_url="https://test.fastag.example/api", api_key="test_env_key")
        self.assertEqual(client.api_url, "https://test.fastag.example/api")
        self.assertEqual(client.api_key, "test_env_key")


if __name__ == "__main__":
    unittest.main()
