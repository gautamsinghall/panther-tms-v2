import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_phase4_end_to_end_exit_criteria():
    """
    Phase 4 Non-Negotiable Exit Criteria:
    1. Reports & Statements are computed from real Phase 3 ledger data (never mocked).
    2. Trial Balance ties out for the seeded tenant: Total Debits == Total Credits (difference == 0.00).
    3. Balance Sheet ties out: Total Assets == Total Liabilities + Equity + Net Profit (difference == 0.00).
    4. Daybook, Ledger, P&L, Sales/Purchase registers, Bank Reconciliation, and Special Report work.
    5. GST Output/Input, O/S Debtor/Creditor, TDS, and Opening Balance statements return accurate data.
    6. Background report export jobs (Arq/Redis) generate downloadable CSV files.
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

        # 2. Verify / Seed Phase 2 & 3 operational and accounts transactions
        # 2a. Locations & Parties
        loc1 = (await client.post(
            "/api/v1/general/locations",
            json={"country": "India", "state": "Gujarat", "city_name": f"Surat {uid}"},
            headers=auth_headers,
        )).json()["id"]

        loc2 = (await client.post(
            "/api/v1/general/locations",
            json={"country": "India", "state": "Maharashtra", "city_name": f"Mumbai {uid}"},
            headers=auth_headers,
        )).json()["id"]

        consigner = (await client.post(
            "/api/v1/general/consigners",
            json={"name": f"Reliance Textiles {uid}", "gstin": "24AAACR1234F1Z1", "state": "Gujarat"},
            headers=auth_headers,
        )).json()

        consignee = (await client.post(
            "/api/v1/general/consignees",
            json={"name": f"FabIndia Retail {uid}", "gstin": "27AAACF5678G1Z3", "state": "Maharashtra"},
            headers=auth_headers,
        )).json()

        # 2b. Job and LR Booking
        job = (await client.post(
            "/api/v1/transport/jobs",
            json={
                "consigner_id": consigner["id"],
                "consignee_id": consignee["id"],
                "origin_location_id": loc1,
                "destination_location_id": loc2,
                "cargo_description": "Cotton Fabrics Consignment",
                "estimated_weight_mt": 20.0,
                "estimated_packages": 100,
            },
            headers=auth_headers,
        )).json()

        lr = (await client.post(
            "/api/v1/transport/lrs",
            json={
                "job_id": job["id"],
                "consigner_id": consigner["id"],
                "consignee_id": consignee["id"],
                "origin_location_id": loc1,
                "destination_location_id": loc2,
                "vehicle_source": "MARKET",
                "vehicle_number": "GJ-05-AB-9999",
                "driver_name": f"Ramesh Patel {uid}",
                "driver_phone": "9898989898",
                "package_count": 100,
                "actual_weight_mt": 20.0,
                "chargeable_weight_mt": 20.0,
                "freight_rate": 2500.0,
                "freight_amount": 50000.0,
                "advance_amount": 15000.0,
            },
            headers=auth_headers,
        )).json()

        # 2c. Transport Invoice (Revenue + GST Output + Debtor DR)
        taxes = (await client.get("/api/v1/misc/tax-categories", headers=auth_headers)).json()
        gst12 = next((t for t in taxes if "12" in t["name"]), taxes[0])

        ti_res = await client.post(
            "/api/v1/accounts/transport-invoices",
            json={
                "lr_id": lr["id"],
                "tax_category_id": gst12["id"],
                "narration": f"Freight billing for LR {lr['lr_number']}",
            },
            headers=auth_headers,
        )
        assert ti_res.status_code == 201, ti_res.text
        ti = ti_res.json()
        assert ti["voucher_number"].startswith("TI-")

        # 2d. Vehicle Owner & Hire Challan for Market Vehicle
        owner_res = await client.post(
            "/api/v1/transport/vehicle-owners",
            json={"name": f"Malwa Roadlines {uid}", "phone": "9811122233", "pan": "ABCDE1234F"},
            headers=auth_headers,
        )
        assert owner_res.status_code == 201, owner_res.text
        owner = owner_res.json()

        hc_res = await client.post(
            "/api/v1/transport/hire-challans",
            json={
                "lr_id": lr["id"],
                "vehicle_number": "GJ-05-AB-9999",
                "owner_id": owner["id"],
                "driver_name": f"Ramesh Patel {uid}",
                "driver_phone": "9898989898",
                "from_location": "Surat",
                "to_location": "Mumbai",
                "hire_rate": 20000.0,
                "advance_amount": 15000.0,
                "balance_amount": 5000.0,
                "net_payable_amount": 20000.0,
            },
            headers=auth_headers,
        )
        assert hc_res.status_code == 201, hc_res.text
        hc = hc_res.json()

        # 2e. Advance To Hired (ATH) Payment (Expense + Bank/Cash CR)
        ath_res = await client.post(
            "/api/v1/accounts/payments/ath",
            json={
                "hire_challan_id": hc["id"],
                "amount": 15000.0,
                "payment_mode": "BANK",
                "narration": f"Diesel advance for vehicle {lr['vehicle_number']}",
            },
            headers=auth_headers,
        )
        assert ath_res.status_code == 201, ath_res.text

        # ----------------------------------------------------------------------
        # 3. VERIFY REPORT 1: Daybook
        # ----------------------------------------------------------------------
        db_res = await client.get("/api/v1/reports/daybook", headers=auth_headers)
        assert db_res.status_code == 200, db_res.text
        daybook = db_res.json()
        assert daybook["total_entries"] > 0
        assert Decimal(str(daybook["total_debit"])) == Decimal(str(daybook["total_credit"]))
        assert any(e["voucher_number"] == ti["voucher_number"] for e in daybook["entries"])

        # ----------------------------------------------------------------------
        # 4. VERIFY REPORT 2: Account Ledger
        # ----------------------------------------------------------------------
        # Find Freight Revenue account
        accounts = (await client.get("/api/v1/misc/accounts", headers=auth_headers)).json()
        freight_acc = next((a for a in accounts if a["code"] == "ACC_FREIGHT_REV"), accounts[0])

        ledger_res = await client.get(f"/api/v1/reports/ledger?account_id={freight_acc['id']}", headers=auth_headers)
        assert ledger_res.status_code == 200, ledger_res.text
        ledger = ledger_res.json()
        assert ledger["account_id"] == freight_acc["id"]
        assert len(ledger["transactions"]) > 0
        assert Decimal(str(ledger["closing_balance"])) > Decimal("0.00")
        assert ledger["closing_balance_type"] == "CR"

        # ----------------------------------------------------------------------
        # 5. VERIFY REPORT 3: Trial Balance (CRITICAL EXIT CRITERIA)
        # ----------------------------------------------------------------------
        tb_res = await client.get("/api/v1/reports/trial-balance", headers=auth_headers)
        assert tb_res.status_code == 200, tb_res.text
        trial_balance = tb_res.json()

        tb_debit = Decimal(str(trial_balance["total_debit"]))
        tb_credit = Decimal(str(trial_balance["total_credit"]))
        tb_diff = Decimal(str(trial_balance["difference"]))

        assert trial_balance["is_balanced"] is True, f"Trial Balance unbalanced! Dr: {tb_debit}, Cr: {tb_credit}, Diff: {tb_diff}"
        assert tb_diff == Decimal("0.00"), f"Trial Balance difference must be strictly 0.00, got {tb_diff}"
        assert tb_debit == tb_credit
        assert tb_debit > Decimal("0.00"), "Trial Balance debit sum must be greater than zero from real transactions"

        # Verify hierarchical structure
        assert len(trial_balance["primary_groups"]) > 0
        for pg in trial_balance["primary_groups"]:
            assert "primary_group_name" in pg
            assert len(pg["groups"]) > 0

        # ----------------------------------------------------------------------
        # 6. VERIFY REPORT 4: Profit & Loss Statement
        # ----------------------------------------------------------------------
        pnl_res = await client.get("/api/v1/reports/profit-loss", headers=auth_headers)
        assert pnl_res.status_code == 200, pnl_res.text
        pnl = pnl_res.json()

        assert Decimal(str(pnl["total_direct_income"])) > Decimal("0.00")
        assert Decimal(str(pnl["total_direct_expenses"])) > Decimal("0.00")
        gross_p = Decimal(str(pnl["total_direct_income"])) - Decimal(str(pnl["total_direct_expenses"]))
        assert Decimal(str(pnl["gross_profit"])) == gross_p
        assert Decimal(str(pnl["net_profit"])) == gross_p

        # ----------------------------------------------------------------------
        # 7. VERIFY REPORT 5: Balance Sheet (CRITICAL EXIT CRITERIA)
        # ----------------------------------------------------------------------
        bs_res = await client.get("/api/v1/reports/balance-sheet", headers=auth_headers)
        assert bs_res.status_code == 200, bs_res.text
        balance_sheet = bs_res.json()

        tot_assets = Decimal(str(balance_sheet["total_assets"]))
        tot_liabilities = Decimal(str(balance_sheet["total_liabilities"]))
        tot_equity = Decimal(str(balance_sheet["total_equity"]))
        tot_liab_eq = Decimal(str(balance_sheet["total_liabilities_and_equity"]))
        bs_diff = Decimal(str(balance_sheet["difference"]))

        assert balance_sheet["is_balanced"] is True, f"Balance Sheet unbalanced! Assets: {tot_assets}, Liab+Eq: {tot_liab_eq}, Diff: {bs_diff}"
        assert bs_diff == Decimal("0.00"), f"Balance sheet difference must be strictly 0.00, got {bs_diff}"
        assert tot_assets == tot_liab_eq
        assert tot_assets > Decimal("0.00")

        # ----------------------------------------------------------------------
        # 8. VERIFY REPORT 6: Sales Register
        # ----------------------------------------------------------------------
        sales_res = await client.get("/api/v1/reports/sales-register", headers=auth_headers)
        assert sales_res.status_code == 200, sales_res.text
        sales = sales_res.json()
        assert sales["invoice_count"] > 0
        assert Decimal(str(sales["total_taxable"])) > Decimal("0.00")
        assert Decimal(str(sales["total_tax"])) > Decimal("0.00")
        assert any(i["voucher_number"] == ti["voucher_number"] for i in sales["invoices"])

        # ----------------------------------------------------------------------
        # 9. VERIFY REPORT 7: Purchase Register
        # ----------------------------------------------------------------------
        pur_res = await client.get("/api/v1/reports/purchase-register", headers=auth_headers)
        assert pur_res.status_code == 200, pur_res.text
        purchases = pur_res.json()
        assert purchases["purchase_count"] > 0
        assert Decimal(str(purchases["total_net_amount"])) >= Decimal("15000.00")

        # ----------------------------------------------------------------------
        # 10. VERIFY REPORT 8: Bank Reconciliation
        # ----------------------------------------------------------------------
        bank_res = await client.get("/api/v1/reports/bank-reconciliation", headers=auth_headers)
        assert bank_res.status_code == 200, bank_res.text
        bank = bank_res.json()
        assert bank["account_id"] > 0
        assert Decimal(str(bank["computed_bank_statement_balance"])) == Decimal(str(bank["balance_as_per_books"]))

        # ----------------------------------------------------------------------
        # 11. VERIFY REPORT 9: Special Report (Trip / LR Margin Drilldown)
        # ----------------------------------------------------------------------
        spec_res = await client.get("/api/v1/reports/special-report", headers=auth_headers)
        assert spec_res.status_code == 200, spec_res.text
        special = spec_res.json()
        assert special["trip_count"] > 0
        target_trip = next((t for t in special["trips"] if t["lr_id"] == lr["id"]), None)
        assert target_trip is not None
        assert Decimal(str(target_trip["freight_revenue"])) == Decimal("50000.00")
        assert Decimal(str(target_trip["vehicle_hire_cost"])) == Decimal("15000.00")
        assert Decimal(str(target_trip["gross_margin"])) == Decimal("35000.00")

        # ----------------------------------------------------------------------
        # 12. VERIFY STATEMENTS (All 7 Statements)
        # ----------------------------------------------------------------------
        # 12a. GST Output Statement (GSTR-1 format)
        gsto_res = await client.get("/api/v1/statements/gst-output", headers=auth_headers)
        assert gsto_res.status_code == 200, gsto_res.text
        gsto = gsto_res.json()
        assert len(gsto["records"]) > 0
        assert Decimal(str(gsto["total_taxable"])) > Decimal("0.00")

        # 12b. GST Input Statement (GSTR-2B format)
        gsti_res = await client.get("/api/v1/statements/gst-input", headers=auth_headers)
        assert gsti_res.status_code == 200, gsti_res.text
        gsti = gsti_res.json()
        assert gsti["record_count"] > 0

        # 12c. O/S Debtor Statement (Receivables aging)
        osd_res = await client.get("/api/v1/statements/os-debtor", headers=auth_headers)
        assert osd_res.status_code == 200, osd_res.text
        osd = osd_res.json()
        assert osd["debtor_count"] > 0
        assert Decimal(str(osd["total_outstanding"])) > Decimal("0.00")

        # 12d. O/S Creditor Statement (Payables aging)
        osc_res = await client.get("/api/v1/statements/os-creditor", headers=auth_headers)
        assert osc_res.status_code == 200, osc_res.text
        osc = osc_res.json()
        assert "total_outstanding" in osc

        # 12e. TDS Payable Report (194C / 194J)
        tdsp_res = await client.get("/api/v1/statements/tds-payable", headers=auth_headers)
        assert tdsp_res.status_code == 200, tdsp_res.text
        tdsp = tdsp_res.json()
        assert tdsp["record_count"] > 0
        assert Decimal(str(tdsp["total_tds_deducted"])) > Decimal("0.00")

        # 12f. TDS Return Report (Form 26Q)
        tdsr_res = await client.get("/api/v1/statements/tds-return", headers=auth_headers)
        assert tdsr_res.status_code == 200, tdsr_res.text
        tdsr = tdsr_res.json()
        assert len(tdsr["sections"]) >= 2
        sec194c = next(s for s in tdsr["sections"] if s["section"] == "194C")
        assert sec194c["deductee_count"] > 0

        # 12g. Opening Balance Details
        ob_res = await client.get("/api/v1/statements/opening-balance", headers=auth_headers)
        assert ob_res.status_code == 200, ob_res.text
        ob = ob_res.json()
        assert ob["account_count"] > 0
        assert Decimal(str(ob["total_debit"])) == Decimal(str(ob["total_credit"]))
        assert ob["is_balanced"] is True

        # ----------------------------------------------------------------------
        # 13. VERIFY BACKGROUND EXPORT JOB (Arq / Redis per architecture.md §8)
        # ----------------------------------------------------------------------
        exp_trigger = await client.post(
            "/api/v1/reports/export",
            json={"report_name": "daybook", "format": "csv", "filters": {}},
            headers=auth_headers,
        )
        assert exp_trigger.status_code == 202, exp_trigger.text
        job_info = exp_trigger.json()
        assert "job_id" in job_info
        assert job_info["status"] == "COMPLETED"

        # Check job status endpoint
        job_status = await client.get(f"/api/v1/reports/export-jobs/{job_info['job_id']}", headers=auth_headers)
        assert job_status.status_code == 200
        assert job_status.json()["status"] == "COMPLETED"

        # Download generated CSV file
        dl_res = await client.get(f"/api/v1/reports/export-jobs/{job_info['job_id']}/download", headers=auth_headers)
        assert dl_res.status_code == 200
        assert "text/csv" in dl_res.headers["content-type"]
        csv_text = dl_res.text
        assert "Voucher Number" in csv_text
        assert ti["voucher_number"] in csv_text
