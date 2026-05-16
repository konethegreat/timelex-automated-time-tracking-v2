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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertValidOrganizationId(organizationId: string): void {
  if (!organizationId.trim() || !UUID_RE.test(organizationId)) {
    throw new TenantError("Invalid tenant context", 403);
  }
}

/**
 * Requires an authenticated session with a verified organizationId.
 * All API handlers must call this before any database query.
 */
export async function requireTenantSession(): Promise<AppSession> {
  const session = await getSession();
  const organizationId = session?.user?.organizationId;

  if (!session?.user?.id || !organizationId) {
    throw new TenantError("Unauthorized", 401);
  }

  assertValidOrganizationId(organizationId);
  return session;
}

/** Mandatory filter — merge into every Prisma where clause. */
export function tenantWhere(organizationId: string) {
  assertValidOrganizationId(organizationId);
  return { organizationId };
}

/**
 * Reject records that do not belong to the caller's organization.
 */
export function assertTenantOwnership(
  record: { organizationId: string } | null | undefined,
  organizationId: string,
): asserts record is { organizationId: string } {
  assertValidOrganizationId(organizationId);
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
