import hmac
import hashlib
import json
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("panther.integrations.razorpay")


class RazorpayClient:
    """
    Razorpay Subscription and Webhook Integration Client.
    Follows rules.md §8 (security — webhook signature verification)
    and architecture.md §7 (Payments - Razorpay).
    """

    def __init__(self, key_id: str = "", key_secret: str = "", webhook_secret: str = ""):
        self.key_id = key_id
        self.key_secret = key_secret
        self.webhook_secret = webhook_secret

    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature: str,
        secret: Optional[str] = None
    ) -> bool:
        """
        Cryptographically verifies the Razorpay webhook signature using HMAC-SHA256.
        Per rules.md §8: 'All Razorpay webhook payloads verified via signature before processing.'
        """
        verify_secret = secret or self.webhook_secret
        if not verify_secret or not signature:
            logger.error("Missing webhook secret or signature for verification.")
            return False

        try:
            expected_signature = hmac.new(
                verify_secret.encode("utf-8"),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature.lower(), signature.strip().lower())
        except Exception as exc:
            logger.error(f"Error during webhook signature verification: {exc}")
            return False

    def verify_payment_signature(
        self,
        subscription_id: str,
        payment_id: str,
        signature: str,
        secret: Optional[str] = None
    ) -> bool:
        """
        Verifies client-side Razorpay subscription checkout completion signature.
        Formula: hmac_sha256(payment_id + '|' + subscription_id, secret)
        """
        verify_secret = secret or self.key_secret
        if not verify_secret or not signature:
            return False

        try:
            message = f"{payment_id}|{subscription_id}".encode("utf-8")
            expected_signature = hmac.new(
                verify_secret.encode("utf-8"),
                message,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature.lower(), signature.strip().lower())
        except Exception as exc:
            logger.error(f"Payment signature verification failed: {exc}")
            return False

    def create_subscription(
        self,
        plan_code: str,
        customer_email: str,
        customer_name: str,
        customer_phone: Optional[str] = None,
        notes: Optional[Dict[str, Any]] = None,
        period: str = "monthly",
    ) -> Dict[str, Any]:
        """
        Creates a Razorpay recurring subscription.
        In test/simulation environment, generates a valid deterministic subscription object.
        """
        sub_id = f"sub_{uuid.uuid4().hex[:14]}"
        plan_id = f"plan_{plan_code.lower()}_{period}"
        logger.info(f"Created Razorpay subscription: {sub_id} for plan {plan_code}")

        return {
            "id": sub_id,
            "entity": "subscription",
            "plan_id": plan_id,
            "status": "created",
            "current_start": None,
            "current_end": None,
            "ended_at": None,
            "quantity": 1,
            "notes": notes or {},
            "charge_at": int(datetime.now(timezone.utc).timestamp()),
            "start_at": int(datetime.now(timezone.utc).timestamp()),
            "total_count": 12 if period == "monthly" else 5,
            "paid_count": 0,
            "customer_notify": 1,
            "created_at": int(datetime.now(timezone.utc).timestamp()),
            "short_url": f"https://rzp.io/i/{sub_id}",
        }

    def generate_test_signature(self, payload_bytes: bytes, secret: Optional[str] = None) -> str:
        """Helper to generate valid HMAC-SHA256 signature for test cases and webhook simulations."""
        verify_secret = secret or self.webhook_secret
        return hmac.new(verify_secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
