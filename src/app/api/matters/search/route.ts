import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireTenantSession, tenantWhere } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const session = await requireTenantSession();
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
                { areaOfLaw: { contains: q, mode: "insensitive" } },
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
        areaOfLaw: true,
      },
    });

    return NextResponse.json({ matters });
  } catch (error) {
    return handleApiError(error);
  }
}
