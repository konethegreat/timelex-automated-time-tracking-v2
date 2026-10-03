import { NextResponse } from "next/server";
import { withTenantApi } from "@/lib/api/with-tenant";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant";

const PAGE_SIZE = 100;

export const GET = withTenantApi(async (_request, _context, session) => {
  const isAdmin = ["FIRM_ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const entries = await prisma.timeEntry.findMany({
    where: {
      ...tenantWhere(session.user.organizationId),
      ...(isAdmin ? {} : { userId: session.user.id }),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true, units: true, finalizedText: true, hourlyRateApplied: true,
      totalValue: true, syncStatus: true, syncLock: true, createdAt: true,
      matter: { select: { matterNumber: true, clientName: true } },
      user: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json(
    { entries: entries.slice(0, PAGE_SIZE), hasMore: entries.length > PAGE_SIZE, limit: PAGE_SIZE },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
