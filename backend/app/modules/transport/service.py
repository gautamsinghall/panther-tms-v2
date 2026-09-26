from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from app.core.errors import AppException
from app.tenant_db.models import (
    JobStatus,
    LRStatus,
    HireChallanStatus,
    PODCondition,
    PODVerificationStatus,
    TrackingMode,
    VehicleOwner,
    Driver,
    MarketVehicle,
    CompanyVehicle,
    Job,
    LR,
    HireChallan,
    ArrivalReport,
    PODRecord,
    TruckHiringNote,
    EWayBill,
    TrackingPing,
)
from app.modules.transport.schemas import (
    VehicleOwnerCreate, VehicleOwnerUpdate,
    DriverCreate, DriverUpdate,
    MarketVehicleCreate, MarketVehicleUpdate,
    CompanyVehicleCreate, CompanyVehicleUpdate,
    JobCreate, JobUpdate,
    LRCreate, LRUpdate,
    HireChallanCreate, HireChallanUpdate,
    ArrivalReportCreate,
    PODRecordCreate,
    TruckHiringNoteCreate,
    EWayBillCreate,
    TrackingPingCreate,
)
from app.modules.settings.series_service import allocate_or_validate_voucher_number

# ===========================================================================
# State Machine Transition Rules (PRD §7.3 & Architecture §9)
# ===========================================================================

ALLOWED_JOB_TRANSITIONS = {
    JobStatus.OPEN: {JobStatus.BOOKED, JobStatus.CANCELLED},
    JobStatus.BOOKED: {JobStatus.DISPATCHED, JobStatus.CANCELLED},
    JobStatus.DISPATCHED: {JobStatus.DELIVERED, JobStatus.CANCELLED},
    JobStatus.DELIVERED: {JobStatus.CLOSED},
    JobStatus.CLOSED: set(),
    JobStatus.CANCELLED: set(),
}

ALLOWED_LR_TRANSITIONS = {
    LRStatus.DRAFT: {LRStatus.BOOKED, LRStatus.CANCELLED},
    LRStatus.BOOKED: {LRStatus.LOADED, LRStatus.IN_TRANSIT, LRStatus.CANCELLED},
    LRStatus.LOADED: {LRStatus.IN_TRANSIT, LRStatus.CANCELLED},
    LRStatus.IN_TRANSIT: {LRStatus.ARRIVED, LRStatus.DELIVERED, LRStatus.CANCELLED},
    LRStatus.ARRIVED: {LRStatus.DELIVERED, LRStatus.POD_RECEIVED},
    LRStatus.DELIVERED: {LRStatus.POD_RECEIVED},
    LRStatus.POD_RECEIVED: {LRStatus.POD_VERIFIED},
    LRStatus.POD_VERIFIED: set(),
    LRStatus.CANCELLED: set(),
}

ALLOWED_HC_TRANSITIONS = {
    HireChallanStatus.DRAFT: {HireChallanStatus.ISSUED, HireChallanStatus.CANCELLED},
    HireChallanStatus.ISSUED: {HireChallanStatus.TRANSIT, HireChallanStatus.SETTLED, HireChallanStatus.CANCELLED},
    HireChallanStatus.TRANSIT: {HireChallanStatus.SETTLED},
    HireChallanStatus.SETTLED: set(),
    HireChallanStatus.CANCELLED: set(),
}

# ===========================================================================
# Sequence Number Generators
# ===========================================================================

async def _generate_sequence(db: AsyncSession, model, prefix: str, column_name: str = "id") -> str:
    stmt = select(func.count(getattr(model, column_name)))
    result = await db.execute(stmt)
    count = (result.scalar() or 0) + 1
    year = date.today().year
    return f"{prefix}-{year}-{count:04d}"

# ===========================================================================
# Vehicle Owner Services
# ===========================================================================

async def get_all_vehicle_owners(db: AsyncSession) -> List[VehicleOwner]:
    stmt = select(VehicleOwner).order_by(desc(VehicleOwner.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_vehicle_owner(db: AsyncSession, data: VehicleOwnerCreate) -> VehicleOwner:
    owner = VehicleOwner(**data.model_dump())
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner

async def update_vehicle_owner(db: AsyncSession, owner_id: int, data: VehicleOwnerUpdate) -> VehicleOwner:
    owner = await db.get(VehicleOwner, owner_id)
    if not owner:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Vehicle Owner not found.")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(owner, field, val)
    await db.commit()
    await db.refresh(owner)
    return owner

async def delete_vehicle_owner(db: AsyncSession, owner_id: int) -> None:
    owner = await db.get(VehicleOwner, owner_id)
    if not owner:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Vehicle Owner not found.")
    owner.is_active = False
    await db.commit()

# ===========================================================================
# Driver Services
# ===========================================================================

async def get_all_drivers(db: AsyncSession) -> List[Driver]:
    stmt = select(Driver).order_by(desc(Driver.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_driver(db: AsyncSession, data: DriverCreate) -> Driver:
    # Check duplicate license
    existing = await db.execute(select(Driver).where(Driver.license_number == data.license_number))
    if existing.scalar_one_or_none():
        raise AppException(status_code=400, error_code="DUPLICATE_LICENSE", message="License number already exists.")
    driver = Driver(**data.model_dump())
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    return driver

async def update_driver(db: AsyncSession, driver_id: int, data: DriverUpdate) -> Driver:
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Driver not found.")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(driver, field, val)
    await db.commit()
    await db.refresh(driver)
    return driver

async def delete_driver(db: AsyncSession, driver_id: int) -> None:
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Driver not found.")
    driver.is_active = False
    await db.commit()

# ===========================================================================
# Market Vehicle Services
# ===========================================================================

async def get_all_market_vehicles(db: AsyncSession) -> List[MarketVehicle]:
    stmt = select(MarketVehicle).order_by(desc(MarketVehicle.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_market_vehicle(db: AsyncSession, data: MarketVehicleCreate) -> MarketVehicle:
    existing = await db.execute(select(MarketVehicle).where(MarketVehicle.vehicle_number == data.vehicle_number))
    if existing.scalar_one_or_none():
        raise AppException(status_code=400, error_code="DUPLICATE_VEHICLE", message="Market vehicle already registered.")
    
    # If owner_id supplied, auto-fill owner details if missing
    vehicle_data = data.model_dump()
    if data.owner_id:
        owner = await db.get(VehicleOwner, data.owner_id)
        if owner:
            vehicle_data["owner_name"] = vehicle_data.get("owner_name") or owner.name
            vehicle_data["owner_phone"] = vehicle_data.get("owner_phone") or owner.phone
            
    vehicle = MarketVehicle(**vehicle_data)
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def update_market_vehicle(db: AsyncSession, vehicle_id: int, data: MarketVehicleUpdate) -> MarketVehicle:
    vehicle = await db.get(MarketVehicle, vehicle_id)
    if not vehicle:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Market vehicle not found.")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, val)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def delete_market_vehicle(db: AsyncSession, vehicle_id: int) -> None:
    vehicle = await db.get(MarketVehicle, vehicle_id)
    if not vehicle:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Market vehicle not found.")
    vehicle.is_active = False
    await db.commit()

# ===========================================================================
# Company Vehicle Services
# ===========================================================================

async def get_all_company_vehicles(db: AsyncSession) -> List[CompanyVehicle]:
    stmt = select(CompanyVehicle).order_by(desc(CompanyVehicle.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_company_vehicle(db: AsyncSession, data: CompanyVehicleCreate) -> CompanyVehicle:
    existing = await db.execute(select(CompanyVehicle).where(CompanyVehicle.vehicle_number == data.vehicle_number))
    if existing.scalar_one_or_none():
        raise AppException(status_code=400, error_code="DUPLICATE_VEHICLE", message="Company vehicle already registered.")
    vehicle = CompanyVehicle(**data.model_dump())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def update_company_vehicle(db: AsyncSession, vehicle_id: int, data: CompanyVehicleUpdate) -> CompanyVehicle:
    vehicle = await db.get(CompanyVehicle, vehicle_id)
    if not vehicle:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Company vehicle not found.")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, val)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def delete_company_vehicle(db: AsyncSession, vehicle_id: int) -> None:
    vehicle = await db.get(CompanyVehicle, vehicle_id)
    if not vehicle:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Company vehicle not found.")
    vehicle.is_active = False
    await db.commit()

# ===========================================================================
# Job Services & State Machine
# ===========================================================================

async def get_all_jobs(db: AsyncSession) -> List[Job]:
    stmt = select(Job).order_by(desc(Job.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_job(db: AsyncSession, data: JobCreate, user_id: Optional[int] = None) -> Job:
    job_number = await allocate_or_validate_voucher_number(db, "JOB", manual_number=data.job_number)
    job_dict = data.model_dump()
    job_dict["job_number"] = job_number
    job_dict["status"] = JobStatus.OPEN.value
    job_dict["created_by_user_id"] = user_id
    
    job = Job(**job_dict)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

async def update_job(db: AsyncSession, job_id: int, data: JobUpdate) -> Job:
    job = await db.get(Job, job_id)
    if not job:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Job not found.")
    if job.status in (JobStatus.CLOSED.value, JobStatus.CANCELLED.value):
        raise AppException(status_code=400, error_code="JOB_LOCKED", message=f"Job is {job.status} and cannot be modified.")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(job, field, val)
    await db.commit()
    await db.refresh(job)
    return job

async def transition_job_status(db: AsyncSession, job_id: int, target_status: JobStatus, remarks: Optional[str] = None) -> Job:
    job = await db.get(Job, job_id)
    if not job:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Job not found.")
    
    current = JobStatus(job.status)
    if target_status not in ALLOWED_JOB_TRANSITIONS.get(current, set()):
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_STATE_TRANSITION",
            message=f"Cannot transition Job from {current.value} to {target_status.value}."
        )
    
    job.status = target_status.value
    if remarks:
        job.special_instructions = f"{job.special_instructions or ''}\n[{target_status.value}]: {remarks}".strip()
    await db.commit()
    await db.refresh(job)
    return job

# ===========================================================================
# LR / GR Services & State Machine
# ===========================================================================

async def get_all_lrs(db: AsyncSession) -> List[LR]:
    stmt = select(LR).order_by(desc(LR.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_lr(db: AsyncSession, data: LRCreate, user_id: Optional[int] = None) -> LR:
    lr_number = await allocate_or_validate_voucher_number(db, "LR", manual_number=data.lr_number)
    lr_dict = data.model_dump()
    lr_dict["lr_number"] = lr_number
    lr_dict["status"] = LRStatus.DRAFT.value
    lr_dict["created_by_user_id"] = user_id
    
    # Calculate total freight if not explicitly provided
    if not lr_dict.get("total_freight_amount"):
        freight = lr_dict.get("freight_amount") or Decimal("0.00")
        loading = lr_dict.get("loading_charges") or Decimal("0.00")
        unloading = lr_dict.get("unloading_charges") or Decimal("0.00")
        other = lr_dict.get("other_charges") or Decimal("0.00")
        lr_dict["total_freight_amount"] = freight + loading + unloading + other
    
    # Calculate balance amount
    total = lr_dict["total_freight_amount"]
    advance = lr_dict.get("advance_amount") or Decimal("0.00")
    lr_dict["balance_amount"] = total - advance

    lr = LR(**lr_dict)
    db.add(lr)
    
    # Cascade: If linked to a Job in OPEN status, transition Job to BOOKED
    if data.job_id:
        job = await db.get(Job, data.job_id)
        if job and job.status == JobStatus.OPEN.value:
            job.status = JobStatus.BOOKED.value

    # Auto-advance LR from DRAFT to BOOKED upon creation
    lr.status = LRStatus.BOOKED.value

    await db.commit()
    await db.refresh(lr)
    return lr

async def update_lr(db: AsyncSession, lr_id: int, data: LRUpdate) -> LR:
    lr = await db.get(LR, lr_id)
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="LR not found.")
    if lr.status in (LRStatus.POD_VERIFIED.value, LRStatus.CANCELLED.value):
        raise AppException(status_code=400, error_code="LR_LOCKED", message=f"LR is {lr.status} and cannot be modified.")
    
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(lr, field, val)

    # Recalculate totals
    total = lr.freight_amount + lr.loading_charges + lr.unloading_charges + lr.other_charges
    lr.total_freight_amount = total
    lr.balance_amount = total - lr.advance_amount

    await db.commit()
    await db.refresh(lr)
    return lr

async def transition_lr_status(db: AsyncSession, lr_id: int, target_status: LRStatus, remarks: Optional[str] = None) -> LR:
    lr = await db.get(LR, lr_id)
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="LR not found.")
    
    current = LRStatus(lr.status)
    if target_status not in ALLOWED_LR_TRANSITIONS.get(current, set()):
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_STATE_TRANSITION",
            message=f"Cannot transition LR from {current.value} to {target_status.value}."
        )

    lr.status = target_status.value
    if remarks:
        lr.remarks = f"{lr.remarks or ''}\n[{target_status.value}]: {remarks}".strip()

    # Cascading side effects
    if target_status == LRStatus.IN_TRANSIT:
        # If linked to a Job, advance Job to DISPATCHED
        if lr.job_id:
            job = await db.get(Job, lr.job_id)
            if job and job.status == JobStatus.BOOKED.value:
                job.status = JobStatus.DISPATCHED.value
        # If linked Hire Challan is ISSUED, advance Hire Challan to TRANSIT
        if lr.hire_challan and lr.hire_challan.status == HireChallanStatus.ISSUED.value:
            lr.hire_challan.status = HireChallanStatus.TRANSIT.value

    elif target_status in (LRStatus.ARRIVED, LRStatus.DELIVERED):
        if lr.job_id:
            job = await db.get(Job, lr.job_id)
            if job and job.status == JobStatus.DISPATCHED.value:
                job.status = JobStatus.DELIVERED.value

    elif target_status == LRStatus.POD_VERIFIED:
        if lr.job_id:
            job = await db.get(Job, lr.job_id)
            if job and job.status == JobStatus.DELIVERED.value:
                job.status = JobStatus.CLOSED.value

    await db.commit()
    await db.refresh(lr)
    return lr

# ===========================================================================
# Hire Challan Services
# ===========================================================================

async def get_all_hire_challans(db: AsyncSession) -> List[HireChallan]:
    stmt = select(HireChallan).order_by(desc(HireChallan.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_hire_challan(db: AsyncSession, data: HireChallanCreate) -> HireChallan:
    challan_number = await allocate_or_validate_voucher_number(db, "HIRE_CHALLAN", manual_number=data.challan_number)
    hc_dict = data.model_dump()
    hc_dict["challan_number"] = challan_number
    hc_dict["status"] = HireChallanStatus.ISSUED.value  # Confirmed on creation

    # Financial calculations
    hire_rate = hc_dict.get("hire_rate") or Decimal("0.00")
    advance = hc_dict.get("advance_amount") or Decimal("0.00")
    tds_rate = hc_dict.get("tds_rate") or Decimal("0.00")
    tds = (hire_rate * tds_rate) / Decimal("100.00")
    detention = hc_dict.get("detention_charge") or Decimal("0.00")
    mamul = hc_dict.get("mamul_charges") or Decimal("0.00")
    
    net_payable = (hire_rate + detention) - (tds + mamul)
    balance = net_payable - advance

    hc_dict["tds_amount"] = tds
    hc_dict["net_payable_amount"] = net_payable
    hc_dict["balance_amount"] = balance

    hc = HireChallan(**hc_dict)
    db.add(hc)
    await db.commit()
    await db.refresh(hc)
    return hc

async def update_hire_challan(db: AsyncSession, hc_id: int, data: HireChallanUpdate) -> HireChallan:
    hc = await db.get(HireChallan, hc_id)
    if not hc:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Hire Challan not found.")
    if hc.status in (HireChallanStatus.SETTLED.value, HireChallanStatus.CANCELLED.value):
        raise AppException(status_code=400, error_code="HC_LOCKED", message=f"Challan is {hc.status} and cannot be modified.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(hc, field, val)

    # Recalculate
    tds = (hc.hire_rate * hc.tds_rate) / Decimal("100.00")
    net_payable = (hc.hire_rate + hc.detention_charge) - (tds + hc.mamul_charges)
    hc.tds_amount = tds
    hc.net_payable_amount = net_payable
    hc.balance_amount = net_payable - hc.advance_amount

    await db.commit()
    await db.refresh(hc)
    return hc

async def settle_hire_challan(db: AsyncSession, hc_id: int, settlement_notes: Optional[str] = None) -> HireChallan:
    hc = await db.get(HireChallan, hc_id)
    if not hc:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Hire Challan not found.")
    if hc.status == HireChallanStatus.SETTLED.value:
        raise AppException(status_code=400, error_code="ALREADY_SETTLED", message="Hire Challan is already settled.")

    hc.status = HireChallanStatus.SETTLED.value
    hc.balance_amount = Decimal("0.00")
    if settlement_notes:
        hc.remarks = f"{hc.remarks or ''}\n[SETTLED]: {settlement_notes}".strip()
    await db.commit()
    await db.refresh(hc)
    return hc

# ===========================================================================
# Arrival Report Services
# ===========================================================================

async def get_all_arrival_reports(db: AsyncSession) -> List[ArrivalReport]:
    stmt = select(ArrivalReport).order_by(desc(ArrivalReport.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_arrival_report(db: AsyncSession, data: ArrivalReportCreate) -> ArrivalReport:
    report_number = data.report_number or await _generate_sequence(db, ArrivalReport, "AR")
    ar_dict = data.model_dump()
    ar_dict["report_number"] = report_number
    ar_dict["status"] = "ARRIVED"

    lr = await db.get(LR, data.lr_id)
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Referenced LR not found.")

    ar = ArrivalReport(**ar_dict)
    db.add(ar)

    # Automatic State Transition: LR -> ARRIVED (or DELIVERED if all packages intact)
    if lr.status in (LRStatus.IN_TRANSIT.value, LRStatus.LOADED.value, LRStatus.BOOKED.value):
        lr.status = LRStatus.ARRIVED.value

    if lr.job_id:
        job = await db.get(Job, lr.job_id)
        if job and job.status == JobStatus.DISPATCHED.value:
            job.status = JobStatus.DELIVERED.value

    await db.commit()
    await db.refresh(ar)
    return ar

# ===========================================================================
# POD Record Services
# ===========================================================================

async def get_all_pod_records(db: AsyncSession) -> List[PODRecord]:
    stmt = select(PODRecord).order_by(desc(PODRecord.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_pod_record(db: AsyncSession, data: PODRecordCreate) -> PODRecord:
    lr = await db.get(LR, data.lr_id)
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Referenced LR not found.")

    pod_number = data.pod_number or await _generate_sequence(db, PODRecord, "POD")
    pod_dict = data.model_dump()
    pod_dict["pod_number"] = pod_number
    pod_dict["verification_status"] = PODVerificationStatus.PENDING.value

    pod = PODRecord(**pod_dict)
    db.add(pod)

    # Update LR status to POD_RECEIVED
    lr.status = LRStatus.POD_RECEIVED.value

    await db.commit()
    await db.refresh(pod)
    return pod

async def verify_pod_record(db: AsyncSession, pod_id: int, verification_status: PODVerificationStatus, user_id: Optional[int] = None, notes: Optional[str] = None) -> PODRecord:
    pod = await db.get(PODRecord, pod_id)
    if not pod:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="POD Record not found.")

    pod.verification_status = verification_status.value
    pod.verified_by_user_id = user_id
    pod.verified_at = datetime.now(timezone.utc)
    if notes:
        pod.remarks = f"{pod.remarks or ''}\n[{verification_status.value}]: {notes}".strip()

    # If verified, transition LR to POD_VERIFIED and linked Job to CLOSED
    if verification_status == PODVerificationStatus.VERIFIED:
        lr = await db.get(LR, pod.lr_id)
        if lr:
            lr.status = LRStatus.POD_VERIFIED.value
            if lr.job_id:
                job = await db.get(Job, lr.job_id)
                if job and job.status in (JobStatus.DELIVERED.value, JobStatus.DISPATCHED.value):
                    job.status = JobStatus.CLOSED.value

    await db.commit()
    await db.refresh(pod)
    return pod

# ===========================================================================
# Truck Hiring Note Services
# ===========================================================================

async def get_all_truck_hiring_notes(db: AsyncSession) -> List[TruckHiringNote]:
    stmt = select(TruckHiringNote).order_by(desc(TruckHiringNote.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_truck_hiring_note(db: AsyncSession, data: TruckHiringNoteCreate) -> TruckHiringNote:
    note_number = data.note_number or await _generate_sequence(db, TruckHiringNote, "THN")
    note_dict = data.model_dump()
    note_dict["note_number"] = note_number
    
    agreed = note_dict.get("agreed_rate") or Decimal("0.00")
    cash = note_dict.get("advance_cash") or Decimal("0.00")
    diesel = note_dict.get("advance_diesel_slip") or Decimal("0.00")
    note_dict["balance_payable"] = agreed - (cash + diesel)

    thn = TruckHiringNote(**note_dict)
    db.add(thn)
    await db.commit()
    await db.refresh(thn)
    return thn

# ===========================================================================
# E-Way Bill Services (Manual Entry per Rules §2)
# ===========================================================================

async def get_all_eway_bills(db: AsyncSession) -> List[EWayBill]:
    stmt = select(EWayBill).order_by(desc(EWayBill.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_eway_bill(db: AsyncSession, data: EWayBillCreate) -> EWayBill:
    # Check duplicate e-way bill number
    existing = await db.execute(select(EWayBill).where(EWayBill.eway_bill_number == data.eway_bill_number))
    if existing.scalar_one_or_none():
        raise AppException(status_code=400, error_code="DUPLICATE_EWAY", message="E-Way bill number already registered.")
    
    eway = EWayBill(**data.model_dump())
    db.add(eway)
    
    # If linked to LR, populate LR eway_bill_number
    if data.lr_id:
        lr = await db.get(LR, data.lr_id)
        if lr:
            lr.eway_bill_number = data.eway_bill_number

    await db.commit()
    await db.refresh(eway)
    return eway

# ===========================================================================
# Tracking Ping Services (FASTag / GPS / SIM Telemetry Shell)
# ===========================================================================

async def get_latest_tracking_pings(db: AsyncSession) -> List[TrackingPing]:
    stmt = select(TrackingPing).order_by(desc(TrackingPing.last_ping_at)).limit(100)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def record_tracking_ping(db: AsyncSession, data: TrackingPingCreate) -> TrackingPing:
    ping_dict = data.model_dump()
    if not ping_dict.get("last_ping_at"):
        ping_dict["last_ping_at"] = datetime.now(timezone.utc)
    
    ping = TrackingPing(**ping_dict)
    db.add(ping)
    await db.commit()
    await db.refresh(ping)
    return ping
