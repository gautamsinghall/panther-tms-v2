import hmac
import hashlib
import json
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

@pytest.mark.asyncio
async def test_phase6_plan_definitions_and_control_plane():
    """
    Verify control plane plan definitions (Free, Pro, Business, Enterprise)
    with concrete module entitlements and numerical quota limits.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/control/plans")
        assert resp.status_code == 200
        plans = resp.json()
        assert len(plans) >= 4
        codes = [p["code"] for p in plans]
        assert "FREE" in codes
        assert "PRO" in codes
        assert "BUSINESS" in codes
        assert "ENTERPRISE" in codes

        # Verify FREE plan entitlements
        free_plan = next(p for p in plans if p["code"] == "FREE")
        features = {e["feature_key"]: e["limit_value"] for e in free_plan["entitlements"]}
        assert features.get("module_transport") == "true"
        assert features.get("max_users") == "1"
        assert features.get("max_vehicles") == "1"
        assert features.get("max_invoices_per_month") == "10"
        # Fleet and accounts should not be enabled in FREE
        assert features.get("module_fleet") != "true"
        assert features.get("module_accounts") != "true"

@pytest.mark.asyncio
async def test_phase6_self_serve_free_signup_and_entitlement_lock():
    """
    Test self-serve signup flow for Free plan:
    1. Initiate signup
    2. Complete provisioning
    3. Verify isolated tenant DB creation and admin login
    4. Verify entitlement locking: allowed in Transport, locked from Fleet & Accounts
    """
    uid = uuid.uuid4().hex[:6].lower()
    subdomain = f"test-free-{uid}"
    email = f"admin@{subdomain}.com"
    password = "TestPassword@2026!"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Initiate
        init_res = await client.post(
            "/control/signup/initiate",
            json={
                "company_name": f"Free Logistics {uid}",
                "subdomain": subdomain,
                "admin_email": email,
                "admin_name": "Free Admin",
                "admin_password": password,
                "plan_code": "FREE",
                "billing_cycle": "MONTHLY",
            },
        )
        assert init_res.status_code == 200, init_res.text
        init_data = init_res.json()
        assert init_data["requires_payment"] is False
        assert init_data["subdomain"] == subdomain

        # Step 2: Complete
        comp_res = await client.post(
            "/control/signup/complete",
            json={
                "subdomain": subdomain,
                "plan_code": "FREE",
            },
        )
        assert comp_res.status_code == 200, comp_res.text
        comp_data = comp_res.json()
        assert comp_data["status"] == "ACTIVE"

        # Step 3: Login to new tenant
        headers = {"X-Tenant-Subdomain": subdomain}
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
            headers=headers,
        )
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "X-Tenant-Subdomain": subdomain}

        # Step 4: Access permitted module (Transport) -> 200
        tr_res = await client.get("/api/v1/transport/lrs", headers=auth_headers)
        assert tr_res.status_code == 200

        # Step 5: Access locked module (Accounts) -> 403 ENTITLEMENT_LOCKED
        acc_res = await client.get("/api/v1/accounts/vouchers", headers=auth_headers)
        assert acc_res.status_code == 403
        err = acc_res.json()
        assert err.get("error_code") == "ENTITLEMENT_LOCKED"
        assert "accounts" in err.get("message", "").lower()

        # Step 6: Access locked module (Fleet) -> 403 ENTITLEMENT_LOCKED
        fleet_res = await client.get("/api/v1/fleet/documents", headers=auth_headers)
        assert fleet_res.status_code == 403
        assert fleet_res.json().get("error_code") == "ENTITLEMENT_LOCKED"

        # Step 7: Verify quota enforcement: max_users = 1
        # Trying to create a second user should fail with QUOTA_EXCEEDED
        user_res = await client.post(
            "/api/v1/settings/users",
            json={
                "email": f"driver@{subdomain}.com",
                "full_name": "Driver Two",
                "role": "DISPATCHER",
                "password": "Password@123",
            },
            headers=auth_headers,
        )
        assert user_res.status_code == 403
        assert user_res.json().get("error_code") == "QUOTA_EXCEEDED"

@pytest.mark.asyncio
async def test_phase6_paid_signup_and_razorpay_webhook_lifecycle():
    """
    Test paid signup flow, Razorpay HMAC-SHA256 webhook signature verification,
    idempotent event processing, and subscription lifecycle transitions.
    """
    uid = uuid.uuid4().hex[:6].lower()
    subdomain = f"test-paid-{uid}"
    email = f"admin@{subdomain}.com"
    password = "PaidPassword@2026!"
    sub_id = f"sub_{uid}"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Initiate Paid Signup (PRO)
        init_res = await client.post(
            "/control/signup/initiate",
            json={
                "company_name": f"Paid Fleet {uid}",
                "subdomain": subdomain,
                "admin_email": email,
                "admin_name": "Paid Admin",
                "admin_password": password,
                "plan_code": "PRO",
                "billing_cycle": "MONTHLY",
            },
        )
        assert init_res.status_code == 200
        init_data = init_res.json()
        assert init_data["requires_payment"] is True
        real_sub_id = init_data["subscription_id"]
        pay_id = f"pay_{uid}"

        # Generate HMAC payment signature per rules.md §8
        msg = f"{pay_id}|{real_sub_id}".encode("utf-8")
        valid_payment_sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        # 2. Complete with payment details
        comp_res = await client.post(
            "/control/signup/complete",
            json={
                "subdomain": subdomain,
                "plan_code": "PRO",
                "razorpay_payment_id": pay_id,
                "razorpay_subscription_id": real_sub_id,
                "razorpay_signature": valid_payment_sig,
            },
        )
        assert comp_res.status_code == 200, comp_res.text
        assert comp_res.json()["status"] == "ACTIVE"

        # 3. Simulate Razorpay Webhook: subscription.charged
        webhook_payload = {
            "id": f"evt_charge_{uid}",
            "entity": "event",
            "account_id": "acc_mock_123",
            "event": "subscription.charged",
            "contains": ["subscription", "payment"],
            "payload": {
                "subscription": {
                    "entity": {
                        "id": real_sub_id,
                        "status": "active",
                        "notes": {"subdomain": subdomain},
                        "current_start": 1789000000,
                        "current_end": 1791592000,
                    }
                },
                "payment": {
                    "entity": {
                        "id": f"pay_charged_{uid}",
                        "amount": 249900,
                        "status": "captured",
                    }
                },
            },
            "created_at": 1789000100,
        }
        raw_body = json.dumps(webhook_payload)
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        sig = hmac.new(secret.encode("utf-8"), raw_body.encode("utf-8"), hashlib.sha256).hexdigest()

        # Send valid signed webhook
        wh_res = await client.post(
            "/control/webhooks/razorpay",
            content=raw_body,
            headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
        )
        assert wh_res.status_code == 200
        assert wh_res.json()["status"] == "processed"

        # Idempotent replay: send same webhook again -> should return ignored / already processed
        wh_replay = await client.post(
            "/control/webhooks/razorpay",
            content=raw_body,
            headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
        )
        assert wh_replay.status_code == 200
        assert wh_replay.json()["status"] == "ignored"

        # Test invalid signature -> 400 Bad Request per rules.md §8
        wh_invalid = await client.post(
            "/control/webhooks/razorpay",
            content=raw_body,
            headers={"X-Razorpay-Signature": "invalid_tampered_signature", "Content-Type": "application/json"},
        )
        assert wh_invalid.status_code == 400

        # 4. Simulate subscription.halted / payment.failed -> grace period
        halt_payload = {
            "id": f"evt_halt_{uid}",
            "entity": "event",
            "account_id": "acc_mock_123",
            "event": "subscription.halted",
            "contains": ["subscription"],
            "payload": {
                "subscription": {
                    "entity": {
                        "id": real_sub_id,
                        "status": "halted",
                        "notes": {"subdomain": subdomain},
                    }
                }
            },
            "created_at": 1789000200,
        }
        halt_body = json.dumps(halt_payload)
        halt_sig = hmac.new(secret.encode("utf-8"), halt_body.encode("utf-8"), hashlib.sha256).hexdigest()
        wh_halt = await client.post(
            "/control/webhooks/razorpay",
            content=halt_body,
            headers={"X-Razorpay-Signature": halt_sig, "Content-Type": "application/json"},
        )
        assert wh_halt.status_code == 200

@pytest.mark.asyncio
async def test_phase6_settings_module_and_audit_trail():
    """
    Verify Settings module:
    - Series Categories (create & view)
    - Series Master (create & view)
    - Admin Settings (view & update)
    - User Activity Log / Audit trail (architecture.md §11)
    """
    uid = uuid.uuid4().hex[:6].upper()
    transport = ASGITransport(app=app)
    headers = {"X-Tenant-Subdomain": "demo"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login as demo admin
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers,
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "X-Tenant-Subdomain": "demo"}

        # 1. Create Series Category
        cat_res = await client.post(
            "/api/v1/settings/series-categories",
            json={
                "name": f"Logistics Category {uid}",
                "code": f"CAT_{uid}",
                "description": "Category for testing",
            },
            headers=auth_headers,
        )
        assert cat_res.status_code in (200, 201), cat_res.text
        cat_id = cat_res.json()["id"]

        # 2. Create Series Master
        series_res = await client.post(
            "/api/v1/settings/series",
            json={
                "document_type": f"Transport Waybill {uid}",
                "prefix": f"TWB-{uid}-",
                "suffix": "/26",
                "starting_number": 100,
                "current_number": 99,
                "financial_year": "2026-2027",
                "category_id": cat_id,
            },
            headers=auth_headers,
        )
        assert series_res.status_code in (200, 201), series_res.text
        assert series_res.json()["prefix"] == f"TWB-{uid}-"

        # 3. List Series
        list_series = await client.get("/api/v1/settings/series", headers=auth_headers)
        assert list_series.status_code == 200
        assert any(s["prefix"] == f"TWB-{uid}-" for s in list_series.json())

        # 4. Admin Settings (Get & Save)
        admin_set = await client.post(
            "/api/v1/settings/admin-settings",
            json={
                "setting_key": f"toll_reconciliation_mode_{uid}",
                "setting_value": "AUTOMATIC_FASTAG",
                "category": "integrations",
            },
            headers=auth_headers,
        )
        assert admin_set.status_code == 200

        list_settings = await client.get("/api/v1/settings/admin-settings", headers=auth_headers)
        assert list_settings.status_code == 200
        assert any(s["setting_key"] == f"toll_reconciliation_mode_{uid}" for s in list_settings.json())

        # 5. User Activity / Audit Trail
        activity_res = await client.get("/api/v1/settings/activity?limit=50", headers=auth_headers)
        assert activity_res.status_code == 200
        logs = activity_res.json()
        assert len(logs) > 0
        assert any("Series" in l["action"] or "Settings" in l["action"] or "admin" in l["user_email"] for l in logs)

@pytest.mark.asyncio
async def test_phase6_profile_module_and_monthly_pnl():
    """
    Verify Profile module:
    - User Account (GET & PUT)
    - Branch CRUD (GET & POST)
    - Company Setting (GET & PUT)
    - Email Settings (GET & PUT)
    - Monthly P&L across all branches (GET)
    - Change Password (POST & re-login verification)
    """
    uid = uuid.uuid4().hex[:6].upper()
    transport = ASGITransport(app=app)
    headers = {"X-Tenant-Subdomain": "demo"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login as demo admin
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers,
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "X-Tenant-Subdomain": "demo"}

        # 1. User Account
        acc = await client.get("/api/v1/profile/account", headers=auth_headers)
        assert acc.status_code == 200
        assert acc.json()["email"] == "admin@demo.com"

        update_acc = await client.put(
            "/api/v1/profile/account",
            json={"full_name": f"Admin Updated {uid}", "phone": "9998887776", "designation": "VP Transport"},
            headers=auth_headers,
        )
        assert update_acc.status_code == 200
        assert update_acc.json()["full_name"] == f"Admin Updated {uid}"

        # 2. Branch
        branch_res = await client.post(
            "/api/v1/profile/branches",
            json={
                "branch_code": f"B-NAG-{uid}",
                "branch_name": f"Nagpur Central Hub {uid}",
                "city": "Nagpur",
                "state": "Maharashtra",
                "phone": "+91 712 123456",
                "is_head_office": False,
            },
            headers=auth_headers,
        )
        assert branch_res.status_code in (200, 201), branch_res.text
        branches = await client.get("/api/v1/profile/branches", headers=auth_headers)
        assert branches.status_code == 200
        assert any(b.get("code") == f"B-NAG-{uid}" or b.get("branch_code") == f"B-NAG-{uid}" for b in branches.json())

        # 3. Company Setting
        comp_set = await client.get("/api/v1/profile/company", headers=auth_headers)
        assert comp_set.status_code == 200

        update_comp = await client.put(
            "/api/v1/profile/company",
            json={
                "company_name": f"Panther Logistics {uid} Corp",
                "gstin": "27AABCP9999F1Z9",
                "pan": "AABCP9999F",
                "city": "Mumbai",
                "state": "Maharashtra",
                "bank_name": "State Bank of India",
                "bank_account_number": "334455667788",
            },
            headers=auth_headers,
        )
        assert update_comp.status_code == 200
        assert update_comp.json()["company_name"] == f"Panther Logistics {uid} Corp"

        # 4. Email Settings
        email_set = await client.get("/api/v1/profile/email-settings", headers=auth_headers)
        assert email_set.status_code == 200

        update_email = await client.put(
            "/api/v1/profile/email-settings",
            json={
                "smtp_host": "smtp.mailgun.org",
                "smtp_port": 587,
                "from_email": f"billing@{uid}.com",
                "from_name": "Panther Invoicing",
                "use_tls": True,
            },
            headers=auth_headers,
        )
        assert update_email.status_code == 200
        assert update_email.json()["smtp_host"] == "smtp.mailgun.org"

        # 5. Monthly P&L
        pnl_res = await client.get("/api/v1/profile/monthly-pnl?month=2026-09", headers=auth_headers)
        assert pnl_res.status_code == 200
        pnl = pnl_res.json()
        assert "total_revenue" in pnl
        assert "total_expenses" in pnl
        assert "net_profit" in pnl
        assert "margin_percent" in pnl
        assert "branch_count" in pnl
        assert pnl["branch_count"] >= 1

        # 6. Change Password & Re-authenticate
        new_pwd = "NewSecurePassword@2026!"
        pwd_res = await client.post(
            "/api/v1/profile/change-password",
            json={"current_password": "PantherTMS@2026!", "new_password": new_pwd},
            headers=auth_headers,
        )
        assert pwd_res.status_code == 200

        # Re-login with new password
        relogin = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": new_pwd},
            headers=headers,
        )
        assert relogin.status_code == 200
        new_token = relogin.json()["access_token"]
        assert new_token is not None

        # Revert password back so demo tenant stays consistent
        revert_auth = {"Authorization": f"Bearer {new_token}", "X-Tenant-Subdomain": "demo"}
        revert_res = await client.post(
            "/api/v1/profile/change-password",
            json={"current_password": new_pwd, "new_password": "PantherTMS@2026!"},
            headers=revert_auth,
        )
        assert revert_res.status_code == 200
