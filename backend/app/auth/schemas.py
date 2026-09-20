from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    subdomain: str
    tenant_name: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TenantContextResponse(BaseModel):
    subdomain: str
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

    model_config = ConfigDict(from_attributes=True)
