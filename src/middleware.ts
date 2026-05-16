import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");
  const isProtectedApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/drafts") ||
    pathname.startsWith("/ledger") ||
    pathname.startsWith("/billing");

  const organizationId = req.auth?.user?.organizationId;
  const hasTenantSession =
    Boolean(req.auth?.user?.id) && Boolean(organizationId);

  if (!hasTenantSession && isApi && !pathname.startsWith("/api/auth")) {
    return NextResponse.json(
      { error: "Unauthorized — valid tenant session required" },
      { status: 401 },
    );
  }

  if (!hasTenantSession && isProtectedApp) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (hasTenantSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/drafts/:path*",
    "/ledger/:path*",
    "/billing/:path*",
    "/login",
  ],
};
