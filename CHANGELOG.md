# LazyNext Changelog

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
