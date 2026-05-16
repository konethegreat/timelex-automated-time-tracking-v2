import type { UserRole } from "@prisma/client";

/**
 * Session shape used across API routes.
 * Wired to Auth.js in a later pass; stub supports local development.
 */
export type SessionUser = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AppSession = {
  user: SessionUser;
};

/**
 * Resolves the authenticated session for API handlers.
 * Returns null when unauthenticated.
 */
export async function getSession(): Promise<AppSession | null> {
  if (process.env.NODE_ENV === "development" && process.env.DEV_SESSION_USER_ID) {
    return {
      user: {
        id: process.env.DEV_SESSION_USER_ID,
        organizationId: process.env.DEV_SESSION_ORG_ID ?? "",
        email: process.env.DEV_SESSION_EMAIL ?? "dev@timelex.local",
        name: "Dev User",
        role: "FEE_EARNER",
      },
    };
  }
  return null;
}
