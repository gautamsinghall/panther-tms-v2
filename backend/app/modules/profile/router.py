from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.auth.dependencies import (
    require_permission, get_current_user, get_current_company_admin
)
from app.control.models import Tenant
from app.tenant_db.models import User
from app.modules.profile.schemas import (
    ChangePasswordRequest, UserProfileUpdate, UserProfileResponse,
    BranchCreate, BranchUpdate, BranchResponse,
    CompanySettingUpdate, CompanySettingResponse,
    EmailSettingUpdate, EmailSettingResponse,
    MonthlyPnLResponse,
    ApiCenterSettingResponse, ApiCenterSettingUpdate,
    ApiCenterTestRequest, ApiCenterTestResponse,
    WheelsEyeTestRequest, WheelsEyeTestResponse,
    FastagWalletResponse, FastagCooldownUpdate,
    SimWalletResponse
)
from app.modules.profile import service
from app.services.activity_logger import log_activity

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
    await log_activity(
        db=db,
        user=current_user,
        action="USER_PASSWORD_CHANGED",
        module="profile",
        entity_type="user",
        entity_id=str(current_user.id),
        entity_identifier=current_user.email,
        details=f"User {current_user.email} changed their password."
    )
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
    updated = await service.update_user_profile(db, current_user, data)
    await log_activity(
        db=db,
        user=current_user,
        action="USER_PROFILE_UPDATED",
        module="profile",
        entity_type="user",
        entity_id=str(current_user.id),
        entity_identifier=current_user.email,
        details=f"User {current_user.email} updated personal profile details."
    )
    return updated


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
    branch = await service.create_branch(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="BRANCH_CREATED",
        module="profile",
        entity_type="branch",
        entity_id=str(branch.id),
        entity_identifier=branch.name,
        office_id=branch.id,
        office_name=branch.name,
        office_code=branch.code,
        details=f"Created branch {branch.name} ({branch.code})",
        details_json={"name": branch.name, "code": branch.code, "city": branch.city, "state": branch.state}
    )
    return branch


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
    branch = await service.update_branch(db, branch_id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="BRANCH_UPDATED",
        module="profile",
        entity_type="branch",
        entity_id=str(branch.id),
        entity_identifier=branch.name,
        office_id=branch.id,
        office_name=branch.name,
        office_code=branch.code,
        details=f"Updated branch {branch.name} ({branch.code})",
        details_json={"name": branch.name, "code": branch.code}
    )
    return branch


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
    await log_activity(
        db=db,
        user=current_user,
        action="BRANCH_DEACTIVATED",
        module="profile",
        entity_type="branch",
        entity_id=str(branch_id),
        entity_identifier=f"Branch #{branch_id}",
        details=f"Deactivated branch ID {branch_id}"
    )


# --- Company Settings (Admin Gated) ---

@router.get(
    "/company",
    response_model=CompanySettingResponse,
    summary="Get tenant company profile & tax parameters"
)
async def get_company(
    current_user: User = Depends(require_permission("company", "company_details", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_company_setting(db)


@router.put(
    "/company",
    response_model=CompanySettingResponse,
    summary="Update tenant company profile & tax parameters"
)
async def update_company(
    data: CompanySettingUpdate,
    current_user: User = Depends(require_permission("company", "company_details", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    company = await service.update_company_setting(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="COMPANY_PROFILE_UPDATED",
        module="company",
        entity_type="company",
        entity_id=str(company.id),
        entity_identifier=company.legal_name or "Company Profile",
        details=f"Updated company details for {company.legal_name or 'Company'}",
        details_json={"legal_name": company.legal_name, "trade_name": company.trade_name, "gstin": company.gstin}
    )
    return company


# --- Email Settings ---

@router.get(
    "/email-settings",
    response_model=EmailSettingResponse,
    summary="Get tenant outbound email dispatch settings"
)
async def get_email(
    current_user: User = Depends(require_permission("profile", "email", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_email_setting(db)


@router.put(
    "/email-settings",
    response_model=EmailSettingResponse,
    summary="Update tenant outbound email dispatch settings"
)
async def update_email(
    data: EmailSettingUpdate,
    current_user: User = Depends(require_permission("profile", "email", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    email_set = await service.update_email_setting(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="EMAIL_SETTINGS_UPDATED",
        module="profile",
        entity_type="email_setting",
        entity_id=str(email_set.id),
        entity_identifier=email_set.smtp_host or "Email Settings",
        details=f"Updated SMTP email dispatch settings ({email_set.smtp_host})"
    )
    return email_set


# --- Monthly P&L (All Branches / Clubbed Companies) ---

@router.get(
    "/monthly-pnl",
    response_model=MonthlyPnLResponse,
    summary="Get consolidated Monthly P&L across all branches"
)
async def get_monthly_pnl(
    month: Optional[str] = Query(None, description="Optional accounting month in YYYY-MM format"),
    current_user: User = Depends(require_permission("profile", "monthly_pnl", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.calculate_monthly_pnl(db, month=month)


# --- API Center Settings ---

@router.get(
    "/api-center",
    response_model=ApiCenterSettingResponse,
    summary="Get tenant API center & E-Way Bill configurations"
)
async def get_api_center(
    current_user: User = Depends(require_permission("api_center", "eway_bill_api", "view")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_api_center_setting(db, tenant_id=tenant.tenant_id)


@router.put(
    "/api-center",
    response_model=ApiCenterSettingResponse,
    summary="Update tenant API center & E-Way Bill configurations"
)
async def update_api_center(
    data: ApiCenterSettingUpdate,
    current_user: User = Depends(require_permission("api_center", "eway_bill_api", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    api_center = await service.update_api_center_setting(db, data)
    await log_activity(
        db=db,
        user=current_user,
        action="API_CENTER_UPDATED",
        module="api_center",
        entity_type="api_center",
        entity_id=str(getattr(api_center, "id", "1")),
        entity_identifier="API Center",
        details="Updated API Center configuration (E-Way bill / GSP)"
    )
    return api_center


@router.post(
    "/api-center/test-ewb",
    response_model=ApiCenterTestResponse,
    summary="Test GSP / NIC E-Way Bill gateway authentication & credentials"
)
async def test_ewb(
    req: ApiCenterTestRequest,
    current_user: User = Depends(require_permission("api_center", "eway_bill_api", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.test_ewb_connection(db, req)


@router.post(
    "/api-center/test-wheelseye",
    response_model=WheelsEyeTestResponse,
    summary="Test WheelsEye GPS Tracking API authentication & credentials"
)
async def test_wheelseye(
    req: WheelsEyeTestRequest,
    current_user: User = Depends(require_permission("api_center", "gps_tracking_api", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.test_wheelseye_connection(db, req)


@router.get(
    "/api-center/fastag-wallet",
    response_model=FastagWalletResponse,
    summary="Get FASTag & Toll Telemetry wallet balance and transaction ledger"
)
async def get_fastag_wallet(
    current_user: User = Depends(require_permission("api_center", "fastag_tracking_api", "view")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_fastag_wallet_info(
        tenant_db=db,
        tenant_id=tenant.tenant_id,
        company_code=tenant.company_code,
    )


@router.put(
    "/api-center/fastag-cooldown",
    summary="Update FASTag rate limit cooldown timing in minutes"
)
async def update_fastag_cooldown(
    data: FastagCooldownUpdate,
    current_user: User = Depends(require_permission("api_center", "fastag_tracking_api", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    updated_val = await service.update_fastag_cooldown(db, data.cooldown_minutes)
    await log_activity(
        db=db,
        user=current_user,
        action="FASTAG_COOLDOWN_UPDATED",
        module="api_center",
        entity_type="fastag_cooldown",
        entity_id=str(updated_val),
        entity_identifier=f"{updated_val} mins",
        details=f"Updated FASTag cooldown to {updated_val} minutes"
    )
    return {
        "cooldown_minutes": updated_val,
        "message": f"FASTag rate limit cooldown updated to {updated_val} minutes."
    }


# --- SIM Based Tracking Telemetry Wallet ---

@router.get(
    "/api-center/sim-wallet",
    response_model=SimWalletResponse,
    summary="Get SIM tracking telemetry wallet balance, active trips, and transaction ledger"
)
async def get_sim_wallet(
    current_user: User = Depends(require_permission("api_center", "sim_tracking_api", "view")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_sim_wallet_info(
        tenant_db=db,
        tenant_id=tenant.tenant_id,
        company_code=tenant.company_code,
    )

