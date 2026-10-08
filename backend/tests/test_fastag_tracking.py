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

    def test_navigation_structure_deduplication(self):
        from app.auth.navigation import ALL_NAVIGATION_MODULES
        
        # 1. Verify tracking is NOT inside transport
        transport_mod = next(m for m in ALL_NAVIGATION_MODULES if m["id"] == "transport")
        transport_features = [it["feature"] for it in transport_mod["items"]]
        self.assertNotIn("tracking", transport_features)
        self.assertNotIn("fastag_tracking", transport_features)

        # 2. Verify tracking module exists and has fastag and sim tracking
        tracking_mod = next(m for m in ALL_NAVIGATION_MODULES if m["id"] == "tracking")
        tracking_features = [it["feature"] for it in tracking_mod["items"]]
        self.assertIn("fastag_tracking", tracking_features)
        self.assertIn("tracking", tracking_features)
        self.assertEqual(tracking_mod["items"][0]["href"], "/tracking/fastag")
        self.assertEqual(tracking_mod["items"][1]["href"], "/tracking/sim")

    def test_plan_tier_hierarchy(self):
        from app.auth.navigation import PLAN_TIERS, MODULE_MIN_TIERS

        # Free: tier 1, Pro: tier 2, Business: tier 3, Enterprise: tier 4
        self.assertEqual(PLAN_TIERS["FREE"], 1)
        self.assertEqual(PLAN_TIERS["PRO"], 2)
        self.assertEqual(PLAN_TIERS["BUSINESS"], 3)
        self.assertEqual(PLAN_TIERS["ENTERPRISE"], 4)

        # Tracking module requires Tier 2 (Pro)
        self.assertEqual(MODULE_MIN_TIERS["tracking"], 2)

        # Enterprise (Tier 4) >= Tracking (Tier 2) -> Unlocked
        self.assertGreaterEqual(PLAN_TIERS["ENTERPRISE"], MODULE_MIN_TIERS["tracking"])
        # Business (Tier 3) >= Tracking (Tier 2) -> Unlocked
        self.assertGreaterEqual(PLAN_TIERS["BUSINESS"], MODULE_MIN_TIERS["tracking"])
        # Pro (Tier 2) >= Tracking (Tier 2) -> Unlocked
        self.assertGreaterEqual(PLAN_TIERS["PRO"], MODULE_MIN_TIERS["tracking"])
        # Free (Tier 1) < Tracking (Tier 2) -> Locked
        self.assertLess(PLAN_TIERS["FREE"], MODULE_MIN_TIERS["tracking"])


    def test_fastag_config_schema(self):
        from app.modules.transport.schemas import FastagConfigResponse

        cfg = FastagConfigResponse(
            google_maps_configured=True,
            fastag_api_configured=True,
            default_map_engine="google",
            google_maps_api_key="AIzaSyTestKey123",
            fastag_credits_left=0,
            rate_per_fetch=1.50,
        )
        self.assertEqual(cfg.default_map_engine, "google")
        self.assertEqual(cfg.google_maps_api_key, "AIzaSyTestKey123")
        self.assertEqual(cfg.fastag_credits_left, 0)
        self.assertEqual(cfg.rate_per_fetch, 1.50)
        self.assertIn("1.50", cfg.pricing_notice)

    def test_fastag_wallet_response_schema(self):
        from app.modules.profile.schemas import FastagWalletResponse, FastagWalletTransactionItem

        tx = FastagWalletTransactionItem(
            id=1,
            created_at=datetime.now(timezone.utc),
            transaction_type="DEBIT",
            api_calls_count=1,
            rate_per_call=1.50,
            amount=1.50,
            vehicle_number="MH04GP1234",
            description="FASTag Live Telemetry Fetch for MH04GP1234",
            balance_after=4,
        )
        resp = FastagWalletResponse(
            api_calls_left=4,
            rate_per_fetch=1.50,
            equivalent_balance_inr=6.00,
            is_exhausted=False,
            transactions=[tx],
        )
        self.assertEqual(resp.api_calls_left, 4)
        self.assertEqual(resp.rate_per_fetch, 1.50)
        self.assertEqual(resp.equivalent_balance_inr, 6.00)
        self.assertFalse(resp.is_exhausted)
        self.assertEqual(len(resp.transactions), 1)
        self.assertEqual(resp.transactions[0].transaction_type, "DEBIT")

    def test_wallet_transaction_model_isolated_in_tenant_db(self):
        import app.control.models as control_models
        from app.tenant_db.models import FastagWalletTransaction, TenantBase

        # FastagWalletTransaction must NOT exist in control models
        self.assertFalse(hasattr(control_models, "FastagWalletTransaction"))

        # FastagWalletTransaction must be in tenant DB models
        self.assertTrue(issubclass(FastagWalletTransaction, TenantBase))
        self.assertEqual(FastagWalletTransaction.__tablename__, "fastag_wallet_transactions")

    def test_tenant_model_fastag_credits_default_zero(self):
        from app.control.models import Tenant

        # fastag_credits_left must be defined on Tenant with default 0
        self.assertTrue(hasattr(Tenant, "fastag_credits_left"))
        col = Tenant.__table__.columns["fastag_credits_left"]
        self.assertEqual(col.default.arg, 0)


if __name__ == "__main__":
    unittest.main()

