import "dotenv/config";
import { hash } from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const password = process.env.DEMO_PASSWORD;
  if (process.env.TIMELEX_DISPOSABLE_DEMO !== "true" || !databaseUrl) {
    throw new Error("Run npm run demo or npm run demo:verify to seed a disposable database.");
  }
  const url = new URL(databaseUrl);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/timelex_demo") {
    throw new Error("Synthetic seeding requires the local timelex_demo database.");
  }
  if (!password || password.length < 12) throw new Error("DEMO_PASSWORD must contain at least 12 characters.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    if (await prisma.organization.count() !== 0) throw new Error("Synthetic seeding requires an empty database; nothing was deleted.");
    const passwordHash = await hash(password, 12);
    await prisma.$transaction(async tx => {
      const firmA = await tx.organization.create({ data: { name: "Demo Firm A (fictional)", domain: "firm-a.example" } });
      const firmB = await tx.organization.create({ data: { name: "Demo Firm B (fictional)", domain: "firm-b.example" } });
      const createUser = (organizationId: string, name: string, email: string, role: "FIRM_ADMIN" | "FEE_EARNER", rate: string) => tx.user.create({
        data: { organizationId, name, email, role, passwordHash, defaultHourlyRate: new Prisma.Decimal(rate), monthlyBillableTarget: 120 },
      });
      await createUser(firmA.id, "Demo Admin A", "demo.admin.a@example.com", "FIRM_ADMIN", "3500.00");
      const reviewerA = await createUser(firmA.id, "Demo Reviewer A", "demo.reviewer.a@example.com", "FEE_EARNER", "3500.00");
      const colleagueA = await createUser(firmA.id, "Demo Colleague A", "demo.colleague.a@example.com", "FEE_EARNER", "2200.00");
      const reviewerB = await createUser(firmB.id, "Demo Reviewer B", "demo.reviewer.b@example.com", "FEE_EARNER", "1000.55");
      const matterA = await tx.matter.create({ data: { organizationId: firmA.id, matterNumber: "DEMO-A-001", clientName: "Fictional Client Alpha", description: "Synthetic lease review" } });
      await tx.matter.create({ data: { organizationId: firmA.id, matterNumber: "DEMO-A-CLOSED", clientName: "Fictional Closed Client", description: "Synthetic closed matter", status: "CLOSED" } });
      const matterB = await tx.matter.create({ data: { organizationId: firmB.id, matterNumber: "DEMO-B-001", clientName: "Fictional Client Beta", description: "Synthetic firm B matter" } });
      const draft = (organizationId: string, userId: string, text: string, units: number, matterId: string | null = null) => tx.draft.create({
        data: { organizationId, userId, matterId, activityType: "EMAIL", sourcePlatform: "Synthetic fixture", units, suggestedText: text },
      });
      await draft(firmA.id, reviewerA.id, "Synthetic email: review the fictional lease terms", 2);
      await draft(firmA.id, reviewerA.id, "Synthetic document: check concurrent approval", 3, matterA.id);
      await draft(firmA.id, reviewerA.id, "Synthetic note: exercise gateway failure", 1, matterA.id);
      await draft(firmA.id, colleagueA.id, "Synthetic colleague note: separate fee earner", 4);
      await draft(firmB.id, reviewerB.id, "Synthetic firm B note: verify tenant boundary and rounding", 3, matterB.id);
      await tx.timeEntry.create({ data: {
        organizationId: firmB.id, userId: reviewerB.id, matterId: matterB.id,
        units: 2, finalizedText: "Synthetic firm B pre-existing entry", hourlyRateApplied: new Prisma.Decimal("1000.55"),
        totalValue: new Prisma.Decimal("200.11"), syncStatus: "PENDING", syncLock: false,
      } });
    });
    console.log("Synthetic data ready: two fictional firms, four users, three matters, five drafts and one firm B ledger entry.");
    console.log("Accounts: demo.admin.a@example.com, demo.reviewer.a@example.com, demo.colleague.a@example.com, demo.reviewer.b@example.com");
    console.log("Use your supplied DEMO_PASSWORD. Activity is seeded, not captured from a provider.");
  } finally { await prisma.$disconnect(); }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Synthetic seeding failed"); process.exitCode = 1; });
