import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  handleApiError,
  requireTenantSession,
  tenantWhere,
} from "@/lib/tenant";

type ApprovePayload = {
  draftIds: string[];
};

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const { organizationId, id: userId } = session.user;
    const scope = tenantWhere(organizationId);
    const body = (await request.json()) as ApprovePayload;

    if (!Array.isArray(body.draftIds) || body.draftIds.length === 0) {
      return NextResponse.json(
        { error: "draftIds array is required" },
        { status: 400 },
      );
    }

    const drafts = await prisma.draft.findMany({
      where: { ...scope, id: { in: body.draftIds } },
    });

    if (drafts.length !== body.draftIds.length) {
      return NextResponse.json({ error: "Drafts not found" }, { status: 404 });
    }

    const unassigned = drafts.filter((d) => !d.matterId);
    if (unassigned.length > 0) {
      return NextResponse.json(
        { error: "All drafts must have a matter assigned before approval" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, ...scope },
      select: { defaultHourlyRate: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hourlyRate = Number(user.defaultHourlyRate);
    const entries = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const draft of drafts) {
        const unitHours = (draft.units * 6) / 60;
        const totalValue = unitHours * hourlyRate;

        const entry = await tx.timeEntry.create({
          data: {
            organizationId,
            userId: draft.userId,
            matterId: draft.matterId!,
            units: draft.units,
            finalizedText: draft.suggestedText,
            hourlyRateApplied: new Prisma.Decimal(hourlyRate.toFixed(2)),
            totalValue: new Prisma.Decimal(totalValue.toFixed(2)),
            syncStatus: "PENDING",
            syncLock: false,
          },
        });
        created.push(entry);
      }

      await tx.draft.deleteMany({
        where: { ...scope, id: { in: body.draftIds } },
      });

      return created;
    });

    return NextResponse.json({ entries }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
