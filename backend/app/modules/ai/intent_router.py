"""
Panther AI Intent-First Router & Domain Classifier.
Implements a closed-taxonomy intent router running BEFORE any slot-filling,
search, or draft creation on every message, in every supported language (en, hi_devanagari, hinglish).

Closed Intent Taxonomy (v3):
- greet
- help
- page_help
- track_lr
- track_vehicle
- find_vehicle
- list_vehicles
- find_driver
- driver_balance
- list_drivers
- view_ledger
- outstanding_balance
- vendor_balance
- show_bills
- freight_for_lr
- find_client
- list_clients
- list_jobs
- human
- add_consignee
- change_consignee
- how_to_create_lr  (v3: EVERY explicit "book/create an LR" request lands here
  as a GUIDE — chat never opens an LR draft; there is no book_lr intent)
- how_to_track
- what_is_eway
- cancel_draft
- delete_lr
- off_topic
- unknown
"""
import re
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import date, timedelta


@dataclass
class RouterResult:
    intent: str
    confidence: float
    entities_raw: Dict[str, Any] = field(default_factory=dict)
    matched_rule: Optional[str] = None


# Universal stop words / noise words that must NEVER be treated as search queries or place names
STOP_WORDS = {
    "from", "to", "show", "all", "my", "the", "s", "a", "an", "in", "on", "at",
    "is", "are", "do", "does", "have", "pay", "please", "can", "you", "me", "give",
    "tell", "what", "which", "where", "how", "much", "many", "here", "there",
    "of", "for", "with", "this", "that", "ka", "ki", "ke", "ko", "se", "par",
    "hai", "hain", "karo", "karein", "batao", "bataiye", "dikhao", "dekho", "mujhe",
    "mera", "meri", "mere", "hamara", "hamari", "hamare", "sab", "sabhi",
    "total", "details", "info", "information", "number", "no", "list", "status"
}


def clean_search_term(term: Optional[str]) -> Optional[str]:
    """Strips stop words and prepositions from search candidates."""
    if not term:
        return None
    cleaned = term.strip()
    words = [w for w in re.split(r"[\s,;]+", cleaned) if w.lower() not in STOP_WORDS]
    result = " ".join(words).strip()
    return result if len(result) >= 2 else None


def extract_indian_vehicle_number(text: str) -> Optional[str]:
    """Finds standard Indian vehicle registration (e.g. DL01AB1234, HR38X1234, UP16AB1111)."""
    # Exclude system prefixes like LR, GR, HC, PV, RV
    m = re.search(
        r"\b(?!(?:LR|GR|HC|INV|JOB|PV|RV|CV|JV|EWB))([A-Z]{2}[0-9]{1,2}(?:[A-Z]{1,3})?[0-9]{4})\b",
        text,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).upper()
    return None


def extract_vehicle_prefix(text: str) -> Optional[str]:
    """Finds partial vehicle prefix like DL01, HR38, MH12."""
    m = re.search(
        r"\b(?!(?:LR|GR|HC|INV|JOB|PV|RV|CV|JV|EWB))([A-Z]{2}[0-9]{1,2})\b",
        text,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).upper()
    return None


def extract_lr_number(text: str) -> Optional[str]:
    """Extracts explicit LR/GR/Bilty number."""
    m = re.search(r"\b((?:lr|gr|bilty)[-_\s#]*[0-9][A-Za-z0-9_-]*)\b", text, re.I)
    if m:
        return m.group(1).strip()
    m_alpha = re.search(r"\b((?:lr|gr|bilty)[-_\s#]*[A-Za-z0-9_-]+)\b", text, re.I)
    if m_alpha:
        cand = m_alpha.group(1).strip()
        if cand.lower() not in STOP_WORDS and any(c.isdigit() for c in cand):
            return cand
    return None


def classify_intent_and_entities(
    text: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    state: Optional[Dict[str, Any]] = None,
    detected_lang: str = "en",
) -> RouterResult:
    """
    Core Intent-First Router.
    Runs on EVERY message, BEFORE any slot-filling, search, or draft creation.
    Decides intent from semantic meaning, not naive keywords.
    """
    clean = (text or "").strip()
    lower = clean.lower()

    # --------------------------------------------------------------------------
    # 1. HARD RULE 0: DELETE INTENT (SAFETY - RUNS FIRST IN EVERY LANGUAGE)
    # --------------------------------------------------------------------------
    has_delete_verb = bool(
        re.search(r"\b(delete|remove|erase|destroy|drop|purge|wipe\s+out)\b", lower)
        or "डिलीट" in clean
        or "हटाएं" in clean
        or "हटाओ" in clean
        or "हटाना" in clean
        or "मिटाएं" in clean
        or "मिटाओ" in clean
        or bool(re.search(r"\b(?:hatao|mitao|delete\s+karo|hata\s+do)\b", lower))
    )
    if has_delete_verb:
        # Exempt draft cancellations ("cancel draft", "discard draft")
        if not re.search(r"\b(cancel|discard|clear)\s+(?:draft|booking|chat)\b", lower):
            entities = {}
            if re.search(r"\b(vehicle|gadi|truck|lorry|gaadi|वाहन|गाड़ी|गाड़ी|ट्रक)\b", lower) or "वाहन" in clean or "गाड़ी" in clean:
                entities["target_record"] = "vehicle"
            elif re.search(r"\b(driver|chalak|ड्राइवर|चालक)\b", lower) or "ड्राइवर" in clean or "चालक" in clean:
                entities["target_record"] = "driver"
            elif re.search(r"\b(bill|invoice|बिल|इनवॉइस)\b", lower) or "बिल" in clean:
                entities["target_record"] = "bill"
            else:
                entities["target_record"] = "LR"
            return RouterResult(intent="delete_lr", confidence=1.0, entities_raw=entities, matched_rule="safety_delete")

    # --------------------------------------------------------------------------
    # 2. CANCEL DRAFT INTENT (EVERY LANGUAGE)
    # --------------------------------------------------------------------------
    has_cancel_verb = (
        lower in ("cancel", "cancel draft", "cancel karo", "clear draft", "discard draft", "cancel booking", "cancel lr", "dismiss draft", "dismiss current booking draft")
        or "रद्द करें" in clean
        or "रद्द करो" in clean
        or "रद्द" in clean
        or "कैंसिल" in clean
        or "कैंसिल करें" in clean
        or "कैंसल" in clean
        or bool(re.search(r"\b(?:cancel|discard|clear|dismiss|abort)\s*(?:draft|booking|chat|karo|current\s+booking\s+draft)?\b", lower))
    )
    if has_cancel_verb:
        return RouterResult(intent="cancel_draft", confidence=1.0, matched_rule="cancel_draft")

    # --------------------------------------------------------------------------
    # 2A. HUMAN HANDOFF INTENT (No.14 rebuild — warm handoff, P4)
    # "Talk to support" (frontend button) sends:
    # "I need help from a human — please connect me to support".
    # Must be checked BEFORE off-topic/help so a human request is never
    # refused or treated as a general question.
    # --------------------------------------------------------------------------
    is_human_request = bool(
        re.search(
            r"\b(talk|speak|connect|transfer|escalate)\b.{0,25}\b(human|support|agent|person|representative)\b",
            lower,
        )
        or re.search(r"\bneed\s+(?:a\s+)?human\b", lower)
        or re.search(r"\bhuman\s+(?:help|support|assistance)\b", lower)
        or "मानव से बात" in clean
        or "इंसान से बात" in clean
        or "सपोर्ट से बात" in clean
        or bool(re.search(r"\b(?:human|support)\s+se\s+baat\b", lower))
    )
    if is_human_request:
        return RouterResult(intent="human", confidence=1.0, matched_rule="human_handoff")

    # --------------------------------------------------------------------------
    # 3. OFF-TOPIC INTENTS (CONFIRMED OFF-TOPIC IN ALL LANGUAGES)
    # --------------------------------------------------------------------------
    is_weather = bool(re.search(r"\b(weather|mausam|forecast|temperature|barish|humidity|rain|बारिश|मौसम)\b", lower)) or "मौसम" in clean or "बारिश" in clean
    is_code = bool(re.search(r"\b(python|javascript|typescript|c\+\+|java|sort\s+function|sorting\s+function|algorithm|bubble\s+sort|quick\s+sort|merge\s+sort|write\s+code|sql\s+query|regex|function\s+to)\b", lower))
    is_stocks = bool(re.search(r"\b(share\s+price|stock\s+price|stock\s+market|reliance\s+share|sensex|nifty|bitcoin|crypto|mutual\s+fund|शेयर)\b", lower))
    is_translation = (
        bool(re.search(r"\b(translate|translation|anuvad|अनुवाद)\b", lower))
        or "अनुवाद" in clean
        or bool(re.search(r"\b(?:to|in)\s+(?:hindi|english|french|spanish|german)\b", lower))
    )
    is_flight = bool(re.search(r"\b(flight|flights|airline|airlines|airplane|aeroplane|airways|air\s*ticket|boarding\s+pass|indigo|vistara|air\s*india|spicejet|फ्लाइट|हवाई\s*जहाज)\b", lower)) or "फ्लाइट" in clean
    is_leave_email = bool(re.search(r"\b(leave\s+email|leave\s+application|leave\s+letter|email\s+to\s+(?:my\s+)?boss|chhutti|sick\s+leave|casual\s+leave|छुट्टी)\b", lower)) or "छुट्टी" in clean
    is_casual = bool(re.search(r"\b(recipe|poem|joke|cricket\s+score|ipl\s+score|movie\s+ticket|चुटकुला)\b", lower))
    if is_weather or is_code or is_stocks or is_translation or is_flight or is_leave_email or is_casual:
        return RouterResult(intent="off_topic", confidence=1.0, matched_rule="off_topic_guard")

    # --------------------------------------------------------------------------
    # 4. GREETINGS & HELP INTENTS
    # --------------------------------------------------------------------------
    raw_clean = re.sub(r"[^\w\s]", "", lower).strip()
    greetings = {
        "hi", "hello", "hey", "hola", "namaste", "namaskar", "greetings",
        "hlo", "hii", "helo", "helloo", "heyy", "hey there", "hi there",
        "hello there", "good morning", "good afternoon", "good evening",
        "good day", "hi panther", "hello panther", "hey panther",
        "kese ho", "kaise ho", "kya haal hai", "नमस्ते", "नमस्कार", "प्रणाम"
    }
    # v3: ONLY an exact short greeting is a greeting. A message that starts
    # with "hi" but asks something ("hi, what is LR?") is NOT a greeting —
    # it falls through to the real intent / RAG + LLM, so it gets an answer.
    _greet_words = raw_clean.split()
    if raw_clean in greetings or (
        len(_greet_words) <= 3
        and (
            raw_clean.startswith("hi ")
            or raw_clean.startswith("hello ")
            or raw_clean.startswith("hey ")
            or raw_clean.startswith("hlo ")
            or raw_clean.startswith("namaste ")
            or raw_clean.startswith("namaskar ")
        )
    ):
        return RouterResult(intent="greet", confidence=1.0, matched_rule="greet")

    if bool(re.search(r"^(what\s+can\s+you\s+do|what\s+do\s+you\s+do|help|kya\s+kar\s+sakte\s+ho|tum\s+kya\s+karte\s+ho|what\s+are\s+your\s+capabilities|how\s+can\s+you\s+help|features)$", raw_clean)) or "क्या कर सकते" in clean:
        return RouterResult(intent="help", confidence=1.0, matched_rule="help")

    # --------------------------------------------------------------------------
    # 5. KNOWLEDGE & HOW-TO QUESTIONS (MUST NEVER TRIGGER SEARCHES)
    # --------------------------------------------------------------------------
    # E-Way Bill Knowledge question
    if bool(re.search(r"\b(?:what\s+is|explain|documents?\s+(?:needed|required|for)|kya\s+hai|kya\s+hota\s+hai|details\s+of)\s+(?:an?\s+)?(?:eway|e-way|ewb)\s*(?:bill)?\b", lower)) or \
       bool(re.search(r"\b(?:eway|e-way|ewb)\s*(?:bill)?\s+(?:kya\s+hai|kya\s+hota\s+hai|rules?|threshold|limit|documents?)\b", lower)) or \
       "ई-वे बिल क्या" in clean or "ई वे बिल" in clean:
        return RouterResult(intent="what_is_eway", confidence=1.0, matched_rule="what_is_eway")

    # How to create LR
    if bool(re.search(r"\b(?:how\s+(?:do\s+i|to|can\s+i)\s+(?:create|book|make|generate|register)\s+(?:an?\s+)?(?:new\s+)?(?:lr|gr|bilty|consignment))\b", lower)) or \
       bool(re.search(r"\b(?:steps\s+(?:to|for)\s+(?:create|register|book|make|generate)\s+(?:an?\s+)?(?:new\s+)?(?:lr|gr|bilty|consignment))\b", lower)) or \
       bool(re.search(r"\b(?:lr|gr|bilty)\s+(?:kaise\s+(?:banaye|banayein|karein|banti\s+hai)|steps)\b", lower)) or \
       "एलआर कैसे" in clean or "बिल्टी कैसे" in clean:
        return RouterResult(intent="how_to_create_lr", confidence=1.0, matched_rule="how_to_create_lr")

    # How to track
    if bool(re.search(r"\b(?:how\s+(?:do\s+i|to|can\s+i)\s+track|how\s+does\s+tracking\s+work|tracking\s+kaise\s+(?:karein|hoti\s+hai))\b", lower)) or \
       "ट्रैकिंग कैसे" in clean:
        return RouterResult(intent="how_to_track", confidence=1.0, matched_rule="how_to_track")

    # --------------------------------------------------------------------------
    # 6. ACTION INTENTS: ADD / CHANGE CONSIGNEE (NOT LOOKUPS!)
    # --------------------------------------------------------------------------
    if bool(re.search(r"\b(?:add|create|register|new)\s+(?:brand\s+new\s+|new\s+)?consignee(?:\s+party)?\b", lower)) or "नया कंसाइनी" in clean:
        return RouterResult(intent="add_consignee", confidence=1.0, matched_rule="add_consignee")

    m_change_c = re.search(r"\b(?:change|update|set|actually)\s+consignee\s+(?:to|is|=)?\s*([A-Za-z0-9\s&.-]+)", clean, re.I)
    if m_change_c or "कंसाइनी" in clean and ("है" in clean or "बदलो" in clean or "करें" in clean):
        consignee_val = None
        if m_change_c:
            consignee_val = m_change_c.group(1).strip()
        else:
            m_hi_c = re.search(r"कंसाइनी\s+([A-Za-z0-9\s&.-]+?)\s*(?:है|रखें|करें)", clean)
            if m_hi_c:
                consignee_val = m_hi_c.group(1).strip()
        return RouterResult(
            intent="change_consignee",
            confidence=1.0,
            entities_raw={"consignee": consignee_val},
            matched_rule="change_consignee",
        )

    # --------------------------------------------------------------------------
    # 7. INVOICE / BILLS INTENT
    # --------------------------------------------------------------------------
    if bool(re.search(r"\b(?:show|list|view|get|fetch|pull\s+up)\s+(?:all\s+)?(?:billing\s+)?(?:bills|invoices|transport\s+invoices)\b", lower)) or \
       lower in ("show bills", "list bills", "bills", "invoices", "fetch all billing invoices", "बिल दिखाओ", "इनवॉइस दिखाओ"):
        return RouterResult(intent="show_bills", confidence=0.95, matched_rule="show_bills")

    # --------------------------------------------------------------------------
    # 8. LEDGER & BALANCES FAMILY
    # --------------------------------------------------------------------------
    # Driver balance: "What is Parth's driver advance balance?", "Parth's balance", "driver balance"
    is_driver_bal = (
        bool(re.search(r"\b(?:driver\s+(?:advance|balance)|advance\s+balance|driver's\s+advance|driver's\s+balance)\b", lower))
        or "ड्राइवर बैलेंस" in clean
        or "चालक अग्रिम" in clean
        or "ड्राइवर का" in clean
        or bool(re.search(r"\b(?:advance|advance\s+balance)\s+.*\b(?:with|for|to)\s+[A-Za-z0-9\u0900-\u097F]+\b", lower))
        or bool(re.search(r"([A-Za-z0-9\u0900-\u097F\-_]+)'s\s+(?:driver\s+)?(?:advance\s+)?balance", clean, re.I))
        or bool(re.search(r"([A-Za-z0-9\u0900-\u097F\-_]+)\s+(?:ka|ki|ke|का|की|के)\s+(?:driver\s+|ड्राइवर\s+)?(?:advance\s+|अग्रिम\s+)?(?:balance|hisab|बैलेंस|हिसाब)", clean, re.I))
    )
    if is_driver_bal:
        # Extract driver name if present
        d_name = None
        m_drv = re.search(r"([A-Za-z0-9\u0900-\u097F\-_]+)'s\s+(?:driver\s+)?(?:advance\s+)?balance", clean, re.I)
        if m_drv:
            cand = m_drv.group(1).strip()
            if cand.lower() not in STOP_WORDS:
                d_name = cand
        if not d_name:
            m_hi_d = re.search(r"([A-Za-z0-9\u0900-\u097F\-_]+)\s+(?:ka|ki|ke|का|की|के)\s+(?:driver\s+|ड्राइवर\s+)?(?:advance\s+|अग्रिम\s+)?(?:balance|hisab|बैलेंस|हिसाब)", clean, re.I)
            if m_hi_d:
                cand = m_hi_d.group(1).strip()
                if cand.lower() not in STOP_WORDS:
                    d_name = cand
        if not d_name:
            m_for = re.search(r"\b(?:for|of|with|to)\s+([A-Za-z0-9\u0900-\u097F]+)\b", clean, re.I)
            if m_for:
                cand = m_for.group(1).strip()
                if cand.lower() not in STOP_WORDS:
                    d_name = cand
        return RouterResult(intent="driver_balance", confidence=0.95, entities_raw={"driver_name": d_name}, matched_rule="driver_balance")

    # Vendor balance
    if bool(re.search(r"\b(?:vendor\s+(?:balance|ledger|payables?)|vendor\s+payables?|payables?|supplier\s+balance|transporter\s+dues|वेंडर\s+का\s+बकाया)\b", lower)):
        return RouterResult(intent="vendor_balance", confidence=0.95, matched_rule="vendor_balance")

    # Outstanding balance / "How much do I have to pay?" / "What is my outstanding balance?" / "Who owes us money"
    if bool(re.search(r"\b(?:how\s+much\s+do\s+i\s+have\s+to\s+pay|what\s+is\s+my\s+outstanding(?:\s+balance)?|outstanding\s+balance|mera\s+outstanding\s+kitna\s+hai|kitne\s+paise\s+dena\s+hai|kitna\s+baki\s+hai|who\s+owes\s+us|cash\s+(?:is\s+)?pending|pending\s+from\s+customers?|payment\s+lena\s+baki|lena\s+baki|बकाया\s+राशि)\b", lower)):
        return RouterResult(intent="outstanding_balance", confidence=0.95, matched_rule="outstanding_balance")

    # General View Ledger / Master Ledger / Running balances
    if bool(re.search(r"\b(?:view\s+ledger|show\s+ledger|master\s+ledger|party\s+ledger|running\s+balances?|all\s+balances?|ledger\s+dikhao|dikhao\s+ledger|khata\s+dikhao|khata|hisab|hisaab|लेजर\s+देखें|खाता\s+दिखाओ)\b", lower)) or \
       lower in ("view ledger", "show ledger", "ledger", "khata", "लेजर देखें", "ledger dikhao"):
        return RouterResult(intent="view_ledger", confidence=0.95, matched_rule="view_ledger")

    # --------------------------------------------------------------------------
    # 9. FREIGHT FOR SPECIFIC LR
    # --------------------------------------------------------------------------
    if bool(re.search(r"\b(?:freight|bhada|rate)\s+(?:for|of)\s+(?:lr|gr|bilty)?\s*([A-Za-z0-9_-]+)\b", lower)):
        m_lr_f = re.search(r"\b(?:freight|bhada|rate)\s+(?:for|of)\s+(?:lr|gr|bilty)?\s*([A-Za-z0-9_-]+)\b", clean, re.I)
        lr_cand = m_lr_f.group(1).strip() if m_lr_f else None
        if lr_cand and lr_cand.lower() not in STOP_WORDS:
            return RouterResult(intent="freight_for_lr", confidence=0.95, entities_raw={"lr_number": lr_cand}, matched_rule="freight_for_lr")

    # --------------------------------------------------------------------------
    # 10. TRACKING INTENT (LR vs VEHICLE)
    # A tracking sentence must NEVER open a booking draft!
    # --------------------------------------------------------------------------
    is_tracking_kw = (
        bool(re.search(r"\b(track|tracking|locate|location|gps|ping|kahan\s+hai|kahan\s+pahunchi|where\s+is|live\s+status|gps\s+status|toll\s+hit|कहाँ\s+है|ट्रैक)\b", lower))
        or "कहाँ है" in clean
        or "ट्रैक" in clean
    )
    if is_tracking_kw:
        veh_num = extract_indian_vehicle_number(clean)
        lr_num = extract_lr_number(clean)
        # If vehicle number explicitly mentioned
        if veh_num or bool(re.search(r"\b(vehicle|truck|gaadi|gadi|वाहन|गाड़ी)\b", lower)):
            return RouterResult(
                intent="track_vehicle",
                confidence=0.95,
                entities_raw={"vehicle_number": veh_num},
                matched_rule="track_vehicle",
            )
        # Otherwise tracking shipment / LR
        return RouterResult(
            intent="track_lr",
            confidence=0.95,
            entities_raw={"lr_number": lr_num},
            matched_rule="track_lr",
        )

    # 10A. LR LISTING / STATUS QUERY ("Meri aaj ki LR dikhao", "Show today's LRs", "Show LR-0001")
    is_lr_query = bool(re.search(r"\b(lr|gr|bilty|biltyan|consignment|consignments|एलआर|बिल्टी)\b", lower))
    if is_lr_query and any(k in lower for k in ("dikhao", "dekho", "show", "list", "today", "aaj", "status", "latest", "recent", "my", "meri", "mere")):
        is_today = any(k in lower for k in ("today", "aaj", "आज"))
        is_latest = any(k in lower for k in ("latest", "recent", "aakhri", "last"))
        lr_num = extract_lr_number(clean)
        return RouterResult(
            intent="track_lr",
            confidence=0.95,
            entities_raw={"lr_number": lr_num, "is_today": is_today, "is_latest": is_latest},
            matched_rule="track_lr_list",
        )

    # --------------------------------------------------------------------------
    # 10B. MULTI-FIELD MESSAGE CHECK — REMOVED in v3.
    # A message listing consigner/consignee/origin/destination/vehicle used to
    # open an LR draft. Chat LR booking is removed: such a message now falls
    # through to the how-to guide / RAG + LLM, which points the user at the
    # LR form. Slot words ("origin", "consignee", ...) are NOT booking intent.
    # (extract_raw_booking_slots is kept for reference only; nothing in the
    # chat flow may open a draft from it.)
    # --------------------------------------------------------------------------

    # --------------------------------------------------------------------------
    # 11. VEHICLE LOOKUPS (LIST vs FIND)
    # "Show all vehicles" must list, NEVER search for "s"!
    # --------------------------------------------------------------------------
    is_veh_context = bool(re.search(r"\b(vehicle|vehicles|truck|trucks|gaadi|gadi|lorry|fleet|वाहन|गाड़ी|गाड़ियां)\b", lower))
    if is_veh_context:
        # Check list-all indicators
        is_list_all = bool(re.search(r"\b(all|list|show\s+all|how\s+many|count|sabhi|सारे|सभी|सूची)\b", lower))
        if is_list_all or lower in ("show vehicles", "list vehicles", "vehicles list", "all vehicles", "show all vehicles"):
            return RouterResult(intent="list_vehicles", confidence=0.95, matched_rule="list_vehicles")

        # Specific vehicle search (exact or prefix, e.g. "Find vehicle DL01AB1234", "Find vehicle DL01")
        veh_num = extract_indian_vehicle_number(clean)
        veh_pfx = extract_vehicle_prefix(clean)
        # Extract free search token after 'vehicle' / 'truck'
        m_find_token = re.search(r"\b(?:find|search|lookup|get|check|pull\s+up|details\s+for)?\s*(?:vehicle|truck|gaadi|gadi)\s*(?:no\.?|number|#)?\s*([A-Za-z0-9_-]+)\b", clean, re.I)
        find_cand = None
        if m_find_token:
            cand = m_find_token.group(1).strip()
            if cand.lower() not in STOP_WORDS and len(cand) >= 2:
                find_cand = cand.upper()

        target_veh = veh_num or veh_pfx or find_cand
        if target_veh:
            return RouterResult(
                intent="find_vehicle",
                confidence=0.95,
                entities_raw={"vehicle_number": target_veh},
                matched_rule="find_vehicle",
            )

    # --------------------------------------------------------------------------
    # 12. DRIVER LOOKUPS (LIST vs FIND)
    # --------------------------------------------------------------------------
    is_drv_context = bool(re.search(r"\b(driver|drivers|chalak|सारथी|चालक|ड्राइवर)\b", lower))
    if is_drv_context:
        is_list_all = bool(re.search(r"\b(all|list|show\s+all|how\s+many|count|sabhi|सूची)\b", lower))
        if is_list_all:
            return RouterResult(intent="list_drivers", confidence=0.95, matched_rule="list_drivers")
        m_d_name = re.search(r"(?:driver|chalak)\s+([A-Za-z]+)", clean, re.I)
        d_name = m_d_name.group(1).strip() if m_d_name and m_d_name.group(1).lower() not in STOP_WORDS else None
        return RouterResult(
            intent="find_driver",
            confidence=0.90,
            entities_raw={"driver_name": d_name},
            matched_rule="find_driver",
        )

    # --------------------------------------------------------------------------
    # 13. CLIENT LOOKUPS (LIST vs FIND)
    # --------------------------------------------------------------------------
    is_client_context = bool(re.search(r"\b(client|clients|billing\s+client|customer|customers|ग्राहक)\b", lower))
    if is_client_context:
        is_list_all = bool(re.search(r"\b(all|list|show\s+all|how\s+many|count|sabhi|सूची)\b", lower))
        if is_list_all:
            return RouterResult(intent="list_clients", confidence=0.95, matched_rule="list_clients")
        m_c_name = re.search(r"(?:client|customer)\s+([A-Za-z0-9\s&.-]+)", clean, re.I)
        c_name = m_c_name.group(1).strip() if m_c_name and m_c_name.group(1).lower() not in STOP_WORDS else None
        return RouterResult(
            intent="find_client",
            confidence=0.90,
            entities_raw={"client_name": c_name},
            matched_rule="find_client",
        )

    # --------------------------------------------------------------------------
    # 13A. JOB LIST INTENT (No.14 rebuild — "What is my job list?")
    # Must be checked BEFORE the narrow LR-guide rule (§14) and before the unknown
    # fallback, otherwise a job-list question dies at the confidence gate
    # and the LLM fallback invents jobs (JOB-2026-xxx). Renders ONLY real
    # rows from the DB via typed_tools.search_jobs — never invented data.
    # --------------------------------------------------------------------------
    is_job_list = bool(
        re.search(
            r"\b(job\s+list|jobs?\s+list|list\s+(?:of\s+)?(?:my\s+|all\s+|the\s+)?(?:transport\s+)?jobs?|"
            r"show\s+(?:me\s+)?(?:my\s+|all\s+|the\s+)?(?:transport\s+)?jobs?|"
            r"my\s+(?:transport\s+)?jobs?\b|what\s+(?:is|are)\s+(?:my\s+)?(?:transport\s+)?jobs?)\b",
            lower,
        )
        or "जॉब लिस्ट" in clean
        or "मेरी जॉब" in clean
        or "सभी जॉब" in clean
        or bool(re.search(r"\b(?:meri|mere)\s+job\s+list\b", lower))
        or bool(re.search(r"\bjob\s+list\s+dikhao\b", lower))
    )
    if is_job_list:
        return RouterResult(intent="list_jobs", confidence=0.95, matched_rule="list_jobs")

    # --------------------------------------------------------------------------
    # 13B. PAGE HELP INTENT (v3) — "what is this page / what does this page
    # do / what is this screen for / is page pe kya hota hai". Checked before
    # the unknown fallback. Answered from page_context + the tms-pages-* KB
    # chunks (router.py), never from a canned reply.
    # --------------------------------------------------------------------------
    is_page_help = bool(
        re.search(
            r"\b(what\s+is\s+this\s+(?:page|screen)|what\s+does\s+this\s+(?:page|screen)\s+do|"
            r"what\s+is\s+this\s+(?:page|screen)\s+for|what\s+can\s+i\s+do\s+(?:here|on\s+this\s+page)|"
            r"what\s+is\s+the\s+purpose\s+of\s+this\s+page|explain\s+this\s+page|"
            r"is\s+page\s+pe\s+kya\s+hota\s+hai|is\s+page\s+ka\s+kya\s+kaam\s+hai|"
            r"yahan\s+kya\s+kar\s+sakte\s+hain|is\s+screen\s+par\s+kya\s+hota\s+hai)\b",
            lower,
        )
        or "इस पेज पर क्या होता है" in clean
        or "इस पेज का क्या काम है" in clean
    )
    if is_page_help:
        return RouterResult(intent="page_help", confidence=0.95, matched_rule="page_help")

    # --------------------------------------------------------------------------
    # 14. LR CREATION REQUESTS — NARROW RULE ONLY (v3).
    # Chat LR booking is REMOVED: there is no book_lr intent and no draft
    # ever opens from chat. An explicit request to create/book an LR
    # ("Mujhe LR book karni hai", "Delhi se Mumbai ek LR banao", "book an LR")
    # is classified as how_to_create_lr — a GUIDE to the LR form, never a
    # draft. REMOVED as too broad (reviewer fix): "send / ship / move /
    # transport ... to/from/se" patterns, route-only "X se Y" patterns, the
    # multi-field slot rule (§10B), and the has_active_draft shortcut that
    # returned book_lr for EVERY message while a draft was open (the sticky
    # draft: any message, including "hlo", re-entered booking). A message
    # with no explicit LR-creation verb now falls through to RAG + LLM.
    # --------------------------------------------------------------------------
    lr_guide_patterns = [
        r"\b(?:book|create|make|generate)\s+(?:an?\s+)?(?:lr|gr|bilty|consignment)\b",
        r"\b(?:lr|gr|bilty)\s+(?:book|create|banao|banaye|banana|bana\s+do|bana|book\s+karni|book\s+karna|book\s+karo|book\s+karein)\b",
        r"\b(?:mujhe\s+)?(?:lr|bilty)\s+book\s+karni\s+hai\b",
        # Mixed script: Latin "LR" + Devanagari verb ("LR बुक करना है").
        r"\b(?:lr|gr|bilty)\s+(?:बुक|बनाएं|बनाओ|बनाना|बना|बनानी)\b",
        r"एलआर\s+(?:बुक|बनाएं|बनाओ|बनाना)",
        r"बिल्टी\s+(?:बना|बनाएं|बनाओ)",
    ]
    is_lr_guide = any(re.search(p, lower) for p in lr_guide_patterns) or \
        ("एलआर बुक" in clean or "एलआर बना" in clean or "बिल्टी बना" in clean)

    if is_lr_guide:
        return RouterResult(
            intent="how_to_create_lr",
            confidence=0.95,
            entities_raw={},
            matched_rule="how_to_create_lr_explicit",
        )

    # --------------------------------------------------------------------------
    # 15. FALLBACK / UNKNOWN
    # If confidence < 0.7, returns unknown so copilot asks clarification question
    # --------------------------------------------------------------------------
    return RouterResult(
        intent="unknown",
        confidence=0.3,
        matched_rule="low_confidence_fallback",
    )


def extract_raw_booking_slots(text: str) -> Dict[str, Any]:
    """
    STRICT NO-INVENTION SLOT EXTRACTION FOR LR BOOKING.
    Follows Section 3.3 of specification:
    - consigner: string (verbatim, from user text)
    - consignee: string (verbatim)
    - fromCity: string (city name ONLY, verbatim)
    - toCity: string (city name ONLY, verbatim)
    - vehicleNumber: string (verbatim, validated)
    - freight: float
    - weightKg: float
    - packages: int (extracted from '10 boxes / 20 packages / 15 cartons / 5 box')
    - lrDate: date string (parses 'tomorrow' -> real date, defaults today)
    - urgency: string ('Urgent' if requested)

    Rules:
    - Verbatim only: Never expand "Delhi" to "Okhla Industrial Area, New Delhi".
    - Place words ONLY from route structures (from X to Y / X se Y).
    - Parse consigner/consignee by role labels (for, to, consigner, consignee).
    """
    clean = text.strip()
    lower = clean.lower()
    slots: Dict[str, Any] = {}

    # 1. Vehicle Number
    veh_num = extract_indian_vehicle_number(clean)
    if veh_num:
        slots["vehicleNumber"] = veh_num

    # 2. Packages (ADD this field, captures boxes/packages/cartons/bags)
    m_pkgs = re.search(r"\b([0-9]+)\s*(?:box(?:es)?|packages?|pkgs?|cartons?|nag|bags?|cases?|parcels?|डिब्बे|कार्टन|पैकेट)\b", clean, re.I)
    if m_pkgs:
        try:
            slots["packages"] = int(m_pkgs.group(1))
        except ValueError:
            pass

    # 3. Weight in Kg
    m_wt = re.search(r"\b([0-9]+(?:\.[0-9]+)?)\s*(?:kg|kgs|kilograms?|mt|tons?|tonnes?|टन|किलो)\b", clean, re.I)
    if m_wt:
        try:
            w_val = float(m_wt.group(1))
            unit = m_wt.group(0).lower()
            if "mt" in unit or "ton" in unit or "टन" in unit:
                slots["weightKg"] = w_val * 1000.0
            else:
                slots["weightKg"] = w_val
        except ValueError:
            pass

    # 4. Freight
    m_fr = re.search(r"\b(?:freight|bhada|rate|charges?|भाड़ा)\s*[:=]?\s*(?:₹\s*|rs\.?\s*)?([0-9]+(?:\.[0-9]+)?k?)\b", clean, re.I)
    if not m_fr:
        m_fr = re.search(r"\b(?:₹\s*|rs\.?\s*)([0-9]+(?:\.[0-9]+)?k?)\b", clean, re.I)
    if m_fr:
        try:
            val_str = m_fr.group(1).lower()
            mult = 1000.0 if "k" in val_str else 1.0
            slots["freight"] = float(val_str.replace("k", "")) * mult
        except ValueError:
            pass

    # 5. Date Parsing ("tomorrow" -> real date)
    if bool(re.search(r"\b(tomorrow|kal|कल)\b", lower)):
        tomorrow_date = date.today() + timedelta(days=1)
        slots["lrDate"] = tomorrow_date.isoformat()
    elif bool(re.search(r"\b(today|aaj|आज)\b", lower)):
        slots["lrDate"] = date.today().isoformat()

    # 6. Urgency
    if bool(re.search(r"\b(urgent|urgently|emergency|zaroori|ज़रूरी|तुरंत)\b", lower)):
        slots["urgency"] = "Urgent"

    # 7. Route Extraction (From / To / Se)
    # STRICT: Never use a word from the sentence as a place unless in route structure!
    # Non-city tokens that must be trimmed/excluded from city candidates
    TRAILING_CITY_NOISE = {
        "tomorrow", "today", "yesterday", "kal", "aaj", "ek", "do", "tin", "char",
        "urgent", "urgently", "lr", "gr", "bilty", "truck", "lorry", "boxes", "packages",
        "cartons", "pkgs", "freight", "rate", "rs", "rupees", "bhada", "advance",
        "and", "with", "for", "please", "karo", "banao", "banaye", "chahiye", "hai"
    }

    def clean_city_candidate(c: str) -> Optional[str]:
        if not c:
            return None
        words = [w for w in re.split(r"[\s,;]+", c.strip()) if w]
        # Strip leading noise words (e.g. "bana do", "do", "bilty", "ek")
        while words and (words[0].lower() in TRAILING_CITY_NOISE or words[0].lower() in STOP_WORDS):
            words.pop(0)
        # Keep multi-word like "New Delhi" or "Navi Mumbai"
        filtered = []
        for w in words:
            if w.lower() in TRAILING_CITY_NOISE or w.lower() in STOP_WORDS:
                break
            filtered.append(w)
        if not filtered:
            return None
        res = " ".join(filtered).strip().title()
        # Verify plausible city name: letters only, length >= 3
        if re.search(r"^[A-Za-z\u0900-\u097F\s]{3,30}$", res):
            return res
        return None

    # First check Consigner & Consignee by role labels (for, to, consigner, consignee)
    # Example: "Create LR for ABC Traders to XYZ Mart, Delhi to Mumbai"
    # -> consigner: "ABC Traders", consignee: "XYZ Mart"
    m_roles = re.search(
        r"\bfor\s+([A-Za-z0-9\s&.-]+?)\s+\bto\b\s+([A-Za-z0-9\s&.-]+?)(?:,\s*|\s+(?:from|route|delhi|mumbai|vehicle|freight|\b[A-Za-z]+\s+to\s+[A-Za-z]+)|$)",
        clean,
        re.I,
    )
    if m_roles:
        p1 = m_roles.group(1).strip()
        p2 = m_roles.group(2).strip()
        is_cargo_or_wt = bool(re.search(r"\b(?:[0-9]+|mt|tons?|tonnes?|kg|kgs|boxes?|cartons?|pkgs?|steel|cement|iron|pipes?|timber|cargo|goods|material|transport|shipment)\b", p1, re.I))
        if not is_cargo_or_wt and p1.lower() not in STOP_WORDS and p2.lower() not in STOP_WORDS:
            slots["consigner"] = p1.strip()
            slots["consignee"] = p2.strip()
        else:
            m_roles = None

    # Explicit consigner label
    if "consigner" not in slots:
        m_c = re.search(r"\b(?:consigner|consignor|shipper|sender|भेजने\s*वाले)\s*(?:is|:|=)?\s*([A-Za-z0-9\s&.-]+?)(?=[,;\n]|\s+(?:consignee|to|vehicle|freight)|$)", clean, re.I)
        if m_c:
            cand = m_c.group(1).strip()
            if cand.lower() not in STOP_WORDS:
                slots["consigner"] = cand

    # Explicit consignee label
    if "consignee" not in slots:
        m_ce = re.search(r"\b(?:consignee|receiver|पाने\s*वाले)\s*(?:is|:|=)?\s*([A-Za-z0-9\s&.-]+?)(?=[,;\n]|\s+(?:consigner|from|vehicle|freight)|$)", clean, re.I)
        if m_ce:
            cand = m_ce.group(1).strip()
            if cand.lower() not in STOP_WORDS:
                slots["consignee"] = cand

    # Hindi Consignee: "कंसाइनी श्याम स्टोर्स है"
    if "consignee" not in slots:
        m_hi_ce = re.search(r"कंसाइनी\s+([A-Za-z0-9\s&.-]+?)\s*(?:है|रखें|करें)", clean)
        if m_hi_ce:
            slots["consignee"] = m_hi_ce.group(1).strip()

    # Pattern A: English "from <City1> to <City2>"
    m_route_eng = re.search(
        r"\bfrom\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\s+\bto\b\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\b",
        clean,
        re.I,
    )
    if m_route_eng:
        c1 = clean_city_candidate(m_route_eng.group(1))
        c2 = clean_city_candidate(m_route_eng.group(2))
        if c1 and c2:
            slots["fromCity"] = c1
            slots["toCity"] = c2

    # Pattern Between: "between <City1> and <City2>"
    if "fromCity" not in slots:
        m_route_between = re.search(
            r"\bbetween\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\s+\band\b\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\b",
            clean,
            re.I,
        )
        if m_route_between:
            c1 = clean_city_candidate(m_route_between.group(1))
            c2 = clean_city_candidate(m_route_between.group(2))
            if c1 and c2:
                slots["fromCity"] = c1
                slots["toCity"] = c2

    # Pattern B: Hindi/Hinglish "<City1> se <City2>"
    if "fromCity" not in slots:
        m_route_hi = re.search(
            r"\b([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\s+(?:se|से)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\b",
            clean,
            re.I,
        )
        if m_route_hi:
            c1 = clean_city_candidate(m_route_hi.group(1))
            c2 = clean_city_candidate(m_route_hi.group(2))
            if c1 and c2:
                slots["fromCity"] = c1
                slots["toCity"] = c2

    # Pattern C: Route after comma or after party details: e.g. "..., Delhi to Mumbai"
    if "fromCity" not in slots:
        # Match only when preceded by comma, colon, or 'route' or after party definitions
        m_post_route = re.search(
            r"(?:,\s*|\broute\s*[:=]?\s*)([A-Za-z\u0900-\u097F]+)\s+\bto\b\s+([A-Za-z\u0900-\u097F]+)\b",
            clean,
            re.I,
        )
        if m_post_route:
            c1 = clean_city_candidate(m_post_route.group(1))
            c2 = clean_city_candidate(m_post_route.group(2))
            if c1 and c2:
                slots["fromCity"] = c1
                slots["toCity"] = c2

    # Pattern D: Direct "Send 15 cartons Chennai to Bengaluru" (only if no 'for Party to Party' matched those words)
    if "fromCity" not in slots and not m_roles:
        m_direct = re.search(
            r"\b([A-Za-z\u0900-\u097F]+)\s+\bto\b\s+([A-Za-z\u0900-\u097F]+)\b",
            clean,
            re.I,
        )
        if m_direct:
            c1_raw = m_direct.group(1).strip()
            c2_raw = m_direct.group(2).strip()
            # Guard against non-place words
            invalid_cities = STOP_WORDS | {"have", "pay", "need", "transport", "send", "ship", "want", "like", "order", "traders", "mart", "enterprises", "ltd", "pvt"}
            if c1_raw.lower() not in invalid_cities and c2_raw.lower() not in invalid_cities:
                c1 = clean_city_candidate(c1_raw)
                c2 = clean_city_candidate(c2_raw)
                if c1 and c2:
                    slots["fromCity"] = c1
                    slots["toCity"] = c2

    # Pattern E: Explicit labels ("Origin: Delhi", "Destination: Mumbai")
    if "fromCity" not in slots:
        m_o = re.search(r"\b(?:origin|loading|source)\s*(?:is|at|:|=)?\s*([A-Za-z\u0900-\u097F]+)\b", clean, re.I)
        if m_o:
            c1 = clean_city_candidate(m_o.group(1))
            if c1:
                slots["fromCity"] = c1
    if "toCity" not in slots:
        m_d = re.search(r"\b(?:destination|delivery|dest)\s*(?:is|at|:|=)?\s*([A-Za-z\u0900-\u097F]+)\b", clean, re.I)
        if m_d:
            c2 = clean_city_candidate(m_d.group(1))
            if c2:
                slots["toCity"] = c2

    return slots
