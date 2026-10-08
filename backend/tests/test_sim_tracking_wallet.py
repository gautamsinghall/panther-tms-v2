import unittest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from app.control.models import Tenant
from app.tenant_db.models import SIMTripRecord, SimWalletTransaction
from app.modules.transport.schemas import SIMTripCreate, SIMTripResponse
from app.modules.profile.schemas import SimWalletResponse


class TestSIMTrackingWallet(unittest.TestCase):
    def test_tenant_sim_wallet_balance_default_zero(self):
        # Default in control database column definition must be Decimal("0.00")
        self.assertEqual(Tenant.sim_wallet_balance.default.arg, Decimal("0.00"))
        self.assertEqual(Tenant.sim_wallet_balance.server_default.arg, "0.00")

    def test_sim_wallet_transaction_model_fields(self):
        tx = SimWalletTransaction(
            transaction_type="DEBIT",
            amount=Decimal("8.50"),
            rate_per_day=Decimal("8.50"),
            days_billed=1,
            vehicle_number="MH12AB1234",
            trip_id=42,
            description="Trip initiation (Day 1 / 24h) for vehicle MH12AB1234",
            balance_after=Decimal("91.50"),
        )
        self.assertEqual(tx.transaction_type, "DEBIT")
        self.assertEqual(tx.amount, Decimal("8.50"))
        self.assertEqual(tx.rate_per_day, Decimal("8.50"))
        self.assertEqual(tx.days_billed, 1)
        self.assertEqual(tx.vehicle_number, "MH12AB1234")
        self.assertEqual(tx.trip_id, 42)
        self.assertEqual(tx.balance_after, Decimal("91.50"))

    def test_sim_trip_record_billing_fields(self):
        now = datetime.now(timezone.utc)
        trip = SIMTripRecord(
            feed_unique_id="ft_feed_999",
            vehicle_number="DL01AA1111",
            driver_phone="9876543210",
            status="Open",
            last_billed_at=now,
            billing_cycles_charged=1,
        )
        self.assertEqual(trip.billing_cycles_charged, 1)
        self.assertEqual(trip.last_billed_at, now)

    def test_24hr_cycle_math_under_24_hours(self):
        # Under 24 hours: 0 additional cycles, 0 additional cost
        now = datetime.now(timezone.utc)
        billed_anchor = now - timedelta(hours=18)
        elapsed_seconds = (now - billed_anchor).total_seconds()
        self.assertLess(elapsed_seconds, 86400)
        cycles = int(elapsed_seconds // 86400)
        self.assertEqual(cycles, 0)
        charge = cycles * Decimal("8.50")
        self.assertEqual(charge, Decimal("0.00"))

    def test_24hr_cycle_math_exceeding_24_hours(self):
        # Trip exceeds 24 hours (e.g. 26 hours): exactly 1 new cycle at ₹8.50
        now = datetime.now(timezone.utc)
        billed_anchor = now - timedelta(hours=26)
        elapsed_seconds = (now - billed_anchor).total_seconds()
        self.assertGreaterEqual(elapsed_seconds, 86400)
        cycles = int(elapsed_seconds // 86400)
        self.assertEqual(cycles, 1)
        charge = cycles * Decimal("8.50")
        self.assertEqual(charge, Decimal("8.50"))

    def test_24hr_cycle_math_multiple_days(self):
        # Trip active across 3 days (e.g. 74 hours): exactly 3 cycles at ₹8.50 each
        now = datetime.now(timezone.utc)
        billed_anchor = now - timedelta(hours=74)
        elapsed_seconds = (now - billed_anchor).total_seconds()
        cycles = int(elapsed_seconds // 86400)
        self.assertEqual(cycles, 3)
        charge = cycles * Decimal("8.50")
        self.assertEqual(charge, Decimal("25.50"))

    def test_sim_wallet_response_schema(self):
        resp = SimWalletResponse(
            balance_inr=100.0,
            rate_per_day=8.50,
            active_trips_count=2,
            is_exhausted=False,
            pricing_notice="Standard tariff: ₹8.50 per trip per 24 hours (unlimited location fetch in a day). Wallet balance is maintained directly in database by system administrator.",
            transactions=[],
        )
        self.assertEqual(resp.balance_inr, 100.0)
        self.assertEqual(resp.rate_per_day, 8.50)
        self.assertEqual(resp.active_trips_count, 2)
        self.assertFalse(resp.is_exhausted)

    def test_freight_tiger_endpoint_constants(self):
        from app.integrations.freight_tiger.client import (
            PRIMARY_ADD_TRIP_URL,
            PRIMARY_CLOSE_TRIP_URL,
            PRIMARY_GET_TRIP_BY_UID_URL,
            FreightTigerClient,
        )
        self.assertEqual(PRIMARY_ADD_TRIP_URL, "https://api.freighttiger.com/api/tether/connect/trip/add")
        self.assertEqual(PRIMARY_CLOSE_TRIP_URL, "https://api.freighttiger.com/api/tether/connect/trip/close")
        self.assertEqual(PRIMARY_GET_TRIP_BY_UID_URL, "https://api.freighttiger.com/api/tether/connect/trip/uid")

        # Verify client initialization sanitizes legacy integration.freighttiger.com
        client = FreightTigerClient(base_url="https://integration.freighttiger.com/saas")
        self.assertEqual(client.base_url, "https://api.freighttiger.com/api/tether")

    def test_freight_tiger_token_resolution(self):
        import os
        from app.core.config import resolve_freight_tiger_token

        # Test explicit override
        token = resolve_freight_tiger_token("my_explicit_token")
        self.assertEqual(token, "my_explicit_token")

        # Test environment variable resolution
        os.environ["FT_AUTH_TOKEN"] = "test_env_jwt_token_123"
        try:
            resolved = resolve_freight_tiger_token()
            self.assertEqual(resolved, "test_env_jwt_token_123")
        finally:
            os.environ.pop("FT_AUTH_TOKEN", None)


if __name__ == "__main__":
    unittest.main()

