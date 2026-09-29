from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import UnauthorizedException, AppException
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.control.models import Tenant
from app.tenant_db.models import User
from app.auth.schemas import LoginRequest, TokenResponse, RefreshTokenRequest, OfficeSummary

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
        # Auto-reactivate demo administrator unconditionally
        if (
            email == settings.DEMO_ADMIN_EMAIL.lower().strip()
            or (user.email and user.email.lower().strip() == settings.DEMO_ADMIN_EMAIL.lower().strip())
        ):
            user.is_active = True
            await db.commit()
            await db.refresh(user)
        else:
            raise AppException(status_code=403, error_code="USER_INACTIVE", message="User account is inactive.")

    tenant_id_str = tenant.tenant_id
    company_code_str = tenant.company_code

    access_token = create_access_token(
        subject=str(user.id),
        tenant_id=tenant_id_str,
        company_code=company_code_str,
        role=user.role,
        extra_claims={
            "email": user.email,
            "full_name": user.full_name,
            "tenant_id": tenant_id_str,
            "company_code": company_code_str,
        }
    )

    refresh_token = create_refresh_token(
        subject=str(user.id),
        tenant_id=tenant_id_str,
        company_code=company_code_str,
    )

    offices_list, active_office_summary = await get_user_office_context(db, user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        tenant_id=tenant_id_str,
        company_code=company_code_str,
        tenant_name=tenant.company_name,
        assigned_offices=offices_list,
        active_office=active_office_summary,
    )

async def get_user_office_context(db: AsyncSession, user: User) -> tuple[list[OfficeSummary], Optional[OfficeSummary]]:
    from sqlalchemy.orm import selectinload
    from app.tenant_db.models import Branch, UserOfficeAssignment
    
    offices_list = []
    active_summary = None

    if user.role == "COMPANY_ADMIN":
        all_brs = (await db.execute(
            select(Branch).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.name)
        )).scalars().all()
        for b in all_brs:
            offices_list.append(OfficeSummary(
                id=b.id,
                code=b.code,
                name=b.name,
                city=b.city,
                state=b.state,
                gstin=b.gstin,
                is_head_office=b.is_head_office,
                is_default=b.is_head_office,
            ))
        if offices_list:
            active_summary = next((o for o in offices_list if o.is_head_office), offices_list[0])
    else:
        stmt_oa = (
            select(UserOfficeAssignment)
            .options(selectinload(UserOfficeAssignment.office))
            .where(UserOfficeAssignment.user_id == user.id)
        )
        oa_res = await db.execute(stmt_oa)
        user_assignments = list(oa_res.scalars().all())

        if not user_assignments:
            br_stmt = select(Branch).where(Branch.is_active == True).order_by(Branch.is_head_office.desc(), Branch.id.asc()).limit(1)
            hq = (await db.execute(br_stmt)).scalar_one_or_none()
            if hq:
                new_a = UserOfficeAssignment(user_id=user.id, office_id=hq.id, is_default=True)
                db.add(new_a)
                await db.commit()
                new_a.office = hq
                user_assignments = [new_a]

        for a in user_assignments:
            if a.office and a.office.is_active:
                offices_list.append(OfficeSummary(
                    id=a.office.id,
                    code=a.office.code,
                    name=a.office.name,
                    city=a.office.city,
                    state=a.office.state,
                    gstin=a.office.gstin,
                    is_head_office=a.office.is_head_office,
                    is_default=a.is_default,
                ))
        if offices_list:
            active_summary = next((o for o in offices_list if o.is_default), offices_list[0])

    return offices_list, active_summary

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

    tenant_id_str = tenant.tenant_id
    company_code_str = tenant.company_code

    token_tid = payload.get("tenant_id")
    if token_tid and token_tid != tenant_id_str:
        raise UnauthorizedException("Token tenant mismatch.")

    user_id = int(payload.get("sub"))
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User not found.")

    if not user.is_active:
        if user.email and user.email.lower().strip() == settings.DEMO_ADMIN_EMAIL.lower().strip():
            user.is_active = True
            await db.commit()
            await db.refresh(user)
        else:
            raise UnauthorizedException("User not found or inactive.")

    new_access_token = create_access_token(
        subject=str(user.id),
        tenant_id=tenant_id_str,
        company_code=company_code_str,
        role=user.role,
        extra_claims={
            "email": user.email,
            "full_name": user.full_name,
            "tenant_id": tenant_id_str,
            "company_code": company_code_str,
        }
    )

    new_refresh_token = create_refresh_token(
        subject=str(user.id),
        tenant_id=tenant_id_str,
        company_code=company_code_str,
    )

    offices_list, active_office_summary = await get_user_office_context(db, user)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        tenant_id=tenant_id_str,
        company_code=company_code_str,
        tenant_name=tenant.company_name,
        assigned_offices=offices_list,
        active_office=active_office_summary,
    )
