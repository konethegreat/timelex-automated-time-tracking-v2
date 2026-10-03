import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/drafts/bulk/route";
import { POST } from "@/app/api/entries/approve/route";
import {
  fake,
  ids,
  invoke,
  rowsOf,
  seedWorld,
  signInAs,
  signedOut,
} from "../helpers/world";

type EntryJson = {
  id: string;
  organizationId: string;
  userId: string;
  matterId: string;
  units: number;
  finalizedText: string;
  hourlyRateApplied: string;
  totalValue: string;
  syncStatus: string;
  syncLock: boolean;
};

const approve = (draftIds: unknown) =>
  invoke<{ entries?: EntryJson[]; error?: string }>(POST, {
    method: "POST",
    body: { draftIds },
  });

const assignMatter = (draftIds: string[], matterId: string) =>
  invoke(PATCH, { method: "PATCH", body: { draftIds, matterId } });

const draftIdsInDb = () => rowsOf("draft").map((row) => row.id);

beforeEach(() => seedWorld());
afterEach(() => vi.restoreAllMocks());

describe("POST /api/entries/approve", () => {
  it("requires a signed-in tenant user", async () => {
    signedOut();
    const { status } = await approve([ids.draftA3]);
    expect(status).toBe(401);
  });

  it.each([undefined, [], "abc"])(
    "rejects a missing or empty draftIds list (%j)",
    async (value) => {
      signInAs("earnerA1");
      const { status, body } = await approve(value);
      expect(status).toBe(400);
      expect(body.error).toBe("draftIds array is required");
    },
  );

  it("turns an assigned draft into a pending, unlocked time entry and removes the draft", async () => {
    signInAs("earnerA1");
    const { status, body } = await approve([ids.draftA3]);

    expect(status).toBe(201);
    expect(body.entries).toHaveLength(1);
    expect(body.entries?.[0]).toMatchObject({
      organizationId: ids.orgA,
      userId: ids.earnerA1,
      matterId: ids.matterA1,
      units: 3,
      finalizedText: "Synthetic review of settlement draft",
      syncStatus: "PENDING",
      syncLock: false,
    });
    expect(draftIdsInDb()).not.toContain(ids.draftA3);
    expect(rowsOf("timeEntry")).toHaveLength(1);
  });

  it("values an entry as units x 6 minutes x hourly rate (3 units at R3500/h = R1050)", async () => {
    signInAs("earnerA1");
    const { body } = await approve([ids.draftA3]);
    const entry = body.entries![0];
    expect(Number(entry.hourlyRateApplied)).toBe(3500);
    expect(Number(entry.totalValue)).toBe(1050);
  });

  it("approves several drafts in one request", async () => {
    signInAs("earnerA1");
    await assignMatter([ids.draftA1], ids.matterA1);

    const { status, body } = await approve([ids.draftA1, ids.draftA3]);
    expect(status).toBe(201);
    expect(body.entries?.map((e) => Number(e.totalValue)).sort((a, b) => a - b)).toEqual([
      700, // 2 units
      1050, // 3 units
    ]);
    expect(draftIdsInDb()).toEqual([ids.draftA2, ids.draftB1]);
  });

  it("refuses drafts that have no matter yet and creates nothing", async () => {
    signInAs("earnerA1");
    const { status, body } = await approve([ids.draftA3, ids.draftA1]);
    expect(status).toBe(400);
    expect(body.error).toBe("All drafts must have a matter assigned before approval");
    expect(rowsOf("timeEntry")).toHaveLength(0);
    expect(draftIdsInDb()).toContain(ids.draftA3);
  });

  it("refuses draft ids of another firm and leaves both firms' data untouched", async () => {
    signInAs("earnerA1");
    const { status, body } = await approve([ids.draftA3, ids.draftB1]);
    expect(status).toBe(404);
    expect(body.error).toBe("Drafts not found");
    expect(rowsOf("timeEntry")).toHaveLength(0);
    expect(draftIdsInDb()).toEqual(expect.arrayContaining([ids.draftA3, ids.draftB1]));
  });

  describe("duplicate handling", () => {
    it("does not create a second entry when the same draft is approved again", async () => {
      signInAs("earnerA1");
      expect((await approve([ids.draftA3])).status).toBe(201);

      const second = await approve([ids.draftA3]);
      expect(second.status).toBe(404);
      expect(rowsOf("timeEntry")).toHaveLength(1);
    });

    it("does not create two entries when one request lists the same draft twice", async () => {
      signInAs("earnerA1");
      const { status } = await approve([ids.draftA3, ids.draftA3]);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(rowsOf("timeEntry")).toHaveLength(0);
      expect(draftIdsInDb()).toContain(ids.draftA3);
    });
  });

  it("is all-or-nothing: if creating one entry fails, no entry is kept and no draft is deleted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInAs("earnerA1");
    await assignMatter([ids.draftA1], ids.matterA1);
    fake.$failOn({
      model: "timeEntry",
      operation: "create",
      onCall: 2,
      error: new Error("simulated database failure"),
    });

    const { status, body } = await approve([ids.draftA1, ids.draftA3]);

    expect(status).toBe(500);
    expect(body.error).toBe("An unexpected error occurred");
    expect(rowsOf("timeEntry")).toHaveLength(0);
    expect(draftIdsInDb()).toEqual(expect.arrayContaining([ids.draftA1, ids.draftA3]));
  });
});
