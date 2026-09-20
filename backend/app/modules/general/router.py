from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db
from app.auth.dependencies import require_permission
from app.tenant_db.models import User
from app.modules.general import schemas, service

router = APIRouter(prefix="/general", tags=["General (Master Data)"])

# ==============================================================================
# 1. Consignee
# ==============================================================================
@router.get("/consignees", response_model=List[schemas.ConsigneeResponse], summary="List all consignees")
async def list_consignees(
    current_user: User = Depends(require_permission("general", "consignee", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_consignees(db)

@router.post("/consignees", response_model=schemas.ConsigneeResponse, status_code=status.HTTP_201_CREATED, summary="Create a consignee")
async def create_consignee(
    data: schemas.ConsigneeCreate,
    current_user: User = Depends(require_permission("general", "consignee", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.create_consignee(db, data)

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
    return await service.update_consignee(db, id, data)

@router.delete("/consignees/{id}", response_model=schemas.ConsigneeResponse, summary="Deactivate consignee")
async def delete_consignee(
    id: int,
    current_user: User = Depends(require_permission("general", "consignee", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_consignee(db, id)

# ==============================================================================
# 2. Consigner
# ==============================================================================
@router.get("/consigners", response_model=List[schemas.ConsignerResponse], summary="List all consigners")
async def list_consigners(
    current_user: User = Depends(require_permission("general", "consigner", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_consigners(db)

@router.post("/consigners", response_model=schemas.ConsignerResponse, status_code=status.HTTP_201_CREATED, summary="Create a consigner")
async def create_consigner(
    data: schemas.ConsignerCreate,
    current_user: User = Depends(require_permission("general", "consigner", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.create_consigner(db, data)

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
    return await service.update_consigner(db, id, data)

@router.delete("/consigners/{id}", response_model=schemas.ConsignerResponse, summary="Deactivate consigner")
async def delete_consigner(
    id: int,
    current_user: User = Depends(require_permission("general", "consigner", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_consigner(db, id)

# ==============================================================================
# 3. Location
# ==============================================================================
@router.get("/locations", response_model=List[schemas.LocationResponse], summary="List all locations")
async def list_locations(
    current_user: User = Depends(require_permission("general", "location", "view")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.list_locations(db)

@router.post("/locations", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED, summary="Create a location")
async def create_location(
    data: schemas.LocationCreate,
    current_user: User = Depends(require_permission("general", "location", "create")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.create_location(db, data)

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
    return await service.update_location(db, id, data)

@router.delete("/locations/{id}", response_model=schemas.LocationResponse, summary="Deactivate location")
async def delete_location(
    id: int,
    current_user: User = Depends(require_permission("general", "location", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_location(db, id)

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
    return await service.create_industry(db, data)

@router.put("/industries/{id}", response_model=schemas.IndustryResponse, summary="Update industry")
async def update_industry(
    id: int,
    data: schemas.IndustryUpdate,
    current_user: User = Depends(require_permission("general", "industry", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_industry(db, id, data)

@router.delete("/industries/{id}", response_model=schemas.IndustryResponse, summary="Deactivate industry")
async def delete_industry(
    id: int,
    current_user: User = Depends(require_permission("general", "industry", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_industry(db, id)

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
    return await service.create_designation(db, data)

@router.put("/designations/{id}", response_model=schemas.DesignationResponse, summary="Update designation")
async def update_designation(
    id: int,
    data: schemas.DesignationUpdate,
    current_user: User = Depends(require_permission("general", "designation", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_designation(db, id, data)

@router.delete("/designations/{id}", response_model=schemas.DesignationResponse, summary="Deactivate designation")
async def delete_designation(
    id: int,
    current_user: User = Depends(require_permission("general", "designation", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_designation(db, id)

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
    return await service.create_group_company(db, data)

@router.put("/group-companies/{id}", response_model=schemas.GroupCompanyResponse, summary="Update group company")
async def update_group_company(
    id: int,
    data: schemas.GroupCompanyUpdate,
    current_user: User = Depends(require_permission("general", "group_company", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_group_company(db, id, data)

@router.delete("/group-companies/{id}", response_model=schemas.GroupCompanyResponse, summary="Deactivate group company")
async def delete_group_company(
    id: int,
    current_user: User = Depends(require_permission("general", "group_company", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_group_company(db, id)

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
    return await service.create_unit(db, data)

@router.put("/units/{id}", response_model=schemas.UnitResponse, summary="Update unit")
async def update_unit(
    id: int,
    data: schemas.UnitUpdate,
    current_user: User = Depends(require_permission("general", "unit", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_unit(db, id, data)

@router.delete("/units/{id}", response_model=schemas.UnitResponse, summary="Deactivate unit")
async def delete_unit(
    id: int,
    current_user: User = Depends(require_permission("general", "unit", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_unit(db, id)

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
    return await service.create_packing_method(db, data)

@router.put("/packing-methods/{id}", response_model=schemas.MethodOfPackingResponse, summary="Update packing method")
async def update_packing_method(
    id: int,
    data: schemas.MethodOfPackingUpdate,
    current_user: User = Depends(require_permission("general", "method_of_packing", "edit")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.update_packing_method(db, id, data)

@router.delete("/packing-methods/{id}", response_model=schemas.MethodOfPackingResponse, summary="Deactivate packing method")
async def delete_packing_method(
    id: int,
    current_user: User = Depends(require_permission("general", "method_of_packing", "delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    return await service.delete_packing_method(db, id)
