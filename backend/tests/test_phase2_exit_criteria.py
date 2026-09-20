import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase2_end_to_end_exit_criteria():
    """
    Phase 2 Exit Criteria Test:
    A full Job -> LR/GR -> Dispatch -> Arrival -> POD flow works end-to-end
    for the seeded tenant, and the Transport Reports return real data from it.
    """
    uid = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    headers = {"X-Tenant-Subdomain": "demo"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Company Admin
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers,
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "X-Tenant-Subdomain": "demo"}

        # Get Consigner, Consignee, Location
        consigners = (await client.get("/api/v1/general/consigners", headers=auth_headers)).json()
        consignees = (await client.get("/api/v1/general/consignees", headers=auth_headers)).json()
        locations = (await client.get("/api/v1/general/locations", headers=auth_headers)).json()
        assert len(consigners) > 0 and len(consignees) > 0 and len(locations) > 0

        consigner_id = consigners[0]["id"]
        consignee_id = consignees[0]["id"]
        origin_loc_id = locations[0]["id"]
        dest_loc_id = locations[-1]["id"]

        # 2. Create Vehicle Owner & Driver
        owner_res = await client.post(
            "/api/v1/transport/vehicle-owners",
            json={
                "name": f"Royal Transport {uid}",
                "phone": "9811122233",
                "pan": f"PAN{uid.upper()[:5]}",
                "bank_name": "HDFC Bank",
                "bank_account_no": "50100123456789",
                "bank_ifsc": "HDFC0001234",
            },
            headers=auth_headers,
        )
        assert owner_res.status_code == 201
        owner_id = owner_res.json()["id"]

        driver_res = await client.post(
            "/api/v1/transport/drivers",
            json={
                "name": f"Surinder Singh {uid}",
                "phone": "9822233344",
                "license_number": f"DL{uid.upper()}5555",
            },
            headers=auth_headers,
        )
        assert driver_res.status_code == 201
        driver_id = driver_res.json()["id"]

        # 3. Create Market Vehicle
        vehicle_number = f"NL01{uid[:4].upper()}"
        mv_res = await client.post(
            "/api/v1/transport/market-vehicles",
            json={
                "vehicle_number": vehicle_number,
                "vehicle_type": "Taurus 21MT",
                "capacity_mt": 21.0,
                "owner_id": owner_id,
            },
            headers=auth_headers,
        )
        assert mv_res.status_code == 201
        mv_id = mv_res.json()["id"]

        # 4. Job Creation -> Status OPEN
        job_res = await client.post(
            "/api/v1/transport/jobs",
            json={
                "consigner_id": consigner_id,
                "consignee_id": consignee_id,
                "origin_location_id": origin_loc_id,
                "destination_location_id": dest_loc_id,
                "cargo_description": f"Automotive Spares Batch {uid}",
                "estimated_weight_mt": 18.5,
                "estimated_packages": 50,
            },
            headers=auth_headers,
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]
        assert job_res.json()["status"] == "OPEN"

        # 5. GR/LR Booking -> Auto-advances to BOOKED; Job auto-advances to BOOKED
        lr_res = await client.post(
            "/api/v1/transport/lrs",
            json={
                "job_id": job_id,
                "consigner_id": consigner_id,
                "consignee_id": consignee_id,
                "origin_location_id": origin_loc_id,
                "destination_location_id": dest_loc_id,
                "vehicle_source": "MARKET",
                "vehicle_number": vehicle_number,
                "driver_name": f"Surinder Singh {uid}",
                "driver_phone": "9822233344",
                "package_count": 50,
                "actual_weight_mt": 18.5,
                "chargeable_weight_mt": 19.0,
                "freight_rate": 2000.0,
                "freight_amount": 38000.0,
                "advance_amount": 8000.0,
            },
            headers=auth_headers,
        )
        assert lr_res.status_code == 201
        lr_data = lr_res.json()
        lr_id = lr_data["id"]
        assert lr_data["status"] == "BOOKED"
        assert float(lr_data["balance_amount"]) == 30000.0

        # 6. Hire Challan for hired market vehicle
        hc_res = await client.post(
            "/api/v1/transport/hire-challans",
            json={
                "lr_id": lr_id,
                "vehicle_number": vehicle_number,
                "market_vehicle_id": mv_id,
                "owner_id": owner_id,
                "driver_id": driver_id,
                "driver_name": f"Surinder Singh {uid}",
                "hire_rate": 32000.0,
                "advance_amount": 10000.0,
                "tds_rate": 1.0,
            },
            headers=auth_headers,
        )
        assert hc_res.status_code == 201
        hc_data = hc_res.json()
        hc_id = hc_data["id"]
        assert hc_data["status"] == "ISSUED"
        # hire_rate 32000, tds 1% = 320, net 31680, advance 10000 -> balance 21680
        assert float(hc_data["balance_amount"]) == 21680.0

        # 7. Truck Hiring Note
        thn_res = await client.post(
            "/api/v1/transport/truck-hiring-notes",
            json={
                "hire_challan_id": hc_id,
                "vehicle_number": vehicle_number,
                "owner_name": f"Royal Transport {uid}",
                "agreed_rate": 32000.0,
                "advance_cash": 5000.0,
                "advance_diesel_slip": 5000.0,
                "terms_and_conditions": "Detention charges Rs 1500/day after 24 hrs loading/unloading.",
            },
            headers=auth_headers,
        )
        assert thn_res.status_code == 201

        # 8. Manual E-Way Bill Entry
        eway_res = await client.post(
            "/api/v1/transport/eway-bills",
            json={
                "eway_bill_number": f"2410{uid[:6]}99",
                "lr_id": lr_id,
                "valid_until": "2026-10-01T23:59:59Z",
                "approx_distance_km": 450,
                "vehicle_number": vehicle_number,
            },
            headers=auth_headers,
        )
        assert eway_res.status_code == 201

        # 9. Tracking Ping (Simulated FASTag / GPS Telemetry)
        ping_res = await client.post(
            "/api/v1/transport/tracking",
            json={
                "vehicle_number": vehicle_number,
                "tracking_mode": "GPS",
                "identifier": f"IMEI-8675309-{uid}",
                "last_latitude": 19.0760,
                "last_longitude": 72.8777,
                "location_name": "Navi Mumbai Expressway Toll",
                "speed_kmh": 62.5,
            },
            headers=auth_headers,
        )
        assert ping_res.status_code == 201

        # 10. Dispatch: LR transitions to IN_TRANSIT (Cascades Job to DISPATCHED)
        dispatch_res = await client.post(
            f"/api/v1/transport/lrs/{lr_id}/transition",
            json={"target_status": "IN_TRANSIT", "remarks": "Departed warehouse after cargo lashing"},
            headers=auth_headers,
        )
        assert dispatch_res.status_code == 200

        # 11. Arrival Report at destination hub
        ar_res = await client.post(
            "/api/v1/transport/arrival-reports",
            json={
                "lr_id": lr_id,
                "job_id": job_id,
                "destination_hub": "Bengaluru Electronic City Hub",
                "packages_received": 50,
                "packages_damaged": 0,
                "packages_short": 0,
                "condition_remarks": "Intact seals, clean cargo inspection",
                "receiver_name": "Sunil Logistics Executive",
            },
            headers=auth_headers,
        )
        assert ar_res.status_code == 201

        # 12. POD Record & Verification
        pod_res = await client.post(
            "/api/v1/transport/pod-records",
            json={
                "lr_id": lr_id,
                "receiver_name": "Ramesh Consignee In-Charge",
                "receiver_phone": "9876543210",
                "received_condition": "OK",
                "packages_delivered": 50,
                "document_path": f"r2://panther-tms/demo/pod/{uid}.pdf",
            },
            headers=auth_headers,
        )
        assert pod_res.status_code == 201
        pod_id = pod_res.json()["id"]

        # Verify POD (Advances LR to POD_VERIFIED, Job to CLOSED)
        verify_res = await client.post(
            f"/api/v1/transport/pod-records/{pod_id}/verify",
            json={"verification_status": "VERIFIED"},
            headers=auth_headers,
        )
        assert verify_res.status_code == 200

        # 13. Settle Hire Challan
        settle_res = await client.post(
            f"/api/v1/transport/hire-challans/{hc_id}/settle",
            json={"settlement_notes": "Final balance paid via NEFT after clean POD verification"},
            headers=auth_headers,
        )
        assert settle_res.status_code == 200
        assert settle_res.json()["status"] == "SETTLED"
        assert float(settle_res.json()["balance_amount"]) == 0.0

        # ======================================================================
        # 14. Query All 8 Transport Reports and Verify Real Data from this Flow
        # ======================================================================

        # Report 1: LR Booking Register
        lr_reg = (await client.get("/api/v1/transport-reports/lr-register", headers=auth_headers)).json()
        assert any(r["id"] == lr_id and r["status"] == "POD_VERIFIED" for r in lr_reg)

        # Report 2: LR Client-Wise
        client_wise = (await client.get("/api/v1/transport-reports/lr-client-wise", headers=auth_headers)).json()
        assert len(client_wise) > 0
        assert any(cw["total_lrs"] >= 1 for cw in client_wise)

        # Report 3: Hire Challan Register
        hc_reg = (await client.get("/api/v1/transport-reports/hc-register", headers=auth_headers)).json()
        assert any(h["id"] == hc_id for h in hc_reg)

        # Report 4: Pending HC Report
        pending_hc = (await client.get("/api/v1/transport-reports/pending-hc", headers=auth_headers)).json()
        # Since we settled this challan, it should not be in pending
        assert not any(h["id"] == hc_id for h in pending_hc)

        # Report 5: Unbilled Reports
        unbilled = (await client.get("/api/v1/transport-reports/unbilled", headers=auth_headers)).json()
        # Our verified LR must appear in unbilled reports ready for Phase 3 invoicing!
        assert any(u["id"] == lr_id for u in unbilled)

        # Report 6: Arrival Report Register
        arr_reg = (await client.get("/api/v1/transport-reports/arrival-register", headers=auth_headers)).json()
        assert any(a["destination_hub"] == "Bengaluru Electronic City Hub" for a in arr_reg)

        # Report 7: Unused Series
        unused = (await client.get("/api/v1/transport-reports/unused-series", headers=auth_headers)).json()
        assert len(unused) == 2
        assert any(u["series_name"] == "Standard GR/LR Series" and u["last_used_number"] >= 1 for u in unused)

        # Report 8: Invoice Register
        inv_reg = (await client.get("/api/v1/transport-reports/invoice-register", headers=auth_headers)).json()
        assert any(i["lr_number"] == lr_data["lr_number"] for i in inv_reg)
