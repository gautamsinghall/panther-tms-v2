import json
import logging
import time
import httpx
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy import select, func, desc, or_, case, and_
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
    LoadingSlip,
    EWayBill,
    TrackingPing,
    SIMTripRecord,
    SIMConsentStatus,
    SimWalletTransaction,
    CompanySetting,
    FastagCooldown,
    FastagTripRecord,
    TollLog,
    Voucher,
)

logger = logging.getLogger(__name__)

from app.modules.profile.service import get_company_setting

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
    LoadingSlipCreate,
    LoadingSlipUpdate,
    EWayBillCreate,
    TrackingPingCreate,
    SIMTripCreate,
    SIMTripUpdate,
    SIMTripCommentCreate,
    SIMTripClose,
    SIMConsentSimulate,
    FastagTripCreate,
    FastagTripUpdate,
    FastagTripResponse,
    FastagTrackResponse,
    TollLogResponse,
    FastagTrackingMetrics,
    GPSConfigResponse,
    GPSVehicleItem,
    GPSFleetCounts,
    GPSFleetResponse,
    GPSTripInfo,
    GPSTrackResponse,
    GPSTimelineItem,
    GPSHistorySummary,
    GPSHistoryResponse,
)
from app.integrations.freight_tiger import freight_tiger_client, FreightTigerClient, detect_telecom_operator
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
    HireChallanStatus.DRAFT: {HireChallanStatus.ISSUED, HireChallanStatus.CONFIRMED, HireChallanStatus.CANCELLED},
    HireChallanStatus.CONFIRMED: {HireChallanStatus.TRANSIT, HireChallanStatus.SETTLED, HireChallanStatus.CANCELLED},
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
    await db.flush()

    # Ensure matching Vendor exists in general_vendors
    from app.tenant_db.models import Vendor
    v_cand = (await db.execute(select(Vendor).where(Vendor.name.ilike(owner.name)))).scalars().first()
    if not v_cand and owner.pan:
        v_cand = (await db.execute(select(Vendor).where(Vendor.pan == owner.pan))).scalars().first()
    if not v_cand:
        v_cand = Vendor(
            name=owner.name,
            phone=owner.phone,
            pan=owner.pan,
            state=owner.state,
            city=owner.city,
            address=owner.address,
            industry="Transporter / Fleet Owner",
            account_status="Active",
            is_active=True,
        )
        db.add(v_cand)
        await db.flush()
    from app.modules.accounts.master_ledger_service import get_or_create_party_account
    v_acc = await get_or_create_party_account(db, "VENDOR", v_cand.id, v_cand.name, v_cand.pan)
    if not v_acc.vehicle_owner_id:
        v_acc.vehicle_owner_id = owner.id
        await db.flush()

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
    
    vehicle_data = data.model_dump()
    if data.owner_id:
        owner = await db.get(VehicleOwner, data.owner_id)
        if owner:
            vehicle_data["owner_name"] = vehicle_data.get("owner_name") or owner.name
            vehicle_data["owner_phone"] = vehicle_data.get("owner_phone") or owner.phone
            
    vehicle = CompanyVehicle(**vehicle_data)
    db.add(vehicle)
    await db.flush()

    # Automatically create dedicated Fixed Asset master ledger account per Indian Accounting Standards
    from app.modules.accounts.master_ledger_service import get_or_create_party_account
    acc = await get_or_create_party_account(
        db,
        party_type="COMPANY_VEHICLE",
        party_id=vehicle.id,
        party_name=vehicle.vehicle_number,
        party_code=f"VEH_{vehicle.id:04d}",
    )
    if hasattr(vehicle, "account_id") and acc:
        vehicle.account_id = acc.id

    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def update_company_vehicle(db: AsyncSession, vehicle_id: int, data: CompanyVehicleUpdate) -> CompanyVehicle:
    vehicle = await db.get(CompanyVehicle, vehicle_id)
    if not vehicle:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Company vehicle not found.")
    old_number = vehicle.vehicle_number
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

    # If vehicle number changed, keep the linked ledger account in sync
    if data.vehicle_number and data.vehicle_number != old_number:
        from app.modules.accounts.master_ledger_service import get_or_create_party_account
        acc = await get_or_create_party_account(
            db,
            party_type="COMPANY_VEHICLE",
            party_id=vehicle.id,
            party_name=vehicle.vehicle_number,
            party_code=f"VEH_{vehicle.id:04d}",
        )
        if hasattr(vehicle, "account_id") and acc:
            vehicle.account_id = acc.id

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

async def get_all_jobs(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
    search: Optional[str] = None,
) -> List[Job]:
    from app.tenant_db.models import Consigner, Consignee, Location, BillingClient, Branch as BranchModel
    stmt = (
        select(Job)
        .options(
            selectinload(Job.consigner),
            selectinload(Job.consignee),
            selectinload(Job.origin_location),
            selectinload(Job.destination_location),
            selectinload(Job.billing_client),
            selectinload(Job.issuing_office),
            selectinload(Job.lrs).selectinload(LR.hire_challan),
        )
        .order_by(desc(Job.created_at))
    )
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(Job.issuing_office_id == office_id, Job.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(Job.issuing_office_id == office_id)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Job.job_number.ilike(pattern),
                Job.billing_party.ilike(pattern),
                Job.cargo_description.ilike(pattern),
            )
        )
    if limit is not None:
        stmt = stmt.limit(limit)
    if offset:
        stmt = stmt.offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())

async def get_job_by_id(db: AsyncSession, job_id: int) -> Job:
    stmt = (
        select(Job)
        .options(
            selectinload(Job.consigner),
            selectinload(Job.consignee),
            selectinload(Job.origin_location),
            selectinload(Job.destination_location),
            selectinload(Job.billing_client),
            selectinload(Job.issuing_office),
            selectinload(Job.lrs).selectinload(LR.hire_challan),
        )
        .where(Job.id == job_id)
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Job not found.")
    return job

async def create_job(db: AsyncSession, data: JobCreate, user_id: Optional[int] = None, office_id: Optional[int] = None, auto_commit: bool = True) -> Job:
    target_office_id = data.issuing_office_id or office_id
    if not target_office_id:
        from app.tenant_db.models import Branch
        br_res = await db.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()
    job_dict = data.model_dump()
    series_id = job_dict.pop("job_series_id", None)
    job_number = await allocate_or_validate_voucher_number(db, "JOB", manual_number=data.job_number, issuing_office_id=target_office_id, series_id=series_id)
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
    await db.flush()
    job_id = job.id
    if auto_commit:
        await db.commit()
        return await get_job_by_id(db, job_id)
    else:
        return job

async def update_job(db: AsyncSession, job_id: int, data: JobUpdate) -> Job:
    job = await get_job_by_id(db, job_id)
    if job.status in (JobStatus.CLOSED.value, JobStatus.CANCELLED.value):
        raise AppException(status_code=400, error_code="JOB_LOCKED", message=f"Job is {job.status} and cannot be modified.")
    if job.lrs and len(job.lrs) > 0:
        lr_numbers = [l.lr_number for l in job.lrs if l.lr_number]
        lr_str = ", ".join(lr_numbers) if lr_numbers else str(len(job.lrs))
        raise AppException(
            status_code=400,
            error_code="JOB_LOCKED_LR_ATTACHED",
            message=f"Job number {job.job_number} is used in LR #{lr_str} and cannot be edited."
        )
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(job, field, val)
    if data.billing_client_id and not data.billing_party:
        from app.tenant_db.models import BillingClient
        bc = await db.get(BillingClient, data.billing_client_id)
        if bc:
            job.billing_party = bc.name
    await db.commit()
    return await get_job_by_id(db, job_id)

async def transition_job_status(db: AsyncSession, job_id: int, target_status: JobStatus, remarks: Optional[str] = None) -> Job:
    job = await get_job_by_id(db, job_id)
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
    return await get_job_by_id(db, job_id)

# ===========================================================================
# LR / GR Services & State Machine
# ===========================================================================

async def get_all_lrs(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
    search: Optional[str] = None,
) -> List[LR]:
    stmt = (
        select(LR)
        .options(
            selectinload(LR.job),
            selectinload(LR.consigner),
            selectinload(LR.consignee),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
            selectinload(LR.issuing_office),
            selectinload(LR.billing_customer),
        )
        .order_by(desc(LR.created_at))
    )
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(LR.issuing_office_id == office_id, LR.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(LR.issuing_office_id == office_id)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                LR.lr_number.ilike(pattern),
                LR.vehicle_number.ilike(pattern),
                LR.invoice_no.ilike(pattern),
            )
        )
    if limit is not None:
        stmt = stmt.limit(limit)
    if offset:
        stmt = stmt.offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


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
            selectinload(LR.job),
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
    stmt = (
        select(LR)
        .options(
            selectinload(LR.job),
            selectinload(LR.consigner),
            selectinload(LR.consignee),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
            selectinload(LR.issuing_office),
            selectinload(LR.billing_customer),
            selectinload(LR.load_type_rel),
            selectinload(LR.packing_method),
        )
        .where(LR.id == lr_id)
    )
    res = await db.execute(stmt)
    lr = res.scalar_one_or_none()
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="LR not found.")
    return lr

async def create_lr(db: AsyncSession, data: LRCreate, user_id: Optional[int] = None, office_id: Optional[int] = None, auto_commit: bool = True) -> LR:
    target_office_id = data.issuing_office_id or office_id
    if not target_office_id:
        from app.tenant_db.models import Branch
        br_res = await db.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()
    lr_number = await allocate_or_validate_voucher_number(db, "LR", manual_number=data.lr_number, issuing_office_id=target_office_id, series_id=data.lr_series_id)
    lr_dict = data.model_dump()
    lr_dict["lr_number"] = lr_number
    lr_dict["created_by_user_id"] = user_id
    lr_dict["issuing_office_id"] = target_office_id

    # Canonical single Booking Date
    canonical_date = data.dispatch_date or data.lr_date or date.today()
    lr_dict["lr_date"] = canonical_date
    lr_dict["dispatch_date"] = canonical_date

    # Determine vehicle source from CompanyVehicle master
    if data.vehicle_number:
        clean_v_num = data.vehicle_number.strip().upper()
        lr_dict["vehicle_number"] = clean_v_num
        cv_stmt = select(CompanyVehicle.id).where(func.upper(CompanyVehicle.vehicle_number) == clean_v_num)
        cv_res = await db.execute(cv_stmt)
        if cv_res.scalar_one_or_none():
            lr_dict["vehicle_source"] = "COMPANY"
        elif not lr_dict.get("vehicle_source") or lr_dict["vehicle_source"] == "MARKET":
            lr_dict["vehicle_source"] = "MARKET"

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

    # Handle invoice_items if provided (excluding blank invoice rows)
    items = data.invoice_items or []
    if items:
        serialized_items = []
        for it in items:
            d = it.model_dump() if hasattr(it, "model_dump") else (it if isinstance(it, dict) else dict(it))
            inv_no = str(d.get("invoice_no") or "").strip()
            ewb_no = str(d.get("eway_bill_number") or "").strip()
            inv_val = float(d.get("invoice_value") or 0)
            # Honour invoice-line exclusion rule: blank rows (no invoice no, no eway bill, <=0 value) must not be saved
            if not inv_no and not ewb_no and inv_val <= 0:
                continue
            if "invoice_date" in d and d["invoice_date"] is not None:
                d["invoice_date"] = str(d["invoice_date"])
            if "eway_bill_date" in d and d["eway_bill_date"] is not None:
                d["eway_bill_date"] = str(d["eway_bill_date"])
            if "eway_bill_expiry" in d and d["eway_bill_expiry"] is not None:
                d["eway_bill_expiry"] = str(d["eway_bill_expiry"])
            d["invoice_value"] = inv_val
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

    # Job linkage: use selected job, or auto-create corresponding Job Order
    auto_job = None
    if data.job_id and int(data.job_id) > 0:
        job_stmt = select(Job).options(selectinload(Job.lrs)).where(Job.id == int(data.job_id))
        job_res = await db.execute(job_stmt)
        job = job_res.scalar_one_or_none()
        if not job:
            raise AppException(status_code=404, error_code="NOT_FOUND", message="Selected Job not found.")
        if job.lrs and len(job.lrs) > 0:
            existing_lrs = [l.lr_number for l in job.lrs if l.lr_number]
            lr_desc = f"LR #{', '.join(existing_lrs)}" if existing_lrs else f"{len(job.lrs)} LR(s)"
            raise AppException(
                status_code=400,
                error_code="JOB_ALREADY_LINKED",
                message=f"Job {job.job_number} is already linked to {lr_desc} and cannot be linked again."
            )
        job.status = JobStatus.BOOKED.value
    elif b_status != "Reserved" or (data.consigner_id and data.consignee_id):
        auto_job_number = await allocate_or_validate_voucher_number(
            db, "JOB", manual_number=None, issuing_office_id=target_office_id
        )
        billing_party_name = None
        if data.billing_customer_id:
            from app.tenant_db.models import BillingClient
            bc = await db.get(BillingClient, data.billing_customer_id)
            if bc:
                billing_party_name = bc.name

        if lr_dict.get("status") == LRStatus.CANCELLED.value or b_status == "Canceled":
            auto_job_status = JobStatus.CANCELLED.value
        elif lr_dict.get("status") == "RESERVED" or b_status == "Reserved":
            auto_job_status = JobStatus.OPEN.value
        else:
            auto_job_status = JobStatus.BOOKED.value

        auto_job = Job(
            job_number=auto_job_number,
            job_date=data.lr_date or date.today(),
            consigner_id=data.consigner_id,
            consignee_id=data.consignee_id,
            origin_location_id=data.origin_location_id,
            destination_location_id=data.destination_location_id,
            billing_client_id=data.billing_customer_id,
            billing_party=billing_party_name,
            expected_dispatch_date=data.dispatch_date or data.lr_date or date.today(),
            cargo_description=data.particulars or data.load_type,
            estimated_weight_mt=data.chargeable_weight_mt or data.actual_weight_mt or Decimal("0.000"),
            estimated_packages=data.package_count or 0,
            status=auto_job_status,
            special_instructions=data.remarks,
            created_by_user_id=user_id,
            issuing_office_id=target_office_id,
        )
        db.add(auto_job)
        await db.flush()
        lr_dict["job_id"] = auto_job.id

    lr = LR(**lr_dict)
    if auto_job:
        lr.job = auto_job
    db.add(lr)
    await db.flush()
    saved_lr_id = lr.id

    if auto_commit:
        await db.commit()
        # Eagerly reload with all relationships
        stmt = (
            select(LR)
            .options(
                selectinload(LR.job).selectinload(Job.lrs),
                selectinload(LR.consigner),
                selectinload(LR.consignee),
                selectinload(LR.origin_location),
                selectinload(LR.destination_location),
                selectinload(LR.issuing_office),
                selectinload(LR.billing_customer),
                selectinload(LR.load_type_rel),
                selectinload(LR.packing_method),
            )
            .where(LR.id == saved_lr_id)
        )
        res = await db.execute(stmt)
        lr = res.scalar_one()
    else:
        await db.flush()
    return lr

async def update_lr(db: AsyncSession, lr_id: int, data: LRUpdate) -> LR:
    lr = await db.get(LR, lr_id)
    if not lr:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="LR not found.")
    if lr.status == LRStatus.POD_VERIFIED.value:
        raise AppException(status_code=400, error_code="LR_LOCKED", message="LR is POD_VERIFIED and cannot be modified.")

    if data.job_id is not None and (lr.job_id is None or int(data.job_id) != lr.job_id):
        if int(data.job_id) > 0:
            job_stmt = select(Job).options(selectinload(Job.lrs)).where(Job.id == int(data.job_id))
            job_res = await db.execute(job_stmt)
            target_job = job_res.scalar_one_or_none()
            if not target_job:
                raise AppException(status_code=404, error_code="NOT_FOUND", message="Selected Job not found.")
            other_lrs = [l for l in (target_job.lrs or []) if l.id != lr.id]
            if other_lrs:
                existing_lrs = [l.lr_number for l in other_lrs if l.lr_number]
                lr_desc = f"LR #{', '.join(existing_lrs)}" if existing_lrs else f"{len(other_lrs)} LR(s)"
                raise AppException(
                    status_code=400,
                    error_code="JOB_ALREADY_LINKED",
                    message=f"Job {target_job.job_number} is already linked to {lr_desc} and cannot be linked again."
                )
            target_job.status = JobStatus.BOOKED.value

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(lr, field, val)

    # Sync canonical booking date
    if data.dispatch_date:
        lr.dispatch_date = data.dispatch_date
        lr.lr_date = data.dispatch_date
    elif data.lr_date:
        lr.lr_date = data.lr_date
        lr.dispatch_date = data.lr_date

    # Determine vehicle source from CompanyVehicle master
    if data.vehicle_number:
        clean_v_num = data.vehicle_number.strip().upper()
        lr.vehicle_number = clean_v_num
        cv_stmt = select(CompanyVehicle.id).where(func.upper(CompanyVehicle.vehicle_number) == clean_v_num)
        cv_res = await db.execute(cv_stmt)
        if cv_res.scalar_one_or_none():
            lr.vehicle_source = "COMPANY"
        elif data.vehicle_source:
            lr.vehicle_source = data.vehicle_source

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

    # Handle invoice_items if updated (excluding blank invoice rows)
    if data.invoice_items is not None:
        serialized_items = []
        for it in data.invoice_items:
            d = it.model_dump() if hasattr(it, "model_dump") else (it if isinstance(it, dict) else dict(it))
            inv_no = str(d.get("invoice_no") or "").strip()
            ewb_no = str(d.get("eway_bill_number") or "").strip()
            inv_val = float(d.get("invoice_value") or 0)
            # Honour invoice-line exclusion rule: exclude blank invoice rows (no invoice no, no eway bill, <=0 value)
            if not inv_no and not ewb_no and inv_val <= 0:
                continue
            if "invoice_date" in d and d["invoice_date"] is not None:
                d["invoice_date"] = str(d["invoice_date"])
            if "eway_bill_date" in d and d["eway_bill_date"] is not None:
                d["eway_bill_date"] = str(d["eway_bill_date"])
            if "eway_bill_expiry" in d and d["eway_bill_expiry"] is not None:
                d["eway_bill_expiry"] = str(d["eway_bill_expiry"])
            d["invoice_value"] = inv_val
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
    stmt = (
        select(LR)
        .options(
            selectinload(LR.job).selectinload(Job.lrs),
            selectinload(LR.consigner),
            selectinload(LR.consignee),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
            selectinload(LR.issuing_office),
            selectinload(LR.billing_customer),
            selectinload(LR.load_type_rel),
            selectinload(LR.packing_method),
        )
        .where(LR.id == lr_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()

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
        # If linked Hire Challan is ISSUED or CONFIRMED, advance Hire Challan to TRANSIT
        if lr.hire_challan and lr.hire_challan.status in (HireChallanStatus.ISSUED.value, HireChallanStatus.CONFIRMED.value):
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

async def get_all_hire_challans(db: AsyncSession, office_id: Optional[int] = None, include_unassigned: bool = False, vendor_id: Optional[int] = None) -> List[HireChallan]:
    stmt = (
        select(HireChallan)
        .options(
            selectinload(HireChallan.vendor),
            selectinload(HireChallan.owner),
            selectinload(HireChallan.lr),
            selectinload(HireChallan.issuing_office),
        )
        .order_by(desc(HireChallan.created_at))
    )
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(HireChallan.issuing_office_id == office_id, HireChallan.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(HireChallan.issuing_office_id == office_id)
    if vendor_id:
        stmt = stmt.where(HireChallan.vendor_id == vendor_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_hire_challan(db: AsyncSession, data: HireChallanCreate, office_id: Optional[int] = None, auto_commit: bool = True) -> HireChallan:
    target_office_id = data.issuing_office_id or office_id
    if not target_office_id:
        from app.tenant_db.models import Branch
        br_res = await db.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()
    challan_number = await allocate_or_validate_voucher_number(db, "HIRE_CHALLAN", manual_number=data.challan_number, issuing_office_id=target_office_id, series_id=data.hc_series_id)
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
    await db.flush()

    if hc.owner_id:
        owner = await db.get(VehicleOwner, hc.owner_id)
        if owner:
            from app.tenant_db.models import Vendor
            v_cand = (await db.execute(select(Vendor).where(Vendor.name.ilike(owner.name)))).scalars().first()
            if not v_cand and owner.pan:
                v_cand = (await db.execute(select(Vendor).where(Vendor.pan == owner.pan))).scalars().first()
            if not v_cand:
                v_cand = Vendor(
                    name=owner.name,
                    phone=owner.phone,
                    pan=owner.pan,
                    state=owner.state,
                    city=owner.city,
                    address=owner.address,
                    industry="Transporter / Fleet Owner",
                    account_status="Active",
                    issuing_office_id=target_office_id,
                    is_active=True,
                )
                db.add(v_cand)
                await db.flush()
            from app.modules.accounts.master_ledger_service import get_or_create_party_account
            v_acc = await get_or_create_party_account(db, "VENDOR", v_cand.id, v_cand.name, v_cand.pan)
            if not v_acc.vehicle_owner_id:
                v_acc.vehicle_owner_id = owner.id
                await db.flush()
            if not hc.vendor_id and v_cand:
                hc.vendor_id = v_cand.id
                await db.flush()

    if auto_commit:
        await db.commit()
        await db.refresh(hc)
    else:
        await db.flush()
    return hc

async def update_hire_challan(db: AsyncSession, hc_id: int, data: HireChallanUpdate) -> HireChallan:
    hc = await db.get(HireChallan, hc_id)
    if not hc:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Hire Challan not found.")
    if hc.status in (HireChallanStatus.SETTLED.value, HireChallanStatus.CANCELLED.value):
        raise AppException(status_code=400, error_code="HC_LOCKED", message=f"Challan is {hc.status} and cannot be modified.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
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

    # If owner_id was updated and vendor_id was not explicitly passed, auto-link candidate vendor
    if hc.owner_id and "vendor_id" not in update_dict:
        owner = await db.get(VehicleOwner, hc.owner_id)
        if owner:
            from app.tenant_db.models import Vendor
            v_cand = (await db.execute(select(Vendor).where(Vendor.name.ilike(owner.name)))).scalars().first()
            if not v_cand and owner.pan:
                v_cand = (await db.execute(select(Vendor).where(Vendor.pan == owner.pan))).scalars().first()
            if v_cand:
                hc.vendor_id = v_cand.id

    await db.commit()
    stmt = (
        select(HireChallan)
        .options(
            selectinload(HireChallan.vendor),
            selectinload(HireChallan.owner),
            selectinload(HireChallan.lr),
            selectinload(HireChallan.issuing_office),
        )
        .where(HireChallan.id == hc_id)
    )
    hc = (await db.execute(stmt)).scalar_one()
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
# Loading Slip Services
# ===========================================================================

def _calculate_loading_slip_total(
    total_freight: Decimal,
    advance_amount: Decimal,
    detention_charge: Decimal,
    commission_amount: Decimal,
    mamul_hammali: Decimal,
) -> Decimal:
    return (total_freight + detention_charge) - (advance_amount + commission_amount + mamul_hammali)


async def get_all_loading_slips(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
) -> List[LoadingSlip]:
    stmt = (
        select(LoadingSlip)
        .options(
            selectinload(LoadingSlip.consigner),
            selectinload(LoadingSlip.origin_location),
            selectinload(LoadingSlip.destination_location),
            selectinload(LoadingSlip.lr),
            selectinload(LoadingSlip.issuing_office),
            selectinload(LoadingSlip.slip_series),
        )
        .order_by(desc(LoadingSlip.created_at))
    )
    if office_id:
        if include_unassigned:
            stmt = stmt.where(or_(LoadingSlip.issuing_office_id == office_id, LoadingSlip.issuing_office_id.is_(None)))
        else:
            stmt = stmt.where(LoadingSlip.issuing_office_id == office_id)
    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


async def get_loading_slip_by_id(db: AsyncSession, slip_id: int) -> LoadingSlip:
    stmt = (
        select(LoadingSlip)
        .options(
            selectinload(LoadingSlip.consigner),
            selectinload(LoadingSlip.origin_location),
            selectinload(LoadingSlip.destination_location),
            selectinload(LoadingSlip.lr),
            selectinload(LoadingSlip.issuing_office),
            selectinload(LoadingSlip.slip_series),
        )
        .where(LoadingSlip.id == slip_id)
    )
    slip = (await db.execute(stmt)).scalar_one_or_none()
    if not slip:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Loading Slip not found.")
    return slip


async def _populate_loading_slip_relations(db: AsyncSession, slip_dict: Dict[str, Any]) -> None:
    if slip_dict.get("consigner_id"):
        from app.tenant_db.models import Consigner
        cons = await db.get(Consigner, slip_dict["consigner_id"])
        if cons:
            slip_dict["consigner_name"] = slip_dict.get("consigner_name") or cons.name
            if not slip_dict.get("phone") and cons.phone:
                slip_dict["phone"] = cons.phone
            if not slip_dict.get("email") and cons.email:
                slip_dict["email"] = cons.email
            if not slip_dict.get("pan") and cons.pan:
                slip_dict["pan"] = cons.pan

    if slip_dict.get("origin_location_id"):
        from app.tenant_db.models import Location
        orig = await db.get(Location, slip_dict["origin_location_id"])
        if orig:
            slip_dict["loading_point"] = orig.city_name

    if slip_dict.get("destination_location_id"):
        from app.tenant_db.models import Location
        dest = await db.get(Location, slip_dict["destination_location_id"])
        if dest:
            slip_dict["unloading_point"] = dest.city_name


async def create_loading_slip(
    db: AsyncSession,
    data: LoadingSlipCreate,
    user_id: Optional[int] = None,
    office_id: Optional[int] = None,
) -> LoadingSlip:
    target_office_id = data.issuing_office_id or office_id
    if not target_office_id:
        from app.tenant_db.models import Branch
        br_res = await db.execute(select(Branch.id).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1))
        target_office_id = br_res.scalar_one_or_none()

    slip_number = await allocate_or_validate_voucher_number(
        db,
        "LOADING_SLIP",
        manual_number=data.slip_number,
        issuing_office_id=target_office_id,
        series_id=data.slip_series_id,
    )

    slip_dict = data.model_dump()
    slip_dict["slip_number"] = slip_number
    slip_dict["issuing_office_id"] = target_office_id
    slip_dict["created_by_user_id"] = user_id
    slip_dict["vehicle_number"] = data.vehicle_number.strip().upper()
    if not slip_dict.get("advance_diesel_slip"):
        slip_dict["advance_diesel_slip"] = Decimal("0.00")

    await _populate_loading_slip_relations(db, slip_dict)

    slip_dict["total_amount"] = _calculate_loading_slip_total(
        slip_dict.get("total_freight") or Decimal("0.00"),
        slip_dict.get("advance_amount") or Decimal("0.00"),
        slip_dict.get("detention_charge") or Decimal("0.00"),
        slip_dict.get("commission_amount") or Decimal("0.00"),
        slip_dict.get("mamul_hammali") or Decimal("0.00"),
    )

    slip = LoadingSlip(**slip_dict)
    db.add(slip)
    await db.commit()
    return await get_loading_slip_by_id(db, slip.id)


async def update_loading_slip(db: AsyncSession, slip_id: int, data: LoadingSlipUpdate) -> LoadingSlip:
    slip = await get_loading_slip_by_id(db, slip_id)
    update_dict = data.model_dump(exclude_unset=True)
    if "vehicle_number" in update_dict and update_dict["vehicle_number"]:
        update_dict["vehicle_number"] = update_dict["vehicle_number"].strip().upper()

    await _populate_loading_slip_relations(db, update_dict)

    for field, val in update_dict.items():
        setattr(slip, field, val)

    slip.total_amount = _calculate_loading_slip_total(
        slip.total_freight or Decimal("0.00"),
        slip.advance_amount or Decimal("0.00"),
        slip.detention_charge or Decimal("0.00"),
        slip.commission_amount or Decimal("0.00"),
        slip.mamul_hammali or Decimal("0.00"),
    )

    await db.commit()
    return await get_loading_slip_by_id(db, slip.id)

# ===========================================================================
# E-Way Bill Services (Manual Entry per Rules §2)
# ===========================================================================

async def get_all_eway_bills(
    db: AsyncSession,
    office_id: Optional[int] = None,
    include_unassigned: bool = False,
) -> List[EWayBill]:
    stmt = select(EWayBill).order_by(desc(EWayBill.created_at))
    if office_id:
        stmt = stmt.outerjoin(LR, EWayBill.lr_id == LR.id)
        if include_unassigned:
            stmt = stmt.where(
                or_(
                    LR.issuing_office_id == office_id,
                    LR.issuing_office_id.is_(None),
                    EWayBill.lr_id.is_(None),
                )
            )
        else:
            stmt = stmt.where(LR.issuing_office_id == office_id)
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
    company = await get_company_setting(db)

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


SIM_RATE_PER_DAY = Decimal("8.50")


async def check_sim_wallet_balance(
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
    required_amount: Decimal = Decimal("8.50"),
) -> Tuple[bool, Decimal]:
    """
    Checks whether tenant has at least `required_amount` in panther_control without debiting yet.
    """
    if not tenant_id and not company_code:
        return True, Decimal("999.00")

    from app.core.database import ControlSessionLocal
    from app.control.models import Tenant as ControlTenant
    from sqlalchemy import select, or_

    try:
        async with ControlSessionLocal() as session:
            stmt = select(ControlTenant.sim_wallet_balance).where(
                or_(ControlTenant.tenant_id == tenant_id, ControlTenant.company_code == company_code)
            )
            res = await session.execute(stmt)
            bal = res.scalar_one_or_none()
            current_balance = Decimal(str(bal or 0.00))
            return current_balance >= required_amount, current_balance
    except Exception as e:
        logger.error(f"Error checking SIM wallet balance: {e}")
        return False, Decimal("0.00")


async def check_and_deduct_sim_credit(
    tenant_db: Optional[AsyncSession] = None,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
    vehicle_number: Optional[str] = None,
    trip_id: Optional[Union[str, int]] = None,
    days_billed: int = 1,
    description: Optional[str] = None,
) -> Tuple[bool, Decimal, str]:
    """
    Checks if tenant has sufficient SIM tracking wallet balance in panther_control database.
    Rate: ₹8.50 per trip per 24 hours (day).
    If balance >= days_billed * 8.50:
      Debits the amount in panther_control,
      Creates SimWalletTransaction strictly in tenant-specific database,
      Returns (True, remaining_balance, "").
    If balance is insufficient:
      Returns (False, current_balance, error_message).
    """
    if not tenant_id and not company_code:
        # Fallback when testing without tenant context
        return True, Decimal("999.00"), ""

    from app.core.database import ControlSessionLocal, get_tenant_session_maker
    from app.control.models import Tenant as ControlTenant
    from app.tenant_db.models import SimWalletTransaction
    from sqlalchemy import select, or_

    charge_amount = Decimal(str(round(days_billed * 8.50, 2)))

    try:
        async with ControlSessionLocal() as session:
            stmt = select(ControlTenant).where(
                or_(ControlTenant.tenant_id == tenant_id, ControlTenant.company_code == company_code)
            ).with_for_update()
            res = await session.execute(stmt)
            tenant_obj = res.scalar_one_or_none()
            if not tenant_obj:
                return False, Decimal("0.00"), "Tenant record not found in control database."

            current_balance = Decimal(str(tenant_obj.sim_wallet_balance or 0.00))
            if current_balance < charge_amount:
                return False, current_balance, (
                    f"SIM Tracking Wallet balance insufficient (₹{current_balance:.2f} available, ₹{charge_amount:.2f} required). "
                    f"Tariff is strictly ₹8.50 per trip per 24 hours. Recharges are managed by system administrator."
                )

            tenant_obj.sim_wallet_balance = current_balance - charge_amount
            new_balance = Decimal(str(tenant_obj.sim_wallet_balance))
            target_company_code = tenant_obj.company_code or company_code
            await session.commit()

        # Record audit transaction in tenant-specific database (NEVER in panther_control)
        tx_data = {
            "transaction_type": "DEBIT",
            "amount": charge_amount,
            "rate_per_day": SIM_RATE_PER_DAY,
            "days_billed": days_billed,
            "vehicle_number": vehicle_number,
            "trip_id": str(trip_id) if trip_id is not None else None,
            "description": description or f"SIM Tracking charge for {vehicle_number} ({days_billed} x 24hr cycle)",
            "balance_after": new_balance,
            "created_at": datetime.now(timezone.utc),
        }

        if tenant_db:
            try:
                tx = SimWalletTransaction(**tx_data)
                tenant_db.add(tx)
                await tenant_db.commit()
            except Exception as e:
                await tenant_db.rollback()
                logger.warning(f"Could not record SimWalletTransaction in provided tenant_db: {e}")
        elif target_company_code:
            try:
                resolved_db_name = f"panther_tenant_{target_company_code.lower()}"
                t_session_maker = get_tenant_session_maker(resolved_db_name)
                async with t_session_maker() as t_session:
                    tx = SimWalletTransaction(**tx_data)
                    t_session.add(tx)
                    await t_session.commit()
            except Exception as e:
                logger.warning(f"Could not record SimWalletTransaction in tenant session: {e}")

        return True, new_balance, ""
    except Exception as e:
        logger.error(f"Error in check_and_deduct_sim_credit: {e}", exc_info=True)
        return False, Decimal("0.00"), f"Wallet processing error: {str(e)}"


async def create_sim_trip(
    db: AsyncSession,
    data: SIMTripCreate,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
) -> SIMTripRecord:
    """
    Creates a new SIM-based trip via Freight Tiger, initiating carrier driver consent SMS.
    Deducts ₹8.50 for Day 1 (first 24-hr window) from the SIM Tracking Wallet upon creation.
    """
    vehicle_num = data.vehicle_number.strip().upper()
    driver_phone = data.driver_phone.strip()
    driver_name = data.driver_name
    origin_addr = data.origin_address
    dest_addr = data.destination_address
    lr_number = data.lr_number
    route_code = data.route_code

    # 1. Pre-flight check: ensure tenant has at least ₹8.50 before calling Freight Tiger
    has_funds, current_bal = await check_sim_wallet_balance(
        tenant_id=tenant_id,
        company_code=company_code,
        required_amount=Decimal("8.50"),
    )
    if not has_funds:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=(
                f"SIM Tracking Wallet balance insufficient (₹{current_bal:.2f} available, ₹8.50 required). "
                f"Tariff is strictly ₹8.50 per trip per 24 hours. Recharges are managed by system administrator."
            ),
            error_code="INSUFFICIENT_SIM_WALLET_BALANCE",
            details={"current_balance": float(current_bal), "required": 8.50},
        )

    consignor_name = data.consignor_name
    consignee_name = data.consignee_name
    ewb_number = data.ewb_number
    ewb_expiry = None

    # 2. If linked to LR, populate missing details from LR consignment
    if data.lr_id:
        lr_stmt = select(LR).options(
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
            selectinload(LR.consigner),
            selectinload(LR.consignee),
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
                orig_loc = lr_obj.origin_location
                origin_addr = f"{getattr(orig_loc, 'city_name', '') or getattr(orig_loc, 'name', '')}, {getattr(orig_loc, 'state', '') or ''}".strip(", ")
            if not dest_addr and lr_obj.destination_location:
                dest_loc = lr_obj.destination_location
                dest_addr = f"{getattr(dest_loc, 'city_name', '') or getattr(dest_loc, 'name', '')}, {getattr(dest_loc, 'state', '') or ''}".strip(", ")
            if not consignor_name and lr_obj.consigner:
                consignor_name = lr_obj.consigner.name
            if not consignee_name and lr_obj.consignee:
                consignee_name = lr_obj.consignee.name
            if not ewb_number and lr_obj.invoice_no:
                ewb_number = lr_obj.invoice_no
            if lr_obj.eway_bill_expiry:
                ewb_expiry = datetime.combine(lr_obj.eway_bill_expiry, datetime.min.time(), tzinfo=timezone.utc)

    # 3. Check for company setting credentials override
    comp_setting = await get_company_setting(db)

    ft_client = FreightTigerClient(
        base_url=comp_setting.ft_base_url if comp_setting else None,
        auth_token=comp_setting.ft_auth_token if comp_setting else None,
    )

    # 4. Call Freight Tiger API
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

    resolved_operator = data.operator_name or ft_resp.get("operator_name") or detect_telecom_operator(driver_phone)

    # 5. Create local trip record in tenant DB
    now_utc = datetime.now(timezone.utc)
    sim_record = SIMTripRecord(
        feed_unique_id=ft_resp["feed_unique_id"],
        ft_trip_id=ft_resp.get("trip_id"),
        lr_id=data.lr_id,
        vehicle_number=vehicle_num,
        driver_name=driver_name,
        driver_phone=driver_phone,
        operator_name=resolved_operator,
        consignor_name=consignor_name or "NA",
        consignee_name=consignee_name or "NA",
        milestone=data.milestone or "In Transit",
        trip_direction=data.trip_direction or "Outbound",
        is_starred=bool(data.is_starred),
        is_delayed=False,
        ewb_number=ewb_number,
        ewb_expiry=ewb_expiry,
        comments=[],
        consent_status=SIMConsentStatus.PENDING.value,
        is_consent_done=False,
        status="Open",
        status_code=1,
        share_url=ft_resp.get("share_url"),
        origin_address=origin_addr,
        destination_address=dest_addr,
        route_code=route_code,
        last_synced_at=now_utc,
        last_billed_at=now_utc,
        billing_cycles_charged=1,
    )
    db.add(sim_record)
    await db.commit()
    await db.refresh(sim_record)

    # 6. Deduct ₹8.50 for Day 1 (first 24-hr window) with generated trip_id
    allowed, bal, err_msg = await check_and_deduct_sim_credit(
        tenant_db=db,
        tenant_id=tenant_id,
        company_code=company_code,
        vehicle_number=vehicle_num,
        trip_id=str(sim_record.id),
        days_billed=1,
        description=f"Trip initiation (Day 1 / 24h cycle) for vehicle {vehicle_num} (Trip #{sim_record.id})",
    )
    if not allowed:
        logger.warning(f"SIM tracking initiated for trip #{sim_record.id} but credit deduction reported: {err_msg}")

    # Fallback: link any previous unlinked pending debit transaction for this vehicle
    try:
        from app.tenant_db.models import SimWalletTransaction
        tx_stmt = select(SimWalletTransaction).where(
            SimWalletTransaction.vehicle_number == vehicle_num,
            SimWalletTransaction.trip_id.is_(None)
        ).order_by(desc(SimWalletTransaction.id)).limit(1)
        tx_res = await db.execute(tx_stmt)
        tx_obj = tx_res.scalar_one_or_none()
        if tx_obj:
            tx_obj.trip_id = str(sim_record.id)
            await db.commit()
    except Exception as e:
        await db.rollback()
        logger.warning(f"Could not link legacy trip_id to SimWalletTransaction: {e}")

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


async def sync_sim_trip(
    db: AsyncSession,
    trip: SIMTripRecord,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
) -> SIMTripRecord:
    """
    Polls Freight Tiger for the latest tracking state, telecom consent,
    and cell-tower location fixes, updating the trip and recording a Telemetry Ping.
    Charges ₹8.50 for each subsequent 24-hr period exceeded while trip is active.
    Location fetches within the paid 24-hr window are unlimited with ₹0 deduction.
    """
    now_utc = datetime.now(timezone.utc)

    # If trip is open, check if it has exceeded 24 hours from last_billed_at
    if trip.status and trip.status.lower() != "closed" and not trip.closed_at:
        billed_anchor = trip.last_billed_at or trip.created_at or now_utc
        if billed_anchor.tzinfo is None:
            billed_anchor = billed_anchor.replace(tzinfo=timezone.utc)

        seconds_elapsed = (now_utc - billed_anchor).total_seconds()
        if seconds_elapsed >= 86400:
            cycles_exceeded = int(seconds_elapsed // 86400)
            if cycles_exceeded >= 1:
                # Deduct ₹8.50 per 24hr cycle
                allowed, bal, err_msg = await check_and_deduct_sim_credit(
                    tenant_db=db,
                    tenant_id=tenant_id,
                    company_code=company_code,
                    vehicle_number=trip.vehicle_number,
                    trip_id=str(trip.id),
                    days_billed=cycles_exceeded,
                    description=f"Trip exceeded 24 hours: renewed for {cycles_exceeded} day(s) (Day {(trip.billing_cycles_charged or 1) + 1}-{(trip.billing_cycles_charged or 1) + cycles_exceeded}) for vehicle {trip.vehicle_number}",
                )
                if not allowed:
                    raise AppException(
                        status_code=status.HTTP_402_PAYMENT_REQUIRED,
                        message=err_msg,
                        error_code="INSUFFICIENT_SIM_WALLET_BALANCE",
                        details={"current_balance": float(bal), "cycles_needed": cycles_exceeded, "rate_per_day": 8.50},
                    )

                trip.billing_cycles_charged = (trip.billing_cycles_charged or 1) + cycles_exceeded
                trip.last_billed_at = billed_anchor + timedelta(seconds=cycles_exceeded * 86400)
                await db.commit()

    comp_setting = await get_company_setting(db)

    ft_client = FreightTigerClient(
        base_url=comp_setting.ft_base_url if comp_setting else None,
        auth_token=comp_setting.ft_auth_token if comp_setting else None,
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
    trip.operator_name = trip.operator_name or ft_data.get("operator_name") or detect_telecom_operator(trip.driver_phone)

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
        speed_raw = ft_data.get("speed_kmh")
        speed_val = Decimal(str(round(float(speed_raw), 1))) if speed_raw is not None else Decimal("0.0")

        ping = TrackingPing(
            vehicle_number=trip.vehicle_number,
            tracking_mode=TrackingMode.SIM.value,
            identifier=trip.driver_phone,
            last_latitude=trip.last_latitude,
            last_longitude=trip.last_longitude,
            location_name=trip.last_location_address or "SIM Cell Tower Triangulation",
            speed_kmh=speed_val,
            last_ping_at=rec_at,
            status="ACTIVE",
        )
        db.add(ping)

    if ft_data.get("distance_remaining_km") is not None:
        trip.distance_remaining_km = Decimal(str(round(float(ft_data["distance_remaining_km"]), 2)))
        if trip.distance_remaining_km <= Decimal("5.0"):
            trip.milestone = "At Unloading"
        elif trip.status.lower() == "open" and not trip.milestone:
            trip.milestone = "In Transit"

    if ft_data.get("total_distance_km") is not None:
        trip.total_distance_km = Decimal(str(round(float(ft_data["total_distance_km"]), 2)))

    if ft_data.get("eta"):
        trip.eta = parse_iso_or_utc(ft_data.get("eta"))
        if trip.eta and trip.eta < now_utc and trip.status.lower() == "open":
            trip.is_delayed = True
        else:
            trip.is_delayed = False

    if ft_data.get("eta_updated_at"):
        trip.eta_updated_at = parse_iso_or_utc(ft_data.get("eta_updated_at"))

    trip.last_synced_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(trip)
    return trip


async def update_sim_trip(
    db: AsyncSession,
    trip: SIMTripRecord,
    update_data: SIMTripUpdate,
) -> SIMTripRecord:
    """Updates operational metadata for an existing SIM tracking trip."""
    for field, val in update_data.model_dump(exclude_unset=True).items():
        if hasattr(trip, field) and val is not None:
            setattr(trip, field, val)
    await db.commit()
    await db.refresh(trip)
    return trip


async def add_sim_trip_comment(
    db: AsyncSession,
    trip: SIMTripRecord,
    comment_text: str,
    author: Optional[str] = None,
) -> SIMTripRecord:
    """Appends an operational checkpoint comment to the trip record."""
    now_iso = datetime.now(timezone.utc).isoformat()
    existing_comments = list(trip.comments or [])
    new_comment = {
        "id": len(existing_comments) + 1,
        "text": comment_text,
        "author": author or "Dispatcher",
        "created_at": now_iso,
    }
    existing_comments.append(new_comment)
    trip.comments = existing_comments
    await db.commit()
    await db.refresh(trip)
    return trip


async def close_sim_trip(db: AsyncSession, trip: SIMTripRecord, comment: Optional[str] = None) -> SIMTripRecord:
    """
    Closes the SIM trip in Freight Tiger and marks status Closed in PantherTMS.
    """
    comp_setting = await get_company_setting(db)

    ft_client = FreightTigerClient(
        base_url=comp_setting.ft_base_url if comp_setting else None,
        auth_token=comp_setting.ft_auth_token if comp_setting else None,
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


async def simulate_sim_consent(
    db: AsyncSession,
    trip: SIMTripRecord,
    is_consent_done: bool = True,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
) -> SIMTripRecord:
    """
    Toggles simulated telecom consent and immediately syncs the location.
    """
    freight_tiger_client.set_simulated_consent(trip.feed_unique_id, is_consent_done)
    trip.is_consent_done = is_consent_done
    trip.consent_status = SIMConsentStatus.ACCEPTED.value if is_consent_done else SIMConsentStatus.PENDING.value
    await db.commit()
    return await sync_sim_trip(db, trip, tenant_id=tenant_id, company_code=company_code)


async def sync_all_active_sim_trips(
    db: AsyncSession,
    tenant_id: Optional[str] = None,
    company_code: Optional[str] = None,
) -> int:
    """
    Refreshes location & consent across all open SIM trips.
    """
    stmt = select(SIMTripRecord).where(SIMTripRecord.status.ilike("open"))
    res = await db.execute(stmt)
    trips = list(res.scalars().all())
    count = 0
    for t in trips:
        try:
            await sync_sim_trip(db, t, tenant_id=tenant_id, company_code=company_code)
            count += 1
        except Exception as exc:
            logger.warning(f"Failed to sync SIM trip #{t.id}: {exc}")
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

    # 1. Cooldown Check (Default 10 minutes = 600s, configurable in API Center)
    company_rec = await get_company_setting(db)
    cooldown_minutes = (
        company_rec.fastag_cooldown_minutes
        if company_rec and company_rec.fastag_cooldown_minutes is not None
        else 10
    )
    cooldown_seconds = max(60, cooldown_minutes * 60)

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
        if passed < cooldown_seconds and passed >= 0 and not force_sync:
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
                orig_name = (
                    lr_obj.origin_location.city_name
                    if lr_obj.origin_location and getattr(lr_obj.origin_location, "city_name", None)
                    else (getattr(lr_obj.origin_location, "name", None) or "Origin")
                )
                dest_name = (
                    lr_obj.destination_location.city_name
                    if lr_obj.destination_location and getattr(lr_obj.destination_location, "city_name", None)
                    else (getattr(lr_obj.destination_location, "name", None) or "Destination")
                )
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
        "cooldown_seconds": cooldown_seconds,
        "cooldown_minutes": cooldown_minutes,
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




# ==============================================================================
# WheelsEye GPS Tracking Telemetry Service Implementation
# ==============================================================================

_WHEELSEYE_FLEET_CACHE: Dict[str, Tuple[float, List[dict]]] = {}
_GEOCODE_CACHE: Dict[str, str] = {}


async def get_gps_config(db: AsyncSession) -> GPSConfigResponse:
    """Returns configuration for GPS tracking, Google Maps API key, and status."""
    setting = await get_company_setting(db)
    has_token = bool(setting and setting.wheelseye_api_token)
    is_active = bool(setting.is_wheelseye_active if setting and setting.is_wheelseye_active is not None else True)
    has_google_maps = bool(settings.GOOGLE_MAPS_API_KEY and len(settings.GOOGLE_MAPS_API_KEY) > 10)

    return GPSConfigResponse(
        is_configured=has_token,
        wheelseye_active=is_active,
        google_maps_configured=has_google_maps,
        default_map_engine="google" if has_google_maps else "leaflet",
        google_maps_api_key=settings.GOOGLE_MAPS_API_KEY or "",
    )


def extract_location_text(v: dict) -> Optional[str]:
    """Port of legacy extractLocationText to preserve detailed landmark text from WheelsEye."""
    if not isinstance(v, dict):
        return None

    str_fields = [
        "location", "address", "loc", "place", "placeName", "currentLocation",
        "lastLocation", "formattedAddress", "locationAddress", "nearBy", "nearby",
        "landmark", "poi", "cityName", "locationName", "lastUpdateLocation",
        "currentLoc", "addressDetail", "geoAddress", "addr"
    ]

    for key in str_fields:
        val = v.get(key)
        if isinstance(val, str):
            trimmed = val.strip()
            if len(trimmed) > 3 and "null" not in trimmed.lower() and not trimmed.replace(".", "", 1).isdigit() and "coordinates" not in trimmed.lower():
                return trimmed
        elif isinstance(val, dict):
            parts = [
                val.get(k, "") for k in ["address", "landmark", "name", "location", "place", "road", "suburb", "city", "district", "state", "pincode"]
                if val.get(k) and isinstance(val.get(k), str)
            ]
            sub_name = ", ".join(parts).strip()
            if len(sub_name) > 3:
                return sub_name

    for sub_key in ["position", "lastData", "data"]:
        if isinstance(v.get(sub_key), dict):
            sub = extract_location_text(v[sub_key])
            if sub:
                return sub

    return None


async def reverse_geocode_point(lat: float, lng: float) -> Optional[str]:
    """Reverse geocoding with in-memory caching."""
    if not lat or not lng or (lat == 0 and lng == 0):
        return None

    cache_key = f"{round(lat, 4)}_{round(lng, 4)}"
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1&accept-language=en"
    try:
        async with httpx.AsyncClient(timeout=4.0, verify=False) as client:
            resp = await client.get(
                url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "Panther-TMS-GPS/2.0 (telemetry@panther.com)"
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                display_name = data.get("display_name")
                if display_name:
                    _GEOCODE_CACHE[cache_key] = display_name
                    return display_name
    except Exception as e:
        logger.debug(f"Reverse geocode lookup error for ({lat}, {lng}): {e}")

    return None


async def fetch_all_wheelseye_vehicles(base_url: str, token: str) -> List[dict]:
    """Fetches all vehicles across all pages from WheelsEye API with batching and 12s cache."""
    cache_key = f"{base_url}_{token}"
    now = time.time()
    if cache_key in _WHEELSEYE_FLEET_CACHE:
        cached_time, cached_data = _WHEELSEYE_FLEET_CACHE[cache_key]
        if now - cached_time < 12.0:
            return cached_data

    clean_base = base_url.rstrip("/")
    first_url = f"{clean_base}/currentLoc?accessToken={token}&pageNo=1"

    all_raw: List[dict] = []
    total_pages = 1

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            r1 = await client.get(first_url, headers={"Accept": "application/json", "User-Agent": "Panther-TMS/2.0"})
            if r1.status_code == 200:
                data1 = r1.json()
                d_obj = data1.get("data")
                if isinstance(d_obj, dict):
                    total_pages = int(d_obj.get("totalPages", 1) or 1)
                    first_list = d_obj.get("list") or d_obj.get("vehicles") or []
                    if isinstance(first_list, list):
                        all_raw.extend([x for x in first_list if isinstance(x, dict)])
                elif isinstance(d_obj, list):
                    all_raw.extend([x for x in d_obj if isinstance(x, dict)])

            if total_pages > 1:
                max_pages = min(total_pages, 40)
                tasks = []
                for p in range(2, max_pages + 1):
                    p_url = f"{clean_base}/currentLoc?accessToken={token}&pageNo={p}"
                    tasks.append(client.get(p_url, headers={"Accept": "application/json", "User-Agent": "Panther-TMS/2.0"}))

                import asyncio
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                for resp in responses:
                    if isinstance(resp, httpx.Response) and resp.status_code == 200:
                        try:
                            p_json = resp.json()
                            p_data = p_json.get("data")
                            if isinstance(p_data, dict):
                                items = p_data.get("list") or p_data.get("vehicles") or []
                                if isinstance(items, list):
                                    all_raw.extend([x for x in items if isinstance(x, dict)])
                        except Exception:
                            pass
    except Exception as exc:
        logger.warning(f"Error fetching WheelsEye fleet from {clean_base}: {exc}")

    _WHEELSEYE_FLEET_CACHE[cache_key] = (now, all_raw)
    return all_raw


async def get_company_vehicles_set(db: AsyncSession) -> set:
    """Returns set of cleaned company vehicle registration numbers."""
    company_set = set()
    try:
        res = await db.execute(select(CompanyVehicle.vehicle_number))
        for v in res.scalars().all():
            if v:
                company_set.add(clean_vehicle_number(v))
    except Exception:
        pass
    return company_set


async def get_trip_details_from_db(db: AsyncSession, vehicle_num: str) -> GPSTripInfo:
    """Finds active or most recent LR consignment trip for this vehicle."""
    clean_v = clean_vehicle_number(vehicle_num)
    trip = GPSTripInfo()
    if not clean_v:
        return trip

    try:
        from app.tenant_db.models import Location
        stmt = (
            select(LR)
            .where(func.replace(LR.vehicle_number, ' ', '').ilike(f"%{clean_v}%"))
            .order_by(LR.id.desc())
            .limit(1)
        )
        res = await db.execute(stmt)
        lr = res.scalar_one_or_none()

        if lr:
            trip.lr_no = lr.lr_number
            waypoints = []
            if lr.origin_location_id:
                loc_res = await db.execute(select(Location.name).where(Location.id == lr.origin_location_id))
                origin_name = loc_res.scalar_one_or_none()
                if origin_name:
                    trip.origin = origin_name
                    waypoints.append(origin_name)
            if lr.destination_location_id:
                loc_res = await db.execute(select(Location.name).where(Location.id == lr.destination_location_id))
                dest_name = loc_res.scalar_one_or_none()
                if dest_name:
                    trip.destination = dest_name
                    waypoints.append(dest_name)
            trip.waypoints = waypoints
    except Exception as e:
        logger.debug(f"Failed to lookup LR trip for {vehicle_num}: {e}")

    return trip


def format_wheelseye_vehicle(v: dict, company_set: set) -> Optional[GPSVehicleItem]:
    """Transforms raw WheelsEye vehicle payload into standard GPSVehicleItem."""
    if not isinstance(v, dict):
        return None

    raw_vnum = (
        v.get("vehicleNumber") or v.get("vehicle_number") or
        v.get("truckNumber") or v.get("regNo") or v.get("vehicleNo") or ""
    )
    v_num = str(raw_vnum).strip().upper()
    if not v_num:
        return None

    speed = int(v.get("speed") or v.get("currentSpeed") or v.get("spd") or 0)
    ignition = bool(v.get("ignition") or v.get("ignitionStatus") or v.get("acc"))
    gps_time = v.get("gpsTime") or v.get("lastLocationUpdate") or v.get("timestamp") or v.get("lastUpdate") or ""

    time_diff_sec = 0
    formatted_time = "Recent"
    inactive_text = "Live"

    if gps_time:
        ts = None
        if isinstance(gps_time, (int, float)):
            ts = int(gps_time / 1000) if gps_time > 9999999999 else int(gps_time)
        elif isinstance(gps_time, str):
            try:
                if gps_time.isdigit():
                    val = int(gps_time)
                    ts = int(val / 1000) if val > 9999999999 else val
                else:
                    parsed = datetime.fromisoformat(gps_time.replace("Z", "+00:00"))
                    ts = int(parsed.timestamp())
            except Exception:
                ts = None

        if ts:
            time_diff_sec = max(0, int(time.time() - ts))
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            formatted_time = dt.strftime("%d %b %y, %I:%M %p")

            days = time_diff_sec // 86400
            hours = (time_diff_sec % 86400) // 3600
            mins = (time_diff_sec % 3600) // 60

            if days > 0:
                inactive_text = f"No info: {days}d {hours}h"
            elif hours > 0:
                inactive_text = f"Stopped: {hours}h {mins}m"
            else:
                inactive_text = f"Updated {mins}m ago"

    if time_diff_sec > 86400 * 2:
        status_cat = "no_signal"
    elif speed > 0:
        status_cat = "running"
        inactive_text = f"Moving at {speed} km/h"
    else:
        status_cat = "stopped"

    clean_v = clean_vehicle_number(v_num)
    is_company = False
    if clean_v in company_set:
        is_company = True
    elif "OWN" in str(v.get("ownership", "")).upper() or "COMPANY" in str(v.get("ownership", "")).upper():
        is_company = True
    elif v.get("isOwn") or v.get("isCompany"):
        is_company = True
    elif "PANTHER" in str(v.get("groupName", "")).upper():
        is_company = True
    elif not company_set:
        is_company = True

    try:
        lat = float(v.get("latitude") or v.get("lat") or 0.0)
        lng = float(v.get("longitude") or v.get("lng") or v.get("lon") or 0.0)
    except (ValueError, TypeError):
        lat, lng = 0.0, 0.0

    loc_name = extract_location_text(v)
    if not loc_name:
        loc_name = f"Near Lat: {round(lat, 4)}, Lng: {round(lng, 4)}" if (lat != 0 and lng != 0) else "Location unavailable"

    today_dist = 0.0
    raw_dist = v.get("todayDistance") or v.get("todayKm")
    if raw_dist is not None:
        try:
            d_val = float(raw_dist)
            today_dist = round(d_val / 1000, 1) if d_val > 1000 else round(d_val, 1)
        except (ValueError, TypeError):
            pass

    return GPSVehicleItem(
        vehicleNumber=v_num,
        speed=speed,
        ignition=ignition,
        status=status_cat,
        isCompany=is_company,
        fleetType="Company Vehicle" if is_company else "Market Vehicle",
        groupName=v.get("groupName") or v.get("branchName") or "Panther Logistics",
        lastUpdated=formatted_time,
        rawTimestamp=gps_time,
        address=loc_name,
        latitude=lat,
        longitude=lng,
        heading=float(v.get("angle") or v.get("heading") or v.get("bearing") or 0.0),
        todayKm=today_dist,
        inactiveTime=inactive_text,
        battery=int(v.get("battery") or 100),
        signal=1 if status_cat == "no_signal" else 4,
        camera=True,
        expired=False,
        odometer=v.get("odometer") or v.get("totalDistance"),
        raw=v,
    )


async def get_gps_fleet(db: AsyncSession) -> GPSFleetResponse:
    """Fetches full vehicle list for the tenant from WheelsEye and computes metrics."""
    setting = await get_company_setting(db)
    token = setting.wheelseye_api_token if setting else None
    base_url = (setting.wheelseye_base_url if setting and setting.wheelseye_base_url else "https://api.wheelseye.com")

    if not token or not setting or not setting.is_wheelseye_active:
        return GPSFleetResponse(
            success=False,
            totalCount=0,
            counts=GPSFleetCounts(),
            companyVehicles=[],
            marketVehicles=[],
            vehicles=[],
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        )

    company_set = await get_company_vehicles_set(db)
    raw_list = await fetch_all_wheelseye_vehicles(base_url, token)

    vehicles_dict: Dict[str, GPSVehicleItem] = {}
    company_vehicles: List[GPSVehicleItem] = []
    market_vehicles: List[GPSVehicleItem] = []

    for item in raw_list:
        formatted = format_wheelseye_vehicle(item, company_set)
        if formatted and formatted.vehicleNumber not in vehicles_dict:
            vehicles_dict[formatted.vehicleNumber] = formatted
            if formatted.isCompany:
                company_vehicles.append(formatted)
            else:
                market_vehicles.append(formatted)

    v_list = list(vehicles_dict.values())
    counts = GPSFleetCounts(
        all=len(v_list),
        company=len(company_vehicles),
        market=len(market_vehicles),
        running=sum(1 for v in v_list if v.status == "running"),
        stopped=sum(1 for v in v_list if v.status == "stopped"),
        no_signal=sum(1 for v in v_list if v.status == "no_signal"),
    )

    return GPSFleetResponse(
        success=True,
        totalCount=len(v_list),
        counts=counts,
        companyVehicles=company_vehicles,
        marketVehicles=market_vehicles,
        vehicles=v_list,
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    )


async def track_gps_single_vehicle(db: AsyncSession, vehicle_number: str) -> GPSTrackResponse:
    """Tracks a single vehicle by vehicle registration number."""
    clean_v = clean_vehicle_number(vehicle_number)
    if not clean_v:
        return GPSTrackResponse(
            success=False,
            message="Vehicle number is required.",
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        )

    setting = await get_company_setting(db)
    token = setting.wheelseye_api_token if setting else None
    base_url = (setting.wheelseye_base_url if setting and setting.wheelseye_base_url else "https://api.wheelseye.com")

    trip_info = await get_trip_details_from_db(db, vehicle_number)

    if not token or not setting or not setting.is_wheelseye_active:
        return GPSTrackResponse(
            success=False,
            message="WheelsEye API is not configured or is disabled for this tenant.",
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            trip=trip_info,
        )

    company_set = await get_company_vehicles_set(db)
    raw_list = await fetch_all_wheelseye_vehicles(base_url, token)

    found_item: Optional[GPSVehicleItem] = None
    for r in raw_list:
        r_num = clean_vehicle_number(
            r.get("vehicleNumber") or r.get("vehicle_number") or r.get("truckNumber") or ""
        )
        if r_num and (clean_v in r_num or r_num in clean_v):
            found_item = format_wheelseye_vehicle(r, company_set)
            break

    if found_item:
        if found_item.address and found_item.address.startswith("Near Lat:") and found_item.latitude and found_item.longitude:
            geo_name = await reverse_geocode_point(found_item.latitude, found_item.longitude)
            if geo_name:
                found_item.address = geo_name

        return GPSTrackResponse(
            success=True,
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            trip=trip_info,
            truck_data=found_item,
        )

    return GPSTrackResponse(
        success=False,
        message=f"Vehicle {vehicle_number} not found on the live GPS network.",
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        trip=trip_info,
        truck_data=None,
    )


async def get_gps_history(db: AsyncSession, vehicle_number: str, date_filter: str = "today") -> GPSHistoryResponse:
    """Retrieves movement vs stoppage timeline and coordinates trail for vehicle."""
    track_res = await track_gps_single_vehicle(db, vehicle_number)
    truck = track_res.truck_data

    timeline: List[GPSTimelineItem] = []
    route_coords: List[List[Any]] = []

    if truck and truck.latitude and truck.longitude:
        route_coords.append([truck.latitude, truck.longitude, truck.lastUpdated, truck.speed])
        timeline.append(
            GPSTimelineItem(
                type="running" if truck.speed > 0 else "stoppage",
                title=f"Current Movement ({truck.speed} km/h)" if truck.speed > 0 else "Current Stoppage Location",
                duration="In transit" if truck.speed > 0 else "Stopped",
                address=truck.address,
                time_range=truck.lastUpdated,
                latitude=truck.latitude,
                longitude=truck.longitude,
                speed=truck.speed,
            )
        )

    return GPSHistoryResponse(
        success=True,
        vehicle=vehicle_number,
        trip=track_res.trip,
        timeline=timeline,
        route_coordinates=route_coords,
        summary=GPSHistorySummary(
            total_distance_km=truck.todayKm if truck else 0.0,
            speed=truck.speed if truck else 0,
        ),
    )


# ===========================================================================
# Consignment 360° & Lifecycle Traceability
# ===========================================================================

import re


def _fmt_date(d: Any) -> Optional[str]:
    if d is None:
        return None
    if hasattr(d, 'strftime'):
        return d.strftime('%d %b %Y')
    return str(d)


def _fmt_money(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _fmt_city(loc: Any) -> str:
    if not loc:
        return ''
    return getattr(loc, 'city_name', None) or getattr(loc, 'city', None) or ''


def _fmt_name(entity: Any, default: str = 'N/A') -> str:
    if not entity:
        return default
    return getattr(entity, 'name', None) or getattr(entity, 'owner_name', None) or default


def _build_search_variants(raw_query: str) -> List[str]:
    """Generates robust search variants for numbers with/without prefixes, hyphens, and leading zeros."""
    q = (raw_query or '').strip()
    if not q:
        return []
    variants: List[str] = [q]
    upper = q.upper()
    if upper not in variants:
        variants.append(upper)

    # Without separators
    no_sep = re.sub(r'[\s\-_/]+', '', upper)
    if no_sep and no_sep not in variants:
        variants.append(no_sep)

    # Stripped common prefixes (e.g. 'LR-26110086' -> '26110086')
    for pfx in ('LR', 'JOB', 'HC', 'TI', 'INV', 'DEL', 'MUM', 'BLR'):
        if upper.startswith(pfx):
            stripped = upper[len(pfx):].lstrip('-_/ ')
            if stripped and stripped not in variants:
                variants.append(stripped)

    # Digits only
    digits = re.sub(r'\D', '', q)
    if digits and digits not in variants:
        variants.append(digits)
        unpadded = digits.lstrip('0')
        if unpadded and unpadded not in variants:
            variants.append(unpadded)

    # Common prefixes from digits
    if digits:
        for pfx in ('LR-', 'LR', 'JOB-', 'JOB', 'HC-', 'HC'):
            comb = f"{pfx}{digits}"
            if comb not in variants:
                variants.append(comb)

    return variants


async def search_consignment_360_suggestions(
    db: AsyncSession,
    query: str = '',
    limit: int = 8,
) -> List[Dict[str, Any]]:
    """Quick autocomplete / live suggestions for Consignment 360 search."""
    cleaned = (query or '').strip()
    results: List[Dict[str, Any]] = []

    if not cleaned:
        recent_lrs_stmt = (
            select(LR)
            .options(
                selectinload(LR.consigner),
                selectinload(LR.consignee),
                selectinload(LR.origin_location),
                selectinload(LR.destination_location),
            )
            .order_by(desc(LR.created_at))
            .limit(4)
        )
        lrs_res = await db.execute(recent_lrs_stmt)
        for lr in lrs_res.scalars().all():
            origin = _fmt_city(lr.origin_location)
            dest = _fmt_city(lr.destination_location)
            route = f'{origin} -> {dest}' if origin or dest else 'General Consignment'
            results.append({
                'id': lr.id,
                'type': 'LR',
                'number': lr.lr_number,
                'title': f'LR #{lr.lr_number}',
                'subtitle': f'{route} | {_fmt_name(lr.consigner, "Direct Party")}',
                'date': _fmt_date(lr.lr_date),
                'status': lr.booking_status or lr.status or 'BOOKED',
                'vehicle_number': lr.vehicle_number,
            })

        recent_jobs_stmt = (
            select(Job)
            .options(
                selectinload(Job.consigner),
                selectinload(Job.origin_location),
                selectinload(Job.destination_location),
            )
            .order_by(desc(Job.created_at))
            .limit(4)
        )
        jobs_res = await db.execute(recent_jobs_stmt)
        for j in jobs_res.scalars().all():
            origin = _fmt_city(j.origin_location)
            dest = _fmt_city(j.destination_location)
            route = f'{origin} -> {dest}' if origin or dest else 'Cargo Movement'
            results.append({
                'id': j.id,
                'type': 'JOB',
                'number': j.job_number,
                'title': f'Job #{j.job_number}',
                'subtitle': f'{route} | {_fmt_name(j.consigner, "Direct Party")}',
                'date': _fmt_date(j.job_date),
                'status': j.status or 'ACTIVE',
                'vehicle_number': None,
            })
        return results[:limit]

    variants = _build_search_variants(cleaned)

    # Search LRs with variants
    lr_conds = []
    for v in variants:
        lr_conds.append(LR.lr_number.ilike(v))
        lr_conds.append(LR.lr_number.ilike(f'%{v}%'))
        lr_conds.append(LR.vehicle_number.ilike(f'%{v}%'))
        lr_conds.append(LR.invoice_no.ilike(f'%{v}%'))

    lr_stmt = (
        select(LR)
        .options(
            selectinload(LR.consigner),
            selectinload(LR.consignee),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
        )
        .where(or_(*lr_conds))
        .order_by(case((LR.lr_number.ilike(cleaned), 0), else_=1), desc(LR.created_at))
        .limit(limit)
    )
    lr_res = await db.execute(lr_stmt)
    for lr in lr_res.scalars().all():
        origin = _fmt_city(lr.origin_location)
        dest = _fmt_city(lr.destination_location)
        route = f'{origin} -> {dest}' if origin or dest else 'General Consignment'
        results.append({
            'id': lr.id,
            'type': 'LR',
            'number': lr.lr_number,
            'title': f'LR #{lr.lr_number}',
            'subtitle': f'{route} | {_fmt_name(lr.consigner, "Direct Party")}',
            'date': _fmt_date(lr.lr_date),
            'status': lr.booking_status or lr.status or 'BOOKED',
            'vehicle_number': lr.vehicle_number,
        })

    # Search Jobs with variants
    job_conds = []
    for v in variants:
        job_conds.append(Job.job_number.ilike(v))
        job_conds.append(Job.job_number.ilike(f'%{v}%'))
        job_conds.append(Job.cargo_description.ilike(f'%{v}%'))

    job_stmt = (
        select(Job)
        .options(
            selectinload(Job.consigner),
            selectinload(Job.origin_location),
            selectinload(Job.destination_location),
        )
        .where(or_(*job_conds))
        .order_by(case((Job.job_number.ilike(cleaned), 0), else_=1), desc(Job.created_at))
        .limit(limit)
    )
    job_res = await db.execute(job_stmt)
    for j in job_res.scalars().all():
        origin = _fmt_city(j.origin_location)
        dest = _fmt_city(j.destination_location)
        route = f'{origin} -> {dest}' if origin or dest else 'Cargo Movement'
        results.append({
            'id': j.id,
            'type': 'JOB',
            'number': j.job_number,
            'title': f'Job #{j.job_number}',
            'subtitle': f'{route} | {_fmt_name(j.consigner, "Direct Party")}',
            'date': _fmt_date(j.job_date),
            'status': j.status or 'ACTIVE',
            'vehicle_number': None,
        })

    # Search Hire Challans with variants
    hc_conds = []
    for v in variants:
        hc_conds.append(HireChallan.challan_number.ilike(v))
        hc_conds.append(HireChallan.challan_number.ilike(f'%{v}%'))
        hc_conds.append(HireChallan.vehicle_number.ilike(f'%{v}%'))

    hc_stmt = (
        select(HireChallan)
        .options(
            selectinload(HireChallan.vendor),
            selectinload(HireChallan.driver),
        )
        .where(or_(*hc_conds))
        .order_by(case((HireChallan.challan_number.ilike(cleaned), 0), else_=1), desc(HireChallan.created_at))
        .limit(limit)
    )
    hc_res = await db.execute(hc_stmt)
    for hc in hc_res.scalars().all():
        results.append({
            'id': hc.id,
            'type': 'HIRE_CHALLAN',
            'number': hc.challan_number,
            'title': f'Challan #{hc.challan_number}',
            'subtitle': f'Truck {hc.vehicle_number or "N/A"} | {hc.from_location or ""} -> {hc.to_location or ""}',
            'date': _fmt_date(hc.challan_date),
            'status': hc.status or 'ISSUED',
            'vehicle_number': hc.vehicle_number,
        })

    return results[:limit]


async def get_consignment_360(
    db: AsyncSession,
    query: str,
) -> Optional[Dict[str, Any]]:
    """Fetches complete 360-degree traceability for an LR, Job, or Hire Challan."""
    q = (query or '').strip()
    if not q:
        return None

    variants = _build_search_variants(q)

    matched_type = 'LR'
    matched_lr: Optional[LR] = None
    matched_job: Optional[Job] = None
    matched_hc: Optional[HireChallan] = None

    is_lr_query = q.upper().startswith('LR')
    is_job_query = q.upper().startswith('JOB')
    is_hc_query = q.upper().startswith('HC')

    # 1. Search order depending on pattern prefix
    if is_lr_query:
        lr_conds = []
        for v in variants:
            lr_conds.append(LR.lr_number.ilike(v))
            lr_conds.append(LR.lr_number.ilike(f'%{v}%'))
            lr_conds.append(LR.vehicle_number.ilike(v))
            lr_conds.append(LR.invoice_no.ilike(f'%{v}%'))

        lr_stmt = (
            select(LR)
            .options(
                selectinload(LR.consigner),
                selectinload(LR.consignee),
                selectinload(LR.origin_location),
                selectinload(LR.destination_location),
                selectinload(LR.issuing_office),
                selectinload(LR.billing_customer),
                selectinload(LR.load_type_rel),
                selectinload(LR.packing_method),
                selectinload(LR.hire_challan).selectinload(HireChallan.owner),
                selectinload(LR.hire_challan).selectinload(HireChallan.vendor),
                selectinload(LR.hire_challan).selectinload(HireChallan.driver),
                selectinload(LR.hire_challan).selectinload(HireChallan.issuing_office),
                selectinload(LR.pod_record),
            )
            .where(or_(*lr_conds))
            .order_by(
                case((LR.lr_number.ilike(q), 0), else_=1),
                case((LR.lr_number.ilike(f'%{q}%'), 0), else_=1),
                desc(LR.created_at),
            )
            .limit(1)
        )
        matched_lr = (await db.execute(lr_stmt)).scalar_one_or_none()
        if matched_lr:
            matched_type = 'LR'

    elif is_job_query:
        j_conds = []
        for v in variants:
            j_conds.append(Job.job_number.ilike(v))
            j_conds.append(Job.job_number.ilike(f'%{v}%'))

        j_stmt = (
            select(Job)
            .options(
                selectinload(Job.consigner),
                selectinload(Job.consignee),
                selectinload(Job.origin_location),
                selectinload(Job.destination_location),
                selectinload(Job.billing_client),
                selectinload(Job.issuing_office),
                selectinload(Job.lrs),
            )
            .where(or_(*j_conds))
            .order_by(case((Job.job_number.ilike(q), 0), else_=1), desc(Job.created_at))
            .limit(1)
        )
        matched_job = (await db.execute(j_stmt)).scalar_one_or_none()
        if matched_job:
            matched_type = 'JOB'

    elif is_hc_query:
        hc_conds = []
        for v in variants:
            hc_conds.append(HireChallan.challan_number.ilike(v))
            hc_conds.append(HireChallan.challan_number.ilike(f'%{v}%'))

        hc_stmt = (
            select(HireChallan)
            .options(
                selectinload(HireChallan.owner),
                selectinload(HireChallan.vendor),
                selectinload(HireChallan.driver),
                selectinload(HireChallan.issuing_office),
                selectinload(HireChallan.lr),
            )
            .where(or_(*hc_conds))
            .order_by(case((HireChallan.challan_number.ilike(q), 0), else_=1), desc(HireChallan.created_at))
            .limit(1)
        )
        matched_hc = (await db.execute(hc_stmt)).scalar_one_or_none()
        if matched_hc:
            matched_type = 'HIRE_CHALLAN'

    # If not found yet, check LR across all variants
    if not matched_lr and not matched_job and not matched_hc:
        lr_conds = []
        for v in variants:
            lr_conds.append(LR.lr_number.ilike(v))
            lr_conds.append(LR.lr_number.ilike(f'%{v}%'))
            lr_conds.append(LR.vehicle_number.ilike(v))
            lr_conds.append(LR.invoice_no.ilike(f'%{v}%'))

        lr_stmt = (
            select(LR)
            .options(
                selectinload(LR.consigner),
                selectinload(LR.consignee),
                selectinload(LR.origin_location),
                selectinload(LR.destination_location),
                selectinload(LR.issuing_office),
                selectinload(LR.billing_customer),
                selectinload(LR.load_type_rel),
                selectinload(LR.packing_method),
                selectinload(LR.hire_challan).selectinload(HireChallan.owner),
                selectinload(LR.hire_challan).selectinload(HireChallan.vendor),
                selectinload(LR.hire_challan).selectinload(HireChallan.driver),
                selectinload(LR.hire_challan).selectinload(HireChallan.issuing_office),
                selectinload(LR.pod_record),
            )
            .where(or_(*lr_conds))
            .order_by(
                case((LR.lr_number.ilike(q), 0), else_=1),
                case((LR.lr_number.ilike(f'%{q}%'), 0), else_=1),
                desc(LR.created_at),
            )
            .limit(1)
        )
        matched_lr = (await db.execute(lr_stmt)).scalar_one_or_none()
        if matched_lr:
            matched_type = 'LR'

    # Fallbacks if still not matched
    if not matched_lr and not matched_job and not matched_hc:
        j_conds = [Job.job_number.ilike(f'%{v}%') for v in variants]
        j_stmt = (
            select(Job)
            .options(
                selectinload(Job.consigner),
                selectinload(Job.consignee),
                selectinload(Job.origin_location),
                selectinload(Job.destination_location),
                selectinload(Job.billing_client),
                selectinload(Job.issuing_office),
                selectinload(Job.lrs),
            )
            .where(or_(*j_conds))
            .order_by(desc(Job.created_at))
            .limit(1)
        )
        matched_job = (await db.execute(j_stmt)).scalar_one_or_none()
        if matched_job:
            matched_type = 'JOB'

    if not matched_lr and not matched_job and not matched_hc:
        hc_conds = [HireChallan.challan_number.ilike(f'%{v}%') for v in variants]
        hc_stmt = (
            select(HireChallan)
            .options(
                selectinload(HireChallan.owner),
                selectinload(HireChallan.vendor),
                selectinload(HireChallan.driver),
                selectinload(HireChallan.issuing_office),
                selectinload(HireChallan.lr),
            )
            .where(or_(*hc_conds))
            .order_by(desc(HireChallan.created_at))
            .limit(1)
        )
        matched_hc = (await db.execute(hc_stmt)).scalar_one_or_none()
        if matched_hc:
            matched_type = 'HIRE_CHALLAN'

    # If nothing matches anywhere, return None
    if not matched_lr and not matched_job and not matched_hc:
        return None

    # Resolve linked entities
    job: Optional[Job] = matched_job
    lr: Optional[LR] = matched_lr
    hc: Optional[HireChallan] = matched_hc

    # If we have an LR, load its HC and Job if not already loaded
    if lr:
        if not hc and lr.hire_challan:
            hc = lr.hire_challan
        elif not hc:
            hc_sub_stmt = (
                select(HireChallan)
                .options(
                    selectinload(HireChallan.owner),
                    selectinload(HireChallan.vendor),
                    selectinload(HireChallan.driver),
                    selectinload(HireChallan.issuing_office),
                )
                .where(HireChallan.lr_id == lr.id)
                .limit(1)
            )
            hc = (await db.execute(hc_sub_stmt)).scalar_one_or_none()

        if not job and lr.job_id:
            job_sub_stmt = (
                select(Job)
                .options(
                    selectinload(Job.consigner),
                    selectinload(Job.consignee),
                    selectinload(Job.origin_location),
                    selectinload(Job.destination_location),
                    selectinload(Job.billing_client),
                    selectinload(Job.issuing_office),
                    selectinload(Job.lrs),
                )
                .where(Job.id == lr.job_id)
                .limit(1)
            )
            job = (await db.execute(job_sub_stmt)).scalar_one_or_none()

    elif job and not lr:
        if job.lrs:
            first_lr_id = job.lrs[0].id
            lr_sub_stmt = (
                select(LR)
                .options(
                    selectinload(LR.consigner),
                    selectinload(LR.consignee),
                    selectinload(LR.origin_location),
                    selectinload(LR.destination_location),
                    selectinload(LR.issuing_office),
                    selectinload(LR.billing_customer),
                    selectinload(LR.load_type_rel),
                    selectinload(LR.packing_method),
                    selectinload(LR.hire_challan).selectinload(HireChallan.owner),
                    selectinload(LR.hire_challan).selectinload(HireChallan.vendor),
                    selectinload(LR.hire_challan).selectinload(HireChallan.driver),
                    selectinload(LR.hire_challan).selectinload(HireChallan.issuing_office),
                    selectinload(LR.pod_record),
                )
                .where(LR.id == first_lr_id)
                .limit(1)
            )
            lr = (await db.execute(lr_sub_stmt)).scalar_one_or_none()
            if lr and lr.hire_challan:
                hc = lr.hire_challan

    elif hc and not lr:
        if hc.lr_id:
            lr_sub_stmt = (
                select(LR)
                .options(
                    selectinload(LR.consigner),
                    selectinload(LR.consignee),
                    selectinload(LR.origin_location),
                    selectinload(LR.destination_location),
                    selectinload(LR.issuing_office),
                    selectinload(LR.billing_customer),
                    selectinload(LR.load_type_rel),
                    selectinload(LR.packing_method),
                    selectinload(LR.pod_record),
                )
                .where(LR.id == hc.lr_id)
                .limit(1)
            )
            lr = (await db.execute(lr_sub_stmt)).scalar_one_or_none()
            if lr and lr.job_id:
                job_sub_stmt = (
                    select(Job)
                    .options(
                        selectinload(Job.consigner),
                        selectinload(Job.consignee),
                        selectinload(Job.origin_location),
                        selectinload(Job.destination_location),
                        selectinload(Job.billing_client),
                        selectinload(Job.issuing_office),
                        selectinload(Job.lrs),
                    )
                    .where(Job.id == lr.job_id)
                    .limit(1)
                )
                job = (await db.execute(job_sub_stmt)).scalar_one_or_none()

    # Load Arrival Report
    arrival_report: Optional[ArrivalReport] = None
    if lr or job:
        arrival_stmt = (
            select(ArrivalReport)
            .where(
                or_(
                    ArrivalReport.lr_id == (lr.id if lr else -1),
                    ArrivalReport.job_id == (job.id if job else -1),
                )
            )
            .order_by(desc(ArrivalReport.arrival_date), desc(ArrivalReport.id))
            .limit(1)
        )
        arrival_report = (await db.execute(arrival_stmt)).scalar_one_or_none()

    # Load POD Record
    pod_record: Optional[PODRecord] = None
    if lr:
        if lr.pod_record:
            pod_record = lr.pod_record
        else:
            pod_stmt = (
                select(PODRecord)
                .where(PODRecord.lr_id == lr.id)
                .order_by(desc(PODRecord.delivery_date), desc(PODRecord.id))
                .limit(1)
            )
            pod_record = (await db.execute(pod_stmt)).scalar_one_or_none()

    # Load Tracking info
    vehicle_num = (lr.vehicle_number if lr else None) or (hc.vehicle_number if hc else None)
    tracking_data: Optional[Dict[str, Any]] = None
    if vehicle_num:
        ping_stmt = (
            select(TrackingPing)
            .where(TrackingPing.vehicle_number == vehicle_num)
            .order_by(desc(TrackingPing.last_ping_at))
            .limit(1)
        )
        latest_ping = (await db.execute(ping_stmt)).scalar_one_or_none()
        if latest_ping:
            tracking_data = {
                'vehicle_number': latest_ping.vehicle_number,
                'tracking_mode': latest_ping.tracking_mode or 'FASTAG',
                'location_name': latest_ping.location_name or 'In Transit',
                'latitude': latest_ping.last_latitude,
                'longitude': latest_ping.last_longitude,
                'speed_kmh': latest_ping.speed_kmh or 0,
                'last_ping_at': _fmt_date(latest_ping.last_ping_at),
                'status': latest_ping.status or 'ACTIVE',
            }
        else:
            tracking_data = {
                'vehicle_number': vehicle_num,
                'tracking_mode': 'FASTAG / GPS',
                'location_name': 'Vehicle Assigned (Awaiting active ping)',
                'latitude': None,
                'longitude': None,
                'speed_kmh': 0,
                'last_ping_at': None,
                'status': 'DISPATCHED',
            }

    # Load Accounting Vouchers
    voucher_conds = []
    if lr:
        voucher_conds.append(Voucher.lr_id == lr.id)
    if hc:
        voucher_conds.append(Voucher.hire_challan_id == hc.id)

    raw_vouchers: List[Voucher] = []
    if voucher_conds:
        v_stmt = (
            select(Voucher)
            .where(or_(*voucher_conds), Voucher.is_void == False)
            .order_by(desc(Voucher.voucher_date), desc(Voucher.id))
        )
        raw_vouchers = list((await db.execute(v_stmt)).scalars().all())

    # Invoices and Receipts
    invoices: List[Dict[str, Any]] = []
    purchases: List[Dict[str, Any]] = []
    payments: List[Dict[str, Any]] = []
    receipts: List[Dict[str, Any]] = []

    invoice_ids = []
    for v in raw_vouchers:
        v_dict = {
            'id': v.id,
            'voucher_number': v.voucher_number,
            'voucher_type': v.voucher_type,
            'voucher_date': _fmt_date(v.voucher_date),
            'party_name': v.party_name or 'N/A',
            'party_type': v.party_type or '',
            'reference_number': v.reference_number or '',
            'total_amount': _fmt_money(v.total_amount),
            'tax_amount': _fmt_money(v.tax_amount),
            'net_amount': _fmt_money(v.net_amount),
            'paid_amount': _fmt_money(v.paid_amount),
            'balance_amount': _fmt_money(v.balance_amount),
            'payment_status': v.payment_status or 'UNPAID',
            'narration': v.narration or '',
        }
        vtype = (v.voucher_type or '').upper()
        if 'INVOICE' in vtype:
            invoices.append(v_dict)
            invoice_ids.append(v.id)
        elif 'PURCHASE' in vtype:
            purchases.append(v_dict)
        elif 'PAYMENT' in vtype:
            payments.append(v_dict)
        elif 'RECEIPT' in vtype:
            receipts.append(v_dict)

    # Check for linked receipt vouchers against invoices
    if invoice_ids:
        rcpt_stmt = (
            select(Voucher)
            .where(Voucher.against_voucher_id.in_(invoice_ids), Voucher.is_void == False)
            .order_by(desc(Voucher.voucher_date))
        )
        rcpt_res = await db.execute(rcpt_stmt)
        for rv in rcpt_res.scalars().all():
            if not any(r['id'] == rv.id for r in receipts):
                receipts.append({
                    'id': rv.id,
                    'voucher_number': rv.voucher_number,
                    'voucher_type': rv.voucher_type,
                    'voucher_date': _fmt_date(rv.voucher_date),
                    'party_name': rv.party_name or 'N/A',
                    'party_type': rv.party_type or '',
                    'reference_number': rv.reference_number or '',
                    'total_amount': _fmt_money(rv.total_amount),
                    'tax_amount': _fmt_money(rv.tax_amount),
                    'net_amount': _fmt_money(rv.net_amount),
                    'paid_amount': _fmt_money(rv.paid_amount),
                    'balance_amount': _fmt_money(rv.balance_amount),
                    'payment_status': rv.payment_status or 'PAID',
                    'narration': rv.narration or '',
                })

    # Build Clean Serialized Job Dict
    job_dict: Optional[Dict[str, Any]] = None
    if job:
        linked_lrs = []
        if job.lrs:
            for l_item in job.lrs:
                linked_lrs.append({
                    'id': l_item.id,
                    'lr_number': l_item.lr_number,
                    'lr_date': _fmt_date(l_item.lr_date),
                    'vehicle_number': l_item.vehicle_number,
                    'status': l_item.booking_status or l_item.status or 'BOOKED',
                    'total_freight_amount': _fmt_money(l_item.total_freight_amount),
                })
        job_dict = {
            'id': job.id,
            'job_number': job.job_number,
            'job_date': _fmt_date(job.job_date),
            'status': job.status or 'OPEN',
            'consigner_name': _fmt_name(job.consigner),
            'consignee_name': _fmt_name(job.consignee),
            'origin_city': _fmt_city(job.origin_location) or 'N/A',
            'destination_city': _fmt_city(job.destination_location) or 'N/A',
            'billing_client_name': _fmt_name(job.billing_client, job.billing_party or 'N/A'),
            'cargo_description': job.cargo_description or 'General Merchandise',
            'estimated_weight_mt': _fmt_money(job.estimated_weight_mt),
            'estimated_packages': job.estimated_packages or 0,
            'special_instructions': job.special_instructions or '',
            'linked_lrs': linked_lrs,
        }

    # Build Clean Serialized LR Dict
    lr_dict: Optional[Dict[str, Any]] = None
    if lr:
        lr_dict = {
            'id': lr.id,
            'lr_number': lr.lr_number,
            'lr_date': _fmt_date(lr.lr_date),
            'status': lr.status or 'ACTIVE',
            'booking_status': lr.booking_status or 'BOOKED',
            'vehicle_source': lr.vehicle_source or 'MARKET',
            'vehicle_number': lr.vehicle_number or 'N/A',
            'vehicle_type': lr.vehicle_type or 'Standard',
            'driver_name': lr.driver_name or 'N/A',
            'driver_phone': lr.driver_phone or 'N/A',
            'eway_bill_number': lr.eway_bill_number or 'N/A',
            'eway_bill_date': _fmt_date(lr.eway_bill_date),
            'eway_bill_expiry': _fmt_date(lr.eway_bill_expiry),
            'consigner_name': _fmt_name(lr.consigner),
            'consignee_name': _fmt_name(lr.consignee),
            'origin_city': _fmt_city(lr.origin_location) or 'N/A',
            'destination_city': _fmt_city(lr.destination_location) or 'N/A',
            'billing_customer_name': _fmt_name(lr.billing_customer, _fmt_name(lr.consigner)),
            'package_count': lr.package_count or 0,
            'actual_weight_mt': _fmt_money(lr.actual_weight_mt),
            'chargeable_weight_mt': _fmt_money(lr.chargeable_weight_mt),
            'freight_rate': _fmt_money(lr.freight_rate),
            'freight_amount': _fmt_money(lr.freight_amount),
            'loading_charges': _fmt_money(lr.loading_charges),
            'unloading_charges': _fmt_money(lr.unloading_charges),
            'other_charges': _fmt_money(lr.other_charges),
            'total_freight_amount': _fmt_money(lr.total_freight_amount),
            'advance_amount': _fmt_money(lr.advance_amount),
            'balance_amount': _fmt_money(lr.balance_amount),
            'payment_type': lr.payment_type or 'TO_PAY',
            'invoice_no': lr.invoice_no or 'N/A',
            'invoice_date': _fmt_date(lr.invoice_date),
            'invoice_value': _fmt_money(lr.invoice_value),
            'cha_job_number': lr.cha_job_number or '',
            'container_no': lr.container_no or '',
            'seal_no': lr.seal_no or '',
            'is_billed': bool(lr.is_billed),
            'remarks': lr.remarks or '',
        }

    # Build Clean Serialized Hire Challan Dict
    hc_dict: Optional[Dict[str, Any]] = None
    if hc:
        hc_dict = {
            'id': hc.id,
            'challan_number': hc.challan_number,
            'challan_date': _fmt_date(hc.challan_date),
            'status': hc.status or 'ISSUED',
            'vehicle_number': hc.vehicle_number or 'N/A',
            'owner_name': _fmt_name(hc.owner),
            'vendor_name': _fmt_name(hc.vendor, _fmt_name(hc.owner)),
            'driver_name': hc.driver_name or (hc.driver.name if hc.driver else 'N/A'),
            'driver_phone': hc.driver_phone or (hc.driver.phone if hc.driver else 'N/A'),
            'from_location': hc.from_location or 'N/A',
            'to_location': hc.to_location or 'N/A',
            'hire_rate': _fmt_money(hc.hire_rate),
            'advance_amount': _fmt_money(hc.advance_amount),
            'balance_amount': _fmt_money(hc.balance_amount),
            'tds_rate': _fmt_money(hc.tds_rate),
            'tds_amount': _fmt_money(hc.tds_amount),
            'detention_charge': _fmt_money(hc.detention_charge),
            'mamul_charges': _fmt_money(hc.mamul_charges),
            'loading_expenses': _fmt_money(hc.loading_expenses),
            'unloading_expenses': _fmt_money(hc.unloading_expenses),
            'net_payable_amount': _fmt_money(hc.net_payable_amount),
            'remarks': hc.remarks or '',
        }

    # Build Clean Serialized Arrival Report Dict
    arrival_dict: Optional[Dict[str, Any]] = None
    if arrival_report:
        arrival_dict = {
            'id': arrival_report.id,
            'report_number': arrival_report.report_number,
            'arrival_date': _fmt_date(arrival_report.arrival_date),
            'destination_hub': arrival_report.destination_hub or 'Destination Hub',
            'packages_received': arrival_report.packages_received or 0,
            'packages_damaged': arrival_report.packages_damaged or 0,
            'packages_short': arrival_report.packages_short or 0,
            'condition_remarks': arrival_report.condition_remarks or 'Normal delivery condition',
            'unloaded_by': arrival_report.unloaded_by or 'Hub Supervisor',
            'receiver_name': arrival_report.receiver_name or 'Authorized Storekeeper',
            'status': arrival_report.status or 'COMPLETED',
        }

    # Build Clean Serialized POD Record Dict
    pod_dict: Optional[Dict[str, Any]] = None
    if pod_record:
        pod_dict = {
            'id': pod_record.id,
            'pod_number': pod_record.pod_number or f'POD-{pod_record.id:04d}',
            'delivery_date': _fmt_date(pod_record.delivery_date),
            'receiver_name': pod_record.receiver_name or 'Consignee',
            'receiver_phone': pod_record.receiver_phone or 'N/A',
            'received_condition': pod_record.received_condition or 'GOOD',
            'packages_delivered': pod_record.packages_delivered or (lr.package_count if lr else 0),
            'document_path': pod_record.document_path or '',
            'verification_status': (pod_record.verification_status or 'PENDING').upper(),
            'remarks': pod_record.remarks or '',
        }

    # ---------------------------------------------------------------------------
    # Construct 8-Stage Lifecycle Status Tracker
    # ---------------------------------------------------------------------------
    lifecycle_stages = [
        {
            'stage_id': 1,
            'stage_key': 'job_indent',
            'title': 'Job Order & Cargo Indent',
            'status': 'completed' if job else 'skipped',
            'doc_number': job.job_number if job else None,
            'date': _fmt_date(job.job_date) if job else None,
            'description': f'Cargo indent: {job.cargo_description or "General Cargo"} ({job.estimated_weight_mt or 0} MT)' if job else 'Direct LR booking without prior Job indent',
        },
        {
            'stage_id': 2,
            'stage_key': 'lr_booking',
            'title': 'LR Consignment Booking',
            'status': 'completed' if lr else 'pending',
            'doc_number': lr.lr_number if lr else None,
            'date': _fmt_date(lr.lr_date) if lr else None,
            'description': f'Booked for {_fmt_name(lr.consigner, "Client") if lr else ""} -> {_fmt_name(lr.consignee, "Receiver") if lr else ""}' if lr else 'LR not yet booked',
        },
        {
            'stage_id': 3,
            'stage_key': 'hire_challan',
            'title': 'Lorry Hire Contract',
            'status': 'completed' if hc else ('pending' if lr and lr.vehicle_source == 'MARKET' else 'skipped'),
            'doc_number': hc.challan_number if hc else None,
            'date': _fmt_date(hc.challan_date) if hc else None,
            'description': f'Assigned {hc.vehicle_number} (Driver: {hc.driver_name or "N/A"})' if hc else (f'Company Fleet Truck {lr.vehicle_number}' if lr and lr.vehicle_source == 'OWN' else 'Hire Challan pending issue'),
        },
        {
            'stage_id': 4,
            'stage_key': 'transit_tracking',
            'title': 'Dispatch & Transit Movement',
            'status': 'completed' if (arrival_report or pod_record) else ('in_progress' if (lr and (lr.booking_status == 'IN_TRANSIT' or lr.dispatch_date)) else ('completed' if lr else 'pending')),
            'doc_number': lr.eway_bill_number if lr and lr.eway_bill_number != 'N/A' else None,
            'date': _fmt_date(lr.dispatch_date) if lr and lr.dispatch_date else None,
            'description': tracking_data['location_name'] if tracking_data else 'Consignment dispatched towards destination',
        },
        {
            'stage_id': 5,
            'stage_key': 'hub_arrival',
            'title': 'Destination Hub Unloading',
            'status': 'completed' if arrival_report else 'pending',
            'doc_number': arrival_report.report_number if arrival_report else None,
            'date': _fmt_date(arrival_report.arrival_date) if arrival_report else None,
            'description': f'Unloaded {arrival_report.packages_received} pkgs at {arrival_report.destination_hub}' if arrival_report else 'Consignment has not arrived at destination hub yet',
        },
        {
            'stage_id': 6,
            'stage_key': 'pod_verification',
            'title': 'Proof of Delivery (POD)',
            'status': 'completed' if (pod_record and pod_record.verification_status in ('VERIFIED', 'APPROVED')) else ('in_progress' if pod_record else 'pending'),
            'doc_number': pod_record.pod_number if pod_record else None,
            'date': _fmt_date(pod_record.delivery_date) if pod_record else None,
            'description': f'POD Verified. Handed over to {pod_record.receiver_name or "Consignee"}' if (pod_record and pod_record.verification_status in ('VERIFIED', 'APPROVED')) else ('POD submitted, awaiting audit verification' if pod_record else 'Awaiting delivery and signed acknowledgement copy'),
        },
        {
            'stage_id': 7,
            'stage_key': 'freight_invoicing',
            'title': 'Customer Freight Invoicing',
            'status': 'completed' if invoices else ('pending' if lr else 'pending'),
            'doc_number': ', '.join(i['voucher_number'] for i in invoices) if invoices else None,
            'date': invoices[0]['voucher_date'] if invoices else None,
            'description': f'Invoiced ₹{sum(i["net_amount"] for i in invoices):,.2f} across {len(invoices)} bill(s)' if invoices else (f'Unbilled: ₹{_fmt_money(lr.total_freight_amount):,.2f} ready for freight billing' if lr else 'Freight not invoiced'),
        },
        {
            'stage_id': 8,
            'stage_key': 'financial_settlement',
            'title': 'Payment & Margin Settlement',
            'status': 'completed' if (invoices and all(i['balance_amount'] <= 0 for i in invoices) and (not hc or hc.balance_amount <= 0)) else ('in_progress' if (receipts or payments) else 'pending'),
            'doc_number': ', '.join(r['voucher_number'] for r in receipts) if receipts else None,
            'date': receipts[0]['voucher_date'] if receipts else None,
            'description': 'Customer payments received in full & driver settlement cleared' if (invoices and all(i['balance_amount'] <= 0 for i in invoices)) else 'Account settlement & balance collection in progress',
        },
    ]

    # ---------------------------------------------------------------------------
    # Construct Financial & P&L Summary
    # ---------------------------------------------------------------------------
    customer_revenue = sum(i['net_amount'] for i in invoices) if invoices else (_fmt_money(lr.total_freight_amount) if lr else 0.0)
    invoiced_amount = sum(i['net_amount'] for i in invoices)
    customer_paid = sum(i['paid_amount'] for i in invoices) + sum(r['net_amount'] for r in receipts if not any(i['paid_amount'] >= r['net_amount'] for i in invoices))
    if invoiced_amount > 0 and customer_paid > invoiced_amount:
        customer_paid = invoiced_amount
    customer_balance = (invoiced_amount - customer_paid) if invoiced_amount > 0 else customer_revenue

    lorry_hire_cost = _fmt_money(hc.net_payable_amount) if hc else 0.0
    lorry_advance = _fmt_money(hc.advance_amount) if hc else 0.0
    lorry_balance = _fmt_money(hc.balance_amount) if hc else 0.0

    direct_expenses = sum(p['net_amount'] for p in purchases)
    total_cost = lorry_hire_cost + direct_expenses
    gross_profit = customer_revenue - total_cost
    margin_pct = round((gross_profit / customer_revenue * 100), 2) if customer_revenue > 0 else 0.0

    financial_summary = {
        'customer_revenue': customer_revenue,
        'invoiced_amount': invoiced_amount,
        'customer_paid_amount': customer_paid,
        'customer_pending_balance': customer_balance,
        'lorry_hire_cost': lorry_hire_cost,
        'lorry_advance_paid': lorry_advance,
        'lorry_balance_payable': lorry_balance,
        'direct_expenses': direct_expenses,
        'total_cost': total_cost,
        'gross_profit': gross_profit,
        'margin_percentage': margin_pct,
        'is_billed': bool(invoices or (lr and lr.is_billed)),
        'is_settled': bool(invoices and customer_balance <= 0 and lorry_balance <= 0),
    }

    return {
        'query': q,
        'matched_type': matched_type,
        'job': job_dict,
        'lr': lr_dict,
        'hire_challan': hc_dict,
        'arrival_report': arrival_dict,
        'pod_record': pod_dict,
        'tracking': tracking_data,
        'invoices': invoices,
        'payments': payments,
        'purchases': purchases,
        'receipts': receipts,
        'lifecycle_stages': lifecycle_stages,
        'financial_summary': financial_summary,
    }
