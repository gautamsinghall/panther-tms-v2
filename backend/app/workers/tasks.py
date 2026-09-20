import io
import csv
import json
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, Optional
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.database import get_tenant_session_maker

logger = logging.getLogger("panther.workers")

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

async def get_redis_client() -> aioredis.Redis:
    return aioredis.from_url(f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}", decode_responses=True)

async def process_async_job(ctx: Dict[str, Any], tenant_subdomain: str, job_type: str, payload: Dict[str, Any]):
    """
    Base worker job execution handler.
    Always receives explicit `tenant_subdomain` per rules.md §3:
    'Any new background job must carry tenant context explicitly (don't rely on ambient/global state).'
    """
    logger.info(f"Processing worker job [{job_type}] for tenant [{tenant_subdomain}] with payload: {payload}")
    return {"status": "completed", "tenant": tenant_subdomain, "job_type": job_type}

async def generate_report_export_job(
    ctx: Optional[Dict[str, Any]],
    tenant_subdomain: str,
    job_id: str,
    report_name: str,
    export_format: str,
    filters: Optional[Dict[str, Any]] = None,
):
    """
    Background Arq worker task for generating heavy CSV/JSON report exports
    without blocking synchronous FastAPI request threads (architecture.md §8).
    """
    logger.info(f"Starting export job {job_id} for tenant {tenant_subdomain}: {report_name} ({export_format})")
    r = await get_redis_client()
    filters = filters or {}

    try:
        # Update status to PROCESSING
        meta = {
            "job_id": job_id,
            "report_name": report_name,
            "format": export_format,
            "status": "PROCESSING",
            "created_at": datetime.now().isoformat(),
            "row_count": 0,
            "error_message": None,
        }
        await r.set(f"export:{job_id}:meta", json.dumps(meta))

        db_name = f"panther_tenant_{tenant_subdomain}"
        session_factory = get_tenant_session_maker(db_name)

        async with session_factory() as session:
            csv_output = io.StringIO()
            writer = csv.writer(csv_output)
            row_count = 0

            # Import services dynamically
            from app.modules.reports import service as rep_service
            from app.modules.statements import service as st_service

            from_d = date.fromisoformat(filters["from_date"]) if filters.get("from_date") else None
            to_d = date.fromisoformat(filters["to_date"]) if filters.get("to_date") else None

            if report_name == "daybook":
                res = await rep_service.get_daybook(session, from_date=from_d, to_date=to_d)
                writer.writerow(["ID", "Voucher Number", "Type", "Date", "Account", "Party", "Debit", "Credit", "Narration"])
                for e in res.entries:
                    writer.writerow([e.id, e.voucher_number, e.voucher_type, e.entry_date, e.account_name, e.party_name or "", e.debit_amount, e.credit_amount, e.narration or ""])
                row_count = len(res.entries)

            elif report_name == "ledger":
                acc_id = int(filters.get("account_id", 1))
                res = await rep_service.get_account_ledger(session, account_id=acc_id, from_date=from_d, to_date=to_d)
                writer.writerow(["Entry Date", "Voucher No", "Type", "Party", "Debit", "Credit", "Running Balance", "Type", "Narration"])
                for t in res.transactions:
                    writer.writerow([t.entry_date, t.voucher_number, t.voucher_type, t.party_name or "", t.debit_amount, t.credit_amount, t.running_balance, t.running_balance_type, t.narration or ""])
                row_count = len(res.transactions)

            elif report_name == "trial-balance":
                res = await rep_service.get_trial_balance(session, as_of_date=to_d)
                writer.writerow(["Primary Group", "Group", "Account Code", "Account Name", "Debit", "Credit"])
                for pg in res.primary_groups:
                    for g in pg.groups:
                        for a in g.accounts:
                            writer.writerow([pg.primary_group_name, g.group_name, a.account_code, a.account_name, a.debit_balance, a.credit_balance])
                            row_count += 1

            elif report_name == "sales-register":
                res = await rep_service.get_sales_register(session, from_date=from_d, to_date=to_d)
                writer.writerow(["Voucher Number", "Date", "Party Name", "GSTIN", "LR Number", "Taxable Amount", "CGST", "SGST", "IGST", "Total Tax", "Net Amount", "IRN"])
                for inv in res.invoices:
                    writer.writerow([inv.voucher_number, inv.voucher_date, inv.party_name or "", inv.party_gstin or "", inv.lr_number or "", inv.taxable_amount, inv.cgst_amount, inv.sgst_amount, inv.igst_amount, inv.total_tax, inv.net_amount, inv.irn or ""])
                row_count = len(res.invoices)

            elif report_name == "purchase-register":
                res = await rep_service.get_purchase_register(session, from_date=from_d, to_date=to_d)
                writer.writerow(["Voucher Number", "Type", "Date", "Supplier", "Ref No", "Taxable", "CGST", "SGST", "IGST", "Tax", "Net Amount"])
                for p in res.purchases:
                    writer.writerow([p.voucher_number, p.voucher_type, p.voucher_date, p.supplier_name or "", p.reference_number or "", p.taxable_amount, p.cgst_amount, p.sgst_amount, p.igst_amount, p.total_tax, p.net_amount])
                row_count = len(res.purchases)

            elif report_name == "special-report":
                res = await rep_service.get_special_report(session, from_date=from_d, to_date=to_d)
                writer.writerow(["LR Number", "Date", "Consigner", "Origin", "Destination", "Vehicle", "Revenue", "Hire Cost", "Other Cost", "Margin", "Margin %"])
                for t in res.trips:
                    writer.writerow([t.lr_number, t.booking_date, t.consigner_name or "", t.origin or "", t.destination or "", t.vehicle_number or "", t.freight_revenue, t.vehicle_hire_cost, t.other_direct_cost, t.gross_margin, t.margin_percentage])
                row_count = len(res.trips)

            elif report_name == "gst-output":
                res = await st_service.get_gst_output(session, from_date=from_d, to_date=to_d)
                writer.writerow(["Voucher Number", "Date", "Customer", "GSTIN", "POS", "Type", "RCM", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax", "Invoice Value", "IRN"])
                for r_item in res.records:
                    writer.writerow([r_item.voucher_number, r_item.voucher_date, r_item.customer_name or "", r_item.customer_gstin or "", r_item.place_of_supply or "", r_item.invoice_type, r_item.is_rcm, r_item.taxable_value, r_item.cgst_amount, r_item.sgst_amount, r_item.igst_amount, r_item.total_tax, r_item.total_invoice_value, r_item.irn or ""])
                row_count = len(res.records)

            elif report_name == "os-debtor":
                res = await st_service.get_os_debtor(session, as_of_date=to_d)
                writer.writerow(["Debtor Name", "Code", "Current Balance", "0-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Days Overdue"])
                for d in res.debtors:
                    writer.writerow([d.debtor_name, d.debtor_code, d.current_balance, d.bucket_0_30, d.bucket_31_60, d.bucket_61_90, d.bucket_over_90, d.days_overdue])
                row_count = len(res.debtors)

            else:
                # Default generic export
                res = await rep_service.get_daybook(session, from_date=from_d, to_date=to_d)
                writer.writerow(["ID", "Voucher Number", "Date", "Account", "Debit", "Credit"])
                for e in res.entries:
                    writer.writerow([e.id, e.voucher_number, e.entry_date, e.account_name, e.debit_amount, e.credit_amount])
                row_count = len(res.entries)

            csv_data = csv_output.getvalue()

            # Store export data in Redis with 1-hour TTL
            await r.setex(f"export:{job_id}:data", 3600, csv_data)

            # Update meta status to COMPLETED
            meta["status"] = "COMPLETED"
            meta["completed_at"] = datetime.now().isoformat()
            meta["row_count"] = row_count
            meta["download_url"] = f"/api/v1/reports/export-jobs/{job_id}/download"
            await r.setex(f"export:{job_id}:meta", 3600, json.dumps(meta))

            logger.info(f"Export job {job_id} successfully finished with {row_count} rows")
            return meta

    except Exception as e:
        logger.exception(f"Export job {job_id} failed: {e}")
        meta = {
            "job_id": job_id,
            "report_name": report_name,
            "format": export_format,
            "status": "FAILED",
            "created_at": datetime.now().isoformat(),
            "completed_at": datetime.now().isoformat(),
            "row_count": 0,
            "error_message": str(e),
        }
        await r.setex(f"export:{job_id}:meta", 3600, json.dumps(meta))
        return meta
    finally:
        await r.aclose()


class WorkerSettings:
    functions = [process_async_job, generate_report_export_job]
    redis_settings = None
