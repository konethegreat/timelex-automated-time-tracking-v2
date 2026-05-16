import type { UserRole } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (middleware / route guards).
 * Providers and database callbacks are defined in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.organizationId) {
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.organizationId && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthRoute = pathname.startsWith("/api/auth");
      const isLoginPage = pathname === "/login";
      const isApi = pathname.startsWith("/api");
      const isProtectedApp =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/drafts") ||
        pathname.startsWith("/ledger") ||
        pathname.startsWith("/billing");

      if (isAuthRoute || isLoginPage) {
        return true;
      }

      const organizationId = auth?.user?.organizationId;
      const isTenantSession =
        Boolean(auth?.user?.id) && Boolean(organizationId);

      if (isApi || isProtectedApp) {
        return isTenantSession;
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
