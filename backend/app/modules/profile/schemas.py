from datetime import datetime
from typing import Any, Dict, List, Optional
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
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    document_notes: Optional[str] = None
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
            if "bank_account_number" in data and "bank_account_no" not in data:
                data["bank_account_no"] = data["bank_account_number"]
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
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    document_notes: Optional[str] = None
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
    bank_branch: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    signature_url: Optional[str] = None
    signing_authority_name: Optional[str] = None
    signing_authority_designation: Optional[str] = None
    issuing_office: Optional[str] = None
    default_issuing_office_id: Optional[int] = None

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
    bank_branch: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    signature_url: Optional[str] = None
    signing_authority_name: Optional[str] = None
    signing_authority_designation: Optional[str] = None
    issuing_office: Optional[str] = None
    default_issuing_office_id: Optional[int] = None
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
    period: Optional[str] = None
    total_revenue: float
    total_expenses: float
    net_profit: float
    margin_percent: float
    profit_margin_pct: Optional[float] = None
    revenue_breakdown: dict[str, float] = Field(default_factory=dict)
    expense_breakdown: dict[str, float] = Field(default_factory=dict)
    branches_included: List[str] = Field(default_factory=list)
    months: List[MonthlyPnLItem] = Field(default_factory=list)
    branch_count: int = 1


# API Center & E-Way Bill Schemas
class ApiCenterSettingResponse(BaseModel):
    ewb_username: Optional[str] = None
    ewb_password: Optional[str] = None  # Retained as None to prevent credential leakage
    has_ewb_password: bool = False
    ewb_gstin: Optional[str] = None
    is_ewb_active: bool = True
    gsp_client_id_override: Optional[str] = None
    gsp_base_url_override: Optional[str] = None
    has_gsp_secret_override: bool = False
    platform_gsp_configured: bool = True
    platform_gsp_base_url: str = "https://gsp.adaequare.com"
    # Freight Tiger SIM Tracking Integration
    ft_base_url: Optional[str] = "https://api.freighttiger.com/api/tether"
    has_ft_auth_token: bool = False
    is_ft_active: bool = True


class ApiCenterSettingUpdate(BaseModel):
    ewb_username: Optional[str] = None
    ewb_password: Optional[str] = None
    ewb_gstin: Optional[str] = None
    is_ewb_active: Optional[bool] = True
    gsp_client_id_override: Optional[str] = None
    gsp_client_secret_override: Optional[str] = None
    gsp_base_url_override: Optional[str] = None
    ft_base_url: Optional[str] = None
    ft_auth_token: Optional[str] = None
    is_ft_active: Optional[bool] = None


class ApiCenterTestRequest(BaseModel):
    ewb_username: Optional[str] = None
    ewb_password: Optional[str] = None
    ewb_gstin: Optional[str] = None
    gsp_client_id: Optional[str] = None
    gsp_client_secret: Optional[str] = None
    gsp_base_url: Optional[str] = None


class ApiCenterTestResponse(BaseModel):
    success: bool
    message: str
    token_preview: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

