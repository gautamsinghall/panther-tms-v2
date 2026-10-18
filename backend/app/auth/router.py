from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.control.models import Tenant
from app.tenant_db.models import User
from app.tenant_db.session import get_current_tenant, get_tenant_db
from app.core.database import get_tenant_session_maker
from app.core.errors import UnauthorizedException
from app.core.tenancy import get_tenant_by_company_code, get_tenant_by_id, get_tenant_id_from_request
from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    LoginRequest, TokenResponse, RefreshTokenRequest,
    UserResponse, TenantContextResponse
)
from app.auth.service import authenticate_user, refresh_user_token
from app.auth.navigation import (
    ALL_NAVIGATION_MODULES,
    PLAN_TIERS,
    MODULE_MIN_TIERS,
    FEATURE_MIN_TIERS,
    build_user_navigation,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse, summary="Login to tenant account")
async def login(
    request: Request,
    login_data: LoginRequest,
):
    # Resolve tenant: from company_code in body, header, or query/token
    company_code = login_data.company_code or request.headers.get("X-Company-Code")
    tenant_id = request.headers.get("X-Tenant-ID")
    
    tenant: Optional[Tenant] = None
    if company_code:
        tenant = await get_tenant_by_company_code(company_code)
    elif tenant_id:
        try:
            tenant = await get_tenant_by_id(tenant_id)
        except Exception:
            tenant = await get_tenant_by_company_code(tenant_id)
    else:
        tid = get_tenant_id_from_request(request)
        if tid:
            try:
                tenant = await get_tenant_by_id(tid)
            except Exception:
                tenant = await get_tenant_by_company_code(tid)
        else:
            raise UnauthorizedException("Company code is required to sign in.")

    session_maker = get_tenant_session_maker(tenant.db_name)
    async with session_maker() as db:
        return await authenticate_user(db=db, tenant=tenant, login_data=login_data)

@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await refresh_user_token(db=db, tenant=tenant, refresh_data=refresh_data)

@router.get("/me", response_model=UserResponse, summary="Get current logged in user & tenant context")
async def get_me(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    offices_list, active_summary = await service.get_user_office_context(db, current_user)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        tenant=TenantContextResponse(
            tenant_id=tenant.tenant_id,
            company_code=tenant.company_code,
            company_name=tenant.company_name,
            status=tenant.status,
        ),
        assigned_offices=offices_list,
        active_office=active_summary,
    )

@router.get("/navigation", summary="Get data-driven permitted navigation tree for current user")
async def get_user_navigation(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """
    Returns data-driven sidebar navigation filtered by both tenant plan entitlements
    and user's active RBAC permissions per rules.md §5 and architecture.md §5–6.
    Includes plan tier hierarchy so higher-tier plans (Enterprise / Business) inherit
    lower-tier (Pro) features.
    """
    return build_user_navigation(current_user=current_user, tenant=tenant)


@router.post("/logout", status_code=status.HTTP_200_OK, summary="Logout user")
async def logout(
    current_user: User = Depends(get_current_user)
):
    return {"message": "Successfully logged out"}
