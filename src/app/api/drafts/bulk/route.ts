import { NextResponse } from "next/server";
import { withTenantApi } from "@/lib/api/with-tenant";
import { prisma } from "@/lib/prisma";
import {
  assertTenantOwnership,
  tenantWhere,
} from "@/lib/tenant";
import { MAX_UNITS_PER_ENTRY } from "@/lib/utils";

type BulkDraftPatch = {
  draftIds: string[];
  matterId?: string | null;
  suggestedText?: string;
  units?: number;
};

export const PATCH = withTenantApi(async (request, _context, session) => {
  const { organizationId } = session.user;
  const scope = tenantWhere(organizationId);
  const body = (await request.json()) as BulkDraftPatch;

  if (!Array.isArray(body.draftIds) || body.draftIds.length === 0) {
    return NextResponse.json(
      { error: "draftIds array is required" },
      { status: 400 },
    );
  }

  if (
    body.units !== undefined &&
    !(
      typeof body.units === "number" &&
      Number.isInteger(body.units) &&
      body.units >= 1 &&
      body.units <= MAX_UNITS_PER_ENTRY
    )
  ) {
    return NextResponse.json(
      { error: `units must be a whole number from 1 to ${MAX_UNITS_PER_ENTRY}` },
      { status: 400 },
    );
  }

  const drafts = await prisma.draft.findMany({
    where: { ...scope, id: { in: body.draftIds } },
  });

  if (drafts.length !== body.draftIds.length) {
    return NextResponse.json(
      { error: "One or more drafts were not found" },
      { status: 404 },
    );
  }

  if (body.matterId) {
    const matter = await prisma.matter.findFirst({
      where: { ...scope, id: body.matterId, status: "ACTIVE" },
    });
    assertTenantOwnership(matter, organizationId);
  }

  const data: {
    matterId?: string | null;
    suggestedText?: string;
    units?: number;
  } = {};

  if (body.matterId !== undefined) data.matterId = body.matterId;
  if (body.suggestedText !== undefined) data.suggestedText = body.suggestedText;
  if (body.units !== undefined) data.units = body.units;

  await prisma.draft.updateMany({
    where: { ...scope, id: { in: body.draftIds } },
    data,
  });

  const updated = await prisma.draft.findMany({
    where: { ...scope, id: { in: body.draftIds } },
    include: {
      matter: { select: { id: true, matterNumber: true, clientName: true } },
    },
  });

  return NextResponse.json({ drafts: updated });
});
