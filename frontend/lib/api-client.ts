import { getStoredAuth, clearStoredAuth, getApiBaseUrl } from "./auth";

export { getApiBaseUrl };

interface ApiClientOptions extends RequestInit {
  tenantId?: string;
  companyCode?: string;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const backendBaseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${backendBaseUrl}${endpoint}`;

  const storedAuth = getStoredAuth();
  let tenantId = options.tenantId || storedAuth?.tenantId;
  let companyCode = options.companyCode || storedAuth?.companyCode;

  // If not found in storedAuth, try extracting from URL path (e.g. /[tenantId]/...)
  if (!tenantId && typeof window !== "undefined") {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0 && pathParts[0] !== "login" && pathParts[0] !== "signup") {
      tenantId = pathParts[0];
    }
  }

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }
  if (companyCode) {
    headers["X-Company-Code"] = companyCode;
  }

  if (storedAuth?.accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${storedAuth.accessToken}`;
  }

  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    // Network-level failure (CORS block, server down, ERR_FAILED)
    const error = new Error("Unable to connect to the server. Please check your connection and try again.") as Error & { status: number };
    error.status = 0;
    throw error;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    let errorDetail = `API Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch {
      // response wasn't JSON
    }

    const error = new Error(errorDetail) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
