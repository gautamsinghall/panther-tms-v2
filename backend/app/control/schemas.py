from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class EntitlementBase(BaseModel):
    feature_key: str
    limit_value: str = "true"
    is_enabled: bool = True

class EntitlementResponse(EntitlementBase):
    id: int
    plan_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PlanBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    price_monthly: float = 0.0
    price_yearly: float = 0.0
    is_active: bool = True

class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime
    entitlements: List[EntitlementResponse] = []

    model_config = ConfigDict(from_attributes=True)

class TenantProvisionRequest(BaseModel):
    subdomain: str = Field(..., min_length=2, max_length=63, pattern="^[a-z0-9-]+$")
    company_name: str = Field(..., min_length=2, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    admin_full_name: str = Field(default="Company Admin")
    plan_code: str = Field(default="PRO")

class TenantResponse(BaseModel):
    id: int
    subdomain: str
    company_name: str
    db_name: str
    status: str
    admin_email: str
    plan_id: int
    subscription_id: Optional[str] = None
    subscription_status: Optional[str] = "ACTIVE"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SignupInitiateRequest(BaseModel):
    subdomain: str = Field(..., min_length=2, max_length=63, pattern="^[a-z0-9-]+$")
    company_name: str = Field(..., min_length=2, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    admin_full_name: str = Field(default="Company Admin")
    plan_code: str = Field(default="FREE")
    billing_cycle: str = Field(default="monthly", pattern="^(monthly|yearly)$")


class SignupInitiateResponse(BaseModel):
    requires_payment: bool
    tenant: Optional[TenantResponse] = None
    subscription_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    plan_code: str
    amount: float
    subdomain: str
    redirect_url: Optional[str] = None
    message: str


class SignupCompleteRequest(BaseModel):
    subdomain: str = Field(..., min_length=2, max_length=63)
    subscription_id: str
    payment_id: str
    signature: str
