from typing import Any, Dict
import logging

logger = logging.getLogger("panther.workers")

async def process_async_job(ctx: Dict[str, Any], tenant_subdomain: str, job_type: str, payload: Dict[str, Any]):
    """
    Base worker job execution handler.
    Always receives explicit `tenant_subdomain` per rules.md §3:
    'Any new background job must carry tenant context explicitly (don't rely on ambient/global state).'
    """
    logger.info(f"Processing worker job [{job_type}] for tenant [{tenant_subdomain}] with payload: {payload}")
    return {"status": "completed", "tenant": tenant_subdomain, "job_type": job_type}

class WorkerSettings:
    functions = [process_async_job]
    redis_settings = None  # Configured via core settings
