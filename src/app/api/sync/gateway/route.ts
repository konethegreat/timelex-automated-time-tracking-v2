import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handleApiError,
  requireTenantSession,
  tenantWhere,
} from "@/lib/tenant";

type SyncPayload = {
  entryIds: string[];
};

/**
 * Simulates secure outbound transfer to Ghost Practice (or other PMS).
 * Marks entries as SYNCED and applies syncLock.
 */
export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const scope = tenantWhere(session.user.organizationId);
    const body = (await request.json()) as SyncPayload;

    if (!Array.isArray(body.entryIds) || body.entryIds.length === 0) {
      return NextResponse.json(
        { error: "entryIds array is required" },
        { status: 400 },
      );
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        ...scope,
        id: { in: body.entryIds },
        syncLock: false,
        syncStatus: "PENDING",
      },
    });

    if (entries.length !== body.entryIds.length) {
      return NextResponse.json(
        {
          error:
            "Some entries are missing, already synced, or locked for sync",
        },
        { status: 409 },
      );
    }

    // Simulated latency / failure hook for integration testing
    if (process.env.SYNC_GATEWAY_SIMULATE_FAILURE === "true") {
      await prisma.timeEntry.updateMany({
        where: { ...scope, id: { in: body.entryIds } },
        data: { syncStatus: "ERROR" },
      });
      return NextResponse.json(
        { error: "Ghost Practice gateway rejected the payload (simulated)" },
        { status: 502 },
      );
    }

    const result = await prisma.timeEntry.updateMany({
      where: { ...scope, id: { in: body.entryIds } },
      data: {
        syncStatus: "SYNCED",
        syncLock: true,
      },
    });

    return NextResponse.json({
      synced: result.count,
      message: "Entries pushed to enterprise gateway (simulated)",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
