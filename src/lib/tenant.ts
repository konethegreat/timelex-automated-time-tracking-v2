import { NextResponse } from "next/server";
import type { AppSession } from "@/lib/auth";
import { getSession } from "@/lib/auth";

export class TenantError extends Error {
  constructor(
    message: string,
    public readonly status: number = 403,
  ) {
    super(message);
    this.name = "TenantError";
  }
}

/** Require an authenticated session with a valid organizationId. */
export async function requireTenantSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session?.user?.organizationId) {
    throw new TenantError("Unauthorized", 401);
  }
  return session;
}

/** Every query/filter must include this organization scope. */
export function tenantWhere(organizationId: string) {
  return { organizationId };
}

/**
 * Reject records that do not belong to the caller's organization.
 * Use after fetching by primary key.
 */
export function assertTenantOwnership(
  record: { organizationId: string } | null | undefined,
  organizationId: string,
): asserts record is { organizationId: string } {
  if (!record || record.organizationId !== organizationId) {
    throw new TenantError("Resource not found or access denied", 404);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof TenantError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api]", error);
  return NextResponse.json(
    { error: "An unexpected error occurred" },
    { status: 500 },
  );
}
