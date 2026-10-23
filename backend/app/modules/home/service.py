import logging
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
    NotificationItemSchema,
)

logger = logging.getLogger(__name__)

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
    try:
        # Build reusable office filter clause
        def office_filter(col):
            if office_id is None:
                return []
            if include_unassigned:
                return [or_(col == office_id, col.is_(None))]
            return [col == office_id]

        # 1. Aggregate LR counts by status using SQL (no full-table scan)
        lr_status_stmt = (
            select(models.LR.status, func.count(models.LR.id).label("cnt"))
            .where(*office_filter(models.LR.issuing_office_id))
            .group_by(models.LR.status)
        )
        lr_status_res = await session.execute(lr_status_stmt)
        status_counts_raw = {row.status: row.cnt for row in lr_status_res}
        total_movements = sum(status_counts_raw.values())

        in_transit_statuses = set(IN_TRANSIT_LR_STATUSES)
        delivered_statuses = set(DELIVERED_LR_STATUSES)
        status_counts = {
            "DRAFT": status_counts_raw.get("DRAFT", 0),
            "BOOKED": status_counts_raw.get("BOOKED", 0),
            "IN_TRANSIT": sum(v for k, v in status_counts_raw.items() if k in in_transit_statuses),
            "DELIVERED": status_counts_raw.get("DELIVERED", 0),
            "POD_VERIFIED": sum(v for k, v in status_counts_raw.items() if k in ("POD_RECEIVED", "POD_VERIFIED")),
        }
        in_transit_count = status_counts["IN_TRANSIT"]
        delivered_count = sum(v for k, v in status_counts_raw.items() if k in delivered_statuses)

        # 2. Revenue from vouchers (SQL SUM)
        v_stmt = (
            select(func.sum(func.coalesce(models.Voucher.net_amount, models.Voucher.total_amount)))
            .where(
                models.Voucher.is_void == False,
                models.Voucher.voucher_type.in_([
                    models.VoucherType.TRANSPORT_INVOICE.value,
                    models.VoucherType.GENERAL_INVOICE.value,
                ]),
                *office_filter(models.Voucher.issuing_office_id),
            )
        )
        v_res = await session.execute(v_stmt)
        billed_revenue = Decimal(str(v_res.scalar() or "0.00"))

        v_cnt_stmt = (
            select(func.count(models.Voucher.id))
            .where(
                models.Voucher.is_void == False,
                *office_filter(models.Voucher.issuing_office_id),
            )
        )
        v_cnt_res = await session.execute(v_cnt_stmt)
        total_vouchers = v_cnt_res.scalar() or 0

        if billed_revenue == Decimal("0.00"):
            lr_rev_stmt = (
                select(func.sum(models.LR.total_freight_amount))
                .where(*office_filter(models.LR.issuing_office_id))
            )
            lr_rev_res = await session.execute(lr_rev_stmt)
            billed_revenue = Decimal(str(lr_rev_res.scalar() or "0.00"))

        # 3. Monthly trends — aggregate by YYYY-MM using SQL date_trunc
        monthly_trends: List[MonthlyTrendPoint] = []
        try:
            month_trunc = func.date_trunc("month", models.LR.lr_date)
            lr_monthly_stmt = (
                select(
                    month_trunc.label("month_dt"),
                    func.count(models.LR.id).label("trips"),
                    func.coalesce(func.sum(models.LR.total_freight_amount), 0).label("revenue"),
                )
                .where(
                    models.LR.lr_date.isnot(None),
                    *office_filter(models.LR.issuing_office_id),
                )
                .group_by(month_trunc)
                .order_by(month_trunc.desc())
                .limit(6)
            )
            lr_monthly_res = await session.execute(lr_monthly_stmt)
            monthly_rows = list(reversed(lr_monthly_res.fetchall()))
            for row in monthly_rows:
                if not row.month_dt:
                    continue
                period_str = (
                    row.month_dt.strftime("%b %Y")
                    if hasattr(row.month_dt, "strftime")
                    else str(row.month_dt)[:7]
                )
                monthly_trends.append(
                    MonthlyTrendPoint(
                        period=period_str,
                        revenue=Decimal(str(row.revenue or "0.00")),
                        trips=row.trips or 0,
                        invoices=0,
                    )
                )
        except Exception as m_err:
            logger.warning("Error fetching monthly trends via SQL date_trunc: %s", m_err)

        if not monthly_trends:
            monthly_trends.append(
                MonthlyTrendPoint(
                    period=date.today().strftime("%b %Y"),
                    revenue=billed_revenue,
                    trips=total_movements,
                    invoices=0,
                )
            )

        # 4. Pipeline Stages
        tot_stg = max(1, total_movements)
        pipeline_stages = [
            PipelineStageCount(
                stage=stg.replace("_", " "),
                count=cnt,
                percentage=round(cnt / tot_stg * 100, 1),
            )
            for stg, cnt in status_counts.items()
        ]

        # 5. Top Corridors — selectinload on recent LRs only
        corr_lr_stmt = (
            select(models.LR)
            .options(
                selectinload(models.LR.origin_location),
                selectinload(models.LR.destination_location),
            )
            .where(*office_filter(models.LR.issuing_office_id))
            .order_by(models.LR.lr_date.desc().nullslast(), models.LR.id.desc())
            .limit(200)
        )
        corr_res = await session.execute(corr_lr_stmt)
        recent_lrs = corr_res.scalars().all()

        corridors_map: Dict[str, Dict] = {}
        for l in recent_lrs:
            orig = l.origin_location.city_name if l.origin_location and l.origin_location.city_name else "Not specified"
            dest = l.destination_location.city_name if l.destination_location and l.destination_location.city_name else "Not specified"
            corr_key = f"{orig} → {dest}"
            if corr_key not in corridors_map:
                corridors_map[corr_key] = {"origin": orig, "destination": dest, "count": 0, "freight": Decimal("0.00")}
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

        # 6. Recent Operations (latest 6 LRs only)
        recent_ops_stmt = (
            select(models.LR)
            .options(
                selectinload(models.LR.consigner),
                selectinload(models.LR.consignee),
                selectinload(models.LR.origin_location),
                selectinload(models.LR.destination_location),
            )
            .where(*office_filter(models.LR.issuing_office_id))
            .order_by(models.LR.lr_date.desc().nullslast(), models.LR.id.desc())
            .limit(6)
        )
        recent_ops_res = await session.execute(recent_ops_stmt)
        recent_lrs_top = recent_ops_res.scalars().all()
        recent_ops = [
            RecentOperationItem(
                id=l.id,
                lr_number=l.lr_number or f"LR-{l.id}",
                lr_date=l.lr_date,
                consigner_name=l.consigner.name if l.consigner else None,
                consignee_name=l.consignee.name if l.consignee else None,
                origin_city=l.origin_location.city_name if l.origin_location else None,
                destination_city=l.destination_location.city_name if l.destination_location else None,
                vehicle_number=l.vehicle_number or "",
                freight_amount=Decimal(str(l.total_freight_amount or l.freight_amount or "0.00")),
                status=l.status or "DRAFT",
            )
            for l in recent_lrs_top
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
    except Exception as exc:
        logger.error("Error computing business overview metrics: %s", exc, exc_info=True)
        return BusinessOverviewData(
            total_movements=0,
            in_transit_count=0,
            delivered_count=0,
            net_billed_revenue=Decimal("0.00"),
            total_vouchers_reconciled=0,
            monthly_trends=[
                MonthlyTrendPoint(
                    period=date.today().strftime("%b %Y"),
                    revenue=Decimal("0.00"),
                    trips=0,
                    invoices=0,
                )
            ],
            pipeline_stages=[],
            top_corridors=[],
            recent_operations=[],
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


# ==============================================================================
# 5. Real Notifications Service
# ==============================================================================

def format_time_ago(dt: Optional[datetime]) -> str:
    if not dt:
        return "recently"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min{'s' if minutes > 1 else ''} ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    days = hours // 24
    if days < 30:
        return f"{days} day{'s' if days > 1 else ''} ago"
    return f"{days // 30} month{'s' if days // 30 > 1 else ''} ago"


async def get_real_notifications(
    session: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = True,
) -> List[NotificationItemSchema]:
    """
    Synthesize live, un-mocked notifications strictly from active tenant records:
    1. Expiring/expired vehicle compliance documents
    2. Live FASTag toll crossing detections
    3. Active freight movements & pending POD deliveries
    4. Expiring E-Way bills
    5. Recent posted vouchers and client freight invoices
    """
    notifications: List[NotificationItemSchema] = []
    today = date.today()
    now = datetime.now(timezone.utc)

    # 1. Expiring / Expired Vehicle Documents (Alerts)
    threshold = today + timedelta(days=30)
    doc_stmt = (
        select(models.VehicleDocument)
        .where(models.VehicleDocument.valid_till <= threshold)
        .order_by(models.VehicleDocument.valid_till.asc())
        .limit(4)
    )
    doc_res = await session.execute(doc_stmt)
    for doc in doc_res.scalars().all():
        days_left = (doc.valid_till - today).days if doc.valid_till else 0
        doc_name = doc.doc_type.replace("_", " ").title() if doc.doc_type else "Document"
        if days_left < 0:
            title = f"{doc_name} Expired"
            msg = f"Vehicle {doc.vehicle_number} {doc_name} expired on {doc.valid_till}."
            time_str = f"{abs(days_left)}d overdue"
        else:
            title = f"{doc_name} Expiring"
            msg = f"Vehicle {doc.vehicle_number} {doc_name} expires in {days_left} days ({doc.valid_till})."
            time_str = f"{days_left}d left"
        notifications.append(
            NotificationItemSchema(
                id=f"doc-{doc.id}",
                title=title,
                message=msg,
                timeAgo=time_str,
                type="alert",
                unread=True,
                href="/fleet/documents",
            )
        )

    # 2. FASTag Active Toll Crossings (Dispatch)
    fastag_stmt = (
        select(models.FastagTripRecord)
        .where(
            models.FastagTripRecord.status == "ACTIVE",
            models.FastagTripRecord.last_toll_name.isnot(None),
        )
        .order_by(desc(models.FastagTripRecord.last_toll_time))
        .limit(3)
    )
    ft_res = await session.execute(fastag_stmt)
    for ft in ft_res.scalars().all():
        notifications.append(
            NotificationItemSchema(
                id=f"fastag-{ft.id}",
                title="Vehicle Movement Alert",
                message=f"Truck {ft.vehicle_number} passed Toll Plaza: {ft.last_toll_name}.",
                timeAgo=format_time_ago(ft.last_toll_time),
                type="dispatch",
                unread=True,
                href="/tracking/fastag",
            )
        )

    # 3. Active / Recent Consignments (Dispatch / Movement)
    lr_stmt = (
        select(models.LR)
        .options(
            selectinload(models.LR.destination_location),
        )
    )
    if office_id is not None:
        if include_unassigned:
            lr_stmt = lr_stmt.where(or_(models.LR.issuing_office_id == office_id, models.LR.issuing_office_id == None))
        else:
            lr_stmt = lr_stmt.where(models.LR.issuing_office_id == office_id)
    lr_stmt = lr_stmt.order_by(desc(models.LR.created_at)).limit(4)
    lr_res = await session.execute(lr_stmt)
    for lr in lr_res.scalars().all():
        dest = lr.destination_location.city_name if lr.destination_location else "Destination"
        veh = f" ({lr.vehicle_number})" if lr.vehicle_number else ""
        if lr.status in ("IN_TRANSIT", "BOOKED", "LOADED"):
            notifications.append(
                NotificationItemSchema(
                    id=f"lr-{lr.id}",
                    title=f"Consignment {lr.status.replace('_', ' ').title()}",
                    message=f"LR #{lr.lr_number}{veh} en route to {dest}.",
                    timeAgo=format_time_ago(lr.created_at),
                    type="dispatch",
                    unread=True,
                    href="/transport/lr-booking",
                )
            )
        elif lr.status == "DELIVERED":
            notifications.append(
                NotificationItemSchema(
                    id=f"lr-{lr.id}",
                    title="Consignment Delivered",
                    message=f"LR #{lr.lr_number}{veh} delivered. Awaiting POD verification.",
                    timeAgo=format_time_ago(lr.created_at),
                    type="success",
                    unread=False,
                    href="/transport/pod-records",
                )
            )

    # 4. Pending POD Verification (Alert)
    pod_stmt = (
        select(models.PODRecord)
        .options(selectinload(models.PODRecord.lr))
        .where(models.PODRecord.verification_status == "PENDING")
        .order_by(desc(models.PODRecord.created_at))
        .limit(3)
    )
    pod_res = await session.execute(pod_stmt)
    for pod in pod_res.scalars().all():
        lr_num = pod.lr.lr_number if pod.lr else "LR"
        notifications.append(
            NotificationItemSchema(
                id=f"pod-{pod.id}",
                title="POD Verification Pending",
                message=f"Proof of Delivery for {lr_num} submitted by {pod.receiver_name}. Awaiting approval.",
                timeAgo=format_time_ago(pod.created_at),
                type="alert",
                unread=True,
                href="/transport/pod-records",
            )
        )

    # 5. E-Way Bills Expiring within 48h (Alert)
    ewb_stmt = (
        select(models.EWayBill)
        .where(
            models.EWayBill.status == "ACTIVE",
            models.EWayBill.valid_until.isnot(None),
            models.EWayBill.valid_until <= now + timedelta(hours=48),
        )
        .order_by(models.EWayBill.valid_until.asc())
        .limit(3)
    )
    ewb_res = await session.execute(ewb_stmt)
    for ewb in ewb_res.scalars().all():
        diff_h = int((ewb.valid_until - now).total_seconds() / 3600)
        time_msg = f"expires in {diff_h} hours" if diff_h > 0 else "has expired"
        notifications.append(
            NotificationItemSchema(
                id=f"ewb-{ewb.id}",
                title="E-Way Bill Expiring Soon" if diff_h > 0 else "E-Way Bill Expired",
                message=f"EWB #{ewb.eway_bill_number} for Vehicle {ewb.vehicle_number or 'Fleet'} {time_msg}.",
                timeAgo=f"{diff_h}h left" if diff_h > 0 else "expired",
                type="alert",
                unread=True,
                href="/transport/eway-bill",
            )
        )

    # 6. Recent Payment & Freight Invoices (Payment)
    v_stmt = select(models.Voucher).where(models.Voucher.is_void == False)
    if office_id is not None:
        if include_unassigned:
            v_stmt = v_stmt.where(or_(models.Voucher.issuing_office_id == office_id, models.Voucher.issuing_office_id == None))
        else:
            v_stmt = v_stmt.where(models.Voucher.issuing_office_id == office_id)
    v_stmt = v_stmt.order_by(desc(models.Voucher.created_at)).limit(3)
    v_res = await session.execute(v_stmt)
    for v in v_res.scalars().all():
        v_title = v.voucher_type.replace("_", " ").title()
        notifications.append(
            NotificationItemSchema(
                id=f"voucher-{v.id}",
                title=f"{v_title} Posted",
                message=f"{v_title} #{v.voucher_number} posted (₹{float(v.total_amount or 0):,.2f}).",
                timeAgo=format_time_ago(v.created_at),
                type="payment",
                unread=False,
                href="/accounts/transport-invoice" if "INVOICE" in v.voucher_type else "/accounts/payment-voucher",
            )
        )

    return notifications

