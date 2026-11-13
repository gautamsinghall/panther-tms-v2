"""
Panther AI Output Guards (No.14 rebuild).

Claim-vs-source check for LLM replies. The LLM is the only unconstrained
text path in the chatbot: typed-tool and draft replies render tool results
verbatim, so they are grounded by construction and are NOT re-guarded here.

v3 loosening (reviewer fix): the old rule replaced the WHOLE reply if ANY
date / rupee amount / ID was not in the sources — which wiped good general
answers such as "e-way bills became mandatory on 1 April 2018". New rule:
- Knowledge answers (default): only invented RECORD identifiers are
  blocked — LR/job/challan/invoice numbers and vehicle registrations
  that appear in no grounded source. General numbers and dates (thresholds,
  rates, historical dates) are allowed: they come from general logistics
  knowledge, not from a live record.
- Live-record answers (strict_live_records=True, for replies built from
  live tool records): the old strict rule — any ungrounded ID, vehicle,
  amount or date blocks the reply.
Individual tokens are never patched in place, because a partially-edited
reply can still mislead; the whole reply is replaced when blocked.

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


_ID_VEHICLE_RES = (_ID_RE, _VEHICLE_RE)


def find_ungrounded_ids(reply: str, grounded_texts: List[str]) -> List[str]:
    """Only invented record identifiers: LR/job/challan/invoice numbers and
    vehicle registrations in `reply` that appear in no grounded text."""
    grounded_norms = set()
    for g in grounded_texts or []:
        for rx in _ID_VEHICLE_RES:
            for t in rx.finditer(g or ""):
                grounded_norms.add(_norm(t.group(0)))
    ungrounded: List[str] = []
    for rx in _ID_VEHICLE_RES:
        for m in rx.finditer(reply or ""):
            t = m.group(0)
            if _norm(t) not in grounded_norms and t not in ungrounded:
                ungrounded.append(t)
    return ungrounded


def guard_llm_reply(
    reply: str,
    grounded_texts: Optional[List[str]] = None,
    user_text: str = "",
    history_texts: Optional[List[str]] = None,
    strict_live_records: bool = False,
) -> Tuple[str, bool]:
    """Validate an LLM reply against grounded evidence.

    Returns (reply_to_send, was_guarded). When blocked, the reply is
    replaced — never patched — with a safe statement that names nothing it
    cannot verify.

    strict_live_records=False (default, knowledge answers): only ungrounded
    record IDs / vehicle numbers block. Amounts and dates are general
    knowledge and are allowed.
    strict_live_records=True (live-record answers): any ungrounded ID,
    vehicle, amount or date blocks, as before.
    """
    all_grounded = list(grounded_texts or [])
    if user_text:
        all_grounded.append(user_text)
    all_grounded.extend(history_texts or [])
    if strict_live_records:
        ungrounded = find_ungrounded_claims(reply, all_grounded)
    else:
        ungrounded = find_ungrounded_ids(reply, all_grounded)
    if not ungrounded:
        return reply, False
    safe = (
        "I couldn't verify those details in your Panther TMS records, so I won't "
        "guess them. Please try tracking an LR, checking a ledger, or asking "
        "about the page you are on — or tap 'Talk to support' below the chat "
        "if you need a human."
    )
    return safe, True
