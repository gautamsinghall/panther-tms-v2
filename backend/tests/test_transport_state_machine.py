import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_job_and_lr_state_machine_transitions():
    transport = ASGITransport(app=app)
    headers = {"X-Tenant-Subdomain": "demo"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login as Admin
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers,
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "X-Tenant-Subdomain": "demo"}

        # Get consigner and consignee IDs
        consigners = (await client.get("/api/v1/general/consigners", headers=auth_headers)).json()
        consignees = (await client.get("/api/v1/general/consignees", headers=auth_headers)).json()
        assert len(consigners) > 0, "No consigners found"
        assert len(consignees) > 0, "No consignees found"
        consigner_id = consigners[0]["id"]
        consignee_id = consignees[0]["id"]

        # 1. Create a Job
        job_res = await client.post(
            "/api/v1/transport/jobs",
            json={
                "consigner_id": consigner_id,
                "consignee_id": consignee_id,
                "cargo_description": "Industrial Machinery",
                "estimated_weight_mt": 15.5,
                "estimated_packages": 20,
            },
            headers=auth_headers,
        )
        assert job_res.status_code == 201, job_res.text
        job_data = job_res.json()
        job_id = job_data["id"]
        assert job_data["status"] == "OPEN"

        # 2. Test Invalid Job Transition (OPEN -> DELIVERED should fail)
        invalid_job = await client.post(
            f"/api/v1/transport/jobs/{job_id}/transition",
            json={"target_status": "DELIVERED"},
            headers=auth_headers,
        )
        assert invalid_job.status_code == 400
        assert invalid_job.json()["error_code"] == "INVALID_STATE_TRANSITION"

        # 3. Create an LR against this Job
        lr_res = await client.post(
            "/api/v1/transport/lrs",
            json={
                "job_id": job_id,
                "consigner_id": consigner_id,
                "consignee_id": consignee_id,
                "vehicle_number": "MH12AB9999",
                "actual_weight_mt": 15.5,
                "chargeable_weight_mt": 16.0,
                "freight_amount": 25000.00,
                "advance_amount": 5000.00,
                "package_count": 20,
            },
            headers=auth_headers,
        )
        assert lr_res.status_code == 201, lr_res.text
        lr_data = lr_res.json()
        lr_id = lr_data["id"]
        assert lr_data["status"] == "BOOKED"
        assert float(lr_data["total_freight_amount"]) == 25000.00
        assert float(lr_data["balance_amount"]) == 20000.00

        # Check that Job automatically cascaded to BOOKED
        job_check = (await client.get(f"/api/v1/transport/jobs", headers=auth_headers)).json()
        target_job = next(j for j in job_check if j["id"] == job_id)
        assert target_job["status"] == "BOOKED"

        # 4. Test Invalid LR Transition (BOOKED -> POD_VERIFIED directly should fail)
        invalid_lr = await client.post(
            f"/api/v1/transport/lrs/{lr_id}/transition",
            json={"target_status": "POD_VERIFIED"},
            headers=auth_headers,
        )
        assert invalid_lr.status_code == 400
        assert invalid_lr.json()["error_code"] == "INVALID_STATE_TRANSITION"

        # 5. Valid LR Transition: BOOKED -> IN_TRANSIT (should cascade Job to DISPATCHED)
        transit_lr = await client.post(
            f"/api/v1/transport/lrs/{lr_id}/transition",
            json={"target_status": "IN_TRANSIT", "remarks": "Vehicle departed origin warehouse"},
            headers=auth_headers,
        )
        assert transit_lr.status_code == 200
        assert transit_lr.json()["status"] == "IN_TRANSIT"

        job_check = (await client.get(f"/api/v1/transport/jobs", headers=auth_headers)).json()
        target_job = next(j for j in job_check if j["id"] == job_id)
        assert target_job["status"] == "DISPATCHED"

        # 6. Valid LR Transition: IN_TRANSIT -> ARRIVED
        arrived_lr = await client.post(
            f"/api/v1/transport/lrs/{lr_id}/transition",
            json={"target_status": "ARRIVED", "remarks": "Vehicle reached destination hub"},
            headers=auth_headers,
        )
        assert arrived_lr.status_code == 200
        assert arrived_lr.json()["status"] == "ARRIVED"

        # 7. Valid LR Transition: ARRIVED -> DELIVERED
        deliv_lr = await client.post(
            f"/api/v1/transport/lrs/{lr_id}/transition",
            json={"target_status": "DELIVERED"},
            headers=auth_headers,
        )
        assert deliv_lr.status_code == 200
        assert deliv_lr.json()["status"] == "DELIVERED"

        # 8. Create and Verify POD: DELIVERED -> POD_RECEIVED -> POD_VERIFIED (Job -> CLOSED)
        pod_res = await client.post(
            "/api/v1/transport/pod-records",
            json={
                "lr_id": lr_id,
                "receiver_name": "Ramesh Consignee Representative",
                "receiver_phone": "9876543210",
                "received_condition": "OK",
                "packages_delivered": 20,
            },
            headers=auth_headers,
        )
        assert pod_res.status_code == 201
        pod_id = pod_res.json()["id"]

        # Verify POD
        verify_res = await client.post(
            f"/api/v1/transport/pod-records/{pod_id}/verify",
            json={"verification_status": "VERIFIED", "verification_notes": "Clean stamp and signature confirmed"},
            headers=auth_headers,
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["verification_status"] == "VERIFIED"

        # Check LR is now POD_VERIFIED and Job is CLOSED
        lr_check = (await client.get("/api/v1/transport/lrs", headers=auth_headers)).json()
        target_lr = next(l for l in lr_check if l["id"] == lr_id)
        assert target_lr["status"] == "POD_VERIFIED"

        job_check = (await client.get("/api/v1/transport/jobs", headers=auth_headers)).json()
        target_job = next(j for j in job_check if j["id"] == job_id)
        assert target_job["status"] == "CLOSED"
