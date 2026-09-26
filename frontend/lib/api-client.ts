import { getStoredAuth, clearStoredAuth, getApiBaseUrl } from "./auth";

export { getApiBaseUrl };

interface ApiClientOptions extends RequestInit {
  subdomain?: string;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const backendBaseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${backendBaseUrl}${endpoint}`;

  const storedAuth = getStoredAuth();
  let subdomain = options.subdomain || storedAuth?.subdomain;
  if (!subdomain && typeof window !== "undefined") {
    const host = window.location.hostname;
    const parts = host.split(".");
    if (parts.length > 2 && parts[0] !== "www" && parts[0] !== "api") {
      subdomain = parts[0];
    }
  }

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (subdomain) {
    headers["X-Tenant-Subdomain"] = subdomain;
  }

  if (storedAuth?.accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${storedAuth.accessToken}`;
  }

  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

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
    const error = new Error(errorDetail);
    (error as any).status = response.status;
    throw error;
  }

  // If status is 204 No Content, return null
  if (response.status === 204) {
    return null as unknown as T;
  }

  const text = await response.text();
  if (!text) {
    return null as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
