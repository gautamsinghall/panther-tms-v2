"""
Vehicle Registration (RC) Verification Integration
Dedicated client for Vahan / Logitrack RC Information API.
Mirrors verify_rc_api.php.
"""
import re
import logging
from datetime import datetime, date
from typing import Optional, Dict, Any

import httpx
from app.core.config import settings

logger = logging.getLogger("panther.integrations.rc_verification")

MONTH_ABBR_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}


def normalize_rc_date(raw_date: Any) -> Optional[str]:
    """
    Normalizes RC date strings into standard ISO YYYY-MM-DD.
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


def flatten_rc_payload(obj: Any) -> Dict[str, Any]:
    """
    Recursively flattens nested Logitrack RC response objects / JSON strings.
    """
    to_return: Dict[str, Any] = {}
    if not isinstance(obj, dict):
        return to_return

    for key, val in obj.items():
        if isinstance(val, str) and (val.strip().startswith("{") or val.strip().startswith("[")):
            import json
            try:
                val = json.loads(val)
            except Exception:
                pass

        if isinstance(val, dict):
            to_return.update(flatten_rc_payload(val))
        elif isinstance(val, list):
            to_return[key] = val
            for item in val:
                if isinstance(item, dict):
                    to_return.update(flatten_rc_payload(item))
        else:
            to_return[key] = val

    return to_return


class RcClient:
    """
    Dedicated client for Vehicle Registration (RC) verification.
    """

    async def verify_rc(
        self,
        vehicle_number: str,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify RC by vehicle registration number.
        Target: POST https://logitrack.webcorevision.com:5000/api/v1/vehicle-info
        Payload: {"vehiclenumber": clean_vehicle_no}
        Header: {"x-api-key": key, "Content-Type": "application/json"}
        """
        clean_no = re.sub(r"[\s\-]+", "", vehicle_number or "").upper().strip()
        if not clean_no:
            return {
                "success": False,
                "message": "Vehicle number is required.",
                "vehicle_number": vehicle_number,
            }

        url = (api_url or settings.RC_API_URL or "https://logitrack.webcorevision.com:5000/api/v1/vehicle-info").strip()
        key = (api_key or settings.RC_API_KEY or settings.FASTAG_API_KEY or "").strip()

        if not key:
            return {
                "success": False,
                "message": "RC API key not configured. Please set credentials in API Center or .env.",
                "vehicle_number": clean_no,
            }

        headers = {
            "Content-Type": "application/json",
            "x-api-key": key,
        }
        payload = {"vehiclenumber": clean_no}

        try:
            async with httpx.AsyncClient(timeout=25.0, verify=False) as client:
                resp = await client.post(url, json=payload, headers=headers)

            if resp.status_code not in (200, 201):
                return {
                    "success": False,
                    "message": f"RC API HTTP error {resp.status_code}: {resp.text[:200]}",
                    "vehicle_number": clean_no,
                }

            raw_res = resp.json()
            flat = flatten_rc_payload(raw_res)

            status_str = str(flat.get("code") or flat.get("responseStatus") or flat.get("result") or flat.get("status") or "").upper()
            is_success = (
                status_str in ("200", "SUCCESS", "OK", "TRUE")
                or raw_res.get("responseStatus") == "SUCCESS"
                or raw_res.get("code") in (200, "200")
            )

            if not is_success:
                err_msg = flat.get("message") or flat.get("errorMsg") or flat.get("error") or "RC verification refused by API provider."
                return {
                    "success": False,
                    "message": str(err_msg),
                    "vehicle_number": clean_no,
                    "raw_data": raw_res,
                }

            maker_model = flat.get("rc_maker_model") or flat.get("makerModel") or flat.get("makerDesc") or flat.get("maker_desc") or flat.get("makerModelDesc") or flat.get("rc_maker_desc") or ""
            vehicle_class = flat.get("rc_vh_class_desc") or flat.get("vhClassDesc") or flat.get("vehicleClass") or flat.get("vehicle_class") or flat.get("rc_vh_class") or ""
            engine_no = flat.get("rc_eng_no") or flat.get("engineNumber") or flat.get("engNo") or flat.get("engine_no") or ""
            chassis_no = flat.get("rc_chasi_no") or flat.get("chassisNumber") or flat.get("chasiNo") or flat.get("chassis_no") or ""
            rc_status = flat.get("rc_status") or flat.get("statusAsOn") or flat.get("status") or flat.get("rcStatus") or "ACTIVE"

            financier = flat.get("rc_financer") or flat.get("financer") or flat.get("financierName") or ""
            gvw_raw = flat.get("rc_gvw") or flat.get("gvw") or flat.get("grossVehicleWeight")
            ulw_raw = flat.get("rc_unld_wt") or flat.get("unladenWeight") or flat.get("rc_ulw")
            color = flat.get("rc_color") or flat.get("color") or flat.get("vehicleColor") or ""
            norms = flat.get("rc_norms_desc") or flat.get("normsDesc") or flat.get("emissionNorms") or ""
            cylinders_raw = flat.get("rc_no_cyl") or flat.get("noCylinders") or flat.get("noOfCylinders")
            seating_raw = flat.get("rc_seat_cap") or flat.get("seatCapacity") or flat.get("seatingCapacity")

            owner_name = flat.get("rc_owner_name") or flat.get("ownerName") or flat.get("owner_name") or ""

            reg_date = normalize_rc_date(flat.get("rc_regn_dt") or flat.get("regnDt") or flat.get("regDate") or flat.get("registrationDate") or flat.get("rc_regn_date"))
            fit_date = normalize_rc_date(flat.get("rc_fit_upto") or flat.get("fitUpto") or flat.get("fitnessUpto") or flat.get("fitness_upto") or flat.get("rc_fit_valid"))
            ins_date = normalize_rc_date(flat.get("rc_insurance_upto") or flat.get("insuranceUpto") or flat.get("insurance_upto") or flat.get("insuranceExpiryDate") or flat.get("rc_insurance_comp"))
            tax_date = normalize_rc_date(flat.get("rc_tax_upto") or flat.get("taxUpto") or flat.get("tax_upto") or flat.get("taxUptoDate"))
            pucc_date = normalize_rc_date(flat.get("rc_pucc_upto") or flat.get("puccUpto") or flat.get("pucc_upto") or flat.get("puccExpiryDate") or flat.get("rc_pucc_no"))
            permit_date = normalize_rc_date(flat.get("rc_permit_valid_upto") or flat.get("rc_np_upto") or flat.get("permit_valid_upto") or flat.get("permitUpto"))

            def parse_float(v: Any) -> Optional[float]:
                if v is None or v == "":
                    return None
                try:
                    return float(re.sub(r"[^\d.]", "", str(v)))
                except Exception:
                    return None

            def parse_int(v: Any) -> Optional[int]:
                if v is None or v == "":
                    return None
                try:
                    return int(float(re.sub(r"[^\d.]", "", str(v))))
                except Exception:
                    return None

            return {
                "success": True,
                "message": "Vehicle RC verified successfully via Vahan registry.",
                "vehicle_number": clean_no,
                "owner_name": str(owner_name).strip(),
                "vehicle_description": str(maker_model).strip(),
                "vehicle_class": str(vehicle_class).strip(),
                "engine_number": str(engine_no).strip(),
                "chassis_number": str(chassis_no).strip(),
                "rc_status": str(rc_status).strip().upper() if rc_status else "ACTIVE",
                "financier": str(financier).strip(),
                "gvw_kg": parse_float(gvw_raw),
                "unladen_weight_kg": parse_float(ulw_raw),
                "color": str(color).strip(),
                "emission_norms": str(norms).strip(),
                "cylinders": parse_int(cylinders_raw),
                "seating_capacity": parse_int(seating_raw),
                "registration_date": reg_date,
                "fitness_expiry": fit_date,
                "insurance_expiry": ins_date,
                "tax_validity": tax_date,
                "puc_expiry": pucc_date,
                "permit_validity": permit_date,
                "raw_data": raw_res,
            }
        except Exception as exc:
            logger.error(f"RC lookup exception for {clean_no}: {exc}")
            return {
                "success": False,
                "message": f"Connection error to RC verification service: {str(exc)}",
                "vehicle_number": clean_no,
            }

    search_rc = verify_rc


_rc_client_instance: Optional[RcClient] = None

def get_rc_client() -> RcClient:
    global _rc_client_instance
    if _rc_client_instance is None:
        _rc_client_instance = RcClient()
    return _rc_client_instance
