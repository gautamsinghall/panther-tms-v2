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
    user_plan_code = (tenant.plan.code or "FREE").upper().strip() if tenant.plan else "FREE"
    user_tier = PLAN_TIERS.get(user_plan_code, 1)

    entitled_modules = set()
    disabled_features = set()
    if tenant.plan and tenant.plan.entitlements:
        for ent in tenant.plan.entitlements:
            if ent.is_enabled:
                if ent.limit_value.lower() in ("true", "1", "yes"):
                    if ent.feature_key.startswith("module_"):
                        entitled_modules.add(ent.feature_key[len("module_"):])
                    if ent.feature_key == "module_all":
                        entitled_modules.add("all")
                elif ent.limit_value.lower() in ("false", "0", "no"):
                    if ent.feature_key.startswith("feature_"):
                        disabled_features.add(ent.feature_key[len("feature_"):])

    def is_module_entitled(mod_id: str) -> bool:
        norm = mod_id.replace("-", "_").lower()
        if norm in ("home", "profile", "company"):
            return True
        # Check explicit database entitlements
        if "all" in entitled_modules or norm in entitled_modules:
            return True
        # Check tier hierarchy: higher tier customers automatically inherit lower tier modules
        min_tier = MODULE_MIN_TIERS.get(norm, 1)
        if user_tier >= min_tier:
            return True
        return False

    def map_item(it: dict) -> dict:
        feat_norm = it["feature"].replace("-", "_").lower()
        min_tier = FEATURE_MIN_TIERS.get(feat_norm, 1)

        # Explicitly disabled in DB entitlements and user's tier does not exceed
        if feat_norm in disabled_features and user_tier < min_tier:
            req_plan = "BUSINESS" if min_tier >= 3 else "PRO"
            return {**it, "is_locked": True, "required_plan": req_plan}

        # Check plan tier hierarchy
        if user_tier < min_tier:
            req_plan = "BUSINESS" if min_tier >= 3 else "PRO"
            return {**it, "is_locked": True, "required_plan": req_plan}

        return {**it, "is_locked": False}

    result = []
    is_admin = (current_user.role or "").upper().strip() in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER")

    # Permitted employee features
    allowed_features = set()
    if not is_admin and current_user.custom_role and current_user.custom_role.permissions:
        for p in current_user.custom_role.permissions:
            if p.is_allowed and p.permission in ("view", "all"):
                mod_norm = p.module.lower().strip()
                feat_norm = p.feature.lower().strip()
                allowed_features.add((mod_norm, feat_norm))
                allowed_features.add((mod_norm.replace("_", "-"), feat_norm))
                allowed_features.add((mod_norm.replace("-", "_"), feat_norm))
                # Tracking aliases
                if mod_norm in ("tracking", "transport") and feat_norm in ("tracking", "sim_tracking"):
                    allowed_features.add(("tracking", "tracking"))
                    allowed_features.add(("tracking", "sim_tracking"))
                    allowed_features.add(("transport", "tracking"))
                if mod_norm in ("tracking", "transport") and feat_norm in ("fastag_tracking", "fastag"):
                    allowed_features.add(("tracking", "fastag_tracking"))
                    allowed_features.add(("transport", "fastag_tracking"))
                # Company / Settings aliases for users & roles
                if mod_norm in ("company", "settings") and feat_norm in ("users", "roles"):
                    allowed_features.add(("company", feat_norm))
                    allowed_features.add(("settings", feat_norm))
                # Profile / Company aliases for branch & company details
                if mod_norm in ("profile", "company") and feat_norm in ("branch", "company", "company_details"):
                    allowed_features.add(("profile", "branch"))
                    allowed_features.add(("company", "branch"))
                    allowed_features.add(("profile", "company"))
                    allowed_features.add(("company", "company_details"))
                # API Center aliases
                if mod_norm in ("api_center", "api-center", "company") and feat_norm in ("api_center", "eway_bill_api", "fastag_tracking_api", "sim_tracking_api"):
                    allowed_features.add(("api_center", feat_norm))
                    allowed_features.add(("api-center", feat_norm))

    for mod in ALL_NAVIGATION_MODULES:
        entitled = is_module_entitled(mod["id"])

        # If module is not entitled on the plan
        if not entitled:
            if is_admin:
                # Company admin sees the module as locked with an upgrade CTA
                min_tier = MODULE_MIN_TIERS.get(mod["id"].replace("-", "_").lower(), 2)
                required_plan = "ENTERPRISE" if min_tier >= 4 else "BUSINESS" if min_tier >= 3 else "PRO"
                result.append({
                    "id": mod["id"],
                    "title": mod["title"],
                    "is_locked": True,
                    "required_plan": required_plan,
                    "items": [
                        {**it, "is_locked": True, "required_plan": required_plan} for it in mod["items"]
                    ],
                })
            # Employees don't see unentitled modules at all
            continue

        # Module is entitled: filter items by role and feature locks
        if is_admin:
            result.append({
                "id": mod["id"],
                "title": mod["title"],
                "is_locked": False,
                "items": [
                    map_item(it) for it in mod["items"]
                ],
            })
        else:
            # Employee role filtering
            if mod["id"] == "home":
                result.append({**mod, "is_locked": False})
            elif mod["id"] == "profile":
                allowed_items = [
                    map_item(it) for it in mod["items"]
                    if it["feature"] in ("account", "change_password")
                    or (mod["id"], it["feature"]) in allowed_features
                    or ("profile", it["feature"]) in allowed_features
                    or (it["feature"] == "branch" and (("company", "branch") in allowed_features or ("profile", "branch") in allowed_features))
                    or (it["feature"] == "email" and (("profile", "email") in allowed_features or ("settings", "admin_setting") in allowed_features))
                    or (it["feature"] == "monthly_pnl" and (("profile", "monthly_pnl") in allowed_features or ("reports", "profit_loss") in allowed_features))
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})
            elif mod["id"] in ("api_center", "api-center"):
                allowed_items = [
                    map_item(it) for it in mod["items"]
                    if (mod["id"], it["feature"]) in allowed_features
                    or ("api_center", it["feature"]) in allowed_features
                    or ("api-center", it["feature"]) in allowed_features
                    or ("company", "api_center") in allowed_features
                    or ("profile", "company") in allowed_features
                    or is_admin
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})
            elif mod["id"] == "company":
                allowed_items = [
                    map_item(it) for it in mod["items"]
                    if (mod["id"], it["feature"]) in allowed_features
                    or (it["feature"] == "company_details" and ("profile", "company") in allowed_features)
                    or (it["feature"] == "branch" and ("profile", "branch") in allowed_features)
                    or (it["feature"] in ("users", "roles") and (("settings", it["feature"]) in allowed_features or ("company", it["feature"]) in allowed_features))
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})
            elif mod["id"] == "tracking":
                allowed_items = [
                    map_item(it) for it in mod["items"]
                    if (mod["id"], it["feature"]) in allowed_features
                    or ("tracking", it["feature"]) in allowed_features
                    or ("transport", "tracking") in allowed_features
                    or (it["feature"] in ("sim_tracking", "tracking") and (("tracking", "sim_tracking") in allowed_features or ("tracking", "tracking") in allowed_features))
                    or (it["feature"] in ("fastag_tracking", "tracking") and (("tracking", "fastag_tracking") in allowed_features or ("tracking", "tracking") in allowed_features))
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})
            elif mod["id"] in ("transport-reports", "transport_reports"):
                allowed_items = [
                    map_item(it) for it in mod["items"]
                    if (mod["id"], it["feature"]) in allowed_features
                    or ("transport_reports", it["feature"]) in allowed_features
                    or ("transport-reports", it["feature"]) in allowed_features
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})
            else:
                allowed_items = [
                    map_item(it) for it in mod["items"]
                    if (mod["id"], it["feature"]) in allowed_features
                    or (mod["id"].replace("-", "_"), it["feature"]) in allowed_features
                    or (mod["id"].replace("_", "-"), it["feature"]) in allowed_features
                ]
                if allowed_items:
                    result.append({"id": mod["id"], "title": mod["title"], "is_locked": False, "items": allowed_items})

    return result


@router.post("/logout", status_code=status.HTTP_200_OK, summary="Logout user")
async def logout(
    current_user: User = Depends(get_current_user)
):
    return {"message": "Successfully logged out"}
