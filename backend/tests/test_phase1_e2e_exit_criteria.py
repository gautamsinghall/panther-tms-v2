import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase1_exit_criteria_e2e():
    """
    Phase 1 Exit Criteria E2E Test:
    A Company Admin creates an employee, restricts them to a subset of General Module features,
    and the employee's navigation and backend access strictly reflects that restriction.
    """
    uid = uuid.uuid4().hex[:6]
    headers_tenant = {"X-Tenant-Subdomain": "demo"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Company Admin logs in
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers_tenant,
        )
        assert admin_login.status_code == 200, admin_login.text
        admin_token = admin_login.json()["access_token"]
        admin_auth_headers = {
            "Authorization": f"Bearer {admin_token}",
            "X-Tenant-Subdomain": "demo",
        }

        # 2. Company Admin creates a restricted role: "Consignment Specialist"
        # Only view & create on consignee and consigner
        role_resp = await client.post(
            "/api/v1/settings/roles",
            json={
                "name": f"Consignment Specialist {uid}",
                "description": "Can only view and create Consignees & Consigners",
                "permissions": [
                    {"module": "general", "feature": "consignee", "permission": "view", "is_allowed": True},
                    {"module": "general", "feature": "consignee", "permission": "create", "is_allowed": True},
                    {"module": "general", "feature": "consigner", "permission": "view", "is_allowed": True},
                    {"module": "general", "feature": "consigner", "permission": "create", "is_allowed": True},
                ],
            },
            headers=admin_auth_headers,
        )
        assert role_resp.status_code == 201, role_resp.text
        role_id = role_resp.json()["id"]

        # 3. Company Admin creates an employee assigned to this role
        user_email = f"specialist_{uid}@demo.com"
        user_resp = await client.post(
            "/api/v1/settings/users",
            json={
                "email": user_email,
                "password": "specialistpassword123",
                "full_name": f"Deepak Sharma {uid}",
                "role": "EMPLOYEE",
                "role_id": role_id,
            },
            headers=admin_auth_headers,
        )
        assert user_resp.status_code == 201, user_resp.text

        # 4. Employee logs in
        emp_login = await client.post(
            "/api/v1/auth/login",
            json={"email": user_email, "password": "specialistpassword123"},
            headers=headers_tenant,
        )
        assert emp_login.status_code == 200, emp_login.text
        emp_token = emp_login.json()["access_token"]
        emp_auth_headers = {
            "Authorization": f"Bearer {emp_token}",
            "X-Tenant-Subdomain": "demo",
        }

        # 5. Check employee navigation tree
        nav_resp = await client.get("/api/v1/auth/navigation", headers=emp_auth_headers)
        assert nav_resp.status_code == 200, nav_resp.text
        nav_modules = nav_resp.json()
        nav_module_ids = [m["id"] for m in nav_modules]

        # Settings and transport should NOT appear in navigation
        assert "settings" not in nav_module_ids
        assert "transport" not in nav_module_ids
        assert "general" in nav_module_ids

        # Inside general module, ONLY consignee and consigner should appear
        general_mod = next(m for m in nav_modules if m["id"] == "general")
        general_features = [item["feature"] for item in general_mod["items"]]
        assert general_features == ["consignee", "consigner"]

        # 6. Employee creates a consignee (Allowed)
        create_resp = await client.post(
            "/api/v1/general/consignees",
            json={
                "name": f"E2E Allowed Logistics {uid} Pvt Ltd",
                "city": "Mumbai",
                "state": "Maharashtra",
            },
            headers=emp_auth_headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        consignee_id = create_resp.json()["id"]

        # 7. Employee tries to delete the consignee (Forbidden - only view/create granted)
        del_resp = await client.delete(
            f"/api/v1/general/consignees/{consignee_id}",
            headers=emp_auth_headers,
        )
        assert del_resp.status_code == 403, f"Expected 403, got {del_resp.status_code}"
        assert del_resp.json()["error_code"] == "FORBIDDEN"
        assert "Access denied" in del_resp.json()["message"]

        # 8. Employee tries to access locations (Forbidden - location feature not granted)
        loc_resp = await client.get(
            "/api/v1/general/locations",
            headers=emp_auth_headers,
        )
        assert loc_resp.status_code == 403, f"Expected 403, got {loc_resp.status_code}"

        # 9. Employee tries to view user list (Forbidden - settings not granted)
        users_resp = await client.get(
            "/api/v1/settings/users",
            headers=emp_auth_headers,
        )
        assert users_resp.status_code == 403, f"Expected 403, got {users_resp.status_code}"
