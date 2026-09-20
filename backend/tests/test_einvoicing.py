import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_einvoicing_lifecycle_and_taxpayer_lookup():
    uid = uuid.uuid4().hex[:6]
    headers_tenant = {"X-Tenant-Subdomain": "demo"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers_tenant,
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "X-Tenant-Subdomain": "demo",
        }

        # 2. Create an invoice to generate IRN for
        inv_res = await client.post(
            "/api/v1/accounts/vouchers",
            json={
                "voucher_type": "GENERAL_INVOICE",
                "party_name": f"Reliance Retail {uid}",
                "party_type": "CONSIGNER",
                "total_amount": "100000.00",
                "tax_amount": "12000.00",
                "net_amount": "112000.00",
                "narration": f"Contract logistics freight invoice {uid}",
            },
            headers=auth_headers,
        )
        assert inv_res.status_code == 201
        voucher_id = inv_res.json()["id"]

        # 3. Generate IRN
        irn_gen_res = await client.post(
            "/api/v1/einvoicing/generate-irn",
            json={
                "voucher_id": voucher_id,
                "supplier_gstin": "27AABCP1234F1Z5",
                "buyer_gstin": "27AABCR5678G1Z2",
            },
            headers=auth_headers,
        )
        assert irn_gen_res.status_code == 201, irn_gen_res.text
        irn_data = irn_gen_res.json()
        irn = irn_data["irn"]

        # Assert IRN format: 64-character hex hash per NIC spec
        assert len(irn) == 64, f"Expected 64-char IRN hash, got {len(irn)}"
        assert irn_data["status"] == "GENERATED"
        assert irn_data["ack_number"].startswith("11")
        assert "GSTN:IRN:" in irn_data["signed_qr_code"]

        # 4. Fetch E-Invoice by IRN
        fetch_res = await client.get(f"/api/v1/einvoicing/irn/{irn}", headers=auth_headers)
        assert fetch_res.status_code == 200
        assert fetch_res.json()["irn"] == irn

        # 5. List IRNs
        list_res = await client.get("/api/v1/einvoicing/irn-list", headers=auth_headers)
        assert list_res.status_code == 200
        assert any(r["irn"] == irn for r in list_res.json())

        # 6. Cancel IRN
        cancel_res = await client.post(
            "/api/v1/einvoicing/cancel-irn",
            json={
                "irn": irn,
                "cancel_reason": "Data entry mistake",
                "cancel_remarks": "Quantity entered incorrectly on freight line",
            },
            headers=auth_headers,
        )
        assert cancel_res.status_code == 200, cancel_res.text
        assert cancel_res.json()["status"] == "CANCELLED"
        assert cancel_res.json()["cancel_reason"] == "Data entry mistake"

        # 7. Taxpayer Details Lookup (GSTIN)
        taxpayer_res = await client.get("/api/v1/einvoicing/taxpayer/27AABCP1234F1Z5", headers=auth_headers)
        assert taxpayer_res.status_code == 200
        taxpayer_data = taxpayer_res.json()
        assert taxpayer_data["gstin"] == "27AABCP1234F1Z5"
        assert taxpayer_data["status"] == "Active"
        assert taxpayer_data["state_jurisdiction"] == "Maharashtra"
        assert taxpayer_data["is_sandbox"] is True
