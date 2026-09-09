# Lazynext — Test Inventory

**Date:** 2026-09-04
**Source:** Direct inspection of test/, e2e/, .github/workflows/ci.yml

---

## Test Infrastructure

| Level | Framework | Config | Command |
|---|---|---|---|
| Unit | Node test runner (--test) | test/alias-loader.mjs | `npm test` |
| E2E | Playwright 1.62.1 | playwright.config.ts | `npm run test:e2e` |
| Lint | ESLint 10 | eslint.config.mjs | `npm run lint` |
| Typecheck | TypeScript 6 | tsconfig.json | `npx tsc --noEmit` (needs 8GB heap) |
| Build | Next.js 16 | next.config.mjs | `npm run build` |

## Unit Tests

| Metric | Count |
|---|---|
| Test files | 262 |
| Tests | 6831 |
| Suites | 399 |
| Pass rate | 100% (6831/6831) |
| Duration | 15.1s |

### Unit Test Categories (estimated from file names)

| Category | Files | Notes |
|---|---|---|
| Creative/AI generation | ~80 | ad-skit, drama, atlas, creative tools |
| Ad platform safety | ~20 | meta-safety, google-safety |
| Auth/security | ~25 | auth, mfa, rate-limit, SSRF, IDOR |
| OS platform | ~15 | workspace, projects, tasks, agents, automations |
| API routes | ~30 | API contract tests |
| Billing/credits | ~15 | credits, dodo, ledger |
| Editor/timeline | ~15 | timeline, editing skills |
| Publishing | ~10 | OAuth, scheduling |
| i18n | ~10 | locale, format |
| Utils | ~40 | various utilities |
| Other | ~2 | misc |

## E2E Tests

| Metric | Count |
|---|---|
| Spec files | 167 |
| Shards | 6 (chromium) + 1 (chromium-auth) |
| Projects | chromium, mobile-chrome, chromium-auth |

### E2E Test Categories (from spec file names)

| Category | Files | Notes |
|---|---|---|
| Auth flows | ~15 | login, signup, reset, MFA |
| Creative features | ~60 | ad-creative, pipelines, generators |
| Ad platform | ~10 | meta/google safety |
| OS platform | ~15 | dashboard, projects, tasks, agents |
| Settings | ~10 | profile, billing, locale |
| Navigation | ~10 | shell, search, mobile |
| Legal | ~10 | terms, privacy, cookies |
| API | ~15 | public API v1 |
| Other | ~22 | misc |

## CI/CD Test Pipeline

| Job | Runs On | Trigger | Status |
|---|---|---|---|
| lint-and-test | ubuntu | push/PR to main | lint + unit tests |
| build | ubuntu | after lint-and-test | next build (local) |
| e2e (6 shards) | ubuntu | after lint-and-test | Playwright chromium |
| e2e-auth | ubuntu | after lint-and-test | Playwright chromium-auth |
| bundle-size | ubuntu | after build + lint-and-test | cf:build + size check |
| deploy | ubuntu | main push only | cf:deploy |
| secret-scan | ubuntu | push/PR | gitleaks |
| dependency-audit | ubuntu | push/PR | npm audit (high+critical) |
| license-check | ubuntu | push/PR | license compliance |

## Test Gaps (for Target OS)

| Gap | Priority | Phase |
|---|---|---|
| Characterization tests for existing behavior | P0 | Phase 3 |
| Agent runtime tests (planning, tool selection, execution state) | P0 | Phase 7 |
| Autonomy tests (restart, retry, recovery, duplicate events) | P0 | Phase 8 |
| Security tests (IDOR, tenancy, prompt injection) | P0 | Phase 27 |
| API contract tests for public v1 | P1 | Phase 26 |
| MCP protocol conformance tests | P1 | Phase 26 |
| Budget enforcement tests | P1 | Phase 11 |
| Approval workflow tests | P1 | Phase 11 |
| Multi-tenancy isolation tests | P1 | Phase 28 |
| Production smoke tests | P1 | Phase 32 |

## Autonomy Test Cases Required (Master Prompt §76)

1. agent completes task
2. agent fails task
3. agent retries
4. worker crashes during task
5. worker restarts
6. duplicate event arrives
7. tool times out
8. approval is required
9. approval is rejected
10. budget is exceeded
11. autonomy is paused
12. autonomy is stopped
13. deployment fails
14. rollback occurs
15. memory is updated
16. planner replans
17. task becomes blocked
18. external provider fails
19. user takes control
20. company isolation remains intact
