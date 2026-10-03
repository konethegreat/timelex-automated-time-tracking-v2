import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/org/dashboard/route";
import { fake, ids, invoke, seedWorld, signInAs, signedOut } from "../helpers/world";

type Dashboard = {
  todayBillableHours: number;
  monthBillableHours: number;
  monthRealizedValue: number;
  monthlyTargetHours: number;
  pendingDraftCount: number;
  activeMattersCount: number;
  leakedRecoveryValue: number;
  recentActivity: Array<{
    id: string;
    matter: Record<string, unknown> | null;
    user: Record<string, unknown>;
  }>;
};

function entry(
  id: string,
  organizationId: string,
  userId: string,
  matterId: string,
  units: number,
  totalValue: string,
  createdAt: Date,
  syncStatus = "PENDING",
) {
  fake.$insert("timeEntry", {
    id,
    organizationId,
    userId,
    matterId,
    units,
    finalizedText: `Synthetic entry ${id}`,
    hourlyRateApplied: new Prisma.Decimal("1.00"),
    totalValue: new Prisma.Decimal(totalValue),
    syncStatus,
    syncLock: syncStatus === "SYNCED",
    createdAt,
  });
}

beforeEach(() => {
  seedWorld();

  // "Now" is 10 March 2026, midday local time (midday keeps day boundaries
  // out of play whatever the machine's time zone is).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));

  entry("t1", ids.orgA, ids.earnerA1, ids.matterA1, 10, "3500.00", new Date(2026, 2, 10, 9, 0));
  entry("t2", ids.orgA, ids.earnerA2, ids.matterA1, 2, "440.00", new Date(2026, 2, 10, 8, 0), "ERROR");
  entry("t3", ids.orgA, ids.earnerA1, ids.matterA1, 4, "1400.00", new Date(2026, 2, 3, 10, 0), "SYNCED");
  entry("t4", ids.orgA, ids.earnerA2, ids.matterA1, 50, "11000.00", new Date(2026, 1, 20, 10, 0));
  // Another firm's entry dated today: must never show up in firm A's numbers.
  entry("tB", ids.orgB, ids.earnerB1, ids.matterB1, 99, "99000.00", new Date(2026, 2, 10, 10, 0));
});

afterEach(() => vi.useRealTimers());

describe("GET /api/org/dashboard", () => {
  it("requires a signed-in tenant user", async () => {
    signedOut();
    expect((await invoke(GET)).status).toBe(401);
  });

  it("adds up only the caller's own firm", async () => {
    signInAs("adminA");
    const { status, body } = await invoke<Dashboard>(GET);

    expect(status).toBe(200);
    // Today: t1 only (t2 is today but failed to sync, so it is not counted).
    expect(body.todayBillableHours).toBeCloseTo(1.0, 10);
    // This month: t1 + t2 + t3 = 16 units = 1.6 hours and R5 340.00.
    expect(body.monthBillableHours).toBeCloseTo(1.6, 10);
    expect(body.monthRealizedValue).toBe(5340);
    expect(body.pendingDraftCount).toBe(2);
    expect(body.activeMattersCount).toBe(1); // the closed matter is not counted
    expect(body.monthlyTargetHours).toBe(120);
  });

  it("values unassigned drafts at each draft owner's hourly rate", async () => {
    signInAs("adminA");
    const { body } = await invoke<Dashboard>(GET);
    // 2 units (0.2 h) at R3500 + 5 units (0.5 h) at R2200 = R700 + R1100.
    expect(body.leakedRecoveryValue).toBeCloseTo(1800, 6);
  });

  it("lists recent activity newest first without any other firm's entries", async () => {
    signInAs("adminA");
    const { body } = await invoke<Dashboard>(GET);
    expect(body.recentActivity.map((e) => e.id)).toEqual(["t1", "t2", "t3", "t4"]);
  });

  it("exposes only name and email of the entry owner and a matter summary", async () => {
    signInAs("adminA");
    const { body } = await invoke<Dashboard>(GET);
    for (const item of body.recentActivity) {
      expect(Object.keys(item.user).sort()).toEqual(["email", "name"]);
      expect(Object.keys(item.matter ?? {}).sort()).toEqual(["clientName", "matterNumber"]);
    }
  });

  it("shows firm B only firm B's numbers", async () => {
    signInAs("earnerB1");
    const { body } = await invoke<Dashboard>(GET);
    expect(body.todayBillableHours).toBeCloseTo(9.9, 10);
    expect(body.monthRealizedValue).toBe(99000);
    expect(body.pendingDraftCount).toBe(1);
    expect(body.recentActivity.map((e) => e.id)).toEqual(["tB"]);
  });
});
