from datetime import date
from decimal import Decimal
from typing import List
from sqlalchemy import select, func, desc, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.models import (
    LR, Consigner, Consignee, Location, HireChallan,
    ArrivalReport, PODRecord, Job, LRStatus, HireChallanStatus
)
from app.modules.transport_reports.schemas import (
    LRRegisterRow, LRClientWiseRow, HireChallanRegisterRow,
    PendingHCRow, UnbilledLRRow, ArrivalRegisterRow,
    UnusedSeriesRow, InvoiceRegisterRow
)

# 1. LR Booking Register
async def get_lr_booking_register(db: AsyncSession) -> List[LRRegisterRow]:
    stmt = select(LR).order_by(desc(LR.created_at))
    result = await db.execute(stmt)
    lrs = result.scalars().all()
    
    return [
        LRRegisterRow(
            id=lr.id,
            lr_number=lr.lr_number,
            lr_date=lr.lr_date,
            consigner_name=lr.consigner.name if lr.consigner else None,
            consignee_name=lr.consignee.name if lr.consignee else None,
            origin_city=lr.origin_location.city_name if lr.origin_location else None,
            destination_city=lr.destination_location.city_name if lr.destination_location else None,
            vehicle_number=lr.vehicle_number,
            package_count=lr.package_count,
            actual_weight_mt=lr.actual_weight_mt,
            total_freight_amount=lr.total_freight_amount,
            advance_amount=lr.advance_amount,
            balance_amount=lr.balance_amount,
            status=lr.status,
        )
        for lr in lrs
    ]

# 2. LR Client-Wise (Consigner & Consignee aggregation)
async def get_lr_client_wise(db: AsyncSession) -> List[LRClientWiseRow]:
    # Group by Consigner
    stmt = (
        select(
            Consigner.name.label("client_name"),
            func.count(LR.id).label("total_lrs"),
            func.coalesce(func.sum(LR.chargeable_weight_mt), Decimal("0.000")).label("total_weight"),
            func.coalesce(func.sum(LR.total_freight_amount), Decimal("0.00")).label("total_freight"),
            func.count(
                case((LR.status.in_([LRStatus.DELIVERED.value, LRStatus.POD_RECEIVED.value, LRStatus.POD_VERIFIED.value]), 1))
            ).label("delivered_count"),
            func.count(
                case((LR.status == LRStatus.IN_TRANSIT.value, 1))
            ).label("in_transit_count"),
        )
        .join(LR, LR.consigner_id == Consigner.id)
        .group_by(Consigner.id, Consigner.name)
        .order_by(desc("total_lrs"))
    )
    result = await db.execute(stmt)
    rows = []
    for r in result.all():
        rows.append(
            LRClientWiseRow(
                client_name=r.client_name,
                client_type="Consigner",
                total_lrs=r.total_lrs,
                total_weight_mt=r.total_weight,
                total_freight_amount=r.total_freight,
                delivered_count=r.delivered_count,
                in_transit_count=r.in_transit_count,
            )
        )
    return rows

# 3. Hire Challan Register
async def get_hire_challan_register(db: AsyncSession) -> List[HireChallanRegisterRow]:
    stmt = select(HireChallan).order_by(desc(HireChallan.created_at))
    result = await db.execute(stmt)
    challans = result.scalars().all()

    return [
        HireChallanRegisterRow(
            id=hc.id,
            challan_number=hc.challan_number,
            challan_date=hc.challan_date,
            vehicle_number=hc.vehicle_number,
            owner_name=hc.owner.name if hc.owner else None,
            driver_name=hc.driver_name,
            from_location=hc.from_location,
            to_location=hc.to_location,
            hire_rate=hc.hire_rate,
            advance_amount=hc.advance_amount,
            balance_amount=hc.balance_amount,
            status=hc.status,
        )
        for hc in challans
    ]

# 4. Pending HC Report (balance_amount > 0 and not SETTLED)
async def get_pending_hire_challans(db: AsyncSession) -> List[PendingHCRow]:
    stmt = (
        select(HireChallan)
        .where(
            HireChallan.balance_amount > 0,
            HireChallan.status != HireChallanStatus.SETTLED.value,
        )
        .order_by(desc(HireChallan.created_at))
    )
    result = await db.execute(stmt)
    challans = result.scalars().all()

    return [
        PendingHCRow(
            id=hc.id,
            challan_number=hc.challan_number,
            challan_date=hc.challan_date,
            vehicle_number=hc.vehicle_number,
            owner_name=hc.owner.name if hc.owner else None,
            driver_name=hc.driver_name,
            hire_rate=hc.hire_rate,
            advance_amount=hc.advance_amount,
            balance_due=hc.balance_amount,
            status=hc.status,
        )
        for hc in challans
    ]

# 5. Unbilled Reports (Delivered or Verified LRs ready for Phase 3 Transport Invoicing)
async def get_unbilled_lrs(db: AsyncSession) -> List[UnbilledLRRow]:
    stmt = (
        select(LR)
        .where(
            LR.status.in_([
                LRStatus.DELIVERED.value,
                LRStatus.POD_RECEIVED.value,
                LRStatus.POD_VERIFIED.value,
            ])
        )
        .order_by(desc(LR.created_at))
    )
    result = await db.execute(stmt)
    lrs = result.scalars().all()

    return [
        UnbilledLRRow(
            id=lr.id,
            lr_number=lr.lr_number,
            lr_date=lr.lr_date,
            consigner_name=lr.consigner.name if lr.consigner else None,
            consignee_name=lr.consignee.name if lr.consignee else None,
            destination_city=lr.destination_location.city_name if lr.destination_location else None,
            total_freight_amount=lr.total_freight_amount,
            delivery_date=lr.pod_record.delivery_date if lr.pod_record else None,
            pod_verification_status=lr.pod_record.verification_status if lr.pod_record else "NOT_RECEIVED",
            status=lr.status,
        )
        for lr in lrs
    ]

# 6. Arrival Report Register
async def get_arrival_report_register(db: AsyncSession) -> List[ArrivalRegisterRow]:
    stmt = select(ArrivalReport).order_by(desc(ArrivalReport.arrival_date))
    result = await db.execute(stmt)
    reports = result.scalars().all()

    return [
        ArrivalRegisterRow(
            id=ar.id,
            report_number=ar.report_number,
            arrival_date=ar.arrival_date,
            lr_number=ar.lr.lr_number if ar.lr else "N/A",
            destination_hub=ar.destination_hub,
            packages_received=ar.packages_received,
            packages_damaged=ar.packages_damaged,
            packages_short=ar.packages_short,
            receiver_name=ar.receiver_name,
            condition_remarks=ar.condition_remarks,
        )
        for ar in reports
    ]

# 7. Unused GR/LR Series
async def get_unused_series(db: AsyncSession) -> List[UnusedSeriesRow]:
    stmt = select(func.count(LR.id))
    result = await db.execute(stmt)
    lr_count = result.scalar() or 0

    job_stmt = select(func.count(Job.id))
    job_result = await db.execute(job_stmt)
    job_count = job_result.scalar() or 0

    return [
        UnusedSeriesRow(
            series_name="Standard GR/LR Series",
            prefix=f"LR-{date.today().year}",
            allocated_start=1,
            allocated_end=1000,
            last_used_number=lr_count,
            unused_count=max(0, 1000 - lr_count),
        ),
        UnusedSeriesRow(
            series_name="Transport Job Order Series",
            prefix=f"JOB-{date.today().year}",
            allocated_start=1,
            allocated_end=1000,
            last_used_number=job_count,
            unused_count=max(0, 1000 - job_count),
        ),
    ]

# 8. Invoice Register (Deliveries ready for invoicing / billable consignments)
async def get_invoice_register(db: AsyncSession) -> List[InvoiceRegisterRow]:
    # Fetch LRs that are POD_VERIFIED
    stmt = select(LR).where(LR.status == LRStatus.POD_VERIFIED.value).order_by(desc(LR.created_at))
    result = await db.execute(stmt)
    lrs = result.scalars().all()

    rows = []
    for idx, lr in enumerate(lrs, 1):
        taxable = lr.total_freight_amount
        gst = (taxable * Decimal("0.05")).quantize(Decimal("0.01"))  # 5% GST on GTA
        total = taxable + gst
        year = date.today().year
        rows.append(
            InvoiceRegisterRow(
                id=lr.id,
                invoice_number=f"TI-{year}-{idx:04d}",
                lr_number=lr.lr_number,
                billing_date=date.today(),
                client_name=lr.consigner.name if lr.consigner else "Standard Consignor",
                taxable_amount=taxable,
                gst_amount=gst,
                total_invoice_amount=total,
                status="GENERATED",
            )
        )
    return rows
