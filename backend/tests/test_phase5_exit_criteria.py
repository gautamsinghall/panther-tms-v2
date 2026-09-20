import uuid
from decimal import Decimal
from datetime import date
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase5_end_to_end_exit_criteria():
    """
    Phase 5 Exit Criteria Test:
    1. A vehicle's full trip-expense-to-P&L view is accurate for the seeded tenant.
    2. Trip Expense, Trip Advance, FASTag Expense, Pending Trip Expense are linked to Phase 2 trips/vehicles.
    3. Vehicle Health, Vehicle Documents, Vehicle Current Status, Tyre Management, and Repair & Service work.
    4. Truck-Wise P&L and Trip Expense Register are derived views over underlying source tables (architecture.md §9).
    5. Home Module dashboards (Business Overview, Financial Analysis, Fleet & Operations, Own Fleet) return real data.
    """
    uid = uuid.uuid4().hex[:6].upper()
    transport = ASGITransport(app=app)
    headers = {"X-Tenant-Subdomain": "demo"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Company Admin
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.com", "password": "PantherTMS@2026!"},
            headers=headers,
        )
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "X-Tenant-Subdomain": "demo"}

        # 2. Locations & Parties
        loc1 = (await client.post(
            "/api/v1/general/locations",
            json={"country": "India", "state": "Maharashtra", "city_name": f"Pune {uid}"},
            headers=auth_headers,
        )).json()["id"]

        loc2 = (await client.post(
            "/api/v1/general/locations",
            json={"country": "India", "state": "Karnataka", "city_name": f"Bangalore {uid}"},
            headers=auth_headers,
        )).json()["id"]

        consigner = (await client.post(
            "/api/v1/general/consigners",
            json={"name": f"Mahindra Logistics {uid}", "gstin": "27AAACM1234F1Z5", "state": "Maharashtra"},
            headers=auth_headers,
        )).json()

        consignee = (await client.post(
            "/api/v1/general/consignees",
            json={"name": f"Bosch Manufacturing {uid}", "gstin": "29AAACB5678G1Z2", "state": "Karnataka"},
            headers=auth_headers,
        )).json()

        driver = (await client.post(
            "/api/v1/transport/drivers",
            json={"name": f"Dilip Patil {uid}", "phone": "9822114455", "license_number": f"DL-MH-{uid}"},
            headers=auth_headers,
        )).json()

        # 3. Create Company Vehicle
        test_veh_num = f"MH12{uid}"
        veh_res = await client.post(
            "/api/v1/transport/company-vehicles",
            json={
                "vehicle_number": test_veh_num,
                "vehicle_type": "Tata Prima 3528",
                "capacity_mt": 30.0,
                "current_odometer_km": 105000,
                "default_driver_id": driver["id"],
            },
            headers=auth_headers,
        )
        assert veh_res.status_code == 201, veh_res.text

        # 4. Job Creation & LR Booking
        job = (await client.post(
            "/api/v1/transport/jobs",
            json={
                "consigner_id": consigner["id"],
                "consignee_id": consignee["id"],
                "origin_location_id": loc1,
                "destination_location_id": loc2,
                "cargo_description": "Precision Engine Components",
                "estimated_weight_mt": 25.0,
                "estimated_packages": 80,
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
                "vehicle_source": "COMPANY",
                "vehicle_number": test_veh_num,
                "driver_name": driver["name"],
                "package_count": 80,
                "actual_weight_mt": 25.0,
                "chargeable_weight_mt": 25.0,
                "freight_rate": 2400.0,
                "freight_amount": 60000.0,
                "total_freight_amount": 60000.0,
                "advance_amount": 10000.0,
            },
            headers=auth_headers,
        )).json()
        assert lr["status"] == "BOOKED"

        # 5. Transport Invoice (Generating Billed Revenue)
        taxes = (await client.get("/api/v1/misc/tax-categories", headers=auth_headers)).json()
        tax_id = taxes[0]["id"]
        inv_res = await client.post(
            "/api/v1/accounts/transport-invoices",
            json={
                "lr_id": lr["id"],
                "tax_category_id": tax_id,
                "narration": f"Freight invoice for vehicle {test_veh_num}",
            },
            headers=auth_headers,
        )
        assert inv_res.status_code == 201, inv_res.text
        invoice = inv_res.json()
        assert Decimal(str(invoice["total_amount"])) >= Decimal("60000.00")

        # 6. Trip Expenses (Diesel, Toll/FASTag, Driver Allowance)
        # 6a. Diesel
        diesel_exp = (await client.post(
            "/api/v1/fleet/trip-expenses",
            json={
                "lr_id": lr["id"],
                "vehicle_number": test_veh_num,
                "driver_name": driver["name"],
                "expense_category": "DIESEL",
                "amount": 16000.0,
                "payment_mode": "PETROCARD",
                "odometer_km": 105400,
                "fuel_liters": 175.0,
                "receipt_number": f"PETRO-{uid}",
                "status": "APPROVED",
            },
            headers=auth_headers,
        )).json()
        assert diesel_exp["expense_number"].startswith("EXP-")

        # 6b. FASTag Toll
        toll_exp = (await client.post(
            "/api/v1/fleet/trip-expenses",
            json={
                "lr_id": lr["id"],
                "vehicle_number": test_veh_num,
                "driver_name": driver["name"],
                "expense_category": "TOLL",
                "amount": 3500.0,
                "payment_mode": "FASTAG",
                "plaza_name": "Khed Shivapur Plaza & Anewadi Plaza",
                "status": "APPROVED",
            },
            headers=auth_headers,
        )).json()

        # 6c. Driver Allowance
        driver_exp = (await client.post(
            "/api/v1/fleet/trip-expenses",
            json={
                "lr_id": lr["id"],
                "vehicle_number": test_veh_num,
                "driver_name": driver["name"],
                "expense_category": "DRIVER_ALLOWANCE",
                "amount": 2500.0,
                "payment_mode": "CASH",
                "status": "APPROVED",
            },
            headers=auth_headers,
        )).json()

        # 7. Workshop Repair & Service
        service_res = await client.post(
            "/api/v1/fleet/services",
            json={
                "vehicle_number": test_veh_num,
                "service_type": "SCHEDULED_PM",
                "workshop_name": "Tata Authorized Hub, Pune",
                "parts_cost": 9000.0,
                "labor_cost": 3000.0,
                "total_cost": 12000.0,
                "odometer_km": 105500,
                "status": "COMPLETED",
            },
            headers=auth_headers,
        )
        assert service_res.status_code == 201, service_res.text
        service = service_res.json()
        assert service["job_card_number"].startswith("JC-")

        # 8. Trip Advance and Partial Settlement
        adv_res = await client.post(
            "/api/v1/fleet/trip-advances",
            json={
                "lr_id": lr["id"],
                "vehicle_number": test_veh_num,
                "driver_id": driver["id"],
                "driver_name": driver["name"],
                "advance_amount": 20000.0,
                "payment_mode": "BANK_TRANSFER",
                "remarks": "Transit advance for fuel & tolls",
            },
            headers=auth_headers,
        )
        assert adv_res.status_code == 201, adv_res.text
        advance = adv_res.json()
        assert Decimal(str(advance["balance_due"])) == Decimal("20000.00")

        # Settle ₹16,000 against diesel bills
        settle_res = await client.post(
            f"/api/v1/fleet/trip-advances/{advance['id']}/settle",
            json={
                "settled_amount": 16000.0,
                "remarks": "Reconciled with Petrocard diesel slip",
            },
            headers=auth_headers,
        )
        assert settle_res.status_code == 200, settle_res.text
        settled_adv = settle_res.json()
        assert Decimal(str(settled_adv["settled_amount"])) == Decimal("16000.00")
        assert Decimal(str(settled_adv["balance_due"])) == Decimal("4000.00")
        assert settled_adv["status"] == "PARTIALLY_SETTLED"

        # 9. Vehicle Documents & Tyre Management
        doc_res = await client.post(
            "/api/v1/fleet/documents",
            json={
                "vehicle_number": test_veh_num,
                "vehicle_type": "COMPANY",
                "doc_type": "FITNESS_CERT",
                "document_number": f"FIT-MH-{uid}",
                "valid_from": str(date.today()),
                "valid_till": "2027-12-31",
                "status": "VALID",
            },
            headers=auth_headers,
        )
        assert doc_res.status_code == 201, doc_res.text

        tyre_res = await client.post(
            "/api/v1/fleet/tyres",
            json={
                "serial_number": f"TYRE-{uid}-A",
                "brand": "MRF Steel Muscle",
                "size": "295/90 R20",
                "vehicle_number": test_veh_num,
                "axle_position": "Front Right (FR)",
                "initial_tread_depth_mm": 15.0,
                "current_tread_depth_mm": 12.5,
                "purchase_cost": 24000.0,
                "status": "MOUNTED_GOOD",
            },
            headers=auth_headers,
        )
        assert tyre_res.status_code == 201, tyre_res.text

        # 10. Vehicle Health Update
        health_res = await client.put(
            f"/api/v1/fleet/vehicle-health/{test_veh_num}",
            json={
                "odometer_km": 105500,
                "engine_health": "GOOD",
                "battery_status": "HEALTHY",
                "current_status": "IN_TRANSIT",
                "current_location": "Pune Highway Toll Post",
            },
            headers=auth_headers,
        )
        assert health_res.status_code == 200, health_res.text

        # ======================================================================
        # 11. CRITICAL EXIT CRITERIA: A vehicle's full trip-expense-to-P&L view
        # ======================================================================
        pnl_res = await client.get(f"/api/v1/fleet/truck-pnl?vehicle_number={test_veh_num}", headers=auth_headers)
        assert pnl_res.status_code == 200, pnl_res.text
        pnl = pnl_res.json()

        assert len(pnl["vehicles"]) == 1
        veh_pnl = pnl["vehicles"][0]
        assert veh_pnl["vehicle_number"] == test_veh_num

        # Expected numbers:
        # Revenue: Transport invoice net/total amount (₹60,000 + GST or exactly ₹60,000)
        # Fuel: ₹16,000.00
        # Toll: ₹3,500.00
        # Driver: ₹2,500.00
        # Maintenance: ₹12,000.00 (workshop service)
        # Total Operating Cost = 16000 + 3500 + 2500 + 12000 = ₹34,000.00
        rev = Decimal(str(veh_pnl["total_revenue"]))
        fuel = Decimal(str(veh_pnl["fuel_cost"]))
        toll = Decimal(str(veh_pnl["toll_cost"]))
        driver_cost = Decimal(str(veh_pnl["driver_cost"]))
        maint = Decimal(str(veh_pnl["maintenance_cost"]))
        total_cost = Decimal(str(veh_pnl["total_operating_cost"]))
        net_profit = Decimal(str(veh_pnl["net_profit"]))
        margin_pct = Decimal(str(veh_pnl["profit_margin_pct"]))

        assert rev >= Decimal("60000.00"), f"Expected revenue >= 60000, got {rev}"
        assert fuel == Decimal("16000.00"), f"Expected fuel 16000, got {fuel}"
        assert toll == Decimal("3500.00"), f"Expected toll 3500, got {toll}"
        assert driver_cost == Decimal("2500.00"), f"Expected driver 2500, got {driver_cost}"
        assert maint == Decimal("12000.00"), f"Expected maint 12000, got {maint}"
        assert total_cost == Decimal("34000.00"), f"Expected total cost 34000, got {total_cost}"
        assert net_profit == rev - total_cost, f"Net profit {net_profit} != {rev} - {total_cost}"
        expected_margin = (net_profit / rev * Decimal("100.00")).quantize(Decimal("0.01"))
        assert margin_pct == expected_margin, f"Margin % {margin_pct} != {expected_margin}"

        # Drilldown trips validation
        assert len(veh_pnl["trips"]) == 1
        trip = veh_pnl["trips"][0]
        assert trip["lr_number"] == lr["lr_number"]
        assert Decimal(str(trip["diesel_cost"])) == Decimal("16000.00")
        assert Decimal(str(trip["toll_cost"])) == Decimal("3500.00")
        assert Decimal(str(trip["driver_cost"])) == Decimal("2500.00")
        assert Decimal(str(trip["freight_revenue"])) == rev

        # ======================================================================
        # 12. VERIFY: Trip Expense Register Derived View
        # ======================================================================
        reg_res = await client.get(f"/api/v1/fleet/expense-register?vehicle_number={test_veh_num}", headers=auth_headers)
        assert reg_res.status_code == 200, reg_res.text
        reg = reg_res.json()

        assert reg["total_records"] == 3  # Diesel, Toll, Driver
        assert Decimal(str(reg["total_amount"])) == Decimal("22000.00")  # 16000 + 3500 + 2500
        assert Decimal(str(reg["fuel_total"])) == Decimal("16000.00")
        assert Decimal(str(reg["toll_total"])) == Decimal("3500.00")
        assert Decimal(str(reg["driver_allowance_total"])) == Decimal("2500.00")

        # ======================================================================
        # 13. VERIFY: Home Module Real-Data Dashboards
        # ======================================================================
        # 13a. Business Overview
        biz_res = await client.get("/api/v1/home/business-overview", headers=auth_headers)
        assert biz_res.status_code == 200, biz_res.text
        biz = biz_res.json()
        assert biz["total_movements"] >= 1
        assert len(biz["monthly_trends"]) >= 1
        assert len(biz["pipeline_stages"]) >= 1

        # 13b. Financial Analysis
        fin_res = await client.get("/api/v1/home/financial-analysis", headers=auth_headers)
        assert fin_res.status_code == 200, fin_res.text
        fin = fin_res.json()
        assert Decimal(str(fin["total_billed_revenue"])) > Decimal("0.00")
        assert Decimal(str(fin["total_operating_expenses"])) > Decimal("0.00")
        assert len(fin["expense_breakdown"]) >= 1

        # 13c. Fleet & Operations
        ops_res = await client.get("/api/v1/home/fleet-operations", headers=auth_headers)
        assert ops_res.status_code == 200, ops_res.text
        ops = ops_res.json()
        assert ops["total_fleet_count"] >= 1
        assert len(ops["fleet_status_breakdown"]) >= 1

        # 13d. Own Fleet
        own_res = await client.get("/api/v1/home/own-fleet", headers=auth_headers)
        assert own_res.status_code == 200, own_res.text
        own = own_res.json()
        assert own["company_vehicles_count"] >= 1
        assert own["total_odometer_km"] > 0
        assert any(v["vehicle_number"] == test_veh_num for v in own["vehicles"])
