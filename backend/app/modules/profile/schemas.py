from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Branch Schemas
class BranchBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    city: str = Field("Headquarters", min_length=2, max_length=100)
    state: str = Field("Default State", min_length=2, max_length=100)
    address: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    gstin: Optional[str] = None
    is_head_office: bool = False
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def map_branch_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "branch_code" in data and "code" not in data:
                data["code"] = data["branch_code"]
            if "branch_name" in data and "name" not in data:
                data["name"] = data["branch_name"]
            if not data.get("city"):
                data["city"] = "Headquarters"
            if not data.get("state"):
                data["state"] = "Default State"
        return data

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    gstin: Optional[str] = None
    is_head_office: Optional[bool] = None
    is_active: Optional[bool] = None

class BranchResponse(BranchBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Company Setting Schemas
class CompanySettingUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    logo_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def map_company_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "bank_account_number" in data and "bank_account_no" not in data:
                data["bank_account_no"] = data["bank_account_number"]
        return data

class CompanySettingResponse(BaseModel):
    id: int
    company_name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Email Setting Schemas
class EmailSettingUpdate(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    sender_email: EmailStr
    sender_name: str = "PantherTMS Dispatch"
    use_tls: bool = True
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def map_email_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "from_email" in data and "sender_email" not in data:
                data["sender_email"] = data["from_email"]
            if "from_name" in data and "sender_name" not in data:
                data["sender_name"] = data["from_name"]
            if "smtp_username" in data and "smtp_user" not in data:
                data["smtp_user"] = data["smtp_username"]
        return data

class EmailSettingResponse(BaseModel):
    id: int
    smtp_host: str
    smtp_port: int
    smtp_user: Optional[str] = None
    sender_email: str
    sender_name: str
    use_tls: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Monthly P&L Schemas
class MonthlyPnLItem(BaseModel):
    month: str
    revenue: float
    expenses: float
    net_profit: float
    margin_percent: float

class MonthlyPnLResponse(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    margin_percent: float
    months: List[MonthlyPnLItem]
    branch_count: int
