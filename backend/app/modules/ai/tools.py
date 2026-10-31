"""
Panther AI Operational Tools (Read-Only).
Implements secure, allowlisted, read-only TMS queries for LRs, Vehicles, Drivers, Tracking, and Accounts.
Strictly enforces tenant isolation, office isolation, plan entitlements, and RBAC permissions.
"""
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Dict, Any, Tuple
import re

from sqlalchemy import select, or_, and_, desc, cast, String
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.control.models import Tenant
from app.tenant_db.models import (
    User,
    Branch,
    LR,
    Job,
    BillingClient,
    Vendor,
    CompanyVehicle,
    MarketVehicle,
    Driver,
    FastagTripRecord,
    SIMTripRecord,
    TrackingPing,
    Account,
    HireChallan,
)
from app.modules.ai.schemas import StructuredCard
from app.auth.dependencies import _matches_permission
from app.modules.transport.service import (
    clean_vehicle_number,
    get_all_lrs,
    search_lrs,
    get_all_company_vehicles,
    get_all_market_vehicles,
    get_all_drivers,
    list_fastag_trips,
    get_sim_trips,
    track_gps_single_vehicle,
)
from app.modules.general.service import (
    list_billing_clients,
    list_vendors,
)
from app.modules.accounts.master_ledger_service import (
    get_master_ledger_summary,
    list_billing_client_ledgers,
    list_vendor_ledgers,
    list_driver_ledgers,
)

# Vehicle regex matching Indian registration plates (e.g. UP16AB1234, DL-01-AB-1234, MH 12 DE 1432)
VEHICLE_REGEX = re.compile(
    r"\b([A-Z]{2}[-\s]?[0-9]{1,2}(?:[-\s]?[A-Z]{1,3})?[-\s]?[0-9]{3,4})\b",
    re.IGNORECASE,
)


def extract_vehicle_number(text: str) -> Optional[str]:
    """Extracts and normalizes a vehicle registration number from text."""
    match = VEHICLE_REGEX.search(text)
    if match:
        return re.sub(r"[\s-]", "", match.group(1)).upper()
    return None


def is_user_permitted(
    user: User,
    tenant: Tenant,
    module: str,
    feature: str,
    permission: str = "view",
) -> bool:
    """
    Validates tenant subscription, plan entitlements, and user RBAC permissions.
    Reuses the unified authorization logic from auth/dependencies.py.
    """
    if not tenant or not user:
        return False

    # 1. Tenant Status Check
    if tenant.status == "SUSPENDED":
        return False
    if tenant.status == "PAST_DUE" and tenant.grace_period_until:
        if datetime.now(timezone.utc) > tenant.grace_period_until:
            return False

    # 2. Plan Entitlement Check
    norm_mod = module.replace("-", "_").lower()
    module_key = f"module_{norm_mod}"
    feat_key = f"feature_{feature.replace('-', '_').lower()}"

    if tenant.plan and tenant.plan.entitlements:
        if norm_mod not in ("home", "profile", "company", "api_center", "api-center", "settings"):
            is_entitled = False
            for ent in tenant.plan.entitlements:
                if ent.feature_key in (module_key, "module_all") and ent.is_enabled:
                    if str(ent.limit_value).lower() in ("true", "1", "yes"):
                        is_entitled = True
                        break
            if not is_entitled:
                return False

            for ent in tenant.plan.entitlements:
                if ent.feature_key == feat_key and ent.is_enabled:
                    if str(ent.limit_value).lower() in ("false", "0", "no"):
                        return False

    # 3. User RBAC Check
    user_role = (user.role or "").upper().strip()
    if user_role in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
        return True

    if not user.custom_role or not user.custom_role.permissions:
        return False

    return any(
        _matches_permission(
            req_mod=module,
            req_feat=feature,
            req_perm=permission,
            p_mod=p.module,
            p_feat=p.feature,
            p_perm=p.permission,
            p_allowed=p.is_allowed,
        )
        for p in user.custom_role.permissions
    )


def get_effective_office_id(user: User, current_office: Optional[Branch]) -> Optional[int]:
    """
    Resolves the office ID for branch isolation.
    Company Admin can view all offices if current_office is None.
    Employees are strictly locked to their active office. If not set, returns -1.
    """
    user_role = (user.role or "").upper().strip()
    if user_role in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
        return current_office.id if current_office else None
    return current_office.id if current_office else -1


# ==============================================================================
# READ-ONLY TMS TOOLS
# ==============================================================================

async def execute_lr_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch],
    query: Optional[str] = None,
    vehicle_number: Optional[str] = None,
    status_filter: Optional[str] = None,
    is_detail: bool = False,
    limit: int = 5,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """
    Retrieves authorized LR/GR records. When a specific LR is queried (by number or ID)
    or when details are requested, returns the complete operational, cargo, commercial,
    and telematics breakdown for that consignment.
    """
    if not is_user_permitted(user, tenant, "transport", "lr_booking", "view"):
        msg = (
            "Aapke paas LR records dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view LR records."
        )
        card = StructuredCard(
            card_type="lr_detail" if is_detail else "lr_list",
            title="LR Access Restricted",
            subtitle="Missing permission: transport.lr_booking.view",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    eff_office_id = get_effective_office_id(user, current_office)
    if eff_office_id == -1:
        msg = (
            "Aapka koi active branch assign nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have an active branch assigned."
        )
        card = StructuredCard(
            card_type="lr_detail" if is_detail else "lr_list",
            title="Consignment Notes (LRs)",
            subtitle="No active branch assigned to your user account",
            badge={"text": "0 Results", "variant": "neutral"},
            items=[],
            action={"label": "View LRs", "href": "/transport/lr-booking"},
        )
        return msg, [card]

    search_term = query or vehicle_number
    clean_term = None
    if search_term:
        clean_term = re.sub(r"^(?:lr|gr|bilty|number|no\.?|#|[\s\-_])+", "", search_term, flags=re.IGNORECASE).strip()

    lrs = []
    if search_term:
        pattern = f"%{clean_term or search_term}%"
        stmt = (
            select(LR)
            .options(
                selectinload(LR.consigner),
                selectinload(LR.consignee),
                selectinload(LR.origin_location),
                selectinload(LR.destination_location),
                selectinload(LR.billing_customer),
                selectinload(LR.hire_challan),
                selectinload(LR.pod_record),
                selectinload(LR.issuing_office),
                selectinload(LR.packing_method),
            )
            .where(
                or_(
                    LR.lr_number.ilike(pattern),
                    LR.lr_number.ilike(f"%{search_term}%"),
                    LR.vehicle_number.ilike(pattern),
                    LR.invoice_no.ilike(pattern),
                    cast(LR.id, String) == (clean_term or search_term),
                )
            )
            .order_by(desc(LR.lr_date), desc(LR.id))
            .limit(limit)
        )
        if eff_office_id and eff_office_id != -1:
            stmt = stmt.where(or_(LR.issuing_office_id == eff_office_id, LR.issuing_office_id.is_(None)))
        res = await db.execute(stmt)
        lrs = list(res.scalars().unique().all())

        # Fallback without branch constraint for admins
        if not lrs and (user.role or "").upper() in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
            stmt_all = (
                select(LR)
                .options(
                    selectinload(LR.consigner),
                    selectinload(LR.consignee),
                    selectinload(LR.origin_location),
                    selectinload(LR.destination_location),
                    selectinload(LR.billing_customer),
                    selectinload(LR.hire_challan),
                    selectinload(LR.pod_record),
                    selectinload(LR.issuing_office),
                    selectinload(LR.packing_method),
                )
                .where(
                    or_(
                        LR.lr_number.ilike(pattern),
                        LR.lr_number.ilike(f"%{search_term}%"),
                        LR.vehicle_number.ilike(pattern),
                        cast(LR.id, String) == (clean_term or search_term),
                    )
                )
                .order_by(desc(LR.lr_date), desc(LR.id))
                .limit(limit)
            )
            res_all = await db.execute(stmt_all)
            lrs = list(res_all.scalars().unique().all())
    else:
        lrs = await get_all_lrs(
            db=db,
            office_id=eff_office_id,
            include_unassigned=False,
            limit=limit,
        )

    if status_filter:
        lrs = [lr for lr in lrs if (lr.status or "").lower() == status_filter.lower()]

    if not lrs:
        msg = (
            f"Koi LR record nahi mila{' search: ' + search_term if search_term else ''}."
            if lang in ("hinglish", "hi_devanagari")
            else f"No LR records found{' matching ' + search_term if search_term else ''}."
        )
        card = StructuredCard(
            card_type="lr_detail" if is_detail else "lr_list",
            title="Consignment Notes (LRs)",
            subtitle="No matching records found in active office scope",
            badge={"text": "0 Results", "variant": "neutral"},
            action={"label": "Open LR Booking", "href": "/transport/lr-booking"},
        )
        return msg, [card]

    office_label = current_office.name if current_office else "All Offices"

    # CASE A: Full Single LR Details View
    if (is_detail or len(lrs) == 1) and search_term:
        lr = lrs[0]
        consigner_str = lr.consigner.name if lr.consigner else "Not Specified"
        consignee_str = lr.consignee.name if lr.consignee else "Not Specified"
        origin_str = lr.origin_location.name if lr.origin_location else "N/A"
        dest_str = lr.destination_location.name if lr.destination_location else "N/A"
        route_display = f"{origin_str} → {dest_str}" if origin_str != "N/A" or dest_str != "N/A" else "Standard Route"
        branch_str = lr.issuing_office.name if lr.issuing_office else office_label

        total_freight_val = float(lr.total_freight_amount or 0.0)
        advance_val = float(lr.advance_amount or 0.0)
        balance_val = float(lr.balance_amount or 0.0)
        freight_rate_val = float(lr.freight_rate or 0.0)

        pkg_cnt = lr.package_count or 0
        actual_wt = float(lr.actual_weight_mt or 0.0)
        chargeable_wt = float(lr.chargeable_weight_mt or 0.0)
        packing_str = lr.packing_method.name if lr.packing_method else (lr.load_type or "General Cargo")

        inv_no = lr.invoice_no or "N/A"
        inv_val = float(lr.invoice_value or 0.0)
        ewb_no = lr.eway_bill_number or "N/A"

        veh_str = lr.vehicle_number or "Unassigned"
        drv_str = lr.driver_name or "N/A"
        drv_phone = lr.driver_phone or "N/A"

        # Check live telematics if vehicle is assigned
        telematics_text = None
        if lr.vehicle_number:
            try:
                gps = await track_gps_single_vehicle(db, clean_vehicle_number(lr.vehicle_number))
                if gps and gps.success and gps.truck_data:
                    telematics_text = f"Live GPS: {gps.truck_data.get('location', 'In Transit')} ({gps.truck_data.get('speed', 0)} km/h)"
                else:
                    sims = await get_sim_trips(db, limit=3)
                    sim_m = [s for s in sims if getattr(s, "vehicle_number", None) and clean_vehicle_number(lr.vehicle_number) in s.vehicle_number.upper()]
                    if sim_m:
                        loc = getattr(sim_m[0], "last_location_address", None) or getattr(sim_m[0], "origin_address", None)
                        telematics_text = f"SIM Ping: {loc or 'Cell Tower Triangulation'}"
            except Exception:
                telematics_text = None

        items = [
            {
                "primary": f"Route: {route_display}",
                "secondary": f"Consigner: {consigner_str} • Consignee: {consignee_str}",
            },
            {
                "primary": f"Vehicle: {veh_str} ({lr.vehicle_source})",
                "secondary": f"Driver: {drv_str} • Phone: {drv_phone}",
            },
            {
                "primary": f"Cargo: {pkg_cnt} pkgs ({packing_str})",
                "secondary": f"Actual: {actual_wt:.3f} MT • Chargeable: {chargeable_wt:.3f} MT",
            },
            {
                "primary": f"Commercial Invoice: {inv_no}",
                "secondary": f"Invoice Value: ₹{inv_val:,.2f} • E-Way Bill: {ewb_no}",
                "amount": f"₹{inv_val:,.2f}" if inv_val else None,
            },
            {
                "primary": f"Financial Settlement: {lr.payment_terms}",
                "secondary": f"Base Freight: ₹{float(lr.freight_amount or 0):,.2f} • Advance: ₹{advance_val:,.2f}",
                "amount": f"₹{total_freight_val:,.2f}",
            },
        ]
        if lr.hire_challan:
            items.append({
                "primary": f"Hire Memo: {lr.hire_challan.challan_number}",
                "secondary": f"Agreed Rate: ₹{float(lr.hire_challan.hire_rate or 0):,.2f} • Balance: ₹{float(lr.hire_challan.balance_amount or 0):,.2f}",
            })
        if telematics_text:
            items.append({
                "primary": "Live Telematics Location",
                "secondary": telematics_text,
            })

        card = StructuredCard(
            card_type="lr_detail",
            title=f"LR Details: {lr.lr_number}",
            subtitle=f"Branch: {branch_str} • Date: {lr.lr_date}",
            badge={"text": lr.status or "Booked", "variant": "success" if (lr.status or "").lower() == "delivered" else "primary"},
            metrics=[
                {"label": "Total Freight", "value": f"₹{total_freight_val:,.2f}"},
                {"label": "Balance Due", "value": f"₹{balance_val:,.2f}"},
                {"label": "Weight (MT)", "value": f"{actual_wt:.3f} MT"},
                {"label": "Terms", "value": lr.payment_terms or "TO_PAY"},
            ],
            items=items,
            action={"label": f"Open LR {lr.lr_number}", "href": "/transport/lr-booking"},
        )

        if lang == "hinglish":
            msg = (
                f"### 📋 Lorry Receipt Details: **{lr.lr_number}**\n\n"
                f"- **Status**: **{lr.status or 'Booked'}** ({lr.booking_status or 'Active'})\n"
                f"- **Booking Date**: {lr.lr_date} | **Branch**: {branch_str}\n"
                f"- **Route**: **{route_display}**\n"
                f"- **Consigner (Loading)**: {consigner_str}\n"
                f"- **Consignee (Delivery)**: {consignee_str}\n"
                f"- **Assigned Vehicle**: **{veh_str}** ({lr.vehicle_source}) | **Driver**: {drv_str} ({drv_phone})\n"
                f"- **Cargo Details**: {pkg_cnt} packages ({packing_str}) | Weight: **{actual_wt:.3f} MT**\n"
                f"- **Financials**: Total Freight: **₹{total_freight_val:,.2f}** | Advance: ₹{advance_val:,.2f} | **Balance Due: ₹{balance_val:,.2f}** (Terms: `{lr.payment_terms}`)\n"
                f"- **Invoice / E-Way Bill**: Invoice #{inv_no} | EWB #{ewb_no}\n"
            )
            if telematics_text:
                msg += f"- **Live Tracking**: {telematics_text}\n"
        elif lang == "hi_devanagari":
            msg = (
                f"### 📋 एलआर विवरण: **{lr.lr_number}**\n\n"
                f"- **स्थिति (Status)**: **{lr.status or 'Booked'}**\n"
                f"- **दिनांक**: {lr.lr_date} | **शाखा**: {branch_str}\n"
                f"- **मार्ग (Route)**: **{route_display}**\n"
                f"- **भेजने वाले (Consigner)**: {consigner_str}\n"
                f"- **पाने वाले (Consignee)**: {consignee_str}\n"
                f"- **वाहन**: **{veh_str}** | **चालक**: {drv_str} ({drv_phone})\n"
                f"- **माल विवरण**: {pkg_cnt} पैकेज ({packing_str}) | वजन: **{actual_wt:.3f} MT**\n"
                f"- **भाड़ा (Freight)**: कुल भाड़ा: **₹{total_freight_val:,.2f}** | अग्रिम: ₹{advance_val:,.2f} | **शेष देय: ₹{balance_val:,.2f}** (`{lr.payment_terms}`)\n"
                f"- **इनवॉइस / ई-वे बिल**: इनवॉइस #{inv_no} | ई-वे बिल #{ewb_no}\n"
            )
            if telematics_text:
                msg += f"- **लाइव ट्रैकिंग स्थान**: {telematics_text}\n"
        else:
            msg = (
                f"### 📋 Lorry Receipt Details: **{lr.lr_number}**\n\n"
                f"- **Status**: **{lr.status or 'Booked'}**\n"
                f"- **Booking Date**: {lr.lr_date} | **Issuing Office**: {branch_str}\n"
                f"- **Route**: **{route_display}**\n"
                f"- **Consigner**: {consigner_str}\n"
                f"- **Consignee**: {consignee_str}\n"
                f"- **Assigned Vehicle**: **{veh_str}** ({lr.vehicle_source}) | **Driver**: {drv_str} ({drv_phone})\n"
                f"- **Cargo Details**: {pkg_cnt} packages ({packing_str}) | Weight: **{actual_wt:.3f} MT**\n"
                f"- **Commercials**: Total Freight: **₹{total_freight_val:,.2f}** | Advance: ₹{advance_val:,.2f} | **Balance Due: ₹{balance_val:,.2f}** (Terms: `{lr.payment_terms}`)\n"
                f"- **Invoices / E-Way Bill**: Inv #{inv_no} | E-Way Bill #{ewb_no}\n"
            )
            if telematics_text:
                msg += f"- **Current Telematics**: {telematics_text}\n"

        return msg, [card]

    # CASE B: Multiple LRs Summary List View
    items = []
    total_freight = 0.0
    for lr in lrs:
        consigner_name = lr.consigner.name if lr.consigner else "N/A"
        consignee_name = lr.consignee.name if lr.consignee else "N/A"
        freight = float(lr.total_freight_amount or 0.0)
        total_freight += freight
        items.append({
            "primary": lr.lr_number,
            "secondary": f"{lr.vehicle_number or 'No Vehicle'} • {consigner_name} → {consignee_name}",
            "status": lr.status or "Booked",
            "date": lr.lr_date.strftime("%Y-%m-%d") if lr.lr_date else None,
            "amount": f"₹{freight:,.2f}",
            "balance": f"₹{float(lr.balance_amount or 0.0):,.2f}",
        })

    title = f"Recent LRs ({len(lrs)})" if not search_term else f"LR Search Results ({len(lrs)})"

    card = StructuredCard(
        card_type="lr_list",
        title=title,
        subtitle=f"Branch: {office_label}",
        badge={"text": f"{len(lrs)} Records", "variant": "success"},
        metrics=[
            {"label": "Total Freight", "value": f"₹{total_freight:,.2f}"},
            {"label": "Active Records", "value": str(len(lrs))},
        ],
        items=items,
        action={"label": "Manage in LR Booking", "href": "/transport/lr-booking"},
    )

    if lang == "hinglish":
        msg = f"Aapke active branch ke liye **{len(lrs)} LRs** mile hain. Niche structured card mein details dekhein."
    elif lang == "hi_devanagari":
        msg = f"आपकी सक्रिय शाखा के लिए **{len(lrs)} एलआर (LRs)** मिले हैं। विवरण नीचे दिया गया है।"
    else:
        msg = f"Found **{len(lrs)} consignment note(s)** for your active branch context. Details are listed below."

    return msg, [card]

    eff_office_id = get_effective_office_id(user, current_office)
    if eff_office_id == -1:
        msg = (
            "Aapka koi active branch assign nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have an active branch assigned."
        )
        card = StructuredCard(
            card_type="lr_list",
            title="Consignment Notes (LRs)",
            subtitle="No active branch assigned to your user account",
            badge={"text": "0 Results", "variant": "neutral"},
            items=[],
            action={"label": "View LRs", "href": "/transport/lr-booking"},
        )
        return msg, [card]

    search_term = query or vehicle_number

    if search_term:
        lrs = await search_lrs(
            db=db,
            query=search_term,
            office_id=eff_office_id,
            include_unassigned=False,
            limit=limit,
        )
    else:
        lrs = await get_all_lrs(
            db=db,
            office_id=eff_office_id,
            include_unassigned=False,
            limit=limit,
        )

    if status_filter:
        lrs = [lr for lr in lrs if (lr.status or "").lower() == status_filter.lower()]

    if not lrs:
        msg = (
            f"Koi LR record nahi mila{' search: ' + search_term if search_term else ''}."
            if lang in ("hinglish", "hi_devanagari")
            else f"No LR records found{' matching ' + search_term if search_term else ''}."
        )
        card = StructuredCard(
            card_type="lr_list",
            title="Consignment Notes (LRs)",
            subtitle="No matching records found in active office scope",
            badge={"text": "0 Results", "variant": "neutral"},
            action={"label": "Open LR Booking", "href": "/transport/lr-booking"},
        )
        return msg, [card]

    # Format structured items
    items = []
    total_freight = 0.0
    for lr in lrs:
        consigner_name = lr.consigner.name if lr.consigner else "N/A"
        consignee_name = lr.consignee.name if lr.consignee else "N/A"
        freight = float(lr.total_freight_amount or 0.0)
        total_freight += freight
        items.append({
            "primary": lr.lr_number,
            "secondary": f"{lr.vehicle_number or 'No Vehicle'} • {consigner_name} → {consignee_name}",
            "status": lr.status or "Booked",
            "date": lr.lr_date.strftime("%Y-%m-%d") if lr.lr_date else None,
            "amount": f"₹{freight:,.2f}",
            "balance": f"₹{float(lr.balance_amount or 0.0):,.2f}",
        })

    office_label = current_office.name if current_office else "All Offices"
    title = f"Recent LRs ({len(lrs)})" if not search_term else f"LR Search Results ({len(lrs)})"

    card = StructuredCard(
        card_type="lr_list",
        title=title,
        subtitle=f"Branch: {office_label}",
        badge={"text": f"{len(lrs)} Records", "variant": "success"},
        metrics=[
            {"label": "Total Freight", "value": f"₹{total_freight:,.2f}"},
            {"label": "Active Records", "value": str(len(lrs))},
        ],
        items=items,
        action={"label": "Manage in LR Booking", "href": "/transport/lr-booking"},
    )

    if lang == "hinglish":
        msg = f"Aapke active branch ke liye **{len(lrs)} LRs** mile hain. Niche structured card mein details dekhein."
    elif lang == "hi_devanagari":
        msg = f"आपकी सक्रिय शाखा के लिए **{len(lrs)} एलआर (LRs)** मिले हैं। विवरण नीचे दिया गया है।"
    else:
        msg = f"Found **{len(lrs)} consignment note(s)** for your active branch context. Details are listed below."

    return msg, [card]



async def execute_hire_challan_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    query: Optional[str] = None,
    vehicle_number: Optional[str] = None,
    limit: int = 5,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """Retrieves Hire Challan (truck hiring memo) records and full operational details."""
    if not is_user_permitted(user, tenant, "transport", "hire_challan", "view"):
        msg = (
            "Aapke paas Hire Challan records dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view Hire Challan records."
        )
        card = StructuredCard(
            card_type="hire_challan_detail",
            title="Hire Challan Access Restricted",
            subtitle="Missing permission: transport.hire_challan.view",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    eff_office_id = get_effective_office_id(user, current_office)
    search_term = query or vehicle_number
    clean_term = None
    if search_term:
        clean_term = re.sub(r"^(?:hire\s+challan|challan|hc|number|no\.?|#|[\s\-_])+", "", search_term, flags=re.IGNORECASE).strip()

    stmt = (
        select(HireChallan)
        .options(
            selectinload(HireChallan.owner),
            selectinload(HireChallan.driver),
            selectinload(HireChallan.lr),
            selectinload(HireChallan.issuing_office),
        )
        .order_by(desc(HireChallan.challan_date), desc(HireChallan.id))
        .limit(limit)
    )

    if search_term:
        pattern = f"%{clean_term or search_term}%"
        stmt = stmt.where(
            or_(
                HireChallan.challan_number.ilike(pattern),
                HireChallan.challan_number.ilike(f"%{search_term}%"),
                HireChallan.vehicle_number.ilike(pattern),
                HireChallan.driver_name.ilike(pattern),
                cast(HireChallan.id, String) == (clean_term or search_term),
            )
        )

    if eff_office_id and eff_office_id != -1:
        stmt = stmt.where(or_(HireChallan.issuing_office_id == eff_office_id, HireChallan.issuing_office_id.is_(None)))

    res = await db.execute(stmt)
    challans = list(res.scalars().all())

    # Fallback without office restriction for admins
    if not challans and search_term and (user.role or "").upper() in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
        pattern = f"%{clean_term or search_term}%"
        stmt_all = (
            select(HireChallan)
            .options(
                selectinload(HireChallan.owner),
                selectinload(HireChallan.driver),
                selectinload(HireChallan.lr),
                selectinload(HireChallan.issuing_office),
            )
            .where(
                or_(
                    HireChallan.challan_number.ilike(pattern),
                    HireChallan.challan_number.ilike(f"%{search_term}%"),
                    HireChallan.vehicle_number.ilike(pattern),
                    cast(HireChallan.id, String) == (clean_term or search_term),
                )
            )
            .order_by(desc(HireChallan.challan_date), desc(HireChallan.id))
            .limit(limit)
        )
        res_all = await db.execute(stmt_all)
        challans = list(res_all.scalars().all())

    if not challans:
        msg = (
            f"Koi Hire Challan record nahi mila{' search: ' + search_term if search_term else ''}."
            if lang in ("hinglish", "hi_devanagari")
            else f"No Hire Challan records found{' matching ' + search_term if search_term else ''}."
        )
        card = StructuredCard(
            card_type="hire_challan_detail",
            title="Hire Challan Search",
            subtitle="No matching records found in active office scope",
            badge={"text": "0 Results", "variant": "neutral"},
            action={"label": "Open Hire Challan", "href": "/transport/hire-challan"},
        )
        return msg, [card]

    hc = challans[0]
    office_str = hc.issuing_office.name if hc.issuing_office else (current_office.name if current_office else "All Offices")
    owner_str = hc.owner.name if hc.owner else "Independent Market Truck"
    driver_str = hc.driver_name or "N/A"
    driver_phone = hc.driver_phone or "N/A"
    route_str = f"{hc.from_location or 'Loading'} → {hc.to_location or 'Destination'}"

    hire_rate_val = float(hc.hire_rate or 0.0)
    advance_val = float(hc.advance_amount or 0.0)
    tds_val = float(hc.tds_amount or 0.0)
    balance_val = float(hc.balance_amount or 0.0)

    # Telematics check for hired truck
    telematics_text = None
    if hc.vehicle_number:
        try:
            gps = await track_gps_single_vehicle(db, clean_vehicle_number(hc.vehicle_number))
            if gps and gps.success and gps.truck_data:
                telematics_text = f"Live GPS: {gps.truck_data.get('location', 'In Transit')} ({gps.truck_data.get('speed', 0)} km/h)"
            else:
                sims = await get_sim_trips(db, limit=3)
                sim_m = [s for s in sims if getattr(s, "vehicle_number", None) and clean_vehicle_number(hc.vehicle_number) in s.vehicle_number.upper()]
                if sim_m:
                    loc = getattr(sim_m[0], "last_location_address", None) or getattr(sim_m[0], "origin_address", None)
                    telematics_text = f"SIM Ping: {loc or 'Cell Tower Triangulation'}"
        except Exception:
            telematics_text = None

    items = [
        {
            "primary": f"Vehicle: {hc.vehicle_number} (Market Truck)",
            "secondary": f"Supplier / Broker: {owner_str}",
        },
        {
            "primary": f"Driver: {driver_str}",
            "secondary": f"Phone: {driver_phone} • Route: {route_str}",
        },
        {
            "primary": f"Hiring Freight: ₹{hire_rate_val:,.2f}",
            "secondary": f"Cash Advance: ₹{advance_val:,.2f} • TDS: ₹{tds_val:,.2f}",
            "amount": f"₹{hire_rate_val:,.2f}",
        },
        {
            "primary": "Balance Payable upon POD",
            "secondary": f"Status: {hc.status or 'Issued'}",
            "amount": f"₹{balance_val:,.2f}",
        },
    ]
    if hc.lr:
        items.append({
            "primary": f"Linked LR: {hc.lr.lr_number}",
            "secondary": f"Cargo Freight: ₹{float(hc.lr.total_freight_amount or 0):,.2f}",
        })
    if telematics_text:
        items.append({
            "primary": "Live Telematics Location",
            "secondary": telematics_text,
        })

    card = StructuredCard(
        card_type="hire_challan_detail",
        title=f"Hire Challan: {hc.challan_number}",
        subtitle=f"Branch: {office_str} • Date: {hc.challan_date}",
        badge={"text": hc.status or "Issued", "variant": "success" if (hc.status or "").lower() == "settled" else "primary"},
        metrics=[
            {"label": "Hiring Rate", "value": f"₹{hire_rate_val:,.2f}"},
            {"label": "Balance Due", "value": f"₹{balance_val:,.2f}"},
            {"label": "Vehicle", "value": hc.vehicle_number},
            {"label": "Status", "value": hc.status or "Issued"},
        ],
        items=items,
        action={"label": f"Open Challan {hc.challan_number}", "href": "/transport/hire-challan"},
    )

    if lang == "hinglish":
        msg = (
            f"### 🚚 Hire Challan Details: **{hc.challan_number}**\n\n"
            f"- **Status**: **{hc.status or 'Issued'}**\n"
            f"- **Challan Date**: {hc.challan_date} | **Branch**: {office_str}\n"
            f"- **Hired Vehicle**: **{hc.vehicle_number}** (Market Truck)\n"
            f"- **Vehicle Owner / Transporter**: {owner_str}\n"
            f"- **Driver**: {driver_str} (Phone: {driver_phone})\n"
            f"- **Route**: **{route_str}**\n"
            f"- **Hiring Commercials**: Agreed Rate: **₹{hire_rate_val:,.2f}** | Advance: ₹{advance_val:,.2f} | **Balance Payable: ₹{balance_val:,.2f}**\n"
        )
        if hc.lr:
            msg += f"- **Linked Consignment (LR)**: {hc.lr.lr_number}\n"
        if telematics_text:
            msg += f"- **Live Telematics Location**: {telematics_text}\n"
    elif lang == "hi_devanagari":
        msg = (
            f"### 🚚 हायर चालान विवरण: **{hc.challan_number}**\n\n"
            f"- **स्थिति (Status)**: **{hc.status or 'Issued'}**\n"
            f"- **दिनांक**: {hc.challan_date} | **शाखा**: {office_str}\n"
            f"- **किराए का वाहन**: **{hc.vehicle_number}**\n"
            f"- **मालिक / सप्लायर**: {owner_str}\n"
            f"- **चालक**: {driver_str} (फोन: {driver_phone})\n"
            f"- **मार्ग**: **{route_str}**\n"
            f"- **किराया विवरण**: तय दर: **₹{hire_rate_val:,.2f}** | अग्रिम: ₹{advance_val:,.2f} | **शेष देय: ₹{balance_val:,.2f}**\n"
        )
        if hc.lr:
            msg += f"- **संबद्ध एलआर (LR)**: {hc.lr.lr_number}\n"
        if telematics_text:
            msg += f"- **लाइव ट्रैकिंग स्थान**: {telematics_text}\n"
    else:
        msg = (
            f"### 🚚 Hire Challan Details: **{hc.challan_number}**\n\n"
            f"- **Status**: **{hc.status or 'Issued'}**\n"
            f"- **Challan Date**: {hc.challan_date} | **Issuing Office**: {office_str}\n"
            f"- **Hired Vehicle**: **{hc.vehicle_number}** (Market Truck)\n"
            f"- **Vehicle Supplier / Owner**: {owner_str}\n"
            f"- **Driver**: {driver_str} (Phone: {driver_phone})\n"
            f"- **Route**: **{route_str}**\n"
            f"- **Commercials**: Agreed Rate: **₹{hire_rate_val:,.2f}** | Advance: ₹{advance_val:,.2f} | **Balance Payable: ₹{balance_val:,.2f}**\n"
        )
        if hc.lr:
            msg += f"- **Linked Consignment (LR)**: {hc.lr.lr_number}\n"
        if telematics_text:
            msg += f"- **Current Telematics**: {telematics_text}\n"

    return msg, [card]


async def execute_vehicle_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    query: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    limit: int = 6,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """
    Retrieves Company and Market vehicles with authorization checks.
    Directs Company vehicles to /transport/company-vehicles and Market vehicles to /transport/market-vehicles.
    """
    can_company = is_user_permitted(user, tenant, "transport", "company_vehicles", "view")
    can_market = is_user_permitted(user, tenant, "transport", "market_vehicles", "view")

    if not can_company and not can_market:
        msg = (
            "Aapke paas Vehicles dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view vehicle records."
        )
        card = StructuredCard(
            card_type="vehicle_list",
            title="Vehicle Access Restricted",
            subtitle="Missing permission: transport.company_vehicles / market_vehicles",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    all_vehicles = []
    should_include_company = can_company and vehicle_type != "market"
    should_include_market = can_market and vehicle_type != "company"

    if should_include_company:
        cvs = await get_all_company_vehicles(db)
        for v in cvs:
            all_vehicles.append({
                "number": v.vehicle_number,
                "type": v.vehicle_type or "Commercial",
                "source": "Company",
                "capacity": f"{v.capacity_mt} MT" if v.capacity_mt else "N/A",
                "is_active": v.is_active,
                "href": "/transport/company-vehicles",
            })

    if should_include_market:
        mvs = await get_all_market_vehicles(db)
        for v in mvs:
            all_vehicles.append({
                "number": v.vehicle_number,
                "type": v.vehicle_type or "Market Truck",
                "source": "Market",
                "capacity": f"{v.capacity_mt} MT" if v.capacity_mt else "N/A",
                "owner": v.owner_name or "N/A",
                "is_active": v.is_active,
                "href": "/transport/market-vehicles",
            })

    if query:
        clean_q = query.strip().upper()
        all_vehicles = [
            v for v in all_vehicles
            if clean_q in v["number"].replace(" ", "").upper() or clean_q in v["type"].upper()
        ]

    matched = all_vehicles[:limit]

    has_market = any(v["source"] == "Market" for v in matched)
    has_company = any(v["source"] == "Company" for v in matched)

    if vehicle_type == "market" or (has_market and not has_company):
        action_label = "Manage Market Vehicles"
        action_href = "/transport/market-vehicles"
        subtitle = "Authorized Market Vehicles (Market Fleet)"
    elif vehicle_type == "company" or (has_company and not has_market):
        action_label = "Manage Company Vehicles"
        action_href = "/transport/company-vehicles"
        subtitle = "Authorized Company Fleet"
    else:
        action_label = "View Market Vehicles" if has_market else "View Company Vehicles"
        action_href = "/transport/market-vehicles" if has_market else "/transport/company-vehicles"
        subtitle = "Authorized Company & Market Vehicles"

    if not matched:
        msg = (
            f"Koi vehicle nahi mila{' query: ' + query if query else ''}."
            if lang in ("hinglish", "hi_devanagari")
            else f"No vehicles found{' matching ' + query if query else ''}."
        )
        card = StructuredCard(
            card_type="vehicle_list",
            title="Vehicles Registry",
            subtitle=subtitle,
            badge={"text": "0 Results", "variant": "neutral"},
            action={"label": action_label, "href": action_href},
        )
        return msg, [card]

    items = []
    for v in matched:
        items.append({
            "primary": v["number"],
            "secondary": f"{v['source']} ? {v['type']} ? Capacity: {v['capacity']}",
            "status": "Active" if v["is_active"] else "Inactive",
            "href": v["href"],
        })

    card = StructuredCard(
        card_type="vehicle_list",
        title=f"Fleet Vehicles ({len(matched)})",
        subtitle=subtitle,
        badge={"text": f"{len(matched)} Active", "variant": "success"},
        metrics=[
            {"label": "Total Retrieved", "value": str(len(matched))},
            {"label": "Fleet Types", "value": "Market" if vehicle_type == "market" else ("Company" if vehicle_type == "company" else "Company & Market")},
        ],
        items=items,
        action={"label": action_label, "href": action_href},
    )

    if lang == "hinglish":
        msg = f"Aapke fleet ke **{len(matched)} vehicles** mil gaye hain. Details niche card mein dekhein."
    elif lang == "hi_devanagari":
        msg = f"???? ????? ?? **{len(matched)} ????** ??? ?? ???? ????? ???? ???? ??? ???"
    else:
        msg = f"Retrieved **{len(matched)} vehicle(s)** from your fleet records."

    return msg, [card]


async def execute_driver_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    query: Optional[str] = None,
    limit: int = 6,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """Retrieves registered drivers with contact and license validity."""
    if not is_user_permitted(user, tenant, "transport", "drivers", "view"):
        msg = (
            "Aapke paas Driver records dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view driver records."
        )
        card = StructuredCard(
            card_type="driver_list",
            title="Driver Access Restricted",
            subtitle="Missing permission: transport.drivers.view",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    drivers = await get_all_drivers(db)

    if query:
        q_norm = query.strip().lower()
        drivers = [
            d for d in drivers
            if q_norm in (d.name or "").lower()
            or q_norm in (d.phone or "").lower()
            or q_norm in (d.license_number or "").lower()
        ]

    matched = drivers[:limit]

    if not matched:
        msg = (
            f"Koi driver record nahi mila{' query: ' + query if query else ''}."
            if lang in ("hinglish", "hi_devanagari")
            else f"No drivers found{' matching ' + query if query else ''}."
        )
        card = StructuredCard(
            card_type="driver_list",
            title="Drivers Directory",
            subtitle="0 drivers found matching criteria",
            badge={"text": "0 Results", "variant": "neutral"},
            action={"label": "Manage Drivers", "href": "/transport/drivers"},
        )
        return msg, [card]

    items = []
    for d in matched:
        expiry = d.license_expiry.strftime("%Y-%m-%d") if d.license_expiry else "Not set"
        items.append({
            "primary": d.name,
            "secondary": f"Phone: {d.phone or 'N/A'} • DL: {d.license_number or 'N/A'}",
            "status": "Valid DL" if (d.dl_status or "").upper() == "VALID" else (d.dl_status or "Active"),
            "expiry": expiry,
        })

    card = StructuredCard(
        card_type="driver_list",
        title=f"Drivers ({len(matched)})",
        subtitle="Registered Driver Records",
        badge={"text": f"{len(matched)} Drivers", "variant": "success"},
        metrics=[
            {"label": "Total Listed", "value": str(len(matched))},
        ],
        items=items,
        action={"label": "Open Driver Master", "href": "/transport/drivers"},
    )

    if lang == "hinglish":
        msg = f"Aapke fleet ke **{len(matched)} drivers** ki list mil gayi hai."
    elif lang == "hi_devanagari":
        msg = f"आपके बेड़े के **{len(matched)} चालकों** की सूची मिल गई है।"
    else:
        msg = f"Retrieved **{len(matched)} driver record(s)** from your directory."

    return msg, [card]


# ==============================================================================
# 4B. BILLING CLIENT, VENDOR & TRANSPORT JOB TOOLS (DETERMINISTIC QUERIES)
# ==============================================================================

async def execute_client_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    query: Optional[str] = None,
    is_count: bool = False,
    limit: int = 6,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """Retrieves registered billing clients with exact counts and branch scoping."""
    if not is_user_permitted(user, tenant, "general", "billing_clients", "view") and not is_user_permitted(user, tenant, "accounts", "master_ledger", "view"):
        msg = (
            "Aapke paas Billing Clients dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view billing clients."
        )
        card = StructuredCard(
            card_type="client_list",
            title="Billing Clients Access Restricted",
            subtitle="Missing permission: general.billing_clients.view",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    office_id = current_office.id if current_office and user.role != "COMPANY_ADMIN" else None
    clients = await list_billing_clients(db, office_id=office_id, include_unassigned=True)
    active_clients = [c for c in clients if getattr(c, "is_active", True) is not False]

    if query:
        q_norm = query.strip().lower()
        active_clients = [
            c for c in active_clients
            if q_norm in (c.name or "").lower()
            or q_norm in (c.code or "").lower()
            or q_norm in (c.company_name or "").lower()
        ]

    total_count = len(active_clients)
    matched = active_clients[:limit]

    items = [
        {
            "primary": c.name or "Client",
            "secondary": f"Code: {c.code or 'N/A'} • City: {c.city or 'N/A'}",
            "status": "Active",
            "gstin": c.gstin or "Unregistered",
            "credit": f"{c.credit_period_days or 30} days",
        }
        for c in matched
    ]

    card = StructuredCard(
        card_type="client_list",
        title="Billing Clients Directory",
        subtitle=f"{total_count} registered commercial client(s)" if total_count > 0 else "0 registered clients",
        badge={"text": f"{total_count} Total", "variant": "success" if total_count > 0 else "neutral"},
        metrics=[
            {"label": "Total Active Clients", "value": str(total_count)},
            {"label": "Office Scope", "value": current_office.name if current_office else "All Offices"},
        ],
        items=items,
        action={"label": "Open Billing Clients Master", "href": "/general/billing-client"},
    )

    if lang == "hinglish":
        if total_count == 0:
            msg = "Aapke paas PantherTMS mein abhi **0 active Billing Clients** registered hain."
        else:
            msg = f"Aapke paas PantherTMS mein total **{total_count} active Billing Clients** registered hain. Niche card mein details dekhein."
    elif lang == "hi_devanagari":
        if total_count == 0:
            msg = "आपकी कंपनी में वर्तमान में **0 सक्रिय बिलिंग क्लाइंट** पंजीकृत हैं।"
        else:
            msg = f"आपकी कंपनी में कुल **{total_count} सक्रिय बिलिंग क्लाइंट (Billing Clients)** पंजीकृत हैं। विवरण नीचे कार्ड में देखें।"
    else:
        if total_count == 0:
            msg = "You currently have **0 active Billing Clients** registered in PantherTMS."
        else:
            msg = f"You have **{total_count} active Billing Client(s)** registered in your system."

    return msg, [card]


async def execute_vendor_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    query: Optional[str] = None,
    is_count: bool = False,
    limit: int = 6,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """Retrieves registered vendors with exact counts and branch scoping."""
    if not is_user_permitted(user, tenant, "general", "vendors", "view"):
        msg = (
            "Aapke paas Vendor records dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view vendor records."
        )
        card = StructuredCard(
            card_type="vendor_list",
            title="Vendors Access Restricted",
            subtitle="Missing permission: general.vendors.view",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    office_id = current_office.id if current_office and user.role != "COMPANY_ADMIN" else None
    vendors = await list_vendors(db, office_id=office_id, include_unassigned=True)
    active_vendors = [v for v in vendors if getattr(v, "is_active", True) is not False]

    if query:
        q_norm = query.strip().lower()
        active_vendors = [
            v for v in active_vendors
            if q_norm in (v.name or "").lower()
            or q_norm in (getattr(v, "industry", "") or "").lower()
            or q_norm in (v.phone or "").lower()
        ]

    total_count = len(active_vendors)
    matched = active_vendors[:limit]

    items = [
        {
            "primary": v.name or "Vendor",
            "secondary": f"City: {v.city or 'N/A'} • Phone: {v.phone or 'N/A'}",
            "status": "Active",
            "phone": v.phone or "N/A",
        }
        for v in matched
    ]

    card = StructuredCard(
        card_type="vendor_list",
        title="Vendors Directory",
        subtitle=f"{total_count} registered vendor(s)",
        badge={"text": f"{total_count} Vendors", "variant": "success" if total_count > 0 else "neutral"},
        metrics=[
            {"label": "Total Active Vendors", "value": str(total_count)},
            {"label": "Office Scope", "value": current_office.name if current_office else "All Offices"},
        ],
        items=items,
        action={"label": "Open Vendors Master", "href": "/general/vendor"},
    )

    if lang == "hinglish":
        msg = f"Aapke paas PantherTMS mein total **{total_count} active Vendors** registered hain. Niche details dekhein."
    elif lang == "hi_devanagari":
        msg = f"आपकी कंपनी में कुल **{total_count} सक्रिय वेंडर्स (Vendors)** पंजीकृत हैं। विवरण नीचे देखें।"
    else:
        msg = f"You have **{total_count} active Vendor(s)** registered in your system."

    return msg, [card]


async def execute_job_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    is_today: bool = False,
    is_count: bool = False,
    limit: int = 5,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """Retrieves transport jobs with exact counts and branch scoping."""
    if not is_user_permitted(user, tenant, "transport", "jobs", "view"):
        msg = (
            "Aapke paas Transport Job records dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view transport job records."
        )
        card = StructuredCard(
            card_type="job_list",
            title="Jobs Access Restricted",
            subtitle="Missing permission: transport.jobs.view",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    stmt = select(Job).order_by(desc(Job.id))
    if current_office and user.role != "COMPANY_ADMIN":
        stmt = stmt.where(or_(Job.issuing_office_id == current_office.id, Job.issuing_office_id.is_(None)))
    if is_today:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = stmt.where(Job.created_at >= today_start)

    result = await db.execute(stmt)
    jobs = result.scalars().all()
    total_count = len(jobs)
    matched = jobs[:limit]

    items = [
        {
            "primary": f"Job #{j.job_number or j.id}",
            "secondary": f"Party: {getattr(j, 'billing_party', None) or 'Commercial Party'} • Date: {getattr(j, 'job_date', None) or 'N/A'}",
            "status": j.status.value if hasattr(j.status, 'value') else str(j.status or 'PENDING'),
        }
        for j in matched
    ]

    card = StructuredCard(
        card_type="job_list",
        title="Transport Jobs",
        subtitle=f"{total_count} job(s) found" + (" for today" if is_today else ""),
        badge={"text": f"{total_count} Jobs", "variant": "primary"},
        metrics=[
            {"label": "Total Jobs" + (" (Today)" if is_today else ""), "value": str(total_count)},
            {"label": "Office Scope", "value": current_office.name if current_office else "All Offices"},
        ],
        items=items,
        action={"label": "Open Jobs Register", "href": "/transport/jobs"},
    )

    if lang == "hinglish":
        msg = (
            f"Aaj total **{total_count} Transport Jobs** create hue hain."
            if is_today
            else f"Aapke system mein total **{total_count} Transport Jobs** registered hain."
        )
    elif lang == "hi_devanagari":
        msg = (
            f"आज कुल **{total_count} ट्रांसपोर्ट जॉब्स** बनाए गए हैं।"
            if is_today
            else f"आपके सिस्टम में कुल **{total_count} ट्रांसपोर्ट जॉब्स** पंजीकृत हैं।"
        )
    else:
        msg = (
            f"Today, **{total_count} Transport Job(s)** have been created."
            if is_today
            else f"You have **{total_count} Transport Job(s)** in your system."
        )

    return msg, [card]


async def execute_tracking_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    vehicle_number: Optional[str] = None,
    lr_number: Optional[str] = None,
    challan_number: Optional[str] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """
    Retrieves authorized GPS, FASTag, or SIM tracking telemetry.
    Supports tracking by vehicle registration, LR number, or Hire Challan number.
    """
    if not is_user_permitted(user, tenant, "tracking", "tracking", "view"):
        msg = (
            "Aapke plan mein Tracking module entitled nahi hai ya permission missing hai."
            if lang in ("hinglish", "hi_devanagari")
            else "Tracking is not enabled on your plan or you lack permission to view telemetry."
        )
        card = StructuredCard(
            card_type="tracking",
            title="Tracking Unavailable",
            subtitle="Module entitlement locked or permission missing (tracking.tracking.view)",
            badge={"text": "Locked", "variant": "danger"},
            action={"label": "View Plans & Upgrades", "href": "/settings/billing"},
        )
        return msg, [card]

    context_prefix = ""

    # 1. Resolve vehicle from LR number if supplied
    if not vehicle_number and lr_number:
        clean_lr = re.sub(r"^(?:lr|gr|bilty|number|no\.?|#|[\s\-_])+", "", lr_number, flags=re.IGNORECASE).strip()
        lr_stmt = (
            select(LR)
            .options(selectinload(LR.origin_location), selectinload(LR.destination_location))
            .where(
                or_(
                    LR.lr_number.ilike(f"%{clean_lr}%"),
                    LR.lr_number.ilike(f"%{lr_number}%"),
                    cast(LR.id, String) == clean_lr,
                )
            )
            .limit(1)
        )
        res_lr = await db.execute(lr_stmt)
        matched_lr = res_lr.scalar_one_or_none()
        if matched_lr:
            vehicle_number = matched_lr.vehicle_number
            orig = matched_lr.origin_location.name if matched_lr.origin_location else "Origin"
            dest = matched_lr.destination_location.name if matched_lr.destination_location else "Destination"
            context_prefix = f"Consignment **LR {matched_lr.lr_number}** ({orig} → {dest}) is in transit on vehicle **{vehicle_number}**."
        else:
            msg = f"LR **{lr_number}** nahi mila tracking ke liye." if lang in ("hinglish", "hi_devanagari") else f"LR **{lr_number}** could not be found for tracking."
            card = StructuredCard(card_type="tracking", title="LR Not Found", subtitle=f"No matching LR for '{lr_number}'", badge={"text": "Not Found", "variant": "neutral"})
            return msg, [card]

    # 2. Resolve vehicle from Hire Challan number if supplied
    if not vehicle_number and challan_number:
        clean_hc = re.sub(r"^(?:hire\s+challan|challan|hc|number|no\.?|#|[\s\-_])+", "", challan_number, flags=re.IGNORECASE).strip()
        hc_stmt = (
            select(HireChallan)
            .where(
                or_(
                    HireChallan.challan_number.ilike(f"%{clean_hc}%"),
                    HireChallan.challan_number.ilike(f"%{challan_number}%"),
                    cast(HireChallan.id, String) == clean_hc,
                )
            )
            .limit(1)
        )
        res_hc = await db.execute(hc_stmt)
        matched_hc = res_hc.scalar_one_or_none()
        if matched_hc:
            vehicle_number = matched_hc.vehicle_number
            context_prefix = f"Hire Challan **{matched_hc.challan_number}** (Driver: {matched_hc.driver_name or 'Hired'}) is on vehicle **{vehicle_number}**."
        else:
            msg = f"Hire Challan **{challan_number}** nahi mila tracking ke liye." if lang in ("hinglish", "hi_devanagari") else f"Hire Challan **{challan_number}** could not be found for tracking."
            card = StructuredCard(card_type="tracking", title="Challan Not Found", subtitle=f"No matching Challan for '{challan_number}'", badge={"text": "Not Found", "variant": "neutral"})
            return msg, [card]

    clean_v = clean_vehicle_number(vehicle_number) if vehicle_number else None
    now_utc = datetime.now(timezone.utc)

    # 3. If vehicle specified directly, check if currently assigned to an active LR
    if not context_prefix and clean_v:
        try:
            active_lr_stmt = select(LR).where(LR.vehicle_number.ilike(f"%{clean_v}%")).order_by(desc(LR.created_at)).limit(1)
            res_alr = await db.execute(active_lr_stmt)
            alr = res_alr.scalar_one_or_none()
            if alr:
                context_prefix = f"Vehicle **{clean_v}** is assigned to LR **{alr.lr_number}**."
        except Exception:
            pass

    # 1. Check Wheelseye GPS telemetry first (continuous hardware sensor)
    gps_result = None
    if clean_v:
        try:
            gps_result = await track_gps_single_vehicle(db, clean_v)
        except Exception:
            gps_result = None

    gps_ok = (gps_result.get("success") if isinstance(gps_result, dict) else getattr(gps_result, "success", False)) if gps_result else False
    truck = (gps_result.get("truck_data") if isinstance(gps_result, dict) else getattr(gps_result, "truck_data", None)) if gps_result else None
    if gps_ok and truck:
        speed = truck.get("speed", 0) if isinstance(truck, dict) else getattr(truck, "speed", 0)
        location = (truck.get("location") or truck.get("address")) if isinstance(truck, dict) else (getattr(truck, "address", None) or getattr(truck, "location", "Live coordinates"))
        raw_ts = gps_result.get("timestamp") if isinstance(gps_result, dict) else getattr(gps_result, "timestamp", None)
        age_mins = 5
        if raw_ts:
            try:
                parsed_ts = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
                age_mins = int((now_utc - parsed_ts.replace(tzinfo=timezone.utc)).total_seconds() / 60.0)
            except Exception:
                age_mins = 5

        if age_mins <= 15:
            status_text = "Live GPS Position"
            variant = "success"
        elif age_mins <= 120:
            status_text = "Recent GPS Update"
            variant = "success"
        elif age_mins > 1440:
            status_text = "Stale GPS Data (>24h)"
            variant = "warning"
        else:
            status_text = "GPS Telemetry"
            variant = "success"

        card = StructuredCard(
            card_type="tracking",
            title=f"Vehicle Tracking: {clean_v}",
            subtitle="Continuous Hardware Telemetry ? Source: Wheelseye GPS",
            badge={"text": status_text, "variant": variant},
            metrics=[
                {"label": "Source", "value": "Wheelseye GPS"},
                {"label": "Status", "value": status_text},
                {"label": "Current Speed", "value": f"{speed} km/h"},
                {"label": "Last Location", "value": location},
                {"label": "Last Updated", "value": str(raw_ts or "Live")},
            ],
            items=[{
                "primary": f"Location: {location}",
                "secondary": f"Speed: {speed} km/h ? Updated: {raw_ts or 'Live'}",
                "status": status_text,
            }],
            action={"label": "View GPS Fleet", "href": "/tracking/gps"},
        )
        msg = f"Vehicle **{clean_v}** telemetry: **{status_text}** via Wheelseye GPS at **{location}** (Speed: {speed} km/h, Timestamp: {raw_ts or 'Live'})."
        if context_prefix:
            msg = f"{context_prefix}\n\n{msg}"
        return msg, [card]

    # 2. Check SIM trip records (cellular tower ping)
    sim_trips = []
    try:
        sim_trips = await get_sim_trips(db, limit=5)
        if clean_v:
            sim_trips = [
                t for t in sim_trips
                if (getattr(t, "vehicle_number", None) and clean_v in t.vehicle_number.upper())
                or (getattr(t, "lr", None) and getattr(t.lr, "vehicle_number", None) and clean_v in t.lr.vehicle_number.upper())
            ]
    except Exception:
        sim_trips = []

    if sim_trips:
        latest_sim = sim_trips[0]
        sim_time = latest_sim.updated_at or latest_sim.created_at
        age_hours = (now_utc - sim_time.replace(tzinfo=timezone.utc)).total_seconds() / 3600.0 if sim_time else 999.0

        if age_hours <= 2.0:
            status_text = "SIM Tracking Update"
            variant = "success"
        elif age_hours <= 24.0:
            status_text = "SIM Cellular Ping"
            variant = "warning"
        else:
            status_text = "Stale SIM Data (>24h)"
            variant = "neutral"

        loc = getattr(latest_sim, "last_location_address", None) or getattr(latest_sim, "origin_address", None) or "Cell Tower Triangulation"
        ts_str = sim_time.strftime("%Y-%m-%d %H:%M UTC") if sim_time else "Recent"

        card = StructuredCard(
            card_type="tracking",
            title=f"SIM Tracking: {clean_v or latest_sim.driver_phone or 'Trip'}",
            subtitle="Cellular Tower Triangulation • Source: Telecom Carrier Ping",
            badge={"text": status_text, "variant": variant},
            metrics=[
                {"label": "Source", "value": "Telecom Carrier SIM"},
                {"label": "Status", "value": status_text},
                {"label": "Driver Phone", "value": latest_sim.driver_phone or "Registered"},
                {"label": "Last Location", "value": loc},
                {"label": "Last Updated", "value": ts_str},
            ],
            items=[{
                "primary": f"Cell Tower: {loc}",
                "secondary": f"Ping Time: {ts_str} • Driver: {latest_sim.driver_phone or 'N/A'}",
                "status": status_text,
            }],
            action={"label": "Open SIM Tracking", "href": "/tracking/sim"},
        )
        if lang == "hinglish":
            msg = f"Vehicle **{clean_v or latest_sim.driver_phone}** ke liye SIM telemetry: **{status_text}** at **{loc}** ({ts_str})."
        elif lang == "hi_devanagari":
            msg = f"वाहन **{clean_v or latest_sim.driver_phone}** के लिए सिम ट्रैकिंग टेलीमेट्री: **{status_text}** स्थान **{loc}** ({ts_str})।"
        else:
            msg = f"SIM telemetry for **{clean_v or latest_sim.driver_phone}**: **{status_text}** at **{loc}** ({ts_str})."
        return msg, [card]

    # 3. Check FASTag toll plaza transactions (point-in-time plaza crossings, NOT continuous tracking)
    fastag_trips = []
    try:
        fastag_trips = await list_fastag_trips(db, vehicle=clean_v, limit=3)
    except Exception:
        fastag_trips = []

    if fastag_trips:
        latest_ft = fastag_trips[0]
        toll_time = latest_ft.last_toll_time or latest_ft.updated_at or latest_ft.created_at
        age_hours = (now_utc - toll_time.replace(tzinfo=timezone.utc)).total_seconds() / 3600.0 if toll_time else 999.0

        if age_hours <= 24.0:
            status_text = "FASTag Toll Observation"
            variant = "warning"
        elif (getattr(latest_ft, "status", None) or "").lower() == "delayed":
            status_text = "Delayed FASTag Data (>24h)"
            variant = "warning"
        else:
            status_text = "Stale FASTag Data (>24h)"
            variant = "neutral"

        toll_location = getattr(latest_ft, 'last_toll_name', None) or getattr(latest_ft, 'last_toll_plaza', None) or getattr(latest_ft, 'current_toll', None) or 'Checkpoint Recorded'
        timestamp_str = toll_time.strftime("%Y-%m-%d %H:%M:%S UTC") if toll_time else "Recent"

        card = StructuredCard(
            card_type="tracking",
            title=f"FASTag Toll Event: {latest_ft.vehicle_number}",
            subtitle="Point-in-time plaza crossing (not continuous GPS) • Source: NETC FASTag",
            badge={"text": status_text, "variant": variant},
            metrics=[
                {"label": "Source", "value": "NETC FASTag Toll"},
                {"label": "Status", "value": status_text},
                {"label": "Toll Plaza", "value": toll_location},
                {"label": "Observed At", "value": timestamp_str},
            ],
            items=[{
                "primary": f"Toll Plaza Crossing: {toll_location}",
                "secondary": f"Time: {timestamp_str} • Trip: {latest_ft.status or 'Recorded'}",
                "status": status_text,
            }],
            action={"label": "Open FASTag Tracking", "href": "/tracking/fastag"},
        )

        if lang == "hinglish":
            msg = f"Vehicle **{latest_ft.vehicle_number}** ka FASTag status: **{status_text}** (Point-in-time toll plaza event). Last recorded checkpoint at **{toll_location}** ({timestamp_str})."
        elif lang == "hi_devanagari":
            msg = f"वाहन **{latest_ft.vehicle_number}** का फास्टैग स्टेटस: **{status_text}** (टोल प्लाजा चेकपॉइंट)। अंतिम दर्ज स्थान: **{toll_location}** ({timestamp_str})।"
        else:
            msg = f"Tracking for **{latest_ft.vehicle_number}**: **{status_text}** (Point-in-time toll plaza event, not continuous GPS). Last observed at **{toll_location}** ({timestamp_str})."

        return msg, [card]

    # 4. Tracking Unavailable
    target_name = clean_v or "Requested vehicle"
    card = StructuredCard(
        card_type="tracking",
        title=f"Tracking Status: {target_name}",
        subtitle="No live telematics returned by configured services",
        badge={"text": "Tracking Unavailable", "variant": "neutral"},
        metrics=[
            {"label": "GPS Status", "value": "Service Unlinked"},
            {"label": "SIM Trip", "value": "No Active Session"},
            {"label": "FASTag", "value": "No Toll Hits"},
        ],
        action={"label": "Set Up FASTag / GPS", "href": "/tracking/fastag"},
    )

    if lang == "hinglish":
        msg = f"Vehicle **{target_name}** ke liye telematics **Tracking Unavailable** hai. Koi live GPS ping, active SIM session, ya FASTag toll hit record nahi mila."
    elif lang == "hi_devanagari":
        msg = f"वाहन **{target_name}** के लिए टेलीमैटिक्स **ट्रैकिंग अनुपलब्ध (Tracking Unavailable)** है। कोई लाइव GPS, सक्रिय SIM सत्र, या FASTag टोल रिकॉर्ड नहीं मिला।"
    else:
        msg = f"Telematics for **{target_name}** is currently **Tracking Unavailable**. No live GPS positions, active SIM tracking sessions, or FASTag toll checkpoints were found."

    return msg, [card]


async def execute_accounting_tool(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch],
    party_name: Optional[str] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """
    Retrieves authorized Master Ledger balances (Billing Clients, Vendors, Drivers).
    Prevents leaking confidential raw numbers to external AI by generating structured cards.
    """
    if not is_user_permitted(user, tenant, "accounts", "master_ledger", "view"):
        msg = (
            "Aapke paas Master Ledger dekhne ki permission nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to view Master Ledger accounts."
        )
        card = StructuredCard(
            card_type="ledger_summary",
            title="Accounting Access Restricted",
            subtitle="Missing permission: accounts.master_ledger.view",
            badge={"text": "Access Denied", "variant": "danger"},
        )
        return msg, [card]

    eff_office_id = get_effective_office_id(user, current_office)
    if eff_office_id == -1:
        msg = (
            "Aapka koi active branch assign nahi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have an active branch assigned."
        )
        card = StructuredCard(
            card_type="ledger_summary",
            title="Accounting Ledger",
            subtitle="No active branch assigned to your user account",
            badge={"text": "0 Results", "variant": "neutral"},
            items=[],
            action={"label": "View Master Ledger", "href": "/accounts/master-ledger"},
        )
        return msg, [card]

    # 1. Specific Party Ledger Search
    if party_name:
        clients = await list_billing_client_ledgers(db, office_id=eff_office_id, search=party_name)
        vendors = await list_vendor_ledgers(db, office_id=eff_office_id, search=party_name)
        drivers = await list_driver_ledgers(db, office_id=eff_office_id, search=party_name)

        matched_items = []
        for c in clients:
            matched_items.append({
                "name": c.name,
                "type": "Billing Client",
                "debit": float(c.total_debit or 0.0),
                "credit": float(c.total_credit or 0.0),
                "balance": float(c.outstanding_balance or 0.0),
                "balance_type": c.balance_type or "DR",
            })
        for v in vendors:
            matched_items.append({
                "name": v.name,
                "type": "Vendor",
                "debit": float(v.total_debit or 0.0),
                "credit": float(v.total_credit or 0.0),
                "balance": float(v.outstanding_balance or 0.0),
                "balance_type": v.balance_type or "CR",
            })
        for d in drivers:
            matched_items.append({
                "name": d.name,
                "type": "Driver",
                "debit": float(d.total_debit or 0.0),
                "credit": float(d.total_credit or 0.0),
                "balance": float(d.outstanding_balance or 0.0),
                "balance_type": d.balance_type or "CR",
            })

        if not matched_items:
            card = StructuredCard(
                card_type="party_ledger",
                title=f"Ledger: {party_name}",
                subtitle="No accounts found matching name in active office scope",
                badge={"text": "0 Results", "variant": "neutral"},
                action={"label": "Open Master Ledger", "href": "/accounts/master-ledger"},
            )
            msg = f"No ledger records found for '{party_name}'."
            return msg, [card]

        first = matched_items[0]
        card = StructuredCard(
            card_type="party_ledger",
            title=f"Ledger: {first['name']}",
            subtitle=f"{first['type']} • Master Ledger",
            badge={"text": f"Balance: {first['balance_type']}", "variant": "warning" if first["balance_type"] == "DR" else "success"},
            metrics=[
                {"label": "Net Outstanding", "value": f"₹{first['balance']:,.2f} {first['balance_type']}"},
                {"label": "Total Debit", "value": f"₹{first['debit']:,.2f}"},
                {"label": "Total Credit", "value": f"₹{first['credit']:,.2f}"},
            ],
            items=[{
                "primary": m["name"],
                "secondary": f"{m['type']} • DR: ₹{m['debit']:,.2f} | CR: ₹{m['credit']:,.2f}",
                "amount": f"₹{m['balance']:,.2f} {m['balance_type']}",
                "status": "Receivable" if m["balance_type"] == "DR" else "Payable",
            } for m in matched_items],
            action={"label": "View Full Statement", "href": "/accounts/master-ledger"},
        )

        if lang == "hinglish":
            msg = f"**{first['name']}** ka ledger balance: **₹{first['balance']:,.2f} {first['balance_type']}** ({first['type']}). Niche card mein statement summary dekhein."
        elif lang == "hi_devanagari":
            msg = f"**{first['name']}** का लेज़र बैलेंस: **₹{first['balance']:,.2f} {first['balance_type']}** ({first['type']})। नीचे कार्ड में विवरण देखें।"
        else:
            msg = f"Retrieved ledger balance for **{first['name']}**: **₹{first['balance']:,.2f} {first['balance_type']}** ({first['type']})."

        return msg, [card]

    # 2. General Master Ledger Summary / Pending Balances
    summary = await get_master_ledger_summary(db, office_id=eff_office_id)
    client_stat = summary.billing_clients
    vendor_stat = summary.vendors
    driver_stat = summary.drivers

    card = StructuredCard(
        card_type="ledger_summary",
        title="Master Ledger Overview",
        subtitle=f"Branch: {current_office.name if current_office else 'All Offices'}",
        badge={"text": "Live Accounts", "variant": "success"},
        metrics=[
            {"label": "Clients Outstanding", "value": f"₹{float(client_stat.total_outstanding or 0.0):,.2f}"},
            {"label": "Vendors Payable", "value": f"₹{float(vendor_stat.total_outstanding or 0.0):,.2f}"},
            {"label": "Drivers Payable", "value": f"₹{float(driver_stat.total_outstanding or 0.0):,.2f}"},
        ],
        items=[
            {
                "primary": "Billing Clients (Receivables)",
                "secondary": f"{client_stat.pending_count} pending, {client_stat.settled_count} settled accounts",
                "amount": f"₹{float(client_stat.total_outstanding or 0.0):,.2f}",
                "status": "Receivable",
            },
            {
                "primary": "Vendors & Suppliers",
                "secondary": f"{vendor_stat.pending_count} pending, {vendor_stat.settled_count} settled accounts",
                "amount": f"₹{float(vendor_stat.total_outstanding or 0.0):,.2f}",
                "status": "Payable",
            },
            {
                "primary": "Drivers & Operators",
                "secondary": f"{driver_stat.pending_count} pending, {driver_stat.settled_count} settled accounts",
                "amount": f"₹{float(driver_stat.total_outstanding or 0.0):,.2f}",
                "status": "Payable",
            },
        ],
        action={"label": "Open Master Ledger", "href": "/accounts/master-ledger"},
    )

    if lang == "hinglish":
        msg = (
            f"Aapke active branch ka **Master Ledger Summary** tayyar hai:\n"
            f"- Clients Outstanding: **₹{float(client_stat.total_outstanding or 0.0):,.2f}**\n"
            f"- Vendors Payable: **₹{float(vendor_stat.total_outstanding or 0.0):,.2f}**\n"
            f"- Drivers Payable: **₹{float(driver_stat.total_outstanding or 0.0):,.2f}**"
        )
    elif lang == "hi_devanagari":
        msg = (
            f"आपकी सक्रिय शाखा का **मास्टर लेज़र सारांश**:\n"
            f"- ग्राहकों का बकाया (Clients Outstanding): **₹{float(client_stat.total_outstanding or 0.0):,.2f}**\n"
            f"- विक्रेताओं की देनदारी (Vendors Payable): **₹{float(vendor_stat.total_outstanding or 0.0):,.2f}**\n"
            f"- चालकों की देनदारी (Drivers Payable): **₹{float(driver_stat.total_outstanding or 0.0):,.2f}**"
        )
    else:
        msg = (
            f"Here is your active branch **Master Ledger Summary**:\n"
            f"- Clients Outstanding: **₹{float(client_stat.total_outstanding or 0.0):,.2f}**\n"
            f"- Vendors Payable: **₹{float(vendor_stat.total_outstanding or 0.0):,.2f}**\n"
            f"- Drivers Payable: **₹{float(driver_stat.total_outstanding or 0.0):,.2f}**"
        )

    return msg, [card]


# ==============================================================================
# INTENT CLASSIFICATION & DISPATCH
# ==============================================================================


# ==============================================================================
# TRANSPORT IDENTIFIER & INTENT EXTRACTION
# ==============================================================================

def extract_transport_entities(text: str) -> Dict[str, Any]:
    """
    Extracts transport domain entities (LR, Hire Challan, Job, Vehicle) and intent
    types (tracking, detail request, count) from natural language input.
    """
    clean = text.strip()
    lower = clean.lower()

    # Tracking intent keywords
    tracking_words = [
        "track", "tracking", "kahan hai", "kahan pahunchi", "location", "location of",
        "where is", "toll hit", "toll plaza", "gps status", "sim status",
        "fastag status", "live status", "कहाँ है", "ट्रैक", "लोकेशन"
    ]
    is_track = any(w in lower for w in tracking_words)

    # Detail intent keywords
    detail_words = [
        "detail", "details", "info", "information", "batao", "bataiye",
        "dikhao", "status", "vivaran", "kya hai", "tell me", "show me",
        "all info", "puri detail", "sab batao", "jaankari", "जानकारी", "विवरण"
    ]
    is_detail = any(w in lower for w in detail_words)

    # 1. Indian vehicle number regex
    vehicle_match = re.search(r"\b([A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4})\b", clean, re.IGNORECASE)
    vehicle_number = vehicle_match.group(1).upper() if vehicle_match else None

    # 2. LR / GR / Bilty identifier
    m_lr_direct = re.search(r"\b((?:lr|gr|bilty)[-_/\s]?[0-9][A-Za-z0-9_-]*|(?:lr|gr|bilty)-[A-Za-z0-9_-]+)\b", clean, re.IGNORECASE)
    m_lr_num = re.search(r"\b(?:lr|gr|bilty)\s*(?:number|no\.?|num)?\s*[:#-]?\s*([A-Za-z0-9_-]*[0-9][A-Za-z0-9_-]*)", clean, re.IGNORECASE)
    lr_id = None
    if m_lr_direct:
        lr_id = m_lr_direct.group(1).strip()
    elif m_lr_num:
        lr_id = m_lr_num.group(1).strip()
        
    if lr_id and vehicle_number and lr_id.upper() == vehicle_number:
        lr_id = None

    # 3. HC / Hire Challan identifier
    m_hc_direct = re.search(r"\b((?:hc)[-_/\s]?[0-9][A-Za-z0-9_-]*|hc-[A-Za-z0-9_-]+)\b", clean, re.IGNORECASE)
    m_hc_num = re.search(r"\b(?:hire\s+challan|challan|hc)\s*(?:number|no\.?|num)?\s*[:#-]?\s*([A-Za-z0-9_-]*[0-9][A-Za-z0-9_-]*)", clean, re.IGNORECASE)
    hc_id = None
    if m_hc_direct:
        hc_id = m_hc_direct.group(1).strip()
    elif m_hc_num:
        hc_id = m_hc_num.group(1).strip()
    if hc_id:
        hc_id = re.sub(r"^(?:hire\s+challan|challan)\s*", "", hc_id, flags=re.IGNORECASE).strip()

    # 4. Job identifier
    m_job_direct = re.search(r"\b((?:job)[-_/\s]?[0-9][A-Za-z0-9_-]*|job-[A-Za-z0-9_-]+)\b", clean, re.IGNORECASE)
    m_job_num = re.search(r"\b(?:transport\s+job|job\s+order|job)\s*(?:number|no\.?|num)?\s*[:#-]?\s*([A-Za-z0-9_-]*[0-9][A-Za-z0-9_-]*)", clean, re.IGNORECASE)
    job_id = None
    if m_job_direct:
        job_id = m_job_direct.group(1).strip()
    elif m_job_num:
        job_id = m_job_num.group(1).strip()

    return {
        "lr_number": lr_id,
        "hc_number": hc_id,
        "job_number": job_id,
        "vehicle_number": vehicle_number,
        "is_track": is_track,
        "is_detail": is_detail,
    }

def classify_operational_intent(text: str) -> Optional[Dict[str, Any]]:
    """
    Classifies user natural language query into an operational tool request.
    Distinguishes operational data queries from conceptual 'how-to' questions.
    """
    clean_text = text.strip()
    lower = clean_text.lower()

    # If the user is asking a conceptual / instructional question, return None so RAG handles it
    from app.modules.ai.lr_draft_service import is_instructional_inquiry, is_lr_booking_intent
    from app.modules.ai.job_draft_service import is_job_booking_intent
    from app.modules.ai.hire_challan_draft_service import is_hire_challan_intent

    # Prevent intercepting conversational booking intents
    if is_lr_booking_intent(clean_text) or is_job_booking_intent(clean_text) or is_hire_challan_intent(clean_text):
        return None

    if is_instructional_inquiry(clean_text):
        return None

    # Detect count intent words in English, Hindi, and Hinglish
    count_markers = ("kitni", "kitne", "kitna", "how many", "count", "total", "number of", "mere", "meri", "hamare", "list", "dikhao", "batao", "कितने", "कितनी", "कितना", "कुल", "संख्या")
    is_count = any(w in lower for w in count_markers)

    entities = extract_transport_entities(clean_text)
    extracted_vehicle = entities["vehicle_number"]

    # 1. Tracking Intent (by vehicle, LR number, or Challan number)
    if entities["is_track"]:
        if entities["vehicle_number"]:
            return {"tool": "tracking", "vehicle_number": entities["vehicle_number"]}
        if entities["lr_number"]:
            return {"tool": "tracking", "lr_number": entities["lr_number"]}
        if entities["hc_number"]:
            return {"tool": "tracking", "challan_number": entities["hc_number"]}

    # 2. Specific LR Detail Query
    if entities["lr_number"]:
        return {
            "tool": "lr",
            "query": entities["lr_number"],
            "is_detail": True,
            "is_today": "aaj" in lower or "today" in lower,
        }

    # 3. Specific Hire Challan Detail Query
    if entities["hc_number"]:
        return {
            "tool": "hire_challan",
            "query": entities["hc_number"],
            "is_detail": True,
            "is_today": "aaj" in lower or "today" in lower,
        }

    # 4. Specific Job Order Detail Query
    if entities["job_number"]:
        return {
            "tool": "job",
            "query": entities["job_number"],
            "is_detail": True,
            "is_today": "aaj" in lower or "today" in lower,
        }

    # 0A. Client / Customer Intent
    client_markers = ["client", "clients", "billing client", "billing clients", "grahak", "customer", "customers", "क्लाइंट", "ग्राहक"]
    if any(m in lower for m in client_markers):
        return {
            "tool": "client",
            "is_count": is_count,
        }

    # 0B. Vendor / Supplier Intent
    vendor_markers = ["vendor", "vendors", "supplier", "suppliers", "gadi malik", "transporter master", "वेंडर", "सप्लायर"]
    if any(m in lower for m in vendor_markers):
        return {
            "tool": "vendor",
            "is_count": is_count,
        }

    # 0C. Transport Job Operational Intent (Counts & Listings)
    job_markers = ["job", "jobs", "job order", "job orders", "transport job", "transport jobs", "जॉब"]
    if any(m in lower for m in job_markers):
        return {
            "tool": "job",
            "is_count": is_count,
            "is_today": "aaj" in lower or "today" in lower,
        }

    # 5. Specific Vehicle Query
    if entities["vehicle_number"] and (entities["is_detail"] or "vehicle" in lower or "gaadi" in lower or "gadi" in lower or "truck" in lower):
        return {
            "tool": "vehicle",
            "query": entities["vehicle_number"],
        }

    # 2. Accounting / Ledger Intent
    accounting_markers = [
        "ledger", "khata", "hisab", "hisaab", "pending payment", "pending payments",
        "outstanding", "balance", "kitne paise", "baki hai", "dues", "receivable", "payable",
    ]
    if any(m in lower for m in accounting_markers):
        # Extract party name if specified
        party_name = None
        m_party = re.search(r"([A-Za-z0-9\s&]+?)\s+(?:ka|ki)\s+(?:ledger|khata|hisab|hisaab)", clean_text, re.IGNORECASE)
        if m_party:
            party_name = m_party.group(1).strip()
        else:
            m_party_eng = re.search(r"(?:ledger|khata|account)\s+(?:of|for)\s+([A-Za-z0-9\s&]+)", clean_text, re.IGNORECASE)
            if m_party_eng:
                party_name = m_party_eng.group(1).strip()

        # Filter out common stop-words in party extraction
        if party_name and party_name.lower() in ("master", "general", "client", "vendor", "driver", "mere", "mera", "all"):
            party_name = None

        return {
            "tool": "accounting",
            "party_name": party_name,
        }

    # 3. LR / GR Intent (Read-Only Search)
    from app.modules.ai.lr_draft_service import is_lr_booking_intent
    if is_lr_booking_intent(clean_text):
        return None

    lr_markers = ["lr", "lrs", "gr", "bilty", "bilties", "consignment"]
    if any(m in lower for m in lr_markers):
        # Check if looking for today's LRs or specific status
        is_today = "aaj" in lower or "today" in lower
        status_filter = None
        if "delivered" in lower:
            status_filter = "Delivered"
        elif "in transit" in lower or "transit" in lower:
            status_filter = "In Transit"
        elif "booked" in lower:
            status_filter = "Booked"

        # Check for specific LR number pattern e.g. LR-2024-001 or LR 1024
        lr_num_match = re.search(r"\b((?:lr|gr|bilty)[-_\s#]*[0-9][A-Za-z0-9_-]*)\b", clean_text, re.IGNORECASE)
        lr_query = None
        if lr_num_match:
            lr_query = lr_num_match.group(1).strip()
            if extracted_vehicle and extracted_vehicle in lr_query.replace("-", "").replace(" ", "").upper():
                extracted_vehicle = None

        return {
            "tool": "lr",
            "query": lr_query,
            "vehicle_number": extracted_vehicle,
            "status_filter": status_filter,
            "is_today": is_today,
        }

    # 4. Vehicle Intent
    vehicle_markers = ["vehicle", "vehicles", "gaadi", "gadi", "truck", "trucks", "lorry", "fleet"]
    if any(m in lower for m in vehicle_markers):
        v_type = None
        if "market" in lower or "bazar" in lower or "bazaar" in lower or "vendor" in lower:
            v_type = "market"
        elif "company" in lower or "own" in lower:
            v_type = "company"
        return {
            "tool": "vehicle",
            "query": extracted_vehicle,
            "vehicle_type": v_type,
        }

    # 5. Driver Intent
    driver_markers = ["driver", "drivers", "chalak", "sarathi", "ड्राइवर", "चालक", "सारथी"]
    if any(m in lower for m in driver_markers):
        # Extract potential name if query format "driver search Ramesh" or "driver Ramesh"
        d_match = re.search(r"(?:driver|chalak)\s+([A-Za-z]+)", clean_text, re.IGNORECASE)
        driver_name = d_match.group(1).strip() if d_match and d_match.group(1).lower() not in ("list", "dikhao", "search", "details", "master") else None
        return {
            "tool": "driver",
            "query": driver_name,
            "is_count": is_count,
        }

    return None
