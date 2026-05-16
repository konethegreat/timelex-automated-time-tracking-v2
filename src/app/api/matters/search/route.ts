import { NextResponse } from "next/server";
import { withTenantApi } from "@/lib/api/with-tenant";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant";

export const GET = withTenantApi(async (request, _context, session) => {
  const scope = tenantWhere(session.user.organizationId);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

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
