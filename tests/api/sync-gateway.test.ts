import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { POST } from "@/app/api/sync/gateway/route";
import { fake, ids, invoke, rowsOf, seedWorld, signInAs, signedOut } from "../helpers/world";

// Synthetic time entries; ids are valid UUIDs but only used as row keys here.
const entryIds = {
  a1: "00000000-0000-4000-8000-0000000000a1",
  a2: "00000000-0000-4000-8000-0000000000a2",
  aSynced: "00000000-0000-4000-8000-0000000000a3",
  aLockedPending: "00000000-0000-4000-8000-0000000000a4",
  b1: "00000000-0000-4000-8000-0000000000b1",
};

function insertEntry(id: string, organizationId: string, extra: Record<string, unknown> = {}) {
  fake.$insert("timeEntry", {
    id,
    organizationId,
    userId: organizationId === ids.orgA ? ids.earnerA1 : ids.earnerB1,
    matterId: organizationId === ids.orgA ? ids.matterA1 : ids.matterB1,
    units: 3,
    finalizedText: "Synthetic entry",
    hourlyRateApplied: new Prisma.Decimal("3500.00"),
    totalValue: new Prisma.Decimal("1050.00"),
    syncStatus: "PENDING",
    syncLock: false,
    ...extra,
  });
}

const entry = (id: string) => rowsOf("timeEntry").find((row) => row.id === id);

const sync = (entryIdList: unknown) =>
  invoke<{ synced?: number; message?: string; error?: string }>(POST, {
    method: "POST",
    body: { entryIds: entryIdList },
  });

beforeEach(() => {
  seedWorld();
  insertEntry(entryIds.a1, ids.orgA);
  insertEntry(entryIds.a2, ids.orgA);
  insertEntry(entryIds.aSynced, ids.orgA, { syncStatus: "SYNCED", syncLock: true });
  insertEntry(entryIds.b1, ids.orgB);
});

afterEach(() => vi.unstubAllEnvs());

// The "gateway" is a simulation: it flips status fields in the database and
// contacts no external practice-management system.
describe("POST /api/sync/gateway (simulated export to the practice-management system)", () => {
  it("requires a signed-in tenant user", async () => {
    signedOut();
    expect((await sync([entryIds.a1])).status).toBe(401);
  });

  it.each([undefined, [], "abc"])("rejects a missing or empty entryIds list (%j)", async (value) => {
    signInAs("earnerA1");
    const { status, body } = await sync(value);
    expect(status).toBe(400);
    expect(body.error).toBe("entryIds array is required");
  });

  it("marks pending entries as synced and locks them, and says the push is simulated", async () => {
    signInAs("earnerA1");
    const { status, body } = await sync([entryIds.a1, entryIds.a2]);

    expect(status).toBe(200);
    expect(body.synced).toBe(2);
    expect(body.message).toMatch(/simulated/i);
    expect(entry(entryIds.a1)).toMatchObject({ syncStatus: "SYNCED", syncLock: true });
    expect(entry(entryIds.a2)).toMatchObject({ syncStatus: "SYNCED", syncLock: true });
  });

  it("does not export the same entry twice", async () => {
    signInAs("earnerA1");
    expect((await sync([entryIds.a1])).status).toBe(200);

    const again = await sync([entryIds.a1]);
    expect(again.status).toBe(409);
    expect(entry(entryIds.a1)).toMatchObject({ syncStatus: "SYNCED", syncLock: true });
  });

  it("refuses entries that are already synced and locked", async () => {
    signInAs("earnerA1");
    const { status } = await sync([entryIds.aSynced]);
    expect(status).toBe(409);
  });

  it("honours the lock flag on its own, even if the status still says PENDING", async () => {
    insertEntry(entryIds.aLockedPending, ids.orgA, { syncStatus: "PENDING", syncLock: true });
    signInAs("earnerA1");
    const { status } = await sync([entryIds.aLockedPending]);
    expect(status).toBe(409);
    expect(entry(entryIds.aLockedPending)).toMatchObject({ syncStatus: "PENDING", syncLock: true });
  });

  it("is all-or-nothing: one locked entry in the request means nothing is exported", async () => {
    signInAs("earnerA1");
    const { status } = await sync([entryIds.a1, entryIds.aSynced]);
    expect(status).toBe(409);
    expect(entry(entryIds.a1)).toMatchObject({ syncStatus: "PENDING", syncLock: false });
  });

  it("cannot export another firm's entries", async () => {
    signInAs("earnerA1");
    const { status } = await sync([entryIds.b1]);
    expect(status).toBe(409);
    expect(entry(entryIds.b1)).toMatchObject({ syncStatus: "PENDING", syncLock: false });
  });

  it("marks entries as ERROR and answers 502 when the simulated gateway rejects the payload", async () => {
    vi.stubEnv("SYNC_GATEWAY_SIMULATE_FAILURE", "true");
    signInAs("earnerA1");
    const { status, body } = await sync([entryIds.a1]);

    expect(status).toBe(502);
    expect(body.error).toMatch(/simulated/i);
    expect(entry(entryIds.a1)).toMatchObject({ syncStatus: "ERROR", syncLock: false });
    expect(entry(entryIds.b1)).toMatchObject({ syncStatus: "PENDING" });
  });
});
