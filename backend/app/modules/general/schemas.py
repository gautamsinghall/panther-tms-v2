from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

# --- Consignee ---
class ConsigneeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class ConsigneeCreate(ConsigneeBase):
    is_active: bool = True

class ConsigneeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = None

class ConsigneeResponse(ConsigneeBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Consigner ---
class ConsignerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class ConsignerCreate(ConsignerBase):
    is_active: bool = True

class ConsignerUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = None

class ConsignerResponse(ConsignerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Location ---
class LocationBase(BaseModel):
    country: str = "India"
    state: str
    city_name: str
    location_code: Optional[str] = None
    is_pickup_point: bool = True
    is_drop_point: bool = True
    address: Optional[str] = None
    pincode: Optional[str] = None

class LocationCreate(LocationBase):
    is_active: bool = True

class LocationUpdate(BaseModel):
    country: Optional[str] = None
    state: Optional[str] = None
    city_name: Optional[str] = None
    location_code: Optional[str] = None
    is_pickup_point: Optional[bool] = None
    is_drop_point: Optional[bool] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = None

class LocationResponse(LocationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Industry ---
class IndustryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: Optional[str] = None
    description: Optional[str] = None

class IndustryCreate(IndustryBase):
    is_active: bool = True

class IndustryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class IndustryResponse(IndustryBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Designation ---
class DesignationBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    department: Optional[str] = None
    description: Optional[str] = None

class DesignationCreate(DesignationBase):
    is_active: bool = True

class DesignationUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DesignationResponse(DesignationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Group Company ---
class GroupCompanyBase(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    legal_name: Optional[str] = None
    cin: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    registered_address: Optional[str] = None

class GroupCompanyCreate(GroupCompanyBase):
    is_active: bool = True

class GroupCompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    legal_name: Optional[str] = None
    cin: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    registered_address: Optional[str] = None
    is_active: Optional[bool] = None

class GroupCompanyResponse(GroupCompanyBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Unit ---
class UnitBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None

class UnitCreate(UnitBase):
    is_active: bool = True

class UnitUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class UnitResponse(UnitBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Method of Packing ---
class MethodOfPackingBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: Optional[str] = None
    description: Optional[str] = None

class MethodOfPackingCreate(MethodOfPackingBase):
    is_active: bool = True

class MethodOfPackingUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class MethodOfPackingResponse(MethodOfPackingBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
