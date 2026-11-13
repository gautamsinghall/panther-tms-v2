"""
Panther AI Output Guards (No.14 rebuild).

Claim-vs-source check for LLM replies. The LLM is the only unconstrained
text path in the chatbot: typed-tool and draft replies render tool results
verbatim, so they are grounded by construction and are NOT re-guarded here.

Rule: any LR/job/challan/invoice number, vehicle registration, rupee amount
or explicit date in the reply that did not come from a grounded source
(RAG context, authorised TMS knowledge, citations, or the user's own
messages) is treated as invented. The whole reply is then replaced with a
safe "I couldn't verify this" statement — individual tokens are never
patched in place, because a partially-edited reply can still mislead.

Grounded sources are passed in by the caller (router.py, final LLM return).
Nothing here imports the app or the database; it is pure and unit-testable.
"""
import re
from typing import List, Optional, Tuple

# LR-0005 / JOB-2026-024 / HC-2026-0001 / INV-... / PLPL-0105 / LR12345 ...
_ID_RE = re.compile(
    r"\b(?:LR|GR|JOB|HC|INV|PV|RV|CV|JV|EWB|TI|PLPL)[-_\s#]?\d[\w-]*\b",
    re.IGNORECASE,
)
# Indian vehicle registration: DL01AB1234
_VEHICLE_RE = re.compile(r"\b[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}\b")
# Rupee amounts: ₹1,34,000 / ₹3,100.00 / Rs. 5000
_AMOUNT_RE = re.compile(r"(?:₹|Rs\.?)\s?[\d,]+(?:\.\d{1,2})?", re.IGNORECASE)
# Explicit dates: 04-04-2026, 7 Nov 2026, November 2026, Feb 2026
_MONTHS = (
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?"
    r"|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
)
_DATE_RE = re.compile(
    r"\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}"
    r"|\d{1,2}\s+(?:" + _MONTHS + r")\s+\d{4}"
    r"|(?:" + _MONTHS + r")\s+\d{4})\b",
    re.IGNORECASE,
)

_CLAIM_RES = (_ID_RE, _VEHICLE_RE, _AMOUNT_RE, _DATE_RE)


def _norm(token: str) -> str:
    """Normalise a claim token for comparison: LR-0005 == LR0005 == lr 0005."""
    return re.sub(r"[^A-Z0-9]", "", token.upper())


def extract_claim_tokens(text: str) -> List[str]:
    """All ID / vehicle / amount / date tokens found in `text`, in order."""
    tokens: List[str] = []
    for rx in _CLAIM_RES:
        tokens.extend(m.group(0) for m in rx.finditer(text or ""))
    return tokens


def find_ungrounded_claims(reply: str, grounded_texts: List[str]) -> List[str]:
    """Claim tokens in `reply` that appear in none of the grounded texts."""
    grounded_norms = set()
    for g in grounded_texts or []:
        for t in extract_claim_tokens(g or ""):
            grounded_norms.add(_norm(t))
    ungrounded: List[str] = []
    for t in extract_claim_tokens(reply or ""):
        if _norm(t) not in grounded_norms and t not in ungrounded:
            ungrounded.append(t)
    return ungrounded


def guard_llm_reply(
    reply: str,
    grounded_texts: Optional[List[str]] = None,
    user_text: str = "",
    history_texts: Optional[List[str]] = None,
) -> Tuple[str, bool]:
    """Validate an LLM reply against grounded evidence.

    Returns (reply_to_send, was_guarded). When ungrounded claims are found
    the reply is replaced — never patched — with a safe statement that names
    nothing it cannot verify.
    """
    all_grounded = list(grounded_texts or [])
    if user_text:
        all_grounded.append(user_text)
    all_grounded.extend(history_texts or [])
    ungrounded = find_ungrounded_claims(reply, all_grounded)
    if not ungrounded:
        return reply, False
    safe = (
        "I couldn't verify those details in your Panther TMS records, so I won't "
        "guess them. Please try tracking an LR, creating a job, or checking a ledger "
        "— or tap 'Talk to support' below the chat if you need a human."
    )
    return safe, True
