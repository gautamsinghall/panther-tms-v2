from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.auth.dependencies import require_permission, get_current_user, check_entitlement_limit
from app.core.errors import ForbiddenException
from app.control.models import Tenant
from app.tenant_db.models import User
from app.modules.accounts import schemas, service

router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"],
    dependencies=[Depends(require_permission("accounts", "general", "view"))],
)


def require_accounts_permission(permission: str = "view", feature: Optional[str] = None):
    async def _check(current_user: User = Depends(get_current_user)):
        if current_user.role == "COMPANY_ADMIN":
            return current_user
        if not current_user.custom_role or not current_user.custom_role.permissions:
            raise ForbiddenException(f"Access denied to accounts.{feature or '*'}.{permission}")
        if feature:
            has_perm = any(
                p.module == "accounts" and p.feature == feature and (p.permission == permission or p.permission == "all") and p.is_allowed
                for p in current_user.custom_role.permissions
            )
            if not has_perm:
                raise ForbiddenException(f"Access denied. Missing permission: accounts.{feature}.{permission}")
            return current_user
        return current_user
    return _check


def map_voucher_response(v) -> schemas.VoucherResponse:
    resp = schemas.VoucherResponse.model_validate(v)
    resp.lr_number = v.lr.lr_number if v.lr else None
    resp.hire_challan_number = v.hire_challan.challan_number if v.hire_challan else None
    resp.irn = v.einvoice.irn if v.einvoice else None
    resp.irn_status = v.einvoice.status if v.einvoice else None

    # Map item details
    for idx, itm in enumerate(v.items):
        if idx < len(resp.items):
            resp.items[idx].charge_head_name = itm.charge_head.name if itm.charge_head else None
            resp.items[idx].tax_category_name = itm.tax_category.name if itm.tax_category else None

    # Map ledger entry accounts
    for idx, ent in enumerate(v.ledger_entries):
        if idx < len(resp.ledger_entries):
            resp.ledger_entries[idx].account_name = ent.account.name if ent.account else None

    return resp


@router.get("/vouchers", response_model=List[schemas.VoucherResponse])
async def list_vouchers(
    voucher_type: Optional[str] = Query(None, description="Filter by VoucherType"),
    lr_id: Optional[int] = Query(None, description="Filter by LR ID"),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    vouchers = await service.get_vouchers(session, voucher_type=voucher_type, lr_id=lr_id)
    return [map_voucher_response(v) for v in vouchers]


@router.get("/vouchers/{voucher_id}", response_model=schemas.VoucherResponse)
async def get_voucher(
    voucher_id: int,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    voucher = await service.get_voucher_by_id(session, voucher_id)
    return map_voucher_response(voucher)


@router.post("/vouchers", response_model=schemas.VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_voucher(
    data: schemas.VoucherCreate,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("create")),
):
    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    voucher = await service.post_voucher(session, data)
    return map_voucher_response(voucher)


@router.post("/transport-invoices", response_model=schemas.VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_transport_invoice(
    data: schemas.TransportInvoiceCreate,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("accounts", "transport_invoice", "create")),
):
    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    voucher = await service.create_transport_invoice_from_lr(session, data)
    return map_voucher_response(voucher)


@router.post("/payments/ath", response_model=schemas.VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_ath_payment(
    data: schemas.ATHPaymentCreate,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("accounts", "payment_voucher", "create")),
):
    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    voucher = await service.create_ath_payment(session, data)
    return map_voucher_response(voucher)


@router.post("/payments/bth", response_model=schemas.VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_bth_payment(
    data: schemas.BTHPaymentCreate,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("accounts", "payment_voucher", "create")),
):
    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    voucher = await service.create_bth_payment(session, data)
    return map_voucher_response(voucher)


@router.post("/vouchers/{voucher_id}/void", response_model=schemas.VoucherResponse)
async def void_voucher_endpoint(
    voucher_id: int,
    data: schemas.VoidVoucherRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("edit")),
):
    voucher = await service.void_voucher(session, voucher_id, data, user_id=current_user.id)
    return map_voucher_response(voucher)
