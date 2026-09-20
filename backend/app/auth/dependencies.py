from typing import Callable
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import UnauthorizedException, ForbiddenException
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
    Factory creating a FastAPI dependency enforcing fine-grained RBAC per rules.md §5:
    'Every new endpoint must declare its required permission explicitly; no implicitly open endpoints.'
    - Company Admin has full access to all modules and actions.
    - Employee is checked against the permissions in their assigned role.
    """
    async def _check_permission(
        user: User = Depends(get_current_user)
    ) -> User:
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
