from typing import AsyncGenerator
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_tenant_session_maker
from app.core.errors import TenantNotFoundException
from app.core.tenancy import get_tenant_id_from_request, get_tenant_by_id, get_tenant_by_company_code
from app.control.models import Tenant

async def get_current_tenant(request: Request) -> Tenant:
    tenant_identifier = get_tenant_id_from_request(request)
    if not tenant_identifier:
        raise TenantNotFoundException("<missing-tenant-id>")
    
    # Try resolving by tenant_id first, fallback to company_code
    try:
        tenant = await get_tenant_by_id(tenant_identifier)
    except Exception:
        tenant = await get_tenant_by_company_code(tenant_identifier)

    # Stash in request state for downstream handlers
    request.state.tenant = tenant
    request.state.tenant_id = tenant.tenant_id
    request.state.company_code = tenant.company_code
    request.state.tenant_db_name = tenant.db_name
    return tenant

async def get_tenant_db(
    tenant: Tenant = Depends(get_current_tenant)
) -> AsyncGenerator[AsyncSession, None]:
    session_maker = get_tenant_session_maker(tenant.db_name)
    async with session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
