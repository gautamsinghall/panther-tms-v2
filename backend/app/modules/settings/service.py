from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
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

async def update_existing_user(db: AsyncSession, user_id: int, data: UserUpdate) -> User:
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise AppException(status_code=404, error_code="USER_NOT_FOUND", message="User not found.")

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
