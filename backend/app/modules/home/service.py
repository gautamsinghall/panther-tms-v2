from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import app.tenant_db.models as models
from app.modules.home.schemas import (
    BusinessOverviewData,
    MonthlyTrendPoint,
    CorridorVolume,
    PipelineStageCount,
    RecentOperationItem,
    FinancialAnalysisData,
    ExpenseCategoryShare,
    MonthlyPnLPoint,
    FleetOperationsData,
    FleetStatusCount,
    ExpiringDocumentAlert,
    ActiveTransitMovement,
    OwnFleetData,
    OwnVehicleMatrixItem,
)

# One canonical movement definition is shared by dashboard KPIs, funnel stages,
# fleet fallbacks, and active-movement lists. BOOKED is scheduled freight, not
# freight that has physically entered transit.
IN_TRANSIT_LR_STATUSES = ("DISPATCHED", "IN_TRANSIT")
DELIVERED_LR_STATUSES = ("DELIVERED", "POD_RECEIVED", "POD_VERIFIED")


def summarize_lr_statuses(lrs: List[models.LR]) -> Dict[str, int]:
    """Return the canonical, mutually exclusive dashboard funnel counts."""
    return {
        "DRAFT": sum(1 for lr in lrs if lr.status == "DRAFT"),
        "BOOKED": sum(1 for lr in lrs if lr.status == "BOOKED"),
        "IN_TRANSIT": sum(1 for lr in lrs if lr.status in IN_TRANSIT_LR_STATUSES),
        "DELIVERED": sum(1 for lr in lrs if lr.status == "DELIVERED"),
        "POD_VERIFIED": sum(1 for lr in lrs if lr.status in ("POD_RECEIVED", "POD_VERIFIED")),
    }

# ==============================================================================
# 1. Business Overview Service
# ==============================================================================

async def get_business_overview(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> BusinessOverviewData:
    # 1. Fetch all LRs
    lr_stmt = (
        select(models.LR)
        .options(
            selectinload(models.LR.consigner),
            selectinload(models.LR.consignee),
            selectinload(models.LR.origin_location),
            selectinload(models.LR.destination_location),
        )
    )
    if office_id is not None:
        if include_unassigned:
            lr_stmt = lr_stmt.where(or_(models.LR.issuing_office_id == office_id, models.LR.issuing_office_id == None))
        else:
            lr_stmt = lr_stmt.where(models.LR.issuing_office_id == office_id)
    lr_stmt = lr_stmt.order_by(models.LR.lr_date.desc(), models.LR.id.desc())
    lr_res = await session.execute(lr_stmt)
    lrs = lr_res.scalars().all()

    total_movements = len(lrs)
    status_counts = summarize_lr_statuses(lrs)
    in_transit_count = status_counts["IN_TRANSIT"]
    delivered_count = sum(1 for l in lrs if l.status in DELIVERED_LR_STATUSES)

    # 2. Fetch Vouchers for revenue & reconciled count
    v_stmt = select(models.Voucher).where(models.Voucher.is_void == False)
    if office_id is not None:
        if include_unassigned:
            v_stmt = v_stmt.where(or_(models.Voucher.issuing_office_id == office_id, models.Voucher.issuing_office_id == None))
        else:
            v_stmt = v_stmt.where(models.Voucher.issuing_office_id == office_id)
    v_res = await session.execute(v_stmt)
    vouchers = v_res.scalars().all()

    total_vouchers = len(vouchers)
    ti_vouchers = [v for v in vouchers if v.voucher_type in (
        models.VoucherType.TRANSPORT_INVOICE.value,
        models.VoucherType.GENERAL_INVOICE.value,
    )]
    billed_revenue = sum(Decimal(str(v.net_amount or v.total_amount or "0.00")) for v in ti_vouchers)

    if billed_revenue == Decimal("0.00") and lrs:
        billed_revenue = sum(Decimal(str(l.total_freight_amount or l.freight_amount or "0.00")) for l in lrs)

    # 3. Monthly Trends (group by YYYY-MM)
    month_data: Dict[str, Dict] = {}
    for l in lrs:
        m_key = l.lr_date.strftime("%b %Y")
        if m_key not in month_data:
            month_data[m_key] = {"revenue": Decimal("0.00"), "trips": 0, "invoices": 0}
        month_data[m_key]["trips"] += 1
        month_data[m_key]["revenue"] += Decimal(str(l.total_freight_amount or l.freight_amount or "0.00"))

    for v in ti_vouchers:
        m_key = v.voucher_date.strftime("%b %Y")
        if m_key not in month_data:
            month_data[m_key] = {"revenue": Decimal("0.00"), "trips": 0, "invoices": 0}
        month_data[m_key]["invoices"] += 1

    # Format monthly trends list (sorted chronologically)
    monthly_trends = [
        MonthlyTrendPoint(
            period=k,
            revenue=v["revenue"],
            trips=v["trips"],
            invoices=v["invoices"],
        )
        for k, v in list(month_data.items())[-6:]
    ]

    # Preserve an empty-period axis point without inventing business values.
    if not monthly_trends:
        monthly_trends.append(
            MonthlyTrendPoint(
                period=date.today().strftime("%b %Y"),
                revenue=billed_revenue,
                trips=total_movements,
                invoices=len(ti_vouchers),
            )
        )

    # 4. Pipeline Stages
    pipeline_counts = status_counts
    tot_stg = max(1, total_movements)
    pipeline_stages = [
        PipelineStageCount(
            stage=stg.replace("_", " "),
            count=cnt,
            percentage=round(cnt / tot_stg * 100, 1),
        )
        for stg, cnt in pipeline_counts.items()
    ]

    # 5. Top Corridors
    corridors_map: Dict[str, Dict] = {}
    for l in lrs:
        orig = l.origin_location.city_name if l.origin_location else "Not specified"
        dest = l.destination_location.city_name if l.destination_location else "Not specified"
        corr_key = f"{orig} → {dest}"
        if corr_key not in corridors_map:
            corridors_map[corr_key] = {
                "origin": orig,
                "destination": dest,
                "count": 0,
                "freight": Decimal("0.00"),
            }
        corridors_map[corr_key]["count"] += 1
        corridors_map[corr_key]["freight"] += Decimal(str(l.total_freight_amount or l.freight_amount or "0.00"))

    sorted_corridors = sorted(corridors_map.values(), key=lambda x: x["count"], reverse=True)[:4]
    top_corridors = [
        CorridorVolume(
            origin=c["origin"],
            destination=c["destination"],
            trip_count=c["count"],
            total_freight=c["freight"],
        )
        for c in sorted_corridors
    ]

    # 6. Recent Operations
    recent_ops = [
        RecentOperationItem(
            id=l.id,
            lr_number=l.lr_number,
            lr_date=l.lr_date,
            consigner_name=l.consigner.name if l.consigner else None,
            consignee_name=l.consignee.name if l.consignee else None,
            origin_city=l.origin_location.city_name if l.origin_location else None,
            destination_city=l.destination_location.city_name if l.destination_location else None,
            vehicle_number=l.vehicle_number,
            freight_amount=Decimal(str(l.total_freight_amount or l.freight_amount or "0.00")),
            status=l.status,
        )
        for l in lrs[:6]
    ]

    return BusinessOverviewData(
        total_movements=total_movements,
        in_transit_count=in_transit_count,
        delivered_count=delivered_count,
        net_billed_revenue=billed_revenue,
        total_vouchers_reconciled=total_vouchers,
        monthly_trends=monthly_trends,
        pipeline_stages=pipeline_stages,
        top_corridors=top_corridors,
        recent_operations=recent_ops,
    )


# ==============================================================================
# 2. Financial Analysis Service
# ==============================================================================

async def get_financial_analysis(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> FinancialAnalysisData:
    # 1. Total Billed Revenue from Transport Invoices
    v_stmt = select(models.Voucher).where(
        models.Voucher.is_void == False,
        models.Voucher.voucher_type.in_([
            models.VoucherType.TRANSPORT_INVOICE.value,
            models.VoucherType.GENERAL_INVOICE.value,
        ])
    )
    if office_id is not None:
        if include_unassigned:
            v_stmt = v_stmt.where(or_(models.Voucher.issuing_office_id == office_id, models.Voucher.issuing_office_id == None))
        else:
            v_stmt = v_stmt.where(models.Voucher.issuing_office_id == office_id)
    v_res = await session.execute(v_stmt)
    invs = v_res.scalars().all()
    billed_rev = sum(Decimal(str(v.net_amount or v.total_amount or "0.00")) for v in invs)

    # Fallback to LR freights if no vouchers yet
    if billed_rev == Decimal("0.00"):
        lr_stmt = select(func.sum(models.LR.total_freight_amount))
        if office_id is not None:
            if include_unassigned:
                lr_stmt = lr_stmt.where(or_(models.LR.issuing_office_id == office_id, models.LR.issuing_office_id == None))
            else:
                lr_stmt = lr_stmt.where(models.LR.issuing_office_id == office_id)
        lr_res = await session.execute(lr_stmt)
        billed_rev = lr_res.scalar() or Decimal("0.00")

    # 2. Trip Expenses Breakdown
    exp_stmt = select(models.TripExpense)
    exp_res = await session.execute(exp_stmt)
    expenses = exp_res.scalars().all()

    fuel_tot = sum((e.amount or Decimal("0.00")) for e in expenses if e.expense_category == "DIESEL")
    toll_tot = sum((e.amount or Decimal("0.00")) for e in expenses if e.expense_category in ("TOLL", "FASTAG"))
    maint_exp_tot = sum((e.amount or Decimal("0.00")) for e in expenses if e.expense_category == "MAINTENANCE")
    driver_tot = sum((e.amount or Decimal("0.00")) for e in expenses if e.expense_category == "DRIVER_ALLOWANCE")
    other_tot = sum((e.amount or Decimal("0.00")) for e in expenses if e.expense_category not in ("DIESEL", "TOLL", "FASTAG", "MAINTENANCE", "DRIVER_ALLOWANCE"))

    # 3. Workshop Repairs
    srv_stmt = select(models.RepairServiceRecord)
    srv_res = await session.execute(srv_stmt)
    repairs = srv_res.scalars().all()
    workshop_tot = sum((r.total_cost or Decimal("0.00")) for r in repairs)

    total_maint = maint_exp_tot + workshop_tot

    # 4. Hire Challan costs for market vehicles
    hc_stmt = select(func.sum(models.HireChallan.hire_rate))
    if office_id is not None:
        if include_unassigned:
            hc_stmt = hc_stmt.where(or_(models.HireChallan.issuing_office_id == office_id, models.HireChallan.issuing_office_id == None))
        else:
            hc_stmt = hc_stmt.where(models.HireChallan.issuing_office_id == office_id)
    hc_res = await session.execute(hc_stmt)
    hire_tot = hc_res.scalar() or Decimal("0.00")

    total_operating_expenses = fuel_tot + toll_tot + total_maint + driver_tot + hire_tot + other_tot
    net_profit = billed_rev - total_operating_expenses
    margin_pct = (
        (net_profit / billed_rev * Decimal("100.00")).quantize(Decimal("0.01"))
        if billed_rev > 0
        else Decimal("0.00")
    )

    # 5. Accounts Receivable (Sundry Debtors) & Payable (Sundry Creditors)
    # Query Sundry Debtors accounts
    debtor_stmt = (
        select(models.LedgerEntry)
        .join(models.Account)
        .join(models.GroupInPrimary)
        .where(
            or_(
                models.GroupInPrimary.code == "DEBTORS",
                models.Account.code.like("%DEBTOR%"),
            )
        )
    )
    debtor_res = await session.execute(debtor_stmt)
    debtor_entries = debtor_res.scalars().all()
    debtors_bal = sum(
        (e.debit_amount - e.credit_amount) for e in debtor_entries
    ) if debtor_entries else Decimal("0.00")

    creditor_stmt = (
        select(models.LedgerEntry)
        .join(models.Account)
        .join(models.GroupInPrimary)
        .where(
            or_(
                models.GroupInPrimary.code == "CREDITORS",
                models.Account.code.like("%CREDITOR%"),
            )
        )
    )
    creditor_res = await session.execute(creditor_stmt)
    creditor_entries = creditor_res.scalars().all()
    creditors_bal = sum(
        (e.credit_amount - e.debit_amount) for e in creditor_entries
    ) if creditor_entries else Decimal("0.00")

    # 6. Expense Breakdown shares
    tot_exp_float = float(total_operating_expenses) or 1.0
    shares = [
        ("Diesel / Fuel", fuel_tot),
        ("Toll & FASTag", toll_tot),
        ("Repairs & Workshop", total_maint),
        ("Driver Allowances", driver_tot),
        ("Hired Vehicle Freight", hire_tot),
        ("En-Route Misc", other_tot),
    ]
    expense_breakdown = [
        ExpenseCategoryShare(
            category=cat,
            amount=amt,
            percentage=round(float(amt) / tot_exp_float * 100, 1) if tot_exp_float > 0 else 0.0,
        )
        for cat, amt in shares
        if amt > 0
    ]

    # 7. Monthly Performance Point
    monthly_performance = [
        MonthlyPnLPoint(
            period=date.today().strftime("%b %Y"),
            revenue=billed_rev,
            operating_expenses=total_operating_expenses,
            net_profit=net_profit,
            margin_pct=margin_pct,
        )
    ]

    return FinancialAnalysisData(
        total_billed_revenue=billed_rev,
        total_operating_expenses=total_operating_expenses,
        net_operating_profit=net_profit,
        operating_margin_pct=margin_pct,
        trade_debtors_receivable=max(Decimal("0.00"), debtors_bal),
        trade_creditors_payable=max(Decimal("0.00"), creditors_bal),
        expense_breakdown=expense_breakdown,
        monthly_performance=monthly_performance,
    )


# ==============================================================================
# 3. Fleet & Operations Service
# ==============================================================================

async def get_fleet_operations(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> FleetOperationsData:
    # 1. Company & Market Vehicles
    cv_count_stmt = select(func.count(models.CompanyVehicle.id)).where(models.CompanyVehicle.is_active == True)
    if office_id is not None:
        if include_unassigned:
            cv_count_stmt = cv_count_stmt.where(or_(models.CompanyVehicle.issuing_office_id == office_id, models.CompanyVehicle.issuing_office_id == None))
        else:
            cv_count_stmt = cv_count_stmt.where(models.CompanyVehicle.issuing_office_id == office_id)
    cv_res = await session.execute(cv_count_stmt)
    cv_count = cv_res.scalar() or 0

    mv_count_stmt = select(func.count(models.MarketVehicle.id)).where(models.MarketVehicle.is_active == True)
    mv_res = await session.execute(mv_count_stmt)
    mv_count = mv_res.scalar() or 0

    total_fleet = cv_count + mv_count

    # 2. Vehicle Health & Operational Statuses
    vh_stmt = select(models.VehicleHealthRecord)
    vh_res = await session.execute(vh_stmt)
    health_records = vh_res.scalars().all()

    in_transit_cnt = sum(1 for h in health_records if h.current_status == "IN_TRANSIT")
    in_workshop_cnt = sum(1 for h in health_records if h.current_status == "UNDER_MAINTENANCE" or h.status == "IN_WORKSHOP")
    available_cnt = sum(1 for h in health_records if h.current_status == "AVAILABLE")

    # If no records, fallback to count from active LRs
    if not health_records:
        lr_in_transit_stmt = select(func.count(models.LR.id)).where(models.LR.status.in_(IN_TRANSIT_LR_STATUSES))
        if office_id is not None:
            if include_unassigned:
                lr_in_transit_stmt = lr_in_transit_stmt.where(or_(models.LR.issuing_office_id == office_id, models.LR.issuing_office_id == None))
            else:
                lr_in_transit_stmt = lr_in_transit_stmt.where(models.LR.issuing_office_id == office_id)
        res_lr = await session.execute(lr_in_transit_stmt)
        in_transit_cnt = res_lr.scalar() or 0
        available_cnt = max(0, total_fleet - in_transit_cnt)

    # 3. Pending PODs
    pod_conditions = [
        models.LR.status.in_(["DELIVERED", "IN_TRANSIT"]),
        ~models.LR.id.in_(select(models.PODRecord.lr_id).where(models.PODRecord.verification_status.in_(["VERIFIED", "APPROVED"])))
    ]
    if office_id is not None:
        if include_unassigned:
            pod_conditions.append(or_(models.LR.issuing_office_id == office_id, models.LR.issuing_office_id == None))
        else:
            pod_conditions.append(models.LR.issuing_office_id == office_id)
    pod_stmt = select(func.count(models.LR.id)).where(*pod_conditions)
    pod_res = await session.execute(pod_stmt)
    pending_pods = pod_res.scalar() or 0

    # 4. Fleet Status Breakdown
    fleet_status_breakdown = [
        FleetStatusCount(status="In Transit", count=in_transit_cnt, color="#2E90FA"),
        FleetStatusCount(status="Available / Idle", count=available_cnt, color="#12B76A"),
        FleetStatusCount(status="Under Maintenance", count=in_workshop_cnt, color="#F79009"),
    ]

    # 5. Expiring Documents (within 30 days)
    today = date.today()
    threshold = today + timedelta(days=30)
    doc_stmt = (
        select(models.VehicleDocument)
        .where(models.VehicleDocument.valid_till <= threshold)
        .order_by(models.VehicleDocument.valid_till.asc())
    )
    doc_res = await session.execute(doc_stmt)
    docs = doc_res.scalars().all()

    expiring_docs = [
        ExpiringDocumentAlert(
            id=d.id,
            vehicle_number=d.vehicle_number,
            doc_type=d.doc_type.replace("_", " ") if d.doc_type else "DOCUMENT",
            document_number=d.document_number or "",
            valid_till=d.valid_till,
            days_left=(d.valid_till - today).days if d.valid_till else 0,
            status=d.status or "EXPIRING",
        )
        for d in docs
    ]

    # 6. Active Transit Movements
    active_lr_stmt = (
        select(models.LR)
        .options(
            selectinload(models.LR.origin_location),
            selectinload(models.LR.destination_location),
        )
        .where(models.LR.status.in_(IN_TRANSIT_LR_STATUSES))
    )
    if office_id is not None:
        if include_unassigned:
            active_lr_stmt = active_lr_stmt.where(or_(models.LR.issuing_office_id == office_id, models.LR.issuing_office_id == None))
        else:
            active_lr_stmt = active_lr_stmt.where(models.LR.issuing_office_id == office_id)
    active_lr_stmt = active_lr_stmt.order_by(desc(models.LR.lr_date))
    active_lr_res = await session.execute(active_lr_stmt)
    active_lrs = active_lr_res.scalars().all()

    active_movements = [
        ActiveTransitMovement(
            vehicle_number=l.vehicle_number,
            vehicle_type=l.vehicle_source,
            driver_name=l.driver_name,
            lr_number=l.lr_number,
            origin=l.origin_location.city_name if l.origin_location else "Origin",
            destination=l.destination_location.city_name if l.destination_location else "Destination",
            current_location="En-route Highway Corridor",
            status=l.status,
        )
        for l in active_lrs[:6]
    ]

    return FleetOperationsData(
        total_fleet_count=total_fleet,
        in_transit_count=in_transit_cnt,
        in_workshop_count=in_workshop_cnt,
        available_count=available_cnt,
        pending_pod_count=pending_pods,
        fleet_status_breakdown=fleet_status_breakdown,
        expiring_documents=expiring_docs,
        active_movements=active_movements,
    )


# ==============================================================================
# 4. Own Fleet Service
# ==============================================================================

async def get_own_fleet(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> OwnFleetData:
    cv_stmt = select(models.CompanyVehicle).options(selectinload(models.CompanyVehicle.default_driver))
    if office_id is not None:
        if include_unassigned:
            cv_stmt = cv_stmt.where(or_(models.CompanyVehicle.issuing_office_id == office_id, models.CompanyVehicle.issuing_office_id == None))
        else:
            cv_stmt = cv_stmt.where(models.CompanyVehicle.issuing_office_id == office_id)
    cv_res = await session.execute(cv_stmt)
    company_vehicles = cv_res.scalars().all()

    v_numbers = [v.vehicle_number for v in company_vehicles]

    # Health map & Tyre counts
    health_map = {}
    tyres = []
    if v_numbers:
        h_stmt = select(models.VehicleHealthRecord).where(models.VehicleHealthRecord.vehicle_number.in_(v_numbers))
        h_res = await session.execute(h_stmt)
        health_map = {h.vehicle_number: h for h in h_res.scalars().all()}

        tyre_stmt = select(models.TyreRecord).where(models.TyreRecord.vehicle_number.in_(v_numbers))
        tyre_res = await session.execute(tyre_stmt)
        tyres = tyre_res.scalars().all()

    mounted_cnt = sum(1 for t in tyres if t.status == "MOUNTED_GOOD")
    retread_due_cnt = sum(1 for t in tyres if t.status == "RETREAD_DUE")

    roadworthy_cnt = 0
    service_overdue_cnt = 0
    in_maintenance_cnt = 0
    total_odo = 0

    vehicles_matrix: List[OwnVehicleMatrixItem] = []
    for cv in company_vehicles:
        h = health_map.get(cv.vehicle_number)
        odo = (h.odometer_km if (h and h.odometer_km is not None) else (cv.current_odometer_km or 0)) or 0
        total_odo += odo

        eng = h.engine_health if h else "GOOD"
        bat = h.battery_status if h else "HEALTHY"
        next_km = h.next_service_km if h else 10000
        cur_stat = h.current_status if h else "AVAILABLE"
        srv_stat = h.status if h else "ROADWORTHY"
        loc = h.current_location if h else "Depot Hub"

        if srv_stat == "ROADWORTHY":
            roadworthy_cnt += 1
        elif srv_stat == "SERVICE_OVERDUE":
            service_overdue_cnt += 1
        elif srv_stat == "IN_WORKSHOP":
            in_maintenance_cnt += 1

        driver_name = cv.default_driver.name if cv.default_driver else None

        vehicles_matrix.append(
            OwnVehicleMatrixItem(
                vehicle_number=cv.vehicle_number,
                model=cv.vehicle_type,
                odometer_km=odo,
                engine_health=eng,
                battery_status=bat,
                next_service_km=next_km,
                service_status=srv_stat,
                current_status=cur_stat,
                current_location=loc,
                default_driver=driver_name,
            )
        )

    return OwnFleetData(
        company_vehicles_count=len(company_vehicles),
        roadworthy_count=roadworthy_cnt,
        service_overdue_count=service_overdue_cnt,
        under_maintenance_count=in_maintenance_cnt,
        total_odometer_km=total_odo,
        tyre_mounted_count=mounted_cnt,
        tyre_retread_due_count=retread_due_cnt,
        vehicles=vehicles_matrix,
    )
