from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_control_db
from app.control.models import Plan, Tenant
from app.control.schemas import PlanResponse, TenantProvisionRequest, TenantResponse
from app.control.service import provision_tenant
from app.core.errors import TenantNotFoundException

router = APIRouter(prefix="/control", tags=["Control Plane"])

@router.get("/plans", response_model=List[PlanResponse])
async def list_plans(session: AsyncSession = Depends(get_control_db)):
    result = await session.execute(
        select(Plan).options(selectinload(Plan.entitlements)).where(Plan.is_active == True)
    )
    plans = result.scalars().all()
    return plans

@router.post(
    "/tenants/provision",
    response_model=TenantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision a new tenant database and seed admin"
)
async def provision_new_tenant(
    data: TenantProvisionRequest,
    session: AsyncSession = Depends(get_control_db)
):
    tenant = await provision_tenant(data, session)
    return tenant

@router.get("/tenants/{subdomain}", response_model=TenantResponse)
async def get_tenant_info(
    subdomain: str,
    session: AsyncSession = Depends(get_control_db)
):
    result = await session.execute(
        select(Tenant).where(Tenant.subdomain == subdomain.lower().strip())
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise TenantNotFoundException(subdomain)
    return tenant
