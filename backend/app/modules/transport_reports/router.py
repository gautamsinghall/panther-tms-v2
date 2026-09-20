from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db
from app.auth.dependencies import require_permission
from app.tenant_db.models import User
from app.modules.transport_reports import service
from app.modules.transport_reports.schemas import (
    LRRegisterRow, LRClientWiseRow, HireChallanRegisterRow,
    PendingHCRow, UnbilledLRRow, ArrivalRegisterRow,
    UnusedSeriesRow, InvoiceRegisterRow
)

router = APIRouter(prefix="/transport-reports", tags=["Transport Reports"])

@router.get("/lr-register", response_model=List[LRRegisterRow], summary="LR Booking Register")
async def get_lr_register(
    current_user: User = Depends(require_permission("transport_reports", "lr_register", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_lr_booking_register(db)

@router.get("/lr-client-wise", response_model=List[LRClientWiseRow], summary="LR Client-Wise Summary")
async def get_lr_client_wise(
    current_user: User = Depends(require_permission("transport_reports", "lr_client_wise", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_lr_client_wise(db)

@router.get("/hc-register", response_model=List[HireChallanRegisterRow], summary="Hire Challan Register")
async def get_hc_register(
    current_user: User = Depends(require_permission("transport_reports", "hc_register", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_hire_challan_register(db)

@router.get("/pending-hc", response_model=List[PendingHCRow], summary="Pending Hire Challans")
async def get_pending_hc(
    current_user: User = Depends(require_permission("transport_reports", "pending_hc", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_pending_hire_challans(db)

@router.get("/unbilled", response_model=List[UnbilledLRRow], summary="Unbilled LRs Report")
async def get_unbilled(
    current_user: User = Depends(require_permission("transport_reports", "unbilled", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_unbilled_lrs(db)

@router.get("/arrival-register", response_model=List[ArrivalRegisterRow], summary="Arrival Report Register")
async def get_arrival_register(
    current_user: User = Depends(require_permission("transport_reports", "arrival_register", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_arrival_report_register(db)

@router.get("/unused-series", response_model=List[UnusedSeriesRow], summary="Unused GR/LR Series")
async def get_unused_series(
    current_user: User = Depends(require_permission("transport_reports", "unused_series", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_unused_series(db)

@router.get("/invoice-register", response_model=List[InvoiceRegisterRow], summary="Invoice Register")
async def get_invoice_register(
    current_user: User = Depends(require_permission("transport_reports", "invoice_register", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_invoice_register(db)
