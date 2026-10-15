from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict
from pydantic import BaseModel

# ==============================================================================
# 1. Business Overview Schemas
# ==============================================================================

class MonthlyTrendPoint(BaseModel):
    period: str  # e.g. "Apr 2026", "May 2026"
    revenue: Decimal
    trips: int
    invoices: int


class CorridorVolume(BaseModel):
    origin: str
    destination: str
    trip_count: int
    total_freight: Decimal


class PipelineStageCount(BaseModel):
    stage: str
    count: int
    percentage: float


class RecentOperationItem(BaseModel):
    id: int
    lr_number: str
    lr_date: date
    consigner_name: Optional[str] = None
    consignee_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    vehicle_number: str
    freight_amount: Decimal
    status: str


class BusinessOverviewData(BaseModel):
    total_movements: int
    in_transit_count: int
    delivered_count: int
    net_billed_revenue: Decimal
    total_vouchers_reconciled: int
    monthly_trends: List[MonthlyTrendPoint]
    pipeline_stages: List[PipelineStageCount]
    top_corridors: List[CorridorVolume]
    recent_operations: List[RecentOperationItem]


# ==============================================================================
# 2. Financial Analysis Schemas
# ==============================================================================

class ExpenseCategoryShare(BaseModel):
    category: str
    amount: Decimal
    percentage: float


class MonthlyPnLPoint(BaseModel):
    period: str
    revenue: Decimal
    operating_expenses: Decimal
    net_profit: Decimal
    margin_pct: Decimal


class FinancialAnalysisData(BaseModel):
    total_billed_revenue: Decimal
    total_operating_expenses: Decimal
    net_operating_profit: Decimal
    operating_margin_pct: Decimal
    trade_debtors_receivable: Decimal
    trade_creditors_payable: Decimal
    expense_breakdown: List[ExpenseCategoryShare]
    monthly_performance: List[MonthlyPnLPoint]


# ==============================================================================
# 3. Fleet & Operations Schemas
# ==============================================================================

class FleetStatusCount(BaseModel):
    status: str
    count: int
    color: Optional[str] = None


class ExpiringDocumentAlert(BaseModel):
    id: int
    vehicle_number: Optional[str] = ""
    doc_type: Optional[str] = "DOCUMENT"
    document_number: Optional[str] = ""
    valid_till: Optional[date] = None
    days_left: int = 0
    status: Optional[str] = "EXPIRING"


class ActiveTransitMovement(BaseModel):
    vehicle_number: Optional[str] = "N/A"
    vehicle_type: Optional[str] = "Fleet Vehicle"
    driver_name: Optional[str] = None
    lr_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    current_location: Optional[str] = None
    status: Optional[str] = "IN_TRANSIT"


class FleetOperationsData(BaseModel):
    total_fleet_count: int = 0
    in_transit_count: int = 0
    in_workshop_count: int = 0
    available_count: int = 0
    pending_pod_count: int = 0
    fleet_status_breakdown: List[FleetStatusCount] = []
    expiring_documents: List[ExpiringDocumentAlert] = []
    active_movements: List[ActiveTransitMovement] = []


# ==============================================================================
# 4. Own Fleet Schemas
# ==============================================================================

class OwnVehicleMatrixItem(BaseModel):
    vehicle_number: Optional[str] = "N/A"
    model: Optional[str] = "Fleet Truck"
    odometer_km: int = 0
    engine_health: Optional[str] = "GOOD"
    battery_status: Optional[str] = "HEALTHY"
    next_service_km: int = 10000
    service_status: Optional[str] = "ROADWORTHY"
    current_status: Optional[str] = "AVAILABLE"
    current_location: Optional[str] = None
    default_driver: Optional[str] = None


class OwnFleetData(BaseModel):
    company_vehicles_count: int
    roadworthy_count: int
    service_overdue_count: int
    under_maintenance_count: int
    total_odometer_km: int
    tyre_mounted_count: int
    tyre_retread_due_count: int
    vehicles: List[OwnVehicleMatrixItem]


# ==============================================================================
# 5. Real Notifications Schema
# ==============================================================================

class NotificationItemSchema(BaseModel):
    id: str
    title: str
    message: str
    timeAgo: str
    type: str  # "dispatch" | "alert" | "payment" | "success"
    unread: bool = True
    href: str

