from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.tenant_db.models import (
    JobStatus,
    LRStatus,
    HireChallanStatus,
    PODCondition,
    PODVerificationStatus,
    TrackingMode,
    SIMConsentStatus,
)

# ---------------------------------------------------------------------------
# Vehicle Owner Schemas
# ---------------------------------------------------------------------------
class VehicleOwnerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=10, max_length=20)
    email: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    is_active: bool = True

class VehicleOwnerCreate(VehicleOwnerBase):
    pass

class VehicleOwnerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    is_active: Optional[bool] = None

class VehicleOwnerResponse(VehicleOwnerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Driver Schemas
# ---------------------------------------------------------------------------
class DriverBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=10, max_length=20)
    license_number: Optional[str] = None
    license_expiry: Optional[date] = None
    dl_status: Optional[str] = None
    vehicle_classes: Optional[str] = None
    valid_from: Optional[date] = None
    valid_upto: Optional[date] = None
    aadhar_no: Optional[str] = None
    pan_no: Optional[str] = None
    license_doc: Optional[str] = None
    aadhar_doc: Optional[str] = None
    pan_doc: Optional[str] = None
    badge_number: Optional[str] = None
    current_address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    is_active: bool = True

class DriverCreate(DriverBase):
    pass

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[date] = None
    dl_status: Optional[str] = None
    vehicle_classes: Optional[str] = None
    valid_from: Optional[date] = None
    valid_upto: Optional[date] = None
    aadhar_no: Optional[str] = None
    pan_no: Optional[str] = None
    license_doc: Optional[str] = None
    aadhar_doc: Optional[str] = None
    pan_doc: Optional[str] = None
    badge_number: Optional[str] = None
    current_address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    is_active: Optional[bool] = None

class DriverResponse(DriverBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Market Vehicle Schemas
# ---------------------------------------------------------------------------
class MarketVehicleBase(BaseModel):
    vehicle_number: str = Field(..., min_length=4, max_length=20)
    vehicle_type: str = Field(..., min_length=2, max_length=100)
    capacity_mt: Decimal = Field(default=Decimal("0.000"))
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None

    # Step 1: Vehicle and Owner Details
    ownership_type: Optional[str] = "Market Vehicle"

    # Step 2: Vehicle Specifications and Registration Details
    vehicle_description: Optional[str] = None
    registration_date: Optional[date] = None
    vehicle_class: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    financier: Optional[str] = None
    gvw_kg: Optional[Decimal] = None
    unladen_weight_kg: Optional[Decimal] = None
    emission_norms: Optional[str] = None
    color: Optional[str] = None
    cylinders: Optional[int] = None
    seating_capacity: Optional[int] = None
    rc_status: Optional[str] = "ACTIVE"

    # Step 3: Validity Details
    tax_validity: Optional[date] = None
    permit_validity: Optional[date] = None

    # STEP 4: Equipment & Maintenance
    has_jack: Optional[bool] = False
    has_raad: Optional[bool] = False
    has_pana: Optional[bool] = False
    has_stepney: Optional[bool] = False
    has_tarpaulin_rassi: Optional[bool] = False

    last_service_km: Optional[int] = None
    last_service_done_at: Optional[str] = None
    last_service_status: Optional[str] = None
    driver_at_last_service: Optional[str] = None
    driver_phone_at_last_service: Optional[str] = None
    tyre_numbers: Optional[str] = None

    rc_original_status: Optional[str] = None
    rc_copy_doc: Optional[str] = None
    last_repair_bill_doc: Optional[str] = None

    is_active: bool = True

class MarketVehicleCreate(MarketVehicleBase):
    pass

class MarketVehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    capacity_mt: Optional[Decimal] = None
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None

    ownership_type: Optional[str] = None
    vehicle_description: Optional[str] = None
    registration_date: Optional[date] = None
    vehicle_class: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    financier: Optional[str] = None
    gvw_kg: Optional[Decimal] = None
    unladen_weight_kg: Optional[Decimal] = None
    emission_norms: Optional[str] = None
    color: Optional[str] = None
    cylinders: Optional[int] = None
    seating_capacity: Optional[int] = None
    rc_status: Optional[str] = None

    tax_validity: Optional[date] = None
    permit_validity: Optional[date] = None

    has_jack: Optional[bool] = None
    has_raad: Optional[bool] = None
    has_pana: Optional[bool] = None
    has_stepney: Optional[bool] = None
    has_tarpaulin_rassi: Optional[bool] = None

    last_service_km: Optional[int] = None
    last_service_done_at: Optional[str] = None
    last_service_status: Optional[str] = None
    driver_at_last_service: Optional[str] = None
    driver_phone_at_last_service: Optional[str] = None
    tyre_numbers: Optional[str] = None

    rc_original_status: Optional[str] = None
    rc_copy_doc: Optional[str] = None
    last_repair_bill_doc: Optional[str] = None
    is_active: Optional[bool] = None

class MarketVehicleResponse(MarketVehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Company Vehicle Schemas
# ---------------------------------------------------------------------------
class CompanyVehicleBase(BaseModel):
    vehicle_number: str = Field(..., min_length=4, max_length=20)
    vehicle_type: str = Field(..., min_length=2, max_length=50)
    capacity_mt: Decimal = Field(default=Decimal("0.000"))
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    registration_date: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    national_permit_expiry: Optional[date] = None
    default_driver_id: Optional[int] = None
    current_odometer_km: int = 0
    is_active: bool = True

class CompanyVehicleCreate(CompanyVehicleBase):
    pass

class CompanyVehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    capacity_mt: Optional[Decimal] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    registration_date: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    national_permit_expiry: Optional[date] = None
    default_driver_id: Optional[int] = None
    current_odometer_km: Optional[int] = None
    is_active: Optional[bool] = None

class CompanyVehicleResponse(CompanyVehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Job Schemas & State Transitions
# ---------------------------------------------------------------------------
class JobBase(BaseModel):
    job_number: Optional[str] = None
    issuing_office_id: Optional[int] = None
    job_date: date = Field(default_factory=date.today)
    consigner_id: int
    consignee_id: int
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    billing_client_id: Optional[int] = None
    billing_party: Optional[str] = None
    expected_dispatch_date: Optional[date] = None
    cargo_description: Optional[str] = None
    estimated_weight_mt: Optional[Decimal] = Decimal("0.000")
    estimated_packages: Optional[int] = 0
    special_instructions: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    issuing_office_id: Optional[int] = None
    job_date: Optional[date] = None
    consigner_id: Optional[int] = None
    consignee_id: Optional[int] = None
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    billing_client_id: Optional[int] = None
    billing_party: Optional[str] = None
    expected_dispatch_date: Optional[date] = None
    cargo_description: Optional[str] = None
    estimated_weight_mt: Optional[Decimal] = None
    estimated_packages: Optional[int] = None
    special_instructions: Optional[str] = None

class JobStatusTransitionRequest(BaseModel):
    target_status: JobStatus
    remarks: Optional[str] = None

class JobResponse(JobBase):
    id: int
    job_number: str
    status: JobStatus
    created_by_user_id: Optional[int] = None
    consigner_name: Optional[str] = None
    consigner_code: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_code: Optional[str] = None
    billing_client_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    issuing_office_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# LR / GR Schemas & State Transitions
# ---------------------------------------------------------------------------
class LRInvoiceItem(BaseModel):
    id: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    invoice_value: Optional[Decimal] = Decimal("0.00")
    eway_bill_number: Optional[str] = None
    eway_bill_date: Optional[date] = None
    eway_bill_expiry: Optional[date] = None
    cha_job_number: Optional[str] = None
    particulars: Optional[str] = None
    remarks: Optional[str] = None

    @field_validator("invoice_date", "eway_bill_date", "eway_bill_expiry", mode="before")
    @classmethod
    def coerce_empty_dates(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("invoice_value", mode="before")
    @classmethod
    def coerce_empty_decimal(cls, v):
        if v == "" or v is None or (isinstance(v, str) and not v.strip()):
            return Decimal("0.00")
        return v

class LRBase(BaseModel):
    lr_number: Optional[str] = None
    issuing_office_id: Optional[int] = None
    lr_date: date = Field(default_factory=date.today)
    job_id: Optional[int] = None
    booking_status: Optional[str] = "Booked"
    dispatch_date: Optional[date] = Field(default_factory=date.today)
    appointment_date: Optional[date] = None
    billing_customer_id: Optional[int] = None
    consigner_id: int
    consignee_id: int
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    via: Optional[str] = None
    vehicle_source: str = "MARKET"
    vehicle_number: str = Field(..., min_length=2, max_length=50)
    vehicle_type: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    eway_bill_number: Optional[str] = None
    eway_bill_date: Optional[date] = None
    eway_bill_expiry: Optional[date] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    invoice_value: Optional[Decimal] = Decimal("0.00")
    cha_job_number: Optional[str] = None
    unit_id: Optional[int] = None
    packing_method_id: Optional[int] = None
    package_count: int = 0
    actual_weight_mt: Decimal = Decimal("0.000")
    chargeable_weight_mt: Decimal = Decimal("0.000")
    bill_of_entry: Optional[str] = None
    container_no: Optional[str] = None
    load_type_id: Optional[int] = None
    load_type: Optional[str] = None
    payment_type: Optional[str] = "To Be Billed"
    eta: Optional[str] = None
    particulars: Optional[str] = None
    lr_series_id: Optional[int] = None
    invoice_items: Optional[List[LRInvoiceItem]] = Field(default_factory=list)
    
    # Financials (Numeric(12, 2) fixed point)
    freight_rate: Decimal = Decimal("0.00")
    freight_amount: Decimal = Decimal("0.00")
    loading_charges: Decimal = Decimal("0.00")
    unloading_charges: Decimal = Decimal("0.00")
    other_charges: Decimal = Decimal("0.00")
    total_freight_amount: Decimal = Decimal("0.00")
    advance_amount: Decimal = Decimal("0.00")
    balance_amount: Decimal = Decimal("0.00")
    
    payment_terms: str = "TO_PAY"
    remarks: Optional[str] = None

    @field_validator("invoice_date", "eway_bill_date", "eway_bill_expiry", "appointment_date", "dispatch_date", "lr_date", mode="before")
    @classmethod
    def coerce_empty_lr_dates(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("invoice_value", "freight_rate", "freight_amount", "loading_charges", "unloading_charges", "other_charges", "total_freight_amount", "advance_amount", "balance_amount", "actual_weight_mt", "chargeable_weight_mt", mode="before")
    @classmethod
    def coerce_empty_lr_decimals(cls, v):
        if v == "" or v is None or (isinstance(v, str) and not v.strip()):
            return Decimal("0.00")
        return v

    @field_validator("package_count", mode="before")
    @classmethod
    def coerce_empty_lr_package_count(cls, v):
        if v == "" or v is None or (isinstance(v, str) and not v.strip()):
            return 0
        return v

    @field_validator("unit_id", "packing_method_id", "load_type_id", "billing_customer_id", "origin_location_id", "destination_location_id", "job_id", "lr_series_id", mode="before")
    @classmethod
    def coerce_empty_lr_optional_ids(cls, v):
        if v == "" or v is None or (isinstance(v, str) and not v.strip()):
            return None
        return v

class LRCreate(LRBase):
    pass

class LRUpdate(BaseModel):
    lr_number: Optional[str] = None
    issuing_office_id: Optional[int] = None
    lr_date: Optional[date] = None
    job_id: Optional[int] = None
    booking_status: Optional[str] = None
    dispatch_date: Optional[date] = None
    appointment_date: Optional[date] = None
    billing_customer_id: Optional[int] = None
    consigner_id: Optional[int] = None
    consignee_id: Optional[int] = None
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    via: Optional[str] = None
    vehicle_source: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    eway_bill_number: Optional[str] = None
    eway_bill_date: Optional[date] = None
    eway_bill_expiry: Optional[date] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    invoice_value: Optional[Decimal] = None
    cha_job_number: Optional[str] = None
    unit_id: Optional[int] = None
    packing_method_id: Optional[int] = None
    package_count: Optional[int] = None
    actual_weight_mt: Optional[Decimal] = None
    chargeable_weight_mt: Optional[Decimal] = None
    bill_of_entry: Optional[str] = None
    container_no: Optional[str] = None
    load_type_id: Optional[int] = None
    load_type: Optional[str] = None
    payment_type: Optional[str] = None
    eta: Optional[str] = None
    particulars: Optional[str] = None
    lr_series_id: Optional[int] = None
    invoice_items: Optional[List[LRInvoiceItem]] = None
    freight_rate: Optional[Decimal] = None
    freight_amount: Optional[Decimal] = None
    loading_charges: Optional[Decimal] = None
    unloading_charges: Optional[Decimal] = None
    other_charges: Optional[Decimal] = None
    total_freight_amount: Optional[Decimal] = None
    advance_amount: Optional[Decimal] = None
    balance_amount: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    remarks: Optional[str] = None

    @field_validator("invoice_date", "eway_bill_date", "eway_bill_expiry", "appointment_date", "dispatch_date", "lr_date", mode="before")
    @classmethod
    def coerce_empty_update_dates(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("invoice_value", "freight_rate", "freight_amount", "loading_charges", "unloading_charges", "other_charges", "total_freight_amount", "advance_amount", "balance_amount", "actual_weight_mt", "chargeable_weight_mt", mode="before")
    @classmethod
    def coerce_empty_update_decimals(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("package_count", "unit_id", "packing_method_id", "load_type_id", "billing_customer_id", "origin_location_id", "destination_location_id", "job_id", "lr_series_id", "consigner_id", "consignee_id", "issuing_office_id", mode="before")
    @classmethod
    def coerce_empty_update_ints(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

class LRStatusTransitionRequest(BaseModel):
    target_status: LRStatus
    remarks: Optional[str] = None


class LRSearchResult(BaseModel):
    id: int
    lr_number: str
    lr_date: date
    vehicle_number: str
    status: str
    consigner_name: Optional[str] = None
    consignee_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None

class LRResponse(LRBase):
    id: int
    lr_number: str
    status: str
    booking_status: Optional[str] = "Booked"
    created_by_user_id: Optional[int] = None
    consigner_name: Optional[str] = None
    consigner_address: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    billing_customer_name: Optional[str] = None
    load_type_name: Optional[str] = None
    packing_method_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    job_number: Optional[str] = None
    issuing_office_name: Optional[str] = None
    issuing_office_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Hire Challan Schemas
# ---------------------------------------------------------------------------
class HireChallanBase(BaseModel):
    challan_number: Optional[str] = None
    issuing_office_id: Optional[int] = None
    hc_series_id: Optional[int] = None
    challan_date: date = Field(default_factory=date.today)
    lr_id: Optional[int] = None
    vehicle_number: str = Field(..., min_length=1, max_length=50)
    market_vehicle_id: Optional[int] = None
    owner_id: Optional[int] = None
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    hire_rate: Decimal = Decimal("0.00")
    advance_amount: Decimal = Decimal("0.00")
    balance_amount: Decimal = Decimal("0.00")
    tds_category: Optional[str] = None
    tds_rate: Decimal = Decimal("0.00")
    tds_amount: Decimal = Decimal("0.00")
    vendor_ref_no: Optional[str] = None
    detention_charge: Decimal = Decimal("0.00")
    mamul_charges: Decimal = Decimal("0.00")
    net_payable_amount: Decimal = Decimal("0.00")
    loading_expenses: Optional[List[Dict[str, Any]]] = None
    unloading_expenses: Optional[List[Dict[str, Any]]] = None
    remarks: Optional[str] = None

class HireChallanCreate(HireChallanBase):
    pass

class HireChallanUpdate(BaseModel):
    issuing_office_id: Optional[int] = None
    hc_series_id: Optional[int] = None
    vehicle_number: Optional[str] = None
    owner_id: Optional[int] = None
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    hire_rate: Optional[Decimal] = None
    advance_amount: Optional[Decimal] = None
    balance_amount: Optional[Decimal] = None
    tds_category: Optional[str] = None
    tds_rate: Optional[Decimal] = None
    tds_amount: Optional[Decimal] = None
    vendor_ref_no: Optional[str] = None
    detention_charge: Optional[Decimal] = None
    mamul_charges: Optional[Decimal] = None
    net_payable_amount: Optional[Decimal] = None
    loading_expenses: Optional[List[Dict[str, Any]]] = None
    unloading_expenses: Optional[List[Dict[str, Any]]] = None
    remarks: Optional[str] = None

class HireChallanSettleRequest(BaseModel):
    settlement_notes: Optional[str] = None

class HireChallanResponse(HireChallanBase):
    id: int
    challan_number: str
    status: HireChallanStatus
    lr_number: Optional[str] = None
    owner_name: Optional[str] = None
    issuing_office_name: Optional[str] = None
    issuing_office_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Arrival Report Schemas
# ---------------------------------------------------------------------------
class ArrivalReportBase(BaseModel):
    report_number: Optional[str] = None
    arrival_date: datetime = Field(default_factory=lambda: datetime.now())
    lr_id: int
    job_id: Optional[int] = None
    destination_hub: Optional[str] = None
    packages_received: int = 0
    packages_damaged: int = 0
    packages_short: int = 0
    condition_remarks: Optional[str] = None
    unloaded_by: Optional[str] = None
    receiver_name: Optional[str] = None

class ArrivalReportCreate(ArrivalReportBase):
    pass

class ArrivalReportResponse(ArrivalReportBase):
    id: int
    report_number: str
    status: str
    lr_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# POD Record Schemas
# ---------------------------------------------------------------------------
class PODRecordBase(BaseModel):
    pod_number: Optional[str] = None
    lr_id: int
    delivery_date: date = Field(default_factory=date.today)
    receiver_name: str = Field(..., min_length=2, max_length=150)
    receiver_phone: Optional[str] = None
    received_condition: PODCondition = PODCondition.OK
    packages_delivered: int = 0
    document_path: Optional[str] = None
    remarks: Optional[str] = None

class PODRecordCreate(PODRecordBase):
    pass

class PODRecordVerifyRequest(BaseModel):
    verification_status: PODVerificationStatus  # VERIFIED or REJECTED
    verification_notes: Optional[str] = None

class PODRecordResponse(PODRecordBase):
    id: int
    pod_number: str
    verification_status: PODVerificationStatus
    verified_by_user_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    lr_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Truck Hiring Note Schemas
# ---------------------------------------------------------------------------
class TruckHiringNoteBase(BaseModel):
    note_number: Optional[str] = None
    note_date: date = Field(default_factory=date.today)
    hire_challan_id: Optional[int] = None
    vehicle_number: str = Field(..., min_length=4, max_length=20)
    owner_name: Optional[str] = None
    broker_name: Optional[str] = None
    driver_name: Optional[str] = None
    loading_point: Optional[str] = None
    unloading_point: Optional[str] = None
    agreed_rate: Decimal = Decimal("0.00")
    advance_cash: Decimal = Decimal("0.00")
    advance_diesel_slip: Decimal = Decimal("0.00")
    balance_payable: Decimal = Decimal("0.00")
    terms_and_conditions: Optional[str] = None

class TruckHiringNoteCreate(TruckHiringNoteBase):
    pass

class TruckHiringNoteResponse(TruckHiringNoteBase):
    id: int
    note_number: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# E-Way Bill Schemas (Manual Entry per Rules §2)
# ---------------------------------------------------------------------------
class EWayBillBase(BaseModel):
    eway_bill_number: str = Field(..., min_length=8, max_length=50)
    lr_id: Optional[int] = None
    generated_date: datetime = Field(default_factory=lambda: datetime.now())
    valid_until: datetime
    from_pincode: Optional[str] = None
    to_pincode: Optional[str] = None
    approx_distance_km: int = 0
    vehicle_number: Optional[str] = None
    status: str = "ACTIVE"
    is_manual_entry: bool = True
    notes: Optional[str] = None

class EWayBillCreate(EWayBillBase):
    pass

class EWayBillResponse(EWayBillBase):
    id: int
    lr_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Tracking Ping Schemas (FASTag / GPS / SIM Telemetry Shell)
# ---------------------------------------------------------------------------
class TrackingPingBase(BaseModel):
    vehicle_number: str = Field(..., min_length=4, max_length=20)
    tracking_mode: TrackingMode = TrackingMode.GPS
    identifier: str = Field(..., min_length=2, max_length=100)
    last_latitude: Optional[Decimal] = None
    last_longitude: Optional[Decimal] = None
    location_name: Optional[str] = None
    speed_kmh: Optional[Decimal] = Decimal("0.00")
    status: str = "ACTIVE"

class TrackingPingCreate(TrackingPingBase):
    last_ping_at: Optional[datetime] = None

class TrackingPingResponse(TrackingPingBase):
    id: int
    last_ping_at: datetime
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Freight Tiger SIM Tracking Schemas (PRD §11 / FT Trip APIs)
# ---------------------------------------------------------------------------
class SIMTripCreate(BaseModel):
    vehicle_number: str = Field(..., min_length=4, max_length=20)
    driver_phone: str = Field(..., min_length=10, max_length=15)
    driver_name: Optional[str] = None
    operator_name: Optional[str] = None
    lr_id: Optional[int] = None
    lr_number: Optional[str] = None
    consignor_name: Optional[str] = None
    consignee_name: Optional[str] = None
    origin_address: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    destination_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    route_code: Optional[str] = None
    trip_direction: Optional[str] = "Outbound"
    milestone: Optional[str] = "In Transit"
    is_starred: Optional[bool] = False
    ewb_number: Optional[str] = None
    share_trip: bool = True

class SIMTripUpdate(BaseModel):
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    operator_name: Optional[str] = None
    consignor_name: Optional[str] = None
    consignee_name: Optional[str] = None
    milestone: Optional[str] = None
    trip_direction: Optional[str] = None
    is_starred: Optional[bool] = None
    is_delayed: Optional[bool] = None
    ewb_number: Optional[str] = None

class SIMTripCommentCreate(BaseModel):
    comment: str = Field(..., min_length=1)
    author: Optional[str] = None

class SIMTripClose(BaseModel):
    comment: Optional[str] = None

class SIMConsentSimulate(BaseModel):
    is_consent_done: bool = True

class SIMTripResponse(BaseModel):
    id: int
    feed_unique_id: str
    ft_trip_id: Optional[int] = None
    lr_id: Optional[int] = None
    lr_number: Optional[str] = None
    vehicle_number: str
    driver_name: Optional[str] = None
    driver_phone: str
    operator_name: Optional[str] = "Jio"
    consignor_name: Optional[str] = "NA"
    consignee_name: Optional[str] = "NA"
    milestone: Optional[str] = "In Transit"
    trip_direction: Optional[str] = "Outbound"
    is_delayed: bool = False
    is_starred: bool = False
    ewb_number: Optional[str] = None
    ewb_expiry: Optional[datetime] = None
    comments: Optional[List[Dict[str, Any]]] = None
    consent_status: str
    is_consent_done: bool
    status: str
    status_code: int
    share_url: Optional[str] = None
    last_latitude: Optional[Decimal] = None
    last_longitude: Optional[Decimal] = None
    last_location_address: Optional[str] = None
    recorded_at: Optional[datetime] = None
    eta: Optional[datetime] = None
    eta_updated_at: Optional[datetime] = None
    distance_remaining_km: Optional[Decimal] = None
    total_distance_km: Optional[Decimal] = None
    origin_address: Optional[str] = None
    destination_address: Optional[str] = None
    route_code: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    last_billed_at: Optional[datetime] = None
    billing_cycles_charged: int = 1
    closed_at: Optional[datetime] = None
    close_comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SIMTrackingSyncResponse(BaseModel):
    trips_synced: int
    message: str = "Trips synced successfully"


# ==============================================================================
# 14. FASTag Tracking Schemas
# ==============================================================================

class TollLogResponse(BaseModel):
    id: int
    vehicle_number: str
    lr_no: Optional[str] = None
    toll_plaza_name: str
    geocode: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    reader_read_time: datetime
    formatted_time: str
    model_config = ConfigDict(from_attributes=True)


class FastagTripCreate(BaseModel):
    vehicle_number: str
    origin_name: str
    destination_name: str
    intermediate_stops: Optional[List[str]] = []
    lr_id: Optional[int] = None
    notes: Optional[str] = None


class FastagTripUpdate(BaseModel):
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None
    intermediate_stops: Optional[List[str]] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class FastagTripResponse(BaseModel):
    id: int
    trip_number: str
    vehicle_number: str
    is_manual: bool
    lr_id: Optional[int] = None
    lr_number: Optional[str] = None
    origin_name: str
    destination_name: str
    intermediate_stops: List[str] = []
    status: str
    start_date: datetime
    end_date: Optional[datetime] = None
    total_distance_km: Optional[Decimal] = None
    covered_distance_km: Optional[Decimal] = None
    remaining_distance_km: Optional[Decimal] = None
    toll_count: int = 0
    last_toll_name: Optional[str] = None
    last_toll_time: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FastagTrackingMetrics(BaseModel):
    covered_km: float = 0.0
    remaining_km: float = 0.0
    total_km: float = 0.0
    progress_pct: int = 0
    status: str = "Active Tracking"


class FastagTrackResponse(BaseModel):
    vehicle: str
    api_called: bool
    cooldown_active: bool
    seconds_since_last_sync: Optional[int] = None
    cooldown_seconds: Optional[int] = 600
    cooldown_minutes: Optional[int] = 10
    trip: Optional[Dict[str, Any]] = None
    route: List[TollLogResponse] = []
    metrics: FastagTrackingMetrics
    error: Optional[str] = None


class FastagConfigResponse(BaseModel):
    google_maps_configured: bool
    fastag_api_configured: bool
    default_map_engine: str
    google_maps_api_key: Optional[str] = None
    fastag_credits_left: int = 0
    rate_per_fetch: float = 1.50
    cooldown_minutes: int = 10
    pricing_notice: str = "Standard tariff: ₹1.50 per vehicle fetch. Calls are blocked when balance reaches 0. Recharges are managed by system administrator."

