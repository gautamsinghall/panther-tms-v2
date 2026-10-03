import { getStoredAuth, setStoredAuth, clearStoredAuth, getApiBaseUrl } from "./auth";

export { getApiBaseUrl };

interface ApiClientOptions extends RequestInit {
  tenantId?: string;
  companyCode?: string;
  officeId?: number | string;
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

  let officeId = options.officeId !== undefined ? options.officeId : storedAuth?.activeOffice?.id;
  if (officeId === undefined && typeof window !== "undefined") {
    const match = document.cookie.match(/panther_office_id=([^;]+)/);
    if (match) {
      officeId = match[1];
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
  if (officeId !== undefined && officeId !== null && !headers["X-Office-ID"]) {
    headers["X-Office-ID"] = String(officeId);
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
      // Attempt token refresh if refresh_token is present
      if (storedAuth?.refreshToken && tenantId && !endpoint.includes("/auth/")) {
        try {
          const refreshRes = await fetch(`${backendBaseUrl}/api/v1/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Tenant-ID": tenantId,
              "X-Company-Code": companyCode || "",
            },
            body: JSON.stringify({ refresh_token: storedAuth.refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const updatedAuth = {
              ...storedAuth,
              accessToken: refreshData.access_token,
              refreshToken: refreshData.refresh_token || storedAuth.refreshToken,
            };
            setStoredAuth(updatedAuth);

            // Retry original request with newly refreshed token
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${refreshData.access_token}`,
            };
            const retryRes = await fetch(url, {
              ...options,
              headers: retryHeaders,
            });

            if (retryRes.ok) {
              const retryContentType = retryRes.headers.get("content-type");
              if (retryContentType && retryContentType.includes("application/json")) {
                return (await retryRes.json()) as T;
              }
              return (await retryRes.text()) as unknown as T;
            }
          }
        } catch {
          // Token refresh failed, proceed to logout
        }
      }

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

apiClient.get = <T = any>(endpoint: string, options?: ApiClientOptions) =>
  apiClient<T>(endpoint, { ...options, method: "GET" });

apiClient.post = <T = any>(endpoint: string, body?: any, options?: ApiClientOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: "POST",
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });

apiClient.put = <T = any>(endpoint: string, body?: any, options?: ApiClientOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });

apiClient.delete = <T = any>(endpoint: string, options?: ApiClientOptions) =>
  apiClient<T>(endpoint, { ...options, method: "DELETE" });

