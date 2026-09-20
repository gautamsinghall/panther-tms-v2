from typing import AsyncGenerator
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_tenant_session_maker
from app.core.errors import TenantNotFoundException
from app.core.tenancy import get_subdomain_from_request, get_tenant_by_subdomain
from app.control.models import Tenant

async def get_current_tenant(request: Request) -> Tenant:
    subdomain = get_subdomain_from_request(request)
    if not subdomain:
        raise TenantNotFoundException(subdomain="<missing-subdomain>")
    
    tenant = await get_tenant_by_subdomain(subdomain)
    # Stash in request state for downstream handlers
    request.state.tenant = tenant
    request.state.tenant_subdomain = tenant.subdomain
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
