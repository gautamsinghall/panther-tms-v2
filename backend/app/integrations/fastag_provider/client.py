import logging
import math
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import httpx
from app.core.config import settings

logger = logging.getLogger("panther.integrations.fastag")

# Indian city coordinates dictionary for geocoding route waypoints
INDIAN_CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "surat": (21.1702, 72.8311),
    "lucknow": (26.8467, 80.9462),
    "kanpur": (26.4499, 80.3319),
    "nagpur": (21.1458, 79.0882),
    "indore": (22.7196, 75.8577),
    "bhopal": (23.2599, 77.4126),
    "patna": (25.5941, 85.1376),
    "vadodara": (22.3072, 73.1812),
    "ghaziabad": (28.6692, 77.4538),
    "ludhiana": (30.9010, 75.8573),
    "agra": (27.1767, 78.0081),
    "nashik": (19.9975, 73.7898),
    "faridabad": (28.4089, 77.3178),
    "meerut": (28.9845, 77.7064),
    "rajkot": (22.3039, 70.8022),
    "varanasi": (25.3176, 82.9739),
    "aurangabad": (19.8762, 75.3433),
    "amritsar": (31.6340, 74.8723),
    "navi mumbai": (19.0330, 73.0297),
    "ranchi": (23.3441, 85.3096),
    "coimbatore": (11.0168, 76.9558),
    "vijayawada": (16.5062, 80.6480),
    "jodhpur": (26.2389, 73.0243),
    "pali": (25.7711, 73.3234),
    "udaipur": (24.5854, 73.7125),
    "ajmer": (26.4499, 74.6399),
    "kishangarh": (26.5746, 74.8643),
    "raipur": (21.2514, 81.6296),
    "chandigarh": (30.7333, 76.7794),
    "guwahati": (26.1445, 91.7362),
    "gurgaon": (28.4595, 77.0266),
    "gurugram": (28.4595, 77.0266),
    "noida": (28.5355, 77.3910),
    "kochi": (9.9312, 76.2673),
    "nellore": (14.4426, 79.9865),
    "visakhapatnam": (17.6868, 83.2185),
    "panipat": (29.3909, 76.9635),
    "karnal": (29.6857, 76.9905),
    "ambala": (30.3782, 76.7767),
    "moradabad": (28.8386, 78.7733),
    "bareilly": (28.3670, 79.4304),
    "aligarh": (27.8974, 78.0880),
    "mathura": (27.4924, 77.6737),
    "gwalior": (26.2183, 78.1828),
    "jhansi": (25.4484, 78.5685),
    "jabalpur": (23.1815, 79.9864),
    "kota": (25.2138, 75.8648),
    "bikaner": (28.0229, 73.3119),
    "bhiwandi": (19.2967, 73.0631),
    "vapi": (20.3893, 72.9106),
    "valsad": (20.5992, 72.9342),
    "ankleshwar": (21.6264, 73.0152),
    "bharuch": (21.7051, 72.9959),
    "anand": (22.5645, 72.9289),
    "nadiad": (22.6916, 72.8634),
}


def clean_vehicle_number(vehicle_number: str) -> str:
    """Removes spaces, hyphens, and non-alphanumeric chars; normalizes to uppercase."""
    if not vehicle_number:
        return ""
    return re.sub(r"[^A-Za-z0-9]", "", vehicle_number).upper()


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def parse_reader_read_time(time_str: Any) -> datetime:
    """Safely parses timestamp formats commonly returned by NETC / Logitrack."""
    if isinstance(time_str, datetime):
        if time_str.tzinfo is None:
            return time_str.replace(tzinfo=timezone.utc)
        return time_str
    if not time_str or not isinstance(time_str, str):
        return datetime.now(timezone.utc)

    clean_str = time_str.strip()
    # Try ISO format
    try:
        return datetime.fromisoformat(clean_str.replace("Z", "+00:00"))
    except Exception:
        pass

    # Try common formats e.g. "2026-10-08 14:30:00" or "08-10-2026 14:30:00"
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
    ):
        try:
            dt = datetime.strptime(clean_str[:19], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue

    return datetime.now(timezone.utc)


def resolve_location_coordinates(name: str) -> Optional[Tuple[float, float]]:
    """Resolves coordinates from known city/corridor dictionary or string coords."""
    if not name:
        return None
    cleaned = name.strip().lower()
    cleaned = re.sub(r"\(.*?\)", "", cleaned).strip()
    if cleaned in INDIAN_CITY_COORDINATES:
        return INDIAN_CITY_COORDINATES[cleaned]
    for city, coords in INDIAN_CITY_COORDINATES.items():
        if city in cleaned:
            return coords
    return None


class FASTagProviderClient:
    """
    Logitrack / NETC FASTag API Client.
    Fetches live toll plaza crossings, geocodes, and timestamps.
    Credentials and base URL are loaded dynamically from environment / Dokploy.
    """

    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None):
        self.api_url = api_url or settings.FASTAG_API_URL
        self.api_key = api_key or settings.FASTAG_API_KEY

    async def fetch_toll_transactions(
        self, vehicle_number: str
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """
        Calls FASTag API to retrieve latest toll transactions for the vehicle.
        Returns: (success: bool, transactions: list, error_message: str | None)
        """
        clean_vehicle = clean_vehicle_number(vehicle_number)
        if not clean_vehicle:
            return False, [], "Invalid vehicle number provided"

        if not self.api_key:
            logger.warning("FASTag API Key is not set in environment (settings.FASTAG_API_KEY).")
            return False, [], "FASTag API Key not configured in Dokploy/environment."

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }
        payload = {"vehiclenumber": clean_vehicle}

        try:
            async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
                response = await client.post(self.api_url, json=payload, headers=headers)

            if response.status_code not in (200, 201):
                msg = f"FASTag API returned status HTTP {response.status_code}"
                logger.warning(f"{msg}: {response.text[:200]}")
                return False, [], msg

            api_data = response.json()
            if not api_data:
                return False, [], "Empty response received from FASTag provider"

            # Check for API error response
            if isinstance(api_data, dict):
                err_val = api_data.get("error")
                if err_val not in (None, False, "false", 0, "0"):
                    err_msg = api_data.get("message") or str(err_val)
                    logger.info(f"FASTag API response error for {clean_vehicle}: {err_msg}")
                    return False, [], f"FASTag API notice: {err_msg}"

            # Flexible extraction across different Logitrack / NETC JSON nesting variants
            txn_data: Any = []
            if isinstance(api_data.get("response"), list) and len(api_data["response"]) > 0:
                first_resp = api_data["response"][0]
                if isinstance(first_resp, dict):
                    if "response" in first_resp and isinstance(first_resp["response"], dict):
                        veh = first_resp["response"].get("vehicle", {})
                        if isinstance(veh, dict):
                            txn_data = veh.get("vehltxnList", {}).get("txn", [])
                        if not txn_data:
                            txn_data = first_resp["response"].get("vehltxnList", {}).get("txn", [])
                    if not txn_data and "vehicle" in first_resp:
                        veh = first_resp.get("vehicle", {})
                        if isinstance(veh, dict):
                            txn_data = veh.get("vehltxnList", {}).get("txn", [])
                    if not txn_data:
                        txn_data = first_resp.get("txn", [])
            elif isinstance(api_data.get("response"), dict):
                resp_obj = api_data["response"]
                veh = resp_obj.get("vehicle", {})
                if isinstance(veh, dict):
                    txn_data = veh.get("vehltxnList", {}).get("txn", [])
                if not txn_data:
                    txn_data = resp_obj.get("vehltxnList", {}).get("txn", [])
            elif isinstance(api_data.get("data"), dict):
                veh = api_data["data"].get("vehicle", {})
                if isinstance(veh, dict):
                    txn_data = veh.get("vehltxnList", {}).get("txn", [])
            elif "txn" in api_data:
                txn_data = api_data["txn"]

            # Normalize txn list
            txn_list: List[Dict[str, Any]] = []
            if isinstance(txn_data, dict):
                txn_list = [txn_data]
            elif isinstance(txn_data, list):
                txn_list = [t for t in txn_data if isinstance(t, dict)]

            normalized: List[Dict[str, Any]] = []
            for item in txn_list:
                toll_name = (
                    item.get("tollPlazaName")
                    or item.get("toll_plaza_name")
                    or item.get("plazaName")
                    or "Toll Plaza"
                )
                geocode = item.get("tollPlazaGeocode") or item.get("geocode")
                read_time = parse_reader_read_time(
                    item.get("readerReadTime") or item.get("read_time") or item.get("txnTime")
                )

                lat = None
                lng = None
                if geocode and isinstance(geocode, str) and "," in geocode:
                    parts = geocode.split(",")
                    try:
                        lat = float(parts[0].strip())
                        lng = float(parts[1].strip())
                    except Exception:
                        pass
                elif toll_name:
                    coords = resolve_location_coordinates(toll_name)
                    if coords:
                        lat, lng = coords
                        geocode = f"{lat},{lng}"

                normalized.append(
                    {
                        "toll_plaza_name": toll_name.strip(),
                        "geocode": geocode,
                        "latitude": lat,
                        "longitude": lng,
                        "reader_read_time": read_time,
                    }
                )

            # Sort ascending by reader_read_time
            normalized.sort(key=lambda x: x["reader_read_time"])
            return True, normalized, None

        except httpx.TimeoutException:
            logger.warning(f"FASTag API timeout connecting to {self.api_url}")
            return False, [], "FASTag API timeout (service took longer than 15s to respond)"
        except Exception as e:
            logger.error(f"Error fetching FASTag data for {clean_vehicle}: {e}", exc_info=True)
            return False, [], f"FASTag connection error: {str(e)}"
