import re
from typing import Optional
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import TenantNotFoundException, TenantInactiveException
from app.control.models import Tenant
from app.core.database import ControlSessionLocal

# In-memory cache for resolved tenants: subdomain -> Tenant dict/model
_tenant_cache = {}

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

    async def _query(s: AsyncSession) -> Optional[Tenant]:
        result = await s.execute(select(Tenant).where(Tenant.subdomain == cleaned))
        return result.scalar_one_or_none()

    tenant: Optional[Tenant] = None
    if session:
        tenant = await _query(session)
    else:
        async with ControlSessionLocal() as s:
            tenant = await _query(s)

    if not tenant:
        raise TenantNotFoundException(cleaned)

    if tenant.status != "ACTIVE":
        raise TenantInactiveException(cleaned)

    return tenant
