import abc
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any


class GSPProviderInterface(abc.ABC):
    """
    Abstract interface for GST Suvidha Provider (GSP) or direct NIC IRP API integration.
    Allows hot-swapping providers (e.g. ClearTax, Masters India, Cygnet, NIC direct)
    without rewriting invoice business logic.
    """

    @abc.abstractmethod
    async def generate_irn(self, invoice_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Generate 64-character Invoice Reference Number (IRN) and signed QR code."""
        pass

    @abc.abstractmethod
    async def cancel_irn(self, irn: str, cancel_reason: str, cancel_remarks: str) -> Dict[str, Any]:
        """Cancel an existing IRN within 24 hours of generation."""
        pass

    @abc.abstractmethod
    async def get_einvoice(self, irn: str) -> Dict[str, Any]:
        """Fetch e-invoice details and payload by IRN."""
        pass

    @abc.abstractmethod
    async def get_taxpayer_details(self, gstin: str) -> Dict[str, Any]:
        """Lookup taxpayer registration status and trade name by GSTIN."""
        pass


class MockSandboxGSPProvider(GSPProviderInterface):
    """
    Sandbox / Mock GSP Provider.
    # ==============================================================================
    # INTEGRATION POINT: UNKNOWN / NEEDS VERIFICATION
    # Live GSP provider (ClearTax, Masters India, Cygnet, NIC Direct) not yet confirmed
    # per PRD §11 and Phases.md Phase 3.
    # Deterministic SHA-256 IRN generation and standard NIC schema payload simulated.
    # ==============================================================================
    """

    async def generate_irn(self, invoice_payload: Dict[str, Any]) -> Dict[str, Any]:
        supplier_gstin = invoice_payload.get("supplier_gstin", "27AABCP1234F1Z5")
        doc_type = invoice_payload.get("doc_type", "INV")
        doc_num = invoice_payload.get("doc_num", "TI-2026-0001")
        fin_year = invoice_payload.get("fin_year", "2026-27")

        # Standard NIC IRN formula: SHA-256(SupplierGSTIN + FinYear + DocType + DocNum)
        raw_string = f"{supplier_gstin}{fin_year}{doc_type}{doc_num}"
        irn = hashlib.sha256(raw_string.encode("utf-8")).hexdigest()

        # Deterministic Ack Number from doc_num hash
        ack_hash = hashlib.md5(raw_string.encode("utf-8")).hexdigest()
        ack_number = f"11{int(ack_hash[:12], 16) % 1000000000000:012d}"
        ack_date = datetime.now(timezone.utc).isoformat()

        # Standard QR code data representation
        qr_data = {
            "irn": irn,
            "ack_no": ack_number,
            "ack_date": ack_date,
            "supplier_gstin": supplier_gstin,
            "doc_num": doc_num,
            "doc_type": doc_type,
            "total_amount": invoice_payload.get("total_amount", 0.0),
            "tax_amount": invoice_payload.get("tax_amount", 0.0),
            "signature": "MOCK_JWS_SIGNATURE_IRP_GOV_IN",
        }

        return {
            "status": "SUCCESS",
            "irn": irn,
            "ack_number": ack_number,
            "ack_date": ack_date,
            "signed_invoice": json.dumps(qr_data),
            "signed_qr_code": f"GSTN:IRN:{irn[:16]}...:ACK:{ack_number}",
            "supplier_gstin": supplier_gstin,
            "legal_name": invoice_payload.get("supplier_name", "Demo Logistics Pvt Ltd"),
            "trade_name": "Demo Logistics",
            "is_sandbox": True,
        }

    async def cancel_irn(self, irn: str, cancel_reason: str, cancel_remarks: str) -> Dict[str, Any]:
        return {
            "status": "CANCELLED",
            "irn": irn,
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancel_reason": cancel_reason,
            "cancel_remarks": cancel_remarks,
            "is_sandbox": True,
        }

    async def get_einvoice(self, irn: str) -> Dict[str, Any]:
        return {
            "irn": irn,
            "status": "GENERATED",
            "source": "MOCK_IRP",
            "is_sandbox": True,
        }

    async def get_taxpayer_details(self, gstin: str) -> Dict[str, Any]:
        gstin_clean = gstin.strip().upper()
        state_code = gstin_clean[:2] if len(gstin_clean) >= 2 else "27"
        state_names = {
            "27": "Maharashtra",
            "24": "Gujarat",
            "29": "Karnataka",
            "07": "Delhi",
            "09": "Uttar Pradesh",
            "06": "Haryana",
            "33": "Tamil Nadu",
        }
        state = state_names.get(state_code, "Other State")

        return {
            "gstin": gstin_clean,
            "legal_name": f"Enterprise Transport Logistics ({state}) Ltd",
            "trade_name": f"Panther Logistics {state}",
            "taxpayer_type": "Regular",
            "status": "Active",
            "state_jurisdiction": state,
            "center_jurisdiction": f"Range {state_code}-01",
            "registration_date": "2017-07-01",
            "address": f"Plot 42, Logistics Park, Industrial Area, {state} - 400001",
            "is_sandbox": True,
        }


# Global / configured GSP provider instance
_active_provider: GSPProviderInterface = MockSandboxGSPProvider()

def get_gsp_provider() -> GSPProviderInterface:
    """
    Returns the active GSP provider instance.
    To connect ClearTax, Masters India, etc., replace _active_provider via configuration.
    """
    return _active_provider
