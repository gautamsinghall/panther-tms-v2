import uuid
import json
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.control.models import Tenant
from app.tenant_db.models import User
from app.auth.dependencies import get_current_user, require_permission
from app.core.errors import ForbiddenException
from app.modules.reports import schemas, service
from app.workers.tasks import get_redis_client, generate_report_export_job

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(require_permission("reports", "general", "view"))],
)



def require_reports_permission(permission: str = "view", feature: Optional[str] = None):
    async def _check(current_user: User = Depends(get_current_user)):
        if current_user.role == "COMPANY_ADMIN":
            return current_user
        if not current_user.custom_role or not current_user.custom_role.permissions:
            raise ForbiddenException(f"Access denied to reports.{feature or '*'}.{permission}")
        if feature:
            has_perm = any(
                p.module == "reports" and p.feature == feature and (p.permission == permission or p.permission == "all") and p.is_allowed
                for p in current_user.custom_role.permissions
            )
            if not has_perm:
                raise ForbiddenException(f"Access denied. Missing permission: reports.{feature}.{permission}")
            return current_user
        has_any = any(
            p.module == "reports" and (p.permission == permission or p.permission == "all") and p.is_allowed
            for p in current_user.custom_role.permissions
        )
        if not has_any:
            raise ForbiddenException("Access denied to reports module.")
        return current_user
    return _check


@router.get("/daybook", response_model=schemas.DaybookResponse)
async def get_daybook(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    voucher_type: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "daybook")),
):
    return await service.get_daybook(
        session,
        from_date=from_date,
        to_date=to_date,
        voucher_type=voucher_type,
        account_id=account_id,
    )


@router.get("/ledger", response_model=schemas.LedgerResponse)
async def get_account_ledger(
    account_id: int = Query(..., description="ID of the account to view ledger for"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "ledger")),
):
    return await service.get_account_ledger(
        session,
        account_id=account_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/trial-balance", response_model=schemas.TrialBalanceResponse)
async def get_trial_balance(
    as_of_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "trial_balance")),
):
    return await service.get_trial_balance(
        session,
        as_of_date=as_of_date,
    )


@router.get("/profit-loss", response_model=schemas.ProfitLossResponse)
async def get_profit_and_loss(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "profit_loss")),
):
    return await service.get_profit_and_loss(
        session,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/balance-sheet", response_model=schemas.BalanceSheetResponse)
async def get_balance_sheet(
    as_of_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "balance_sheet")),
):
    return await service.get_balance_sheet(
        session,
        as_of_date=as_of_date,
    )


@router.get("/sales-register", response_model=schemas.SalesRegisterResponse)
async def get_sales_register(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "sales_register")),
):
    return await service.get_sales_register(
        session,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/purchase-register", response_model=schemas.PurchaseRegisterResponse)
async def get_purchase_register(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "purchase_register")),
):
    return await service.get_purchase_register(
        session,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/bank-reconciliation", response_model=schemas.BankReconciliationResponse)
async def get_bank_reconciliation(
    bank_account_id: Optional[int] = Query(None),
    as_of_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "bank_reconciliation")),
):
    return await service.get_bank_reconciliation(
        session,
        bank_account_id=bank_account_id,
        as_of_date=as_of_date,
    )


@router.get("/special-report", response_model=schemas.SpecialReportResponse)
async def get_special_report(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_reports_permission("view", "special_report")),
):
    return await service.get_special_report(
        session,
        from_date=from_date,
        to_date=to_date,
    )


# ==============================================================================
# Background Arq Export Endpoints (architecture.md §8)
# ==============================================================================

@router.post("/export", response_model=schemas.ExportJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_report_export(
    data: schemas.ExportJobCreate,
    tenant: Tenant = Depends(get_current_tenant),
    _perm: User = Depends(require_reports_permission("view")),
):
    job_id = f"exp_{uuid.uuid4().hex[:12]}"
    r = await get_redis_client()
    try:
        # Run export worker job asynchronously
        res = await generate_report_export_job(
            ctx=None,
            tenant_subdomain=tenant.subdomain,
            job_id=job_id,
            report_name=data.report_name,
            export_format=data.format,
            filters=data.filters,
        )
        return schemas.ExportJobResponse(**res)
    finally:
        await r.aclose()


@router.get("/export-jobs/{job_id}", response_model=schemas.ExportJobResponse)
async def get_export_job_status(
    job_id: str,
    _perm: User = Depends(require_reports_permission("view")),
):
    r = await get_redis_client()
    try:
        meta_str = await r.get(f"export:{job_id}:meta")
        if not meta_str:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job not found")
        meta = json.loads(meta_str)
        return schemas.ExportJobResponse(**meta)
    finally:
        await r.aclose()


@router.get("/export-jobs/{job_id}/download")
async def download_export_file(
    job_id: str,
    _perm: User = Depends(require_reports_permission("view")),
):
    r = await get_redis_client()
    try:
        data = await r.get(f"export:{job_id}:data")
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export file not ready or expired")
        return Response(
            content=data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={job_id}.csv"},
        )
    finally:
        await r.aclose()
