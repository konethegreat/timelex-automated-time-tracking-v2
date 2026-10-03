import { vi } from "vitest";

// The real Prisma client needs DATABASE_URL and a running PostgreSQL. Tests use
// an in-memory fake instead (see tests/helpers/fake-prisma.ts).
vi.mock("@/lib/prisma", async () => {
  const { createFakePrisma } = await import("./helpers/fake-prisma");
  return { prisma: createFakePrisma() };
});

// Session lookup goes through Auth.js, which needs AUTH_SECRET and the database.
// Tests pick the signed-in user with signInAs() from tests/helpers/world.ts.
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
