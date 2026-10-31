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
        if not os.path.exists(self.doc_path):
            return 0

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

        self.chunks = new_chunks
        self._last_mtime = os.path.getmtime(self.doc_path)
        self._last_hash = current_hash
        return len(self.chunks)

    STOP_WORDS = {
        "the", "is", "a", "an", "and", "or", "for", "of", "in", "on", "at", "to",
        "what", "how", "with", "from", "by", "this", "that", "it", "are", "as",
        "be", "do", "i", "can", "you", "me", "my", "we", "our", "so", "if"
    }

    def _tokenize(self, text: str) -> List[str]:
        raw_tokens = TOKEN_PATTERN.findall(text.lower())
        content_tokens = [t for t in raw_tokens if t not in self.STOP_WORDS and len(t) > 1]
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
        top_k: int = 3,
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

        for chunk in self.chunks:
            # 1. Enforce Plan Entitlement Barrier
            if chunk.min_plan_tier > tenant_tier:
                continue

            # 2. Enforce User RBAC Barrier (if category permissions are supplied)
            if user_permitted_categories is not None:
                if chunk.category not in ("general", "rules", "errors", "security"):
                    if chunk.category not in user_permitted_categories:
                        continue

            # 3. Calculate Hybrid BM25-like Score
            score = 0.0
            chunk_tokens = self._tokenize(chunk.content)
            title_tokens = self._tokenize(chunk.title)
            chunk_token_set = set(chunk_tokens)
            title_token_set = set(title_tokens)
            keyword_set = set(chunk.keywords)

            for qt in query_tokens:
                # Title match boost (3.0)
                if qt in title_token_set:
                    score += 3.0
                # Keyword match boost (2.0)
                if qt in keyword_set:
                    score += 2.0
                # Content frequency match
                if qt in chunk_token_set:
                    tf = chunk_tokens.count(qt)
                    score += 1.0 + math.log1p(tf)

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
        top_k: int = 3,
    ) -> Tuple[str, List[Dict[str, str]]]:
        """
        Retrieves matching chunks and builds a grounded context block with exact source citations.
        """
        chunks, is_fallback = self.retrieve(
            query=query,
            plan_code=plan_code,
            user_permitted_categories=user_permitted_categories,
            top_k=top_k,
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
            + "\nIMPORTANT: Ground your response strictly on the retrieved specifications above. "
            "Cite the relevant source title where applicable. If the retrieved documents do not answer "
            "the user's question, acknowledge that the topic is not documented in PantherTMS."
        )

        return grounded_block, citations


# Global knowledge engine instance
knowledge_engine = PantherKnowledgeEngine()
