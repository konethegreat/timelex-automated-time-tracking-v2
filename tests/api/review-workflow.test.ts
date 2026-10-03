/**
 * The workflow v2 actually implements, end to end through the real route
 * handlers (with the in-memory fake database):
 *
 *   draft  ->  attorney review  ->  approved time entry  ->  simulated export
 *
 * There is no capture step in the code: nothing creates drafts except the seed
 * script (or a direct database insert). These tests therefore start from a
 * synthetic draft that is already in the database. The "export" is the
 * simulated Ghost Practice gateway, which only updates status fields.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { GET as listDrafts } from "@/app/api/drafts/route";
import { PATCH as reviewDrafts } from "@/app/api/drafts/bulk/route";
import { POST as approve } from "@/app/api/entries/approve/route";
import { POST as syncGateway } from "@/app/api/sync/gateway/route";
import { GET as dashboard } from "@/app/api/org/dashboard/route";
import { ids, invoke, rowsOf, seedWorld, signInAs } from "../helpers/world";

type Draft = { id: string; suggestedText: string };
type Entry = { id: string; finalizedText: string; syncStatus: string; syncLock: boolean };

beforeEach(() => seedWorld());

describe("draft -> review -> approval -> export", () => {
  it("carries one synthetic draft through the whole flow", async () => {
    signInAs("earnerA1");

    // 1. The activity shows up as a draft in the fee earner's queue.
    const queue = await invoke<{ drafts: Draft[] }>(listDrafts);
    expect(queue.body.drafts.map((d) => d.id)).toContain(ids.draftA1);

    // 2. The attorney reviews it: picks the matter and corrects the narrative.
    const reviewed = await invoke(reviewDrafts, {
      method: "PATCH",
      body: {
        draftIds: [ids.draftA1],
        matterId: ids.matterA1,
        suggestedText: "Corrected narrative approved by the attorney",
      },
    });
    expect(reviewed.status).toBe(200);

    // 3. Approval turns the draft into a pending time entry with the edited text.
    const approved = await invoke<{ entries: Entry[] }>(approve, {
      method: "POST",
      body: { draftIds: [ids.draftA1] },
    });
    expect(approved.status).toBe(201);
    const [entry] = approved.body.entries;
    expect(entry).toMatchObject({
      finalizedText: "Corrected narrative approved by the attorney",
      syncStatus: "PENDING",
      syncLock: false,
    });

    const queueAfter = await invoke<{ drafts: Draft[] }>(listDrafts);
    expect(queueAfter.body.drafts.map((d) => d.id)).not.toContain(ids.draftA1);

    // 4. The simulated export marks the entry synced and locks it.
    const exported = await invoke<{ synced: number; message: string }>(syncGateway, {
      method: "POST",
      body: { entryIds: [entry.id] },
    });
    expect(exported.status).toBe(200);
    expect(exported.body.synced).toBe(1);
    expect(rowsOf("timeEntry").find((r) => r.id === entry.id)).toMatchObject({
      syncStatus: "SYNCED",
      syncLock: true,
    });

    // 5. Running the export again is refused, so nothing can be pushed twice.
    const repeat = await invoke(syncGateway, {
      method: "POST",
      body: { entryIds: [entry.id] },
    });
    expect(repeat.status).toBe(409);
  });

  it("keeps the other firm's view of the world unchanged throughout", async () => {
    signInAs("earnerA1");
    await invoke(reviewDrafts, {
      method: "PATCH",
      body: { draftIds: [ids.draftA1], matterId: ids.matterA1 },
    });
    await invoke(approve, { method: "POST", body: { draftIds: [ids.draftA1] } });

    signInAs("earnerB1");
    const queue = await invoke<{ drafts: Draft[] }>(listDrafts);
    expect(queue.body.drafts.map((d) => d.id)).toEqual([ids.draftB1]);

    const board = await invoke<{ recentActivity: unknown[]; monthRealizedValue: number }>(dashboard);
    expect(board.body.recentActivity).toEqual([]);
    expect(board.body.monthRealizedValue).toBe(0);
  });
});
