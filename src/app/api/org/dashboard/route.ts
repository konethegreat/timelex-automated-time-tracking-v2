import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireTenantSession, tenantWhere } from "@/lib/tenant";
import { unitsToHours } from "@/lib/utils";

export async function GET() {
  try {
    const session = await requireTenantSession();
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
            approvedAt: { gte: startOfDay },
            syncStatus: { not: "ERROR" },
          },
          _sum: { units: true },
        }),
        prisma.timeEntry.aggregate({
          where: {
            ...scope,
            approvedAt: { gte: startOfMonth },
          },
          _sum: { units: true, totalValue: true },
        }),
        prisma.draft.count({
          where: { ...scope, matterId: null },
        }),
        prisma.timeEntry.findMany({
          where: scope,
          orderBy: { approvedAt: "desc" },
          take: 10,
          select: {
            id: true,
            units: true,
            finalizedNarration: true,
            syncStatus: true,
            approvedAt: true,
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
    const targetHours = user
      ? Number(user.monthlyBillableTarget)
      : 160;

    return NextResponse.json({
      todayBillableHours: unitsToHours(todayUnits),
      monthBillableHours: unitsToHours(monthUnits),
      monthRealizedValue: Number(monthValue),
      monthlyTargetHours: targetHours,
      pendingDraftCount: pendingDrafts,
      recentActivity: recentEntries,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
