import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/drafts/route";
import { PATCH } from "@/app/api/drafts/bulk/route";
import { ids, invoke, rowsOf, seedWorld, signInAs, signedOut } from "../helpers/world";

type DraftListItem = {
  id: string;
  user: Record<string, unknown>;
  matter: { matterNumber: string } | null;
};

const draft = (id: string) => rowsOf("draft").find((row) => row.id === id);

beforeEach(() => seedWorld());

describe("GET /api/drafts", () => {
  it("requires a signed-in tenant user", async () => {
    signedOut();
    const { status, body } = await invoke(GET);
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("shows a fee earner only their own drafts, newest first", async () => {
    signInAs("earnerA1");
    const { status, body } = await invoke<{ drafts: DraftListItem[] }>(GET);
    expect(status).toBe(200);
    expect(body.drafts.map((d) => d.id)).toEqual([ids.draftA1, ids.draftA3]);
  });

  it("shows a firm admin every draft of their own firm and nothing from another firm", async () => {
    signInAs("adminA");
    const { body } = await invoke<{ drafts: DraftListItem[] }>(GET);
    expect(body.drafts.map((d) => d.id)).toEqual([
      ids.draftA2,
      ids.draftA1,
      ids.draftA3,
    ]);
  });

  it("never shows a firm's drafts to users of another firm", async () => {
    signInAs("earnerB1");
    const { body } = await invoke<{ drafts: DraftListItem[] }>(GET);
    expect(body.drafts.map((d) => d.id)).toEqual([ids.draftB1]);
  });

  it("exposes only id, name and email of the draft owner (no password hash or rate)", async () => {
    signInAs("adminA");
    const { body } = await invoke<{ drafts: DraftListItem[] }>(GET);
    for (const item of body.drafts) {
      expect(Object.keys(item.user).sort()).toEqual(["email", "id", "name"]);
    }
  });

  it("includes the matter summary of assigned drafts and null for unassigned ones", async () => {
    signInAs("adminA");
    const { body } = await invoke<{ drafts: DraftListItem[] }>(GET);
    const byId = Object.fromEntries(body.drafts.map((d) => [d.id, d]));
    expect(byId[ids.draftA3].matter?.matterNumber).toBe("TEST-A-001");
    expect(byId[ids.draftA1].matter).toBeNull();
  });
});

describe("PATCH /api/drafts/bulk (attorney review: assign matter, edit narrative)", () => {
  const patch = (body: unknown) =>
    invoke<{ drafts?: DraftListItem[]; error?: string }>(PATCH, {
      method: "PATCH",
      body,
    });

  it("requires a signed-in tenant user", async () => {
    signedOut();
    const { status } = await patch({ draftIds: [ids.draftA1] });
    expect(status).toBe(401);
  });

  it.each([{}, { draftIds: [] }, { draftIds: "abc" }])(
    "rejects a missing or empty draftIds list (%j)",
    async (payload) => {
      signInAs("earnerA1");
      const { status, body } = await patch(payload);
      expect(status).toBe(400);
      expect(body.error).toBe("draftIds array is required");
    },
  );

  it("assigns a matter and rewrites the narrative", async () => {
    signInAs("earnerA1");
    const { status, body } = await patch({
      draftIds: [ids.draftA1],
      matterId: ids.matterA1,
      suggestedText: "Reviewed and corrected narrative",
    });
    expect(status).toBe(200);
    expect(body.drafts).toHaveLength(1);
    expect(body.drafts?.[0].matter?.matterNumber).toBe("TEST-A-001");
    expect(draft(ids.draftA1)).toMatchObject({
      matterId: ids.matterA1,
      suggestedText: "Reviewed and corrected narrative",
    });
  });

  it("can unassign a draft again by sending matterId: null", async () => {
    signInAs("earnerA1");
    await patch({ draftIds: [ids.draftA3], matterId: null });
    expect(draft(ids.draftA3)?.matterId).toBeNull();
  });

  it("refuses draft ids of another firm and changes nothing", async () => {
    signInAs("earnerA1");
    const { status, body } = await patch({
      draftIds: [ids.draftA1, ids.draftB1],
      matterId: ids.matterA1,
      suggestedText: "should not be written",
    });
    expect(status).toBe(404);
    expect(body.error).toBe("One or more drafts were not found");
    expect(draft(ids.draftA1)?.matterId).toBeNull();
    expect(draft(ids.draftB1)?.suggestedText).toBe("Synthetic note belonging to firm B");
  });

  it("refuses a matter of another firm", async () => {
    signInAs("earnerA1");
    const { status, body } = await patch({
      draftIds: [ids.draftA1],
      matterId: ids.matterB1,
    });
    expect(status).toBe(404);
    expect(body.error).toBe("Resource not found or access denied");
    expect(draft(ids.draftA1)?.matterId).toBeNull();
  });

  it("refuses a matter that is no longer active", async () => {
    signInAs("earnerA1");
    const { status } = await patch({
      draftIds: [ids.draftA1],
      matterId: ids.matterA2Closed,
    });
    expect(status).toBe(404);
    expect(draft(ids.draftA1)?.matterId).toBeNull();
  });

  it("only applies the allow-listed fields (no mass assignment of owner or firm)", async () => {
    signInAs("earnerA1");
    const { status } = await patch({
      draftIds: [ids.draftA1],
      matterId: ids.matterA1,
      organizationId: ids.orgB,
      userId: ids.adminA,
    });
    expect(status).toBe(200);
    expect(draft(ids.draftA1)).toMatchObject({
      organizationId: ids.orgA,
      userId: ids.earnerA1,
      matterId: ids.matterA1,
    });
  });

  describe("units (the duration the reviewer sets)", () => {
    it("saves the duration, in 6-minute units", async () => {
      signInAs("earnerA1");
      const { status, body } = await patch({ draftIds: [ids.draftA1], units: 4 });
      expect(status).toBe(200);
      expect(draft(ids.draftA1)?.units).toBe(4);
      expect(body.drafts?.[0]).toMatchObject({ units: 4 });
    });

    it("leaves the duration alone when no units are sent", async () => {
      signInAs("earnerA1");
      await patch({ draftIds: [ids.draftA1], matterId: ids.matterA1 });
      expect(draft(ids.draftA1)?.units).toBe(2);
    });

    it.each([1, 240])("accepts %i units", async (units) => {
      signInAs("earnerA1");
      expect((await patch({ draftIds: [ids.draftA1], units })).status).toBe(200);
      expect(draft(ids.draftA1)?.units).toBe(units);
    });

    it.each([0, -1, 2.5, "3", null, true, 241, 10_000_000_000])(
      "rejects units %j and changes nothing",
      async (units) => {
        signInAs("earnerA1");
        const { status, body } = await patch({
          draftIds: [ids.draftA1],
          matterId: ids.matterA1,
          units,
        });
        expect(status).toBe(400);
        expect(body.error).toBe("units must be a whole number from 1 to 240");
        expect(draft(ids.draftA1)).toMatchObject({ units: 2, matterId: null });
      },
    );

    it("does not change the duration of another firm's draft", async () => {
      signInAs("earnerA1");
      const { status } = await patch({ draftIds: [ids.draftB1], units: 9 });
      expect(status).toBe(404);
      expect(draft(ids.draftB1)?.units).toBe(4);
    });
  });
});
