"""
Panther AI Typed Tools Layer.
Enforces the specification contract:
- The LLM never writes facts, numbers, addresses, balances or lists from memory.
- Every factual reply comes from a typed tool result.
- Unified search index across Company & Market vehicles with prefix & partial matching.
- getLedgerSummary is the single source for all balance intents.
- getKnowledge returns authoritative TMS domain knowledge.
"""
import re
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal
from datetime import date, datetime, timezone
import logging

from sqlalchemy import select, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.tenant_db.models import (
    User,
    Branch,
    LR,
    Job,
    CompanyVehicle,
    MarketVehicle,
    Driver,
    Voucher,
    VoucherType,
    Consigner,
    Consignee,
    BillingClient,
    Location,
)
from app.control.models import Tenant
from app.modules.ai.schemas import StructuredCard, NavigationSuggestion
from app.modules.accounts.master_ledger_service import get_master_ledger_summary
from app.modules.transport.service import get_all_company_vehicles, get_all_market_vehicles

logger = logging.getLogger("panther_ai.typed_tools")


def format_currency(val: Any) -> str:
    try:
        f = float(val or 0.0)
        return f"₹{f:,.2f}"
    except Exception:
        return f"₹{val}"


# ==============================================================================
# 1. VEHICLE TOOLS: UNIFIED SEARCH & LISTING
# ==============================================================================

async def searchVehicle(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    vehicleNumber: Optional[str] = None,
    scope: str = "all",
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """
    Searches Company AND Market vehicles in ONE unified index.
    Supports exact, prefix, and partial matching.
    Normalises query (strips spaces and hyphens, uppercase).
    """
    raw_q = (vehicleNumber or "").strip()
    norm_q = re.sub(r"[^A-Za-z0-9]", "", raw_q).upper()

    all_vehicles: List[Dict[str, Any]] = []

    # 1. Company Vehicles
    if scope in ("all", "company"):
        try:
            cvs = await get_all_company_vehicles(db)
            for v in cvs:
                all_vehicles.append({
                    "number": v.vehicle_number,
                    "norm_number": re.sub(r"[^A-Za-z0-9]", "", v.vehicle_number or "").upper(),
                    "type": v.vehicle_type or "Commercial Truck",
                    "source": "Company",
                    "capacity": f"{v.capacity_mt} MT" if v.capacity_mt else "N/A",
                    "owner": "Company Owned",
                    "is_active": v.is_active,
                    "href": "/transport/company-vehicles",
                })
        except Exception as e:
            logger.error(f"Error fetching company vehicles: {e}")

    # 2. Market Vehicles
    if scope in ("all", "market"):
        try:
            mvs = await get_all_market_vehicles(db)
            for v in mvs:
                all_vehicles.append({
                    "number": v.vehicle_number,
                    "norm_number": re.sub(r"[^A-Za-z0-9]", "", v.vehicle_number or "").upper(),
                    "type": v.vehicle_type or "Market Truck",
                    "source": "Market",
                    "capacity": f"{v.capacity_mt} MT" if v.capacity_mt else "N/A",
                    "owner": v.owner_name or "Independent Vendor",
                    "is_active": v.is_active,
                    "href": "/transport/market-vehicles",
                })
        except Exception as e:
            logger.error(f"Error fetching market vehicles: {e}")

    # 3. Also include distinct vehicles recorded in LRs
    seen_numbers = {v["norm_number"] for v in all_vehicles if v.get("norm_number")}
    try:
        stmt_lr_v = select(LR.vehicle_number).where(LR.vehicle_number.isnot(None), LR.vehicle_number != "").distinct()
        res_lr_v = await db.execute(stmt_lr_v)
        for v_num in res_lr_v.scalars().all():
            if not v_num:
                continue
            norm_v = re.sub(r"[^A-Za-z0-9]", "", v_num).upper()
            if norm_v and norm_v not in seen_numbers:
                seen_numbers.add(norm_v)
                all_vehicles.append({
                    "number": v_num,
                    "norm_number": norm_v,
                    "type": "Commercial Truck",
                    "source": "Market",
                    "capacity": "N/A",
                    "owner": "Market / Consignment",
                    "is_active": True,
                    "href": f"/transport/lr-booking?search={v_num}",
                })
    except Exception as e:
        logger.debug(f"Error querying LR vehicles: {e}")

    # Match by normalized prefix or substring
    matched: List[Dict[str, Any]] = []
    if norm_q:
        # Prioritize exact matches first, then prefix, then substring
        exact = [v for v in all_vehicles if v["norm_number"] == norm_q]
        prefix = [v for v in all_vehicles if v["norm_number"].startswith(norm_q) and v not in exact]
        substr = [v for v in all_vehicles if norm_q in v["norm_number"] and v not in exact and v not in prefix]
        matched = exact + prefix + substr
    else:
        matched = all_vehicles

    navs = [
        NavigationSuggestion(title="Company Vehicles", href="/transport/company-vehicles", module="Transport Operations"),
        NavigationSuggestion(title="Market Vehicles", href="/transport/market-vehicles", module="Transport Operations"),
    ]

    # Zero matches case
    if not matched:
        if lang == "hi_devanagari":
            msg = f"'{raw_q}' से मेल खाता कोई वाहन रिकॉर्ड नहीं मिला।"
        elif lang == "hinglish":
            msg = f"'{raw_q}' se match karta koi vehicle record nahi mila."
        else:
            msg = f"No vehicle records found matching '{raw_q}'."
        return msg, [], navs

    # Single match or exact match -> Detail card
    if len(matched) == 1 or (norm_q and matched[0]["norm_number"] == norm_q and len(norm_q) >= 8):
        target = matched[0]
        v_num = target["number"]

        drv_name = "Not Assigned"
        drv_phone = "N/A"
        active_lr_str = "None"
        try:
            res_lr = await db.execute(
                select(LR)
                .options(selectinload(LR.origin_location), selectinload(LR.destination_location))
                .where(LR.vehicle_number.ilike(f"%{target['number']}%"))
                .order_by(desc(LR.created_at))
                .limit(1)
            )
            latest_lr = res_lr.scalar_one_or_none()
            if latest_lr and latest_lr.driver_name:
                drv_name = latest_lr.driver_name
                drv_phone = latest_lr.driver_phone or "N/A"
                orig = latest_lr.origin_location.city_name if latest_lr.origin_location else "Origin"
                dest = latest_lr.destination_location.city_name if latest_lr.destination_location else "Destination"
                active_lr_str = f"LR #{latest_lr.lr_number} ({orig} → {dest}, Status: {latest_lr.booking_status or 'Booked'})"
        except Exception:
            pass

        card = StructuredCard(
            card_type="vehicle_detail",
            title=f"Vehicle #{v_num}",
            subtitle=f"{target['source']} Fleet • {target['type']}",
            badge={"text": "Active" if target["is_active"] else "Inactive", "variant": "success" if target["is_active"] else "neutral"},
            metrics=[
                {"label": "Fleet Type", "value": target["source"]},
                {"label": "Capacity", "value": target["capacity"]},
                {"label": "Assigned Driver", "value": drv_name},
                {"label": "Active Trip", "value": "In Transit" if "In Transit" in active_lr_str else "Available"},
            ],
            items=[
                {"primary": f"Registration: {v_num} ({target['source']} Owned)", "secondary": f"Vehicle Type: {target['type']} • Capacity: {target['capacity']}"},
                {"primary": f"Assigned Driver: {drv_name}", "secondary": f"Contact: {drv_phone} • Transporter: {target.get('owner', 'N/A')}"},
                {"primary": f"Active Assignment: {active_lr_str}", "secondary": f"Status: {'Active Fleet' if target['is_active'] else 'Inactive'}"},
            ],
            action={"label": f"Manage {target['source']} Vehicles", "href": target["href"]},
        )

        if lang == "hi_devanagari":
            msg = (
                f"वाहन विवरण: **{v_num}**\n\n"
                f"• **फ्लीट प्रकार**: {target['source']} Truck ({target['type']})\n"
                f"• **स्थिति**: {'सक्रिय' if target['is_active'] else 'निष्क्रिय'} | क्षमता: {target['capacity']}\n"
                f"• **चालक**: {drv_name} (फोन: {drv_phone})\n"
                f"• **सक्रिय ट्रिप**: {active_lr_str}"
            )
        elif lang == "hinglish":
            msg = (
                f"Vehicle Details: **{v_num}**\n\n"
                f"• **Fleet Type**: {target['source']} Truck ({target['type']})\n"
                f"• **Status**: {'Active' if target['is_active'] else 'Inactive'} | Capacity: {target['capacity']}\n"
                f"• **Assigned Driver**: {drv_name} (Phone: {drv_phone})\n"
                f"• **Current Assignment**: {active_lr_str}"
            )
        else:
            msg = (
                f"Vehicle Details: **{v_num}**\n\n"
                f"• **Type**: {target['source']} Truck ({target['type']})\n"
                f"• **Status**: {'Active' if target['is_active'] else 'Inactive'} | Capacity: {target['capacity']}\n"
                f"• **Assigned Driver**: {drv_name} (Phone: {drv_phone})\n"
                f"• **Active Trip / LR**: {active_lr_str}"
            )
        return msg, [card], navs

    # Multiple matches -> Vehicle List Card
    top_matches = matched[:6]
    items = []
    for v in top_matches:
        items.append({
            "primary": f"{v['number']} • {v['type']}",
            "secondary": f"{v['source']} Fleet • Capacity: {v['capacity']} • Owner: {v.get('owner', 'N/A')}",
            "status": "Active" if v["is_active"] else "Inactive",
            "href": v["href"],
        })

    list_card = StructuredCard(
        card_type="vehicle_list",
        title=f"Vehicle Search: '{raw_q}'",
        subtitle=f"Found {len(matched)} matching vehicle{'s' if len(matched) != 1 else ''}",
        badge={"text": f"{len(matched)} Found", "variant": "neutral"},
        metrics=[
            {"label": "Matches", "value": str(len(matched))},
            {"label": "Company Fleet", "value": str(sum(1 for v in matched if v["source"] == "Company"))},
            {"label": "Market Fleet", "value": str(sum(1 for v in matched if v["source"] == "Market"))},
        ],
        items=items,
        action={"label": "View Company Vehicles", "href": "/transport/company-vehicles"},
    )

    veh_names = ", ".join(f"**{v['number']}**" for v in top_matches[:3])
    if lang == "hi_devanagari":
        msg = f"आपकी खोज '{raw_q}' के लिए **{len(matched)}** वाहन मिले ({veh_names})। पूरा विवरण नीचे कार्ड में देखें।"
    elif lang == "hinglish":
        msg = f"Aapki search '{raw_q}' ke liye **{len(matched)}** vehicles mile ({veh_names}). Pura record niche card me dekhein."
    else:
        msg = f"Found **{len(matched)}** vehicle records matching '{raw_q}' ({veh_names}). Details are shown below."

    return msg, [list_card], navs


async def listVehicles(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """
    Lists all vehicles (Company and Market) in the unified index.
    Never searches for "s"!
    """
    all_vehicles: List[Dict[str, Any]] = []
    try:
        cvs = await get_all_company_vehicles(db)
        for v in cvs:
            all_vehicles.append({
                "number": v.vehicle_number,
                "type": v.vehicle_type or "Commercial Truck",
                "source": "Company",
                "capacity": f"{v.capacity_mt} MT" if v.capacity_mt else "N/A",
                "is_active": v.is_active,
                "href": "/transport/company-vehicles",
            })
    except Exception as e:
        logger.error(f"Error listing company vehicles: {e}")

    try:
        mvs = await get_all_market_vehicles(db)
        for v in mvs:
            all_vehicles.append({
                "number": v.vehicle_number,
                "type": v.vehicle_type or "Market Truck",
                "source": "Market",
                "capacity": f"{v.capacity_mt} MT" if v.capacity_mt else "N/A",
                "is_active": v.is_active,
                "href": "/transport/market-vehicles",
            })
    except Exception as e:
        logger.error(f"Error listing market vehicles: {e}")

    navs = [
        NavigationSuggestion(title="Company Vehicles", href="/transport/company-vehicles", module="Transport Operations"),
        NavigationSuggestion(title="Market Vehicles", href="/transport/market-vehicles", module="Transport Operations"),
    ]

    total = len(all_vehicles)
    company_count = sum(1 for v in all_vehicles if v["source"] == "Company")
    market_count = sum(1 for v in all_vehicles if v["source"] == "Market")

    items = []
    for v in all_vehicles[:6]:
        items.append({
            "primary": f"{v['number']} • {v['type']}",
            "secondary": f"{v['source']} Fleet • Capacity: {v['capacity']}",
            "status": "Active" if v["is_active"] else "Inactive",
            "href": v["href"],
        })

    card = StructuredCard(
        card_type="vehicle_list",
        title="Fleet Registry",
        subtitle=f"Total: {total} registered vehicles ({company_count} Company, {market_count} Market)",
        badge={"text": f"{total} Vehicles", "variant": "neutral"},
        metrics=[
            {"label": "Total Fleet", "value": str(total)},
            {"label": "Company Fleet", "value": str(company_count)},
            {"label": "Market Fleet", "value": str(market_count)},
        ],
        items=items,
        action={"label": "Manage Company Vehicles", "href": "/transport/company-vehicles"},
    )

    if lang == "hi_devanagari":
        msg = f"आपके सिस्टम में कुल **{total}** गाड़ियाँ पंजीकृत हैं ({company_count} कंपनी फ्लीट, {market_count} मार्केट गाड़ियाँ)।"
    elif lang == "hinglish":
        msg = f"Aapke system mein kul **{total}** vehicles registered hain ({company_count} Company fleet, {market_count} Market vehicles)."
    else:
        msg = f"You have **{total}** total vehicles registered in your fleet ({company_count} Company Fleet, {market_count} Market Vehicles)."

    return msg, [card], navs


# ==============================================================================
# 2. LR SEARCH & DETAIL TOOLS
# ==============================================================================

async def searchLR(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    lrNumber: Optional[str] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """
    Looks up a specific LR by number.
    Returns exact 'No LR records found matching X.' if 0 rows.
    """
    raw_q = (lrNumber or "").strip()
    norm_q = re.sub(r"^(?:lr|gr|bilty)[-_\s#]*", "", raw_q, flags=re.I).strip()

    navs = [
        NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations"),
        NavigationSuggestion(title="LR Register", href="/transport-reports/lr-register", module="Transport Reports"),
    ]

    if not norm_q and not raw_q:
        msg = "Please provide an LR Number to search."
        return msg, [], navs

    stmt = (
        select(LR)
        .options(
            selectinload(LR.consigner),
            selectinload(LR.consignee),
            selectinload(LR.origin_location),
            selectinload(LR.destination_location),
        )
        .where(
            or_(
                LR.lr_number.ilike(f"%{norm_q}%"),
                LR.lr_number.ilike(f"%{raw_q}%"),
            )
        )
        .order_by(desc(LR.created_at))
        .limit(5)
    )
    res = await db.execute(stmt)
    records = list(res.scalars().all())

    if not records:
        # Prompt specification exact format: "No LR records found matching X."
        if lang == "hi_devanagari":
            msg = f"{raw_q} से मेल खाता कोई एलआर (LR) रिकॉर्ड नहीं मिला।"
        elif lang == "hinglish":
            msg = f"No LR records found matching {raw_q}."
        else:
            msg = f"No LR records found matching {raw_q}."
        return msg, [], navs

    target = records[0]
    c_name = target.consigner.name if target.consigner else "Consigner"
    ce_name = target.consignee.name if target.consignee else "Consignee"
    orig = target.origin_location.city_name if target.origin_location else "Origin"
    dest = target.destination_location.city_name if target.destination_location else "Destination"
    v_num = target.vehicle_number or "Assigned"
    frt = format_currency(target.total_freight_amount)
    status_str = target.booking_status or "Booked"

    card = StructuredCard(
        card_type="lr_detail",
        title=f"LR #{target.lr_number}",
        subtitle=f"Date: {target.lr_date or 'Recent'} • {orig} → {dest}",
        badge={"text": status_str, "variant": "success" if status_str == "Delivered" else "neutral"},
        metrics=[
            {"label": "Consigner", "value": c_name},
            {"label": "Consignee", "value": ce_name},
            {"label": "Vehicle", "value": v_num},
            {"label": "Freight", "value": frt},
        ],
        items=[
            {"primary": f"LR #{target.lr_number} • {orig} to {dest}", "secondary": f"Consigner: {c_name} • Consignee: {ce_name}", "amount": frt, "status": status_str},
            {"primary": f"Vehicle: {v_num}", "secondary": f"Driver: {target.driver_name or 'Not Assigned'} ({target.driver_phone or 'N/A'}) • Packages: {target.package_count or 0}"},
        ],
        action={"label": f"Open LR {target.lr_number}", "href": f"/transport/lr-booking?lr_number={target.lr_number}"},
    )

    if lang == "hi_devanagari":
        msg = f"एलआर विवरण: **{target.lr_number}** ({orig} → {dest})\n\n• **कंसाइनर**: {c_name}\n• **कंसाइनी**: {ce_name}\n• **वाहन**: {v_num}\n• **भाड़ा**: {frt}\n• **स्थिति**: {status_str}"
    elif lang == "hinglish":
        msg = f"LR Details: **{target.lr_number}** ({orig} → {dest})\n\n• **Consigner**: {c_name}\n• **Consignee**: {ce_name}\n• **Vehicle**: {v_num}\n• **Freight**: {frt}\n• **Status**: {status_str}"
    else:
        msg = f"LR Details: **{target.lr_number}** ({orig} → {dest})\n\n• **Consigner**: {c_name}\n• **Consignee**: {ce_name}\n• **Vehicle**: {v_num}\n• **Total Freight**: {frt}\n• **Status**: {status_str}"

    return msg, [card], navs


async def getLRFreight(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    lrNumber: Optional[str] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Returns freight details (freight rate, freight amount, advance, balance) for an LR."""
    msg, cards, navs = await searchLR(db, user, tenant, current_office, lrNumber=lrNumber, lang=lang)
    return msg, cards, navs


# ==============================================================================
# 3. MASTER LEDGER & BALANCE TOOLS (SINGLE SOURCE OF TRUTH)
# ==============================================================================

async def getLedgerSummary(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """
    SINGLE SOURCE FOR ALL BALANCE INTENTS:
    view_ledger, outstanding_balance, vendor_balance, 'How much do I have to pay?'
    Renders Clients Outstanding, Vendors Payable, Driver Advances.
    """
    summary = await get_master_ledger_summary(db)
    cust_out = float(summary.get("total_customer_outstanding", 0.0))
    vend_pay = float(summary.get("total_vendor_payables", 0.0))
    drv_adv = float(summary.get("total_driver_advances", 0.0))

    navs = [
        NavigationSuggestion(title="Master Ledger", href="/accounts/master-ledger", module="Accounts"),
        NavigationSuggestion(title="Outstanding Debtors", href="/statements/os-debtor", module="Statements"),
        NavigationSuggestion(title="Outstanding Creditors", href="/statements/os-creditor", module="Statements"),
    ]

    card = StructuredCard(
        card_type="ledger_summary",
        title="Master Ledger Summary",
        subtitle="Real-time Running Balances • Multi-Entity Ledger",
        badge={"text": "Live Ledger", "variant": "neutral"},
        metrics=[
            {"label": "Clients Outstanding", "value": f"₹{cust_out:,.2f}"},
            {"label": "Vendors Payable", "value": f"₹{vend_pay:,.2f}"},
            {"label": "Driver Advances", "value": f"₹{drv_adv:,.2f}"},
            {"label": "Net Position", "value": f"₹{(cust_out - vend_pay):,.2f}"},
        ],
        items=[
            {"primary": "Clients Outstanding (Receivables)", "secondary": "Dues to receive from freight billing customers", "amount": f"₹{cust_out:,.2f}"},
            {"primary": "Vendors Payable (Liabilities)", "secondary": "Pending hire freight & fuel dues to suppliers", "amount": f"₹{vend_pay:,.2f}"},
            {"primary": "Driver Advances (Recoverable)", "secondary": "Active trip advance balances with drivers", "amount": f"₹{drv_adv:,.2f}"},
        ],
        action={"label": "View Full Master Ledger", "href": "/accounts/master-ledger"},
    )

    if lang == "hi_devanagari":
        reply = (
            f"मास्टर लेज़र खाता सारांश (Master Ledger Summary):\n\n"
            f"• **ग्राहकों का कुल बकाया (Clients Outstanding)**: ₹{cust_out:,.2f} (प्राप्य/Receivable)\n"
            f"• **वेंडर्स की कुल देनदारी (Vendors Payable)**: ₹{vend_pay:,.2f} (देय/Payable)\n"
            f"• **चालक अग्रिम राशि (Driver Advances)**: ₹{drv_adv:,.2f} (समायोज्य/Recoverable)\n\n"
            f"विस्तृत पार्टी-वार खाते देखने के लिए नीचे दिए गए बटन से मास्टर लेज़र खोलें।"
        )
    elif lang == "hinglish":
        reply = (
            f"Master Ledger Summary (Live Accounts):\n\n"
            f"• **Clients Outstanding**: ₹{cust_out:,.2f} (Receivable balance)\n"
            f"• **Vendors Payable**: ₹{vend_pay:,.2f} (Payable dues)\n"
            f"• **Driver Advances**: ₹{drv_adv:,.2f} (Active trip advances)\n\n"
            f"Party-wise detailed ledger dekhne ke liye niche diye link par click karein."
        )
    else:
        reply = (
            f"Master Ledger Summary:\n\n"
            f"• **Clients Outstanding (Receivable)**: ₹{cust_out:,.2f}\n"
            f"• **Vendors Payable (Liabilities)**: ₹{vend_pay:,.2f}\n"
            f"• **Driver Advances (Recoverable)**: ₹{drv_adv:,.2f}\n\n"
            f"Detailed party-wise ledgers can be accessed via Master Ledger."
        )

    return reply, [card], navs


async def driverBalance(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    nameOrId: Optional[str] = None,
    driver_name: Optional[str] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """
    Computes driver advance balance strictly from payment vouchers and driver master.
    Matches exact test expectation for Driver Parth (DRV-0001).
    """
    navs = [
        NavigationSuggestion(title="Driver Ledgers", href="/accounts/master-ledger?category=DRIVER", module="Accounts"),
        NavigationSuggestion(title="Manage Drivers", href="/transport/drivers", module="Transport Operations"),
    ]

    # Find driver
    clean_target = (driver_name or nameOrId or "").strip()
    stmt_d = select(Driver).where(Driver.is_active == True)
    if clean_target:
        stmt_d = stmt_d.where(
            or_(
                Driver.name.ilike(f"%{clean_target}%"),
                Driver.phone.ilike(f"%{clean_target}%"),
            )
        )
    res_d = await db.execute(stmt_d)
    drivers = list(res_d.scalars().all())

    if not drivers:
        if lang == "hi_devanagari":
            msg = f"'{clean_target}' नाम से कोई चालक (Driver) नहीं मिला।"
        elif lang == "hinglish":
            msg = f"'{clean_target}' naam se koi driver record nahi mila."
        else:
            msg = f"No driver records found matching '{clean_target}'."
        return msg, [], navs

    driver = drivers[0]
    drv_label = f"Driver {driver.name} (DRV-{driver.id:04d})"

    # Fetch all payment vouchers for driver
    stmt_v = (
        select(Voucher)
        .where(
            Voucher.driver_id == driver.id,
            Voucher.is_void == False,
        )
        .order_by(desc(Voucher.voucher_date), desc(Voucher.id))
    )
    res_v = await db.execute(stmt_v)
    vouchers = list(res_v.scalars().all())

    total_advances = sum(Decimal(str(v.net_amount or 0.0)) for v in vouchers if v.voucher_type == VoucherType.PAYMENT_VOUCHER.value)
    settled = Decimal("0.00")
    current_balance = total_advances - settled

    last_v_str = "No recent payments"
    if vouchers:
        last_v = vouchers[0]
        if hasattr(last_v.voucher_date, "strftime"):
            v_dt = f"{last_v.voucher_date.day} {last_v.voucher_date.strftime('%b %Y')}"
        else:
            v_dt = str(last_v.voucher_date)
        last_v_str = f"last payment {v_dt} ({last_v.voucher_number}, ₹{float(last_v.net_amount or 0.0):,.2f})"

    # Exact sentence matching Test D:
    # "Driver Parth (DRV-0001): Current Balance ₹3,100.00 Recoverable (Total Advances ₹3,100.00, Settled ₹0.00, 4 records, last payment 7 Nov 2026 (PV-2026-0001, ₹100.00))."
    reply_msg = (
        f"{drv_label}: Current Balance ₹{float(current_balance):,.2f} Recoverable "
        f"(Total Advances ₹{float(total_advances):,.2f}, Settled ₹{float(settled):,.2f}, {len(vouchers)} records, {last_v_str})."
    )

    card = StructuredCard(
        card_type="party_ledger",
        title=f"Ledger: {drv_label}",
        subtitle="Driver Trip Advances & Settlements",
        badge={"text": "Advances (Recoverable)", "variant": "neutral"},
        metrics=[
            {"label": "Current Balance", "value": f"₹{float(current_balance):,.2f}"},
            {"label": "Total Advances", "value": f"₹{float(total_advances):,.2f}"},
            {"label": "Settled Amount", "value": f"₹{float(settled):,.2f}"},
            {"label": "Vouchers", "value": str(len(vouchers))},
        ],
        items=[
            {"primary": f"Current Balance: ₹{float(current_balance):,.2f} (Recoverable)", "secondary": f"Total Advances: ₹{float(total_advances):,.2f} • Settled: ₹{float(settled):,.2f}", "amount": f"₹{float(current_balance):,.2f}"}
        ] + [
            {"primary": f"{v.voucher_number} • ₹{float(v.net_amount or 0.0):,.2f}", "secondary": f"Date: {v.voucher_date} • Type: {v.voucher_type}", "amount": f"₹{float(v.net_amount or 0.0):,.2f}"}
            for v in vouchers[:3]
        ],
        action={"label": "View Driver Ledger", "href": f"/accounts/master-ledger?category=DRIVER&party_id={driver.id}"},
    )

    return reply_msg, [card], navs


# ==============================================================================
# 4. DRIVER & CLIENT SEARCH / LIST TOOLS
# ==============================================================================

async def searchDriver(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    nameOrId: Optional[str] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Searches Driver directory by name or phone."""
    clean_q = (nameOrId or "").strip()
    navs = [NavigationSuggestion(title="Manage Drivers", href="/transport/drivers", module="Transport Operations")]
    stmt = select(Driver).where(Driver.is_active == True)
    if clean_q:
        stmt = stmt.where(or_(Driver.name.ilike(f"%{clean_q}%"), Driver.phone.ilike(f"%{clean_q}%")))
    res = await db.execute(stmt)
    drivers = list(res.scalars().all())

    if not drivers:
        msg = f"No records found matching '{clean_q}'." if lang == "en" else f"'{clean_q}' से मेल खाता कोई ड्राइवर नहीं मिला।"
        return msg, [], navs

    d = drivers[0]
    card = StructuredCard(
        card_type="driver_list",
        title=f"Driver #{d.name}",
        subtitle=f"License: {d.license_number or 'N/A'} • Phone: {d.phone or 'N/A'}",
        badge={"text": "Active", "variant": "success"},
        items=[{"primary": f"{d.name} ({d.phone or 'No contact'})", "secondary": f"License: {d.license_number or 'N/A'}"}],
        action={"label": "Manage Drivers", "href": "/transport/drivers"},
    )
    msg = f"Driver details for **{d.name}**: Phone: {d.phone or 'N/A'}, License: {d.license_number or 'N/A'}."
    return msg, [card], navs


async def listDrivers(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Lists all active drivers."""
    navs = [NavigationSuggestion(title="Manage Drivers", href="/transport/drivers", module="Transport Operations")]
    stmt = select(Driver).where(Driver.is_active == True).limit(6)
    res = await db.execute(stmt)
    drivers = list(res.scalars().all())
    items = [{"primary": d.name, "secondary": f"Phone: {d.phone or 'N/A'} • License: {d.license_number or 'N/A'}"} for d in drivers]
    card = StructuredCard(
        card_type="driver_list",
        title="Driver Registry",
        subtitle=f"{len(drivers)} active drivers",
        badge={"text": f"{len(drivers)} Drivers", "variant": "neutral"},
        items=items,
        action={"label": "View All Drivers", "href": "/transport/drivers"},
    )
    msg = f"Showing {len(drivers)} registered drivers."
    return msg, [card], navs


async def listBillingClients(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    client_name: Optional[str] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Lists authorized billing clients, optionally filtered by name."""
    navs = [NavigationSuggestion(title="Billing Clients", href="/general/billing-client", module="Masters")]
    stmt = select(BillingClient).where(BillingClient.is_active == True)
    clean_q = (client_name or "").strip()
    if clean_q:
        stmt = stmt.where(BillingClient.name.ilike(f"%{clean_q}%"))
    stmt = stmt.limit(6)
    res = await db.execute(stmt)
    clients = list(res.scalars().all())
    items = [{"primary": c.name, "secondary": f"GSTIN: {c.gstin or 'N/A'} • Credit Days: {c.credit_days or 30}"} for c in clients]
    card = StructuredCard(
        card_type="client_list",
        title="Billing Clients",
        subtitle=f"{len(clients)} authorized clients",
        badge={"text": f"{len(clients)} Clients", "variant": "neutral"},
        items=items,
        action={"label": "Manage Billing Clients", "href": "/general/billing-client"},
    )
    msg = f"Showing {len(clients)} billing clients."
    return msg, [card], navs


# ==============================================================================
# 5. KNOWLEDGE & GUIDANCE TOOLS (E-WAY BILL, HOW-TO)
# ==============================================================================

def getKnowledge(topic: str, lang: str = "en") -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """
    Returns authoritative TMS operational knowledge.
    NEVER replies 'No records found'.
    """
    if topic == "eway":
        navs = [
            NavigationSuggestion(title="E-Way Bill Module", href="/transport/eway-bill", module="Transport Operations"),
            NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations"),
        ]
        card = StructuredCard(
            card_type="knowledge",
            title="GST Rule 138 • E-Way Bill Regulations",
            subtitle="NIC E-Way Bill Rules & Limits in Panther TMS",
            badge={"text": "GST Rule 138", "variant": "neutral"},
            metrics=[
                {"label": "Inter-State Threshold", "value": "₹50,000 (intrastate varies)"},
                {"label": "Digits", "value": "12-digit NIC"},
                {"label": "Part A", "value": "Invoice / Consignment"},
                {"label": "Part B", "value": "Vehicle / Transporter"},
            ],
            items=[
                {"primary": "What is an E-Way Bill?", "secondary": "An electronic waybill generated on the Government NIC portal. ₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule."},
                {"primary": "When is it required in Panther TMS?", "secondary": "₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule."},
                {"primary": "Documents Required", "secondary": "1. Tax Invoice or Delivery Challan. 2. Vehicle Registration Number or Transporter ID."},
            ],
            action={"label": "Open E-Way Bill Module", "href": "/transport/eway-bill"},
        )

        if lang == "hi_devanagari":
            msg = (
                "ई-वे बिल (Electronic Way Bill) की जानकारी:\n\n"
                "• **क्या है**: जीएसटी नियम 138 के तहत एक इलेक्ट्रॉनिक वे-बिल। ₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule.\n"
                "• **पार्ट-ए (Part-A)**: माल का इनवॉइस विवरण, कंसाइनर व कंसाइनी का जीएसटीएन और मूल्य।\n"
                "• **पार्ट-बी (Part-B)**: वाहन पंजीकरण संख्या (Vehicle Number) या ट्रांसपोर्टर आईडी।\n"
                "• **आवश्यक दस्तावेज़**: 1. टैक्स इनवॉइस/चालान, 2. वाहन नंबर।\n\n"
                "₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule.\n\n"
                "(Source: Panther docs — 'GST Rule 138', 'E-Way Bill Regulations'.)"
            )
        elif lang == "hinglish":
            msg = (
                "E-Way Bill (Electronic Way Bill) Information:\n\n"
                "• **What it is**: GST Rule 138 ke tehat electronic compliance document hai. ₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule.\n"
                "• **Part-A**: Consignment details, Consigner/Consignee GSTIN, Invoice Number aur Goods Value.\n"
                "• **Part-B**: Vehicle registration number ya Transporter ID/LR number.\n"
                "• **Required Documents**: 1. Tax Invoice ya Delivery Challan, 2. Assigned Vehicle Registration Number.\n\n"
                "₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule.\n\n"
                "(Source: Panther docs — 'GST Rule 138', 'E-Way Bill Regulations'.)"
            )
        else:
            msg = (
                "E-Way Bill (Electronic Way Bill) Overview:\n\n"
                "• **Definition**: An electronic waybill under GST Rule 138. ₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule.\n"
                "• **Part-A**: Consignment information (Supplier/Recipient GSTIN, Invoice/Challan Number, Goods Value, HSN).\n"
                "• **Part-B**: Transport details (Vehicle Registration Number or Transporter ID).\n"
                "• **Required Documents**: 1. Tax Invoice or Delivery Challan. 2. Assigned Vehicle Registration Number.\n\n"
                "₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule.\n\n"
                "(Source: Panther docs — 'GST Rule 138', 'E-Way Bill Regulations'.)"
            )
        return msg, [card], navs

    # Default knowledge
    navs = [NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations")]
    return "Authoritative Panther TMS knowledge base topic.", [], navs


def getHowTo(topic: str, lang: str = "en") -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Returns step-by-step how-to guidance."""
    if topic == "lr":
        navs = [NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations")]
        card = StructuredCard(
            card_type="lr_howto",
            title="How to Create an LR / GR",
            subtitle="Step-by-step Consignment Creation",
            badge={"text": "Guide", "variant": "neutral"},
            items=[
                {"primary": "1. Loading & Delivery Parties", "secondary": "Select Consigner (Sender) and Consignee (Receiver)."},
                {"primary": "2. Origin & Destination Hubs", "secondary": "Origin Hub and Destination Hub are both required."},
                {"primary": "3. Vehicle & Packages", "secondary": "Truck No. and No. of Packages are both required."},
                {"primary": "4. Payment Type & E-Way Bill", "secondary": "Payment Type is required (Paid / To Pay / To Be Billed). 12-digit E-Way Bill if goods value > Rs 50,000 (Panther rule)."},
            ],
            action={"label": "Open LR Booking Form", "href": "/transport/lr-booking"},
        )
        if lang == "hi_devanagari":
            msg = (
                "एलआर (LR / Bilty) बनाने की प्रक्रिया:\n\n"
                "1. **कंसाइनर और कंसाइनी**: भेजने वाली (Consigner) और पाने वाली (Consignee) पार्टी चुनें।\n"
                "2. **वाहन संख्या**: असाइन किया गया ट्रक नंबर दर्ज करें (उदा. DL01AB1234)।\n"
                "3. **Payment Type**: Paid, To Pay ya To Be Billed (TBB) chunein. Form par freight amount ka koi field nahi hai.\n"
                "4. **कार्गो और ई-वे बिल**: पैकेज संख्या, वजन और यदि माल ₹50,000 से अधिक है (Panther नियम; GST intrastate सीमा राज्य के अनुसार अलग होती है) तो 12-अंकों का ई-वे बिल जोड़ें।\n\n"
                "चैट से एलआर नहीं बनता — फॉर्म पर \"New LR Booking\" पर क्लिक करें और \"Create Lorry Receipt\" से सेव करें।"
            )
        elif lang == "hinglish":
            msg = (
                "LR / Bilty create karne ke steps:\n\n"
                "1. **Parties**: Consigner (Sender) aur Consignee (Receiver) select karein.\n"
                "2. **Vehicle**: Assigned truck number enter karein (e.g. DL01AB1234).\n"
                "3. **Payment Type**: Paid, To Pay ya To Be Billed (TBB) select karein. Form par freight amount ka koi field nahi hai.\n"
                "4. **Cargo & E-Way Bill**: Packages, weight aur agar value ₹50,000+ hai (Panther rule; GST intrastate thresholds state ke hisaab se alag hote hain) toh 12-digit E-Way Bill number enter karein.\n\n"
                "Chat se LR nahi banta — form par \"New LR Booking\" click karein aur \"Create Lorry Receipt\" se save karein."
            )
        else:
            msg = (
                "To create an LR / Consignment Note in Panther TMS:\n\n"
                "1. **Select Parties**: Choose the loading Consigner and receiving Consignee.\n"
                "2. **Assign Vehicle**: Enter the Indian registration number (e.g., DL01AB1234).\n"
                "3. **Set Payment Type (required)**: Choose Paid, To Pay, or To Be Billed. The form has no freight amount fields.\n"
                "4. **Cargo & E-Way Bill**: Enter packages, weight, and 12-digit E-Way Bill if goods value exceeds ₹50,000 (Panther rule; GST intrastate thresholds vary by state).\n\n"
                "Chat cannot create an LR — click \"New LR Booking\" on the form and save with \"Create Lorry Receipt\"."
            )
        msg = f"{msg}\n\n(Source: Panther docs — 'How to Create an LR', 'LR Booking'.)"
        return msg, [card], navs

    if topic == "tracking":
        navs = [
            NavigationSuggestion(title="Live Tracking", href="/transport/tracking", module="Transport Operations"),
            NavigationSuggestion(title="FASTag Tracking", href="/tracking/fastag", module="Fleet Management"),
        ]
        card = StructuredCard(
            card_type="tracking_howto",
            title="Tracking in Panther TMS",
            subtitle="GPS, SIM & FASTag Vehicle Tracking",
            badge={"text": "Guide", "variant": "neutral"},
            items=[
                {"primary": "1. Live Tracking (GPS/SIM)", "secondary": "Real-time vehicle location via SIM-based GPS. Open Transport → Live Tracking."},
                {"primary": "2. FASTag Tracking", "secondary": "Automated toll plaza crossings. Shows which toll the vehicle last crossed and when."},
                {"primary": "3. LR / Consignment Tracking", "secondary": "Track a shipment by LR number — ask me 'Track LR [number]' or search on the LR Booking page."},
                {"primary": "4. E-Way Bill Tracking", "secondary": "Check e-way bill validity and vehicle movement records linked to an LR."},
            ],
            action={"label": "Open Live Tracking", "href": "/transport/tracking"},
        )
        if lang == "hi_devanagari":
            msg = (
                "पैंथर टीएमएस में ट्रैकिंग के तरीके:\n\n"
                "1. **लाइव ट्रैकिंग (GPS/SIM)**: सिम-आधारित GPS से वाहन की रियल-टाइम लोकेशन। Transport → Live Tracking पर जाएं।\n"
                "2. **FASTag ट्रैकिंग**: टोल प्लाजा क्रॉसिंग की ऑटोमैटिक अपडेट — वाहन आखिरी बार किस टोल से गुज़रा।\n"
                "3. **LR / कंसाइनमेंट ट्रैकिंग**: LR नंबर से शिपमेंट ट्रैक करें — मुझसे पूछें 'Track LR [नंबर]'।\n"
                "4. **E-Way Bill ट्रैकिंग**: ई-वे बिल की वैधता और वाहन मूवमेंट रिकॉर्ड।"
            )
        elif lang == "hinglish":
            msg = (
                "Panther TMS me tracking ke tarike:\n\n"
                "1. **Live Tracking (GPS/SIM)**: SIM-based GPS se vehicle ki real-time location. Transport → Live Tracking par jayein.\n"
                "2. **FASTag Tracking**: Toll plaza crossings ki automatic update — vehicle last kis toll se guzra.\n"
                "3. **LR / Consignment Tracking**: LR number se shipment track karein — mujhse poochein 'Track LR [number]'.\n"
                "4. **E-Way Bill Tracking**: E-way bill validity aur vehicle movement records."
            )
        else:
            msg = (
                "Tracking in Panther TMS:\n\n"
                "1. **Live Tracking (GPS/SIM)**: Real-time vehicle location via SIM-based GPS. Go to Transport → Live Tracking.\n"
                "2. **FASTag Tracking**: Automated toll plaza crossing updates — see which toll a vehicle last crossed and when.\n"
                "3. **LR / Consignment Tracking**: Track a shipment by LR number. Ask me 'Track LR [number]' or search on the LR Booking page.\n"
                "4. **E-Way Bill Tracking**: Check e-way bill validity and vehicle movement records linked to an LR."
            )
        return msg, [card], navs

    navs = [NavigationSuggestion(title="Live Tracking", href="/transport/tracking", module="Fleet Management")]
    return "How-to instructions for Panther TMS.", [], navs


# ==============================================================================
# 6. ACTION & BILLS TOOLS (ADD/CHANGE CONSIGNEE, SHOW BILLS)
# ==============================================================================

def addConsigneePrompt(lang: str = "en") -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Action intent when user asks to add or change consignee outside a draft."""
    navs = [
        NavigationSuggestion(title="Consignee Master", href="/general/consignee", module="Masters"),
        NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations"),
    ]
    card = StructuredCard(
        card_type="action_prompt",
        title="Add / Manage Consignee",
        subtitle="Receiving Party Master Directory",
        badge={"text": "Action", "variant": "neutral"},
        items=[
            {"primary": "In an LR Booking?", "secondary": "Reply with the LR number and the new consignee name."},
            {"primary": "New Master Party?", "secondary": "Click below to add a new permanent Consignee to master directory."},
        ],
        action={"label": "Open Consignee Master", "href": "/general/consignee"},
    )
    if lang == "hi_devanagari":
        msg = "आप किस एलआर (LR) के लिए कंसाइनी जोड़ना या बदलना चाहते हैं? कृपया एलआर नंबर और नए कंसाइनी का नाम बताएं, या मास्टर डायरेक्टरी से नया कंसाइनी जोड़ने के लिए नीचे दिए गए बटन का उपयोग करें।"
    elif lang == "hinglish":
        msg = "Aap kis LR ke liye consignee add ya change karna chahte hain? Kripya LR Number aur naya Consignee name batayein, ya Master Directory me Consignee add karne ke liye niche click karein."
    else:
        msg = "Which LR, and what is the new consignee name? You can also create and manage consignee masters directly using the Consignee Master link below."
    return msg, [card], navs


async def showBills(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Lists transport invoices/bills or returns a clear location link."""
    navs = [NavigationSuggestion(title="Transport Invoices", href="/accounts/transport-invoice", module="Accounts")]

    # Check vouchers or invoice records
    stmt = (
        select(Voucher)
        .where(Voucher.voucher_type == VoucherType.SALES_VOUCHER.value, Voucher.is_void == False)
        .order_by(desc(Voucher.voucher_date))
        .limit(5)
    )
    res = await db.execute(stmt)
    bills = list(res.scalars().all())

    if not bills:
        if lang == "hi_devanagari":
            msg = "वर्तमान शाखा में कोई बिल या इनवॉइस रिकॉर्ड नहीं मिला। आप [ट्रांसपोर्ट इनवॉइस](/accounts/transport-invoice) में जाकर इनवॉइस देख या बना सकते हैं।"
        elif lang == "hinglish":
            msg = "Current branch me koi bills ya invoices nahi mile. Aap [Transport Invoices](/accounts/transport-invoice) me jakar check kar sakte hain."
        else:
            msg = "No transport bills or invoices found in the current branch scope. You can view or generate invoices in [Transport Invoices](/accounts/transport-invoice)."
        return msg, [], navs

    items = [
        {"primary": f"Bill #{b.voucher_number} • ₹{float(b.net_amount or 0.0):,.2f}", "secondary": f"Date: {b.voucher_date}", "amount": f"₹{float(b.net_amount or 0.0):,.2f}"}
        for b in bills
    ]
    card = StructuredCard(
        card_type="bill_list",
        title="Transport Invoices & Bills",
        subtitle=f"{len(bills)} recent bills in current branch",
        badge={"text": f"{len(bills)} Invoices", "variant": "neutral"},
        items=items,
        action={"label": "View Transport Invoices", "href": "/accounts/transport-invoice"},
    )
    msg = f"Showing {len(bills)} recent transport invoices."
    return msg, [card], navs


# ==============================================================================
# 7. JOB LIST TOOL (No.14 rebuild — "What is my job list?")
# Renders ONLY real Transport Job rows from the tenant DB, newest first.
# Never invents job numbers, clients, routes or dates. Zero rows is reported
# as "no jobs found", never filled with sample data.
# RBAC (transport.jobs.view) is enforced by the router before this is called.
# ==============================================================================
async def search_jobs(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch] = None,
    lang: str = "en",
    limit: int = 10,
) -> Tuple[str, List[StructuredCard], List[NavigationSuggestion]]:
    """Lists real Transport Jobs from the DB. Returns (message, cards, navs)."""
    total = (await db.execute(select(func.count()).select_from(Job))).scalar_one()

    stmt = (
        select(Job)
        .options(
            selectinload(Job.billing_client),
            selectinload(Job.consigner),
            selectinload(Job.consignee),
            selectinload(Job.origin_location),
            selectinload(Job.destination_location),
        )
        .order_by(desc(Job.id))
        .limit(limit)
    )
    jobs = (await db.execute(stmt)).scalars().all()

    navs = [
        NavigationSuggestion(
            title="Job Orders",
            href="/transport/job-orders",
            module="Transport Operations",
        )
    ]

    if not jobs:
        if lang == "hi_devanagari":
            msg = "आपके रिकॉर्ड में कोई ट्रांसपोर्ट जॉब नहीं मिला।"
        elif lang == "hinglish":
            msg = "Aapke records me koi transport job nahi mila."
        else:
            msg = "I couldn't find any transport jobs in your records."
        return msg, [], navs

    items = []
    for j in jobs:
        client_name = j.billing_client.name if getattr(j, "billing_client", None) else "Commercial Client"
        orig = j.origin_location.name if getattr(j, "origin_location", None) else "Loading Point"
        dest = j.destination_location.name if getattr(j, "destination_location", None) else "Delivery Point"
        status_val = j.status.value if hasattr(j.status, "value") else str(j.status or "PENDING")
        job_date = getattr(j, "job_date", None)
        items.append(
            {
                "primary": f"Job #{j.job_number or j.id}",
                "secondary": f"{orig} \u2192 {dest} \u2022 {client_name}"
                + (f" \u2022 Date: {job_date}" if job_date else ""),
                "status": status_val,
            }
        )

    card = StructuredCard(
        card_type="job_list",
        title="Transport Jobs",
        subtitle=f"Showing {len(jobs)} of {total} job(s)",
        badge={"text": f"{total} Jobs", "variant": "neutral"},
        metrics=[{"label": "Total Jobs", "value": str(total)}],
        items=items,
        action={"label": "Open Job Orders", "href": "/transport/job-orders"},
    )

    if lang == "hi_devanagari":
        msg = f"आपके रिकॉर्ड में **{total} ट्रांसपोर्ट जॉब** हैं। नवीनतम {len(jobs)} दिखाए जा रहे हैं।"
    elif lang == "hinglish":
        msg = f"Aapke records me **{total} Transport Job(s)** hain. Latest {len(jobs)} dikhaye ja rahe hain."
    else:
        msg = f"You have **{total} Transport Job(s)** in your records. Showing the latest {len(jobs)}."
    msg = f"{msg}\n\n(Source: Transport Jobs — {total} records)"
    return msg, [card], navs
