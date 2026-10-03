/**
 * Tests the real src/lib/auth.ts (tests/setup.ts replaces it for every other
 * test). The thing worth pinning down is the development login shortcut: it
 * must stay off unless it is switched on explicitly, in development mode only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "@/auth";

vi.mock("@/auth", () => ({ getServerSession: vi.fn() }));

const DEV_USER = "00000000-0000-4000-8000-0000000000d1";
const DEV_ORG = "00000000-0000-4000-8000-0000000000d2";

async function realGetSession() {
  const actual = await vi.importActual<typeof import("@/lib/auth")>(
    "@/lib/auth",
  );
  return actual.getSession();
}

/** Settings under which the shortcut is allowed to switch on. */
function enableDevBypass() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("ALLOW_DEV_AUTH_BYPASS", "true");
  vi.stubEnv("DEV_SESSION_USER_ID", DEV_USER);
  vi.stubEnv("DEV_SESSION_ORG_ID", DEV_ORG);
}

describe("getSession", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    // Start from a known state whatever the developer's own shell exports.
    vi.stubEnv("ALLOW_DEV_AUTH_BYPASS", undefined);
    vi.stubEnv("DEV_SESSION_USER_ID", undefined);
    vi.stubEnv("DEV_SESSION_ORG_ID", undefined);
    vi.stubEnv("DEV_SESSION_EMAIL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when nobody is signed in and nothing is configured", async () => {
    expect(await realGetSession()).toBeNull();
  });

  it("maps a real Auth.js session to the app's session shape", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        email: "someone@firm-a.example",
        name: null,
        role: "FEE_EARNER",
      },
      expires: "2999-01-01T00:00:00.000Z",
    } as never);

    expect(await realGetSession()).toEqual({
      user: {
        id: "user-1",
        organizationId: "org-1",
        email: "someone@firm-a.example",
        name: "",
        role: "FEE_EARNER",
      },
    });
  });

  it("treats a session that has no organization as signed out", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "someone@firm-a.example", role: "FEE_EARNER" },
      expires: "2999-01-01T00:00:00.000Z",
    } as never);

    expect(await realGetSession()).toBeNull();
  });

  describe("development login shortcut", () => {
    it("is on only when explicitly enabled in development, and then signs in the configured user", async () => {
      enableDevBypass();

      expect(await realGetSession()).toEqual({
        user: {
          id: DEV_USER,
          organizationId: DEV_ORG,
          email: "dev@timelex.local",
          name: "Dev User",
          role: "FEE_EARNER",
        },
      });
    });

    it.each(["production", "test"])(
      "stays off when NODE_ENV is %s, even with every other setting present",
      async (mode) => {
        enableDevBypass();
        vi.stubEnv("NODE_ENV", mode);

        expect(await realGetSession()).toBeNull();
      },
    );

    it.each(["", "false", "1", "TRUE", "yes"])(
      "stays off unless ALLOW_DEV_AUTH_BYPASS is exactly \"true\" (got %j)",
      async (flag) => {
        enableDevBypass();
        vi.stubEnv("ALLOW_DEV_AUTH_BYPASS", flag);

        expect(await realGetSession()).toBeNull();
      },
    );

    it.each(["DEV_SESSION_USER_ID", "DEV_SESSION_ORG_ID"])(
      "stays off when %s is missing",
      async (name) => {
        enableDevBypass();
        vi.stubEnv(name, "");

        expect(await realGetSession()).toBeNull();
      },
    );

    it("never replaces a real session", async () => {
      enableDevBypass();
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          email: "someone@firm-a.example",
          name: "Someone",
          role: "FIRM_ADMIN",
        },
        expires: "2999-01-01T00:00:00.000Z",
      } as never);

      const session = await realGetSession();
      expect(session?.user.id).toBe("user-1");
      expect(session?.user.organizationId).toBe("org-1");
    });
  });
});
