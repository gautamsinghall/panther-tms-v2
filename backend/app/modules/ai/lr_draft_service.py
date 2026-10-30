"""
Panther AI Conversational LR Creation Service.
Collects, validates, and prepares structured Lorry Receipt (LR) drafts through natural language.
Supports English, Hindi, and Hinglish multi-turn dialogue with disambiguation and preview cards.
"""
import re
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
from app.modules.ai.schemas import StructuredCard
from app.modules.ai.draft_store import LRDraft, lr_draft_store
from app.modules.ai.tools import extract_vehicle_number, is_user_permitted

# Vehicle format regex (Indian registration numbers)
INDIAN_VEHICLE_STRICT_REGEX = re.compile(
    r"^[A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4}$",
    re.IGNORECASE,
)


def is_instructional_inquiry(text: str) -> bool:
    """Detects if user is asking for guidance/how-to rather than initiating an active booking."""
    lower = text.strip().lower()
    inquiry_patterns = [
        "how do i", "how to", "how can i", "process to", "process of",
        "explain", "steps to", "guide me", "kaise banti", "kaise banta",
        "kaise banate", "kaise banaye", "kaise karu", "kaise karoon",
        "kaise karte", "kya process", "tell me how",
        "what is the process", "booking process", "creation process",
    ]
    return any(p in lower for p in inquiry_patterns)


def is_lr_booking_intent(text: str) -> bool:
    """Detects active intent to create, book, or update an LR draft."""
    lower = text.strip().lower()
    if is_instructional_inquiry(text):
        return False

    booking_triggers = [
        "book lr", "create lr", "new lr", "lr booking", "make an lr",
        "book an lr", "create an lr", "lr banani hai", "lr book karni hai",
        "ek lr banao", "ek lr create karo", "bilty banani hai", "bilty banao",
        "start lr booking", "start lr draft", "consigner is", "consignee is",
        "delivery to", "loading at", "freight is",
    ]
    return any(t in lower for t in booking_triggers)


def is_cancel_intent(text: str) -> bool:
    """Detects intent to cancel/discard current draft."""
    lower = text.strip().lower()
    cancel_triggers = ["cancel draft", "clear draft", "discard draft", "draft cancel", "cancel lr draft"]
    return any(t in lower for t in cancel_triggers)


def parse_lr_entities_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts candidate entities from conversational user text:
    - Vehicle number
    - Consigner candidate
    - Consignee candidate
    - Origin / Destination locations
    - Freight / Advance amounts
    - Package count / Goods description
    """
    entities: Dict[str, Any] = {}
    clean_text = text.strip()

    # 1. Vehicle Number
    extracted_v = extract_vehicle_number(clean_text)
    if extracted_v:
        entities["vehicle_number"] = extracted_v
    else:
        # Check if user passed invalid short vehicle number e.g. "vehicle is 123" or "vehicle 99"
        m_inv = re.search(r"\b(?:vehicle|gaadi|truck)\s+(?:is\s+|number\s+)?([A-Za-z0-9_-]{1,5})\b", clean_text, re.IGNORECASE)
        if m_inv and not re.search(r"^(?:company|market|own|type)$", m_inv.group(1), re.IGNORECASE):
            entities["invalid_vehicle"] = m_inv.group(1).upper()

    # 2. Consigner Name
    m_consigner = re.search(
        r"(?:consigner|shipper|sender|from party|bhejne wala)\s+(?:is\s+|:\s*)?([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:and|consignee|receiver|vehicle|to|freight|delivery|at)\b|$)",
        clean_text,
        re.IGNORECASE,
    )
    if m_consigner:
        entities["consigner_candidate"] = m_consigner.group(1).strip().strip(" ,;.")

    # 3. Consignee Name
    m_consignee = re.search(
        r"(?:consignee|receiver|to party|panewala)\s+(?:is\s+|:\s*)?([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:and|consigner|shipper|vehicle|from|freight|destination|at)\b|$)",
        clean_text,
        re.IGNORECASE,
    )
    if m_consignee:
        entities["consignee_candidate"] = m_consignee.group(1).strip().strip(" ,;.")

    # 4. Route / Locations: "from <CityA> to <CityB>"
    m_route = re.search(r"from\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)", clean_text, re.IGNORECASE)
    if m_route:
        entities["origin_candidate"] = m_route.group(1).strip()
        entities["destination_candidate"] = m_route.group(2).strip()
    else:
        m_from = re.search(r"(?:loading|origin|source|from)\s+(?:at\s+|is\s+|:\s*)?([A-Za-z]+)", clean_text, re.IGNORECASE)
        if m_from and m_from.group(1).lower() not in ("party", "consigner", "delhi", "mumbai", "kolkata", "chennai"):
            entities["origin_candidate"] = m_from.group(1).strip()
        elif m_from:
            entities["origin_candidate"] = m_from.group(1).strip()

        m_to = re.search(r"(?:delivery|destination|to)\s+(?:at\s+|is\s+|:\s*)?([A-Za-z]+)", clean_text, re.IGNORECASE)
        if m_to and m_to.group(1).lower() not in ("party", "consignee"):
            entities["destination_candidate"] = m_to.group(1).strip()

    # 5. Financial Amounts (Freight / Advance)
    m_freight = re.search(r"(?:freight|amount|bhada|rate)\s+(?:is\s+|:\s*|of\s+)?(?:₹\s*|rs\.?\s*)?([0-9]+(?:\.[0-9]{1,2})?)", clean_text, re.IGNORECASE)
    if m_freight:
        try:
            entities["freight_amount"] = float(m_freight.group(1))
        except ValueError:
            pass

    m_advance = re.search(r"(?:advance|peshgi)\s+(?:is\s+|:\s*|of\s+)?(?:₹\s*|rs\.?\s*)?([0-9]+(?:\.[0-9]{1,2})?)", clean_text, re.IGNORECASE)
    if m_advance:
        try:
            entities["advance_amount"] = float(m_advance.group(1))
        except ValueError:
            pass

    # 6. Packages / Weight
    m_pkg = re.search(r"([0-9]+)\s*(?:boxes|pkgs|packages|nag|cartons|bags)", clean_text, re.IGNORECASE)
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

    return entities


async def resolve_consigner(
    db: AsyncSession,
    name: str,
    office_id: Optional[int] = None,
) -> Tuple[Optional[Consigner], List[Consigner]]:
    """Resolves a consigner by name; handles exact match, multiple matches, or none."""
    query = select(Consigner).where(Consigner.is_active == True)
    if office_id:
        query = query.where(or_(Consigner.issuing_office_id == office_id, Consigner.issuing_office_id.is_(None)))
    query = query.where(Consigner.name.ilike(f"%{name}%")).order_by(Consigner.name.asc()).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())

    if len(matches) == 1:
        return matches[0], []
    # Check for exact case-insensitive match among multiple
    for m in matches:
        if m.name.lower().strip() == name.lower().strip():
            return m, []
    return None, matches


async def resolve_consignee(
    db: AsyncSession,
    name: str,
    office_id: Optional[int] = None,
) -> Tuple[Optional[Consignee], List[Consignee]]:
    """Resolves a consignee by name; handles exact match, multiple matches, or none."""
    query = select(Consignee).where(Consignee.is_active == True)
    if office_id:
        query = query.where(or_(Consignee.issuing_office_id == office_id, Consignee.issuing_office_id.is_(None)))
    query = query.where(Consignee.name.ilike(f"%{name}%")).order_by(Consignee.name.asc()).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())

    if len(matches) == 1:
        return matches[0], []
    for m in matches:
        if m.name.lower().strip() == name.lower().strip():
            return m, []
    return None, matches


async def resolve_location(
    db: AsyncSession,
    city: str,
    office_id: Optional[int] = None,
) -> Tuple[Optional[Location], List[Location]]:
    """Resolves an origin or destination Location master."""
    query = select(Location).where(Location.is_active == True)
    if office_id:
        query = query.where(or_(Location.issuing_office_id == office_id, Location.issuing_office_id.is_(None)))
    query = query.where(or_(Location.city_name.ilike(f"%{city}%"), Location.location_code.ilike(f"%{city}%"))).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())
    if len(matches) == 1:
        return matches[0], []
    for m in matches:
        if (m.city_name or "").lower().strip() == city.lower().strip():
            return m, []
    return (matches[0] if matches else None), matches


async def validate_and_update_draft(
    draft: LRDraft,
    db: AsyncSession,
    office_id: Optional[int] = None,
) -> None:
    """
    Validates draft completeness and constructs LRCreate schema test.
    If mandatory fields are satisfied, marks draft as valid and generates confirmation token.
    """
    missing = []
    data = draft.data

    if not data.get("consigner_id"):
        missing.append("Consigner")
    if not data.get("consignee_id"):
        missing.append("Consignee")
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
        # Generate single-use confirmation token valid for 10 minutes
        draft.generate_confirmation_token(ttl_minutes=10)
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
    Core conversational LR draft handler.
    Extracts entities, matches against database, builds draft preview,
    and returns interactive draft card with validation state.
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
        cleared = await lr_draft_store.clear_active_draft(tenant.id, user.id)
        msg = (
            "Aapki active LR draft cancel kar di gayi hai."
            if lang in ("hinglish", "hi_devanagari")
            else "Your active LR draft has been cancelled."
        )
        card = StructuredCard(
            card_type="lr_draft",
            title="LR Draft Discarded",
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
    )

    # 4. Extract entities from user text
    entities = parse_lr_entities_from_text(user_text)

    # Feedback notes to append to reply message
    feedback_notes = []

    # Check for invalid vehicle number
    if "invalid_vehicle" in entities:
        bad_v = entities["invalid_vehicle"]
        feedback_notes.append(
            f"Invalid vehicle number **{bad_v}**. Please provide a valid Indian registration plate (e.g., DL01AA1111)."
        )

    # Handle valid vehicle
    if "vehicle_number" in entities:
        v_num = entities["vehicle_number"]
        draft.update_field("vehicle_number", v_num)
        # Check if company or market vehicle
        stmt_cv = select(CompanyVehicle).where(CompanyVehicle.vehicle_number == v_num)
        res_cv = await db.execute(stmt_cv)
        cv = res_cv.scalar_one_or_none()
        if cv:
            draft.update_field("vehicle_source", "COMPANY")
            if cv.vehicle_type:
                draft.update_field("vehicle_type", cv.vehicle_type)
        else:
            draft.update_field("vehicle_source", "MARKET")

    # Handle consigner
    if "consigner_candidate" in entities:
        cand = entities["consigner_candidate"]
        resolved_c, multiple_c = await resolve_consigner(db, cand, office_id=eff_office_id)
        if resolved_c:
            draft.update_field("consigner_id", resolved_c.id, label=resolved_c.name)
            draft.preview_labels["consigner_name"] = resolved_c.name
        elif multiple_c:
            names = [f"**{m.name}** (Code: {m.code or m.id})" for m in multiple_c[:3]]
            feedback_notes.append(
                f"Multiple consigners match '{cand}': {', '.join(names)}. Please specify exact name."
            )
        else:
            feedback_notes.append(
                f"Consigner '{cand}' was not found in your master directory. Please verify name or add them to Consigner Master."
            )

    # Handle consignee
    if "consignee_candidate" in entities:
        cand = entities["consignee_candidate"]
        resolved_ce, multiple_ce = await resolve_consignee(db, cand, office_id=eff_office_id)
        if resolved_ce:
            draft.update_field("consignee_id", resolved_ce.id, label=resolved_ce.name)
            draft.preview_labels["consignee_name"] = resolved_ce.name
        elif multiple_ce:
            names = [f"**{m.name}** (Code: {m.code or m.id})" for m in multiple_ce[:3]]
            feedback_notes.append(
                f"Multiple consignees match '{cand}': {', '.join(names)}. Please specify exact name."
            )
        else:
            feedback_notes.append(
                f"Consignee '{cand}' was not found in your master directory. Please verify name or add them to Consignee Master."
            )

    # Handle Origin & Destination
    if "origin_candidate" in entities:
        city = entities["origin_candidate"]
        loc_o, _ = await resolve_location(db, city, office_id=eff_office_id)
        if loc_o:
            draft.update_field("origin_location_id", loc_o.id)
            draft.preview_labels["origin_name"] = loc_o.city_name or city.title()
        else:
            draft.preview_labels["origin_name"] = city.title()

    if "destination_candidate" in entities:
        city = entities["destination_candidate"]
        loc_d, _ = await resolve_location(db, city, office_id=eff_office_id)
        if loc_d:
            draft.update_field("destination_location_id", loc_d.id)
            draft.preview_labels["destination_name"] = loc_d.city_name or city.title()
        else:
            draft.preview_labels["destination_name"] = city.title()

    # Handle Financials
    if "freight_amount" in entities:
        draft.update_field("freight_amount", entities["freight_amount"])
    if "advance_amount" in entities:
        draft.update_field("advance_amount", entities["advance_amount"])

    # Handle Packages / Weight
    if "package_count" in entities:
        draft.update_field("package_count", entities["package_count"])
    if "actual_weight_mt" in entities:
        draft.update_field("actual_weight_mt", entities["actual_weight_mt"])
        draft.update_field("chargeable_weight_mt", entities.get("chargeable_weight_mt", entities["actual_weight_mt"]))

    # 5. Validate & Update draft state
    await validate_and_update_draft(draft, db, office_id=eff_office_id)
    await lr_draft_store.save_draft(draft)

    # 6. Build Preview Metrics & Card
    c_name = draft.preview_labels.get("consigner_name") or "Not Specified"
    ce_name = draft.preview_labels.get("consignee_name") or "Not Specified"
    v_name = draft.data.get("vehicle_number") or "Not Specified"
    orig_name = draft.preview_labels.get("origin_name") or "Not Specified"
    dest_name = draft.preview_labels.get("destination_name") or "Not Specified"

    freight_val = float(draft.data.get("freight_amount") or 0.0)
    advance_val = float(draft.data.get("advance_amount") or 0.0)
    balance_val = freight_val - advance_val
    pkgs = int(draft.data.get("package_count") or 0)

    metrics = [
        {"label": "Consigner", "value": c_name},
        {"label": "Consignee", "value": ce_name},
        {"label": "Route", "value": f"{orig_name} → {dest_name}"},
        {"label": "Vehicle", "value": v_name},
        {"label": "Freight Amount", "value": f"₹{freight_val:,.2f}"},
        {"label": "Balance Due", "value": f"₹{balance_val:,.2f}"},
    ]

    items = [
        {
            "primary": f"{orig_name} to {dest_name} ({v_name})",
            "secondary": f"Consigner: {c_name} • Consignee: {ce_name} • Pkgs: {pkgs}",
            "amount": f"₹{freight_val:,.2f}",
            "status": "Ready" if draft.is_valid else "Draft",
        }
    ]

    # 7. Construct User Message & Structured Card
    if draft.is_valid:
        if lang in ("hinglish", "hi_devanagari"):
            base_msg = (
                "Aapki LR draft bilkul taiyar hai! Sabhi zaroori details validate ho chuki hain.\n"
                "Kripya niche preview check karein aur **'Confirm & Create LR'** button par click karke confirm karein."
            )
        else:
            base_msg = (
                "Your LR draft has been prepared and validated! Please review the details below "
                "and click **'Confirm & Create LR'** to finalize the booking."
            )
        badge = {"text": "Ready to Confirm", "variant": "success"}
    else:
        missing_text = ", ".join(draft.missing_fields)
        if lang in ("hinglish", "hi_devanagari"):
            base_msg = (
                f"Main aapki LR create karne mein help karunga. Abhi ye details missing hain: **{missing_text}**.\n"
                "Kripya loading aur delivery location ya party details provide karein."
            )
        else:
            base_msg = (
                f"I am preparing your LR draft. The following required information is still missing: **{missing_text}**.\n"
                "Please provide the loading/delivery location or party details."
            )
        badge = {"text": "Draft: Incomplete", "variant": "warning"}

    if feedback_notes:
        base_msg = f"{base_msg}\n\n*Note:* " + " ".join(feedback_notes)

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
