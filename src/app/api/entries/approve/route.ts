import { NextResponse } from "next/server";
import { withTenantApi } from "@/lib/api/with-tenant";
import { entryValue } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant";

type ApprovePayload = {
  draftIds: string[];
};

/** Another request approved (or removed) one of these drafts while this one was running. */
class DraftsAlreadyClaimedError extends Error {}

export const POST = withTenantApi(async (request, _context, session) => {
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

  const hourlyRate = user.defaultHourlyRate;
  const entries = await prisma
    .$transaction(async (tx) => {
      // Take the drafts first. A DELETE locks the rows, so when two requests
      // approve the same draft at the same moment, the second one waits for the
      // first to commit and then finds nothing left to take. Creating the entries
      // before this check would bill the same work twice.
      const claimed = await tx.draft.deleteMany({
        where: { ...scope, id: { in: body.draftIds } },
      });
      if (claimed.count !== drafts.length) {
        throw new DraftsAlreadyClaimedError();
      }

      const created = [];

      for (const draft of drafts) {
        const entry = await tx.timeEntry.create({
          data: {
            organizationId,
            userId: draft.userId,
            matterId: draft.matterId!,
            units: draft.units,
            finalizedText: draft.suggestedText,
            hourlyRateApplied: hourlyRate,
            totalValue: entryValue(draft.units, hourlyRate),
            syncStatus: "PENDING",
            syncLock: false,
          },
        });
        created.push(entry);
      }

      return created;
    })
    .catch((error: unknown) => {
      if (error instanceof DraftsAlreadyClaimedError) return null;
      throw error;
    });

  if (!entries) {
    return NextResponse.json(
      { error: "Drafts were already approved or removed" },
      { status: 409 },
    );
  }

  return NextResponse.json({ entries }, { status: 201 });
});
