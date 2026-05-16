import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireTenantSession, tenantWhere } from "@/lib/tenant";

export async function GET() {
  try {
    const session = await requireTenantSession();
    const scope = tenantWhere(session.user.organizationId);

    const isAdmin =
      session.user.role === "FIRM_ADMIN" ||
      session.user.role === "SUPER_ADMIN";

    const drafts = await prisma.draft.findMany({
      where: {
        ...scope,
        ...(isAdmin ? {} : { userId: session.user.id }),
      },
      orderBy: { timestamp: "desc" },
      include: {
        matter: {
          select: { id: true, matterNumber: true, clientName: true },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    return handleApiError(error);
  }
}
