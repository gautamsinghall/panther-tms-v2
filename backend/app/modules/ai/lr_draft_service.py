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
from app.modules.ai.tools import extract_vehicle_number, is_user_permitted, format_user_office_label
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

    # 2B. Financial / Ledger / Balance queries on a party/driver/account are operational, not instructional
    if any(w in lower for w in ("balance", "ledger", "khata", "hisab", "hisaab", "outstanding", "dues", "payable", "receivable")) and \
       any(p in lower for p in ("driver", "vendor", "client", "customer", "parth", "drv-", "bc-", "vend-", "account", "'s balance", "ka balance", "ki balance")):
        return False

    # 3. Broad Hinglish & Hindi query construction patterns
    if "kaise" in lower and any(v in lower for v in ["kare", "karein", "create", "bana", "add", "karta", "karti", "hota", "hoti", "process"]):
        return True

    inquiry_patterns = [
        "how do i", "how to", "how can i", "how does", "how would i",
        "what is", "what are", "explain", "guide me", "tell me how",
        "steps to", "process to", "process of", "what is the process",
        "procedure", "workflow", "how it works", "purpose of", "use of",
        "what documents", "documents i need", "documents needed", "required documents",
        "kaise banti", "kaise banta", "kaise banate", "kaise banaye", "kaise banayein",
        "kaise karu", "kaise karoon", "kaise kare", "kaise karein", "kaise karte",
        "kaise hota", "kaise hoti", "kaise add", "kaise perform", "kaise use", "kaise create",
        "kya hota", "kya hoti", "kya hai", "use kya hai", "purpose kya hai",
        "fayda kya hai", "matlab kya hai", "kya process", "process kya",
        "sikhao", "sikha do", "sikhaoge", "batao kaise",
        "कैसे", "क्या है", "क्या होता", "प्रक्रिया", "सिखाओ", "सिखाइए", "समझाइए", "मार्गदर्शन",
    ]
    return any(p in lower for p in inquiry_patterns)


COMMON_STOP_WORDS = {
    "and", "details", "load", "loading", "truck", "vehicle", "the", "is", "for",
    "or", "yes", "no", "ok", "sure", "hi", "hello", "hey", "from", "to", "with",
    "all", "draft", "cancel", "bilty", "lr", "gr", "order", "job", "please", "pls",
    "karo", "karna", "karni", "banao", "booking", "shipment", "transport", "status",
    "new", "start", "stop", "create", "creat", "book", "bok", "make", "mak", "info",
    "information", "help", "guide", "process", "kaise", "kya", "kab", "kahan", "kaun"
}

INVALID_LOCATION_WORDS = {
    "today", "tomorrow", "yesterday", "day", "morrow", "aaj", "kal", "parso",
    "hindi", "english", "devanagari", "language", "bhasha",
    "boss", "manager", "sir", "madam", "colleague", "lead",
    "flight", "flights", "airline", "airlines", "airplane", "aeroplane", "airways", "plane", "airport",
    "share", "shares", "price", "prices", "stock", "stocks", "market", "sensex", "nifty", "reliance",
    "python", "function", "functions", "code", "script", "sort", "sorting",
    "weather", "forecast", "mausam", "rain", "temperature", "climate", "barish",
    "email", "mail", "leave", "application", "letter",
    "good morning", "morning", "evening", "afternoon", "night",
}


def is_valid_location_name(name: str) -> bool:
    """
    Validates that a string is a plausible origin or destination location.
    Explicitly rejects temporal words, languages, roles, flights, stocks, coding, weather, etc.
    """
    if not name or not isinstance(name, str):
        return False
    clean = strip_field_label(name, "origin").strip()
    clean = strip_field_label(clean, "destination").strip()
    lower = clean.lower()
    if len(clean) < 3 or len(clean) > 50:
        return False
    if not re.search(r"[A-Za-z]", clean):
        return False
    if "?" in clean:
        return False
    tokens = [w for w in re.split(r"[\s,.-]+", lower) if w]
    if not tokens:
        return False
    if any(t in INVALID_LOCATION_WORDS for t in tokens):
        return False
    if all(t in COMMON_STOP_WORDS for t in tokens):
        return False
    if lower in INVALID_LOCATION_WORDS:
        return False
    return is_valid_party_name(clean)


def is_valid_indian_vehicle(v: str) -> bool:
    """Validates that a string matches standard Indian vehicle registration patterns."""
    if not v or not isinstance(v, str):
        return False
    cleaned = re.sub(r"[^A-Za-z0-9]", "", v).upper()
    if any(cleaned.startswith(pfx) for pfx in ("LR", "GR", "HC", "INV", "JOB", "PV", "RV", "CV", "JV", "EWB")):
        return False
    return bool(re.match(r"^[A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4}$", cleaned))


GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def validate_indian_gstin(gstin: str) -> Tuple[bool, Optional[str]]:
    """
    Validates standard Indian 15-character GSTIN format and Luhn-based checksum.
    Returns (True, None) if valid, or (False, error_reason) if invalid.
    """
    if not gstin or not isinstance(gstin, str):
        return False, "GSTIN is missing."
    clean = re.sub(r"[^A-Za-z0-9]", "", gstin).upper()
    if len(clean) != 15:
        return False, f"Invalid GSTIN length ({len(clean)} characters). GSTIN must be exactly 15 characters (e.g., 07AAAAA0000A1Z4)."
    if not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", clean):
        return False, f"Invalid GSTIN format '{clean}'. Must follow standard 15-character GST structure."
    factor = 1
    total = 0
    for c in clean[:14]:
        val = GSTIN_CHARS.index(c)
        prod = val * factor
        total += (prod // 36) + (prod % 36)
        factor = 2 if factor == 1 else 1
    rem = total % 36
    check = (36 - rem) % 36
    expected_char = GSTIN_CHARS[check]
    if clean[14] != expected_char:
        return False, f"Invalid GSTIN checksum for '{clean}'. Check digit '{clean[14]}' does not match expected '{expected_char}'."
    return True, None


def validate_indian_pincode(pincode: str) -> Tuple[bool, Optional[str]]:
    """Validates standard 6-digit Indian postal pincode."""
    if not pincode or not isinstance(pincode, str):
        return False, "Pincode is missing."
    clean = re.sub(r"[^0-9]", "", str(pincode))
    if not re.match(r"^[1-9][0-9]{5}$", clean):
        return False, f"Invalid pincode '{pincode}'. Indian postal pincodes must be exactly 6 digits (e.g., 110001)."
    return True, None


def validate_eway_bill_number(ewb: str) -> Tuple[bool, Optional[str]]:
    """Validates 12-digit Indian E-Way Bill number."""
    if not ewb or not isinstance(ewb, str):
        return False, "E-Way Bill number is missing."
    clean = re.sub(r"[^0-9]", "", str(ewb))
    if len(clean) != 12:
        return False, f"Invalid E-Way Bill number '{ewb}'. E-Way Bill numbers must be exactly 12 digits."
    return True, None


def strip_field_label(val: str, field_type: Optional[str] = None) -> str:
    """
    Strips field label words, prefixes, and noise from extracted field values.
    Ensures values like 'Destination Mumbai', 'Destination: Mumbai', 'To Mumbai'
    and 'Mumbai' all store 'Mumbai' only, with no label noise.
    """
    if not val or not isinstance(val, str):
        return ""
    clean = val.strip().strip(" ,;:\'\"-=")
    if not clean:
        return ""

    label_patterns = {
        "destination": r"^(?:the\s+)?(?:destination(?:\s+(?:location|city|point))?|delivery(?:\s+(?:location|city|point))?|\bto\b(?:\s+(?:location|city|point))?|dest(?:\s+(?:location|city|point))?)\s*(?:is\s+|at\s+|:\s*|=\s*|[-]\s*)?",
        "origin": r"^(?:the\s+)?(?:origin(?:\s+(?:location|city|point))?|loading(?:\s+(?:location|city|point))?|from(?:\s+(?:location|city|point))?|source(?:\s+(?:location|city|point))?)\s*(?:is\s+|at\s+|:\s*|=\s*|[-]\s*)?",
        "consigner": r"^(?:the\s+)?(?:consigner|consignor|shipper|sender|from\s+party|bhejne\s*wala|client|customer)\s*(?:is\s+|:\s*|=\s*|[-]\s*)?",
        "consignee": r"^(?:the\s+)?(?:consignee|receiver|to\s+party|panewala|delivery\s+party|client|customer)\s*(?:is\s+|:\s*|=\s*|[-]\s*)?",
        "vehicle": r"^(?:the\s+)?(?:vehicle(?:\s*(?:number|no\.?))?|truck(?:\s*(?:number|no\.?))?|gaadi(?:\s*(?:number|no\.?))?|lorry(?:\s*(?:number|no\.?))?)\s*(?:is\s+|:\s*|=\s*|[-]\s*)?",
        "goods": r"^(?:the\s+)?(?:goods(?:\s*(?:name|type|description))?|cargo(?:\s*(?:name|type|description))?|material(?:\s*(?:name|type|description))?|particulars)\s*(?:is\s+|:\s*|=\s*|[-]\s*)?",
        "freight": r"^(?:the\s+)?(?:freight(?:\s*(?:amount|rate))?|bhada|rate|charges?|amount)\s*(?:is\s+|of\s+|:\s*|=\s*|[-]\s*)?",
        "advance": r"^(?:the\s+)?(?:advance(?:\s*amount)?|peshgi)\s*(?:is\s+|of\s+|:\s*|=\s*|[-]\s*)?",
        "weight": r"^(?:the\s+)?(?:weight|wgt|actual\s+weight)\s*(?:is\s+|of\s+|:\s*|=\s*|[-]\s*)?",
    }

    if field_type and field_type in label_patterns:
        clean = re.sub(label_patterns[field_type], "", clean, flags=re.IGNORECASE).strip().strip(" ,;:\'\"-=")

    generic_prefix = (
        r"^(?:the\s+)?(?:destination|delivery|origin|loading|consigner|consignor|consignee|sender|receiver|"
        r"party|client|customer|vehicle|truck|goods|cargo|material|particulars|freight|advance|weight)\s*(?:is\s+|at\s+|to\s+|from\s+|:\s*|=\s*|[-]\s*)?"
    )
    subbed = re.sub(generic_prefix, "", clean, flags=re.IGNORECASE).strip().strip(" ,;:\'\"-=")
    if subbed:
        clean = subbed

    # Strip any dangling leading copula or preposition like 'is ', 'the ', 'at ', 'to ', 'from '
    clean = re.sub(r"^(?:is\s+|are\s+|was\s+|at\s+|of\s+|the\s+|to\s+|from\s+)+", "", clean, flags=re.IGNORECASE).strip().strip(" ,;:\'\"-=")

    return clean


def clean_party_name(name: str) -> str:
    """Strips conversational noise and prefixes from extracted party names."""
    if not name or not isinstance(name, str):
        return ""
    clean = name.strip()
    clean = strip_field_label(clean)
    return clean


def is_valid_party_name(name: str) -> bool:
    """Validates that a string is a plausible person or company name."""
    if not name or not isinstance(name, str):
        return False
    clean = strip_field_label(name)
    lower = clean.lower()
    if len(clean) < 3 or len(clean) > 100:
        return False
    if not re.search(r"[A-Za-z]", clean):
        return False
    if "?" in clean:
        return False
    question_starters = ("what", "how", "why", "who", "where", "when", "which", "can you", "could you", "tell me", "kya", "kaise", "kahan", "kaun", "kisko", "kiska")
    if any(lower.startswith(q) or f" {q} " in lower for q in question_starters):
        return False
    words = [w for w in re.split(r"[\s,.-]+", lower) if w]
    if len(words) == 1 and (words[0] in COMMON_STOP_WORDS or words[0] in INVALID_LOCATION_WORDS):
        return False
    if any(w in INVALID_LOCATION_WORDS for w in words):
        return False
    if all(w in COMMON_STOP_WORDS for w in words):
        return False
    return True


def is_grounded_in_text(extracted_val: str, text: str) -> bool:
    """Verifies that the extracted value was actually mentioned by the user and not hallucinated."""
    clean_val = extracted_val.strip().lower()
    text_lower = text.strip().lower()
    if clean_val in text_lower:
        return True
    words = [w for w in re.split(r"[\s,.-]+", clean_val) if len(w) > 2]
    if words and any(w in text_lower for w in words):
        return True
    return False


def is_lr_booking_intent(text: str) -> bool:
    """Detects active intent to create, book, or update an LR / Bilty draft."""
    lower = text.strip().lower()
    if is_instructional_inquiry(text):
        return False
    if "delete" in lower or "remove" in lower:
        return False
    if lower in ("hi", "hello", "hey", "namaste", "what can you do", "help"):
        return False

    booking_triggers = [
        "book lr", "create lr", "new lr", "lr booking", "make an lr",
        "book an lr", "create an lr", "lr banani hai", "lr book karni hai",
        "ek lr banao", "ek lr create karo", "lr bana do", "bana do lr",
        "lr banana hai", "lr banana", "ek lr banana hai", "ek lr banani hai",
        "bilty banani hai", "bilty banao", "bilty create karo", "bilty book",
        "bilty banana hai", "bilty banana", "ek bilty banana hai",
        "create bilty", "book bilty", "new bilty", "start lr booking",
        "start lr draft", "consigner is", "consignee is", "delivery to",
        "loading at", "freight is", "book consignment", "create consignment",
        "consignment note", "book shipment", "book a shipment", "create shipment",
        "lorry receipt", "book lorry receipt", "issue lr", "issue bilty",
        "transport book", "reserve truck",
        # Typo-tolerant booking phrases:
        "creat lr pls", "creat lr please", "creat lr", "creat lr plz",
        "create lr pls", "create lr please", "bok lr", "boke lr", "mak lr",
        "craete lr", "craet lr", "creat bilty", "bok bilty", "book lr pls",
        "creat gr", "creat gr pls", "bok gr", "book gr", "bilty book", "lr book",
    ]
    if any(t in lower for t in booking_triggers):
        return True

    booking_patterns = [
        r"\b(book|create|creat|bok|boke|make|mak|craete|start|new|raise|issue|banana|banao)\b.*\b(lr|gr|bilty|shipment|consignment|lorry receipt)\b",
        r"\b(lr|gr|bilty|shipment|consignment|lorry receipt)\b.*\b(book|create|creat|bok|boke|banao|banani|banana|generate|start|karni|karna)\b",
    ]
    return any(bool(re.search(p, lower)) for p in booking_patterns)


def is_cancel_intent(text: str) -> bool:
    """Detects intent to cancel/discard current draft session."""
    lower = text.strip().lower()
    # HARD RULE 0: Record deletion requests are handled by rule 0, not draft cancel!
    if "delete" in lower or "remove" in lower:
        return False
    cancel_triggers = [
        "cancel draft", "clear draft", "discard draft", "draft cancel", "cancel lr draft",
        "cancel lr", "cancel booking", "cancel", "clear", "discard", "abort draft", "abort",
        "reset draft", "radd karo", "hatao draft", "stop draft", "stop booking", "cancel it",
    ]
    return any(t == lower or f" {t} " in f" {lower} " for t in cancel_triggers)


def parse_lr_entities_from_text(text: str, current_draft: Optional[AIDraft] = None) -> Dict[str, Any]:
    """
    Extracts candidate entities from conversational user text.
    Handles:
    - In-chat single-field edits ('change vehicle to DL01AA1111', 'change destination to Mumbai', 'change weight to 5000 kg')
    - All-in-one comprehensive sentences
    - Step-by-step single-field answers (context-aware of what is currently missing)
    - Validations for Indian vehicle, GSTIN, pincode, E-Way Bill
    """
    entities: Dict[str, Any] = {}
    clean_text = text.strip()

    # 0. In-Chat Single-Field Edit Command ('change X to Y', 'update X to Y', 'set X as Y')
    m_edit = re.search(
        r"\b(?:change|update|set|modify|correct)\s+(?:the\s+)?(vehicle(?:\s*number)?|truck(?:\s*number)?|destination(?:\s*location)?|delivery(?:\s*location)?|origin(?:\s*location)?|loading(?:\s*location)?|from|to|consigner(?:\s*name)?|consignor(?:\s*name)?|sender(?:\s*name)?|consignee(?:\s*name)?|receiver(?:\s*name)?|delivery\s*party(?:\s*name)?|weight|goods|cargo|material|particulars|freight(?:\s*amount)?|rate|bhada|advance(?:\s*amount)?|eway(?:\s*bill)?|ewb|gstin|pincode)\s+(?:to|as|is|=)\s*(.+)$",
        clean_text,
        re.IGNORECASE,
    )
    if m_edit:
        target_field = m_edit.group(1).lower().replace(" ", "")
        target_val = m_edit.group(2).strip().strip(" ,;.")
        entities["is_single_edit"] = True
        entities["edited_field_name"] = target_field

        if target_field in ("vehicle", "vehiclenumber", "truck", "trucknumber"):
            clean_v = strip_field_label(target_val, "vehicle")
            if is_valid_indian_vehicle(clean_v):
                entities["vehicle_number"] = re.sub(r"[^A-Za-z0-9]", "", clean_v).upper()
            else:
                entities["invalid_vehicle"] = clean_v
            return entities

        elif target_field in ("destination", "destinationlocation", "delivery", "deliverylocation", "to"):
            clean_d = strip_field_label(target_val, "destination")
            if is_valid_location_name(clean_d):
                entities["destination_candidate"] = clean_d
            return entities

        elif target_field in ("origin", "originlocation", "loading", "loadinglocation", "from"):
            clean_o = strip_field_label(target_val, "origin")
            if is_valid_location_name(clean_o):
                entities["origin_candidate"] = clean_o
            return entities

        elif target_field in ("consigner", "consignor", "consignername", "consignorname", "sender", "sendername"):
            clean_c = strip_field_label(target_val, "consigner")
            if is_valid_party_name(clean_c):
                entities["consigner_candidate"] = clean_c
            return entities

        elif target_field in ("consignee", "consigneename", "receiver", "receivername", "deliveryparty", "deliverypartyname"):
            clean_ce = strip_field_label(target_val, "consignee")
            if is_valid_party_name(clean_ce):
                entities["consignee_candidate"] = clean_ce
            return entities

        elif target_field in ("weight",):
            clean_w = strip_field_label(target_val, "weight")
            try:
                num_val = float(re.sub(r"[^0-9.]", "", clean_w))
                if "kg" in clean_w.lower() or num_val > 100:
                    entities["actual_weight_mt"] = round(num_val / 1000.0, 3) if num_val > 100 else num_val
                else:
                    entities["actual_weight_mt"] = num_val
                entities["chargeable_weight_mt"] = entities["actual_weight_mt"]
            except Exception:
                pass
            return entities

        elif target_field in ("freight", "rate", "bhada"):
            clean_f = strip_field_label(target_val, "freight")
            try:
                num_str = re.sub(r"[^0-9.kK]", "", clean_f).lower()
                val = float(num_str.replace("k", "")) * (1000.0 if "k" in num_str else 1.0)
                entities["freight_amount"] = val
            except Exception:
                pass
            return entities

        elif target_field in ("advance",):
            clean_a = strip_field_label(target_val, "advance")
            try:
                num_str = re.sub(r"[^0-9.kK]", "", clean_a).lower()
                val = float(num_str.replace("k", "")) * (1000.0 if "k" in num_str else 1.0)
                entities["advance_amount"] = val
            except Exception:
                pass
            return entities

        elif target_field in ("goods", "cargo", "material", "particulars"):
            entities["particulars"] = strip_field_label(target_val, "goods")
            return entities

        elif target_field in ("ewaybill", "ewb"):
            clean_ewb = strip_field_label(target_val)
            is_ewb_ok, _ = validate_eway_bill_number(clean_ewb)
            if is_ewb_ok:
                entities["eway_bill_number"] = re.sub(r"[^0-9]", "", clean_ewb)
            else:
                entities["invalid_ewb"] = clean_ewb
            return entities

        elif target_field in ("gstin",):
            clean_gst = strip_field_label(target_val).upper()
            is_gst_ok, _ = validate_indian_gstin(clean_gst)
            if is_gst_ok:
                entities["gstin_candidate"] = clean_gst
            else:
                entities["invalid_gstin"] = clean_gst
            return entities

        elif target_field in ("pincode",):
            clean_pin = strip_field_label(target_val)
            is_pin_ok, _ = validate_indian_pincode(clean_pin)
            if is_pin_ok:
                entities["pincode_candidate"] = clean_pin
            else:
                entities["invalid_pincode"] = clean_pin
            return entities

    # Delimited segment parsing for multi-field messages (comma, semicolon, newline)
    # Pre-process thousands separators in numbers (e.g. 1,500.00 -> 1500.00)
    norm_text = re.sub(r"(\d),(\d)", r"\1\2", clean_text)
    if re.search(r"[,;\n]", norm_text):
        segments = [p.strip() for p in re.split(r"[,;\n]+", norm_text) if p.strip()]
        for seg in segments:
            # Consigner
            m_c = re.match(r"^(?:the\s+)?(?:consigner|consignor|shipper|sender|from\s+party|bhejne\s*wala)\b\s*(?:is\s+|:\s*|=\s*|[-]\s*)?(.*)$", seg, re.I)
            if m_c and "consigner_candidate" not in entities:
                c_cand = strip_field_label(m_c.group(1), "consigner")
                if is_valid_party_name(c_cand):
                    entities["consigner_candidate"] = c_cand
                continue
            # Consignee
            m_ce = re.match(r"^(?:the\s+)?(?:consignee|receiver|to\s+party|panewala|delivery\s+party)\b\s*(?:is\s+|:\s*|=\s*|[-]\s*)?(.*)$", seg, re.I)
            if m_ce and "consignee_candidate" not in entities:
                ce_cand = strip_field_label(m_ce.group(1), "consignee")
                if is_valid_party_name(ce_cand):
                    entities["consignee_candidate"] = ce_cand
                continue
            # Origin
            m_o = re.match(r"^(?:the\s+)?(?:origin|source|loading(?:\s+(?:location|city))?|from(?:\s+(?:location|city))?)\b\s*(?:is\s+|at\s+|:\s*|=\s*|[-]\s*)?(.*)$", seg, re.I)
            if m_o and "origin_candidate" not in entities:
                o_cand = strip_field_label(m_o.group(1), "origin")
                if is_valid_location_name(o_cand):
                    entities["origin_candidate"] = o_cand
                continue
            # Destination
            m_d = re.match(r"^(?:the\s+)?(?:destination|dest|delivery(?:\s+(?:location|city))?|to(?:\s+(?:location|city))?)\b\s*(?:is\s+|at\s+|:\s*|=\s*|[-]\s*)?(.*)$", seg, re.I)
            if m_d and "destination_candidate" not in entities:
                d_cand = strip_field_label(m_d.group(1), "destination")
                if is_valid_location_name(d_cand):
                    entities["destination_candidate"] = d_cand
                continue
            # Goods
            m_g = re.match(r"^(?:the\s+)?(?:goods|cargo|material|particulars)\b\s*(?:is\s+|:\s*|=\s*|[-]\s*)?(.*)$", seg, re.I)
            if m_g and "particulars" not in entities:
                g_cand = strip_field_label(m_g.group(1), "goods")
                if g_cand:
                    entities["particulars"] = g_cand
                continue
            # Vehicle
            m_v = re.match(r"^(?:the\s+)?(?:vehicle(?:\s*(?:number|no\.?))?|truck(?:\s*(?:number|no\.?))?|gaadi|lorry)\b\s*(?:is\s+|:\s*|=\s*|[-]\s*)?(.*)$", seg, re.I)
            if m_v and "vehicle_number" not in entities:
                v_cand = strip_field_label(m_v.group(1), "vehicle")
                if is_valid_indian_vehicle(v_cand):
                    entities["vehicle_number"] = re.sub(r"[^A-Za-z0-9]", "", v_cand).upper()
                else:
                    entities["invalid_vehicle"] = v_cand
                continue
            # Freight
            m_f = re.match(r"^(?:the\s+)?(?:freight(?:\s*(?:amount|rate))?|bhada|rate)\b\s*[:=]?\s*(?:₹\s*|rs\.?\s*)?([0-9]+(?:\.[0-9]+)?k?)$", seg, re.I)
            if m_f and "freight_amount" not in entities:
                try:
                    val_str = m_f.group(1).lower()
                    entities["freight_amount"] = float(val_str.replace("k", "")) * (1000.0 if "k" in val_str else 1.0)
                except Exception:
                    pass
                continue
            # Weight
            m_w = re.match(r"^(?:the\s+)?(?:weight|wgt)\b\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|kgs|mt|tons?|tonnes?)?$", seg, re.I)
            if m_w and "actual_weight_mt" not in entities:
                try:
                    w_num = float(m_w.group(1))
                    unit = (m_w.group(2) or "").lower()
                    if "kg" in unit or (not unit and w_num > 100):
                        entities["actual_weight_mt"] = round(w_num / 1000.0, 3)
                    else:
                        entities["actual_weight_mt"] = w_num
                    entities["chargeable_weight_mt"] = entities["actual_weight_mt"]
                except Exception:
                    pass
                continue

    # Lookahead pattern for boundary detection across unsegmented text
    LOOKAHEAD = (
        r"(?=[,;\n]+|\s+(?:and\s+)?(?:consigner|consignor|shipper|sender|from\s+party|bhejne\s*wala|"
        r"consignee|receiver|to\s+party|delivery\s+party|panewala|"
        r"origin|source|loading|from|"
        r"destination|dest|delivery|to|"
        r"vehicle|truck|gaadi|lorry|"
        r"goods|cargo|material|particulars|"
        r"weight|wgt|boxes|pkgs|packages|cartons|"
        r"freight|bhada|rate|charges?|advance|peshgi|"
        r"eway|ewb|gstin|pincode)\b|$)"
    )

    # 1. Vehicle Number
    if "vehicle_number" not in entities:
        extracted_v = extract_vehicle_number(clean_text)
        if extracted_v and is_valid_indian_vehicle(extracted_v):
            entities["vehicle_number"] = extracted_v
        else:
            m_v_strict = re.search(r"\b(?!(?:LR|GR|HC|INV|JOB|PV|RV|CV|JV|EWB))([A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4})\b", clean_text, re.IGNORECASE)
            if m_v_strict and is_valid_indian_vehicle(m_v_strict.group(1)):
                entities["vehicle_number"] = m_v_strict.group(1).upper()
            else:
                m_v_explicit = re.search(r"\b(?:vehicle|truck|gaadi|lorry)\s*(?:is|number|no\.?|:|=)?\s*([A-Za-z0-9\-]+)\b", clean_text, re.IGNORECASE)
                if m_v_explicit:
                    v_cand = strip_field_label(m_v_explicit.group(1), "vehicle")
                    if not is_valid_indian_vehicle(v_cand) and v_cand.lower() not in {"is", "number", "loading", "details", "for", "with"}:
                        entities["invalid_vehicle"] = v_cand

    # 2. Route Locations (From / To)
    has_flight = bool(re.search(r"\b(flight|flights|airline|airlines|airplane|aeroplane|airport)\b", clean_text, re.I))
    if not has_flight and ("origin_candidate" not in entities or "destination_candidate" not in entities):
        m_route = re.search(r"\bfrom\s+([A-Za-z\s]+?)\s+\bto\b\s+([A-Za-z\s]+?)" + LOOKAHEAD, clean_text, re.IGNORECASE)
        if m_route:
            cand_o = strip_field_label(m_route.group(1), "origin")
            cand_d = strip_field_label(m_route.group(2), "destination")
            if is_valid_location_name(cand_o) and is_valid_location_name(cand_d):
                entities.setdefault("origin_candidate", cand_o)
                entities.setdefault("destination_candidate", cand_d)
        else:
            common_words = {
                "party", "consigner", "consignee", "vehicle", "freight", "advance", "bilty", "order",
                "name", "test", "change", "update", "set", "modify", "correct", "sender", "receiver",
                "weight", "rate", "goods", "cargo", "bill", "invoice", "number", "date", "status"
            } | INVALID_LOCATION_WORDS
            if not re.match(r"^(?:change|update|set|modify|correct)\b", clean_text, re.I):
                m_dash_route = re.search(r"\b([A-Za-z]{3,20})\s*(?:\bto\b|-|➔|->)\s*([A-Za-z]{3,20})\b", clean_text, re.IGNORECASE)
                if m_dash_route and m_dash_route.group(1).lower() not in common_words and m_dash_route.group(2).lower() not in common_words:
                    cand_o = strip_field_label(m_dash_route.group(1), "origin")
                    cand_d = strip_field_label(m_dash_route.group(2), "destination")
                    if is_valid_location_name(cand_o) and is_valid_location_name(cand_d):
                        entities.setdefault("origin_candidate", cand_o)
                        entities.setdefault("destination_candidate", cand_d)

            m_from = re.search(r"\b(?:loading|origin|source|from)\s+(?:at\s+|is\s+|:\s*)?([A-Za-z\s]+?)" + LOOKAHEAD, clean_text, re.IGNORECASE)
            if m_from and "origin_candidate" not in entities:
                cand_o = strip_field_label(m_from.group(1), "origin")
                if is_valid_location_name(cand_o):
                    entities["origin_candidate"] = cand_o

            m_to = re.search(r"\b(?:delivery|destination|dest|\bto\b)\s+(?:at\s+|is\s+|:\s*)?([A-Za-z\s]+?)" + LOOKAHEAD, clean_text, re.IGNORECASE)
            if m_to and "destination_candidate" not in entities:
                cand_d = strip_field_label(m_to.group(1), "destination")
                if is_valid_location_name(cand_d):
                    entities["destination_candidate"] = cand_d

    # 3. Explicit Consigner & Consignee
    if "consigner_candidate" not in entities:
        m_consigner = re.search(
            r"\b(?:consigner|shipper|sender|from party|bhejne wala)\s+(?:is\s+|:\s*|=)?\s*([A-Za-z0-9\s&.-]+?)" + LOOKAHEAD,
            clean_text,
            re.IGNORECASE,
        )
        if m_consigner:
            cand = strip_field_label(m_consigner.group(1), "consigner")
            if is_valid_party_name(cand):
                entities["consigner_candidate"] = cand

    if "consignee_candidate" not in entities:
        m_consignee = re.search(
            r"\b(?:consignee|receiver|to party|panewala|delivery party)\s+(?:is\s+|:\s*|=)?\s*([A-Za-z0-9\s&.-]+?)" + LOOKAHEAD,
            clean_text,
            re.IGNORECASE,
        )
        if m_consignee:
            cand = strip_field_label(m_consignee.group(1), "consignee")
            if is_valid_party_name(cand):
                entities["consignee_candidate"] = cand

    # Compound Party Pattern: "for <Consignee> from <Consigner>" or "<Consigner> to <Consignee>"
    if "consigner_candidate" not in entities and "consignee_candidate" not in entities:
        m_for_from = re.search(r"\bfor\s+([A-Za-z0-9\s&.-]+?)\s+from\s+([A-Za-z0-9\s&.-]+?)(?=[,;\s]+(?:vehicle|truck|freight|rate)|$)", clean_text, re.IGNORECASE)
        if m_for_from:
            ce_cand = strip_field_label(m_for_from.group(1), "consignee")
            cr_cand = strip_field_label(m_for_from.group(2), "consigner")
            if is_valid_party_name(ce_cand) and is_valid_party_name(cr_cand):
                entities["consignee_candidate"] = ce_cand
                entities["consigner_candidate"] = cr_cand

    # 4. Financial Amounts (Freight / Advance)
    if "freight_amount" not in entities:
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

    if "advance_amount" not in entities:
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

    # 5. Goods Value / Declared Value
    if "goods_value" not in entities:
        m_val = re.search(r"(?:goods\s+value|consignment\s+value|value\s+of\s+goods|declared\s+value|cargo\s+value|goods\s+val|value\s*(?:is|:|=))\s*(?:₹\s*|rs\.?\s*)?([0-9]+(?:\.[0-9]{1,2})?k?)", clean_text, re.IGNORECASE)
        if m_val:
            val_str = m_val.group(1).lower()
            try:
                if "k" in val_str:
                    entities["goods_value"] = float(val_str.replace("k", "")) * 1000.0
                else:
                    entities["goods_value"] = float(val_str)
            except ValueError:
                pass

    # 6. E-Way Bill Number
    if "eway_bill_number" not in entities:
        m_ewb = re.search(r"(?:eway\s*bill|eway|ewb)(?:\s*(?:no\.?|number|#))?\s*[:=]?\s*([0-9A-Za-z]+)", clean_text, re.IGNORECASE)
        if m_ewb:
            ewb_cand = strip_field_label(m_ewb.group(1))
            is_ewb_ok, _ = validate_eway_bill_number(ewb_cand)
            if is_ewb_ok:
                entities["eway_bill_number"] = re.sub(r"[^0-9]", "", ewb_cand)
            else:
                entities["invalid_ewb"] = ewb_cand

    # 7. GSTIN
    if "gstin_candidate" not in entities:
        m_gst = re.search(r"\b(?:gstin|gst\s*(?:no\.?|number)?)\s*[:=]?\s*([0-9A-Za-z]{15})\b", clean_text, re.IGNORECASE)
        if m_gst:
            gst_cand = strip_field_label(m_gst.group(1)).upper()
            is_gst_ok, _ = validate_indian_gstin(gst_cand)
            if is_gst_ok:
                entities["gstin_candidate"] = gst_cand
            else:
                entities["invalid_gstin"] = gst_cand

    # 8. Pincode
    if "pincode_candidate" not in entities:
        m_pin = re.search(r"\b(?:pincode|pin\s*(?:code)?|postal\s*code)\s*[:=]?\s*([0-9]+)\b", clean_text, re.IGNORECASE)
        if m_pin:
            pin_cand = strip_field_label(m_pin.group(1))
            is_pin_ok, _ = validate_indian_pincode(pin_cand)
            if is_pin_ok:
                entities["pincode_candidate"] = pin_cand
            else:
                entities["invalid_pincode"] = pin_cand

    # 9. Packages & Weight
    if "package_count" not in entities:
        m_pkg = re.search(r"([0-9]+)\s*(?:box(?:es)?|pkgs?|packages?|nag|cartons?|bags?|cases?|parcels?)", clean_text, re.IGNORECASE)
        if m_pkg:
            try:
                entities["package_count"] = int(m_pkg.group(1))
            except ValueError:
                pass

    if "actual_weight_mt" not in entities:
        m_weight_kg = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:kg|kgs|kilo|kilograms)", clean_text, re.IGNORECASE)
        if m_weight_kg:
            try:
                kg_val = float(m_weight_kg.group(1))
                entities["actual_weight_mt"] = round(kg_val / 1000.0, 3)
                entities["chargeable_weight_mt"] = round(kg_val / 1000.0, 3)
            except ValueError:
                pass
        else:
            m_weight = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:tons|ton|mt|tonnes)", clean_text, re.IGNORECASE)
            if m_weight:
                try:
                    entities["actual_weight_mt"] = float(m_weight.group(1))
                    entities["chargeable_weight_mt"] = float(m_weight.group(1))
                except ValueError:
                    pass

    # 10. Particulars / Cargo description
    if "particulars" not in entities:
        m_cargo = re.search(r"\b(?:cargo|material|goods|particulars)\s*(?:is|:|=)?\s*([A-Za-z0-9\s&.-]+?)" + LOOKAHEAD, clean_text, re.IGNORECASE)
        if m_cargo:
            cand_g = strip_field_label(m_cargo.group(1), "goods")
            if cand_g:
                entities["particulars"] = cand_g

    # Default package count to 1 if weight is present and packages were not mentioned
    if entities.get("actual_weight_mt") and "package_count" not in entities:
        entities["package_count"] = 1

    # 11. Contextual Step-by-Step Mapping (if user answered a specific follow-up)
    if current_draft:
        missing = current_draft.missing_fields or []
        draft_data = current_draft.data or {}

        # If vehicle was missing and user provided a standalone candidate
        if any("Vehicle" in m for m in missing) and not entities.get("vehicle_number") and not entities.get("invalid_vehicle"):
            tokens = clean_text.split()
            if len(tokens) == 1 or (len(tokens) <= 3 and any(w in clean_text.lower() for w in ("vehicle", "truck", "is"))):
                cand = strip_field_label(tokens[-1], "vehicle").upper()
                if is_valid_indian_vehicle(cand):
                    entities["vehicle_number"] = cand
                elif cand not in COMMON_STOP_WORDS and len(cand) >= 3:
                    entities["invalid_vehicle"] = cand

        # If GSTIN was missing or entered standalone
        if any("GSTIN" in m for m in missing) or "gstin" in clean_text.lower():
            m_bare_gst = re.search(r"\b([0-9]{2}[A-Za-z0-9]{13})\b", clean_text)
            if m_bare_gst and "invalid_gstin" not in entities and "gstin_candidate" not in entities:
                cand_g = strip_field_label(m_bare_gst.group(1)).upper()
                is_g_ok, _ = validate_indian_gstin(cand_g)
                if is_g_ok:
                    entities["gstin_candidate"] = cand_g
                else:
                    entities["invalid_gstin"] = cand_g

        # If Pincode was missing or entered standalone
        if any("Pincode" in m for m in missing) or "pincode" in clean_text.lower() or "pin" in clean_text.lower():
            m_bare_pin = re.search(r"\b([0-9]{1,8})\b", clean_text)
            if m_bare_pin and "invalid_pincode" not in entities and "pincode_candidate" not in entities:
                cand_p = strip_field_label(m_bare_pin.group(1))
                is_p_ok, _ = validate_indian_pincode(cand_p)
                if is_p_ok:
                    entities["pincode_candidate"] = cand_p
                else:
                    entities["invalid_pincode"] = cand_p

        # If E-Way Bill was missing and user enters 12 digits or candidate
        if any("E-Way Bill" in m for m in missing) and "eway_bill_number" not in entities:
            m_bare_ewb = re.search(r"\b([0-9]{10,14})\b", clean_text)
            if m_bare_ewb:
                cand_e = strip_field_label(m_bare_ewb.group(1))
                is_e_ok, _ = validate_eway_bill_number(cand_e)
                if is_e_ok:
                    entities["eway_bill_number"] = cand_e
                else:
                    entities["invalid_ewb"] = cand_e

        # If weight is missing and user gave a number
        if any("Weight" in m for m in missing) and not draft_data.get("actual_weight_mt") and "actual_weight_mt" not in entities:
            m_num_wt = re.search(r"^([0-9]+(?:\.[0-9]+)?)\s*(?:kg|kgs|mt|tons)?$", clean_text, re.IGNORECASE)
            if m_num_wt:
                try:
                    val = float(m_num_wt.group(1))
                    if "kg" in clean_text.lower() or val > 100:
                        entities["actual_weight_mt"] = round(val / 1000.0, 3) if val > 100 else val
                    else:
                        entities["actual_weight_mt"] = val
                    entities["chargeable_weight_mt"] = entities["actual_weight_mt"]
                except ValueError:
                    pass

        # If user typed a standalone party name without keywords
        is_bare_name = (
            len(clean_text.split()) <= 6
            and is_valid_party_name(clean_text)
            and not any(k in clean_text.lower() for k in ("freight", "advance", "boxes", "tons", "value", "eway"))
            and not re.search(r"^[0-9]+", clean_text)
            and not extract_vehicle_number(clean_text)
        )

        if is_bare_name:
            if any("Consigner" in m for m in missing) and not draft_data.get("consigner_id") and "consigner_candidate" not in entities:
                entities["consigner_candidate"] = strip_field_label(clean_text, "consigner")
            elif any("Consignee" in m for m in missing) and not draft_data.get("consignee_id") and "consignee_candidate" not in entities:
                entities["consignee_candidate"] = strip_field_label(clean_text, "consignee")
            elif any("Loading" in m for m in missing) and not draft_data.get("origin_location_id") and "origin_candidate" not in entities:
                entities["origin_candidate"] = strip_field_label(clean_text, "origin")
            elif any("Delivery" in m for m in missing) and not draft_data.get("destination_location_id") and "destination_candidate" not in entities:
                entities["destination_candidate"] = strip_field_label(clean_text, "destination")
            elif any("Goods" in m for m in missing) and not draft_data.get("particulars") and "particulars" not in entities:
                entities["particulars"] = strip_field_label(clean_text, "goods")

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
    STRICT GROUNDING: Rejects any LLM-hallucinated name, vehicle, or price not in user text!
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
            val = str(data["consigner"]).strip()
            if is_valid_party_name(val) and is_grounded_in_text(val, user_text):
                extracted["consigner_candidate"] = val
        if data.get("consignee"):
            val = str(data["consignee"]).strip()
            if is_valid_party_name(val) and is_grounded_in_text(val, user_text):
                extracted["consignee_candidate"] = val
        if data.get("origin"):
            val = str(data["origin"]).strip()
            if is_valid_party_name(val) and is_grounded_in_text(val, user_text):
                extracted["origin_candidate"] = val
        if data.get("destination"):
            val = str(data["destination"]).strip()
            if is_valid_party_name(val) and is_grounded_in_text(val, user_text):
                extracted["destination_candidate"] = val
        if data.get("vehicle_number"):
            val = str(data["vehicle_number"]).strip()
            if is_valid_indian_vehicle(val) and is_grounded_in_text(val, user_text):
                extracted["vehicle_number"] = val
        if data.get("freight_amount") is not None:
            try:
                amt = float(data["freight_amount"])
                amt_str = str(int(amt))
                if amt_str in user_text or any(k in user_text.lower() for k in ("freight", "bhada", "rate", "rs", "₹")):
                    extracted["freight_amount"] = amt
            except Exception:
                pass
        if data.get("advance_amount") is not None:
            try:
                amt = float(data["advance_amount"])
                amt_str = str(int(amt))
                if amt_str in user_text or any(k in user_text.lower() for k in ("advance", "peshgi", "advance amount")):
                    extracted["advance_amount"] = amt
            except Exception:
                pass
        if data.get("package_count") is not None:
            extracted["package_count"] = int(data["package_count"])
        if data.get("actual_weight_mt") is not None:
            extracted["actual_weight_mt"] = float(data["actual_weight_mt"])
        if data.get("particulars"):
            val = str(data["particulars"]).strip()
            if is_grounded_in_text(val, user_text):
                extracted["particulars"] = val
        return extracted
    except Exception as e:
        logger.debug(f"LLM entity extraction fallback: {e}")
        return {}


async def resolve_or_create_consigner(
    db: AsyncSession,
    name: str,
    office_id: Optional[int] = None,
    allow_provision: bool = False,
) -> Tuple[Optional[Consigner], List[Consigner]]:
    """Finds existing consigner by name; only auto-provisions if allow_provision=True (on final confirmation)."""
    clean_name = clean_party_name(name)
    if not clean_name:
        return None, []
    query = select(Consigner).where(Consigner.is_active == True)
    if office_id:
        query = query.where(or_(Consigner.issuing_office_id == office_id, Consigner.issuing_office_id.is_(None)))
    query = query.where(Consigner.name.ilike(f"%{clean_name}%")).order_by(Consigner.name.asc()).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())

    # Exact case-insensitive match
    for m in matches:
        if m.name.lower().strip() == clean_name.lower():
            return m, []

    if len(matches) > 1:
        return None, matches

    if len(matches) == 1:
        return matches[0], []

    if not allow_provision:
        return None, []

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
    return new_c, []


async def resolve_or_create_consignee(
    db: AsyncSession,
    name: str,
    office_id: Optional[int] = None,
    allow_provision: bool = False,
) -> Tuple[Optional[Consignee], List[Consignee]]:
    """Finds existing consignee by name; only auto-provisions if allow_provision=True (on final confirmation)."""
    clean_name = clean_party_name(name)
    if not clean_name:
        return None, []
    query = select(Consignee).where(Consignee.is_active == True)
    if office_id:
        query = query.where(or_(Consignee.issuing_office_id == office_id, Consignee.issuing_office_id.is_(None)))
    query = query.where(Consignee.name.ilike(f"%{clean_name}%")).order_by(Consignee.name.asc()).limit(5)
    result = await db.execute(query)
    matches = list(result.scalars().all())

    for m in matches:
        if m.name.lower().strip() == clean_name.lower():
            return m, []

    if len(matches) > 1:
        return None, matches

    if len(matches) == 1:
        return matches[0], []

    if not allow_provision:
        return None, []

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
    return new_ce, []


async def resolve_or_create_location(
    db: AsyncSession,
    city: str,
    office_id: Optional[int] = None,
) -> Location:
    """Finds existing location by city; if absent, auto-provisions to prevent booking blockage."""
    clean_city = strip_field_label(city, "destination")
    clean_city = strip_field_label(clean_city, "origin").strip()
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
    Enforces GST Rule 138 E-Way Bill requirement when goods value > ₹50,000.
    If mandatory fields are satisfied, marks draft as valid and generates single-use confirmation token.
    """
    missing = []
    data = draft.data

    if not data.get("consigner_id") and not draft.preview_labels.get("consigner_name") and not data.get("consigner_name"):
        missing.append("Consigner")
    if not data.get("consignee_id") and not draft.preview_labels.get("consignee_name") and not data.get("consignee_name"):
        missing.append("Consignee")
    if not data.get("vehicle_number"):
        missing.append("Vehicle Number")
    if not data.get("origin_location_id") and not draft.preview_labels.get("origin_name"):
        missing.append("Loading Location")
    if not data.get("destination_location_id") and not draft.preview_labels.get("destination_name"):
        missing.append("Delivery Location")

    # E-Way Bill Rule: If goods value > ₹50,000, EWB is mandatory under GST Rule 138
    goods_val = float(data.get("goods_value") or 0.0)
    if goods_val > 50000:
        ewb = data.get("eway_bill_number")
        if not ewb:
            missing.append("E-Way Bill (Required for goods value > ₹50,000 under GST Rule 138)")
        else:
            is_ewb_valid, _ = validate_eway_bill_number(str(ewb))
            if not is_ewb_valid:
                missing.append("Valid 12-digit E-Way Bill Number")

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
            "consigner_id": data.get("consigner_id") or 1,
            "consignee_id": data.get("consignee_id") or 1,
            "vehicle_number": data["vehicle_number"],
            "vehicle_source": data.get("vehicle_source", "MARKET"),
            "vehicle_type": data.get("vehicle_type"),
            "origin_location_id": data.get("origin_location_id"),
            "destination_location_id": data.get("destination_location_id"),
            "via": draft.preview_labels.get("destination_name"),
            "freight_rate": freight,
            "freight_amount": freight,
            "advance_amount": advance,
            "total_freight_amount": total_freight,
            "balance_amount": balance,
            "package_count": int(data.get("package_count") or 0),
            "actual_weight_mt": Decimal(str(data.get("actual_weight_mt") or 1.0)),
            "chargeable_weight_mt": Decimal(str(data.get("chargeable_weight_mt") or data.get("actual_weight_mt") or 1.0)),
            "particulars": data.get("particulars") or "General Cargo",
            "issuing_office_id": office_id or draft.office_id,
        }

        # Validate with LRCreate
        LRCreate(**test_payload)
        if data.get("consigner_id"):
            draft.data["consigner_id"] = data["consigner_id"]
        if data.get("consignee_id"):
            draft.data["consignee_id"] = data["consignee_id"]
        draft.data["freight_rate"] = freight
        draft.data["freight_amount"] = freight
        draft.data["advance_amount"] = advance
        draft.data["total_freight_amount"] = total_freight
        draft.data["balance_amount"] = balance
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
        office_str = format_user_office_label(current_office, user)
        if lang == "hi_devanagari":
            msg = f"आपके पास एलआर (LR) बनाने की अनुमति नहीं है। आपका अधिकृत जारी करने वाला कार्यालय (issuing office) {office_str} है। कृपया अपने कंपनी एडमिन से संपर्क करें।"
        elif lang == "hinglish":
            msg = f"Aapke paas LRs create karne ka access nahi hai. Aapka allowed issuing office {office_str} hai. Kripya access ke liye apne Company Admin se sampark karein."
        else:
            msg = f"You don't have access to create LRs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
        return msg, []

    eff_office_id = current_office.id if current_office else None

    # 2. Check Discard / Cancel intent
    if is_cancel_intent(user_text):
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        if lang == "hi_devanagari":
            msg = "आपका सक्रिय एलआर ड्राफ्ट रद्द (cancel) कर दिया गया है। जब भी आप नया कंसाइनमेंट बुक करना चाहें, मुझे बताएं।"
        elif lang == "hinglish":
            msg = "Aapki active LR draft cancel kar di gayi hai. Nayi LR banane ke liye kabhi bhi batayein."
        else:
            msg = "Your active LR draft has been cancelled. Let me know when you would like to book a new consignment."
        card = StructuredCard(
            card_type="lr_draft",
            title="LR Booking • Draft Cancelled",
            subtitle="Cancelled — no LR was created",
            badge={"text": "Cancelled", "variant": "neutral"},
            can_confirm=False,
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

    # Snapshot existing values before applying any updates to detect real changes
    orig_snapshot = {
        "consigner": draft.preview_labels.get("consigner_name"),
        "consignee": draft.preview_labels.get("consignee_name"),
        "vehicle": draft.data.get("vehicle_number"),
        "origin": draft.preview_labels.get("origin_name"),
        "destination": draft.preview_labels.get("destination_name"),
        "freight": draft.data.get("freight_amount"),
        "advance": draft.data.get("advance_amount"),
        "weight": draft.data.get("actual_weight_mt"),
        "particulars": draft.data.get("particulars"),
        "eway": draft.data.get("eway_bill_number"),
    }

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
        feedback_notes.append(f"❌ Invalid vehicle number '{entities['invalid_vehicle']}': Indian registration must follow standard format (e.g., DL01AA1111).")
    if "invalid_gstin" in entities:
        is_g, err_g = validate_indian_gstin(entities["invalid_gstin"])
        feedback_notes.append(f"❌ Invalid GSTIN '{entities['invalid_gstin']}': {err_g or 'Checksum validation failed'}. Please provide a valid 15-character GSTIN.")
    if "invalid_pincode" in entities:
        is_p, err_p = validate_indian_pincode(entities["invalid_pincode"])
        feedback_notes.append(f"❌ Invalid pincode '{entities['invalid_pincode']}': {err_p or 'Must be 6 digits'}. Please provide a valid 6-digit postal pincode.")
    if "invalid_ewb" in entities:
        is_e, err_e = validate_eway_bill_number(entities["invalid_ewb"])
        feedback_notes.append(f"❌ Invalid E-Way Bill '{entities['invalid_ewb']}': {err_e or 'Must be 12 digits'}. Please provide a valid 12-digit E-Way Bill number.")
    if "goods_value" in entities:
        draft.update_field("goods_value", entities["goods_value"])
    if "eway_bill_number" in entities:
        draft.update_field("eway_bill_number", entities["eway_bill_number"])

    # 6. Process Consigner
    if "consigner_candidate" in entities:
        cand_c = entities["consigner_candidate"]
        c_obj, c_ambig = await resolve_or_create_consigner(db, cand_c, office_id=eff_office_id, allow_provision=False)
        if c_obj:
            draft.update_field("consigner_id", c_obj.id, label=c_obj.name)
            draft.preview_labels["consigner_name"] = c_obj.name
            draft.data["consigner_name"] = c_obj.name
        elif c_ambig:
            opts = ", ".join(m.name for m in c_ambig)
            feedback_notes.append(f"Multiple consigners match '{cand_c}': {opts}. Please clarify which party you intend.")
        else:
            clean_c = clean_party_name(cand_c).title()
            draft.preview_labels["consigner_name"] = clean_c
            draft.data["consigner_name"] = clean_c
            draft.data["consigner_id"] = None

    # 7. Process Consignee
    if "consignee_candidate" in entities:
        cand_ce = entities["consignee_candidate"]
        ce_obj, ce_ambig = await resolve_or_create_consignee(db, cand_ce, office_id=eff_office_id, allow_provision=False)
        if ce_obj:
            draft.update_field("consignee_id", ce_obj.id, label=ce_obj.name)
            draft.preview_labels["consignee_name"] = ce_obj.name
            draft.data["consignee_name"] = ce_obj.name
        elif ce_ambig:
            opts = ", ".join(m.name for m in ce_ambig)
            feedback_notes.append(f"Multiple consignees match '{cand_ce}': {opts}. Please clarify which party you intend.")
        else:
            clean_ce = clean_party_name(cand_ce).title()
            draft.preview_labels["consignee_name"] = clean_ce
            draft.data["consignee_name"] = clean_ce
            draft.data["consignee_id"] = None

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

    # Verify single edit change
    if entities.get("is_single_edit") and not feedback_notes:
        new_snapshot = {
            "consigner": draft.preview_labels.get("consigner_name"),
            "consignee": draft.preview_labels.get("consignee_name"),
            "vehicle": draft.data.get("vehicle_number"),
            "origin": draft.preview_labels.get("origin_name"),
            "destination": draft.preview_labels.get("destination_name"),
            "freight": draft.data.get("freight_amount"),
            "advance": draft.data.get("advance_amount"),
            "weight": draft.data.get("actual_weight_mt"),
            "particulars": draft.data.get("particulars"),
            "eway": draft.data.get("eway_bill_number"),
        }
        edited_field = entities.get("edited_field_name", "field")
        field_key_map = {
            "consigner": "consigner", "consignername": "consigner", "sender": "consigner", "sendername": "consigner",
            "consignee": "consignee", "consigneename": "consignee", "receiver": "consignee", "receivername": "consignee", "deliveryparty": "consignee", "deliverypartyname": "consignee",
            "vehicle": "vehicle", "vehiclenumber": "vehicle", "truck": "vehicle", "trucknumber": "vehicle",
            "origin": "origin", "originlocation": "origin", "loading": "origin", "loadinglocation": "origin", "from": "origin",
            "destination": "destination", "destinationlocation": "destination", "delivery": "destination", "deliverylocation": "destination", "to": "destination",
            "freight": "freight", "rate": "freight", "bhada": "freight", "freightamount": "freight",
            "advance": "advance", "advanceamount": "advance",
            "weight": "weight",
            "particulars": "particulars", "goods": "particulars", "cargo": "particulars", "material": "particulars",
            "eway": "eway", "ewaybill": "eway", "ewb": "eway",
        }
        target_key = field_key_map.get(edited_field, "field")
        field_display_names = {
            "consigner": "Consigner",
            "consignee": "Consignee",
            "vehicle": "Vehicle",
            "origin": "Origin",
            "destination": "Destination",
            "freight": "Freight",
            "advance": "Advance",
            "weight": "Weight",
            "particulars": "Goods",
            "eway": "E-Way Bill",
        }
        display_name = field_display_names.get(target_key, edited_field.title())
        has_changed = any(new_snapshot[k] != orig_snapshot[k] for k in orig_snapshot)

        if has_changed:
            feedback_notes.append(f"✅ Updated **{edited_field}** in your draft.")
        elif target_key in new_snapshot and new_snapshot[target_key]:
            feedback_notes.append(f"{display_name} is already {new_snapshot[target_key]}.")
        else:
            feedback_notes.append(f"⚠️ Could not update **{edited_field}**. Please provide a valid value.")

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

    goods_val = float(draft.data.get("goods_value") or 0.0)
    ewb_val = draft.data.get("eway_bill_number")

    metrics = [
        {"label": "Consigner", "value": c_name or "Pending"},
        {"label": "Consignee", "value": ce_name or "Pending"},
        {"label": "Route", "value": f"{orig_name or 'Origin'} → {dest_name or 'Destination'}"},
        {"label": "Vehicle", "value": f"{v_num} ({v_source})" if v_num else "Pending"},
        {"label": "Freight Amount", "value": f"₹{freight_val:,.2f}"},
        {"label": "Balance Due", "value": f"₹{balance_val:,.2f}"},
    ]
    if wt > 0:
        metrics.append({"label": "Weight", "value": f"{wt:.2f} MT"})
    if goods_val > 0:
        metrics.append({"label": "Goods Value", "value": f"₹{goods_val:,.2f}"})
    if ewb_val:
        metrics.append({"label": "E-Way Bill", "value": str(ewb_val)})

    items = [
        {
            "primary": f"{orig_name or 'Pending'} to {dest_name or 'Pending'} • {v_num or 'Vehicle Pending'}",
            "secondary": f"Consigner: {c_name or 'Pending'} • Consignee: {ce_name or 'Pending'} • Pkgs: {pkgs}",
            "amount": f"₹{freight_val:,.2f}",
            "status": "Ready to Confirm" if draft.is_valid else "Incomplete",
        }
    ]

    # 12. Intelligent Response Generation (Form Review vs Selective Follow-up)
    ewb_line = f"• **E-Way Bill:** {ewb_val}\n" if ewb_val else ""
    val_line = f"• **Goods Value:** ₹{goods_val:,.2f}\n" if goods_val > 0 else ""

    if draft.is_valid:
        # Full Completed Form Review before final submission
        if lang == "hi_devanagari":
            base_msg = (
                f"### 📋 एलआर बुकिंग फॉर्म — समीक्षा और पुष्टि\n\n"
                f"सभी आवश्यक विवरण सत्यापित हो चुके हैं:\n"
                f"• **कंसाइनर (भेजने वाला):** {c_name}\n"
                f"• **कंसाइनी (पाने वाला):** {ce_name}\n"
                f"• **मार्ग (Route):** {orig_name} → {dest_name}\n"
                f"• **वाहन (Vehicle):** {v_num} ({v_source} Vehicle)\n"
                f"• **माल भाड़ा (Freight Amount):** ₹{freight_val:,.2f}\n"
                f"• **अग्रिम भुगतान (Advance):** ₹{advance_val:,.2f}\n"
                f"• **शेष देय (Balance Due):** ₹{balance_val:,.2f}\n"
                f"• **पैकेज:** {pkgs} pkgs\n"
                f"• **वजन:** {wt:.2f} MT ({particulars})\n"
                f"{val_line}{ewb_line}\n"
                f"*(किसी भी विवरण को बदलने के लिए 'change <field> to <new value>' लिखें, या पुष्टि के लिए 'Create LR' टाइप करें/नीचे दिए गए बटन पर क्लिक करें)*\n\n"
                f"अंतिम रूप देने के लिए **'Confirm & Create LR'** बटन पर क्लिक करें।"
            )
        elif lang == "hinglish":
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
                f"• **Weight:** {wt:.2f} MT ({particulars})\n"
                f"{val_line}{ewb_line}\n"
                f"*(Kisi bhi field ko edit karne ke liye 'change <field> to <new value>' type karein, ya finalize karne ke liye 'Create LR' type karein)*\n\n"
                f"Kripya niche draft card review karein aur **'Confirm & Create LR'** button par click karein."
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
                f"• **Weight:** {wt:.2f} MT ({particulars})\n"
                f"{val_line}{ewb_line}\n"
                f"*(To modify any field, type 'change <field> to <new value>', or type 'Create LR' to confirm)*\n\n"
                f"Please review the summary above and the draft card below. "
                f"Click **'Confirm & Create LR'** or type **'Create LR'** to finalize and issue the consignment note."
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
        if goods_val > 0:
            recorded_lines.append(f"• **Goods Value:** ₹{goods_val:,.2f}")
        if ewb_val:
            recorded_lines.append(f"• **E-Way Bill:** {ewb_val}")

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
            elif "E-Way Bill" in mf:
                missing_prompts.append("• What is the **12-digit E-Way Bill Number**? *(Mandatory under GST Rule 138 because goods value exceeds ₹50,000)*")
            elif "Weight" in mf:
                missing_prompts.append("• What is the **Weight** (e.g. 5000 kg or 5 MT)?")
            elif "Freight" in mf:
                missing_prompts.append("• What is the agreed **Freight Amount** (e.g. ₹15,000)?")
            elif "Goods" in mf:
                missing_prompts.append("• What is the **Goods / Cargo Description** (e.g. Electronics, Cement)?")

        missing_block = "👉 **Still Needed:**\n" + "\n".join(missing_prompts)

        if lang == "hi_devanagari":
            base_msg = (
                f"मैं आपकी एलआर (LR) बनाने में मदद करूँगा (ड्राफ्ट तैयार कर रहा हूँ)।\n\n"
                f"{recorded_block}"
                f"{missing_block}\n\n"
                f"*आप शेष विवरण एक साथ या एक-एक करके प्रदान कर सकते हैं।*"
            )
        elif lang == "hinglish":
            base_msg = (
                f"Main aapki LR create karne mein help karunga (draft prepare kar raha hoon).\n\n"
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
        base_msg = "\n\n".join(feedback_notes) + "\n\n" + base_msg

    can_confirm = draft.is_valid
    if goods_val > 50000:
        is_ewb_ok = bool(ewb_val and validate_eway_bill_number(str(ewb_val))[0])
        if not is_ewb_ok:
            badge = {"text": "Confirmation blocked — E-Way Bill required", "variant": "danger"}
            can_confirm = False
            draft.is_valid = False
            draft.confirmation_token = None

    card = StructuredCard(
        card_type="lr_draft",
        title="LR Booking Draft",
        subtitle=f"Draft ID: {draft.draft_id} • Office: {current_office.name if current_office else 'Default'}",
        badge=badge,
        metrics=metrics,
        items=items,
        draft_id=draft.draft_id,
        confirmation_token=draft.confirmation_token if can_confirm else None,
        missing_fields=draft.missing_fields,
        can_confirm=can_confirm,
        action={"label": "Open in LR Form", "href": "/transport/lr-booking"},
    )

    return base_msg, [card]
