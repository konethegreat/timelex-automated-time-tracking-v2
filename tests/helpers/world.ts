/**
 * Synthetic test data: two unrelated law firms ("A" and "B") with a few users,
 * matters and drafts each. Every name, address and number is made up.
 */
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { vi } from "vitest";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FakePrisma, ModelName, Row } from "./fake-prisma";

/** The mocked Prisma client (see tests/setup.ts). */
export const fake = prisma as unknown as FakePrisma;

// Valid version-4 UUIDs, because the tenant guard rejects anything else.
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const ids = {
  orgA: uuid(1),
  orgB: uuid(2),

  adminA: uuid(11),
  earnerA1: uuid(12),
  earnerA2: uuid(13),
  earnerB1: uuid(21),

  matterA1: uuid(31),
  matterA2Closed: uuid(32),
  matterB1: uuid(41),

  draftA1: uuid(51), // earnerA1, unassigned, 2 units
  draftA2: uuid(52), // earnerA2, unassigned, 5 units
  draftA3: uuid(53), // earnerA1, already assigned to matterA1, 3 units
  draftB1: uuid(61), // earnerB1, unassigned, 4 units
};

export type UserKey = "adminA" | "earnerA1" | "earnerA2" | "earnerB1";

const USERS: Record<
  UserKey,
  { orgId: string; name: string; email: string; role: string; rate: string }
> = {
  adminA: {
    orgId: ids.orgA,
    name: "Admin A",
    email: "admin@firm-a.example",
    role: "FIRM_ADMIN",
    rate: "4200.00",
  },
  earnerA1: {
    orgId: ids.orgA,
    name: "Fee Earner A1",
    email: "earner1@firm-a.example",
    role: "FEE_EARNER",
    rate: "3500.00",
  },
  earnerA2: {
    orgId: ids.orgA,
    name: "Fee Earner A2",
    email: "earner2@firm-a.example",
    role: "FEE_EARNER",
    rate: "2200.00",
  },
  earnerB1: {
    orgId: ids.orgB,
    name: "Fee Earner B1",
    email: "earner1@firm-b.example",
    role: "FEE_EARNER",
    rate: "1000.00",
  },
};

/** Resets the fake database and loads the synthetic two-firm data set. */
export function seedWorld() {
  fake.$reset();

  fake.$insert("organization", { id: ids.orgA, name: "Firm A (synthetic)", domain: "firm-a.example" });
  fake.$insert("organization", { id: ids.orgB, name: "Firm B (synthetic)", domain: "firm-b.example" });

  for (const [key, u] of Object.entries(USERS)) {
    fake.$insert("user", {
      id: ids[key as UserKey],
      organizationId: u.orgId,
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: "synthetic-not-a-real-hash",
      defaultHourlyRate: new Prisma.Decimal(u.rate),
    });
  }

  fake.$insert("matter", {
    id: ids.matterA1,
    organizationId: ids.orgA,
    matterNumber: "TEST-A-001",
    clientName: "Client Alpha (synthetic)",
    description: "Synthetic lease dispute",
    status: "ACTIVE",
  });
  fake.$insert("matter", {
    id: ids.matterA2Closed,
    organizationId: ids.orgA,
    matterNumber: "TEST-A-002",
    clientName: "Client Beta (synthetic)",
    description: "Synthetic closed matter",
    status: "CLOSED",
  });
  fake.$insert("matter", {
    id: ids.matterB1,
    organizationId: ids.orgB,
    matterNumber: "TEST-B-001",
    clientName: "Client Gamma (synthetic)",
    description: "Synthetic matter of the other firm",
    status: "ACTIVE",
  });

  const draft = (row: Row) => fake.$insert("draft", { activityType: "EMAIL", ...row });
  draft({
    id: ids.draftA1,
    organizationId: ids.orgA,
    userId: ids.earnerA1,
    matterId: null,
    units: 2,
    suggestedText: "Synthetic email to client about lease terms",
    timestamp: new Date(2026, 2, 10, 9, 0),
  });
  draft({
    id: ids.draftA2,
    organizationId: ids.orgA,
    userId: ids.earnerA2,
    matterId: null,
    activityType: "CALL",
    units: 5,
    suggestedText: "Synthetic call with counsel",
    timestamp: new Date(2026, 2, 10, 11, 0),
  });
  draft({
    id: ids.draftA3,
    organizationId: ids.orgA,
    userId: ids.earnerA1,
    matterId: ids.matterA1,
    units: 3,
    suggestedText: "Synthetic review of settlement draft",
    timestamp: new Date(2026, 2, 9, 15, 0),
  });
  draft({
    id: ids.draftB1,
    organizationId: ids.orgB,
    userId: ids.earnerB1,
    matterId: null,
    units: 4,
    suggestedText: "Synthetic note belonging to firm B",
    timestamp: new Date(2026, 2, 10, 10, 0),
  });
}

/** Makes route handlers see the given synthetic user as signed in. */
export function signInAs(key: UserKey) {
  const u = USERS[key];
  vi.mocked(getSession).mockResolvedValue({
    user: {
      id: ids[key],
      organizationId: u.orgId,
      email: u.email,
      name: u.name,
      role: u.role as "FIRM_ADMIN" | "FEE_EARNER" | "SUPER_ADMIN",
    },
  });
}

export function signedOut() {
  vi.mocked(getSession).mockResolvedValue(null);
}

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

/** Calls a route handler the way Next.js would and returns status plus JSON body. */
export async function invoke<T = Record<string, unknown>>(
  handler: RouteHandler,
  init: { method?: string; url?: string; body?: unknown } = {},
): Promise<{ status: number; body: T }> {
  const request = new NextRequest(init.url ?? "http://localhost/api/test", {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const response = await handler(request, { params: Promise.resolve({}) });
  return { status: response.status, body: (await response.json()) as T };
}

export function rowsOf(model: ModelName): Row[] {
  return fake.$tables[model];
}
