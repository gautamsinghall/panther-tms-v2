"""
Panther AI Conversational Hire Challan Creation Service.
Provides multi-turn dialogue, market/company vehicle resolution,
driver binding, exact financial calculations, and structured preview cards
for Hired Truck Challans.
Supports single-message full specification and step-by-step guided collection without re-asking.
"""
import re
import json
import logging
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal
from datetime import datetime, timezone, date

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, cast, String

from sqlalchemy.orm import selectinload
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
        r"\b(create|issue|book|new|generate|make|raise)\b.*\b(hire challan|hiring challan|truck hire|lorry hire|challan)\b",
        r"\b(hire challan|hiring challan|truck hire|lorry hire)\b.*\b(create|issue|banao|karo|banana|generate)\b",
        r"\b(is vehicle ke liye|iss gaadi ke liye|gaadi ka)\b.*\b(hire challan|challan)\b",
        r"\b(mujhe|hume)\b.*\b(hire challan)\b.*\b(banana|karna)\b",
        r"\b(ek|1)\s*(hire challan|challan)\b",
        r"\bhire challan\b",
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
    return bool(
        re.search(r"\b(cancel|discard|clear|abort|drop|delete|reset)\b.*\b(hire challan|challan|draft)\b", t)
        or t in ("cancel challan", "discard challan", "clear challan", "cancel", "clear", "discard")
    )


def normalize_vehicle_number(raw: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", raw).upper()


def parse_hc_entities_from_text(text: str, current_draft: Optional[AIDraft] = None) -> Dict[str, Any]:
    """Extracts candidate entities for Hire Challan from natural language input."""
    extracted: Dict[str, Any] = {}
    clean_text = text.strip()

    # 1. Vehicle Number
    v_num = extract_vehicle_number(clean_text)
    if v_num:
        extracted["vehicle_number"] = v_num
    else:
        m_v = re.search(VEHICLE_REGEX, clean_text, re.IGNORECASE)
        if m_v:
            extracted["vehicle_number"] = m_v.group(1).upper()

    # 2. Hire Rate
    rate_match = re.search(r"(?:hire rate|hire amount|rate|hire|bhada|freight)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]+)?k?)", clean_text, re.I)
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
    adv_match = re.search(r"(?:advance|peshgi|advance amount)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]+)?k?)", clean_text, re.I)
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
    route_match = re.search(r"\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?=[,;\s]+(?:vehicle|rate|hire|advance|driver|lr|tds)|$)", clean_text, re.I)
    if route_match:
        extracted["from_location"] = route_match.group(1).strip().strip(",;.")
        extracted["to_location"] = route_match.group(2).strip().strip(",;.")
    else:
        m_dash = re.search(r"\b([A-Za-z]{3,20})\s*(?:to|-|➔|->)\s*([A-Za-z]{3,20})\b", clean_text, re.I)
        common_words = {"rate", "hire", "advance", "driver", "challan"}
        if m_dash and m_dash.group(1).lower() not in common_words and m_dash.group(2).lower() not in common_words:
            extracted["from_location"] = m_dash.group(1).strip()
            extracted["to_location"] = m_dash.group(2).strip()

        from_match = re.search(r"\b(?:from|loading at|source)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:to|vehicle|rate|hire|advance)|$)", clean_text, re.I)
        if from_match and "from_location" not in extracted:
            extracted["from_location"] = from_match.group(1).strip().strip(",;.")
        to_match = re.search(r"\b(?:to|delivery at|destination)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:vehicle|rate|hire|advance)|$)", clean_text, re.I)
        if to_match and "to_location" not in extracted:
            extracted["to_location"] = to_match.group(1).strip().strip(",;.")

    # 5. Driver Details
    drv_match = re.search(r"(?:driver|driver name)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z\s]+?)(?=[,;\s]+(?:phone|mobile|vehicle|rate|advance)|$)", clean_text, re.I)
    if drv_match:
        extracted["driver_name"] = drv_match.group(1).strip().strip(",;.")

    phone_match = re.search(r"(?:driver phone|phone|mobile|contact)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([0-9]{10})", clean_text, re.I)
    if phone_match:
        extracted["driver_phone"] = phone_match.group(1).strip()

    # 6. TDS Rate
    tds_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:tds)?", clean_text, re.I)
    if tds_match:
        try:
            extracted["tds_rate"] = Decimal(tds_match.group(1).strip())
        except Exception:
            pass

    # 7. Linked LR
    m_lr = re.search(r"\b(?:lr|gr|bilty)[#\s\-_/]*([A-Za-z0-9_-]+)\b", clean_text, re.I)
    if m_lr:
        extracted["lr_number"] = m_lr.group(1).strip()

    # Contextual step-by-step mapping if responding to specific prompt
    if current_draft:
        missing = current_draft.missing_fields or []
        draft_data = current_draft.data or {}

        if re.match(r"^(?:₹|rs\.?)?\s*[0-9]+(?:\.[0-9]{1,2})?k?$", clean_text, re.IGNORECASE) and not draft_data.get("hire_rate"):
            num_str = re.sub(r"[^0-9.kK]", "", clean_text).lower()
            try:
                if "k" in num_str:
                    extracted["hire_rate"] = Decimal(num_str.replace("k", "")) * Decimal("1000")
                else:
                    extracted["hire_rate"] = Decimal(num_str)
            except Exception:
                pass

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

        # Check vehicle in master
        res_cv = await db.execute(select(CompanyVehicle).where(CompanyVehicle.vehicle_number == norm_v).limit(1))
        cv = res_cv.scalar_one_or_none()
        if cv:
            draft.preview_labels["vehicle_source"] = "Company Vehicle"
        else:
            res_mv = await db.execute(select(MarketVehicle).where(MarketVehicle.vehicle_number == norm_v).limit(1))
            mv = res_mv.scalar_one_or_none()
            if mv:
                draft.data["market_vehicle_id"] = mv.id
                draft.data["owner_id"] = getattr(mv, "owner_id", None)
                draft.preview_labels["vehicle_source"] = "Market Vehicle"
            else:
                draft.preview_labels["vehicle_source"] = "Market Vehicle (New)"

    # 2. Hire Rate Check
    hr = draft.data.get("hire_rate")
    if hr is None:
        missing.append("Hire Rate")
    else:
        try:
            d_hr = Decimal(str(hr))
            draft.data["hire_rate"] = d_hr
            draft.preview_labels["hire_rate"] = f"₹{float(d_hr):,.2f}"
        except Exception:
            missing.append("Hire Rate")

    # 3. Route Check
    from_loc = draft.data.get("from_location")
    if not from_loc:
        missing.append("Loading Location")
    else:
        draft.preview_labels["from_location"] = str(from_loc).title()

    to_loc = draft.data.get("to_location")
    if not to_loc:
        missing.append("Delivery Location")
    else:
        draft.preview_labels["to_location"] = str(to_loc).title()

    if from_loc and to_loc:
        draft.preview_labels["route"] = f"{str(from_loc).title()} ➔ {str(to_loc).title()}"

    # 4. Financial Calculations
    hire_rate = Decimal(str(draft.data.get("hire_rate") or "0.00"))
    adv = Decimal(str(draft.data.get("advance_amount") or "0.00"))
    tds_r = Decimal(str(draft.data.get("tds_rate") or "0.00"))
    detention = Decimal(str(draft.data.get("detention_charge") or "0.00"))
    mamul = Decimal(str(draft.data.get("mamul_charges") or "0.00"))

    tds_amt = (hire_rate * tds_r / Decimal("100")).quantize(Decimal("0.01"))
    net_payable = hire_rate - tds_amt - mamul + detention
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
    Intelligent conversational controller for Hired Truck Challans.
    - Collects required details in one message or step-by-step.
    - Avoids re-asking for details already provided.
    - Presents completed form for user review before final submission.
    """
    eff_office_id = current_office.id if current_office else None
    office_name = current_office.name if current_office else "Main Logistics Hub"

    # 1. Handle Cancellation Intent
    if is_hc_cancel_intent(user_text):
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="hire_challan")
        if lang in ("hinglish", "hi_devanagari"):
            reply = "Aapka Hire Challan draft cancel kar diya gaya hai. Jab aap ready hon, nayi challan create karne ke liye batayein."
        else:
            reply = "Your Hire Challan draft has been cancelled. Let me know when you would like to issue a new challan."

        cancel_card = StructuredCard(
            card_type="hire_challan_draft",
            title="Hire Challan Draft Cancelled",
            badge={"text": "Cancelled", "variant": "neutral"},
            metrics=[],
            can_confirm=False,
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
    extracted = parse_hc_entities_from_text(user_text, current_draft=draft)

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
        clean_lr = re.sub(r"^(?:lr|gr|bilty|number|no\.?|#|[\s\-_])+", "", lr_num, flags=re.I).strip()
        res_lr = await db.execute(
            select(LR)
            .options(selectinload(LR.origin_location), selectinload(LR.destination_location))
            .where(or_(LR.lr_number.ilike(f"%{clean_lr}%"), cast(LR.id, String) == clean_lr))
            .limit(1)
        )
        linked_lr = res_lr.scalar_one_or_none()
        if linked_lr:
            draft.update_field("lr_id", linked_lr.id, label=linked_lr.lr_number)
            if linked_lr.vehicle_number:
                draft.update_field("vehicle_number", linked_lr.vehicle_number, label=linked_lr.vehicle_number)
            if linked_lr.origin_location:
                orig_city = getattr(linked_lr.origin_location, "city_name", None) or getattr(linked_lr.origin_location, "name", "Origin")
                draft.update_field("from_location", orig_city)
            if linked_lr.destination_location:
                dest_city = getattr(linked_lr.destination_location, "city_name", None) or getattr(linked_lr.destination_location, "name", "Destination")
                draft.update_field("to_location", dest_city)

    # 5. Validate and update state
    await validate_and_update_hc_draft(draft, db, office_id=eff_office_id)
    await lr_draft_store.save_draft(draft)

    # 6. Build Card
    card = build_hc_preview_card(draft, office_name=office_name)

    # 7. Generate Localized Reply
    v = draft.preview_labels.get("vehicle")
    route = draft.preview_labels.get("route")
    hr = draft.preview_labels.get("hire_rate")
    adv = draft.preview_labels.get("advance")
    bal = draft.preview_labels.get("balance")

    if draft.is_valid:
        if lang in ("hinglish", "hi_devanagari"):
            reply = (
                f"### 📋 Hire Challan — Review & Confirmation\n\n"
                f"Sabhi zaroori details collect aur validate ho chuki hain:\n"
                f"• **Vehicle Number:** {v}\n"
                f"• **Route:** {route}\n"
                f"• **Hire Rate:** {hr}\n"
                f"• **Advance Amount:** {adv}\n"
                f"• **Balance Due:** {bal}\n\n"
                f"Kripya summary aur draft card check karein. Final submission ke liye "
                f"**'Confirm & Create Hire Challan'** button par click karein."
            )
        else:
            reply = (
                f"### 📋 Hire Challan — Review & Confirmation\n\n"
                f"All required details have been successfully collected and verified:\n"
                f"• **Vehicle Number:** {v}\n"
                f"• **Route:** {route}\n"
                f"• **Hire Rate:** {hr}\n"
                f"• **Advance Amount:** {adv}\n"
                f"• **Balance Due:** {bal}\n\n"
                f"Please review the summary above and the draft card below. "
                f"Click **'Confirm & Create Hire Challan'** to issue the challan."
            )
    else:
        recorded_lines = []
        if draft.preview_labels.get("lr_id"):
            recorded_lines.append(f"• **Linked LR:** {draft.preview_labels.get('lr_id')}")
        if v:
            recorded_lines.append(f"• **Vehicle Number:** {v}")
        if route:
            recorded_lines.append(f"• **Route:** {route}")
        elif draft.preview_labels.get("from_location") or draft.preview_labels.get("to_location"):
            recorded_lines.append(f"• **Route:** {draft.preview_labels.get('from_location') or 'Pending'} → {draft.preview_labels.get('to_location') or 'Pending'}")
        if hr:
            recorded_lines.append(f"• **Hire Rate:** {hr}")

        recorded_block = ""
        if recorded_lines:
            recorded_block = "**Recorded Details:**\n" + "\n".join(recorded_lines) + "\n\n"

        missing_prompts = []
        for mf in draft.missing_fields:
            if "Vehicle" in mf:
                missing_prompts.append("• What is the **Vehicle Number** (e.g., DL01AA1111)?")
            elif "Hire Rate" in mf:
                missing_prompts.append("• What is the **Agreed Hire Rate** (amount)?")
            elif "Loading" in mf:
                missing_prompts.append("• What is the **Loading / Origin Location**?")
            elif "Delivery" in mf:
                missing_prompts.append("• What is the **Delivery / Destination Location**?")

        missing_block = "👉 **Still Needed:**\n" + "\n".join(missing_prompts)

        if lang in ("hinglish", "hi_devanagari"):
            reply = (
                f"Main aapka Hire Challan draft prepare kar raha hoon.\n\n"
                f"{recorded_block}"
                f"{missing_block}\n\n"
                f"*Aap baaki bachi details ek sath ya ek-ek karke provide kar sakte hain.*"
            )
        else:
            reply = (
                f"I am preparing your Hire Challan draft.\n\n"
                f"{recorded_block}"
                f"{missing_block}\n\n"
                f"*You can provide all remaining details together in one message or step-by-step.*"
            )

    return reply, [card]
