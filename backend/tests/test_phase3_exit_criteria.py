import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase3_end_to_end_exit_criteria():
    """
    Phase 3 Non-Negotiable Exit Criteria:
    - A Transport Invoice can be created from Phase 2 LR data.
    - An IRN is generated for it (via isolated GSP interface).
    - It appears correctly in double-entry ledger data (balanced debits & credits).
    """
    uid = uuid.uuid4().hex[:6]
    headers_tenant = {"X-Tenant-Subdomain": "demo"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Company Admin
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

        # 2. Setup Consigner, Consignee & Locations
        loc1_res = await client.post(
            "/api/v1/general/locations",
            json={"country": "India", "state": "Gujarat", "city_name": f"Surat {uid}"},
            headers=auth_headers,
        )
        assert loc1_res.status_code == 201, loc1_res.text
        loc1 = loc1_res.json()["id"]

        loc2_res = await client.post(
            "/api/v1/general/locations",
            json={"country": "India", "state": "Maharashtra", "city_name": f"Mumbai {uid}"},
            headers=auth_headers,
        )
        assert loc2_res.status_code == 201, loc2_res.text
        loc2 = loc2_res.json()["id"]

        consigner_id = (await client.post(
            "/api/v1/general/consigners",
            json={"name": f"Textile Mills Consigner {uid}", "gstin": "24AAACT1234F1Z1"},
            headers=auth_headers,
        )).json()["id"]

        consignee_id = (await client.post(
            "/api/v1/general/consignees",
            json={"name": f"Fashion Hub Consignee {uid}", "gstin": "27AABCF5678G1Z3"},
            headers=auth_headers,
        )).json()["id"]

        # 3. Create Job and LR Booking
        job_res = await client.post(
            "/api/v1/transport/jobs",
            json={
                "consigner_id": consigner_id,
                "consignee_id": consignee_id,
                "origin_location_id": loc1,
                "destination_location_id": loc2,
                "cargo_description": "Export Cotton Bales",
                "estimated_weight_mt": 16.5,
                "estimated_packages": 80,
            },
            headers=auth_headers,
        )
        assert job_res.status_code == 201, job_res.text
        job = job_res.json()

        lr_res = await client.post(
            "/api/v1/transport/lrs",
            json={
                "job_id": job["id"],
                "consigner_id": consigner_id,
                "consignee_id": consignee_id,
                "origin_location_id": loc1,
                "destination_location_id": loc2,
                "vehicle_source": "MARKET",
                "vehicle_number": "GJ-05-TX-1001",
                "driver_name": f"Surinder Singh {uid}",
                "driver_phone": "9822233344",
                "package_count": 80,
                "actual_weight_mt": 16.5,
                "chargeable_weight_mt": 16.5,
                "freight_rate": 2400.0,
                "freight_amount": 39600.0,
                "advance_amount": 10000.0,
            },
            headers=auth_headers,
        )
        assert lr_res.status_code == 201, lr_res.text
        lr = lr_res.json()
        assert lr["lr_number"].startswith("LR-")

        # 4. Fetch Tax Category for Freight (GST 12%)
        taxes = (await client.get("/api/v1/misc/tax-categories", headers=auth_headers)).json()
        gst12 = next((t for t in taxes if "12" in t["name"]), taxes[0])

        # 5. Create Transport Invoice from LR (Phase 3 Core Feature)
        ti_res = await client.post(
            "/api/v1/accounts/transport-invoices",
            json={
                "lr_id": lr["id"],
                "tax_category_id": gst12["id"],
                "narration": f"Freight Billing for Surat to Mumbai trip {lr['lr_number']}",
            },
            headers=auth_headers,
        )
        assert ti_res.status_code == 201, ti_res.text
        ti_data = ti_res.json()
        assert ti_data["voucher_number"].startswith("TI-")
        assert ti_data["lr_id"] == lr["id"]
        assert Decimal(str(ti_data["total_amount"])) == Decimal("39600.00")
        assert Decimal(str(ti_data["tax_amount"])) > Decimal("0.00")
        expected_net = Decimal(str(ti_data["total_amount"])) + Decimal(str(ti_data["tax_amount"]))
        assert Decimal(str(ti_data["net_amount"])) == expected_net

        # 6. Verify Double-Entry Balance: sum(dr) == sum(cr) == net_amount
        entries = ti_data["ledger_entries"]
        assert len(entries) >= 2, "Transport invoice must post at least 2 ledger entries"
        total_dr = sum(Decimal(str(e["debit_amount"])) for e in entries)
        total_cr = sum(Decimal(str(e["credit_amount"])) for e in entries)
        assert total_dr == total_cr == expected_net, f"Ledger entries do not balance! Dr={total_dr}, Cr={total_cr}"

        # 7. Generate IRN for this Transport Invoice (E-Invoicing Exit Criteria)
        irn_res = await client.post(
            "/api/v1/einvoicing/generate-irn",
            json={
                "voucher_id": ti_data["id"],
                "supplier_gstin": "24AAACT1234F1Z1",
                "buyer_gstin": "27AABCF5678G1Z3",
            },
            headers=auth_headers,
        )
        assert irn_res.status_code == 201, irn_res.text
        irn_data = irn_res.json()
        assert len(irn_data["irn"]) == 64
        assert irn_data["status"] == "GENERATED"
        assert irn_data["ack_number"] is not None

        # 8. Query the Transport Invoice again to verify IRN linkage in accounts
        fetch_ti = await client.get(f"/api/v1/accounts/vouchers/{ti_data['id']}", headers=auth_headers)
        assert fetch_ti.status_code == 200
        fetched_data = fetch_ti.json()
        assert fetched_data["irn"] == irn_data["irn"]
        assert fetched_data["irn_status"] == "GENERATED"
        assert fetched_data["is_void"] is False
