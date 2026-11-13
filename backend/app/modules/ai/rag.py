"""
PantherTMS Retrieval-Augmented Generation (RAG) Knowledge Engine.
Provides document ingestion, tenant-entitlement-aware semantic retrieval,
source citation grounding, and incremental reindexing.
"""
import os
import re
import math
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from app.auth.navigation import PLAN_TIERS

# v3 TMS expert KB (plain dicts — no import cycle: tms_knowledge never imports rag).
try:
    from app.modules.ai.tms_knowledge import TMS_KNOWLEDGE_CHUNKS
except Exception:  # standalone / test import where the module is top-level
    try:
        from tms_knowledge import TMS_KNOWLEDGE_CHUNKS
    except Exception:
        TMS_KNOWLEDGE_CHUNKS = []


def _tms_knowledge_chunks() -> List["KnowledgeChunk"]:
    """Convert the plain-dict v3 KB into KnowledgeChunk objects."""
    out: List[KnowledgeChunk] = []
    for d in TMS_KNOWLEDGE_CHUNKS:
        out.append(
            KnowledgeChunk(
                doc_id=d["doc_id"],
                title=d["title"],
                category=d.get("category", "general"),
                min_plan_tier=d.get("min_plan_tier", 1),
                source_file=d.get("source_file", "backend/app/modules/ai/tms_knowledge.py"),
                version=d.get("version", "2026.1"),
                content=d["content"],
                route=d.get("route", ""),
                permissions=d.get("permissions", []),
                keywords=d.get("keywords", []),
            )
        )
    return out


@dataclass
class KnowledgeChunk:
    doc_id: str
    title: str
    category: str
    min_plan_tier: int
    source_file: str
    version: str
    content: str
    route: str = ""
    permissions: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)


# Unicode punctuation and whitespace splitter pattern
TOKEN_PATTERN = re.compile(r"[^\s\.,!?;:()\[\]\"\'\\/<>|+=*&^%$#@~`]+")


# Synonyms for transport logistics domain in English, Hindi, and Hinglish
SYNONYM_MAP: Dict[str, List[str]] = {
    # Transport & Bookings
    "lr": ["bilty", "gr", "consignment", "lorry", "goods", "booking", "receipt", "एलआर", "बिल्टी"],
    "bilty": ["lr", "gr", "consignment", "lorry", "receipt", "एलआर", "बिल्टी"],
    "gr": ["lr", "bilty", "consignment", "goods", "receipt"],
    "challan": ["hire", "memo", "truck", "hiring", "supplier", "diesel", "advance", "चालान"],
    "job": ["order", "transport", "booking", "indent", "जॉब", "ऑर्डर"],
    "order": ["job", "transport", "booking", "indent", "ऑर्डर"],
    "trip": ["movement", "transit", "dispatch", "यात्रा"],

    # Financials & Accounting
    "ledger": ["khata", "hisab", "balance", "outstanding", "debit", "credit", "खाता", "लेजर"],
    "khata": ["ledger", "hisab", "balance", "outstanding", "खाता"],
    "invoice": ["bill", "einvoice", "gst", "irn", "qr", "बिल", "इनवॉइस"],
    "bill": ["invoice", "einvoice", "gst", "बिल"],
    "voucher": ["receipt", "payment", "contra", "journal", "वाउचर"],
    "payment": ["voucher", "settlement", "receipt", "भुगतान"],
    "statement": ["balance", "pnl", "profit", "loss", "trial", "p&l"],

    # Fleet & Telematics
    "vehicle": ["gaadi", "gadi", "truck", "lorry", "market", "fleet", "गाड़ी", "वाहन"],
    "gaadi": ["vehicle", "truck", "market", "fleet", "गाड़ी", "वाहन"],
    "gadi": ["vehicle", "truck", "market", "fleet", "गाड़ी", "वाहन"],
    "driver": ["chalak", "license", "dl", "phone", "चालक", "ड्राइवर"],
    "chalak": ["driver", "license", "चालक", "ड्राइवर"],
    "fastag": ["toll", "plaza", "netc", "cooldown", "फास्टैग"],
    "sim": ["consent", "phone", "freight", "tiger", "tracking", "सिम"],
    "gps": ["tracking", "telematics", "location", "जीपीएस"],
    "tracking": ["location", "gps", "sim", "fastag", "ट्रैकिंग"],

    # Hindi Devanagari mappings
    "एलआर": ["lr", "bilty", "gr", "consignment", "receipt"],
    "बिल्टी": ["lr", "bilty", "gr", "consignment", "receipt"],
    "चालान": ["challan", "hire", "memo", "supplier"],
    "गाड़ी": ["vehicle", "truck", "gaadi", "gadi", "lorry"],
    "वाहन": ["vehicle", "truck", "gaadi", "gadi", "lorry"],
    "चालक": ["driver", "chalak", "license"],
    "खाता": ["ledger", "khata", "balance", "outstanding"],
    "ट्रैकिंग": ["tracking", "gps", "sim", "fastag"],
    "फास्टैग": ["fastag", "toll", "plaza"],
    "सिम": ["sim", "consent", "tracking"],
    "बिल": ["bill", "invoice", "gst"],

    # System & Errors
    "error": ["401", "403", "404", "unauthorized", "forbidden", "locked", "quota"],
    "role": ["permission", "rbac", "access", "branch", "user"],
    "settings": ["company", "branch", "config", "profile"],
}


class PantherKnowledgeEngine:
    """
    In-memory, zero-dependency, high-precision retrieval engine for PantherTMS.
    Supports incremental reindexing, tenant entitlement gating, and source-grounded answers.
    """

    def __init__(self, doc_path: Optional[str] = None):
        if doc_path:
            self.doc_path = doc_path
        else:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
            self.doc_path = os.path.join(base_dir, "docs", "AI_TMS_KNOWLEDGE_BASE.md")

        self.chunks: List[KnowledgeChunk] = []
        self._last_mtime: float = 0.0
        self._last_hash: str = ""
        # BM25 statistics, rebuilt whenever the index is (re)built.
        self._chunk_tokens: List[List[str]] = []
        self._chunk_counters: List[Any] = []
        self._doc_freq: Dict[str, int] = {}
        self._avgdl: float = 0.0
        self.load_and_index()

    def _should_reindex(self) -> bool:
        if not os.path.exists(self.doc_path):
            return False
        current_mtime = os.path.getmtime(self.doc_path)
        return current_mtime > self._last_mtime

    def load_and_index(self, force: bool = False) -> int:
        """
        Parses AI_TMS_KNOWLEDGE_BASE.md into structured knowledge chunks.
        Performs incremental reindexing only if file content or timestamp changed.
        """
        # v3: the TMS expert KB (tms_knowledge.py) ALWAYS loads, even when the
        # legacy MD file is missing — load_and_index() used to return 0 early
        # in that case, leaving the bot with no knowledge at all.
        tms_chunks = _tms_knowledge_chunks()
        if not os.path.exists(self.doc_path):
            if not self.chunks:
                self.chunks = tms_chunks
                self._build_bm25_stats()
            return len(self.chunks)

        if not force and not self._should_reindex():
            return len(self.chunks)

        with open(self.doc_path, "r", encoding="utf-8") as f:
            raw_text = f.read()

        current_hash = hashlib.md5(raw_text.encode("utf-8")).hexdigest()
        if not force and current_hash == self._last_hash and len(self.chunks) > 0:
            return len(self.chunks)

        # Parse markdown sections (## N. Title)
        sections = re.split(r"\n##\s+", raw_text)
        new_chunks: List[KnowledgeChunk] = []

        for sec in sections[1:]:  # skip document header
            lines = sec.strip().split("\n")
            if not lines:
                continue

            title = lines[0].strip()
            doc_id = "general"
            category = "general"
            min_tier = 1
            source_file = "docs/AI_TMS_KNOWLEDGE_BASE.md"
            version = "2026.1"
            keywords: List[str] = []

            # Extract metadata fields
            body_lines = []
            route = ""
            permissions: List[str] = []
            for line in lines[1:]:
                m_id = re.match(r"-\s+\*\*Document ID\*\*:\s*`([^`]+)`", line)
                m_cat = re.match(r"-\s+\*\*Category\*\*:\s*`([^`]+)`", line)
                m_tier = re.match(r"-\s+\*\*Minimum Plan Tier\*\*:\s*`?(\d+)`?", line)
                m_src = re.match(r"-\s+\*\*Source File\*\*:\s*`([^`]+)`", line)
                m_kw = re.match(r"-\s+\*\*Keywords\*\*:\s*`([^`]+)`", line)
                m_route = re.match(r"-\s+\*\*Route\*\*:\s*`([^`]+)`", line)
                m_perm = re.match(r"-\s+\*\*Permissions\*\*:\s*`([^`]+)`", line)

                if m_id:
                    doc_id = m_id.group(1).strip()
                elif m_cat:
                    category = m_cat.group(1).strip()
                elif m_tier:
                    min_tier = int(m_tier.group(1).strip())
                elif m_src:
                    source_file = m_src.group(1).strip()
                elif m_kw:
                    keywords = [k.strip().lower() for k in m_kw.group(1).split(",")]
                elif m_route:
                    route = m_route.group(1).strip()
                elif m_perm:
                    permissions = [p.strip() for p in m_perm.group(1).split(",") if p.strip()]
                else:
                    body_lines.append(line)

            content = "\n".join(body_lines).strip()
            new_chunks.append(
                KnowledgeChunk(
                    doc_id=doc_id,
                    title=title,
                    category=category,
                    min_plan_tier=min_tier,
                    source_file=source_file,
                    version=version,
                    content=content,
                    route=route,
                    permissions=permissions,
                    keywords=keywords,
                )
            )

        # v3: extend with the TMS expert KB BEFORE building BM25 stats, so the
        # new chunks are indexed and retrievable. MD chunks win on doc_id clash.
        _seen = {c.doc_id for c in new_chunks}
        self.chunks = new_chunks + [c for c in tms_chunks if c.doc_id not in _seen]
        self._build_bm25_stats()
        self._last_mtime = os.path.getmtime(self.doc_path)
        self._last_hash = current_hash
        return len(self.chunks)

    def _build_bm25_stats(self) -> None:
        """Precompute per-chunk token lists, document frequencies and
        average document length for BM25. Called on every (re)index.

        v3: tokens are the heading path (title) + content, with NO synonym
        expansion on the chunk side — synonyms expand on the QUERY only
        (see _tokenize), so "lr" no longer matches "goods"/"booking"/
        "receipt" inside every chunk. Term counts are precomputed Counters
        instead of rescanning the token list per query term.
        """
        from collections import Counter

        # Heading-path prefix: the chunk title is part of the indexed text.
        self._chunk_tokens = [
            self._tokenize(f"{c.title} {c.content}", expand_synonyms=False)
            for c in self.chunks
        ]
        self._chunk_counters = [Counter(t) for t in self._chunk_tokens]
        df: Counter = Counter()
        for tokens in self._chunk_tokens:
            for t in set(tokens):
                df[t] += 1
        self._doc_freq = dict(df)
        total_len = sum(len(t) for t in self._chunk_tokens)
        self._avgdl = (total_len / len(self._chunk_tokens)) if self._chunk_tokens else 0.0

    STOP_WORDS = {
        "the", "is", "a", "an", "and", "or", "for", "of", "in", "on", "at", "to",
        "what", "how", "with", "from", "by", "this", "that", "it", "are", "as",
        "be", "do", "i", "can", "you", "me", "my", "we", "our", "so", "if"
    }

    def _tokenize(self, text: str, expand_synonyms: bool = True) -> List[str]:
        """Tokenize text. Synonym expansion is QUERY-ONLY by default
        (v3 fix): chunks are indexed verbatim, so an expanded query term
        ("lr" -> "bilty", "gr", ...) matches chunk text, but chunk text is
        never silently expanded into unrelated terms. Callers indexing
        chunks must pass expand_synonyms=False.
        """
        raw_tokens = TOKEN_PATTERN.findall(text.lower())
        content_tokens = [t for t in raw_tokens if t not in self.STOP_WORDS and len(t) > 1]
        if not expand_synonyms:
            return content_tokens
        expanded = list(content_tokens)
        for t in content_tokens:
            if t in SYNONYM_MAP:
                expanded.extend(SYNONYM_MAP[t])
        return expanded

    def retrieve(
        self,
        query: str,
        plan_code: str = "PRO",
        user_permitted_categories: Optional[List[str]] = None,
        top_k: int = 5,
        current_page: Optional[str] = None,
    ) -> Tuple[List[KnowledgeChunk], bool]:
        """
        Retrieves top K chunks matching the query while enforcing:
        1. Tenant plan entitlement limits.
        2. Employee RBAC category permissions.
        3. Semantic relevance scoring.
        Returns: (matched_chunks, is_fallback_required)
        """
        # Ensure index is up to date
        self.load_and_index()

        tenant_tier = PLAN_TIERS.get(plan_code.upper(), 2)
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return [], True

        scored_chunks: List[Tuple[float, KnowledgeChunk]] = []

        for chunk_pos, chunk in enumerate(self.chunks):
            # 1. Enforce Plan Entitlement Barrier
            if chunk.min_plan_tier > tenant_tier:
                continue

            # 2. Enforce User RBAC Barrier (if category permissions are supplied)
            if user_permitted_categories is not None:
                if chunk.category not in ("general", "rules", "errors", "security"):
                    if chunk.category not in user_permitted_categories:
                        continue

            # 3. BM25 ranking (No.14 P1, pure Python — no embeddings).
            # score = sum over query terms of IDF * tf*(k1+1) / (tf + k1*(1-b+b*dl/avgdl))
            # plus the existing title (+3.0) and keyword (+2.0) boosts.
            score = 0.0
            chunk_tokens = self._chunk_tokens[chunk_pos] if chunk_pos < len(self._chunk_tokens) else []
            chunk_counter = (
                self._chunk_counters[chunk_pos]
                if chunk_pos < len(self._chunk_counters)
                else {}
            )
            title_tokens = self._tokenize(chunk.title, expand_synonyms=False)
            title_token_set = set(title_tokens)
            keyword_set = set(chunk.keywords)
            doc_len = len(chunk_tokens)
            n_docs = len(self.chunks) or 1
            k1 = 1.5
            b = 0.75

            for qt in query_tokens:
                # Title match boost (3.0)
                if qt in title_token_set:
                    score += 3.0
                # Keyword match boost (2.0)
                if qt in keyword_set:
                    score += 2.0
                # BM25 content term (v3: precomputed Counter, no rescan)
                tf = chunk_counter.get(qt, 0)
                if tf > 0:
                    df = self._doc_freq.get(qt, 0)
                    idf = math.log(1 + (n_docs - df + 0.5) / (df + 0.5))
                    denom = tf + k1 * (1 - b + b * (doc_len / self._avgdl if self._avgdl else 0.0))
                    score += idf * (tf * (k1 + 1) / denom)

            # v3: boost chunks whose route matches the page the user is on —
            # but only when the chunk already matched the query (score > 0),
            # so a page match alone never invents relevance.
            if score > 0.0 and current_page and chunk.route:
                page = current_page.strip().split("|")[0].strip().split("?")[0].rstrip("/")
                if chunk.route == page or page.endswith(chunk.route) or chunk.route in page:
                    score += 5.0
            if score > 0.0:
                scored_chunks.append((score, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # Minimum confidence threshold
        if not scored_chunks or scored_chunks[0][0] < 1.0:
            return [], True

        top_chunks = [c for _, c in scored_chunks[:top_k]]
        return top_chunks, False

    def format_grounded_context(
        self,
        query: str,
        plan_code: str = "PRO",
        user_permitted_categories: Optional[List[str]] = None,
        top_k: int = 5,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        current_page: Optional[str] = None,
    ) -> Tuple[str, List[Dict[str, str]]]:
        """
        Retrieves matching chunks and builds a grounded context block with exact source citations.
        v3: follow-up questions are rewritten into standalone queries from
        chat history first (see rewrite_followup_query), and chunks for the
        current page are boosted.
        """
        query = rewrite_followup_query(query, conversation_history)
        chunks, is_fallback = self.retrieve(
            query=query,
            plan_code=plan_code,
            user_permitted_categories=user_permitted_categories,
            top_k=top_k,
            current_page=current_page,
        )

        if is_fallback or not chunks:
            return "", []

        citations: List[Dict[str, str]] = []
        context_parts = []

        for idx, c in enumerate(chunks, 1):
            citation_label = f"{c.source_file} § {c.title}"
            citations.append({
                "doc_id": c.doc_id,
                "title": c.title,
                "source": citation_label,
            })
            context_parts.append(
                f"--- SOURCE [{idx}]: {citation_label} (Version: {c.version}) ---\n"
                f"{c.content}\n"
            )

        grounded_block = (
            "AUTHORITATIVE PANTHERTMS RETRIEVED SPECIFICATIONS:\n"
            + "\n".join(context_parts)
            + "\nIMPORTANT: Use the retrieved specifications above FIRST to answer. "
            "If they do not fully answer the question, you may then use general "
            "logistics knowledge — but say clearly which source you used "
            "(retrieved Panther docs vs general logistics knowledge). "
            "Cite the relevant source title where applicable. "
            "Never invent a live record (LR/job/vehicle/balance): for live data "
            "use a tool, and if a record is not found, say so."
        )

        return grounded_block, citations


_ANAPHORA_RE = re.compile(
    r"\b(its|it|this|that|they|them|uska|uski|uske|iska|iski|is|yeh|woh|aur\s+uski)\b",
    re.IGNORECASE,
)
_FOLLOWUP_RE = re.compile(
    r"^\s*(what about|and what about|aur|and its|and his|and her|what\'s|how about|is.*\babout\b)",
    re.IGNORECASE,
)


def rewrite_followup_query(
    query: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Rewrite a follow-up question into a standalone query (v3).

    "what about its charges?" on its own retrieves nothing useful, because
    the entity lives in an earlier turn. If the query is anaphoric (its /
    this / that / "what about ...") and an earlier USER message named a
    concrete topic (LR/vehicle/job/e-way/POD/invoice...), the last such
    message is prepended so retrieval sees the real subject. Otherwise the
    query is returned unchanged.
    """
    if not query or not conversation_history:
        return query
    q = query.strip()
    if not (_ANAPHORA_RE.search(q) or _FOLLOWUP_RE.search(q)):
        return query
    prior_user = [
        m.get("content", "").strip()
        for m in conversation_history
        if isinstance(m, dict) and m.get("role") == "user" and m.get("content", "").strip()
    ]
    if not prior_user:
        return query
    topic = prior_user[-1][:160]
    # Only rewrite when the prior turn actually named something concrete.
    if not re.search(
        r"\b(lr|gr|bilty|job|vehicle|truck|eway|e-way|ewb|pod|invoice|bill|ledger|driver|challan|freight|tracking|fastag|gps|sim)\b|"
        r"[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\b(?:LR|JOB|HC|INV)[-_\s#]?\d",
        topic,
        re.IGNORECASE,
    ):
        return query
    return f"{topic} | {q}"


# Global knowledge engine instance
knowledge_engine = PantherKnowledgeEngine()
