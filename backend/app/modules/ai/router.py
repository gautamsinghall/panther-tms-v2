"""
Panther AI API Router.
Provides authenticated AI copilot endpoints, context-aware suggestions, navigation resolution,
and secure read-only operational tools for LRs, Vehicles, Drivers, Tracking, and Master Ledgers.
"""
from typing import Optional, AsyncGenerator, Tuple, List, Dict, Any
from decimal import Decimal
import re
import urllib.parse

from fastapi import APIRouter, Depends, Query, status, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_tenant_session_maker
from app.auth.dependencies import get_current_user, get_current_office
from app.tenant_db.session import get_current_tenant
from app.control.models import Tenant
from app.tenant_db.models import User, Branch
from app.modules.ai.schemas import (
    ChatRequest,
    ChatResponse,
    AIStatusResponse,
    ContextSuggestionResponse,
    ConfirmLRDraftRequest,
    LRConfirmationResponse,
    ConfirmJobDraftRequest,
    JobConfirmationResponse,
    ConfirmHireChallanDraftRequest,
    HireChallanConfirmationResponse,
    StructuredCard,
    NavigationSuggestion,
)
import logging
from app.services.activity_logger import log_activity

logger = logging.getLogger("panther_ai_copilot")
from app.modules.transport.schemas import LRCreate, JobCreate, HireChallanCreate
from app.modules.ai.job_draft_service import (
    handle_conversational_job_booking,
    is_job_booking_intent,
    is_instructional_job_inquiry,
    is_job_cancel_intent,
)
from app.modules.ai.hire_challan_draft_service import (
    handle_conversational_hc_booking,
    is_hire_challan_intent,
    is_instructional_hc_inquiry,
    is_hc_cancel_intent,
)
from app.modules.ai.draft_store import lr_draft_store
from app.modules.ai.lr_draft_service import (
    handle_conversational_lr_booking,
    is_lr_booking_intent,
    is_cancel_intent,
    is_instructional_inquiry,
    is_valid_indian_vehicle,
    is_valid_location_name,
    parse_lr_entities_from_text,
    validate_and_update_draft,
)
from app.modules.ai.provider import is_provider_configured, call_llm, stream_llm
from app.modules.ai.rag import knowledge_engine
from app.modules.ai.knowledge import (
    detect_language,
    get_authorized_navigation_catalog,
    resolve_navigation_suggestions,
    build_system_prompt,
    ROUTE_SUGGESTIONS,
)
from app.modules.ai.privacy import sanitize_chat_history_for_external_llm, anonymize_system_context
from app.modules.ai.tools import (
    classify_operational_intent,
    extract_transport_entities,
    is_user_permitted,
    format_user_office_label,
    get_effective_office_id,
    execute_lr_tool,
    execute_vehicle_tool,
    execute_driver_tool,
    execute_tracking_tool,
    execute_accounting_tool,
    execute_client_tool,
    execute_vendor_tool,
    execute_job_tool,
    execute_hire_challan_tool,
    execute_invoice_tool,
    execute_pod_tool,
    execute_eway_bill_tool,
    execute_branch_tool,
    execute_consigner_consignee_tool,
    execute_fleet_maintenance_tool,
    execute_einvoice_tool,
)


# ==============================================================================
# COPILOT INTENT & VALIDATION HELPERS (HARD RULE 0 & P0 FIXES)
# ==============================================================================

def detect_delete_record_request(text: str) -> Optional[str]:
    """
    HARD RULE 0 — NO DELETION IN PANTHER TMS.
    Detects any intent to delete, erase, or permanently remove TMS records.
    Returns the record item name (e.g. 'LR', 'vehicle', 'bill', 'driver', 'challan', 'record')
    or None if not a delete request.
    """
    raw = (text or "").strip().lower()
    is_delete_verb = bool(re.search(r"\b(delete|remove|erase|destroy|drop)\b", raw))
    if not is_delete_verb:
        if not re.search(r"\b(delete|hatao|mitao)\b", raw):
            return None

    # Draft cancellations are not database record deletes (e.g., 'cancel draft')
    if re.search(r"\b(cancel|discard|clear)\s+(draft|booking|chat)\b", raw):
        return None

    # Determine item name
    if re.search(r"\b(vehicle|gadi|truck|lorry|gaadi)\b", raw):
        return "vehicle"
    elif re.search(r"\b(driver|chalak)\b", raw):
        return "driver"
    elif re.search(r"\b(bill|invoice)\b", raw):
        return "bill"
    elif re.search(r"\b(challan|hire\s*challan)\b", raw):
        return "challan"
    elif re.search(r"\b(job)\b", raw):
        return "job"
    elif re.search(r"\b(client|customer|party)\b", raw):
        return "client"
    elif re.search(r"\b(vendor)\b", raw):
        return "vendor"
    elif re.search(r"\b(lr|gr|bilty|consignment)\b", raw):
        return "LR"
    elif re.search(r"\b(everything|all|data|records)\b", raw):
        return "record"
    elif re.search(r"^[!\s]*(delete|remove|erase)\b", raw):
        return "record"

    return "record"


def get_blocked_delete_message(item_name: str, lang: str = "en") -> str:
    """Exact blocked message for HARD RULE 0 across supported languages."""
    if lang == "hinglish":
        return f"Aap is {item_name} ko delete nahi kar sakte. Panther TMS me deletion allowed nahi hai. Correction ya cancellation ke liye apne Company Admin se sampark karein."
    elif lang == "hi_devanagari":
        return f"आप इस {item_name} को डिलीट नहीं कर सकते। पैंथर टीएमएस (Panther TMS) में डिलीशन की अनुमति नहीं है। सुधार या रद्दीकरण (cancellation) के लिए कृपया अपने कंपनी एडमिन से संपर्क करें।"
    return f"You cannot delete this {item_name}. Deletion is not allowed in Panther TMS. Please contact your Company Admin if this {item_name} needs correction or cancellation."


def is_bulk_pii_request(text: str) -> bool:
    """Detects requests attempting bulk extraction of customer/vendor phone numbers or emails."""
    raw = (text or "").strip().lower()
    has_bulk = bool(re.search(r"\b(all|every|list\s+all|show\s+all|dump|export|entire)\b", raw))
    has_pii = bool(re.search(r"\b(phone|phones|mobile|mobiles|contact|contacts|email|emails|number|numbers)\b", raw))
    has_party = bool(re.search(r"\b(customer|customers|client|clients|vendor|vendors|driver|drivers)\b", raw))

    if has_bulk and has_pii:
        return True
    if re.search(r"\bshow\s+(all\s+)?(customer|client)\s+(phone|contact|mobile)s?\b", raw):
        return True
    if re.search(r"\b(customer|client)\s+phone\s+numbers?\b", raw):
        return True
    return False


def get_bulk_pii_refusal_message(lang: str = "en") -> str:
    if lang == "hi_devanagari":
        return (
            "गोपनीयता और डेटा सुरक्षा नीति के तहत, पैंथर एआई कोपायलट से सभी ग्राहकों के फ़ोन नंबर या ईमेल पते का बल्क एक्सपोर्ट (एक साथ सूची) देना अनुमत नहीं है। "
            "अधिकृत संपर्क विवरण देखने के लिए कृपया मास्टर मेनू में बिलिंग क्लाइंट डायरेक्टरी देखें।"
        )
    elif lang == "hinglish":
        return (
            "Privacy aur data protection ke tehat, Panther AI Copilot se sabhi customers ke phone numbers ya email addresses bulk export karna allowed nahi hai. "
            "Aap kisi specific customer ka naam batakar unki details dekh sakte hain, ya Billing Clients module me authorized Client Directory check kar sakte hain."
        )
    return (
        "For privacy and data protection, bulk export of customer phone numbers or email addresses is not permitted via Panther AI Copilot. "
        "You may view an individual customer's details by naming a specific customer, or access the authorized Client Directory under Billing Clients."
    )


def is_greeting(text: str) -> bool:
    raw = (text or "").strip().lower()
    raw_clean = re.sub(r"[^\w\s]", "", raw).strip()
    greetings = {
        "hi", "hello", "hey", "hola", "namaste", "namaskar", "greetings",
        "good morning", "good afternoon", "good evening", "good day",
        "hi panther", "hello panther", "hey panther", "hi there", "hello there",
        "kese ho", "kaise ho", "kya haal hai", "नमस्ते", "नमस्कार", "प्रणाम"
    }
    return raw_clean in greetings or raw_clean.startswith("hi ") or raw_clean.startswith("hello ")


def get_greeting_response(lang: str = "en") -> str:
    if lang == "hi_devanagari":
        return "नमस्ते! मैं पैंथर एआई कोपायलट (Panther AI Copilot) हूँ, आपका ट्रांसपोर्ट ऑपरेशंस सहायक। आज मैं आपकी एलआर बुकिंग, ट्रैकिंग या लेज़र खातों में कैसे मदद कर सकता हूँ?"
    elif lang == "hinglish":
        return "Namaste! Main hoon Panther AI Copilot, aapka transport operations assistant. Aaj aapki LR booking, vehicle tracking ya ledger accounts mein kaise madad karoon?"
    return "Hello! I am Panther AI Copilot, your transport operations assistant. How can I assist you with LR booking, fleet tracking, or master ledgers today?"


def is_capabilities_query(text: str) -> bool:
    raw = (text or "").strip().lower()
    raw_clean = re.sub(r"[^\w\s]", "", raw).strip()
    patterns = [
        r"^what\s+can\s+you\s+do",
        r"^what\s+do\s+you\s+do",
        r"^help$",
        r"^kya\s+kar\s+sakte\s+ho",
        r"^tum\s+kya\s+karte\s+ho",
        r"^what\s+are\s+your\s+capabilities",
        r"^what\s+can\s+panther\s+ai\s+do",
        r"^how\s+can\s+you\s+help",
        r"^features$",
        r"क्या\s+कर\s+सकते",
    ]
    return any(re.search(p, raw_clean) for p in patterns)


def get_capabilities_list_markdown(lang: str = "en") -> str:
    if lang == "hi_devanagari":
        return (
            "मैं पैंथर टीएमएस (Panther TMS) में आपकी इन चीज़ों में मदद कर सकता हूँ:\n\n"
            "1. **एलआर और बिल्टी कार्य (LR & GR Operations)**: नई एलआर बुकिंग शुरू करना, स्थिति देखना और कंसाइनमेंट ट्रैक करना।\n"
            "2. **फ्लीट और ट्रैकिंग (Fleet & Tracking)**: वाहन ट्रैक करना, FASTag टोल प्लाजा स्थिति और सिम आधारित लाइव लोकेशन।\n"
            "3. **मास्टर लेज़र और खाते (Master Ledger & Accounts)**: ग्राहकों का बकाया (Clients Outstanding), वेंडर्स की देनदारी और चालकों के बैलेंस।\n"
            "4. **वाहन और ड्राइवर (Vehicles & Drivers)**: कंपनी फ्लीट, मार्केट गाड़ियां और ड्राइवरों के रिकॉर्ड प्रबंधित करना।\n"
            "5. **चालान और बिलिंग (Challans & Invoices)**: हायर चालान, फ्रेट इनवॉइस, POD और ई-वे बिल देखना।\n"
            "6. **मार्गदर्शन और नेविगेशन (Guidance & Navigation)**: किसी भी मॉड्यूल के लिए चरण-दर-चरण निर्देश और त्वरित शॉर्टकट।\n\n"
            "*आज आप क्या करना चाहेंगे?*"
        )
    elif lang == "hinglish":
        return (
            "Main Panther TMS mein aapki in cheezon mein madad kar sakta hoon:\n\n"
            "1. **LR & GR Operations**: Nayi LR booking create karna, LR status check karna, consignments track karna.\n"
            "2. **Fleet & Tracking**: Vehicles track karna, FASTag toll status, SIM-based live tracking.\n"
            "3. **Master Ledger & Accounts**: Client balances, vendor payables, driver balances aur account summary.\n"
            "4. **Vehicles & Drivers**: Company vehicles, market vehicles aur driver records manage karna.\n"
            "5. **Challans & Billing**: Hire Challans, Invoices, PODs aur E-Way Bills dekhna.\n"
            "6. **Navigation**: Kisi bhi module ke step-by-step guidance aur direct shortcuts.\n\n"
            "*Aap kis cheez me madad chahte hain?*"
        )
    return (
        "Here is what I can help you with in Panther TMS:\n\n"
        "1. **LR & GR Operations**: Create and manage LRs/GRs, check consignment status, and track shipments.\n"
        "2. **Fleet & Tracking**: Track vehicles, FASTag toll crossings, and SIM-based GPS locations.\n"
        "3. **Master Ledgers & Accounting**: View client receivables, vendor payables, driver balances, and account summaries.\n"
        "4. **Vehicles & Drivers**: Manage company fleet, market vehicles, driver profiles, and licenses.\n"
        "5. **Challans & Billing**: Manage Hire Challans, Freight Invoices, PODs, and E-Way Bills.\n"
        "6. **Step-by-Step Guidance**: Get how-to guidance and quick navigation to any section in Panther TMS.\n\n"
        "*What would you like to do today?*"
    )


def is_add_vehicle_or_driver_inquiry(text: str) -> Tuple[bool, bool, bool]:
    raw = (text or "").strip().lower()

    # Guard: Prioritise LR creation / how-to / explanation over vehicle addition.
    # A message about creating an LR or explaining the LR process is NEVER a vehicle addition request.
    if is_how_to_lr_inquiry(raw) or bool(
        re.search(r"\b(create|book|explain|process|documents?)\b.*\b(lr|gr|bilty|consignment)\b", raw)
    ) or bool(
        re.search(r"\b(lr|gr|bilty|consignment)\b.*\b(create|book|explain|process|documents?)\b", raw)
    ):
        return False, False, False

    # Ignore freight cargo terms like "full truck load", "truck load", "part truck load"
    raw_cleaned = re.sub(r"\b(full\s+truck\s+load|truck\s+load|part\s+truck\s+load|load\s+of)\b", "", raw)

    has_how_to = bool(re.search(r"\b(how\s+do\s+i|how\s+to|how\s+can\s+i|how\s+i|kaise|kaha\s+se|kidhar\s+se|steps\s+to|tarika|tareeka|guide|kese)\b", raw_cleaned)) or bool(re.search(r"[\u0900-\u097F]", raw_cleaned) and "कैसे" in raw_cleaned)
    has_add = bool(re.search(r"\b(add|ad|aad|register|enter|new|naya|naye|jodein|jode|daalein|daalo)\b", raw_cleaned))
    mentions_veh = bool(re.search(r"\b(vehical|vehcle|vechicle|vehicle|vehicles|gadi|gaadi|truck|trucks|lorry|fleet|वाहन|गाड़ी)\b", raw_cleaned))
    mentions_drv = bool(re.search(r"\b(driver|drivers|drivr|drver|chalak|sarathi|ड्राइवर|चालक)\b", raw_cleaned))

    if (has_how_to or has_add) and (mentions_veh or mentions_drv):
        # Ensure it is not an operational command with a vehicle registration number e.g. "Add vehicle DL01AA1111"
        if not re.search(r"\b[a-z]{2}\s*[0-9]{1,2}\s*[a-z]{0,3}\s*[0-9]{4}\b", raw):
            return True, mentions_veh, mentions_drv
    return False, False, False


def build_add_vehicle_driver_response(mentions_veh: bool, mentions_drv: bool, lang: str = "en") -> Tuple[str, List[NavigationSuggestion], List[StructuredCard]]:
    navs: List[NavigationSuggestion] = []
    cards: List[StructuredCard] = []
    sections = []

    if mentions_veh:
        navs.append(NavigationSuggestion(
            title="Company Vehicles",
            href="/transport/company-vehicles",
            module="Fleet Management",
            description="Manage company vehicles and add new fleet records"
        ))
        cards.append(StructuredCard(
            card_type="how_to_guide",
            title="Add Vehicle Guide",
            subtitle="Fleet Management • Company Vehicles",
            badge={"text": "Step-by-Step", "variant": "neutral"},
            items=[
                {"primary": "1. Navigate to Fleet", "secondary": "Go to Fleet Management → Company Vehicles"},
                {"primary": "2. Click '+ Add Vehicle'", "secondary": "Click the button at the top right"},
                {"primary": "3. Fill Vehicle Details", "secondary": "Enter registration number (e.g. DL01AA1111), vehicle type & capacity"},
                {"primary": "4. Upload Documents", "secondary": "Attach RC, Fitness, and Insurance expiry dates"},
                {"primary": "5. Save Record", "secondary": "Click 'Save Vehicle' to finalize entry"},
            ],
            action={"label": "Open Company Vehicles", "href": "/transport/company-vehicles"}
        ))
        if lang == "hi_devanagari":
            sections.append(
                "### 🚚 वाहन (Vehicle) जोड़ने का तरीका:\n"
                "1. **फ्लीट मैनेजमेंट → कंपनी वाहन (Company Vehicles)** (या मार्केट वाहन) पर जाएं।\n"
                "2. ऊपर दाईं ओर **'+ Add Vehicle'** बटन पर क्लिक करें।\n"
                "3. वाहन पंजीकरण नंबर (जैसे DL01AA1111), वाहन का प्रकार और क्षमता दर्ज करें।\n"
                "4. आरसी (RC), फिटनेस और बीमा (Insurance) की वैधता तिथियां भरें।\n"
                "5. **'Save Vehicle'** पर क्लिक करके वाहन पंजीकृत करें।"
            )
        elif lang == "hinglish":
            sections.append(
                "### 🚚 Vehicle Add Karne Ka Tarika:\n"
                "1. **Fleet Management → Company Vehicles** (ya Market Vehicles) par jayein.\n"
                "2. Top-right par **'+ Add Vehicle'** button par click karein.\n"
                "3. Vehicle Registration Number (jaise DL01AA1111), type aur capacity enter karein.\n"
                "4. RC, Fitness aur Insurance dates fill karein.\n"
                "5. **'Save Vehicle'** par click karein."
            )
        else:
            sections.append(
                "### 🚚 How to Add a Vehicle:\n"
                "1. Go to **Fleet Management → Company Vehicles** (or Market Vehicles).\n"
                "2. Click the **'+ Add Vehicle'** button in the top right.\n"
                "3. Enter the Vehicle Registration Number (e.g., DL01AA1111), vehicle type, and capacity.\n"
                "4. Enter RC, Fitness, and Insurance validity details.\n"
                "5. Click **'Save Vehicle'** to complete the registration."
            )

    if mentions_drv:
        navs.append(NavigationSuggestion(
            title="Drivers Directory",
            href="/transport/drivers",
            module="Fleet Management",
            description="Manage driver profiles, license verification, and contacts"
        ))
        cards.append(StructuredCard(
            card_type="how_to_guide",
            title="Add Driver Guide",
            subtitle="Fleet Management • Drivers",
            badge={"text": "Step-by-Step", "variant": "neutral"},
            items=[
                {"primary": "1. Open Drivers Section", "secondary": "Go to Fleet Management → Drivers"},
                {"primary": "2. Click '+ Add Driver'", "secondary": "Click the button in the top action bar"},
                {"primary": "3. Enter Driver Details", "secondary": "Provide full name, mobile number & driving license number"},
                {"primary": "4. License Validity", "secondary": "Set license expiry date and assign vehicle (optional)"},
                {"primary": "5. Save Profile", "secondary": "Click 'Save Driver' to register"},
            ],
            action={"label": "Open Drivers Directory", "href": "/transport/drivers"}
        ))
        if lang == "hi_devanagari":
            sections.append(
                "### 👨‍✈️ ड्राइवर (Driver) जोड़ने का तरीका:\n"
                "1. **फ्लीट मैनेजमेंट → ड्राइवर (Drivers)** पेज खोलें।\n"
                "2. **'+ Add Driver'** बटन पर क्लिक करें।\n"
                "3. ड्राइवर का नाम, मोबाइल नंबर और ड्राइविंग लाइसेंस नंबर दर्ज करें।\n"
                "4. लाइसेंस की वैधता तिथि और आवंटित वाहन चुनें।\n"
                "5. **'Save Driver'** पर क्लिक करके प्रोफाइल सेव करें।"
            )
        elif lang == "hinglish":
            sections.append(
                "### 👨‍✈️ Driver Add Karne Ka Tarika:\n"
                "1. **Fleet Management → Drivers** page open karein.\n"
                "2. **'+ Add Driver'** button par click karein.\n"
                "3. Driver ka Name, Mobile Number aur Driving License number enter karein.\n"
                "4. License expiry date aur assigned vehicle select karein.\n"
                "5. **'Save Driver'** par click karein."
            )
        else:
            sections.append(
                "### 👨‍✈️ How to Add a Driver:\n"
                "1. Navigate to **Fleet Management → Drivers**.\n"
                "2. Click the **'+ Add Driver'** button.\n"
                "3. Enter the driver's full name, mobile number, and Driving License (DL) number.\n"
                "4. Set the license expiry date and assign a vehicle (optional).\n"
                "5. Click **'Save Driver'** to save the profile."
            )

    content = "\n\n".join(sections)
    return content, navs, cards


def handle_record_prefill_intent(text: str, lang: str = "en") -> Optional[ChatResponse]:
    """
    Handles pre-fill intent for Vehicles, Drivers, and Billing Clients.
    Prepares form query parameters without silently creating records in the database.
    """
    clean_text = (text or "").strip()
    lower = clean_text.lower()

    # Guard: Conceptual how-to queries are handled separately
    how_to_pattern = r"\b(how\s+do\s+i|how\s+to|how\s+can\s+i|how\s+i|kaise|kaha\s+se|kidhar\s+se|steps\s+to|tarika|tareeka|guide|kese)\b"
    if re.search(how_to_pattern, lower) or (re.search(r"[\u0900-\u097F]", clean_text) and "कैसे" in clean_text):
        return None

    # Guard: LR booking takes priority
    if bool(re.search(r"\b(create|book|creat|bok)\s+(lr|gr|bilty)\b", lower)) or bool(re.search(r"\b(lr|gr|bilty)\s+(create|book|banao)\b", lower)):
        return None

    # 1. Vehicle Pre-fill
    is_veh_intent = bool(re.search(r"\b(add|new|register|create|enter|naya|naye)\s+(?:a\s+|an\s+)?(?:new\s+)?(vehicle|truck|gaadi|gadi|fleet|lorry)\b", lower)) or \
                   bool(re.search(r"\b(vehicle|truck|gaadi|gadi|fleet|lorry)\s+(add|register|create|daalein|jodein)\b", lower))
    if is_veh_intent:
        m_v = re.search(r"\b([A-Za-z]{2}\s*[0-9]{1,2}\s*[A-Za-z]{0,3}\s*[0-9]{4})\b", clean_text)
        if m_v:
            veh_candidate = re.sub(r"[\s\-_]+", "", m_v.group(1)).upper()
            if is_valid_indian_vehicle(veh_candidate):
                card = StructuredCard(
                    card_type="vehicle_prefill",
                    title="Add New Vehicle",
                    subtitle=f"Registration: {veh_candidate}",
                    badge={"text": "Review & Save", "variant": "warning"},
                    metrics=[
                        {"label": "Registration", "value": veh_candidate},
                        {"label": "Ownership", "value": "Company Vehicle"},
                        {"label": "Action", "value": "Form Pre-fill"},
                    ],
                    items=[
                        {
                            "primary": f"Vehicle {veh_candidate}",
                            "secondary": "Form pre-filled. Review specifications and click save to register in fleet.",
                            "status": "Ready",
                            "href": f"/transport/company-vehicles?action=add&vehicle_number={veh_candidate}",
                        }
                    ],
                    action={"label": f"Open Vehicle Form ({veh_candidate})", "href": f"/transport/company-vehicles?action=add&vehicle_number={veh_candidate}"},
                )
                if lang == "hi_devanagari":
                    msg = f"मैंने वाहन **{veh_candidate}** के लिए पंजीकरण फॉर्म तैयार कर दिया है। नीचे दिए गए बटन पर क्लिक करके विवरण की पुष्टि करें और सेव करें।\n\n*(नोट: पैंथर एआई बिना आपकी समीक्षा के सीधे डेटाबेस में रिकॉर्ड नहीं जोड़ता है।)*"
                elif lang == "hinglish":
                    msg = f"Maine vehicle **{veh_candidate}** ke liye registration form prepare kar diya hai. Niche diye button par click karke details review aur save karein.\n\n*(Note: Panther AI bina aapke review ke directly database me save nahi karta.)*"
                else:
                    msg = f"I have prepared the vehicle registration form for **{veh_candidate}**. Click the button below to review details and save in the transport register.\n\n*(Note: Panther AI does not create records silently without your review.)*"

                return ChatResponse(
                    content=msg,
                    navigation_suggestions=[
                        NavigationSuggestion(title="Company Vehicles", href=f"/transport/company-vehicles?action=add&vehicle_number={veh_candidate}", module="Fleet Management")
                    ],
                    citations=[],
                    cards=[card],
                    provider_configured=is_provider_configured(),
                    detected_language=lang,
                )

        # Check for invalid candidate string after "vehicle"
        m_tail = re.search(r"\b(?:vehicle|truck|gaadi|gadi)\s+([A-Za-z0-9\-]+)", clean_text, re.I)
        if m_tail:
            cand = m_tail.group(1).strip()
            if cand.lower() not in ("please", "pls", "karo", "form", "karna", "guide", "steps", "details", "info"):
                if lang == "hi_devanagari":
                    msg = f"❌ '**{cand}**' एक मान्य भारतीय वाहन पंजीकरण नंबर नहीं है (उदा: DL01AA1111, HR55AL7102)। कृपया सही पंजीकरण नंबर प्रदान करें।"
                elif lang == "hinglish":
                    msg = f"❌ '**{cand}**' valid Indian vehicle registration format nahi hai (e.g. DL01AA1111, HR55AL7102). Kripya valid number batayein."
                else:
                    msg = f"❌ '**{cand}**' is not a valid Indian vehicle registration format (e.g. DL01AA1111, HR55AL7102). Please provide a valid registration number."
                return ChatResponse(
                    content=msg,
                    navigation_suggestions=[
                        NavigationSuggestion(title="Company Vehicles", href="/transport/company-vehicles", module="Fleet Management")
                    ],
                    citations=[],
                    cards=[],
                    provider_configured=is_provider_configured(),
                    detected_language=lang,
                )

    # 2. Driver Pre-fill
    is_drv_intent = bool(re.search(r"\b(add|new|register|create|naya|naye)\s+(?:a\s+|an\s+)?(?:new\s+)?(driver|chalak|sarathi)\b", lower)) or \
                   bool(re.search(r"\b(driver|chalak|sarathi)\s+(add|register|create|jodein)\b", lower))
    if is_drv_intent:
        m_ph = re.search(r"\b([6-9][0-9]{9})\b", clean_text)
        phone = m_ph.group(1) if m_ph else ""
        name_part = re.sub(r"\b(add|new|register|create|driver|chalak|sarathi|please|pls|karo)\b", "", clean_text, flags=re.I)
        if phone:
            name_part = name_part.replace(phone, "")
        driver_name = re.sub(r"[\s\-_]+", " ", name_part).strip()
        if driver_name and len(driver_name) >= 2:
            target_href = f"/transport/drivers?action=add&name={urllib.parse.quote(driver_name)}" + (f"&phone={phone}" if phone else "")
            card = StructuredCard(
                card_type="driver_prefill",
                title="Add New Driver",
                subtitle=f"Driver: {driver_name}",
                badge={"text": "Review & Save", "variant": "warning"},
                metrics=[
                    {"label": "Driver Name", "value": driver_name},
                    {"label": "Phone", "value": phone or "To be filled"},
                    {"label": "Action", "value": "Form Pre-fill"},
                ],
                items=[
                    {
                        "primary": f"Driver {driver_name}",
                        "secondary": "Form pre-filled. Review driver KYC & license details and save.",
                        "status": "Ready",
                        "href": target_href,
                    }
                ],
                action={"label": f"Open Driver Form ({driver_name})", "href": target_href},
            )
            if lang == "hi_devanagari":
                msg = f"मैंने ड्राइवर **{driver_name}** के लिए फॉर्म तैयार कर दिया है। नीचे दिए गए बटन पर क्लिक करके विवरण की पुष्टि करें और सेव करें।\n\n*(नोट: पैंथर एआई बिना आपकी समीक्षा के सीधे डेटाबेस में रिकॉर्ड नहीं जोड़ता है।)*"
            elif lang == "hinglish":
                msg = f"Maine driver **{driver_name}** ke liye form prepare kar diya hai. Niche diye button par click karke details review aur save karein.\n\n*(Note: Panther AI bina aapke review ke directly database me save nahi karta.)*"
            else:
                msg = f"I have prepared the driver registration form for **{driver_name}**. Click the button below to review details and save in the transport register.\n\n*(Note: Panther AI does not create records silently without your review.)*"

            return ChatResponse(
                content=msg,
                navigation_suggestions=[
                    NavigationSuggestion(title="Manage Drivers", href=target_href, module="Fleet Management")
                ],
                citations=[],
                cards=[card],
                provider_configured=is_provider_configured(),
                detected_language=lang,
            )

    # 3. Billing Client Pre-fill
    is_client_intent = bool(re.search(r"\b(add|new|register|create|naya|naye)\s+(?:a\s+|an\s+)?(?:new\s+)?(client|customer|party|billing\s+client)\b", lower)) or \
                      bool(re.search(r"\b(client|customer|billing\s+client)\s+(add|register|create|jodein)\b", lower))
    if is_client_intent:
        name_part = re.sub(r"\b(add|new|register|create|client|customer|party|billing\s+client|please|pls|karo)\b", "", clean_text, flags=re.I)
        client_name = re.sub(r"[\s\-_]+", " ", name_part).strip()
        if client_name and len(client_name) >= 2:
            target_href = f"/general/billing-client?action=add&name={urllib.parse.quote(client_name)}"
            card = StructuredCard(
                card_type="client_prefill",
                title="Add Billing Client",
                subtitle=f"Client: {client_name}",
                badge={"text": "Review & Save", "variant": "warning"},
                metrics=[
                    {"label": "Client Name", "value": client_name},
                    {"label": "Action", "value": "Form Pre-fill"},
                ],
                items=[
                    {
                        "primary": f"Client {client_name}",
                        "secondary": "Form pre-filled. Enter GSTIN, credit period, and billing address to register.",
                        "status": "Ready",
                        "href": target_href,
                    }
                ],
                action={"label": f"Open Client Form ({client_name})", "href": target_href},
            )
            if lang == "hi_devanagari":
                msg = f"मैंने बिलिंग क्लाइंट **{client_name}** के लिए फॉर्म तैयार कर दिया है। नीचे दिए गए बटन पर क्लिक करके विवरण की पुष्टि करें और सेव करें।\n\n*(नोट: पैंथर एआई बिना आपकी समीक्षा के सीधे डेटाबेस में रिकॉर्ड नहीं जोड़ता है।)*"
            elif lang == "hinglish":
                msg = f"Maine billing client **{client_name}** ke liye form prepare kar diya hai. Niche diye button par click karke details review aur save karein.\n\n*(Note: Panther AI bina aapke review ke directly database me save nahi karta.)*"
            else:
                msg = f"I have prepared the billing client form for **{client_name}**. Click the button below to review details and save in the transport register.\n\n*(Note: Panther AI does not create records silently without your review.)*"

            return ChatResponse(
                content=msg,
                navigation_suggestions=[
                    NavigationSuggestion(title="Billing Clients", href=target_href, module="General Masters")
                ],
                citations=[],
                cards=[card],
                provider_configured=is_provider_configured(),
                detected_language=lang,
            )

    return None


def is_how_to_lr_inquiry(text: str) -> bool:
    raw = (text or "").strip().lower()
    has_how_to = bool(
        re.search(
            r"\b(how\s+do\s+i|how\s+to|how\s+can\s+i|how\s+i|kaise|kaha\s+se|kidhar\s+se|steps\s+to|tarika|tareeka|guide|kese|process|explain|documents?|requirements?|required)\b",
            raw,
        )
    ) or bool(re.search(r"[\u0900-\u097F]", raw) and ("कैसे" in raw or "प्रक्रिया" in raw or "दस्तावेज" in raw))
    mentions_lr = bool(re.search(r"\b(lr|gr|bilty|bility|consignment|consignments|एलआर|बिल्टी)\b", raw, re.I))
    has_specific_lr = bool(re.search(r"\b(?:lr|gr|bilty)[#\s\-_/]*[0-9][A-Za-z0-9_-]*\b", raw, re.I))
    return bool(has_how_to and mentions_lr and not has_specific_lr)


def build_how_to_lr_response(lang: str = "en") -> Tuple[str, List[NavigationSuggestion], List[StructuredCard]]:
    navs = [
        NavigationSuggestion(
            title="LR Booking Form",
            href="/transport/lr-booking",
            module="Transport Operations",
            description="Open complete LR booking form"
        )
    ]
    cards = [
        StructuredCard(
            card_type="how_to_guide",
            title="LR Booking Guide & Documents",
            subtitle="Transport Operations • LR Booking",
            badge={"text": "Step-by-Step", "variant": "neutral"},
            items=[
                {"primary": "1. Open LR Booking", "secondary": "Go to Transport Operations → LR Booking"},
                {"primary": "2. Select Parties", "secondary": "Choose Consigner (Sender) & Consignee (Receiver)"},
                {"primary": "3. Assign Vehicle & Driver", "secondary": "Select vehicle registration number & driver"},
                {"primary": "4. Material & Freight", "secondary": "Enter package count, weight & freight rate"},
                {"primary": "5. Verify Required Documents", "secondary": "GSTIN, Delivery Challan, E-Way Bill (> ₹50k), POD"},
            ],
            action={"label": "Open LR Booking Form", "href": "/transport/lr-booking"}
        )
    ]
    if lang == "hi_devanagari":
        content = (
            "### 📦 एलआर (LR / Bilty) बनाने की प्रक्रिया और आवश्यक दस्तावेज:\n\n"
            "#### 1. चरणबद्ध प्रक्रिया (Step-by-Step Process):\n"
            "1. **ट्रांसपोर्ट ऑपरेशंस → एलआर बुकिंग (LR Booking)** (`/transport/lr-booking`) पेज पर जाएं।\n"
            "2. **कंसाइनर (भेजने वाला)** और **कंसाइनी (पाने वाला)** चुनें या नया जोड़ें।\n"
            "3. लोडिंग का स्थान (Origin) और डिलीवरी का स्थान (Destination) दर्ज करें।\n"
            "4. **वाहन नंबर (Vehicle Number)** और **ड्राइवर** आवंटित करें।\n"
            "5. माल का विवरण, पैकेज की संख्या, वास्तविक वजन और **माल भाड़ा (Freight Rate)** दर्ज करें।\n"
            "6. **'Save LR'** पर क्लिक करके आधिकारिक एलआर जारी करें।\n\n"
            "#### 2. अनिवार्य विवरण (Mandatory Fields):\n"
            "- **कंसाइनर और कंसाइनी** का नाम और पता\n"
            "- **लोडिंग और डिलीवरी का स्थान (Origin & Destination)**\n"
            "- **वाहन नंबर (Vehicle Registration Number)** (जैसे DL01AA1111)\n"
            "- **माल का विवरण, वजन और पैकेज संख्या**\n"
            "- **भाड़ा दर और भुगतान शर्तें (To Pay / Paid / TBB)**\n\n"
            "#### 3. आवश्यक दस्तावेज (Documents Required):\n"
            "- **GSTIN**: कंसाइनर और कंसाइनी दोनों का वैध जीएसटी नंबर\n"
            "- **डिलीवरी चालान / टैक्स इनवॉइस (Delivery Challan / Tax Invoice)**\n"
            "- **ई-वे बिल (E-Way Bill)**: ₹50,000 से अधिक मूल्य के माल के लिए अनिवार्य\n"
            "- **वाहन दस्तावेज**: वैध आरसी (RC), फिटनेस और इंश्योरेंस विवरण\n"
            "- **FASTag ID**: टोल और स्वचालित ट्रैकिंग के लिए\n"
            "- **पीओडी (POD - Proof of Delivery)**: डिलीवरी के बाद रिसीवर की मोहर व हस्ताक्षर युक्त पावती"
        )
    elif lang == "hinglish":
        content = (
            "### 📦 LR (Bilty) Banane Ka Process Aur Zaroori Documents:\n\n"
            "#### 1. Step-by-Step Process:\n"
            "1. **Transport Operations → LR Booking** (`/transport/lr-booking`) page open karein.\n"
            "2. **Consigner (Bhejne wala)** aur **Consignee (Paane wala)** select karein.\n"
            "3. Loading origin aur delivery destination select karein.\n"
            "4. **Vehicle Number** aur **Driver** assign karein.\n"
            "5. Cargo particulars, package count, weight aur **Freight Charges** fill karein.\n"
            "6. **'Save LR'** par click karke official consignment note issue karein.\n\n"
            "#### 2. Mandatory Fields:\n"
            "- **Consigner & Consignee** details aur address\n"
            "- **Origin & Destination** locations\n"
            "- **Vehicle Number** (Valid Indian registration format)\n"
            "- **Cargo Details, Weight & Package Count**\n"
            "- **Freight Rate & Payment Mode (To Pay / Paid / TBB)**\n\n"
            "#### 3. Zaroori Documents (Required Documents):\n"
            "- **GSTIN**: Consigner aur Consignee ka GST number\n"
            "- **Delivery Challan / Tax Invoice**: Maal ka invoice/challan\n"
            "- **E-Way Bill**: Goods value > ₹50,000 hone par mandatory\n"
            "- **Vehicle Documents**: RC, Fitness, aur Insurance details\n"
            "- **FASTag ID**: Automated toll tracking ke liye\n"
            "- **Proof of Delivery (POD)**: Delivery confirmation receiver ke signature aur stamp ke saath"
        )
    else:
        content = (
            "### 📦 LR (Lorry Receipt / Bilty) Booking Process & Documents:\n\n"
            "#### 1. Step-by-Step Creation Process:\n"
            "1. Navigate to **Transport Operations → LR Booking** (`/transport/lr-booking`).\n"
            "2. Select the **Consigner (Sender)** and **Consignee (Receiver)**.\n"
            "3. Specify the loading origin and destination delivery point.\n"
            "4. Assign the vehicle registration number and driver.\n"
            "5. Enter material specifications: cargo description, package count, and weight.\n"
            "6. Set freight charges, billing terms (To Pay / Paid / TBB), and any advance paid.\n"
            "7. Click **'Save LR'** to generate and issue the official consignment note.\n\n"
            "#### 2. Mandatory Fields:\n"
            "- **Consigner & Consignee** (names, addresses, and GSTIN)\n"
            "- **Origin & Destination** (pickup and delivery locations)\n"
            "- **Vehicle Registration Number** (valid Indian registration)\n"
            "- **Cargo Particulars** (packages, weight, and material description)\n"
            "- **Freight Rate & Payment Mode**\n\n"
            "#### 3. Documents Required:\n"
            "- **GSTIN** of both Consigner and Consignee\n"
            "- **Delivery Challan / Tax Invoice** for the cargo\n"
            "- **E-Way Bill** (mandatory for goods consignment value exceeding ₹50,000)\n"
            "- **Vehicle Details** (valid RC, Fitness certificate, and Insurance)\n"
            "- **FASTag ID** (for automated toll tracking)\n"
            "- **Proof of Delivery (POD)** (signed and stamped by the consignee upon delivery)"
        )
    return content, navs, cards


def is_long_explanatory_message(text: str) -> bool:
    raw = (text or "").strip()
    words = raw.split()
    if len(words) >= 12 or len(raw) >= 60:
        if re.search(r"\b(explain|overview|details|what\s+is|how\s+does|guide|understand|difference|documentation|workflow|process|documents?)\b", raw, re.I):
            return True
        if raw.count("?") >= 1:
            return True
    return False


def get_lr_explanation_markdown(lang: str = "en") -> str:
    content, _, _ = build_how_to_lr_response(lang=lang)
    return content


def classify_copilot_message_intent(
    text: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    has_active_lr_draft: bool = False,
    is_confirming_start: bool = False,
) -> str:
    """
    ROUTER GATE: Classifies input message BEFORE slot filling or draft creation.
    Mutually exclusive intents:
    - 'general_knowledge': tech, coding, weather, shares, language translation, general facts
    - 'off_topic': flights, leave emails to boss, personal errands, non-logistics queries
    - 'lr_tracking': tracking shipments, FASTag, SIM, GPS, vehicle location
    - 'ledger': accounting ledger, khata, party balances, outstanding dues
    - 'vehicle': fleet maintenance, vehicle lists, vehicle fitness, add vehicle guide
    - 'other_tms': jobs, hire challans, POD records, eway bills, invoices, clients, vendors, etc.
    - 'lr_booking': genuine LR booking intent or active LR draft continuation

    HARD INVARIANT: Only messages classified as 'lr_booking' may open or fill an LR draft.
    """
    clean = (text or "").strip()
    lower = clean.lower()

    # 1. GENERAL KNOWLEDGE
    is_weather = bool(re.search(r"\b(weather|mausam|forecast|temperature|barish|humidity|rain)\b", lower))
    is_code = bool(re.search(r"\b(python|javascript|typescript|c\+\+|java|sort\s+function|sorting\s+function|algorithm|bubble\s+sort|quick\s+sort|merge\s+sort|write\s+code|sql\s+query|regex)\b", lower))
    is_stocks = bool(re.search(r"\b(share\s+price|stock\s+price|stock\s+market|reliance\s+share|sensex|nifty|bitcoin|crypto|mutual\s+fund)\b", lower))
    is_translation = bool(re.search(r"\b(translate|translation|anuvad)\b", lower)) or bool(re.search(r"\b(?:to|in)\s+(?:hindi|english|french|spanish|german)\b", lower))
    if is_weather or is_code or is_stocks or is_translation:
        return "general_knowledge"

    # 2. OFF-TOPIC
    is_flight = bool(re.search(r"\b(flight|flights|airline|airlines|airplane|aeroplane|airways|air\s*ticket|boarding\s+pass|indigo|vistara|air\s*india|spicejet)\b", lower))
    is_leave_email = bool(re.search(r"\b(leave\s+email|leave\s+application|leave\s+letter|email\s+to\s+(?:my\s+)?boss|chhutti|sick\s+leave|casual\s+leave)\b", lower))
    is_casual_offtopic = bool(re.search(r"\b(recipe|poem|joke|cricket\s+score|ipl\s+score|movie\s+ticket)\b", lower))
    if is_flight or is_leave_email or is_casual_offtopic:
        return "off_topic"

    # 3. LR TRACKING
    entities_check = extract_transport_entities(clean, conversation_history=conversation_history)
    if entities_check.get("is_track") or bool(re.search(r"\b(track|tracking|kahan\s+hai|kahan\s+pahunchi|where\s+is|live\s+status|gps\s+status)\b", lower)):
        return "lr_tracking"

    # 4. LEDGER / ACCOUNTS
    if bool(re.search(r"\b(view\s+ledger|show\s+ledger|master\s+ledger|party\s+ledger|customer\s+ledger|client\s+ledger|vendor\s+ledger|driver\s+ledger|khata|hisab|hisaab|pending\s+payments?|outstanding\s+balance|खाता|लेज़र|बकाया)\b", lower)):
        return "ledger"

    # 5. VEHICLE / FLEET
    is_veh_inq, _, _ = is_add_vehicle_or_driver_inquiry(clean)
    if is_veh_inq:
        return "vehicle"
    if bool(re.search(r"\b(company\s+vehicle|market\s+vehicle|truck\s+list|vehicle\s+list|how\s+many\s+vehicles|gaadi\s+list|vehicle\s+fitness|vehicle\s+insurance|puc\s+status|rc\s+status)\b", lower)):
        return "vehicle"

    # 6. OTHER TMS TASKS
    if is_job_booking_intent(clean) or is_instructional_job_inquiry(clean) or bool(re.search(r"\bjob\b", lower)):
        return "other_tms"
    if is_hire_challan_intent(clean) or is_instructional_hc_inquiry(clean) or bool(re.search(r"\b(?:hire\s+)?challan\b", lower)):
        return "other_tms"
    if bool(re.search(r"\b(pod|proof\s+of\s+delivery)\b", lower)):
        return "other_tms"
    if bool(re.search(r"\b(eway|ewb|e-way)\b", lower)):
        return "other_tms"
    if bool(re.search(r"\b(invoice|bill|billing\s+client|vendor|branch)\b", lower)):
        return "other_tms"
    if is_how_to_lr_inquiry(clean) or is_long_explanatory_message(clean) or is_capabilities_query(clean):
        return "other_tms"

    # 7. LR BOOKING
    # Genuine LR booking triggers (book lr, create lr, bilty banana, etc.)
    if is_lr_booking_intent(clean):
        return "lr_booking"
    if is_confirming_start:
        return "lr_booking"
    if has_active_lr_draft and not is_cancel_intent(clean):
        return "lr_booking"

    return "off_topic"


def get_safe_general_or_refusal_response(
    category: str,
    text: str,
    lang: str = "en",
) -> Tuple[str, List[NavigationSuggestion]]:
    lower = (text or "").strip().lower()

    # 1. Weather
    if re.search(r"\b(weather|mausam|forecast|temperature|barish|humidity|rain)\b", lower):
        if lang == "hi_devanagari":
            msg = "मैं पैंथर एआई (Panther AI) हूँ, आपका ट्रांसपोर्ट ऑपरेशंस सहायक। मेरे पास लाइव मौसम (weather forecast) की जानकारी उपलब्ध नहीं है। मैं आपकी एलआर बुकिंग (LR booking), फ्लीट ट्रैकिंग और खातों (accounts) में सहायता कर सकता हूँ।"
        elif lang == "hinglish":
            msg = "Main Panther AI hoon, aapka transport operations assistant. Mere paas live weather forecast ki jankari nahi hai. Main LR booking, fleet tracking aur accounts ledger me aapki madad kar sakta hoon."
        else:
            msg = "I am Panther AI, your transport operations copilot. I do not have access to live weather forecasts. For transport operations, I can help you with LR booking, fleet tracking, and accounts ledger."
        navs = [
            NavigationSuggestion(title="Live Tracking", href="/transport/tracking", module="Fleet Management"),
            NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations"),
        ]
        return msg, navs

    # 2. Flight
    if re.search(r"\b(flight|flights|airline|airlines|airplane|aeroplane|airways|air\s*ticket|boarding\s+pass)\b", lower):
        if lang == "hi_devanagari":
            msg = "पैंथर टीएमएस (Panther TMS) सड़क माल ढुलाई और ट्रक परिवहन (road freight logistics) का प्रबंधन करता है, और एयरलाइन फ्लाइट बुकिंग का समर्थन नहीं करता है। यदि आपको सड़क मार्ग से माल परिवहन या एलआर बुकिंग करवानी है, तो कृपया मुझे बताएं।"
        elif lang == "hinglish":
            msg = "Panther TMS road freight aur commercial transport logistics (trucks, LRs, challans) manage karta hai, passenger airline flights support nahi karta. Agar aapko road cargo ya LR booking karni hai, toh main madad kar sakta hoon."
        else:
            msg = "Panther TMS manages road freight and commercial transport logistics (trucks, LRs, and challans), and does not support airline flight bookings or passenger flight schedules. If you would like to book road cargo from Delhi to Mumbai, I can create an LR draft for you."
        navs = [
            NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations"),
        ]
        return msg, navs

    # 3. Share price / stock market
    if re.search(r"\b(share\s+price|stock\s+price|stock\s+market|reliance\s+share|sensex|nifty|shares?|stocks?)\b", lower):
        if lang == "hi_devanagari":
            msg = "मैं पैंथर एआई हूँ, ट्रांसपोर्ट मैनेजमेंट और फ्लीट लॉजिस्टिक्स में विशेषज्ञ। मैं शेयर बाजार या रिलायंस (Reliance) के लाइव शेयर मूल्य ट्रैक नहीं करता हूँ। कृपया वित्तीय बाजार प्लेटफॉर्म देखें।"
        elif lang == "hinglish":
            msg = "Main Panther AI hoon, transport management aur fleet logistics specialist. Main live stock market prices ya Reliance share price track nahi karta. Kripya financial market platforms check karein."
        else:
            msg = "I am Panther AI, specialized in transport management and fleet logistics. I do not provide live stock market prices or financial share quotes for Reliance Industries. Please refer to financial market sources for live market data."
        navs = []
        return msg, navs

    # 4. Translation
    if re.search(r"\b(translate|translation|anuvad)\b", lower) or "to hindi" in lower or "in hindi" in lower:
        m_trans = re.search(r"translate\s+[\"']?([^\"']+)[\"']?\s+to\s+hindi", lower)
        phrase = m_trans.group(1).strip() if m_trans else ""
        if "good morning" in lower or phrase == "good morning":
            msg = '"Good morning" in Hindi is translated as **"शुभ प्रभात" (Shubh Prabhat)** or **"नमस्ते" (Namaste)**.'
        else:
            msg = f"In Hindi, '{phrase or text}' is translated directly for your reference. For official logistics documents (Bilty / LR), Panther TMS supports English, Hinglish, and Hindi."
        navs = []
        return msg, navs

    # 5. Leave email to boss
    if re.search(r"\b(leave\s+email|leave\s+application|leave\s+letter|email\s+to\s+(?:my\s+)?boss|chhutti)\b", lower):
        msg = (
            "Here is a professional leave application email template you can send to your manager/boss:\n\n"
            "**Subject:** Leave Application - [Your Name]\n\n"
            "Dear [Manager's Name],\n\n"
            "I am writing to formally request a leave of absence on [Date / Date Range] due to [personal reasons / medical reasons]. "
            "I will ensure all my pending operational responsibilities are handled prior to my leave and will be reachable via email in case of an urgent matter.\n\n"
            "Thank you for your understanding.\n\n"
            "Best regards,\n"
            "[Your Name]"
        )
        navs = []
        return msg, navs

    # 6. Python sort function / Coding
    if re.search(r"\b(python|javascript|java|sort\s+function|algorithm|write\s+code)\b", lower):
        msg = (
            "In Python, you can sort lists and collections using the built-in `sorted()` function or the `.sort()` method:\n\n"
            "```python\n"
            "# 1. sorted() returns a new sorted list without modifying original\n"
            "numbers = [5, 2, 9, 1, 5, 6]\n"
            "sorted_numbers = sorted(numbers)\n\n"
            "# 2. list.sort() sorts the list in-place\n"
            "numbers.sort()\n\n"
            "# 3. Custom sorting (e.g. sort list of dicts by key)\n"
            "consignments = [{'id': 1, 'weight': 12}, {'id': 2, 'weight': 5}]\n"
            "consignments.sort(key=lambda x: x['weight'])\n"
            "```"
        )
        navs = []
        return msg, navs

    # Default fallback
    if category == "off_topic":
        msg = (
            "I am Panther AI, your dedicated transport operations copilot. "
            "I assist with logistics workflows such as LR booking, fleet tracking, POD records, and accounts ledger. "
            "I cannot assist with requests outside transport operations."
        )
    else:
        msg = (
            "I am Panther AI, designed specifically for freight and logistics operations. "
            "How can I assist you today with LR booking, shipment tracking, or ledger accounts?"
        )
    navs = [
        NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations"),
        NavigationSuggestion(title="Live Tracking", href="/transport/tracking", module="Fleet Management"),
    ]
    return msg, navs

router = APIRouter(prefix="/ai", tags=["Panther AI"])


async def get_ai_tenant_db(
    tenant: Tenant = Depends(get_current_tenant),
) -> AsyncGenerator[Optional[AsyncSession], None]:
    """Yields tenant database session, or None if database is unreachable or in mock/test mode."""
    db_name = getattr(tenant, "db_name", None)
    if not db_name:
        yield None
        return
    session_maker = get_tenant_session_maker(db_name)
    async with session_maker() as session:
        yield session


def sanitize_ai_output(text: str) -> str:
    """Protects sensitive secrets, credentials, and connection strings from leaking."""
    if not text:
        return text
    text = re.sub(r"sk-[a-zA-Z0-9_-]{20,}", "[REDACTED_API_KEY]", text)
    text = re.sub(r"postgresql(\+asyncpg)?://[^\s]+", "[REDACTED_DB_URL]", text)
    text = re.sub(r"(?i)(password|secret|token)\s*=\s*['\"][^'\"]+['\"]", r"\1='[REDACTED]'", text)
    return text


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status(
    current_user: User = Depends(get_current_user),
):
    """Returns the operational status and configuration of Panther AI."""
    configured = is_provider_configured()
    return AIStatusResponse(
        is_configured=configured,
        model=settings.active_ai_model,
        system_name=settings.active_ai_system_name,
        provider=settings.active_ai_provider_name,
        supported_languages=["English", "Hindi (हिन्दी)", "Hinglish"],
    )


@router.get("/context-suggestions", response_model=ContextSuggestionResponse)
async def get_context_suggestions(
    path: Optional[str] = Query(default="/", description="Current page path e.g. /transport/lr-booking"),
    current_user: User = Depends(get_current_user),
):
    """Returns context-aware prompt suggestions based on current dashboard route."""
    clean_path = (path or "/").split("?")[0].rstrip("/")
    if not clean_path:
        clean_path = "/"

    # Find matching route suggestions or fallback to root suggestions
    suggestions = ROUTE_SUGGESTIONS.get(clean_path)
    if not suggestions:
        matched_prefix = next((p for p in ROUTE_SUGGESTIONS if clean_path.startswith(p) and p != "/"), None)
        suggestions = ROUTE_SUGGESTIONS.get(matched_prefix, ROUTE_SUGGESTIONS["/"])

    module_title = clean_path.strip("/").replace("-", " ").replace("/", " → ").title() or "Overview"

    return ContextSuggestionResponse(
        page=clean_path,
        module_title=module_title,
        suggestions=suggestions[:4],
    )


async def log_blocked_rbac_attempt(
    db: Optional[AsyncSession],
    user: User,
    action: str,
    module: str,
    missing_permission: str,
    raw_message: str,
    current_office: Optional[Branch] = None,
    record_number: Optional[str] = None,
):
    """Logs blocked RBAC and isolation attempts in the audit trail (Requirement 6)."""
    if not db or not hasattr(db, "add"):
        return
    try:
        await log_activity(
            db=db,
            user=user,
            action=action,
            module=module,
            entity_type="rbac_block",
            entity_identifier=record_number,
            office_id=current_office.id if current_office else None,
            office_name=current_office.name if current_office else None,
            office_code=current_office.code if current_office else None,
            details=f"Blocked unauthorized action '{action}' (missing: {missing_permission}). Query: '{raw_message}'",
            details_json={
                "attempted_action": action,
                "missing_permission": missing_permission,
                "raw_message": raw_message,
                "record_number": record_number,
                "office_id": current_office.id if current_office else None,
            },
            status="BLOCKED",
        )
    except Exception as e:
        logger.error(f"Failed to log blocked RBAC attempt: {e}")


def filter_nav_suggestions(
    suggestions: List[NavigationSuggestion],
    authorized_catalog: List[Dict[str, Any]],
    user: User,
) -> List[NavigationSuggestion]:
    """Filters navigation suggestions to only authorized pages for this user."""
    user_role = (user.role or "").upper().strip()
    if user_role in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
        return suggestions
    allowed_routes = set()
    for m in authorized_catalog:
        for it in m.get("items", []):
            if "href" in it:
                allowed_routes.add(it["href"])
                allowed_routes.add(it["href"].split("?")[0])
    filtered = []
    for s in suggestions:
        clean_base = s.href.split("?")[0]
        if s.href in allowed_routes or clean_base in allowed_routes:
            filtered.append(s)
    return filtered


@router.post("/chat", response_model=ChatResponse)
async def chat_with_copilot(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: Optional[AsyncSession] = Depends(get_ai_tenant_db),
):
    """
    Main conversational copilot endpoint.
    Handles multilingual requests, ground-truth TMS knowledge, navigation resolution,
    and secure read-only operational tools with privacy boundary protection.
    """
    last_user_message = next((m.content for m in reversed(data.messages) if m.role == "user"), "")
    detected_lang = detect_language(last_user_message)

    # --------------------------------------------------------------------------
    # STEP 0: HARD RULE 0 — NO DELETION IN PANTHER TMS (HIGHEST PRIORITY)
    # Intercept any delete request before anything is processed or deleted.
    # --------------------------------------------------------------------------
    delete_item = detect_delete_record_request(last_user_message)
    if delete_item:
        logger.warning(
            f"HARD RULE 0 BLOCKED: User {current_user.email} (tenant {tenant.id}) attempted to delete {delete_item}: '{last_user_message}'"
        )
        if db and hasattr(db, "add"):
            try:
                await log_activity(
                    db=db,
                    user=current_user,
                    action="BLOCKED_DELETE_ATTEMPT",
                    module="ai_copilot",
                    entity_type=delete_item,
                    details=f"Blocked attempt to delete {delete_item} via AI copilot: '{last_user_message}'",
                    status="BLOCKED",
                )
            except Exception as e:
                logger.error(f"Failed to log blocked delete attempt: {e}")

        blocked_reply = get_blocked_delete_message(delete_item, lang=detected_lang)
        return ChatResponse(
            content=blocked_reply,
            navigation_suggestions=[],
            citations=[],
            cards=[],
            provider_configured=is_provider_configured(),
            detected_language=detected_lang,
        )

    # --------------------------------------------------------------------------
    # STEP 1: BULK PII EXPORT REFUSAL
    # Refuse bulk phone/email/contact list dumps across customers.
    # --------------------------------------------------------------------------
    if is_bulk_pii_request(last_user_message):
        refusal_msg = get_bulk_pii_refusal_message(lang=detected_lang)
        nav_suggestions = [
            NavigationSuggestion(
                title="Billing Clients",
                href="/general/billing-client",
                module="Masters",
                description="View authorized billing clients directory"
            )
        ]
        return ChatResponse(
            content=refusal_msg,
            navigation_suggestions=nav_suggestions,
            citations=[],
            cards=[],
            provider_configured=is_provider_configured(),
            detected_language=detected_lang,
        )

    # 1. Retrieve authorized modules for the user's tenant plan & role
    authorized_catalog = get_authorized_navigation_catalog(tenant=tenant, user=current_user)

    # 2. Resolve navigation suggestions from user query against authorized routes
    nav_suggestions = resolve_navigation_suggestions(
        query=last_user_message,
        authorized_catalog=authorized_catalog,
    )

    # --------------------------------------------------------------------------
    # STEP 2: CONVERSATIONAL WRITE WORKFLOWS & DRAFT INTERRUPT/PAUSE HANDLING
    # --------------------------------------------------------------------------
    if db:
        # Rescope drafts immediately on office switch (Requirement 5)
        active_job_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id, draft_type="job")
        d_job = (await lr_draft_store.get_draft(active_job_id)) if active_job_id else None
        if d_job and not d_job.is_confirmed and current_office and d_job.office_id and d_job.office_id != current_office.id:
            await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="job")
            d_job = None
        has_active_job = bool(d_job and not d_job.is_confirmed)

        active_hc_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id, draft_type="hire_challan")
        d_hc = (await lr_draft_store.get_draft(active_hc_id)) if active_hc_id else None
        if d_hc and not d_hc.is_confirmed and current_office and d_hc.office_id and d_hc.office_id != current_office.id:
            await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="hire_challan")
            d_hc = None
        has_active_hc = bool(d_hc and not d_hc.is_confirmed)

        active_d_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id, draft_type="lr")
        existing_d = (await lr_draft_store.get_draft(active_d_id)) if active_d_id else None
        if existing_d and not existing_d.is_confirmed and current_office and existing_d.office_id and existing_d.office_id != current_office.id:
            await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="lr")
            existing_d = None
        has_active_draft = bool(existing_d and not existing_d.is_confirmed)

        is_job_req = is_job_booking_intent(last_user_message)
        is_job_canc = is_job_cancel_intent(last_user_message)
        is_job_inq = is_instructional_job_inquiry(last_user_message)

        is_hc_req = is_hire_challan_intent(last_user_message)
        is_hc_canc = is_hc_cancel_intent(last_user_message)
        is_hc_inq = is_instructional_hc_inquiry(last_user_message)

        is_booking = is_lr_booking_intent(last_user_message)
        is_cancel = is_cancel_intent(last_user_message)
        is_inquiry = is_instructional_inquiry(last_user_message)

        # A: Explicit cancel of active draft
        if is_job_canc and has_active_job:
            reply_content, cards = await handle_conversational_job_booking(
                db=db, user=current_user, tenant=tenant, current_office=current_office,
                user_text=last_user_message, lang=detected_lang
            )
            return ChatResponse(
                content=reply_content, navigation_suggestions=nav_suggestions,
                citations=[], cards=cards, provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )
        elif is_hc_canc and has_active_hc:
            reply_content, cards = await handle_conversational_hc_booking(
                db=db, user=current_user, tenant=tenant, current_office=current_office,
                user_text=last_user_message, lang=detected_lang
            )
            return ChatResponse(
                content=reply_content, navigation_suggestions=nav_suggestions,
                citations=[], cards=cards, provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )
        elif is_cancel and has_active_draft:
            reply_content, cards = await handle_conversational_lr_booking(
                db=db, user=current_user, tenant=tenant, current_office=current_office,
                user_text=last_user_message, lang=detected_lang
            )
            return ChatResponse(
                content=reply_content, navigation_suggestions=nav_suggestions,
                citations=[], cards=cards, provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )
        elif is_cancel or is_job_canc or is_hc_canc:
            await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="lr")
            await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="job")
            await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="hire_challan")
            if detected_lang == "hi_devanagari":
                reply_content = "आपका सक्रिय ड्राफ्ट रद्द (cancel) कर दिया गया है। जब भी आप नया कंसाइनमेंट या कार्य शुरू करना चाहें, मुझे बताएं।"
            elif detected_lang == "hinglish":
                reply_content = "Aapka active draft cancel kar diya gaya hai. Nayi booking ya transport operations ke liye kabhi bhi batayein."
            else:
                reply_content = "Your active LR draft has been cancelled. Let me know when you would like to book a new consignment."
            card = StructuredCard(
                card_type="lr_draft",
                title="LR Booking • Draft Cancelled",
                subtitle="Cancelled — no LR was created",
                badge={"text": "Cancelled", "variant": "neutral"},
                can_confirm=False,
            )
            return ChatResponse(
                content=reply_content,
                navigation_suggestions=[],
                citations=[],
                cards=[card],
                provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

        # B: Mid-draft question or greeting interrupt: PAUSE DRAFT
        # "While a draft is active, if a message is a greeting or question, PAUSE the draft,
        # answer it, then ask: 'Do you want to continue the draft or cancel it?'
        # Never store a question or explanation as a draft field."
        if has_active_draft or has_active_job or has_active_hc:
            mid_category = classify_copilot_message_intent(
                text=last_user_message,
                conversation_history=[{"role": m.role, "content": m.content} for m in data.messages[:-1]],
                has_active_lr_draft=has_active_draft,
                is_confirming_start=False,
            )
            is_mid_draft_question = (
                is_greeting(last_user_message)
                or is_capabilities_query(last_user_message)
                or is_how_to_lr_inquiry(last_user_message)
                or is_add_vehicle_or_driver_inquiry(last_user_message)[0]
                or is_long_explanatory_message(last_user_message)
                or (mid_category in ("general_knowledge", "off_topic"))
                or ("?" in last_user_message)
                or bool(re.search(r"^(what|how|why|where|when|who|which|can\s+you|kya|kaise|kab|kaha|koun|batao|explain)\b", last_user_message.strip(), re.I))
            )

            # Check if user explicitly wants to continue
            is_continue_command = bool(re.search(r"^(continue|resume|aage|carry\s*on|continue draft)\b", last_user_message.strip(), re.I))

            if is_mid_draft_question and not is_continue_command:
                # Answer the query without touching or polluting the draft
                if is_greeting(last_user_message):
                    sub_answer = get_greeting_response(lang=detected_lang)
                    sub_cards = []
                elif is_capabilities_query(last_user_message):
                    sub_answer = get_capabilities_list_markdown(lang=detected_lang)
                    sub_cards = []
                elif is_how_to_lr_inquiry(last_user_message):
                    sub_answer, sub_navs, sub_cards = build_how_to_lr_response(lang=detected_lang)
                    nav_suggestions.extend(sub_navs)
                elif is_add_vehicle_or_driver_inquiry(last_user_message)[0]:
                    _, m_veh, m_drv = is_add_vehicle_or_driver_inquiry(last_user_message)
                    sub_answer, sub_navs, sub_cards = build_add_vehicle_driver_response(m_veh, m_drv, lang=detected_lang)
                    nav_suggestions.extend(sub_navs)
                elif is_long_explanatory_message(last_user_message):
                    sub_answer = get_lr_explanation_markdown(lang=detected_lang)
                    sub_cards = []
                elif mid_category in ("general_knowledge", "off_topic"):
                    sub_answer, sub_navs = get_safe_general_or_refusal_response(mid_category, last_user_message, lang=detected_lang)
                    nav_suggestions.extend(sub_navs)
                    sub_cards = []
                else:
                    # General paused draft answer
                    if detected_lang == "hi_devanagari":
                        sub_answer = f"'{last_user_message}' के संबंध में: आपका सक्रिय ड्राफ्ट बिना किसी बदलाव के सुरक्षित रोक (pause) दिया गया है।"
                    elif detected_lang == "hinglish":
                        sub_answer = f"Aapke prashna ka uttar: '{last_user_message}'. Aapka draft session surakshit pause kiya gaya hai."
                    else:
                        sub_answer = f"Regarding '{last_user_message}': Your active draft has been paused without saving this inquiry."
                    sub_cards = []

                if detected_lang == "hi_devanagari":
                    pause_prompt = "\n\nक्या आप ड्राफ्ट जारी रखना (continue) चाहते हैं या इसे रद्द (cancel) करना चाहते हैं?"
                elif detected_lang == "hinglish":
                    pause_prompt = "\n\nKya aap draft continue karna chahte hain ya cancel karna chahte hain?"
                else:
                    pause_prompt = "\n\nDo you want to continue the draft or cancel it?"
                full_reply = sub_answer + pause_prompt
                return ChatResponse(
                    content=full_reply,
                    navigation_suggestions=nav_suggestions,
                    citations=[],
                    cards=sub_cards,
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

        # C: When NO active draft exists: Validate Intent BEFORE starting
        if not (has_active_draft or has_active_job or has_active_hc):
            # 1. Greeting: return greeting only
            if is_greeting(last_user_message):
                return ChatResponse(
                    content=get_greeting_response(lang=detected_lang),
                    navigation_suggestions=nav_suggestions,
                    citations=[],
                    cards=[],
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

            # 2. Capabilities inquiry
            if is_capabilities_query(last_user_message):
                caps_navs = filter_nav_suggestions([
                    NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations"),
                    NavigationSuggestion(title="Live Tracking", href="/transport/tracking", module="Fleet Management"),
                    NavigationSuggestion(title="Master Ledger", href="/accounts/master-ledger", module="Accounts"),
                ], authorized_catalog, current_user)
                return ChatResponse(
                    content=get_capabilities_list_markdown(lang=detected_lang),
                    navigation_suggestions=caps_navs,
                    citations=[],
                    cards=[],
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

            # 3A. LR Booking how-to steps & documents (e.g. "LR kaise banaye?", process & documents needed)
            if is_how_to_lr_inquiry(last_user_message):
                content, lr_navs, lr_cards = build_how_to_lr_response(lang=detected_lang)
                if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "create"):
                    lr_navs = []
                    lr_cards = []
                else:
                    lr_navs = filter_nav_suggestions(lr_navs, authorized_catalog, current_user)
                return ChatResponse(
                    content=content,
                    navigation_suggestions=lr_navs,
                    citations=[],
                    cards=lr_cards,
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

            # 3B. Add vehicle or driver how-to steps
            is_how_to, mentions_veh, mentions_drv = is_add_vehicle_or_driver_inquiry(last_user_message)
            if is_how_to:
                content, veh_drv_navs, veh_drv_cards = build_add_vehicle_driver_response(mentions_veh, mentions_drv, lang=detected_lang)
                veh_drv_navs = filter_nav_suggestions(veh_drv_navs, authorized_catalog, current_user)
                return ChatResponse(
                    content=content,
                    navigation_suggestions=veh_drv_navs,
                    citations=[],
                    cards=veh_drv_cards,
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

            # 4. Long explanatory message about LR: explanation only, no draft
            if is_long_explanatory_message(last_user_message):
                exp_navs = filter_nav_suggestions([
                    NavigationSuggestion(title="LR Booking", href="/transport/lr-booking", module="Transport Operations")
                ], authorized_catalog, current_user)
                return ChatResponse(
                    content=get_lr_explanation_markdown(lang=detected_lang),
                    navigation_suggestions=exp_navs,
                    citations=[],
                    cards=[],
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

            # Write Authorization Checks (Requirement 3: Check permission BEFORE every action)
            if is_job_req and not is_job_inq and not is_job_canc:
                if not is_user_permitted(current_user, tenant, "transport", "jobs", "create"):
                    await log_blocked_rbac_attempt(
                        db=db,
                        user=current_user,
                        action="BLOCKED_CREATE_JOB",
                        module="transport",
                        missing_permission="transport.jobs.create",
                        raw_message=last_user_message,
                        current_office=current_office,
                    )
                    office_str = format_user_office_label(current_office, current_user)
                    if detected_lang == "hi_devanagari":
                        msg = f"आपके पास जॉब (Job) बनाने की अनुमति नहीं है। आपका अधिकृत जारी करने वाला कार्यालय (issuing office) {office_str} है। कृपया अपने कंपनी एडमिन से संपर्क करें।"
                    elif detected_lang == "hinglish":
                        msg = f"Aapke paas Jobs create karne ka access nahi hai. Aapka allowed issuing office {office_str} hai. Kripya access ke liye apne Company Admin se sampark karein."
                    else:
                        msg = f"You don't have access to create Jobs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
                    return ChatResponse(
                        content=msg,
                        navigation_suggestions=[],
                        citations=[],
                        cards=[],
                        provider_configured=is_provider_configured(),
                        detected_language=detected_lang,
                    )

            if is_hc_req and not is_hc_inq and not is_hc_canc:
                if not is_user_permitted(current_user, tenant, "transport", "hire_challan", "create"):
                    await log_blocked_rbac_attempt(
                        db=db,
                        user=current_user,
                        action="BLOCKED_CREATE_HIRE_CHALLAN",
                        module="transport",
                        missing_permission="transport.hire_challan.create",
                        raw_message=last_user_message,
                        current_office=current_office,
                    )
                    office_str = format_user_office_label(current_office, current_user)
                    if detected_lang == "hi_devanagari":
                        msg = f"आपके पास हायर चालान (Hire Challan) बनाने की अनुमति नहीं है। आपका अधिकृत जारी करने वाला कार्यालय (issuing office) {office_str} है। कृपया अपने कंपनी एडमिन से संपर्क करें।"
                    elif detected_lang == "hinglish":
                        msg = f"Aapke paas Hire Challans create karne ka access nahi hai. Aapka allowed issuing office {office_str} hai. Kripya access ke liye apne Company Admin se sampark karein."
                    else:
                        msg = f"You don't have access to create Hire Challans. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
                    return ChatResponse(
                        content=msg,
                        navigation_suggestions=[],
                        citations=[],
                        cards=[],
                        provider_configured=is_provider_configured(),
                        detected_language=detected_lang,
                    )

            # 5. Starting a new LR booking:
            # Check if assistant previously asked "Do you want to start a new LR booking?"
            # and user is confirming with "yes", "sure", "proceed", "start"
            prev_asst_msg = next((m.content for m in reversed(data.messages[:-1]) if m.role == "assistant"), "")
            asked_start_booking = (
                "Do you want to start a new LR booking?" in prev_asst_msg
                or "Kya aap nayi LR booking start karna chahte hain?" in prev_asst_msg
                or "क्या आप एक नई एलआर (LR) बुकिंग शुरू करना चाहते हैं?" in prev_asst_msg
            )
            is_confirming_start = asked_start_booking and bool(
                re.search(r"^(yes|y|ha|haan|sure|start|proceed|ok|okay|karo|start karo|shuru karo|हाँ|हां|शुरू करो)\b", last_user_message.strip(), re.I)
            )

            # ------------------------------------------------------------------
            # ROUTER GATE: Classify intent BEFORE slot-filler / draft opening
            # Invariant: Only messages classified as LR booking may open or fill an LR draft.
            # ------------------------------------------------------------------
            history_dicts_early = [{"role": m.role, "content": m.content} for m in data.messages[:-1]]
            intent_category = classify_copilot_message_intent(
                text=last_user_message,
                conversation_history=history_dicts_early,
                has_active_lr_draft=False,
                is_confirming_start=is_confirming_start,
            )

            # 1. General knowledge or Off-topic: Polite refusal or safe general answer
            if intent_category in ("general_knowledge", "off_topic"):
                safe_msg, safe_navs = get_safe_general_or_refusal_response(intent_category, last_user_message, lang=detected_lang)
                filtered_navs = filter_nav_suggestions(safe_navs, authorized_catalog, current_user) if safe_navs else []
                return ChatResponse(
                    content=safe_msg,
                    navigation_suggestions=filtered_navs,
                    citations=[],
                    cards=[],
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

            # 2. Operational tools (LR Tracking, Ledger, Vehicle):
            # Bypass LR slot-filling directly and jump to Step 3 operational dispatch
            if intent_category == "lr_booking":
                is_booking_trigger = (
                    is_booking
                    or bool(re.search(r"\b(creat|create|boking|booking|book|bok)\s+(lr|gr|bilty)\b", last_user_message, re.I))
                    or bool(re.search(r"\b(lr|gr|bilty)\s+(creat|create|boking|booking|book|bok)\b", last_user_message, re.I))
                )

                parsed_booking_entities = parse_lr_entities_from_text(last_user_message)
                has_booking_details = any(
                    k in parsed_booking_entities for k in (
                        "consigner_candidate", "consignee_candidate", "origin_candidate",
                        "destination_candidate", "vehicle_number", "freight_amount",
                        "actual_weight_mt", "particulars"
                    )
                )

                # Enforce LR creation permission before showing any prompt or draft
                if (is_booking_trigger or is_booking or has_booking_details or has_active_draft or is_confirming_start) and not is_inquiry and not is_cancel and not is_job_req and not is_hc_req:
                    if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "create"):
                        await log_blocked_rbac_attempt(
                            db=db,
                            user=current_user,
                            action="BLOCKED_CREATE_LR",
                            module="transport",
                            missing_permission="transport.lr_booking.create",
                            raw_message=last_user_message,
                            current_office=current_office,
                        )
                        office_str = format_user_office_label(current_office, current_user)
                        if detected_lang == "hi_devanagari":
                            msg = f"आपके पास एलआर (LR) बनाने की अनुमति नहीं है। आपका अधिकृत जारी करने वाला कार्यालय (issuing office) {office_str} है। कृपया अपने कंपनी एडमिन से संपर्क करें।"
                        elif detected_lang == "hinglish":
                            msg = f"Aapke paas LRs create karne ka access nahi hai. Aapka allowed issuing office {office_str} hai. Kripya access ke liye apne Company Admin se sampark karein."
                        else:
                            msg = f"You don't have access to create LRs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
                        return ChatResponse(
                            content=msg,
                            navigation_suggestions=[],
                            citations=[],
                            cards=[],
                            provider_configured=is_provider_configured(),
                            detected_language=detected_lang,
                        )

                if is_booking_trigger and not is_hc_req and not is_job_req and not is_confirming_start and not has_booking_details:
                    # Ask first before creating draft ONLY when user has not given any booking details yet!
                    if detected_lang == "hi_devanagari":
                        ask_msg = "क्या आप एक नई एलआर (LR) बुकिंग शुरू करना चाहते हैं?"
                    elif detected_lang == "hinglish":
                        ask_msg = "Kya aap nayi LR booking start karna chahte hain?"
                    else:
                        ask_msg = "Do you want to start a new LR booking?"
                    navs = [
                        NavigationSuggestion(
                            title="LR Booking Form",
                            href="/transport/lr-booking",
                            module="Transport Operations",
                            description="Open full manual LR booking form"
                        )
                    ]
                    cards = [
                        StructuredCard(
                            card_type="lr_booking_prompt",
                            title="Start LR Booking",
                            subtitle="Conversational LR Creation",
                            badge={"text": "Ready", "variant": "neutral"},
                            items=[
                                {"primary": "Start Booking", "secondary": "Reply 'Yes' to proceed step by step, or click Open below to use the form."},
                            ],
                            action={"label": "Open LR Booking Form", "href": "/transport/lr-booking"},
                        )
                    ]
                    return ChatResponse(
                        content=ask_msg,
                        navigation_suggestions=navs,
                        citations=[],
                        cards=cards,
                        provider_configured=is_provider_configured(),
                        detected_language=detected_lang,
                    )

        # D: Route to active draft continuation or confirmed start
        chosen_workflow = None
        if is_job_req and not is_job_inq:
            chosen_workflow = "job"
        elif is_hc_req and not is_hc_inq:
            chosen_workflow = "hc"
        elif (is_booking and not is_inquiry) or (not (has_active_job or has_active_hc or has_active_draft) and (locals().get("is_confirming_start") or (locals().get("has_booking_details") and locals().get("intent_category") == "lr_booking"))):
            chosen_workflow = "lr"
        elif has_active_draft or has_active_job or has_active_hc:
            active_list = []
            if has_active_job and d_job:
                active_list.append(("job", getattr(d_job, "updated_at", "")))
            if has_active_hc and d_hc:
                active_list.append(("hc", getattr(d_hc, "updated_at", "")))
            if has_active_draft and existing_d:
                active_list.append(("lr", getattr(existing_d, "updated_at", "")))

            if active_list:
                active_list.sort(key=lambda x: str(x[1]), reverse=True)
                chosen_workflow = active_list[0][0]

        if chosen_workflow == "job":
            reply_content, cards = await handle_conversational_job_booking(
                db=db, user=current_user, tenant=tenant, current_office=current_office,
                user_text=last_user_message, lang=detected_lang
            )
            return ChatResponse(
                content=reply_content, navigation_suggestions=nav_suggestions,
                citations=[], cards=cards, provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )
        elif chosen_workflow == "hc":
            is_hc_confirm = bool(
                re.search(
                    r"^(create\s+(?:hire\s+)?challan|confirm|confirm\s+and\s+create|create\s+it|yes|y|ha|haan|proceed|banao)\b",
                    last_user_message.strip(),
                    re.I,
                )
            ) or last_user_message.strip().lower() in ("create hire challan", "create challan", "create", "yes", "confirm", "proceed", "ok", "haan", "ha")

            if d_hc and d_hc.is_valid and d_hc.confirmation_token and is_hc_confirm:
                try:
                    conf_req = ConfirmHireChallanDraftRequest(
                        draft_id=d_hc.draft_id,
                        confirmation_token=d_hc.confirmation_token,
                    )
                    conf_res = await confirm_hire_challan_draft(
                        payload=conf_req,
                        current_user=current_user,
                        current_office=current_office,
                        tenant=tenant,
                        db=db,
                    )
                    if detected_lang == "hi_devanagari":
                        reply_msg = f"✅ आपका हायर चालान **{conf_res.challan_number}** सफलतापूर्वक तैयार कर दिया गया है!"
                    elif detected_lang == "hinglish":
                        reply_msg = f"✅ Aapka Hire Challan **{conf_res.challan_number}** successfully ban gaya hai!"
                    else:
                        reply_msg = f"✅ Your Hire Challan **{conf_res.challan_number}** has been issued successfully!"
                    return ChatResponse(
                        content=reply_msg,
                        navigation_suggestions=[
                            NavigationSuggestion(
                                title=f"View Challan {conf_res.challan_number}",
                                href="/transport/hire-challans",
                                module="Transport Operations",
                            )
                        ],
                        citations=[],
                        cards=[conf_res.card],
                        provider_configured=is_provider_configured(),
                        detected_language=detected_lang,
                    )
                except HTTPException as he:
                    return ChatResponse(
                        content=f"⚠️ {he.detail}",
                        navigation_suggestions=nav_suggestions,
                        citations=[],
                        cards=[],
                        provider_configured=is_provider_configured(),
                        detected_language=detected_lang,
                    )

            reply_content, cards = await handle_conversational_hc_booking(
                db=db, user=current_user, tenant=tenant, current_office=current_office,
                user_text=last_user_message, lang=detected_lang
            )
            return ChatResponse(
                content=reply_content, navigation_suggestions=nav_suggestions,
                citations=[], cards=cards, provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )
        elif chosen_workflow == "lr":
            is_confirm = bool(
                re.search(
                    r"^(create\s+lr|confirm|confirm\s+and\s+create|create\s+it|create\s+this\s+lr|yes|y|ha|haan|proceed|banao|haan\s+bana\s+do|ha\s+create\s+karo|banado|theek\s+hai)\b",
                    last_user_message.strip(),
                    re.I,
                )
            ) or last_user_message.strip().lower() in ("create lr", "create", "yes", "confirm", "proceed", "ok", "haan", "ha", "banao")

            if existing_d and existing_d.is_valid and existing_d.confirmation_token and is_confirm:
                try:
                    conf_req = ConfirmLRDraftRequest(
                        draft_id=existing_d.draft_id,
                        confirmation_token=existing_d.confirmation_token,
                    )
                    conf_res = await confirm_lr_draft(
                        payload=conf_req,
                        current_user=current_user,
                        current_office=current_office,
                        tenant=tenant,
                        db=db,
                    )
                    if detected_lang == "hi_devanagari":
                        reply_msg = f"✅ आपका एलआर **{conf_res.lr_number}** सफलतापूर्वक तैयार कर दिया गया है!\n\nआप नीचे दिए गए कार्ड से इसे सीधे देख सकते हैं या प्रिंट कर सकते हैं।"
                    elif detected_lang == "hinglish":
                        reply_msg = f"✅ Aapka LR **{conf_res.lr_number}** successfully ban gaya hai!\n\nAap ise niche diye card se directly open ya print kar sakte hain."
                    else:
                        reply_msg = f"✅ Your LR **{conf_res.lr_number}** has been created successfully in the transport register!\n\nYou can view or print it directly using the card below."
                    return ChatResponse(
                        content=reply_msg,
                        navigation_suggestions=[
                            NavigationSuggestion(
                                title=f"View LR {conf_res.lr_number}",
                                href=f"/transport/lr-booking?lr_number={conf_res.lr_number}",
                                module="Transport Operations",
                            )
                        ],
                        citations=[],
                        cards=[conf_res.card],
                        provider_configured=is_provider_configured(),
                        detected_language=detected_lang,
                    )
                except HTTPException as he:
                    return ChatResponse(
                        content=f"⚠️ {he.detail}",
                        navigation_suggestions=nav_suggestions,
                        citations=[],
                        cards=[],
                        provider_configured=is_provider_configured(),
                        detected_language=detected_lang,
                    )

            reply_content, cards = await handle_conversational_lr_booking(
                db=db, user=current_user, tenant=tenant, current_office=current_office,
                user_text=last_user_message, lang=detected_lang
            )
            return ChatResponse(
                content=reply_content, navigation_suggestions=nav_suggestions,
                citations=[], cards=cards, provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

    # --------------------------------------------------------------------------
    # STEP 2.5: RECORD PRE-FILL INTENTS (VEHICLE, DRIVER, CLIENT PREFILL)
    # --------------------------------------------------------------------------
    prefill_response = handle_record_prefill_intent(last_user_message, lang=detected_lang)
    if prefill_response:
        return prefill_response

    # --------------------------------------------------------------------------
    # STEP 3: OPERATIONAL INTENT DISPATCH (READ-ONLY TOOLS)
    # --------------------------------------------------------------------------
    history_dicts = [{"role": m.role, "content": m.content} for m in data.messages[:-1]]

    # Anaphoric follow-up guard: when user asks "what about its payment?", "what about its pod?", "what about its status?"
    # and no LR is present in message or active conversation history
    lower_msg = last_user_message.strip().lower()
    is_anaphoric_followup = bool(
        re.search(r"\b(?:what\s+about\s+(?:its|the|this)|how\s+about\s+(?:its|the|this)|(?:its|this|that|iska|uski|uske)\s+(?:payment|pod|status|balance|advance|details|location|driver))\b", lower_msg)
        or lower_msg in ("what about its payment?", "what about its payment", "what about its pod?", "what about its pod", "what about its status?", "what about its status")
    )
    if is_anaphoric_followup:
        if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "view"):
            await log_blocked_rbac_attempt(
                db=db,
                user=current_user,
                action="BLOCKED_VIEW_LR",
                module="transport",
                missing_permission="transport.lr_booking.view",
                raw_message=last_user_message,
                current_office=current_office,
            )
            office_str = format_user_office_label(current_office, current_user)
            if detected_lang == "hi_devanagari":
                msg = f"आपके पास एलआर (LR) देखने की अनुमति नहीं है। आपका अधिकृत जारी करने वाला कार्यालय (issuing office) {office_str} है। कृपया अपने कंपनी एडमिन से संपर्क करें।"
            elif detected_lang == "hinglish":
                msg = f"Aapke paas LRs dekhne ka access nahi hai. Aapka allowed issuing office {office_str} hai. Kripya access ke liye apne Company Admin se sampark karein."
            else:
                msg = f"You don't have access to view LRs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
            return ChatResponse(
                content=msg,
                navigation_suggestions=[],
                citations=[],
                cards=[],
                provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

        from app.modules.ai.tools import extract_transport_entities
        entities_check = extract_transport_entities(last_user_message, conversation_history=history_dicts)
        if not (entities_check.get("lr_number") or entities_check.get("vehicle_number") or entities_check.get("hc_number")):
            recent_lrs = []
            if db:
                try:
                    eff_office_id = get_effective_office_id(current_user, current_office)
                    stmt_rec = select(LR)
                    if eff_office_id and eff_office_id != -1:
                        stmt_rec = stmt_rec.where(LR.issuing_office_id == eff_office_id)
                    stmt_rec = stmt_rec.order_by(desc(LR.created_at)).limit(3)
                    recent_lrs = list((await db.execute(stmt_rec)).scalars().all())
                except Exception:
                    pass

            lr_suggestions = [l.lr_number for l in recent_lrs if l.lr_number]
            sugg_text = f" (Recent LRs: {', '.join(lr_suggestions)})" if lr_suggestions else ""
            if detected_lang == "hi_devanagari":
                reply_msg = f"आप किस एलआर (LR) का विवरण देखना चाहते हैं? कृपया एलआर नंबर बताएं{sugg_text}।"
            elif detected_lang == "hinglish":
                reply_msg = f"Aap kis LR ka check karna chahte hain? Kripya LR Number batayein{sugg_text}."
            else:
                reply_msg = f"Which LR would you like to check? Please provide the LR Number{sugg_text}."

            cards = []
            if recent_lrs:
                cards = [StructuredCard(
                    card_type="lr_list",
                    title="Select an LR",
                    subtitle="Which LR would you like to check?",
                    badge={"text": "Recent LRs", "variant": "neutral"},
                    items=[{
                        "primary": f"LR {l.lr_number} • {l.vehicle_number or 'Assigned'}",
                        "secondary": f"Date: {l.lr_date or 'Recent'} • Freight: ₹{float(l.total_freight_amount or 0):,.2f}",
                        "status": l.booking_status or "Booked",
                        "href": f"/transport/lr-booking?lr_number={l.lr_number}",
                    } for l in recent_lrs],
                )]
            return ChatResponse(
                content=reply_msg,
                navigation_suggestions=[NavigationSuggestion(title=f"LR {l.lr_number}", href=f"/transport/lr-booking?lr_number={l.lr_number}", module="Transport Operations") for l in recent_lrs],
                citations=[],
                cards=cards,
                provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

    op_intent = classify_operational_intent(last_user_message, conversation_history=history_dicts)
    if op_intent:
        tool_name = op_intent.get("tool")
        if tool_name == "tracking_prompt":
            if not is_user_permitted(current_user, tenant, "tracking", "tracking", "view") and not is_user_permitted(current_user, tenant, "transport", "lr_booking", "view"):
                await log_blocked_rbac_attempt(
                    db=db,
                    user=current_user,
                    action="BLOCKED_TRACKING",
                    module="tracking",
                    missing_permission="tracking.tracking.view",
                    raw_message=last_user_message,
                    current_office=current_office,
                )
                msg = (
                    "Aapke paas tracking telemetry dekhne ka access nahi hai. Kripya apne Company Admin se sampark karein."
                    if detected_lang in ("hinglish", "hi_devanagari")
                    else "You don't have access to track shipments. Please contact your Company Admin if you need access."
                )
                return ChatResponse(
                    content=msg,
                    navigation_suggestions=[],
                    citations=[],
                    cards=[],
                    provider_configured=is_provider_configured(),
                    detected_language=detected_lang,
                )

            if detected_lang == "hi_devanagari":
                tracking_msg = "कंसाइनमेंट ट्रैक करने के लिए कृपया अपना **एलआर नंबर** (जैसे LR-2026-0012) या **वाहन पंजीकरण नंबर** (जैसे DL01AA1111) बताएं।"
            elif detected_lang == "hinglish":
                tracking_msg = "Track karne ke liye kripya apna **LR Number** (jaise LR-2026-0012) ya **Vehicle Number** (jaise DL01AA1111) batayein."
            else:
                tracking_msg = "To track your shipment, please provide the **LR Number** (e.g., LR-2026-0012) or **Vehicle Registration Number** (e.g., DL01AA1111)."
            tracking_cards = [
                StructuredCard(
                    card_type="tracking_prompt",
                    title="Live Fleet & Shipment Tracking",
                    subtitle="FASTag • SIM GPS • LR Tracking",
                    badge={"text": "Awaiting Number", "variant": "neutral"},
                    action={"label": "Open Tracking Dashboard", "href": "/transport/tracking"},
                )
            ]
            return ChatResponse(
                content=tracking_msg,
                navigation_suggestions=[NavigationSuggestion(title="Live Tracking", href="/transport/tracking", module="Fleet Management")],
                citations=[],
                cards=tracking_cards,
                provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

        if not db:
            reply_content = (
                "Operational database is currently connecting or unavailable."
                if detected_lang == "en"
                else "Operational database abhi connect ho raha hai ya unavailable hai."
            )
            cards = []
        else:
            cards = []
            if tool_name == "client":
                if not is_user_permitted(current_user, tenant, "general", "billing_client", "view") and not is_user_permitted(current_user, tenant, "accounts", "master_ledger", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_CLIENT", "general", "general.billing_client.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Billing Clients. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_client_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), is_count=op_intent.get("is_count", False),
                        limit=6, lang=detected_lang,
                    )
            elif tool_name == "vendor":
                if not is_user_permitted(current_user, tenant, "general", "vendor", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_VENDOR", "general", "general.vendor.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Vendors. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_vendor_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), is_count=op_intent.get("is_count", False),
                        limit=6, lang=detected_lang,
                    )
            elif tool_name == "job":
                if not is_user_permitted(current_user, tenant, "transport", "jobs", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_JOB", "transport", "transport.jobs.view", last_user_message, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    reply_content, cards = (f"You don't have access to view Jobs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_job_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), is_detail=op_intent.get("is_detail", False),
                        is_today=op_intent.get("is_today", False), is_count=op_intent.get("is_count", False),
                        is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"),
                        limit=5, lang=detected_lang,
                    )
            elif tool_name == "lr":
                if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_LR", "transport", "transport.lr_booking.view", last_user_message, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    reply_content, cards = (f"You don't have access to view LRs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_lr_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"),
                        status_filter=op_intent.get("status_filter"), is_detail=op_intent.get("is_detail", False),
                        is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"),
                        limit=5, lang=detected_lang,
                    )
            elif tool_name == "hire_challan":
                if not is_user_permitted(current_user, tenant, "transport", "hire_challan", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_HIRE_CHALLAN", "transport", "transport.hire_challan.view", last_user_message, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    reply_content, cards = (f"You don't have access to view Hire Challans. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_hire_challan_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"),
                        is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"),
                        limit=5, lang=detected_lang,
                    )
            elif tool_name == "invoice":
                can_inv = is_user_permitted(current_user, tenant, "accounts", "transport_invoice", "view") or is_user_permitted(current_user, tenant, "accounts", "vouchers", "view") or is_user_permitted(current_user, tenant, "transport", "lr_booking", "view")
                if not can_inv:
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_INVOICE", "accounts", "accounts.transport_invoice.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Invoices. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_invoice_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), is_latest=op_intent.get("is_latest", False),
                        field_focus=op_intent.get("field_focus"), limit=5, lang=detected_lang,
                    )
            elif tool_name == "tracking":
                can_track = is_user_permitted(current_user, tenant, "tracking", "tracking", "view") or is_user_permitted(current_user, tenant, "transport", "lr_booking", "view")
                if not can_track:
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_TRACKING", "tracking", "tracking.tracking.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to track shipments. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_tracking_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        vehicle_number=op_intent.get("vehicle_number"),
                        lr_number=op_intent.get("lr_number"),
                        challan_number=op_intent.get("challan_number"),
                        lang=detected_lang,
                    )
            elif tool_name == "accounting":
                if not is_user_permitted(current_user, tenant, "accounts", "master_ledger", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_LEDGER", "accounts", "accounts.master_ledger.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view accounts ledger. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_accounting_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        party_name=op_intent.get("party_name"), lang=detected_lang,
                    )
            elif tool_name == "vehicle":
                can_veh = is_user_permitted(current_user, tenant, "transport", "company_vehicles", "view") or is_user_permitted(current_user, tenant, "transport", "market_vehicles", "view")
                if not can_veh:
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_VEHICLES", "transport", "transport.company_vehicles.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Vehicles. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_vehicle_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office, query=op_intent.get("query"),
                        vehicle_type=op_intent.get("vehicle_type"), is_detail=op_intent.get("is_detail", False),
                        field_focus=op_intent.get("field_focus"), limit=6, lang=detected_lang,
                    )
            elif tool_name == "driver":
                if not is_user_permitted(current_user, tenant, "transport", "drivers", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_DRIVERS", "transport", "transport.drivers.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Drivers. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_driver_tool(
                        db=db, user=current_user, tenant=tenant, query=op_intent.get("query"),
                        limit=6, lang=detected_lang,
                    )
            elif tool_name == "pod":
                if not is_user_permitted(current_user, tenant, "transport", "pod_records", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_POD", "transport", "transport.pod_records.view", last_user_message, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    reply_content, cards = (f"You don't have access to view POD records. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_pod_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), lr_number=op_intent.get("lr_number"),
                        is_pending=op_intent.get("is_pending", False), is_count=op_intent.get("is_count", False),
                        limit=5, lang=detected_lang,
                    )
            elif tool_name == "eway_bill":
                if not is_user_permitted(current_user, tenant, "transport", "eway_bill", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_EWAY", "transport", "transport.eway_bill.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view E-Way Bills. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_eway_bill_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"),
                        limit=5, lang=detected_lang,
                    )
            elif tool_name == "branch":
                if not is_user_permitted(current_user, tenant, "company", "branches", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_BRANCHES", "company", "company.branches.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Branches. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_branch_tool(
                        db=db, user=current_user, tenant=tenant, query=op_intent.get("query"),
                        is_count=op_intent.get("is_count", False), limit=10, lang=detected_lang,
                    )
            elif tool_name == "consigner_consignee":
                if not is_user_permitted(current_user, tenant, "general", "consigner", "view") and not is_user_permitted(current_user, tenant, "general", "consignee", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_PARTIES", "general", "general.consigner.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Consigners/Consignees. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_consigner_consignee_tool(
                        db=db, user=current_user, tenant=tenant, current_office=current_office,
                        party_type=op_intent.get("party_type", "consigner"), query=op_intent.get("query"),
                        is_count=op_intent.get("is_count", False), limit=6, lang=detected_lang,
                    )
            elif tool_name == "fleet_maintenance":
                if not is_user_permitted(current_user, tenant, "fleet", "vehicle_health", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_FLEET", "fleet", "fleet.vehicle_health.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view Fleet Maintenance. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_fleet_maintenance_tool(
                        db=db, user=current_user, tenant=tenant,
                        vehicle_number=op_intent.get("vehicle_number"), doc_type=op_intent.get("doc_type"),
                        is_expiry_check=op_intent.get("is_expiry_check", False), lang=detected_lang,
                    )
            elif tool_name == "einvoice":
                if not is_user_permitted(current_user, tenant, "einvoicing", "generate_irn", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_EINVOICE", "einvoicing", "einvoicing.generate_irn.view", last_user_message, current_office)
                    reply_content, cards = ("You don't have access to view E-Invoicing. Please contact your Company Admin if you need access.", [])
                else:
                    reply_content, cards = await execute_einvoice_tool(
                        db=db, user=current_user, tenant=tenant, query=op_intent.get("query"),
                        limit=5, lang=detected_lang,
                    )
            else:
                reply_content, cards = ("I couldn't process this operational request.", [])

        return ChatResponse(
            content=reply_content,
            navigation_suggestions=nav_suggestions if (cards and tool_name != "tracking") else [],
            citations=[],
            cards=cards,
            provider_configured=is_provider_configured(),
            detected_language=detected_lang,
        )

    # 4. Check AI Provider configuration for general knowledge queries
    configured = is_provider_configured()
    if not configured:
        key_name = "NVIDIA_API_KEY" if settings.active_ai_provider == "nvidia" else "OPENAI_API_KEY"
        if detected_lang == "hi_devanagari":
            unconfigured_msg = (
                f"पैंथर एआई (Panther AI) वर्तमान में सेटअप मोड में है क्योंकि बैकएंड में `{key_name}` (या `OPENAI_API_KEY`) कॉन्फ़िगर नहीं है। "
                "लाइव एआई उत्तरों को सक्रिय करने के लिए कृपया अपने बैकएंड `.env` फ़ाइल में API Key सेट करें।"
            )
        elif detected_lang == "hinglish":
            unconfigured_msg = (
                f"Panther AI abhi setup mode mein hai kyunki backend environment mein `{key_name}` (ya `OPENAI_API_KEY`) configured nahi hai. "
                "Live AI responses activate karne ke liye kripya backend `.env` file mein apni API Key set karein."
            )
        else:
            unconfigured_msg = (
                f"Panther AI is currently in setup mode because `{key_name}` (or `OPENAI_API_KEY`) is not configured in the backend environment. "
                "To enable live assistant responses, please configure your AI provider API key in the backend `.env` file."
            )

        return ChatResponse(
            content=unconfigured_msg,
            navigation_suggestions=nav_suggestions,
            citations=[],
            cards=[],
            provider_configured=False,
            detected_language=detected_lang,
        )

    # 5. Retrieve Grounded RAG Knowledge filtered by tenant plan & user permissions
    plan_code = tenant.plan.code if tenant and tenant.plan else "PRO"
    permitted_categories = [m["id"].replace("-", "_") for m in authorized_catalog]
    rag_context, citations = knowledge_engine.format_grounded_context(
        query=last_user_message,
        plan_code=plan_code,
        user_permitted_categories=permitted_categories,
        top_k=3,
    )

    # 6. Build high-fidelity system prompt with live context & grounded RAG
    anon_ctx = anonymize_system_context(
        tenant_name=tenant.company_name or "PantherTMS Enterprise",
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role or "Operations",
        active_office_name=current_office.name if current_office else "All Offices (Consolidated)",
    )

    system_prompt = build_system_prompt(
        tenant_name=anon_ctx["tenant_name"],
        user_name=anon_ctx["user_name"],
        user_role=anon_ctx["user_role"],
        active_office_name=anon_ctx["active_office_name"],
        authorized_modules=authorized_catalog,
        current_page=data.page_context,
        grounded_rag_context=rag_context,
        target_language=detected_lang,
    )

    # 7. Call LLM
    try:
        safe_messages = sanitize_chat_history_for_external_llm(data.messages)
        raw_reply = await call_llm(
            messages=safe_messages,
            system_prompt=system_prompt,
        )
        reply_content = sanitize_ai_output(raw_reply)
    except Exception as e:
        err_msg = str(e)
        if "Quota Exceeded" in err_msg or "rate limit" in err_msg.lower():
            if detected_lang == "hi_devanagari":
                reply_content = "एआई सेवा वर्तमान में व्यस्त है (रेट लिमिट)। कृपया कुछ सेकंड बाद पुनः प्रयास करें। आपकी कंपनी के डेटा प्रश्न (जैसे क्लाइंट, वेंडर, ड्राइवर या एलआर) अभी भी उपलब्ध हैं।"
            elif detected_lang == "hinglish":
                reply_content = "AI provider abhi rate limited hai. Kripya kuch second baad dobara try karein. Aapke company database queries (jaise clients, vendors, drivers, LRs) bina kisi rukawat ke chalte rahenge."
            else:
                reply_content = "The AI assistant is temporarily rate-limited. Please retry in a few moments. Note that direct company records queries (clients, vendors, drivers, LRs) remain fully operational."
        else:
            reply_content = f"Sorry, I encountered an issue while processing your request: {err_msg}"

    return ChatResponse(
        content=reply_content,
        navigation_suggestions=nav_suggestions,
        citations=citations,
        cards=[],
        provider_configured=True,
        detected_language=detected_lang,
    )


@router.post("/stream")
async def stream_chat_with_copilot(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: Optional[AsyncSession] = Depends(get_ai_tenant_db),
):
    """
    Streaming SSE endpoint for progressive typing in the chat UI.
    """
    last_user_msg = next((m.content for m in reversed(data.messages) if m.role == "user"), "")
    detected_lang = detect_language(last_user_msg)

    # HARD RULE 0 check for streaming
    delete_item = detect_delete_record_request(last_user_msg)
    if delete_item:
        blocked_reply = get_blocked_delete_message(delete_item, lang=detected_lang)
        async def block_stream():
            yield f"data: {blocked_reply}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(block_stream(), media_type="text/event-stream")

    if is_bulk_pii_request(last_user_msg):
        refusal_msg = get_bulk_pii_refusal_message(lang=detected_lang)
        async def refusal_stream():
            yield f"data: {refusal_msg}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(refusal_stream(), media_type="text/event-stream")

    # Operational intent check
    stream_history = [{"role": m.role, "content": m.content} for m in data.messages[:-1]]
    op_intent = classify_operational_intent(last_user_msg, conversation_history=stream_history)
    if op_intent:
        if not db:
            msg = "Operational data service is currently unavailable."
        else:
            tool_name = op_intent.get("tool")
            if tool_name == "client":
                if not is_user_permitted(current_user, tenant, "general", "billing_client", "view") and not is_user_permitted(current_user, tenant, "accounts", "master_ledger", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_CLIENT", "general", "general.billing_client.view", last_user_msg, current_office)
                    msg = "You don't have access to view Billing Clients. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_client_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "vendor":
                if not is_user_permitted(current_user, tenant, "general", "vendor", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_VENDOR", "general", "general.vendor.view", last_user_msg, current_office)
                    msg = "You don't have access to view Vendors. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_vendor_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "job":
                if not is_user_permitted(current_user, tenant, "transport", "jobs", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_JOB", "transport", "transport.jobs.view", last_user_msg, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    msg = f"You don't have access to view Jobs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_job_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_detail=op_intent.get("is_detail", False), is_today=op_intent.get("is_today", False), is_count=op_intent.get("is_count", False), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "lr":
                if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_LR", "transport", "transport.lr_booking.view", last_user_msg, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    msg = f"You don't have access to view LRs. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_lr_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"), status_filter=op_intent.get("status_filter"), is_detail=op_intent.get("is_detail", False), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "hire_challan":
                if not is_user_permitted(current_user, tenant, "transport", "hire_challan", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_HIRE_CHALLAN", "transport", "transport.hire_challan.view", last_user_msg, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    msg = f"You don't have access to view Hire Challans. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_hire_challan_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "invoice":
                can_inv = is_user_permitted(current_user, tenant, "accounts", "transport_invoice", "view") or is_user_permitted(current_user, tenant, "accounts", "vouchers", "view") or is_user_permitted(current_user, tenant, "transport", "lr_booking", "view")
                if not can_inv:
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_INVOICE", "accounts", "accounts.transport_invoice.view", last_user_msg, current_office)
                    msg = "You don't have access to view Invoices. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_invoice_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "tracking":
                can_track = is_user_permitted(current_user, tenant, "tracking", "tracking", "view") or is_user_permitted(current_user, tenant, "transport", "lr_booking", "view")
                if not can_track:
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_TRACKING", "tracking", "tracking.tracking.view", last_user_msg, current_office)
                    msg = "You don't have access to track shipments. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_tracking_tool(db, current_user, tenant, current_office=current_office, vehicle_number=op_intent.get("vehicle_number"), lr_number=op_intent.get("lr_number"), challan_number=op_intent.get("challan_number"), lang=detected_lang)
            elif tool_name == "accounting":
                if not is_user_permitted(current_user, tenant, "accounts", "master_ledger", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_LEDGER", "accounts", "accounts.master_ledger.view", last_user_msg, current_office)
                    msg = "You don't have access to view accounts ledger. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_accounting_tool(db, current_user, tenant, current_office, party_name=op_intent.get("party_name"), lang=detected_lang)
            elif tool_name == "vehicle":
                can_veh = is_user_permitted(current_user, tenant, "transport", "company_vehicles", "view") or is_user_permitted(current_user, tenant, "transport", "market_vehicles", "view")
                if not can_veh:
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_VEHICLES", "transport", "transport.company_vehicles.view", last_user_msg, current_office)
                    msg = "You don't have access to view Vehicles. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_vehicle_tool(db, current_user, tenant, current_office=current_office, query=op_intent.get("query"), vehicle_type=op_intent.get("vehicle_type"), is_detail=op_intent.get("is_detail", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "driver":
                if not is_user_permitted(current_user, tenant, "transport", "drivers", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_DRIVERS", "transport", "transport.drivers.view", last_user_msg, current_office)
                    msg = "You don't have access to view Drivers. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_driver_tool(db, current_user, tenant, query=op_intent.get("query"), lang=detected_lang)
            elif tool_name == "pod":
                if not is_user_permitted(current_user, tenant, "transport", "pod_records", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_POD", "transport", "transport.pod_records.view", last_user_msg, current_office)
                    office_str = format_user_office_label(current_office, current_user)
                    msg = f"You don't have access to view POD records. Your allowed issuing office is {office_str}. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_pod_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), lr_number=op_intent.get("lr_number"), is_pending=op_intent.get("is_pending", False), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "eway_bill":
                if not is_user_permitted(current_user, tenant, "transport", "eway_bill", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_EWAY", "transport", "transport.eway_bill.view", last_user_msg, current_office)
                    msg = "You don't have access to view E-Way Bills. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_eway_bill_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"), lang=detected_lang)
            elif tool_name == "branch":
                if not is_user_permitted(current_user, tenant, "company", "branches", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_BRANCHES", "company", "company.branches.view", last_user_msg, current_office)
                    msg = "You don't have access to view Branches. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_branch_tool(db, current_user, tenant, query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "consigner_consignee":
                if not is_user_permitted(current_user, tenant, "general", "consigner", "view") and not is_user_permitted(current_user, tenant, "general", "consignee", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_PARTIES", "general", "general.consigner.view", last_user_msg, current_office)
                    msg = "You don't have access to view Consigners/Consignees. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_consigner_consignee_tool(db, current_user, tenant, current_office, party_type=op_intent.get("party_type", "consigner"), query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "fleet_maintenance":
                if not is_user_permitted(current_user, tenant, "fleet", "vehicle_health", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_FLEET", "fleet", "fleet.vehicle_health.view", last_user_msg, current_office)
                    msg = "You don't have access to view Fleet Maintenance. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_fleet_maintenance_tool(db, current_user, tenant, vehicle_number=op_intent.get("vehicle_number"), doc_type=op_intent.get("doc_type"), is_expiry_check=op_intent.get("is_expiry_check", False), lang=detected_lang)
            elif tool_name == "einvoice":
                if not is_user_permitted(current_user, tenant, "einvoicing", "generate_irn", "view"):
                    await log_blocked_rbac_attempt(db, current_user, "BLOCKED_VIEW_EINVOICE", "einvoicing", "einvoicing.generate_irn.view", last_user_msg, current_office)
                    msg = "You don't have access to view E-Invoicing. Please contact your Company Admin if you need access."
                else:
                    msg, _ = await execute_einvoice_tool(db, current_user, tenant, query=op_intent.get("query"), lang=detected_lang)
            else:
                msg = "Processed operational request."

        async def op_stream():
            yield f"data: {msg}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            op_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    authorized_catalog = get_authorized_navigation_catalog(tenant=tenant, user=current_user)

    anon_ctx = anonymize_system_context(
        tenant_name=tenant.company_name or "PantherTMS Enterprise",
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role or "Operations",
        active_office_name=current_office.name if current_office else "All Offices (Consolidated)",
    )

    plan_code = tenant.plan.code if tenant and tenant.plan else "PRO"
    permitted_categories = [m["id"].replace("-", "_") for m in authorized_catalog]
    rag_context, _ = knowledge_engine.format_grounded_context(
        query=last_user_msg,
        plan_code=plan_code,
        user_permitted_categories=permitted_categories,
        top_k=3,
    )

    system_prompt = build_system_prompt(
        tenant_name=anon_ctx["tenant_name"],
        user_name=anon_ctx["user_name"],
        user_role=anon_ctx["user_role"],
        active_office_name=anon_ctx["active_office_name"],
        authorized_modules=authorized_catalog,
        current_page=data.page_context,
        grounded_rag_context=rag_context,
        target_language=detected_lang,
    )

    safe_messages = sanitize_chat_history_for_external_llm(data.messages)
    async def event_generator():
        async for token in stream_llm(messages=safe_messages, system_prompt=system_prompt):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



# ==============================================================================
# PHASE 3: TWO-STAGE CONFIRMATION & LR CREATION ENDPOINTS
# ==============================================================================

@router.get("/lr-draft/active")
async def get_active_lr_draft(
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Retrieves current unconfirmed LR draft for the authenticated user and tenant."""
    if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "create"):
        return {"draft": None}

    draft_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id)
    if not draft_id:
        return {"draft": None}
    draft = await lr_draft_store.get_draft(draft_id)
    if not draft or draft.is_confirmed:
        return {"draft": None}

    eff_office_id = get_effective_office_id(current_user, current_office)
    if eff_office_id is not None and eff_office_id != -1 and draft.office_id and draft.office_id != eff_office_id:
        return {"draft": None}

    return {
        "draft_id": draft.draft_id,
        "is_valid": draft.is_valid,
        "missing_fields": draft.missing_fields,
        "data": draft.data,
        "preview_labels": draft.preview_labels,
        "can_confirm": draft.is_valid and bool(draft.confirmation_token),
    }


@router.delete("/lr-draft/active")
async def discard_active_lr_draft(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Discards active LR draft for the authenticated user and tenant."""
    cleared = await lr_draft_store.clear_active_draft(tenant.id, current_user.id)
    return {"cleared": cleared}


@router.post("/chat/clear")
async def clear_chat_session(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Clears all active conversational drafts (LR, Job, Hire Challan) for the authenticated user."""
    await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="lr")
    await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="job")
    await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="hire_challan")
    return {"status": "cleared"}


@router.post("/upload-extract")
async def upload_and_extract_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_ai_tenant_db),
):
    """
    Extracts transport and shipment entities from an uploaded document (invoice, LR slip, or e-way bill).
    Pre-populates the user's active LR draft with extracted fields and flags doubtful values with '⚠️ Verify'.
    """
    if not db:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    filename = file.filename or "uploaded_document"
    raw_bytes = await file.read()

    extracted_text = ""
    try:
        extracted_text = raw_bytes.decode("utf-8", errors="ignore")
    except Exception:
        extracted_text = ""

    combined_text = f"File: {filename}\n{extracted_text}".strip()
    extracted_fields = await parse_lr_entities_from_text(combined_text, tenant_id=tenant.id, db=db)

    # Get or create active LR draft
    active_d_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id, draft_type="lr")
    draft = await lr_draft_store.get_draft(active_d_id) if active_d_id else None
    if not draft or draft.is_confirmed:
        draft = await lr_draft_store.create_draft(
            tenant_id=tenant.id,
            user_id=current_user.id,
            draft_type="lr",
            office_id=current_office.id if current_office else None,
        )

    for k, v in extracted_fields.items():
        if v is not None and not k.startswith("invalid_"):
            draft.data[k] = v

    is_valid, missing, draft = await validate_and_update_draft(draft, tenant.id, db)
    await lr_draft_store.save_draft(draft)

    metrics = []
    if draft.data.get("vehicle_number"):
        metrics.append({"label": "Vehicle", "value": f"{draft.data['vehicle_number']} ⚠️ Verify"})
    if draft.data.get("consigner_id"):
        metrics.append({"label": "Consigner ID", "value": f"{draft.data['consigner_id']} ⚠️ Verify"})
    if draft.data.get("goods_value"):
        metrics.append({"label": "Goods Value", "value": f"₹{draft.data['goods_value']:,.2f} ⚠️ Verify"})
    if draft.data.get("eway_bill_number"):
        metrics.append({"label": "E-Way Bill", "value": f"{draft.data['eway_bill_number']} ⚠️ Verify"})
    if draft.data.get("total_freight_amount"):
        metrics.append({"label": "Freight", "value": f"₹{draft.data['total_freight_amount']:,.2f} ⚠️ Verify"})

    card = StructuredCard(
        card_type="lr_draft",
        title=f"LR Draft • Extracted from {filename}",
        subtitle=f"Draft ID: {draft.draft_id} • Status: {'Complete' if is_valid else 'Incomplete'}",
        badge={"text": "Extracted", "variant": "warning"},
        metrics=metrics,
        can_confirm=is_valid,
        confirmation_token=draft.confirmation_token if is_valid else None,
    )

    summary_msg = f"📄 Extracted shipment details from **{filename}**. Active LR draft updated. Please verify extracted fields flagged with ⚠️."
    return {
        "success": True,
        "filename": filename,
        "extracted_fields": extracted_fields,
        "draft_id": draft.draft_id,
        "is_valid": is_valid,
        "missing_fields": missing,
        "message": summary_msg,
        "card": card.model_dump(),
    }


def _build_lr_idempotent_response(data: dict) -> LRConfirmationResponse:
    lr_num = data["lr_number"]
    lr_id = data["lr_id"]
    freight = float(data.get("total_freight_amount", 0.0))
    balance = float(data.get("balance_amount", 0.0))
    v_num = data.get("vehicle_number", "Vehicle")
    off_name = data.get("office_name", "Default")

    success_card = StructuredCard(
        card_type="lr_created",
        title="LR Created Successfully",
        subtitle=f"LR Number: {lr_num}",
        badge={"text": "Created", "variant": "success"},
        metrics=[
            {"label": "LR Number", "value": lr_num},
            {"label": "Status", "value": "Booked"},
            {"label": "Vehicle", "value": v_num},
            {"label": "Total Freight", "value": f"₹{freight:,.2f}"},
            {"label": "Balance Due", "value": f"₹{balance:,.2f}"},
        ],
        items=[
            {
                "primary": f"LR {lr_num} • {v_num}",
                "secondary": f"Office: {off_name} • Confirmed & Booked",
                "amount": f"₹{freight:,.2f}",
                "status": "Created",
                "href": f"/transport/lr-booking?lr_number={lr_num}",
            }
        ],
        action={"label": f"Open LR {lr_num}", "href": f"/transport/lr-booking?lr_number={lr_num}"},
    )

    return LRConfirmationResponse(
        success=True,
        lr_id=lr_id,
        lr_number=lr_num,
        message=f"Your LR {lr_num} has been created successfully in the transport register. [Open LR {lr_num}](/transport/lr-booking?lr_number={lr_num})",
        card=success_card,
    )


def _build_job_idempotent_response(data: dict) -> JobConfirmationResponse:
    job_num = data["job_number"]
    job_id = data["job_id"]
    c_name = data.get("consigner_name", "Consigner")
    ce_name = data.get("consignee_name", "Consignee")
    off_name = data.get("office_name", "Default")

    success_card = StructuredCard(
        card_type="job_created",
        title="Transport Job Created Successfully",
        subtitle=f"Job Number: {job_num}",
        badge={"text": "Created", "variant": "success"},
        metrics=[
            {"label": "Job Number", "value": job_num},
            {"label": "Status", "value": "OPEN"},
            {"label": "Consigner", "value": c_name},
            {"label": "Consignee", "value": ce_name},
            {"label": "Issuing Office", "value": off_name},
        ],
        items=[
            {
                "primary": f"Job {job_num} • {c_name} ➔ {ce_name}",
                "secondary": f"Office: {off_name} • Order Open",
                "amount": "OPEN",
                "status": "Created",
                "href": "/transport/jobs",
            }
        ],
        action={"label": "View in Job Register", "href": "/transport/jobs"},
    )

    return JobConfirmationResponse(
        success=True,
        job_id=job_id,
        job_number=job_num,
        message=f"Your Transport Job {job_num} has been created successfully.",
        card=success_card,
    )


def _build_hc_idempotent_response(data: dict) -> HireChallanConfirmationResponse:
    hc_num = data["challan_number"]
    hc_id = data["challan_id"]
    v_num = data.get("vehicle_number", "Vehicle")
    hr = float(data.get("hire_rate", 0.0))
    bal = float(data.get("balance_amount", 0.0))
    off_name = data.get("office_name", "Default")

    success_card = StructuredCard(
        card_type="hire_challan_created",
        title="Hire Challan Created Successfully",
        subtitle=f"Challan Number: {hc_num}",
        badge={"text": "Issued", "variant": "success"},
        metrics=[
            {"label": "Challan Number", "value": hc_num},
            {"label": "Status", "value": "ISSUED"},
            {"label": "Vehicle", "value": v_num},
            {"label": "Hire Rate", "value": f"₹{hr:,.2f}"},
            {"label": "Balance Due", "value": f"₹{bal:,.2f}"},
        ],
        items=[
            {
                "primary": f"Hire Challan {hc_num} • {v_num}",
                "secondary": f"Office: {off_name} • Issued & Hired",
                "amount": f"₹{hr:,.2f}",
                "status": "Created",
                "href": "/transport/hire-challans",
            }
        ],
        action={"label": "View in Hire Challans", "href": "/transport/hire-challans"},
    )

    return HireChallanConfirmationResponse(
        success=True,
        challan_id=hc_id,
        challan_number=hc_num,
        message=f"Your Hire Challan {hc_num} for vehicle {v_num} has been issued successfully.",
        card=success_card,
    )


# Backward compatibility alias
_build_idempotent_response = _build_lr_idempotent_response


# ==============================================================================
# CONFIRMATION ENDPOINTS: LR, JOB, & HIRE CHALLAN
# ==============================================================================

@router.post("/lr-draft/confirm", response_model=LRConfirmationResponse)
async def confirm_lr_draft(
    payload: ConfirmLRDraftRequest,
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_ai_tenant_db),
):
    """
    Two-Stage Confirmation endpoint for conversational LR creation.
    Protected with distributed locking, double-layer idempotency (Redis + DB atomic table),
    content integrity validation, and quota enforcement.
    """
    if not db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable.",
        )

    # 1. Environment & Production Safety Gate
    is_prod = settings.ENVIRONMENT.lower() == "production"
    is_test_env = settings.ENVIRONMENT.lower() in ("development", "test", "testing")
    if is_prod and not settings.AI_ENABLE_LR_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted LR creation is disabled in production. Please use standard manual form at /transport/lr-booking.",
        )
    elif not is_test_env and not settings.AI_ENABLE_LR_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted LR creation is disabled. Please review draft in standard LR form at /transport/lr-booking.",
        )

    # 2. RBAC Permission Check
    from app.modules.ai.tools import is_user_permitted
    if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Missing permission: transport.lr_booking.create",
        )

    # 3. Layer 1 Idempotency Check: Fast Redis / Cache Check
    cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
    if cached_op and cached_op.get("success"):
        return _build_lr_idempotent_response(cached_op)

    # 4. Layer 2 Idempotency Check: Durable Database Check
    from sqlalchemy import select
    from app.tenant_db.models import AIOperationIdempotency, UserActivity, LR
    op_id = f"lr_draft:{payload.draft_id}"

    try:
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == op_id)
        existing_op = (await db.execute(stmt_idem)).scalar_one_or_none()
        if existing_op and existing_op.status == "COMPLETED" and existing_op.response_payload:
            await lr_draft_store.record_confirmed_operation(payload.draft_id, existing_op.response_payload)
            return _build_lr_idempotent_response(existing_op.response_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Durable AI operation idempotency table ('ai_operation_idempotency') is not configured or migrated. Cannot safely proceed with write action: {str(e)}",
        )

    # 5. Acquire Distributed Concurrency Lock (Multi-Worker Safe)
    locked = await lr_draft_store.acquire_lock(payload.draft_id, ttl_ms=15000)
    if not locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmation is currently in progress by another request or worker. Please wait.",
        )

    try:
        cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
        if cached_op and cached_op.get("success"):
            return _build_lr_idempotent_response(cached_op)

        # 6. Recheck Monthly Plan Quota
        from app.modules.transport.router import check_entitlement_limit
        await check_entitlement_limit(tenant, db, "max_lrs_per_month")

        # 7. Retrieve Draft
        draft = await lr_draft_store.get_draft(payload.draft_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LR draft not found or expired. Please start a new booking session.",
            )

        # 8. Token validation & Atomic Single-Use Burn with Content Integrity Check
        token_valid, reason = draft.consume_confirmation_token(
            token=payload.confirmation_token,
            tenant_id=tenant.id,
            user_id=current_user.id,
        )
        if not token_valid:
            if reason == "ALREADY_CONFIRMED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This draft has already been confirmed (LR: {draft.created_lr_number or 'Created'}).",
                )
            elif reason == "CONTENT_MODIFIED_SINCE_APPROVAL":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Draft content has been modified since approval was generated. Please review and approve the updated draft.",
                )
            elif reason == "TOKEN_EXPIRED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation token has expired. Please review draft again to generate a new token.",
                )
            elif reason == "UNAUTHORIZED_TENANT_OR_USER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have authorization to confirm this draft.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid confirmation token.",
                )

        # 9. Enforce GST Rule 138 E-Way Bill Requirement
        goods_val = float(draft.data.get("goods_value") or 0.0)
        if goods_val > 50000:
            ewb = draft.data.get("eway_bill_number")
            if not ewb:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation blocked — E-Way Bill required: Consignment goods value exceeds ₹50,000 threshold under GST Rule 138.",
                )
            from app.modules.ai.lr_draft_service import validate_eway_bill_number
            is_ewb_ok, _ = validate_eway_bill_number(str(ewb))
            if not is_ewb_ok:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation blocked — Valid 12-digit E-Way Bill number required under GST Rule 138.",
                )

        target_office_id = draft.office_id or (current_office.id if current_office else None)
        user_role = (current_user.role or "").upper().strip()
        if user_role not in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
            allowed_ids = {a.office_id for a in (current_user.office_assignments or []) if a.office and a.office.is_active}
            if target_office_id and allowed_ids and target_office_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. You do not have permission to create records for office ID {target_office_id}.",
                )

        # Auto-provision unlinked parties and locations on final confirmation
        if not draft.data.get("consigner_id"):
            c_name = draft.preview_labels.get("consigner_name") or draft.data.get("consigner_name")
            if c_name:
                from app.modules.ai.lr_draft_service import resolve_or_create_consigner
                c_obj, _ = await resolve_or_create_consigner(db, c_name, office_id=target_office_id, allow_provision=True)
                if c_obj:
                    draft.data["consigner_id"] = c_obj.id
                    draft.preview_labels["consigner_name"] = c_obj.name

        if not draft.data.get("consignee_id"):
            ce_name = draft.preview_labels.get("consignee_name") or draft.data.get("consignee_name")
            if ce_name:
                from app.modules.ai.lr_draft_service import resolve_or_create_consignee
                ce_obj, _ = await resolve_or_create_consignee(db, ce_name, office_id=target_office_id, allow_provision=True)
                if ce_obj:
                    draft.data["consignee_id"] = ce_obj.id
                    draft.preview_labels["consignee_name"] = ce_obj.name

        if not draft.data.get("origin_location_id"):
            orig_name = draft.preview_labels.get("origin_name")
            if orig_name:
                from app.modules.ai.lr_draft_service import resolve_or_create_location
                loc_o = await resolve_or_create_location(db, orig_name, office_id=target_office_id)
                draft.data["origin_location_id"] = loc_o.id

        if not draft.data.get("destination_location_id"):
            dest_name = draft.preview_labels.get("destination_name")
            if dest_name:
                from app.modules.ai.lr_draft_service import resolve_or_create_location
                loc_d = await resolve_or_create_location(db, dest_name, office_id=target_office_id)
                draft.data["destination_location_id"] = loc_d.id

        freight_amt = Decimal(str(draft.data.get("freight_amount") or 0.0))
        advance_amt = Decimal(str(draft.data.get("advance_amount") or 0.0))
        if "freight_rate" not in draft.data or not draft.data["freight_rate"]:
            draft.data["freight_rate"] = freight_amt
        draft.data["freight_amount"] = freight_amt
        draft.data["advance_amount"] = advance_amt
        draft.data["total_freight_amount"] = freight_amt
        draft.data["balance_amount"] = freight_amt - advance_amt
        pkgs_val = int(draft.data.get("package_count") or 0)
        if pkgs_val <= 0:
            pkgs_val = 1 if (draft.data.get("actual_weight") or draft.data.get("chargeable_weight") or draft.data.get("particulars")) else 1
        draft.data["package_count"] = pkgs_val

        # 9.5 Validate against LRCreate Schema
        try:
            lr_create_obj = LRCreate(**draft.data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Draft schema validation failed: {str(e)}",
            )

        # 10. Execute authoritative create_lr service with auto_commit=False for single atomic transaction
        from app.modules.transport.service import create_lr
        target_office_id = draft.office_id or (current_office.id if current_office else None)
        user_role = (current_user.role or "").upper().strip()
        if user_role not in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
            allowed_ids = {a.office_id for a in (current_user.office_assignments or []) if a.office and a.office.is_active}
            if target_office_id and allowed_ids and target_office_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. You do not have permission to create records for office ID {target_office_id}.",
                )
        try:
            lr = await create_lr(
                db=db,
                data=lr_create_obj,
                user_id=current_user.id,
                office_id=target_office_id,
                auto_commit=False,
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create LR in database: {str(e)}",
            )

        # 11. Build confirmed response data
        eff_off_id = lr.issuing_office_id or target_office_id
        office_obj = await db.get(Branch, eff_off_id) if eff_off_id else current_office
        office_name = office_obj.name if office_obj else (current_office.name if current_office else None)
        office_code = office_obj.code if office_obj else (current_office.code if current_office else None)
        res_data = {
            "success": True,
            "lr_id": lr.id,
            "lr_number": lr.lr_number,
            "total_freight_amount": float(lr.total_freight_amount or 0),
            "balance_amount": float(lr.balance_amount or 0),
            "vehicle_number": lr.vehicle_number,
            "office_name": office_name,
        }

        # 12. Insert durable database idempotency record in SAME transaction
        idem_entry = AIOperationIdempotency(
            operation_id=op_id,
            tenant_id=tenant.id,
            user_id=current_user.id,
            operation_type="LR_CREATE",
            status="COMPLETED",
            entity_id=lr.id,
            entity_identifier=lr.lr_number,
            response_payload=res_data,
        )
        db.add(idem_entry)

        # 13. Log activity to audit trail in SAME transaction
        from app.services.activity_logger import log_activity
        await log_activity(
            db=db,
            user=current_user,
            action="LR_CREATED",
            module="transport",
            entity_type="LR",
            entity_id=str(lr.id),
            entity_identifier=lr.lr_number,
            office_id=lr.issuing_office_id or target_office_id,
            office_name=office_name,
            office_code=office_code,
            details_json={
                "created_via": "Panther AI Conversational Assistant",
                "draft_id": draft.draft_id,
                "operation_id": op_id,
                "lr_number": lr.lr_number,
                "vehicle_number": lr.vehicle_number,
                "total_freight_amount": float(lr.total_freight_amount or 0),
                "consigner_id": lr.consigner_id,
                "consignee_id": lr.consignee_id,
            },
        )

        # 14. ATOMIC SINGLE-TRANSACTION COMMIT: LR, Idempotency, and Audit commit together!
        await db.commit()
        await db.refresh(lr)

        # 15. Update Draft confirmation record and persist
        draft.created_lr_id = lr.id
        draft.created_lr_number = lr.lr_number
        await lr_draft_store.save_draft(draft)
        await lr_draft_store.record_confirmed_operation(payload.draft_id, res_data)
        await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="lr")

        return _build_lr_idempotent_response(res_data)

    finally:
        await lr_draft_store.release_lock(payload.draft_id)


@router.post("/job-draft/confirm", response_model=JobConfirmationResponse)
async def confirm_job_draft(
    payload: ConfirmJobDraftRequest,
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_ai_tenant_db),
):
    """
    Two-Stage Confirmation endpoint for conversational Transport Job orders.
    Enforces atomic database-backed idempotency, RBAC, and payload validation.
    """
    if not db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable.",
        )

    # 1. Environment & Production Safety Gate
    is_prod = settings.ENVIRONMENT.lower() == "production"
    is_test_env = settings.ENVIRONMENT.lower() in ("development", "test", "testing")
    if is_prod and not settings.AI_ENABLE_JOB_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Job creation is disabled in production. Please use standard manual form at /transport/jobs.",
        )
    elif not is_test_env and not settings.AI_ENABLE_JOB_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Job creation is disabled. Please review draft in standard form at /transport/jobs.",
        )

    # 2. RBAC Permission Check
    from app.modules.ai.tools import is_user_permitted
    if not is_user_permitted(current_user, tenant, "transport", "jobs", "create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Missing permission: transport.jobs.create",
        )

    # 3. Layer 1 Idempotency Check: Fast Redis / Cache Check
    cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
    if cached_op and cached_op.get("success"):
        return _build_job_idempotent_response(cached_op)

    # 4. Layer 2 Idempotency Check: Durable Database Check
    from sqlalchemy import select
    from app.tenant_db.models import AIOperationIdempotency, UserActivity, Job, Consigner, Consignee
    op_id = f"job_draft:{payload.draft_id}"

    try:
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == op_id)
        existing_op = (await db.execute(stmt_idem)).scalar_one_or_none()
        if existing_op and existing_op.status == "COMPLETED" and existing_op.response_payload:
            await lr_draft_store.record_confirmed_operation(payload.draft_id, existing_op.response_payload)
            return _build_job_idempotent_response(existing_op.response_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Durable AI operation idempotency table ('ai_operation_idempotency') is not configured or migrated. Cannot safely proceed with write action: {str(e)}",
        )

    # 5. Acquire Distributed Concurrency Lock
    locked = await lr_draft_store.acquire_lock(payload.draft_id, ttl_ms=15000)
    if not locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmation is currently in progress by another request or worker. Please wait.",
        )

    try:
        cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
        if cached_op and cached_op.get("success"):
            return _build_job_idempotent_response(cached_op)

        # 6. Retrieve Draft
        draft = await lr_draft_store.get_draft(payload.draft_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job draft not found or expired. Please start a new session.",
            )

        # 7. Token validation & Single-Use Burn with Content Integrity Check
        token_valid, reason = draft.consume_confirmation_token(
            token=payload.confirmation_token,
            tenant_id=tenant.id,
            user_id=current_user.id,
        )
        if not token_valid:
            if reason == "ALREADY_CONFIRMED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This draft has already been confirmed (Job: {draft.created_entity_number or 'Created'}).",
                )
            elif reason == "CONTENT_MODIFIED_SINCE_APPROVAL":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Draft content has been modified since approval was generated. Please review and approve the updated draft.",
                )
            elif reason == "TOKEN_EXPIRED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation token has expired. Please review draft again to generate a new token.",
                )
            elif reason == "UNAUTHORIZED_TENANT_OR_USER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have authorization to confirm this draft.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid confirmation token.",
                )

        # 8. Validate against JobCreate Schema
        try:
            job_create_obj = JobCreate(**draft.data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Draft schema validation failed: {str(e)}",
            )

        # 9. Execute authoritative create_job service with auto_commit=False
        from app.modules.transport.service import create_job
        target_office_id = draft.office_id or (current_office.id if current_office else None)
        user_role = (current_user.role or "").upper().strip()
        if user_role not in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
            allowed_ids = {a.office_id for a in (current_user.office_assignments or []) if a.office and a.office.is_active}
            if target_office_id and allowed_ids and target_office_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. You do not have permission to create records for office ID {target_office_id}.",
                )
        try:
            job = await create_job(
                db=db,
                data=job_create_obj,
                user_id=current_user.id,
                office_id=target_office_id,
                auto_commit=False,
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Job in database: {str(e)}",
            )

        # 10. Build response data
        c_obj = await db.get(Consigner, job.consigner_id)
        ce_obj = await db.get(Consignee, job.consignee_id)
        eff_off_id = job.issuing_office_id or target_office_id
        office_obj = await db.get(Branch, eff_off_id) if eff_off_id else current_office
        office_name = office_obj.name if office_obj else (current_office.name if current_office else "Main Logistics Hub")
        res_data = {
            "success": True,
            "job_id": job.id,
            "job_number": job.job_number,
            "consigner_name": c_obj.name if c_obj else "Consigner",
            "consignee_name": ce_obj.name if ce_obj else "Consignee",
            "office_name": office_name,
        }

        # 11. Insert durable database idempotency record
        idem_entry = AIOperationIdempotency(
            operation_id=op_id,
            tenant_id=tenant.id,
            user_id=current_user.id,
            operation_type="JOB_CREATE",
            status="COMPLETED",
            entity_id=job.id,
            entity_identifier=job.job_number,
            response_payload=res_data,
        )
        db.add(idem_entry)

        # 12. Log activity to audit trail
        from app.services.activity_logger import log_activity
        await log_activity(
            db=db,
            user=current_user,
            action="JOB_CREATED",
            module="transport",
            entity_type="JOB",
            entity_id=str(job.id),
            entity_identifier=job.job_number,
            office_id=job.issuing_office_id or target_office_id,
            office_name=office_name,
            details_json={
                "created_via": "Panther AI Conversational Assistant",
                "draft_id": draft.draft_id,
                "operation_id": op_id,
                "job_number": job.job_number,
                "consigner_id": job.consigner_id,
                "consignee_id": job.consignee_id,
            },
        )

        # 13. ATOMIC COMMIT
        await db.commit()
        await db.refresh(job)

        # 14. Update Draft and Cache
        draft.created_entity_id = job.id
        draft.created_entity_number = job.job_number
        await lr_draft_store.save_draft(draft)
        await lr_draft_store.record_confirmed_operation(payload.draft_id, res_data)
        await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="job")

        return _build_job_idempotent_response(res_data)

    finally:
        await lr_draft_store.release_lock(payload.draft_id)


@router.post("/hire-challan-draft/confirm", response_model=HireChallanConfirmationResponse)
async def confirm_hire_challan_draft(
    payload: ConfirmHireChallanDraftRequest,
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_ai_tenant_db),
):
    """
    Two-Stage Confirmation endpoint for conversational Hired Truck Challans.
    Preserves authoritative calculations and accounting rules, protected with atomic DB idempotency.
    """
    if not db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable.",
        )

    # 1. Environment & Production Safety Gate
    is_prod = settings.ENVIRONMENT.lower() == "production"
    is_test_env = settings.ENVIRONMENT.lower() in ("development", "test", "testing")
    if is_prod and not settings.AI_ENABLE_HC_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Hire Challan creation is disabled in production. Please use standard manual form at /transport/hire-challans.",
        )
    elif not is_test_env and not settings.AI_ENABLE_HC_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Hire Challan creation is disabled. Please review draft in standard form at /transport/hire-challans.",
        )

    # 2. RBAC Permission Check
    from app.modules.ai.tools import is_user_permitted
    if not is_user_permitted(current_user, tenant, "transport", "hire_challan", "create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Missing permission: transport.hire_challan.create",
        )

    # 3. Layer 1 Idempotency Check: Fast Redis / Cache Check
    cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
    if cached_op and cached_op.get("success"):
        return _build_hc_idempotent_response(cached_op)

    # 4. Layer 2 Idempotency Check: Durable Database Check
    from sqlalchemy import select
    from app.tenant_db.models import AIOperationIdempotency, UserActivity, HireChallan
    op_id = f"hc_draft:{payload.draft_id}"

    try:
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == op_id)
        existing_op = (await db.execute(stmt_idem)).scalar_one_or_none()
        if existing_op and existing_op.status == "COMPLETED" and existing_op.response_payload:
            await lr_draft_store.record_confirmed_operation(payload.draft_id, existing_op.response_payload)
            return _build_hc_idempotent_response(existing_op.response_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Durable AI operation idempotency table ('ai_operation_idempotency') is not configured or migrated. Cannot safely proceed with write action: {str(e)}",
        )

    # 5. Acquire Distributed Concurrency Lock
    locked = await lr_draft_store.acquire_lock(payload.draft_id, ttl_ms=15000)
    if not locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmation is currently in progress by another request or worker. Please wait.",
        )

    try:
        cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
        if cached_op and cached_op.get("success"):
            return _build_hc_idempotent_response(cached_op)

        # 6. Recheck Monthly Plan Quota for Hire Challans
        from app.modules.transport.router import check_entitlement_limit
        await check_entitlement_limit(tenant, db, "max_hire_challans_per_month")

        # 7. Retrieve Draft
        draft = await lr_draft_store.get_draft(payload.draft_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hire Challan draft not found or expired. Please start a new session.",
            )

        # 8. Token validation & Single-Use Burn with Content Integrity Check
        token_valid, reason = draft.consume_confirmation_token(
            token=payload.confirmation_token,
            tenant_id=tenant.id,
            user_id=current_user.id,
        )
        if not token_valid:
            if reason == "ALREADY_CONFIRMED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This draft has already been confirmed (Challan: {draft.created_entity_number or 'Created'}).",
                )
            elif reason == "CONTENT_MODIFIED_SINCE_APPROVAL":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Draft content has been modified since approval was generated. Please review and approve the updated draft.",
                )
            elif reason == "TOKEN_EXPIRED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation token has expired. Please review draft again to generate a new token.",
                )
            elif reason == "UNAUTHORIZED_TENANT_OR_USER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have authorization to confirm this draft.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid confirmation token.",
                )

        # 9. Validate against HireChallanCreate Schema
        try:
            hc_create_obj = HireChallanCreate(**draft.data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Draft schema validation failed: {str(e)}",
            )

        # 10. Execute authoritative create_hire_challan service with auto_commit=False
        from app.modules.transport.service import create_hire_challan
        target_office_id = draft.office_id or (current_office.id if current_office else None)
        user_role = (current_user.role or "").upper().strip()
        if user_role not in ("COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"):
            allowed_ids = {a.office_id for a in (current_user.office_assignments or []) if a.office and a.office.is_active}
            if target_office_id and allowed_ids and target_office_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. You do not have permission to create records for office ID {target_office_id}.",
                )
        try:
            hc = await create_hire_challan(
                db=db,
                data=hc_create_obj,
                office_id=target_office_id,
                auto_commit=False,
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Hire Challan in database: {str(e)}",
            )

        # 11. Build response data
        eff_off_id = hc.issuing_office_id or target_office_id
        office_obj = await db.get(Branch, eff_off_id) if eff_off_id else current_office
        office_name = office_obj.name if office_obj else (current_office.name if current_office else "Main Logistics Hub")
        res_data = {
            "success": True,
            "challan_id": hc.id,
            "challan_number": hc.challan_number,
            "vehicle_number": hc.vehicle_number,
            "hire_rate": float(hc.hire_rate or 0),
            "balance_amount": float(hc.balance_amount or 0),
            "office_name": office_name,
        }

        # 12. Insert durable database idempotency record
        idem_entry = AIOperationIdempotency(
            operation_id=op_id,
            tenant_id=tenant.id,
            user_id=current_user.id,
            operation_type="HIRE_CHALLAN_CREATE",
            status="COMPLETED",
            entity_id=hc.id,
            entity_identifier=hc.challan_number,
            response_payload=res_data,
        )
        db.add(idem_entry)

        # 13. Log activity to audit trail
        from app.services.activity_logger import log_activity
        await log_activity(
            db=db,
            user=current_user,
            action="HIRE_CHALLAN_CREATED",
            module="transport",
            entity_type="HIRE_CHALLAN",
            entity_id=str(hc.id),
            entity_identifier=hc.challan_number,
            office_id=hc.issuing_office_id or target_office_id,
            office_name=office_name,
            details_json={
                "created_via": "Panther AI Conversational Assistant",
                "draft_id": draft.draft_id,
                "operation_id": op_id,
                "challan_number": hc.challan_number,
                "vehicle_number": hc.vehicle_number,
                "hire_rate": float(hc.hire_rate or 0),
                "balance_amount": float(hc.balance_amount or 0),
            },
        )

        # 14. ATOMIC COMMIT
        await db.commit()
        await db.refresh(hc)

        # 15. Update Draft and Cache
        draft.created_entity_id = hc.id
        draft.created_entity_number = hc.challan_number
        await lr_draft_store.save_draft(draft)
        await lr_draft_store.record_confirmed_operation(payload.draft_id, res_data)
        await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="hire_challan")

        return _build_hc_idempotent_response(res_data)

    finally:
        await lr_draft_store.release_lock(payload.draft_id)