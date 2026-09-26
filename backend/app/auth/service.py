from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import UnauthorizedException, AppException
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.control.models import Tenant
from app.tenant_db.models import User
from app.auth.schemas import LoginRequest, TokenResponse, RefreshTokenRequest

async def authenticate_user(
    db: AsyncSession,
    tenant: Tenant,
    login_data: LoginRequest
) -> TokenResponse:
    email = login_data.email.lower().strip()
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("Invalid email or password.")

    if not verify_password(login_data.password, user.password_hash):
        raise UnauthorizedException("Invalid email or password.")

    if not user.is_active:
        # Self-heal demo tenant admin if previously deactivated
        if tenant.subdomain == settings.DEMO_TENANT_SUBDOMAIN and email == settings.DEMO_ADMIN_EMAIL.lower().strip():
            user.is_active = True
            await db.commit()
            await db.refresh(user)
        else:
            raise AppException(status_code=403, error_code="USER_INACTIVE", message="User account is inactive.")

    access_token = create_access_token(
        subject=str(user.id),
        tenant_subdomain=tenant.subdomain,
        tenant_id=tenant.id,
        role=user.role,
        extra_claims={
            "email": user.email,
            "full_name": user.full_name,
        }
    )

    refresh_token = create_refresh_token(
        subject=str(user.id),
        tenant_subdomain=tenant.subdomain,
        tenant_id=tenant.id,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        subdomain=tenant.subdomain,
        tenant_name=tenant.company_name,
    )

async def refresh_user_token(
    db: AsyncSession,
    tenant: Tenant,
    refresh_data: RefreshTokenRequest
) -> TokenResponse:
    try:
        payload = decode_token(refresh_data.refresh_token)
    except Exception:
        raise UnauthorizedException("Invalid or expired refresh token.")

    if payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid token type.")

    if payload.get("subdomain") != tenant.subdomain:
        raise UnauthorizedException("Token tenant mismatch.")

    user_id = int(payload.get("sub"))
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User not found.")

    if not user.is_active:
        if tenant.subdomain == settings.DEMO_TENANT_SUBDOMAIN and user.email == settings.DEMO_ADMIN_EMAIL.lower().strip():
            user.is_active = True
            await db.commit()
            await db.refresh(user)
        else:
            raise UnauthorizedException("User not found or inactive.")

    new_access_token = create_access_token(
        subject=str(user.id),
        tenant_subdomain=tenant.subdomain,
        tenant_id=tenant.id,
        role=user.role,
        extra_claims={
            "email": user.email,
            "full_name": user.full_name,
        }
    )

    new_refresh_token = create_refresh_token(
        subject=str(user.id),
        tenant_subdomain=tenant.subdomain,
        tenant_id=tenant.id,
    )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        subdomain=tenant.subdomain,
        tenant_name=tenant.company_name,
    )
