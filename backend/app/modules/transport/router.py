from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status, UploadFile, File, Query, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import AppException, ForbiddenException, ResourceNotFoundException as NotFoundException
from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.auth.dependencies import require_permission, get_current_user, check_entitlement_limit, get_current_office
from app.control.models import Tenant
from app.tenant_db.models import User, Branch, LR
from app.modules.transport import service
from app.services.activity_logger import log_activity
from app.modules.transport.excel_import import generate_job_import_template, import_jobs_from_excel
from app.modules.transport.schemas import (
    VehicleOwnerCreate, VehicleOwnerUpdate, VehicleOwnerResponse,
    DriverCreate, DriverUpdate, DriverResponse,
    MarketVehicleCreate, MarketVehicleUpdate, MarketVehicleResponse,
    CompanyVehicleCreate, CompanyVehicleUpdate, CompanyVehicleResponse,
    JobCreate, JobUpdate, JobResponse, JobStatusTransitionRequest,
    LRCreate, LRUpdate, LRResponse, LRStatusTransitionRequest, LRSearchResult,
    HireChallanCreate, HireChallanUpdate, HireChallanResponse, HireChallanSettleRequest,
    ArrivalReportCreate, ArrivalReportResponse,
    PODRecordCreate, PODRecordVerifyRequest, PODRecordResponse,
    TruckHiringNoteCreate, TruckHiringNoteResponse,
    EWayBillCreate, EWayBillResponse,
    TrackingPingCreate, TrackingPingResponse,
    SIMTripCreate, SIMTripUpdate, SIMTripCommentCreate, SIMTripClose, SIMConsentSimulate, SIMTripResponse, SIMTrackingSyncResponse,
    FastagTripCreate, FastagTripUpdate, FastagTripResponse,
    FastagTrackResponse, FastagConfigResponse, TollLogResponse,
)

router = APIRouter(prefix="/transport", tags=["Transport"])


def _ensure_lr_view_access(current_user: User) -> None:
    """Keep LR list and global LR search on the same existing permission boundary."""
    if current_user.role == "COMPANY_ADMIN":
        return
    if not current_user.custom_role or not current_user.custom_role.permissions:
        raise ForbiddenException(
            message="Access denied. Missing permission: transport.lr_booking.view",
            details={"required": "transport.lr_booking.view"},
        )
    has_perm = any(
        (
            (p.module == "transport" and p.feature == "lr_booking" and p.permission in ("view", "all"))
            or (p.module == "accounts" and p.feature == "transport_invoice" and p.permission in ("view", "create", "all"))
            or (
                p.module.replace("-", "_") == "transport_reports"
                and p.feature in ("lr_register", "unbilled")
                and p.permission in ("view", "all")
            )
        )
        and p.is_allowed
        for p in current_user.custom_role.permissions
    )
    if not has_perm:
        raise ForbiddenException(
            message="Access denied. Missing permission: transport.lr_booking.view",
            details={"required": "transport.lr_booking.view"},
        )

# ==============================================================================
# 1. Vehicle Owners
# ==============================================================================
@router.get("/vehicle-owners", response_model=List[VehicleOwnerResponse])
async def list_vehicle_owners(
    current_user: User = Depends(require_permission("transport", "vehicle_owners", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_all_vehicle_owners(db)

@router.post("/vehicle-owners", response_model=VehicleOwnerResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle_owner(
    data: VehicleOwnerCreate,
    current_user: User = Depends(require_permission("transport", "vehicle_owners", "create")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_masters")
    owner = await service.create_vehicle_owner(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="VEHICLE_OWNER_CREATED",
        module="transport",
        entity_type="VehicleOwner",
        entity_id=str(owner.id),
        entity_identifier=owner.name,
        details_json={"name": owner.name, "pan": owner.pan, "phone": owner.phone},
    )
    return owner

@router.put("/vehicle-owners/{id}", response_model=VehicleOwnerResponse)
async def update_vehicle_owner(
    id: int,
    data: VehicleOwnerUpdate,
    current_user: User = Depends(require_permission("transport", "vehicle_owners", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    owner = await service.update_vehicle_owner(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="VEHICLE_OWNER_UPDATED",
        module="transport",
        entity_type="VehicleOwner",
        entity_id=str(owner.id),
        entity_identifier=owner.name,
        details_json=data.model_dump(exclude_unset=True),
    )
    return owner

@router.delete("/vehicle-owners/{id}", status_code=status.HTTP_200_OK)
async def delete_vehicle_owner(
    id: int,
    current_user: User = Depends(require_permission("transport", "vehicle_owners", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_vehicle_owner(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="VEHICLE_OWNER_DEACTIVATED",
        module="transport",
        entity_type="VehicleOwner",
        entity_id=str(id),
    )
    return {"message": "Vehicle Owner deactivated."}

# ==============================================================================
# 2. Drivers
# ==============================================================================
@router.get("/drivers", response_model=List[DriverResponse])
async def list_drivers(
    current_user: User = Depends(require_permission("transport", "drivers", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_all_drivers(db)

@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
async def create_driver(
    data: DriverCreate,
    current_user: User = Depends(require_permission("transport", "drivers", "create")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_masters")
    drv = await service.create_driver(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="DRIVER_CREATED",
        module="transport",
        entity_type="Driver",
        entity_id=str(drv.id),
        entity_identifier=drv.name,
        details_json={"name": drv.name, "phone": drv.phone, "license_number": drv.license_number},
    )
    return drv

@router.put("/drivers/{id}", response_model=DriverResponse)
async def update_driver(
    id: int,
    data: DriverUpdate,
    current_user: User = Depends(require_permission("transport", "drivers", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    drv = await service.update_driver(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="DRIVER_UPDATED",
        module="transport",
        entity_type="Driver",
        entity_id=str(drv.id),
        entity_identifier=drv.name,
        details_json=data.model_dump(exclude_unset=True),
    )
    return drv

@router.delete("/drivers/{id}", status_code=status.HTTP_200_OK)
async def delete_driver(
    id: int,
    current_user: User = Depends(require_permission("transport", "drivers", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_driver(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="DRIVER_DEACTIVATED",
        module="transport",
        entity_type="Driver",
        entity_id=str(id),
    )
    return {"message": "Driver deactivated."}

# ==============================================================================
# 3. Market Vehicles
# ==============================================================================
@router.get("/market-vehicles", response_model=List[MarketVehicleResponse])
async def list_market_vehicles(
    current_user: User = Depends(require_permission("transport", "market_vehicles", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_all_market_vehicles(db)

@router.get("/market-vehicles/{id}", response_model=MarketVehicleResponse)
async def get_market_vehicle(
    id: int,
    current_user: User = Depends(require_permission("transport", "market_vehicles", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_market_vehicle(db, id)

@router.post("/market-vehicles", response_model=MarketVehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_market_vehicle(
    data: MarketVehicleCreate,
    current_user: User = Depends(require_permission("transport", "market_vehicles", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    v = await service.create_market_vehicle(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="MARKET_VEHICLE_CREATED",
        module="transport",
        entity_type="Vehicle",
        entity_id=str(v.id),
        entity_identifier=v.vehicle_number,
        details_json={"vehicle_number": v.vehicle_number, "vehicle_type": v.vehicle_type},
    )
    return v

@router.put("/market-vehicles/{id}", response_model=MarketVehicleResponse)
async def update_market_vehicle(
    id: int,
    data: MarketVehicleUpdate,
    current_user: User = Depends(require_permission("transport", "market_vehicles", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    v = await service.update_market_vehicle(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="MARKET_VEHICLE_UPDATED",
        module="transport",
        entity_type="Vehicle",
        entity_id=str(v.id),
        entity_identifier=v.vehicle_number,
        details_json=data.model_dump(exclude_unset=True),
    )
    return v

@router.delete("/market-vehicles/{id}", status_code=status.HTTP_200_OK)
async def delete_market_vehicle(
    id: int,
    current_user: User = Depends(require_permission("transport", "market_vehicles", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_market_vehicle(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="MARKET_VEHICLE_DEACTIVATED",
        module="transport",
        entity_type="Vehicle",
        entity_id=str(id),
    )
    return {"message": "Market vehicle deactivated."}

# ==============================================================================
# 4. Company Vehicles
# ==============================================================================
@router.get("/company-vehicles", response_model=List[CompanyVehicleResponse])
async def list_company_vehicles(
    current_user: User = Depends(require_permission("transport", "company_vehicles", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_all_company_vehicles(db)

@router.post("/company-vehicles", response_model=CompanyVehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_company_vehicle(
    data: CompanyVehicleCreate,
    current_user: User = Depends(require_permission("transport", "company_vehicles", "create")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_vehicles")
    v = await service.create_company_vehicle(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="COMPANY_VEHICLE_CREATED",
        module="transport",
        entity_type="Vehicle",
        entity_id=str(v.id),
        entity_identifier=v.registration_number,
        details_json={"registration_number": v.registration_number, "make": v.make, "model": v.model},
    )
    return v


@router.put("/company-vehicles/{id}", response_model=CompanyVehicleResponse)
async def update_company_vehicle(
    id: int,
    data: CompanyVehicleUpdate,
    current_user: User = Depends(require_permission("transport", "company_vehicles", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    v = await service.update_company_vehicle(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="COMPANY_VEHICLE_UPDATED",
        module="transport",
        entity_type="Vehicle",
        entity_id=str(v.id),
        entity_identifier=v.registration_number,
        details=f"Updated company vehicle {v.registration_number}",
        details_json=data.model_dump(exclude_unset=True),
    )
    return v

@router.delete("/company-vehicles/{id}", status_code=status.HTTP_200_OK)
async def delete_company_vehicle(
    id: int,
    current_user: User = Depends(require_permission("transport", "company_vehicles", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    v = await service.delete_company_vehicle(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="COMPANY_VEHICLE_DEACTIVATED",
        module="transport",
        entity_type="Vehicle",
        entity_id=str(id),
        entity_identifier=getattr(v, "registration_number", str(id)),
        details=f"Deactivated company vehicle ID {id}",
    )
    return {"message": "Company vehicle deactivated."}

# ==============================================================================
# 5. Jobs & Workflow Transitions
# ==============================================================================
@router.get("/jobs/excel-template")
async def download_job_excel_template(
    current_user: User = Depends(require_permission("transport", "jobs", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Generates and downloads the official Job Order Excel Import Template
    with styled header row, sample data, and reference master lists.
    """
    excel_stream = await generate_job_import_template(db)
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=PantherTMS_Job_Orders_Import_Template.xlsx"
        }
    )

@router.post("/jobs/import-excel")
async def import_jobs_excel(
    file: UploadFile = File(...),
    apply_series_prefix_suffix: Optional[bool] = Query(None),
    apply_series_prefix_suffix_form: Optional[str] = Form(None, alias="apply_series_prefix_suffix"),
    office_id: Optional[int] = Query(None),
    office_id_form: Optional[str] = Form(None, alias="office_id"),
    current_user: User = Depends(require_permission("transport", "jobs", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Mass imports Job Orders from an Excel (.xlsx/.xls) or CSV file.
    Enforces comprehensive 2-level deduplication:
    - Within Excel: catches duplicated job numbers and duplicated trip order rows.
    - Against Database: catches existing job numbers and active identical trip orders.
    - Resolves and auto-creates sub-fields (Billing Client, Origin/Destination Location, Consigner, Consignee).
    - Supports importing with or without configured series prefix/postfix.
    - Accurately links imported jobs to the active issuing office.
    """
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise AppException(
            status_code=400,
            error_code="INVALID_FILE_FORMAT",
            message="Only Excel (.xlsx, .xls) and CSV (.csv) files are supported for mass import."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise AppException(
            status_code=400,
            error_code="EMPTY_FILE",
            message="The uploaded file is empty."
        )

    should_apply_series = True
    if apply_series_prefix_suffix is not None:
        should_apply_series = bool(apply_series_prefix_suffix)
    elif apply_series_prefix_suffix_form is not None:
        should_apply_series = str(apply_series_prefix_suffix_form).strip().lower() in ("true", "1", "yes")

    target_office_id = None
    if office_id is not None and office_id > 0:
        target_office_id = office_id
    elif office_id_form is not None:
        try:
            val = int(str(office_id_form).strip())
            if val > 0:
                target_office_id = val
        except (ValueError, TypeError):
            pass

    if not target_office_id and current_office:
        target_office_id = current_office.id

    res = await import_jobs_from_excel(
        db=db,
        file_bytes=file_bytes,
        filename=file.filename,
        user_id=current_user.id,
        apply_series_prefix_suffix=should_apply_series,
        office_id=target_office_id,
    )
    await log_activity(
        db=db,
        user=current_user,
        action="JOBS_EXCEL_IMPORTED",
        module="transport",
        entity_type="Job",
        office_id=target_office_id,
        details=f"Imported {getattr(res, 'imported_count', 0)} jobs from {file.filename}",
        details_json={"filename": file.filename, "imported_count": getattr(res, "imported_count", 0)},
    )
    return res

@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    limit: Optional[int] = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(require_permission("transport", "jobs", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    target_office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    jobs = await service.get_all_jobs(
        db,
        office_id=target_office_id,
        include_unassigned=include_unassigned,
        limit=limit,
        offset=offset,
        search=search,
    )
    return [
        JobResponse(
            id=j.id,
            job_number=j.job_number,
            issuing_office_id=j.issuing_office_id,
            issuing_office_name=j.issuing_office.name if j.issuing_office else None,
            job_date=j.job_date,
            consigner_id=j.consigner_id,
            consignee_id=j.consignee_id,
            origin_location_id=j.origin_location_id,
            destination_location_id=j.destination_location_id,
            billing_client_id=j.billing_client_id,
            billing_party=j.billing_party or (j.billing_client.name if j.billing_client else None),
            expected_dispatch_date=j.expected_dispatch_date,
            cargo_description=j.cargo_description,
            estimated_weight_mt=j.estimated_weight_mt,
            estimated_packages=j.estimated_packages,
            status=j.status,
            special_instructions=j.special_instructions,
            created_by_user_id=j.created_by_user_id,
            consigner_name=j.consigner.name if j.consigner else None,
            consigner_code=j.consigner.code if j.consigner else None,
            consignee_name=j.consignee.name if j.consignee else None,
            consignee_code=j.consignee.code if j.consignee else None,
            billing_client_name=j.billing_client.name if j.billing_client else (j.billing_party or None),
            origin_city=j.origin_location.city_name if j.origin_location else None,
            destination_city=j.destination_location.city_name if j.destination_location else None,
            created_at=j.created_at,
            updated_at=j.updated_at,
        )
        for j in jobs
    ]

@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    data: JobCreate,
    current_user: User = Depends(require_permission("transport", "jobs", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    eff_office_id = data.issuing_office_id or (current_office.id if current_office else None)
    job = await service.create_job(db, data, user_id=current_user.id, office_id=eff_office_id)
    target_office_id = job.issuing_office_id or eff_office_id
    office_name = job.issuing_office.name if getattr(job, "issuing_office", None) else (current_office.name if current_office else None)
    office_code = job.issuing_office.code if getattr(job, "issuing_office", None) else (current_office.code if current_office else None)
    await log_activity(
        db=db,
        user=current_user,
        action="JOB_CREATED",
        module="transport",
        entity_type="Job",
        entity_id=str(job.id),
        entity_identifier=job.job_number,
        office_id=target_office_id,
        office_name=office_name,
        office_code=office_code,
        details_json={
            "job_number": job.job_number,
            "job_date": str(job.job_date) if job.job_date else None,
            "billing_party": job.billing_party,
            "consigner_name": job.consigner.name if getattr(job, "consigner", None) else None,
            "consignee_name": job.consignee.name if getattr(job, "consignee", None) else None,
            "status": job.status,
            "cargo_description": job.cargo_description,
            "estimated_packages": job.estimated_packages,
            "estimated_weight_mt": float(job.estimated_weight_mt) if job.estimated_weight_mt else None,
        },
    )
    return JobResponse(
        id=job.id,
        job_number=job.job_number,
        issuing_office_id=job.issuing_office_id,
        issuing_office_name=job.issuing_office.name if job.issuing_office else None,
        job_date=job.job_date,
        consigner_id=job.consigner_id,
        consignee_id=job.consignee_id,
        origin_location_id=job.origin_location_id,
        destination_location_id=job.destination_location_id,
        billing_client_id=job.billing_client_id,
        billing_party=job.billing_party or (job.billing_client.name if job.billing_client else None),
        expected_dispatch_date=job.expected_dispatch_date,
        cargo_description=job.cargo_description,
        estimated_weight_mt=job.estimated_weight_mt,
        estimated_packages=job.estimated_packages,
        status=job.status,
        special_instructions=job.special_instructions,
        created_by_user_id=job.created_by_user_id,
        consigner_name=job.consigner.name if job.consigner else None,
        consigner_code=job.consigner.code if job.consigner else None,
        consignee_name=job.consignee.name if job.consignee else None,
        consignee_code=job.consignee.code if job.consignee else None,
        billing_client_name=job.billing_client.name if job.billing_client else (job.billing_party or None),
        origin_city=job.origin_location.city_name if job.origin_location else None,
        destination_city=job.destination_location.city_name if job.destination_location else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )

@router.put("/jobs/{id}", response_model=JobResponse)
async def update_job(
    id: int,
    data: JobUpdate,
    current_user: User = Depends(require_permission("transport", "jobs", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    job = await service.update_job(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="JOB_UPDATED",
        module="transport",
        entity_type="Job",
        entity_id=str(job.id),
        entity_identifier=job.job_number,
        office_id=job.issuing_office_id,
        details=f"Updated Job {job.job_number}",
        details_json=data.model_dump(exclude_unset=True),
    )
    return JobResponse(
        id=job.id,
        job_number=job.job_number,
        issuing_office_id=job.issuing_office_id,
        issuing_office_name=job.issuing_office.name if job.issuing_office else None,
        job_date=job.job_date,
        consigner_id=job.consigner_id,
        consignee_id=job.consignee_id,
        origin_location_id=job.origin_location_id,
        destination_location_id=job.destination_location_id,
        billing_client_id=job.billing_client_id,
        billing_party=job.billing_party or (job.billing_client.name if job.billing_client else None),
        expected_dispatch_date=job.expected_dispatch_date,
        cargo_description=job.cargo_description,
        estimated_weight_mt=job.estimated_weight_mt,
        estimated_packages=job.estimated_packages,
        status=job.status,
        special_instructions=job.special_instructions,
        created_by_user_id=job.created_by_user_id,
        consigner_name=job.consigner.name if job.consigner else None,
        consigner_code=job.consigner.code if job.consigner else None,
        consignee_name=job.consignee.name if job.consignee else None,
        consignee_code=job.consignee.code if job.consignee else None,
        billing_client_name=job.billing_client.name if job.billing_client else (job.billing_party or None),
        origin_city=job.origin_location.city_name if job.origin_location else None,
        destination_city=job.destination_location.city_name if job.destination_location else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )

@router.post("/jobs/{id}/transition", response_model=JobResponse)
async def transition_job_status(
    id: int,
    req: JobStatusTransitionRequest,
    current_user: User = Depends(require_permission("transport", "jobs", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    job = await service.transition_job_status(db, id, req.target_status, req.remarks)
    await log_activity(
        db=db,
        user=current_user,
        action="JOB_STATUS_CHANGED",
        module="transport",
        entity_type="Job",
        entity_id=str(job.id),
        entity_identifier=job.job_number,
        office_id=job.issuing_office_id,
        details=f"Transitioned Job {job.job_number} status to {req.target_status}" + (f" ({req.remarks})" if req.remarks else ""),
        details_json={"target_status": req.target_status, "remarks": req.remarks},
    )

    return JobResponse(
        id=job.id,
        job_number=job.job_number,
        issuing_office_id=job.issuing_office_id,
        issuing_office_name=job.issuing_office.name if job.issuing_office else None,
        job_date=job.job_date,
        consigner_id=job.consigner_id,
        consignee_id=job.consignee_id,
        origin_location_id=job.origin_location_id,
        destination_location_id=job.destination_location_id,
        billing_client_id=job.billing_client_id,
        billing_party=job.billing_party or (job.billing_client.name if job.billing_client else None),
        expected_dispatch_date=job.expected_dispatch_date,
        cargo_description=job.cargo_description,
        estimated_weight_mt=job.estimated_weight_mt,
        estimated_packages=job.estimated_packages,
        status=job.status,
        special_instructions=job.special_instructions,
        created_by_user_id=job.created_by_user_id,
        consigner_name=job.consigner.name if job.consigner else None,
        consigner_code=job.consigner.code if job.consigner else None,
        consignee_name=job.consignee.name if job.consignee else None,
        consignee_code=job.consignee.code if job.consignee else None,
        billing_client_name=job.billing_client.name if job.billing_client else (job.billing_party or None),
        origin_city=job.origin_location.city_name if job.origin_location else None,
        destination_city=job.destination_location.city_name if job.destination_location else None,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )

# ==============================================================================
# 6. GR / LR Booking & Transitions
# ==============================================================================
def _build_lr_response(l: LR) -> LRResponse:
    consigner_addr_parts = []
    if l.consigner:
        consigner_addr_parts = [p for p in [l.consigner.address, l.consigner.city, l.consigner.state, l.consigner.pincode] if p]
    consignee_addr_parts = []
    if l.consignee:
        consignee_addr_parts = [p for p in [l.consignee.address, l.consignee.city, l.consignee.state, l.consignee.pincode] if p]

    return LRResponse(
        id=l.id,
        lr_number=l.lr_number,
        issuing_office_id=l.issuing_office_id,
        issuing_office_name=l.issuing_office.name if l.issuing_office else None,
        issuing_office_code=l.issuing_office.code if l.issuing_office else None,
        lr_date=l.lr_date,
        job_id=l.job_id,
        booking_status=l.booking_status or "Booked",
        dispatch_date=l.dispatch_date or l.lr_date,
        appointment_date=l.appointment_date,
        billing_customer_id=l.billing_customer_id,
        billing_customer_name=l.billing_customer.name if l.billing_customer else None,
        consigner_id=l.consigner_id,
        consigner_name=l.consigner.name if l.consigner else None,
        consigner_address=", ".join(consigner_addr_parts) if consigner_addr_parts else None,
        consignee_id=l.consignee_id,
        consignee_name=l.consignee.name if l.consignee else None,
        consignee_address=", ".join(consignee_addr_parts) if consignee_addr_parts else None,
        origin_location_id=l.origin_location_id,
        origin_city=l.origin_location.city_name if l.origin_location else None,
        destination_location_id=l.destination_location_id,
        destination_city=l.destination_location.city_name if l.destination_location else None,
        via=l.via,
        vehicle_source=l.vehicle_source,
        vehicle_number=l.vehicle_number,
        vehicle_type=l.vehicle_type,
        driver_name=l.driver_name,
        driver_phone=l.driver_phone,
        eway_bill_number=l.eway_bill_number,
        eway_bill_date=l.eway_bill_date,
        eway_bill_expiry=l.eway_bill_expiry,
        invoice_no=l.invoice_no,
        invoice_date=l.invoice_date,
        invoice_value=l.invoice_value,
        cha_job_number=l.cha_job_number,
        unit_id=l.unit_id,
        packing_method_id=l.packing_method_id,
        packing_method_name=l.packing_method.name if l.packing_method else None,
        package_count=l.package_count,
        actual_weight_mt=l.actual_weight_mt,
        chargeable_weight_mt=l.chargeable_weight_mt,
        bill_of_entry=l.bill_of_entry,
        container_no=l.container_no,
        load_type_id=l.load_type_id,
        load_type=l.load_type,
        load_type_name=l.load_type_rel.name if l.load_type_rel else l.load_type,
        payment_type=l.payment_type or "To Be Billed",
        eta=l.eta,
        particulars=l.particulars,
        lr_series_id=l.lr_series_id,
        freight_rate=l.freight_rate,
        freight_amount=l.freight_amount,
        loading_charges=l.loading_charges,
        unloading_charges=l.unloading_charges,
        other_charges=l.other_charges,
        total_freight_amount=l.total_freight_amount,
        advance_amount=l.advance_amount,
        balance_amount=l.balance_amount,
        payment_terms=l.payment_terms,
        status=l.status,
        remarks=l.remarks,
        created_by_user_id=l.created_by_user_id,
        invoice_items=l.invoice_items or [],
        job_number=l.job.job_number if l.job else None,
        created_at=l.created_at,
        updated_at=l.updated_at,
    )

@router.get("/lrs", response_model=List[LRResponse])
async def list_lrs(
    limit: Optional[int] = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    _ensure_lr_view_access(current_user)

    target_office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    lrs = await service.get_all_lrs(
        db,
        office_id=target_office_id,
        include_unassigned=include_unassigned,
        limit=limit,
        offset=offset,
        search=search,
    )
    return [_build_lr_response(l) for l in lrs]



@router.get("/lrs-search", response_model=List[LRSearchResult])
async def search_lrs(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(8, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    _ensure_lr_view_access(current_user)
    target_office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    matches = await service.search_lrs(
        db,
        query=q,
        office_id=target_office_id,
        include_unassigned=include_unassigned,
        limit=limit,
    )
    return [
        LRSearchResult(
            id=lr.id,
            lr_number=lr.lr_number,
            lr_date=lr.lr_date,
            vehicle_number=lr.vehicle_number,
            status=lr.status,
            consigner_name=lr.consigner.name if lr.consigner else None,
            consignee_name=lr.consignee.name if lr.consignee else None,
            origin_city=lr.origin_location.city_name if lr.origin_location else None,
            destination_city=lr.destination_location.city_name if lr.destination_location else None,
        )
        for lr in matches
    ]

@router.get("/lrs/{id}", response_model=LRResponse)
async def get_lr(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    lr = await service.get_lr_by_id(db, id)
    return _build_lr_response(lr)

@router.post("/lrs", response_model=LRResponse, status_code=status.HTTP_201_CREATED)
async def create_lr(
    data: LRCreate,
    current_user: User = Depends(require_permission("transport", "lr_booking", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_lrs_per_month")
    eff_office_id = data.issuing_office_id or (current_office.id if current_office else None)
    lr = await service.create_lr(db, data, user_id=current_user.id, office_id=eff_office_id)
    target_office_id = lr.issuing_office_id or eff_office_id
    office_name = lr.issuing_office.name if getattr(lr, "issuing_office", None) else (current_office.name if current_office else None)
    office_code = lr.issuing_office.code if getattr(lr, "issuing_office", None) else (current_office.code if current_office else None)
    await log_activity(
        db=db,
        user=current_user,
        action="LR_CREATED",
        module="transport",
        entity_type="LR",
        entity_id=str(lr.id),
        entity_identifier=lr.lr_number,
        office_id=target_office_id,
        office_name=office_name,
        office_code=office_code,
        details_json={
            "lr_number": lr.lr_number,
            "lr_date": str(lr.lr_date) if lr.lr_date else None,
            "vehicle_number": lr.vehicle_number,
            "booking_status": lr.booking_status,
            "consigner_id": lr.consigner_id,
            "consigner_name": lr.consigner.name if getattr(lr, "consigner", None) else None,
            "consignee_id": lr.consignee_id,
            "consignee_name": lr.consignee.name if getattr(lr, "consignee", None) else None,
            "total_freight_amount": float(lr.total_freight_amount or 0),
            "package_count": lr.package_count,
            "chargeable_weight_mt": float(lr.chargeable_weight_mt or 0) if lr.chargeable_weight_mt else None,
        },
    )
    return _build_lr_response(lr)

@router.put("/lrs/{id}", response_model=LRResponse)
async def update_lr(
    id: int,
    data: LRUpdate,
    current_user: User = Depends(require_permission("transport", "lr_booking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    lr = await service.update_lr(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="LR_UPDATED",
        module="transport",
        entity_type="LR",
        entity_id=str(lr.id),
        entity_identifier=lr.lr_number,
        office_id=lr.issuing_office_id,
        details=f"Updated LR {lr.lr_number}",
        details_json=data.model_dump(exclude_unset=True),
    )
    return _build_lr_response(lr)

@router.post("/lrs/{id}/transition", response_model=LRResponse)
async def transition_lr_status(
    id: int,
    req: LRStatusTransitionRequest,
    current_user: User = Depends(require_permission("transport", "lr_booking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    lr = await service.transition_lr_status(db, id, req.target_status, req.remarks)
    await log_activity(
        db=db,
        user=current_user,
        action="LR_STATUS_CHANGED",
        module="transport",
        entity_type="LR",
        entity_id=str(lr.id),
        entity_identifier=lr.lr_number,
        office_id=lr.issuing_office_id,
        details=f"Transitioned LR {lr.lr_number} status to {req.target_status}" + (f" ({req.remarks})" if req.remarks else ""),
        details_json={"target_status": req.target_status, "remarks": req.remarks},
    )
    return _build_lr_response(lr)

# ==============================================================================
# 7. Hire Challans
# ==============================================================================
def _build_hire_challan_response(c: Any) -> HireChallanResponse:
    return HireChallanResponse(
        id=c.id,
        challan_number=c.challan_number,
        issuing_office_id=c.issuing_office_id,
        issuing_office_name=c.issuing_office.name if c.issuing_office else None,
        issuing_office_code=c.issuing_office.code if c.issuing_office else None,
        hc_series_id=c.hc_series_id,
        challan_date=c.challan_date,
        lr_id=c.lr_id,
        vehicle_number=c.vehicle_number,
        market_vehicle_id=c.market_vehicle_id,
        owner_id=c.owner_id,
        driver_id=c.driver_id,
        driver_name=c.driver_name,
        driver_phone=c.driver_phone,
        from_location=c.from_location,
        to_location=c.to_location,
        hire_rate=c.hire_rate,
        advance_amount=c.advance_amount,
        balance_amount=c.balance_amount,
        tds_category=c.tds_category,
        tds_rate=c.tds_rate,
        tds_amount=c.tds_amount,
        vendor_ref_no=c.vendor_ref_no,
        detention_charge=c.detention_charge,
        mamul_charges=c.mamul_charges,
        net_payable_amount=c.net_payable_amount,
        loading_expenses=c.loading_expenses or [],
        unloading_expenses=c.unloading_expenses or [],
        status=c.status,
        remarks=c.remarks,
        lr_number=c.lr.lr_number if c.lr else None,
        owner_name=c.owner.name if c.owner else None,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )

@router.get("/hire-challans", response_model=List[HireChallanResponse])
async def list_hire_challans(
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    if current_user.role != "COMPANY_ADMIN":
        if not current_user.custom_role or not current_user.custom_role.permissions:
            raise ForbiddenException(
                message="Access denied. Missing permission: transport.hire_challan.view",
                details={"required": "transport.hire_challan.view"}
            )
        has_perm = any(
            (
                (p.module == "transport" and p.feature == "hire_challan" and (p.permission in ("view", "all")))
                or (p.module == "accounts" and p.feature in ("payment_voucher", "voucher", "all", "*", "general") and (p.permission in ("view", "create", "all")))
                or (p.module.replace("-", "_") in ("transport_reports", "transport-reports") and p.feature in ("hc_register", "pending_hc") and (p.permission in ("view", "all")))
            )
            and p.is_allowed
            for p in current_user.custom_role.permissions
        )
        if not has_perm:
            raise ForbiddenException(
                message="Access denied. Missing permission: transport.hire_challan.view",
                details={"required": "transport.hire_challan.view"}
            )

    target_office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    challans = await service.get_all_hire_challans(db, office_id=target_office_id, include_unassigned=include_unassigned)
    return [_build_hire_challan_response(c) for c in challans]

@router.get("/hire-challans/{id}", response_model=HireChallanResponse)
async def get_hire_challan(
    id: int,
    current_user: User = Depends(require_permission("transport", "hire_challan", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    from app.tenant_db.models import HireChallan
    hc = await db.get(HireChallan, id)
    if not hc:
        raise AppException(status_code=404, error_code="NOT_FOUND", message="Hire Challan not found.")
    return _build_hire_challan_response(hc)

@router.post("/hire-challans", response_model=HireChallanResponse, status_code=status.HTTP_201_CREATED)
async def create_hire_challan(
    data: HireChallanCreate,
    current_user: User = Depends(require_permission("transport", "hire_challan", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_hire_challans_per_month")
    eff_office_id = data.issuing_office_id or (current_office.id if current_office else None)
    hc = await service.create_hire_challan(db, data, office_id=eff_office_id)
    target_office_id = hc.issuing_office_id or eff_office_id
    office_name = hc.issuing_office.name if getattr(hc, "issuing_office", None) else (current_office.name if current_office else None)
    office_code = hc.issuing_office.code if getattr(hc, "issuing_office", None) else (current_office.code if current_office else None)
    await log_activity(
        db=db,
        user=current_user,
        action="HIRE_CHALLAN_CREATED",
        module="transport",
        entity_type="HireChallan",
        entity_id=str(hc.id),
        entity_identifier=hc.challan_number,
        office_id=target_office_id,
        office_name=office_name,
        office_code=office_code,
        details_json={
            "challan_number": hc.challan_number,
            "vehicle_number": hc.vehicle_number,
            "driver_name": hc.driver_name,
            "hire_rate": float(hc.hire_rate or 0),
            "advance_amount": float(hc.advance_amount or 0),
            "balance_amount": float(hc.balance_amount or 0),
            "status": hc.status,
        },
    )
    return _build_hire_challan_response(hc)

@router.put("/hire-challans/{id}", response_model=HireChallanResponse)
async def update_hire_challan(
    id: int,
    data: HireChallanUpdate,
    current_user: User = Depends(require_permission("transport", "hire_challan", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    hc = await service.update_hire_challan(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="HIRE_CHALLAN_UPDATED",
        module="transport",
        entity_type="HireChallan",
        entity_id=str(hc.id),
        entity_identifier=hc.challan_number,
        office_id=hc.issuing_office_id,
        details=f"Updated Hire Challan {hc.challan_number}",
        details_json=data.model_dump(exclude_unset=True),
    )
    return _build_hire_challan_response(hc)

@router.post("/hire-challans/{id}/settle", response_model=HireChallanResponse)
async def settle_hire_challan(
    id: int,
    req: HireChallanSettleRequest,
    current_user: User = Depends(require_permission("transport", "hire_challan", "approve")),
    db: AsyncSession = Depends(get_tenant_db),
):
    hc = await service.settle_hire_challan(db, id, req.settlement_notes)
    await log_activity(
        db=db,
        user=current_user,
        action="HIRE_CHALLAN_SETTLED",
        module="transport",
        entity_type="HireChallan",
        entity_id=str(hc.id),
        entity_identifier=hc.challan_number,
        office_id=hc.issuing_office_id,
        details=f"Settled Hire Challan {hc.challan_number}" + (f" ({req.settlement_notes})" if req.settlement_notes else ""),
        details_json={"settlement_notes": req.settlement_notes, "status": hc.status},
    )
    return _build_hire_challan_response(hc)

# ==============================================================================
# 8. Arrival Reports
# ==============================================================================
@router.get("/arrival-reports", response_model=List[ArrivalReportResponse])
async def list_arrival_reports(
    current_user: User = Depends(require_permission("transport", "arrival_reports", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    reports = await service.get_all_arrival_reports(db, office_id=office_id, include_unassigned=include_unassigned)
    return [
        ArrivalReportResponse(
            id=r.id,
            report_number=r.report_number,
            arrival_date=r.arrival_date,
            lr_id=r.lr_id,
            job_id=r.job_id,
            destination_hub=r.destination_hub,
            packages_received=r.packages_received,
            packages_damaged=r.packages_damaged,
            packages_short=r.packages_short,
            condition_remarks=r.condition_remarks,
            unloaded_by=r.unloaded_by,
            receiver_name=r.receiver_name,
            status=r.status,
            lr_number=r.lr.lr_number if r.lr else None,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in reports
    ]

@router.post("/arrival-reports", response_model=ArrivalReportResponse, status_code=status.HTTP_201_CREATED)
async def create_arrival_report(
    data: ArrivalReportCreate,
    current_user: User = Depends(require_permission("transport", "arrival_reports", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    ar = await service.create_arrival_report(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="ARRIVAL_REPORT_CREATED",
        module="transport",
        entity_type="ArrivalReport",
        entity_id=str(ar.id),
        entity_identifier=ar.report_number,
        details=f"Created Arrival Report {ar.report_number}",
        details_json={
            "report_number": ar.report_number,
            "lr_id": ar.lr_id,
            "packages_received": ar.packages_received,
            "packages_damaged": ar.packages_damaged,
            "packages_short": ar.packages_short,
            "status": ar.status,
        },
    )
    return ArrivalReportResponse(
        id=ar.id,
        report_number=ar.report_number,
        arrival_date=ar.arrival_date,
        lr_id=ar.lr_id,
        job_id=ar.job_id,
        destination_hub=ar.destination_hub,
        packages_received=ar.packages_received,
        packages_damaged=ar.packages_damaged,
        packages_short=ar.packages_short,
        condition_remarks=ar.condition_remarks,
        unloaded_by=ar.unloaded_by,
        receiver_name=ar.receiver_name,
        status=ar.status,
        lr_number=ar.lr.lr_number if ar.lr else None,
        created_at=ar.created_at,
        updated_at=ar.updated_at,
    )

# ==============================================================================
# 9. POD Records & Verification
# ==============================================================================
@router.get("/pod-records", response_model=List[PODRecordResponse])
async def list_pod_records(
    current_user: User = Depends(require_permission("transport", "pod_records", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    pods = await service.get_all_pod_records(db, office_id=office_id, include_unassigned=include_unassigned)
    return [
        PODRecordResponse(
            id=p.id,
            pod_number=p.pod_number,
            lr_id=p.lr_id,
            delivery_date=p.delivery_date,
            receiver_name=p.receiver_name,
            receiver_phone=p.receiver_phone,
            received_condition=p.received_condition,
            packages_delivered=p.packages_delivered,
            document_path=p.document_path,
            remarks=p.remarks,
            verification_status=p.verification_status,
            verified_by_user_id=p.verified_by_user_id,
            verified_at=p.verified_at,
            lr_number=p.lr.lr_number if p.lr else None,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in pods
    ]

@router.post("/pod-records", response_model=PODRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_pod_record(
    data: PODRecordCreate,
    current_user: User = Depends(require_permission("transport", "pod_records", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    pod = await service.create_pod_record(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="POD_UPLOADED",
        module="transport",
        entity_type="POD",
        entity_id=str(pod.id),
        entity_identifier=pod.pod_number or f"LR-{pod.lr_id}",
        details=f"Uploaded POD for LR ID {pod.lr_id}",
        details_json={"lr_id": pod.lr_id, "packages_delivered": pod.packages_delivered},
    )
    return PODRecordResponse(
        id=pod.id,
        pod_number=pod.pod_number,
        lr_id=pod.lr_id,
        delivery_date=pod.delivery_date,
        receiver_name=pod.receiver_name,
        receiver_phone=pod.receiver_phone,
        received_condition=pod.received_condition,
        packages_delivered=pod.packages_delivered,
        document_path=pod.document_path,
        remarks=pod.remarks,
        verification_status=pod.verification_status,
        verified_by_user_id=pod.verified_by_user_id,
        verified_at=pod.verified_at,
        lr_number=pod.lr.lr_number if pod.lr else None,
        created_at=pod.created_at,
        updated_at=pod.updated_at,
    )

@router.post("/pod-records/{id}/verify", response_model=PODRecordResponse)
async def verify_pod_record(
    id: int,
    req: PODRecordVerifyRequest,
    current_user: User = Depends(require_permission("transport", "pod_records", "approve")),
    db: AsyncSession = Depends(get_tenant_db),
):
    pod = await service.verify_pod_record(db, id, req.verification_status, user_id=current_user.id, notes=req.verification_notes)
    await log_activity(
        db=db,
        user=current_user,
        action="POD_VERIFIED",
        module="transport",
        entity_type="POD",
        entity_id=str(pod.id),
        entity_identifier=pod.pod_number or f"LR-{pod.lr_id}",
        details=f"Verified POD for LR ID {pod.lr_id} (Status: {req.verification_status})",
        details_json={"lr_id": pod.lr_id, "verification_status": req.verification_status, "remarks": req.verification_notes},
    )
    return PODRecordResponse(
        id=pod.id,
        pod_number=pod.pod_number,
        lr_id=pod.lr_id,
        delivery_date=pod.delivery_date,
        receiver_name=pod.receiver_name,
        receiver_phone=pod.receiver_phone,
        received_condition=pod.received_condition,
        packages_delivered=pod.packages_delivered,
        document_path=pod.document_path,
        remarks=pod.remarks,
        verification_status=pod.verification_status,
        verified_by_user_id=pod.verified_by_user_id,
        verified_at=pod.verified_at,
        lr_number=pod.lr.lr_number if pod.lr else None,
        created_at=pod.created_at,
        updated_at=pod.updated_at,
    )

# ==============================================================================
# 10. Truck Hiring Notes
# ==============================================================================
@router.get("/truck-hiring-notes", response_model=List[TruckHiringNoteResponse])
async def list_truck_hiring_notes(
    current_user: User = Depends(require_permission("transport", "truck_hiring_note", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    target_office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await service.get_all_truck_hiring_notes(db, office_id=target_office_id, include_unassigned=include_unassigned)

@router.post("/truck-hiring-notes", response_model=TruckHiringNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_truck_hiring_note(
    data: TruckHiringNoteCreate,
    current_user: User = Depends(require_permission("transport", "truck_hiring_note", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    note = await service.create_truck_hiring_note(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="TRUCK_HIRING_NOTE_CREATED",
        module="transport",
        entity_type="TruckHiringNote",
        entity_id=str(note.id),
        entity_identifier=note.note_number,
        details=f"Created Truck Hiring Note {note.note_number}",
        details_json={"note_number": note.note_number, "vehicle_number": note.vehicle_number},
    )
    return note

# ==============================================================================
# 11. E-Way Bills (Manual Entry & Live Portal Fetch)
# ==============================================================================
@router.get("/eway-bill/fetch")
async def fetch_eway_bill_details(
    ewb_number: Optional[str] = Query(None, description="12-digit E-Way Bill Number"),
    ewbNo: Optional[str] = Query(None, description="Legacy ewbNo parameter matching ajax_get_ewb.php"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    target = ewb_number or ewbNo
    if not target or not target.strip():
        raise AppException(status_code=400, error_code="MISSING_EWB_PARAM", message="Please provide an E-Way Bill Number to fetch.")
    return await service.fetch_live_eway_bill(db, target.strip())


@router.get("/eway-bills", response_model=List[EWayBillResponse])
async def list_eway_bills(
    current_user: User = Depends(require_permission("transport", "eway_bill", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    target_office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    bills = await service.get_all_eway_bills(db, office_id=target_office_id, include_unassigned=include_unassigned)
    return [
        EWayBillResponse(
            id=b.id,
            eway_bill_number=b.eway_bill_number,
            lr_id=b.lr_id,
            generated_date=b.generated_date,
            valid_until=b.valid_until,
            from_pincode=b.from_pincode,
            to_pincode=b.to_pincode,
            approx_distance_km=b.approx_distance_km,
            vehicle_number=b.vehicle_number,
            status=b.status,
            is_manual_entry=b.is_manual_entry,
            notes=b.notes,
            lr_number=b.lr.lr_number if b.lr else None,
            created_at=b.created_at,
            updated_at=b.updated_at,
        )
        for b in bills
    ]

@router.post("/eway-bills", response_model=EWayBillResponse, status_code=status.HTTP_201_CREATED)
async def create_eway_bill(
    data: EWayBillCreate,
    current_user: User = Depends(require_permission("transport", "eway_bill", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    b = await service.create_eway_bill(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="EWAY_BILL_CREATED",
        module="transport",
        entity_type="EWayBill",
        entity_id=str(b.id),
        entity_identifier=b.eway_bill_number,
        details=f"Generated E-Way Bill {b.eway_bill_number}",
        details_json={"eway_bill_number": b.eway_bill_number, "vehicle_number": b.vehicle_number},
    )
    return EWayBillResponse(
        id=b.id,
        eway_bill_number=b.eway_bill_number,
        lr_id=b.lr_id,
        generated_date=b.generated_date,
        valid_until=b.valid_until,
        from_pincode=b.from_pincode,
        to_pincode=b.to_pincode,
        approx_distance_km=b.approx_distance_km,
        vehicle_number=b.vehicle_number,
        status=b.status,
        is_manual_entry=b.is_manual_entry,
        notes=b.notes,
        created_at=b.created_at,
        updated_at=b.updated_at,
    )

# ==============================================================================
# 12. Tracking Telemetry (FASTag / GPS / SIM Telemetry Shell per Rules §2)
# ==============================================================================
@router.get("/tracking", response_model=List[TrackingPingResponse])
async def get_tracking_telemetry(
    current_user: User = Depends(require_permission("transport", "tracking", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_latest_tracking_pings(db)

@router.post("/tracking", response_model=TrackingPingResponse, status_code=status.HTTP_201_CREATED)
async def record_tracking_ping(
    data: TrackingPingCreate,
    current_user: User = Depends(require_permission("transport", "tracking", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.record_tracking_ping(db, data)


# ==============================================================================
# 13. Freight Tiger SIM-Based Tracking (PRD §11 / FT Trip APIs)
# ==============================================================================

def _format_sim_trip(t: Any) -> SIMTripResponse:
    consignor_name = getattr(t, "consignor_name", None)
    consignee_name = getattr(t, "consignee_name", None)
    if not consignor_name and getattr(t, "lr", None) and getattr(t.lr, "consigner", None):
        consignor_name = t.lr.consigner.name
    if not consignee_name and getattr(t, "lr", None) and getattr(t.lr, "consignee", None):
        consignee_name = t.lr.consignee.name

    operator_name = getattr(t, "operator_name", None)
    if not operator_name and t.driver_phone:
        from app.integrations.freight_tiger import detect_telecom_operator
        operator_name = detect_telecom_operator(t.driver_phone)

    return SIMTripResponse(
        id=t.id,
        feed_unique_id=t.feed_unique_id,
        ft_trip_id=t.ft_trip_id,
        lr_id=t.lr_id,
        lr_number=t.lr.lr_number if getattr(t, "lr", None) else None,
        vehicle_number=t.vehicle_number,
        driver_name=t.driver_name,
        driver_phone=t.driver_phone,
        operator_name=operator_name or "Jio",
        consignor_name=consignor_name or "NA",
        consignee_name=consignee_name or "NA",
        milestone=getattr(t, "milestone", "In Transit") or "In Transit",
        trip_direction=getattr(t, "trip_direction", "Outbound") or "Outbound",
        is_delayed=bool(getattr(t, "is_delayed", False)),
        is_starred=bool(getattr(t, "is_starred", False)),
        ewb_number=getattr(t, "ewb_number", None),
        ewb_expiry=getattr(t, "ewb_expiry", None),
        comments=getattr(t, "comments", []) or [],
        consent_status=t.consent_status,
        is_consent_done=t.is_consent_done,
        status=t.status,
        status_code=t.status_code,
        share_url=t.share_url,
        last_latitude=t.last_latitude,
        last_longitude=t.last_longitude,
        last_location_address=t.last_location_address,
        recorded_at=t.recorded_at,
        eta=t.eta,
        eta_updated_at=t.eta_updated_at,
        distance_remaining_km=t.distance_remaining_km,
        total_distance_km=t.total_distance_km,
        origin_address=t.origin_address,
        destination_address=t.destination_address,
        route_code=t.route_code,
        last_synced_at=t.last_synced_at,
        last_billed_at=getattr(t, "last_billed_at", None),
        billing_cycles_charged=getattr(t, "billing_cycles_charged", 1) or 1,
        closed_at=t.closed_at,
        close_comment=t.close_comment,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.get("/tracking/sim", response_model=List[SIMTripResponse])
async def list_sim_trips(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_permission("transport", "tracking", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists all SIM-based trip tracking records."""
    trips = await service.get_sim_trips(db, status_filter=status_filter)
    return [_format_sim_trip(t) for t in trips]


@router.post("/tracking/sim/start", response_model=SIMTripResponse, status_code=status.HTTP_201_CREATED)
async def start_sim_tracking(
    data: SIMTripCreate,
    current_user: User = Depends(require_permission("transport", "tracking", "create")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Initiates Freight Tiger SIM-based tracking for a vehicle & driver.
    Queues telecom carrier driver consent SMS.
    Deducts ₹8.50 from SIM Tracking Wallet for initial 24 hours.
    """
    trip = await service.create_sim_trip(
        db,
        data,
        tenant_id=tenant.tenant_id,
        company_code=tenant.company_code,
    )
    await log_activity(
        db=db,
        user=current_user,
        action="SIM_TRIP_STARTED",
        module="transport",
        entity_type="SIMTrip",
        entity_id=str(trip.id),
        entity_identifier=trip.vehicle_number,
        details=f"Started SIM tracking for {trip.vehicle_number} (Driver: {trip.driver_phone})",
        details_json={"vehicle_number": trip.vehicle_number, "driver_phone": trip.driver_phone, "ft_trip_id": trip.ft_trip_id},
    )
    return _format_sim_trip(trip)


@router.get("/tracking/sim/{trip_id}", response_model=SIMTripResponse)
async def get_sim_trip(
    trip_id: int,
    current_user: User = Depends(require_permission("transport", "tracking", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    trip = await service.get_sim_trip_by_id(db, trip_id)
    if not trip:
        raise NotFoundException("SIM Trip not found")
    return _format_sim_trip(trip)


@router.post("/tracking/sim/{trip_id}/sync", response_model=SIMTripResponse)
async def sync_sim_trip(
    trip_id: int,
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Polls Freight Tiger for live GPS/cell-tower coordinates and consent status."""
    trip = await service.get_sim_trip_by_id(db, trip_id)
    if not trip:
        raise NotFoundException("SIM Trip not found")
    updated_trip = await service.sync_sim_trip(
        db,
        trip,
        tenant_id=tenant.tenant_id,
        company_code=tenant.company_code,
    )
    return _format_sim_trip(updated_trip)


@router.post("/tracking/sim/{trip_id}/close", response_model=SIMTripResponse)
async def close_sim_trip(
    trip_id: int,
    data: SIMTripClose,
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Terminates SIM-based tracking session via Freight Tiger CloseTrip API."""
    trip = await service.get_sim_trip_by_id(db, trip_id)
    if not trip:
        raise NotFoundException("SIM Trip not found")
    updated_trip = await service.close_sim_trip(db, trip, comment=data.comment)
    await log_activity(
        db=db,
        user=current_user,
        action="SIM_TRIP_CLOSED",
        module="transport",
        entity_type="SIMTrip",
        entity_id=str(trip.id),
        entity_identifier=trip.vehicle_number,
        details=f"Closed SIM tracking for {trip.vehicle_number}",
        details_json={"vehicle_number": trip.vehicle_number, "comment": data.comment},
    )
    return _format_sim_trip(updated_trip)


@router.patch("/tracking/sim/{trip_id}", response_model=SIMTripResponse)
async def update_sim_trip(
    trip_id: int,
    data: SIMTripUpdate,
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Updates editable SIM trip parameters (driver details, star status, milestone, operator)."""
    trip = await service.get_sim_trip_by_id(db, trip_id)
    if not trip:
        raise NotFoundException("SIM Trip not found")
    updated_trip = await service.update_sim_trip(db, trip, data)
    return _format_sim_trip(updated_trip)


@router.post("/tracking/sim/{trip_id}/comments", response_model=SIMTripResponse)
async def add_sim_trip_comment(
    trip_id: int,
    data: SIMTripCommentCreate,
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Appends an operational note or dispatcher comment to the trip record."""
    trip = await service.get_sim_trip_by_id(db, trip_id)
    if not trip:
        raise NotFoundException("SIM Trip not found")
    author_name = current_user.full_name or current_user.email or "Dispatcher"
    updated_trip = await service.add_sim_trip_comment(db, trip, data.comment, author=author_name)
    return _format_sim_trip(updated_trip)


@router.post("/tracking/sim/{trip_id}/simulate-consent", response_model=SIMTripResponse)
async def simulate_sim_consent(
    trip_id: int,
    data: SIMConsentSimulate,
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Sandbox demonstration endpoint: simulates driver SMS reply accepting telecom consent."""
    trip = await service.get_sim_trip_by_id(db, trip_id)
    if not trip:
        raise NotFoundException("SIM Trip not found")
    updated_trip = await service.simulate_sim_consent(
        db,
        trip,
        is_consent_done=data.is_consent_done,
        tenant_id=tenant.tenant_id,
        company_code=tenant.company_code,
    )
    return _format_sim_trip(updated_trip)


@router.post("/tracking/sim/sync-all", response_model=SIMTrackingSyncResponse)
async def sync_all_sim_trips(
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Polls Freight Tiger for all open line-haul trips."""
    count = await service.sync_all_active_sim_trips(
        db,
        tenant_id=tenant.tenant_id,
        company_code=tenant.company_code,
    )
    return SIMTrackingSyncResponse(trips_synced=count, message=f"Successfully synced {count} active SIM tracking trips.")



# ==============================================================================
# 14. FASTag Tracking Endpoints
# ==============================================================================

@router.get("/tracking/fastag/config", response_model=FastagConfigResponse)
async def get_fastag_config(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Returns whether FASTag API and Google Maps API are configured in the environment."""
    from app.core.config import settings
    from app.core.database import ControlSessionLocal
    from app.control.models import Tenant as ControlTenant
    from app.tenant_db.models import CompanySetting
    from sqlalchemy import select

    credits_left = 0
    try:
        async with ControlSessionLocal() as session:
            stmt = select(ControlTenant.fastag_credits_left).where(
                ControlTenant.tenant_id == tenant.tenant_id
            )
            res = await session.execute(stmt)
            val = res.scalar_one_or_none()
            if val is not None:
                credits_left = int(val)
    except Exception:
        pass

    cooldown_minutes = 10
    try:
        cs_res = await db.execute(select(CompanySetting.fastag_cooldown_minutes).limit(1))
        cs_val = cs_res.scalar_one_or_none()
        if cs_val is not None:
            cooldown_minutes = int(cs_val)
    except Exception:
        pass

    return FastagConfigResponse(
        google_maps_configured=bool(settings.GOOGLE_MAPS_API_KEY),
        fastag_api_configured=bool(settings.FASTAG_API_KEY),
        default_map_engine="google" if settings.GOOGLE_MAPS_API_KEY else "leaflet",
        google_maps_api_key=settings.GOOGLE_MAPS_API_KEY or "",
        fastag_credits_left=credits_left,
        rate_per_fetch=1.50,
        cooldown_minutes=cooldown_minutes,
    )


@router.get("/tracking/fastag/track", response_model=FastagTrackResponse)
async def track_fastag_vehicle_endpoint(
    vehicle: str = Query(..., description="Vehicle registration number to track"),
    force: bool = Query(False, description="Bypass 1-hour cooldown and query live FASTag API"),
    manual_from: Optional[str] = Query(None, description="Manual origin location name"),
    manual_to: Optional[str] = Query(None, description="Manual destination location name"),
    current_user: User = Depends(require_permission("transport", "tracking", "view")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Live FASTag vehicle tracking.
    Queries toll plaza logs, calculates highway progress & distances,
    and returns full route waypoints and timeline.
    Checks tenant API credit balance in panther_control and blocks live calls if 0.
    """
    return await service.track_fastag_vehicle(
        db=db,
        vehicle_number=vehicle,
        force_sync=force,
        manual_from=manual_from,
        manual_to=manual_to,
        tenant_id=tenant.tenant_id,
        company_code=tenant.company_code,
    )


@router.post("/tracking/fastag/trips", response_model=FastagTripResponse, status_code=status.HTTP_201_CREATED)
async def create_fastag_trip_endpoint(
    data: FastagTripCreate,
    current_user: User = Depends(require_permission("transport", "tracking", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Saves a FASTag trip record with manual From/To waypoints or links to LR.
    Allows tracking vehicles independently from LR consignments.
    """
    trip = await service.create_manual_fastag_trip(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="FASTAG_TRIP_STARTED",
        module="transport",
        entity_type="FastagTrip",
        entity_id=str(trip.id),
        entity_identifier=trip.vehicle_number,
        details=f"Started FASTag trip for vehicle {trip.vehicle_number}",
        details_json={"vehicle_number": trip.vehicle_number, "from_location": trip.from_location, "to_location": trip.to_location},
    )
    return trip


@router.get("/tracking/fastag/trips", response_model=List[FastagTripResponse])
async def list_fastag_trips_endpoint(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, COMPLETED, CANCELLED"),
    vehicle: Optional[str] = Query(None, description="Filter by vehicle registration number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("transport", "tracking", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists saved FASTag trips."""
    return await service.list_fastag_trips(db, status_filter=status, vehicle=vehicle, skip=skip, limit=limit)


@router.get("/tracking/fastag/trips/{trip_id}", response_model=FastagTripResponse)
async def get_fastag_trip_endpoint(
    trip_id: int,
    current_user: User = Depends(require_permission("transport", "tracking", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Gets details of a specific saved FASTag trip."""
    trip = await service.get_fastag_trip_details(db, trip_id)
    if not trip:
        raise AppException("FASTag trip record not found.", status_code=status.HTTP_404_NOT_FOUND)
    return trip


@router.patch("/tracking/fastag/trips/{trip_id}", response_model=FastagTripResponse)
async def update_fastag_trip_endpoint(
    trip_id: int,
    data: FastagTripUpdate,
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Updates a FASTag trip (e.g. mark status as COMPLETED, change notes, etc.)."""
    trip = await service.update_fastag_trip(db, trip_id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="FASTAG_TRIP_UPDATED",
        module="transport",
        entity_type="FastagTrip",
        entity_id=str(trip_id),
        entity_identifier=getattr(trip, "vehicle_number", str(trip_id)),
        details=f"Updated FASTag trip for vehicle {getattr(trip, 'vehicle_number', trip_id)}",
        details_json=data.model_dump(exclude_unset=True),
    )
    return trip


@router.delete("/tracking/fastag/trips/{trip_id}")
async def delete_fastag_trip_endpoint(
    trip_id: int,
    current_user: User = Depends(require_permission("transport", "tracking", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Deletes a saved FASTag trip record."""
    await service.delete_fastag_trip(db, trip_id)
    await log_activity(
        db=db,
        user=current_user,
        action="FASTAG_TRIP_DELETED",
        module="transport",
        entity_type="FastagTrip",
        entity_id=str(trip_id),
        details=f"Deleted FASTag trip record ID {trip_id}",
    )
    return {"message": "FASTag trip deleted successfully."}


@router.post("/tracking/fastag/auto-sync")
async def auto_sync_fastag_endpoint(
    current_user: User = Depends(require_permission("transport", "tracking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Auto-syncs all vehicles that currently have an active FASTag trip or an in-transit LR.
    Equivalent to legacy action=auto_sync.
    """
    return await service.auto_sync_all_in_transit_fastag(db)

