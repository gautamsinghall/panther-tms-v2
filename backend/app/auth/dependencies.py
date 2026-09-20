from datetime import datetime, timezone
from typing import Callable
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import (
    UnauthorizedException, ForbiddenException,
    EntitlementLockedException, QuotaExceededException
)
from app.core.security import decode_token
from app.control.models import Tenant
from app.tenant_db.models import User, Role, RolePermission
from app.tenant_db.session import get_current_tenant, get_tenant_db

security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
) -> User:
    if not credentials:
        raise UnauthorizedException("Missing authentication token.")

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise UnauthorizedException("Invalid or expired authentication token.")

    if payload.get("type") != "access":
        raise UnauthorizedException("Invalid token type.")

    token_subdomain = payload.get("subdomain")
    if token_subdomain != tenant.subdomain:
        raise UnauthorizedException(
            message="Token was issued for a different tenant.",
            details={"token_subdomain": token_subdomain, "request_subdomain": tenant.subdomain}
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Token missing subject.")

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid subject format.")

    # Eager load role and permissions
    stmt = (
        select(User)
        .options(selectinload(User.custom_role).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User not found.")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive.")

    return user

async def get_current_company_admin(
    user: User = Depends(get_current_user)
) -> User:
    if user.role != "COMPANY_ADMIN":
        raise ForbiddenException("Company Admin privileges required.")
    return user

def require_permission(module: str, feature: str, permission: str) -> Callable:
    """
    Unified authorization dependency per rules.md §5 and architecture.md §6:
    1. Layer 1: Entitlement locking (plan-level) - checks if tenant's subscription
       and plan allow the requested module.
    2. Layer 2: RBAC locking (employee-level) - Company Admin has full access to
       entitled features; Employees are checked against their assigned role permissions.
    """
    async def _check_permission(
        user: User = Depends(get_current_user),
        tenant: Tenant = Depends(get_current_tenant),
    ) -> User:
        # 1. Check tenant subscription status
        now = datetime.now(timezone.utc)
        if tenant.status == "SUSPENDED":
            raise ForbiddenException(
                message="Tenant subscription is suspended. Please renew to resume access.",
                details={"error_code": "SUBSCRIPTION_SUSPENDED", "subdomain": tenant.subdomain}
            )
        if tenant.status == "PAST_DUE" and tenant.grace_period_until and now > tenant.grace_period_until:
            raise ForbiddenException(
                message="Subscription grace period has expired. Please update payment to resume access.",
                details={"error_code": "GRACE_PERIOD_EXPIRED", "subdomain": tenant.subdomain}
            )

        # 2. Check Module Entitlement (plan-based)
        norm_mod = module.replace("-", "_").lower()
        feature_key = f"module_{norm_mod}"

        if tenant.plan and tenant.plan.entitlements:
            is_entitled = False
            for ent in tenant.plan.entitlements:
                if ent.feature_key in (feature_key, "module_all") and ent.is_enabled:
                    if ent.limit_value.lower() in ("true", "1", "yes"):
                        is_entitled = True
                        break
            if not is_entitled:
                raise EntitlementLockedException(
                    module=module,
                    plan_name=tenant.plan.name,
                    details={"module": module, "plan": tenant.plan.code}
                )

        # 3. Check Employee RBAC (employee-based)
        if user.role == "COMPANY_ADMIN":
            return user

        if not user.custom_role or not user.custom_role.permissions:
            raise ForbiddenException(
                message=f"Access denied. Missing permission: {module}.{feature}.{permission}",
                details={"required": f"{module}.{feature}.{permission}"}
            )

        has_perm = any(
            p.module == module
            and p.feature == feature
            and (p.permission == permission or p.permission == "all")
            and p.is_allowed
            for p in user.custom_role.permissions
        )

        if not has_perm:
            raise ForbiddenException(
                message=f"Access denied. Missing permission: {module}.{feature}.{permission}",
                details={"required": f"{module}.{feature}.{permission}"}
            )

        return user

    return _check_permission


async def check_entitlement_limit(tenant: Tenant, db: AsyncSession, limit_key: str) -> None:
    """
    Enforces numerical plan quotas (e.g., max_users, max_vehicles) per architecture.md §6.
    """
    if not tenant.plan or not tenant.plan.entitlements:
        return

    limit_val = None
    for ent in tenant.plan.entitlements:
        if ent.feature_key == limit_key and ent.is_enabled:
            limit_val = ent.limit_value
            break

    if not limit_val or limit_val.lower() in ("unlimited", "infinite", "-1"):
        return

    try:
        max_allowed = int(limit_val)
    except ValueError:
        return

    if limit_key == "max_users":
        count_stmt = select(func.count()).select_from(User).where(User.is_active == True)
        current_count = (await db.execute(count_stmt)).scalar() or 0
        if current_count >= max_allowed:
            raise QuotaExceededException(limit_key="Users", current_limit=str(max_allowed))

    elif limit_key == "max_vehicles":
        from app.tenant_db.models import CompanyVehicle
        count_stmt = select(func.count()).select_from(CompanyVehicle).where(CompanyVehicle.is_active == True)
        current_count = (await db.execute(count_stmt)).scalar() or 0
        if current_count >= max_allowed:
            raise QuotaExceededException(limit_key="Vehicles", current_limit=str(max_allowed))

