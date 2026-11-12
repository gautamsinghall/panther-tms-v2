"""
Driving License (DL) Verification Integration
Dedicated client for Sarathi / Logitrack Driver License Information API.
Mirrors verify_driver_api.php.
"""
import re
import logging
from datetime import datetime, date
from typing import Optional, Dict, Any

import httpx
from app.core.config import settings

logger = logging.getLogger("panther.integrations.dl_verification")

MONTH_ABBR_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}


def normalize_dl_date(raw_date: Any) -> Optional[str]:
    """
    Normalizes Sarathi / DL date representations into standard ISO YYYY-MM-DD format.
    Handles 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'DD-Mon-YYYY' (e.g. 15-Aug-2020).
    """
    if not raw_date:
        return None
    if isinstance(raw_date, (datetime, date)):
        return raw_date.strftime("%Y-%m-%d")

    s = str(raw_date).strip()
    if not s or s.lower() in ("null", "none", "n/a", "na", "-", "0000-00-00"):
        return None

    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s

    clean = re.sub(r"[,/]", "-", s)
    parts = [p.strip() for p in re.split(r"[\s\-]+", clean) if p.strip()]

    if len(parts) >= 3:
        p0, p1, p2 = parts[0], parts[1], parts[2]
        m_lower = p1.lower()[:3]
        if m_lower in MONTH_ABBR_MAP:
            p1_num = MONTH_ABBR_MAP[m_lower]
        else:
            p1_num = p1.zfill(2)

        if len(p2) == 4 and p2.isdigit():
            return f"{p2}-{p1_num}-{p0.zfill(2)}"
        if len(p0) == 4 and p0.isdigit():
            return f"{p0}-{p1_num}-{p2.zfill(2)}"

    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%b-%Y", "%d %b %Y", "%d-%B-%Y"):
        try:
            parsed = datetime.strptime(s, fmt)
            return parsed.strftime("%Y-%m-%d")
        except Exception:
            continue

    return None


def normalize_dl_dob(raw_dob: str) -> str:
    """
    Normalizes Date of Birth for Sarathi API payload.
    Ensures input is passed in format accepted by remote gateway.
    """
    cleaned = (raw_dob or "").strip()
    iso = normalize_dl_date(cleaned)
    if iso:
        parts = iso.split("-")
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return cleaned


def hunt_for_driver_data(obj: Any) -> Optional[Dict[str, Any]]:
    """
    Recursively searches response for bioObj or dlobj
    matching huntForData() in add_driver.php.
    """
    if not obj:
        return None
    if isinstance(obj, str):
        import json
        try:
            obj = json.loads(obj)
        except Exception:
            return None

    if isinstance(obj, dict):
        if "bioObj" in obj or "dlobj" in obj or "dlcovs" in obj:
            return obj
        for k, v in obj.items():
            found = hunt_for_driver_data(v)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = hunt_for_driver_data(item)
            if found:
                return found
    return None


class DlClient:
    """
    Dedicated client for Driver License (DL) verification.
    """

    async def verify_driver(
        self,
        dlnumber: str,
        dob: str,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify Driver License by DL number and Date of Birth.
        Target: POST https://logitrack.webcorevision.com:5000/api/v1/driver
        Payload: {"dlnumber": clean_dl, "dob": formatted_dob}
        Header: {"x-api-key": key, "Content-Type": "application/json"}
        """
        clean_dl = re.sub(r"\s+", "", dlnumber or "").upper().strip()
        clean_dob = (dob or "").strip()

        if not clean_dl or not clean_dob:
            return {
                "success": False,
                "message": "Both Driving License Number and Date of Birth are required for verification.",
                "dlnumber": dlnumber,
                "dob": dob,
            }

        url = (api_url or settings.DL_API_URL or "https://logitrack.webcorevision.com:5000/api/v1/driver").strip()
        key = (api_key or settings.DL_API_KEY or settings.FASTAG_API_KEY or "").strip()

        if not key:
            return {
                "success": False,
                "message": "DL API key not configured. Please set credentials in API Center or .env.",
                "dlnumber": clean_dl,
                "dob": clean_dob,
            }

        headers = {
            "Content-Type": "application/json",
            "x-api-key": key,
        }
        payload = {"dlnumber": clean_dl, "dob": clean_dob}

        try:
            async with httpx.AsyncClient(timeout=25.0, verify=False) as client:
                resp = await client.post(url, json=payload, headers=headers)

            if resp.status_code not in (200, 201):
                return {
                    "success": False,
                    "message": f"DL API HTTP error {resp.status_code}: {resp.text[:200]}",
                    "dlnumber": clean_dl,
                    "dob": clean_dob,
                }

            raw_res = resp.json()
            inner_data = hunt_for_driver_data(raw_res)

            status_str = str(raw_res.get("code") or raw_res.get("responseStatus") or "").upper()
            is_success_call = (
                status_str in ("200", "SUCCESS", "OK", "TRUE")
                or (isinstance(raw_res.get("response"), list) and len(raw_res["response"]) > 0 and raw_res["response"][0].get("responseStatus") == "SUCCESS")
            )

            if not is_success_call or not inner_data:
                err_msg = "License invalid or driver details not found."
                if isinstance(raw_res.get("response"), list) and len(raw_res["response"]) > 0:
                    err_msg = raw_res["response"][0].get("message") or err_msg
                elif raw_res.get("message"):
                    err_msg = raw_res["message"]
                return {
                    "success": False,
                    "message": str(err_msg),
                    "dlnumber": clean_dl,
                    "dob": clean_dob,
                    "raw_data": raw_res,
                }

            driver_name = ""
            driver_mobile = ""
            bio = inner_data.get("bioObj") or {}
            if isinstance(bio, dict):
                driver_name = bio.get("bioFullName") or bio.get("fullName") or bio.get("name") or ""
                driver_mobile = bio.get("bioMobileNo") or bio.get("mobileNo") or bio.get("phone") or ""

            dl_status = "ACTIVE"
            valid_upto = None
            dlobj = inner_data.get("dlobj") or {}
            if isinstance(dlobj, dict):
                dl_status = dlobj.get("dlStatus") or dl_status
                raw_upto = dlobj.get("dlTrValdtoDt") or dlobj.get("dlNtValdtoDt") or dlobj.get("dlntvaldtodt") or dlobj.get("dlValdtoDt")
                valid_upto = normalize_dl_date(raw_upto)

            coverages_list = []
            valid_from = None
            dlcovs = inner_data.get("dlcovs") or []
            if isinstance(dlcovs, list) and len(dlcovs) > 0:
                for cov in dlcovs:
                    if isinstance(cov, dict) and cov.get("covdesc"):
                        coverages_list.append(str(cov["covdesc"]).strip())
                first_cov = dlcovs[0]
                if isinstance(first_cov, dict) and first_cov.get("dcIssuedt"):
                    valid_from = normalize_dl_date(first_cov["dcIssuedt"])

            vehicle_classes = ", ".join(coverages_list) if coverages_list else ""

            return {
                "success": True,
                "message": "Driving License verified successfully via Sarathi registry.",
                "dlnumber": clean_dl,
                "dob": clean_dob,
                "driver_name": str(driver_name).strip(),
                "driver_mobile": str(driver_mobile).strip(),
                "dl_status": str(dl_status).strip().upper() if dl_status else "ACTIVE",
                "valid_from": valid_from,
                "valid_upto": valid_upto,
                "vehicle_classes": vehicle_classes,
                "raw_data": raw_res,
            }
        except Exception as exc:
            logger.error(f"DL verification exception for {clean_dl}: {exc}")
            return {
                "success": False,
                "message": f"Connection error to DL verification service: {str(exc)}",
                "dlnumber": clean_dl,
                "dob": clean_dob,
            }


_dl_client_instance: Optional[DlClient] = None

def get_dl_client() -> DlClient:
    global _dl_client_instance
    if _dl_client_instance is None:
        _dl_client_instance = DlClient()
    return _dl_client_instance

