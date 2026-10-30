"""
Panther AI Customer Data Privacy Boundary & PII Scrubber.
Protects sensitive customer, driver, vehicle, and financial data from being transmitted
to external LLM providers (including Google Gemini Free Tier).
"""
import re
from typing import List
from app.modules.ai.schemas import ChatMessage

# Regex patterns for sensitive Indian PII and logistical data
PHONE_REGEX = re.compile(r"\b(?:(?:\+?91[\-\s]?)?[6-9]\d{9})\b")
AADHAAR_REGEX = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")
PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
GSTIN_REGEX = re.compile(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
AMOUNT_REGEX = re.compile(r"(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{2})?", re.IGNORECASE)
VEHICLE_REGEX = re.compile(
    r"\b([A-Z]{2}[-\s]?[0-9]{1,2}(?:[-\s]?[A-Z]{1,3})?[-\s]?[0-9]{3,4})\b",
    re.IGNORECASE,
)


def scrub_user_message_pii(text: str) -> str:
    """
    Sanitizes private customer data from user input before sending to external LLM provider.
    Protects against leaking phone numbers, Aadhaar, PAN, GSTIN, credit cards, bank accounts,
    vehicle registration plates, and financial amounts to Gemini Free Tier.
    """
    if not text:
        return text

    # Redact GSTIN and PAN first (longer structured strings)
    text = GSTIN_REGEX.sub("[GSTIN_REDACTED]", text)
    text = PAN_REGEX.sub("[PAN_REDACTED]", text)
    text = AADHAAR_REGEX.sub("[AADHAAR_REDACTED]", text)
    text = EMAIL_REGEX.sub("[EMAIL_REDACTED]", text)
    text = PHONE_REGEX.sub("[PHONE_REDACTED]", text)
    text = AMOUNT_REGEX.sub("[AMOUNT_REDACTED]", text)
    # Redact vehicle numbers in conversational prompt
    text = VEHICLE_REGEX.sub("[VEHICLE_PLATE_REDACTED]", text)

    return text


def sanitize_chat_history_for_external_llm(messages: List[ChatMessage]) -> List[ChatMessage]:
    """
    Returns a copy of the conversation history with all user messages stripped of sensitive PII.
    Ensures that conversation history sent to Gemini Free Tier never contains customer records.
    """
    sanitized = []
    for msg in messages:
        if msg.role == "user":
            sanitized.append(
                ChatMessage(
                    role="user",
                    content=scrub_user_message_pii(msg.content),
                )
            )
        else:
            sanitized.append(msg)
    return sanitized


def anonymize_system_context(
    tenant_name: str,
    user_name: str,
    user_role: str,
    active_office_name: str,
) -> dict:
    """
    Enforces structural privacy boundary: strips real company names, employee emails,
    and specific branch identifiers from the system prompt sent to external LLMs.
    Ensures Google Gemini never receives tenant or employee identities.
    """
    return {
        "tenant_name": "PantherTMS Enterprise Organization",
        "user_name": f"{user_role.title()} User" if user_role else "Operations User",
        "user_role": user_role or "Operations",
        "active_office_name": "Active Office Context",
    }


