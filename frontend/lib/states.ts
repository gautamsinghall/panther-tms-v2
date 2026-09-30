export interface StateInfo {
  code: string; // Official GST state code (2 digits)
  name: string; // Standardized state/UT name
  abbr: string; // Standard abbreviation (e.g. MH, DL, GJ)
  type: "State" | "Union Territory";
  aliases?: string[];
}

/**
 * Standardized master list of all 28 States and 8 Union Territories in India (36 Total),
 * aligned with the Goods and Services Tax (GST) jurisdiction and ISO 3166-2:IN.
 */
export const ALL_INDIAN_STATES_AND_UT: StateInfo[] = [
  // 28 States (Alphabetical)
  { code: "37", name: "Andhra Pradesh", abbr: "AP", type: "State", aliases: ["AP", "Andhra"] },
  { code: "12", name: "Arunachal Pradesh", abbr: "AR", type: "State", aliases: ["AR", "Arunachal"] },
  { code: "18", name: "Assam", abbr: "AS", type: "State", aliases: ["AS", "Asam"] },
  { code: "10", name: "Bihar", abbr: "BR", type: "State", aliases: ["BR"] },
  { code: "22", name: "Chhattisgarh", abbr: "CG", type: "State", aliases: ["CG", "Chhatisgarh", "Chattisgarh"] },
  { code: "30", name: "Goa", abbr: "GA", type: "State", aliases: ["GA"] },
  { code: "24", name: "Gujarat", abbr: "GJ", type: "State", aliases: ["GJ", "Gujrat"] },
  { code: "06", name: "Haryana", abbr: "HR", type: "State", aliases: ["HR"] },
  { code: "02", name: "Himachal Pradesh", abbr: "HP", type: "State", aliases: ["HP", "Himachal"] },
  { code: "20", name: "Jharkhand", abbr: "JH", type: "State", aliases: ["JH"] },
  { code: "29", name: "Karnataka", abbr: "KA", type: "State", aliases: ["KA"] },
  { code: "32", name: "Kerala", abbr: "KL", type: "State", aliases: ["KL"] },
  { code: "23", name: "Madhya Pradesh", abbr: "MP", type: "State", aliases: ["MP"] },
  { code: "27", name: "Maharashtra", abbr: "MH", type: "State", aliases: ["MH", "Maha"] },
  { code: "14", name: "Manipur", abbr: "MN", type: "State", aliases: ["MN"] },
  { code: "17", name: "Meghalaya", abbr: "ML", type: "State", aliases: ["ML"] },
  { code: "15", name: "Mizoram", abbr: "MZ", type: "State", aliases: ["MZ"] },
  { code: "13", name: "Nagaland", abbr: "NL", type: "State", aliases: ["NL"] },
  { code: "21", name: "Odisha", abbr: "OD", type: "State", aliases: ["OD", "OR", "Orissa"] },
  { code: "03", name: "Punjab", abbr: "PB", type: "State", aliases: ["PB"] },
  { code: "08", name: "Rajasthan", abbr: "RJ", type: "State", aliases: ["RJ", "Raj"] },
  { code: "11", name: "Sikkim", abbr: "SK", type: "State", aliases: ["SK"] },
  { code: "33", name: "Tamil Nadu", abbr: "TN", type: "State", aliases: ["TN", "Tamilnadu"] },
  { code: "36", name: "Telangana", abbr: "TS", type: "State", aliases: ["TS", "TG"] },
  { code: "16", name: "Tripura", abbr: "TR", type: "State", aliases: ["TR"] },
  { code: "09", name: "Uttar Pradesh", abbr: "UP", type: "State", aliases: ["UP"] },
  { code: "05", name: "Uttarakhand", abbr: "UK", type: "State", aliases: ["UK", "UA", "Uttaranchal"] },
  { code: "19", name: "West Bengal", abbr: "WB", type: "State", aliases: ["WB", "Bengal"] },

  // 8 Union Territories (Alphabetical)
  { code: "35", name: "Andaman and Nicobar Islands", abbr: "AN", type: "Union Territory", aliases: ["AN", "Andaman", "Nicobar"] },
  { code: "04", name: "Chandigarh", abbr: "CH", type: "Union Territory", aliases: ["CH"] },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", abbr: "DH", type: "Union Territory", aliases: ["DH", "DD", "DN", "Dadra and Nagar Haveli", "Daman and Diu"] },
  { code: "07", name: "Delhi", abbr: "DL", type: "Union Territory", aliases: ["DL", "New Delhi", "NCT", "NCT of Delhi", "National Capital Territory of Delhi"] },
  { code: "01", name: "Jammu and Kashmir", abbr: "JK", type: "Union Territory", aliases: ["JK", "J&K", "Kashmir"] },
  { code: "38", name: "Ladakh", abbr: "LA", type: "Union Territory", aliases: ["LA", "Leh"] },
  { code: "31", name: "Lakshadweep", abbr: "LD", type: "Union Territory", aliases: ["LD"] },
  { code: "34", name: "Puducherry", abbr: "PY", type: "Union Territory", aliases: ["PY", "Pondicherry"] },
];

/**
 * Options array for SearchableSelect with rich search keywords (code, abbr, aliases)
 * and distinct secondary label showing State/UT category and GST code.
 */
export const INDIAN_STATE_OPTIONS = ALL_INDIAN_STATES_AND_UT.map((s) => ({
  value: s.name,
  label: s.name,
  subLabel: `${s.type === "Union Territory" ? "UT" : "State"} • ${s.code}`,
  keywords: [s.code, s.abbr, s.type, ...(s.aliases || [])],
}));

/**
 * Checks whether a given country string refers to India.
 * If country is undefined or empty string, returns true because India is the default TMS country.
 */
export function isIndia(country?: string | null): boolean {
  if (country === undefined || country === null || country === "") {
    return true;
  }
  const clean = country.trim().toLowerCase();
  return clean === "india" || clean === "in" || clean === "ind";
}

/**
 * Checks if a string is a recognized Indian State or Union Territory name (case-insensitive or alias).
 */
export function isIndianState(stateName?: string | null): boolean {
  if (!stateName) return false;
  const clean = stateName.trim().toLowerCase();
  return ALL_INDIAN_STATES_AND_UT.some(
    (s) =>
      s.name.toLowerCase() === clean ||
      s.abbr.toLowerCase() === clean ||
      s.code === clean ||
      s.aliases?.some((a) => a.toLowerCase() === clean)
  );
}

/**
 * Returns the standardized Indian State or UT name from any valid name, code, or alias.
 * Returns null if not matched.
 */
export function normalizeIndianState(stateName?: string | null): string | null {
  if (!stateName) return null;
  const clean = stateName.trim().toLowerCase();
  const match = ALL_INDIAN_STATES_AND_UT.find(
    (s) =>
      s.name.toLowerCase() === clean ||
      s.abbr.toLowerCase() === clean ||
      s.code === clean ||
      s.aliases?.some((a) => a.toLowerCase() === clean)
  );
  return match ? match.name : null;
}

/**
 * Look up state info by 2-digit GST state code.
 */
export function getIndianStateByCode(code: string): StateInfo | undefined {
  const cleanCode = code.trim().padStart(2, "0");
  return ALL_INDIAN_STATES_AND_UT.find((s) => s.code === cleanCode);
}
