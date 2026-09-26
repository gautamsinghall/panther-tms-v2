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

export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return false;
  }
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const data: StoredAuth = JSON.parse(raw);
    if (!data || !data.accessToken) {
      clearStoredAuth();
      return null;
    }
    if (isTokenExpired(data.accessToken)) {
      clearStoredAuth();
      return null;
    }
    return data;
  } catch (err) {
    console.error("Failed to parse stored auth", err);
    clearStoredAuth();
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

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  // 1. If explicit environment URL is configured
  if (envUrl && !envUrl.includes("yourdomain.com") && !envUrl.includes("example.com")) {
    if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      if (process.env.NEXT_PUBLIC_USE_LOCAL_BACKEND === "true") {
        return envUrl;
      }
      return "https://api.panthertms.com";
    }
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // Local development:
    // When running Next.js on localhost (e.g. localhost:3000), default to the live cloud backend
    // (https://api.panthertms.com) which has CORS allowed for http://localhost:3000.
    // If developers specifically run a local backend Docker container, they set NEXT_PUBLIC_USE_LOCAL_BACKEND=true.
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      if (process.env.NEXT_PUBLIC_USE_LOCAL_BACKEND === "true") {
        return "http://localhost:8000";
      }
      return "https://api.panthertms.com";
    }

    // In production on panthertms.com, panthertms.in, or any workspace subdomains
    if (host.includes("panthertms.com") || host.includes("panthertms.in")) {
      return "https://api.panthertms.com";
    }

    // Generic domain fallback
    const parts = host.split(".");
    if (parts.length >= 2) {
      const root = parts.slice(-2).join(".");
      if (root.includes("panthertms")) {
        return "https://api.panthertms.com";
      }
      return `${protocol}//api.${root}`;
    }
  }

  return "https://api.panthertms.com";
}

export async function login(email: string, password: string, subdomain: string): Promise<StoredAuth> {
  const backendBaseUrl = getApiBaseUrl();
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
