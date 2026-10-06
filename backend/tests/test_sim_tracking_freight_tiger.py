import unittest
from app.integrations.freight_tiger.client import FreightTigerClient
from app.modules.transport.schemas import SIMTripCreate, SIMTripClose, SIMConsentSimulate

class TestSIMTrackingFreightTiger(unittest.IsolatedAsyncioTestCase):
    async def test_freight_tiger_client_lifecycle(self):
        client = FreightTigerClient()

        # 1. Create SIM trip
        res = await client.create_sim_trip(
            vehicle_number="MH12AB1234",
            driver_phone="9876543210",
            driver_name="Raju Driver",
            lr_number="LR-1001",
            origin={"address": "Mumbai Hub", "lat": 19.0760, "lng": 72.8777},
            destination={"address": "Pune Hub", "lat": 18.5204, "lng": 73.8567},
            route_code="Mumbai-Pune",
        )
        self.assertTrue(res["success"])
        self.assertTrue(res["feed_unique_id"].startswith("FT-MH12AB1234"))
        self.assertFalse(res["is_consent_done"])
        self.assertEqual(res["status"], "Open")
        self.assertIn("v5/shareTrip", res["share_url"])

        # 2. Get trip details before consent
        details = await client.get_trip_details(res["feed_unique_id"])
        self.assertTrue(details["success"])
        self.assertFalse(details["is_consent_done"])
        self.assertIsNone(details["last_latitude"])

        # 3. Simulate driver SMS consent
        client.set_simulated_consent(res["feed_unique_id"], True)
        details_after_consent = await client.get_trip_details(res["feed_unique_id"])
        self.assertTrue(details_after_consent["success"])
        self.assertTrue(details_after_consent["is_consent_done"])
        self.assertIsNotNone(details_after_consent["last_latitude"])
        self.assertIsNotNone(details_after_consent["last_longitude"])
        self.assertEqual(details_after_consent["device_type"], "SIM")

        # 4. Close trip
        close_res = await client.close_trip(res["feed_unique_id"])
        self.assertTrue(close_res["success"])

    async def test_freight_tiger_invalid_phone(self):
        client = FreightTigerClient()
        with self.assertRaises(ValueError):
            await client.create_sim_trip(
                vehicle_number="MH12AB1234",
                driver_phone="123",  # Invalid phone length
            )

    def test_freight_tiger_headers_without_company_id(self):
        client = FreightTigerClient(auth_token="jwt_sample_token_xyz")
        headers = client._get_headers()
        self.assertEqual(headers["Authorization"], "Bearer jwt_sample_token_xyz")
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertNotIn("company_id", headers)
        self.assertFalse(hasattr(client, "company_id"))

    async def test_freight_tiger_coordinate_resolution(self):
        client = FreightTigerClient()
        res = await client.create_sim_trip(
            vehicle_number="DL01AA1111",
            driver_phone="9123456789",
            origin={"address": "Warehouse, Delhi"},
            destination={"address": "Hub, Mumbai"},
        )
        self.assertTrue(res["success"])
        sim_data = client._simulated_trips[res["feed_unique_id"]]
        self.assertEqual(sim_data["origin"]["lat"], 28.6139)
        self.assertEqual(sim_data["destination"]["lat"], 19.0760)

    def test_sim_trip_schemas(self):
        create_req = SIMTripCreate(
            vehicle_number="KA01AB9999",
            driver_phone="9988776655",
            driver_name="Sunil",
            origin_address="Bangalore",
            destination_address="Chennai",
        )
        self.assertEqual(create_req.vehicle_number == "KA01AB9999", True)
        self.assertEqual(create_req.driver_phone, "9988776655")
        self.assertTrue(create_req.share_trip)

if __name__ == "__main__":
    unittest.main()
