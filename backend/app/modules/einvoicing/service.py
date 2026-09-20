from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.tenant_db.models import Voucher, EInvoiceRecord, EInvoiceStatus
from app.modules.einvoicing.schemas import GenerateIRNRequest, CancelIRNRequest
from app.modules.einvoicing.provider import get_gsp_provider


async def generate_irn_for_voucher(
    session: AsyncSession,
    data: GenerateIRNRequest,
) -> EInvoiceRecord:
    # 1. Fetch voucher
    stmt = select(Voucher).options(selectinload(Voucher.einvoice)).where(Voucher.id == data.voucher_id)
    res = await session.execute(stmt)
    voucher = res.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice voucher not found")
    if voucher.is_void:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot generate IRN for a voided invoice")

    # 2. Check if already generated
    if voucher.einvoice and voucher.einvoice.status == EInvoiceStatus.GENERATED.value:
        return voucher.einvoice

    # 3. Call GSP Provider
    provider = get_gsp_provider()
    payload = {
        "doc_num": voucher.voucher_number,
        "doc_type": "INV",
        "fin_year": f"{voucher.voucher_date.year}-{str(voucher.voucher_date.year + 1)[-2:]}",
        "supplier_gstin": data.supplier_gstin or "27AABCP1234F1Z5",
        "buyer_gstin": data.buyer_gstin,
        "total_amount": float(voucher.total_amount),
        "tax_amount": float(voucher.tax_amount),
        "net_amount": float(voucher.net_amount),
    }
    result = await provider.generate_irn(payload)

    # 4. Save E-Invoice Record
    ack_dt = datetime.fromisoformat(result["ack_date"]) if "T" in result["ack_date"] else datetime.now(timezone.utc)

    if voucher.einvoice:
        einvoice = voucher.einvoice
        einvoice.irn = result["irn"]
        einvoice.ack_number = result["ack_number"]
        einvoice.ack_date = ack_dt
        einvoice.signed_invoice = result.get("signed_invoice")
        einvoice.signed_qr_code = result.get("signed_qr_code")
        einvoice.status = EInvoiceStatus.GENERATED.value
        einvoice.taxpayer_gstin = result.get("supplier_gstin")
        einvoice.legal_name = result.get("legal_name")
        einvoice.trade_name = result.get("trade_name")
    else:
        einvoice = EInvoiceRecord(
            voucher_id=voucher.id,
            irn=result["irn"],
            ack_number=result["ack_number"],
            ack_date=ack_dt,
            signed_invoice=result.get("signed_invoice"),
            signed_qr_code=result.get("signed_qr_code"),
            status=EInvoiceStatus.GENERATED.value,
            taxpayer_gstin=result.get("supplier_gstin"),
            legal_name=result.get("legal_name"),
            trade_name=result.get("trade_name"),
        )
        session.add(einvoice)

    await session.commit()
    stmt = select(EInvoiceRecord).options(selectinload(EInvoiceRecord.voucher)).where(EInvoiceRecord.id == einvoice.id)
    res = await session.execute(stmt)
    return res.scalar_one()


async def get_irn_list(session: AsyncSession) -> List[EInvoiceRecord]:
    stmt = select(EInvoiceRecord).options(selectinload(EInvoiceRecord.voucher)).order_by(EInvoiceRecord.id.desc())
    res = await session.execute(stmt)
    return list(res.scalars().all())


async def get_einvoice_by_irn(session: AsyncSession, irn: str) -> EInvoiceRecord:
    stmt = select(EInvoiceRecord).options(selectinload(EInvoiceRecord.voucher)).where(EInvoiceRecord.irn == irn)
    res = await session.execute(stmt)
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"E-Invoice with IRN '{irn}' not found")
    return record


async def cancel_irn(session: AsyncSession, data: CancelIRNRequest) -> EInvoiceRecord:
    record = await get_einvoice_by_irn(session, data.irn)
    if record.status == EInvoiceStatus.CANCELLED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="IRN is already cancelled")

    provider = get_gsp_provider()
    await provider.cancel_irn(data.irn, data.cancel_reason, data.cancel_remarks or "")

    record.status = EInvoiceStatus.CANCELLED.value
    record.cancel_reason = data.cancel_reason
    record.cancel_remarks = data.cancel_remarks
    record.cancelled_at = datetime.now(timezone.utc)

    await session.commit()
    stmt = select(EInvoiceRecord).options(selectinload(EInvoiceRecord.voucher)).where(EInvoiceRecord.id == record.id)
    res = await session.execute(stmt)
    return res.scalar_one()


async def get_taxpayer_details(gstin: str) -> dict:
    if not gstin or len(gstin.strip()) < 15:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid 15-character GSTIN")
    provider = get_gsp_provider()
    return await provider.get_taxpayer_details(gstin)
