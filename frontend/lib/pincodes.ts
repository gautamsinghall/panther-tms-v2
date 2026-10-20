export interface PincodeLookupResult {
  pincode: string;
  city: string;
  state: string;
  country: string;
}

let pincodeCache: Record<string, [string, string]> | null = null;
let fetchPromise: Promise<Record<string, [string, string]> | null> | null = null;

/**
 * Loads the 19k Indian postal PIN code database into memory.
 * Cached permanently in browser memory for instant (0ms) synchronous-speed lookups.
 */
export async function loadPincodes(): Promise<Record<string, [string, string]> | null> {
  if (pincodeCache) return pincodeCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch("/data/pincodes.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pincodeCache = await res.json();
      return pincodeCache;
    } catch (err) {
      console.warn("Client pincodes.json fetch failed, will fallback to API:", err);
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Looks up City, State & Country for a 6-digit Indian PIN Code.
 * Checks in-memory static cache first (0ms), then falls back to backend API if needed.
 */
export async function lookupPincode(pincode: string | number): Promise<PincodeLookupResult | null> {
  const cleanPin = String(pincode || "").trim();
  if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    return null;
  }

  // 1. Fast client-side lookup (0ms)
  try {
    const cache = await loadPincodes();
    if (cache && cache[cleanPin]) {
      const [city, state] = cache[cleanPin];
      return {
        pincode: cleanPin,
        city,
        state,
        country: "India",
      };
    }
  } catch {
    // Continue to backend fallback
  }

  // 2. Fallback to backend API
  try {
    const res = await fetch(`/api/v1/general/pincode/${cleanPin}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        pincode: cleanPin,
        city: data.city,
        state: data.state,
        country: data.country || "India",
      };
    }
  } catch (err) {
    console.error("Pincode API lookup failed:", err);
  }

  return null;
}
