from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.session import get_tenant_db, get_current_tenant
from app.auth.dependencies import (
    require_permission, get_current_user, get_current_office, check_entitlement_limit
)
from app.core.errors import ForbiddenException
from app.control.models import Tenant
from app.tenant_db.models import User, Branch
from app.modules.accounts import schemas, service, master_ledger_service
from app.services.activity_logger import log_activity

router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"],
    dependencies=[Depends(require_permission("accounts", "general", "view"))],
)


VOUCHER_TYPE_TO_FEATURE = {
    "TRANSPORT_INVOICE": "transport_invoice",
    "GENERAL_INVOICE": "general_invoice",
    "RECEIPT_VOUCHER": "receipt_voucher",
    "PAYMENT_VOUCHER": "payment_voucher",
    "PAYMENT_ATH": "payment_voucher",
    "ATH_PAYMENT": "payment_voucher",
    "PAYMENT_BTH": "payment_voucher",
    "BTH_PAYMENT": "payment_voucher",
    "PROFORMA_INVOICE": "proforma_invoice",
    "CONTRA_VOUCHER": "contra_voucher",
    "CREDIT_NOTE": "credit_debit_notes",
    "DEBIT_NOTE": "credit_debit_notes",
}


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
        has_any = any(
            p.module == "accounts" and (p.permission == permission or p.permission == "all") and p.is_allowed
            for p in current_user.custom_role.permissions
        )
        if not has_any:
            raise ForbiddenException(f"Access denied. Missing permission: accounts.*.{permission}")
        return current_user
    return _check


def map_voucher_response(v) -> schemas.VoucherResponse:
    resp = schemas.VoucherResponse.model_validate(v)
    resp.lr_number = v.lr.lr_number if v.lr else None
    resp.hire_challan_number = v.hire_challan.challan_number if v.hire_challan else None
    resp.irn = v.einvoice.irn if v.einvoice else None
    resp.irn_status = v.einvoice.status if v.einvoice else None
    resp.issuing_office_id = v.issuing_office_id
    resp.issuing_office_name = v.issuing_office.name if getattr(v, "issuing_office", None) else None
    resp.billing_client_name = v.billing_client.name if getattr(v, "billing_client", None) else None
    resp.vendor_name = v.vendor.name if getattr(v, "vendor", None) else None
    resp.driver_name = v.driver.name if getattr(v, "driver", None) else None

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
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "COMPANY_ADMIN":
        if not current_user.custom_role or not current_user.custom_role.permissions:
            raise ForbiddenException("Access denied to accounts.vouchers.view")
        
        target_feat = VOUCHER_TYPE_TO_FEATURE.get(voucher_type.upper()) if voucher_type else None
        if target_feat:
            has_perm = any(
                p.module == "accounts"
                and p.feature == target_feat
                and (p.permission in ("view", "all"))
                and p.is_allowed
                for p in current_user.custom_role.permissions
            )
            if not has_perm:
                raise ForbiddenException(f"Access denied. Missing permission: accounts.{target_feat}.view")
        else:
            has_any = any(
                p.module == "accounts"
                and (p.permission in ("view", "all"))
                and p.is_allowed
                for p in current_user.custom_role.permissions
            )
            if not has_any:
                raise ForbiddenException("Access denied. Missing permission in accounts.")

    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    vouchers = await service.get_vouchers(
        session,
        voucher_type=voucher_type,
        lr_id=lr_id,
        office_id=office_id,
        include_unassigned=include_unassigned,
    )
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
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "COMPANY_ADMIN":
        if not current_user.custom_role or not current_user.custom_role.permissions:
            raise ForbiddenException("Access denied to accounts.vouchers.create")
        
        target_feat = VOUCHER_TYPE_TO_FEATURE.get(data.voucher_type.upper(), "general_invoice")
        has_perm = any(
            p.module == "accounts"
            and p.feature == target_feat
            and (p.permission in ("create", "all"))
            and p.is_allowed
            for p in current_user.custom_role.permissions
        )
        if not has_perm:
            raise ForbiddenException(f"Access denied. Missing permission: accounts.{target_feat}.create")

    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    office_id = current_office.id if current_office else None
    voucher = await service.post_voucher(session, data, office_id=office_id)
    await log_activity(
        db=session,
        user=current_user,
        action="VOUCHER_CREATED",
        module="accounts",
        entity_type="Voucher",
        entity_id=str(voucher.id),
        entity_identifier=voucher.voucher_number,
        office_id=voucher.issuing_office_id or office_id,
        office_name=current_office.name if current_office else None,
        office_code=current_office.code if current_office else None,
        details_json={
            "voucher_number": voucher.voucher_number,
            "voucher_type": voucher.voucher_type,
            "total_amount": float(voucher.total_amount or 0),
            "party_name": voucher.party_name,
        },
    )
    return map_voucher_response(voucher)


@router.post("/transport-invoices", response_model=schemas.VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_transport_invoice(
    data: schemas.TransportInvoiceCreate,
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(require_permission("accounts", "transport_invoice", "create")),
):
    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    office_id = current_office.id if current_office else None
    voucher = await service.create_transport_invoice_from_lr(session, data, office_id=office_id)
    await log_activity(
        db=session,
        user=current_user,
        action="INVOICE_CREATED",
        module="accounts",
        entity_type="Voucher",
        entity_id=str(voucher.id),
        entity_identifier=voucher.voucher_number,
        office_id=voucher.issuing_office_id or office_id,
        office_name=current_office.name if current_office else None,
        office_code=current_office.code if current_office else None,
        details_json={
            "voucher_number": voucher.voucher_number,
            "total_amount": float(voucher.total_amount or 0),
            "lr_id": data.lr_id,
        },
    )
    return map_voucher_response(voucher)


@router.post("/payments/ath", response_model=schemas.VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_ath_payment(
    data: schemas.ATHPaymentCreate,
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(require_permission("accounts", "payment_voucher", "create")),
):
    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    office_id = current_office.id if current_office else None
    voucher = await service.create_ath_payment(session, data, office_id=office_id)
    await log_activity(
        db=session,
        user=current_user,
        action="PAYMENT_VOUCHER_CREATED",
        module="accounts",
        entity_type="Voucher",
        entity_id=str(voucher.id),
        entity_identifier=voucher.voucher_number,
        office_id=voucher.issuing_office_id or office_id,
        details_json={
            "voucher_number": voucher.voucher_number,
            "voucher_type": "ATH",
            "amount": float(data.amount or 0),
            "lr_id": data.lr_id,
        },
    )
    return map_voucher_response(voucher)


@router.post("/payments/bth", response_model=schemas.VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_bth_payment(
    data: schemas.BTHPaymentCreate,
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(require_permission("accounts", "payment_voucher", "create")),
):
    await check_entitlement_limit(tenant, session, "max_vouchers_per_month")
    office_id = current_office.id if current_office else None
    voucher = await service.create_bth_payment(session, data, office_id=office_id)
    await log_activity(
        db=session,
        user=current_user,
        action="PAYMENT_VOUCHER_CREATED",
        module="accounts",
        entity_type="Voucher",
        entity_id=str(voucher.id),
        entity_identifier=voucher.voucher_number,
        office_id=voucher.issuing_office_id or office_id,
        details_json={
            "voucher_number": voucher.voucher_number,
            "voucher_type": "BTH",
            "amount": float(data.amount or 0),
            "lr_id": data.lr_id,
        },
    )
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
    await log_activity(
        db=session,
        user=current_user,
        action="VOUCHER_VOIDED",
        module="accounts",
        entity_type="Voucher",
        entity_id=str(voucher.id),
        entity_identifier=voucher.voucher_number,
        office_id=voucher.issuing_office_id,
        details=f"Voided voucher {voucher.voucher_number}: {data.reason}",
        details_json={"reason": data.reason},
    )
    return map_voucher_response(voucher)


# ==============================================================================
# Master Ledger Endpoints (Accounts -> Master Ledger)
# ==============================================================================

@router.get("/master-ledger/summary", response_model=schemas.MasterLedgerOverviewResponse)
async def get_master_ledger_summary(
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    """
    Overview financial metrics for Billing Clients, Vendors, and Drivers categories.
    """
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await master_ledger_service.get_master_ledger_summary(
        session, office_id=office_id, include_unassigned=include_unassigned
    )


@router.get("/master-ledger/billing-clients", response_model=List[schemas.BillingClientLedgerListItem])
async def list_billing_client_ledgers(
    search: Optional[str] = Query(None, description="Search client name, code, phone, gstin"),
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    """
    List all billing clients with opening balance, total debits, total credits,
    and current outstanding receivables.
    """
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await master_ledger_service.list_billing_client_ledgers(
        session, office_id=office_id, include_unassigned=include_unassigned, search=search
    )


@router.get("/master-ledger/billing-clients/{client_id}", response_model=schemas.DetailedLedgerResponse)
async def get_billing_client_ledger_detail(
    client_id: int,
    from_date: Optional[date] = Query(None, description="Start date of statement"),
    to_date: Optional[date] = Query(None, description="End date of statement"),
    search: Optional[str] = Query(None, description="Search voucher or reference number"),
    tx_type: Optional[str] = Query(None, description="Filter voucher type"),
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    """
    Detailed chronological ledger statement for an individual billing client.
    """
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await master_ledger_service.get_billing_client_ledger_detail(
        session,
        client_id=client_id,
        from_date=from_date,
        to_date=to_date,
        search=search,
        tx_type=tx_type,
        office_id=office_id,
        include_unassigned=include_unassigned,
    )


@router.get("/master-ledger/vendors", response_model=List[schemas.VendorLedgerListItem])
async def list_vendor_ledgers(
    search: Optional[str] = Query(None, description="Search vendor name, phone, gstin, pan"),
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    """
    List all vendors with opening balance, total debits, total credits,
    and outstanding payables.
    """
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await master_ledger_service.list_vendor_ledgers(
        session, office_id=office_id, include_unassigned=include_unassigned, search=search
    )


@router.get("/master-ledger/vendors/{vendor_id}", response_model=schemas.DetailedLedgerResponse)
async def get_vendor_ledger_detail(
    vendor_id: int,
    from_date: Optional[date] = Query(None, description="Start date of statement"),
    to_date: Optional[date] = Query(None, description="End date of statement"),
    search: Optional[str] = Query(None, description="Search voucher or reference number"),
    tx_type: Optional[str] = Query(None, description="Filter transaction type"),
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    """
    Detailed chronological ledger statement for an individual vendor.
    """
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await master_ledger_service.get_vendor_ledger_detail(
        session,
        vendor_id=vendor_id,
        from_date=from_date,
        to_date=to_date,
        search=search,
        tx_type=tx_type,
        office_id=office_id,
        include_unassigned=include_unassigned,
    )


@router.get("/master-ledger/drivers", response_model=List[schemas.DriverLedgerListItem])
async def list_driver_ledgers(
    search: Optional[str] = Query(None, description="Search driver name, phone, license"),
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    """
    List all drivers with opening balance, total advances, total settled expenses,
    and current recoverable / payable balance.
    """
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await master_ledger_service.list_driver_ledgers(
        session, office_id=office_id, include_unassigned=include_unassigned, search=search
    )


@router.get("/master-ledger/drivers/{driver_id}", response_model=schemas.DetailedLedgerResponse)
async def get_driver_ledger_detail(
    driver_id: int,
    from_date: Optional[date] = Query(None, description="Start date of statement"),
    to_date: Optional[date] = Query(None, description="End date of statement"),
    search: Optional[str] = Query(None, description="Search reference or particulars"),
    tx_type: Optional[str] = Query(None, description="Filter transaction type"),
    current_office: Optional[Branch] = Depends(get_current_office),
    session: AsyncSession = Depends(get_tenant_db),
    _perm: User = Depends(require_accounts_permission("view")),
):
    """
    Detailed chronological ledger statement for an individual driver.
    """
    office_id = current_office.id if current_office else None
    include_unassigned = current_office.is_head_office if current_office else True
    return await master_ledger_service.get_driver_ledger_detail(
        session,
        driver_id=driver_id,
        from_date=from_date,
        to_date=to_date,
        search=search,
        tx_type=tx_type,
        office_id=office_id,
        include_unassigned=include_unassigned,
    )


