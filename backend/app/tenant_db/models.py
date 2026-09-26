import enum
from datetime import datetime, timezone, date
from sqlalchemy import Boolean, Column, DateTime, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.tenant_db.base import TenantBase

class User(TenantBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="EMPLOYEE", nullable=False)  # COMPANY_ADMIN, EMPLOYEE
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    custom_role = relationship("Role", back_populates="users", lazy="selectin")


class Role(TenantBase):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    users = relationship("User", back_populates="custom_role")
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan", lazy="selectin")


class RolePermission(TenantBase):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    module = Column(String(100), nullable=False, index=True)  # e.g., 'general', 'settings', 'transport'
    feature = Column(String(100), nullable=False, index=True)  # e.g., 'consignee', 'consigner', 'users'
    permission = Column(String(50), nullable=False)  # 'view', 'create', 'edit', 'delete', 'approve'
    is_allowed = Column(Boolean, default=True, nullable=False)

    role = relationship("Role", back_populates="permissions")


class CompanySetting(TenantBase):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    bank_name = Column(String(150), nullable=True)
    bank_account_no = Column(String(50), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    logo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )



# ==============================================================================
# General Module Master Models (PRD §7.2)
# ==============================================================================

class Consignee(TenantBase):
    """Receiving party / Delivery destination master"""
    __tablename__ = "general_consignees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    country = Column(String(100), default="India", nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class Consigner(TenantBase):
    """Dispatching party / Shipper master"""
    __tablename__ = "general_consigners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    country = Column(String(100), default="India", nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class Location(TenantBase):
    """Country / State / City Location with Pickup & Drop flags (PRD §7.2)"""
    __tablename__ = "general_locations"

    id = Column(Integer, primary_key=True, index=True)
    country = Column(String(100), default="India", nullable=False)
    state = Column(String(100), nullable=False, index=True)
    city_name = Column(String(100), nullable=False, index=True)
    location_code = Column(String(50), nullable=True, index=True)
    is_pickup_point = Column(Boolean, default=True, nullable=False)
    is_drop_point = Column(Boolean, default=True, nullable=False)
    address = Column(Text, nullable=True)
    pincode = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class Industry(TenantBase):
    """Industry vertical master (e.g. Steel, Cement, FMCG, Auto)"""
    __tablename__ = "general_industries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class Designation(TenantBase):
    """Employee designation / title master"""
    __tablename__ = "general_designations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class GroupCompany(TenantBase):
    """Sister/group companies sharing this tenant subscription (PRD §6 & §7.2)"""
    __tablename__ = "general_group_companies"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), unique=True, nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    cin = Column(String(25), nullable=True)
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=True)
    registered_address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class Unit(TenantBase):
    """Unit of measurement (e.g. MT, Tonne, KG, Box, CBM)"""
    __tablename__ = "general_units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class MethodOfPacking(TenantBase):
    """Method of packing (e.g. Wooden Pallets, Corrugated Boxes, Gunny Bags, Loose)"""
    __tablename__ = "general_packing_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# ==============================================================================
# Phase 2: Transport Module Enums & Entities (PRD §7.3, §7.4 & Architecture §9)
# ==============================================================================

class JobStatus(str, enum.Enum):
    OPEN = "OPEN"
    BOOKED = "BOOKED"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class LRStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    BOOKED = "BOOKED"
    LOADED = "LOADED"
    IN_TRANSIT = "IN_TRANSIT"
    ARRIVED = "ARRIVED"
    DELIVERED = "DELIVERED"
    POD_RECEIVED = "POD_RECEIVED"
    POD_VERIFIED = "POD_VERIFIED"
    CANCELLED = "CANCELLED"


class HireChallanStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    TRANSIT = "TRANSIT"
    SETTLED = "SETTLED"
    CANCELLED = "CANCELLED"


class PODCondition(str, enum.Enum):
    OK = "OK"
    DAMAGED = "DAMAGED"
    SHORTAGE = "SHORTAGE"


class PODVerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class TrackingMode(str, enum.Enum):
    FASTAG = "FASTAG"
    GPS = "GPS"
    SIM = "SIM"


class VehicleOwner(TenantBase):
    """Vehicle Owner master for market / hired vehicles"""
    __tablename__ = "transport_vehicle_owners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(100), nullable=True)
    pan = Column(String(10), nullable=True, index=True)
    aadhaar = Column(String(12), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_account_no = Column(String(50), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    market_vehicles = relationship("MarketVehicle", back_populates="owner", lazy="selectin")


class Driver(TenantBase):
    """Driver master managing operational fleet operators"""
    __tablename__ = "transport_drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    phone = Column(String(20), nullable=False, index=True)
    license_number = Column(String(50), unique=True, nullable=False, index=True)
    license_expiry = Column(Date, nullable=True)
    badge_number = Column(String(50), nullable=True)
    current_address = Column(Text, nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    blood_group = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class MarketVehicle(TenantBase):
    """Hired / Market Vehicle master"""
    __tablename__ = "transport_market_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(20), unique=True, nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False)
    capacity_mt = Column(Numeric(10, 3), nullable=False, default=0)
    owner_id = Column(Integer, ForeignKey("transport_vehicle_owners.id"), nullable=True)
    owner_name = Column(String(150), nullable=True)
    owner_phone = Column(String(20), nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    fitness_expiry = Column(Date, nullable=True)
    puc_expiry = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    owner = relationship("VehicleOwner", back_populates="market_vehicles", lazy="selectin")


class CompanyVehicle(TenantBase):
    """Company-owned Fleet Vehicle master"""
    __tablename__ = "transport_company_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(20), unique=True, nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False)
    capacity_mt = Column(Numeric(10, 3), nullable=False, default=0)
    chassis_number = Column(String(50), nullable=True)
    engine_number = Column(String(50), nullable=True)
    registration_date = Column(Date, nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    fitness_expiry = Column(Date, nullable=True)
    national_permit_expiry = Column(Date, nullable=True)
    default_driver_id = Column(Integer, ForeignKey("transport_drivers.id"), nullable=True)
    current_odometer_km = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    default_driver = relationship("Driver", lazy="selectin")


class Job(TenantBase):
    """Transport Job Order preceding LR/GR Booking (PRD §7.3)"""
    __tablename__ = "transport_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_number = Column(String(50), unique=True, nullable=False, index=True)
    job_date = Column(Date, default=date.today, nullable=False)
    consigner_id = Column(Integer, ForeignKey("general_consigners.id"), nullable=False)
    consignee_id = Column(Integer, ForeignKey("general_consignees.id"), nullable=False)
    origin_location_id = Column(Integer, ForeignKey("general_locations.id"), nullable=True)
    destination_location_id = Column(Integer, ForeignKey("general_locations.id"), nullable=True)
    billing_party = Column(String(255), nullable=True)
    expected_dispatch_date = Column(Date, nullable=True)
    cargo_description = Column(Text, nullable=True)
    estimated_weight_mt = Column(Numeric(10, 3), default=0, nullable=False)
    estimated_packages = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default=JobStatus.OPEN.value, nullable=False, index=True)
    special_instructions = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    consigner = relationship("Consigner", lazy="selectin")
    consignee = relationship("Consignee", lazy="selectin")
    origin_location = relationship("Location", foreign_keys=[origin_location_id], lazy="selectin")
    destination_location = relationship("Location", foreign_keys=[destination_location_id], lazy="selectin")
    lrs = relationship("LR", back_populates="job", lazy="selectin")


class LR(TenantBase):
    """Lorry Receipt / Goods Receipt (LR/GR) - Core consignment document"""
    __tablename__ = "transport_lrs"

    id = Column(Integer, primary_key=True, index=True)
    lr_number = Column(String(50), unique=True, nullable=False, index=True)
    lr_date = Column(Date, default=date.today, nullable=False)
    job_id = Column(Integer, ForeignKey("transport_jobs.id"), nullable=True)
    consigner_id = Column(Integer, ForeignKey("general_consigners.id"), nullable=False)
    consignee_id = Column(Integer, ForeignKey("general_consignees.id"), nullable=False)
    origin_location_id = Column(Integer, ForeignKey("general_locations.id"), nullable=True)
    destination_location_id = Column(Integer, ForeignKey("general_locations.id"), nullable=True)
    vehicle_source = Column(String(20), default="MARKET", nullable=False)  # COMPANY or MARKET
    vehicle_number = Column(String(20), nullable=False, index=True)
    driver_name = Column(String(150), nullable=True)
    driver_phone = Column(String(20), nullable=True)
    eway_bill_number = Column(String(50), nullable=True, index=True)
    unit_id = Column(Integer, ForeignKey("general_units.id"), nullable=True)
    packing_method_id = Column(Integer, ForeignKey("general_packing_methods.id"), nullable=True)
    package_count = Column(Integer, default=0, nullable=False)
    actual_weight_mt = Column(Numeric(10, 3), default=0, nullable=False)
    chargeable_weight_mt = Column(Numeric(10, 3), default=0, nullable=False)
    
    # Financial fields - MUST be fixed-point Numeric(12, 2) per rules.md §7
    freight_rate = Column(Numeric(12, 2), default=0, nullable=False)
    freight_amount = Column(Numeric(12, 2), default=0, nullable=False)
    loading_charges = Column(Numeric(12, 2), default=0, nullable=False)
    unloading_charges = Column(Numeric(12, 2), default=0, nullable=False)
    other_charges = Column(Numeric(12, 2), default=0, nullable=False)
    total_freight_amount = Column(Numeric(12, 2), default=0, nullable=False)
    advance_amount = Column(Numeric(12, 2), default=0, nullable=False)
    balance_amount = Column(Numeric(12, 2), default=0, nullable=False)
    
    payment_terms = Column(String(50), default="TO_PAY", nullable=False)  # PAID, TO_PAY, TO_BE_BILLED
    status = Column(String(50), default=LRStatus.DRAFT.value, nullable=False, index=True)
    remarks = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    job = relationship("Job", back_populates="lrs", lazy="selectin")
    consigner = relationship("Consigner", lazy="selectin")
    consignee = relationship("Consignee", lazy="selectin")
    origin_location = relationship("Location", foreign_keys=[origin_location_id], lazy="selectin")
    destination_location = relationship("Location", foreign_keys=[destination_location_id], lazy="selectin")
    unit = relationship("Unit", lazy="selectin")
    packing_method = relationship("MethodOfPacking", lazy="selectin")
    hire_challan = relationship("HireChallan", back_populates="lr", uselist=False, lazy="selectin")
    pod_record = relationship("PODRecord", back_populates="lr", uselist=False, lazy="selectin")


class HireChallan(TenantBase):
    """Hire Challan for market/hired vehicles (PRD §7.3)"""
    __tablename__ = "transport_hire_challans"

    id = Column(Integer, primary_key=True, index=True)
    challan_number = Column(String(50), unique=True, nullable=False, index=True)
    challan_date = Column(Date, default=date.today, nullable=False)
    lr_id = Column(Integer, ForeignKey("transport_lrs.id"), nullable=True)
    vehicle_number = Column(String(20), nullable=False, index=True)
    market_vehicle_id = Column(Integer, ForeignKey("transport_market_vehicles.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("transport_vehicle_owners.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("transport_drivers.id"), nullable=True)
    driver_name = Column(String(150), nullable=True)
    driver_phone = Column(String(20), nullable=True)
    from_location = Column(String(150), nullable=True)
    to_location = Column(String(150), nullable=True)
    
    # Financial fields - MUST be fixed-point Numeric(12, 2) per rules.md §7
    hire_rate = Column(Numeric(12, 2), default=0, nullable=False)
    advance_amount = Column(Numeric(12, 2), default=0, nullable=False)
    balance_amount = Column(Numeric(12, 2), default=0, nullable=False)
    tds_rate = Column(Numeric(5, 2), default=0, nullable=False)
    tds_amount = Column(Numeric(12, 2), default=0, nullable=False)
    detention_charge = Column(Numeric(12, 2), default=0, nullable=False)
    mamul_charges = Column(Numeric(12, 2), default=0, nullable=False)
    net_payable_amount = Column(Numeric(12, 2), default=0, nullable=False)
    
    status = Column(String(50), default=HireChallanStatus.DRAFT.value, nullable=False, index=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lr = relationship("LR", back_populates="hire_challan", lazy="selectin")
    owner = relationship("VehicleOwner", lazy="selectin")


class ArrivalReport(TenantBase):
    """Arrival & Unloading Inspection Report at destination hub (PRD §7.3)"""
    __tablename__ = "transport_arrival_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_number = Column(String(50), unique=True, nullable=False, index=True)
    arrival_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    lr_id = Column(Integer, ForeignKey("transport_lrs.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("transport_jobs.id"), nullable=True)
    destination_hub = Column(String(150), nullable=True)
    packages_received = Column(Integer, default=0, nullable=False)
    packages_damaged = Column(Integer, default=0, nullable=False)
    packages_short = Column(Integer, default=0, nullable=False)
    condition_remarks = Column(Text, nullable=True)
    unloaded_by = Column(String(100), nullable=True)
    receiver_name = Column(String(100), nullable=True)
    status = Column(String(50), default="ARRIVED", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lr = relationship("LR", lazy="selectin")


class PODRecord(TenantBase):
    """Proof of Delivery (POD) Records & Verification (PRD §7.3)"""
    __tablename__ = "transport_pod_records"

    id = Column(Integer, primary_key=True, index=True)
    pod_number = Column(String(50), unique=True, nullable=False, index=True)
    lr_id = Column(Integer, ForeignKey("transport_lrs.id"), unique=True, nullable=False)
    delivery_date = Column(Date, default=date.today, nullable=False)
    receiver_name = Column(String(150), nullable=False)
    receiver_phone = Column(String(20), nullable=True)
    received_condition = Column(String(50), default=PODCondition.OK.value, nullable=False)
    packages_delivered = Column(Integer, default=0, nullable=False)
    document_path = Column(String(500), nullable=True)  # R2 / secure store path per rules.md §8
    remarks = Column(Text, nullable=True)
    verification_status = Column(String(50), default=PODVerificationStatus.PENDING.value, nullable=False, index=True)
    verified_by_user_id = Column(Integer, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lr = relationship("LR", back_populates="pod_record", lazy="selectin")


class TruckHiringNote(TenantBase):
    """Truck Hiring Note memorandum issued to truck broker/owner (PRD §7.3)"""
    __tablename__ = "transport_truck_hiring_notes"

    id = Column(Integer, primary_key=True, index=True)
    note_number = Column(String(50), unique=True, nullable=False, index=True)
    note_date = Column(Date, default=date.today, nullable=False)
    hire_challan_id = Column(Integer, ForeignKey("transport_hire_challans.id"), nullable=True)
    vehicle_number = Column(String(20), nullable=False)
    owner_name = Column(String(150), nullable=True)
    broker_name = Column(String(150), nullable=True)
    driver_name = Column(String(150), nullable=True)
    loading_point = Column(String(150), nullable=True)
    unloading_point = Column(String(150), nullable=True)
    agreed_rate = Column(Numeric(12, 2), default=0, nullable=False)
    advance_cash = Column(Numeric(12, 2), default=0, nullable=False)
    advance_diesel_slip = Column(Numeric(12, 2), default=0, nullable=False)
    balance_payable = Column(Numeric(12, 2), default=0, nullable=False)
    terms_and_conditions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    hire_challan = relationship("HireChallan", lazy="selectin")


# ==============================================================================
# Integration Gap Handlers per Rules.md §2 (Do-Not-Invent Principle)
# ==============================================================================

class EWayBill(TenantBase):
    """
    E-Way Bill manual entry record.
    INTEGRATION POINT: UNKNOWN / NEEDS VERIFICATION — NIC E-Way Bill API provider
    not yet confirmed per PRD §11. Manual entry implemented.
    """
    __tablename__ = "transport_eway_bills"

    id = Column(Integer, primary_key=True, index=True)
    eway_bill_number = Column(String(50), unique=True, nullable=False, index=True)
    lr_id = Column(Integer, ForeignKey("transport_lrs.id"), nullable=True)
    generated_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    from_pincode = Column(String(10), nullable=True)
    to_pincode = Column(String(10), nullable=True)
    approx_distance_km = Column(Integer, default=0, nullable=False)
    vehicle_number = Column(String(20), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, EXTENDED, CANCELLED
    is_manual_entry = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lr = relationship("LR", lazy="selectin")


class TrackingPing(TenantBase):
    """
    Telemetry tracking records for FASTag / GPS / SIM tracking.
    INTEGRATION POINT: UNKNOWN / NEEDS VERIFICATION — FASTag (NPCI/NETC),
    GPS (WheelsEye/LocoNav/Trakmate), SIM (consent gateway) providers not yet
    confirmed per PRD §11. Telemetry shell & ping persistence implemented.
    """
    __tablename__ = "transport_tracking_pings"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(20), nullable=False, index=True)
    tracking_mode = Column(String(20), default=TrackingMode.GPS.value, nullable=False)  # FASTAG, GPS, SIM
    identifier = Column(String(100), nullable=False)  # Tag ID, Device IMEI, or Mobile Phone
    last_latitude = Column(Numeric(9, 6), nullable=True)
    last_longitude = Column(Numeric(9, 6), nullable=True)
    location_name = Column(String(255), nullable=True)
    speed_kmh = Column(Numeric(5, 2), default=0, nullable=True)
    last_ping_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# ==============================================================================
# Misc Accounting Masters (PRD §7.7)
# ==============================================================================

class GroupNature(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class PrimaryGroup(TenantBase):
    """
    Top-level accounting heads (Asset, Liability, Equity, Income, Expense).
    """
    __tablename__ = "misc_primary_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    nature = Column(String(20), default=GroupNature.DEBIT.value, nullable=False)  # DEBIT or CREDIT
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    groups = relationship("GroupInPrimary", back_populates="primary_group", cascade="all, delete-orphan")


class GroupInPrimary(TenantBase):
    """
    Child group under PrimaryGroup (e.g. Current Assets, Sundry Debtors, Direct Income).
    """
    __tablename__ = "misc_groups_in_primary"

    id = Column(Integer, primary_key=True, index=True)
    primary_group_id = Column(Integer, ForeignKey("misc_primary_groups.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    primary_group = relationship("PrimaryGroup", back_populates="groups")
    subgroups = relationship("SubgroupInGroup", back_populates="group", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="group", cascade="all, delete-orphan")


class SubgroupInGroup(TenantBase):
    """
    Subgroup under GroupInPrimary (e.g. North Region Debtors, Local Fleet Fuel).
    """
    __tablename__ = "misc_subgroups_in_group"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("misc_groups_in_primary.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    group = relationship("GroupInPrimary", back_populates="subgroups")
    accounts = relationship("Account", back_populates="subgroup")


class Account(TenantBase):
    """
    Leaf ledger account under Group / Subgroup.
    """
    __tablename__ = "misc_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("misc_groups_in_primary.id"), nullable=False, index=True)
    subgroup_id = Column(Integer, ForeignKey("misc_subgroups_in_group.id"), nullable=True, index=True)
    opening_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    opening_balance_type = Column(String(10), default="DR", nullable=False)  # DR or CR
    consignee_id = Column(Integer, ForeignKey("general_consignees.id"), nullable=True)
    consigner_id = Column(Integer, ForeignKey("general_consigners.id"), nullable=True)
    vehicle_owner_id = Column(Integer, ForeignKey("transport_vehicle_owners.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    group = relationship("GroupInPrimary", back_populates="accounts")
    subgroup = relationship("SubgroupInGroup", back_populates="accounts")
    ledger_entries = relationship("LedgerEntry", back_populates="account")


class EmployeeMaster(TenantBase):
    """
    Employee accounting master with bank and salary details (PRD §7.7).
    """
    __tablename__ = "misc_employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    designation_id = Column(Integer, ForeignKey("general_designations.id"), nullable=True)
    department = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    pan = Column(String(10), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_name = Column(String(100), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    date_of_joining = Column(Date, nullable=True)
    salary = Column(Numeric(12, 2), default=0.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    designation = relationship("Designation", lazy="selectin")


class ChargeHead(TenantBase):
    """
    Invoice / Billing Charge Heads (Freight, Loading, Hamali, Toll, Detention, etc.).
    """
    __tablename__ = "misc_charge_heads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    charge_type = Column(String(20), default="ADDITION", nullable=False)  # ADDITION, DEDUCTION
    default_rate = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_category_id = Column(Integer, ForeignKey("misc_tax_categories.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    tax_category = relationship("TaxCategory", lazy="selectin")


class TaxCategory(TenantBase):
    """
    GST Tax categories (5%, 12%, 18%, 28%, RCM GTA, Exempt).
    """
    __tablename__ = "misc_tax_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    igst_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    cgst_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    sgst_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    is_rcm = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# ==============================================================================
# Accounts Module & Double-Entry Vouchers (PRD §7.6 & Architecture §9)
# ==============================================================================

class VoucherType(str, enum.Enum):
    TRANSPORT_INVOICE = "TRANSPORT_INVOICE"
    GENERAL_INVOICE = "GENERAL_INVOICE"
    PROFORMA_INVOICE = "PROFORMA_INVOICE"
    NORMAL_PURCHASE = "NORMAL_PURCHASE"
    GENERAL_PURCHASE = "GENERAL_PURCHASE"
    RECEIPT_VOUCHER = "RECEIPT_VOUCHER"
    PAYMENT_VOUCHER = "PAYMENT_VOUCHER"
    PAYMENT_ATH = "PAYMENT_ATH"  # Advance To Hired
    PAYMENT_BTH = "PAYMENT_BTH"  # Balance To Hired
    CREDIT_NOTE = "CREDIT_NOTE"
    DEBIT_NOTE = "DEBIT_NOTE"
    GENERAL_VOUCHER = "GENERAL_VOUCHER"
    CONTRA_VOUCHER = "CONTRA_VOUCHER"


class Voucher(TenantBase):
    """
    Master accounting voucher posting to balanced double-entry ledger entries.
    """
    __tablename__ = "accounts_vouchers"

    id = Column(Integer, primary_key=True, index=True)
    voucher_number = Column(String(50), unique=True, nullable=False, index=True)
    voucher_type = Column(String(50), nullable=False, index=True)
    voucher_date = Column(Date, default=date.today, nullable=False, index=True)
    party_name = Column(String(200), nullable=True, index=True)
    party_type = Column(String(50), nullable=True)  # CONSIGNER, CONSIGNEE, VEHICLE_OWNER, EMPLOYEE, OTHER
    reference_number = Column(String(100), nullable=True)
    reference_date = Column(Date, nullable=True)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    net_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    narration = Column(Text, nullable=True)

    # Void tracking per rules.md §7 (reversing entry, never hard delete)
    is_void = Column(Boolean, default=False, nullable=False, index=True)
    void_reason = Column(Text, nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    voided_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Cross-module links
    lr_id = Column(Integer, ForeignKey("transport_lrs.id"), nullable=True)
    hire_challan_id = Column(Integer, ForeignKey("transport_hire_challans.id"), nullable=True)
    account_id = Column(Integer, ForeignKey("misc_accounts.id"), nullable=True)  # Primary party ledger account

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    items = relationship("VoucherItem", back_populates="voucher", cascade="all, delete-orphan", lazy="selectin")
    ledger_entries = relationship("LedgerEntry", back_populates="voucher", cascade="all, delete-orphan", lazy="selectin")
    lr = relationship("LR", lazy="selectin")
    hire_challan = relationship("HireChallan", lazy="selectin")
    einvoice = relationship("EInvoiceRecord", back_populates="voucher", uselist=False, lazy="selectin")


class VoucherItem(TenantBase):
    """
    Line items for invoices and purchases.
    """
    __tablename__ = "accounts_voucher_items"

    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("accounts_vouchers.id"), nullable=False, index=True)
    charge_head_id = Column(Integer, ForeignKey("misc_charge_heads.id"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Numeric(12, 2), default=1.00, nullable=False)
    rate = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_category_id = Column(Integer, ForeignKey("misc_tax_categories.id"), nullable=True)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)

    voucher = relationship("Voucher", back_populates="items")
    charge_head = relationship("ChargeHead", lazy="selectin")
    tax_category = relationship("TaxCategory", lazy="selectin")


class LedgerEntry(TenantBase):
    """
    Individual debit/credit ledger posting.
    Invariant: sum(debit_amount) == sum(credit_amount) per voucher.
    """
    __tablename__ = "accounts_ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("accounts_vouchers.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("misc_accounts.id"), nullable=False, index=True)
    entry_date = Column(Date, default=date.today, nullable=False, index=True)
    debit_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    credit_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    narration = Column(Text, nullable=True)
    is_reversal = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    voucher = relationship("Voucher", back_populates="ledger_entries")
    account = relationship("Account", back_populates="ledger_entries", lazy="selectin")


# ==============================================================================
# E-Invoicing Module (PRD §7.5)
# ==============================================================================

class EInvoiceStatus(str, enum.Enum):
    GENERATED = "GENERATED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


class EInvoiceRecord(TenantBase):
    """
    E-Invoice (IRN) generated record.
    INTEGRATION POINT: UNKNOWN / NEEDS VERIFICATION — GSP provider (ClearTax / Masters India /
    Cygnet / NIC Direct) not yet confirmed per PRD §11.
    """
    __tablename__ = "einvoicing_records"

    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("accounts_vouchers.id"), unique=True, nullable=False, index=True)
    irn = Column(String(64), unique=True, nullable=False, index=True)
    ack_number = Column(String(50), nullable=False)
    ack_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    signed_invoice = Column(Text, nullable=True)
    signed_qr_code = Column(Text, nullable=True)
    status = Column(String(20), default=EInvoiceStatus.GENERATED.value, nullable=False, index=True)
    cancel_reason = Column(String(100), nullable=True)
    cancel_remarks = Column(Text, nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    taxpayer_gstin = Column(String(15), nullable=True)
    legal_name = Column(String(255), nullable=True)
    trade_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    voucher = relationship("Voucher", back_populates="einvoice", lazy="selectin")


# ==============================================================================
# Fleet Management Module (PRD §7.10)
# ==============================================================================

class TripExpense(TenantBase):
    """
    On-road trip expense voucher (Diesel, Toll, Fastag, Driver Allowance, etc.)
    Linked to Phase 2's trips/vehicles.
    """
    __tablename__ = "fleet_trip_expenses"

    id = Column(Integer, primary_key=True, index=True)
    expense_number = Column(String(50), unique=True, nullable=False, index=True)
    lr_id = Column(Integer, ForeignKey("transport_lrs.id"), nullable=True, index=True)
    job_id = Column(Integer, ForeignKey("transport_jobs.id"), nullable=True, index=True)
    vehicle_number = Column(String(20), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("transport_drivers.id"), nullable=True, index=True)
    driver_name = Column(String(150), nullable=True)
    expense_category = Column(String(50), nullable=False, index=True)  # DIESEL, TOLL, MAINTENANCE, DRIVER_ALLOWANCE, POLICE_RTO, LOADING_UNLOADING, MISC
    amount = Column(Numeric(12, 2), default=0, nullable=False)
    payment_mode = Column(String(50), default="PETROCARD", nullable=False)  # PETROCARD, FASTAG, CASH, BANK, UPI
    expense_date = Column(Date, default=date.today, nullable=False)
    receipt_number = Column(String(100), nullable=True)
    odometer_km = Column(Integer, nullable=True)
    fuel_liters = Column(Numeric(10, 2), nullable=True)
    plaza_name = Column(String(150), nullable=True)  # For FASTag/Toll expenses
    status = Column(String(50), default="APPROVED", nullable=False, index=True)  # APPROVED, PENDING, REJECTED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lr = relationship("LR", lazy="selectin")
    job = relationship("Job", lazy="selectin")
    driver = relationship("Driver", lazy="selectin")


class TripAdvance(TenantBase):
    """
    Driver Trip Advance and disbursement record.
    Settles against trip expenses and vouchers.
    """
    __tablename__ = "fleet_trip_advances"

    id = Column(Integer, primary_key=True, index=True)
    advance_number = Column(String(50), unique=True, nullable=False, index=True)
    lr_id = Column(Integer, ForeignKey("transport_lrs.id"), nullable=True, index=True)
    vehicle_number = Column(String(20), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("transport_drivers.id"), nullable=True, index=True)
    driver_name = Column(String(150), nullable=True)
    advance_amount = Column(Numeric(12, 2), default=0, nullable=False)
    settled_amount = Column(Numeric(12, 2), default=0, nullable=False)
    balance_due = Column(Numeric(12, 2), default=0, nullable=False)
    payment_mode = Column(String(50), default="BANK_TRANSFER", nullable=False)  # BANK_TRANSFER, CASH, UPI, PETROCARD
    advance_date = Column(Date, default=date.today, nullable=False)
    settlement_date = Column(Date, nullable=True)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, PARTIALLY_SETTLED, SETTLED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lr = relationship("LR", lazy="selectin")
    driver = relationship("Driver", lazy="selectin")


class VehicleDocument(TenantBase):
    """
    Vehicle compliance documents (Fitness, Insurance, National Permit, PUC, Road Tax).
    """
    __tablename__ = "fleet_vehicle_documents"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(20), nullable=False, index=True)
    vehicle_type = Column(String(20), default="COMPANY", nullable=False)  # COMPANY or MARKET
    doc_type = Column(String(50), nullable=False, index=True)  # FITNESS_CERT, INSURANCE, NATIONAL_PERMIT, PUC, ROAD_TAX, REGISTRATION_RC
    document_number = Column(String(100), nullable=False)
    issuing_authority = Column(String(200), nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_till = Column(Date, nullable=False, index=True)
    file_url = Column(String(500), nullable=True)
    status = Column(String(50), default="VALID", nullable=False, index=True)  # VALID, EXPIRING_SOON, EXPIRED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class VehicleHealthRecord(TenantBase):
    """
    Vehicle telematics diagnostics, mechanical health, and current operational status.
    """
    __tablename__ = "fleet_vehicle_health"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(20), unique=True, nullable=False, index=True)
    odometer_km = Column(Integer, default=0, nullable=False)
    engine_health = Column(String(50), default="GOOD", nullable=False)  # GOOD, ATTENTION_NEEDED, CRITICAL
    battery_status = Column(String(50), default="HEALTHY", nullable=False)  # HEALTHY, CHECK_VOLTAGE, REPLACE
    last_service_km = Column(Integer, default=0, nullable=False)
    last_service_date = Column(Date, nullable=True)
    next_service_km = Column(Integer, default=10000, nullable=False)
    next_service_due_date = Column(Date, nullable=True)
    fitness_expiry = Column(Date, nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    puc_expiry = Column(Date, nullable=True)
    status = Column(String(50), default="ROADWORTHY", nullable=False, index=True)  # ROADWORTHY, IN_WORKSHOP, SERVICE_OVERDUE
    current_status = Column(String(50), default="AVAILABLE", nullable=False, index=True)  # AVAILABLE, IN_TRANSIT, LOADING, UNLOADING, UNDER_MAINTENANCE
    current_location = Column(String(150), nullable=True)
    active_lr_id = Column(Integer, ForeignKey("transport_lrs.id"), nullable=True)
    active_driver_id = Column(Integer, ForeignKey("transport_drivers.id"), nullable=True)
    last_inspected_at = Column(DateTime(timezone=True), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lr = relationship("LR", lazy="selectin")
    driver = relationship("Driver", lazy="selectin")


class TyreRecord(TenantBase):
    """
    Tyre inventory, axle fitment, tread depth wear inspection, and retreading lifecycle.
    """
    __tablename__ = "fleet_tyres"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(50), unique=True, nullable=False, index=True)
    brand = Column(String(100), nullable=False)
    size = Column(String(50), nullable=False)
    vehicle_number = Column(String(20), nullable=True, index=True)
    axle_position = Column(String(50), nullable=True)  # e.g. Front Right (FR), Front Left (FL), Rear Axle 1 Outer (R1O), Spare
    initial_tread_depth_mm = Column(Numeric(5, 2), default=15.0, nullable=False)
    current_tread_depth_mm = Column(Numeric(5, 2), default=15.0, nullable=False)
    installed_date = Column(Date, nullable=True)
    installed_odometer_km = Column(Integer, default=0, nullable=False)
    total_km_run = Column(Integer, default=0, nullable=False)
    purchase_cost = Column(Numeric(12, 2), default=0, nullable=False)
    status = Column(String(50), default="MOUNTED_GOOD", nullable=False, index=True)  # MOUNTED_GOOD, RETREAD_DUE, RETREADED, SCRAPPED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class RepairServiceRecord(TenantBase):
    """
    Workshop maintenance and repair job cards.
    """
    __tablename__ = "fleet_repair_services"

    id = Column(Integer, primary_key=True, index=True)
    job_card_number = Column(String(50), unique=True, nullable=False, index=True)
    vehicle_number = Column(String(20), nullable=False, index=True)
    service_type = Column(String(50), nullable=False, index=True)  # SCHEDULED_PM, BREAKDOWN_REPAIR, OIL_CHANGE, BRAKE_OVERHAUL, TYRE_SERVICE, BODY_ACCIDENT
    workshop_name = Column(String(150), nullable=False)
    service_date = Column(Date, default=date.today, nullable=False)
    completion_date = Column(Date, nullable=True)
    odometer_km = Column(Integer, default=0, nullable=False)
    description_of_work = Column(Text, nullable=True)
    parts_cost = Column(Numeric(12, 2), default=0, nullable=False)
    labor_cost = Column(Numeric(12, 2), default=0, nullable=False)
    total_cost = Column(Numeric(12, 2), default=0, nullable=False)
    invoice_number = Column(String(100), nullable=True)
    status = Column(String(50), default="COMPLETED", nullable=False, index=True)  # SCHEDULED, IN_PROGRESS, COMPLETED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# ==============================================================================
# Settings & Profile Module Models (PRD §7.11 & §7.12, Phase 6)
# ==============================================================================

class SeriesCategory(TenantBase):
    """
    Document series categories (e.g. Transport Documents, Accounts Vouchers, Billing).
    """
    __tablename__ = "settings_series_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    series_list = relationship("SeriesMaster", back_populates="category", cascade="all, delete-orphan")


class SeriesMaster(TenantBase):
    """
    Numbering series sequences for documents (LR, Invoices, Vouchers, Challans).
    """
    __tablename__ = "settings_series_masters"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("settings_series_categories.id"), nullable=True, index=True)
    document_type = Column(String(100), nullable=False, index=True)  # e.g., 'LR', 'INVOICE', 'HIRE_CHALLAN', 'RECEIPT_VOUCHER'
    prefix = Column(String(50), nullable=False)  # e.g., 'LR-2026-'
    suffix = Column(String(50), default="", nullable=True)
    starting_number = Column(Integer, default=1, nullable=False)
    current_number = Column(Integer, default=1, nullable=False)
    end_number = Column(Integer, nullable=True)
    financial_year = Column(String(20), default="2026-2027", nullable=False)
    series_mode = Column(String(20), default="AUTOMATIC", nullable=False)
    series_name = Column(String(100), nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    category = relationship("SeriesCategory", back_populates="series_list")


class AdminSetting(TenantBase):
    """
    Tenant global operational parameters and configurations (PRD §7.11).
    """
    __tablename__ = "settings_admin_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text, nullable=False)
    category = Column(String(50), default="SYSTEM", nullable=False)  # SYSTEM, LOCALIZATION, GATEWAY, BILLING
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class UserActivity(TenantBase):
    """
    Audit log tracking all critical business actions per architecture.md §11.
    """
    __tablename__ = "settings_user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    user_role = Column(String(50), nullable=False)
    action = Column(String(150), nullable=False, index=True)
    module = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User")


class Branch(TenantBase):
    """
    Company branch / operating hub master (PRD §7.12).
    """
    __tablename__ = "profile_branches"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    pincode = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    gstin = Column(String(15), nullable=True)
    is_head_office = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class EmailSetting(TenantBase):
    """
    Outbound SMTP email dispatch configuration (PRD §7.12).
    """
    __tablename__ = "profile_email_settings"

    id = Column(Integer, primary_key=True, index=True)
    smtp_host = Column(String(255), default="smtp.mailgun.org", nullable=False)
    smtp_port = Column(Integer, default=587, nullable=False)
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    sender_email = Column(String(255), default="notifications@panthertms.com", nullable=False)
    sender_name = Column(String(100), default="PantherTMS Dispatch", nullable=False)
    use_tls = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )



