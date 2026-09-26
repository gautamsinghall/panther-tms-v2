import re
from typing import Optional
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import TenantNotFoundException, TenantInactiveException
from datetime import datetime, timezone
from sqlalchemy.orm import selectinload
from app.control.models import Tenant, Plan
from app.core.database import ControlSessionLocal


import time

# In-memory cache for resolved tenants: subdomain -> (Tenant, expiration_monotonic)
_tenant_cache: dict[str, tuple[Tenant, float]] = {}
TENANT_CACHE_TTL_SECONDS = 60.0

def invalidate_tenant_cache(subdomain: Optional[str] = None) -> None:
    """Invalidates the tenant cache for a specific subdomain or all tenants."""
    if subdomain:
        _tenant_cache.pop(subdomain.strip().lower(), None)
    else:
        _tenant_cache.clear()

def extract_subdomain_from_host(host: str) -> Optional[str]:
    if not host:
        return None
    # Strip port if present
    hostname = host.split(":")[0].strip().lower()

    # If IP address or exact base domain, no subdomain
    if hostname in ("localhost", "127.0.0.1", "testserver"):
        return None

    # Handle {subdomain}.localhost
    if hostname.endswith(".localhost"):
        parts = hostname.split(".")
        if len(parts) >= 2 and parts[0] != "api" and parts[0] != "www":
            return parts[0]

    # Handle {subdomain}.panthertms.local or {subdomain}.panthertms.com
    base = settings.BASE_DOMAIN.lower()
    if hostname.endswith(f".{base}"):
        subdomain_part = hostname[: -len(f".{base}")]
        parts = subdomain_part.split(".")
        if parts and parts[-1] not in ("api", "www", "app"):
            return parts[-1]

    # Generic dot split fallback (e.g. tenant.domain.com)
    parts = hostname.split(".")
    if len(parts) >= 3 and parts[0] not in ("www", "api", "app"):
        return parts[0]

    return None

def get_subdomain_from_request(request: Request) -> Optional[str]:
    # 1. First check explicit header (vital for local API testing, curl, Postman, Next.js proxy)
    header_subdomain = request.headers.get("X-Tenant-Subdomain")
    if header_subdomain:
        return header_subdomain.strip().lower()

    # 2. Check Host header
    host = request.headers.get("host", "")
    subdomain = extract_subdomain_from_host(host)
    if subdomain:
        return subdomain

    # 3. Check X-Forwarded-Host if behind a reverse proxy like Traefik
    forwarded_host = request.headers.get("X-Forwarded-Host", "")
    if forwarded_host:
        subdomain = extract_subdomain_from_host(forwarded_host)
        if subdomain:
            return subdomain

    return None

async def get_tenant_by_subdomain(subdomain: str, session: Optional[AsyncSession] = None) -> Tenant:
    cleaned = subdomain.strip().lower()
    now_monotonic = time.monotonic()

    # Fast path: check in-memory cache if no explicit session was requested
    if not session and cleaned in _tenant_cache:
        cached_tenant, expire_at = _tenant_cache[cleaned]
        if now_monotonic < expire_at:
            now = datetime.now(timezone.utc)
            if cached_tenant.status == "SUSPENDED":
                raise TenantInactiveException(cleaned)
            if cached_tenant.status == "PAST_DUE":
                if cached_tenant.grace_period_until and now > cached_tenant.grace_period_until:
                    raise TenantInactiveException(cleaned)
            elif cached_tenant.status != "ACTIVE":
                raise TenantInactiveException(cleaned)
            return cached_tenant

    async def _query(s: AsyncSession) -> Optional[Tenant]:
        result = await s.execute(
            select(Tenant)
            .options(selectinload(Tenant.plan).selectinload(Plan.entitlements))
            .where(Tenant.subdomain == cleaned)
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

    now = datetime.now(timezone.utc)
    if tenant.status == "SUSPENDED":
        raise TenantInactiveException(cleaned)
    if tenant.status == "PAST_DUE":
        if tenant.grace_period_until and now > tenant.grace_period_until:
            raise TenantInactiveException(cleaned)
    elif tenant.status != "ACTIVE":
        raise TenantInactiveException(cleaned)

    # Store in fast cache
    if not session:
        _tenant_cache[cleaned] = (tenant, now_monotonic + TENANT_CACHE_TTL_SECONDS)

    return tenant

