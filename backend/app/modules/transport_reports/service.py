from datetime import date

from decimal import Decimal

from typing import List, Optional

from sqlalchemy import select, func, desc, case, or_
from sqlalchemy.orm import selectinload

from sqlalchemy.ext.asyncio import AsyncSession

from app.tenant_db.models import (
    Voucher, VoucherType,

    LR, Consigner, Consignee, Location, HireChallan,

    ArrivalReport, PODRecord, Job, LRStatus, HireChallanStatus

)

from app.modules.transport_reports.schemas import (

    LRRegisterRow, LRClientWiseRow, LRClientWiseRecord, HireChallanRegisterRow,

    PendingHCRow, UnbilledLRRow, ArrivalRegisterRow,

    UnusedSeriesRow, InvoiceRegisterRow

)



# 1. LR Booking Register

async def get_lr_booking_register(

    db: AsyncSession,

    office_id: Optional[int] = None,

    include_unassigned: bool = False,

    from_date: Optional[date] = None,

    to_date: Optional[date] = None,

    customer_id: Optional[int] = None,

) -> List[LRRegisterRow]:

    stmt = select(LR).order_by(desc(LR.lr_date), desc(LR.id))

    if office_id:

        if include_unassigned:

            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))

        else:

            stmt = stmt.where(LR.issuing_office_id == office_id)



    if from_date:

        stmt = stmt.where(LR.lr_date >= from_date)

    if to_date:

        stmt = stmt.where(LR.lr_date <= to_date)

    if customer_id:

        stmt = stmt.where(or_(LR.billing_customer_id == customer_id, LR.consigner_id == customer_id))



    result = await db.execute(stmt)

    lrs = result.scalars().all()



    rows: List[LRRegisterRow] = []

    for lr in lrs:

        # Issuing Office

        office_name = lr.issuing_office.name if getattr(lr, "issuing_office", None) else "HEAD OFFICE-DELHI"



        # Client Name (Billing Client or Consigner)

        client_name = "N/A"

        if getattr(lr, "billing_customer", None) and lr.billing_customer.name:

            client_name = lr.billing_customer.name

        elif getattr(lr, "consigner", None) and lr.consigner.name:

            client_name = lr.consigner.name



        # Site From: "City(State)"

        site_from = None

        if getattr(lr, "origin_location", None):

            city = lr.origin_location.city_name or ""

            st = lr.origin_location.state or ""

            site_from = f"{city}({st})" if st else city

        elif lr.origin_city if hasattr(lr, "origin_city") else None:

            site_from = lr.origin_city



        # Site To: "City(State)"

        site_to = None

        if getattr(lr, "destination_location", None):

            city = lr.destination_location.city_name or ""

            st = lr.destination_location.state or ""

            site_to = f"{city}({st})" if st else city

        elif lr.destination_city if hasattr(lr, "destination_city") else None:

            site_to = lr.destination_city



        # GR Status

        gr_status = lr.booking_status or (lr.status.replace("_", " ").title() if lr.status else "Booked")



        rows.append(

            LRRegisterRow(

                id=lr.id,

                lr_number=lr.lr_number,

                lr_date=lr.lr_date,

                consigner_name=lr.consigner.name if getattr(lr, "consigner", None) else None,

                consignee_name=lr.consignee.name if getattr(lr, "consignee", None) else None,

                origin_city=lr.origin_location.city_name if getattr(lr, "origin_location", None) else None,

                destination_city=lr.destination_location.city_name if getattr(lr, "destination_location", None) else None,

                vehicle_number=lr.vehicle_number or "",

                package_count=lr.package_count or 0,

                actual_weight_mt=lr.actual_weight_mt or Decimal("0.000"),

                chargeable_weight_mt=lr.chargeable_weight_mt or Decimal("0.000"),

                freight_rate=lr.freight_rate or Decimal("0.00"),

                freight_amount=lr.freight_amount or Decimal("0.00"),

                total_freight_amount=lr.total_freight_amount or Decimal("0.00"),

                advance_amount=lr.advance_amount or Decimal("0.00"),

                balance_amount=lr.balance_amount or Decimal("0.00"),

                status=lr.status or "BOOKED",

                issuing_office_name=office_name,

                booking_status=gr_status,

                client_name=client_name,

                party_invoice_no=lr.invoice_no or "",

                site_from=site_from,

                site_to=site_to,

                eway_bill_number=lr.eway_bill_number or "",

                payment_type=lr.payment_type or "",

                vehicle_type=lr.vehicle_type or "",

                driver_name=lr.driver_name or "",

                driver_phone=lr.driver_phone or "",

            )

        )



    return rows



# 2. LR Client-Wise (Consigner & Consignee aggregation with complete LR records)
async def get_lr_client_wise(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    customer_id: Optional[int] = None,
) -> List[LRClientWiseRow]:
    stmt = (
        select(LR)
        .options(
            selectinload(LR.consigner),
            selectinload(LR.consignee),
            selectinload(LR.billing_customer),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
            selectinload(LR.issuing_office),
        )
        .order_by(desc(LR.lr_date), desc(LR.id))
    )

    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(LR.issuing_office_id == office_id)

    if from_date:
        stmt = stmt.where(LR.lr_date >= from_date)

    if to_date:
        stmt = stmt.where(LR.lr_date <= to_date)

    if customer_id:
        stmt = stmt.where(or_(LR.billing_customer_id == customer_id, LR.consigner_id == customer_id))

    result = await db.execute(stmt)
    lrs = result.scalars().all()

    # Pre-fetch active transport invoices (bills) linked to these LRs
    lr_ids = [lr.id for lr in lrs]
    voucher_map = {}
    if lr_ids:
        v_stmt = select(Voucher).where(
            Voucher.voucher_type == VoucherType.TRANSPORT_INVOICE.value,
            Voucher.is_void == False,
            Voucher.lr_id.in_(lr_ids),
        )
        v_res = await db.execute(v_stmt)
        for v in v_res.scalars().all():
            voucher_map[v.lr_id] = v

    groups: dict[str, dict] = {}

    for lr in lrs:
        billing_cust_name = lr.billing_customer.name if getattr(lr, "billing_customer", None) and lr.billing_customer else None
        consigner_name = lr.consigner.name if getattr(lr, "consigner", None) and lr.consigner else None
        consignee_name = lr.consignee.name if getattr(lr, "consignee", None) and lr.consignee else None

        client_name = billing_cust_name or consigner_name or "Unassigned Client"
        client_type = "Billing Client" if billing_cust_name else ("Consigner" if consigner_name else "Unassigned")
        client_id = lr.billing_customer_id if billing_cust_name else (lr.consigner_id if consigner_name else None)

        site_from = ""
        if getattr(lr, "origin_location", None) and lr.origin_location:
            c = lr.origin_location.city_name or ""
            s = lr.origin_location.state or ""
            site_from = f"{c}({s})" if s else c
        elif getattr(lr, "origin_city", None):
            site_from = str(lr.origin_city)

        site_to = ""
        if getattr(lr, "destination_location", None) and lr.destination_location:
            c = lr.destination_location.city_name or ""
            s = lr.destination_location.state or ""
            site_to = f"{c}({s})" if s else c
        elif getattr(lr, "destination_city", None):
            site_to = str(lr.destination_city)

        month_name = lr.lr_date.strftime("%B") if lr.lr_date else ""

        weight_val = lr.chargeable_weight_mt if (lr.chargeable_weight_mt and lr.chargeable_weight_mt > 0) else lr.actual_weight_mt

        # Invoice info with fallback to invoice_items JSON
        inv_no = lr.invoice_no or ""
        inv_date = lr.invoice_date
        inv_val = lr.invoice_value if (lr.invoice_value and lr.invoice_value > 0) else None

        if not inv_no and getattr(lr, "invoice_items", None) and isinstance(lr.invoice_items, list) and len(lr.invoice_items) > 0:
            first_inv = lr.invoice_items[0]
            if isinstance(first_inv, dict):
                inv_no = first_inv.get("invoice_no") or ""
                if not inv_date and first_inv.get("invoice_date"):
                    try:
                        inv_date = date.fromisoformat(str(first_inv.get("invoice_date")).split("T")[0])
                    except Exception:
                        pass
                if not inv_val and first_inv.get("invoice_value"):
                    try:
                        inv_val = Decimal(str(first_inv.get("invoice_value")))
                    except Exception:
                        pass

        # Linked bill / transport invoice voucher
        v = voucher_map.get(lr.id)
        if v:
            billing_status = "Billed"
            bill_amount = v.net_amount or v.total_amount
            bill_no = v.voucher_number or ""
            bill_date = v.voucher_date
        elif lr.is_billed:
            billing_status = "Billed"
            bill_amount = lr.total_freight_amount
            bill_no = ""
            bill_date = None
        else:
            billing_status = "Unbilled"
            bill_amount = None
            bill_no = ""
            bill_date = None

        booking_status = lr.booking_status or (lr.status.replace("_", " ").title() if lr.status else "Booked")

        rec = LRClientWiseRecord(
            id=lr.id,
            lr_number=lr.lr_number,
            month=month_name,
            lr_date=lr.lr_date,
            vehicle_number=lr.vehicle_number or "",
            vehicle_type=lr.vehicle_type or "",
            eta=lr.eta or "",
            site_from=site_from,
            site_to=site_to,
            party_invoice_no=inv_no,
            party_invoice_date=inv_date,
            invoice_value=inv_val,
            weight=weight_val if (weight_val and weight_val > 0) else None,
            pkts=lr.package_count if (lr.package_count and lr.package_count > 0) else None,
            consigner_name=consigner_name or "",
            consignee_name=consignee_name or "",
            billing_customer=billing_cust_name or consigner_name or "",
            billing_status=billing_status,
            bill_amount=bill_amount,
            bill_no=bill_no,
            bill_date=bill_date,
            booking_status=booking_status,
            payment_type=lr.payment_type or "",
        )

        if client_name not in groups:
            groups[client_name] = {
                "client_id": client_id,
                "client_name": client_name,
                "client_type": client_type,
                "total_lrs": 0,
                "total_weight_mt": Decimal("0.000"),
                "total_freight_amount": Decimal("0.00"),
                "delivered_count": 0,
                "in_transit_count": 0,
                "records": [],
            }

        g = groups[client_name]
        g["total_lrs"] += 1
        if lr.chargeable_weight_mt:
            g["total_weight_mt"] += lr.chargeable_weight_mt
        elif lr.actual_weight_mt:
            g["total_weight_mt"] += lr.actual_weight_mt

        if lr.total_freight_amount:
            g["total_freight_amount"] += lr.total_freight_amount

        if lr.status in [LRStatus.DELIVERED.value, LRStatus.POD_RECEIVED.value, LRStatus.POD_VERIFIED.value]:
            g["delivered_count"] += 1
        elif lr.status == LRStatus.IN_TRANSIT.value:
            g["in_transit_count"] += 1

        g["records"].append(rec)

    rows: List[LRClientWiseRow] = []
    for g in sorted(groups.values(), key=lambda x: (-x["total_lrs"], x["client_name"])):
        rows.append(LRClientWiseRow(**g))

    return rows



# 3. Hire Challan Register

async def get_hire_challan_register(

    db: AsyncSession,

    office_id: Optional[int] = None,

    include_unassigned: bool = False,

    from_date: Optional[date] = None,

    to_date: Optional[date] = None,

    owner_id: Optional[int] = None,

) -> List[HireChallanRegisterRow]:

    stmt = select(HireChallan).order_by(desc(HireChallan.challan_date), desc(HireChallan.id))

    if office_id:

        if include_unassigned:

            stmt = stmt.where(or_(HireChallan.issuing_office_id == office_id, HireChallan.issuing_office_id.is_(None)))

        else:

            stmt = stmt.where(HireChallan.issuing_office_id == office_id)



    if from_date:

        stmt = stmt.where(HireChallan.challan_date >= from_date)

    if to_date:

        stmt = stmt.where(HireChallan.challan_date <= to_date)

    if owner_id:

        stmt = stmt.where(HireChallan.owner_id == owner_id)



    result = await db.execute(stmt)

    challans = result.scalars().all()



    rows: List[HireChallanRegisterRow] = []

    for hc in challans:

        office_name = hc.issuing_office.name if getattr(hc, 'issuing_office', None) else None

        office_code = hc.issuing_office.code if getattr(hc, 'issuing_office', None) else None

        lr_no = hc.lr.lr_number if getattr(hc, 'lr', None) else None

        owner_name = hc.owner.name if getattr(hc, 'owner', None) else (hc.driver_name if not hc.owner_id else None)



        rows.append(

            HireChallanRegisterRow(

                id=hc.id,

                challan_number=hc.challan_number,

                challan_date=hc.challan_date,

                vehicle_number=hc.vehicle_number,

                owner_id=hc.owner_id,

                owner_name=owner_name,

                driver_id=hc.driver_id,

                driver_name=hc.driver_name,

                driver_phone=hc.driver_phone,

                from_location=hc.from_location,

                to_location=hc.to_location,

                hire_rate=hc.hire_rate or Decimal('0.00'),

                advance_amount=hc.advance_amount or Decimal('0.00'),

                balance_amount=hc.balance_amount or Decimal('0.00'),

                net_payable_amount=hc.net_payable_amount or Decimal('0.00'),

                tds_rate=hc.tds_rate or Decimal('0.00'),

                tds_amount=hc.tds_amount or Decimal('0.00'),

                tds_category=hc.tds_category,

                detention_charge=hc.detention_charge or Decimal('0.00'),

                mamul_charges=hc.mamul_charges or Decimal('0.00'),

                status=hc.status or 'DRAFT',

                issuing_office_id=hc.issuing_office_id,

                issuing_office_name=office_name,

                issuing_office_code=office_code,

                vendor_ref_no=hc.vendor_ref_no,

                remarks=hc.remarks,

                lr_id=hc.lr_id,

                lr_number=lr_no,

            )

        )

    return rows



# 4. Pending HC Report (balance_amount > 0 and not SETTLED)

async def get_pending_hire_challans(

    db: AsyncSession,

    office_id: Optional[int] = None,

    include_unassigned: bool = False,

) -> List[PendingHCRow]:

    stmt = (

        select(HireChallan)

        .where(

            HireChallan.balance_amount > 0,

            HireChallan.status != HireChallanStatus.SETTLED.value,

        )

    )

    if office_id:

        if include_unassigned:

            stmt = stmt.where(or_(HireChallan.issuing_office_id == office_id, HireChallan.issuing_office_id.is_(None)))

        else:

            stmt = stmt.where(HireChallan.issuing_office_id == office_id)

    stmt = stmt.order_by(desc(HireChallan.created_at))

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

async def get_unbilled_lrs(

    db: AsyncSession,

    office_id: Optional[int] = None,

    include_unassigned: bool = False,

) -> List[UnbilledLRRow]:

    stmt = (

        select(LR)

        .where(

            LR.status.in_([

                LRStatus.DELIVERED.value,

                LRStatus.POD_RECEIVED.value,

                LRStatus.POD_VERIFIED.value,

            ]),

            or_(LR.is_billed == False, LR.is_billed.is_(None))

        )

    )

    if office_id:

        if include_unassigned:

            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))

        else:

            stmt = stmt.where(LR.issuing_office_id == office_id)

    stmt = stmt.order_by(desc(LR.created_at))

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

async def get_arrival_report_register(

    db: AsyncSession,

    office_id: Optional[int] = None,

    include_unassigned: bool = False,

) -> List[ArrivalRegisterRow]:

    stmt = select(ArrivalReport).outerjoin(ArrivalReport.lr).order_by(desc(ArrivalReport.arrival_date))

    if office_id:

        if include_unassigned:

            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))

        else:

            stmt = stmt.where(LR.issuing_office_id == office_id)

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

async def get_unused_series(

    db: AsyncSession,

    office_id: Optional[int] = None,

) -> List[UnusedSeriesRow]:

    lr_stmt = select(func.count(LR.id))

    job_stmt = select(func.count(Job.id))

    if office_id:

        lr_stmt = lr_stmt.where(LR.issuing_office_id == office_id)

        job_stmt = job_stmt.where(Job.issuing_office_id == office_id)

    result = await db.execute(lr_stmt)

    lr_count = result.scalar() or 0



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

async def get_invoice_register(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
) -> List[InvoiceRegisterRow]:
    stmt = (
        select(Voucher)
        .options(
            selectinload(Voucher.lr).selectinload(LR.consigner),
            selectinload(Voucher.billing_client),
        )
        .where(
            Voucher.voucher_type == VoucherType.TRANSPORT_INVOICE.value,
            Voucher.is_void == False,
        )
    )
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(Voucher.issuing_office_id == office_id, Voucher.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(Voucher.issuing_office_id == office_id)
    stmt = stmt.order_by(desc(Voucher.voucher_date), desc(Voucher.id))
    result = await db.execute(stmt)
    vouchers = result.scalars().all()

    rows = []
    for v in vouchers:
        lr_no = v.lr.lr_number if v.lr else (v.reference_number or "-")
        client_name = v.party_name or (v.billing_client.name if v.billing_client else "Commercial Client")
        rows.append(
            InvoiceRegisterRow(
                id=v.id,
                invoice_number=v.voucher_number,
                lr_number=lr_no,
                billing_date=v.voucher_date,
                client_name=client_name,
                taxable_amount=v.total_amount,
                gst_amount=v.tax_amount,
                total_invoice_amount=v.net_amount,
                status=v.payment_status or "UNPAID",
            )
        )
    return rows
