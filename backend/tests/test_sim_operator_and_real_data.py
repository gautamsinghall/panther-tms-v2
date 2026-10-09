import unittest
from datetime import datetime, timezone
from app.integrations.freight_tiger.client import FreightTigerClient, detect_telecom_operator
from app.modules.transport.schemas import SIMTripCreate, SIMTripUpdate, SIMTripCommentCreate

class TestSimOperatorAndRealData(unittest.IsolatedAsyncioTestCase):
    def test_detect_telecom_operator_from_series(self):
        # Screenshot 1 Row 1 & Screenshot 2: 8882920719 -> Jio
        self.assertEqual(detect_telecom_operator("8882920719"), "Jio")
        self.assertEqual(detect_telecom_operator("+918882920719"), "Jio")
        
        # Screenshot 1 Row 2: 7836850348 -> Airtel
        self.assertEqual(detect_telecom_operator("7836850348"), "Airtel")
        
        # Screenshot 3 Rows 1, 2, 3: 8826615467 -> Airtel
        self.assertEqual(detect_telecom_operator("8826615467"), "Airtel")
        
        # Screenshot 3 Row 4: 8946042386 -> Airtel
        self.assertEqual(detect_telecom_operator("8946042386"), "Airtel")
        
        # Vi series
        self.assertEqual(detect_telecom_operator("9820123456"), "Vi")
        
        # BSNL series
        self.assertEqual(detect_telecom_operator("9412345678"), "BSNL")

    async def test_real_data_preservation_no_fake_nellore(self):
        client = FreightTigerClient()
        
        # Create a real trip between Delhi and Gurugram (matching Screenshot 1)
        res = await client.create_sim_trip(
            vehicle_number="HR30AB0001",
            driver_phone="8882920719",
            driver_name="Suresh Kumar",
            lr_number="LR-2026-0001",
            origin={"address": "delhi", "lat": 28.6139, "lng": 77.2090},
            destination={"address": "Gurugram, Haryana", "lat": 28.4595, "lng": 77.0266},
            route_code="Delhi-Gurugram",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["vehicle_number"], "HR30AB0001") if "vehicle_number" in res else None
        
        # Before driver consent: must NOT return fake coordinates
        details = await client.get_trip_details(res["feed_unique_id"])
        self.assertTrue(details["success"])
        self.assertFalse(details["is_consent_done"])
        self.assertIsNone(details["last_latitude"])
        self.assertIsNone(details["last_longitude"])
        self.assertIsNone(details["last_location_address"])
        self.assertEqual(details["operator_name"], "Jio")

        # Unknown trip lookup: must NOT invent "Jack Ryan" or "Nellore"
        unknown_details = await client.get_trip_details("FT-UNKNOWN-999")
        self.assertTrue(unknown_details["success"])
        self.assertIsNone(unknown_details["vehicle_number"])
        self.assertIsNone(unknown_details["last_latitude"])
        self.assertIsNone(unknown_details["last_location_address"])

    def test_schema_validations(self):
        # SIMTripCreate schema validation
        payload = SIMTripCreate(
            vehicle_number="HR30AB0001",
            driver_phone="8882920719",
            driver_name="Suresh Kumar",
            operator_name="Jio",
            consignor_name="Acme Logistics",
            consignee_name="Palam Hub",
            origin_address="delhi",
            destination_address="Gurugram, Haryana",
            milestone="At Unloading",
            is_starred=True,
        )
        self.assertEqual(payload.operator_name, "Jio")
        self.assertEqual(payload.consignor_name, "Acme Logistics")
        self.assertEqual(payload.consignee_name, "Palam Hub")
        self.assertEqual(payload.milestone, "At Unloading")
        self.assertTrue(payload.is_starred)

        # SIMTripUpdate schema validation
        update_payload = SIMTripUpdate(
            operator_name="Airtel",
            milestone="In Transit",
            is_delayed=True,
        )
        self.assertEqual(update_payload.operator_name, "Airtel")
        self.assertEqual(update_payload.milestone, "In Transit")
        self.assertTrue(update_payload.is_delayed)

        # SIMTripCommentCreate schema validation
        comment = SIMTripCommentCreate(comment="Driver reached Gurugram gate 2.")
        self.assertEqual(comment.comment, "Driver reached Gurugram gate 2.")
