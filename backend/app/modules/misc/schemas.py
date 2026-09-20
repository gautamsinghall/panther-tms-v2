from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------------------
# Primary Group
# ------------------------------------------------------------------------------
class PrimaryGroupBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    nature: str = Field(default="DEBIT", description="DEBIT or CREDIT")
    description: Optional[str] = None

class PrimaryGroupCreate(PrimaryGroupBase):
    pass

class PrimaryGroupUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    nature: Optional[str] = None
    description: Optional[str] = None

class PrimaryGroupResponse(PrimaryGroupBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Group In Primary
# ------------------------------------------------------------------------------
class GroupInPrimaryBase(BaseModel):
    primary_group_id: int
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None

class GroupInPrimaryCreate(GroupInPrimaryBase):
    pass

class GroupInPrimaryUpdate(BaseModel):
    primary_group_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None

class GroupInPrimaryResponse(GroupInPrimaryBase):
    id: int
    primary_group_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Subgroup In Group
# ------------------------------------------------------------------------------
class SubgroupInGroupBase(BaseModel):
    group_id: int
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None

class SubgroupInGroupCreate(SubgroupInGroupBase):
    pass

class SubgroupInGroupUpdate(BaseModel):
    group_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None

class SubgroupInGroupResponse(SubgroupInGroupBase):
    id: int
    group_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Account
# ------------------------------------------------------------------------------
class AccountBase(BaseModel):
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=50)
    group_id: int
    subgroup_id: Optional[int] = None
    opening_balance: Decimal = Field(default=Decimal("0.00"))
    opening_balance_type: str = Field(default="DR", description="DR or CR")
    consignee_id: Optional[int] = None
    consigner_id: Optional[int] = None
    vehicle_owner_id: Optional[int] = None
    is_active: bool = True

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    group_id: Optional[int] = None
    subgroup_id: Optional[int] = None
    opening_balance: Optional[Decimal] = None
    opening_balance_type: Optional[str] = None
    consignee_id: Optional[int] = None
    consigner_id: Optional[int] = None
    vehicle_owner_id: Optional[int] = None
    is_active: Optional[bool] = None

class AccountResponse(AccountBase):
    id: int
    group_name: Optional[str] = None
    subgroup_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Employee Master
# ------------------------------------------------------------------------------
class EmployeeMasterBase(BaseModel):
    name: str = Field(..., max_length=150)
    employee_code: str = Field(..., max_length=50)
    designation_id: Optional[int] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    date_of_joining: Optional[date] = None
    salary: Decimal = Field(default=Decimal("0.00"))
    is_active: bool = True

class EmployeeMasterCreate(EmployeeMasterBase):
    pass

class EmployeeMasterUpdate(BaseModel):
    name: Optional[str] = None
    employee_code: Optional[str] = None
    designation_id: Optional[int] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    date_of_joining: Optional[date] = None
    salary: Optional[Decimal] = None
    is_active: Optional[bool] = None

class EmployeeMasterResponse(EmployeeMasterBase):
    id: int
    designation_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Charge Head
# ------------------------------------------------------------------------------
class ChargeHeadBase(BaseModel):
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=50)
    charge_type: str = Field(default="ADDITION", description="ADDITION or DEDUCTION")
    default_rate: Decimal = Field(default=Decimal("0.00"))
    tax_category_id: Optional[int] = None
    is_active: bool = True

class ChargeHeadCreate(ChargeHeadBase):
    pass

class ChargeHeadUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    charge_type: Optional[str] = None
    default_rate: Optional[Decimal] = None
    tax_category_id: Optional[int] = None
    is_active: Optional[bool] = None

class ChargeHeadResponse(ChargeHeadBase):
    id: int
    tax_category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Tax Category
# ------------------------------------------------------------------------------
class TaxCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    igst_rate: Decimal = Field(default=Decimal("0.00"))
    cgst_rate: Decimal = Field(default=Decimal("0.00"))
    sgst_rate: Decimal = Field(default=Decimal("0.00"))
    is_rcm: bool = False
    is_active: bool = True

class TaxCategoryCreate(TaxCategoryBase):
    pass

class TaxCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    igst_rate: Optional[Decimal] = None
    cgst_rate: Optional[Decimal] = None
    sgst_rate: Optional[Decimal] = None
    is_rcm: Optional[bool] = None
    is_active: Optional[bool] = None

class TaxCategoryResponse(TaxCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
