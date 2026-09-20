from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db
from app.auth.dependencies import require_permission
from app.modules.misc import schemas, service

router = APIRouter(prefix="/misc", tags=["Misc Masters"])

# ------------------------------------------------------------------------------
# Primary Group Endpoints
# ------------------------------------------------------------------------------
@router.get("/primary-groups", response_model=List[schemas.PrimaryGroupResponse])
async def list_primary_groups(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "primary_group", "view")),
):
    items = await service.get_primary_groups(session)
    return [schemas.PrimaryGroupResponse.model_validate(i) for i in items]

@router.get("/primary-groups/{item_id}", response_model=schemas.PrimaryGroupResponse)
async def get_primary_group(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "primary_group", "view")),
):
    item = await service.get_primary_group_by_id(session, item_id)
    return schemas.PrimaryGroupResponse.model_validate(item)

@router.post("/primary-groups", response_model=schemas.PrimaryGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_primary_group(
    data: schemas.PrimaryGroupCreate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "primary_group", "create")),
):
    item = await service.create_primary_group(session, data)
    return schemas.PrimaryGroupResponse.model_validate(item)

@router.put("/primary-groups/{item_id}", response_model=schemas.PrimaryGroupResponse)
async def update_primary_group(
    item_id: int,
    data: schemas.PrimaryGroupUpdate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "primary_group", "edit")),
):
    item = await service.update_primary_group(session, item_id, data)
    return schemas.PrimaryGroupResponse.model_validate(item)

@router.delete("/primary-groups/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_primary_group(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "primary_group", "delete")),
):
    await service.delete_primary_group(session, item_id)


# ------------------------------------------------------------------------------
# Group In Primary Endpoints
# ------------------------------------------------------------------------------
@router.get("/groups-in-primary", response_model=List[schemas.GroupInPrimaryResponse])
async def list_groups_in_primary(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "group_in_primary", "view")),
):
    items = await service.get_groups_in_primary(session)
    result = []
    for i in items:
        resp = schemas.GroupInPrimaryResponse.model_validate(i)
        resp.primary_group_name = i.primary_group.name if i.primary_group else None
        result.append(resp)
    return result

@router.get("/groups-in-primary/{item_id}", response_model=schemas.GroupInPrimaryResponse)
async def get_group_in_primary(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "group_in_primary", "view")),
):
    item = await service.get_group_in_primary_by_id(session, item_id)
    resp = schemas.GroupInPrimaryResponse.model_validate(item)
    resp.primary_group_name = item.primary_group.name if item.primary_group else None
    return resp

@router.post("/groups-in-primary", response_model=schemas.GroupInPrimaryResponse, status_code=status.HTTP_201_CREATED)
async def create_group_in_primary(
    data: schemas.GroupInPrimaryCreate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "group_in_primary", "create")),
):
    item = await service.create_group_in_primary(session, data)
    resp = schemas.GroupInPrimaryResponse.model_validate(item)
    resp.primary_group_name = item.primary_group.name if item.primary_group else None
    return resp

@router.put("/groups-in-primary/{item_id}", response_model=schemas.GroupInPrimaryResponse)
async def update_group_in_primary(
    item_id: int,
    data: schemas.GroupInPrimaryUpdate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "group_in_primary", "edit")),
):
    item = await service.update_group_in_primary(session, item_id, data)
    resp = schemas.GroupInPrimaryResponse.model_validate(item)
    resp.primary_group_name = item.primary_group.name if item.primary_group else None
    return resp

@router.delete("/groups-in-primary/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_in_primary(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "group_in_primary", "delete")),
):
    await service.delete_group_in_primary(session, item_id)


# ------------------------------------------------------------------------------
# Subgroup In Group Endpoints
# ------------------------------------------------------------------------------
@router.get("/subgroups", response_model=List[schemas.SubgroupInGroupResponse])
async def list_subgroups(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "subgroup", "view")),
):
    items = await service.get_subgroups(session)
    result = []
    for i in items:
        resp = schemas.SubgroupInGroupResponse.model_validate(i)
        resp.group_name = i.group.name if i.group else None
        result.append(resp)
    return result

@router.get("/subgroups/{item_id}", response_model=schemas.SubgroupInGroupResponse)
async def get_subgroup(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "subgroup", "view")),
):
    item = await service.get_subgroup_by_id(session, item_id)
    resp = schemas.SubgroupInGroupResponse.model_validate(item)
    resp.group_name = item.group.name if item.group else None
    return resp

@router.post("/subgroups", response_model=schemas.SubgroupInGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_subgroup(
    data: schemas.SubgroupInGroupCreate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "subgroup", "create")),
):
    item = await service.create_subgroup(session, data)
    resp = schemas.SubgroupInGroupResponse.model_validate(item)
    resp.group_name = item.group.name if item.group else None
    return resp

@router.put("/subgroups/{item_id}", response_model=schemas.SubgroupInGroupResponse)
async def update_subgroup(
    item_id: int,
    data: schemas.SubgroupInGroupUpdate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "subgroup", "edit")),
):
    item = await service.update_subgroup(session, item_id, data)
    resp = schemas.SubgroupInGroupResponse.model_validate(item)
    resp.group_name = item.group.name if item.group else None
    return resp

@router.delete("/subgroups/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subgroup(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "subgroup", "delete")),
):
    await service.delete_subgroup(session, item_id)


# ------------------------------------------------------------------------------
# Account Endpoints
# ------------------------------------------------------------------------------
@router.get("/accounts", response_model=List[schemas.AccountResponse])
async def list_accounts(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "account", "view")),
):
    items = await service.get_accounts(session)
    result = []
    for i in items:
        resp = schemas.AccountResponse.model_validate(i)
        resp.group_name = i.group.name if i.group else None
        resp.subgroup_name = i.subgroup.name if i.subgroup else None
        result.append(resp)
    return result

@router.get("/accounts/{item_id}", response_model=schemas.AccountResponse)
async def get_account(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "account", "view")),
):
    item = await service.get_account_by_id(session, item_id)
    resp = schemas.AccountResponse.model_validate(item)
    resp.group_name = item.group.name if item.group else None
    resp.subgroup_name = item.subgroup.name if item.subgroup else None
    return resp

@router.post("/accounts", response_model=schemas.AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: schemas.AccountCreate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "account", "create")),
):
    item = await service.create_account(session, data)
    resp = schemas.AccountResponse.model_validate(item)
    resp.group_name = item.group.name if item.group else None
    resp.subgroup_name = item.subgroup.name if item.subgroup else None
    return resp

@router.put("/accounts/{item_id}", response_model=schemas.AccountResponse)
async def update_account(
    item_id: int,
    data: schemas.AccountUpdate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "account", "edit")),
):
    item = await service.update_account(session, item_id, data)
    resp = schemas.AccountResponse.model_validate(item)
    resp.group_name = item.group.name if item.group else None
    resp.subgroup_name = item.subgroup.name if item.subgroup else None
    return resp

@router.delete("/accounts/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "account", "delete")),
):
    await service.delete_account(session, item_id)


# ------------------------------------------------------------------------------
# Employee Master Endpoints
# ------------------------------------------------------------------------------
@router.get("/employees", response_model=List[schemas.EmployeeMasterResponse])
async def list_employees(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "employee_master", "view")),
):
    items = await service.get_employees(session)
    result = []
    for i in items:
        resp = schemas.EmployeeMasterResponse.model_validate(i)
        resp.designation_title = i.designation.title if i.designation else None
        result.append(resp)
    return result

@router.get("/employees/{item_id}", response_model=schemas.EmployeeMasterResponse)
async def get_employee(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "employee_master", "view")),
):
    item = await service.get_employee_by_id(session, item_id)
    resp = schemas.EmployeeMasterResponse.model_validate(item)
    resp.designation_title = item.designation.title if item.designation else None
    return resp

@router.post("/employees", response_model=schemas.EmployeeMasterResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: schemas.EmployeeMasterCreate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "employee_master", "create")),
):
    item = await service.create_employee(session, data)
    resp = schemas.EmployeeMasterResponse.model_validate(item)
    resp.designation_title = item.designation.title if item.designation else None
    return resp

@router.put("/employees/{item_id}", response_model=schemas.EmployeeMasterResponse)
async def update_employee(
    item_id: int,
    data: schemas.EmployeeMasterUpdate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "employee_master", "edit")),
):
    item = await service.update_employee(session, item_id, data)
    resp = schemas.EmployeeMasterResponse.model_validate(item)
    resp.designation_title = item.designation.title if item.designation else None
    return resp

@router.delete("/employees/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "employee_master", "delete")),
):
    await service.delete_employee(session, item_id)


# ------------------------------------------------------------------------------
# Charge Head Endpoints
# ------------------------------------------------------------------------------
@router.get("/charge-heads", response_model=List[schemas.ChargeHeadResponse])
async def list_charge_heads(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "charge_head", "view")),
):
    items = await service.get_charge_heads(session)
    result = []
    for i in items:
        resp = schemas.ChargeHeadResponse.model_validate(i)
        resp.tax_category_name = i.tax_category.name if i.tax_category else None
        result.append(resp)
    return result

@router.get("/charge-heads/{item_id}", response_model=schemas.ChargeHeadResponse)
async def get_charge_head(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "charge_head", "view")),
):
    item = await service.get_charge_head_by_id(session, item_id)
    resp = schemas.ChargeHeadResponse.model_validate(item)
    resp.tax_category_name = item.tax_category.name if item.tax_category else None
    return resp

@router.post("/charge-heads", response_model=schemas.ChargeHeadResponse, status_code=status.HTTP_201_CREATED)
async def create_charge_head(
    data: schemas.ChargeHeadCreate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "charge_head", "create")),
):
    item = await service.create_charge_head(session, data)
    resp = schemas.ChargeHeadResponse.model_validate(item)
    resp.tax_category_name = item.tax_category.name if item.tax_category else None
    return resp

@router.put("/charge-heads/{item_id}", response_model=schemas.ChargeHeadResponse)
async def update_charge_head(
    item_id: int,
    data: schemas.ChargeHeadUpdate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "charge_head", "edit")),
):
    item = await service.update_charge_head(session, item_id, data)
    resp = schemas.ChargeHeadResponse.model_validate(item)
    resp.tax_category_name = item.tax_category.name if item.tax_category else None
    return resp

@router.delete("/charge-heads/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_charge_head(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "charge_head", "delete")),
):
    await service.delete_charge_head(session, item_id)


# ------------------------------------------------------------------------------
# Tax Category Endpoints
# ------------------------------------------------------------------------------
@router.get("/tax-categories", response_model=List[schemas.TaxCategoryResponse])
async def list_tax_categories(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "tax_category", "view")),
):
    items = await service.get_tax_categories(session)
    return [schemas.TaxCategoryResponse.model_validate(i) for i in items]

@router.get("/tax-categories/{item_id}", response_model=schemas.TaxCategoryResponse)
async def get_tax_category(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "tax_category", "view")),
):
    item = await service.get_tax_category_by_id(session, item_id)
    return schemas.TaxCategoryResponse.model_validate(item)

@router.post("/tax-categories", response_model=schemas.TaxCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_category(
    data: schemas.TaxCategoryCreate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "tax_category", "create")),
):
    item = await service.create_tax_category(session, data)
    return schemas.TaxCategoryResponse.model_validate(item)

@router.put("/tax-categories/{item_id}", response_model=schemas.TaxCategoryResponse)
async def update_tax_category(
    item_id: int,
    data: schemas.TaxCategoryUpdate,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "tax_category", "edit")),
):
    item = await service.update_tax_category(session, item_id, data)
    return schemas.TaxCategoryResponse.model_validate(item)

@router.delete("/tax-categories/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tax_category(
    item_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("misc", "tax_category", "delete")),
):
    await service.delete_tax_category(session, item_id)
