from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class GenerateIRNRequest(BaseModel):
    voucher_id: int = Field(..., description="ID of the Transport or General Invoice Voucher")
    supplier_gstin: Optional[str] = Field(None, max_length=15)
    buyer_gstin: Optional[str] = Field(None, max_length=15)


class CancelIRNRequest(BaseModel):
    irn: str = Field(..., max_length=64, description="64-character Invoice Reference Number")
    cancel_reason: str = Field(..., description="1: Duplicate, 2: Data Entry Mistake, 3: Order Cancelled, 4: Other")
    cancel_remarks: Optional[str] = Field(None, max_length=255)


class EInvoiceResponse(BaseModel):
    id: int
    voucher_id: int
    voucher_number: Optional[str] = None
    party_name: Optional[str] = None
    net_amount: Optional[Decimal] = None
    irn: str
    ack_number: str
    ack_date: datetime
    signed_qr_code: Optional[str] = None
    status: str
    cancel_reason: Optional[str] = None
    cancel_remarks: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    taxpayer_gstin: Optional[str] = None
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaxpayerDetailsResponse(BaseModel):
    gstin: str
    legal_name: str
    trade_name: str
    taxpayer_type: str
    status: str
    state_jurisdiction: str
    center_jurisdiction: str
    registration_date: str
    address: str
    is_sandbox: bool = True
