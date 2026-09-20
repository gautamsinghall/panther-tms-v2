from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    Numeric, String, Text
)
from sqlalchemy.orm import declarative_base, relationship

ControlBase = declarative_base()

class Plan(ControlBase):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # FREE, PRO, BUSINESS, ENTERPRISE
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price_monthly = Column(Numeric(12, 2), default=0.00, nullable=False)
    price_yearly = Column(Numeric(12, 2), default=0.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    tenants = relationship("Tenant", back_populates="plan")
    entitlements = relationship("Entitlement", back_populates="plan", cascade="all, delete-orphan")


class Entitlement(ControlBase):
    __tablename__ = "entitlements"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False, index=True)
    feature_key = Column(String(100), nullable=False, index=True)  # e.g., 'module_transport', 'max_users'
    limit_value = Column(String(100), nullable=False, default="true")
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    plan = relationship("Plan", back_populates="entitlements")


class Tenant(ControlBase):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    subdomain = Column(String(63), unique=True, index=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    db_name = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, SUSPENDED, PENDING_SETUP
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    admin_email = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    plan = relationship("Plan", back_populates="tenants")


class PlatformAdmin(ControlBase):
    __tablename__ = "platform_admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
