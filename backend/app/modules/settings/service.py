from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import AppException
from app.core.security import get_password_hash
from app.tenant_db.models import User, Role, RolePermission
from app.modules.settings.schemas import RoleCreate, RoleUpdate, UserCreate, UserUpdate

# --- Roles & Permissions Service ---

async def get_all_roles(db: AsyncSession) -> List[Role]:
    stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_new_role(db: AsyncSession, data: RoleCreate) -> Role:
    # Check duplicate
    stmt = select(Role).where(Role.name == data.name.strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="ROLE_EXISTS", message=f"Role '{data.name}' already exists.")

    role = Role(
        name=data.name.strip(),
        description=data.description,
        is_system=False,
    )
    db.add(role)
    await db.flush()

    for perm in data.permissions:
        role_perm = RolePermission(
            role_id=role.id,
            module=perm.module.lower(),
            feature=perm.feature.lower(),
            permission=perm.permission.lower(),
            is_allowed=perm.is_allowed,
        )
        db.add(role_perm)

    await db.commit()
    await db.refresh(role)
    return role

async def update_existing_role(db: AsyncSession, role_id: int, data: RoleUpdate) -> Role:
    stmt = select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
    role = (await db.execute(stmt)).scalar_one_or_none()
    if not role:
        raise AppException(status_code=404, error_code="ROLE_NOT_FOUND", message="Role not found.")

    if data.name:
        role.name = data.name.strip()
    if data.description is not None:
        role.description = data.description

    if data.permissions is not None:
        # Clear existing permissions
        await db.execute(delete(RolePermission).where(RolePermission.role_id == role.id))
        for perm in data.permissions:
            role_perm = RolePermission(
                role_id=role.id,
                module=perm.module.lower(),
                feature=perm.feature.lower(),
                permission=perm.permission.lower(),
                is_allowed=perm.is_allowed,
            )
            db.add(role_perm)

    await db.commit()
    await db.refresh(role)
    return role

async def delete_existing_role(db: AsyncSession, role_id: int) -> None:
    stmt = select(Role).where(Role.id == role_id)
    role = (await db.execute(stmt)).scalar_one_or_none()
    if not role:
        raise AppException(status_code=404, error_code="ROLE_NOT_FOUND", message="Role not found.")
    if role.is_system:
        raise AppException(status_code=400, error_code="CANNOT_DELETE_SYSTEM_ROLE", message="System roles cannot be deleted.")

    await db.delete(role)
    await db.commit()

# --- Users Service ---

async def get_all_users(db: AsyncSession) -> List[User]:
    stmt = select(User).options(selectinload(User.custom_role)).order_by(User.id)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_new_user(db: AsyncSession, data: UserCreate) -> User:
    email = data.email.lower().strip()
    stmt = select(User).where(User.email == email)
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="USER_EXISTS", message=f"User with email '{email}' already exists.")

    if data.role_id:
        role_stmt = select(Role).where(Role.id == data.role_id)
        if not (await db.execute(role_stmt)).scalar_one_or_none():
            raise AppException(status_code=400, error_code="ROLE_NOT_FOUND", message="Assigned role does not exist.")

    user = User(
        email=email,
        password_hash=get_password_hash(data.password),
        full_name=data.full_name.strip(),
        role=data.role,
        role_id=data.role_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def update_existing_user(
    db: AsyncSession,
    user_id: int,
    data: UserUpdate,
    current_user: Optional[User] = None,
) -> User:
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise AppException(status_code=404, error_code="USER_NOT_FOUND", message="User not found.")

    if data.is_active is False:
        # 1. Protect demo administrator from deactivation
        if user.email.lower().strip() == settings.DEMO_ADMIN_EMAIL.lower().strip():
            raise AppException(
                status_code=400,
                error_code="CANNOT_DEACTIVATE_DEMO_ADMIN",
                message="The demo administrator account cannot be deactivated.",
            )
        # 2. Protect current user from self-deactivation
        if current_user and current_user.id == user.id:
            raise AppException(
                status_code=400,
                error_code="CANNOT_DEACTIVATE_SELF",
                message="You cannot deactivate your own account.",
            )
        # 3. Protect last remaining active Company Admin
        if user.role == "COMPANY_ADMIN":
            active_admins_stmt = select(func.count(User.id)).where(
                User.role == "COMPANY_ADMIN",
                User.is_active == True,
                User.id != user.id,
            )
            active_admins_count = (await db.execute(active_admins_stmt)).scalar() or 0
            if active_admins_count == 0:
                raise AppException(
                    status_code=400,
                    error_code="CANNOT_DEACTIVATE_LAST_ADMIN",
                    message="Cannot deactivate the only active Company Administrator.",
                )

    if data.full_name:
        user.full_name = data.full_name.strip()
    if data.role_id is not None:
        user.role_id = data.role_id
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password:
        user.password_hash = get_password_hash(data.password)

    await db.commit()
    await db.refresh(user)
    return user


# --- Series Categories ---

from app.tenant_db.models import SeriesCategory, SeriesMaster, AdminSetting, UserActivity
from app.modules.settings.schemas import (
    SeriesCategoryCreate, SeriesCategoryUpdate,
    SeriesMasterCreate, SeriesMasterUpdate,
    AdminSettingItem
)

async def get_all_series_categories(db: AsyncSession) -> List[SeriesCategory]:
    await ensure_series_table_schema(db)
    stmt = select(SeriesCategory).order_by(SeriesCategory.name)
    result = await db.execute(stmt)
    cats = list(result.scalars().all())
    if len(cats) == 0:
        categories = [
            {"code": "TRANSPORT", "name": "Transport Documents", "description": "LR, Hire Challan, POD, Dispatch"},
            {"code": "BILLING", "name": "Customer Invoicing", "description": "Transport Invoices, General Invoices, Proforma"},
            {"code": "ACCOUNTS", "name": "Accounting Vouchers", "description": "Purchases, Receipts, Payments, Notes, Contra"},
        ]
        for c in categories:
            cat_obj = SeriesCategory(
                name=c["name"],
                code=c["code"],
                description=c["description"],
                is_active=True,
            )
            db.add(cat_obj)
        await db.commit()
        result = await db.execute(stmt)
        cats = list(result.scalars().all())
    return cats

async def create_series_category(db: AsyncSession, data: SeriesCategoryCreate) -> SeriesCategory:
    stmt = select(SeriesCategory).where(SeriesCategory.code == data.code.upper().strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="SERIES_CAT_EXISTS", message=f"Series category '{data.code}' already exists.")

    cat = SeriesCategory(
        name=data.name.strip(),
        code=data.code.upper().strip(),
        description=data.description,
        is_active=data.is_active,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat

async def update_series_category(db: AsyncSession, cat_id: int, data: SeriesCategoryUpdate) -> SeriesCategory:
    cat = (await db.execute(select(SeriesCategory).where(SeriesCategory.id == cat_id))).scalar_one_or_none()
    if not cat:
        raise AppException(status_code=404, error_code="SERIES_CAT_NOT_FOUND", message="Series category not found.")

    if data.name:
        cat.name = data.name.strip()
    if data.code:
        cat.code = data.code.upper().strip()
    if data.description is not None:
        cat.description = data.description
    if data.is_active is not None:
        cat.is_active = data.is_active

    await db.commit()
    await db.refresh(cat)
    return cat

async def delete_series_category(db: AsyncSession, cat_id: int) -> None:
    cat = (await db.execute(select(SeriesCategory).where(SeriesCategory.id == cat_id))).scalar_one_or_none()
    if not cat:
        raise AppException(status_code=404, error_code="SERIES_CAT_NOT_FOUND", message="Series category not found.")
    await db.delete(cat)
    await db.commit()


# --- Series Masters ---
from app.modules.settings.series_service import (
    compute_series_display_data,
    ensure_series_table_schema,
    MANDATORY_MANUAL_DOC_TYPES,
    DOC_TYPE_ALIASES,
    initialize_all_standard_series,
    check_series_status,
)

async def get_all_series_masters(db: AsyncSession) -> List[dict]:
    await ensure_series_table_schema(db)
    stmt = select(SeriesMaster).options(selectinload(SeriesMaster.category)).order_by(SeriesMaster.document_type)
    result = await db.execute(stmt)
    series_list = result.scalars().all()
    
    # Auto-initialize all 15 default voucher series if database is fresh/empty
    if len(series_list) == 0:
        await initialize_all_standard_series(db)
        result = await db.execute(stmt)
        series_list = result.scalars().all()

    out = []
    now_utc = datetime.now(timezone.utc)
    for s in series_list:
        disp = compute_series_display_data(s)
        out.append({
            "id": s.id,
            "category_id": s.category_id,
            "category_name": s.category.name if s.category else None,
            "document_type": s.document_type,
            "prefix": s.prefix,
            "suffix": s.suffix or "",
            "starting_number": s.starting_number,
            "current_number": s.current_number,
            "end_number": s.end_number,
            "financial_year": s.financial_year,
            "series_mode": disp["series_mode"],
            "last_used_formatted": disp["last_used_formatted"],
            "next_number": disp["next_number"],
            "next_number_formatted": disp["next_number_formatted"],
            "is_mandatory_manual": disp["is_mandatory_manual"],
            "is_active": s.is_active,
            "created_at": s.created_at or now_utc,
            "updated_at": s.updated_at or now_utc,
        })
    return out

async def create_series_master(db: AsyncSession, data: SeriesMasterCreate) -> dict:
    await ensure_series_table_schema(db)
    raw_doc = data.document_type.upper().strip()
    norm_doc = DOC_TYPE_ALIASES.get(raw_doc, raw_doc)
    is_mandatory = norm_doc in MANDATORY_MANUAL_DOC_TYPES

    mode = (data.series_mode or ("MANUAL" if is_mandatory else "AUTOMATIC")).upper().strip()
    if is_mandatory and mode != "MANUAL":
        readable_title = norm_doc.replace("_", " ").title()
        raise AppException(
            status_code=400,
            error_code="INVALID_SERIES_MODE",
            message=f"Manual series is mandatory for {readable_title} and cannot be set to Automatic."
        )

    series = SeriesMaster(
        category_id=data.category_id,
        document_type=norm_doc,
        prefix=data.prefix.strip(),
        suffix=data.suffix or "",
        starting_number=data.starting_number,
        current_number=data.current_number if data.current_number is not None else (data.starting_number - 1),
        end_number=data.end_number,
        financial_year=data.financial_year.strip(),
        series_mode=mode,
        is_active=data.is_active,
    )
    db.add(series)
    await db.commit()
    await db.refresh(series)

    cat_name = None
    if series.category_id:
        c = (await db.execute(select(SeriesCategory).where(SeriesCategory.id == series.category_id))).scalar_one_or_none()
        if c:
            cat_name = c.name

    disp = compute_series_display_data(series)
    return {
        "id": series.id,
        "category_id": series.category_id,
        "category_name": cat_name,
        "document_type": series.document_type,
        "prefix": series.prefix,
        "suffix": series.suffix or "",
        "starting_number": series.starting_number,
        "current_number": series.current_number,
        "end_number": series.end_number,
        "financial_year": series.financial_year,
        "series_mode": disp["series_mode"],
        "last_used_formatted": disp["last_used_formatted"],
        "next_number": disp["next_number"],
        "next_number_formatted": disp["next_number_formatted"],
        "is_mandatory_manual": disp["is_mandatory_manual"],
        "is_active": series.is_active,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
    }

async def update_series_master(db: AsyncSession, series_id: int, data: SeriesMasterUpdate) -> dict:
    await ensure_series_table_schema(db)
    series = (await db.execute(select(SeriesMaster).options(selectinload(SeriesMaster.category)).where(SeriesMaster.id == series_id))).scalar_one_or_none()
    if not series:
        raise AppException(status_code=404, error_code="SERIES_NOT_FOUND", message="Series master not found.")

    target_doc = (data.document_type.upper().strip() if data.document_type else series.document_type.upper().strip())
    norm_doc = DOC_TYPE_ALIASES.get(target_doc, target_doc)
    is_mandatory = norm_doc in MANDATORY_MANUAL_DOC_TYPES

    if data.series_mode is not None:
        req_mode = data.series_mode.upper().strip()
        if is_mandatory and req_mode != "MANUAL":
            readable_title = norm_doc.replace("_", " ").title()
            raise AppException(
                status_code=400,
                error_code="INVALID_SERIES_MODE",
                message=f"Manual series is mandatory for {readable_title} and cannot be set to Automatic."
            )
        series.series_mode = req_mode
    elif is_mandatory:
        series.series_mode = "MANUAL"

    if data.category_id is not None:
        series.category_id = data.category_id
    if data.document_type:
        series.document_type = norm_doc
    if data.prefix is not None:
        series.prefix = data.prefix.strip()
    if data.suffix is not None:
        series.suffix = data.suffix.strip()
    if data.starting_number is not None:
        series.starting_number = data.starting_number
    if data.current_number is not None:
        series.current_number = data.current_number
    if data.end_number is not None:
        series.end_number = data.end_number
    if data.financial_year:
        series.financial_year = data.financial_year.strip()
    if data.is_active is not None:
        series.is_active = data.is_active

    await db.commit()
    await db.refresh(series)
    disp = compute_series_display_data(series)
    return {
        "id": series.id,
        "category_id": series.category_id,
        "category_name": series.category.name if series.category else None,
        "document_type": series.document_type,
        "prefix": series.prefix,
        "suffix": series.suffix or "",
        "starting_number": series.starting_number,
        "current_number": series.current_number,
        "end_number": series.end_number,
        "financial_year": series.financial_year,
        "series_mode": disp["series_mode"],
        "last_used_formatted": disp["last_used_formatted"],
        "next_number": disp["next_number"],
        "next_number_formatted": disp["next_number_formatted"],
        "is_mandatory_manual": disp["is_mandatory_manual"],
        "is_active": series.is_active,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
    }

async def delete_series_master(db: AsyncSession, series_id: int) -> None:
    series = (await db.execute(select(SeriesMaster).where(SeriesMaster.id == series_id))).scalar_one_or_none()
    if not series:
        raise AppException(status_code=404, error_code="SERIES_NOT_FOUND", message="Series master not found.")
    await db.delete(series)
    await db.commit()


# --- Admin Settings ---

async def get_admin_settings(db: AsyncSession) -> List[AdminSetting]:
    stmt = select(AdminSetting).order_by(AdminSetting.setting_key)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def update_admin_settings(db: AsyncSession, settings_items: List[AdminSettingItem]) -> List[AdminSetting]:
    for item in settings_items:
        stmt = select(AdminSetting).where(AdminSetting.setting_key == item.setting_key)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if record:
            record.setting_value = item.setting_value
            if item.category:
                record.category = item.category
            if item.description:
                record.description = item.description
        else:
            db.add(AdminSetting(
                setting_key=item.setting_key,
                setting_value=item.setting_value,
                category=item.category,
                description=item.description,
            ))
    await db.commit()
    return await get_admin_settings(db)


# --- User Activity (Audit Log) ---

async def log_user_activity(
    db: AsyncSession,
    user: User,
    action: str,
    module: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> UserActivity:
    act = UserActivity(
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        user_role=user.role if user else "SYSTEM",
        action=action,
        module=module,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
        ip_address=ip_address,
    )
    db.add(act)
    await db.commit()
    await db.refresh(act)
    return act

async def get_activity_logs(
    db: AsyncSession,
    limit: int = 100,
    module: Optional[str] = None,
    user_email: Optional[str] = None,
) -> List[UserActivity]:
    stmt = select(UserActivity)
    if module:
        stmt = stmt.where(UserActivity.module == module.lower().strip())
    if user_email:
        stmt = stmt.where(UserActivity.user_email == user_email.lower().strip())
    stmt = stmt.order_by(UserActivity.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())

