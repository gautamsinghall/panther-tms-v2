from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Union, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class VoucherItemBase(BaseModel):
    charge_head_id: Optional[int] = None
    description: str = Field(..., max_length=255)
    hsn_sac: Optional[str] = Field(default=None, max_length=20)
    quantity: Decimal = Field(default=Decimal("1.00"))
    rate: Decimal = Field(default=Decimal("0.00"))
    discount_amount: Decimal = Field(default=Decimal("0.00"))
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


class BillAllocationResponse(BaseModel):
    id: int
    voucher_id: int
    invoice_id: int
    allocated_amount: Decimal
    tds_amount: Decimal
    discount_amount: Decimal
    total_settled: Decimal
    adjustment_type: str
    notes: Optional[str] = None
    created_at: datetime
    voucher_number: Optional[str] = None
    invoice_number: Optional[str] = None

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

    # Tally-style bill-wise & tax tracking
    due_date: Optional[date] = None
    credit_period_days: Optional[int] = 30
    paid_amount: Decimal = Field(default=Decimal("0.00"))
    balance_amount: Decimal = Field(default=Decimal("0.00"))
    payment_status: str = Field(default="UNPAID")
    gst_treatment: str = Field(default="FCM")
    place_of_supply: Optional[str] = None
    party_gstin: Optional[str] = None
    cost_center: Optional[str] = None
    tax_breakup: Optional[Dict[str, Any]] = None
    against_voucher_id: Optional[int] = None
    note_category: Optional[str] = None
    reason_code: Optional[str] = None
    attachment_url: Optional[str] = None
    itc_eligibility: Optional[str] = "ELIGIBLE"  # ELIGIBLE, INELIGIBLE, BLOCKED

class VoucherCreate(VoucherBase):
    credit_account_id: Optional[int] = None  # For receipt, payment, contra, general voucher
    items: List[VoucherItemCreate] = []

class GeneralInvoiceItemCreate(BaseModel):
    charge_head_id: Optional[int] = None
    description: str = Field(..., max_length=255)
    hsn_sac: Optional[str] = Field(default="9967", max_length=20)
    quantity: Decimal = Field(default=Decimal("1.00"), gt=Decimal("0.00"))
    rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    tax_category_id: Optional[int] = None
    tax_amount: Decimal = Field(default=Decimal("0.00"))
    total_amount: Decimal = Field(default=Decimal("0.00"))

class GeneralInvoiceCreate(BaseModel):
    invoice_number: Optional[str] = None
    voucher_number: Optional[str] = None
    voucher_date: Optional[date] = None
    due_date: Optional[date] = None
    credit_period_days: Optional[int] = 30
    billing_client_id: Optional[int] = None
    party_name: Optional[str] = None
    party_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    gst_treatment: Optional[str] = "FCM"  # FCM, RCM, EXEMPT, NIL_RATED
    income_account_id: Optional[int] = None
    party_account_id: Optional[int] = None
    cost_center: Optional[str] = None
    reference_number: Optional[str] = None
    reference_date: Optional[date] = None
    series_id: Optional[int] = None
    items: List[GeneralInvoiceItemCreate] = []
    narration: Optional[str] = None

class PurchaseBillItemCreate(BaseModel):
    charge_head_id: Optional[int] = None
    description: str = Field(..., max_length=255)
    hsn_sac: Optional[str] = Field(default="9967", max_length=20)
    quantity: Decimal = Field(default=Decimal("1.00"), gt=Decimal("0.00"))
    rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    tax_category_id: Optional[int] = None
    tax_amount: Decimal = Field(default=Decimal("0.00"))
    total_amount: Decimal = Field(default=Decimal("0.00"))

class PurchaseBillCreate(BaseModel):
    vendor_id: Optional[int] = None
    party_name: Optional[str] = None
    party_gstin: Optional[str] = None
    vendor_state: Optional[str] = None
    purchase_type: Optional[str] = "NORMAL_PURCHASE"  # NORMAL_PURCHASE, GENERAL_PURCHASE
    purchase_category: Optional[str] = "SPARES"  # FUEL, TYRES, SPARES, MAINTENANCE, TOLL, TRUCK_HIRE, OFFICE_ADMIN, EQUIPMENT, OTHER
    voucher_number: Optional[str] = None
    voucher_date: Optional[date] = None
    due_date: Optional[date] = None
    credit_period_days: Optional[int] = 30
    bill_number: Optional[str] = None  # Supplier invoice reference
    bill_date: Optional[date] = None
    expense_account_id: Optional[int] = None
    party_account_id: Optional[int] = None
    gst_treatment: Optional[str] = "FCM"  # FCM, RCM, EXEMPT, NIL_RATED
    itc_eligibility: Optional[str] = "ELIGIBLE"  # ELIGIBLE, INELIGIBLE, BLOCKED
    place_of_supply: Optional[str] = None
    hire_challan_id: Optional[int] = None
    vehicle_number: Optional[str] = None
    cost_center: Optional[str] = None
    attachment_url: Optional[str] = None
    items: List[PurchaseBillItemCreate] = []
    narration: Optional[str] = None

class PurchasePaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    payment_date: Optional[date] = None
    payment_mode: str = Field(default="BANK")  # BANK or CASH
    bank_account_id: Optional[int] = None
    bank_account_code: Optional[str] = "ACC_HDFC_BANK"
    reference_number: Optional[str] = None
    tds_section: Optional[str] = None  # 194C, 194J, 194Q
    tds_rate: Optional[Decimal] = Decimal("0.00")
    tds_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    narration: Optional[str] = None

class TransportInvoiceCreate(BaseModel):
    lr_id: int
    invoice_number: Optional[str] = None
    voucher_number: Optional[str] = None
    voucher_date: Optional[date] = None
    due_date: Optional[date] = None
    credit_period_days: Optional[int] = None
    tax_category_id: Optional[int] = None
    gst_treatment: Optional[str] = "FCM"  # FCM, RCM, EXEMPT, NIL_RATED
    place_of_supply: Optional[str] = None
    party_account_id: Optional[int] = None
    billing_client_id: Optional[int] = None
    series_id: Optional[int] = None
    basic_freight: Optional[Decimal] = None
    loading_charges: Optional[Decimal] = None
    unloading_charges: Optional[Decimal] = None
    detention_charges: Optional[Decimal] = None
    toll_charges: Optional[Decimal] = None
    other_charges: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    advance_adjusted: Optional[Decimal] = None
    additional_charges: List[VoucherItemCreate] = []
    narration: Optional[str] = None

class ReceiptAllocationItem(BaseModel):
    invoice_id: int
    allocated_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Net cash/bank applied to this bill")
    tds_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="TDS deducted on this bill")
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Cash discount / deduction allowed on this bill")
    total_settled: Optional[Decimal] = None
    invoice_number: Optional[str] = None


class ReceiptVoucherCreate(BaseModel):
    billing_client_id: Optional[int] = None
    party_name: Optional[str] = None
    party_account_id: Optional[int] = None
    voucher_date: Optional[date] = None
    receipt_type: str = Field(default="AGAINST_REF", description="AGAINST_REF, ADVANCE, or ON_ACCOUNT")
    payment_mode: str = Field(default="BANK", description="BANK, CASH, CHEQUE, UPI, NEFT, RTGS, IMPS")
    bank_account_id: Optional[int] = None
    bank_account_code: Optional[str] = None
    reference_number: Optional[str] = None  # UTR / Txn Ref / Cheque No
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    cheque_bank: Optional[str] = None
    clearance_status: Optional[str] = "CLEARED"  # CLEARED, PENDING, BOUNCED
    amount: Decimal = Field(gt=Decimal("0.00"), description="Total net payment received into bank/cash")
    tds_section: Optional[str] = "194C"  # 194C (1% / 2%), 194J (2% / 10%), NONE
    tds_rate: Optional[Decimal] = Decimal("0.00")
    tds_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    allocations: List[ReceiptAllocationItem] = []
    unapplied_advance_amount: Optional[Decimal] = Decimal("0.00")
    narration: Optional[str] = None
    attachment_url: Optional[str] = None
    cost_center: Optional[str] = None
    series_id: Optional[int] = None


class OpenInvoiceItem(BaseModel):
    id: int
    voucher_number: str
    voucher_date: date
    voucher_type: str  # TRANSPORT_INVOICE or GENERAL_INVOICE
    total_amount: Decimal
    tax_amount: Decimal
    net_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    due_date: Optional[date] = None
    lr_number: Optional[str] = None
    party_name: Optional[str] = None
    gst_treatment: Optional[str] = None
    credit_period_days: Optional[int] = None
    days_overdue: Optional[int] = None


class PaymentAllocationItem(BaseModel):
    invoice_id: Optional[int] = None
    hire_challan_id: Optional[int] = None
    allocated_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Net payment disbursed from bank or cash")
    tds_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="TDS retained / deducted on this bill")
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Discount / rebate received from vendor")
    total_settled: Optional[Decimal] = None
    bill_number: Optional[str] = None
    bill_type: Optional[str] = None  # PURCHASE_BILL, HIRE_CHALLAN


class PaymentVoucherCreate(BaseModel):
    vendor_id: Optional[int] = None
    driver_id: Optional[int] = None
    party_name: Optional[str] = None
    party_account_id: Optional[int] = None  # Or selected Expense Account ID for direct expense
    voucher_date: Optional[date] = None
    payment_type: str = Field(default="AGAINST_REF", description="AGAINST_REF, HIRE_CHALLAN, DRIVER_ADVANCE, DRIVER_EXPENSE, DIRECT_EXPENSE, ADVANCE, STATUTORY_PAYMENT")
    payment_mode: str = Field(default="BANK", description="BANK, CASH, CHEQUE, UPI, NEFT, RTGS, IMPS")
    bank_account_id: Optional[int] = None
    bank_account_code: Optional[str] = None
    reference_number: Optional[str] = None  # UTR / Txn Ref / Cheque No
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    cheque_bank: Optional[str] = None
    clearance_status: Optional[str] = "CLEARED"  # CLEARED, PENDING
    amount: Decimal = Field(gt=Decimal("0.00"), description="Total net payment disbursed from bank or cash")
    tds_section: Optional[str] = "194C"  # 194C (1% / 2%), 194J (2% / 10%), 194Q (0.1%), NONE
    tds_rate: Optional[Decimal] = Decimal("0.00")
    tds_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    allocations: List[PaymentAllocationItem] = []
    unapplied_advance_amount: Optional[Decimal] = Decimal("0.00")
    hire_challan_id: Optional[int] = None
    hire_challan_payment_type: Optional[str] = None  # ATH, BTH, FULL
    narration: Optional[str] = None
    attachment_url: Optional[str] = None
    cost_center: Optional[str] = None
    series_id: Optional[int] = None


class OpenBillItem(BaseModel):
    id: int
    voucher_number: str
    voucher_date: date
    voucher_type: str  # NORMAL_PURCHASE or GENERAL_PURCHASE
    reference_number: Optional[str] = None
    total_amount: Decimal
    tax_amount: Decimal
    net_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    due_date: Optional[date] = None
    party_name: Optional[str] = None
    credit_period_days: Optional[int] = None
    days_overdue: Optional[int] = None
    hire_challan_id: Optional[int] = None


class ContraAccountItem(BaseModel):
    id: int
    name: str
    code: str
    account_type: str  # "BANK" or "CASH"
    current_balance: Decimal = Decimal("0.00")
    balance_type: str = "DR"  # "DR" or "CR"
    issuing_office_id: Optional[int] = None
    issuing_office_name: Optional[str] = None
    account_number_masked: Optional[str] = None


class ContraVoucherCreate(BaseModel):
    contra_type: str  # "CASH_TO_BANK", "BANK_TO_CASH", "BANK_TO_BANK", "CASH_TO_CASH"
    source_account_id: int
    destination_account_id: int
    amount: Decimal = Field(gt=Decimal("0.00"), description="Transfer amount must be positive")
    voucher_date: date
    transfer_mode: Optional[str] = "BANK_TRANSFER"  # "CASH_DEPOSIT", "ATM_WITHDRAWAL", "CHEQUE", "NEFT_RTGS", "IMPS", "UPI", "INTERNAL_TRANSFER"
    reference_number: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    bank_charges: Optional[Decimal] = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    bank_charges_account_id: Optional[int] = None
    narration: Optional[str] = None
    issuing_office_id: Optional[int] = None
    series_id: Optional[int] = None


class ReceiptAgainstInvoiceCreate(BaseModel):
    invoice_id: int
    amount: Decimal = Field(gt=Decimal("0.00"), description="Net payment received in bank or cash")
    tds_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="TDS deducted by debtor under Sec 194C")
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Cash discount or agreed deduction")
    payment_mode: str = Field(default="BANK", description="BANK or CASH")
    bank_account_id: Optional[int] = None
    voucher_date: Optional[date] = None
    reference_number: Optional[str] = None  # Cheque / UTR / NEFT reference
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


class CreditDebitNoteItem(BaseModel):
    description: str = Field(..., max_length=255)
    quantity: Decimal = Field(default=Decimal("1.00"), ge=Decimal("0.01"))
    rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    total_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class CreditDebitNoteCreate(BaseModel):
    note_type: str = Field(..., description="CREDIT_NOTE or DEBIT_NOTE")
    note_category: str = Field(..., description="SALES_CREDIT_NOTE, SALES_DEBIT_NOTE, PURCHASE_DEBIT_NOTE, PURCHASE_CREDIT_NOTE")
    voucher_date: Optional[date] = None
    is_gst_note: bool = Field(default=True, description="Statutory GST Note u/s 34 vs Commercial/Financial Adjustment")
    against_voucher_id: Optional[int] = None
    party_type: str = Field(default="CUSTOMER", description="CUSTOMER or VENDOR")
    billing_client_id: Optional[int] = None
    vendor_id: Optional[int] = None
    party_name: Optional[str] = None
    party_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    gst_treatment: Optional[str] = "FCM"
    reason_code: Optional[str] = "04"  # 01-Sales Return, 02-Post Sale Discount, 03-Deficiency in Services, 04-Correction in Invoice, 05-Change in POS, 06-Other
    reason_description: Optional[str] = None
    reference_number: Optional[str] = None
    reference_date: Optional[date] = None
    total_taxable_amount: Decimal = Field(gt=Decimal("0.00"), description="Taxable value adjustment")
    tax_rate: Optional[Decimal] = Decimal("0.00")
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    cgst_amount: Optional[Decimal] = Decimal("0.00")
    sgst_amount: Optional[Decimal] = Decimal("0.00")
    igst_amount: Optional[Decimal] = Decimal("0.00")
    net_amount: Decimal = Field(gt=Decimal("0.00"), description="Total net adjustment amount")
    narration: Optional[str] = None
    cost_center: Optional[str] = None
    attachment_url: Optional[str] = None
    series_id: Optional[int] = None
    items: List[CreditDebitNoteItem] = []


class EligibleInvoiceItem(BaseModel):
    id: int
    voucher_number: str
    voucher_date: date
    voucher_type: str
    party_name: Optional[str] = None
    party_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    gst_treatment: Optional[str] = None
    total_amount: Decimal
    tax_amount: Decimal
    net_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    tax_breakup: Optional[Dict[str, Any]] = None
    total_adjusted: Decimal = Decimal("0.00")
    allowable_adjustment: Decimal = Decimal("0.00")


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
    party_gstin: Optional[str] = None
    against_voucher_number: Optional[str] = None
    irn: Optional[str] = None
    irn_status: Optional[str] = None
    items: List[VoucherItemResponse] = []
    ledger_entries: List[LedgerEntryResponse] = []
    bill_allocations: List[BillAllocationResponse] = []
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
    company_bank_accounts: Optional[CategoryOverviewStat] = None

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
    issuing_office_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_number_masked: Optional[str] = None
    account_type: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class DetailedLedgerResponse(BaseModel):
    category: str  # BILLING_CLIENT, VENDOR, DRIVER, COMPANY_BANK_ACCOUNT
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


# ==============================================================================
# Company Bank Account Schemas
# ==============================================================================

class CompanyBankAccountBase(BaseModel):
    bank_name: str
    custom_bank_name: Optional[str] = None
    account_holder_name: str
    account_number: str
    account_type: str = "Current"
    ifsc_code: str
    branch_name: Optional[str] = None
    branch_address: Optional[str] = None
    micr_code: Optional[str] = None
    upi_id: Optional[str] = None
    currency: str = "INR"
    issuing_office_id: int
    is_default: bool = False
    ledger_name: Optional[str] = None
    ledger_group: Optional[str] = None
    opening_balance: Decimal = Decimal("0.00")
    opening_balance_date: Optional[date] = None
    opening_balance_type: str = "DR"
    reconciliation_start_date: Optional[date] = None
    is_active: bool = True


class CompanyBankAccountCreate(CompanyBankAccountBase):
    confirm_account_number: Optional[str] = None


class CompanyBankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    custom_bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    branch_address: Optional[str] = None
    micr_code: Optional[str] = None
    upi_id: Optional[str] = None
    currency: Optional[str] = None
    issuing_office_id: Optional[int] = None
    is_default: Optional[bool] = None
    ledger_name: Optional[str] = None
    ledger_group: Optional[str] = None
    opening_balance: Optional[Decimal] = None
    opening_balance_date: Optional[date] = None
    opening_balance_type: Optional[str] = None
    reconciliation_start_date: Optional[date] = None
    is_active: Optional[bool] = None


class CompanyBankAccountResponse(BaseModel):
    id: int
    bank_name: str
    custom_bank_name: Optional[str] = None
    account_holder_name: str
    account_number_masked: str
    account_number: Optional[str] = None
    account_type: str
    ifsc_code: str
    branch_name: Optional[str] = None
    branch_address: Optional[str] = None
    micr_code: Optional[str] = None
    upi_id: Optional[str] = None
    currency: str = "INR"
    issuing_office_id: int
    issuing_office_name: Optional[str] = None
    issuing_office_code: Optional[str] = None
    is_default: bool = False
    account_id: int
    ledger_name: str
    ledger_group: str
    opening_balance: Decimal = Decimal("0.00")
    opening_balance_date: Optional[date] = None
    opening_balance_type: str = "DR"
    current_balance: Decimal = Decimal("0.00")
    balance_type: str = "DR"
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    reconciliation_start_date: Optional[date] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class IFSCDetailsResponse(BaseModel):
    ifsc: str
    bank_name: str
    branch_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    micr: Optional[str] = None
    is_valid: bool = True


class CompanyBankAccountLedgerListItem(BaseModel):
    id: int
    bank_name: str
    account_number: str
    account_number_masked: str
    account_type: str
    ifsc_code: str
    branch_name: Optional[str] = None
    issuing_office_id: int
    issuing_office_name: str
    issuing_office_code: Optional[str] = None
    opening_balance: Decimal
    opening_balance_type: str
    total_debit: Decimal
    total_credit: Decimal
    current_balance: Decimal
    balance_type: str
    status: str
    is_default: bool
    is_active: bool
    ledger_id: int
    ledger_name: str
    transaction_count: int = 0
    last_transaction_date: Optional[date] = None
