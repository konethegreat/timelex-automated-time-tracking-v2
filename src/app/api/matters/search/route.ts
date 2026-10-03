import { NextResponse } from "next/server";
import { withTenantApi } from "@/lib/api/with-tenant";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Anything that is not a whole number of at least 1 falls back to the default. */
function parseLimit(raw: string | null): number {
  const value = Number(raw);
  if (!raw?.trim() || !Number.isInteger(value) || value < 1) return DEFAULT_LIMIT;
  return Math.min(value, MAX_LIMIT);
}

export const GET = withTenantApi(async (request, _context, session) => {
  const scope = tenantWhere(session.user.organizationId);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = parseLimit(searchParams.get("limit"));

  const matters = await prisma.matter.findMany({
    where: {
      ...scope,
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { matterNumber: { contains: q, mode: "insensitive" } },
              { clientName: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { clientName: "asc" },
    take: limit,
    select: {
      id: true,
      matterNumber: true,
      clientName: true,
      description: true,
    },
  });

  return NextResponse.json({ matters });
});
