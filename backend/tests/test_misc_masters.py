import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_misc_accounting_masters_crud():
    uid = uuid.uuid4().hex[:6]
    headers_tenant = {"X-Tenant-Subdomain": "demo"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as admin
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers_tenant,
        )
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "X-Tenant-Subdomain": "demo",
        }

        # 2. Tax Category CRUD
        tax_res = await client.post(
            "/api/v1/misc/tax-categories",
            json={
                "code": f"TAX_{uid}",
                "name": f"GST Test {uid}",
                "igst_rate": "18.00",
                "cgst_rate": "9.00",
                "sgst_rate": "9.00",
                "is_rcm": False,
            },
            headers=auth_headers,
        )
        assert tax_res.status_code == 201, tax_res.text
        tax_id = tax_res.json()["id"]

        # 3. Charge Head CRUD
        ch_res = await client.post(
            "/api/v1/misc/charge-heads",
            json={
                "code": f"CH_{uid}",
                "name": f"Handling Fee {uid}",
                "charge_type": "ADDITION",
                "default_rate": "250.00",
                "tax_category_id": tax_id,
            },
            headers=auth_headers,
        )
        assert ch_res.status_code == 201, ch_res.text
        ch_id = ch_res.json()["id"]

        # 4. Primary Group CRUD
        pg_res = await client.post(
            "/api/v1/misc/primary-groups",
            json={
                "code": f"PG_{uid}",
                "name": f"Special Assets {uid}",
                "nature": "DEBIT",
                "description": "Test Primary Group",
            },
            headers=auth_headers,
        )
        assert pg_res.status_code == 201, pg_res.text
        pg_id = pg_res.json()["id"]

        # 5. Group In Primary CRUD
        grp_res = await client.post(
            "/api/v1/misc/groups-in-primary",
            json={
                "primary_group_id": pg_id,
                "code": f"GRP_{uid}",
                "name": f"Fleet Assets {uid}",
                "description": "Test Group in Primary",
            },
            headers=auth_headers,
        )
        assert grp_res.status_code == 201, grp_res.text
        grp_id = grp_res.json()["id"]

        # 6. Subgroup In Group CRUD
        sub_res = await client.post(
            "/api/v1/misc/subgroups",
            json={
                "group_id": grp_id,
                "code": f"SUB_{uid}",
                "name": f"Heavy Vehicles {uid}",
                "description": "Test Subgroup",
            },
            headers=auth_headers,
        )
        assert sub_res.status_code == 201, sub_res.text
        sub_id = sub_res.json()["id"]

        # 7. Account CRUD
        acc_res = await client.post(
            "/api/v1/misc/accounts",
            json={
                "name": f"Truck MH-12-AB-9999 {uid}",
                "code": f"ACC_{uid}",
                "group_id": grp_id,
                "subgroup_id": sub_id,
                "opening_balance": "0.00",
                "opening_balance_type": "DR",
            },
            headers=auth_headers,
        )
        assert acc_res.status_code == 201, acc_res.text
        acc_id = acc_res.json()["id"]

        # 8. Employee Master CRUD
        emp_res = await client.post(
            "/api/v1/misc/employees",
            json={
                "name": f"Ramesh Accountant {uid}",
                "employee_code": f"EMP-{uid}",
                "department": "Accounts",
                "phone": "9876500001",
                "email": f"ramesh_{uid}@demo.com",
                "pan": "ABCDE1234F",
                "bank_name": "State Bank of India",
                "bank_account_number": "123456789012",
                "ifsc_code": "SBIN0001234",
                "salary": "45000.00",
            },
            headers=auth_headers,
        )
        assert emp_res.status_code == 201, emp_res.text
        emp_id = emp_res.json()["id"]

        # List endpoints verification
        get_pgs = await client.get("/api/v1/misc/primary-groups", headers=auth_headers)
        assert get_pgs.status_code == 200
        assert any(p["id"] == pg_id for p in get_pgs.json())

        get_grps = await client.get("/api/v1/misc/groups-in-primary", headers=auth_headers)
        assert get_grps.status_code == 200
        assert any(g["id"] == grp_id for g in get_grps.json())

        get_subs = await client.get("/api/v1/misc/subgroups", headers=auth_headers)
        assert get_subs.status_code == 200
        assert any(s["id"] == sub_id for s in get_subs.json())

        get_accs = await client.get("/api/v1/misc/accounts", headers=auth_headers)
        assert get_accs.status_code == 200
        assert any(a["id"] == acc_id for a in get_accs.json())

        get_emps = await client.get("/api/v1/misc/employees", headers=auth_headers)
        assert get_emps.status_code == 200
        assert any(e["id"] == emp_id for e in get_emps.json())
