import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const ORG_DOMAIN = "mblegalpartners.co.za";

/** 1 unit = 6 minutes of billable time */
function entryValue(units: number, hourlyRate: number): Prisma.Decimal {
  const hours = (units * 6) / 60;
  return new Prisma.Decimal((hours * hourlyRate).toFixed(2));
}

function daysAgo(days: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function clearDemoOrg() {
  const existing = await prisma.organization.findUnique({
    where: { domain: ORG_DOMAIN },
  });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
    console.log("Removed existing M&B Legal Partners seed data.");
  }
}

async function main() {
  console.log("TimeLex — seeding presentation database…\n");

  await clearDemoOrg();

  const organization = await prisma.organization.create({
    data: {
      name: "M&B Legal Partners",
      domain: ORG_DOMAIN,
      subscriptionTier: "Enterprise",
    },
  });

  const admin = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name: "Johan Motsoeneng",
      email: "johan.motsoeneng@mblegalpartners.co.za",
      role: "FIRM_ADMIN",
      defaultHourlyRate: new Prisma.Decimal("4200.00"),
      monthlyBillableTarget: 100,
    },
  });

  const stephanie = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name: "Stephanie Chetty",
      email: "stephanie.chetty@mblegalpartners.co.za",
      role: "FEE_EARNER",
      defaultHourlyRate: new Prisma.Decimal("3500.00"),
      monthlyBillableTarget: 140,
    },
  });

  const anchane = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name: "Anchané Botha",
      email: "anchane.botha@mblegalpartners.co.za",
      role: "FEE_EARNER",
      defaultHourlyRate: new Prisma.Decimal("2200.00"),
      monthlyBillableTarget: 130,
    },
  });

  const matters = await Promise.all([
    prisma.matter.create({
      data: {
        organizationId: organization.id,
        matterNumber: "MB-2024-0142",
        clientName: "Eskom Holdings SOC Ltd",
        description:
          "Regulatory dispute — National Energy Regulator tariff determination and licence compliance advisory.",
        status: "ACTIVE",
      },
    }),
    prisma.matter.create({
      data: {
        organizationId: organization.id,
        matterNumber: "MB-2025-0087",
        clientName: "Standard Bank Group Ltd",
        description:
          "Corporate M&A — due diligence, SHA drafting, and Competition Commission filing support.",
        status: "ACTIVE",
      },
    }),
    prisma.matter.create({
      data: {
        organizationId: organization.id,
        matterNumber: "MB-2025-0113",
        clientName: "Sasol Limited",
        description:
          "Environmental law — Section 24G rectification strategy and DEA engagement on Secunda operations.",
        status: "ACTIVE",
      },
    }),
  ]);

  const [eskom, standardBank, sasol] = matters;

  const drafts = await prisma.draft.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: stephanie.id,
        matterId: null,
        activityType: "EMAIL",
        sourcePlatform: "Outlook",
        units: 2,
        suggestedText:
          "Email correspondence with Eskom in-house counsel regarding NERSA supplementary information request; reviewed attachments and outlined response timeline.",
        timestamp: daysAgo(0, 9, 18),
      },
      {
        organizationId: organization.id,
        userId: anchane.id,
        matterId: null,
        activityType: "CALL",
        sourcePlatform: "Teams",
        units: 3,
        suggestedText:
          "Teleconference with Standard Bank deal team on disclosure schedule gaps; agreed mark-up protocol for warranties basket.",
        timestamp: daysAgo(1, 14, 30),
      },
      {
        organizationId: organization.id,
        userId: stephanie.id,
        matterId: null,
        activityType: "DOCUMENT",
        sourcePlatform: "Local",
        units: 8,
        suggestedText:
          "Review and annotation of Sasol environmental impact assessment addendum (Vol. II); flagged non-compliance with NEMA EIA Regulations reg 31.",
        timestamp: daysAgo(1, 11, 0),
      },
      {
        organizationId: organization.id,
        userId: anchane.id,
        matterId: null,
        activityType: "RESEARCH",
        sourcePlatform: "Local",
        units: 5,
        suggestedText:
          "Research on Competition Act s12A public interest factors and recent Tribunal decisions affecting banking sector mergers (2024–2025).",
        timestamp: daysAgo(2, 16, 45),
      },
      {
        organizationId: organization.id,
        userId: stephanie.id,
        matterId: null,
        activityType: "MEETING",
        sourcePlatform: "Teams",
        units: 4,
        suggestedText:
          "Client strategy meeting with Eskom regulatory affairs — prepared speaking note on licence amendment grounds and next steps for board submission.",
        timestamp: daysAgo(2, 10, 0),
      },
    ],
  });

  const stephanieRate = 3500;
  const anchaneRate = 2200;

  const timeEntries = await Promise.all([
    prisma.timeEntry.create({
      data: {
        organizationId: organization.id,
        userId: stephanie.id,
        matterId: eskom.id,
        units: 6,
        finalizedText:
          "Drafted reply to NERSA Rule 29 notice; incorporated technical annexures from client engineering team.",
        hourlyRateApplied: new Prisma.Decimal(stephanieRate.toFixed(2)),
        totalValue: entryValue(6, stephanieRate),
        syncStatus: "PENDING",
        syncLock: false,
        createdAt: daysAgo(3, 15, 0),
      },
    }),
    prisma.timeEntry.create({
      data: {
        organizationId: organization.id,
        userId: stephanie.id,
        matterId: eskom.id,
        units: 4,
        finalizedText:
          "Conference with NERSA legal unit — clarified procedural timetable for oral representations.",
        hourlyRateApplied: new Prisma.Decimal(stephanieRate.toFixed(2)),
        totalValue: entryValue(4, stephanieRate),
        syncStatus: "PENDING",
        syncLock: false,
        createdAt: daysAgo(5, 11, 30),
      },
    }),
    prisma.timeEntry.create({
      data: {
        organizationId: organization.id,
        userId: anchane.id,
        matterId: standardBank.id,
        units: 10,
        finalizedText:
          "Prepared first draft of sale and purchase agreement schedules 3–5; circulated to client for commercial input.",
        hourlyRateApplied: new Prisma.Decimal(anchaneRate.toFixed(2)),
        totalValue: entryValue(10, anchaneRate),
        syncStatus: "ERROR",
        syncLock: false,
        createdAt: daysAgo(4, 13, 0),
      },
    }),
    prisma.timeEntry.create({
      data: {
        organizationId: organization.id,
        userId: anchane.id,
        matterId: standardBank.id,
        units: 3,
        finalizedText:
          "File note — Competition Commission pre-notification consultation; recorded authority to proceed with Phase 1 filing.",
        hourlyRateApplied: new Prisma.Decimal(anchaneRate.toFixed(2)),
        totalValue: entryValue(3, anchaneRate),
        syncStatus: "SYNCED",
        syncLock: true,
        createdAt: daysAgo(12, 9, 0),
      },
    }),
    prisma.timeEntry.create({
      data: {
        organizationId: organization.id,
        userId: stephanie.id,
        matterId: sasol.id,
        units: 12,
        finalizedText:
          "Finalised DEA submission pack for Section 24G application; coordinated sign-off with environmental consultants.",
        hourlyRateApplied: new Prisma.Decimal(stephanieRate.toFixed(2)),
        totalValue: entryValue(12, stephanieRate),
        syncStatus: "SYNCED",
        syncLock: true,
        createdAt: daysAgo(18, 16, 0),
      },
    }),
  ]);

  console.log("Seed complete:\n");
  console.log(`  Organization : ${organization.name} (${organization.domain})`);
  console.log(`  Users        : 3 (1 Firm Admin, 2 Fee Earners)`);
  console.log(`  Matters      : ${matters.length}`);
  console.log(`  Drafts       : ${drafts.count} (unassigned)`);
  console.log(`  Time entries : ${timeEntries.length}`);
  console.log("    — 2 × PENDING (awaiting Ghost Practice push)");
  console.log("    — 1 × ERROR   (gateway rejection — editable)");
  console.log("    — 2 × SYNCED  (syncLock: true — ledger locked)\n");
  console.log("Dev session hints (.env):");
  console.log(`  DEV_SESSION_ORG_ID=${organization.id}`);
  console.log(`  DEV_SESSION_USER_ID=${admin.id}`);
  console.log(`  DEV_SESSION_EMAIL=${admin.email}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
