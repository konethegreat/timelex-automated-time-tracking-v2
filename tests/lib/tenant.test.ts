import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTenantApi } from "@/lib/api/with-tenant";
import {
  TenantError,
  assertTenantOwnership,
  handleApiError,
  requireTenantSession,
  tenantWhere,
} from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { ids, invoke, signInAs, signedOut } from "../helpers/world";

describe("tenantWhere", () => {
  it("returns the organization filter for a valid id", () => {
    expect(tenantWhere(ids.orgA)).toEqual({ organizationId: ids.orgA });
  });

  it.each(["", "   ", "not-a-uuid", "1234", "00000000-0000-0000-0000-000000000000"])(
    "rejects an invalid organization id (%j) with 403",
    (value) => {
      expect(() => tenantWhere(value)).toThrowError(TenantError);
      try {
        tenantWhere(value);
      } catch (error) {
        expect((error as TenantError).status).toBe(403);
      }
    },
  );
});

describe("assertTenantOwnership", () => {
  it("accepts a record of the caller's organization", () => {
    expect(() =>
      assertTenantOwnership({ organizationId: ids.orgA }, ids.orgA),
    ).not.toThrow();
  });

  it("answers 404 (not 403) for a record of another organization, so existence is not revealed", () => {
    try {
      assertTenantOwnership({ organizationId: ids.orgB }, ids.orgA);
      expect.unreachable("expected a TenantError");
    } catch (error) {
      expect(error).toBeInstanceOf(TenantError);
      expect((error as TenantError).status).toBe(404);
    }
  });

  it("answers 404 for a missing record", () => {
    for (const record of [null, undefined]) {
      try {
        assertTenantOwnership(record, ids.orgA);
        expect.unreachable("expected a TenantError");
      } catch (error) {
        expect((error as TenantError).status).toBe(404);
      }
    }
  });

  it("refuses a malformed organization id even when the record carries the same value", () => {
    try {
      assertTenantOwnership({ organizationId: "firm-a" }, "firm-a");
      expect.unreachable("expected a TenantError");
    } catch (error) {
      expect(error).toBeInstanceOf(TenantError);
      expect((error as TenantError).status).toBe(403);
    }
  });
});

describe("requireTenantSession", () => {
  beforeEach(() => signedOut());

  it("rejects a request without a session with 401", async () => {
    await expect(requireTenantSession()).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a session that carries no organization with 401", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: {
        id: ids.earnerA1,
        organizationId: "",
        email: "x@firm-a.example",
        name: "X",
        role: "FEE_EARNER",
      },
    });
    await expect(requireTenantSession()).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a session that carries no user id with 401", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: {
        id: "",
        organizationId: ids.orgA,
        email: "x@firm-a.example",
        name: "X",
        role: "FEE_EARNER",
      },
    });
    await expect(requireTenantSession()).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a session whose organization id is malformed with 403", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: {
        id: ids.earnerA1,
        organizationId: "firm-a",
        email: "x@firm-a.example",
        name: "X",
        role: "FEE_EARNER",
      },
    });
    await expect(requireTenantSession()).rejects.toMatchObject({ status: 403 });
  });

  it("returns the session for a valid tenant user", async () => {
    signInAs("earnerA1");
    const session = await requireTenantSession();
    expect(session.user.organizationId).toBe(ids.orgA);
  });
});

describe("handleApiError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps a TenantError to its status and message", async () => {
    const response = handleApiError(new TenantError("nope", 404));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "nope" });
  });

  it("hides the details of unexpected errors behind a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleApiError(new Error("connection string leaked here"));
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("An unexpected error occurred");
    expect(JSON.stringify(body)).not.toContain("connection string");
  });
});

describe("withTenantApi", () => {
  it("does not run the handler without a session", async () => {
    signedOut();
    const handler = vi.fn(() => Response.json({ ok: true }));
    const { status, body } = await invoke(withTenantApi(handler));
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes the verified session to the handler", async () => {
    signInAs("adminA");
    const handler = vi.fn((_req: unknown, _ctx: unknown, session: { user: { organizationId: string } }) =>
      Response.json({ organizationId: session.user.organizationId }),
    );
    const { status, body } = await invoke(withTenantApi(handler));
    expect(status).toBe(200);
    expect(body).toEqual({ organizationId: ids.orgA });
  });
});
