from typing import List
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_control_db
from app.control.models import Plan, Tenant
from app.control.schemas import (
    PlanResponse, TenantProvisionRequest, TenantResponse,
    SignupInitiateRequest, SignupInitiateResponse,
    SignupCompleteRequest, CreateSubscriptionRequest, CreateSubscriptionResponse
)
from app.control.service import (
    provision_tenant, initiate_signup, complete_signup,
    process_razorpay_webhook_event, create_tenant_subscription
)
from app.core.errors import TenantNotFoundException, AppException

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

@router.post(
    "/signup/initiate",
    response_model=SignupInitiateResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate self-serve customer onboarding"
)
async def signup_initiate(
    data: SignupInitiateRequest,
    session: AsyncSession = Depends(get_control_db)
):
    return await initiate_signup(data, session)

@router.post(
    "/signup/complete",
    response_model=TenantResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete self-serve customer onboarding after payment confirmation"
)
async def signup_complete(
    data: SignupCompleteRequest,
    session: AsyncSession = Depends(get_control_db)
):
    return await complete_signup(data, session)

@router.post(
    "/webhooks/razorpay",
    summary="Process Razorpay subscription and payment webhook events"
)
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature"),
    session: AsyncSession = Depends(get_control_db)
):
    if not x_razorpay_signature:
        raise AppException(status_code=400, error_code="MISSING_SIGNATURE", message="Missing X-Razorpay-Signature header.")
    payload_bytes = await request.body()
    return await process_razorpay_webhook_event(payload_bytes, x_razorpay_signature, session)

@router.post(
    "/subscriptions/{subdomain}",
    response_model=CreateSubscriptionResponse,
    summary="Create or renew recurring subscription for existing tenant"
)
async def create_subscription(
    subdomain: str,
    data: CreateSubscriptionRequest,
    session: AsyncSession = Depends(get_control_db)
):
    return await create_tenant_subscription(subdomain, data, session)

