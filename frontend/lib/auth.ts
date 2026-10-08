export interface StoredUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active?: boolean;
}

export interface OfficeSummary {
  id: number;
  code: string;
  name: string;
  city?: string;
  state?: string;
  is_head_office?: boolean;
  is_default?: boolean;
}

export interface StoredAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  tenantId: string;
  companyCode: string;
  tenantName: string;
  user: StoredUser;
  assignedOffices?: OfficeSummary[];
  activeOffice?: OfficeSummary | null;
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
    // If access token is expired, only clear if refresh token is also missing or expired
    if (isTokenExpired(data.accessToken)) {
      if (data.refreshToken && !isTokenExpired(data.refreshToken)) {
        return data; // Return data so apiClient can seamlessly refresh the token
      }
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
    if (data.tenantId) {
      document.cookie = `panther_tenant_id=${encodeURIComponent(data.tenantId)}; path=/; max-age=2592000; SameSite=Lax`;
    }
    if (data.companyCode) {
      document.cookie = `panther_company_code=${encodeURIComponent(data.companyCode)}; path=/; max-age=2592000; SameSite=Lax`;
    }
    if (data.activeOffice?.id !== undefined && data.activeOffice?.id !== null) {
      document.cookie = `panther_office_id=${encodeURIComponent(String(data.activeOffice.id))}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      document.cookie = "panther_office_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  } catch (err) {
    console.error("Failed to store auth", err);
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    document.cookie = "panther_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "panther_company_code=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "panther_office_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  } catch (err) {
    console.error("Failed to clear auth", err);
  }
}

export function getActiveOffice(): OfficeSummary | null {
  const auth = getStoredAuth();
  return auth?.activeOffice || null;
}

export function getAssignedOffices(): OfficeSummary[] {
  const auth = getStoredAuth();
  return auth?.assignedOffices || [];
}

export function setActiveOffice(office: OfficeSummary, forceDispatch = false): void {
  const auth = getStoredAuth();
  if (auth) {
    const prevOfficeId = auth.activeOffice?.id;
    auth.activeOffice = office;
    setStoredAuth(auth);
    if (typeof window !== "undefined" && (forceDispatch || prevOfficeId !== office.id)) {
      window.dispatchEvent(new CustomEvent("panther_office_changed", { detail: office }));
    }
  }
}

export function updateAssignedOffices(offices: OfficeSummary[]): void {
  const auth = getStoredAuth();
  if (auth) {
    auth.assignedOffices = offices;
    if (auth.activeOffice && auth.activeOffice.id !== 0 && !offices.some((o) => o.id === auth.activeOffice?.id)) {
      auth.activeOffice = offices.find((o) => o.is_default) || offices[0] || null;
    } else if (!auth.activeOffice && offices.length > 0) {
      auth.activeOffice = offices.find((o) => o.is_default) || offices[0];
    }
    setStoredAuth(auth);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("panther_branches_updated", { detail: offices }));
    }
  }
}

export function getWorkspaceUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return cleanPath;
  const auth = getStoredAuth();
  if (auth?.tenantId) {
    return `/${auth.tenantId}${cleanPath}`;
  }
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length > 0 && (/^[a-z0-9]{10}$/.test(parts[0]) || parts[0] === "demo123456" || parts[0] === "demo")) {
    return `/${parts[0]}${cleanPath}`;
  }
  return cleanPath;
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  // 1. If explicit environment URL is configured
  if (envUrl && !envUrl.includes("yourdomain.com") && !envUrl.includes("example.com")) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      if (process.env.NEXT_PUBLIC_USE_LOCAL_BACKEND === "true") {
        return "http://localhost:8000";
      }
      return "https://api.panthertms.com";
    }

    if (host.includes("panthertms.com") || host.includes("panthertms.in")) {
      return "https://api.panthertms.com";
    }

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

export async function login(
  companyCodeOrEmail: string,
  emailOrPass: string,
  passwordParam?: string
): Promise<StoredAuth> {
  const backendBaseUrl = getApiBaseUrl();
  const endpoint = `${backendBaseUrl}/api/v1/auth/login`;

  let companyCode = "";
  let email = "";
  let password = "";

  if (passwordParam !== undefined) {
    if (emailOrPass.includes("@")) {
      companyCode = companyCodeOrEmail;
      email = emailOrPass;
      password = passwordParam;
    } else {
      email = companyCodeOrEmail;
      password = emailOrPass;
      companyCode = passwordParam;
    }
  } else {
    // 2 parameters passed: email, password (fallback)
    email = companyCodeOrEmail;
    password = emailOrPass;
    companyCode = "DEMOLOGISTICS";
  }

  const cleanCompanyCode = companyCode.replace(/[^a-zA-Z]/g, "").toUpperCase();

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Company-Code": cleanCompanyCode,
      },
      body: JSON.stringify({
        company_code: cleanCompanyCode,
        email,
        password,
      }),
    });
  } catch (networkErr) {
    // Network error (CORS block, server unreachable, ERR_FAILED)
    throw new Error("Unable to connect to the server. Please check your internet connection and try again.");
  }

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
  const tenantId = result.tenant_id || "demo123456";
  const finalCode = result.company_code || cleanCompanyCode;

  const authData: StoredAuth = {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    tokenType: result.token_type || "bearer",
    tenantId: tenantId,
    companyCode: finalCode,
    tenantName: result.tenant_name || result.tenant?.company_name || `${finalCode} Workspace`,
    user: result.user || {
      id: 1,
      email,
      full_name: "Operations Manager",
      role: "COMPANY_ADMIN",
    },
    assignedOffices: result.assigned_offices || [],
    activeOffice: result.active_office || (result.assigned_offices && result.assigned_offices[0]) || null,
  };

  setStoredAuth(authData);
  return authData;
}
