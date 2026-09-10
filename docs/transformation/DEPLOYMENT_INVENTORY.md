# Lazynext — Deployment Inventory

**Date:** 2026-09-04
**Source:** wrangler.jsonc, open-next.config.ts, worker-entry.mjs, .github/workflows/ci.yml, DEPLOYMENT.md

---

## Deployment Topology

### Production
- **Runtime:** Cloudflare Workers (via OpenNext `@opennextjs/cloudflare@^1.20.6`)
- **Domain:** lazynext.com (custom domain) + workers.dev URL
- **Worker name:** lazynext
- **Database:** Cloudflare D1 (binding `DB`, database `lazynext-db`)
- **Object storage:** Cloudflare R2 (S3-compatible API, hardcoded endpoint)
- **Rate limiting:** Cloudflare Rate Limiter (bindings declared, NOT invoked in code)
- **Cron:** `*/5 * * * *` (every 5 min — scheduled post processing)
- **Compatibility date:** 2026-08-01
- **Flags:** nodejs_compat, no_handle_cross_request_promise_resolution
- **Observability:** enabled, head sampling rate 1.0

### Local Development
- **Runtime:** Node.js 25+ via `next dev`
- **Port:** 3100
- **Database:** SQLite via better-sqlite3 (`prisma/dev.db`)
- **Object storage:** Filesystem (`.dev-media/`)
- **AI:** Mock Atlas server (port 3099)
- **BUILD_TARGET:** local

### CI/CD
- **Platform:** GitHub Actions
- **Trigger:** push/PR to main
- **Pipeline:**
  1. lint-and-test (lint + 6831 unit tests)
  2. build (next build, BUILD_TARGET=local)
  3. e2e (6 shards, chromium) — needs lint-and-test
  4. e2e-auth (chromium-auth) — needs lint-and-test
  5. bundle-size (cf:build + size check) — needs build + lint-and-test
  6. deploy (cf:deploy, main only) — needs all above
  7. secret-scan (gitleaks) — independent
  8. dependency-audit (npm audit high+critical) — independent
  9. license-check — independent

## Build Commands

| Command | Purpose | Target |
|---|---|---|
| `npm run dev` | Local dev server (port 3100) | local |
| `npm run build` | Production build (webpack) | local |
| `npm run cf:build` | Cloudflare/OpenNext build | cloudflare |
| `npm run cf:preview` | Cloudflare preview | cloudflare |
| `npm run cf:deploy` | Deploy to Cloudflare Workers | cloudflare |
| `npm run lint` | ESLint | both |
| `npm test` | Unit tests | both |
| `npm run test:e2e` | E2E tests | local |
| `npm run prisma:generate` | Generate Prisma client | both |
| `npm run platform:prepare` | Select platform impl | both |
| `npm run db:push` | Push schema to local DB | local |
| `npm run db:migrate:d1` | Apply D1 migrations | cloudflare |

## Environment Variables

### Required (production)
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — JWT signing
- `NEXTAUTH_URL` / `AUTH_URL` — App URL
- `ATLASCLOUD_API_KEY` — Atlas Cloud API
- `ATLASCLOUD_BASE` — Atlas Cloud base URL
- `ATLASCLOUD_LLM_BASE` — Atlas LLM base URL
- `RESEND_API_KEY` — Email
- `ADMIN_EMAILS` — Admin email list
- `CLOUDFLARE_API_TOKEN` — Deploy
- `CLOUDFLARE_ACCOUNT_ID` — Deploy
- `TOKEN_ENCRYPTION_KEY` — OAuth token encryption (has dev fallback — remove in prod)

### Optional
- `SIGNUP_BONUS_CREDITS` — Signup credit grant
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `DODO_API_KEY` — Dodo Payments
- `DODO_WEBHOOK_SECRET` — Dodo webhook HMAC

## Migrations

| Migration | Date | Description |
|---|---|---|
| 20260828000000_timeline | 2026-08-28 | Timeline model |
| 20260828000001_editing_skill | 2026-08-28 | EditingSkill model |
| 20260828000002_template_and_version | 2026-08-28 | CreativeTemplate |
| 20260828000003_shared_link | 2026-08-28 | SharedLink |
| 20260828000004_webhook_endpoint | 2026-08-28 | WebhookEndpoint |
| 20260828000005_creative_comment | 2026-08-28 | CreativeComment |
| 20260828000006_team_workspace | 2026-08-28 | Team models |
| 20260828000007_approval_stage | 2026-08-28 | ApprovalStage |
| 20260829000001_team_activity | 2026-08-29 | TeamActivity |
| 20260829000002_credit_ledger_idempotency | 2026-08-29 | CreditLedger idempotency |
| 20260829000003_workflow_run_version | 2026-08-29 | WorkflowRun version |
| 20260829000004_publishing_oauth_compliance | 2026-08-29 | Publishing OAuth |
| 20260830000000_add_hook_model | 2026-08-30 | Hook model |
| 20260830000001_asset_and_performance | 2026-08-30 | Asset + CreativePerformance |
| 20260903000000_add_os_platform_models | 2026-09-03 | OS Platform (18 models) |
| 20260903000001_mfa_session_revocation | 2026-09-03 | MFA + session revocation |
| 20260903020000_add_conversations | 2026-09-03 | Conversations + Messages |
| 20260903030000_add_notification_prefs | 2026-09-03 | Notification preferences |
| 20260903040000_add_data_requests | 2026-09-03 | DataRequest model |

## Deployment Issues

| Issue | Severity | Status |
|---|---|---|
| R2 buckets not bound in wrangler.jsonc | Medium | Open |
| Rate limiter bindings declared but not invoked | Medium | Open |
| workers_dev: true + custom domain (both exposed?) | Low | Verify |
| Source maps may ship in bundle | Low | patch-worker.mjs strips sourceMappingURL |
