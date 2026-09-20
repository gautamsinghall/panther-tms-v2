import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_accounts_double_entry_reconciliation_and_void():
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

        # 2. Test General Invoice Voucher with tax
        gi_res = await client.post(
            "/api/v1/accounts/vouchers",
            json={
                "voucher_type": "GENERAL_INVOICE",
                "party_name": f"Corporate Client {uid}",
                "party_type": "CONSIGNER",
                "total_amount": "50000.00",
                "tax_amount": "9000.00",
                "net_amount": "59000.00",
                "narration": f"Logistics consulting invoice {uid}",
                "items": [
                    {
                        "description": "Warehousing & Supply Chain Advisory",
                        "quantity": "1.00",
                        "rate": "50000.00",
                        "tax_amount": "9000.00",
                        "total_amount": "50000.00",
                    }
                ],
            },
            headers=auth_headers,
        )
        assert gi_res.status_code == 201, gi_res.text
        gi_data = gi_res.json()
        assert gi_data["voucher_number"].startswith("GI-")

        # Double-entry reconciliation check (Rules §9): sum(debits) == sum(credits)
        entries = gi_data["ledger_entries"]
        assert len(entries) >= 2
        total_dr = sum(Decimal(str(e["debit_amount"])) for e in entries)
        total_cr = sum(Decimal(str(e["credit_amount"])) for e in entries)
        assert total_dr == total_cr == Decimal("59000.00"), f"Double-entry mismatch: Dr={total_dr}, Cr={total_cr}"

        # 3. Test Purchase Voucher (Normal Purchase)
        np_res = await client.post(
            "/api/v1/accounts/vouchers",
            json={
                "voucher_type": "NORMAL_PURCHASE",
                "party_name": f"Tyre Vendor {uid}",
                "party_type": "OTHER",
                "total_amount": "30000.00",
                "tax_amount": "5400.00",
                "net_amount": "35400.00",
                "narration": f"Apollo Radial Tyres 295/80 R22.5 {uid}",
                "items": [
                    {
                        "description": "Truck Tyres Set of 4",
                        "quantity": "4.00",
                        "rate": "7500.00",
                        "tax_amount": "5400.00",
                        "total_amount": "30000.00",
                    }
                ],
            },
            headers=auth_headers,
        )
        assert np_res.status_code == 201, np_res.text
        np_data = np_res.json()
        np_entries = np_data["ledger_entries"]
        np_dr = sum(Decimal(str(e["debit_amount"])) for e in np_entries)
        np_cr = sum(Decimal(str(e["credit_amount"])) for e in np_entries)
        assert np_dr == np_cr == Decimal("35400.00"), f"Purchase mismatch: Dr={np_dr}, Cr={np_cr}"

        # 4. Test Receipt Voucher
        rv_res = await client.post(
            "/api/v1/accounts/vouchers",
            json={
                "voucher_type": "RECEIPT_VOUCHER",
                "party_name": f"Corporate Client {uid}",
                "party_type": "CONSIGNER",
                "total_amount": "25000.00",
                "tax_amount": "0.00",
                "net_amount": "25000.00",
                "narration": f"NEFT received for invoice {uid}",
            },
            headers=auth_headers,
        )
        assert rv_res.status_code == 201
        rv_entries = rv_res.json()["ledger_entries"]
        rv_dr = sum(Decimal(str(e["debit_amount"])) for e in rv_entries)
        rv_cr = sum(Decimal(str(e["credit_amount"])) for e in rv_entries)
        assert rv_dr == rv_cr == Decimal("25000.00")

        # 5. Test Payment Voucher
        pv_res = await client.post(
            "/api/v1/accounts/vouchers",
            json={
                "voucher_type": "PAYMENT_VOUCHER",
                "party_name": f"Office Landlord {uid}",
                "party_type": "OTHER",
                "total_amount": "15000.00",
                "tax_amount": "0.00",
                "net_amount": "15000.00",
                "narration": f"Branch office rent {uid}",
            },
            headers=auth_headers,
        )
        assert pv_res.status_code == 201
        pv_entries = pv_res.json()["ledger_entries"]
        pv_dr = sum(Decimal(str(e["debit_amount"])) for e in pv_entries)
        pv_cr = sum(Decimal(str(e["credit_amount"])) for e in pv_entries)
        assert pv_dr == pv_cr == Decimal("15000.00")

        # 6. Test Contra Voucher (Cash/Bank transfer)
        cv_res = await client.post(
            "/api/v1/accounts/vouchers",
            json={
                "voucher_type": "CONTRA_VOUCHER",
                "party_name": "Internal Cash-Bank",
                "total_amount": "10000.00",
                "tax_amount": "0.00",
                "net_amount": "10000.00",
                "narration": f"Cash withdrawal from HDFC for petty expenses {uid}",
            },
            headers=auth_headers,
        )
        assert cv_res.status_code == 201
        cv_entries = cv_res.json()["ledger_entries"]
        cv_dr = sum(Decimal(str(e["debit_amount"])) for e in cv_entries)
        cv_cr = sum(Decimal(str(e["credit_amount"])) for e in cv_entries)
        assert cv_dr == cv_cr == Decimal("10000.00")

        # 7. Test Void Voucher (Rules §7: Non-destructive reversing entry)
        voucher_to_void_id = pv_res.json()["id"]
        void_res = await client.post(
            f"/api/v1/accounts/vouchers/{voucher_to_void_id}/void",
            json={"void_reason": "Duplicate cheque issued by error"},
            headers=auth_headers,
        )
        assert void_res.status_code == 200, void_res.text
        void_data = void_res.json()
        assert void_data["is_void"] is True
        assert void_data["void_reason"] == "Duplicate cheque issued by error"
        assert void_data["voided_at"] is not None

        # Check that reversing entries were written
        all_void_entries = void_data["ledger_entries"]
        reversals = [e for e in all_void_entries if e["is_reversal"]]
        assert len(reversals) > 0, "No reversal ledger entries found"
        # Total Dr across original + reversal equals total Cr across original + reversal
        total_void_dr = sum(Decimal(str(e["debit_amount"])) for e in all_void_entries)
        total_void_cr = sum(Decimal(str(e["credit_amount"])) for e in all_void_entries)
        assert total_void_dr == total_void_cr
        # And the net balance of Dr - Cr for the reversed account cancels to 0
        net_effect = total_void_dr - total_void_cr
        assert net_effect == Decimal("0.00")
