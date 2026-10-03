# TimeLex v2

A legal time-review application for law firms. It provides tenant-scoped drafts,
matter assignment, approval into a time ledger, a simulated synchronization
gateway, and billing views.

[![CI](https://github.com/konethegreat/timelex-automated-time-tracking-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/konethegreat/timelex-automated-time-tracking-v2/actions/workflows/ci.yml)

## Current scope

This repository is a prototype. The Ghost Practice gateway updates local ledger
state and returns a simulated success or failure; it does not send records to
a live practice-management system. Microsoft Entra sign-in is optional, and
automatic Microsoft Graph activity ingestion and a live AI narrative service
are not established by the current implementation.

The implemented workflow is:

1. Sign in as a user belonging to an organization.
2. Review that organization's time drafts and assign matters.
3. Approve drafts into ledger entries, priced in six-minute units.
4. Send selected pending entries through the simulated gateway.
5. View synchronized entries with their sync lock and inspect billing views.

Tenant tests use a fake Prisma database. They exercise route behavior and query
scope; they do not prove database deployment or production isolation.

## Stack

Next.js **16.2.6**, React **19.2.4**, TypeScript, Auth.js v5 beta,
Prisma **7**, PostgreSQL, and Tailwind CSS. The package lock records the installed
dependency versions. CI currently uses Node.js 24.

## Local setup

Use Node.js 24 and a disposable PostgreSQL database:

```bash
git clone https://github.com/konethegreat/timelex-automated-time-tracking-v2.git
cd timelex-automated-time-tracking-v2
npm ci
cp .env.example .env
# PowerShell: Copy-Item .env.example .env
```

Set `DATABASE_URL` to your local database and set `AUTH_SECRET` to a newly
generated random value:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. The current seed prints presentation account details;
these shared demo credentials are for local use only. The seed **deletes and
recreates its demo organization**, so use an empty database. Its named demo
people, firms, and matters are presentation fixtures; their factual relationship
to real entities has not been verified. Do not expose this seeded instance publicly.

Real credentials belong in the gitignored `.env`, never in the example.
The development authentication shortcut is off by default and also requires
`NODE_ENV=development`. Prefer normal credentials sign-in for workflow checks.

## Optional settings

| Variable | Purpose |
| --- | --- |
| `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Optional Entra identity provider; sign-in must still map to a provisioned tenant user |
| `SYNC_GATEWAY_SIMULATE_FAILURE` | Set to `true` to exercise the simulated gateway error path |
| `ALLOW_DEV_AUTH_BYPASS`, `DEV_SESSION_USER_ID`, `DEV_SESSION_ORG_ID` | Explicit local development shortcut; never enable on a shared instance |

## Development checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tests do not require a database. The build imports the Prisma client and needs
a syntactically valid `DATABASE_URL`; CI uses a non-listening placeholder
address and does not exercise a live database or external gateway.

## Contributing

Open an issue with reproduction steps or a focused pull request. Include the
checks you ran and whether the behavior was verified with mocked or live services.
Avoid sharing law-firm records, client information, session tokens, or credentials.

[The original TimeLex repository](https://github.com/konethegreat/timelex-automated-time-tracking)
contains an earlier iteration. This repository is the focus of current development.
