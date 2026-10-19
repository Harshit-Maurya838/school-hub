import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/auth";

export function sanitizeRedirectUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    if (!trimmed.includes(":")) {
      return trimmed;
    }
  }
  return "";
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isApi = pathname.startsWith("/api/");

  if (pathname === "/login") {
    if (session) {
      const callback = sanitizeRedirectUrl(searchParams.get("callbackUrl"));
      if (callback) {
        return NextResponse.redirect(new URL(callback, request.url));
      }
      if (session.role === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/platform", request.url));
      }
      return NextResponse.redirect(new URL("/school", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/platform") || pathname.startsWith("/api/v1/platform")) {
    if (!session) {
      if (isApi) {
        return NextResponse.json(
          { error: { code: "unauthorized", message: "Authentication required" } },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "SUPER_ADMIN") {
      if (isApi) {
        return NextResponse.json(
          { error: { code: "forbidden", message: "Platform administrator privileges required" } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/school", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/school") || pathname.startsWith("/api/v1/school")) {
    if (!session) {
      if (isApi) {
        return NextResponse.json(
          { error: { code: "unauthorized", message: "Authentication required" } },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/platform/:path*",
    "/school/:path*",
    "/api/v1/platform/:path*",
    "/api/v1/school/:path*",
  ],
};
