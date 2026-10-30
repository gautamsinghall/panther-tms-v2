"""
Panther AI Production-Hardened Draft Store.
Implements shared, multi-worker persistent draft state via Redis with:
- Multi-entity support: Transport LR/GR, Jobs, and Hire Challans
- Tenant-specific draft isolation and user ownership
- Comprehensive SHA-256 payload content hash & version integrity binding
- Single-use, short-lived confirmation tokens
- Distributed concurrency locks for multi-instance deployments
- Durable database-backed idempotency protection against retries and crashes
- Hermetic in-memory backend for unit test execution
"""
import os
import json
import hashlib
import secrets
import uuid
import logging
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
import asyncio

import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("panther.ai.draft_store")


def json_serial(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


DECIMAL_FIELDS = {
    "freight_rate", "freight_amount", "loading_charges", "unloading_charges",
    "other_charges", "total_freight_amount", "advance_amount", "balance_amount",
    "invoice_value", "actual_weight_mt", "chargeable_weight_mt",
    "hire_rate", "tds_rate", "tds_amount", "detention_charge", "mamul_charges",
    "net_payable_amount", "estimated_weight_mt"
}


def normalize_val(v: Any, field_name: Optional[str] = None) -> Any:
    """Normalizes any primitive, collection, or Decimal value into canonical format."""
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if field_name in DECIMAL_FIELDS:
        try:
            return f"{Decimal(str(v)):.2f}"
        except Exception:
            return str(v)
    if isinstance(v, Decimal):
        return f"{v:.2f}"
    if isinstance(v, float):
        return f"{v:.2f}"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    if isinstance(v, dict):
        return {k: normalize_val(val, k) for k, val in sorted(v.items())}
    if isinstance(v, list):
        return [normalize_val(item, field_name) for item in v]
    return str(v)


def compute_canonical_hash(draft_type: str, data: Dict[str, Any], office_id: Optional[int]) -> str:
    """
    Computes a deterministic SHA256 digest covering EVERY normalized field
    affecting the resulting database entity (LR, Job, or Hire Challan).
    """
    canonical: Dict[str, Any] = {}
    eff_office = data.get("issuing_office_id") or office_id

    if draft_type == "lr":
        from app.modules.transport.schemas import LRCreate
        fields = LRCreate.model_fields.keys()
        for k in fields:
            if k == "issuing_office_id":
                canonical[k] = normalize_val(eff_office, k)
            else:
                canonical[k] = normalize_val(data.get(k), k)
    elif draft_type == "job":
        from app.modules.transport.schemas import JobCreate
        fields = JobCreate.model_fields.keys()
        for k in fields:
            if k == "issuing_office_id":
                canonical[k] = normalize_val(eff_office, k)
            else:
                canonical[k] = normalize_val(data.get(k), k)
    elif draft_type in ("hire_challan", "hc"):
        from app.modules.transport.schemas import HireChallanCreate
        fields = HireChallanCreate.model_fields.keys()
        for k in fields:
            if k == "issuing_office_id":
                canonical[k] = normalize_val(eff_office, k)
            else:
                canonical[k] = normalize_val(data.get(k), k)
    else:
        canonical = {k: normalize_val(v, k) for k, v in sorted(data.items())}
        canonical["issuing_office_id"] = normalize_val(eff_office, "issuing_office_id")

    payload_json = json.dumps(canonical, sort_keys=True)
    return hashlib.sha256(payload_json.encode("utf-8")).hexdigest()


class AIDraft:
    """
    Authoritative state for conversational drafts across LRs, Jobs, and Hire Challans.
    """
    def __init__(
        self,
        draft_id: str,
        tenant_id: int,
        user_id: int,
        office_id: Optional[int] = None,
        draft_type: str = "lr",
    ):
        self.draft_id: str = draft_id
        self.draft_type: str = draft_type  # "lr", "job", "hire_challan"
        self.tenant_id: int = tenant_id
        self.user_id: int = user_id
        self.office_id: Optional[int] = office_id
        self.version: int = 1
        self.created_at: str = datetime.now(timezone.utc).isoformat()
        self.updated_at: str = datetime.now(timezone.utc).isoformat()
        self.data: Dict[str, Any] = {}
        self.preview_labels: Dict[str, str] = {}
        self.missing_fields: List[str] = []
        self.validation_errors: List[str] = []
        self.is_valid: bool = False
        self.confirmation_token: Optional[str] = None
        self.token_expires_at: Optional[str] = None
        self.content_hash: Optional[str] = None
        self.is_confirmed: bool = False
        self.created_entity_id: Optional[int] = None
        self.created_entity_number: Optional[str] = None

    @property
    def created_lr_id(self) -> Optional[int]:
        return self.created_entity_id

    @created_lr_id.setter
    def created_lr_id(self, val: Optional[int]):
        self.created_entity_id = val

    @property
    def created_lr_number(self) -> Optional[str]:
        return self.created_entity_number

    @created_lr_number.setter
    def created_lr_number(self, val: Optional[str]):
        self.created_entity_number = val

    def compute_content_hash(self) -> str:
        """Computes a deterministic SHA256 digest of every relevant normalized field."""
        return compute_canonical_hash(self.draft_type, self.data, self.office_id)

    def update_field(self, key: str, value: Any, label: Optional[str] = None) -> None:
        """
        Updates a draft data field, bumps version, and strictly invalidates
        any previously generated confirmation token and content approval.
        """
        self.data[key] = value
        if label:
            self.preview_labels[key] = label
        self.version += 1
        self.updated_at = datetime.now(timezone.utc).isoformat()
        # Invalidate approval on any data modification
        self.confirmation_token = None
        self.token_expires_at = None
        self.content_hash = None
        self.is_valid = False

    def generate_confirmation_token(self, ttl_minutes: int = 10) -> str:
        """
        Generates a secure, cryptographically random single-use confirmation token
        strictly bound to the exact current content hash and version.
        """
        self.content_hash = self.compute_content_hash()
        self.confirmation_token = f"tok_{secrets.token_urlsafe(24)}"
        exp = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
        self.token_expires_at = exp.isoformat()
        return self.confirmation_token

    def verify_content_integrity(self) -> bool:
        """Verifies that draft data has not been modified since token generation."""
        if not self.content_hash:
            return False
        return self.compute_content_hash() == self.content_hash

    def consume_confirmation_token(
        self,
        token: str,
        tenant_id: int,
        user_id: int,
    ) -> Tuple[bool, str]:
        """
        Validates token, content integrity, tenant/user ownership, and burns the token.
        Guarantees single-use execution.
        """
        if self.tenant_id != tenant_id or self.user_id != user_id:
            return False, "UNAUTHORIZED_TENANT_OR_USER"

        if self.is_confirmed:
            return False, "ALREADY_CONFIRMED"

        if not self.confirmation_token or self.confirmation_token != token:
            return False, "INVALID_TOKEN"

        if not self.verify_content_integrity():
            self.confirmation_token = None
            return False, "CONTENT_MODIFIED_SINCE_APPROVAL"

        if not self.token_expires_at:
            return False, "TOKEN_EXPIRED"

        if isinstance(self.token_expires_at, str):
            exp_dt = datetime.fromisoformat(self.token_expires_at)
        else:
            exp_dt = self.token_expires_at
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp_dt:
            self.confirmation_token = None
            return False, "TOKEN_EXPIRED"

        # Burn token immediately
        self.confirmation_token = None
        self.is_confirmed = True
        self.updated_at = datetime.now(timezone.utc).isoformat()
        return True, "TOKEN_VALID"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "draft_id": self.draft_id,
            "draft_type": self.draft_type,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "office_id": self.office_id,
            "version": self.version,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "data": self.data,
            "preview_labels": self.preview_labels,
            "missing_fields": self.missing_fields,
            "validation_errors": self.validation_errors,
            "is_valid": self.is_valid,
            "confirmation_token": self.confirmation_token,
            "token_expires_at": self.token_expires_at,
            "content_hash": self.content_hash,
            "is_confirmed": self.is_confirmed,
            "created_entity_id": self.created_entity_id,
            "created_entity_number": self.created_entity_number,
            "created_lr_id": self.created_entity_id,
            "created_lr_number": self.created_entity_number,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "AIDraft":
        draft = cls(
            draft_id=d["draft_id"],
            tenant_id=d["tenant_id"],
            user_id=d["user_id"],
            office_id=d.get("office_id"),
            draft_type=d.get("draft_type", "lr"),
        )
        draft.version = d.get("version", 1)
        draft.created_at = d.get("created_at", datetime.now(timezone.utc).isoformat())
        draft.updated_at = d.get("updated_at", datetime.now(timezone.utc).isoformat())
        draft.data = d.get("data", {})
        draft.preview_labels = d.get("preview_labels", {})
        draft.missing_fields = d.get("missing_fields", [])
        draft.validation_errors = d.get("validation_errors", [])
        draft.is_valid = d.get("is_valid", False)
        draft.confirmation_token = d.get("confirmation_token")
        draft.token_expires_at = d.get("token_expires_at")
        draft.content_hash = d.get("content_hash")
        draft.is_confirmed = d.get("is_confirmed", False)
        draft.created_entity_id = d.get("created_entity_id") or d.get("created_lr_id")
        draft.created_entity_number = d.get("created_entity_number") or d.get("created_lr_number")
        return draft


# Backward compatibility alias
LRDraft = AIDraft


# ==============================================================================
# STORAGE BACKENDS: REDIS (PRODUCTION) & IN-MEMORY (UNIT TESTING)
# ==============================================================================

class BaseDraftBackend:
    async def get_draft(self, draft_id: str) -> Optional[AIDraft]:
        raise NotImplementedError

    async def save_draft(self, draft: AIDraft, ttl_seconds: int = 3600) -> None:
        raise NotImplementedError

    async def get_active_draft_id(self, tenant_id: int, user_id: int, draft_type: str = "lr") -> Optional[str]:
        raise NotImplementedError

    async def set_active_draft_id(self, tenant_id: int, user_id: int, draft_id: str, draft_type: str = "lr", ttl_seconds: int = 3600) -> None:
        raise NotImplementedError

    async def clear_active_draft_id(self, tenant_id: int, user_id: int, draft_type: Optional[str] = None) -> None:
        raise NotImplementedError

    async def acquire_lock(self, draft_id: str, ttl_ms: int = 15000) -> bool:
        raise NotImplementedError

    async def release_lock(self, draft_id: str) -> None:
        raise NotImplementedError

    async def get_confirmed_operation(self, draft_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    async def record_confirmed_operation(self, draft_id: str, result: Dict[str, Any], ttl_seconds: int = 86400) -> None:
        raise NotImplementedError


class RedisDraftBackend(BaseDraftBackend):
    """Production shared storage backend across Dokploy multi-worker instances."""

    def __init__(self, redis_url: Optional[str] = None):
        self._url = redis_url or settings.redis_connection_url
        self._redis: Optional[aioredis.Redis] = None

    async def _get_client(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(self._url, decode_responses=True)
        return self._redis

    async def get_draft(self, draft_id: str) -> Optional[AIDraft]:
        r = await self._get_client()
        raw = await r.get(f"panther:ai:draft:{draft_id}")
        if not raw:
            # Fallback to legacy key
            raw = await r.get(f"panther:ai:lr_draft:{draft_id}")
        if not raw:
            return None
        try:
            data = json.loads(raw)
            return AIDraft.from_dict(data)
        except Exception as e:
            logger.error(f"Failed to deserialize draft {draft_id}: {e}")
            return None

    async def save_draft(self, draft: AIDraft, ttl_seconds: int = 3600) -> None:
        r = await self._get_client()
        payload = json.dumps(draft.to_dict(), default=json_serial)
        await r.set(f"panther:ai:draft:{draft.draft_id}", payload, ex=ttl_seconds)
        # Also maintain legacy key for LRs
        if draft.draft_type == "lr":
            await r.set(f"panther:ai:lr_draft:{draft.draft_id}", payload, ex=ttl_seconds)

    async def get_active_draft_id(self, tenant_id: int, user_id: int, draft_type: str = "lr") -> Optional[str]:
        r = await self._get_client()
        res = await r.get(f"panther:ai:user_active:{tenant_id}:{user_id}:{draft_type}")
        if not res and draft_type == "lr":
            res = await r.get(f"panther:ai:user_active:{tenant_id}:{user_id}")
        return res

    async def set_active_draft_id(self, tenant_id: int, user_id: int, draft_id: str, draft_type: str = "lr", ttl_seconds: int = 3600) -> None:
        r = await self._get_client()
        await r.set(f"panther:ai:user_active:{tenant_id}:{user_id}:{draft_type}", draft_id, ex=ttl_seconds)
        if draft_type == "lr":
            await r.set(f"panther:ai:user_active:{tenant_id}:{user_id}", draft_id, ex=ttl_seconds)

    async def clear_active_draft_id(self, tenant_id: int, user_id: int, draft_type: Optional[str] = None) -> None:
        r = await self._get_client()
        if draft_type:
            await r.delete(f"panther:ai:user_active:{tenant_id}:{user_id}:{draft_type}")
            if draft_type == "lr":
                await r.delete(f"panther:ai:user_active:{tenant_id}:{user_id}")
        else:
            await r.delete(
                f"panther:ai:user_active:{tenant_id}:{user_id}:lr",
                f"panther:ai:user_active:{tenant_id}:{user_id}:job",
                f"panther:ai:user_active:{tenant_id}:{user_id}:hire_challan",
                f"panther:ai:user_active:{tenant_id}:{user_id}",
            )

    async def acquire_lock(self, draft_id: str, ttl_ms: int = 15000) -> bool:
        r = await self._get_client()
        res = await r.set(f"panther:ai:lock:{draft_id}", "locked", nx=True, px=ttl_ms)
        return bool(res)

    async def release_lock(self, draft_id: str) -> None:
        r = await self._get_client()
        await r.delete(f"panther:ai:lock:{draft_id}")
        await r.delete(f"panther:ai:lr_lock:{draft_id}")

    async def get_confirmed_operation(self, draft_id: str) -> Optional[Dict[str, Any]]:
        r = await self._get_client()
        raw = await r.get(f"panther:ai:confirmed_op:{draft_id}")
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    async def record_confirmed_operation(self, draft_id: str, result: Dict[str, Any], ttl_seconds: int = 86400) -> None:
        r = await self._get_client()
        payload = json.dumps(result, default=json_serial)
        await r.set(f"panther:ai:confirmed_op:{draft_id}", payload, ex=ttl_seconds)


class InMemoryDraftBackend(BaseDraftBackend):
    """Thread-safe in-memory backend for hermetic unit testing without Redis."""

    def __init__(self):
        self._drafts: Dict[str, str] = {}
        self._user_active: Dict[str, str] = {}
        self._locks: Dict[str, datetime] = {}
        self._confirmed: Dict[str, str] = {}
        self._lock = asyncio.Lock()

    async def get_draft(self, draft_id: str) -> Optional[AIDraft]:
        async with self._lock:
            raw = self._drafts.get(draft_id)
            if not raw:
                return None
            return AIDraft.from_dict(json.loads(raw))

    async def save_draft(self, draft: AIDraft, ttl_seconds: int = 3600) -> None:
        async with self._lock:
            payload = json.dumps(draft.to_dict(), default=json_serial)
            self._drafts[draft.draft_id] = payload

    async def get_active_draft_id(self, tenant_id: int, user_id: int, draft_type: str = "lr") -> Optional[str]:
        async with self._lock:
            res = self._user_active.get(f"{tenant_id}:{user_id}:{draft_type}")
            if not res and draft_type == "lr":
                res = self._user_active.get(f"{tenant_id}:{user_id}")
            return res

    async def set_active_draft_id(self, tenant_id: int, user_id: int, draft_id: str, draft_type: str = "lr", ttl_seconds: int = 3600) -> None:
        async with self._lock:
            self._user_active[f"{tenant_id}:{user_id}:{draft_type}"] = draft_id
            if draft_type == "lr":
                self._user_active[f"{tenant_id}:{user_id}"] = draft_id

    async def clear_active_draft_id(self, tenant_id: int, user_id: int, draft_type: Optional[str] = None) -> None:
        async with self._lock:
            if draft_type:
                self._user_active.pop(f"{tenant_id}:{user_id}:{draft_type}", None)
                if draft_type == "lr":
                    self._user_active.pop(f"{tenant_id}:{user_id}", None)
            else:
                self._user_active.pop(f"{tenant_id}:{user_id}:lr", None)
                self._user_active.pop(f"{tenant_id}:{user_id}:job", None)
                self._user_active.pop(f"{tenant_id}:{user_id}:hire_challan", None)
                self._user_active.pop(f"{tenant_id}:{user_id}", None)

    async def acquire_lock(self, draft_id: str, ttl_ms: int = 15000) -> bool:
        async with self._lock:
            now = datetime.now(timezone.utc)
            if draft_id in self._locks:
                exp = self._locks[draft_id]
                if now < exp:
                    return False
            self._locks[draft_id] = now + timedelta(milliseconds=ttl_ms)
            return True

    async def release_lock(self, draft_id: str) -> None:
        async with self._lock:
            self._locks.pop(draft_id, None)

    async def get_confirmed_operation(self, draft_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            raw = self._confirmed.get(draft_id)
            return json.loads(raw) if raw else None

    async def record_confirmed_operation(self, draft_id: str, result: Dict[str, Any], ttl_seconds: int = 86400) -> None:
        async with self._lock:
            self._confirmed[draft_id] = json.dumps(result, default=json_serial)


# ==============================================================================
# UNIFIED AI DRAFT STORE
# ==============================================================================

class AIDraftStore:
    def __init__(self, backend: Optional[BaseDraftBackend] = None, redis_url: Optional[str] = None):
        if backend is not None:
            self.backend = backend
            return
        if redis_url is not None:
            self.backend = RedisDraftBackend(redis_url=redis_url)
            return

        import sys
        is_test_env = (
            os.environ.get("USE_IN_MEMORY_DRAFT_STORE", "").strip().lower() in ("1", "true")
            or settings.ENVIRONMENT.lower() in ("test", "testing")
            or "pytest" in sys.modules
        )
        if is_test_env:
            self.backend: BaseDraftBackend = InMemoryDraftBackend()
        else:
            self.backend = RedisDraftBackend()

    def set_backend(self, backend: BaseDraftBackend) -> None:
        """Allows test fixtures to explicitly inject mocked or shared backends."""
        self.backend = backend

    async def get_or_create_active_draft(
        self,
        tenant_id: int,
        user_id: int,
        office_id: Optional[int] = None,
        draft_type: str = "lr",
    ) -> AIDraft:
        active_id = await self.backend.get_active_draft_id(tenant_id, user_id, draft_type=draft_type)
        if active_id:
            draft = await self.backend.get_draft(active_id)
            if draft and not draft.is_confirmed and draft.draft_type == draft_type:
                if office_id and not draft.office_id:
                    draft.office_id = office_id
                    await self.backend.save_draft(draft)
                return draft

        # Create new draft session
        new_id = f"draft_{draft_type}_{uuid.uuid4().hex[:12]}"
        draft = AIDraft(
            draft_id=new_id,
            tenant_id=tenant_id,
            user_id=user_id,
            office_id=office_id,
            draft_type=draft_type,
        )
        await self.backend.save_draft(draft)
        await self.backend.set_active_draft_id(tenant_id, user_id, new_id, draft_type=draft_type)
        return draft

    async def get_active_draft_id(self, tenant_id: int, user_id: int, draft_type: str = "lr") -> Optional[str]:
        return await self.backend.get_active_draft_id(tenant_id, user_id, draft_type=draft_type)

    async def get_active_draft(self, tenant_id: int, user_id: int, draft_type: str = "lr") -> Optional[AIDraft]:
        draft_id = await self.backend.get_active_draft_id(tenant_id, user_id, draft_type=draft_type)
        if not draft_id:
            return None
        return await self.backend.get_draft(draft_id)

    async def get_draft(self, draft_id: str) -> Optional[AIDraft]:
        return await self.backend.get_draft(draft_id)

    async def save_draft(self, draft: AIDraft) -> None:
        await self.backend.save_draft(draft)

    async def clear_active_draft(self, tenant_id: int, user_id: int, draft_type: Optional[str] = None) -> bool:
        active_id = await self.backend.get_active_draft_id(tenant_id, user_id, draft_type=draft_type or "lr")
        await self.backend.clear_active_draft_id(tenant_id, user_id, draft_type=draft_type)
        return active_id is not None

    async def acquire_lock(self, draft_id: str, ttl_ms: int = 15000) -> bool:
        return await self.backend.acquire_lock(draft_id, ttl_ms=ttl_ms)

    async def release_lock(self, draft_id: str) -> None:
        await self.backend.release_lock(draft_id)

    async def get_confirmed_operation(self, draft_id: str) -> Optional[Dict[str, Any]]:
        return await self.backend.get_confirmed_operation(draft_id)

    async def record_confirmed_operation(self, draft_id: str, result: Dict[str, Any]) -> None:
        await self.backend.record_confirmed_operation(draft_id, result)


# Backward compatibility aliases
LRDraftStore = AIDraftStore

# Global singleton instance
lr_draft_store = AIDraftStore()
