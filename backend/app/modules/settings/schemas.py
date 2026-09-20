from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class PermissionItem(BaseModel):
    module: str
    feature: str
    permission: str  # view, create, edit, delete, approve
    is_allowed: bool = True

class RoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permissions: List[PermissionItem] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[PermissionItem]] = None

class RoleResponse(RoleBase):
    id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionItem] = []

    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    role_id: Optional[int] = None
    role: str = Field(default="EMPLOYEE")  # COMPANY_ADMIN or EMPLOYEE

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserListItem(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Series Categories ---
class SeriesCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    is_active: bool = True

class SeriesCategoryCreate(SeriesCategoryBase):
    pass

class SeriesCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SeriesCategoryResponse(SeriesCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Series Masters ---
class SeriesMasterBase(BaseModel):
    category_id: Optional[int] = None
    document_type: str = Field(..., min_length=1, max_length=100)
    prefix: str = Field(..., min_length=1, max_length=50)
    suffix: Optional[str] = ""
    starting_number: int = 1
    current_number: int = 1
    end_number: Optional[int] = None
    financial_year: str = Field(default="2026-2027")
    is_active: bool = True

class SeriesMasterCreate(SeriesMasterBase):
    pass

class SeriesMasterUpdate(BaseModel):
    category_id: Optional[int] = None
    document_type: Optional[str] = None
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    starting_number: Optional[int] = None
    current_number: Optional[int] = None
    end_number: Optional[int] = None
    financial_year: Optional[str] = None
    is_active: Optional[bool] = None

class SeriesMasterResponse(SeriesMasterBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# --- Admin Settings ---
class AdminSettingItem(BaseModel):
    setting_key: str
    setting_value: str
    category: str = "SYSTEM"
    description: Optional[str] = None

class AdminSettingsBulkUpdate(BaseModel):
    settings: List[AdminSettingItem]

class AdminSettingResponse(AdminSettingItem):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- User Activity (Audit Log) ---
class UserActivityResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: str
    user_role: str
    action: str
    module: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

