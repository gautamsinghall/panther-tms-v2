from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr

class LoginRequest(BaseModel):
    company_code: Optional[str] = None
    email: EmailStr
    password: str

class OfficeSummary(BaseModel):
    id: int
    code: str
    name: str
    city: str
    state: str
    gstin: Optional[str] = None
    is_head_office: bool = False
    is_default: bool = False

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    tenant_id: str
    company_code: str
    tenant_name: str
    assigned_offices: List[OfficeSummary] = []
    active_office: Optional[OfficeSummary] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TenantContextResponse(BaseModel):
    tenant_id: str
    company_code: str
    company_name: str
    status: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    tenant: TenantContextResponse
    assigned_offices: List[OfficeSummary] = []
    active_office: Optional[OfficeSummary] = None

    model_config = ConfigDict(from_attributes=True)

