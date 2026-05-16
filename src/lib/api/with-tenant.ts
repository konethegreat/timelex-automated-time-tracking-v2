import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AppSession } from "@/lib/auth";
import { handleApiError, requireTenantSession } from "@/lib/tenant";

type RouteContext = { params: Promise<Record<string, string>> };

type TenantRouteHandler = (
  request: NextRequest,
  context: RouteContext,
  session: AppSession,
) => Promise<Response> | Response;

/**
 * Wraps an API route handler with mandatory tenant session verification.
 * Ensures organizationId is resolved from the server session before handler logic runs.
 */
export function withTenantApi(handler: TenantRouteHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      const session = await requireTenantSession();
      return await handler(request, context, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
