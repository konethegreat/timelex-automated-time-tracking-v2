/**
 * invoke() runs assertCallsScoped() after every route call (see world.ts). These
 * tests check that the check itself rejects what it is meant to reject, so it
 * cannot quietly turn into one that accepts everything.
 */
import { describe, expect, it } from "vitest";
import type { Call } from "./fake-prisma";
import { assertCallsScoped, ids } from "./world";

const call = (
  model: Call["model"],
  operation: string,
  args?: Call["args"],
): Call => ({ model, operation, args });

describe("assertCallsScoped", () => {
  it("accepts calls that carry the caller's organizationId", () => {
    expect(() =>
      assertCallsScoped(
        [
          call("draft", "findMany", { where: { organizationId: ids.orgA } }),
          call("matter", "findFirst", {
            where: { organizationId: ids.orgA, id: ids.matterA1 },
          }),
          call("timeEntry", "create", { data: { organizationId: ids.orgA } }),
          call("draft", "deleteMany", {
            where: { organizationId: ids.orgA, id: { in: [ids.draftA1] } },
          }),
        ],
        ids.orgA,
      ),
    ).not.toThrow();
  });

  it.each([
    ["a read that has no organizationId", call("draft", "findMany", { where: { id: ids.draftA1 } })],
    ["a read with no where clause at all", call("matter", "findMany", {})],
    ["an update scoped to the other firm", call("timeEntry", "updateMany", { where: { organizationId: ids.orgB } })],
    ["a delete with no where clause", call("draft", "deleteMany")],
    ["a create for the other firm", call("timeEntry", "create", { data: { organizationId: ids.orgB } })],
    ["a create with no organizationId", call("timeEntry", "create", { data: {} })],
  ])("rejects %s", (_label, bad) => {
    expect(() => assertCallsScoped([bad], ids.orgA)).toThrow(
      /Tenant scoping violated/,
    );
  });

  it("names the offending call when only one of several is unscoped", () => {
    expect(() =>
      assertCallsScoped(
        [
          call("draft", "findMany", { where: { organizationId: ids.orgA } }),
          call("user", "findFirst", { where: { id: ids.adminA } }),
        ],
        ids.orgA,
      ),
    ).toThrow(/user\.findFirst/);
  });

  it("limits lookups of the organization itself by id", () => {
    expect(() =>
      assertCallsScoped(
        [call("organization", "findFirst", { where: { id: ids.orgA } })],
        ids.orgA,
      ),
    ).not.toThrow();
    expect(() =>
      assertCallsScoped(
        [call("organization", "findFirst", { where: { id: ids.orgB } })],
        ids.orgA,
      ),
    ).toThrow(/organization\.findFirst/);
  });

  it("rejects any database call when nobody is signed in", () => {
    expect(() => assertCallsScoped([], null)).not.toThrow();
    expect(() =>
      assertCallsScoped(
        [call("user", "findFirst", { where: { organizationId: ids.orgA } })],
        null,
      ),
    ).toThrow(/without a signed-in user/);
  });
});
