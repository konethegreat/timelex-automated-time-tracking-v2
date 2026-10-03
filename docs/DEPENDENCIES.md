# Dependency maintenance

Updated 3 October 2026. Use Node.js 24 and the committed package lock.

## Current result

The full npm audit decreased from **32** findings (3 critical, 20 high,
5 moderate, 4 low) to **5 high** development findings. The production audit
(`npm audit --omit=dev`) is **zero at every severity**. This is dependency
evidence, not proof of complete application security or production readiness.

Next.js and its lint configuration are pinned together at **16.3.8**, React and
React DOM at **19.2.8**, Auth.js at **5.0.0-beta.32**, and Prisma CLI/client/adapter
at **7.10.0**. Compatible transitive updates are recorded in the lockfile.
Auth.js remains a beta dependency. Prisma 8 is a release candidate; Prisma 7
continues receiving supported fixes, so this update retains its API.

The unused shadcn component-generation CLI is no longer installed. Its small
static stylesheet is retained unchanged in `src/styles/shadcn.css`, with the
MIT notice and provenance under `third_party/shadcn/`. Existing UI components
remain local source. bcryptjs includes its own types, so the redundant types
package was also removed. The deprecated middleware file is migrated to
Next.js's Node.js `proxy.ts` convention with the same route guards/matcher.

## Scoped Prisma overrides

| Parent | Override | Reason / validation |
|---|---|---|
| `@prisma/config` | `deepmerge-ts` 8.0.2 | Resolves the recursive merge advisory. This changes a major transitive version, so Prisma config loading, generation and the real schema/seed workflow must pass. |
| `prisma` | `mysql2` 3.24.5 | Resolves pinned CLI/Studio driver advisories. The app uses PostgreSQL; its configured CLI/schema operations are exercised by the demo. MySQL/Studio behavior is not verified. |

These overrides are limited to their parent packages. Revisit/remove them when
the parent dependencies resolve to patched versions themselves.

## Remaining development advisory

All five findings are one unpatched advisory propagated through:

`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`.

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) reports
stack exhaustion from deeply nested patterns in braces through 3.0.3 and lists
no patched version. npm currently proposes downgrading the framework lint
configuration to 14.2.35. This project retains the Next.js 16 lint rules and
records the unresolved development dependency instead. Avoid linting untrusted
repository glob configuration; the advisory remains an actual limitation.

ESLint stays at 9.39.5 because the current React/import/accessibility plugins
declare peer support through version 9. ESLint 9 has reached end of life; migration
to a supported major needs compatible plugins and explicit rule validation.
[Issue #13](https://github.com/konethegreat/timelex-automated-time-tracking-v2/issues/13)
tracks the remaining advisory and lint tooling migration.

## CI policy and reproduction

```sh
npm ci
npm run audit
npm run lint
npm run typecheck
npm test
npm run build
npm run demo:verify
```

The regular build needs a valid configured `DATABASE_URL`; the disposable
launcher supplies its own. Docker is required for `demo:verify`.

`npm run audit` enforces zero production findings at every severity. The full
audit accepts only the exact advisory above, its named dependency chain, high
severity, and lockfile entries marked development-only. It prints all accepted
findings and fails on any different advisory, severity change, runtime use,
inconsistent totals or unavailable audit data. It also passes when upstream
fixes make the full audit clean. Policy regression tests cover these cases.
Remove the exception after a supported upstream fix is installed and verified.

## Primary references

- [Next.js September security release](https://nextjs.org/blog/september-2026-security-release)
- [Auth.js beta.32 release](https://github.com/nextauthjs/next-auth/releases/tag/next-auth%405.0.0-beta.32)
- [Prisma release status](https://www.prisma.io/docs/orm/release-status)
- [ESLint version support](https://eslint.org/version-support/)
- [Next.js Proxy reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
