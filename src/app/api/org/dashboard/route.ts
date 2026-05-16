import { NextResponse } from "next/server";
import { withTenantApi } from "@/lib/api/with-tenant";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant";
import { unitsToHours } from "@/lib/utils";

export const GET = withTenantApi(async (_request, _context, session) => {
  const { organizationId } = session.user;
  const scope = tenantWhere(organizationId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [todayEntries, monthEntries, pendingDrafts, recentEntries] =
    await Promise.all([
      prisma.timeEntry.aggregate({
        where: {
          ...scope,
          createdAt: { gte: startOfDay },
          syncStatus: { not: "ERROR" },
        },
        _sum: { units: true },
      }),
      prisma.timeEntry.aggregate({
        where: {
          ...scope,
          createdAt: { gte: startOfMonth },
        },
        _sum: { units: true, totalValue: true },
      }),
      prisma.draft.count({
        where: { ...scope, matterId: null },
      }),
      prisma.timeEntry.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          units: true,
          finalizedText: true,
          syncStatus: true,
          syncLock: true,
          createdAt: true,
          matter: { select: { matterNumber: true, clientName: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, ...scope },
    select: { monthlyBillableTarget: true },
  });

  const todayUnits = todayEntries._sum.units ?? 0;
  const monthUnits = monthEntries._sum.units ?? 0;
  const monthValue = monthEntries._sum.totalValue ?? 0;
  const targetHours = user?.monthlyBillableTarget ?? 120;

  return NextResponse.json({
    todayBillableHours: unitsToHours(todayUnits),
    monthBillableHours: unitsToHours(monthUnits),
    monthRealizedValue: Number(monthValue),
    monthlyTargetHours: targetHours,
    pendingDraftCount: pendingDrafts,
    recentActivity: recentEntries,
  });
});
