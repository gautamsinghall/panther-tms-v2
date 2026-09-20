from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.tenant_db.session import get_tenant_db
from app.tenant_db.models import User
import app.modules.home.service as home_service
from app.modules.home.schemas import (
    BusinessOverviewData,
    FinancialAnalysisData,
    FleetOperationsData,
    OwnFleetData,
)

router = APIRouter(prefix="/home", tags=["Home Module Dashboards"])

@router.get(
    "/business-overview",
    response_model=BusinessOverviewData,
    summary="Get real-data Business Overview dashboard metrics & revenue trends",
)
async def get_business_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await home_service.get_business_overview(session=db)


@router.get(
    "/financial-analysis",
    response_model=FinancialAnalysisData,
    summary="Get real-data Financial Analysis dashboard: operating margins, cost breakdown, receivables/payables",
)
async def get_financial_analysis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await home_service.get_financial_analysis(session=db)


@router.get(
    "/fleet-operations",
    response_model=FleetOperationsData,
    summary="Get real-data Fleet & Operations snapshot: active transit, compliance alerts, pending PODs",
)
async def get_fleet_operations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await home_service.get_fleet_operations(session=db)


@router.get(
    "/own-fleet",
    response_model=OwnFleetData,
    summary="Get real-data Own Fleet snapshot: company vehicle health matrix, telemetry odometer, tyres",
)
async def get_own_fleet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await home_service.get_own_fleet(session=db)
