import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/matters/search/route";
import { fake, ids, invoke, seedWorld, signInAs, signedOut } from "../helpers/world";

type MatterJson = { id: string; matterNumber: string; clientName: string; description: string };

const search = (query = "") =>
  invoke<{ matters: MatterJson[] }>(GET, {
    url: `http://localhost/api/matters/search${query}`,
  });

beforeEach(() => seedWorld());

describe("GET /api/matters/search", () => {
  it("requires a signed-in tenant user", async () => {
    signedOut();
    expect((await search()).status).toBe(401);
  });

  it("lists only the active matters of the caller's own firm", async () => {
    signInAs("earnerA1");
    const { status, body } = await search();
    expect(status).toBe(200);
    expect(body.matters.map((m) => m.id)).toEqual([ids.matterA1]);
  });

  it("returns only the fields the matter picker needs", async () => {
    signInAs("earnerA1");
    const { body } = await search();
    expect(Object.keys(body.matters[0]).sort()).toEqual([
      "clientName",
      "description",
      "id",
      "matterNumber",
    ]);
  });

  it.each([
    ["by matter number", "?q=test-a-001"],
    ["by client name", "?q=ALPHA"],
    ["by description", "?q=lease"],
  ])("finds a matter %s, ignoring case", async (_label, query) => {
    signInAs("earnerA1");
    const { body } = await search(query);
    expect(body.matters.map((m) => m.id)).toEqual([ids.matterA1]);
  });

  it("does not leak another firm's matters through search terms", async () => {
    signInAs("earnerA1");
    for (const query of ["?q=gamma", "?q=TEST-B-001", "?q=other firm"]) {
      expect((await search(query)).body.matters).toEqual([]);
    }
    signInAs("earnerB1");
    expect((await search("?q=gamma")).body.matters.map((m) => m.id)).toEqual([ids.matterB1]);
  });

  describe("limit", () => {
    // 60 more active matters, so that the firm has 61 and the limit is visible.
    beforeEach(() => {
      for (let n = 1; n <= 60; n++) {
        fake.$insert("matter", {
          id: randomUUID(),
          organizationId: ids.orgA,
          matterNumber: `BULK-${String(n).padStart(3, "0")}`,
          clientName: `Bulk client ${String(n).padStart(3, "0")} (synthetic)`,
          description: "Synthetic matter for the limit tests",
          status: "ACTIVE",
        });
      }
    });

    it.each([
      ["is not given", "", 20],
      ["is a whole number", "?limit=5", 5],
      ["is above the maximum", "?limit=1000", 50],
      ["is not a number", "?limit=abc", 20],
      ["is empty", "?limit=", 20],
      ["is zero", "?limit=0", 20],
      ["is negative", "?limit=-3", 20],
      ["is a fraction", "?limit=2.5", 20],
      ["is Infinity", "?limit=Infinity", 20],
    ])("when the limit %s (query %j), returns %i matters", async (_label, query, expected) => {
      signInAs("earnerA1");
      const { status, body } = await search(query);
      expect(status).toBe(200);
      expect(body.matters).toHaveLength(expected);
    });
  });
});
