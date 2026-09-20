from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.tenant_db.session import get_tenant_db
from app.tenant_db.models import User
from app.auth.dependencies import get_current_user, require_permission
from app.core.errors import ForbiddenException
from app.modules.statements import schemas, service

router = APIRouter(
    prefix="/statements",
    tags=["Statements"],
    dependencies=[Depends(require_permission("statements", "general", "view"))],
)



def require_statements_permission(permission: str = "view", feature: Optional[str] = None):
    async def _check(current_user: User = Depends(get_current_user)):
        if current_user.role == "COMPANY_ADMIN":
            return current_user
        if not current_user.custom_role or not current_user.custom_role.permissions:
            raise ForbiddenException(f"Access denied to statements.{feature or '*'}.{permission}")
        if feature:
            has_perm = any(
                p.module == "statements" and p.feature == feature and (p.permission == permission or p.permission == "all") and p.is_allowed
                for p in current_user.custom_role.permissions
            )
            if not has_perm:
                raise ForbiddenException(f"Access denied. Missing permission: statements.{feature}.{permission}")
            return current_user
        has_any = any(
            p.module == "statements" and (p.permission == permission or p.permission == "all") and p.is_allowed
            for p in current_user.custom_role.permissions
        )
        if not has_any:
            raise ForbiddenException("Access denied to statements module.")
        return current_user
    return _check


@router.get("/gst-output", response_model=schemas.GSTOutputResponse)
async def get_gst_output(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_statements_permission("view", "gst_output")),
):
    return await service.get_gst_output(
        session,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/gst-input", response_model=schemas.GSTInputResponse)
async def get_gst_input(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_statements_permission("view", "gst_input")),
):
    return await service.get_gst_input(
        session,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/os-debtor", response_model=schemas.OSDebtorResponse)
async def get_os_debtor(
    as_of_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_statements_permission("view", "os_debtor")),
):
    return await service.get_os_debtor(
        session,
        as_of_date=as_of_date,
    )


@router.get("/os-creditor", response_model=schemas.OSCreditorResponse)
async def get_os_creditor(
    as_of_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_statements_permission("view", "os_creditor")),
):
    return await service.get_os_creditor(
        session,
        as_of_date=as_of_date,
    )


@router.get("/tds-payable", response_model=schemas.TDSPayableResponse)
async def get_tds_payable(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_statements_permission("view", "tds_payable")),
):
    return await service.get_tds_payable(
        session,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/tds-return", response_model=schemas.TDSReturnResponse)
async def get_tds_return(
    quarter: Optional[str] = Query("Q1"),
    financial_year: Optional[str] = Query("2026-27"),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_statements_permission("view", "tds_return")),
):
    return await service.get_tds_return(
        session,
        quarter=quarter,
        financial_year=financial_year,
    )


@router.get("/opening-balance", response_model=schemas.OpeningBalanceResponse)
async def get_opening_balance_details(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_statements_permission("view", "opening_balance")),
):
    return await service.get_opening_balance_details(session)
