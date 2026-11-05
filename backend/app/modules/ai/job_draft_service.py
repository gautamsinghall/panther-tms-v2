"""
Panther AI Conversational Transport Job Creation Service.
Provides multi-turn dialogue, party auto-resolution, entity extraction,
draft validation, and structured preview cards for Transport Job orders.
Supports single-message full specification and step-by-step guided collection without re-asking.
"""
import re
import json
import secrets
import asyncio
import logging
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal
from datetime import datetime, timezone, date

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.tenant_db.models import (
    User,
    Branch,
    Consigner,
    Consignee,
    Location,
    BillingClient,
    Job,
)
from app.control.models import Tenant
from app.modules.transport.schemas import JobCreate
from app.modules.ai.schemas import StructuredCard, ChatMessage
from app.modules.ai.draft_store import lr_draft_store, AIDraft
from app.modules.ai.provider import is_provider_configured, call_llm

logger = logging.getLogger("panther.ai.job_draft")


def is_job_booking_intent(text: str) -> bool:
    """Detects whether the user is requesting to create/book a Transport Job order."""
    t = text.lower().strip()
    booking_patterns = [
        r"\b(create|book|new|generate|start|make|raise)\b.*\b(job|transport job|job order)\b",
        r"\b(job|transport job|job order)\b.*\b(create|book|generate|start|make|raise|karo|banao|karni|karna)\b",
        r"\b(mujhe|hume|humko)\b.*\b(job)\b.*\b(banana|create|book)\b",
        r"\b(ek|1)\s*(job|transport job)\b",
        r"\bjob booking\b",
    ]
    for p in booking_patterns:
        if re.search(p, t):
            return True
    return False


def is_instructional_job_inquiry(text: str) -> bool:
    """Detects instructional/knowledge inquiries about Jobs rather than booking."""
    t = text.lower().strip()
    from app.modules.ai.tools import extract_transport_entities
    if extract_transport_entities(text).get("job_number"):
        return False
    if any(w in t for w in ("this job", "is job", "that job", "the job", "job order details", "status of this job")):
        return False
    inquiry_patterns = [
        r"\b(what is|explain|rules for|how to create|steps to create)\b.*\b(job|transport job)\b",
        r"\b(how|kaise|kya|where|kaha|what)\b.*\b(job|transport job)\b",
        r"\b(job|transport job|job order)\b.*\b(kya|kaise|kaha|hota|rules|process|register)\b",
        r"\b(job kaise banaye|job kaise banayein|job create kaise kare)\b",
    ]
    for p in inquiry_patterns:
        if re.search(p, t):
            return True
    return False


def is_job_cancel_intent(text: str) -> bool:
    """Detects user intention to cancel or discard the active job draft."""
    t = text.lower().strip()
    return bool(
        re.search(r"\b(cancel|discard|clear|abort|drop|delete|reset)\b.*\b(job|draft)\b", t)
        or t in ("cancel job", "discard job", "clear job", "cancel", "clear", "discard")
    )


async def resolve_or_create_job_party(
    db: AsyncSession,
    model_cls,
    query_text: str,
    office_id: Optional[int] = None,
) -> Any:
    """Resolves party by exact/fuzzy match, or auto-provisions to avoid blocking the user."""
    clean = query_text.strip()
    query = select(model_cls).where(model_cls.is_active == True)
    if office_id and hasattr(model_cls, "issuing_office_id"):
        query = query.where(or_(model_cls.issuing_office_id == office_id, model_cls.issuing_office_id.is_(None)))

    res_exact = await db.execute(query.where(func.lower(model_cls.name) == clean.lower()))
    exact = res_exact.scalars().first()
    if exact:
        return exact

    res_like = await db.execute(query.where(model_cls.name.ilike(f"%{clean}%")).limit(1))
    like_match = res_like.scalars().first()
    if like_match:
        return like_match

    # Auto-provision
    prefix = "CON" if model_cls == Consigner else "CNE"
    new_party = model_cls(
        name=clean.title(),
        code=f"{prefix}-{secrets.token_hex(3).upper()}",
        is_active=True,
        issuing_office_id=office_id,
    )
    db.add(new_party)
    await db.commit()
    await db.refresh(new_party)
    return new_party


async def resolve_or_create_job_location(
    db: AsyncSession,
    city_name: str,
    office_id: Optional[int] = None,
) -> Location:
    """Resolves location or auto-provisions if not yet in directory."""
    clean = city_name.strip()
    res = await db.execute(select(Location).where(func.lower(Location.city_name) == clean.lower()).limit(1))
    loc = res.scalar_one_or_none()
    if loc:
        return loc

    new_loc = Location(
        city_name=clean.title(),
        state="General",
        location_code=clean[:4].upper(),
        is_pickup_point=True,
        is_drop_point=True,
        is_active=True,
        issuing_office_id=office_id,
    )
    db.add(new_loc)
    await db.commit()
    await db.refresh(new_loc)
    return new_loc


def parse_job_entities_from_text(text: str, current_draft: Optional[AIDraft] = None) -> Dict[str, Any]:
    """Extracts candidate entities for Transport Job order from natural language input."""
    extracted: Dict[str, Any] = {}
    clean_text = text.strip()

    # Route: From ... To ... (Processed first to avoid route being mistaken as party)
    route_match = re.search(r"\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?=[,;\s]+(?:consigner|consignee|cargo|weight|packages|rate|special)|$)", clean_text, re.I)
    if route_match:
        extracted["origin_city"] = route_match.group(1).strip().strip(",;.")
        extracted["destination_city"] = route_match.group(2).strip().strip(",;.")
    else:
        m_dash = re.search(r"\b([A-Za-z]{3,20})\s*(?:to|-|➔|->)\s*([A-Za-z]{3,20})\b", clean_text, re.I)
        common_words = {"party", "consigner", "consignee", "cargo", "order", "goods"}
        if m_dash and m_dash.group(1).lower() not in common_words and m_dash.group(2).lower() not in common_words:
            extracted["origin_city"] = m_dash.group(1).strip()
            extracted["destination_city"] = m_dash.group(2).strip()

        from_match = re.search(r"\b(?:from|loading at|source)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:to|cargo|weight|packages)|$)", clean_text, re.I)
        if from_match and "origin_city" not in extracted:
            extracted["origin_city"] = from_match.group(1).strip().strip(",;.")
        to_match = re.search(r"\b(?:to|delivery at|destination)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:cargo|weight|packages)|$)", clean_text, re.I)
        if to_match and "destination_city" not in extracted:
            extracted["destination_city"] = to_match.group(1).strip().strip(",;.")

    # Consigner
    c_match = re.search(r"(?:consigner|sender|from party|shipper)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z0-9\s\.\,\-\&]+?)(?=[,;\s]+(?:consignee|to party|receiver|destination|from|to|cargo|weight|packages|rate|special)|$)", clean_text, re.I)
    if c_match:
        extracted["consigner"] = c_match.group(1).strip().strip(",;.")

    # Consignee
    ce_match = re.search(r"(?:consignee|receiver|to party|delivery party)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z0-9\s\.\,\-\&]+?)(?=[,;\s]+(?:consigner|sender|from|to|cargo|weight|packages|rate|special)|$)", clean_text, re.I)
    if ce_match:
        extracted["consignee"] = ce_match.group(1).strip().strip(",;.")

    # Single "for <Party>" without explicit consigner/consignee
    if "consigner" not in extracted and "consignee" not in extracted:
        m_for = re.search(r"\bfor\s+([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:from|to|cargo|weight|packages|route)|$)", clean_text, re.I)
        if m_for:
            extracted["consigner"] = m_for.group(1).strip().strip(",;.")

    # Cargo Description (stops before digits or units)
    cargo_match = re.search(r"(?:cargo|material|goods|item|items|description)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z0-9\s\.\,\-\&]+?)(?=[,;\s]+(?:[0-9]+|weight|packages|pkgs|boxes|cartons|tons|ton|mt|consigner|consignee|from|to)|$)", clean_text, re.I)
    if cargo_match:
        extracted["cargo_description"] = cargo_match.group(1).strip().strip(",;.")

    # Estimated Weight (MT)
    wt_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:mt|tons?|tonnes?)", clean_text, re.I)
    if wt_match:
        try:
            extracted["estimated_weight_mt"] = Decimal(wt_match.group(1).strip())
        except Exception:
            pass

    # Estimated Packages
    pkg_match = re.search(r"([0-9]+)\s*(?:packages?|pkgs?|boxes?|cartons?|bags?)", clean_text, re.I)
    if pkg_match:
        try:
            extracted["estimated_packages"] = int(pkg_match.group(1).strip())
        except Exception:
            pass

    # Contextual Step-by-Step Mapping
    if current_draft:
        missing = current_draft.missing_fields or []
        draft_data = current_draft.data or {}

        is_bare_name = (
            len(clean_text.split()) <= 5
            and not any(k in clean_text.lower() for k in ("from", "to", "cargo", "weight", "packages", "tons", "boxes"))
            and not re.search(r"^[0-9]+", clean_text)
        )

        if is_bare_name:
            if any("Consigner" in m for m in missing) and not draft_data.get("consigner_id"):
                extracted["consigner"] = clean_text
            elif any("Consignee" in m for m in missing) and not draft_data.get("consignee_id"):
                extracted["consignee"] = clean_text
            elif any("Origin" in m for m in missing) and not draft_data.get("origin_location_id"):
                extracted["origin_city"] = clean_text
            elif any("Destination" in m for m in missing) and not draft_data.get("destination_location_id"):
                extracted["destination_city"] = clean_text
            elif any("Cargo" in m for m in missing) and not draft_data.get("cargo_description"):
                extracted["cargo_description"] = clean_text

    return extracted


async def validate_and_update_job_draft(
    draft: AIDraft,
    db: AsyncSession,
    office_id: Optional[int] = None,
) -> None:
    """Validates job draft state against JobCreate rules, sets missing fields and preview labels."""
    missing: List[str] = []
    draft.validation_errors = []

    # 1. Consigner Check
    if not draft.data.get("consigner_id"):
        missing.append("Consigner (Sender)")
    else:
        c = await db.get(Consigner, draft.data["consigner_id"])
        if c:
            draft.preview_labels["consigner"] = f"{c.name}"

    # 2. Consignee Check
    if not draft.data.get("consignee_id"):
        missing.append("Consignee (Receiver)")
    else:
        ce = await db.get(Consignee, draft.data["consignee_id"])
        if ce:
            draft.preview_labels["consignee"] = f"{ce.name}"

    # 3. Route Labels
    if not draft.data.get("origin_location_id") and not draft.preview_labels.get("origin"):
        missing.append("Origin City")
    elif draft.data.get("origin_location_id"):
        loc_o = await db.get(Location, draft.data["origin_location_id"])
        if loc_o:
            draft.preview_labels["origin"] = f"{loc_o.city_name}"

    if not draft.data.get("destination_location_id") and not draft.preview_labels.get("destination"):
        missing.append("Destination City")
    elif draft.data.get("destination_location_id"):
        loc_d = await db.get(Location, draft.data["destination_location_id"])
        if loc_d:
            draft.preview_labels["destination"] = f"{loc_d.city_name}"

    # 4. Cargo and Weight Defaults
    if not draft.data.get("cargo_description"):
        draft.data["cargo_description"] = "General Cargo"
        draft.preview_labels["cargo"] = "General Cargo"
    else:
        draft.preview_labels["cargo"] = str(draft.data["cargo_description"])

    if draft.data.get("estimated_weight_mt"):
        draft.preview_labels["weight"] = f"{float(draft.data['estimated_weight_mt']):.2f} MT"
    if draft.data.get("estimated_packages"):
        draft.preview_labels["packages"] = f"{draft.data['estimated_packages']} Pkgs"

    draft.missing_fields = missing

    if not missing:
        try:
            target_data = dict(draft.data)
            target_data["issuing_office_id"] = office_id or draft.office_id
            JobCreate(**target_data)
            draft.is_valid = True
            draft.generate_confirmation_token(ttl_minutes=15)
        except Exception as e:
            draft.is_valid = False
            draft.validation_errors.append(f"Validation error: {str(e)}")
            draft.confirmation_token = None
    else:
        draft.is_valid = False
        draft.confirmation_token = None


def build_job_preview_card(draft: AIDraft, office_name: Optional[str] = None) -> StructuredCard:
    """Constructs the interactive structured card for Transport Job order draft."""
    c_label = draft.preview_labels.get("consigner", "Pending selection")
    ce_label = draft.preview_labels.get("consignee", "Pending selection")
    orig_label = draft.preview_labels.get("origin", "Pending")
    dest_label = draft.preview_labels.get("destination", "Pending")
    cargo_label = draft.preview_labels.get("cargo", "General Cargo")
    wt_label = draft.preview_labels.get("weight", "0.00 MT")
    pkg_label = draft.preview_labels.get("packages", "0 Pkgs")

    metrics = [
        {"label": "Consigner", "value": c_label},
        {"label": "Consignee", "value": ce_label},
        {"label": "Route", "value": f"{orig_label} ➔ {dest_label}"},
        {"label": "Cargo & Weight", "value": f"{cargo_label} • {wt_label} ({pkg_label})"},
        {"label": "Issuing Office", "value": office_name or "Default Office"},
    ]

    items = [
        {
            "primary": f"Job Order • {cargo_label}",
            "secondary": f"Route: {orig_label} ➔ {dest_label} • Consigner: {c_label}",
            "amount": wt_label,
            "status": "Ready to Confirm" if draft.is_valid else "Incomplete",
            "href": "/transport/job-orders",
        }
    ]

    badge_text = "Ready to Confirm" if draft.is_valid else "Draft: Incomplete"
    badge_variant = "success" if draft.is_valid else "warning"

    return StructuredCard(
        card_type="job_draft",
        title="Transport Job Order Draft",
        subtitle=f"Draft ID: {draft.draft_id}",
        badge={"text": badge_text, "variant": badge_variant},
        metrics=metrics,
        items=items,
        draft_id=draft.draft_id,
        confirmation_token=draft.confirmation_token if draft.is_valid else None,
        missing_fields=draft.missing_fields,
        can_confirm=draft.is_valid and bool(draft.confirmation_token),
        action={"label": "Open in Job Form", "href": "/transport/job-orders"},
    )


async def handle_conversational_job_booking(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch],
    user_text: str,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """
    Intelligent conversational controller for Transport Job orders.
    - Collects required details in one message or step-by-step.
    - Resolves/provisions parties and routes cleanly.
    - Avoids re-asking for details already provided.
    - Presents completed form for user review before final submission.
    """
    eff_office_id = current_office.id if current_office else None
    office_name = current_office.name if current_office else "Main Logistics Hub"

    # 1. Handle Cancellation Intent
    if is_job_cancel_intent(user_text):
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")
        if lang in ("hinglish", "hi_devanagari"):
            reply = "Aapka Transport Job draft cancel kar diya gaya hai. Jab aap ready hon, nayi job order create karne ke liye batayein."
        else:
            reply = "Your Transport Job draft has been cancelled. Let me know when you would like to start a new job order."

        cancel_card = StructuredCard(
            card_type="job_draft",
            title="Job Draft Cancelled",
            badge={"text": "Cancelled", "variant": "neutral"},
            metrics=[],
            action={"label": "Open Jobs Register", "href": "/transport/job-orders"},
        )
        return reply, [cancel_card]

    # 2. Retrieve or create active draft
    draft = await lr_draft_store.get_or_create_active_draft(
        tenant_id=tenant.id,
        user_id=user.id,
        office_id=eff_office_id,
        draft_type="job",
    )

    # 3. Parse Entities
    extracted = parse_job_entities_from_text(user_text, current_draft=draft)

    # 4. Resolve Consigner
    if "consigner" in extracted:
        c_cand = extracted["consigner"]
        c_obj = await resolve_or_create_job_party(db, Consigner, c_cand, office_id=eff_office_id)
        draft.update_field("consigner_id", c_obj.id, label=c_obj.name)
        draft.preview_labels["consigner"] = c_obj.name

    # 5. Resolve Consignee
    if "consignee" in extracted:
        ce_cand = extracted["consignee"]
        ce_obj = await resolve_or_create_job_party(db, Consignee, ce_cand, office_id=eff_office_id)
        draft.update_field("consignee_id", ce_obj.id, label=ce_obj.name)
        draft.preview_labels["consignee"] = ce_obj.name

    # 6. Resolve Route Locations
    if "origin_city" in extracted:
        city_o = extracted["origin_city"]
        loc_o = await resolve_or_create_job_location(db, city_o, office_id=eff_office_id)
        draft.update_field("origin_location_id", loc_o.id, label=loc_o.city_name)
        draft.preview_labels["origin"] = loc_o.city_name

    if "destination_city" in extracted:
        city_d = extracted["destination_city"]
        loc_d = await resolve_or_create_job_location(db, city_d, office_id=eff_office_id)
        draft.update_field("destination_location_id", loc_d.id, label=loc_d.city_name)
        draft.preview_labels["destination"] = loc_d.city_name

    # 7. Additional fields
    if "cargo_description" in extracted:
        draft.update_field("cargo_description", extracted["cargo_description"])
    if "estimated_weight_mt" in extracted:
        draft.update_field("estimated_weight_mt", extracted["estimated_weight_mt"])
    if "estimated_packages" in extracted:
        draft.update_field("estimated_packages", extracted["estimated_packages"])

    # 8. Validate and update state
    await validate_and_update_job_draft(draft, db, office_id=eff_office_id)
    await lr_draft_store.save_draft(draft)

    # 9. Build Card
    card = build_job_preview_card(draft, office_name=office_name)

    # 10. Generate Localized Reply
    c_label = draft.preview_labels.get("consigner")
    ce_label = draft.preview_labels.get("consignee")
    orig_label = draft.preview_labels.get("origin")
    dest_label = draft.preview_labels.get("destination")
    cargo_label = draft.preview_labels.get("cargo", "General Cargo")
    wt_label = draft.preview_labels.get("weight", "0.00 MT")
    pkg_label = draft.preview_labels.get("packages", "0 Pkgs")

    if draft.is_valid:
        if lang in ("hinglish", "hi_devanagari"):
            reply = (
                f"### 📋 Transport Job Order — Review & Confirmation\n\n"
                f"Sabhi zaroori details collect aur validate ho chuki hain:\n"
                f"• **Consigner (Sender):** {c_label}\n"
                f"• **Consignee (Receiver):** {ce_label}\n"
                f"• **Route:** {orig_label} → {dest_label}\n"
                f"• **Cargo Description:** {cargo_label}\n"
                f"• **Estimated Weight:** {wt_label}\n"
                f"• **Estimated Packages:** {pkg_label}\n\n"
                f"Kripya summary aur draft card check karein. Final submission ke liye "
                f"**'Confirm & Create Job'** button par click karein."
            )
        else:
            reply = (
                f"### 📋 Transport Job Order — Review & Confirmation\n\n"
                f"All required details have been successfully collected and verified:\n"
                f"• **Consigner (Sender):** {c_label}\n"
                f"• **Consignee (Receiver):** {ce_label}\n"
                f"• **Route:** {orig_label} → {dest_label}\n"
                f"• **Cargo Description:** {cargo_label}\n"
                f"• **Estimated Weight:** {wt_label}\n"
                f"• **Estimated Packages:** {pkg_label}\n\n"
                f"Please review the summary above and the draft card below. "
                f"Click **'Confirm & Create Job'** to finalize the order."
            )
    else:
        recorded_lines = []
        if c_label:
            recorded_lines.append(f"• **Consigner:** {c_label}")
        if ce_label:
            recorded_lines.append(f"• **Consignee:** {ce_label}")
        if orig_label or dest_label:
            recorded_lines.append(f"• **Route:** {orig_label or 'Pending'} → {dest_label or 'Pending'}")
        if cargo_label and cargo_label != "General Cargo":
            recorded_lines.append(f"• **Cargo:** {cargo_label}")

        recorded_block = ""
        if recorded_lines:
            recorded_block = "**Recorded Details:**\n" + "\n".join(recorded_lines) + "\n\n"

        missing_prompts = []
        for mf in draft.missing_fields:
            if "Consigner" in mf:
                missing_prompts.append("• Who is the **Consigner (Sender Party)**?")
            elif "Consignee" in mf:
                missing_prompts.append("• Who is the **Consignee (Receiver Party)**?")
            elif "Origin" in mf:
                missing_prompts.append("• What is the **Origin / Loading City**?")
            elif "Destination" in mf:
                missing_prompts.append("• What is the **Destination / Delivery City**?")

        missing_block = "👉 **Still Needed:**\n" + "\n".join(missing_prompts)

        if lang in ("hinglish", "hi_devanagari"):
            reply = (
                f"Main aapka Transport Job draft prepare kar raha hoon.\n\n"
                f"{recorded_block}"
                f"{missing_block}\n\n"
                f"*Aap baaki bachi details ek sath ya ek-ek karke provide kar sakte hain.*"
            )
        else:
            reply = (
                f"I am preparing your Transport Job draft.\n\n"
                f"{recorded_block}"
                f"{missing_block}\n\n"
                f"*You can provide all remaining details together in one message or step-by-step.*"
            )

    return reply, [card]
