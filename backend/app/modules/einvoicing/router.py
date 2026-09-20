from typing import List
from fastapi import APIRouter, Depends, status
from app.tenant_db.session import get_tenant_db
from app.auth.dependencies import require_permission
from app.modules.einvoicing import schemas, service

router = APIRouter(prefix="/einvoicing", tags=["E-Invoicing"])

def map_einvoice_response(rec) -> schemas.EInvoiceResponse:
    resp = schemas.EInvoiceResponse.model_validate(rec)
    if rec.voucher:
        resp.voucher_number = rec.voucher.voucher_number
        resp.party_name = rec.voucher.party_name
        resp.net_amount = rec.voucher.net_amount
    return resp


@router.post("/generate-irn", response_model=schemas.EInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def generate_irn(
    data: schemas.GenerateIRNRequest,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("einvoicing", "generate_irn", "create")),
):
    record = await service.generate_irn_for_voucher(session, data)
    return map_einvoice_response(record)


@router.get("/irn-list", response_model=List[schemas.EInvoiceResponse])
async def list_irns(
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("einvoicing", "irn_list", "view")),
):
    records = await service.get_irn_list(session)
    return [map_einvoice_response(r) for r in records]


@router.post("/cancel-irn", response_model=schemas.EInvoiceResponse)
async def cancel_irn(
    data: schemas.CancelIRNRequest,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("einvoicing", "cancel_irn", "edit")),
):
    record = await service.cancel_irn(session, data)
    return map_einvoice_response(record)


@router.get("/irn/{irn}", response_model=schemas.EInvoiceResponse)
async def get_einvoice(
    irn: str,
    session: AsyncSession = Depends(get_tenant_db),
    _perm: bool = Depends(require_permission("einvoicing", "irn_list", "view")),
):
    record = await service.get_einvoice_by_irn(session, irn)
    return map_einvoice_response(record)


@router.get("/taxpayer/{gstin}", response_model=schemas.TaxpayerDetailsResponse)
async def get_taxpayer_details(
    gstin: str,
    _perm: bool = Depends(require_permission("einvoicing", "taxpayer", "view")),
):
    data = await service.get_taxpayer_details(gstin)
    return schemas.TaxpayerDetailsResponse(**data)
