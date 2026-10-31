from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class LRRegisterRow(BaseModel):
    id: int
    lr_number: str
    lr_date: Optional[date] = None
    consigner_name: Optional[str] = None
    consignee_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    vehicle_number: Optional[str] = None
    package_count: Optional[int] = 0
    actual_weight_mt: Optional[Decimal] = Decimal("0.000")
    chargeable_weight_mt: Optional[Decimal] = Decimal("0.000")
    freight_rate: Optional[Decimal] = Decimal("0.00")
    freight_amount: Optional[Decimal] = Decimal("0.00")
    total_freight_amount: Optional[Decimal] = Decimal("0.00")
    advance_amount: Optional[Decimal] = Decimal("0.00")
    balance_amount: Optional[Decimal] = Decimal("0.00")
    status: Optional[str] = None
    issuing_office_name: Optional[str] = None
    booking_status: Optional[str] = None
    client_name: Optional[str] = None
    party_invoice_no: Optional[str] = None
    site_from: Optional[str] = None
    site_to: Optional[str] = None
    eway_bill_number: Optional[str] = None
    payment_terms: Optional[str] = None
    payment_type: Optional[str] = None
    vehicle_type: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None

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
    net_payable_amount: Optional[Decimal] = Decimal("0.00")
    tds_category: Optional[str] = None
    tds_rate: Optional[Decimal] = Decimal("0.00")
    tds_amount: Optional[Decimal] = Decimal("0.00")
    vendor_ref_no: Optional[str] = None
    detention_charge: Optional[Decimal] = Decimal("0.00")
    mamul_charges: Optional[Decimal] = Decimal("0.00")
    owner_id: Optional[int] = None
    driver_phone: Optional[str] = None
    issuing_office_id: Optional[int] = None
    issuing_office_name: Optional[str] = None
    issuing_office_code: Optional[str] = None
    remarks: Optional[str] = None
    lr_id: Optional[int] = None
    lr_number: Optional[str] = None
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
