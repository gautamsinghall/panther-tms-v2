from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.tenant_db.models import (
    JobStatus,
    LRStatus,
    HireChallanStatus,
    PODCondition,
    PODVerificationStatus,
    TrackingMode,
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
    license_number: str = Field(..., min_length=4, max_length=50)
    license_expiry: Optional[date] = None
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
    vehicle_type: str = Field(..., min_length=2, max_length=50)
    capacity_mt: Decimal = Field(default=Decimal("0.000"))
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None
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
    job_date: date = Field(default_factory=date.today)
    consigner_id: int
    consignee_id: int
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    billing_party: Optional[str] = None
    expected_dispatch_date: Optional[date] = None
    cargo_description: Optional[str] = None
    estimated_weight_mt: Decimal = Decimal("0.000")
    estimated_packages: int = 0
    special_instructions: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    consigner_id: Optional[int] = None
    consignee_id: Optional[int] = None
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
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
    consignee_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# LR / GR Schemas & State Transitions
# ---------------------------------------------------------------------------
class LRBase(BaseModel):
    lr_number: Optional[str] = None
    lr_date: date = Field(default_factory=date.today)
    job_id: Optional[int] = None
    consigner_id: int
    consignee_id: int
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    vehicle_source: str = "MARKET"
    vehicle_number: str = Field(..., min_length=4, max_length=20)
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    eway_bill_number: Optional[str] = None
    unit_id: Optional[int] = None
    packing_method_id: Optional[int] = None
    package_count: int = 0
    actual_weight_mt: Decimal = Decimal("0.000")
    chargeable_weight_mt: Decimal = Decimal("0.000")
    
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

class LRCreate(LRBase):
    pass

class LRUpdate(BaseModel):
    job_id: Optional[int] = None
    consigner_id: Optional[int] = None
    consignee_id: Optional[int] = None
    origin_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    vehicle_source: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    eway_bill_number: Optional[str] = None
    package_count: Optional[int] = None
    actual_weight_mt: Optional[Decimal] = None
    chargeable_weight_mt: Optional[Decimal] = None
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

class LRStatusTransitionRequest(BaseModel):
    target_status: LRStatus
    remarks: Optional[str] = None

class LRResponse(LRBase):
    id: int
    lr_number: str
    status: LRStatus
    created_by_user_id: Optional[int] = None
    consigner_name: Optional[str] = None
    consignee_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    job_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Hire Challan Schemas
# ---------------------------------------------------------------------------
class HireChallanBase(BaseModel):
    challan_number: Optional[str] = None
    challan_date: date = Field(default_factory=date.today)
    lr_id: Optional[int] = None
    vehicle_number: str = Field(..., min_length=4, max_length=20)
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
    tds_rate: Decimal = Decimal("0.00")
    tds_amount: Decimal = Decimal("0.00")
    detention_charge: Decimal = Decimal("0.00")
    mamul_charges: Decimal = Decimal("0.00")
    net_payable_amount: Decimal = Decimal("0.00")
    remarks: Optional[str] = None

class HireChallanCreate(HireChallanBase):
    pass

class HireChallanUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    hire_rate: Optional[Decimal] = None
    advance_amount: Optional[Decimal] = None
    balance_amount: Optional[Decimal] = None
    tds_rate: Optional[Decimal] = None
    tds_amount: Optional[Decimal] = None
    detention_charge: Optional[Decimal] = None
    mamul_charges: Optional[Decimal] = None
    net_payable_amount: Optional[Decimal] = None
    remarks: Optional[str] = None

class HireChallanSettleRequest(BaseModel):
    settlement_notes: Optional[str] = None

class HireChallanResponse(HireChallanBase):
    id: int
    challan_number: str
    status: HireChallanStatus
    lr_number: Optional[str] = None
    owner_name: Optional[str] = None
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
