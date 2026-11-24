from datetime import datetime
from typing import List, Optional, Dict, Any
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

class FeatureSchema(BaseModel):
    id: str
    label: str

class ModuleSchema(BaseModel):
    id: str
    title: str
    features: List[FeatureSchema]

class AssignedOfficeInfo(BaseModel):
    office_id: int
    office_code: str
    office_name: str
    is_default: bool = False
    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    role_id: Optional[int] = None
    role: str = Field(default="EMPLOYEE")  # COMPANY_ADMIN or EMPLOYEE
    assigned_office_ids: Optional[List[int]] = None
    default_office_id: Optional[int] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    assigned_office_ids: Optional[List[int]] = None
    default_office_id: Optional[int] = None

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
    assigned_offices: List[AssignedOfficeInfo] = []
    default_office_id: Optional[int] = None

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
    issuing_office_id: Optional[int] = None
    document_type: str = Field(..., min_length=1, max_length=100)
    series_name: Optional[str] = None
    prefix: str = Field(..., min_length=1, max_length=50)
    suffix: Optional[str] = ""
    starting_number: int = 1
    current_number: int = 0
    end_number: Optional[int] = None
    financial_year: str = Field(default="2026-2027")
    series_mode: str = Field(default="AUTOMATIC", description="'AUTOMATIC' or 'MANUAL'")
    is_default: bool = False
    is_active: bool = True

class SeriesMasterCreate(SeriesMasterBase):
    pass

class SeriesMasterUpdate(BaseModel):
    category_id: Optional[int] = None
    issuing_office_id: Optional[int] = None
    document_type: Optional[str] = None
    series_name: Optional[str] = None
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    starting_number: Optional[int] = None
    current_number: Optional[int] = None
    end_number: Optional[int] = None
    financial_year: Optional[str] = None
    series_mode: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

class SeriesMasterResponse(SeriesMasterBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category_name: Optional[str] = None
    issuing_office_name: Optional[str] = None
    last_used_formatted: Optional[str] = None
    next_number: Optional[int] = 1
    next_number_formatted: Optional[str] = ""
    is_mandatory_manual: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)

class SeriesCheckResponse(BaseModel):
    configured: bool
    id: Optional[int] = None
    document_type: str
    display_name: Optional[str] = None
    series_name: Optional[str] = None
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    starting_number: Optional[int] = None
    current_number: Optional[int] = None
    end_number: Optional[int] = None
    last_used_formatted: Optional[str] = None
    next_number: Optional[int] = None
    next_number_formatted: Optional[str] = None
    financial_year: Optional[str] = None
    series_mode: Optional[str] = None
    is_default: bool = False
    is_mandatory_manual: bool = False
    is_active: bool = True
    message: Optional[str] = None
    series_options: List[Dict[str, Any]] = Field(default_factory=list)


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
    user_name: Optional[str] = None
    user_role: str
    action: str
    module: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_identifier: Optional[str] = None
    office_id: Optional[int] = None
    office_name: Optional[str] = None
    office_code: Optional[str] = None
    status: str = "SUCCESS"
    details: Optional[str] = None
    details_json: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ActivityStatsResponse(BaseModel):
    total_activities: int
    today_activities: int
    active_users: int
    critical_mutations: int
    active_offices: int


class ActivityOfficeOption(BaseModel):
    id: int
    code: str
    name: str
    city: str
    is_head_office: bool


class ActivityUserOption(BaseModel):
    email: str
    name: str


class ActivityFiltersResponse(BaseModel):
    users: List[ActivityUserOption]
    actions: List[str]
    modules: List[str]
    offices: List[ActivityOfficeOption]
    is_admin: bool


# --- Email Settings & Staff Notification Recipients ---
class EmailSettingUpdate(BaseModel):
    smtp_host: str = Field(..., min_length=3, max_length=255)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    sender_email: EmailStr
    sender_name: str = Field(default="PantherTMS Dispatch", max_length=100)
    use_tls: bool = True
    use_ssl: bool = False
    is_active: bool = True

    @classmethod
    def map_aliases(cls, data: Any) -> Any:
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
    smtp_username: Optional[str] = None
    sender_email: str
    from_email: Optional[str] = None
    sender_name: str
    from_name: Optional[str] = None
    use_tls: bool
    use_ssl: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, obj: Any) -> "EmailSettingResponse":
        return cls(
            id=obj.id,
            smtp_host=obj.smtp_host,
            smtp_port=obj.smtp_port,
            smtp_user=obj.smtp_user,
            smtp_username=obj.smtp_user,
            sender_email=obj.sender_email,
            from_email=obj.sender_email,
            sender_name=obj.sender_name,
            from_name=obj.sender_name,
            use_tls=bool(getattr(obj, "use_tls", True)),
            use_ssl=bool(getattr(obj, "use_ssl", False)),
            is_active=bool(obj.is_active),
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )


class EmailTestRequest(BaseModel):
    recipient_email: EmailStr
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    sender_email: Optional[EmailStr] = None
    sender_name: Optional[str] = None
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None


class EmailTestResponse(BaseModel):
    success: bool
    message: str


class StaffRecipientCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    department: Optional[str] = Field(default="Operations", max_length=100)
    designation: Optional[str] = Field(default=None, max_length=100)
    notification_types: List[str] = Field(default_factory=lambda: ["lr_booking", "invoicing", "pod_delivery"])
    is_active: bool = True


class StaffRecipientUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    notification_types: Optional[List[str]] = None
    is_active: Optional[bool] = None


class StaffRecipientResponse(BaseModel):
    id: int
    name: str
    email: str
    department: Optional[str] = None
    designation: Optional[str] = None
    notification_types: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)



