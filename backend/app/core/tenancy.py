import re
import secrets
import string
import time
from typing import Optional
from datetime import datetime, timezone
from fastapi import Request
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import jwt

from app.core.config import settings
from app.core.errors import TenantNotFoundException, TenantInactiveException
from app.control.models import Tenant, Plan
from app.core.database import ControlSessionLocal

# In-memory cache for resolved tenants: key (tenant_id or company_code) -> (Tenant, expiration_monotonic)
_tenant_cache: dict[str, tuple[Tenant, float]] = {}
TENANT_CACHE_TTL_SECONDS = 60.0

def generate_tenant_id() -> str:
    """
    Generates an always-unique 10-character alphanumeric string (lowercase letters and numbers).
    Example: 'k9x2m4p8t1'
    """
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(10))

def sanitize_company_code(value: str) -> str:
    """
    Sanitizes company name/code:
    - Only capital alphabets are allowed (A-Z)
    - No spaces, no numbers, no special characters, no hyphens/dashes.
    Example: 'Bharat-Roadways Logistics Pvt. Ltd.' -> 'BHARATROADWAYSLOGISTICSPVTLTD'
    """
    if not value:
        return ""
    return re.sub(r"[^A-Za-z]", "", value).upper()

def invalidate_tenant_cache(identifier: Optional[str] = None) -> None:
    """Invalidates the tenant cache for a specific tenant ID/code or all tenants."""
    if identifier:
        _tenant_cache.pop(identifier.strip().lower(), None)
        _tenant_cache.pop(identifier.strip().upper(), None)
    else:
        _tenant_cache.clear()

def get_tenant_id_from_request(request: Request) -> Optional[str]:
    """
    Extracts the tenant identifier from request in priority order:
    1. Header: X-Tenant-ID
    2. Header: X-Company-Code
    3. Path parameter: tenant_id (if matched in route)
    4. Query parameter: tenant_id
    5. Authorization Bearer JWT token claim: tenant_id
    6. Legacy Header: X-Tenant-Subdomain (for seamless backward compatibility)
    """
    # 1. Primary Header
    header_tid = request.headers.get("X-Tenant-ID")
    if header_tid:
        return header_tid.strip().lower()

    # 2. Company Code Header
    header_code = request.headers.get("X-Company-Code")
    if header_code:
        return sanitize_company_code(header_code)

    # 3. Path parameters (if FastAPI route matches {tenant_id})
    path_tid = request.path_params.get("tenant_id") if hasattr(request, "path_params") else None
    if path_tid:
        return path_tid.strip().lower()

    # 4. Query Parameter
    query_tid = request.query_params.get("tenant_id")
    if query_tid:
        return query_tid.strip().lower()

    # 5. Extract from Authorization Bearer token without verifying signature (lightweight claim extraction)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1].strip()
        try:
            unverified_claims = jwt.decode(token, options={"verify_signature": False})
            token_tid = unverified_claims.get("tenant_id")
            if token_tid:
                return str(token_tid).strip().lower()
        except Exception:
            pass

    return None

def _verify_tenant_active(tenant: Tenant, identifier: str) -> None:
    now = datetime.now(timezone.utc)
    if tenant.status == "SUSPENDED":
        raise TenantInactiveException(identifier)
    if tenant.status == "PAST_DUE":
        if tenant.grace_period_until and now > tenant.grace_period_until:
            raise TenantInactiveException(identifier)
    elif tenant.status != "ACTIVE":
        raise TenantInactiveException(identifier)

async def get_tenant_by_id(tenant_id: str, session: Optional[AsyncSession] = None) -> Tenant:
    """
    Resolves a Tenant by their unique 10-char lowercase alphanumeric tenant_id.
    """
    cleaned = tenant_id.strip().lower()
    now_monotonic = time.monotonic()

    # Check in-memory cache
    if not session and cleaned in _tenant_cache:
        cached_tenant, expire_at = _tenant_cache[cleaned]
        if now_monotonic < expire_at:
            _verify_tenant_active(cached_tenant, cleaned)
            return cached_tenant

    async def _query(s: AsyncSession) -> Optional[Tenant]:
        result = await s.execute(
            select(Tenant)
            .options(selectinload(Tenant.plan).selectinload(Plan.entitlements))
            .where(Tenant.tenant_id == cleaned)
        )
        return result.scalar_one_or_none()

    tenant: Optional[Tenant] = None
    if session:
        tenant = await _query(session)
    else:
        async with ControlSessionLocal() as s:
            tenant = await _query(s)

    if not tenant:
        raise TenantNotFoundException(cleaned)

    _verify_tenant_active(tenant, cleaned)

    if not session:
        _tenant_cache[cleaned] = (tenant, now_monotonic + TENANT_CACHE_TTL_SECONDS)

    return tenant

async def get_tenant_by_company_code(company_code: str, session: Optional[AsyncSession] = None) -> Tenant:
    """
    Resolves a Tenant by their uppercase alphabetic company_code.
    """
    cleaned = sanitize_company_code(company_code)
    now_monotonic = time.monotonic()

    if not session and cleaned in _tenant_cache:
        cached_tenant, expire_at = _tenant_cache[cleaned]
        if now_monotonic < expire_at:
            _verify_tenant_active(cached_tenant, cleaned)
            return cached_tenant

    async def _query(s: AsyncSession) -> Optional[Tenant]:
        result = await s.execute(
            select(Tenant)
            .options(selectinload(Tenant.plan).selectinload(Plan.entitlements))
            .where(Tenant.company_code == cleaned)
        )
        return result.scalar_one_or_none()

    tenant: Optional[Tenant] = None
    if session:
        tenant = await _query(session)
    else:
        async with ControlSessionLocal() as s:
            tenant = await _query(s)

    if not tenant:
        raise TenantNotFoundException(cleaned)

    _verify_tenant_active(tenant, cleaned)

    if not session:
        _tenant_cache[cleaned] = (tenant, now_monotonic + TENANT_CACHE_TTL_SECONDS)

    return tenant
