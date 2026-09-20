from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class VoucherItemBase(BaseModel):
    charge_head_id: Optional[int] = None
    description: str = Field(..., max_length=255)
    quantity: Decimal = Field(default=Decimal("1.00"))
    rate: Decimal = Field(default=Decimal("0.00"))
    tax_category_id: Optional[int] = None
    tax_amount: Decimal = Field(default=Decimal("0.00"))
    total_amount: Decimal = Field(default=Decimal("0.00"))

class VoucherItemCreate(VoucherItemBase):
    pass

class VoucherItemResponse(VoucherItemBase):
    id: int
    charge_head_name: Optional[str] = None
    tax_category_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LedgerEntryResponse(BaseModel):
    id: int
    voucher_id: int
    account_id: int
    account_name: Optional[str] = None
    entry_date: date
    debit_amount: Decimal
    credit_amount: Decimal
    narration: Optional[str] = None
    is_reversal: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VoucherBase(BaseModel):
    voucher_type: str = Field(..., description="VoucherType enum value")
    voucher_date: date = Field(default_factory=date.today)
    party_name: Optional[str] = None
    party_type: Optional[str] = None
    reference_number: Optional[str] = None
    reference_date: Optional[date] = None
    total_amount: Decimal = Field(default=Decimal("0.00"))
    tax_amount: Decimal = Field(default=Decimal("0.00"))
    net_amount: Decimal = Field(default=Decimal("0.00"))
    narration: Optional[str] = None
    account_id: Optional[int] = None  # Primary party account or debit account
    lr_id: Optional[int] = None
    hire_challan_id: Optional[int] = None

class VoucherCreate(VoucherBase):
    credit_account_id: Optional[int] = None  # For receipt, payment, contra, general voucher
    items: List[VoucherItemCreate] = []

class TransportInvoiceCreate(BaseModel):
    lr_id: int
    voucher_date: Optional[date] = None
    tax_category_id: Optional[int] = None
    party_account_id: Optional[int] = None
    additional_charges: List[VoucherItemCreate] = []
    narration: Optional[str] = None

class ATHPaymentCreate(BaseModel):
    hire_challan_id: int
    amount: Decimal = Field(gt=Decimal("0.00"))
    payment_mode: str = Field(default="BANK", description="CASH or BANK")
    bank_account_id: Optional[int] = None
    voucher_date: Optional[date] = None
    narration: Optional[str] = None

class BTHPaymentCreate(BaseModel):
    hire_challan_id: int
    amount: Decimal = Field(gt=Decimal("0.00"))
    payment_mode: str = Field(default="BANK", description="CASH or BANK")
    bank_account_id: Optional[int] = None
    voucher_date: Optional[date] = None
    narration: Optional[str] = None

class VoidVoucherRequest(BaseModel):
    void_reason: str = Field(..., min_length=3, description="Audit reason for reversing this voucher")

class VoucherResponse(VoucherBase):
    id: int
    voucher_number: str
    is_void: bool
    void_reason: Optional[str] = None
    voided_at: Optional[datetime] = None
    voided_by: Optional[int] = None
    lr_number: Optional[str] = None
    hire_challan_number: Optional[str] = None
    account_name: Optional[str] = None
    irn: Optional[str] = None
    irn_status: Optional[str] = None
    items: List[VoucherItemResponse] = []
    ledger_entries: List[LedgerEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
