import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_rbac_custom_role_and_employee_restrictions():
    uid = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as Company Admin
        admin_login = await ac.post(
            "/api/v1/auth/login",
            headers={"X-Tenant-Subdomain": "demo"},
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"}
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"X-Tenant-Subdomain": "demo", "Authorization": f"Bearer {admin_token}"}

        # 2. Create custom role 'Dispatch Associate' with ONLY consignee view & create
        role_res = await ac.post(
            "/api/v1/settings/roles",
            headers=admin_headers,
            json={
                "name": f"Dispatch Associate {uid}",
                "description": "Can only view and create consignees",
                "permissions": [
                    {"module": "general", "feature": "consignee", "permission": "view", "is_allowed": True},
                    {"module": "general", "feature": "consignee", "permission": "create", "is_allowed": True},
                ]
            }
        )
        assert role_res.status_code == 201
        role_id = role_res.json()["id"]

        # 3. Create employee user 'dispatcher_{uid}@demo.com' with this role
        emp_email = f"dispatcher_{uid}@demo.com"
        user_res = await ac.post(
            "/api/v1/settings/users",
            headers=admin_headers,
            json={
                "email": emp_email,
                "password": "Password123!",
                "full_name": "Suresh Dispatcher",
                "role": "EMPLOYEE",
                "role_id": role_id,
            }
        )
        assert user_res.status_code == 201

        # 4. Login as the newly created employee
        emp_login = await ac.post(
            "/api/v1/auth/login",
            headers={"X-Tenant-Subdomain": "demo"},
            json={"email": emp_email, "password": "Password123!"}
        )
        assert emp_login.status_code == 200
        emp_token = emp_login.json()["access_token"]
        emp_headers = {"X-Tenant-Subdomain": "demo", "Authorization": f"Bearer {emp_token}"}

        # 5. Verify employee CAN view consignees (Allowed)
        allowed_res = await ac.get("/api/v1/general/consignees", headers=emp_headers)
        assert allowed_res.status_code == 200

        # 6. Verify employee CAN create a consignee (Allowed)
        create_res = await ac.post(
            "/api/v1/general/consignees",
            headers=emp_headers,
            json={"name": f"Permitted Consignee {uid}", "city": "Delhi"}
        )
        assert create_res.status_code == 201
        created_id = create_res.json()["id"]

        # 7. Verify employee CANNOT delete a consignee (Missing 'delete' permission -> 403)
        del_res = await ac.delete(f"/api/v1/general/consignees/{created_id}", headers=emp_headers)
        assert del_res.status_code == 403
        assert del_res.json()["error_code"] == "FORBIDDEN"

        # 8. Verify employee CANNOT access Industries (Missing 'general.industry.view' -> 403)
        restricted_res = await ac.get("/api/v1/general/industries", headers=emp_headers)
        assert restricted_res.status_code == 403
        assert restricted_res.json()["error_code"] == "FORBIDDEN"

        # 9. Verify employee navigation tree omits restricted items
        nav_res = await ac.get("/api/v1/auth/navigation", headers=emp_headers)
        assert nav_res.status_code == 200
        nav_tree = nav_res.json()

        general_module = next((m for m in nav_tree if m["id"] == "general"), None)
        assert general_module is not None
        feature_keys = [item["feature"] for item in general_module["items"]]
        assert "consignee" in feature_keys
        assert "industry" not in feature_keys
        assert "location" not in feature_keys
        assert "group_company" not in feature_keys
