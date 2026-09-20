from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


# ==============================================================================
# Common & Export Schemas
# ==============================================================================

class ExportJobCreate(BaseModel):
    report_name: str
    format: str = "csv"  # "csv" or "json"
    filters: Optional[Dict[str, Any]] = None


class ExportJobResponse(BaseModel):
    job_id: str
    report_name: str
    format: str
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None
    row_count: Optional[int] = 0
    error_message: Optional[str] = None


# ==============================================================================
# 1. Daybook Schemas
# ==============================================================================

class DaybookEntry(BaseModel):
    id: int
    voucher_id: int
    voucher_number: str
    voucher_type: str
    entry_date: date
    account_id: int
    account_name: str
    account_code: str
    party_name: Optional[str] = None
    debit_amount: Decimal
    credit_amount: Decimal
    narration: Optional[str] = None
    is_reversal: bool = False

    model_config = ConfigDict(from_attributes=True)


class DaybookResponse(BaseModel):
    entries: List[DaybookEntry]
    total_debit: Decimal
    total_credit: Decimal
    total_entries: int
    from_date: Optional[date] = None
    to_date: Optional[date] = None


# ==============================================================================
# 2. Ledger Schemas
# ==============================================================================

class LedgerTransaction(BaseModel):
    id: int
    entry_date: date
    voucher_id: int
    voucher_number: str
    voucher_type: str
    party_name: Optional[str] = None
    debit_amount: Decimal
    credit_amount: Decimal
    narration: Optional[str] = None
    running_balance: Decimal
    running_balance_type: str  # "DR" or "CR"

    model_config = ConfigDict(from_attributes=True)


class LedgerResponse(BaseModel):
    account_id: int
    account_name: str
    account_code: str
    group_name: str
    primary_group_name: str
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    opening_balance: Decimal
    opening_balance_type: str  # "DR" or "CR"
    transactions: List[LedgerTransaction]
    period_debit: Decimal
    period_credit: Decimal
    closing_balance: Decimal
    closing_balance_type: str  # "DR" or "CR"


# ==============================================================================
# 3. Trial Balance Schemas
# ==============================================================================

class TrialBalanceAccount(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    debit_balance: Decimal
    credit_balance: Decimal


class TrialBalanceGroup(BaseModel):
    group_id: int
    group_name: str
    group_code: str
    accounts: List[TrialBalanceAccount]
    group_debit: Decimal
    group_credit: Decimal


class TrialBalancePrimaryGroup(BaseModel):
    primary_group_id: int
    primary_group_name: str
    primary_group_code: str
    nature: str
    groups: List[TrialBalanceGroup]
    primary_debit: Decimal
    primary_credit: Decimal


class TrialBalanceResponse(BaseModel):
    as_of_date: date
    primary_groups: List[TrialBalancePrimaryGroup]
    total_debit: Decimal
    total_credit: Decimal
    difference: Decimal
    is_balanced: bool


# ==============================================================================
# 4. Profit & Loss Schemas
# ==============================================================================

class PnLAccountItem(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    amount: Decimal


class PnLGroupItem(BaseModel):
    group_name: str
    accounts: List[PnLAccountItem]
    group_total: Decimal


class ProfitLossResponse(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None

    # Income
    direct_income: List[PnLGroupItem]
    total_direct_income: Decimal
    indirect_income: List[PnLGroupItem]
    total_indirect_income: Decimal
    total_revenue: Decimal

    # Expenses
    direct_expenses: List[PnLGroupItem]
    total_direct_expenses: Decimal
    indirect_expenses: List[PnLGroupItem]
    total_indirect_expenses: Decimal
    total_expenses: Decimal

    # Profit Metrics
    gross_profit: Decimal
    net_profit: Decimal


# ==============================================================================
# 5. Balance Sheet Schemas
# ==============================================================================

class BalanceSheetAccountItem(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    amount: Decimal


class BalanceSheetGroupItem(BaseModel):
    group_name: str
    accounts: List[BalanceSheetAccountItem]
    group_total: Decimal


class BalanceSheetResponse(BaseModel):
    as_of_date: date

    # Assets
    asset_groups: List[BalanceSheetGroupItem]
    total_assets: Decimal

    # Liabilities
    liability_groups: List[BalanceSheetGroupItem]
    total_liabilities: Decimal

    # Equity & Capital
    equity_groups: List[BalanceSheetGroupItem]
    net_profit_transferred: Decimal
    total_equity: Decimal

    # Total Liabilities & Equity
    total_liabilities_and_equity: Decimal
    difference: Decimal
    is_balanced: bool


# ==============================================================================
# 6. Sales Register Schemas
# ==============================================================================

class SalesRegisterItem(BaseModel):
    voucher_id: int
    voucher_number: str
    voucher_date: date
    party_name: Optional[str] = None
    party_gstin: Optional[str] = None
    lr_number: Optional[str] = None
    taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_tax: Decimal
    net_amount: Decimal
    irn: Optional[str] = None
    irn_status: Optional[str] = None


class SalesRegisterResponse(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    invoices: List[SalesRegisterItem]
    total_taxable: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal
    total_tax: Decimal
    total_net_amount: Decimal
    invoice_count: int


# ==============================================================================
# 7. Purchase Register Schemas
# ==============================================================================

class PurchaseRegisterItem(BaseModel):
    voucher_id: int
    voucher_number: str
    voucher_date: date
    voucher_type: str
    supplier_name: Optional[str] = None
    supplier_gstin: Optional[str] = None
    reference_number: Optional[str] = None
    reference_date: Optional[date] = None
    taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_tax: Decimal
    net_amount: Decimal


class PurchaseRegisterResponse(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    purchases: List[PurchaseRegisterItem]
    total_taxable: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal
    total_tax: Decimal
    total_net_amount: Decimal
    purchase_count: int


# ==============================================================================
# 8. Bank Reconciliation Schemas
# ==============================================================================

class BankReconTransaction(BaseModel):
    id: int
    entry_date: date
    voucher_id: int
    voucher_number: str
    voucher_type: str
    party_name: Optional[str] = None
    deposit_amount: Decimal  # Dr in company bank ledger
    withdrawal_amount: Decimal  # Cr in company bank ledger
    narration: Optional[str] = None
    is_cleared: bool = True
    clearance_date: Optional[date] = None


class BankReconciliationResponse(BaseModel):
    account_id: int
    account_name: str
    as_of_date: date
    balance_as_per_books: Decimal
    unpresented_cheques: Decimal  # Payments issued not yet presented to bank
    uncredited_cheques: Decimal   # Deposits made not yet cleared in bank
    computed_bank_statement_balance: Decimal
    transactions: List[BankReconTransaction]


# ==============================================================================
# 9. Special Report Schemas (Operational & Margin Drilldown)
# ==============================================================================

class SpecialReportTripItem(BaseModel):
    lr_id: int
    lr_number: str
    booking_date: date
    consigner_name: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_source: Optional[str] = None
    freight_revenue: Decimal
    vehicle_hire_cost: Decimal
    other_direct_cost: Decimal
    gross_margin: Decimal
    margin_percentage: Decimal


class SpecialReportResponse(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    trips: List[SpecialReportTripItem]
    total_revenue: Decimal
    total_hire_cost: Decimal
    total_other_cost: Decimal
    total_margin: Decimal
    average_margin_percent: Decimal
    trip_count: int
