from datetime import date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# ==============================================================================
# 1. GST Output Statement Schemas (GSTR-1 outward supplies)
# ==============================================================================

class GSTOutputItem(BaseModel):
    voucher_id: int
    voucher_number: str
    voucher_date: date
    customer_name: Optional[str] = None
    customer_gstin: Optional[str] = None
    place_of_supply: Optional[str] = None
    invoice_type: str  # B2B, B2C, RCM
    is_rcm: bool
    taxable_value: Decimal
    cgst_rate: Decimal
    cgst_amount: Decimal
    sgst_rate: Decimal
    sgst_amount: Decimal
    igst_rate: Decimal
    igst_amount: Decimal
    total_tax: Decimal
    total_invoice_value: Decimal
    irn: Optional[str] = None


class GSTOutputResponse(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    records: List[GSTOutputItem]
    b2b_count: int
    b2b_taxable: Decimal
    b2b_tax: Decimal
    rcm_count: int
    rcm_taxable: Decimal
    rcm_tax: Decimal
    total_taxable: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal
    total_tax: Decimal
    total_invoice_value: Decimal


# ==============================================================================
# 2. GST Input Statement Schemas (GSTR-2B inward supplies / ITC)
# ==============================================================================

class GSTInputItem(BaseModel):
    voucher_id: int
    voucher_number: str
    voucher_date: date
    supplier_name: Optional[str] = None
    supplier_gstin: Optional[str] = None
    reference_number: Optional[str] = None
    reference_date: Optional[date] = None
    taxable_value: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    itc_eligible: bool = True
    itc_remarks: Optional[str] = "Eligible ITC"


class GSTInputResponse(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    records: List[GSTInputItem]
    total_taxable: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal
    total_tax: Decimal
    total_amount: Decimal
    total_itc_eligible: Decimal
    record_count: int


# ==============================================================================
# 3. O/S Debtor Statement Schemas (Accounts Receivable Aging)
# ==============================================================================

class OSDebtorItem(BaseModel):
    account_id: int
    debtor_name: str
    debtor_code: str
    phone: Optional[str] = None
    gstin: Optional[str] = None
    current_balance: Decimal
    bucket_0_30: Decimal
    bucket_31_60: Decimal
    bucket_61_90: Decimal
    bucket_over_90: Decimal
    latest_invoice_date: Optional[date] = None
    days_overdue: int = 0


class OSDebtorResponse(BaseModel):
    as_of_date: date
    debtors: List[OSDebtorItem]
    total_outstanding: Decimal
    total_bucket_0_30: Decimal
    total_bucket_31_60: Decimal
    total_bucket_61_90: Decimal
    total_bucket_over_90: Decimal
    debtor_count: int


# ==============================================================================
# 4. O/S Creditor Statement Schemas (Accounts Payable Aging)
# ==============================================================================

class OSCreditorItem(BaseModel):
    account_id: int
    creditor_name: str
    creditor_code: str
    phone: Optional[str] = None
    gstin: Optional[str] = None
    current_balance: Decimal
    bucket_0_30: Decimal
    bucket_31_60: Decimal
    bucket_61_90: Decimal
    bucket_over_90: Decimal
    latest_bill_date: Optional[date] = None
    days_overdue: int = 0


class OSCreditorResponse(BaseModel):
    as_of_date: date
    creditors: List[OSCreditorItem]
    total_outstanding: Decimal
    total_bucket_0_30: Decimal
    total_bucket_31_60: Decimal
    total_bucket_61_90: Decimal
    total_bucket_over_90: Decimal
    creditor_count: int


# ==============================================================================
# 5. TDS Payable Report Schemas
# ==============================================================================

class TDSPayableItem(BaseModel):
    voucher_id: int
    voucher_number: str
    voucher_date: date
    party_name: Optional[str] = None
    pan: Optional[str] = None
    section: str  # e.g., "194C", "194J"
    gross_amount: Decimal
    tds_rate: Decimal
    tds_amount: Decimal
    is_deposited: bool = False
    challan_number: Optional[str] = None
    deposit_date: Optional[date] = None


class TDSPayableResponse(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    records: List[TDSPayableItem]
    total_gross_amount: Decimal
    total_tds_deducted: Decimal
    total_tds_deposited: Decimal
    total_tds_pending: Decimal
    record_count: int


# ==============================================================================
# 6. TDS Return Report Schemas (Form 26Q Quarterly Summary)
# ==============================================================================

class TDSReturnSectionSummary(BaseModel):
    section: str
    description: str
    deductee_count: int
    total_amount_paid: Decimal
    total_tds_deducted: Decimal
    total_tds_deposited: Decimal


class TDSReturnResponse(BaseModel):
    financial_year: str
    quarter: str
    sections: List[TDSReturnSectionSummary]
    total_deductees: int
    total_amount_paid: Decimal
    total_tax_deducted: Decimal
    total_tax_deposited: Decimal


# ==============================================================================
# 7. Opening Balance Details Schemas
# ==============================================================================

class OpeningBalanceAccount(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    group_name: str
    primary_group_name: str
    opening_balance: Decimal
    opening_balance_type: str  # "DR" or "CR"


class OpeningBalanceResponse(BaseModel):
    accounts: List[OpeningBalanceAccount]
    total_debit: Decimal
    total_credit: Decimal
    difference: Decimal
    is_balanced: bool
    account_count: int
