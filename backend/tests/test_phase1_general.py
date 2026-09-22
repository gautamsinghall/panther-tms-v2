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

        # 2. Consignee CRUD (Testing without code, with PAN, address, pincode, country & county)
        c_res = await ac.post(
            "/api/v1/general/consignees",
            headers=headers,
            json={
                "name": f"Tata Motors Ltd {uid}",
                "contact_person": "Ramesh Kumar",
                "phone": "9876543210",
                "address": "Plot 42, MIDC Industrial Area, Chakan",
                "email": f"ramesh_{uid}@tatamotors.com",
                "gstin": "27AAACT2727Q1ZW",
                "pan": "AAACT2727Q",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "410501",
                "country": "India",
            }
        )
        assert c_res.status_code == 201
        c_data = c_res.json()
        consignee_id = c_data["id"]
        assert c_data["name"] == f"Tata Motors Ltd {uid}"
        assert c_data["code"] is None
        assert c_data["contact_person"] == "Ramesh Kumar"
        assert c_data["address"] == "Plot 42, MIDC Industrial Area, Chakan"
        assert c_data["gstin"] == "27AAACT2727Q1ZW"
        assert c_data["pan"] == "AAACT2727Q"
        assert c_data["city"] == "Pune"
        assert c_data["state"] == "Maharashtra"
        assert c_data["pincode"] == "410501"
        assert c_data["country"] == "India"

        # Test county alias
        c_res2 = await ac.post(
            "/api/v1/general/consignees",
            headers=headers,
            json={
                "name": f"Mahindra Logistics {uid}",
                "phone": "9123456780",
                "county": "India",
            }
        )
        assert c_res2.status_code == 201
        assert c_res2.json()["country"] == "India"

        get_c = await ac.get(f"/api/v1/general/consignees/{consignee_id}", headers=headers)
        assert get_c.status_code == 200
        assert get_c.json()["name"] == f"Tata Motors Ltd {uid}"
        assert get_c.json()["pan"] == "AAACT2727Q"
        assert get_c.json()["address"] == "Plot 42, MIDC Industrial Area, Chakan"
        assert get_c.json()["pincode"] == "410501"
        assert get_c.json()["country"] == "India"

        # 3. Consigner CRUD (Testing without code, with PAN, address, pincode, country & county)
        s_res = await ac.post(
            "/api/v1/general/consigners",
            headers=headers,
            json={
                "name": f"Jindal Steel & Power {uid}",
                "contact_person": "Alok Sharma",
                "phone": "9876543210",
                "address": "Industrial Area, Phase II",
                "email": f"alok_{uid}@jspl.com",
                "gstin": "22AAACJ1234F1Z1",
                "pan": "AACJ1234F",
                "city": "Raigarh",
                "state": "Chhattisgarh",
                "pincode": "496001",
                "country": "India",
            }
        )
        assert s_res.status_code == 201
        s_data = s_res.json()
        consigner_id = s_data["id"]
        assert s_data["name"] == f"Jindal Steel & Power {uid}"
        assert s_data["code"] is None
        assert s_data["contact_person"] == "Alok Sharma"
        assert s_data["address"] == "Industrial Area, Phase II"
        assert s_data["gstin"] == "22AAACJ1234F1Z1"
        assert s_data["pan"] == "AACJ1234F"
        assert s_data["city"] == "Raigarh"
        assert s_data["state"] == "Chhattisgarh"
        assert s_data["pincode"] == "496001"
        assert s_data["country"] == "India"

        # Test county alias on consigner
        s_res2 = await ac.post(
            "/api/v1/general/consigners",
            headers=headers,
            json={
                "name": f"Steel Authority {uid}",
                "phone": "9812345678",
                "county": "India",
            }
        )
        assert s_res2.status_code == 201
        assert s_res2.json()["country"] == "India"

        get_s = await ac.get(f"/api/v1/general/consigners/{consigner_id}", headers=headers)
        assert get_s.status_code == 200
        assert get_s.json()["name"] == f"Jindal Steel & Power {uid}"
        assert get_s.json()["pan"] == "AACJ1234F"
        assert get_s.json()["address"] == "Industrial Area, Phase II"
        assert get_s.json()["pincode"] == "496001"
        assert get_s.json()["country"] == "India"

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
