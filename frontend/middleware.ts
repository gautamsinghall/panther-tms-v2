import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Regex to match a 10-char alphanumeric lowercase tenant ID (e.g. "k9x2m4p8t1") or demo tenants
const TENANT_ID_REGEX = /^[a-z0-9]{10}$/;
const DEMO_TENANT_IDS = new Set(["demo123456", "demo"]);

function isTenantId(segment: string): boolean {
  if (!segment) return false;
  const clean = segment.toLowerCase().trim();
  return TENANT_ID_REGEX.test(clean) || DEMO_TENANT_IDS.has(clean);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static files, Next internals, images, and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/panther-logo.png" ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Allow central auth pages directly
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return NextResponse.next();
  }

  // 3. Inspect the first path segment
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0] || "";

  // 4. If the first segment is a Tenant ID (e.g. /k9x2m4p8t1/transport/lr-booking)
  if (isTenantId(firstSegment)) {
    const tenantId = firstSegment.toLowerCase().trim();
    const remainingSegments = segments.slice(1);
    const internalPath = "/" + remainingSegments.join("/");

    // Clone request headers and inject tenant ID
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-id", tenantId);

    // Rewrite internally to the base route while keeping the tenant ID visible in browser address bar
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = internalPath === "" ? "/" : internalPath;

    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });

    // Ensure tenant cookie is persisted
    response.cookies.set("panther_tenant_id", tenantId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  }

  // 5. If root "/" was requested without tenant ID in URL
  const storedTenantId = request.cookies.get("panther_tenant_id")?.value;

  if (pathname === "/") {
    if (storedTenantId && isTenantId(storedTenantId)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${storedTenantId.toLowerCase().trim()}`;
      return NextResponse.redirect(redirectUrl);
    }
    // Not logged in -> redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // 6. If user directly typed a known subroute like /transport without tenant ID prefix
  if (storedTenantId && isTenantId(storedTenantId)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${storedTenantId.toLowerCase().trim()}${pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  // Default: unauthenticated user trying to access dashboard routes -> redirect to login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, css, js
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
