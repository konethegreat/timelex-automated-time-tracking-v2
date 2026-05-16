import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";
import { getServerSession } from "@/auth";

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

function devBypassSession(): AppSession | null {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ALLOW_DEV_AUTH_BYPASS !== "true" ||
    !process.env.DEV_SESSION_USER_ID ||
    !process.env.DEV_SESSION_ORG_ID
  ) {
    return null;
  }

  return {
    user: {
      id: process.env.DEV_SESSION_USER_ID,
      organizationId: process.env.DEV_SESSION_ORG_ID,
      email: process.env.DEV_SESSION_EMAIL ?? "dev@timelex.local",
      name: "Dev User",
      role: "FEE_EARNER",
    },
  };
}

function mapSession(session: Session | null): AppSession | null {
  const user = session?.user;
  if (!user?.id || !user.organizationId || !user.email || !user.role) {
    return null;
  }

  return {
    user: {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
    },
  };
}

/** Resolves the authenticated multi-tenant session for server handlers. */
export async function getSession(): Promise<AppSession | null> {
  const session = await getServerSession();
  const mapped = mapSession(session);
  if (mapped) return mapped;
  return devBypassSession();
}
