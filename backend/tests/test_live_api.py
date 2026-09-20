import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_and_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_control_plans_and_tenant():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Check plans
        plans_res = await ac.get("/api/v1/control/plans")
        assert plans_res.status_code == 200
        plans = plans_res.json()
        assert len(plans) >= 4
        codes = [p["code"] for p in plans]
        assert "FREE" in codes and "PRO" in codes and "ENTERPRISE" in codes

        # Check demo tenant
        tenant_res = await ac.get("/api/v1/control/tenants/demo")
        assert tenant_res.status_code == 200
        tenant = tenant_res.json()
        assert tenant["subdomain"] == "demo"
        assert tenant["db_name"] == "panther_tenant_demo"
        assert tenant["status"] == "ACTIVE"

@pytest.mark.asyncio
async def test_auth_login_and_me():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Invalid login
        bad_login = await ac.post(
            "/api/v1/auth/login",
            headers={"X-Tenant-Subdomain": "demo"},
            json={"email": "admin@demo.com", "password": "WrongPassword!"}
        )
        assert bad_login.status_code == 401
        assert bad_login.json()["error_code"] == "UNAUTHORIZED"

        # 2. Valid login
        login_res = await ac.post(
            "/api/v1/auth/login",
            headers={"X-Tenant-Subdomain": "demo"},
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"}
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        assert token_data["subdomain"] == "demo"
        token = token_data["access_token"]

        # 3. Authenticated /me endpoint
        me_res = await ac.get(
            "/api/v1/auth/me",
            headers={
                "X-Tenant-Subdomain": "demo",
                "Authorization": f"Bearer {token}"
            }
        )
        assert me_res.status_code == 200
        user = me_res.json()
        assert user["email"] == "admin@demo.com"
        assert user["role"] == "COMPANY_ADMIN"
        assert user["tenant"]["subdomain"] == "demo"

@pytest.mark.asyncio
async def test_cross_tenant_token_rejection():
    """Verify that a token issued for 'demo' cannot access a different tenant."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login to demo
        login_res = await ac.post(
            "/api/v1/auth/login",
            headers={"X-Tenant-Subdomain": "demo"},
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"}
        )
        token = login_res.json()["access_token"]

        # Attempt to access another tenant with demo's token
        cross_res = await ac.get(
            "/api/v1/auth/me",
            headers={
                "X-Tenant-Subdomain": "nonexistent_tenant",
                "Authorization": f"Bearer {token}"
            }
        )
        # Should be rejected (404 tenant not found or 401 tenant mismatch)
        assert cross_res.status_code in (401, 404)
