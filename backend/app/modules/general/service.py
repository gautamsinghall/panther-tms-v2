from typing import List, Optional, Type, TypeVar
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import AppException
from app.tenant_db.models import (
    Consignee,
    Consigner,
    Location,
    Industry,
    Designation,
    GroupCompany,
    Unit,
    MethodOfPacking,
)

T = TypeVar("T")

# Generic CRUD helper for simple masters
async def _get_all(db: AsyncSession, model: Type[T]) -> List[T]:
    stmt = select(model).order_by(model.id.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def _get_by_id(db: AsyncSession, model: Type[T], entity_id: int) -> T:
    stmt = select(model).where(model.id == entity_id)
    result = await db.execute(stmt)
    entity = result.scalar_one_or_none()
    if not entity:
        raise AppException(
            status_code=404,
            error_code=f"{model.__name__.upper()}_NOT_FOUND",
            message=f"{model.__name__} with ID {entity_id} not found."
        )
    return entity

async def _soft_delete(db: AsyncSession, model: Type[T], entity_id: int) -> T:
    entity = await _get_by_id(db, model, entity_id)
    entity.is_active = False
    await db.commit()
    await db.refresh(entity)
    return entity

# --- Consignee Service ---
async def list_consignees(db: AsyncSession) -> List[Consignee]:
    return await _get_all(db, Consignee)

async def get_consignee(db: AsyncSession, cid: int) -> Consignee:
    return await _get_by_id(db, Consignee, cid)

async def create_consignee(db: AsyncSession, data) -> Consignee:
    entity = Consignee(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_consignee(db: AsyncSession, cid: int, data) -> Consignee:
    entity = await _get_by_id(db, Consignee, cid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_consignee(db: AsyncSession, cid: int) -> Consignee:
    return await _soft_delete(db, Consignee, cid)

# --- Consigner Service ---
async def list_consigners(db: AsyncSession) -> List[Consigner]:
    return await _get_all(db, Consigner)

async def get_consigner(db: AsyncSession, cid: int) -> Consigner:
    return await _get_by_id(db, Consigner, cid)

async def create_consigner(db: AsyncSession, data) -> Consigner:
    entity = Consigner(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_consigner(db: AsyncSession, cid: int, data) -> Consigner:
    entity = await _get_by_id(db, Consigner, cid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_consigner(db: AsyncSession, cid: int) -> Consigner:
    return await _soft_delete(db, Consigner, cid)

# --- Location Service ---
async def list_locations(db: AsyncSession) -> List[Location]:
    return await _get_all(db, Location)

async def get_location(db: AsyncSession, lid: int) -> Location:
    return await _get_by_id(db, Location, lid)

async def create_location(db: AsyncSession, data) -> Location:
    entity = Location(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_location(db: AsyncSession, lid: int, data) -> Location:
    entity = await _get_by_id(db, Location, lid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_location(db: AsyncSession, lid: int) -> Location:
    return await _soft_delete(db, Location, lid)

# --- Industry Service ---
async def list_industries(db: AsyncSession) -> List[Industry]:
    return await _get_all(db, Industry)

async def get_industry(db: AsyncSession, iid: int) -> Industry:
    return await _get_by_id(db, Industry, iid)

async def create_industry(db: AsyncSession, data) -> Industry:
    # Unique name check
    stmt = select(Industry).where(Industry.name == data.name.strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="INDUSTRY_EXISTS", message="Industry with this name already exists.")
    entity = Industry(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_industry(db: AsyncSession, iid: int, data) -> Industry:
    entity = await _get_by_id(db, Industry, iid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_industry(db: AsyncSession, iid: int) -> Industry:
    return await _soft_delete(db, Industry, iid)

# --- Designation Service ---
async def list_designations(db: AsyncSession) -> List[Designation]:
    return await _get_all(db, Designation)

async def get_designation(db: AsyncSession, did: int) -> Designation:
    return await _get_by_id(db, Designation, did)

async def create_designation(db: AsyncSession, data) -> Designation:
    stmt = select(Designation).where(Designation.title == data.title.strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="DESIGNATION_EXISTS", message="Designation with this title already exists.")
    entity = Designation(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_designation(db: AsyncSession, did: int, data) -> Designation:
    entity = await _get_by_id(db, Designation, did)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_designation(db: AsyncSession, did: int) -> Designation:
    return await _soft_delete(db, Designation, did)

# --- Group Company Service ---
async def list_group_companies(db: AsyncSession) -> List[GroupCompany]:
    return await _get_all(db, GroupCompany)

async def get_group_company(db: AsyncSession, gid: int) -> GroupCompany:
    return await _get_by_id(db, GroupCompany, gid)

async def create_group_company(db: AsyncSession, data) -> GroupCompany:
    stmt = select(GroupCompany).where(GroupCompany.company_name == data.company_name.strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="GROUP_COMPANY_EXISTS", message="Group company with this name already exists.")
    entity = GroupCompany(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_group_company(db: AsyncSession, gid: int, data) -> GroupCompany:
    entity = await _get_by_id(db, GroupCompany, gid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_group_company(db: AsyncSession, gid: int) -> GroupCompany:
    return await _soft_delete(db, GroupCompany, gid)

# --- Unit Service ---
async def list_units(db: AsyncSession) -> List[Unit]:
    return await _get_all(db, Unit)

async def get_unit(db: AsyncSession, uid: int) -> Unit:
    return await _get_by_id(db, Unit, uid)

async def create_unit(db: AsyncSession, data) -> Unit:
    stmt = select(Unit).where((Unit.name == data.name.strip()) | (Unit.code == data.code.strip()))
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="UNIT_EXISTS", message="Unit with this name or code already exists.")
    entity = Unit(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_unit(db: AsyncSession, uid: int, data) -> Unit:
    entity = await _get_by_id(db, Unit, uid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_unit(db: AsyncSession, uid: int) -> Unit:
    return await _soft_delete(db, Unit, uid)

# --- Method of Packing Service ---
async def list_packing_methods(db: AsyncSession) -> List[MethodOfPacking]:
    return await _get_all(db, MethodOfPacking)

async def get_packing_method(db: AsyncSession, mid: int) -> MethodOfPacking:
    return await _get_by_id(db, MethodOfPacking, mid)

async def create_packing_method(db: AsyncSession, data) -> MethodOfPacking:
    stmt = select(MethodOfPacking).where(MethodOfPacking.name == data.name.strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise AppException(status_code=409, error_code="PACKING_METHOD_EXISTS", message="Packing method with this name already exists.")
    entity = MethodOfPacking(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity

async def update_packing_method(db: AsyncSession, mid: int, data) -> MethodOfPacking:
    entity = await _get_by_id(db, MethodOfPacking, mid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entity, k, v)
    await db.commit()
    await db.refresh(entity)
    return entity

async def delete_packing_method(db: AsyncSession, mid: int) -> MethodOfPacking:
    return await _soft_delete(db, MethodOfPacking, mid)
