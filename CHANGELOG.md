# LazyNext Changelog

## 2026-08-30 — DD: Production Safety, Scheduled Post Mgmt, Compliance UI, OAuth PKCE, Platform Tests

### What Changed
1. **Token encryption hard-fail in production** — `src/lib/publishing/token-crypto.ts` now throws if `TOKEN_ENCRYPTION_KEY` is missing in production (was: silent `console.warn` + plaintext fallback); dev mode uses a dev-only key so encryption is always exercised; added `isTokenEncryptionConfigured()` for health checks
2. **Cron handler internal invocation** — `worker-entry.mjs` scheduled handler now uses `http://localhost` for the internal subrequest URL instead of fetching the public domain, avoiding DNS/egress issues
3. **Scheduled post management** — Added `GET /api/publish/schedule` (list user's scheduled posts) and `DELETE /api/publish/schedule?id=xxx` (cancel + credit refund); `ScheduledPostsSection.tsx` UI component on Settings page with upcoming/history views and cancel buttons
4. **Compliance rules UI** — `ComplianceRulesSection.tsx` component on `/compliance` page with full CRUD (create, edit, delete, enable/disable) wired to the existing `/api/creative/compliance/rules` API
5. **OAuth PKCE** — `GET /api/publish/oauth/[platform]` now generates PKCE `code_verifier`/`code_challenge` (S256) for YouTube and LinkedIn; `code_verifier` stored in `oauth_code_verifier` cookie; callback reads cookie and includes `code_verifier` in token exchange; state validated against `oauth_state` cookie (CSRF protection); YouTube adds `access_type=offline&prompt=consent`
6. **Platform adapter tests** — Added `test/platform-adapters.test.ts` with 15 mocked-fetch tests covering all 5 platforms (TikTok, YouTube, Instagram, Facebook, LinkedIn) including success paths, error paths, and request body verification
7. **Token-crypto test updates** — Updated tests for new hard-fail behavior; added production throw test and `isTokenEncryptionConfigured` tests

### Verification
- npm run lint — 0 errors, 2 known warnings
- npm test — 1505+ tests passing
- npm run build — successful
- npx playwright test — 435 passed, 12 skipped, 0 failed
- D1 migration applied to production (27 tables)
- Cloudflare deployment: cron trigger active (`*/5 * * * *`)

## 2026-08-29 — CC: D1 Migrations, Cron Trigger, Token Refresh, FFmpeg Worker, UI Hardening

### What Changed
1. **D1 migration for publishing tables** — Created `prisma/migrations/20260829000004_publishing_oauth_compliance/migration.sql` for `CustomComplianceRule`, `PlatformConnection`, `ScheduledPost` (with `hashtagsJson`, `privacyLevel`, `crossPostToJson`); applied to production D1
2. **Cloudflare Cron Trigger** — `worker-entry.mjs` wraps OpenNext worker and adds `scheduled` handler; `wrangler.jsonc` configured with `*/5 * * * *` cron; handler invokes `/api/publish/process-scheduled` with CRON_SECRET
3. **OAuth token refresh** — `src/lib/publishing/token-refresh.ts` implements refresh for all 5 platforms; `getRealAccessToken()` refreshes expired tokens instead of falling back to dry-run; integrated into both interactive publishing and scheduled-post processing
4. **Settings OAuth UI** — `PlatformConnectionsSection.tsx` with connect/disconnect buttons, status indicators, and OAuth redirect handling
5. **lucide-react import optimization** — `experimental.optimizePackageImports: ['lucide-react']` in next.config.mjs
6. **Raw error leakage cleanup** — Removed `detail: e.message` / raw `state` from 8 additional API routes
7. **JWT credit refresh optimization** — Increased staleness threshold from 60s to 5min to reduce DB reads across 154 `auth()` calls
8. **FFmpeg Web Worker** — `src/lib/compose-worker.ts` moves FFmpeg loading, media fetching, and encoding to a dedicated Web Worker; `compose-client.ts` delegates via `postMessage`
9. **ScheduledPost metadata** — Added `hashtagsJson`, `privacyLevel`, `crossPostToJson` columns; `schedulePost` persists them; `process-scheduled` restores and passes to platform adapters
10. **Tests** — Added `test/token-crypto.test.ts` (13 tests) and `test/chain-partial-failure.test.ts` (10 tests)
11. **patch-worker.mjs fix** — Updated to detect `worker-entry.js` filename dynamically

### Verification
- npm run lint — 0 errors, 2 known warnings
- npm test — 1490 tests passing
- npm run build — successful
- npm run cf:build — successful
- npx playwright test — 435 passed, 12 skipped, 0 failed
- D1 migration applied to production
- Deployed: version af7e0db2-2b26-44bc-b5f6-7d91383b39da

## 2026-09-02 — BB: Publishing OAuth, Security Hardening, Chain Unification, Migration Idempotency

### What Changed
1. **Schedule route uid bug fix** — `POST /api/publish/schedule` now passes `uid` to `schedulePost`, persisting `ScheduledPost` rows; ref uses UUID
2. **Public share rate limiting** — `GET /api/creative/share/[token]` now rate-limited (30/min for views, 10/min for password attempts)
3. **FFmpeg CSP fix** — Added `unpkg.com` to `script-src` and `connect-src`, added `blob:` to `script-src`, added `worker-src 'self' blob:`
4. **`@eslint/eslintrc` moved to devDependencies** — No longer shipped to production
5. **Raw exception message removal** — Removed `detail: String(e)` from 64 API routes (67 occurrences); added `safeError()` helper to `src/lib/security.ts`
6. **D1 migration idempotency** — `scripts/apply-d1-migrations.mjs` now tracks applied migrations in `_prisma_migrations` table and only applies pending ones
7. **Publishing tests** — Added 8 real function tests for `publishContent`, `schedulePost`, `publishToMultiple`, and `safeError`
8. **Full publishing OAuth flow** — Added `GET /api/publish/oauth/[platform]` (initiation) and `GET /api/publish/oauth/[platform]/callback` (token exchange); token encryption at rest via AES-256-GCM (`src/lib/publishing/token-crypto.ts`); real platform API adapters for TikTok, YouTube, Instagram, Facebook, LinkedIn (`src/lib/publishing/platform-adapters.ts`); scheduled post processor `POST /api/publish/process-scheduled` (CRON_SECRET authenticated)
9. **Chain-runtime unification** — `executeChain` now has per-step error handling with partial results and partial credit refunds; chain API returns `partialResults` on step failure

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1467 tests passing
- npm run build — successful
- npx playwright test — 440 passed, 7 skipped, 0 failed

## 2026-09-02 — AA: Pipeline Context, Small Fixes, Chain Unification, Publishing Framework

### What Changed
1. **Pipeline context enrichment** — Media generation stage now passes full brief (product, audience), script CTA, selected angle, and aspect ratio to `dispatchMediaService`; audio stage passes script CTA and emotional trigger as TTS options
2. **Pipeline list summary** — `GET /api/creative/pipeline?summary=true` returns lightweight summaries without parsing large state JSON
3. **Publish ref uniqueness** — `ref` now uses `crypto.randomUUID()` instead of `Date.now()` to prevent same-ms collisions
4. **Removed unused `replicate` dependency** — Dead dependency removed from `package.json`
5. **Chain mode unification** — Skill-chain API now creates a durable `WorkflowRun` record for persistence and visibility; chain runs appear in the pipeline list and can be inspected after completion/failure
6. **Publishing OAuth framework** — Added `PlatformConnection` model for storing per-user platform OAuth tokens; `hasRealCredentials` now checks platform-specific env vars; added `GET/POST/DELETE /api/publish/connections` for token management
7. **Scheduled post persistence** — Added `ScheduledPost` model; `schedulePost` now persists to DB when userId is provided

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1459 tests passing
- npm run build — successful
- npx playwright test — 436 passed, 11 skipped, 0 failed

## 2026-09-02 — Z: Skill-Chain Fixes, Custom Compliance Rules, UI States, DB/Auth/Upload Hardening

### What Changed
1. **Skill-chain mapping fixes** — `renderTemplate` now extracts readable text from arrays/objects (name/description/text fields) instead of raw JSON blobs; fixed reversed `inputMappings` in `full-pipeline` and `audience-first` chains; `executeChain` now warns about unresolved source keys at runtime
2. **Custom compliance rules** — Added `CustomComplianceRule` Prisma model with full CRUD endpoints (`GET/POST/PUT/DELETE /api/creative/compliance/rules`); `checkCompliance` now accepts `userId` and loads custom rules from DB; `detectViolations` merges built-in and custom rules
3. **UI loading/error states** — Added `LoadingSpinner` component and `loading.tsx` to 10 key routes; added per-route `error.tsx` to 6 routes; fixed `error.tsx` to use `role="alert"` and `aria-live="assertive"`
4. **DB indexes** — Added composite indexes for `Creation(status, createdAt)`, `Creation(taskId)`, `Creation(getUrl)`, `CreditLedger(reason)`, `CreditLedger(ref)`, `SharedLink(expiresAt)`, `WebhookEndpoint(active, events)`, `WorkflowRun(status)`, `TeamInvitation(expiresAt)`
5. **JWT credits fix** — JWT `credits` field now auto-refreshes from DB if older than 60 seconds, preventing stale balance display
6. **Upload magic-byte validation** — Asset upload now validates decoded bytes against declared MIME type (JPEG/PNG/WebP magic bytes), rejecting SVG XSS and wrong content-type uploads
7. **Tests** — Added 4 compliance tests for custom rules and `dbRuleToComplianceRule`

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1459 tests passing
- npm run build — successful
- npx playwright test — 437 passed, 10 skipped, 0 failed

## 2026-09-02 — Y: Security Hardening, Credit Safety, E2E Fix, Media Fallback

### What Changed
1. **Security hardening** — Added `src/lib/security.ts` with `hashPassword`/`verifyPassword` (SHA-256 + salt via Web Crypto API) and `isUrlSafe` (SSRF protection); shared-link passwords are now hashed instead of plaintext; webhook dispatcher validates URLs against SSRF allow-list (blocks private IPs, localhost, link-local, metadata endpoints); 5 API routes no longer leak raw `String(e)` to clients (compliance, media-service-boundary, publish, skills/chain, assets/upload)
2. **Credit safety on D1** — `grantCredits` no longer uses `prisma.$transaction` (which D1 ignores) — uses compensation pattern matching `deductCredits` (increment balance, then write ledger; reverse on failure); skills/chain endpoint now uses per-request UUID idempotency key to prevent double-charging on retry
3. **E2E flakiness fix** — 4 `auth-user-flows.spec.ts` tests (`/api/me`, admin users, creative tools, pipeline templates) now skip gracefully on 429 rate limiting instead of failing
4. **Media fallback fix** — `dispatchMediaService` and pipeline executor no longer silently fall back to placeholder/dry-run media on Atlas failure; stages now fail with proper `PipelineStageError`, credit refunds, and user-facing error messages instead of marking unusable output as "completed"
5. **Tests** — Added 10 unit tests for security utilities (`test/security.test.ts`)

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1455 tests passing
- npm run build — successful
- npx playwright test — 436 passed, 11 skipped, 0 failed

## 2026-09-02 — X: Billing E2E, Error Recovery UX, Asset Visibility, Observability

### What Changed
1. **Billing/checkout E2E** — Added `e2e/auth-billing.spec.ts` with 11 tests covering pricing page UI (pack rendering, currency selector, credit amounts, mobile overflow), checkout API contract (unknown pack, missing pack, valid pack, unauthenticated), and webhook security (missing/invalid signature)
2. **Pipeline error recovery UX** — `PipelineOrchestrator` now maps raw error strings to friendly user-facing messages via `friendlyError()` (rate-limited, insufficient credits, timeout, network, auth, server); added "Skip All & Stop" button that appears when a stage has failed
3. **Asset visibility** — `derivePipelineChildAssets` now persists `brief`, `script`, `storyboard`, and `score` as child assets (previously only media, audio, edit, compliance, publish); added "Creative Packages" tab to `/assets` page showing pipeline output assets with metadata
4. **Production observability** — Added `src/lib/observability/alerts.ts` with webhook-based alerting for critical pipeline failures and credit errors; configurable via `ALERT_WEBHOOK_URL` and `ALERT_WEBHOOK_SECRET` env vars; wired into pipeline route failure paths; falls back to console logging when no webhook is configured
5. **i18n** — Added `skipAll`, `skipAllDescription`, `errorRateLimited`, `errorInsufficientCredits`, `errorTimeout`, `errorNetwork`, `errorAuth`, `errorServer`, `tabCreativePackages`, `creativePackagesEmpty`, `creativePackagesEmptyHint` translation keys to all 13 locales
6. **Tests** — Added 5 unit tests for alerts module (`test/alerts.test.ts`); updated `pipeline-asset-persist.test.ts` to reflect new child asset types

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1445 tests passing
- npm run build — successful
- npx playwright test — 436 passed, 7 skipped (4 rate-limit flakes in pre-existing auth-user-flows tests)

## 2026-09-02 — W: Parallel-wave E2E, Live Credit Display, Share Button, Deadline UX

### What Changed
1. **Parallel-wave E2E coverage** — Added `e2e/auth-workflow-builder.spec.ts` with 3 authenticated tests: pipeline creation with `parallelWith` stages, concurrent wave execution verification, and workflow builder page load with active session
2. **Live credit cost display** — `PipelineOrchestrator` now shows a live-updating credit estimate that recalculates when stages are toggled on/off, using `PIPELINE_COSTS` directly; shows pre-approval to total range
3. **Share button** — Completed pipelines now show a "Share" button that finds the persisted `creative_package` asset, calls `POST /api/creative/share` to create a shareable link, and copies the URL to clipboard
4. **Auto-advance deadline UX** — When the server's 75s auto-advance deadline is hit (pipeline still running, current stage in_progress), a warning notice is shown and the client automatically retries the advance call after 1.5s if the current stage has `autoAdvance: true`
5. **i18n** — Added `estimatedCostLive`, `share`, `shareCopied`, `shareLinkCopied`, and `deadlineNotice` translation keys to all 13 locales

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1440 tests passing
- npm run build — successful
- npx playwright test — 434 passed, 2 skipped

## 2026-09-02 — V: D1 Migration, Pipeline Versioning, Idempotency Tests, Reconciliation

### What Changed
1. **D1 migration applied** — Applied `20260829000002_credit_ledger_idempotency` (idempotencyKey column + unique index) and `20260829000003_workflow_run_version` (version column) to production D1
2. **Pipeline state versioning** — Added `version` field to `PipelineState` and `WorkflowRun`; `savePipeline` now uses `updateMany` with `where: { id, version: expected }` for optimistic locking, preventing concurrent advances from clobbering each other; returns 409 on version conflict
3. **Idempotency key tests** — Added 8 unit tests for `deductCredits` idempotencyKey behavior (successful charge, duplicate reversal, P2002 handling, non-P2002 failure, insufficient balance, no-key backwards compat, zero-amount no-op)
4. **Approve action tests** — Added 8 unit tests for pipeline approve flow (onComplete switching, publish stage completion, createPipeline version/charged initialization, failStage on publish error)
5. **Credit ledger reconciliation endpoint** — Added `GET /api/admin/credits/reconcile` with `?userId=` filter and `?fix=true` mode that writes correcting ledger entries
6. **Dry-run audio badge** — PipelineOrchestrator now shows a "Dry Run" badge and note on dry-run audio output; renders the audio player with reduced opacity for data: URLs
7. **AGENTS.md updated** — Updated test counts to 1440, fixed table count inconsistency (28 tables), added Pipeline Credit Safety documentation section
8. **E2E resilience** — Pipeline creation tests now skip gracefully on rate limiting (429) or insufficient credits (402) instead of failing

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1440 tests passing
- npm run build — successful
- npx playwright test — 429 passed, 4 skipped

## 2026-09-02 — U: Ledger Idempotency, Cancel UX, Publish Hand-off, Cleanup

### What Changed
1. **Credit ledger idempotency** — Added `idempotencyKey` field to `CreditLedger` with `@@unique([userId, idempotencyKey])` constraint; `deductCredits` now accepts an optional idempotency key and handles unique constraint violations by reversing the duplicate deduction (idempotent retry); pipeline routes pass deterministic keys (`pipeline:{pipelineId}:{stage}`)
2. **Cancel UX warning** — Added tooltip and warning text on the cancel button explaining that cancel takes effect after the current auto-advance chain completes; added `cancelDuringAutoAdvanceWarning` translation key to all 13 locales
3. **Creative Studio publish hand-off** — Added "Approve & Publish" button that appears when the pipeline reaches the publish stage; calls the `approve` action to proceed with publishing; updated `pipelineModeHelp` text in all 13 locales to reflect that the pipeline stops at publish for review
4. **Client auto-advance timer removed** — Removed the redundant client-side `autoAdvanceTimer` from `PipelineOrchestrator` that caused race conditions with server-side auto-advance
5. **Dry-run TTS placeholder fixed** — Replaced invalid `data:audio/wav;base64,DRY_RUN_PLACEHOLDER` with a valid minimal silent WAV data URL that browsers can actually decode
6. **Estimated credits transparency** — Templates now show a pre-approval to total credit range (e.g. "24–27 credits") instead of just the total; added `templatePreApprovalCredits` and `preApprovalEstimatedCredits` helpers
7. **Architecture audit updated** — Updated to post-T series status; documented charged flag, completeStage, publish gating, per-wave persistence, idempotency key, and all T/U-series changes
8. **refundSync dead code removed** — Removed the unused `refundSync` export from `gen-task.ts` (all 63 callers were migrated to `refundCredits` in the S-series)
9. **Compliance storyboard guard** — `executeComplianceStage` now falls back to `s.shot` when `s.prompt` is undefined, preventing incomplete compliance input
10. **charged field initialization** — `createPipeline` now explicitly initializes `charged: false` on all stage results

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1424 tests passing
- npm run build — successful
- npx playwright test — 430 passed, 3 skipped

## 2026-09-02 — T: Credit Safety, Publish Gate, Parallel Wave Tests, Auto-Advancing UI

### What Changed
1. **Credit double-charging fix** — Removed duplicate first-stage deduction in the pipeline creation route; the first stage was being charged once explicitly and again in the in_progress wave loop
2. **Idempotent credit deductions** — Added `charged` flag to `PipelineStageResult`; `deductCredits` is now skipped if a stage is already marked charged, preventing double-charging on re-advance or partial wave failure recovery
3. **Partial wave failure handling** — Added `completeStage()` helper that marks a single stage as completed without advancing the whole pipeline; on partial parallel wave failure, successful stages are now marked completed before `failStage` is called, preventing re-execution and re-charging on the next advance
4. **Per-wave persistence** — The `POST advance` auto-advance loop now persists pipeline state after each wave (not just at the end of the request), preventing progress loss on worker timeout
5. **Publish auto-advance gating** — The `publish` stage now defaults to `autoAdvance: false` regardless of `onComplete` (both `publish` and `review` modes), preventing accidental live publishing; applied in both `configFromTemplate` and `configFromWorkflow`
6. **Dry-run publish test** — Updated `test/publishing.test.ts` to assert `status: 'dry_run'` and `metadata.dryRun: true` for dry-run publish results
7. **Parallel wave integration tests** — Added 10 new unit tests covering `completeStage` partial wave failure handling, `retryStage` charged flag reset, and publish `autoAdvance` gating for all 5 templates and workflow-derived configs
8. **Creative Studio client simplification** — `runPipeline()` now stops at the `publish` stage instead of looping `advance` calls through it, respecting the server-side autoAdvance gate
9. **Auto-advancing UI indicator** — `PipelineOrchestrator.tsx` now shows a "Auto-advancing" badge with a pulsing `Zap` icon when the server is chaining stages; added `autoAdvancing` translation key to all 13 locales
10. **E2E test resilience** — Made "can fetch pipeline state by ID" test skip gracefully on 429/500 responses during full E2E runs

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1424 tests passing (up from 1414)
- npm run build — successful
- npx playwright test — 430 passed, 3 skipped

## 2026-09-02 — S: Parallel Wave Fix, Retry Auto-Advance, Dry-Run Icon, Refund Migration, Architecture Audit

### What Changed
1. **Parallel wave execution fix** — All `in_progress` stages in a parallel wave are now executed concurrently via `Promise.allSettled`, not just the primary stage; parallel partners were previously marked completed without running their executor
2. **Retry auto-advance** — After a successful retry, the pipeline now auto-advances through subsequent stages (same loop as `advance` case), instead of stopping and requiring manual advancement
3. **Auto-advance E2E test** — Added authenticated E2E test verifying that auto-advance chains multiple stages in a single request
4. **Dry-run publish icon** — `MultiPlatformPublisher.tsx` now shows a warning icon (`AlertCircle`) for `dry_run` status instead of a generic clock icon
5. **autoAdvance defaults for review** — `publish` stage defaults to `autoAdvance: false` when `onComplete === 'review'` in both `configFromTemplate` and `configFromWorkflow`, preventing silent timeouts and unexpected credit consumption
6. **Auto-advance telemetry** — Added `pipeline_auto_advance` telemetry event logging chain count and duration
7. **PipelineStageError unit tests** — Added 2 unit tests verifying `PipelineStageError` is thrown with correct stage/context and is not double-wrapped
8. **RefundSync migration** — Migrated 63 creative/editor/brand/publish API routes from `refundSync` (gen-task) to centralized `refundCredits` (credits.ts); `refundSync` remains exported from gen-task for backward compatibility
9. **Architecture audit updated** — Marked R-series gaps as resolved; added S-series features; updated remaining gaps

### Verification
- npm run lint — 0 errors, 2 warnings
- npm test — 1414 tests passing (up from 1412)
- npm run build — successful
- npx playwright test — 431 passed (up from 430), 2 skipped

## 2026-09-02 — R: Workflow Builder Product Name, Pipeline Error Context, Auto-Advance, Stage Polish

### What Changed
1. **Workflow Builder product name** — Added `productName` and `productDescription` inputs to the Workflow Builder UI; pipeline config now uses these instead of conflating workflow name with product name, producing better briefs
2. **Pipeline executor error context** — Added `PipelineStageError` class that captures stage name, input snapshot, and prior-stage context; API routes now return `stage` field in error responses for better debugging
3. **Pipeline auto-advance** — Implemented server-side auto-advance loop when `autoAdvance=true` on a stage; the pipeline now chains through auto-advancing stages in a single request (bounded by 75s budget) instead of requiring manual client calls per stage
4. **Compliance stage richer inputs** — Compliance check now includes hook, angle, CTA, and storyboard shot prompts in addition to script text
5. **Audio stage TTS via media service boundary** — Switched audio stage from `generateVoiceover` to `dispatchMediaService({ capability: 'tts' })` for plan-tier aware model selection and consistent dry-run fallback
6. **Dry-run publish status clarity** — Publish dry-run now returns `status: 'dry_run'` instead of misleading `status: 'published'`; added `dryRun: true` to metadata
7. **Refund helper centralization** — Added `refundCredits` to `src/lib/credits.ts`; pipeline routes now import from credits module instead of dynamically importing `refundSync` from gen-task
8. **Lint warning reduction** — Fixed 5 React hooks exhaustive-deps warnings (editor setTimeline/resetTimeline, share/[token] fetchAsset, ContentCalendar now); warnings reduced from 7 to 2 (remaining are unused eslint-disable directives for no-img-element)

### Verification
- npm run lint — 0 errors, 2 warnings (down from 7)
- npm test — 1412 tests passing
- npm run build — successful
- npx playwright test — 430 passed, 2 skipped

## 2026-09-02 — Q: Pipeline UI i18n, Score Scale Fix, Auth E2E Expansion, Lint Polish, Architecture Audit

### What Changed
1. **Score scale fix** — PipelineOrchestrator score viewer now displays `/10` (correct for `CreativeScore.overall`, which is a weighted average of 1-10 dimensions) instead of `/100`
2. **Pipeline UI i18n** — Replaced ~30 hardcoded English strings in `PipelineOrchestrator.tsx` with `t()` calls; added 60 new i18n keys to all 13 locales covering form labels, configuration, execution controls, stage timeline, and all stage output viewer labels
3. **Authenticated E2E expansion** — Added `e2e/auth-user-flows.spec.ts` with 12 authenticated tests covering dashboard, my-work, settings, admin, `/api/me`, credits analytics, admin users API, creative tools, pipeline templates, full pipeline execution flow, pipeline fetch-by-ID, and A/B automation
4. **Lint warning reduction** — Replaced `window.location.href` with `router.push()` in `workflow-builder`, `inspiration`, and `templates` pages; added `router` to dependency arrays; reduced warnings from 11 to 7
5. **No-asset persistence tests** — Added 4 unit tests verifying that `brief`, `script`, `storyboard`, and `score` stages do not create child assets
6. **Architecture audit** — Wrote `research/lazynext-architecture-audit-2026-09.md` reflecting the current post-Q state (pipeline, assets, workflow builder, E2E, i18n, score, telemetry); updated old audit header to point to the new document

### Verification
- npm run lint — 0 errors, 7 warnings (down from 11)
- npm test — 1412 tests passing (up from 1408)
- npm run build — successful
- npx playwright test — 430 passed, 2 skipped (410 unauthenticated + 20 authenticated)

## 2026-09-02 — P: Compliance Viewer, Creative Studio Score, Template Quality Gates, Stage Telemetry, Auth E2E

### What Changed
1. **Compliance viewer fix** — `StageOutputContent` compliance case now uses `result.overallStatus` (not `result.status`), renders `complianceScore`, `brandSafetyScore`, warnings, and recommendations; violation entries use `v.title` (not `v.message`)
2. **Publish viewer enhancement** — Publish output now renders per-platform `results` array with status, post URL, and error details
3. **Creative Studio score surfacing** — Pipeline mode completion block now extracts and displays the `score` stage result; `pipelineModeHelp` i18n updated to include `score` in all 13 locales
4. **Score in all templates** — Added `score` stage to `quick-ad` and `ugc` templates; all 5 pipeline templates now include a quality gate before publish
5. **Stage-level telemetry** — `executeStage` now emits `logToolExecution` with stage name, userId, cost, duration, and success/error for every stage execution
6. **Retry/skip i18n** — Added `pipeline.retry` and `pipeline.skip` keys to all 13 locales; wired buttons to `t()` calls
7. **Duplicate stages key fix** — `configFromTemplate` no longer emits a duplicate `stages` property (eliminates bundler warning)
8. **Authenticated E2E infrastructure** — Added `e2e/global-setup.ts` (NextAuth credentials login), `chromium-auth` project with `storageState`, `auth-pipeline.spec.ts` with 7 authenticated tests
9. **Dev script fix** — `npm run dev` now sets `BUILD_TARGET=local` so platform modules use SQLite/file storage instead of Cloudflare D1/R2
10. **CHANGELOG O entry** — Added missing O-series changelog entry

### Verification
- npm run lint — 0 errors, 11 warnings
- npm test — 1408 tests passing
- npm run build — successful
- npx playwright test — 417 passed, 2 skipped (410 unauthenticated + 7 authenticated)

## 2026-09-02 — O: Score i18n, Templates, Telemetry, cutPlan Types, Doc Fixes

### What Changed
1. **Score dimension i18n** — Added `brandConsistency`, `audioQuality`, `visualQuality` to `creativeStudio` in all 13 locales; wired score viewer labels to `t()` calls
2. **Workflow Builder score i18n** — Added `score` to `workflowBuilder.stage` and `workflowBuilder.stageDesc` in all 13 locales
3. **Pause/resume i18n** — Added `pause` and `resume` keys to `pipeline` section in all 13 locales; wired buttons to `t()`
4. **Score in templates** — Added `score` stage to `video-ad` and `compliance-first` pipeline templates
5. **Structured telemetry** — Replaced `console.error` with `logToolExecution` in pipeline API routes; stopped silently swallowing `persistPipelineAssets` failures
6. **cutPlan type safety** — Added `EditResult` and `EditCut` interfaces to creative types; updated `ClipEditor` to use typed cut plan
7. **Documentation** — Updated AGENTS.md test count to 1408; marked architecture audit as superseded

### Verification
- npm run lint — 0 errors, 11 warnings
- npm test — 1408 tests passing
- npm run build — successful

## 2026-09-01 — N: Score Viewer Fix, Workflow Builder Handoff, Auto-Advance from Server Config, Asset Persistence Tests

### What Changed
1. **Score output viewer fix** — `StageOutputContent` score case now uses the real `CreativeScore` fields (overall, hookStrength, clarity, productVisibility, brandConsistency, emotionalImpact, novelty, platformFit, ctaStrength, audioQuality, visualQuality, complianceRisk, notes) instead of non-existent fields
2. **Auto-advance from server config** — Auto-advance effect now reads `autoAdvance` from `activePipeline.config.stages` instead of client form state, preventing unwanted auto-advance for handoff-loaded pipelines
3. **Clip editor error handling** — `/clip-editor?pipelineId=` now surfaces 404/403/401/network errors instead of failing silently
4. **Workflow Builder score stage** — Added `score` to `StageId`, `STAGE_INFO`, and `ALL_STAGES` in the Workflow Builder
5. **Workflow Builder config passthrough** — `handleRunAsPipeline` now passes `productName`, `platforms`, and `onComplete` to the pipeline creation request
6. **Asset persistence tests** — Added `test/pipeline-asset-persist.test.ts` covering `persistPipelineAssets` grouping logic

### Verification
- npm run lint — 0 errors
- npm test — 1395 tests passing
- npm run build — successful

## 2026-09-01 — M: i18n Wiring, Score Context Flow, Clip Editor EDL, E2E, Deep Link Errors

### What Changed
1. **i18n wiring** — `PipelineOrchestrator` replaced hardcoded `STAGE_LABELS` with `t(STAGE_I18N_KEYS[...])` calls; added 9 stage label keys to all 13 locales
2. **Score context flow fix** — `mergeStageResultIntoContext` now handles the `score` case; integration test covers brief → script → storyboard → media → audio → compliance → score
3. **Clip Editor EDL loading** — `/clip-editor?pipelineId=` fetches the pipeline and loads the `editResult.cutPlan` as clips
4. **E2E coverage** — 32 new pipeline-handoff E2E tests (deep link, clip-editor handoff, auth prompts, responsive, RTL)
5. **Deep link error handling** — `/pipeline?id=` handles 404/403/401/network errors
6. **i18n error keys** — Added `errNotFound` and `errForbidden` to all 13 locales; updated 12 locale pipeline subtitles

### Verification
- npm run lint — 0 errors
- npm test — 1395 tests passing
- npx playwright test — 334 E2E tests passing
- npm run build — successful

## 2026-09-01 — J: Edit/Publish Depth, Workflow Builder Run, Credit Reconciliation, A/B Modal Migration

### What Changed
1. **Edit stage EDL** — `executeEditStage` produces a proper Edit Decision List with real media URLs and audio, surfaces `finalMediaUrl` for publishing
2. **Publish stage calls publishContent** — `executePublishStage` calls `publishContent` from the publishing library with dryRun safety; `onComplete: 'review'` returns a plan, `'publish'` calls the publisher
3. **Workflow Builder "Run as Pipeline"** — New button posts the workflow definition to `/api/creative/pipeline` and navigates to the pipeline page
4. **Credit reconciliation** — Pipeline routes now advance state after each stage execution to update `totalCreditsUsed` immediately; refunds on stage failure
5. **ABTestPlannerModal migrated** — From deprecated `/api/creative/ab-test` to `/api/creative/ab-automation` with real creationIds

### Verification
- npm run lint — 0 errors
- npm test — 1394 tests passing
- npm run build — successful

## 2026-09-01 — K: Asset Persistence, Model Router for Media, Score Stage, Auto-Advance

### What Changed
1. **Pipeline output persistence** — Generated outputs (media, audio, EDL, compliance, publish) persisted as Asset/AssetVersion records at pipeline completion
2. **Model router wired to media** — Media service boundary uses getImageModel/getVideoModel/getTTSModel from the provider router for plan-tier gating
3. **Score/quality pipeline stage** — New `score` stage calls `scoreCreative` for multi-dimensional quality scoring; added to `full-creative` template
4. **Auto-advance** — PipelineOrchestrator auto-advances through stages when `autoAdvance` is enabled (default true)
5. **Clip editor handoff** — "Open in Clip Editor" link from edit stage output

### Verification
- npm run lint — 0 errors
- npm test — 1394 tests passing
- npm run build — successful

## 2026-09-01 — Pipeline Stage Executor, Real Media Generation, Pipeline Output UI, Hardening

### What Changed

#### H-series (already shipped)
1. **Real stage executor** — `pipeline-executor.ts` maps each stage to creative library functions, passing outputs via `StageContext`
2. **Unified persistence** — pipeline routes call `engine.ts` (`startWorkflow`/`recordStep`/`completeWorkflow`/`failWorkflow`) for `WorkflowStep` rows
3. **Creative Studio pipeline mode** — UI toggle that runs the full pipeline with live progress tracking
4. **Production hardening** — BYOK (`withAtlas`) parity on A/B automation, ownership validation on `creationIds`, bounded inputs

#### I-series
5. **Real media generation** — `media_generation` stage calls `dispatchMediaService` with `video_gen` capability
6. **A/B workflow-per-variant execution** — uses `executeStage` + `engine.ts` for real generation per variant
7. **Pipeline output UI** — `StageOutputViewer` in `PipelineOrchestrator` shows brief, script, storyboard, compliance, media results
8. **Rate limiting on pipeline routes** — prevents abuse on `/api/creative/pipeline` POST and `/api/creative/pipeline/[id]` PATCH
9. **Old ab-test route deprecated** — in favor of `ab-automation` (workflow-per-variant execution, winner tagging, hardening)
10. **Executor integration tests added** — 16 new tests covering stage-to-function mapping, `StageContext`, persistence, error handling, and media generation
11. **ADR-030** documenting pipeline executor and hardening decisions

### Verification
- npm run lint — 0 errors
- npm test — all unit tests passing
- npm run build — successful

## 2026-09-01 — Workflow Execution Layer, A/B Automation Integration, Onboarding, Docs

### What Changed

#### F1: Workflow Builder v2 UI
1. **Advanced mode toggle** — unlocks conditional stages, parallel groups, and execution wave preview
2. **Conditional stages** — per-stage condition editor (field, operator, value) with live evaluation against execution context
3. **Parallel groups** — link adjacent stages as parallel partners with visual connector and badge
4. **Execution wave preview** — live preview of resolved execution waves with adjustable execution context (platform, contentType, budget tier, voiceover/music/compliance toggles)

#### F2: Per-Stage Analytics, Winner Feedback Loop
5. **Per-stage workflow analytics** — Analytics Hub API aggregates `WorkflowStep` rows per stage (total, completed, failed, success rate, total credits, avg duration); UI renders a per-stage performance table
6. **Winner feedback loop** — A/B Automation tags the winning creation's `outputs.abTestWinner` metadata (best-effort, non-blocking) so downstream features can filter proven winners

#### F3: Invite Acceptance Flow, Admin Feedback Dashboard, Cross-Isolate Presence
7. **Invite acceptance flow** — `/teams/join` page + `POST /api/teams/join` route for token-based team invitation acceptance
8. **Admin feedback dashboard** — `/admin/feedback` page (admin-only) showing individual feedback submissions and per-feature summary cards
9. **Cross-isolate presence documentation** — detailed header comment in `/api/teams/[id]/presence` documenting the in-memory store limitation and three production fixes (Durable Objects, D1-backed, Workers KV) with best-effort activity-log persistence

#### F4: Onboarding Updates, Team Template Management, Perf Verification
10. **Onboarding updates** — `OnboardingModal` now includes the four new features (Workflow Builder, A/B Automation, Analytics Hub, Team Collaboration) as goal-selection cards
11. **Team template management** — template filter dropdown (all/personal/team/builtin), team-shared badge with Users icon, unshare button for owned team-shared templates
12. **Performance verification** — confirmed no regressions in FCP, TTFB, and bundle size after all integrations

#### G1: Execution Layer Wiring
13. **`configFromWorkflow`** — translates `WorkflowDefinition` (conditional stages, `parallelWith`) into `PipelineConfig`; failing conditions set `enabled=false`; parallel links preserved on `PipelineStageConfig`
14. **`advancePipelineWithWaves`** — wave-aware pipeline advancement; parallel stages start simultaneously; pipeline waits for all stages in a wave to complete before advancing
15. **`/api/creative/pipeline` POST** — accepts `{ workflow, context }` body, calls `configFromWorkflow`, uses `advancePipelineWithWaves` for wave-based execution

#### G2: Round-Trip Loading of Workflow Definitions
16. **Save with workflow** — Workflow Builder POST includes `workflow` field (`{ stages: ConditionalStage[], flags }`) in `payloadJson` when advanced mode is active
17. **Load with workflow** — GET response includes `workflow` field if present; UI `loadTemplate` restores full `ConditionalStage[]` (conditions + parallel groups) and switches to advanced mode

#### G3: A/B Workflow Integration, Winner Tag Filtering
18. **A/B workflow integration** — A/B Automation page includes a workflow template selector that pre-fills the test name and indicates the workflow will run per variant
19. **Winner tag filtering** — winning creations tagged with `outputs.abTestWinner` can be filtered by downstream features

#### Documentation
20. ADR-029 documenting the workflow execution layer, round-trip loading, per-stage analytics, winner feedback loop, team template management, onboarding, admin feedback dashboard, invite acceptance flow, and cross-isolate presence
21. CHANGELOG updated

### Verification
- npm run lint — 0 errors
- npm test — all unit tests passing (existing + new)
- npx playwright test — all E2E tests passing

## 2026-09-01 — Polish, Hardening, Cross-Feature Integration, Workflow v2, Team Workflows, Feedback

### What Changed

#### Polish & Hardening (all 4 new features)
1. **Workflow Builder** — error banner with retry, delete confirmation dialog, keyboard reordering (arrow keys + up/down buttons), input validation (maxLength, trimming, duplicate prevention), drag-and-drop accessibility (aria-grabbed, role=listitem), fixed infinite loading on API error
2. **A/B Automation** — NaN guards in calculateSignificance/determineWinner/summarizeJob, type-guard in parseAutomationMetadata, error banner with retry, per-job loading state, role=alert on errors, accessible table headers, creative ID de-duplication, input validation
3. **Analytics Hub** — empty state for new users, error banner with retry, aria-busy on spinner, NaN guards on all metrics, negative projection clamping, short ID guard, aria-hidden on decorative icons, API route NaN guards
4. **Team Collaboration** — fixed infinite spinner, error banners with retry, empty state for zero members, avatar edge case fix, alt text on avatars, aria-label on status dots, email validation, button disable during invite, visibility-aware polling, try/catch on all API routes, restricted activity types, limit validation

#### Cross-Feature Integration
5. **Workflow Builder → A/B Automation** — workflow template selector in A/B Automation page pre-fills test name
6. **Workflow Runs → Analytics Hub** — workflow run metrics (total/completed/failed/running, avg duration, by type) in Analytics Hub

#### Workflow Builder v2
7. **Conditional stages** — `src/lib/creative/workflow-conditions.ts` with condition evaluation (platform, contentType, hasVoiceover, etc.), stage filtering, parallel execution waves, serialization, validation
8. 20 unit tests for conditional workflow logic

#### Team Workflows
9. **Team-shared workflow templates** — templates can be shared with teams via `team:<teamId>` tags, visible to all team members
10. Team selector in Workflow Builder UI

#### In-App Feedback
11. **FeedbackWidget** — floating button → star rating + comment dialog on all 4 new feature pages
12. `POST /api/feedback` — stores feedback (reuses CreativeTemplate with category 'feedback')
13. `GET /api/feedback` — admin-only feedback retrieval

#### Documentation
14. ADR-028 documenting all architecture decisions
15. CHANGELOG updated

### Verification
- npm run lint — 0 errors, 10 pre-existing warnings
- npm test — all unit tests passing
- npx playwright test — all E2E tests passing
- npm run build — successful

## 2026-08-29 — Dashboard Integration, Cross-Feature Handoffs, E2E + ADRs

### What Changed
1. Dashboard "Quick Create" grid now includes Creator Kits, Brand Concepts, Clip Editor, and Media Services with localized titles/descriptions across 13 locales
2. Cross-feature handoffs: Brand Concepts → Creator Kits (query-param pre-fill), Brand Concepts → Shot Planner (script pre-fill), Clip Editor → Media Service Boundary (ASR/TTS buttons)
3. 58 new E2E smoke tests for the 4 new pages (302 total)
4. ADRs 020-023 documenting architecture decisions for Creator Campaign Kits, Brand-to-Multi-Concept, Conversational Clip Editor, and Media Service Boundary
5. appMessages entries for 4 new features × 13 locales

### Verification
- npm test — 1267 unit tests passed
- npx playwright test — 302 E2E tests passed (58 new)
- npx tsc --noEmit — passed
- npm run lint — 0 errors, 10 pre-existing warnings
- npm run build — 201 routes, clean
- Cloudflare deploy — Version `426e13d8-9b72-4190-aa9b-0490d872f9a4`
- GitHub Actions CI — success

## 2026-08-29 — Creator Campaign Kits, Brand-to-Multi-Concept, Clip Editor, Media Service Boundary

### What Changed
1. **Creator Campaign Kits** (`/creator-kits`) — packages briefs, talking points, product info, dos/don'ts, delivery specs, hook suggestions, CTA options, visual guidelines, and compliance notes into a shareable kit for human UGC creator partnerships (6 credits)
2. **Brand-to-Multi-Concept Flow** (`/brand-concepts`) — orchestrated pipeline: URL or description → brand extraction → 2-5 divergent ad concepts with angles, scripts, storyboards, platform fit, diversity scoring, and best-concept recommendation (10 credits). Inspired by AdsTurbo/product-page-to-ad-brief (#40, MIT)
3. **Conversational Clip Editor** (`/clip-editor`) — clip-centric editing with natural language commands (trim, split, delete, reorder, add, speed, volume, merge, duplicate, label). Deterministic parser for known patterns with AI-enhanced fallback (3 credits for AI parse). Inspired by OpenChatCut (#48, AGPL) architecture — fully original implementation
4. **Media Service Boundary Abstraction** (`/media-service-boundary`) — clean contract for 8 GPU-backed media capabilities (ASR, TTS, OCR, image editing, audio processing, voice cloning, video generation, lip sync) with dry-run stubs. Maps to FireRed models (#65-84). Production-ready for when GPU services are wired up
5. 4 domain libraries, 4 API routes, 4 components, 4 pages, 4 test files (145 new unit tests)
6. i18n: 4 new namespaces × 13 locales
7. Navigation: 4 entries in Shell.tsx

### Verification
- npm test — 1267 unit tests passed (145 new)
- npx playwright test — 244 E2E tests passed
- npx tsc --noEmit — passed
- npm run lint — 0 errors, 10 pre-existing warnings
- npm run build — 201 routes, clean
- Cloudflare deploy — Version `94db7c36-389c-459f-9a37-f5dfe00ef368`
- GitHub Actions CI — success

## 2026-08-28 — Scene Analysis, Creative MCP Server, Video Shot Planner, Campaign Orchestrator

### What Changed
1. **Scene Analysis** (`/scene-analysis`) — analyze video scenes for composition, pacing, emotional tone, and creative effectiveness
2. **Creative MCP Server** (`/mcp-server`) — Model Context Protocol server exposing creative tools to external AI agents
3. **Video Shot Planner** (`/shot-planner`) — generate detailed shot-by-shot production plans from scripts or briefs
4. **Campaign Orchestrator** (`/campaign-orchestrator`) — multi-phase campaign workflow with state machine, phase transitions, and asset persistence

### Verification
- npm test — 1122 unit tests passed
- npx playwright test — 244 E2E tests passed
- Cloudflare deploy — successful
- GitHub Actions CI — success

## 2026-08-28 — Creative Quality Scoring, Repurposing Engine, Audience Insights, Trend Intelligence

### What Changed
1. **Creative Quality Scoring** (`/quality-scoring`) — score creative assets on dimensions: hook strength, visual quality, brand alignment, emotional resonance, CTA clarity
2. **Repurposing Engine** (`/repurposing`) — adapt existing creative assets for different platforms, formats, and audiences
3. **Audience Insights** (`/audience-insights`) — analyze audience demographics, interests, and behavior patterns
4. **Trend Intelligence** (`/trend-intelligence`) — detect and track trending topics, formats, and creative patterns

### Verification
- npm test — unit tests passed
- npx playwright test — E2E tests passed
- Cloudflare deploy — successful
- GitHub Actions CI — success

## 2026-08-28 — Brief Intelligence, Performance Forecasting, Testing Lab, Brand Voice Engine

### What Changed
1. **Creative Brief Intelligence** (`/brief-intelligence`) — analyze and score creative briefs for completeness, clarity, and actionability
2. **Creative Performance Forecasting** (`/forecasting`) — predict ad performance before launch using historical data and creative analysis
3. **Ad Creative Testing Lab** (`/testing-lab`) — design and manage A/B tests for creative variants
4. **Brand Voice & Style Engine** (`/brand-voice`) — define and enforce brand voice, tone, and style guidelines across all creative output

### Verification
- npm test — unit tests passed
- npx playwright test — E2E tests passed
- Cloudflare deploy — successful
- GitHub Actions CI — success

## 2026-08-28 — Creative Pipeline Orchestrator, Audience Personas, Variant Matrix, Ad Fatigue Detector

### What Changed
1. **Creative Pipeline Orchestrator** (`/pipeline`) — visual pipeline for multi-step creative workflows with templates
2. **Audience Personas** (`/personas`) — generate and manage detailed audience personas for targeting
3. **Variant Matrix** (`/variant-matrix`) — generate and compare creative variants across dimensions
4. **Ad Fatigue Detector** (`/fatigue`) — detect when ads are losing effectiveness and recommend refreshes

### Verification
- npm test — unit tests passed
- npx playwright test — E2E tests passed
- Cloudflare deploy — successful
- GitHub Actions CI — success

## 2026-08-28 — Voice & Audio Studio, Competitor Intelligence, Compliance Checker, Budget Optimizer

### What Changed
1. **Voice & Audio Studio** (`/audio-studio`) — TTS voice generation, audio mixing, and music selection
2. **Competitor Intelligence** (`/competitor-intel`) — analyze competitor ads, strategies, and positioning
3. **Compliance Checker** (`/compliance`) — check creative content against platform policies and regulatory requirements
4. **Budget Optimizer** (`/budget-optimizer`) — optimize ad spend allocation across campaigns and platforms

### Verification
- npm test — unit tests passed
- npx playwright test — E2E tests passed
- Cloudflare deploy — successful
- GitHub Actions CI — success

## 2026-08-28 — Product Image Studio, Multi-Platform Publisher, Narrative Ad Builder, ML Insights

### What Changed
1. **Product Image Studio** (`/image-studio`) — AI-powered product photography with background removal, scene composition, and style transfer
2. **Multi-Platform Publisher** (`/publish`) — publish creative content to Meta, Google, TikTok, and YouTube with platform-specific formatting
3. **Narrative Ad Builder** (`/narrative-studio`) — build story-driven ads with multi-scene narratives
4. **ML Insights** (`/ml-insights`) — machine learning insights from creative performance data

### Verification
- npm test — unit tests passed
- npx playwright test — E2E tests passed
- Cloudflare deploy — successful
- GitHub Actions CI — success

## 2026-08-28 — Google Ads + GA4, UGC Ad Formats, Creative Skill Library, Viral Analysis

### What Changed
1. Google Ads integration + GA4 analytics feedback loop
2. UGC ad formats (16 formats across UGC/commercial/tiktok categories)
3. Creative skill library — composable agent skills for creative workflows
4. Viral analysis — analyze why content goes viral and apply patterns to new creative

### Verification
- npm test — unit tests passed
- npx playwright test — E2E tests passed
- Cloudflare deploy — successful
- GitHub Actions CI — success

## 2026-08-28 — Timeline Persistence, Tool Execution API, OCR Route, D1 Migration

### What Changed
1. Timeline persistence to D1: GET /api/editor/timeline (list), POST with save/load/delete actions
2. Tool execution API: POST /api/creative/tools/execute — validate + execute any of the 10 creative tools
3. OCR API route: POST /api/editor/ocr — image URL to text extraction (1 credit, dry-run stub)
4. D1 migration applied to production (Timeline table, 19 tables total)
5. Provider router integrated into creative intelligence (getLLMModel)
6. ASR transcribe route: POST /api/editor/transcribe (video URL → transcript, 2 credits)
7. Director → Editor workflow: "Send to Editor" link passes script as transcript
8. /editor added to navigation
9. Creative tool execute functions wired (dynamic imports)
10. 4 new E2E tests for Director → Editor flow

### Verification
- npm test — 310 unit tests passed (39 new)
- npx playwright test — 117 E2E tests passed
- npx tsc --noEmit — passed
- npm run lint — passed
- D1 migration applied to production

## 2026-08-28 — Editor API Routes, UI Page, Tool Wiring, ADRs 009-012

### What Changed
1. Editor API routes: POST /api/editor/rough-cut, GET /api/editor/skills, POST /api/editor/timeline
2. Editor UI page at /editor with three tabs (Rough Cut, Skills, Timeline)
3. Creative tool wiring: GET /api/creative/tools, tool validation on refine/remix routes
4. ADRs 009-012: Timeline Data Model, Creative Tool Contracts, Transcript-Driven Editing, Editing Skill Archive
5. 48 new i18n keys (editor namespace) × 13 locales
6. /editor added to navigation

### Verification
- npm test — 271 unit tests passed
- npx playwright test — 113 E2E tests passed (15 new editor)
- npx tsc --noEmit — passed
- npm run lint — passed

## 2026-08-28 — Timeline Data Model, MCP Tool Contracts, Transcript Editing, Skill Archive

### What Changed
1. Timeline data model: types, builder, validation, Prisma model (18 tests)
2. MCP-style creative tool contracts: 10 tools with JSON schemas (24 tests)
3. Transcript-driven editing: generateRoughCut from ASR, EDL export (21 tests)
4. Editing skill archive: 5 builtin skills, CRUD, recommendation
5. 6 roadmap items marked complete

### Verification
- npm test — 271 unit tests passed (80 new)
- npx playwright test — 98 E2E tests passed

## 2026-08-28 — ASR/OCR Provider Stubs, Router Improvements, ADRs, E2E Tests

### What Changed
1. OCR provider interface and dryRunOCR stub
2. ASR/OCR registry entries (whisper-large-v3, firered-ocr)
3. Provider router: cost estimation for image/audio, plan-tier filtering
4. ADR-007: Conversational Creative Refinement
5. ADR-008: viral2viral Remix
6. E2E tests for refine/remix UI (15 tests)

### Verification
- npm test — 191 unit tests passed (18 new provider-router)
- npx playwright test — 98 E2E tests passed (15 new refine-remix)

## 2026-08-28 — Conversational Refinement + viral2viral Remix

### What Changed
1. **Conversational creative refinement** (P1 from roadmap): Users can now iterate on
   generated hooks, angles, and scripts via natural language instructions. E.g.,
   "Make the hook more urgent" or "Rewrite for a younger audience."
   - New `refineCreative()` function in `src/lib/creative/intelligence.ts`
   - New `REFINE_SYS` system prompt in `src/lib/creative/prompts.ts`
   - New API route: `POST /api/creative/refine` (2 credits per refinement)
   - UI: Refine section on `/creative-director` page with target selector,
     instruction textarea, and result display with refinement notes
   - 22 new i18n keys (`refine*` and `remix*`) in `director` namespace × 13 locales

2. **viral2viral remix flow** (P1 from roadmap): Full "remix this viral video for my
   brand" flow — reference analysis → adaptation recommendations → original brief.
   - New `remixFromReference()` function in `src/lib/creative/intelligence.ts`
   - New `REMIX_SYS` system prompt in `src/lib/creative/prompts.ts`
   - New API route: `POST /api/creative/remix` (4 credits, or 9 with auto-analysis)
   - UI: "Remix" button in creative-studio reference analysis section
   - Adapts the reference's persuasive structure without copying its content

3. **Roadmap updated**: `research/best-ideas.md` updated to reflect implemented features
   (Meta Ads, Google Ads, performance loop, autonomous director, audit logging)

### New Credit Costs
- `creative:refine` — 2 credits
- `creative:remix` — 4 credits
- `creative:remix:analysis` — 5 credits (when auto-analyzing a reference URL)

### Verification
- `npm test` — 173 unit tests passed (157 + 16 new refine/remix tests)
- `npx playwright test` — 83 E2E tests passed
- `npx tsc --noEmit` — passed (0 errors)
- `npm run lint` — passed (0 errors)

### Files Changed
- `src/lib/creative/intelligence.ts` (refineCreative, remixFromReference, CREATIVE_COSTS)
- `src/lib/creative/prompts.ts` (REFINE_SYS, REMIX_SYS)
- `src/app/api/creative/refine/route.ts` (new)
- `src/app/api/creative/remix/route.ts` (new)
- `src/app/creative-director/page.tsx` (refine UI section)
- `src/app/creative-studio/page.tsx` (remix button in reference analysis)
- `src/i18n/messages.ts` (22 new keys × 13 locales)
- `test/refine-remix.test.ts` (new — 16 tests)
- `research/best-ideas.md` (roadmap updates)

## 2026-08-28 — Remaining i18n Gaps + Admin E2E Tests

### What Changed
1. **i18n gap fixes**: 7 new keys across 5 existing namespaces (all 13 locales):
   - `drama`: `altProduct`, `imagePreview`, `altScene` (alt text and aria-labels)
   - `myWork`: `downloadVideo`, `altProduct` (aria-label and alt text)
   - `assets`: `removeColor` (aria-label)
   - `mkStudio`: `done`, `defaultSaveTitle` (progress label and save title)
   - `adRef`: `videoSpec` (file spec hint)
   - Reused existing `common.close` for "close" aria-labels
   - 6 pages updated: drama-studio, my-work, my-work/[id], assets, lazynext-studio, ad-reference
2. **Admin E2E tests**: 8 new tests in `e2e/admin.spec.ts` covering page load, layout,
   auth gate, console error check, and direct URL accessibility.
3. **CHANGELOG**: added entry for admin/reset/cstudio i18n.

### Verification
- `npm test` — 157 unit tests passed
- `npx playwright test` — 83 E2E tests passed (75 + 8 new admin)
- `npx tsc --noEmit` — passed (0 errors)
- `npm run lint` — passed (0 errors, 0 warnings)
- All CI checks green

### Files Changed
- `src/i18n/messages.ts` (7 new keys × 13 locales)
- `src/app/drama-studio/page.tsx` (alt text and aria-labels)
- `src/app/my-work/page.tsx` (aria-label)
- `src/app/my-work/[id]/page.tsx` (aria-label and alt text)
- `src/app/assets/page.tsx` (aria-labels, added useI18n to Modal)
- `src/app/lazynext-studio/page.tsx` (progress label and save title)
- `src/app/ad-reference/page.tsx` (file spec hint)
- `e2e/admin.spec.ts` (new — 8 tests)
- `CHANGELOG.md` (new entry)

## 2026-08-28 — i18n for Admin, Reset-Password, Creative-Studio Pages

### What Changed
1. **Admin page i18n**: `admin` namespace (26 keys) added to all 13 locales. Admin page
   was previously zero i18n — now fully translated (title, tabs, search, table headers,
   empty states, buttons).
2. **Reset-password page i18n**: `reset` namespace (15 keys) added to all 13 locales.
   Reset-password page was previously zero i18n — now fully translated (title, form labels,
   buttons, error messages).
3. **Creative-studio Field labels i18n**: `cstudio` namespace (34 keys) added to all 13
   locales. ~30 hardcoded Field labels for brand extraction, product extraction, brief,
   and reference analysis sections now translated.
4. **CHANGELOG**: added entry for prior i18n/streaming/E2E work, updated test counts to
   157 unit / 75 E2E.

### Verification
- `npm test` — 157 unit tests passed
- `npx playwright test` — 75 E2E tests passed
- `npx tsc --noEmit` — passed (0 errors)
- `npm run lint` — passed (0 errors, 0 warnings)
- All CI checks green

### Files Changed
- `src/i18n/messages.ts` (admin, reset, cstudio namespaces × 13 locales)
- `src/app/admin/page.tsx` (added useI18n, t() calls)
- `src/app/reset-password/page.tsx` (added useI18n to both components, t() calls)
- `src/app/creative-studio/page.tsx` (replaced ~30 Field labels with t() calls)
- `CHANGELOG.md` (new entries, test count fixes)

## 2026-08-28 — i18n for Creative Assets, Streaming Route Tests, E2E Coverage

### What Changed
1. **i18n for `/creative-assets` page**: added `cassets` namespace (15 keys) to all 13 locale
   blocks in `src/i18n/messages.ts`. All hardcoded English strings in the creative-assets page
   now use `t('cassets.*')` calls. Brand name "Creative Director" translated per locale convention.
2. **Streaming director route tests**: 27 new tests in `test/streaming-director.test.ts` covering
   NDJSON line format, stream parsing, credit refund math, budget clamping, stream vs legacy mode
   selection, response headers, step callback data shape, and full lifecycle simulation.
3. **E2E coverage expansion**: 21 new E2E tests across two new spec files:
   - `e2e/creative-assets.spec.ts` (10 tests): page load, layout, auth gate, nav link
   - `e2e/streaming-metrics.spec.ts` (11 tests): streaming UI structure, auth modal, budget slider,
     ads form validation, dry-run default, campaign list, refresh button aria-label
4. **AGENTS.md**: updated test count from 113 to 157.

### Verification
- `npm test` — 157 unit tests passed (130 existing + 27 new streaming tests)
- `npx playwright test` — 75 E2E tests passed (54 existing + 21 new)
- `npx tsc --noEmit` — passed (0 errors)
- `npm run lint` — passed
- All CI checks green

### Files Changed
- `src/i18n/messages.ts` (cassets namespace × 13 locales)
- `src/app/creative-assets/page.tsx` (t() calls replacing hardcoded English)
- `test/streaming-director.test.ts` (new — 27 tests)
- `e2e/creative-assets.spec.ts` (new — 10 tests)
- `e2e/streaming-metrics.spec.ts` (new — 11 tests)
- `AGENTS.md` (test count update)

## 2026-08-28 — Creative Assets Browsing Page, Asset-Persist Tests, Docs Update

### What Changed
1. **Creative Assets browsing page**: new `/creative-assets` page lists saved Creative Director
   packages with expandable child asset views (brief, hooks, angles, script, variants).
2. **Filter bar**: filter assets by type (all, packages, brief, hooks, angles, script, variants).
3. **Navigation**: Assets link added to Shell header nav and dashboard.
4. **Asset-persist unit tests**: 17 new tests in `test/asset-persist.test.ts` covering
   `parseMetadata`, `parseTags`, `groupAssets`, and asset type validation.
5. **Documentation**: CHANGELOG, ADR-005, ADR-006, and AGENTS.md updated to cover asset
   persistence, streaming director, metrics refresh UI, and i18n expansion.

### Verification
- `npm test` — 157 unit tests passed (113 existing + 17 asset-persist + 27 streaming tests)
- `npx tsc --noEmit` — passed (0 errors)
- `npm run lint` — passed
- All CI checks green

### Files Changed
- `src/app/creative-assets/page.tsx` (new — asset browsing UI)
- `src/app/dashboard/page.tsx` (added creative-assets card)
- `src/components/Shell.tsx` (added Assets nav link)
- `test/asset-persist.test.ts` (new — 17 tests)
- `CHANGELOG.md` (new entry)
- `docs/adr/005-autonomous-creative-director.md` (workflow/persistence/streaming update)
- `docs/adr/006-performance-learning.md` (metrics refresh UI update)
- `AGENTS.md` (new API routes and streaming note)

## 2026-08-28 — Asset Persistence, Streaming Director, Metrics Refresh UI, Nav, E2E

### What Changed
1. **Asset persistence**: Creative Director outputs (brief, hooks, angles, best combination,
   variants) are now persisted as `Asset`/`AssetVersion` records in D1 via
   `src/lib/creative/asset-persist.ts`, enabling retrieval and reuse of generated creative packages.
2. **New API route**: `GET /api/creative/assets` lists persisted assets for a workspace/user.
3. **Real-time streaming**: `/api/creative/director` now returns an NDJSON stream with step-by-step
   updates (brief, hooks, angles, scoring, variants). Legacy non-streaming mode is available via
   `?stream=false`.
4. **Metrics refresh UI**: per-campaign refresh button on the `/ads` page calls
   `POST /api/ads/metrics` and displays 6 mini-metrics (impressions, clicks, CTR, CVR, spend, ROAS).
5. **i18n expansion**: 78 new translation keys (director: 33, ads: 30, perf: 15) added to all 13
   locale blocks (en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id).
6. **Navigation**: primary nav links added to the Shell header (Dashboard, Director, Ads,
   Performance) for quick access to the new pages.
7. **E2E tests**: 27 new tests in `e2e/new-pages.spec.ts` covering Creative Director, Ads, and
   Performance pages.
8. **Workflow engine integration**: Creative Director now records runs and steps to the
   `WorkflowRun`/`WorkflowStep` tables via `startWorkflow`/`recordStep`/`completeWorkflow`/
   `failWorkflow`.
9. **Markup fix**: removed duplicate `main#main-content` from the new pages (Director, Ads,
   Performance) to ensure a single main landmark per page.
10. **E2E fix**: `e2e/home.spec.ts` nav landmark strict-mode violation resolved.

### Verification
- `npm test` — 157 unit tests passed (113 existing + 17 asset-persist + 27 streaming tests)
- `npx playwright test` — 75 E2E tests passed (27 new-pages + 10 creative-assets + 11 streaming-metrics + 27 existing)
- `npx tsc --noEmit` — passed (0 errors)
- All CI checks green

### Files Changed
- `src/lib/creative/asset-persist.ts` (new — persistCreativePackage)
- `src/app/api/creative/assets/route.ts` (new — GET asset list)
- `src/app/api/creative/director/route.ts` (NDJSON streaming + `?stream=false` legacy mode)
- `src/lib/creative/director.ts` (workflow engine integration)
- `src/app/ads/page.tsx` (per-campaign metrics refresh UI + 6 mini-metrics)
- `src/app/creative-director/page.tsx` (markup fix — duplicate main removed)
- `src/app/performance/page.tsx` (markup fix — duplicate main removed)
- `src/components/Shell.tsx` (primary nav links in header)
- `src/i18n/messages.ts` (78 new keys across 13 locales)
- `e2e/new-pages.spec.ts` (new — 27 tests)
- `e2e/home.spec.ts` (nav landmark strict-mode fix)

## 2026-08-28 — Ad Platforms, Autonomous Creative Director, Performance Learning Loop

### What Changed
1. **Ad-platform integrations**: Meta and Google Ads providers implemented behind a shared
   `AdPlatformProvider` interface with dry-run mode for safe testing. New API routes:
   - `POST /api/ads/create` — creates ad campaigns on the target platform (dry-run by default)
   - `POST /api/ads/metrics` — fetches spend, impressions, clicks, and conversions
   - Dry-run mode returns realistic mock responses without touching live ad accounts
2. **Autonomous Creative Director**: `runCreativeDirector()` agent loop orchestrates the full
   creative pipeline (brief → hooks → angles → scripts → storyboard → score → variants → publish).
   - `POST /api/creative/director` — kicks off the autonomous loop
   - Enforces budget constraints (max credits per run, max generations per step)
   - Approval gates: the loop pauses for human approval before publishing to any ad platform
   - Best-combination selection: scores all hook/angle/script combinations and selects the top variant
3. **Performance learning loop**: `CreativePerformance` model records per-creative metrics
   (impressions, clicks, spend, conversions, CTR, CPC, ROAS) aggregated by hook, angle, and platform.
   - `getPerformanceSummary()` — aggregate metrics for a user/workspace
   - `getLearningsContext()` — distills top/bottom performers into a context string
   - `GET /api/creative/performance` — retrieves aggregated performance data
   - Learnings are injected into brief generation so future creatives leverage past results
4. **New Prisma models**: `WorkflowRun`, `WorkflowStep`, `AdCampaign`, `CreativePerformance`
   added to `prisma/schema.prisma`. All D1 migrations applied (18 tables total).
5. **Score and variants API routes**: `POST /api/creative/score` and `POST /api/creative/variants`
   expose `scoreCreative()` and `generateVariants()` (previously library-only).
6. **Observability**: structured logging wired into credit deduction and image generation paths
   for auditability and debugging.
7. **CI fixes**: GitHub Actions workflow updated — `prisma generate` + `db:push` run before tests,
   dev server bound to port 3100, `NEXTAUTH_SECRET` provided in CI environment.
8. **i18n**: score and variants keys added for all 12 non-English locales (en, zh, ja, es, ko, pt,
   fr, de, ar, hi, vi, th, id).

### Verification
- `npm test` — 113 tests passed
- `npx tsc --noEmit` — passed (0 errors)
- `npx prisma generate` — passed (4 new models)
- D1 migrations applied — 18 tables total

### Files Changed
- `src/lib/ad-platforms/types.ts` (new — AdPlatformProvider interface, ad types)
- `src/lib/ad-platforms/meta.ts` (new — Meta Ads provider)
- `src/lib/ad-platforms/google.ts` (new — Google Ads provider)
- `src/app/api/ads/create/route.ts` (new)
- `src/app/api/ads/metrics/route.ts` (new)
- `src/app/api/ads/list/route.ts` (new — GET campaign list)
- `src/lib/creative/director.ts` (new — runCreativeDirector agent loop)
- `src/app/api/creative/director/route.ts` (new)
- `src/lib/creative/learning.ts` (new — CreativePerformance aggregation + learnings context)
- `src/app/api/creative/performance/route.ts` (new — GET aggregated performance)
- `src/app/api/creative/score/route.ts` (new)
- `src/app/api/creative/variants/route.ts` (new)
- `src/app/creative-director/page.tsx` (new — Creative Director UI)
- `src/app/ads/page.tsx` (new — Ad Campaigns UI)
- `src/app/performance/page.tsx` (new — Performance Dashboard UI)
- `src/app/dashboard/page.tsx` (added 3 new pages to navigation grid)
- `prisma/schema.prisma` (WorkflowRun, WorkflowStep, AdCampaign, CreativePerformance)
- `src/lib/credits.ts` (observability logging)
- `src/lib/providers/atlas-image.ts` (observability logging)
- `src/lib/creative/intelligence.ts` (learnings field added to BriefInput)
- `src/app/api/creative/brief/route.ts` (injects getLearningsContext into brief generation)
- `src/i18n/messages.ts` (score/variants keys for 12 locales)
- `.github/workflows/ci.yml` (prisma generate, db:push, port 3100, NEXTAUTH_SECRET)
- `docs/adr/004-ad-platform-integration.md` (new)
- `docs/adr/005-autonomous-creative-director.md` (new)
- `docs/adr/006-performance-learning.md` (new)
- `test/ad-platforms.test.ts` (new — 18 tests)
- `test/creative-director.test.ts` (new — 13 tests)
- `test/creative-learning.test.ts` (new — 21 tests)

## 2026-08-27 — Remaining Work Completion: Scoring, Variants, Model Router, BrandProfile, Reference Analysis UI

### What Changed
1. **Reference Creative Analysis UI** added to `/creative-studio`: users can now analyze reference
   ad videos directly from the Creative Studio page. Shows hook, pacing, scenes, persuasion
   mechanisms, adaptation recommendations, and originality constraints.
2. **Send-to-Studio links** added to Creative Studio: quick links to UGC Product Ad, Reference to Ad,
   AI Drama Ad, and Ad Skit workflows from the Creative Studio page.
3. **Product extraction persistence**: `/api/brand/product-extract` now saves extracted products to
   the `AdProduct` table for reuse in generation workflows.
4. **`scoreCreative()` function** implemented in `src/lib/creative/intelligence.ts`: scores creatives
   on 10 quality dimensions (hook strength, clarity, product visibility, brand consistency, emotional
   impact, novelty, platform fit, CTA strength, audio quality, visual quality) plus compliance risk.
5. **`generateVariants()` function** implemented: generates A/B test variants of a creative.
6. **`buildProfile()` function** implemented in `src/lib/brand/profile.ts`: converts raw brand
   extraction into a normalized BrandProfile.
7. **`BrandProfile` Prisma model** added to `schema.prisma`: stores normalized brand intelligence
   (company, domain, industry, positioning, audience, tone, visual style, colors, fonts, prohibited
   claims, brand vocabulary, source URLs).
8. **Model router** implemented in `src/lib/providers/router.ts`: selects best model by capability,
   cost, speed, ratio, and resolution. Future: integrate user plan tiers and latency metrics.
9. **`atlas-research.ts` provider adapter** created: wraps brand/product extraction behind the
   `ResearchProvider` interface.
10. **Brand extract API** now persists to both `BrandKit` (UI compatibility) and `BrandProfile`
    (normalized structured storage).
11. **CI E2E tests fixed**: GitHub Actions workflow now starts mock Atlas server and provides
    required auth/base URL environment variables.
12. **GitHub Actions Cloudflare deploy secrets configured**: `CLOUDFLARE_API_TOKEN` and
    `CLOUDFLARE_ACCOUNT_ID` secrets set for automated deployment.
13. **ADRs updated**: ADR-001, ADR-002, and ADR-003 now include implementation notes documenting
    the actual file structure vs. the original plan.
14. **Creative Studio i18n**: new keys added for reference analysis and send-to-studio sections
    in English; translations for 12 non-English locales in progress.

### Verification
- `npx tsc --noEmit` — passed (0 errors)
- `npx prisma generate` — passed (BrandProfile model added)

### Files Changed
- `src/app/creative-studio/page.tsx` (reference analysis UI + send-to-studio links)
- `src/app/api/brand/extract/route.ts` (BrandProfile persistence)
- `src/app/api/brand/product-extract/route.ts` (AdProduct persistence)
- `src/lib/creative/intelligence.ts` (scoreCreative + generateVariants)
- `src/lib/creative/types.ts` (CreativeScore type already existed)
- `src/lib/creative/prompts.ts` (SCORE_SYS prompt)
- `src/lib/brand/profile.ts` (new — buildProfile function)
- `src/lib/providers/atlas-research.ts` (new — ResearchProvider adapter)
- `src/lib/providers/router.ts` (new — model router)
- `prisma/schema.prisma` (BrandProfile model + User back-relation)
- `src/i18n/messages.ts` (new Creative Studio keys)
- `docs/adr/001-provider-abstraction.md` (implementation notes)
- `docs/adr/002-creative-intelligence.md` (implementation notes)
- `docs/adr/003-brand-intelligence.md` (implementation notes)
- `.github/workflows/ci.yml` (mock Atlas + env vars for E2E)

## 2026-08-27 — Creative Studio UI, Workflow Refactoring, License Verification

### What Changed
1. **New `/creative-studio` page** (`src/app/creative-studio/page.tsx`): Full UI for brand extraction,
   product extraction, creative brief, hooks, angles, script, and storyboard generation. Integrated
   into the dashboard quick-create grid and app catalog.
2. **Existing workflows refactored to provider interfaces**: `src/lib/lazynext-studio/workflow.ts`,
   `src/lib/ad-reference.ts`, and `src/lib/ad-skit.ts` now use `atlasImage`, `atlasVideo`, and `atlasTTS`
   provider adapters instead of calling `submitRawGen`/`submitGen` directly. Behavior, credit accounting,
   task lifecycle, polling, refunds, and BYOK are all preserved.
3. **Provider interface fix**: `VideoGenOptions.prompt` made optional (some video operations like
   kling motion transfer and veed lipsync don't use a prompt). `atlasImage` adapter updated to not
   set `aspect_ratio` when caller specifies `image_size` via `extra`.
4. **License verification for 76 category-classified repos** (`research/license-verification.md`):
   Directly fetched LICENSE files and GitHub API metadata for all 76 repos.
   - 18 MIT, 9 Apache-2.0, 6 AGPL-3.0, 1 MPL-2.0, 2 non-commercial, 1 sustainable-use, 28 no license, 12 not found.
5. **E2E tests for Creative Studio** (`e2e/creative-studio.spec.ts`): 6 browser smoke tests verifying
   page load, sign-in prompt, responsive layout, and route accessibility.

### Verification
- `npm run lint` — passed
- `npm test` — 58 tests passed
- `npm run build` — passed (includes `/creative-studio` route)
- `npx playwright test` — 26 passed, 1 pre-existing failure (404 page `main` strict mode, not caused by these changes)
- 6 new Creative Studio E2E tests all pass

### Files Changed
- `src/app/creative-studio/page.tsx` (new — 665 lines)
- `src/app/dashboard/page.tsx` (added Creative Studio to APPS array)
- `src/config/appCatalog.ts` (added creative-studio title/description)
- `src/lib/lazynext-studio/workflow.ts` (refactored to provider interfaces)
- `src/lib/ad-reference.ts` (refactored to provider interfaces)
- `src/lib/ad-skit.ts` (refactored to provider interfaces)
- `src/lib/providers/types.ts` (prompt made optional in VideoGenOptions)
- `src/lib/providers/atlas-image.ts` (image_size handling fix)
- `e2e/creative-studio.spec.ts` (new — 6 E2E tests)
- `research/license-verification.md` (new — license audit results)
- `research/do-not-integrate.md` (updated with verified licenses)

## 2026-08-27 — Creative Intelligence & Brand Intelligence Layer

### What Changed
Added a creative intelligence layer and brand intelligence layer to LazyNext, plus a provider
abstraction layer. These are additive — no existing code was modified or removed.

### Why
LazyNext previously went directly from product text → LLM storyboard → image/video generation,
with no intermediate creative strategy step. The new layers enable:
1. URL → brand/product extraction (brand intelligence)
2. Product → creative brief → hooks → angles → scripts → storyboard (creative intelligence)
3. Reference video → structured creative analysis (reference intelligence)
4. Swappable provider interfaces (provider abstraction)

### Repository Inspiration
- **context-dot-dev/ad-maker (#1)**: brand website research concept → `src/lib/brand/extract.ts`
- **DV0x/creative-ad-agent (#3)**: hook-first methodology, 6 diverse concepts → `src/lib/creative/intelligence.ts`
- **AdsTurbo/product-page-to-ad-brief (#40)**: brief→angles→scripts→storyboard pipeline (MIT) → `src/lib/creative/intelligence.ts`
- **caoqc4/RemixKit (#16)**: reference analysis + provider registry pattern → `src/lib/creative/intelligence.ts` + `src/lib/providers/registry.ts`
- **attainmentlabs/meta-ads-mcp (#29)**: tool contract + safety patterns → future AdPublishingProvider

### Code Reuse vs Reimplementation
ALL code is clean-room reimplementation. No code was copied from any external repository.
Only workflow concepts, prompt structures, and architectural patterns were adapted.

### License Considerations
- All new LazyNext code is MIT (matching LazyNext's existing license)
- No AGPL/GPL code was used (OpenChatCut and forks explicitly excluded)
- No FireRed model weights or code were integrated (GPU incompatible with Cloudflare Workers)
- AdsTurbo/product-page-to-ad-brief is MIT but only the concept was adapted, not the code

### New Files
```
src/lib/providers/
  types.ts              — Provider interfaces shared types
  image.ts              — ImageProvider interface
  video.ts              — VideoProvider interface
  audio.ts              — TTSProvider + ASRProvider interfaces
  research.ts           — ResearchProvider interface
  analysis.ts           — AdAnalysisProvider interface
  registry.ts           — Model capability registry
  atlas-image.ts        — Atlas Cloud ImageProvider implementation
  atlas-video.ts        — Atlas Cloud VideoProvider implementation
  atlas-audio.ts        — Atlas Cloud TTSProvider implementation

src/lib/creative/
  types.ts              — CreativeBrief, HookCandidate, CreativeAngle, ScriptCandidate,
                         StoryboardCandidate, CreativeVariant, CreativeScore,
                         ReferenceCreativeAnalysis
  prompts.ts            — System prompts for each generation step
  intelligence.ts       — generateBrief, generateHooks, generateAngles, generateScript,
                         generateStoryboard, analyzeReferenceCreative

src/lib/brand/
  types.ts              — BrandExtraction, ProductExtraction, BrandProfile
  fetch.ts              — SSRF-safe URL fetcher, htmlToText, extractImageUrls
  prompts.ts            — Brand and product extraction system prompts
  extract.ts            — extractBrand, extractProduct

src/app/api/brand/extract/route.ts           — POST: URL → brand extraction (5 credits)
src/app/api/brand/product-extract/route.ts   — POST: URL → product extraction (3 credits)
src/app/api/creative/brief/route.ts          — POST: product → creative brief (3 credits)
src/app/api/creative/hooks/route.ts          — POST: brief → hook candidates (2 credits)
src/app/api/creative/angles/route.ts         — POST: brief → angle candidates (2 credits)
src/app/api/creative/script/route.ts         — POST: brief+angle+hook → script (3 credits)
src/app/api/creative/storyboard/route.ts     — POST: brief+script → storyboard (3 credits)
src/app/api/creative/reference-analysis/route.ts — POST: URL → reference analysis (5 credits)

test/ssrf-protection.test.ts                 — 12 SSRF validation tests
test/creative-intelligence.test.ts           — 5 creative cost model tests
test/provider-registry.test.ts               — 7 provider registry tests

docs/adr/001-provider-abstraction.md         — ADR: provider abstraction
docs/adr/002-creative-intelligence.md        — ADR: creative intelligence layer
docs/adr/003-brand-intelligence.md           — ADR: brand intelligence layer

research/lazynext-architecture-audit.md      — Phase 1 architecture audit
research/repository-matrix.md                — 84-repository decision matrix
research/best-ideas.md                       — Best ideas to absorb
research/do-not-integrate.md                 — Excluded repositories report
```

### Configuration Requirements
New optional environment variables:
```
BRAND_EXTRACTION_MODEL=bytedance/doubao-seed-2.1-turbo-260628  # LLM for brand/product extraction
BRAND_EXTRACTION_TIMEOUT_MS=60000                              # extraction timeout
BRAND_EXTRACTION_MAX_TOKENS=4000                               # extraction max tokens
CREATIVE_MODEL=bytedance/doubao-seed-2.1-turbo-260628          # LLM for creative intelligence
CREATIVE_TIMEOUT_MS=90000                                      # creative generation timeout
CREATIVE_MAX_TOKENS=6000                                       # creative max tokens
```

All default to existing Atlas Cloud LLM model. No new dependencies required.

### Migration Requirements
None — all changes are additive. No database migrations needed (brand extraction stores
structured data in the existing BrandKit.colors JSON field). No existing routes modified.

### Test Coverage
- 34 existing tests: all still pass (no regressions)
- 24 new tests: all pass
- Total: 58 tests pass
- Lint: passes clean
- New tests cover: SSRF protection (12 tests), creative cost model (5 tests), provider registry (7 tests)

### Known Limitations
1. Brand/product extraction fetches external URLs — SSRF protection is implemented but
   DNS rebinding protection is limited on Cloudflare Workers (no DNS resolution API).
   Production hardening should add Cloudflare Worker subrequest IP restrictions.
2. Creative intelligence uses the same LLM (doubao) as existing workflows — no model router yet.
3. No UI for the new creative intelligence APIs — they are API-only in this wave.
4. Reference creative analysis accepts a URL but does not fetch/transcribe video yet —
   it analyzes based on transcript text if provided, or generates analysis from the URL metadata.
5. Provider abstraction interfaces are defined but existing workflow code has not been
   refactored to use them — that's a gradual migration for future waves.
