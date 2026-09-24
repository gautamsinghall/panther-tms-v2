import { getStoredAuth } from "./auth";

interface ApiClientOptions extends RequestInit {
  subdomain?: string;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000";
  const url = endpoint.startsWith("http") ? endpoint : `${backendBaseUrl}${endpoint}`;

  const storedAuth = getStoredAuth();
  const subdomain = options.subdomain || storedAuth?.subdomain || "demo";

  const headers: Record<string, string> = {
    "X-Tenant-Subdomain": subdomain,
    ...((options.headers as Record<string, string>) || {}),
  };

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
    let errorDetail = `API Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorDetail);
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
