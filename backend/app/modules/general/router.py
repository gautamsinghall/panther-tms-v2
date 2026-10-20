from typing import List, Optional
import json
import os
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.auth.dependencies import require_permission, check_entitlement_limit, get_current_user, get_current_office
from app.control.models import Tenant
from app.tenant_db.models import User, Branch
from app.modules.general import schemas, service
from app.services.activity_logger import log_activity

router = APIRouter(prefix="/general", tags=["General (Master Data)"])

# ==============================================================================
# 0. Billing Client
# ==============================================================================
@router.get("/billing-clients", response_model=List[schemas.BillingClientResponse], summary="List all billing clients")
async def list_billing_clients(
    current_user: User = Depends(require_permission("general", "billing_client", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    target_office_id = current_office.id if current_office else None
    include_unassigned = True
    return await service.list_billing_clients(db, office_id=target_office_id, include_unassigned=include_unassigned)

@router.post("/billing-clients", response_model=schemas.BillingClientResponse, status_code=status.HTTP_201_CREATED, summary="Create a billing client")
async def create_billing_client(
    data: schemas.BillingClientCreate,
    current_user: User = Depends(require_permission("general", "billing_client", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_masters")
    office_id = current_office.id if current_office else None
    client = await service.create_billing_client(db, data, office_id=office_id)
    await log_activity(
        db=db,
        user=current_user,
        action="CLIENT_CREATED",
        module="general",
        entity_type="BillingClient",
        entity_id=str(client.id),
        entity_identifier=client.name,
        office_id=office_id,
        office_name=current_office.name if current_office else None,
        office_code=current_office.code if current_office else None,
        details_json={"name": client.name, "city": client.city, "gstin": client.gstin},
    )
    return client

@router.get("/billing-clients/{id}", response_model=schemas.BillingClientResponse, summary="Get billing client by ID")
async def get_billing_client(
    id: int,
    current_user: User = Depends(require_permission("general", "billing_client", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_billing_client(db, id)

@router.put("/billing-clients/{id}", response_model=schemas.BillingClientResponse, summary="Update billing client")
async def update_billing_client(
    id: int,
    data: schemas.BillingClientUpdate,
    current_user: User = Depends(require_permission("general", "billing_client", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    client = await service.update_billing_client(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="CLIENT_UPDATED",
        module="general",
        entity_type="BillingClient",
        entity_id=str(client.id),
        entity_identifier=client.name,
        details_json=data.model_dump(exclude_unset=True),
    )
    return client


@router.delete("/billing-clients/{id}", response_model=schemas.BillingClientResponse, summary="Deactivate billing client")
async def delete_billing_client(
    id: int,
    current_user: User = Depends(require_permission("general", "billing_client", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    client = await service.delete_billing_client(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="CLIENT_DEACTIVATED",
        module="general",
        entity_type="BillingClient",
        entity_id=str(id),
        entity_identifier=getattr(client, "name", str(id)),
        details=f"Deactivated billing client {getattr(client, 'name', id)}",
    )
    return client

# ==============================================================================
# 1. Consignee
# ==============================================================================
@router.get("/consignees", response_model=List[schemas.ConsigneeResponse], summary="List all consignees")
async def list_consignees(
    current_user: User = Depends(require_permission("general", "consignee", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    target_office_id = current_office.id if current_office else None
    include_unassigned = True
    return await service.list_consignees(db, office_id=target_office_id, include_unassigned=include_unassigned)

@router.post("/consignees", response_model=schemas.ConsigneeResponse, status_code=status.HTTP_201_CREATED, summary="Create a consignee")
async def create_consignee(
    data: schemas.ConsigneeCreate,
    current_user: User = Depends(require_permission("general", "consignee", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_masters")
    office_id = current_office.id if current_office else None
    consignee = await service.create_consignee(db, data, office_id=office_id)
    await log_activity(
        db=db,
        user=current_user,
        action="CONSIGNEE_CREATED",
        module="general",
        entity_type="Consignee",
        entity_id=str(consignee.id),
        entity_identifier=consignee.name,
        office_id=office_id,
        details_json=data.model_dump(exclude_unset=True),
    )
    return consignee

@router.get("/consignees/{id}", response_model=schemas.ConsigneeResponse, summary="Get consignee by ID")
async def get_consignee(
    id: int,
    current_user: User = Depends(require_permission("general", "consignee", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_consignee(db, id)

@router.put("/consignees/{id}", response_model=schemas.ConsigneeResponse, summary="Update consignee")
async def update_consignee(
    id: int,
    data: schemas.ConsigneeUpdate,
    current_user: User = Depends(require_permission("general", "consignee", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    consignee = await service.update_consignee(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="CONSIGNEE_UPDATED",
        module="general",
        entity_type="Consignee",
        entity_id=str(consignee.id),
        entity_identifier=consignee.name,
        details_json=data.model_dump(exclude_unset=True),
    )
    return consignee

@router.delete("/consignees/{id}", response_model=schemas.ConsigneeResponse, summary="Deactivate consignee")
async def delete_consignee(
    id: int,
    current_user: User = Depends(require_permission("general", "consignee", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    consignee = await service.delete_consignee(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="CONSIGNEE_DEACTIVATED",
        module="general",
        entity_type="Consignee",
        entity_id=str(id),
        entity_identifier=getattr(consignee, "name", str(id)),
        details=f"Deactivated consignee {getattr(consignee, 'name', id)}",
    )
    return consignee

# ==============================================================================
# 2. Consigner
# ==============================================================================
@router.get("/consigners", response_model=List[schemas.ConsignerResponse], summary="List all consigners")
async def list_consigners(
    current_user: User = Depends(require_permission("general", "consigner", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    target_office_id = current_office.id if current_office else None
    include_unassigned = True
    return await service.list_consigners(db, office_id=target_office_id, include_unassigned=include_unassigned)

@router.post("/consigners", response_model=schemas.ConsignerResponse, status_code=status.HTTP_201_CREATED, summary="Create a consigner")
async def create_consigner(
    data: schemas.ConsignerCreate,
    current_user: User = Depends(require_permission("general", "consigner", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_masters")
    office_id = current_office.id if current_office else None
    consigner = await service.create_consigner(db, data, office_id=office_id)
    await log_activity(
        db=db,
        user=current_user,
        action="CONSIGNER_CREATED",
        module="general",
        entity_type="Consigner",
        entity_id=str(consigner.id),
        entity_identifier=consigner.name,
        office_id=office_id,
        details_json=data.model_dump(exclude_unset=True),
    )
    return consigner

@router.get("/consigners/{id}", response_model=schemas.ConsignerResponse, summary="Get consigner by ID")
async def get_consigner(
    id: int,
    current_user: User = Depends(require_permission("general", "consigner", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_consigner(db, id)

@router.put("/consigners/{id}", response_model=schemas.ConsignerResponse, summary="Update consigner")
async def update_consigner(
    id: int,
    data: schemas.ConsignerUpdate,
    current_user: User = Depends(require_permission("general", "consigner", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    consigner = await service.update_consigner(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="CONSIGNER_UPDATED",
        module="general",
        entity_type="Consigner",
        entity_id=str(consigner.id),
        entity_identifier=consigner.name,
        details_json=data.model_dump(exclude_unset=True),
    )
    return consigner

@router.delete("/consigners/{id}", response_model=schemas.ConsignerResponse, summary="Deactivate consigner")
async def delete_consigner(
    id: int,
    current_user: User = Depends(require_permission("general", "consigner", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    consigner = await service.delete_consigner(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="CONSIGNER_DEACTIVATED",
        module="general",
        entity_type="Consigner",
        entity_id=str(id),
        entity_identifier=getattr(consigner, "name", str(id)),
        details=f"Deactivated consigner {getattr(consigner, 'name', id)}",
    )
    return consigner

# ==============================================================================
# 3. Location
# ==============================================================================
@router.get("/locations", response_model=List[schemas.LocationResponse], summary="List all locations")
async def list_locations(
    current_user: User = Depends(require_permission("general", "location", "view")),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: AsyncSession = Depends(get_tenant_db),
):
    target_office_id = current_office.id if current_office else None
    include_unassigned = True
    return await service.list_locations(db, office_id=target_office_id, include_unassigned=include_unassigned)

@router.post("/locations", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED, summary="Create a location")
async def create_location(
    data: schemas.LocationCreate,
    current_user: User = Depends(require_permission("general", "location", "create")),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_tenant_db),
):
    await check_entitlement_limit(tenant, db, "max_masters")
    office_id = current_office.id if current_office else None
    loc = await service.create_location(db, data, office_id=office_id)
    await log_activity(
        db=db,
        user=current_user,
        action="LOCATION_CREATED",
        module="general",
        entity_type="Location",
        entity_id=str(loc.id),
        entity_identifier=loc.city_name,
        office_id=office_id,
        details_json=data.model_dump(exclude_unset=True),
    )
    return loc

@router.get("/locations/{id}", response_model=schemas.LocationResponse, summary="Get location by ID")
async def get_location(
    id: int,
    current_user: User = Depends(require_permission("general", "location", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_location(db, id)

@router.put("/locations/{id}", response_model=schemas.LocationResponse, summary="Update location")
async def update_location(
    id: int,
    data: schemas.LocationUpdate,
    current_user: User = Depends(require_permission("general", "location", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    loc = await service.update_location(db, id, data)
    await log_activity(
        db=db,
        user=current_user,
        action="LOCATION_UPDATED",
        module="general",
        entity_type="Location",
        entity_id=str(loc.id),
        entity_identifier=loc.city_name,
        details_json=data.model_dump(exclude_unset=True),
    )
    return loc

@router.delete("/locations/{id}", response_model=schemas.LocationResponse, summary="Deactivate location")
async def delete_location(
    id: int,
    current_user: User = Depends(require_permission("general", "location", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    loc = await service.delete_location(db, id)
    await log_activity(
        db=db,
        user=current_user,
        action="LOCATION_DEACTIVATED",
        module="general",
        entity_type="Location",
        entity_id=str(id),
        entity_identifier=getattr(loc, "city_name", str(id)),
        details=f"Deactivated location {getattr(loc, 'city_name', id)}",
    )
    return loc

# ==============================================================================
# 4. Industry
# ==============================================================================
@router.get("/industries", response_model=List[schemas.IndustryResponse], summary="List all industries")
async def list_industries(
    current_user: User = Depends(require_permission("general", "industry", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_industries(db)

@router.post("/industries", response_model=schemas.IndustryResponse, status_code=status.HTTP_201_CREATED, summary="Create an industry")
async def create_industry(
    data: schemas.IndustryCreate,
    current_user: User = Depends(require_permission("general", "industry", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    ind = await service.create_industry(db, data)
    await log_activity(db=db, user=current_user, action="INDUSTRY_CREATED", module="general", entity_type="Industry", entity_id=str(ind.id), entity_identifier=ind.name)
    return ind

@router.put("/industries/{id}", response_model=schemas.IndustryResponse, summary="Update industry")
async def update_industry(
    id: int,
    data: schemas.IndustryUpdate,
    current_user: User = Depends(require_permission("general", "industry", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    ind = await service.update_industry(db, id, data)
    await log_activity(db=db, user=current_user, action="INDUSTRY_UPDATED", module="general", entity_type="Industry", entity_id=str(ind.id), entity_identifier=ind.name)
    return ind

@router.delete("/industries/{id}", response_model=schemas.IndustryResponse, summary="Deactivate industry")
async def delete_industry(
    id: int,
    current_user: User = Depends(require_permission("general", "industry", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    ind = await service.delete_industry(db, id)
    await log_activity(db=db, user=current_user, action="INDUSTRY_DEACTIVATED", module="general", entity_type="Industry", entity_id=str(id), entity_identifier=getattr(ind, "name", str(id)))
    return ind

# ==============================================================================
# 5. Designation
# ==============================================================================
@router.get("/designations", response_model=List[schemas.DesignationResponse], summary="List all designations")
async def list_designations(
    current_user: User = Depends(require_permission("general", "designation", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_designations(db)

@router.post("/designations", response_model=schemas.DesignationResponse, status_code=status.HTTP_201_CREATED, summary="Create a designation")
async def create_designation(
    data: schemas.DesignationCreate,
    current_user: User = Depends(require_permission("general", "designation", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    des = await service.create_designation(db, data)
    await log_activity(db=db, user=current_user, action="DESIGNATION_CREATED", module="general", entity_type="Designation", entity_id=str(des.id), entity_identifier=des.name)
    return des

@router.put("/designations/{id}", response_model=schemas.DesignationResponse, summary="Update designation")
async def update_designation(
    id: int,
    data: schemas.DesignationUpdate,
    current_user: User = Depends(require_permission("general", "designation", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    des = await service.update_designation(db, id, data)
    await log_activity(db=db, user=current_user, action="DESIGNATION_UPDATED", module="general", entity_type="Designation", entity_id=str(des.id), entity_identifier=des.name)
    return des

@router.delete("/designations/{id}", response_model=schemas.DesignationResponse, summary="Deactivate designation")
async def delete_designation(
    id: int,
    current_user: User = Depends(require_permission("general", "designation", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    des = await service.delete_designation(db, id)
    await log_activity(db=db, user=current_user, action="DESIGNATION_DEACTIVATED", module="general", entity_type="Designation", entity_id=str(id), entity_identifier=getattr(des, "name", str(id)))
    return des

# ==============================================================================
# 6. Group Company
# ==============================================================================
@router.get("/group-companies", response_model=List[schemas.GroupCompanyResponse], summary="List all group companies")
async def list_group_companies(
    current_user: User = Depends(require_permission("general", "group_company", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_group_companies(db)

@router.post("/group-companies", response_model=schemas.GroupCompanyResponse, status_code=status.HTTP_201_CREATED, summary="Create a group company")
async def create_group_company(
    data: schemas.GroupCompanyCreate,
    current_user: User = Depends(require_permission("general", "group_company", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    gc = await service.create_group_company(db, data)
    await log_activity(db=db, user=current_user, action="GROUP_COMPANY_CREATED", module="general", entity_type="GroupCompany", entity_id=str(gc.id), entity_identifier=gc.name)
    return gc

@router.put("/group-companies/{id}", response_model=schemas.GroupCompanyResponse, summary="Update group company")
async def update_group_company(
    id: int,
    data: schemas.GroupCompanyUpdate,
    current_user: User = Depends(require_permission("general", "group_company", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    gc = await service.update_group_company(db, id, data)
    await log_activity(db=db, user=current_user, action="GROUP_COMPANY_UPDATED", module="general", entity_type="GroupCompany", entity_id=str(gc.id), entity_identifier=gc.name)
    return gc

@router.delete("/group-companies/{id}", response_model=schemas.GroupCompanyResponse, summary="Deactivate group company")
async def delete_group_company(
    id: int,
    current_user: User = Depends(require_permission("general", "group_company", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    gc = await service.delete_group_company(db, id)
    await log_activity(db=db, user=current_user, action="GROUP_COMPANY_DEACTIVATED", module="general", entity_type="GroupCompany", entity_id=str(id), entity_identifier=getattr(gc, "name", str(id)))
    return gc

# ==============================================================================
# 7. Unit
# ==============================================================================
@router.get("/units", response_model=List[schemas.UnitResponse], summary="List all units")
async def list_units(
    current_user: User = Depends(require_permission("general", "unit", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_units(db)

@router.post("/units", response_model=schemas.UnitResponse, status_code=status.HTTP_201_CREATED, summary="Create a unit")
async def create_unit(
    data: schemas.UnitCreate,
    current_user: User = Depends(require_permission("general", "unit", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    u = await service.create_unit(db, data)
    await log_activity(db=db, user=current_user, action="UNIT_CREATED", module="general", entity_type="Unit", entity_id=str(u.id), entity_identifier=u.name)
    return u

@router.put("/units/{id}", response_model=schemas.UnitResponse, summary="Update unit")
async def update_unit(
    id: int,
    data: schemas.UnitUpdate,
    current_user: User = Depends(require_permission("general", "unit", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    u = await service.update_unit(db, id, data)
    await log_activity(db=db, user=current_user, action="UNIT_UPDATED", module="general", entity_type="Unit", entity_id=str(u.id), entity_identifier=u.name)
    return u

@router.delete("/units/{id}", response_model=schemas.UnitResponse, summary="Deactivate unit")
async def delete_unit(
    id: int,
    current_user: User = Depends(require_permission("general", "unit", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    u = await service.delete_unit(db, id)
    await log_activity(db=db, user=current_user, action="UNIT_DEACTIVATED", module="general", entity_type="Unit", entity_id=str(id), entity_identifier=getattr(u, "name", str(id)))
    return u

# ==============================================================================
# 8. Method of Packing
# ==============================================================================
@router.get("/packing-methods", response_model=List[schemas.MethodOfPackingResponse], summary="List all packing methods")
async def list_packing_methods(
    current_user: User = Depends(require_permission("general", "method_of_packing", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_packing_methods(db)

@router.post("/packing-methods", response_model=schemas.MethodOfPackingResponse, status_code=status.HTTP_201_CREATED, summary="Create a packing method")
async def create_packing_method(
    data: schemas.MethodOfPackingCreate,
    current_user: User = Depends(require_permission("general", "method_of_packing", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    pm = await service.create_packing_method(db, data)
    await log_activity(db=db, user=current_user, action="PACKING_METHOD_CREATED", module="general", entity_type="PackingMethod", entity_id=str(pm.id), entity_identifier=pm.name)
    return pm

@router.put("/packing-methods/{id}", response_model=schemas.MethodOfPackingResponse, summary="Update packing method")
async def update_packing_method(
    id: int,
    data: schemas.MethodOfPackingUpdate,
    current_user: User = Depends(require_permission("general", "method_of_packing", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    pm = await service.update_packing_method(db, id, data)
    await log_activity(db=db, user=current_user, action="PACKING_METHOD_UPDATED", module="general", entity_type="PackingMethod", entity_id=str(pm.id), entity_identifier=pm.name)
    return pm

@router.delete("/packing-methods/{id}", response_model=schemas.MethodOfPackingResponse, summary="Deactivate packing method")
async def delete_packing_method(
    id: int,
    current_user: User = Depends(require_permission("general", "method_of_packing", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    pm = await service.delete_packing_method(db, id)
    await log_activity(db=db, user=current_user, action="PACKING_METHOD_DEACTIVATED", module="general", entity_type="PackingMethod", entity_id=str(id), entity_identifier=getattr(pm, "name", str(id)))
    return pm

# ==============================================================================
# 9. Load Type
# ==============================================================================
@router.get("/load-types", response_model=List[schemas.LoadTypeResponse], summary="List all load types")
async def list_load_types(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_load_types(db)

@router.post("/load-types", response_model=schemas.LoadTypeResponse, status_code=status.HTTP_201_CREATED, summary="Create a load type")
async def create_load_type(
    data: schemas.LoadTypeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    lt = await service.create_load_type(db, data)
    await log_activity(db=db, user=current_user, action="LOAD_TYPE_CREATED", module="general", entity_type="LoadType", entity_id=str(lt.id), entity_identifier=lt.name)
    return lt

@router.get("/load-types/{id}", response_model=schemas.LoadTypeResponse, summary="Get load type by ID")
async def get_load_type(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.get_load_type(db, id)

@router.put("/load-types/{id}", response_model=schemas.LoadTypeResponse, summary="Update load type")
async def update_load_type(
    id: int,
    data: schemas.LoadTypeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    lt = await service.update_load_type(db, id, data)
    await log_activity(db=db, user=current_user, action="LOAD_TYPE_UPDATED", module="general", entity_type="LoadType", entity_id=str(lt.id), entity_identifier=lt.name)
    return lt

@router.delete("/load-types/{id}", response_model=schemas.LoadTypeResponse, summary="Deactivate load type")
async def delete_load_type(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    lt = await service.delete_load_type(db, id)
    await log_activity(db=db, user=current_user, action="LOAD_TYPE_DEACTIVATED", module="general", entity_type="LoadType", entity_id=str(id), entity_identifier=getattr(lt, "name", str(id)))
    return lt


# ==============================================================================
# 5. Pincode Lookup (India Postal Registry)
# ==============================================================================
_PINCODE_CACHE: Optional[dict] = None

def _get_pincodes_dict() -> dict:
    global _PINCODE_CACHE
    if _PINCODE_CACHE is None:
        pincodes_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "pincodes.json")
        if os.path.exists(pincodes_path):
            with open(pincodes_path, "r", encoding="utf-8") as f:
                _PINCODE_CACHE = json.load(f)
        else:
            _PINCODE_CACHE = {}
    return _PINCODE_CACHE

@router.get("/pincode/{pincode}", summary="Lookup City, State & Country by Indian PIN Code")
async def lookup_pincode(
    pincode: str,
    current_user: User = Depends(get_current_user),
):
    clean_pin = str(pincode).strip()
    cache = _get_pincodes_dict()
    if clean_pin in cache:
        city, state = cache[clean_pin]
        return {
            "pincode": clean_pin,
            "city": city,
            "state": state,
            "country": "India",
        }
    raise HTTPException(status_code=404, detail=f"PIN code '{clean_pin}' not found in postal registry.")

