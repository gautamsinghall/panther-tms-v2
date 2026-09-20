from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_permission
from app.tenant_db.session import get_tenant_db
from app.tenant_db.models import User
import app.modules.fleet.service as fleet_service
from app.modules.fleet.schemas import (
    TripExpenseCreate,
    TripExpenseUpdate,
    TripExpenseResponse,
    TripAdvanceCreate,
    TripAdvanceSettle,
    TripAdvanceResponse,
    VehicleDocumentCreate,
    VehicleDocumentUpdate,
    VehicleDocumentResponse,
    VehicleHealthUpdate,
    VehicleHealthResponse,
    VehicleCurrentStatusResponse,
    TyreCreate,
    TyreUpdate,
    TyreResponse,
    RepairServiceCreate,
    RepairServiceUpdate,
    RepairServiceResponse,
    TruckPnLResponse,
    TripExpenseRegisterResponse,
)

router = APIRouter(prefix="/fleet", tags=["Fleet Management"])

# ==============================================================================
# Trip Expense Endpoints
# ==============================================================================

@router.get(
    "/trip-expenses",
    response_model=List[TripExpenseResponse],
    summary="List on-road trip expense vouchers with filters",
)
async def list_trip_expenses(
    lr_id: Optional[int] = Query(None),
    vehicle_number: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    paid_by: Optional[str] = Query(None),
    is_fastag: Optional[bool] = Query(None),
    is_pending: Optional[bool] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.list_trip_expenses(
        session=db,
        lr_id=lr_id,
        vehicle_number=vehicle_number,
        category=category,
        status=status,
        paid_by=paid_by,
        is_fastag=is_fastag,
        is_pending=is_pending,
        from_date=from_date,
        to_date=to_date,
    )


@router.post(
    "/trip-expenses",
    response_model=TripExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record new trip expense voucher (Diesel, Toll, Fastag, etc.)",
)
async def create_trip_expense(
    data: TripExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.create_trip_expense(session=db, data=data)


@router.get(
    "/trip-expenses/{expense_id}",
    response_model=TripExpenseResponse,
    summary="Get single trip expense voucher",
)
async def get_trip_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.get_trip_expense(session=db, expense_id=expense_id)


@router.put(
    "/trip-expenses/{expense_id}",
    response_model=TripExpenseResponse,
    summary="Update or audit trip expense voucher",
)
async def update_trip_expense(
    expense_id: int,
    data: TripExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.update_trip_expense(session=db, expense_id=expense_id, data=data)


@router.delete(
    "/trip-expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete trip expense voucher",
)
async def delete_trip_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    await fleet_service.delete_trip_expense(session=db, expense_id=expense_id)


# ==============================================================================
# Trip Advance Endpoints
# ==============================================================================

@router.get(
    "/trip-advances",
    response_model=List[TripAdvanceResponse],
    summary="List driver trip advances",
)
async def list_trip_advances(
    vehicle_number: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.list_trip_advances(
        session=db,
        vehicle_number=vehicle_number,
        driver_id=driver_id,
        status=status,
    )


@router.post(
    "/trip-advances",
    response_model=TripAdvanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Disburse new trip advance to driver",
)
async def create_trip_advance(
    data: TripAdvanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.create_trip_advance(session=db, data=data)


@router.post(
    "/trip-advances/{advance_id}/settle",
    response_model=TripAdvanceResponse,
    summary="Reconcile and settle trip advance against trip expenses",
)
async def settle_trip_advance(
    advance_id: int,
    data: TripAdvanceSettle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.settle_trip_advance(session=db, advance_id=advance_id, data=data)


# ==============================================================================
# Vehicle Documents & Compliance Endpoints
# ==============================================================================

@router.get(
    "/documents",
    response_model=List[VehicleDocumentResponse],
    summary="List vehicle compliance documents",
)
async def list_documents(
    vehicle_number: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    docs = await fleet_service.list_documents(
        session=db,
        vehicle_number=vehicle_number,
        doc_type=doc_type,
        status=status,
    )
    today = date.today()
    results = []
    for d in docs:
        days = (d.valid_till - today).days
        resp = VehicleDocumentResponse.model_validate(d)
        resp.days_to_expire = days
        results.append(resp)
    return results


@router.post(
    "/documents",
    response_model=VehicleDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload vehicle compliance document record",
)
async def create_document(
    data: VehicleDocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    doc = await fleet_service.create_document(session=db, data=data)
    today = date.today()
    resp = VehicleDocumentResponse.model_validate(doc)
    resp.days_to_expire = (doc.valid_till - today).days
    return resp


@router.put(
    "/documents/{doc_id}",
    response_model=VehicleDocumentResponse,
    summary="Update vehicle document validity",
)
async def update_document(
    doc_id: int,
    data: VehicleDocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    doc = await fleet_service.update_document(session=db, doc_id=doc_id, data=data)
    today = date.today()
    resp = VehicleDocumentResponse.model_validate(doc)
    resp.days_to_expire = (doc.valid_till - today).days
    return resp


@router.delete(
    "/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete vehicle document",
)
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    await fleet_service.delete_document(session=db, doc_id=doc_id)


# ==============================================================================
# Vehicle Health & Current Status Endpoints
# ==============================================================================

@router.get(
    "/vehicle-health",
    response_model=List[VehicleHealthResponse],
    summary="List all vehicle telematics & health diagnostics",
)
async def list_vehicle_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    records = await fleet_service.list_all_vehicle_health(session=db)
    return [VehicleHealthResponse.model_validate(r) for r in records]


@router.get(
    "/vehicle-health/{vehicle_number}",
    response_model=VehicleHealthResponse,
    summary="Get vehicle telematics & diagnostics by vehicle number",
)
async def get_vehicle_health(
    vehicle_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    record = await fleet_service.get_vehicle_health(session=db, vehicle_number=vehicle_number)
    return VehicleHealthResponse.model_validate(record)


@router.put(
    "/vehicle-health/{vehicle_number}",
    response_model=VehicleHealthResponse,
    summary="Update vehicle diagnostic status, odometer, or operational state",
)
async def update_vehicle_health(
    vehicle_number: str,
    data: VehicleHealthUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    record = await fleet_service.update_vehicle_health(session=db, vehicle_number=vehicle_number, data=data)
    return VehicleHealthResponse.model_validate(record)


@router.get(
    "/vehicle-status",
    response_model=List[VehicleCurrentStatusResponse],
    summary="Real-time operational status map of all fleet vehicles",
)
async def get_vehicle_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.get_all_vehicle_current_status(session=db)


# ==============================================================================
# Tyre Management Endpoints
# ==============================================================================

@router.get(
    "/tyres",
    response_model=List[TyreResponse],
    summary="List tyre inventory and axle fitments",
)
async def list_tyres(
    vehicle_number: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    records = await fleet_service.list_tyres(session=db, vehicle_number=vehicle_number, status=status)
    return [TyreResponse.model_validate(r) for r in records]


@router.post(
    "/tyres",
    response_model=TyreResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add new tyre to inventory or mount on vehicle",
)
async def create_tyre(
    data: TyreCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    record = await fleet_service.create_tyre(session=db, data=data)
    return TyreResponse.model_validate(record)


@router.put(
    "/tyres/{tyre_id}",
    response_model=TyreResponse,
    summary="Update tyre tread depth, position, or retread status",
)
async def update_tyre(
    tyre_id: int,
    data: TyreUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    record = await fleet_service.update_tyre(session=db, tyre_id=tyre_id, data=data)
    return TyreResponse.model_validate(record)


@router.delete(
    "/tyres/{tyre_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete tyre record",
)
async def delete_tyre(
    tyre_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    await fleet_service.delete_tyre(session=db, tyre_id=tyre_id)


# ==============================================================================
# Workshop Repair & Service Endpoints
# ==============================================================================

@router.get(
    "/services",
    response_model=List[RepairServiceResponse],
    summary="List workshop repair and maintenance job cards",
)
async def list_services(
    vehicle_number: Optional[str] = Query(None),
    service_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    records = await fleet_service.list_services(
        session=db,
        vehicle_number=vehicle_number,
        service_type=service_type,
        status=status,
    )
    return [RepairServiceResponse.model_validate(r) for r in records]


@router.post(
    "/services",
    response_model=RepairServiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create workshop repair job card",
)
async def create_service(
    data: RepairServiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    record = await fleet_service.create_service(session=db, data=data)
    return RepairServiceResponse.model_validate(record)


@router.put(
    "/services/{service_id}",
    response_model=RepairServiceResponse,
    summary="Update repair job card status or service costs",
)
async def update_service(
    service_id: int,
    data: RepairServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    record = await fleet_service.update_service(session=db, service_id=service_id, data=data)
    return RepairServiceResponse.model_validate(record)


# ==============================================================================
# Derived Reporting Endpoints (Truck-Wise P&L, Trip Expense Register)
# ==============================================================================

@router.get(
    "/truck-pnl",
    response_model=TruckPnLResponse,
    summary="DERIVED REPORT: Truck-Wise Profit & Loss dynamically computed over revenues, fuel, tolls, and maintenance",
)
async def get_truck_pnl(
    vehicle_number: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.get_truck_pnl(
        session=db,
        vehicle_number=vehicle_number,
        from_date=from_date,
        to_date=to_date,
    )


@router.get(
    "/expense-register",
    response_model=TripExpenseRegisterResponse,
    summary="DERIVED REPORT: Trip Expense Register with category subtotals and filterable line items",
)
async def get_trip_expense_register(
    vehicle_number: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    paid_by: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await fleet_service.get_trip_expense_register(
        session=db,
        vehicle_number=vehicle_number,
        category=category,
        status=status,
        paid_by=paid_by,
        from_date=from_date,
        to_date=to_date,
    )
