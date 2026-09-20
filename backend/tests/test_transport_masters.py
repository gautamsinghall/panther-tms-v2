import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_transport_fleet_and_driver_masters_crud():
    uid = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    headers = {"X-Tenant-Subdomain": "demo"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Admin
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers,
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "X-Tenant-Subdomain": "demo"}

        # 2. Vehicle Owner CRUD
        owner_res = await client.post(
            "/api/v1/transport/vehicle-owners",
            json={
                "name": f"Suraj Transport Co {uid}",
                "phone": "9822012345",
                "pan": "ABCDE1234F",
                "bank_name": "State Bank of India",
                "bank_account_no": "12345678901",
                "bank_ifsc": "SBIN0001234",
            },
            headers=auth_headers,
        )
        assert owner_res.status_code == 201, owner_res.text
        owner_id = owner_res.json()["id"]

        # 3. Driver CRUD
        driver_res = await client.post(
            "/api/v1/transport/drivers",
            json={
                "name": f"Vikram Singh {uid}",
                "phone": "9765432100",
                "license_number": f"MH14{uid.upper()}9999",
                "emergency_contact": "9998887776",
                "blood_group": "B+",
            },
            headers=auth_headers,
        )
        assert driver_res.status_code == 201, driver_res.text
        driver_id = driver_res.json()["id"]

        # 4. Market Vehicle linked to Owner
        mv_res = await client.post(
            "/api/v1/transport/market-vehicles",
            json={
                "vehicle_number": f"MH14{uid[:4].upper()}",
                "vehicle_type": "32ft Multi-Axle Open",
                "capacity_mt": 25.0,
                "owner_id": owner_id,
            },
            headers=auth_headers,
        )
        assert mv_res.status_code == 201, mv_res.text
        mv_id = mv_res.json()["id"]

        # 5. Company Vehicle linked to Driver
        cv_res = await client.post(
            "/api/v1/transport/company-vehicles",
            json={
                "vehicle_number": f"MH12{uid[:4].upper()}",
                "vehicle_type": "20ft Container",
                "capacity_mt": 10.0,
                "chassis_number": f"CHS-{uid}",
                "engine_number": f"ENG-{uid}",
                "default_driver_id": driver_id,
            },
            headers=auth_headers,
        )
        assert cv_res.status_code == 201, cv_res.text
        cv_id = cv_res.json()["id"]

        # 6. Verify Listings
        owners = (await client.get("/api/v1/transport/vehicle-owners", headers=auth_headers)).json()
        assert any(o["id"] == owner_id for o in owners)

        drivers = (await client.get("/api/v1/transport/drivers", headers=auth_headers)).json()
        assert any(d["id"] == driver_id for d in drivers)

        mvs = (await client.get("/api/v1/transport/market-vehicles", headers=auth_headers)).json()
        assert any(m["id"] == mv_id for m in mvs)

        cvs = (await client.get("/api/v1/transport/company-vehicles", headers=auth_headers)).json()
        assert any(c["id"] == cv_id for c in cvs)
