"""
Panther AI Conversational Transport Job Creation Service.
Provides multi-turn dialogue, party resolution, entity extraction,
draft validation, and structured preview cards for Transport Job orders.
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
    Consigner,
    Consignee,
    Location,
    BillingClient,
    Job,
)
from app.control.models import Tenant
from app.modules.transport.schemas import JobCreate
from app.modules.ai.schemas import StructuredCard
from app.modules.ai.draft_store import lr_draft_store, AIDraft

logger = logging.getLogger("panther.ai.job_draft")


def is_job_booking_intent(text: str) -> bool:
    """Detects whether the user is requesting to create/book a Transport Job order."""
    t = text.lower().strip()
    booking_patterns = [
        r"\b(create|book|new|generate|start|make|raise)\b.*\b(job|transport job|job order)\b",
        r"\b(job|transport job|job order)\b.*\b(create|book|generate|start|make|raise|karo|banao|karni|karna)\b",
        r"\b(mujhe|hume|humko)\b.*\b(job)\b.*\b(banana|create|book)\b",
        r"\b(ek|1)\s*(job|transport job)\b",
    ]
    for p in booking_patterns:
        if re.search(p, t):
            return True
    return False


def is_instructional_job_inquiry(text: str) -> bool:
    """Detects instructional/knowledge inquiries about Jobs rather than booking."""
    t = text.lower().strip()
    inquiry_patterns = [
        r"\b(how|kaise|kya|where|kaha|what)\b.*\b(job|transport job)\b",
        r"\b(job|transport job|job order)\b.*\b(kya|kaise|kaha|hota|rules|process|status|register)\b",
        r"\b(what is|explain|details of|rules for)\b.*\b(job|transport job)\b",
    ]
    for p in inquiry_patterns:
        if re.search(p, t):
            return True
    return False


def is_job_cancel_intent(text: str) -> bool:
    """Detects user intention to cancel or discard the active job draft."""
    t = text.lower().strip()
    return bool(re.search(r"\b(cancel|discard|clear|abort|drop|delete|reset)\b.*\b(job|draft)\b", t) or t in ("cancel job", "discard job", "clear job"))


async def resolve_party_for_job(
    db: AsyncSession,
    model_cls,
    query_text: str,
    office_id: Optional[int] = None,
) -> Tuple[Optional[Any], bool]:
    """Resolves a party (Consigner or Consignee) with exact/fuzzy matching and office scoping."""
    if not query_text or not query_text.strip():
        return None, False

    clean = query_text.strip()
    query = select(model_cls).where(model_cls.is_active == True)
    if office_id and hasattr(model_cls, "issuing_office_id"):
        query = query.where(or_(model_cls.issuing_office_id == office_id, model_cls.issuing_office_id.is_(None)))

    res_exact = await db.execute(query.where(func.lower(model_cls.name) == clean.lower()))
    exact_matches = res_exact.scalars().all()
    if len(exact_matches) == 1:
        return exact_matches[0], False

    res_code = await db.execute(query.where(func.lower(model_cls.code) == clean.lower()))
    code_matches = res_code.scalars().all()
    if len(code_matches) == 1:
        return code_matches[0], False

    pattern = f"%{clean}%"
    res_like = await db.execute(query.where(model_cls.name.ilike(pattern)).limit(5))
    like_matches = res_like.scalars().all()
    if len(like_matches) == 1:
        return like_matches[0], False
    elif len(like_matches) > 1:
        return None, True

    return None, False


def parse_job_entities_from_text(text: str) -> Dict[str, Any]:
    """Extracts candidate entities for Transport Job order from natural language input."""
    extracted: Dict[str, Any] = {}

    # Consigner
    c_match = re.search(r"(?:consigner|sender|from party|shipper)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z0-9\s\.\,\-\&]+?)(?=[,;\s]+(?:consignee|to party|receiver|destination|from|to|cargo|weight|packages|rate|special)|$)", text, re.I)
    if c_match:
        extracted["consigner"] = c_match.group(1).strip().strip(",;.")

    # Consignee
    ce_match = re.search(r"(?:consignee|receiver|to party|delivery party)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z0-9\s\.\,\-\&]+?)(?=[,;\s]+(?:consigner|sender|from|to|cargo|weight|packages|rate|special)|$)", text, re.I)
    if ce_match:
        extracted["consignee"] = ce_match.group(1).strip().strip(",;.")

    # Route: From ... To ...
    route_match = re.search(r"\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?=[,;\s]+(?:consigner|consignee|cargo|weight|packages|rate)|$)", text, re.I)
    if route_match:
        extracted["origin_city"] = route_match.group(1).strip().strip(",;.")
        extracted["destination_city"] = route_match.group(2).strip().strip(",;.")
    else:
        from_match = re.search(r"\b(?:from|loading at|source)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:to|cargo|weight|packages)|$)", text, re.I)
        if from_match:
            extracted["origin_city"] = from_match.group(1).strip().strip(",;.")
        to_match = re.search(r"\b(?:to|delivery at|destination)\s+([A-Za-z\s]+?)(?=[,;\s]+(?:cargo|weight|packages)|$)", text, re.I)
        if to_match:
            extracted["destination_city"] = to_match.group(1).strip().strip(",;.")

    # Cargo Description
    cargo_match = re.search(r"(?:cargo|material|goods|item|items|description)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([A-Za-z0-9\s\.\,\-\&]+?)(?=[,;\s]+(?:weight|packages|consigner|consignee|from|to)|$)", text, re.I)
    if cargo_match:
        extracted["cargo_description"] = cargo_match.group(1).strip().strip(",;.")

    # Estimated Weight (MT)
    wt_match = re.search(r"(?:weight|wt|tonnage)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mt|tons?|tonnes?)?", text, re.I)
    if wt_match:
        try:
            extracted["estimated_weight_mt"] = Decimal(wt_match.group(1).strip())
        except Exception:
            pass

    # Estimated Packages
    pkg_match = re.search(r"(?:packages?|pkgs?|boxes?|cartons?|bags?)(?:\s+is|\s*:|\s*=\s*|\s+)?\s*([0-9]+)", text, re.I)
    if pkg_match:
        try:
            extracted["estimated_packages"] = int(pkg_match.group(1).strip())
        except Exception:
            pass

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
        missing.append("Consigner")
    else:
        c = await db.get(Consigner, draft.data["consigner_id"])
        if c:
            draft.preview_labels["consigner"] = f"{c.name} ({c.code})"

    # 2. Consignee Check
    if not draft.data.get("consignee_id"):
        missing.append("Consignee")
    else:
        ce = await db.get(Consignee, draft.data["consignee_id"])
        if ce:
            draft.preview_labels["consignee"] = f"{ce.name} ({ce.code})"

    # 3. Route Labels
    if draft.data.get("origin_location_id"):
        loc_o = await db.get(Location, draft.data["origin_location_id"])
        if loc_o:
            draft.preview_labels["origin"] = f"{loc_o.city_name}, {loc_o.state or ''}".strip(", ")
    if draft.data.get("destination_location_id"):
        loc_d = await db.get(Location, draft.data["destination_location_id"])
        if loc_d:
            draft.preview_labels["destination"] = f"{loc_d.city_name}, {loc_d.state or ''}".strip(", ")

    # 4. Cargo and Weight Defaults
    if draft.data.get("cargo_description"):
        draft.preview_labels["cargo"] = str(draft.data["cargo_description"])
    if draft.data.get("estimated_weight_mt"):
        draft.preview_labels["weight"] = f"{float(draft.data['estimated_weight_mt']):.3f} MT"
    if draft.data.get("estimated_packages"):
        draft.preview_labels["packages"] = f"{draft.data['estimated_packages']} Pkgs"

    draft.missing_fields = missing

    if not missing:
        # Schema validation test
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
    orig_label = draft.preview_labels.get("origin", "Not specified")
    dest_label = draft.preview_labels.get("destination", "Not specified")
    cargo_label = draft.preview_labels.get("cargo", "General Cargo")
    wt_label = draft.preview_labels.get("weight", "0.000 MT")
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
            "href": "/transport/jobs",
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
        action={"label": "Open in Job Form", "href": "/transport/jobs"},
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
    Core conversational controller for Transport Job orders.
    Parses entities, manages multi-turn dialogue, handles party disambiguation,
    and returns localized responses and interactive preview cards.
    """
    eff_office_id = current_office.id if current_office else None
    office_name = current_office.name if current_office else "Main Logistics Hub"

    # 1. Handle Cancellation Intent
    if is_job_cancel_intent(user_text):
        cleared = await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="job")
        if lang == "hi":
            reply = "Aapka Transport Job draft radd (cancel) kar diya gaya hai."
        elif lang == "hinglish":
            reply = "Aapka Transport Job draft cancel kar diya gaya hai. Jab aap ready hon, nayi job create karne ke liye batayein."
        else:
            reply = "Your Transport Job draft has been cancelled. Let me know when you would like to start a new job order."

        cancel_card = StructuredCard(
            card_type="job_draft",
            title="Job Draft Cancelled",
            badge={"text": "Cancelled", "variant": "destructive"},
            metrics=[],
            action={"label": "Open Jobs Register", "href": "/transport/jobs"},
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
    extracted = parse_job_entities_from_text(user_text)

    # 4. Resolve Consigner
    if "consigner" in extracted:
        c_cand = extracted["consigner"]
        resolved_c, multiple_c = await resolve_party_for_job(db, Consigner, c_cand, office_id=eff_office_id)
        if resolved_c:
            draft.update_field("consigner_id", resolved_c.id, label=f"{resolved_c.name} ({resolved_c.code})")
        elif multiple_c:
            draft.validation_errors.append(f"Multiple consigners matched '{c_cand}'. Please specify party code or exact name.")

    # 5. Resolve Consignee
    if "consignee" in extracted:
        ce_cand = extracted["consignee"]
        resolved_ce, multiple_ce = await resolve_party_for_job(db, Consignee, ce_cand, office_id=eff_office_id)
        if resolved_ce:
            draft.update_field("consignee_id", resolved_ce.id, label=f"{resolved_ce.name} ({resolved_ce.code})")
        elif multiple_ce:
            draft.validation_errors.append(f"Multiple consignees matched '{ce_cand}'. Please specify party code or exact name.")

    # 6. Resolve Route Locations
    if "origin_city" in extracted:
        city = extracted["origin_city"]
        res_loc = await db.execute(select(Location).where(func.lower(Location.city_name) == city.lower()).limit(1))
        loc = res_loc.scalar_one_or_none()
        if loc:
            draft.update_field("origin_location_id", loc.id, label=loc.city_name)
    if "destination_city" in extracted:
        city = extracted["destination_city"]
        res_loc = await db.execute(select(Location).where(func.lower(Location.city_name) == city.lower()).limit(1))
        loc = res_loc.scalar_one_or_none()
        if loc:
            draft.update_field("destination_location_id", loc.id, label=loc.city_name)

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
    if draft.is_valid:
        if lang == "hi":
            reply = (
                f"Transport Job draft taiyar hai! Consigner: {draft.preview_labels.get('consigner')}, "
                f"Consignee: {draft.preview_labels.get('consignee')}. Kripya details check karke confirm karein."
            )
        elif lang == "hinglish":
            reply = (
                f"Aapka Transport Job draft ready hai! Consigner: {draft.preview_labels.get('consigner')}, "
                f"Consignee: {draft.preview_labels.get('consignee')}. Neeche review karke 'Confirm & Create Job' button par click karein."
            )
        else:
            reply = (
                f"Transport Job draft is complete and ready for confirmation! "
                f"Consigner: {draft.preview_labels.get('consigner')}, Consignee: {draft.preview_labels.get('consignee')}. "
                f"Please review the summary below and click 'Confirm & Create Job'."
            )
    else:
        missing_str = ", ".join(draft.missing_fields)
        if lang == "hi":
            reply = f"Maine Transport Job draft shuru kar diya hai. Kripya missing jankari pradan karein: {missing_str}."
        elif lang == "hinglish":
            reply = f"Main aapka Transport Job draft bana raha hoon. Kripya ye details batayein: {missing_str}."
        else:
            reply = f"I've initiated your Transport Job draft. Please provide the remaining required details: {missing_str}."

    return reply, [card]
