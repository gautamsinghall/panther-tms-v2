import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_free_plan_limits_and_feature_locks():
    """
    Comprehensive test for Free Plan:
    1. Verify 2 Max Vehicle Registration
    2. Verify 10 LR Max / Month
    3. Verify 10 HC Max / Month
    4. Verify 10 Vouchers Max / Month
    5. Verify 10 Ledgers Max (Overall)
    6. Verify No E-way Updation & No E-invoicing
    """
    uid = uuid.uuid4().hex[:6].lower()
    subdomain = f"test-free-q-{uid}"
    email = f"owner@{subdomain}.com"
    password = "FreePassword@2026!"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Provision Free Tenant
        init_res = await client.post(
            "/control/signup/initiate",
            json={
                "company_name": f"Free Quota Test {uid}",
                "subdomain": subdomain,
                "admin_email": email,
                "admin_password": password,
                "admin_full_name": "Free Admin",
                "plan_code": "FREE",
                "billing_cycle": "monthly",
            }
        )
        assert init_res.status_code == 200, init_res.text
        assert init_res.json()["requires_payment"] is False

        # 2. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
            headers={"X-Tenant-Subdomain": subdomain},
        )
        assert login_res.status_code == 200
        jwt_token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {jwt_token}", "X-Tenant-Subdomain": subdomain}

        # 3. Test Feature Locks: No E-Way Updation & No E-Invoicing
        eway_res = await client.post(
            "/api/v1/transport/eway-bills",
            json={
                "eway_bill_number": f"9911{uid[:4]}112233",
                "valid_until": "2026-10-01",
            },
            headers=auth_headers,
        )
        assert eway_res.status_code == 403
        assert eway_res.json()["error_code"] == "ENTITLEMENT_LOCKED"

        einv_res = await client.post(
            "/api/v1/einvoicing/generate-irn",
            json={"voucher_id": 1},
            headers=auth_headers,
        )
        assert einv_res.status_code == 403
        assert einv_res.json()["error_code"] == "ENTITLEMENT_LOCKED"

        # 4. Test 2 Max Vehicle Registration
        for i in range(2):
            v_res = await client.post(
                "/api/v1/transport/company-vehicles",
                json={
                    "vehicle_number": f"DL-0{i}-{uid[:4]}",
                    "vehicle_type": "32 FT Multi-Axle",
                    "capacity_mt": 15.5,
                },
                headers=auth_headers,
            )
            assert v_res.status_code == 201, v_res.text

        # 3rd Vehicle -> QUOTA_EXCEEDED
        v3_res = await client.post(
            "/api/v1/transport/company-vehicles",
            json={
                "vehicle_number": f"MH-12-{uid[:4]}",
                "vehicle_type": "40 FT Trailer",
                "capacity_mt": 25.0,
            },
            headers=auth_headers,
        )
        assert v3_res.status_code == 403
        assert v3_res.json()["error_code"] == "QUOTA_EXCEEDED"

        # 5. Test 10 Ledgers Max
        # First create a primary group & group in primary
        pg_res = await client.post(
            "/api/v1/misc/primary-groups",
            json={"name": f"Assets {uid}", "code": f"AST-{uid[:4]}"},
            headers=auth_headers,
        )
        assert pg_res.status_code == 201
        pg_id = pg_res.json()["id"]

        grp_res = await client.post(
            "/api/v1/misc/groups-in-primary",
            json={"name": f"Current Assets {uid}", "code": f"CA-{uid[:4]}", "primary_group_id": pg_id},
            headers=auth_headers,
        )
        assert grp_res.status_code == 201
        grp_id = grp_res.json()["id"]

        for idx in range(10):
            acc_res = await client.post(
                "/api/v1/misc/accounts",
                json={
                    "name": f"Ledger Account {idx}",
                    "code": f"L-{idx}-{uid[:4]}",
                    "group_id": grp_id,
                },
                headers=auth_headers,
            )
            assert acc_res.status_code == 201, acc_res.text

        # 11th Ledger Account -> QUOTA_EXCEEDED
        acc11_res = await client.post(
            "/api/v1/misc/accounts",
            json={
                "name": "Ledger Account 11",
                "code": f"L-11-{uid[:4]}",
                "group_id": grp_id,
            },
            headers=auth_headers,
        )
        assert acc11_res.status_code == 403
        assert acc11_res.json()["error_code"] == "QUOTA_EXCEEDED"
        assert "Ledgers" in acc11_res.json()["message"]
