"""
Panther AI Conversational Hire Challan Creation Service.
Provides multi-turn dialogue, market/company vehicle resolution,
driver binding, exact financial calculations, and structured preview cards
for Hired Truck Challans.
"""
import re
import logging
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal
from datetime import datetime, timezone, date

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.tenant_db.models import (
    User,
    Branch,
    CompanyVehicle,
    MarketVehicle,
    Driver,
    LR,
    HireChallan,
)
from app.control.models import Tenant
from app.modules.transport.schemas import HireChallanCreate
from app.modules.ai.schemas import StructuredCard
from app.modules.ai.draft_store import lr_draft_store, AIDraft
from app.modules.ai.tools import extract_vehicle_number

logger = logging.getLogger("panther.ai.hire_challan_draft")

VEHICLE_REGEX = r"\b([A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4})\b"


def is_hire_challan_intent(text: str) -> bool:
    """Detects whether the user is requesting to create/issue a Hire Challan."""
    t = text.lower().strip()
    patterns = [
        r"\b(create|issue|book|new|generate|make|raise)\b.*\b(hire challan|hiring challan|truck hire|challan)\b",
        r"\b(hire challan|hiring challan|truck hire)\b.*\b(create|issue|banao|karo|banana|generate)\b",
        r"\b(is vehicle ke liye|iss gaadi ke liye|gaadi ka)\b.*\b(hire challan|challan)\b",
        r"\b(mujhe|hume)\b.*\b(hire challan)\b.*\b(banana|karna)\b",
        r"\b(ek|1)\s*(hire challan|challan)\b",
    ]
    for p in patterns:
        if re.search(p, t):
            return True
    return False


def is_instructional_hc_inquiry(text: str) -> bool:
    """Detects instructional/knowledge inquiries about Hire Challans."""
    t = text.lower().strip()
    from app.modules.ai.tools import extract_transport_entities
    if extract_transport_entities(text).get("hc_number"):
        return False
    if any(w in t for w in ("this hc", "is hc", "that hc", "the hc", "this challan", "is challan", "is hire challan", "this hire challan", "its advance", "who is the vendor", "what is the balance")):
        return False
    inquiry_patterns = [
        r"\b(what is|explain|rules for|how to settle|how to create)\b.*\b(hire challan|challan)\b",
        r"\b(hire challan kya hai|hire challan kya hota hai|challan kaise settle kare|challan kaise banaye)\b",
    ]
    for p in inquiry_patterns:
        if re.search(p, t):
            return True
    return False


def is_hc_cancel_intent(text: str) -> bool:
    """Detects user intention to cancel or discard the active hire challan draft."""
    t = text.lower().strip()
    return bool(re.search(r"\b(cancel|discard|clear|abort|drop|delete|reset)\b.*\b(hire challan|challan|draft)\b", t) or t in ("cancel challan", "discard challan", "clear challan"))


def normalize_vehicle_number(raw: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", raw).upper()


def parse_hc_entities_from_text(text: str) -> Dict[str, Any]:
    """Extracts candidate entities for Hire Challan from natural language input."""
    extracted: Dict[str, Any] = {}

    # 1. Vehicle Number
    v_num = extract_vehicle_number(text)
    if v_num:
        extracted["vehicle_number"] = v_num

    # 2. Hire Rate
    rate_match = re.search(r"(?:hire rate|hire amount|rate|hire|freight)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]+)?k?)", text, re.I)
    if rate_match:
        val_str = rate_match.group(1).lower()
        try:
            if "k" in val_str:
                mult = Decimal(val_str.replace("k", "")) * Decimal("1000")
                extracted["hire_rate"] = mult
            else:
                extracted["hire_rate"] = Decimal(val_str)
        except Exception:
            pass

    # 3. Advance Amount
    adv_match = re.search(r"(?:advance|advance amount)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]+)?k?)", text, re.I)
    if adv_match:
        val_str = adv_match.group(1).lower()
        try:
            if "k" in val_str:
                mult = Decimal(val_str.replace("k", "")) * Decimal("1000")
                extracted["advance_amount"] = mult
            else:
                extracted["advance_amount"] = Decimal(val_str)
        except Exception:
            pass

    # 4. Route: From ... To ...
    route_match = re.search(r"\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?=[,;\s]+(?:vehicle|rate|hire|advance|driver|lr|tds)|$)", text, re.I)
    if route_match:
        extracted["from_location"] = route_match.group(1).strip().strip(",;.")
        extracted["to_location"] = route_match.group(2).strip().strip(",;.")
    else:
        from_match = re.search(r"\b(?:from|loading at|source)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:to|vehicle|rate|hire|advance)|$)", text, re.I)
        if from_match:
            extracted["from_location"] = from_match.group(1).strip().strip(",;.")
        to_match = re.search(r"\b(?:to|delivery at|destination)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:vehicle|rate|hire|advance)|$)", text, re.I)
        if to_match:
            extracted["to_location"] = to_match.group(1).strip().strip(",;.")

    # 5. Driver
    drv_match = re.search(r"(?:driver|driver name)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z\s]+?)(?=[,;\s]+(?:phone|mobile|vehicle|rate|advance)|$)", text, re.I)
    if drv_match:
        extracted["driver_name"] = drv_match.group(1).strip().strip(",;.")

    phone_match = re.search(r"(?:driver phone|phone|mobile|contact)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([0-9]{10})", text, re.I)
    if phone_match:
        extracted["driver_phone"] = phone_match.group(1).strip()

    # 6. TDS Rate
    tds_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:tds)?", text, re.I)
    if tds_match:
        try:
            extracted["tds_rate"] = Decimal(tds_match.group(1).strip())
        except Exception:
            pass

    # 7. Linked LR
    lr_match = re.search(r"\b(LR-[A-Z0-9\-]+)\b", text, re.I)
    if lr_match:
        extracted["lr_number"] = lr_match.group(1).strip()

    return extracted


async def validate_and_update_hc_draft(
    draft: AIDraft,
    db: AsyncSession,
    office_id: Optional[int] = None,
) -> None:
    """Validates Hire Challan draft against HireChallanCreate schema rules and computes financials."""
    missing: List[str] = []
    draft.validation_errors = []

    # 1. Vehicle Number Check
    v_num = draft.data.get("vehicle_number")
    if not v_num:
        missing.append("Vehicle Number")
    else:
        norm_v = normalize_vehicle_number(v_num)
        draft.data["vehicle_number"] = norm_v
        draft.preview_labels["vehicle"] = norm_v

        # Check vehicle registry
        stmt_m = select(MarketVehicle).where(MarketVehicle.vehicle_number == norm_v, MarketVehicle.is_active == True)
        mv = (await db.execute(stmt_m)).scalar_one_or_none()
        if mv:
            draft.data["market_vehicle_id"] = mv.id
            if mv.owner_id:
                draft.data["owner_id"] = mv.owner_id
        else:
            stmt_c = select(CompanyVehicle).where(CompanyVehicle.vehicle_number == norm_v, CompanyVehicle.is_active == True)
            cv = (await db.execute(stmt_c)).scalar_one_or_none()
            if cv and cv.driver_id:
                draft.data["driver_id"] = cv.driver_id

    # 2. Hire Rate Check
    hire_rate = draft.data.get("hire_rate")
    if hire_rate is None or Decimal(str(hire_rate)) <= Decimal("0.00"):
        missing.append("Hire Rate")
    else:
        hire_rate = Decimal(str(hire_rate))
        draft.preview_labels["hire_rate"] = f"₹{float(hire_rate):,.2f}"

    # 3. Route Check
    from_loc = draft.data.get("from_location")
    to_loc = draft.data.get("to_location")
    if not from_loc:
        missing.append("Origin (From Location)")
    if not to_loc:
        missing.append("Destination (To Location)")
    if from_loc and to_loc:
        draft.preview_labels["route"] = f"{from_loc} ➔ {to_loc}"

    # 4. Financial Calculations (Authoritative Hire Challan Formulas)
    if hire_rate is not None and Decimal(str(hire_rate)) > Decimal("0.00"):
        hr = Decimal(str(hire_rate))
        adv = Decimal(str(draft.data.get("advance_amount") or "0.00"))
        tds_r = Decimal(str(draft.data.get("tds_rate") or "0.00"))
        tds_amt = (hr * tds_r) / Decimal("100.00") if tds_r > Decimal("0.00") else Decimal("0.00")
        detention = Decimal(str(draft.data.get("detention_charge") or "0.00"))
        mamul = Decimal(str(draft.data.get("mamul_charges") or "0.00"))

        net_payable = (hr + detention) - (tds_amt + mamul)
        balance = net_payable - adv

        draft.data["tds_amount"] = tds_amt
        draft.data["net_payable_amount"] = net_payable
        draft.data["balance_amount"] = balance
        draft.preview_labels["advance"] = f"₹{float(adv):,.2f}"
        draft.preview_labels["net_payable"] = f"₹{float(net_payable):,.2f}"
        draft.preview_labels["balance"] = f"₹{float(balance):,.2f}"

    draft.missing_fields = missing

    if not missing:
        try:
            target_data = dict(draft.data)
            target_data["issuing_office_id"] = office_id or draft.office_id
            HireChallanCreate(**target_data)
            draft.is_valid = True
            draft.generate_confirmation_token(ttl_minutes=15)
        except Exception as e:
            draft.is_valid = False
            draft.validation_errors.append(f"Validation error: {str(e)}")
            draft.confirmation_token = None
    else:
        draft.is_valid = False
        draft.confirmation_token = None


def build_hc_preview_card(draft: AIDraft, office_name: Optional[str] = None) -> StructuredCard:
    """Constructs the interactive structured card for Hire Challan draft."""
    v_label = draft.preview_labels.get("vehicle", "Vehicle not specified")
    route_label = draft.preview_labels.get("route", "Route not specified")
    hr_label = draft.preview_labels.get("hire_rate", "Pending rate")
    adv_label = draft.preview_labels.get("advance", "₹0.00")
    net_label = draft.preview_labels.get("net_payable", hr_label)
    bal_label = draft.preview_labels.get("balance", hr_label)

    metrics = [
        {"label": "Vehicle Number", "value": v_label},
        {"label": "Route", "value": route_label},
        {"label": "Hire Rate", "value": hr_label},
        {"label": "Advance Amount", "value": adv_label},
        {"label": "Net Payable", "value": net_label},
        {"label": "Balance Due", "value": bal_label},
        {"label": "Issuing Office", "value": office_name or "Default Office"},
    ]

    items = [
        {
            "primary": f"Hire Challan • {v_label}",
            "secondary": f"Route: {route_label} • Net Payable: {net_label}",
            "amount": bal_label,
            "status": "Ready to Confirm" if draft.is_valid else "Incomplete",
            "href": "/transport/hire-challans",
        }
    ]

    badge_text = "Ready to Confirm" if draft.is_valid else "Draft: Incomplete"
    badge_variant = "success" if draft.is_valid else "warning"

    return StructuredCard(
        card_type="hire_challan_draft",
        title="Hire Challan Draft",
        subtitle=f"Draft ID: {draft.draft_id}",
        badge={"text": badge_text, "variant": badge_variant},
        metrics=metrics,
        items=items,
        draft_id=draft.draft_id,
        confirmation_token=draft.confirmation_token if draft.is_valid else None,
        missing_fields=draft.missing_fields,
        can_confirm=draft.is_valid and bool(draft.confirmation_token),
        action={"label": "Open in Hire Challan Form", "href": "/transport/hire-challans"},
    )


async def handle_conversational_hc_booking(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch],
    user_text: str,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """
    Core conversational controller for Hired Truck Challans.
    Parses entities, manages multi-turn dialogue, computes financial terms,
    and returns localized responses and interactive preview cards.
    """
    eff_office_id = current_office.id if current_office else None
    office_name = current_office.name if current_office else "Main Logistics Hub"

    # 1. Handle Cancellation Intent
    if is_hc_cancel_intent(user_text):
        cleared = await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="hire_challan")
        if lang == "hi":
            reply = "Aapka Hire Challan draft radd (cancel) kar diya gaya hai."
        elif lang == "hinglish":
            reply = "Aapka Hire Challan draft cancel kar diya gaya hai. Jab aap ready hon, nayi challan create karne ke liye batayein."
        else:
            reply = "Your Hire Challan draft has been cancelled. Let me know when you would like to issue a new challan."

        cancel_card = StructuredCard(
            card_type="hire_challan_draft",
            title="Hire Challan Draft Cancelled",
            badge={"text": "Cancelled", "variant": "destructive"},
            metrics=[],
            action={"label": "Open Hire Challans", "href": "/transport/hire-challans"},
        )
        return reply, [cancel_card]

    # 2. Retrieve or create active draft
    draft = await lr_draft_store.get_or_create_active_draft(
        tenant_id=tenant.id,
        user_id=user.id,
        office_id=eff_office_id,
        draft_type="hire_challan",
    )

    # 3. Parse Entities
    extracted = parse_hc_entities_from_text(user_text)

    # 4. Update extracted values
    if "vehicle_number" in extracted:
        draft.update_field("vehicle_number", extracted["vehicle_number"], label=extracted["vehicle_number"])
    if "hire_rate" in extracted:
        draft.update_field("hire_rate", extracted["hire_rate"], label=f"₹{float(extracted['hire_rate']):,.2f}")
    if "advance_amount" in extracted:
        draft.update_field("advance_amount", extracted["advance_amount"])
    if "from_location" in extracted:
        draft.update_field("from_location", extracted["from_location"])
    if "to_location" in extracted:
        draft.update_field("to_location", extracted["to_location"])
    if "driver_name" in extracted:
        draft.update_field("driver_name", extracted["driver_name"])
    if "driver_phone" in extracted:
        draft.update_field("driver_phone", extracted["driver_phone"])
    if "tds_rate" in extracted:
        draft.update_field("tds_rate", extracted["tds_rate"])
    if "lr_number" in extracted:
        lr_num = extracted["lr_number"]
        res_lr = await db.execute(select(LR).where(LR.lr_number == lr_num).limit(1))
        linked_lr = res_lr.scalar_one_or_none()
        if linked_lr:
            draft.update_field("lr_id", linked_lr.id, label=linked_lr.lr_number)

    # 5. Validate and update state
    await validate_and_update_hc_draft(draft, db, office_id=eff_office_id)
    await lr_draft_store.save_draft(draft)

    # 6. Build Card
    card = build_hc_preview_card(draft, office_name=office_name)

    # 7. Generate Localized Reply
    if draft.is_valid:
        v = draft.preview_labels.get("vehicle")
        hr = draft.preview_labels.get("hire_rate")
        bal = draft.preview_labels.get("balance")
        if lang == "hi":
            reply = f"Gaadi {v} ke liye Hire Challan draft taiyar hai! Hire rate: {hr}, Balance payable: {bal}. Kripya details check karke confirm karein."
        elif lang == "hinglish":
            reply = f"Vehicle {v} ke liye Hire Challan draft ready hai! Hire rate: {hr}, Balance payable: {bal}. Review karke 'Confirm & Create Hire Challan' par click karein."
        else:
            reply = f"Hire Challan draft for vehicle {v} is complete! Hire Rate: {hr}, Balance Payable: {bal}. Please review the summary below and click 'Confirm & Create Hire Challan'."
    else:
        missing_str = ", ".join(draft.missing_fields)
        if lang == "hi":
            reply = f"Maine Hire Challan draft shuru kar diya hai. Kripya bachi hui jankari pradan karein: {missing_str}."
        elif lang == "hinglish":
            reply = f"Hire Challan draft start ho gaya hai. Kripya ye missing details batayein: {missing_str}."
        else:
            reply = f"I've initiated the Hire Challan draft. Please provide the remaining required details: {missing_str}."

    return reply, [card]
