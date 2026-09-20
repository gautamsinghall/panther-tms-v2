from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.tenant_db.models import (
    PrimaryGroup,
    GroupInPrimary,
    SubgroupInGroup,
    Account,
    EmployeeMaster,
    ChargeHead,
    TaxCategory,
)
from app.modules.misc.schemas import (
    PrimaryGroupCreate, PrimaryGroupUpdate,
    GroupInPrimaryCreate, GroupInPrimaryUpdate,
    SubgroupInGroupCreate, SubgroupInGroupUpdate,
    AccountCreate, AccountUpdate,
    EmployeeMasterCreate, EmployeeMasterUpdate,
    ChargeHeadCreate, ChargeHeadUpdate,
    TaxCategoryCreate, TaxCategoryUpdate,
)

# ------------------------------------------------------------------------------
# Primary Group Service
# ------------------------------------------------------------------------------
async def get_primary_groups(session: AsyncSession) -> List[PrimaryGroup]:
    stmt = select(PrimaryGroup).order_by(PrimaryGroup.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_primary_group_by_id(session: AsyncSession, item_id: int) -> PrimaryGroup:
    stmt = select(PrimaryGroup).where(PrimaryGroup.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Primary Group not found")
    return item

async def create_primary_group(session: AsyncSession, data: PrimaryGroupCreate) -> PrimaryGroup:
    stmt = select(PrimaryGroup).where(PrimaryGroup.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Primary Group with code '{data.code}' already exists")

    item = PrimaryGroup(**data.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item

async def update_primary_group(session: AsyncSession, item_id: int, data: PrimaryGroupUpdate) -> PrimaryGroup:
    item = await get_primary_group_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    await session.refresh(item)
    return item

async def delete_primary_group(session: AsyncSession, item_id: int) -> bool:
    item = await get_primary_group_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Group in Primary Service
# ------------------------------------------------------------------------------
async def get_groups_in_primary(session: AsyncSession) -> List[GroupInPrimary]:
    stmt = select(GroupInPrimary).options(selectinload(GroupInPrimary.primary_group)).order_by(GroupInPrimary.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_group_in_primary_by_id(session: AsyncSession, item_id: int) -> GroupInPrimary:
    stmt = select(GroupInPrimary).options(selectinload(GroupInPrimary.primary_group)).where(GroupInPrimary.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group in Primary not found")
    return item

async def create_group_in_primary(session: AsyncSession, data: GroupInPrimaryCreate) -> GroupInPrimary:
    stmt = select(GroupInPrimary).where(GroupInPrimary.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Group with code '{data.code}' already exists")

    item = GroupInPrimary(**data.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return await get_group_in_primary_by_id(session, item.id)

async def update_group_in_primary(session: AsyncSession, item_id: int, data: GroupInPrimaryUpdate) -> GroupInPrimary:
    item = await get_group_in_primary_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_group_in_primary_by_id(session, item.id)

async def delete_group_in_primary(session: AsyncSession, item_id: int) -> bool:
    item = await get_group_in_primary_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Subgroup in Group Service
# ------------------------------------------------------------------------------
async def get_subgroups(session: AsyncSession) -> List[SubgroupInGroup]:
    stmt = select(SubgroupInGroup).options(selectinload(SubgroupInGroup.group)).order_by(SubgroupInGroup.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_subgroup_by_id(session: AsyncSession, item_id: int) -> SubgroupInGroup:
    stmt = select(SubgroupInGroup).options(selectinload(SubgroupInGroup.group)).where(SubgroupInGroup.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subgroup not found")
    return item

async def create_subgroup(session: AsyncSession, data: SubgroupInGroupCreate) -> SubgroupInGroup:
    stmt = select(SubgroupInGroup).where(SubgroupInGroup.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Subgroup with code '{data.code}' already exists")

    item = SubgroupInGroup(**data.model_dump())
    session.add(item)
    await session.commit()
    return await get_subgroup_by_id(session, item.id)

async def update_subgroup(session: AsyncSession, item_id: int, data: SubgroupInGroupUpdate) -> SubgroupInGroup:
    item = await get_subgroup_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_subgroup_by_id(session, item.id)

async def delete_subgroup(session: AsyncSession, item_id: int) -> bool:
    item = await get_subgroup_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Account Service
# ------------------------------------------------------------------------------
async def get_accounts(session: AsyncSession) -> List[Account]:
    stmt = select(Account).options(
        selectinload(Account.group),
        selectinload(Account.subgroup)
    ).order_by(Account.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_account_by_id(session: AsyncSession, item_id: int) -> Account:
    stmt = select(Account).options(
        selectinload(Account.group),
        selectinload(Account.subgroup)
    ).where(Account.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return item

async def create_account(session: AsyncSession, data: AccountCreate) -> Account:
    stmt = select(Account).where(Account.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Account with code '{data.code}' already exists")

    item = Account(**data.model_dump())
    session.add(item)
    await session.commit()
    return await get_account_by_id(session, item.id)

async def update_account(session: AsyncSession, item_id: int, data: AccountUpdate) -> Account:
    item = await get_account_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_account_by_id(session, item.id)

async def delete_account(session: AsyncSession, item_id: int) -> bool:
    item = await get_account_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Employee Master Service
# ------------------------------------------------------------------------------
async def get_employees(session: AsyncSession) -> List[EmployeeMaster]:
    stmt = select(EmployeeMaster).options(selectinload(EmployeeMaster.designation)).order_by(EmployeeMaster.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_employee_by_id(session: AsyncSession, item_id: int) -> EmployeeMaster:
    stmt = select(EmployeeMaster).options(selectinload(EmployeeMaster.designation)).where(EmployeeMaster.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return item

async def create_employee(session: AsyncSession, data: EmployeeMasterCreate) -> EmployeeMaster:
    stmt = select(EmployeeMaster).where(EmployeeMaster.employee_code == data.employee_code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Employee code '{data.employee_code}' already exists")

    item = EmployeeMaster(**data.model_dump())
    session.add(item)
    await session.commit()
    return await get_employee_by_id(session, item.id)

async def update_employee(session: AsyncSession, item_id: int, data: EmployeeMasterUpdate) -> EmployeeMaster:
    item = await get_employee_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_employee_by_id(session, item.id)

async def delete_employee(session: AsyncSession, item_id: int) -> bool:
    item = await get_employee_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Charge Head Service
# ------------------------------------------------------------------------------
async def get_charge_heads(session: AsyncSession) -> List[ChargeHead]:
    stmt = select(ChargeHead).options(selectinload(ChargeHead.tax_category)).order_by(ChargeHead.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_charge_head_by_id(session: AsyncSession, item_id: int) -> ChargeHead:
    stmt = select(ChargeHead).options(selectinload(ChargeHead.tax_category)).where(ChargeHead.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charge Head not found")
    return item

async def create_charge_head(session: AsyncSession, data: ChargeHeadCreate) -> ChargeHead:
    stmt = select(ChargeHead).where(ChargeHead.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Charge Head with code '{data.code}' already exists")

    item = ChargeHead(**data.model_dump())
    session.add(item)
    await session.commit()
    return await get_charge_head_by_id(session, item.id)

async def update_charge_head(session: AsyncSession, item_id: int, data: ChargeHeadUpdate) -> ChargeHead:
    item = await get_charge_head_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    return await get_charge_head_by_id(session, item.id)

async def delete_charge_head(session: AsyncSession, item_id: int) -> bool:
    item = await get_charge_head_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True


# ------------------------------------------------------------------------------
# Tax Category Service
# ------------------------------------------------------------------------------
async def get_tax_categories(session: AsyncSession) -> List[TaxCategory]:
    stmt = select(TaxCategory).order_by(TaxCategory.id)
    res = await session.execute(stmt)
    return list(res.scalars().all())

async def get_tax_category_by_id(session: AsyncSession, item_id: int) -> TaxCategory:
    stmt = select(TaxCategory).where(TaxCategory.id == item_id)
    res = await session.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax Category not found")
    return item

async def create_tax_category(session: AsyncSession, data: TaxCategoryCreate) -> TaxCategory:
    stmt = select(TaxCategory).where(TaxCategory.code == data.code)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tax Category with code '{data.code}' already exists")

    item = TaxCategory(**data.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item

async def update_tax_category(session: AsyncSession, item_id: int, data: TaxCategoryUpdate) -> TaxCategory:
    item = await get_tax_category_by_id(session, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await session.commit()
    await session.refresh(item)
    return item

async def delete_tax_category(session: AsyncSession, item_id: int) -> bool:
    item = await get_tax_category_by_id(session, item_id)
    await session.delete(item)
    await session.commit()
    return True
