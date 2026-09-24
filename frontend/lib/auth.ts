export interface StoredUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active?: boolean;
}

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  subdomain: string;
  tenantName: string;
  user: StoredUser;
}

const AUTH_STORAGE_KEY = "panther_tms_auth";

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse stored auth", err);
    return null;
  }
}

export function setStoredAuth(data: StoredAuth): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to store auth", err);
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear auth", err);
  }
}

export async function login(email: string, password: string, subdomain: string): Promise<StoredAuth> {
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000";
  const endpoint = `${backendBaseUrl}/api/v1/auth/login`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Subdomain": subdomain,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let errorMsg = `Login failed (${res.status})`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const result = await res.json();
  const authData: StoredAuth = {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    tokenType: result.token_type || "bearer",
    subdomain: result.tenant?.subdomain || subdomain,
    tenantName: result.tenant?.company_name || `${subdomain} Logistics`,
    user: result.user || {
      id: 1,
      email,
      full_name: "Operations Manager",
      role: "COMPANY_ADMIN",
    },
  };

  setStoredAuth(authData);
  return authData;
}
