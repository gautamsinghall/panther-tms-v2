from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db
from app.auth.dependencies import require_permission, get_current_company_admin
from app.tenant_db.models import User
from app.modules.settings.schemas import (
    RoleCreate, RoleUpdate, RoleResponse,
    UserCreate, UserUpdate, UserListItem, PermissionItem
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
    db: AsyncSession = Depends(get_tenant_db),
):
    user = await service.create_new_user(db, data)
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
