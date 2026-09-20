from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

# ==============================================================================
# Trip Expense Schemas
# ==============================================================================

class TripExpenseBase(BaseModel):
    lr_id: Optional[int] = None
    job_id: Optional[int] = None
    vehicle_number: str = Field(..., max_length=20)
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    expense_category: str = Field(..., description="DIESEL, TOLL, MAINTENANCE, DRIVER_ALLOWANCE, POLICE_RTO, LOADING_UNLOADING, MISC")
    amount: Decimal = Field(..., ge=0)
    payment_mode: str = Field("PETROCARD", description="PETROCARD, FASTAG, CASH, BANK, UPI")
    expense_date: date = Field(default_factory=date.today)
    receipt_number: Optional[str] = None
    odometer_km: Optional[int] = None
    fuel_liters: Optional[Decimal] = None
    plaza_name: Optional[str] = None
    status: str = Field("APPROVED", description="APPROVED, PENDING, REJECTED")
    remarks: Optional[str] = None


class TripExpenseCreate(TripExpenseBase):
    expense_number: Optional[str] = None


class TripExpenseUpdate(BaseModel):
    expense_category: Optional[str] = None
    amount: Optional[Decimal] = None
    payment_mode: Optional[str] = None
    expense_date: Optional[date] = None
    receipt_number: Optional[str] = None
    odometer_km: Optional[int] = None
    fuel_liters: Optional[Decimal] = None
    plaza_name: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class TripExpenseResponse(TripExpenseBase):
    id: int
    expense_number: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Trip Advance Schemas
# ==============================================================================

class TripAdvanceBase(BaseModel):
    lr_id: Optional[int] = None
    vehicle_number: str = Field(..., max_length=20)
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    advance_amount: Decimal = Field(..., ge=0)
    payment_mode: str = Field("BANK_TRANSFER", description="BANK_TRANSFER, CASH, UPI, PETROCARD")
    advance_date: date = Field(default_factory=date.today)
    remarks: Optional[str] = None


class TripAdvanceCreate(TripAdvanceBase):
    advance_number: Optional[str] = None


class TripAdvanceSettle(BaseModel):
    settled_amount: Decimal = Field(..., ge=0)
    settlement_date: Optional[date] = Field(default_factory=date.today)
    remarks: Optional[str] = None


class TripAdvanceResponse(BaseModel):
    id: int
    advance_number: str
    lr_id: Optional[int] = None
    vehicle_number: str
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    advance_amount: Decimal
    settled_amount: Decimal
    balance_due: Decimal
    payment_mode: str
    advance_date: date
    settlement_date: Optional[date] = None
    status: str
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Vehicle Documents & Compliance Schemas
# ==============================================================================

class VehicleDocumentBase(BaseModel):
    vehicle_number: str = Field(..., max_length=20)
    vehicle_type: str = Field("COMPANY", description="COMPANY or MARKET")
    doc_type: str = Field(..., description="FITNESS_CERT, INSURANCE, NATIONAL_PERMIT, PUC, ROAD_TAX, REGISTRATION_RC")
    document_number: str = Field(..., max_length=100)
    issuing_authority: Optional[str] = None
    valid_from: Optional[date] = None
    valid_till: date
    file_url: Optional[str] = None
    status: str = Field("VALID", description="VALID, EXPIRING_SOON, EXPIRED")
    remarks: Optional[str] = None


class VehicleDocumentCreate(VehicleDocumentBase):
    pass


class VehicleDocumentUpdate(BaseModel):
    document_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    valid_from: Optional[date] = None
    valid_till: Optional[date] = None
    file_url: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class VehicleDocumentResponse(VehicleDocumentBase):
    id: int
    days_to_expire: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Vehicle Health & Telematics Schemas
# ==============================================================================

class VehicleHealthUpdate(BaseModel):
    odometer_km: Optional[int] = None
    engine_health: Optional[str] = None
    battery_status: Optional[str] = None
    last_service_km: Optional[int] = None
    last_service_date: Optional[date] = None
    next_service_km: Optional[int] = None
    next_service_due_date: Optional[date] = None
    fitness_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None
    status: Optional[str] = None
    current_status: Optional[str] = None
    current_location: Optional[str] = None
    active_lr_id: Optional[int] = None
    active_driver_id: Optional[int] = None
    remarks: Optional[str] = None


class VehicleHealthResponse(BaseModel):
    id: int
    vehicle_number: str
    vehicle_type: Optional[str] = None
    odometer_km: int
    engine_health: str
    battery_status: str
    last_service_km: int
    last_service_date: Optional[date] = None
    next_service_km: int
    next_service_due_date: Optional[date] = None
    fitness_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None
    status: str
    current_status: str
    current_location: Optional[str] = None
    active_lr_id: Optional[int] = None
    active_driver_id: Optional[int] = None
    last_inspected_at: Optional[datetime] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VehicleCurrentStatusResponse(BaseModel):
    vehicle_number: str
    vehicle_type: str  # COMPANY or MARKET
    current_status: str  # AVAILABLE, IN_TRANSIT, LOADING, UNLOADING, UNDER_MAINTENANCE
    health_status: str  # ROADWORTHY, IN_WORKSHOP, SERVICE_OVERDUE
    odometer_km: int
    current_location: Optional[str] = None
    active_driver_name: Optional[str] = None
    active_lr_number: Optional[str] = None


# ==============================================================================
# Tyre Management Schemas
# ==============================================================================

class TyreBase(BaseModel):
    serial_number: str = Field(..., max_length=50)
    brand: str = Field(..., max_length=100)
    size: str = Field(..., max_length=50)
    vehicle_number: Optional[str] = None
    axle_position: Optional[str] = None
    initial_tread_depth_mm: Decimal = Decimal("15.00")
    current_tread_depth_mm: Decimal = Decimal("15.00")
    installed_date: Optional[date] = None
    installed_odometer_km: int = 0
    total_km_run: int = 0
    purchase_cost: Decimal = Decimal("0.00")
    status: str = Field("MOUNTED_GOOD", description="MOUNTED_GOOD, RETREAD_DUE, RETREADED, SCRAPPED")
    remarks: Optional[str] = None


class TyreCreate(TyreBase):
    pass


class TyreUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    axle_position: Optional[str] = None
    current_tread_depth_mm: Optional[Decimal] = None
    total_km_run: Optional[int] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class TyreResponse(TyreBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Workshop Repair & Service Schemas
# ==============================================================================

class RepairServiceBase(BaseModel):
    vehicle_number: str = Field(..., max_length=20)
    service_type: str = Field(..., description="SCHEDULED_PM, BREAKDOWN_REPAIR, OIL_CHANGE, BRAKE_OVERHAUL, TYRE_SERVICE, BODY_ACCIDENT")
    workshop_name: str = Field(..., max_length=150)
    service_date: date = Field(default_factory=date.today)
    completion_date: Optional[date] = None
    odometer_km: int = 0
    description_of_work: Optional[str] = None
    parts_cost: Decimal = Decimal("0.00")
    labor_cost: Decimal = Decimal("0.00")
    total_cost: Decimal = Decimal("0.00")
    invoice_number: Optional[str] = None
    status: str = Field("COMPLETED", description="SCHEDULED, IN_PROGRESS, COMPLETED")
    remarks: Optional[str] = None


class RepairServiceCreate(RepairServiceBase):
    job_card_number: Optional[str] = None


class RepairServiceUpdate(BaseModel):
    service_type: Optional[str] = None
    workshop_name: Optional[str] = None
    completion_date: Optional[date] = None
    odometer_km: Optional[int] = None
    description_of_work: Optional[str] = None
    parts_cost: Optional[Decimal] = None
    labor_cost: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    invoice_number: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class RepairServiceResponse(RepairServiceBase):
    id: int
    job_card_number: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Derived Reporting Schemas (PRD §7.10, Architecture §9)
# ==============================================================================

class TruckPnLTripDrilldownItem(BaseModel):
    lr_id: int
    lr_number: str
    lr_date: date
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    freight_revenue: Decimal
    diesel_cost: Decimal
    toll_cost: Decimal
    driver_cost: Decimal
    maintenance_cost: Decimal
    other_cost: Decimal
    hire_challan_cost: Decimal
    total_expense: Decimal
    net_margin: Decimal
    margin_pct: Decimal


class TruckPnLVehicleItem(BaseModel):
    vehicle_number: str
    vehicle_type: str  # COMPANY or MARKET
    model: str
    total_trips: int
    total_revenue: Decimal
    fuel_cost: Decimal
    toll_cost: Decimal
    maintenance_cost: Decimal
    driver_cost: Decimal
    hire_cost: Decimal
    other_cost: Decimal
    total_operating_cost: Decimal
    net_profit: Decimal
    profit_margin_pct: Decimal
    trips: List[TruckPnLTripDrilldownItem] = []


class TruckPnLSummary(BaseModel):
    total_vehicles: int
    total_trips: int
    total_revenue: Decimal
    total_operating_costs: Decimal
    total_net_profit: Decimal
    avg_profit_margin_pct: Decimal


class TruckPnLResponse(BaseModel):
    summary: TruckPnLSummary
    vehicles: List[TruckPnLVehicleItem]


# Trip Expense Register Derived Reporting Schema
class TripExpenseRegisterItem(BaseModel):
    id: int
    expense_number: str
    expense_date: date
    vehicle_number: str
    vehicle_type: str
    trip_no: Optional[str] = None
    driver_name: Optional[str] = None
    expense_category: str
    amount: Decimal
    payment_mode: str
    receipt_number: Optional[str] = None
    odometer_km: Optional[int] = None
    fuel_liters: Optional[Decimal] = None
    plaza_name: Optional[str] = None
    status: str
    remarks: Optional[str] = None


class TripExpenseCategorySubtotal(BaseModel):
    category: str
    total_amount: Decimal
    voucher_count: int


class TripExpenseRegisterResponse(BaseModel):
    total_records: int
    total_amount: Decimal
    fuel_total: Decimal
    toll_total: Decimal
    maintenance_total: Decimal
    driver_allowance_total: Decimal
    other_total: Decimal
    category_subtotals: List[TripExpenseCategorySubtotal]
    items: List[TripExpenseRegisterItem]
