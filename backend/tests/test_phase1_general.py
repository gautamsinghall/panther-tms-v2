import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_general_module_crud_masters():
    uid = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as Company Admin
        login_res = await ac.post(
            "/api/v1/auth/login",
            headers={"X-Tenant-Subdomain": "demo"},
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"X-Tenant-Subdomain": "demo", "Authorization": f"Bearer {token}"}

        # 2. Consignee CRUD
        c_res = await ac.post(
            "/api/v1/general/consignees",
            headers=headers,
            json={
                "name": f"Tata Motors Ltd {uid}",
                "code": f"TATA-{uid}",
                "contact_person": "Ramesh Kumar",
                "phone": "9876543210",
                "email": f"ramesh_{uid}@tatamotors.com",
                "city": "Pune",
                "state": "Maharashtra",
            }
        )
        assert c_res.status_code == 201
        consignee_id = c_res.json()["id"]

        get_c = await ac.get(f"/api/v1/general/consignees/{consignee_id}", headers=headers)
        assert get_c.status_code == 200
        assert get_c.json()["name"] == f"Tata Motors Ltd {uid}"

        # 3. Consigner CRUD
        s_res = await ac.post(
            "/api/v1/general/consigners",
            headers=headers,
            json={
                "name": f"Jindal Steel & Power {uid}",
                "code": f"JSP-{uid}",
                "city": "Raigarh",
                "state": "Chhattisgarh",
            }
        )
        assert s_res.status_code == 201

        # 4. Location CRUD
        loc_res = await ac.post(
            "/api/v1/general/locations",
            headers=headers,
            json={
                "country": "India",
                "state": "Gujarat",
                "city_name": f"Mundra-{uid}",
                "location_code": f"MUN-{uid}",
                "is_pickup_point": True,
                "is_drop_point": True,
            }
        )
        assert loc_res.status_code == 201

        # 5. Industry CRUD
        ind_res = await ac.post(
            "/api/v1/general/industries",
            headers=headers,
            json={
                "name": f"Automotive Vertical {uid}",
                "code": f"AUTO-{uid}",
                "description": "OEMs and auto-component manufacturers",
            }
        )
        assert ind_res.status_code == 201

        # 6. Designation CRUD
        des_res = await ac.post(
            "/api/v1/general/designations",
            headers=headers,
            json={
                "title": f"Dispatch Officer {uid}",
                "department": "Logistics Operations",
            }
        )
        assert des_res.status_code == 201

        # 7. Group Company CRUD
        gc_res = await ac.post(
            "/api/v1/general/group-companies",
            headers=headers,
            json={
                "company_name": f"Demo Logistics Roadlines {uid}",
                "legal_name": f"Demo Logistics Roadlines Pvt Ltd {uid}",
                "gstin": "27AAACD1234F1Z5",
            }
        )
        assert gc_res.status_code == 201

        # 8. Unit CRUD
        u_res = await ac.post(
            "/api/v1/general/units",
            headers=headers,
            json={
                "name": f"Metric Tonne {uid}",
                "code": f"MT{uid[:3]}",
                "description": "1000 Kilograms",
            }
        )
        assert u_res.status_code == 201

        # 9. Method of Packing CRUD
        pack_res = await ac.post(
            "/api/v1/general/packing-methods",
            headers=headers,
            json={
                "name": f"Corrugated Boxes {uid}",
                "code": f"BOX-{uid}",
                "description": "Cardboard carton boxes",
            }
        )
        assert pack_res.status_code == 201
