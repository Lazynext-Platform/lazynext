# Lazynext — Baseline Snapshot

**Date:** 2026-09-09
**Branch:** main
**HEAD:** Batch 4zc — Final audit, schema migrations, CI/CD & production readiness

---

## Environment
- **Node.js:** 25.9.0
- **Platform:** macOS Darwin 25.6.0
- **BUILD_TARGET:** local (SQLite + file-based media storage)
- **Atlas:** mock server config (not started during baseline; build does not require it)

## Verification Results

| Check | Result | Notes |
|---|---|---|
| Dependency installation | PASS | `node_modules` present (postinstall runs prisma:generate + platform:prepare) |
| Lint | PASS | `npm run lint` — clean, exit 0 |
| TypeScript | PASS | `tsc --noEmit` — clean, exit 0 |
| Unit tests | PASS | 7,750+ tests, 0 failures — 535+ test files |
| Integration tests | PASS (subset) | Covered by unit test runner (Node --test) |
| E2E tests | NOT RUN | 177 spec files across 6 shards — requires dev server + mock Atlas. Run via `npm run test:e2e` |
| Build | PASS | `npm run build` (BUILD_TARGET=local) — exit 0, all routes compiled |
| Database validation | PASS | `prisma db push` succeeds; 143 models; 22 migrations applied (R3, R11, R16-R19 schema changes included) |
| Security tests | PARTIAL | Secret-scan (gitleaks) + dependency-audit + license-check exist in CI but not run locally |
| Dependency audit | NOT RUN | `npm audit --audit-level=high` — run in CI |
| Secret scan | NOT RUN | gitleaks — run in CI |
| Accessibility tests | NOT RUN | Lighthouse audits exist in docs but not automated in baseline |

## Warnings
- E2E not run in this session (would require starting dev server + mock Atlas)
- Cloudflare build (`cf:build`) not run (requires Cloudflare-specific env + would take significant time)

## Known Flaky Tests
(none identified — all 7,750+ unit tests passed cleanly)

## Broken Areas
(none identified in baseline — lint, tsc, tests, build all pass)

## Environment Limitations
- No Cloudflare API token available — cannot run `cf:build` or `cf:deploy`
- No live production credentials — cannot verify production runtime behavior
- No Atlas Cloud API key — mock server is the only generation path locally
- Live site reconciliation requires browser access to lazynext.com (not performed in this session)

## Baseline Metrics

| Metric | Count |
|---|---|
| Prisma models | 143 |
| App page routes | 435+ (page.tsx files in src/app) |
| API route directories | 3,290+ (route.ts files in src/app/api) |
| Service modules | 256+ (in src/lib/services) |
| Components | 113 (in src/components) |
| Lib files | 47 (in src/lib, top-level, excluding subdirs) |
| Creative lib files | 189 (in src/lib/creative) |
| Unit test files | 535+ |
| Unit tests | 7,750+ |
| E2E spec files | 177 |
| Migrations | 22 |
| ADRs | 223 |
| Locales | 13 (en, zh, ja, es, ko, pt, fr, de, ar, hi, id, vi, th) |
| Nav categories | 357 (slug entries in src/config/navCategories.ts) |
| Docs files | 63 (in docs/, excluding adr/) |
