"""
GST and PAN Verification Client
Mirrors and extends the logic from ajax_get_gst_pan.php with async httpx,
in-memory token caching, and standardized data normalization.
"""
import time
import logging
from typing import Optional, Dict, Any, Tuple
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class GstPanClient:
    """
    Client for interacting with the GST and PAN API verification gateway.
    Supports:
    - Bearer token generation & caching
    - Taxpayer lookup by GSTIN (action=TP)
    - Taxpayer lookup by PAN and State Code (action=TPBYPAN)
    """

    def __init__(self):
        # Cache tokens: key -> (access_token, expires_at_timestamp)
        self._token_cache: Dict[Tuple[str, str], Tuple[str, float]] = {}

    async def get_access_token(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> str:
        """
        Retrieves a valid Bearer access token from the Gateway.
        Caches token until 2 minutes before expiry.
        """
        cid = (client_id or settings.GSP_CLIENT_ID or "").strip()
        csecret = (client_secret or settings.GSP_CLIENT_SECRET or "").strip()
        burl = (base_url or settings.GSP_BASE_URL or "https://gsp.adaequare.com").rstrip("/")

        if not cid or not csecret:
            raise ValueError("GST/PAN API client_id or client_secret is missing. Please configure credentials in API Center or .env.")

        cache_key = (burl, cid)
        now = time.time()
        if cache_key in self._token_cache:
            cached_token, exp = self._token_cache[cache_key]
            if now < exp:
                return cached_token

        token_url = f"{burl}/gsp/authenticate?grant_type=token"
        headers = {
            "gspappid": cid,
            "gspappsecret": csecret,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(token_url, headers=headers)
            except Exception as exc:
                logger.error(f"Network error while connecting to Gateway at {token_url}: {exc}")
                raise RuntimeError(f"Failed to connect to Gateway: {exc}")

            if resp.status_code != 200:
                err_text = resp.text[:250] if resp.text else f"Status code {resp.status_code}"
                logger.error(f"Authentication error ({resp.status_code}): {err_text}")
                raise RuntimeError(f"Authentication failed ({resp.status_code}): {err_text}")

            try:
                token_data = resp.json()
            except Exception:
                raise RuntimeError(f"Gateway returned non-JSON authentication response: {resp.text[:200]}")

            access_token = token_data.get("access_token")
            if not access_token:
                raise RuntimeError(f"Gateway response did not contain access_token: {token_data}")

            expires_in = int(token_data.get("expires_in") or 3600)
            # Store in cache with 120s buffer
            self._token_cache[cache_key] = (access_token, now + max(60, expires_in - 120))
            return access_token

    async def search_by_gstin(
        self,
        gstin: str,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Searches taxpayer details by 15-digit GSTIN.
        Endpoint: /enriched/commonapi/search?action=TP&gstin={gstin}
        """
        clean_gstin = gstin.strip().upper()
        if len(clean_gstin) != 15:
            return {"success": False, "message": f"Invalid GSTIN length ({len(clean_gstin)}). Expected 15 characters."}

        burl = (base_url or settings.GSP_BASE_URL or "https://gsp.adaequare.com").rstrip("/")
        token = await self.get_access_token(client_id=client_id, client_secret=client_secret, base_url=base_url)

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        url = f"{burl}/enriched/commonapi/search?action=TP&gstin={clean_gstin}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                resp = await client.get(url, headers=headers)
            except Exception as exc:
                return {"success": False, "message": f"Network error during GST search: {exc}"}

            try:
                data = resp.json()
            except Exception:
                return {"success": False, "message": f"Invalid JSON response from GST API: {resp.text[:200]}"}

            if not data.get("success", False) or not data.get("result"):
                msg = data.get("message") or "GSTIN not found or invalid."
                return {"success": False, "message": msg, "raw": data}

            normalized = self._normalize_taxpayer_data(data["result"], override_gstin=clean_gstin)
            normalized["success"] = True
            normalized["message"] = data.get("message") or "GST details fetched successfully."
            normalized["raw_data"] = data.get("result")
            return normalized

    async def search_by_pan(
        self,
        pan: str,
        state_cd: Optional[str] = "07",
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Searches taxpayer details by 10-character PAN and 2-digit State Code.
        Endpoint: /enriched/commonapi/search?action=TPBYPAN&pan={pan}
        Header: state-cd: {state_cd}
        """
        clean_pan = pan.strip().upper()
        if len(clean_pan) != 10:
            return {"success": False, "message": f"Invalid PAN length ({len(clean_pan)}). Expected 10 characters."}

        clean_state = (state_cd or "07").strip()
        # Ensure state code is 2 digits if numeric
        if clean_state.isdigit() and len(clean_state) == 1:
            clean_state = f"0{clean_state}"

        burl = (base_url or settings.GSP_BASE_URL or "https://gsp.adaequare.com").rstrip("/")
        token = await self.get_access_token(client_id=client_id, client_secret=client_secret, base_url=base_url)

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "state-cd": clean_state,
        }
        url = f"{burl}/enriched/commonapi/search?action=TPBYPAN&pan={clean_pan}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                resp = await client.get(url, headers=headers)
            except Exception as exc:
                return {"success": False, "message": f"Network error during PAN search: {exc}"}

            try:
                data = resp.json()
            except Exception:
                return {"success": False, "message": f"Invalid JSON response from PAN API: {resp.text[:200]}"}

            if not data.get("success", False) or not data.get("result"):
                msg = data.get("message") or "PAN / State combination not found."
                return {"success": False, "message": msg, "raw": data}

            result_list = data["result"]
            if not isinstance(result_list, list) or len(result_list) == 0:
                return {"success": False, "message": "No taxpayer record returned for this PAN and state."}

            first_match = result_list[0]
            matched_gstin = first_match.get("gstin", "")
            matched_data = first_match.get("data", {})

            normalized = self._normalize_taxpayer_data(matched_data, override_gstin=matched_gstin, override_pan=clean_pan)
            normalized["success"] = True
            normalized["message"] = data.get("message") or "PAN details fetched successfully."
            normalized["raw_data"] = first_match
            return normalized

    def _normalize_taxpayer_data(
        self,
        data: Dict[str, Any],
        override_gstin: Optional[str] = None,
        override_pan: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extracts and normalizes raw taxpayer response fields into standard Panther TMS fields.
        """
        gstin = (override_gstin or data.get("gstin") or "").strip().upper()
        pan = (override_pan or (gstin[2:12] if len(gstin) >= 12 else "")).strip().upper()

        legal_name = (data.get("lgnm") or "").strip()
        trade_name = (data.get("tradeNam") or legal_name).strip()

        # Registration date formatting: DD/MM/YYYY -> YYYY-MM-DD
        rgdt = (data.get("rgdt") or "").strip()
        inc_date = ""
        if rgdt and "/" in rgdt:
            parts = rgdt.split("/")
            if len(parts) == 3:
                inc_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        elif rgdt and "-" in rgdt:
            inc_date = rgdt

        # Constitution of Business / Legal status
        ctb = (data.get("ctb") or "").strip()
        ctb_lower = ctb.lower()
        if "private limited" in ctb_lower:
            legal_status = "Private Limited"
        elif "proprietorship" in ctb_lower:
            legal_status = "Proprietorship"
        elif "partnership" in ctb_lower:
            legal_status = "Partnership"
        elif "public limited" in ctb_lower:
            legal_status = "Public Limited"
        elif "limited" in ctb_lower:
            legal_status = "Limited"
        elif ctb:
            legal_status = ctb
        else:
            legal_status = "Private Limited"

        # Address resolution
        addr_obj: Dict[str, Any] = {}
        if isinstance(data.get("pradr"), dict) and isinstance(data["pradr"].get("addr"), dict):
            addr_obj = data["pradr"]["addr"]
        elif isinstance(data.get("adadr"), list) and len(data["adadr"]) > 0:
            first_addr = data["adadr"][0]
            if isinstance(first_addr, dict) and isinstance(first_addr.get("addr"), dict):
                addr_obj = first_addr["addr"]

        addr_parts = []
        seen = set()
        for field in ["flno", "bno", "bnm", "st", "loc", "landMark"]:
            val = (addr_obj.get(field) or "").strip()
            if val and val.lower() not in seen:
                seen.add(val.lower())
                addr_parts.append(val)

        full_address = ", ".join(addr_parts)
        pincode = (addr_obj.get("pncd") or "").strip()
        city = (addr_obj.get("dst") or addr_obj.get("loc") or "").strip()
        state = (addr_obj.get("stcd") or "").strip()
        state_code = gstin[:2] if len(gstin) >= 2 else ""

        return {
            "gstin": gstin,
            "pan": pan,
            "legal_name": legal_name,
            "trade_name": trade_name,
            "incorporation_date": inc_date,
            "legal_status": legal_status,
            "address": full_address,
            "city": city,
            "state": state,
            "state_code": state_code,
            "pincode": pincode,
            "country": "India",
            "billing_state": state,
        }


# Aliases for compatibility
AdaequareGSPClient = GstPanClient

_global_client = GstPanClient()

def get_gst_pan_client() -> GstPanClient:
    return _global_client

def get_adaequare_client() -> GstPanClient:
    return _global_client

