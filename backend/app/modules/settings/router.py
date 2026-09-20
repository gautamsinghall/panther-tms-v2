from typing import List, Optional, Union
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.auth.dependencies import require_permission, get_current_company_admin, check_entitlement_limit
from app.control.models import Tenant
from app.tenant_db.models import User
from app.modules.settings.schemas import (
    RoleCreate, RoleUpdate, RoleResponse,
    UserCreate, UserUpdate, UserListItem, PermissionItem,
    SeriesCategoryCreate, SeriesCategoryUpdate, SeriesCategoryResponse,
    SeriesMasterCreate, SeriesMasterUpdate, SeriesMasterResponse,
    AdminSettingItem, AdminSettingsBulkUpdate, AdminSettingResponse, UserActivityResponse
)
from app.modules.settings import service


router = APIRouter(prefix="/settings", tags=["Settings & RBAC"])

# --- Roles Management Endpoints ---

@router.get(
    "/roles",
    response_model=List[RoleResponse],
    summary="List all tenant roles and permissions"
)
async def list_roles(
    current_user: User = Depends(require_permission("settings", "roles", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    roles = await service.get_all_roles(db)
    result = []
    for r in roles:
        result.append(
            RoleResponse(
                id=r.id,
                name=r.name,
                description=r.description,
                is_system=r.is_system,
                created_at=r.created_at,
                updated_at=r.updated_at,
                permissions=[
                    PermissionItem(
                        module=p.module,
                        feature=p.feature,
                        permission=p.permission,
                        is_allowed=p.is_allowed,
                    )
                    for p in (r.permissions or [])
                ],
            )
        )
    return result

@router.post(
    "/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a custom role with permissions"
)
async def create_role(
    data: RoleCreate,
    current_user: User = Depends(require_permission("settings", "roles", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    role = await service.create_new_role(db, data)
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at,
        updated_at=role.updated_at,
        permissions=[
            PermissionItem(
                module=p.module,
                feature=p.feature,
                permission=p.permission,
                is_allowed=p.is_allowed,
            )
            for p in (role.permissions or [])
        ],
    )

@router.put(
    "/roles/{role_id}",
    response_model=RoleResponse,
    summary="Update an existing role and permissions"
)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    current_user: User = Depends(require_permission("settings", "roles", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    role = await service.update_existing_role(db, role_id, data)
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at,
        updated_at=role.updated_at,
        permissions=[
            PermissionItem(
                module=p.module,
                feature=p.feature,
                permission=p.permission,
                is_allowed=p.is_allowed,
            )
            for p in (role.permissions or [])
        ],
    )

@router.delete(
    "/roles/{role_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a custom role"
)
async def delete_role(
    role_id: int,
    current_user: User = Depends(require_permission("settings", "roles", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_existing_role(db, role_id)
    return {"message": "Role deleted successfully."}

# --- Users / Employees Management Endpoints ---

@router.get(
    "/users",
    response_model=List[UserListItem],
    summary="List all tenant users"
)
async def list_users(
    current_user: User = Depends(require_permission("settings", "users", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    users = await service.get_all_users(db)
    return [
        UserListItem(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            role_id=u.role_id,
            role_name=u.custom_role.name if u.custom_role else ("Company Admin" if u.role == "COMPANY_ADMIN" else None),
            is_active=u.is_active,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
        for u in users
    ]

@router.post(
    "/users",
    response_model=UserListItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee user"
)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_permission("settings", "users", "create")),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    # Enforce plan entitlement quota on max users
    await check_entitlement_limit(tenant, db, "max_users")
    user = await service.create_new_user(db, data)
    await service.log_user_activity(
        db=db,
        user=current_user,
        action="USER_CREATED",
        module="settings",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Created user {user.email} ({user.role})"
    )
    return UserListItem(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        role_id=user.role_id,
        role_name=user.custom_role.name if user.custom_role else None,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )

@router.put(
    "/users/{user_id}",
    response_model=UserListItem,
    summary="Update an employee user"
)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_permission("settings", "users", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    user = await service.update_existing_user(db, user_id, data)
    return UserListItem(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        role_id=user.role_id,
        role_name=user.custom_role.name if user.custom_role else None,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


# --- Series Categories Endpoints ---

@router.get(
    "/series-categories",
    response_model=List[SeriesCategoryResponse],
    summary="List all document series categories"
)
async def list_series_categories(
    current_user: User = Depends(require_permission("settings", "series_master", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_all_series_categories(db)

@router.post(
    "/series-categories",
    response_model=SeriesCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new document series category"
)
async def create_series_category(
    data: SeriesCategoryCreate,
    current_user: User = Depends(require_permission("settings", "series_master", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    cat = await service.create_series_category(db, data)
    await service.log_user_activity(db, current_user, "SERIES_CAT_CREATED", "settings", "series_category", str(cat.id), f"Created {cat.code}")
    return cat

@router.put(
    "/series-categories/{cat_id}",
    response_model=SeriesCategoryResponse,
    summary="Update a document series category"
)
async def update_series_category(
    cat_id: int,
    data: SeriesCategoryUpdate,
    current_user: User = Depends(require_permission("settings", "series_master", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_series_category(db, cat_id, data)

@router.delete(
    "/series-categories/{cat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document series category"
)
async def delete_series_category(
    cat_id: int,
    current_user: User = Depends(require_permission("settings", "series_master", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_series_category(db, cat_id)


# --- Series Masters Endpoints ---

@router.get(
    "/series",
    response_model=List[SeriesMasterResponse],
    summary="List all document series numbering masters"
)
async def list_series_masters(
    current_user: User = Depends(require_permission("settings", "series_master", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_all_series_masters(db)

@router.post(
    "/series",
    response_model=SeriesMasterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new document numbering series"
)
async def create_series_master(
    data: SeriesMasterCreate,
    current_user: User = Depends(require_permission("settings", "series_master", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    series = await service.create_series_master(db, data)
    await service.log_user_activity(db, current_user, "SERIES_CREATED", "settings", "series_master", str(series["id"]), f"Created series {series['prefix']} ({series['document_type']})")
    return series

@router.put(
    "/series/{series_id}",
    response_model=SeriesMasterResponse,
    summary="Update a document numbering series"
)
async def update_series_master(
    series_id: int,
    data: SeriesMasterUpdate,
    current_user: User = Depends(require_permission("settings", "series_master", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_series_master(db, series_id, data)

@router.delete(
    "/series/{series_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document numbering series"
)
async def delete_series_master(
    series_id: int,
    current_user: User = Depends(require_permission("settings", "series_master", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    await service.delete_series_master(db, series_id)


# --- Admin Settings Endpoints ---

@router.get(
    "/admin-settings",
    response_model=List[AdminSettingResponse],
    summary="List all operational admin settings"
)
async def list_admin_settings(
    current_user: User = Depends(require_permission("settings", "admin_setting", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_admin_settings(db)

@router.post(
    "/admin-settings",
    response_model=List[AdminSettingResponse],
    summary="Create or update operational admin settings"
)
@router.put(
    "/admin-settings",
    response_model=List[AdminSettingResponse],
    summary="Bulk update operational admin settings"
)
async def update_admin_settings(
    data: Union[AdminSettingsBulkUpdate, AdminSettingItem],
    current_user: User = Depends(require_permission("settings", "admin_setting", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    if isinstance(data, AdminSettingItem):
        items = [data]
    else:
        items = data.settings
    updated = await service.update_admin_settings(db, items)
    await service.log_user_activity(db, current_user, "ADMIN_SETTINGS_UPDATED", "settings", "admin_setting", "bulk", f"Updated {len(items)} settings")
    return updated


# --- User Activity (Audit Log) Endpoints ---

@router.get(
    "/activity",
    response_model=List[UserActivityResponse],
    summary="List user activity audit logs"
)
async def list_activity_logs(
    limit: int = 100,
    module: str = None,
    user_email: str = None,
    current_user: User = Depends(require_permission("settings", "activity", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_activity_logs(db, limit=limit, module=module, user_email=user_email)

