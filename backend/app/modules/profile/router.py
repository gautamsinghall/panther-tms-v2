from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db
from app.auth.dependencies import (
    require_permission, get_current_user, get_current_company_admin
)
from app.tenant_db.models import User
from app.modules.profile.schemas import (
    ChangePasswordRequest, UserProfileUpdate, UserProfileResponse,
    BranchCreate, BranchUpdate, BranchResponse,
    CompanySettingUpdate, CompanySettingResponse,
    EmailSettingUpdate, EmailSettingResponse,
    MonthlyPnLResponse
)
from app.modules.profile import service

router = APIRouter(prefix="/profile", tags=["Profile & Branch Operations"])


# --- Change Password (All Users) ---

@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change user password"
)
async def change_user_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.change_password(db, current_user, data)
    return {"message": "Password changed successfully."}


# --- User Account Profile (All Users) ---

@router.get(
    "/account",
    response_model=UserProfileResponse,
    summary="Get personal account profile"
)
async def get_user_account(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.put(
    "/account",
    response_model=UserProfileResponse,
    summary="Update personal account profile"
)
async def update_user_account(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_user_profile(db, current_user, data)


# --- Branches Management ---

@router.get(
    "/branches",
    response_model=List[BranchResponse],
    summary="List all company branches"
)
async def list_branches(
    current_user: User = Depends(require_permission("profile", "branch", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_branches(db)


@router.post(
    "/branches",
    response_model=BranchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new operating branch"
)
async def create_new_branch(
    data: BranchCreate,
    current_user: User = Depends(require_permission("profile", "branch", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.create_branch(db, data)


@router.put(
    "/branches/{branch_id}",
    response_model=BranchResponse,
    summary="Update an existing operating branch"
)
async def update_branch_details(
    branch_id: int,
    data: BranchUpdate,
    current_user: User = Depends(require_permission("profile", "branch", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_branch(db, branch_id, data)


@router.delete(
    "/branches/{branch_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an operating branch"
)
async def delete_branch_record(
    branch_id: int,
    current_user: User = Depends(require_permission("profile", "branch", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_branch(db, branch_id)


# --- Company Settings (Admin Gated) ---

@router.get(
    "/company",
    response_model=CompanySettingResponse,
    summary="Get tenant company profile & tax parameters"
)
async def get_company(
    current_user: User = Depends(require_permission("profile", "company", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_company_setting(db)


@router.put(
    "/company",
    response_model=CompanySettingResponse,
    summary="Update tenant company profile & tax parameters (Admin Only)"
)
async def update_company(
    data: CompanySettingUpdate,
    current_admin: User = Depends(get_current_company_admin),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_company_setting(db, data)


# --- Email Settings (Admin Gated) ---

@router.get(
    "/email-settings",
    response_model=EmailSettingResponse,
    summary="Get tenant outbound email dispatch settings (Admin Only)"
)
async def get_email(
    current_admin: User = Depends(get_current_company_admin),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_email_setting(db)


@router.put(
    "/email-settings",
    response_model=EmailSettingResponse,
    summary="Update tenant outbound email dispatch settings (Admin Only)"
)
async def update_email(
    data: EmailSettingUpdate,
    current_admin: User = Depends(get_current_company_admin),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_email_setting(db, data)


# --- Monthly P&L (All Branches / Clubbed Companies - Admin Gated) ---

@router.get(
    "/monthly-pnl",
    response_model=MonthlyPnLResponse,
    summary="Get consolidated Monthly P&L across all branches (Admin Only per PRD §7.12)"
)
async def get_monthly_pnl(
    month: Optional[str] = Query(None, description="Optional accounting month in YYYY-MM format"),
    current_admin: User = Depends(get_current_company_admin),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.calculate_monthly_pnl(db, month=month)
