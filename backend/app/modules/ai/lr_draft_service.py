"""
Panther AI Conversational LR Creation Service.
Collects, validates, and prepares structured Lorry Receipt (LR) drafts through natural language.
Supports single-message full specification and step-by-step guided collection without re-asking.
Auto-provisions missing master entities, presents full form review before confirmation.
"""
import re
import json
import secrets
import asyncio
import logging
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
from datetime import date, datetime, timezone

from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.control.models import Tenant
from app.tenant_db.models import (
    User,
    Branch,
    Consigner,
    Consignee,
    Location,
    CompanyVehicle,
    MarketVehicle,
)
from app.modules.transport.schemas import LRCreate
from app.modules.ai.schemas import StructuredCard, ChatMessage
from app.modules.ai.draft_store import LRDraft, lr_draft_store, AIDraft
from app.modules.ai.tools import extract_vehicle_number, is_user_permitted
from app.modules.ai.provider import is_provider_configured, call_llm

logger = logging.getLogger("panther.ai.lr_draft")

# Vehicle format regex (Indian registration numbers)
INDIAN_VEHICLE_STRICT_REGEX = re.compile(
    r"^[A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4}$",
    re.IGNORECASE,
)


def is_instructional_inquiry(text: str) -> bool:
    """Detects if user is asking for guidance, instructions, or conceptual explanations."""
    lower = text.strip().lower()

    # 1. If explicit document number present, it's never instructional
    has_doc_number = bool(
        re.search(r"\b(?:lr|gr|bilty)[#\s\-_/]*[0-9][A-Za-z0-9_-]*\b", lower) or
        re.search(r"\b(?:hc)[#\s\-_/]*[0-9][A-Za-z0-9_-]*\b", lower) or
        re.search(r"\b(?:job)[#\s\-_/]*[0-9][A-Za-z0-9_-]*\b", lower) or
        re.search(r"\b(?:inv|voucher)[#\s\-_/]*[0-9][A-Za-z0-9_-]*\b", lower) or
        re.search(r"\b([A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4})\b", text, re.IGNORECASE)
    )
    if has_doc_number:
        return False

    # 2. Specific attribute / follow-up inquiry on active record
    entity_refs = (
        "this hc", "is hc", "that hc", "the hc", "this challan", "is challan", "is hire challan", "this hire challan",
        "this lr", "is lr", "that lr", "the lr", "this bilty", "is bilty", "this consignment",
        "this job", "is job", "that job", "the job",
        "this vehicle", "is vehicle", "that vehicle", "the vehicle", "this truck", "this gadi", "this gaadi",
        "this invoice", "is invoice", "that invoice",
        "its ", "iska ", "iski ", "iss ", "iske "
    )
    attr_words = (
        "vendor", "balance", "advance", "status", "driver", "consignee", "consigner",
        "rate", "freight", "delivered", "kahan", "location", "details", "info",
        "tell me about", "batao", "bataiye"
    )
    if any(ref in lower for ref in entity_refs) and any(w in lower for w in attr_words):
        return False

    # 3. Broad Hinglish & Hindi query construction patterns
    if "kaise" in lower and any(v in lower for v in ["kare", "karein", "create", "bana", "add", "karta", "karti", "hota", "hoti", "process"]):
        return True

    inquiry_patterns = [
        "how do i", "how to", "how can i", "how does", "how would i",
        "what is", "what are", "explain", "guide me", "tell me how",
        "steps to", "process to", "process of", "what is the process",
        "procedure", "workflow", "how it works", "purpose of", "use of",
        "kaise banti", "kaise banta", "kaise banate", "kaise banaye", "kaise banayein",
        "kaise karu", "kaise karoon", "kaise kare", "kaise karein", "kaise karte",
        "kaise hota", "kaise hoti", "kaise add", "kaise perform", "kaise use", "kaise create",
        "kya hota", "kya hoti", "kya hai", "use kya hai", "purpose kya hai",
        "fayda kya hai", "matlab kya hai", "kya process", "process kya",
        "sikhao", "sikha do", "sikhaoge", "batao kaise",
        "कैसे", "क्या है", "क्या होता", "प्रक्रिया", "सिखाओ", "सिखाइए", "समझाइए", "मार्गदर्शन",
    ]
    return any(p in lower for p in inquiry_patterns)


def is_lr_booking_intent(text: str) -> bool:
    """Detects active intent to create, book, or update an LR / Bilty draft."""
    lower = text.strip().lower()
    if is_instructional_inquiry(text):
        return False

    booking_triggers = [
        "book lr", "create lr", "new lr", "lr booking", "make an lr",
        "book an lr", "create an lr", "lr banani hai", "lr book karni hai",
        "ek lr banao", "ek lr create karo", "lr bana do", "bana do lr",
        "bilty banani hai", "bilty banao", "bilty create karo", "bilty book",
        "create bilty", "book bilty", "new bilty", "start lr booking",
        "start lr draft", "consigner is", "consignee is", "delivery to",
        "loading at", "freight is", "book consignment", "create consignment",
        "consignment note", "book shipment", "book a shipment", "create shipment",
        "lorry receipt", "book lorry receipt", "issue lr", "issue bilty",
        "transport book", "reserve truck", "bilty",
    ]
    if any(t in lower for t in booking_triggers):
        return True

    booking_patterns = [
        r"\b(book|create|new|start|make|raise|issue)\b.*\b(lr|gr|bilty|shipment|consignment|lorry receipt)\b",
        r"\b(lr|gr|bilty|shipment|consignment|lorry receipt)\b.*\b(book|create|banao|banani|generate|start|karni|karna)\b",
    ]
    return any(bool(re.search(p, lower)) for p in booking_patterns)


def is_cancel_intent(text: str) -> bool:
    """Detects intent to cancel/discard current draft."""
    lower = text.strip().lower()
    cancel_triggers = [
        "cancel draft", "clear draft", "discard draft", "draft cancel", "cancel lr draft",
        "cancel lr", "cancel booking", "cancel", "clear", "discard", "abort draft", "abort",
        "reset draft", "radd karo", "hatao draft", "stop draft", "stop booking",
    ]
    return any(t == lower or t in lower for t in cancel_triggers)


def parse_lr_entities_from_text(text: str, current_draft: Optional[AIDraft] = None) -> Dict[str, Any]:
    """
    Extracts candidate entities from conversational user text.
    Handles:
    - All-in-one comprehensive sentences
    - Step-by-step single-field answers (context-aware of what is currently missing)
    """
    entities: Dict[str, Any] = {}
    clean_text = text.strip()

    # 1. Vehicle Number
    extracted_v = extract_vehicle_number(clean_text)
    if extracted_v:
        entities["vehicle_number"] = extracted_v
    else:
        m_v_strict = re.search(r"\b([A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4})\b", clean_text, re.IGNORECASE)
        if m_v_strict:
            entities["vehicle_number"] = m_v_strict.group(1).upper()
        else:
            m_inv = re.search(r"\b(?:vehicle|gaadi|truck)\s+(?:is\s+|number\s+)?([A-Za-z0-9_-]{1,5})\b", clean_text, re.IGNORECASE)
            if m_inv and not re.search(r"^(?:company|market|own|type)$", m_inv.group(1), re.IGNORECASE):
                entities["invalid_vehicle"] = m_inv.group(1).upper()

    # 2. Route Locations (From / To)
    m_route = re.search(r"\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?=[,;\s]+(?:consigner|consignee|party|vehicle|truck|gaadi|freight|bhada|cargo|packages|boxes|weight|at|rate|₹|rs)|$)", clean_text, re.IGNORECASE)
    if m_route:
        entities["origin_candidate"] = m_route.group(1).strip()
        entities["destination_candidate"] = m_route.group(2).strip()
    else:
        m_dash_route = re.search(r"\b([A-Za-z]{3,20})\s*(?:to|-|➔|->)\s*([A-Za-z]{3,20})\b", clean_text, re.IGNORECASE)
        common_words = {"party", "consigner", "consignee", "vehicle", "freight", "advance", "bilty", "order"}
        if m_dash_route and m_dash_route.group(1).lower() not in common_words and m_dash_route.group(2).lower() not in common_words:
            entities["origin_candidate"] = m_dash_route.group(1).strip()
            entities["destination_candidate"] = m_dash_route.group(2).strip()

        m_from = re.search(r"(?:loading|origin|source|from)\s+(?:at\s+|is\s+|:\s*)?([A-Za-z\s]+?)(?=[,;\s]+(?:to|destination|delivery|consigner|consignee|vehicle|freight)|$)", clean_text, re.IGNORECASE)
        if m_from and "origin_candidate" not in entities:
            entities["origin_candidate"] = m_from.group(1).strip()

        m_to = re.search(r"(?:delivery|destination|to)\s+(?:at\s+|is\s+|:\s*)?([A-Za-z\s]+?)(?=[,;\s]+(?:from|origin|loading|consigner|consignee|vehicle|freight)|$)", clean_text, re.IGNORECASE)
        if m_to and "destination_candidate" not in entities:
            entities["destination_candidate"] = m_to.group(1).strip()

    # 3. Explicit Consigner & Consignee
    m_consigner = re.search(
        r"(?:consigner|shipper|sender|from party|bhejne wala)\s+(?:is\s+|:\s*|=)?\s*([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:and|consignee|receiver|to party|vehicle|truck|gaadi|to|from|freight|bhada|delivery|loading|at)\b|$)",
        clean_text,
        re.IGNORECASE,
    )
    if m_consigner:
        entities["consigner_candidate"] = m_consigner.group(1).strip().strip(" ,;.")

    m_consignee = re.search(
        r"(?:consignee|receiver|to party|panewala|delivery party)\s+(?:is\s+|:\s*|=)?\s*([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:and|consigner|shipper|sender|from party|vehicle|truck|gaadi|from|to|freight|bhada|destination|at)\b|$)",
        clean_text,
        re.IGNORECASE,
    )
    if m_consignee:
        entities["consignee_candidate"] = m_consignee.group(1).strip().strip(" ,;.")

    # Compound Party Pattern: "for <Consignee> from <Consigner>" or "<Consigner> to <Consignee>"
    if "consigner_candidate" not in entities and "consignee_candidate" not in entities:
        m_for_from = re.search(r"\bfor\s+([A-Za-z0-9\s&.-]+?)\s+from\s+([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:vehicle|truck|freight|rate)|$)", clean_text, re.IGNORECASE)
        if m_for_from:
            entities["consignee_candidate"] = m_for_from.group(1).strip().strip(" ,;.")
            entities["consigner_candidate"] = m_for_from.group(2).strip().strip(" ,;.")

    # 4. Financial Amounts (Freight / Advance)
    m_freight = re.search(r"(?:freight|bhada|rate|charges?|amount)\s*(?:is\s+|:\s*|of\s+|=)?\s*(?:₹\s*|rs\.?\s*)?([0-9]+(?:\.[0-9]{1,2})?k?)", clean_text, re.IGNORECASE)
    if m_freight:
        val_str = m_freight.group(1).lower()
        try:
            if "k" in val_str:
                entities["freight_amount"] = float(val_str.replace("k", "")) * 1000.0
            else:
                entities["freight_amount"] = float(val_str)
        except ValueError:
            pass

    m_advance = re.search(r"(?:advance|peshgi)\s*(?:is\s+|:\s*|of\s+|=)?\s*(?:₹\s*|rs\.?\s*)?([0-9]+(?:\.[0-9]{1,2})?k?)", clean_text, re.IGNORECASE)
    if m_advance:
        val_str = m_advance.group(1).lower()
        try:
            if "k" in val_str:
                entities["advance_amount"] = float(val_str.replace("k", "")) * 1000.0
            else:
                entities["advance_amount"] = float(val_str)
        except ValueError:
            pass

    # 5. Packages & Weight
    m_pkg = re.search(r"([0-9]+)\s*(?:boxes|pkgs|packages|nag|cartons|bags|cases|parcels)", clean_text, re.IGNORECASE)
    if m_pkg:
        try:
            entities["package_count"] = int(m_pkg.group(1))
        except ValueError:
            pass

    m_weight = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:tons|ton|mt|tonnes)", clean_text, re.IGNORECASE)
    if m_weight:
        try:
            entities["actual_weight_mt"] = float(m_weight.group(1))
            entities["chargeable_weight_mt"] = float(m_weight.group(1))
        except ValueError:
            pass

    # 6. Particulars / Cargo description
    m_cargo = re.search(r"(?:cargo|material|goods|particulars)\s*(?:is|:|=)?\s*([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:weight|boxes|pkgs|freight|consigner|consignee)|$)", clean_text, re.IGNORECASE)
    if m_cargo:
        entities["particulars"] = m_cargo.group(1).strip().strip(" ,;.")

    # 7. Contextual Step-by-Step Mapping (if user answered a specific follow-up)
    if current_draft:
        missing = current_draft.missing_fields or []
        draft_data = current_draft.data or {}

        # If user typed a standalone party name without keywords
        is_bare_name = (
            len(clean_text.split()) <= 5
            and not any(k in clean_text.lower() for k in ("from", "to", "freight", "advance", "vehicle", "boxes", "tons"))
            and not re.search(r"^[0-9]+", clean_text)
            and not extracted_v
        )

        if is_bare_name:
            if any("Consigner" in m for m in missing) and not draft_data.get("consigner_id"):
                entities["consigner_candidate"] = clean_text
            elif any("Consignee" in m for m in missing) and not draft_data.get("consignee_id"):
                entities["consignee_candidate"] = clean_text
            elif any("Loading" in m for m in missing) and not draft_data.get("origin_location_id"):
                entities["origin_candidate"] = clean_text
            elif any("Delivery" in m for m in missing) and not draft_data.get("destination_location_id"):
                entities["destination_candidate"] = clean_text

        # If user gave just a bare number and freight is missing
        if re.match(r"^(?:₹|rs\.?)?\s*[0-9]+(?:\.[0-9]{1,2})?k?$", clean_text, re.IGNORECASE) and not draft_data.get("freight_amount"):
            num_str = re.sub(r"[^0-9.kK]", "", clean_text).lower()
            try:
                if "k" in num_str:
                    entities["freight_amount"] = float(num_str.replace("k", "")) * 1000.0
                else:
                    entities["freight_amount"] = float(num_str)
            except Exception:
                pass

    return entities


async def extract_booking_entities_via_llm(user_text: str, current_missing: List[str]) -> Dict[str, Any]:
    """
    Fast LLM entity extraction helper when AI provider is configured.
    Safely times out after 2.5s and returns empty dict on any failure.
    """
    if not is_provider_configured():
        return {}

    sys_prompt = (
        "You are an expert logistics entity extraction engine for a Transport Management System.\n"
        "Given the user's message and currently missing fields, extract any available booking values.\n"
        "Return ONLY a valid JSON object with keys: consigner, consignee, origin, destination, vehicle_number, "
        "freight_amount (float or null), advance_amount (float or null), package_count (int or null), "
        "actual_weight_mt (float or null), particulars (str or null).\n"
        "Do not invent values. Use null if not mentioned."
    )
    user_prompt = f"Missing fields: {current_missing}\nUser text: {user_text}"

    try:
        coro = call_llm(
            messages=[ChatMessage(role="user", content=user_prompt)],
            system_prompt=sys_prompt,
            max_tokens=250,
            temperature=0.1,
        )
        raw_res = await asyncio.wait_for(coro, timeout=2.5)
        cleaned = re.sub(r"```json|```", "", raw_res).strip()
        data = json.loads(cleaned)
        extracted: Dict[str, Any] = {}
        if data.get("consigner"):
            extracted["consigner_candidate"] = str(data["consigner"]).strip()
        if data.get("consignee"):
            extracted["consignee_candidate"] = str(data["consignee"]).strip()
        if data.get("origin"):
            extracted["origin_candidate"] = str(data["origin"]).strip()
        if data.get("destination"):
            extracted["destination_candidate"] = str(data["destination"]).strip()
        if data.get("vehicle_number"):
            extracted["vehicle_number"] = str(data["vehicle_number"]).strip()
        if data.get("freight_amount") is not None:
            extracted["freight_amount"] = float(data["freight_amount"])
        if data.get("advance_amount") is not None:
            extracted["advance_amount"] = float(data["advance_amount"])
        if data.get("package_count") is not None:
            extracted["package_count"] = int(data["package_count"])
        if data.get("actual_weight_mt") is not None:
            extracted["actual_weight_mt"] = float(data["actual_weight_mt"])
        if data.get("particulars"):
            extracted["particulars"] = str(data["particulars"]).strip()
        return extracted
    except Exception as e:
        logger.debug(f"LLM entity extraction fallback: {e}")
        return {}


async def resolve_or_create_consigner(
    db: AsyncSession,
    name: str,
    office_id: Optional[int] = None,
) -> Consigner:
    """Finds existing consigner by name; if absent, auto-provisions to prevent booking blockage."""
    clean_name = name.strip()
    query = select(Consigner).where(Consigner.is_active == True)
    if office_id:
        query = query.where(or_(Consigner.issuing_office_id == office_id, Consigner.issuing_office_id.is_(None)))
    query = query.where(Consigner.name.ilike(f"%{clean_name}%")).order_by(Consigner.name.asc()).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())

    # Exact case-insensitive match
    for m in matches:
        if m.name.lower().strip() == clean_name.lower():
            return m

    if matches:
        return matches[0]

    # Auto-provision new consigner master entry
    code = f"CON-{secrets.token_hex(3).upper()}"
    new_c = Consigner(
        name=clean_name.title(),
        code=code,
        is_active=True,
        issuing_office_id=office_id,
    )
    db.add(new_c)
    await db.commit()
    await db.refresh(new_c)
    return new_c


async def resolve_or_create_consignee(
    db: AsyncSession,
    name: str,
    office_id: Optional[int] = None,
) -> Consignee:
    """Finds existing consignee by name; if absent, auto-provisions to prevent booking blockage."""
    clean_name = name.strip()
    query = select(Consignee).where(Consignee.is_active == True)
    if office_id:
        query = query.where(or_(Consignee.issuing_office_id == office_id, Consignee.issuing_office_id.is_(None)))
    query = query.where(Consignee.name.ilike(f"%{clean_name}%")).order_by(Consignee.name.asc()).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())

    for m in matches:
        if m.name.lower().strip() == clean_name.lower():
            return m

    if matches:
        return matches[0]

    code = f"CNE-{secrets.token_hex(3).upper()}"
    new_ce = Consignee(
        name=clean_name.title(),
        code=code,
        is_active=True,
        issuing_office_id=office_id,
    )
    db.add(new_ce)
    await db.commit()
    await db.refresh(new_ce)
    return new_ce


async def resolve_or_create_location(
    db: AsyncSession,
    city: str,
    office_id: Optional[int] = None,
) -> Location:
    """Finds existing location by city; if absent, auto-provisions to prevent booking blockage."""
    clean_city = city.strip()
    query = select(Location).where(Location.is_active == True)
    if office_id:
        query = query.where(or_(Location.issuing_office_id == office_id, Location.issuing_office_id.is_(None)))
    query = query.where(or_(Location.city_name.ilike(f"%{clean_city}%"), Location.location_code.ilike(f"%{clean_city}%"))).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())

    for m in matches:
        if (m.city_name or "").lower().strip() == clean_city.lower():
            return m

    if matches:
        return matches[0]

    code = clean_city[:4].upper()
    new_loc = Location(
        city_name=clean_city.title(),
        state="General",
        location_code=code,
        is_pickup_point=True,
        is_drop_point=True,
        is_active=True,
        issuing_office_id=office_id,
    )
    db.add(new_loc)
    await db.commit()
    await db.refresh(new_loc)
    return new_loc


async def validate_and_update_draft(
    draft: LRDraft,
    db: AsyncSession,
    office_id: Optional[int] = None,
) -> None:
    """
    Validates draft completeness and constructs LRCreate schema test.
    If mandatory fields are satisfied, marks draft as valid and generates single-use confirmation token.
    """
    missing = []
    data = draft.data

    if not data.get("consigner_id"):
        missing.append("Consigner (Sender)")
    if not data.get("consignee_id"):
        missing.append("Consignee (Receiver)")
    if not data.get("vehicle_number"):
        missing.append("Vehicle Number")
    if not data.get("origin_location_id") and not draft.preview_labels.get("origin_name"):
        missing.append("Loading Location")
    if not data.get("destination_location_id") and not draft.preview_labels.get("destination_name"):
        missing.append("Delivery Location")

    draft.missing_fields = missing

    if missing:
        draft.is_valid = False
        draft.confirmation_token = None
        draft.token_expires_at = None
        return

    # Attempt Pydantic validation against true LRCreate schema
    try:
        freight = Decimal(str(data.get("freight_amount") or 0.0))
        advance = Decimal(str(data.get("advance_amount") or 0.0))
        total_freight = freight
        balance = total_freight - advance

        test_payload = {
            "consigner_id": data["consigner_id"],
            "consignee_id": data["consignee_id"],
            "vehicle_number": data["vehicle_number"],
            "vehicle_source": data.get("vehicle_source", "MARKET"),
            "vehicle_type": data.get("vehicle_type"),
            "origin_location_id": data.get("origin_location_id"),
            "destination_location_id": data.get("destination_location_id"),
            "via": draft.preview_labels.get("destination_name"),
            "freight_amount": freight,
            "advance_amount": advance,
            "total_freight_amount": total_freight,
            "balance_amount": balance,
            "package_count": int(data.get("package_count") or 0),
            "actual_weight_mt": Decimal(str(data.get("actual_weight_mt") or 0.0)),
            "chargeable_weight_mt": Decimal(str(data.get("chargeable_weight_mt") or 0.0)),
            "particulars": data.get("particulars") or "General Cargo",
            "issuing_office_id": office_id or draft.office_id,
        }

        # Validate with LRCreate
        LRCreate(**test_payload)
        draft.data.update(test_payload)
        draft.is_valid = True
        draft.validation_errors = []
        # Generate single-use confirmation token valid for 15 minutes
        draft.generate_confirmation_token(ttl_minutes=15)
    except Exception as e:
        draft.is_valid = False
        draft.validation_errors = [str(e)]
        draft.confirmation_token = None
        draft.token_expires_at = None


async def handle_conversational_lr_booking(
    db: AsyncSession,
    user: User,
    tenant: Tenant,
    current_office: Optional[Branch],
    user_text: str,
    lang: str = "en",
) -> Tuple[str, List[StructuredCard]]:
    """
    Intelligent conversational LR booking flow.
    - Collects information either all at once or step by step.
    - Resolves and auto-provisions parties and routes without blocking.
    - Asks follow-ups ONLY for missing details, never re-asking for provided details.
    - Shows the completed form for full review before final submission.
    """
    # 1. Authorization check
    if not is_user_permitted(user, tenant, "transport", "lr_booking", "create"):
        msg = (
            "Aapke paas LR create karne ki permission nahi hai (transport.lr_booking.create required)."
            if lang in ("hinglish", "hi_devanagari")
            else "You do not have permission to create LRs (missing transport.lr_booking.create)."
        )
        card = StructuredCard(
            card_type="lr_draft",
            title="LR Creation Restricted",
            subtitle="Missing authorization: transport.lr_booking.create",
            badge={"text": "Access Denied", "variant": "danger"},
            can_confirm=False,
        )
        return msg, [card]

    eff_office_id = current_office.id if current_office else None

    # 2. Check Discard / Cancel intent
    if is_cancel_intent(user_text):
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        msg = (
            "Aapki active LR draft cancel kar di gayi hai. Nayi LR banane ke liye kabhi bhi batayein."
            if lang in ("hinglish", "hi_devanagari")
            else "Your active LR draft has been cancelled. Let me know when you would like to book a new consignment."
        )
        card = StructuredCard(
            card_type="lr_draft",
            title="LR Draft Cancelled",
            subtitle="Draft session cleared",
            badge={"text": "Cancelled", "variant": "neutral"},
            can_confirm=False,
            action={"label": "Book New LR", "href": "/transport/lr-booking"},
        )
        return msg, [card]

    # 3. Retrieve or create active draft
    draft = await lr_draft_store.get_or_create_active_draft(
        tenant_id=tenant.id,
        user_id=user.id,
        office_id=eff_office_id,
        draft_type="lr",
    )

    # 4. Extract entities: heuristics first, followed by fast LLM enrichment if available
    entities = parse_lr_entities_from_text(user_text, current_draft=draft)

    # If any mandatory fields are still missing, try fast LLM extraction enrichment
    curr_missing = draft.missing_fields or ["Consigner (Sender)", "Consignee (Receiver)", "Vehicle Number", "Loading Location", "Delivery Location"]
    if len(entities) < 3 and is_provider_configured():
        llm_entities = await extract_booking_entities_via_llm(user_text, curr_missing)
        for k, v in llm_entities.items():
            if k not in entities and v is not None:
                entities[k] = v

    feedback_notes = []

    # 5. Process Vehicle
    if "vehicle_number" in entities:
        v_num = re.sub(r"[^A-Za-z0-9]", "", entities["vehicle_number"]).upper()
        draft.update_field("vehicle_number", v_num, label=v_num)
        stmt_cv = select(CompanyVehicle).where(CompanyVehicle.vehicle_number == v_num)
        res_cv = await db.execute(stmt_cv)
        cv = res_cv.scalar_one_or_none()
        if cv:
            draft.update_field("vehicle_source", "COMPANY")
            if cv.vehicle_type:
                draft.update_field("vehicle_type", cv.vehicle_type)
        else:
            draft.update_field("vehicle_source", "MARKET")

    if "invalid_vehicle" in entities:
        feedback_notes.append(f"Notice: Vehicle '{entities['invalid_vehicle']}' seems incomplete. Please provide a standard registration number (e.g., DL01AA1111).")

    # 6. Process Consigner
    if "consigner_candidate" in entities:
        cand_c = entities["consigner_candidate"]
        c_obj = await resolve_or_create_consigner(db, cand_c, office_id=eff_office_id)
        draft.update_field("consigner_id", c_obj.id, label=c_obj.name)
        draft.preview_labels["consigner_name"] = c_obj.name

    # 7. Process Consignee
    if "consignee_candidate" in entities:
        cand_ce = entities["consignee_candidate"]
        ce_obj = await resolve_or_create_consignee(db, cand_ce, office_id=eff_office_id)
        draft.update_field("consignee_id", ce_obj.id, label=ce_obj.name)
        draft.preview_labels["consignee_name"] = ce_obj.name

    # 8. Process Locations
    if "origin_candidate" in entities:
        cand_o = entities["origin_candidate"]
        loc_o = await resolve_or_create_location(db, cand_o, office_id=eff_office_id)
        draft.update_field("origin_location_id", loc_o.id)
        draft.preview_labels["origin_name"] = loc_o.city_name

    if "destination_candidate" in entities:
        cand_d = entities["destination_candidate"]
        loc_d = await resolve_or_create_location(db, cand_d, office_id=eff_office_id)
        draft.update_field("destination_location_id", loc_d.id)
        draft.preview_labels["destination_name"] = loc_d.city_name

    # 9. Process Financials, Packages, Cargo
    if "freight_amount" in entities:
        draft.update_field("freight_amount", entities["freight_amount"])
    if "advance_amount" in entities:
        draft.update_field("advance_amount", entities["advance_amount"])
    if "package_count" in entities:
        draft.update_field("package_count", entities["package_count"])
    if "actual_weight_mt" in entities:
        draft.update_field("actual_weight_mt", entities["actual_weight_mt"])
        draft.update_field("chargeable_weight_mt", entities.get("chargeable_weight_mt", entities["actual_weight_mt"]))
    if "particulars" in entities:
        draft.update_field("particulars", entities["particulars"])

    # 10. Validate & Update draft state
    await validate_and_update_draft(draft, db, office_id=eff_office_id)
    await lr_draft_store.save_draft(draft)

    # 11. Format Values for Display
    c_name = draft.preview_labels.get("consigner_name")
    ce_name = draft.preview_labels.get("consignee_name")
    v_num = draft.data.get("vehicle_number")
    v_source = draft.data.get("vehicle_source", "MARKET").title()
    orig_name = draft.preview_labels.get("origin_name")
    dest_name = draft.preview_labels.get("destination_name")
    freight_val = float(draft.data.get("freight_amount") or 0.0)
    advance_val = float(draft.data.get("advance_amount") or 0.0)
    balance_val = freight_val - advance_val
    pkgs = int(draft.data.get("package_count") or 0)
    wt = float(draft.data.get("actual_weight_mt") or 0.0)
    particulars = draft.data.get("particulars") or "General Cargo"

    metrics = [
        {"label": "Consigner", "value": c_name or "Pending"},
        {"label": "Consignee", "value": ce_name or "Pending"},
        {"label": "Route", "value": f"{orig_name or 'Origin'} → {dest_name or 'Destination'}"},
        {"label": "Vehicle", "value": f"{v_num} ({v_source})" if v_num else "Pending"},
        {"label": "Freight Amount", "value": f"₹{freight_val:,.2f}"},
        {"label": "Balance Due", "value": f"₹{balance_val:,.2f}"},
    ]

    items = [
        {
            "primary": f"{orig_name or 'Pending'} to {dest_name or 'Pending'} • {v_num or 'Vehicle Pending'}",
            "secondary": f"Consigner: {c_name or 'Pending'} • Consignee: {ce_name or 'Pending'} • Pkgs: {pkgs}",
            "amount": f"₹{freight_val:,.2f}",
            "status": "Ready to Confirm" if draft.is_valid else "Incomplete",
        }
    ]

    # 12. Intelligent Response Generation (Form Review vs Selective Follow-up)
    if draft.is_valid:
        # Full Completed Form Review before final submission
        if lang in ("hinglish", "hi_devanagari"):
            base_msg = (
                f"### 📋 LR Booking Form — Review & Confirmation\n\n"
                f"Sabhi zaroori details collect aur validate ho chuki hain:\n"
                f"• **Consigner (Sender):** {c_name}\n"
                f"• **Consignee (Receiver):** {ce_name}\n"
                f"• **Route:** {orig_name} → {dest_name}\n"
                f"• **Vehicle:** {v_num} ({v_source} Vehicle)\n"
                f"• **Freight Amount:** ₹{freight_val:,.2f}\n"
                f"• **Advance Paid:** ₹{advance_val:,.2f}\n"
                f"• **Balance Due:** ₹{balance_val:,.2f}\n"
                f"• **Packages:** {pkgs} pkgs\n"
                f"• **Weight:** {wt:.2f} MT ({particulars})\n\n"
                f"Kripya upar summary aur niche draft card review karein. Final submission ke liye "
                f"**'Confirm & Create LR'** button par click karein."
            )
        else:
            base_msg = (
                f"### 📋 LR Booking Form — Review & Confirmation\n\n"
                f"All required information has been successfully collected and verified:\n"
                f"• **Consigner (Sender):** {c_name}\n"
                f"• **Consignee (Receiver):** {ce_name}\n"
                f"• **Route:** {orig_name} → {dest_name}\n"
                f"• **Vehicle:** {v_num} ({v_source} Vehicle)\n"
                f"• **Freight Amount:** ₹{freight_val:,.2f}\n"
                f"• **Advance Paid:** ₹{advance_val:,.2f}\n"
                f"• **Balance Due:** ₹{balance_val:,.2f}\n"
                f"• **Packages:** {pkgs} pkgs\n"
                f"• **Weight:** {wt:.2f} MT ({particulars})\n\n"
                f"Please review the summary above and the draft card below. "
                f"Click **'Confirm & Create LR'** to finalize and issue the consignment note."
            )
        badge = {"text": "Ready to Confirm", "variant": "success"}
    else:
        # List what was ALREADY RECORDED
        recorded_lines = []
        if c_name:
            recorded_lines.append(f"• **Consigner (Sender):** {c_name}")
        if ce_name:
            recorded_lines.append(f"• **Consignee (Receiver):** {ce_name}")
        if orig_name or dest_name:
            recorded_lines.append(f"• **Route:** {orig_name or 'Pending'} → {dest_name or 'Pending'}")
        if v_num:
            recorded_lines.append(f"• **Vehicle Number:** {v_num} ({v_source})")
        if freight_val > 0:
            recorded_lines.append(f"• **Freight:** ₹{freight_val:,.2f}")

        recorded_block = ""
        if recorded_lines:
            recorded_block = "**Recorded Details:**\n" + "\n".join(recorded_lines) + "\n\n"

        # Ask ONLY for what is still missing
        missing_prompts = []
        for mf in draft.missing_fields:
            if "Consigner" in mf:
                missing_prompts.append("• Who is the **Consigner (Sender Party)**?")
            elif "Consignee" in mf:
                missing_prompts.append("• Who is the **Consignee (Receiver Party)**?")
            elif "Vehicle" in mf:
                missing_prompts.append("• What is the **Vehicle Number** (e.g., DL01AA1111)?")
            elif "Loading" in mf:
                missing_prompts.append("• What is the **Loading / Origin Location**?")
            elif "Delivery" in mf:
                missing_prompts.append("• What is the **Delivery / Destination Location**?")

        missing_block = "👉 **Still Needed:**\n" + "\n".join(missing_prompts)

        if lang in ("hinglish", "hi_devanagari"):
            base_msg = (
                f"Main aapki LR booking draft prepare kar raha hoon.\n\n"
                f"{recorded_block}"
                f"{missing_block}\n\n"
                f"*Aap baaki bachi details ek sath ya ek-ek karke provide kar sakte hain.*"
            )
        else:
            base_msg = (
                f"I am preparing your LR booking draft.\n\n"
                f"{recorded_block}"
                f"{missing_block}\n\n"
                f"*You can provide all remaining details together in one message or step-by-step.*"
            )
        badge = {"text": "Draft: Incomplete", "variant": "warning"}

    if feedback_notes:
        base_msg = f"{base_msg}\n\n" + "\n".join(feedback_notes)

    card = StructuredCard(
        card_type="lr_draft",
        title="LR Booking Draft",
        subtitle=f"Draft ID: {draft.draft_id} • Office: {current_office.name if current_office else 'Default'}",
        badge=badge,
        metrics=metrics,
        items=items,
        draft_id=draft.draft_id,
        confirmation_token=draft.confirmation_token if draft.is_valid else None,
        missing_fields=draft.missing_fields,
        can_confirm=draft.is_valid,
        action={"label": "Open in LR Form", "href": "/transport/lr-booking"},
    )

    return base_msg, [card]
