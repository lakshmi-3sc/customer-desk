import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const THREESC_ROLES = ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"] as const;
const CLIENT_ROLES = ["CLIENT_ADMIN", "CLIENT_USER"] as const;
const ALL_APP_ROLES = [...THREESC_ROLES, ...CLIENT_ROLES] as const;

type AppRole = (typeof ALL_APP_ROLES)[number];

const PUBLIC_PATHS = ["/login", "/unauthorised", "/api/auth"];

function pathMatches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathMatches(pathname, path));
}

function getDefaultRoute(role: string) {
  switch (role) {
    case "THREESC_ADMIN":
      return "/admin";
    case "THREESC_LEAD":
      return "/dashboard/lead";
    case "THREESC_AGENT":
      return "/dashboard/agent";
    case "CLIENT_ADMIN":
    case "CLIENT_USER":
      return "/dashboard";
    default:
      return "/unauthorised";
  }
}

function getAllowedRoles(pathname: string): readonly AppRole[] {
  // 3SC admin-only pages and APIs.
  if (pathMatches(pathname, "/api/admin")) return ["THREESC_ADMIN"];
  if (pathname.startsWith("/admin/kb/") && pathname.endsWith("/edit")) {
    return ["THREESC_ADMIN"];
  }
  if (pathMatches(pathname, "/admin/kb")) return THREESC_ROLES;
  if (pathMatches(pathname, "/admin")) return ["THREESC_ADMIN"];

  // 3SC lead and agent workspaces.
  if (pathMatches(pathname, "/api/lead")) return ["THREESC_LEAD"];
  if (pathMatches(pathname, "/lead")) return ["THREESC_LEAD"];
  if (pathMatches(pathname, "/dashboard/lead")) return ["THREESC_LEAD"];

  if (pathMatches(pathname, "/api/agent/stats")) return ["THREESC_AGENT"];
  if (pathMatches(pathname, "/api/agent")) return THREESC_ROLES;
  if (pathMatches(pathname, "/dashboard/agent")) return ["THREESC_AGENT"];
  if (pathMatches(pathname, "/agent")) return THREESC_ROLES;

  if (pathMatches(pathname, "/dashboard/internal")) return THREESC_ROLES;
  if (pathMatches(pathname, "/internal-knowledge-base")) return THREESC_ROLES;

  // Client-only workspaces.
  if (pathMatches(pathname, "/dashboard/client")) return CLIENT_ROLES;
  if (pathMatches(pathname, "/dashboard/user")) return CLIENT_ROLES;
  if (pathMatches(pathname, "/team")) return CLIENT_ROLES;

  // Everything else matched by proxy only needs a valid authenticated app user.
  return ALL_APP_ROLES;
}

function unauthorizedResponse(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.redirect(new URL("/unauthorised", request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (token?.role && pathname === "/login") {
      return NextResponse.redirect(new URL(getDefaultRoute(String(token.role)), request.url));
    }

    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const role = typeof token.role === "string" ? token.role : "";
  const allowedRoles = getAllowedRoles(pathname);

  if (allowedRoles && !allowedRoles.includes(role as AppRole)) {
    return unauthorizedResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match app and API requests except static framework files and common public
     * assets. Next.js 16 uses proxy.ts instead of middleware.ts.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
