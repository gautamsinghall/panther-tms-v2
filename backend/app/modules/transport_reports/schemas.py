from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class LRRegisterRow(BaseModel):
    id: int
    lr_number: str
    lr_date: date
    consigner_name: Optional[str] = None
    consignee_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    vehicle_number: str
    package_count: int
    actual_weight_mt: Decimal
    total_freight_amount: Decimal
    advance_amount: Decimal
    balance_amount: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)

class LRClientWiseRow(BaseModel):
    client_name: str
    client_type: str  # Consigner or Consignee
    total_lrs: int
    total_weight_mt: Decimal
    total_freight_amount: Decimal
    delivered_count: int
    in_transit_count: int

class HireChallanRegisterRow(BaseModel):
    id: int
    challan_number: str
    challan_date: date
    vehicle_number: str
    owner_name: Optional[str] = None
    driver_name: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    hire_rate: Decimal
    advance_amount: Decimal
    balance_amount: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)

class PendingHCRow(BaseModel):
    id: int
    challan_number: str
    challan_date: date
    vehicle_number: str
    owner_name: Optional[str] = None
    driver_name: Optional[str] = None
    hire_rate: Decimal
    advance_amount: Decimal
    balance_due: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)

class UnbilledLRRow(BaseModel):
    id: int
    lr_number: str
    lr_date: date
    consigner_name: Optional[str] = None
    consignee_name: Optional[str] = None
    destination_city: Optional[str] = None
    total_freight_amount: Decimal
    delivery_date: Optional[date] = None
    pod_verification_status: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)

class ArrivalRegisterRow(BaseModel):
    id: int
    report_number: str
    arrival_date: datetime
    lr_number: str
    destination_hub: Optional[str] = None
    packages_received: int
    packages_damaged: int
    packages_short: int
    receiver_name: Optional[str] = None
    condition_remarks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UnusedSeriesRow(BaseModel):
    series_name: str
    prefix: str
    allocated_start: int
    allocated_end: int
    last_used_number: int
    unused_count: int

class InvoiceRegisterRow(BaseModel):
    id: int
    invoice_number: str
    lr_number: Optional[str] = None
    billing_date: date
    client_name: str
    taxable_amount: Decimal
    gst_amount: Decimal
    total_invoice_amount: Decimal
    status: str
