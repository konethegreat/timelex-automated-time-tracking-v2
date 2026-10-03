import { beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/entries/route";
import { fake, ids, invoke, seedWorld, signInAs, signedOut } from "../helpers/world";

function insertEntry(id: string, organizationId: string, userId: string, createdAt: Date) {
  fake.$insert("timeEntry", { id, organizationId, userId, createdAt,
    matterId: organizationId === ids.orgA ? ids.matterA1 : ids.matterB1,
    units: 3, finalizedText: "Synthetic approved entry",
    hourlyRateApplied: new Prisma.Decimal("3500"), totalValue: new Prisma.Decimal("1050"),
  });
}
type Result = { entries: { id: string; user: Record<string, unknown>; matter: Record<string, unknown> }[]; hasMore: boolean; limit: number };

beforeEach(() => {
  seedWorld();
  insertEntry("entry-a-own", ids.orgA, ids.earnerA1, new Date("2026-03-10"));
  insertEntry("entry-a-colleague", ids.orgA, ids.earnerA2, new Date("2026-03-11"));
  insertEntry("entry-b", ids.orgB, ids.earnerB1, new Date("2026-03-12"));
});

describe("GET /api/entries", () => {
  it("rejects anonymous requests before querying the database", async () => {
    signedOut();
    expect((await invoke(GET)).status).toBe(401);
  });
  it("limits fee earners to their own ledger entries", async () => {
    signInAs("earnerA1");
    expect((await invoke<Result>(GET)).body.entries.map(entry => entry.id)).toEqual(["entry-a-own"]);
  });
  it("shows admins their firm's entries in descending order", async () => {
    signInAs("adminA");
    expect((await invoke<Result>(GET)).body.entries.map(entry => entry.id)).toEqual(["entry-a-colleague", "entry-a-own"]);
  });
  it("does not leak another firm's entries", async () => {
    signInAs("earnerB1");
    expect((await invoke<Result>(GET)).body.entries.map(entry => entry.id)).toEqual(["entry-b"]);
  });
  it("excludes user password hashes and unrelated account fields", async () => {
    signInAs("adminA");
    const { body } = await invoke<Result>(GET);
    expect(Object.keys(body.entries[0].user).sort()).toEqual(["email", "name"]);
    expect(body.entries[0].matter).toEqual({ matterNumber: "TEST-A-001", clientName: "Client Alpha (synthetic)" });
  });
  it("reports when older entries are omitted from the bounded view", async () => {
    for (let index = 0; index < 101; index++) insertEntry("extra-" + index, ids.orgA, ids.earnerA1, new Date("2026-03-13"));
    signInAs("earnerA1");
    const { body } = await invoke<Result>(GET);
    expect(body.entries).toHaveLength(100);
    expect(body.hasMore).toBe(true);
    expect(body.limit).toBe(100);
  });
});
