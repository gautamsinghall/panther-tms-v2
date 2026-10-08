import json
import time
import httpx
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from app.core.config import settings
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
    SIMTripRecord,
    SIMConsentStatus,
    CompanySetting,
    FastagCooldown,
    FastagTripRecord,
    TollLog,
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
    SIMTripCreate,
    SIMTripClose,
    SIMConsentSimulate,
    FastagTripCreate,
    FastagTripUpdate,
    FastagTripResponse,
    FastagTrackResponse,
    TollLogResponse,
    FastagTrackingMetrics,
)
from app.integrations.freight_tiger import freight_tiger_client, FreightTigerClient
from app.integrations.fastag_provider import (
    FASTagProviderClient,
    clean_vehicle_number,
    haversine_distance_km,
    resolve_location_coordinates,
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
    # Check duplicate license only if provided
    if data.license_number and data.license_number.strip():
        existing = await db.execute(select(Driver).where(Driver.license_number == data.license_number.strip()))
        if existing.scalar_one_or_none():
            raise AppException(status_code=400, error_code="DUPLICATE_LICENSE", message="License number already exists.")
    
    driver_dict = data.model_dump()
    if driver_dict.get("valid_upto") and not driver_dict.get("license_expiry"):
        driver_dict["license_expiry"] = driver_dict["valid_upto"]
    elif driver_dict.get("license_expiry") and not driver_dict.get("valid_upto"):
        driver_dict["valid_upto"] = driver_dict["license_expiry"]

    driver = Driver(**driver_dict)
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    return driver

async def update_driver(db: AsyncSession, driver_id: int, data: DriverUpdate) -> Driver:
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Driver not found.")
    
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("valid_upto") and not update_data.get("license_expiry"):
        update_data["license_expiry"] = update_data["valid_upto"]
    
    if update_data.get("license_number") and update_data["license_number"].strip():
        lic = update_data["license_number"].strip()
        existing = await db.execute(select(Driver).where(Driver.license_number == lic, Driver.id != driver_id))
        if existing.scalar_one_or_none():
            raise AppException(status_code=400, error_code="DUPLICATE_LICENSE", message="License number already exists.")

    for field, val in update_data.items():
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

async def get_market_vehicle(db: AsyncSession, vehicle_id: int) -> MarketVehicle:
    vehicle = await db.get(MarketVehicle, vehicle_id)
    if not vehicle:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Market vehicle not found.")
    return vehicle

async def update_market_vehicle(db: AsyncSession, vehicle_id: int, data: MarketVehicleUpdate) -> MarketVehicle:
    vehicle = await db.get(MarketVehicle, vehicle_id)
    if not vehicle:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Market vehicle not found.")
    update_data = data.model_dump(exclude_unset=True)
    if "owner_id" in update_data and update_data["owner_id"]:
        owner = await db.get(VehicleOwner, update_data["owner_id"])
        if owner:
            if "owner_name" not in update_data or not update_data["owner_name"]:
                update_data["owner_name"] = owner.name
            if "owner_phone" not in update_data or not update_data["owner_phone"]:
                update_data["owner_phone"] = owner.phone
    for field, val in update_data.items():
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

async def get_all_jobs(db: AsyncSession, office_id: Optional[int] = None, include_unassigned: bool = False) -> List[Job]:
    stmt = select(Job).order_by(desc(Job.created_at))
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(Job.issuing_office_id == office_id, Job.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(Job.issuing_office_id == office_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_job(db: AsyncSession, data: JobCreate, user_id: Optional[int] = None, office_id: Optional[int] = None) -> Job:
    target_office_id = data.issuing_office_id or office_id
    if not target_office_id:
        from app.tenant_db.models import Branch
        br_res = await db.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()
    job_number = await allocate_or_validate_voucher_number(db, "JOB", manual_number=data.job_number, issuing_office_id=target_office_id)
    job_dict = data.model_dump()
    job_dict["job_number"] = job_number
    job_dict["status"] = JobStatus.OPEN.value
    job_dict["created_by_user_id"] = user_id
    job_dict["issuing_office_id"] = target_office_id
    if job_dict.get("billing_client_id") and not job_dict.get("billing_party"):
        from app.tenant_db.models import BillingClient
        bc = await db.get(BillingClient, job_dict["billing_client_id"])
        if bc:
            job_dict["billing_party"] = bc.name
    
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
    if data.billing_client_id and not data.billing_party:
        from app.tenant_db.models import BillingClient
        bc = await db.get(BillingClient, data.billing_client_id)
        if bc:
            job.billing_party = bc.name
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

async def get_all_lrs(db: AsyncSession, office_id: Optional[int] = None, include_unassigned: bool = False) -> List[LR]:
    stmt = select(LR).order_by(desc(LR.created_at))
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(LR.issuing_office_id == office_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def search_lrs(
    db: AsyncSession,
    query: str,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
    limit: int = 8,
) -> List[LR]:
    pattern = f"%{query.strip()}%"
    stmt = (
        select(LR)
        .options(
            selectinload(LR.consigner),
            selectinload(LR.consignee),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
        )
        .where(
            or_(
                LR.lr_number.ilike(pattern),
                LR.vehicle_number.ilike(pattern),
                LR.invoice_no.ilike(pattern),
                LR.container_no.ilike(pattern),
            )
        )
        .order_by(desc(LR.lr_date), desc(LR.id))
        .limit(limit)
    )
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(LR.issuing_office_id == office_id)
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())

async def get_lr_by_id(db: AsyncSession, lr_id: int) -> LR:
    lr = await db.get(LR, lr_id)
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="LR not found.")
    return lr

async def create_lr(db: AsyncSession, data: LRCreate, user_id: Optional[int] = None, office_id: Optional[int] = None) -> LR:
    target_office_id = data.issuing_office_id or office_id
    if not target_office_id:
        from app.tenant_db.models import Branch
        br_res = await db.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()
    lr_number = await allocate_or_validate_voucher_number(db, "LR", manual_number=data.lr_number, issuing_office_id=target_office_id)
    lr_dict = data.model_dump()
    lr_dict["lr_number"] = lr_number
    lr_dict["created_by_user_id"] = user_id
    lr_dict["issuing_office_id"] = target_office_id

    # Handle booking status
    b_status = data.booking_status or "Booked"
    lr_dict["booking_status"] = b_status
    if b_status == "Canceled":
        lr_dict["status"] = LRStatus.CANCELLED.value
    elif b_status == "Reserved":
        lr_dict["status"] = "RESERVED"
    else:
        lr_dict["status"] = LRStatus.BOOKED.value

    # Auto-populate load_type from LoadType master if load_type_id is provided
    if data.load_type_id and not data.load_type:
        from app.tenant_db.models import LoadType
        lt_obj = await db.get(LoadType, data.load_type_id)
        if lt_obj:
            lr_dict["load_type"] = lt_obj.name

    # Handle invoice_items if provided
    items = data.invoice_items or []
    if items:
        serialized_items = []
        for it in items:
            d = it.model_dump() if hasattr(it, "model_dump") else (it if isinstance(it, dict) else dict(it))
            if "invoice_date" in d and d["invoice_date"] is not None:
                d["invoice_date"] = str(d["invoice_date"])
            if "eway_bill_date" in d and d["eway_bill_date"] is not None:
                d["eway_bill_date"] = str(d["eway_bill_date"])
            if "eway_bill_expiry" in d and d["eway_bill_expiry"] is not None:
                d["eway_bill_expiry"] = str(d["eway_bill_expiry"])
            if "invoice_value" in d and d["invoice_value"] is not None:
                d["invoice_value"] = float(d["invoice_value"])
            serialized_items.append(d)
        lr_dict["invoice_items"] = serialized_items

        inv_nos = [str(it.get("invoice_no") or "").strip() for it in serialized_items if (it.get("invoice_no") or "").strip()]
        ewb_nos = [str(it.get("eway_bill_number") or "").strip() for it in serialized_items if (it.get("eway_bill_number") or "").strip()]
        if inv_nos and not lr_dict.get("invoice_no"):
            lr_dict["invoice_no"] = ", ".join(inv_nos)
        if ewb_nos and not lr_dict.get("eway_bill_number"):
            lr_dict["eway_bill_number"] = ", ".join(ewb_nos)
        total_inv_val = sum(Decimal(str(it.get("invoice_value") or 0)) for it in serialized_items)
        if total_inv_val > 0 and (not lr_dict.get("invoice_value") or lr_dict.get("invoice_value") == Decimal("0.00")):
            lr_dict["invoice_value"] = total_inv_val

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

    await db.commit()
    await db.refresh(lr)
    return lr

async def update_lr(db: AsyncSession, lr_id: int, data: LRUpdate) -> LR:
    lr = await db.get(LR, lr_id)
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="LR not found.")
    if lr.status == LRStatus.POD_VERIFIED.value:
        raise AppException(status_code=400, error_code="LR_LOCKED", message="LR is POD_VERIFIED and cannot be modified.")
    
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(lr, field, val)

    # Sync status with booking_status if provided
    if data.booking_status:
        if data.booking_status == "Canceled":
            lr.status = LRStatus.CANCELLED.value
        elif data.booking_status == "Reserved":
            lr.status = "RESERVED"
        elif data.booking_status == "Booked" and lr.status in (LRStatus.CANCELLED.value, "RESERVED", LRStatus.DRAFT.value):
            lr.status = LRStatus.BOOKED.value

    # Auto-populate load_type from master if load_type_id changed
    if data.load_type_id and not data.load_type:
        from app.tenant_db.models import LoadType
        lt_obj = await db.get(LoadType, data.load_type_id)
        if lt_obj:
            lr.load_type = lt_obj.name

    # Handle invoice_items if updated
    if data.invoice_items is not None:
        serialized_items = []
        for it in data.invoice_items:
            d = it.model_dump() if hasattr(it, "model_dump") else (it if isinstance(it, dict) else dict(it))
            if "invoice_date" in d and d["invoice_date"] is not None:
                d["invoice_date"] = str(d["invoice_date"])
            if "eway_bill_date" in d and d["eway_bill_date"] is not None:
                d["eway_bill_date"] = str(d["eway_bill_date"])
            if "eway_bill_expiry" in d and d["eway_bill_expiry"] is not None:
                d["eway_bill_expiry"] = str(d["eway_bill_expiry"])
            if "invoice_value" in d and d["invoice_value"] is not None:
                d["invoice_value"] = float(d["invoice_value"])
            serialized_items.append(d)
        lr.invoice_items = serialized_items

        inv_nos = [str(it.get("invoice_no") or "").strip() for it in serialized_items if (it.get("invoice_no") or "").strip()]
        ewb_nos = [str(it.get("eway_bill_number") or "").strip() for it in serialized_items if (it.get("eway_bill_number") or "").strip()]
        if inv_nos and not data.invoice_no:
            lr.invoice_no = ", ".join(inv_nos)
        if ewb_nos and not data.eway_bill_number:
            lr.eway_bill_number = ", ".join(ewb_nos)
        total_inv_val = sum(Decimal(str(it.get("invoice_value") or 0)) for it in serialized_items)
        if total_inv_val > 0 and (not data.invoice_value or data.invoice_value == Decimal("0.00")):
            lr.invoice_value = total_inv_val

    # Recalculate totals
    freight = lr.freight_amount or Decimal("0.00")
    loading = lr.loading_charges or Decimal("0.00")
    unloading = lr.unloading_charges or Decimal("0.00")
    other = lr.other_charges or Decimal("0.00")
    advance = lr.advance_amount or Decimal("0.00")
    total = freight + loading + unloading + other
    if total > 0:
        lr.total_freight_amount = total
        lr.balance_amount = total - advance

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

async def get_all_hire_challans(db: AsyncSession, office_id: Optional[int] = None, include_unassigned: bool = False) -> List[HireChallan]:
    stmt = select(HireChallan).order_by(desc(HireChallan.created_at))
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(HireChallan.issuing_office_id == office_id, HireChallan.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(HireChallan.issuing_office_id == office_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_hire_challan(db: AsyncSession, data: HireChallanCreate, office_id: Optional[int] = None) -> HireChallan:
    target_office_id = data.issuing_office_id or office_id
    if not target_office_id:
        from app.tenant_db.models import Branch
        br_res = await db.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()
    challan_number = await allocate_or_validate_voucher_number(db, "HIRE_CHALLAN", manual_number=data.challan_number, issuing_office_id=target_office_id)
    hc_dict = data.model_dump()
    hc_dict["challan_number"] = challan_number
    hc_dict["status"] = HireChallanStatus.ISSUED.value  # Confirmed on creation
    hc_dict["issuing_office_id"] = target_office_id

    # If driver_id is provided but driver_name is not, resolve from Driver model
    if hc_dict.get("driver_id") and not hc_dict.get("driver_name"):
        from app.tenant_db.models import Driver
        drv = await db.get(Driver, hc_dict["driver_id"])
        if drv:
            hc_dict["driver_name"] = drv.name
            if not hc_dict.get("driver_phone"):
                hc_dict["driver_phone"] = drv.phone

    # Calculate total from loading/unloading expenses if provided
    loading_expenses = hc_dict.get("loading_expenses") or []
    unloading_expenses = hc_dict.get("unloading_expenses") or []
    loading_total = Decimal("0.00")
    for item in loading_expenses:
        try:
            amt = Decimal(str(item.get("inr_amount") or item.get("amount") or 0))
            loading_total += amt
        except Exception:
            pass
    unloading_total = Decimal("0.00")
    for item in unloading_expenses:
        try:
            amt = Decimal(str(item.get("inr_amount") or item.get("amount") or 0))
            unloading_total += amt
        except Exception:
            pass

    # Financial calculations
    hire_rate = hc_dict.get("hire_rate") or Decimal("0.00")
    if hire_rate == Decimal("0.00") and (loading_total > Decimal("0.00") or unloading_total > Decimal("0.00")):
        hire_rate = loading_total + unloading_total
        hc_dict["hire_rate"] = hire_rate

    advance = hc_dict.get("advance_amount") or Decimal("0.00")
    tds_rate = hc_dict.get("tds_rate") or Decimal("0.00")
    tds_amount = hc_dict.get("tds_amount") or Decimal("0.00")
    
    if (tds_amount is None or tds_amount == Decimal("0.00")) and tds_rate > Decimal("0.00"):
        tds = (hire_rate * tds_rate) / Decimal("100.00")
    else:
        tds = tds_amount or Decimal("0.00")

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
    hire_rate = hc.hire_rate or Decimal("0.00")
    tds_rate = hc.tds_rate or Decimal("0.00")
    tds = (hire_rate * tds_rate) / Decimal("100.00") if tds_rate > Decimal("0.00") else (hc.tds_amount or Decimal("0.00"))
    detention = hc.detention_charge or Decimal("0.00")
    mamul = hc.mamul_charges or Decimal("0.00")
    advance = hc.advance_amount or Decimal("0.00")
    net_payable = (hire_rate + detention) - (tds + mamul)
    hc.tds_amount = tds
    hc.net_payable_amount = net_payable
    hc.balance_amount = net_payable - advance

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

async def get_all_arrival_reports(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
) -> List[ArrivalReport]:
    stmt = select(ArrivalReport).options(selectinload(ArrivalReport.lr)).order_by(desc(ArrivalReport.created_at))
    if office_id:
        stmt = stmt.join(ArrivalReport.lr)
        if include_unassigned:
            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(LR.issuing_office_id == office_id)
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

async def get_all_pod_records(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
) -> List[PODRecord]:
    stmt = select(PODRecord).options(selectinload(PODRecord.lr)).order_by(desc(PODRecord.created_at))
    if office_id:
        stmt = stmt.join(PODRecord.lr)
        if include_unassigned:
            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(LR.issuing_office_id == office_id)
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


# ===========================================================================
# Live E-Way Bill Auto-Fetch Integration (NIC / Adaequare GSP)
# ===========================================================================

def format_ewb_date(date_str: Optional[str]) -> Optional[str]:
    if not date_str:
        return None
    date_clean = str(date_str).strip()
    if not date_clean:
        return None
    # Handle DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
    parts = date_clean.split(" ")[0].split("/")
    if len(parts) == 3:
        # DD/MM/YYYY -> YYYY-MM-DD
        day = parts[0].zfill(2)
        month = parts[1].zfill(2)
        year = parts[2]
        return f"{year}-{month}-{day}"
    # Already YYYY-MM-DD?
    if len(date_clean.split("-")) == 3:
        return date_clean.split(" ")[0]
    return date_clean


async def fetch_live_eway_bill(db: AsyncSession, ewb_no: str) -> Dict[str, Any]:
    ewb_clean = str(ewb_no).strip().replace(" ", "").replace("-", "")
    if not ewb_clean:
        raise AppException(status_code=400, error_code="INVALID_EWB", message="E-Way Bill number is required.")

    # Retrieve company settings from tenant DB
    stmt = select(CompanySetting).limit(1)
    company = (await db.execute(stmt)).scalar_one_or_none()

    client_id = (company.gsp_client_id_override if company and company.gsp_client_id_override else None) or settings.GSP_CLIENT_ID
    client_secret = (company.gsp_client_secret_override if company and company.gsp_client_secret_override else None) or settings.GSP_CLIENT_SECRET
    base_url = ((company.gsp_base_url_override if company and company.gsp_base_url_override else None) or settings.GSP_BASE_URL).rstrip("/")
    ewb_username = company.ewb_username if company and company.ewb_username else None
    ewb_password = company.ewb_password if company and company.ewb_password else None
    gstin = (company.ewb_gstin if company and company.ewb_gstin else (company.gstin if company else None))

    if not client_id or not client_secret:
        raise AppException(
            status_code=500,
            error_code="GSP_CONFIG_ERROR",
            message="GSP_CLIENT_ID / GSP_CLIENT_SECRET are not configured in project environment (Dokploy) or API Center."
        )

    if not ewb_username or not ewb_password or not gstin:
        raise AppException(
            status_code=400,
            error_code="EWB_CREDENTIALS_MISSING",
            message="E-Way Bill credentials (username, password, GSTIN) are not set. Please configure them in Company Settings -> API Center."
        )

    # 1. Authenticate with GSP
    token_url = f"{base_url}/gsp/authenticate?grant_type=token"
    token_headers = {
        "gspappid": client_id,
        "gspappsecret": client_secret,
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        try:
            token_resp = await client.post(token_url, headers=token_headers)
        except Exception as e:
            raise AppException(
                status_code=502,
                error_code="GSP_GATEWAY_ERROR",
                message=f"Failed to connect to GSP gateway at {base_url}: {e}"
            )

        if token_resp.status_code != 200:
            raise AppException(
                status_code=502,
                error_code="GSP_AUTH_FAILED",
                message=f"GSP Token generation failed ({token_resp.status_code}): {token_resp.text[:250]}"
            )

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise AppException(
                status_code=502,
                error_code="GSP_NO_TOKEN",
                message="GSP authentication succeeded but did not return access_token."
            )

        # 2. Fetch E-Way Bill Details
        req_id = f"PLPLDEL{int(time.time())}"
        fetch_url = f"{base_url}/enriched/ewb/ewayapi/GetEwayBill?ewbNo={ewb_clean}"
        fetch_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "username": ewb_username,
            "password": ewb_password,
            "GSTIN": gstin,
            "requestid": req_id,
        }

        try:
            ewb_resp = await client.get(fetch_url, headers=fetch_headers)
        except Exception as e:
            raise AppException(
                status_code=502,
                error_code="EWB_FETCH_ERROR",
                message=f"Failed to query E-Way bill API: {e}"
            )

        try:
            raw_json = ewb_resp.json()
        except Exception:
            raise AppException(
                status_code=502,
                error_code="INVALID_API_RESPONSE",
                message=f"EWB API returned non-JSON response: {ewb_resp.text[:200]}"
            )

    # 3. Parse and standardize response
    data = raw_json.get("result") or raw_json.get("data") or raw_json
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            pass

    if not isinstance(data, dict):
        raise AppException(
            status_code=400,
            error_code="EWB_NOT_FOUND",
            message=raw_json.get("message") or raw_json.get("error_message") or "E-Way Bill details not found."
        )

    # Check for failure status
    if raw_json.get("success") is False or raw_json.get("status_cd") == "0":
        msg = raw_json.get("message") or raw_json.get("status_desc") or "Failed to fetch E-Way Bill details."
        raise AppException(status_code=400, error_code="EWB_FETCH_FAILED", message=msg)

    # Extract items
    item_list = data.get("itemList") or []
    first_item = item_list[0] if item_list and isinstance(item_list, list) else {}
    particulars_parts = []
    if first_item.get("productName"):
        particulars_parts.append(str(first_item["productName"]))
    if first_item.get("productDesc"):
        particulars_parts.append(f"({first_item['productDesc']})")
    if first_item.get("hsnCode"):
        particulars_parts.append(f"HSN: {first_item['hsnCode']}")
    particulars = " ".join(particulars_parts) if particulars_parts else ""

    # Extract vehicle
    vehicles = data.get("VehiclListDetails") or []
    vehicle_no = vehicles[0].get("vehicleNo") if vehicles and isinstance(vehicles, list) else ""

    # Build remarks
    remarks_list = []
    from_trd = data.get("fromTrdName")
    from_place = data.get("fromPlace")
    from_pin = data.get("fromPincode")
    to_trd = data.get("toTrdName")
    to_place = data.get("toPlace")
    to_pin = data.get("toPincode")
    transporter = data.get("transporterName")

    if from_trd or from_place:
        from_str = f"From: {from_trd or ''}"
        if from_place:
            from_str += f", {from_place}"
        if from_pin:
            from_str += f" ({from_pin})"
        remarks_list.append(from_str)

    if to_trd or to_place:
        to_str = f"To: {to_trd or ''}"
        if to_place:
            to_str += f", {to_place}"
        if to_pin:
            to_str += f" ({to_pin})"
        remarks_list.append(to_str)

    if transporter:
        remarks_list.append(f"Transporter: {transporter}")

    remarks = " | ".join(remarks_list)

    return {
        "success": True,
        "eway_bill_number": str(data.get("ewayBillNo") or ewb_clean),
        "eway_bill_date": format_ewb_date(data.get("ewayBillDate")),
        "eway_bill_expiry": format_ewb_date(data.get("validUpto")),
        "invoice_no": str(data.get("docNo") or ""),
        "invoice_date": format_ewb_date(data.get("docDate")),
        "invoice_value": float(data.get("totInvValue") or data.get("totalValue") or 0.0),
        "particulars": particulars,
        "vehicle_number": vehicle_no,
        "actual_weight": float(first_item.get("quantity") or 0.0) if first_item and first_item.get("quantity") else None,
        "remarks": remarks,
        "from_trade_name": from_trd,
        "to_trade_name": to_trd,
        "from_place": from_place,
        "to_place": to_place,
        "from_pincode": from_pin,
        "to_pincode": to_pin,
        "transporter_name": transporter,
        "raw": data,
    }


# ===========================================================================
# Freight Tiger SIM-Based Tracking Services (PRD §11 / FT Trip APIs)
# ===========================================================================

def parse_iso_or_utc(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        cleaned = str(date_str).strip()
        if "T" in cleaned:
            return datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        return datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def create_sim_trip(db: AsyncSession, data: SIMTripCreate) -> SIMTripRecord:
    """
    Creates a new SIM-based trip via Freight Tiger, initiating carrier driver consent SMS.
    """
    vehicle_num = data.vehicle_number.strip().upper()
    driver_phone = data.driver_phone.strip()
    driver_name = data.driver_name
    origin_addr = data.origin_address
    dest_addr = data.destination_address
    lr_number = data.lr_number
    route_code = data.route_code

    # If linked to LR, populate missing details from LR consignment
    if data.lr_id:
        lr_stmt = select(LR).options(
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
        ).where(LR.id == data.lr_id)
        lr_res = await db.execute(lr_stmt)
        lr_obj = lr_res.scalars().first()
        if lr_obj:
            if not lr_number:
                lr_number = lr_obj.lr_number
            if not vehicle_num:
                vehicle_num = lr_obj.vehicle_number
            if not driver_phone and lr_obj.driver_phone:
                driver_phone = lr_obj.driver_phone
            if not driver_name and lr_obj.driver_name:
                driver_name = lr_obj.driver_name
            if not origin_addr and lr_obj.origin_location:
                origin_addr = f"{lr_obj.origin_location.name}, {lr_obj.origin_location.city_name or ''}"
            if not dest_addr and lr_obj.destination_location:
                dest_addr = f"{lr_obj.destination_location.name}, {lr_obj.destination_location.city_name or ''}"

    # Check for company setting credentials override
    cs_stmt = select(CompanySetting).limit(1)
    cs_res = await db.execute(cs_stmt)
    comp_setting = cs_res.scalars().first()

    ft_client = freight_tiger_client
    if comp_setting and comp_setting.ft_auth_token:
        ft_client = FreightTigerClient(
            base_url=comp_setting.ft_base_url or "https://api.freighttiger.com/api/tether",
            auth_token=comp_setting.ft_auth_token,
        )

    # Call Freight Tiger API
    origin_payload: Dict[str, Any] = {"address": origin_addr or "Origin Hub"}
    if data.origin_lat is not None and data.origin_lng is not None:
        origin_payload["lat"] = data.origin_lat
        origin_payload["lng"] = data.origin_lng

    dest_payload: Dict[str, Any] = {"address": dest_addr or "Destination Hub"}
    if data.destination_lat is not None and data.destination_lng is not None:
        dest_payload["lat"] = data.destination_lat
        dest_payload["lng"] = data.destination_lng

    ft_resp = await ft_client.create_sim_trip(
        vehicle_number=vehicle_num,
        driver_phone=driver_phone,
        driver_name=driver_name,
        lr_number=lr_number,
        origin=origin_payload,
        destination=dest_payload,
        route_code=route_code,
        share_trip=data.share_trip,
    )

    sim_record = SIMTripRecord(
        feed_unique_id=ft_resp["feed_unique_id"],
        ft_trip_id=ft_resp.get("trip_id"),
        lr_id=data.lr_id,
        vehicle_number=vehicle_num,
        driver_name=driver_name,
        driver_phone=driver_phone,
        consent_status=SIMConsentStatus.PENDING.value,
        is_consent_done=False,
        status="Open",
        status_code=1,
        share_url=ft_resp.get("share_url"),
        origin_address=origin_addr,
        destination_address=dest_addr,
        route_code=route_code,
        last_synced_at=datetime.now(timezone.utc),
    )
    db.add(sim_record)
    await db.commit()
    await db.refresh(sim_record)
    return sim_record


async def get_sim_trips(
    db: AsyncSession,
    limit: int = 100,
    status_filter: Optional[str] = None,
) -> List[SIMTripRecord]:
    stmt = select(SIMTripRecord).options(selectinload(SIMTripRecord.lr))
    if status_filter:
        stmt = stmt.where(SIMTripRecord.status.ilike(status_filter))
    stmt = stmt.order_by(desc(SIMTripRecord.created_at)).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_sim_trip_by_id(db: AsyncSession, trip_id: int) -> Optional[SIMTripRecord]:
    stmt = select(SIMTripRecord).options(selectinload(SIMTripRecord.lr)).where(SIMTripRecord.id == trip_id)
    res = await db.execute(stmt)
    return res.scalars().first()


async def get_sim_trip_by_uid(db: AsyncSession, feed_unique_id: str) -> Optional[SIMTripRecord]:
    stmt = select(SIMTripRecord).options(selectinload(SIMTripRecord.lr)).where(SIMTripRecord.feed_unique_id == feed_unique_id)
    res = await db.execute(stmt)
    return res.scalars().first()


async def sync_sim_trip(db: AsyncSession, trip: SIMTripRecord) -> SIMTripRecord:
    """
    Polls Freight Tiger for the latest tracking state, telecom consent,
    and cell-tower location fixes, updating the trip and recording a Telemetry Ping.
    """
    cs_stmt = select(CompanySetting).limit(1)
    cs_res = await db.execute(cs_stmt)
    comp_setting = cs_res.scalars().first()

    ft_client = freight_tiger_client
    if comp_setting and comp_setting.ft_auth_token:
        ft_client = FreightTigerClient(
            base_url=comp_setting.ft_base_url or "https://api.freighttiger.com/api/tether",
            auth_token=comp_setting.ft_auth_token,
        )

    ft_data = await ft_client.get_trip_details(
        feed_unique_id=trip.feed_unique_id,
        trip_id=trip.ft_trip_id,
    )

    is_consent = ft_data.get("is_consent_done", False)
    trip.is_consent_done = is_consent
    trip.consent_status = SIMConsentStatus.ACCEPTED.value if is_consent else SIMConsentStatus.PENDING.value
    trip.status = ft_data.get("status", trip.status)
    trip.status_code = ft_data.get("status_code", trip.status_code)

    if ft_data.get("share_url"):
        trip.share_url = ft_data["share_url"]

    # If coordinates are present
    if ft_data.get("last_latitude") is not None and ft_data.get("last_longitude") is not None:
        trip.last_latitude = Decimal(str(round(float(ft_data["last_latitude"]), 6)))
        trip.last_longitude = Decimal(str(round(float(ft_data["last_longitude"]), 6)))
        trip.last_location_address = ft_data.get("last_location_address")
        
        rec_at = parse_iso_or_utc(ft_data.get("recorded_at")) or datetime.now(timezone.utc)
        trip.recorded_at = rec_at

        # Save to general telemetry pings (for unified fleet map & logs)
        ping = TrackingPing(
            vehicle_number=trip.vehicle_number,
            tracking_mode=TrackingMode.SIM.value,
            identifier=trip.driver_phone,
            last_latitude=trip.last_latitude,
            last_longitude=trip.last_longitude,
            location_name=trip.last_location_address or "SIM Cell Tower Triangulation",
            speed_kmh=Decimal("42.0") if is_consent else Decimal("0.0"),
            last_ping_at=rec_at,
            status="ACTIVE",
        )
        db.add(ping)

    if ft_data.get("distance_remaining_km") is not None:
        trip.distance_remaining_km = Decimal(str(round(float(ft_data["distance_remaining_km"]), 2)))
    if ft_data.get("total_distance_km") is not None:
        trip.total_distance_km = Decimal(str(round(float(ft_data["total_distance_km"]), 2)))

    if ft_data.get("eta"):
        trip.eta = parse_iso_or_utc(ft_data.get("eta"))
    if ft_data.get("eta_updated_at"):
        trip.eta_updated_at = parse_iso_or_utc(ft_data.get("eta_updated_at"))

    trip.last_synced_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(trip)
    return trip


async def close_sim_trip(db: AsyncSession, trip: SIMTripRecord, comment: Optional[str] = None) -> SIMTripRecord:
    """
    Closes the SIM trip in Freight Tiger and marks status Closed in PantherTMS.
    """
    cs_stmt = select(CompanySetting).limit(1)
    cs_res = await db.execute(cs_stmt)
    comp_setting = cs_res.scalars().first()

    ft_client = freight_tiger_client
    if comp_setting and comp_setting.ft_auth_token:
        ft_client = FreightTigerClient(
            base_url=comp_setting.ft_base_url or "https://api.freighttiger.com/api/tether",
            auth_token=comp_setting.ft_auth_token,
        )

    await ft_client.close_trip(
        feed_unique_id=trip.feed_unique_id,
        trip_id=trip.ft_trip_id,
        comment=comment,
    )

    trip.status = "Closed"
    trip.status_code = 0
    trip.closed_at = datetime.now(timezone.utc)
    trip.close_comment = comment or "Closed via PantherTMS"
    await db.commit()
    await db.refresh(trip)
    return trip


async def simulate_sim_consent(db: AsyncSession, trip: SIMTripRecord, is_consent_done: bool = True) -> SIMTripRecord:
    """
    Toggles simulated telecom consent and immediately syncs the location.
    """
    freight_tiger_client.set_simulated_consent(trip.feed_unique_id, is_consent_done)
    trip.is_consent_done = is_consent_done
    trip.consent_status = SIMConsentStatus.ACCEPTED.value if is_consent_done else SIMConsentStatus.PENDING.value
    await db.commit()
    return await sync_sim_trip(db, trip)


async def sync_all_active_sim_trips(db: AsyncSession) -> int:
    """
    Refreshes location & consent across all open SIM trips.
    """
    stmt = select(SIMTripRecord).where(SIMTripRecord.status.ilike("open"))
    res = await db.execute(stmt)
    trips = list(res.scalars().all())
    count = 0
    for t in trips:
        try:
            await sync_sim_trip(db, t)
            count += 1
        except Exception as exc:
            pass
    return count


# ==============================================================================
# 14. FASTag Tracking Service
# ==============================================================================

fastag_client = FASTagProviderClient()


async def check_and_deduct_fastag_credit(
    tenant_db: Optional[AsyncSession] = None,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
    vehicle_number: Optional[str] = None,
) -> Tuple[bool, int, str]:
    """
    Checks if tenant has at least 1 credit remaining in panther_control database.
    If credits > 0, debits 1 call in panther_control, creates FastagWalletTransaction
    strictly in the tenant-specific database, and returns (True, remaining, "").
    If credits <= 0, returns (False, 0, "FASTag API credits exhausted (0 calls remaining)...").
    Tariff is strictly Rs. 1.50 per vehicle fetch.
    """
    if not tenant_id and not company_code:
        # If no tenant context provided (e.g. testing / fallback), allow pass
        return True, 999, ""

    from app.core.database import ControlSessionLocal, get_tenant_session_maker
    from app.control.models import Tenant as ControlTenant
    from app.tenant_db.models import FastagWalletTransaction
    from sqlalchemy import select, or_

    try:
        async with ControlSessionLocal() as session:
            stmt = select(ControlTenant).where(
                or_(ControlTenant.tenant_id == tenant_id, ControlTenant.company_code == company_code)
            ).with_for_update()
            res = await session.execute(stmt)
            tenant_obj = res.scalar_one_or_none()
            if not tenant_obj:
                return False, 0, "Tenant record not found in control database."

            current_credits = tenant_obj.fastag_credits_left or 0
            if current_credits <= 0:
                return False, 0, (
                    "FASTag API credits exhausted (0 calls remaining). "
                    "Standard tariff is ₹1.50 per vehicle fetch. Live query blocked. "
                    "Please contact your system administrator to allocate API credits."
                )

            tenant_obj.fastag_credits_left = current_credits - 1
            new_balance = tenant_obj.fastag_credits_left
            target_company_code = tenant_obj.company_code or company_code
            await session.commit()

        # Record audit transaction strictly in tenant-specific database (NEVER in panther_control)
        tx_data = {
            "transaction_type": "DEBIT",
            "api_calls_count": 1,
            "rate_per_call": Decimal("1.50"),
            "amount": Decimal("1.50"),
            "vehicle_number": vehicle_number,
            "description": f"FASTag Live Telemetry Fetch for {vehicle_number}",
            "balance_after": new_balance,
            "created_at": datetime.now(timezone.utc),
        }

        if tenant_db:
            try:
                tx = FastagWalletTransaction(**tx_data)
                tenant_db.add(tx)
                await tenant_db.commit()
            except Exception as tx_err:
                logger.warning(f"Could not record fastag transaction in tenant DB session: {tx_err}")
        elif target_company_code:
            try:
                resolved_db_name = f"panther_tenant_{target_company_code.lower()}"
                t_session_maker = get_tenant_session_maker(resolved_db_name)
                async with t_session_maker() as t_session:
                    tx = FastagWalletTransaction(**tx_data)
                    t_session.add(tx)
                    await t_session.commit()
            except Exception as tx_err:
                logger.warning(f"Could not record fastag transaction in isolated tenant DB: {tx_err}")

        return True, new_balance, ""
    except Exception as e:
        return False, 0, f"FASTag credit check error: {str(e)}"


async def track_fastag_vehicle(
    db: AsyncSession,
    vehicle_number: str,
    force_sync: bool = False,
    manual_from: Optional[str] = None,
    manual_to: Optional[str] = None,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Tracks a vehicle using Logitrack/NETC FASTag telemetry.
    Respects 1-hour rate limit cooldown unless force_sync is requested.
    Verifies tenant credit balance in panther_control; blocks live queries if 0.
    Extracts chronological toll checkpoints, computes road distances and progress,
    and returns trip overview & timeline.
    """
    clean_vehicle = clean_vehicle_number(vehicle_number)
    if not clean_vehicle:
        raise AppException("Invalid vehicle number provided.", status_code=status.HTTP_400_BAD_REQUEST)

    # 1. Cooldown Check (3600 seconds)
    cooldown_stmt = select(FastagCooldown).where(FastagCooldown.vehicle_number == clean_vehicle)
    cooldown_res = await db.execute(cooldown_stmt)
    cooldown_rec = cooldown_res.scalars().first()

    now_utc = datetime.now(timezone.utc)
    seconds_passed: Optional[int] = None
    cooldown_active = False
    should_call_api = True

    if cooldown_rec:
        passed = (now_utc - cooldown_rec.last_sync).total_seconds()
        seconds_passed = int(passed)
        if passed < 3600 and passed >= 0 and not force_sync:
            cooldown_active = True
            should_call_api = False

    api_called = False
    api_error = None

    # 2. Call Live FASTag API if cooldown passed or forced
    if should_call_api:
        # Check credit balance in panther_control and record transaction in tenant DB
        has_credit, remaining, credit_err = await check_and_deduct_fastag_credit(
            tenant_db=db,
            tenant_id=tenant_id,
            company_code=company_code,
            vehicle_number=clean_vehicle,
        )
        if not has_credit:
            should_call_api = False
            api_called = False
            api_error = credit_err
        else:
            success, raw_txns, err_msg = await fastag_client.fetch_toll_transactions(clean_vehicle)
            api_called = True
            api_error = err_msg

        if should_call_api and success and raw_txns:
            # Query existing tolls to prevent duplicate entries
            existing_tolls_stmt = select(TollLog).where(TollLog.vehicle_number == clean_vehicle)
            existing_tolls_res = await db.execute(existing_tolls_stmt)
            existing_tolls = existing_tolls_res.scalars().all()

            existing_signatures = set()
            for et in existing_tolls:
                r_epoch = int(et.reader_read_time.timestamp()) if et.reader_read_time else 0
                existing_signatures.add((et.toll_plaza_name.strip().lower(), r_epoch // 60))

            # Find active manual trip or active LR for tag association
            active_trip_stmt = (
                select(FastagTripRecord)
                .where(FastagTripRecord.vehicle_number == clean_vehicle, FastagTripRecord.status == "ACTIVE")
                .order_by(desc(FastagTripRecord.id))
            )
            act_trip_res = await db.execute(active_trip_stmt)
            active_fastag_trip = act_trip_res.scalars().first()

            latest_lr_no = None
            latest_lr_id = None
            if active_fastag_trip:
                latest_lr_no = active_fastag_trip.lr_number
                latest_lr_id = active_fastag_trip.lr_id
            else:
                lr_stmt = select(LR).where(
                    func.replace(func.replace(LR.vehicle_number, " ", ""), "-", "") == clean_vehicle
                ).order_by(desc(LR.id)).limit(1)
                lr_res = await db.execute(lr_stmt)
                lr_obj = lr_res.scalars().first()
                if lr_obj:
                    latest_lr_no = lr_obj.lr_number
                    latest_lr_id = lr_obj.id

            new_tolls_added = 0
            latest_txn_coord = None
            latest_txn_name = None
            latest_txn_time = None

            for t in raw_txns:
                t_name = t["toll_plaza_name"].strip()
                t_time = t["reader_read_time"]
                t_epoch_min = int(t_time.timestamp()) // 60
                sig = (t_name.lower(), t_epoch_min)

                if sig not in existing_signatures:
                    existing_signatures.add(sig)
                    t_log = TollLog(
                        vehicle_number=clean_vehicle,
                        lr_id=latest_lr_id,
                        lr_no=latest_lr_no,
                        fastag_trip_id=active_fastag_trip.id if active_fastag_trip else None,
                        toll_plaza_name=t_name,
                        geocode=t.get("geocode"),
                        latitude=Decimal(str(t["latitude"])) if t.get("latitude") is not None else None,
                        longitude=Decimal(str(t["longitude"])) if t.get("longitude") is not None else None,
                        reader_read_time=t_time,
                    )
                    db.add(t_log)
                    new_tolls_added += 1

                latest_txn_name = t_name
                latest_txn_time = t_time
                if t.get("latitude") and t.get("longitude"):
                    latest_txn_coord = (t["latitude"], t["longitude"])

            # Also create/update TrackingPing telemetry record so all TMS modules see latest fix
            if latest_txn_name and latest_txn_time:
                ping_stmt = (
                    select(TrackingPing)
                    .where(TrackingPing.vehicle_number == clean_vehicle, TrackingPing.tracking_mode == "FASTAG")
                    .order_by(desc(TrackingPing.id))
                    .limit(1)
                )
                ping_res = await db.execute(ping_stmt)
                existing_ping = ping_res.scalars().first()
                if existing_ping:
                    existing_ping.location_name = latest_txn_name
                    existing_ping.last_ping_at = latest_txn_time
                    if latest_txn_coord:
                        existing_ping.last_latitude = Decimal(str(latest_txn_coord[0]))
                        existing_ping.last_longitude = Decimal(str(latest_txn_coord[1]))
                else:
                    new_ping = TrackingPing(
                        vehicle_number=clean_vehicle,
                        tracking_mode="FASTAG",
                        identifier=clean_vehicle,
                        location_name=latest_txn_name,
                        last_ping_at=latest_txn_time,
                        last_latitude=Decimal(str(latest_txn_coord[0])) if latest_txn_coord else None,
                        last_longitude=Decimal(str(latest_txn_coord[1])) if latest_txn_coord else None,
                        status="ACTIVE",
                    )
                    db.add(new_ping)

        # Update or create cooldown record
        if cooldown_rec:
            cooldown_rec.last_sync = now_utc
        else:
            cooldown_rec = FastagCooldown(vehicle_number=clean_vehicle, last_sync=now_utc)
            db.add(cooldown_rec)

        await db.commit()
        cooldown_active = True
        seconds_passed = 0

    # 3. Determine Trip Context (Manual > Active Fastag Trip > Active LR)
    trip_data: Optional[Dict[str, Any]] = None

    if manual_from and manual_to:
        trip_data = {
            "id": None,
            "trip_number": "MANUAL",
            "is_manual": True,
            "lr_id": None,
            "lr_no": None,
            "from_location": manual_from.strip(),
            "to_location": manual_to.strip(),
            "waypoints": [manual_from.strip(), manual_to.strip()],
            "status": "ACTIVE",
        }
    else:
        # Check active FastagTripRecord
        active_trip_stmt = (
            select(FastagTripRecord)
            .where(FastagTripRecord.vehicle_number == clean_vehicle, FastagTripRecord.status == "ACTIVE")
            .order_by(desc(FastagTripRecord.id))
        )
        act_trip_res = await db.execute(active_trip_stmt)
        active_trip = act_trip_res.scalars().first()

        if active_trip:
            wps = [active_trip.origin_name]
            if active_trip.intermediate_stops and isinstance(active_trip.intermediate_stops, list):
                wps.extend([s for s in active_trip.intermediate_stops if s])
            wps.append(active_trip.destination_name)

            trip_data = {
                "id": active_trip.id,
                "trip_number": active_trip.trip_number,
                "is_manual": active_trip.is_manual,
                "lr_id": active_trip.lr_id,
                "lr_no": active_trip.lr_number,
                "from_location": active_trip.origin_name,
                "to_location": active_trip.destination_name,
                "waypoints": wps,
                "status": active_trip.status,
            }
        else:
            # Check active LR
            lr_stmt = (
                select(LR)
                .where(func.replace(func.replace(LR.vehicle_number, " ", ""), "-", "") == clean_vehicle)
                .order_by(desc(LR.id))
                .options(selectinload(LR.origin_location), selectinload(LR.destination_location))
                .limit(1)
            )
            lr_res = await db.execute(lr_stmt)
            lr_obj = lr_res.scalars().first()

            if lr_obj:
                orig_name = lr_obj.origin_location.name if lr_obj.origin_location else "Origin"
                dest_name = lr_obj.destination_location.name if lr_obj.destination_location else "Destination"
                wps = [orig_name]
                if lr_obj.via:
                    wps.append(lr_obj.via.strip())
                wps.append(dest_name)

                trip_data = {
                    "id": None,
                    "trip_number": lr_obj.lr_number,
                    "is_manual": False,
                    "lr_id": lr_obj.id,
                    "lr_no": lr_obj.lr_number,
                    "from_location": orig_name,
                    "to_location": dest_name,
                    "waypoints": wps,
                    "status": "In Transit" if lr_obj.booking_status != "Delivered" else "Delivered",
                }

    # 4. Fetch Toll Logs for Vehicle (Filtered by Trip / 7-30 days)
    tolls_query = select(TollLog).where(TollLog.vehicle_number == clean_vehicle)
    if trip_data and trip_data.get("waypoints"):
        seven_days_ago = now_utc - timedelta(days=7)
        tolls_query = tolls_query.where(TollLog.reader_read_time >= seven_days_ago)

    tolls_query = tolls_query.order_by(desc(TollLog.reader_read_time)).limit(40)
    tolls_res = await db.execute(tolls_query)
    raw_route_logs = list(reversed(tolls_res.scalars().all()))

    route_output: List[Dict[str, Any]] = []
    toll_points: List[Tuple[float, float]] = []

    for toll in raw_route_logs:
        lat = float(toll.latitude) if toll.latitude is not None else None
        lng = float(toll.longitude) if toll.longitude is not None else None
        if lat is None or lng is None:
            if toll.geocode and "," in toll.geocode:
                parts = toll.geocode.split(",")
                try:
                    lat = float(parts[0].strip())
                    lng = float(parts[1].strip())
                except Exception:
                    pass
            if lat is None or lng is None:
                coords = resolve_location_coordinates(toll.toll_plaza_name)
                if coords:
                    lat, lng = coords

        if lat is not None and lng is not None:
            toll_points.append((lat, lng))

        formatted_time = toll.reader_read_time.strftime("%d %b %Y, %I:%M %p") if toll.reader_read_time else ""
        route_output.append(
            {
                "id": toll.id,
                "vehicle_number": toll.vehicle_number,
                "lr_no": toll.lr_no,
                "toll_plaza_name": toll.toll_plaza_name,
                "geocode": f"{lat},{lng}" if lat and lng else toll.geocode,
                "latitude": Decimal(str(lat)) if lat is not None else None,
                "longitude": Decimal(str(lng)) if lng is not None else None,
                "reader_read_time": toll.reader_read_time,
                "formatted_time": formatted_time,
            }
        )

    # 5. Compute Covered, Remaining & Total Distance and Progress %
    origin_coord = None
    dest_coord = None
    if trip_data and trip_data.get("from_location"):
        origin_coord = resolve_location_coordinates(trip_data["from_location"])
    if trip_data and trip_data.get("to_location"):
        dest_coord = resolve_location_coordinates(trip_data["to_location"])

    covered_km = 0.0
    if origin_coord and toll_points:
        covered_km += haversine_distance_km(origin_coord[0], origin_coord[1], toll_points[0][0], toll_points[0][1])
    for i in range(len(toll_points) - 1):
        covered_km += haversine_distance_km(
            toll_points[i][0], toll_points[i][1], toll_points[i + 1][0], toll_points[i + 1][1]
        )

    remaining_km = 0.0
    if dest_coord:
        if toll_points:
            remaining_km = haversine_distance_km(
                toll_points[-1][0], toll_points[-1][1], dest_coord[0], dest_coord[1]
            )
        elif origin_coord:
            remaining_km = haversine_distance_km(
                origin_coord[0], origin_coord[1], dest_coord[0], dest_coord[1]
            )

    # Road curvature adjustment factor (~1.2x straight line for Indian highway network)
    covered_km = round(covered_km * 1.18, 1)
    remaining_km = round(remaining_km * 1.18, 1) if dest_coord else 0.0
    total_km = round(covered_km + remaining_km, 1)

    progress_pct = 0
    if total_km > 0:
        progress_pct = min(100, int(round((covered_km / total_km) * 100)))
    elif covered_km > 0:
        progress_pct = 100

    trip_status = "Active Tracking"
    if dest_coord:
        if progress_pct >= 95 or (trip_data and trip_data.get("status") in ("COMPLETED", "Delivered")):
            trip_status = "Trip Completed"
        else:
            trip_status = "In Transit"

    # Update active FastagTripRecord if present
    if trip_data and trip_data.get("id"):
        trip_rec = await db.get(FastagTripRecord, trip_data["id"])
        if trip_rec:
            trip_rec.covered_distance_km = Decimal(str(covered_km))
            trip_rec.remaining_distance_km = Decimal(str(remaining_km))
            trip_rec.total_distance_km = Decimal(str(total_km))
            trip_rec.toll_count = len(route_output)
            if route_output:
                trip_rec.last_toll_name = route_output[-1]["toll_plaza_name"]
                trip_rec.last_toll_time = route_output[-1]["reader_read_time"]
            trip_rec.last_sync_at = now_utc
            await db.commit()

    return {
        "vehicle": clean_vehicle,
        "api_called": api_called,
        "cooldown_active": cooldown_active,
        "seconds_since_last_sync": seconds_passed,
        "trip": trip_data,
        "route": route_output,
        "metrics": {
            "covered_km": covered_km,
            "remaining_km": remaining_km,
            "total_km": total_km,
            "progress_pct": progress_pct,
            "status": trip_status,
        },
        "error": api_error,
    }


async def create_manual_fastag_trip(
    db: AsyncSession,
    data: FastagTripCreate,
) -> FastagTripRecord:
    """
    Creates and persists a FASTag Trip record with manual Origin and Destination waypoints.
    Allows users to track vehicles without requiring an existing LR consignment.
    """
    clean_vehicle = clean_vehicle_number(data.vehicle_number)
    if not clean_vehicle:
        raise AppException("Valid Vehicle Number is required.", status_code=status.HTTP_400_BAD_REQUEST)

    if not data.origin_name or not data.destination_name:
        raise AppException("Origin (From) and Destination (To) locations are required.", status_code=status.HTTP_400_BAD_REQUEST)

    # Generate sequential/unique trip code: FT-YYYYMM-XXXX
    month_str = datetime.now(timezone.utc).strftime("%Y%m")
    count_stmt = select(func.count(FastagTripRecord.id))
    count_res = await db.execute(count_stmt)
    seq = (count_res.scalar() or 0) + 1
    trip_number = f"FT-{month_str}-{seq:04d}"

    # Check if vehicle has an LR
    lr_number = None
    if data.lr_id:
        lr_obj = await db.get(LR, data.lr_id)
        if lr_obj:
            lr_number = lr_obj.lr_number

    trip = FastagTripRecord(
        trip_number=trip_number,
        vehicle_number=clean_vehicle,
        is_manual=data.lr_id is None,
        lr_id=data.lr_id,
        lr_number=lr_number,
        origin_name=data.origin_name.strip(),
        destination_name=data.destination_name.strip(),
        intermediate_stops=data.intermediate_stops or [],
        status="ACTIVE",
        notes=data.notes,
        last_sync_at=datetime.now(timezone.utc),
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)

    # Immediately link any recent tolls for this vehicle
    link_stmt = select(TollLog).where(
        TollLog.vehicle_number == clean_vehicle,
        TollLog.fastag_trip_id.is_(None)
    )
    link_res = await db.execute(link_stmt)
    recent_tolls = link_res.scalars().all()
    if recent_tolls:
        for t in recent_tolls:
            t.fastag_trip_id = trip.id
        trip.toll_count = len(recent_tolls)
        trip.last_toll_name = recent_tolls[-1].toll_plaza_name
        trip.last_toll_time = recent_tolls[-1].reader_read_time
        await db.commit()
        await db.refresh(trip)

    return trip


async def list_fastag_trips(
    db: AsyncSession,
    status_filter: Optional[str] = None,
    vehicle: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[FastagTripRecord]:
    """Lists saved FASTag trips with optional status or vehicle filter."""
    stmt = select(FastagTripRecord).order_by(desc(FastagTripRecord.created_at))
    if status_filter and status_filter.upper() != "ALL":
        stmt = stmt.where(FastagTripRecord.status.ilike(status_filter.strip()))
    if vehicle:
        clean_v = clean_vehicle_number(vehicle)
        stmt = stmt.where(FastagTripRecord.vehicle_number.ilike(f"%{clean_v}%"))

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_fastag_trip_details(
    db: AsyncSession,
    trip_id: int,
) -> Optional[FastagTripRecord]:
    """Retrieves single FASTag trip record with selectin loaded relations."""
    stmt = (
        select(FastagTripRecord)
        .where(FastagTripRecord.id == trip_id)
        .options(selectinload(FastagTripRecord.toll_logs))
    )
    res = await db.execute(stmt)
    return res.scalars().first()


async def update_fastag_trip(
    db: AsyncSession,
    trip_id: int,
    data: FastagTripUpdate,
) -> FastagTripRecord:
    """Updates a FASTag trip (e.g. mark as COMPLETED, change waypoints or notes)."""
    trip = await db.get(FastagTripRecord, trip_id)
    if not trip:
        raise AppException("FASTag trip not found.", status_code=status.HTTP_404_NOT_FOUND)

    if data.origin_name is not None:
        trip.origin_name = data.origin_name.strip()
    if data.destination_name is not None:
        trip.destination_name = data.destination_name.strip()
    if data.intermediate_stops is not None:
        trip.intermediate_stops = data.intermediate_stops
    if data.notes is not None:
        trip.notes = data.notes
    if data.status is not None:
        trip.status = data.status.upper()
        if trip.status == "COMPLETED" and not trip.end_date:
            trip.end_date = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(trip)
    return trip


async def delete_fastag_trip(
    db: AsyncSession,
    trip_id: int,
) -> bool:
    """Deletes a manual FASTag trip."""
    trip = await db.get(FastagTripRecord, trip_id)
    if not trip:
        raise AppException("FASTag trip not found.", status_code=status.HTTP_404_NOT_FOUND)
    await db.delete(trip)
    await db.commit()
    return True


async def auto_sync_all_in_transit_fastag(
    db: AsyncSession,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Auto-syncs all vehicles that currently have an active FASTag trip or an in-transit LR.
    Direct equivalent of legacy action=auto_sync.
    """
    # 1. Distinct vehicles from active FASTag trips
    active_trips_stmt = select(FastagTripRecord.vehicle_number).where(FastagTripRecord.status == "ACTIVE").distinct()
    trip_res = await db.execute(active_trips_stmt)
    trip_vehicles = set(trip_res.scalars().all())

    # 2. Distinct vehicles from in-transit LRs
    lr_stmt = select(LR.vehicle_number).where(
        LR.booking_status.in_(["Dispatched", "In Transit", "Booked"])
    ).distinct()
    lr_res = await db.execute(lr_stmt)
    for v in lr_res.scalars().all():
        if v:
            trip_vehicles.add(clean_vehicle_number(v))

    synced_count = 0
    errors: List[str] = []

    for v in trip_vehicles:
        clean_v = clean_vehicle_number(v)
        if not clean_v:
            continue
        try:
            res = await track_fastag_vehicle(
                db,
                clean_v,
                force_sync=False,
                tenant_id=tenant_id,
                company_code=company_code,
            )
            if res.get("api_called"):
                synced_count += 1
        except Exception as e:
            errors.append(f"{clean_v}: {str(e)}")

    return {
        "vehicles_checked": len(trip_vehicles),
        "live_api_synced": synced_count,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "errors": errors[:5],
    }


