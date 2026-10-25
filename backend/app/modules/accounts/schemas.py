from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Union
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
    voucher_number: Optional[str] = None
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
    issuing_office_id: Optional[int] = None
    series_id: Optional[int] = None
    billing_client_id: Optional[int] = None
    vendor_id: Optional[int] = None
    driver_id: Optional[int] = None

class VoucherCreate(VoucherBase):
    credit_account_id: Optional[int] = None  # For receipt, payment, contra, general voucher
    items: List[VoucherItemCreate] = []

class TransportInvoiceCreate(BaseModel):
    lr_id: int
    invoice_number: Optional[str] = None
    voucher_number: Optional[str] = None
    voucher_date: Optional[date] = None
    tax_category_id: Optional[int] = None
    party_account_id: Optional[int] = None
    billing_client_id: Optional[int] = None
    series_id: Optional[int] = None
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
    issuing_office_name: Optional[str] = None
    billing_client_name: Optional[str] = None
    vendor_name: Optional[str] = None
    driver_name: Optional[str] = None
    irn: Optional[str] = None
    irn_status: Optional[str] = None
    items: List[VoucherItemResponse] = []
    ledger_entries: List[LedgerEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Master Ledger Schemas (Accounts -> Master Ledger)
# ==============================================================================

class CategoryOverviewStat(BaseModel):
    total_accounts: int = 0
    total_outstanding: Decimal = Decimal("0.00")
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    settled_count: int = 0
    pending_count: int = 0

class MasterLedgerOverviewResponse(BaseModel):
    billing_clients: CategoryOverviewStat
    vendors: CategoryOverviewStat
    drivers: CategoryOverviewStat

class BillingClientLedgerListItem(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    opening_balance: Decimal = Decimal("0.00")
    opening_balance_type: str = "DR"
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")
    balance_type: str = "DR"  # DR (Receivable), CR (Advance), NIL
    last_transaction_date: Optional[date] = None
    transaction_count: int = 0
    issuing_office_id: Optional[int] = None
    issuing_office_name: Optional[str] = None

class VendorLedgerListItem(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    opening_balance: Decimal = Decimal("0.00")
    opening_balance_type: str = "CR"
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    outstanding_payable: Decimal = Decimal("0.00")
    balance_type: str = "CR"  # CR (Payable), DR (Advance Paid), NIL
    last_transaction_date: Optional[date] = None
    transaction_count: int = 0
    issuing_office_id: Optional[int] = None
    issuing_office_name: Optional[str] = None

class DriverLedgerListItem(BaseModel):
    id: int
    name: str
    driver_id: Optional[str] = None
    phone: str
    license_number: Optional[str] = None
    dl_status: Optional[str] = None
    opening_balance: Decimal = Decimal("0.00")
    opening_balance_type: str = "DR"
    total_advances: Decimal = Decimal("0.00")   # Debits
    total_expenses: Decimal = Decimal("0.00")   # Credits / Settlements
    current_balance: Decimal = Decimal("0.00")  # Net
    balance_type: str = "DR"  # DR (Recoverable), CR (Payable to driver), NIL
    last_transaction_date: Optional[date] = None
    transaction_count: int = 0

class LedgerTransaction(BaseModel):
    id: Union[int, str]
    entry_date: date
    voucher_id: Optional[int] = None
    voucher_number: str
    voucher_type: str
    reference_number: Optional[str] = None
    particulars: str
    debit_amount: Decimal = Decimal("0.00")
    credit_amount: Decimal = Decimal("0.00")
    running_balance: Decimal = Decimal("0.00")
    balance_type: str = "DR"  # DR or CR
    status: str = "POSTED"
    is_void: bool = False
    is_reversal: bool = False
    source_type: Optional[str] = None  # VOUCHER, LR, HIRE_CHALLAN, TRIP_ADVANCE, TRIP_EXPENSE
    source_id: Optional[int] = None

class PartyDetails(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    license_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    credit_period_days: Optional[int] = None
    credit_limit: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    issuing_office_name: Optional[str] = None

class DetailedLedgerResponse(BaseModel):
    category: str  # BILLING_CLIENT, VENDOR, DRIVER
    party: PartyDetails
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    opening_balance: Decimal = Decimal("0.00")
    opening_balance_type: str = "DR"
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    closing_balance: Decimal = Decimal("0.00")
    closing_balance_type: str = "DR"
    total_transactions: int = 0
    transactions: List[LedgerTransaction] = []

