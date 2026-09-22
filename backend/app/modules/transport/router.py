from typing import List
from fastapi import APIRouter, Depends, status
from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.auth.dependencies import require_permission, get_current_user, check_entitlement_limit
from app.control.models import Tenant
from app.tenant_db.models import User
from app.modules.transport import service
from app.modules.transport.schemas import (
    VehicleOwnerCreate, VehicleOwnerUpdate, VehicleOwnerResponse,
    DriverCreate, DriverUpdate, DriverResponse,
    MarketVehicleCreate, MarketVehicleUpdate, MarketVehicleResponse,
    CompanyVehicleCreate, CompanyVehicleUpdate, CompanyVehicleResponse,
    JobCreate, JobUpdate, JobResponse, JobStatusTransitionRequest,
    LRCreate, LRUpdate, LRResponse, LRStatusTransitionRequest,
    HireChallanCreate, HireChallanUpdate, HireChallanResponse, HireChallanSettleRequest,
    ArrivalReportCreate, ArrivalReportResponse,
    PODRecordCreate, PODRecordVerifyRequest, PODRecordResponse,
    TruckHiringNoteCreate, TruckHiringNoteResponse,
    EWayBillCreate, EWayBillResponse,
    TrackingPingCreate, TrackingPingResponse,
)

router = APIRouter(prefix="/transport", tags=["Transport"])

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
    return await service.create_vehicle_owner(db, data)

@router.put("/vehicle-owners/{id}", response_model=VehicleOwnerResponse)
async def update_vehicle_owner(
    id: int,
    data: VehicleOwnerUpdate,
    current_user: User = Depends(require_permission("transport", "vehicle_owners", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_vehicle_owner(db, id, data)

@router.delete("/vehicle-owners/{id}", status_code=status.HTTP_200_OK)
async def delete_vehicle_owner(
    id: int,
    current_user: User = Depends(require_permission("transport", "vehicle_owners", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_vehicle_owner(db, id)
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
    return await service.create_driver(db, data)

@router.put("/drivers/{id}", response_model=DriverResponse)
async def update_driver(
    id: int,
    data: DriverUpdate,
    current_user: User = Depends(require_permission("transport", "drivers", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_driver(db, id, data)

@router.delete("/drivers/{id}", status_code=status.HTTP_200_OK)
async def delete_driver(
    id: int,
    current_user: User = Depends(require_permission("transport", "drivers", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_driver(db, id)
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

@router.post("/market-vehicles", response_model=MarketVehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_market_vehicle(
    data: MarketVehicleCreate,
    current_user: User = Depends(require_permission("transport", "market_vehicles", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.create_market_vehicle(db, data)

@router.put("/market-vehicles/{id}", response_model=MarketVehicleResponse)
async def update_market_vehicle(
    id: int,
    data: MarketVehicleUpdate,
    current_user: User = Depends(require_permission("transport", "market_vehicles", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_market_vehicle(db, id, data)

@router.delete("/market-vehicles/{id}", status_code=status.HTTP_200_OK)
async def delete_market_vehicle(
    id: int,
    current_user: User = Depends(require_permission("transport", "market_vehicles", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_market_vehicle(db, id)
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
    return await service.create_company_vehicle(db, data)

@router.put("/company-vehicles/{id}", response_model=CompanyVehicleResponse)
async def update_company_vehicle(
    id: int,
    data: CompanyVehicleUpdate,
    current_user: User = Depends(require_permission("transport", "company_vehicles", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_company_vehicle(db, id, data)

@router.delete("/company-vehicles/{id}", status_code=status.HTTP_200_OK)
async def delete_company_vehicle(
    id: int,
    current_user: User = Depends(require_permission("transport", "company_vehicles", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_company_vehicle(db, id)
    return {"message": "Company vehicle deactivated."}

# ==============================================================================
# 5. Jobs & Workflow Transitions
# ==============================================================================
@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    current_user: User = Depends(require_permission("transport", "jobs", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    jobs = await service.get_all_jobs(db)
    return [
        JobResponse(
            id=j.id,
            job_number=j.job_number,
            job_date=j.job_date,
            consigner_id=j.consigner_id,
            consignee_id=j.consignee_id,
            origin_location_id=j.origin_location_id,
            destination_location_id=j.destination_location_id,
            billing_party=j.billing_party,
            expected_dispatch_date=j.expected_dispatch_date,
            cargo_description=j.cargo_description,
            estimated_weight_mt=j.estimated_weight_mt,
            estimated_packages=j.estimated_packages,
            status=j.status,
            special_instructions=j.special_instructions,
            created_by_user_id=j.created_by_user_id,
            consigner_name=j.consigner.name if j.consigner else None,
            consignee_name=j.consignee.name if j.consignee else None,
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
    db: AsyncSession = Depends(get_tenant_db),
):
    job = await service.create_job(db, data, user_id=current_user.id)
    return JobResponse(
        id=job.id,
        job_number=job.job_number,
        job_date=job.job_date,
        consigner_id=job.consigner_id,
        consignee_id=job.consignee_id,
        origin_location_id=job.origin_location_id,
        destination_location_id=job.destination_location_id,
        billing_party=job.billing_party,
        expected_dispatch_date=job.expected_dispatch_date,
        cargo_description=job.cargo_description,
        estimated_weight_mt=job.estimated_weight_mt,
        estimated_packages=job.estimated_packages,
        status=job.status,
        special_instructions=job.special_instructions,
        created_by_user_id=job.created_by_user_id,
        consigner_name=job.consigner.name if job.consigner else None,
        consignee_name=job.consignee.name if job.consignee else None,
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
    return JobResponse(
        id=job.id,
        job_number=job.job_number,
        job_date=job.job_date,
        consigner_id=job.consigner_id,
        consignee_id=job.consignee_id,
        origin_location_id=job.origin_location_id,
        destination_location_id=job.destination_location_id,
        billing_party=job.billing_party,
        expected_dispatch_date=job.expected_dispatch_date,
        cargo_description=job.cargo_description,
        estimated_weight_mt=job.estimated_weight_mt,
        estimated_packages=job.estimated_packages,
        status=job.status,
        special_instructions=job.special_instructions,
        created_by_user_id=job.created_by_user_id,
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
    return JobResponse(
        id=job.id,
        job_number=job.job_number,
        job_date=job.job_date,
        consigner_id=job.consigner_id,
        consignee_id=job.consignee_id,
        origin_location_id=job.origin_location_id,
        destination_location_id=job.destination_location_id,
        billing_party=job.billing_party,
        expected_dispatch_date=job.expected_dispatch_date,
        cargo_description=job.cargo_description,
        estimated_weight_mt=job.estimated_weight_mt,
        estimated_packages=job.estimated_packages,
        status=job.status,
        special_instructions=job.special_instructions,
        created_by_user_id=job.created_by_user_id,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )

# ==============================================================================
# 6. GR / LR Booking & Transitions
# ==============================================================================
@router.get("/lrs", response_model=List[LRResponse])
async def list_lrs(
    current_user: User = Depends(require_permission("transport", "lr_booking", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    lrs = await service.get_all_lrs(db)
    return [
        LRResponse(
            id=l.id,
            lr_number=l.lr_number,
            lr_date=l.lr_date,
            job_id=l.job_id,
            consigner_id=l.consigner_id,
            consignee_id=l.consignee_id,
            origin_location_id=l.origin_location_id,
            destination_location_id=l.destination_location_id,
            vehicle_source=l.vehicle_source,
            vehicle_number=l.vehicle_number,
            driver_name=l.driver_name,
            driver_phone=l.driver_phone,
            eway_bill_number=l.eway_bill_number,
            unit_id=l.unit_id,
            packing_method_id=l.packing_method_id,
            package_count=l.package_count,
            actual_weight_mt=l.actual_weight_mt,
            chargeable_weight_mt=l.chargeable_weight_mt,
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
            consigner_name=l.consigner.name if l.consigner else None,
            consignee_name=l.consignee.name if l.consignee else None,
            origin_city=l.origin_location.city_name if l.origin_location else None,
            destination_city=l.destination_location.city_name if l.destination_location else None,
            job_number=l.job.job_number if l.job else None,
            created_at=l.created_at,
            updated_at=l.updated_at,
        )
        for l in lrs
    ]

@router.post("/lrs", response_model=LRResponse, status_code=status.HTTP_201_CREATED)
async def create_lr(
    data: LRCreate,
    current_user: User = Depends(require_permission("transport", "lr_booking", "create")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_lrs_per_month")
    lr = await service.create_lr(db, data, user_id=current_user.id)
    return LRResponse(
        id=lr.id,
        lr_number=lr.lr_number,
        lr_date=lr.lr_date,
        job_id=lr.job_id,
        consigner_id=lr.consigner_id,
        consignee_id=lr.consignee_id,
        origin_location_id=lr.origin_location_id,
        destination_location_id=lr.destination_location_id,
        vehicle_source=lr.vehicle_source,
        vehicle_number=lr.vehicle_number,
        driver_name=lr.driver_name,
        driver_phone=lr.driver_phone,
        eway_bill_number=lr.eway_bill_number,
        unit_id=lr.unit_id,
        packing_method_id=lr.packing_method_id,
        package_count=lr.package_count,
        actual_weight_mt=lr.actual_weight_mt,
        chargeable_weight_mt=lr.chargeable_weight_mt,
        freight_rate=lr.freight_rate,
        freight_amount=lr.freight_amount,
        loading_charges=lr.loading_charges,
        unloading_charges=lr.unloading_charges,
        other_charges=lr.other_charges,
        total_freight_amount=lr.total_freight_amount,
        advance_amount=lr.advance_amount,
        balance_amount=lr.balance_amount,
        payment_terms=lr.payment_terms,
        status=lr.status,
        remarks=lr.remarks,
        created_by_user_id=lr.created_by_user_id,
        consigner_name=lr.consigner.name if lr.consigner else None,
        consignee_name=lr.consignee.name if lr.consignee else None,
        origin_city=lr.origin_location.city_name if lr.origin_location else None,
        destination_city=lr.destination_location.city_name if lr.destination_location else None,
        job_number=lr.job.job_number if lr.job else None,
        created_at=lr.created_at,
        updated_at=lr.updated_at,
    )

@router.put("/lrs/{id}", response_model=LRResponse)
async def update_lr(
    id: int,
    data: LRUpdate,
    current_user: User = Depends(require_permission("transport", "lr_booking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    lr = await service.update_lr(db, id, data)
    return LRResponse(
        id=lr.id,
        lr_number=lr.lr_number,
        lr_date=lr.lr_date,
        job_id=lr.job_id,
        consigner_id=lr.consigner_id,
        consignee_id=lr.consignee_id,
        origin_location_id=lr.origin_location_id,
        destination_location_id=lr.destination_location_id,
        vehicle_source=lr.vehicle_source,
        vehicle_number=lr.vehicle_number,
        driver_name=lr.driver_name,
        driver_phone=lr.driver_phone,
        eway_bill_number=lr.eway_bill_number,
        unit_id=lr.unit_id,
        packing_method_id=lr.packing_method_id,
        package_count=lr.package_count,
        actual_weight_mt=lr.actual_weight_mt,
        chargeable_weight_mt=lr.chargeable_weight_mt,
        freight_rate=lr.freight_rate,
        freight_amount=lr.freight_amount,
        loading_charges=lr.loading_charges,
        unloading_charges=lr.unloading_charges,
        other_charges=lr.other_charges,
        total_freight_amount=lr.total_freight_amount,
        advance_amount=lr.advance_amount,
        balance_amount=lr.balance_amount,
        payment_terms=lr.payment_terms,
        status=lr.status,
        remarks=lr.remarks,
        created_by_user_id=lr.created_by_user_id,
        created_at=lr.created_at,
        updated_at=lr.updated_at,
    )

@router.post("/lrs/{id}/transition", response_model=LRResponse)
async def transition_lr_status(
    id: int,
    req: LRStatusTransitionRequest,
    current_user: User = Depends(require_permission("transport", "lr_booking", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    lr = await service.transition_lr_status(db, id, req.target_status, req.remarks)
    return LRResponse(
        id=lr.id,
        lr_number=lr.lr_number,
        lr_date=lr.lr_date,
        job_id=lr.job_id,
        consigner_id=lr.consigner_id,
        consignee_id=lr.consignee_id,
        origin_location_id=lr.origin_location_id,
        destination_location_id=lr.destination_location_id,
        vehicle_source=lr.vehicle_source,
        vehicle_number=lr.vehicle_number,
        driver_name=lr.driver_name,
        driver_phone=lr.driver_phone,
        eway_bill_number=lr.eway_bill_number,
        unit_id=lr.unit_id,
        packing_method_id=lr.packing_method_id,
        package_count=lr.package_count,
        actual_weight_mt=lr.actual_weight_mt,
        chargeable_weight_mt=lr.chargeable_weight_mt,
        freight_rate=lr.freight_rate,
        freight_amount=lr.freight_amount,
        loading_charges=lr.loading_charges,
        unloading_charges=lr.unloading_charges,
        other_charges=lr.other_charges,
        total_freight_amount=lr.total_freight_amount,
        advance_amount=lr.advance_amount,
        balance_amount=lr.balance_amount,
        payment_terms=lr.payment_terms,
        status=lr.status,
        remarks=lr.remarks,
        created_by_user_id=lr.created_by_user_id,
        created_at=lr.created_at,
        updated_at=lr.updated_at,
    )

# ==============================================================================
# 7. Hire Challans
# ==============================================================================
@router.get("/hire-challans", response_model=List[HireChallanResponse])
async def list_hire_challans(
    current_user: User = Depends(require_permission("transport", "hire_challan", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    challans = await service.get_all_hire_challans(db)
    return [
        HireChallanResponse(
            id=c.id,
            challan_number=c.challan_number,
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
            tds_rate=c.tds_rate,
            tds_amount=c.tds_amount,
            detention_charge=c.detention_charge,
            mamul_charges=c.mamul_charges,
            net_payable_amount=c.net_payable_amount,
            status=c.status,
            remarks=c.remarks,
            lr_number=c.lr.lr_number if c.lr else None,
            owner_name=c.owner.name if c.owner else None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in challans
    ]

@router.post("/hire-challans", response_model=HireChallanResponse, status_code=status.HTTP_201_CREATED)
async def create_hire_challan(
    data: HireChallanCreate,
    current_user: User = Depends(require_permission("transport", "hire_challan", "create")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_hire_challans_per_month")
    hc = await service.create_hire_challan(db, data)
    return HireChallanResponse(
        id=hc.id,
        challan_number=hc.challan_number,
        challan_date=hc.challan_date,
        lr_id=hc.lr_id,
        vehicle_number=hc.vehicle_number,
        market_vehicle_id=hc.market_vehicle_id,
        owner_id=hc.owner_id,
        driver_id=hc.driver_id,
        driver_name=hc.driver_name,
        driver_phone=hc.driver_phone,
        from_location=hc.from_location,
        to_location=hc.to_location,
        hire_rate=hc.hire_rate,
        advance_amount=hc.advance_amount,
        balance_amount=hc.balance_amount,
        tds_rate=hc.tds_rate,
        tds_amount=hc.tds_amount,
        detention_charge=hc.detention_charge,
        mamul_charges=hc.mamul_charges,
        net_payable_amount=hc.net_payable_amount,
        status=hc.status,
        remarks=hc.remarks,
        lr_number=hc.lr.lr_number if hc.lr else None,
        owner_name=hc.owner.name if hc.owner else None,
        created_at=hc.created_at,
        updated_at=hc.updated_at,
    )

@router.put("/hire-challans/{id}", response_model=HireChallanResponse)
async def update_hire_challan(
    id: int,
    data: HireChallanUpdate,
    current_user: User = Depends(require_permission("transport", "hire_challan", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    hc = await service.update_hire_challan(db, id, data)
    return HireChallanResponse(
        id=hc.id,
        challan_number=hc.challan_number,
        challan_date=hc.challan_date,
        lr_id=hc.lr_id,
        vehicle_number=hc.vehicle_number,
        market_vehicle_id=hc.market_vehicle_id,
        owner_id=hc.owner_id,
        driver_id=hc.driver_id,
        driver_name=hc.driver_name,
        driver_phone=hc.driver_phone,
        from_location=hc.from_location,
        to_location=hc.to_location,
        hire_rate=hc.hire_rate,
        advance_amount=hc.advance_amount,
        balance_amount=hc.balance_amount,
        tds_rate=hc.tds_rate,
        tds_amount=hc.tds_amount,
        detention_charge=hc.detention_charge,
        mamul_charges=hc.mamul_charges,
        net_payable_amount=hc.net_payable_amount,
        status=hc.status,
        remarks=hc.remarks,
        created_at=hc.created_at,
        updated_at=hc.updated_at,
    )

@router.post("/hire-challans/{id}/settle", response_model=HireChallanResponse)
async def settle_hire_challan(
    id: int,
    req: HireChallanSettleRequest,
    current_user: User = Depends(require_permission("transport", "hire_challan", "approve")),
    db: AsyncSession = Depends(get_tenant_db),
):
    hc = await service.settle_hire_challan(db, id, req.settlement_notes)
    return HireChallanResponse(
        id=hc.id,
        challan_number=hc.challan_number,
        challan_date=hc.challan_date,
        lr_id=hc.lr_id,
        vehicle_number=hc.vehicle_number,
        market_vehicle_id=hc.market_vehicle_id,
        owner_id=hc.owner_id,
        driver_id=hc.driver_id,
        driver_name=hc.driver_name,
        driver_phone=hc.driver_phone,
        from_location=hc.from_location,
        to_location=hc.to_location,
        hire_rate=hc.hire_rate,
        advance_amount=hc.advance_amount,
        balance_amount=hc.balance_amount,
        tds_rate=hc.tds_rate,
        tds_amount=hc.tds_amount,
        detention_charge=hc.detention_charge,
        mamul_charges=hc.mamul_charges,
        net_payable_amount=hc.net_payable_amount,
        status=hc.status,
        remarks=hc.remarks,
        created_at=hc.created_at,
        updated_at=hc.updated_at,
    )

# ==============================================================================
# 8. Arrival Reports
# ==============================================================================
@router.get("/arrival-reports", response_model=List[ArrivalReportResponse])
async def list_arrival_reports(
    current_user: User = Depends(require_permission("transport", "arrival_reports", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    reports = await service.get_all_arrival_reports(db)
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
    db: AsyncSession = Depends(get_tenant_db),
):
    pods = await service.get_all_pod_records(db)
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
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_all_truck_hiring_notes(db)

@router.post("/truck-hiring-notes", response_model=TruckHiringNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_truck_hiring_note(
    data: TruckHiringNoteCreate,
    current_user: User = Depends(require_permission("transport", "truck_hiring_note", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.create_truck_hiring_note(db, data)

# ==============================================================================
# 11. E-Way Bills (Manual Entry per Rules §2)
# ==============================================================================
@router.get("/eway-bills", response_model=List[EWayBillResponse])
async def list_eway_bills(
    current_user: User = Depends(require_permission("transport", "eway_bill", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    bills = await service.get_all_eway_bills(db)
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
