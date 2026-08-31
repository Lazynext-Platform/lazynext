# LazyNext Architecture Audit — 2026-09

> **Status:** Current as of 2026-09-02 (post-TT13 series).
> The previous audit (`research/lazynext-architecture-audit.md`) is superseded.

## 1. Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.3.3 |
| UI | React | 19 |
| Language | TypeScript | 6 |
| Styling | Tailwind CSS | 4 |
| ORM | Prisma | 7.10.0 |
| Edge runtime | Cloudflare Workers (OpenNext) | — |
| Database (prod) | Cloudflare D1 | — |
| Database (local) | SQLite via `better-sqlite3` | — |
| Object storage (prod) | Cloudflare R2 | — |
| Object storage (local) | File-based (`.dev-media/`) | — |
| Auth | NextAuth (JWT, Google + Credentials) | — |
| Billing | Dodo Payments | — |
| AI generation | Atlas Cloud (prod) / mock server (local, port 3099) | — |
| Rate limiting | Cloudflare Rate Limiters | 60/min API, 10/min AI |
| E2E testing | Playwright | — |
| Unit testing | Node test runner | — |

## 2. Database Schema

28→37 Prisma models (including the new Hook model for TT-series Hook Library persistence). Key models for the creative pipeline:

- **User** — id, email, name, credits, password (bcrypt), image
- **WorkflowRun** — persists pipeline state as JSON (`state` column)
- **CreativeTemplate** — built-in (userId=null) and user-saved templates
- **Timeline** / **TimelineVersion** — editor persistence
- **CreativePerformance** — performance learning loop data
- **Hook** — AI-generated hooks persisted with emotional trigger, platform, predicted performance score, and per-user ownership (TT-series)
- **Asset** — persisted pipeline outputs (parent/child grouping)

## 3. Creative Pipeline Architecture

### State machine (`src/lib/creative/pipeline.ts`)

```
brief → script → storyboard → media_generation → audio → edit → compliance → score → publish → completed
```

- `STAGE_ORDER` defines valid stages; template validation derives from it.
- `PIPELINE_COSTS` maps each stage to a credit cost (brief=2, script=3, storyboard=3, media=5, audio=3, edit=2, compliance=4, score=2, publish=3).
- `PipelineState` tracks: pipelineId, config, status, currentStage, stageResults, progress, credits, timestamps.

### Pipeline templates

| Template | Stages | Credits |
|----------|--------|---------|
| `full-creative` | brief → script → storyboard → media → audio → edit → compliance → score → publish | 27 |
| `quick-ad` | brief → script → storyboard → media → score → publish | 18 |
| `video-ad` | brief → script → storyboard → media → audio → edit → score → publish | 23 |
| `compliance-first` | brief → script → compliance → storyboard → media → compliance → score → publish | 26 |
| `ugc` | brief → script → media → audio → score → publish | 18 |

All 5 templates include the `score` quality gate before publish.

### Stage executor (`src/lib/creative/pipeline-executor.ts`)

- Maps each stage to a library function (generateBrief, generateHooks, etc.).
- Calls library functions directly (not HTTP routes) to avoid double-charging credits.
- `executeStage()` wraps each stage with `logToolExecution` telemetry (stage name, userId, cost, duration, success/error).
- `mergeStageResultIntoContext()` flows outputs between stages (brief → script → storyboard → ... → score).
- Stages that depend on external services (media, audio, edit, publish) are best-effort with dry-run fallbacks.

### Pipeline API routes

- `POST /api/creative/pipeline` — create a pipeline from a template or custom config
- `GET/POST /api/creative/pipeline/[id]` — fetch state, advance/pause/resume/cancel/skip/retry/approve
- `GET /api/creative/pipeline/templates` — list available templates

### LL-series creative API routes

- `POST /api/creative/product-brief` — URL → product intelligence → ad angles → scripts → storyboard → generation prompt
- `POST /api/creative/reference-remix` — reference ad analysis → remix brief with self-contained generation prompt
- `POST /api/creative/multi-concept` — 6 divergent ad concepts across psychological triggers
- `POST /api/creative/performance-loop` — past campaign performance → improved creative briefs
- `POST /api/creative/skill-chain-builder` — multi-step skill chains with conditional branching
- `GET/POST /api/ads/meta-safety` / `GET/POST /api/ads/meta-approve` — Meta Ads safety layer (dry-run, approvals, spend caps, audit log)
- `GET/POST /api/ads/google-safety` / `GET/POST /api/ads/google-approve` — Google Ads safety layer (dry-run, approvals, spend caps, audit log)
- `POST /api/creative/brand-guardrails` — AI brand consistency checker (4 credits, ADR-044)
- `POST /api/creative/smart-calendar` — AI-suggested optimal posting times (3 credits, ADR-045)
- `POST /api/creative/competitor-watch` — competitor ad monitoring with alerts (5 credits, ADR-046)
- `POST /api/creative/ad-copy-generator` — platform-specific ad copy for TikTok/Instagram/YouTube (3 credits, ADR-047)
- `POST /api/creative/hook-library` — AI hook library with D1 persistence via Hook model (4 credits, ADR-048)
- `POST /api/creative/brief-template-builder` — creative brief templates with industry presets (4 credits, ADR-049)
- `POST /api/creative/ad-script-writer` — multi-scene ad scripts with visual cues/voiceover/B-roll (5 credits, ADR-050)
- `POST /api/creative/audience-persona-generator` — audience personas with demographics/psychographics (4 credits, ADR-051)
- `POST /api/creative/variant-matrix-generator` — creative variant matrix for A/B testing (5 credits, ADR-052)
- `POST /api/creative/ad-concept-merger` — AI-powered concept merger combining hooks/angles/scripts into one unified ad concept with flow score (5 credits, ADR-053)
- `POST /api/creative/brief-analyzer` — AI-powered brief analyzer auditing briefs for strengths/gaps with score (0-100) and grade (F-A+) (4 credits, ADR-054)
- `POST /api/creative/ad-format-optimizer` — AI-powered format optimizer recommending best ad format based on product/audience/platform/budget/goals (4 credits, ADR-055)
- `POST /api/creative/mood-board-generator` — AI-powered mood boards with color palettes, typography, imagery themes, and emotional tone from brand and style keywords (4 credits, ADR-056)
- `POST /api/creative/ad-performance-predictor` — AI-powered pre-launch performance prediction forecasting CTR, engagement, conversion likelihood, and virality score with strengths, risks, and recommendations (5 credits, ADR-057)
- `POST /api/creative/ab-test-planner-v2` — AI-powered A/B test experiment design with hypothesis, variants, metrics, sample size, duration, confidence level, and success/failure criteria (4 credits, ADR-058)
- `POST /api/creative/hook-tester` — AI-powered hook testing ranking multiple ad hooks by predicted performance before launch (3 credits, ADR-059)
- `POST /api/creative/trend-spotter` — AI-powered trend discovery identifying trending topics, hashtags, and content styles for your niche (5 credits, ADR-060)
- `POST /api/creative/brand-voice-analyzer` — AI-powered brand voice analysis extracting tone, personality, and style guidelines from sample content (4 credits, ADR-061)
- `POST /api/creative/ad-caption-generator` — AI-powered ad captions generating platform-specific captions with emojis, hashtags, and CTAs (3 credits, ADR-062)
- `POST /api/creative/ad-headline-generator` — AI-powered ad headlines generating attention-grabbing headlines optimized for specific platforms with hook types and predicted impact (3 credits, ADR-063)
- `POST /api/creative/angle-finder` — AI-powered angle discovery finding unique marketing angles across psychological triggers with uniqueness scores (4 credits, ADR-064)
- `POST /api/creative/ad-timing-optimizer` — AI-powered ad timing finding optimal times to run ads based on platform, audience, and timezone with confidence scores (3 credits, ADR-065)
- `POST /api/creative/creative-fatigue-detector` — AI-powered fatigue detection detecting when creatives need refreshing from performance metrics with fatigue scores and refresh urgency (4 credits, ADR-066)
- `POST /api/creative/ad-cta-optimizer` — AI-powered CTA optimization generating optimized CTAs with action verbs, psychological triggers, predicted conversion lift, and platform fit (3 credits, ADR-067)
- `POST /api/creative/concept-expander` — expands a seed concept into multiple fully fleshed-out creative directions with title, description, hook, visual direction, tone, format, unique angle, and production difficulty (4 credits, ADR-068)
- `POST /api/creative/ad-story-generator` — generates compelling ad narratives with emotional arcs across 5 story types (transformation, journey, conflict, resolution, aspiration) returning multi-act story with visual notes, voiceover, emotion beats, and CTA integration (5 credits, ADR-069)
- `POST /api/creative/ad-color-palette-generator` — generates optimized color palettes for ad creatives based on product, platform, and emotional goal across 6 emotions (energetic, calm, luxury, trust, playful, urgent) returning palettes with primary/secondary/accent/background/text colors, platform fit, and color psychology (3 credits, ADR-070)
- `POST /api/creative/ad-thumbnail-generator` — AI-powered thumbnail/cover image concept generator for video ads with visual description, text overlay, text position, font style, color scheme, emotion, and predicted CTR score (4 credits, ADR-071)
- `POST /api/creative/ad-font-pairing-generator` — AI-powered font pairing recommendations for ad creatives with heading font, body font, style description, mood, readability score, platform fit, and use case (3 credits, ADR-072)
- `POST /api/creative/ad-hashtag-generator` — AI-powered platform-optimized hashtag generator returning hashtags categorized by type (branded, trending, niche, community, campaign) with estimated reach, competition level, and recommended flag (2 credits, ADR-073)
- `POST /api/creative/creative-scene-generator` — AI-powered detailed scene description generator for ad video shoots with shot type, camera angle, lighting, setting, props, actor notes, dialogue/voiceover, duration, and mood, returning total duration (5 credits, ADR-074)
- `POST /api/creative/ad-music-mood-matcher` — AI-powered music genre/mood matcher for ad content returning music recommendations with genre, subGenre, mood, tempoBPM, energyLevel (1-10), instruments, description, bestForScene, and licenseType (3 credits, ADR-075)
- `POST /api/creative/ad-voiceover-script-generator` — AI-powered voiceover script generator for ads returning a structured script with segments (segmentNumber, text, timing, direction, emphasis, pauseAfter), totalDuration, wordsPerMinute, and toneNotes (4 credits, ADR-076)
- `POST /api/creative/creative-brief-generator` — AI-powered complete creative brief generator from minimal input returning a structured brief with objective, targetAudience, keyMessage, tone, deliverables, timeline, budgetGuidance, successMetrics, creativeDirection, and platformRecommendations (4 credits, ADR-077)
- `POST /api/creative/ad-placement-strategist` — AI-powered ad placement strategist returning a strategy with summary, placements (platform, placementType, format, audienceFit, estimatedCPM, estimatedReach, expectedPerformance, priority), budgetAllocation, timeline, and risks (5 credits, ADR-078)
- `POST /api/creative/ad-ab-test-name-generator` — AI-powered A/B test name generator returning test names with variant labels, hypothesis, category, and description (2 credits, ADR-079)
- `POST /api/creative/creative-hook-revamp-generator` — AI-powered hook revamp generator taking an existing hook and generating revamped versions with different angles, emotional triggers, and formats, returning revamps with revampedHook, angle, emotionalTrigger, formatChange, predictedLift, and reasoning (3 credits, ADR-080)
- `POST /api/creative/ad-audience-segment-builder` — AI-powered audience segment builder for ad targeting returning segments with demographics (ageRange, gender, location, income), interests, behaviors, platformTargeting, estimatedReach, recommendedAdFormat, and priority (4 credits, ADR-081)
- `POST /api/creative/creative-concept-validator` — AI-powered creative concept validator returning a validation report with overallScore (0-100), grade (F-A+), platformFit, brandSafety, engagementPotential, clarity, originality, issues (with severity, description, suggestion), strengths, recommendations, and verdict (5 credits, ADR-082)
- `POST /api/creative/ad-emotion-analyzer` — AI-powered emotional impact analyzer for ad content analyzing dominant emotions, emotion scores, emotional journey, resonance, authenticity, and improvement recommendations (3 credits, ADR-083)
- `POST /api/creative/creative-format-converter` — AI-powered creative content converter between ad formats (long-form, short-form, image-ad, video-script, carousel, story) with platform optimizations (4 credits, ADR-084)
- `POST /api/creative/ad-budget-allocator` — AI-powered ad budget allocator across platforms returning percentages, amounts, expected outcomes, and rationale (4 credits, ADR-085)
- `POST /api/creative/creative-trend-adapter` — AI-powered creative content adapter to current trends returning relevance scores, timing advice, and longevity scoring (3 credits, ADR-086)
- `POST /api/creative/ad-creative-sequencer` — AI-powered multi-touch campaign narrative sequencer sequencing multiple creatives into a coherent campaign narrative with stages, transitions, and timing (4 credits, ADR-087)
- `POST /api/creative/brand-story-architect` — AI-powered brand story arc builder building brand story arcs with acts, character roles, conflict, resolution, and ad-ready story beats (5 credits, ADR-088)
- `POST /api/creative/ad-localization-adapter` — AI-powered ad localization adapter adapting ads for different regional/cultural markets with cultural notes, idiom adaptations, color/symbol considerations, and compliance flags (4 credits, ADR-089)
- `POST /api/creative/creative-performance-forecaster` — AI-powered creative performance forecaster forecasting creative performance with confidence intervals for CTR, engagement, conversion, and reach (5 credits, ADR-090)
- `POST /api/creative/ad-sentiment-tuner` — AI-powered ad sentiment tuner tuning ad sentiment with before/after scores, word changes, and audience alignment (3 credits, ADR-091)
- `POST /api/creative/creative-hook-matrix-generator` — AI-powered hook matrix generator generating a matrix of hooks across emotional triggers and platforms with predicted scores (5 credits, ADR-092)
- `POST /api/creative/ad-creative-rotator` — AI-powered creative rotator generating creative variations with a rotation schedule and fatigue resistance scores (4 credits, ADR-093)
- `POST /api/creative/brand-voice-consistency-checker` — AI-powered brand voice consistency checker checking content for brand voice consistency with dimension scores, violations, and corrections (4 credits, ADR-094)

Credit handling:
- Credits are deducted before stage execution.
- Failed stages refund credits via `refundCredits` (centralized in `src/lib/credits.ts`).
- `approve` re-run of publish does not charge additional credits.
- Pipeline stage charges use an idempotency key (`pipeline:{pipelineId}:{stage}`) stored in `CreditLedger.idempotencyKey` with a unique constraint, preventing double-charging on retry or partial wave failure.
- A `charged` flag on `PipelineStageResult` provides in-memory idempotency within a single request.

### Asset persistence (`src/lib/creative/asset-persist.ts`)

- `persistAsset()` — saves a single asset to D1.
- `persistPipelineAssets()` — persists a parent `creative_package` asset + child assets for each stage output.
- `derivePipelineChildAssets()` — derives child asset specs from pipeline state.
- Child assets are created for: media_generation (storyboard), audio (script), edit (script), compliance (score), publish (variants).
- Brief, script, storyboard, and score stages do NOT create child assets.
- Persistence failures are logged via `logToolExecution` telemetry (not silently swallowed).

### LL-series pipeline extensions

The LL series added four new creative capabilities that plug into the pipeline architecture:

- **Product Brief** (`/product-brief`) — URL → product intelligence → ad angles → scripts → storyboard → Atlas-ready generation prompt. 5 credits. See ADR-032.
- **Reference Remix** (`/reference-remix`) — reference ad analysis (hooks, angles, pacing, visual style, emotional beats, CTA) → remix brief with self-contained generation prompt. 4 credits. See ADR-033.
- **Multi-Concept** (`/multi-concept`) — 6 divergent ad concepts across psychological triggers (fear, aspiration, humor, urgency, curiosity, social_proof) with heuristic recommendation and A/B fork support. 6 credits. See ADR-034.
- **Performance Loop** (`/performance-loop`) — queries `CreativePerformance` records, feeds insights to Atlas LLM, generates improved briefs with expected lift. 5 credits. See ADR-037.

All four features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions, with dry-run/fallback behavior when Atlas is local or the API key is missing.

## 4. Workflow Builder

### Architecture (`src/app/workflow-builder/page.tsx`)

- Visual builder for conditional stage configurations.
- Supports all 10 stages including `score`.
- `handleRunAsPipeline()` creates a pipeline via `/api/creative/pipeline` and navigates to `/pipeline?id=...`.
- Passes complete campaign configuration: name, productName, productDescription, brandName, targetAudience, platforms, onComplete, stage configuration.

### Workflow-to-pipeline bridge (`configFromWorkflow()` in `pipeline.ts`)

- Maps workflow stage definitions to `PipelineStageConfig` objects.
- Preserves parallel execution waves (`parallelWith` links).
- Supports conditional stage enabling (platform equals, content type contains, etc.).

## 5. Creative Score

### Model (`src/lib/creative/types.ts`)

```typescript
interface CreativeScore {
  hookStrength: number;      // 1-10
  clarity: number;            // 1-10
  productVisibility: number;  // 1-10
  brandConsistency: number;   // 1-10
  emotionalImpact: number;    // 1-10
  novelty: number;            // 1-10
  platformFit: number;        // 1-10
  ctaStrength: number;        // 1-10
  audioQuality: number;       // 1-10
  visualQuality: number;      // 1-10
  complianceRisk: number;     // 0-10 (higher = more risk)
  overall: number;            // weighted average (1-10 scale)
  notes: string;
}
```

The `overall` score is on a **1-10 scale** (weighted average of 1-10 dimensions), NOT 0-100.

### Score stage integration

- Score is present in all 5 pipeline templates.
- Score is rendered in the PipelineOrchestrator score viewer with i18n labels.
- Creative Studio pipeline mode extracts and displays score results.
- Creative Studio chain mode displays score as `/10`.
- Workflow Builder exposes score as a configurable stage.

## 6. Provider Abstraction

### Registry and router

- `src/lib/providers/registry.ts` — provider registry with capability mapping.
- `src/lib/providers/router.ts` — model router with plan-tier filtering.
- `src/lib/providers/model-helpers.ts` — helper functions for model selection.
- `logProviderRouting()` — telemetry for routing decisions.

### Plan tiers

- `getUserPlanTier(userId)` infers tier (free/starter/pro/elite) from credit purchase history.
- All creative API routes call `getUserPlanTier()` and pass tier to intelligence functions.
- The router selects models based on tier; `CREATIVE_MODEL` env override takes precedence.

## 7. Clip Editor Integration

### Handoff

- `/clip-editor?pipelineId=...&mediaUrl=...` — deep link from pipeline edit stage.
- Fetches `/api/creative/pipeline/${pipelineId}`, reads `editResult.cutPlan`, loads as clips.
- Typed structures: `EditResult` and `EditCut` in `src/lib/creative/types.ts`.
- Surfaces 404/403/401/network errors with localized messages.

## 8. Internationalization

### Coverage

- 13 locales: en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id. All 13 locales now have complete feature translations (including the JJ-, LL-, RR-, SS-, TT-, TT3-, TT4-, TT5-, TT6-, TT7-, TT8-, TT9-, TT10-, TT11-, TT12-, and TT13-series features).
- RTL support for Arabic (`dir="rtl"`, `lang="ar"`).
- Cookie-based locale switching.

### Pipeline i18n

The `pipeline` namespace includes:
- Stage labels (stageBrief, stageScript, ..., stageCompleted)
- Control labels (pause, resume, retry, skip, approvePublish)
- Form labels (pipelineName, productName, productDescription, brandName, targetAudience, platforms)
- Configuration (configuration, autoAdvance, enabled, onComplete, publish, review, export)
- Execution (progress, creditsUsed, estTimeLeft, currentStage, advance, cancel, newPipeline)
- Output viewer labels (objective, platform, format, audience, product, hook, cta, visualDirection, hooks, angles, scriptLabel, scene, ratio, shot, mediaUrls, voiceover, noAudio, totalDuration, audio, cutsInPlan, openInClipEditor, status, onCompleteLabel, results)
- Templates (templates, templatesDesc, loadingTemplates, noTemplates, credits, stages, startPipeline, pipelineHistory, loadingHistory, noPipelines)

### Creative Studio i18n

- Score dimension labels (hookStrength, clarity, productVisibility, brandConsistency, emotionalImpact, novelty, platformFit, ctaStrength, audioQuality, visualQuality, complianceRisk, overall)
- Pipeline mode help text includes score stage.
- Chain mode labels.

### Workflow Builder i18n

- Stage labels and descriptions including `score`.
- Stage descriptions for all 10 stages.

## 9. Telemetry

### Structured logging (`src/lib/telemetry.ts`)

- `logToolExecution()` — logs tool name, userId, cost, duration, success, error, model.
- `logProviderRouting()` — logs capability, planTier, selectedModel, fallback.
- Logs are emitted as JSON via `console.log` (captured by Cloudflare Workers).

### Instrumentation points

- `executeStage()` — per-stage execution telemetry (Q series).
- Pipeline API routes — persistence failure telemetry (O series).
- Provider router — routing decision telemetry.

## 10. E2E Testing

### Infrastructure

- `playwright.config.ts` — 3 projects:
  - `chromium` — unauthenticated desktop tests
  - `mobile-chrome` — unauthenticated mobile tests
  - `chromium-auth` — authenticated tests with `storageState`
- `e2e/global-setup.ts` — logs in test account via NextAuth credentials API, saves storage state.
- `e2e/.auth/user.json` — saved session (gitignored).

### Test coverage

- **440+ unauthenticated tests** — smoke tests, page loads, auth prompts, responsive, RTL (including 30 new page tests for brand-guardrails, smart-calendar, competitor-watch, plus page tests for the 6 TT-series features, 3 TT3-series features, and 3 TT4-series features).
- **9 authenticated API tests** for RR-series features (brand-guardrails, smart-calendar, competitor-watch).
- **12+ authenticated pipeline tests** — session, pipeline creation, templates, page loads.
- **12+ authenticated user flow tests** — dashboard, my-work, settings, admin, credits, full pipeline execution, A/B.
- Total: 1052+ tests (440+ unauthenticated + 160+ authenticated), 0 skipped, 0 failed.

### Test account

- Email: `test@lazynext.local`
- Password: `Test1234!`
- Credits: 150 (initial), admin access via `ADMIN_EMAILS`.

## 11. Cross-Feature Handoffs

### Workflow Builder → Pipeline

- Preserves: name, productName, productDescription, brandName, targetAudience, platforms, onComplete, stage configuration.
- Navigates to `/pipeline?id=...` via `router.push()` (Q series fix).

### Pipeline → Clip Editor

- Passes: pipelineId, mediaUrl.
- Fetches edit output, loads cutPlan as clips.
- Reports loading errors with localized messages.

### Creative Studio → Pipeline

- Pipeline mode creates a `full-creative` pipeline and auto-advances through all stages.
- Completion block extracts brief, script, storyboard, and score results.

## 12. Local Development

### Setup

- `npm run dev` — starts on port 3100 with `BUILD_TARGET=local` (P series fix).
- `npm run mock-atlas` — starts mock Atlas server on port 3099.
- Local Prisma: SQLite via `better-sqlite3` (`src/lib/prisma.local.ts`).
- Local media: file-based storage in `.dev-media/` (`src/lib/media-storage.local.ts`).
- Platform modules are selected by `scripts/prepare-platform.mjs` based on `BUILD_TARGET`.

### Verification

```bash
npm run lint    # ESLint — 0 errors, 0 warnings
npm test        # Node test runner — 3049+ tests
npx playwright test  # E2E — 1052+ tests, 0 skipped
npm run build   # Production build (Cloudflare target)
```

## 13. Production Deployment

- `npm run cf:deploy` — builds with OpenNext for Cloudflare, deploys via Wrangler.
- Worker URL: `https://lazynext.dry-hall-6a50.workers.dev`
- Custom domain: `https://lazynext.com`
- D1 database: `lazynext-db`
- R2 bucket: `lazynext-studio-media`
- Rate limiters: `API_RATE_LIMITER` (60/min), `AI_RATE_LIMITER` (10/min)

## 14. Known Gaps and Future Work

### Remaining

- **Architecture audit** — this document should be updated when major changes are made.
- **Authenticated E2E for billing/checkout** — no test for actual checkout flow (requires Dodo Payments).
- **Edit stage real rendering** — RendoBar integration is wired (ADR-043) but not activated (needs API key).
- **Publish stage real integrations** — no real ad-platform API credentials; dry-run returns `dry_run` status.
- **External credentials** — all 12 external integrations (Atlas Cloud, 4 OAuth platforms, Google Ads, Meta Ads, GA4, Dodo Payments, Resend email, alert webhook) are code-complete but require credentials.
- **Video rendering** — RendoBar provider is integrated in `src/lib/providers/video-render.ts` with webhook endpoint at `/api/webhooks/rendobar`, but needs `VIDEO_RENDER_API_URL` and `VIDEO_RENDER_API_KEY` secrets to activate.

### Resolved in recent series

- D1 persistence for safety audit logs and approval state (OO, ADR-040)
- Authenticated E2E for LL-series features (OO)
- Credit top-up in global-setup for authenticated E2E (NN)
- Navigation horizontal overflow at 1920px (NN)
- Cookie consent dialog selector conflict (NN)
- i18n for 12 non-English locales — 8 new feature namespaces (MM)
- App catalog metadata for 8 new features (MM)
- Score viewer field mapping (N)
- Compliance viewer field mapping (P)
- Auto-advance from server config (N)
- Clip editor error surfacing (N)
- Workflow Builder config passthrough (N)
- Score in all templates (P)
- Stage-level telemetry (P)
- Authenticated E2E infrastructure (P)
- Pipeline UI i18n (Q)
- Score scale display fix (Q)
- Lint warning reduction (Q)
- Dev script BUILD_TARGET fix (P)
- Pipeline executor error context — PipelineStageError class (R)
- Refund helper centralization — refundCredits in credits.ts (R, S)
- Workflow Builder product name — dedicated productName/productDescription inputs (R)
- Server-side auto-advance loop — bounded by 75s budget (R)
- Compliance stage richer inputs — hook, angle, CTA, storyboard prompts (R)
- Audio stage TTS via dispatchMediaService — plan-tier aware model selection (R)
- Dry-run publish status clarity — returns 'dry_run' instead of 'published' (R, S)
- Parallel wave execution correctness — all in_progress stages executed (S)
- Retry auto-advance — retry chains into auto-advance loop (S)
- autoAdvance defaults to false for publish/review — prevents silent timeouts (S)
- Auto-advance telemetry — pipeline_auto_advance event (S)
- Credit double-charging fix — removed duplicate first-stage deduction in creation route (T)
- Idempotent credit deductions — charged flag on PipelineStageResult + idempotencyKey in CreditLedger with @@unique (T, U)
- Partial wave failure handling — completeStage() marks successful stages completed before failStage (T)
- Per-wave persistence — POST advance saves state after each wave, not just at end (T)
- Publish autoAdvance gating — publish stage defaults to autoAdvance=false regardless of onComplete (T)
- Parallel wave integration tests — 10 new tests for completeStage, retryStage charged reset, publish gating (T)
- Creative Studio publish hand-off — Approve & Publish button when pipeline reaches publish stage (U)
- Cancel UX warning — tooltip and note explaining cancel limitation during auto-advance (U)
- Client auto-advance timer removed — server handles auto-advance; client timer was redundant (U)
- Dry-run TTS placeholder fixed — valid silent WAV data URL instead of invalid base64 (U)
- Estimated credits transparency — templates show pre-approval to total range (U)
- refundSync dead code removed from gen-task.ts (U)
- Google Ads Safety Layer — mirrors Meta Safety for Google Ads (LL, ADR-036)
- Creative Performance Loop — past performance → improved briefs (LL, ADR-037)
- Viral Content Analyzer UI — renders virality score/grade/factors (LL, ADR-038)
- Agent Skill Chain Builder — conditional branching + A/B forking (LL, ADR-039)
- App catalog metadata — 8 new feature titles/descriptions in `appCatalog.ts` (LL)
- Pipeline i18n fix — `pipeline.title` was incorrectly nested inside `legal` object in en.ts (RR)
- Missing h1 on /dashboard, /creative-studio, /ugc-studio, /observability unauthenticated views (RR)
- Production observability aggregation — admin-only metrics API + dashboard (QQ, ADR-042)
- Creative Studio chain mode unification — uses pipeline API for durable state (QQ, ADR-041)
- Video rendering provider boundary — external service interface with dry-run (QQ, ADR-043)
- RendoBar integration — compose API, EDL-to-timeline mapper, webhook endpoint (SS)
- i18n for 3 new RR features across 12 non-English locales (SS)
- E2E coverage for 3 new features — 30 page tests + 9 authenticated API tests (SS)
- App catalog + dashboard Quick Create for 3 new features (SS)
- Ad Copy Generator — platform-specific ad copy for TikTok/Instagram/YouTube (TT, ADR-047)
- Hook Library — AI hook library with D1 persistence via Hook Prisma model (TT, ADR-048)
- Brief Template Builder — creative brief templates with industry presets (TT, ADR-049)
- Ad Script Writer — multi-scene ad scripts with visual cues/voiceover/B-roll (TT, ADR-050)
- Audience Persona Generator — audience personas with demographics/psychographics (TT, ADR-051)
- Creative Variant Matrix — variant matrix across hooks/angles/formats/platforms (TT, ADR-052)
- D1 persistence for hooks — new Hook Prisma model with per-user ownership (TT)
- App catalog + dashboard Quick Create for 6 new TT features (TT)
- Ad Concept Merger — AI-powered concept merger with flow score (TT3, ADR-053)
- Creative Brief Analyzer — AI-powered brief analyzer with score/grade (TT3, ADR-054)
- Ad Format Optimizer — AI-powered format optimizer (TT3, ADR-055)
- /calendar production audit fix — page no longer makes API calls during loading state (TT3)
- Mood Board Generator — AI-powered mood boards with color palettes/typography/imagery/emotional tone (TT4, ADR-056)
- Ad Performance Predictor — AI-powered pre-launch performance prediction with CTR/engagement/conversion/virality forecasts (TT4, ADR-057)
- Creative A/B Test Planner — AI-powered A/B test experiment design with hypothesis/variants/metrics/sample size/duration/confidence level (TT4, ADR-058)
- Nav link test fix — Performance vs Performance Predictor exact match (TT4)
- i18n for 3 new TT4 features across all 13 locales — moodBoardGenerator, adPerformancePredictor, abTestPlannerV2 namespaces (TT4)
- Creative Hook Tester — AI-powered hook testing ranking hooks by predicted performance (TT5, ADR-059)
- Trend Spotter — AI-powered trend discovery for niche topics/hashtags/content styles (TT5, ADR-060)
- Brand Voice Analyzer — AI-powered brand voice analysis extracting tone/personality/style (TT5, ADR-061)
- Ad Caption Generator — AI-powered ad captions with platform-specific emojis/hashtags/CTAs (TT5, ADR-062)
- i18n for 4 new TT5 features across all 13 locales — hookTester, trendSpotter, brandVoiceAnalyzer, adCaptionGenerator namespaces (TT5)
- Ad Headline Generator — AI-powered ad headlines with platform optimization, hook types, and predicted impact (TT6, ADR-063)
- Creative Angle Finder — AI-powered angle discovery across psychological triggers with uniqueness scores (TT6, ADR-064)
- Ad Timing Optimizer — AI-powered ad timing based on platform/audience/timezone with confidence scores (TT6, ADR-065)
- Creative Fatigue Detector — AI-powered fatigue detection from performance metrics with fatigue scores and refresh urgency (TT6, ADR-066)
- i18n for 4 new TT6 features across all 13 locales — adHeadlineGenerator, angleFinder, adTimingOptimizer, creativeFatigueDetector namespaces (TT6)
- Ad CTA Optimizer — AI-powered CTA optimization with action verbs, psychological triggers, predicted conversion lift, and platform fit (TT7, ADR-067)
- Creative Concept Expander — expands a seed concept into multiple fully fleshed-out creative directions with title, description, hook, visual direction, tone, format, unique angle, and production difficulty (TT7, ADR-068)
- Ad Story Generator — generates compelling ad narratives with emotional arcs across 5 story types (transformation, journey, conflict, resolution, aspiration) with multi-act story, visual notes, voiceover, emotion beats, and CTA integration (TT7, ADR-069)
- Ad Color Palette Generator — generates optimized color palettes for ad creatives based on product, platform, and emotional goal across 6 emotions (energetic, calm, luxury, trust, playful, urgent) with primary/secondary/accent/background/text colors, platform fit, and color psychology (TT7, ADR-070)
- i18n for 4 new TT7 features across all 13 locales — adCtaOptimizer, conceptExpander, adStoryGenerator, adColorPaletteGenerator namespaces (TT7)
- Ad Thumbnail Generator — AI-powered thumbnail/cover image concept generator for video ads with visual description, text overlay, text position, font style, color scheme, emotion, and predicted CTR score (TT8, ADR-071)
- Ad Font Pairing Generator — AI-powered font pairing recommendations for ad creatives with heading font, body font, style description, mood, readability score, platform fit, and use case (TT8, ADR-072)
- Ad Hashtag Generator — AI-powered platform-optimized hashtag generator returning hashtags categorized by type (branded, trending, niche, community, campaign) with estimated reach, competition level, and recommended flag (TT8, ADR-073)
- Creative Scene Generator — AI-powered detailed scene description generator for ad video shoots with shot type, camera angle, lighting, setting, props, actor notes, dialogue/voiceover, duration, and mood, returning total duration (TT8, ADR-074)
- i18n for 4 new TT8 features across all 13 locales — adThumbnailGenerator, adFontPairingGenerator, adHashtagGenerator, creativeSceneGenerator namespaces (TT8)
- Ad Music Mood Matcher — AI-powered music genre/mood matcher for ad content with genre, subGenre, mood, tempoBPM, energyLevel, instruments, bestForScene, and licenseType (TT9, ADR-075)
- Ad Voiceover Script Generator — AI-powered voiceover script generator for ads with structured segments, totalDuration, wordsPerMinute, and toneNotes (TT9, ADR-076)
- Creative Brief Generator — AI-powered complete creative brief generator from minimal input with objective, targetAudience, keyMessage, tone, deliverables, timeline, budgetGuidance, successMetrics, creativeDirection, and platformRecommendations (TT9, ADR-077)
- Ad Placement Strategist — AI-powered ad placement strategist with placements, budgetAllocation, timeline, and risks (TT9, ADR-078)
- i18n for 4 new TT9 features across all 13 locales — adMusicMoodMatcher, adVoiceoverScriptGenerator, creativeBriefGenerator, adPlacementStrategist namespaces (TT9)
- Ad A/B Test Name Generator — AI-powered A/B test name generator returning test names with variant labels, hypothesis, category, and description (TT10, ADR-079)
- Creative Hook Revamp Generator — AI-powered hook revamp generator taking an existing hook and generating revamped versions with different angles, emotional triggers, and formats, returning revamps with revampedHook, angle, emotionalTrigger, formatChange, predictedLift, and reasoning (TT10, ADR-080)
- Ad Audience Segment Builder — AI-powered audience segment builder for ad targeting returning segments with demographics, interests, behaviors, platformTargeting, estimatedReach, recommendedAdFormat, and priority (TT10, ADR-081)
- Creative Concept Validator — AI-powered creative concept validator returning a validation report with overallScore, grade, platformFit, brandSafety, engagementPotential, clarity, originality, issues, strengths, recommendations, and verdict (TT10, ADR-082)
- i18n for 4 new TT10 features across all 13 locales — adABTestNameGenerator, creativeHookRevampGenerator, adAudienceSegmentBuilder, creativeConceptValidator namespaces (TT10)
- Ad Emotion Analyzer — AI-powered emotional impact analyzer for ad content with dominant emotions, scores, journey, resonance, authenticity, and recommendations (TT11, ADR-083)
- Creative Format Converter — AI-powered creative content converter between ad formats with platform optimizations (TT11, ADR-084)
- Ad Budget Allocator — AI-powered ad budget allocator across platforms with percentages, amounts, expected outcomes, and rationale (TT11, ADR-085)
- Creative Trend Adapter — AI-powered creative content adapter to current trends with relevance scores, timing advice, and longevity scoring (TT11, ADR-086)
- i18n for 4 new TT11 features across all 13 locales — adEmotionAnalyzer, creativeFormatConverter, adBudgetAllocator, creativeTrendAdapter namespaces (TT11)
- Ad Creative Sequencer — AI-powered multi-touch campaign narrative sequencer with stages, transitions, and timing (TT12, ADR-087)
- Brand Story Architect — AI-powered brand story arc builder with acts, character roles, conflict, resolution, and ad-ready story beats (TT12, ADR-088)
- Ad Localization Adapter — AI-powered ad localization adapter with cultural notes, idiom adaptations, color/symbol considerations, and compliance flags (TT12, ADR-089)
- Creative Performance Forecaster — AI-powered creative performance forecaster with confidence intervals for CTR, engagement, conversion, and reach (TT12, ADR-090)
- i18n for 4 new TT12 features across all 13 locales — adCreativeSequencer, brandStoryArchitect, adLocalizationAdapter, creativePerformanceForecaster namespaces (TT12)
- Ad Sentiment Tuner — AI-powered ad sentiment tuner with before/after scores, word changes, and audience alignment (TT13, ADR-091)
- Creative Hook Matrix Generator — AI-powered hook matrix generator producing a matrix of hooks across emotional triggers and platforms with predicted scores (TT13, ADR-092)
- Ad Creative Rotator — AI-powered creative rotator generating creative variations with a rotation schedule and fatigue resistance scores (TT13, ADR-093)
- Brand Voice Consistency Checker — AI-powered brand voice consistency checker with dimension scores, violations, and corrections (TT13, ADR-094)
- i18n for 4 new TT13 features across all 13 locales — adSentimentTuner, creativeHookMatrixGenerator, adCreativeRotator, brandVoiceConsistencyChecker namespaces (TT13)

## 15. LL-Series Features

The LL series extended the creative platform with four new capabilities, documented in ADRs 036-039. ADR-040 (OO series) documents D1 persistence for safety audit logs. ADRs 041-043 (QQ series) document chain mode unification, observability aggregation, and video rendering. ADRs 044-046 (RR series) document Brand Guardrails, Smart Calendar, and Competitor Watch. ADRs 047-052 (TT series) document Ad Copy Generator, Hook Library, Brief Template Builder, Ad Script Writer, Audience Persona Generator, and Creative Variant Matrix. ADRs 053-055 (TT3 series) document Ad Concept Merger, Creative Brief Analyzer, and Ad Format Optimizer. ADRs 056-058 (TT4 series) document Mood Board Generator, Ad Performance Predictor, and Creative A/B Test Planner. ADRs 059-062 (TT5 series) document Creative Hook Tester, Trend Spotter, Brand Voice Analyzer, and Ad Caption Generator. ADRs 063-066 (TT6 series) document Ad Headline Generator, Creative Angle Finder, Ad Timing Optimizer, and Creative Fatigue Detector. ADRs 067-070 (TT7 series) document Ad CTA Optimizer, Creative Concept Expander, Ad Story Generator, and Ad Color Palette Generator. ADRs 071-074 (TT8 series) document Ad Thumbnail Generator, Ad Font Pairing Generator, Ad Hashtag Generator, and Creative Scene Generator. ADRs 075-078 (TT9 series) document Ad Music Mood Matcher, Ad Voiceover Script Generator, Creative Brief Generator, and Ad Placement Strategist. ADRs 079-082 (TT10 series) document Ad A/B Test Name Generator, Creative Hook Revamp Generator, Ad Audience Segment Builder, and Creative Concept Validator. ADRs 083-086 (TT11 series) document Ad Emotion Analyzer, Creative Format Converter, Ad Budget Allocator, and Creative Trend Adapter. ADRs 087-090 (TT12 series) document Ad Creative Sequencer, Brand Story Architect, Ad Localization Adapter, and Creative Performance Forecaster. ADRs 091-094 (TT13 series) document Ad Sentiment Tuner, Creative Hook Matrix Generator, Ad Creative Rotator, and Brand Voice Consistency Checker. ADRs 095-098 (TT14 series) document Ad Persona Matcher, Creative Concept Expander Pro, Ad Competitive Intelligence, and Creative Quality Scorer. ADRs 099-102 (TT15 series) document Ad Audience Resonance Predictor, Creative Format Recommender, Ad Creative Lifecycle Manager, and Creative Sentiment Journey Mapper. ADRs 103-106 (TT16 series) document Ad Creative A/B Test Simulator, Creative Visual Hierarchy Analyzer, Ad Audience Pain Point Mapper, and Creative Messaging Framework Builder. ADRs 107-110 (TT17 series) document Ad Creative Burnout Detector, Creative Ad Concept Synthesizer, Ad Audience Psychographic Profiler, and Creative Ad Tone Calibrator. ADRs 111-114 (TT18 series) document Creative Ad Format Innovator, Ad Creative Story Arc Designer, Creative Ad Persuasion Strategist, and Ad Creative Hook Timing Optimizer. ADRs 115-118 (TT19 series) document Creative Ad Metaphor Generator, Ad Creative Sensory Enhancer, Creative Ad Pattern Interrupt Designer, and Ad Creative Social Proof Architect. ADRs 119-122 (TT20 series) document Creative Ad Anticipation Builder, Ad Creative Contrast Amplifier, Creative Ad Micro-Moment Designer, and Ad Creative Emotion Sequencer. ADRs 001-094 now total 94 architecture decision records in `docs/adr/`.

### Google Ads Safety Layer (`/google-safety`)

- Mirrors the Meta Ads Safety Layer (ADR-035) for Google Ads.
- Dry-run mode, admin approval workflow, spend caps ($200 daily / $100 campaign), mutation caps, blocked delete actions, 24h-TTL audit log.
- API: `GET/POST /api/ads/google-safety`, `GET/POST /api/ads/google-approve`. See ADR-036.
- Unit tests: 35.

### Creative Performance Loop (`/performance-loop`)

- Closes the loop between past campaign performance and future briefs.
- Queries `CreativePerformance` records, feeds insights to Atlas LLM, generates improved briefs with expected lift.
- 5 credits. API: `POST /api/creative/performance-loop`. See ADR-037.
- Unit tests: 18.

### Viral Content Analyzer (`/viral-analyzer`)

- UI page for the existing viral-analysis API.
- Renders virality score (0-100), grade (F-A+), factors, shareability, hook analysis, emotional journey, pacing, trend alignment, viral mechanics, audience psychology, and improvement recommendations.
- 6 credits. API: `POST /api/creative/viral-analysis` (existing). See ADR-038.

### Agent Skill Chain Builder (`/skill-chains`)

- Enhanced skill chaining with conditional branching (5 condition types: `output_contains`, `output_gt`, `output_lt`, `output_equals`, `platform_is`).
- 3 built-in enhanced chains (adaptive-hook, platform-optimized, performance-driven).
- 8 credits. API: `POST /api/creative/skill-chain-builder`. See ADR-039.
- Unit tests: 39.

### New UI pages

- `/google-safety` — Google Ads safety dashboard
- `/performance-loop` — performance-to-brief loop
- `/viral-analyzer` — viral content analysis
- `/skill-chains` — skill chain builder

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Unit tests added: 35 + 18 + 39 = 92 new tests (total unit tests now 1786, up from 1412+).

### Dashboard Quick Create

The dashboard "Quick Create" grid now includes all production apps plus the 63 newest features (Creator Kits, Brand Concepts, Clip Editor, Media Services, Product Brief, Reference Remix, Multi-Concept, Meta Safety, Google Safety, Performance Loop, Viral Analyzer, Skill Chains, Brand Guardrails, Smart Calendar, Competitor Watch, Ad Copy Generator, Hook Library, Brief Template Builder, Ad Script Writer, Audience Persona Generator, Creative Variant Matrix, Ad Concept Merger, Brief Analyzer, Ad Format Optimizer, Mood Board Generator, Ad Performance Predictor, Creative A/B Test Planner, Creative Hook Tester, Trend Spotter, Brand Voice Analyzer, Ad Caption Generator, Ad Headline Generator, Creative Angle Finder, Ad Timing Optimizer, Creative Fatigue Detector, Ad CTA Optimizer, Creative Concept Expander, Ad Story Generator, Ad Color Palette Generator, Ad Thumbnail Generator, Ad Font Pairing Generator, Ad Hashtag Generator, Creative Scene Generator, Ad Music Mood Matcher, Ad Voiceover Script Generator, Creative Brief Generator, Ad Placement Strategist, Ad A/B Test Name Generator, Creative Hook Revamp Generator, Ad Audience Segment Builder, Creative Concept Validator, Ad Emotion Analyzer, Creative Format Converter, Ad Budget Allocator, Creative Trend Adapter, Ad Creative Sequencer, Brand Story Architect, Ad Localization Adapter, Creative Performance Forecaster, Ad Sentiment Tuner, Creative Hook Matrix Generator, Ad Creative Rotator, Brand Voice Consistency Checker). The 59 newest features (Product Brief through Brand Voice Consistency Checker) are in the nav overflow menu.

## 16. RR-Series Features

The RR series added three new creative capabilities, documented in ADRs 044-046. All three features have dry-run/fallback behavior, use existing auth/credit/withAtlas conventions, and include i18n translations across all 13 locales.

### Brand Guardrails (`/brand-guardrails`)

- AI-powered brand consistency checker — analyzes creatives against brand kit for voice, visual, and messaging compliance.
- Returns score (0-100), grade (F-A+), violations with severity (critical/warning/info), and recommendations.
- 4 credits. API: `POST /api/creative/brand-guardrails`. See ADR-044.
- Unit tests: 26.

### Smart Calendar (`/smart-calendar`)

- Multi-platform content calendar with AI-suggested optimal posting times.
- Considers platform best practices, audience timezone, content type, and historical performance.
- 3 credits. API: `POST /api/creative/smart-calendar`. See ADR-045.
- Unit tests: 36.

### Competitor Watch (`/competitor-watch`)

- Competitor ad monitoring with automatic creative analysis and alerts.
- Extracts hooks, angles, CTAs, visual style, emotional triggers, pricing strategy.
- Generates competitive gaps, counter-strategies, and alerts (new_strategy, pricing_change, new_ad).
- 5 credits. API: `POST /api/creative/competitor-watch`. See ADR-046.
- Unit tests: 23.

### Production audit fixes (RR)

- `pipeline.title` translation was incorrectly nested inside the `legal` object in `en.ts` — moved `pipeline`, `personas`, `variantMatrix`, and `fatigue` to top-level keys.
- Added missing `<h1>` elements to `/dashboard`, `/creative-studio`, `/ugc-studio`, and `/observability` unauthenticated views.

### Video rendering research (RR)

- Researched RendoBar, Cloudflare Stream, and custom GPU workers via Firecrawl.
- RendoBar recommended: native EDL/JSON timeline support, Cloudflare Workers SDK, signed webhooks.
- See `research/video-rendering-services.md` and ADR-043.

### SS-Series: i18n, E2E, App Catalog, RendoBar Integration

- Added i18n translations for all 3 RR features across 12 non-English locales.
- Added 39 new E2E tests (30 page tests + 9 authenticated API tests).
- Added all 3 features to app catalog and dashboard Quick Create grid.
- Wired RendoBar compose API into `src/lib/providers/video-render.ts` with EDL-to-timeline mapper.
- Added webhook endpoint at `/api/webhooks/rendobar` for signed HMAC completion callbacks.
- Total unit tests: 1871 (up from 1786). Total E2E tests: 581 (up from 512).

## 17. TT-Series Features

The TT series added six new AI creative tools, documented in ADRs 047-052. All six features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. The Hook Library introduces D1 persistence via a new Prisma `Hook` model (per-user ownership), bringing the total table count to 37.

### Ad Copy Generator (`/ad-copy-generator`)

- AI-powered platform-specific ad copy — generates TikTok, Instagram, and YouTube copy from a product URL or brief.
- Returns headline, body copy, CTA, hashtags, and description.
- 3 credits. API: `POST /api/creative/ad-copy-generator`. See ADR-047.
- Unit tests: 25.

### Hook Library (`/hook-library`)

- AI-powered hook library with D1 persistence — generates, categorizes, and stores reusable hooks by emotional trigger and platform.
- Predicted performance score (0-100). Hooks persisted to D1 via Prisma `Hook` model with per-user ownership.
- 4 credits. API: `POST /api/creative/hook-library`. See ADR-048.
- Unit tests: 19.

### Brief Template Builder (`/brief-template-builder`)

- AI-powered creative brief templates with industry-specific presets (8 industries) and smart suggestions.
- 4 credits. API: `POST /api/creative/brief-template-builder`. See ADR-049.
- Unit tests: 16.

### Ad Script Writer (`/ad-script-writer`)

- AI-powered multi-scene ad scripts with visual cues, voiceover, B-roll notes, and timing for TikTok, YouTube, and Instagram.
- 5 credits. API: `POST /api/creative/ad-script-writer`. See ADR-050.
- Unit tests: 29.

### Audience Persona Generator (`/audience-persona-generator`)

- AI-powered audience personas with demographics, psychographics, pain points, and platform behavior.
- 4 credits. API: `POST /api/creative/audience-persona-generator`. See ADR-051.
- Unit tests: 12.

### Creative Variant Matrix (`/variant-matrix-generator`)

- AI-powered creative variant matrix across hooks, angles, formats, and platforms for A/B testing.
- 5 credits. API: `POST /api/creative/variant-matrix-generator`. See ADR-052.
- Unit tests: 11.

### New UI pages

- `/ad-copy-generator` — platform-specific ad copy generator
- `/hook-library` — AI hook library with D1 persistence
- `/brief-template-builder` — creative brief template builder
- `/ad-script-writer` — multi-scene ad script writer
- `/audience-persona-generator` — audience persona generator
- `/variant-matrix-generator` — creative variant matrix for A/B testing

All six features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Unit tests added: 25 + 19 + 16 + 29 + 12 + 11 = 112 new tests (total unit tests now 1976+, up from 1871). Total E2E tests: 600+ (up from 581).

## 18. TT3-Series Features

The TT3 series added three more AI creative tools, documented in ADRs 053-055. All three features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 33 and the total ADR count to 55.

### Ad Concept Merger (`/ad-concept-merger`)

- AI-powered concept merger — combines multiple hooks, angles, and scripts into one unified ad concept.
- AI-resolved conflicts and flow score.
- 5 credits. API: `POST /api/creative/ad-concept-merger`. See ADR-053.
- Unit tests: 23.

### Creative Brief Analyzer (`/brief-analyzer`)

- AI-powered brief analyzer — audits creative briefs for strengths, gaps, missing elements, and improvement suggestions.
- Returns overall score (0-100), grade (F-A+), section analysis, and recommendations.
- 4 credits. API: `POST /api/creative/brief-analyzer`. See ADR-054.
- Unit tests: 30.

### Ad Format Optimizer (`/ad-format-optimizer`)

- AI-powered format optimizer — recommends best ad format (single image, carousel, video, story, reel, collection) based on product, audience, platform, budget, and goals.
- 4 credits. API: `POST /api/creative/ad-format-optimizer`. See ADR-055.
- Unit tests: 29.

### New UI pages

- `/ad-concept-merger` — AI-powered concept merger
- `/brief-analyzer` — creative brief analyzer with score/grade
- `/ad-format-optimizer` — ad format optimizer

### Production audit fix (TT3)

- `/calendar` page no longer makes API calls during loading state.

All three features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Unit tests added: 23 + 30 + 29 = 82 new tests (total unit tests now 2058+, up from 1976). Total E2E tests: 776+ (up from 600).

## 19. TT4-Series Features

The TT4 series added three more AI creative tools, documented in ADRs 056-058. All three features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 36 and the total ADR count to 58.

### Mood Board Generator (`/mood-board-generator`)

- AI-powered mood boards with color palettes, typography, imagery themes, and emotional tone generated from brand and style keywords.
- 4 credits. API: `POST /api/creative/mood-board-generator`. See ADR-056.

### Ad Performance Predictor (`/ad-performance-predictor`)

- AI-powered pre-launch performance prediction — forecasts CTR, engagement, conversion likelihood, and virality score with strengths, risks, and recommendations.
- 5 credits. API: `POST /api/creative/ad-performance-predictor`. See ADR-057.

### Creative A/B Test Planner (`/ab-test-planner`)

- AI-powered A/B test experiment design with hypothesis, variants, metrics, sample size, duration, confidence level, and success/failure criteria.
- 4 credits. API: `POST /api/creative/ab-test-planner-v2`. See ADR-058.

### New UI pages

- `/mood-board-generator` — AI-powered mood board generator
- `/ad-performance-predictor` — ad performance predictor with CTR/engagement/conversion/virality forecasts
- `/ab-test-planner` — creative A/B test experiment planner

### i18n, Dashboard, and Nav (TT4)

- Translations added to all 13 locales for 3 new namespaces: `moodBoardGenerator`, `adPerformancePredictor`, `abTestPlannerV2`.
- Dashboard "Quick Create" grid updated to 27 newest features (was 24).
- Nav overflow menu updated to 23 newest features (was 20).
- Fixed nav link test (Performance vs Performance Predictor exact match).

All three features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2099+ (up from 2058). Total E2E tests: 839+ (up from 776).

## 20. TT5-Series Features

The TT5 series added four more AI creative tools, documented in ADRs 059-062. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 40 and the total ADR count to 62.

### Creative Hook Tester (`/hook-tester`)

- AI-powered hook testing — rank multiple ad hooks by predicted performance before launch.
- 3 credits. API: `POST /api/creative/hook-tester`. See ADR-059.

### Trend Spotter (`/trend-spotter`)

- AI-powered trend discovery — identify trending topics, hashtags, and content styles for your niche.
- 5 credits. API: `POST /api/creative/trend-spotter`. See ADR-060.

### Brand Voice Analyzer (`/brand-voice-analyzer`)

- AI-powered brand voice analysis — extract tone, personality, and style guidelines from sample content.
- 4 credits. API: `POST /api/creative/brand-voice-analyzer`. See ADR-061.

### Ad Caption Generator (`/ad-caption-generator`)

- AI-powered ad captions — generate platform-specific captions with emojis, hashtags, and CTAs.
- 3 credits. API: `POST /api/creative/ad-caption-generator`. See ADR-062.

### New UI pages

- `/hook-tester` — AI-powered hook tester ranking hooks by predicted performance
- `/trend-spotter` — AI-powered trend spotter for niche trend discovery
- `/brand-voice-analyzer` — AI-powered brand voice analyzer extracting tone/personality/style
- `/ad-caption-generator` — AI-powered ad caption generator with platform-specific captions

### i18n, Dashboard, and Nav (TT5)

- Translations added to all 13 locales for 4 new namespaces: `hookTester`, `trendSpotter`, `brandVoiceAnalyzer`, `adCaptionGenerator`.
- Dashboard "Quick Create" grid updated to 31 newest features (was 27).
- Nav overflow menu updated to 27 newest features (was 23).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2195+ (up from 2099). Total E2E tests: 839+ (unchanged from TT4, new tests replaced old counts).

## 21. TT6-Series Features

The TT6 series added four more AI creative tools, documented in ADRs 063-066. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 44 and the total ADR count to 66.

### Ad Headline Generator (`/ad-headline-generator`)

- AI-powered ad headlines — generate attention-grabbing headlines optimized for specific platforms with hook types and predicted impact.
- 3 credits. API: `POST /api/creative/ad-headline-generator`. See ADR-063.

### Creative Angle Finder (`/angle-finder`)

- AI-powered angle discovery — find unique marketing angles across psychological triggers with uniqueness scores.
- 4 credits. API: `POST /api/creative/angle-finder`. See ADR-064.

### Ad Timing Optimizer (`/ad-timing-optimizer`)

- AI-powered ad timing — find optimal times to run ads based on platform, audience, and timezone with confidence scores.
- 3 credits. API: `POST /api/creative/ad-timing-optimizer`. See ADR-065.

### Creative Fatigue Detector (`/creative-fatigue-detector`)

- AI-powered fatigue detection — detect when creatives need refreshing from performance metrics with fatigue scores and refresh urgency.
- 4 credits. API: `POST /api/creative/creative-fatigue-detector`. See ADR-066.

### New UI pages

- `/ad-headline-generator` — AI-powered ad headline generator with platform optimization and hook types
- `/angle-finder` — AI-powered creative angle finder with psychological triggers and uniqueness scores
- `/ad-timing-optimizer` — AI-powered ad timing optimizer with platform/audience/timezone confidence scores
- `/creative-fatigue-detector` — AI-powered creative fatigue detector with fatigue scores and refresh urgency

### i18n, Dashboard, and Nav (TT6)

- Translations added to all 13 locales for 4 new namespaces: `adHeadlineGenerator`, `angleFinder`, `adTimingOptimizer`, `creativeFatigueDetector`.
- Dashboard "Quick Create" grid updated to 35 newest features (was 31).
- Nav overflow menu updated to 31 newest features (was 27).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2298+ (up from 2195). Total E2E tests: 903+ (up from 839).

## 22. TT7-Series Features

The TT7 series added four more AI creative tools, documented in ADRs 067-070. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 48 and the total ADR count to 70.

### Ad CTA Optimizer (`/ad-cta-optimizer`)

- AI-powered CTA optimization — generates optimized CTAs with action verbs, psychological triggers, predicted conversion lift, and platform fit.
- 3 credits. API: `POST /api/creative/ad-cta-optimizer`. See ADR-067.

### Creative Concept Expander (`/concept-expander`)

- Expands a seed concept into multiple fully fleshed-out creative directions with title, description, hook, visual direction, tone, format, unique angle, and production difficulty.
- 4 credits. API: `POST /api/creative/concept-expander`. See ADR-068.

### Ad Story Generator (`/ad-story-generator`)

- Generates compelling ad narratives with emotional arcs. Supports 5 story types (transformation, journey, conflict, resolution, aspiration).
- Returns multi-act story with visual notes, voiceover, emotion beats, and CTA integration.
- 5 credits. API: `POST /api/creative/ad-story-generator`. See ADR-069.

### Ad Color Palette Generator (`/ad-color-palette-generator`)

- Generates optimized color palettes for ad creatives based on product, platform, and emotional goal.
- Supports 6 emotions (energetic, calm, luxury, trust, playful, urgent).
- Returns palettes with primary/secondary/accent/background/text colors, platform fit, and color psychology.
- 3 credits. API: `POST /api/creative/ad-color-palette-generator`. See ADR-070.

### New UI pages

- `/ad-cta-optimizer` — AI-powered CTA optimizer with action verbs, psychological triggers, predicted conversion lift, and platform fit
- `/concept-expander` — creative concept expander turning a seed concept into multiple fully fleshed-out creative directions
- `/ad-story-generator` — ad story generator with emotional arcs across 5 story types and multi-act narrative structure
- `/ad-color-palette-generator` — ad color palette generator with 6 emotional goals and platform fit

### i18n, Dashboard, and Nav (TT7)

- Translations added to all 13 locales for 4 new namespaces: `adCtaOptimizer`, `conceptExpander`, `adStoryGenerator`, `adColorPaletteGenerator`.
- Dashboard "Quick Create" grid updated to 39 newest features (was 35).
- Nav overflow menu updated to 35 newest features (was 31).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2415+ (up from 2298). Total E2E tests: 996+ (up from 903).

## 23. TT8-Series Features

The TT8 series added four more AI creative tools, documented in ADRs 071-074. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 52 and the total ADR count to 74.

### Ad Thumbnail Generator (`/ad-thumbnail-generator`)

- AI-powered thumbnail/cover image concept generator for video ads — generates optimized thumbnails with visual description, text overlay, text position, font style, color scheme, emotion, and predicted CTR score.
- 4 credits. API: `POST /api/creative/ad-thumbnail-generator`. See ADR-071.

### Ad Font Pairing Generator (`/ad-font-pairing-generator`)

- AI-powered font pairing recommendations for ad creatives — each pairing includes heading font, body font, style description, mood, readability score, platform fit, and use case.
- 3 credits. API: `POST /api/creative/ad-font-pairing-generator`. See ADR-072.

### Ad Hashtag Generator (`/ad-hashtag-generator`)

- AI-powered platform-optimized hashtag generator — returns hashtags categorized by type (branded, trending, niche, community, campaign) with estimated reach, competition level, and recommended flag.
- 2 credits. API: `POST /api/creative/ad-hashtag-generator`. See ADR-073.

### Creative Scene Generator (`/creative-scene-generator`)

- AI-powered detailed scene description generator for ad video shoots — each scene includes shot type, camera angle, lighting, setting, props, actor notes, dialogue/voiceover, duration, and mood. Returns total duration.
- 5 credits. API: `POST /api/creative/creative-scene-generator`. See ADR-074.

### New UI pages

- `/ad-thumbnail-generator` — AI-powered thumbnail/cover image concept generator for video ads with predicted CTR score
- `/ad-font-pairing-generator` — AI-powered font pairing recommendations for ad creatives with readability scores and platform fit
- `/ad-hashtag-generator` — AI-powered platform-optimized hashtag generator with categorized hashtags, reach estimates, and competition levels
- `/creative-scene-generator` — AI-powered detailed scene description generator for ad video shoots with shot type, camera angle, lighting, and mood

### i18n, Dashboard, and Nav (TT8)

- Translations added to all 13 locales for 4 new namespaces: `adThumbnailGenerator`, `adFontPairingGenerator`, `adHashtagGenerator`, `creativeSceneGenerator`.
- Dashboard "Quick Create" grid updated to 43 newest features (was 39).
- Nav overflow menu updated to 39 newest features (was 35).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2534+ (up from 2415). Total E2E tests: 1052+ (up from 996).

## 24. TT9-Series Features

The TT9 series added four more AI creative tools, documented in ADRs 075-078. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 56 and the total ADR count to 78.

### Ad Music Mood Matcher (`/ad-music-mood-matcher`)

- AI-powered music genre/mood matcher for ad content — returns music recommendations with genre, subGenre, mood, tempoBPM, energyLevel (1-10), instruments, description, bestForScene, and licenseType.
- 3 credits. API: `POST /api/creative/ad-music-mood-matcher`. See ADR-075.

### Ad Voiceover Script Generator (`/ad-voiceover-script-generator`)

- AI-powered voiceover script generator for ads — returns a structured script with segments (segmentNumber, text, timing, direction, emphasis, pauseAfter), totalDuration, wordsPerMinute, and toneNotes.
- 4 credits. API: `POST /api/creative/ad-voiceover-script-generator`. See ADR-076.

### Creative Brief Generator (`/creative-brief-generator`)

- AI-powered complete creative brief generator from minimal input — returns a structured brief with objective, targetAudience, keyMessage, tone, deliverables, timeline, budgetGuidance, successMetrics, creativeDirection, and platformRecommendations.
- 4 credits. API: `POST /api/creative/creative-brief-generator`. See ADR-077.

### Ad Placement Strategist (`/ad-placement-strategist`)

- AI-powered ad placement strategist — returns a strategy with summary, placements (platform, placementType, format, audienceFit, estimatedCPM, estimatedReach, expectedPerformance, priority), budgetAllocation, timeline, and risks.
- 5 credits. API: `POST /api/creative/ad-placement-strategist`. See ADR-078.

### New UI pages

- `/ad-music-mood-matcher` — AI-powered music genre/mood matcher for ad content with genre, subGenre, mood, tempoBPM, energyLevel, instruments, and licenseType
- `/ad-voiceover-script-generator` — AI-powered voiceover script generator for ads with structured segments, totalDuration, wordsPerMinute, and toneNotes
- `/creative-brief-generator` — AI-powered complete creative brief generator from minimal input with objective, targetAudience, keyMessage, tone, deliverables, timeline, budgetGuidance, successMetrics, creativeDirection, and platformRecommendations
- `/ad-placement-strategist` — AI-powered ad placement strategist with placements, budgetAllocation, timeline, and risks

### i18n, Dashboard, and Nav (TT9)

- Translations added to all 13 locales for 4 new namespaces: `adMusicMoodMatcher`, `adVoiceoverScriptGenerator`, `creativeBriefGenerator`, `adPlacementStrategist`.
- Dashboard "Quick Create" grid updated to 47 newest features (was 43).
- Nav overflow menu updated to 43 newest features (was 39).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2638+ (up from 2534). Total E2E tests: 1052+ (same — only TT9 page/API tests added, not full suite rerun for docs).

## 25. TT10-Series Features

The TT10 series added four more AI creative tools, documented in ADRs 079-082. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 60 and the total ADR count to 82.

### Ad A/B Test Name Generator (`/ad-ab-test-name-generator`)

- AI-powered A/B test name generator — returns test names with variant labels, hypothesis, category, and description.
- 2 credits. API: `POST /api/creative/ad-ab-test-name-generator`. See ADR-079.

### Creative Hook Revamp Generator (`/creative-hook-revamp-generator`)

- AI-powered hook revamp generator — takes an existing hook and generates revamped versions with different angles, emotional triggers, and formats.
- Returns revamps with revampedHook, angle, emotionalTrigger, formatChange, predictedLift, and reasoning.
- 3 credits. API: `POST /api/creative/creative-hook-revamp-generator`. See ADR-080.

### Ad Audience Segment Builder (`/ad-audience-segment-builder`)

- AI-powered audience segment builder for ad targeting — returns segments with demographics (ageRange, gender, location, income), interests, behaviors, platformTargeting, estimatedReach, recommendedAdFormat, and priority.
- 4 credits. API: `POST /api/creative/ad-audience-segment-builder`. See ADR-081.

### Creative Concept Validator (`/creative-concept-validator`)

- AI-powered creative concept validator — returns a validation report with overallScore (0-100), grade (F-A+), platformFit, brandSafety, engagementPotential, clarity, originality, issues (with severity, description, suggestion), strengths, recommendations, and verdict.
- 5 credits. API: `POST /api/creative/creative-concept-validator`. See ADR-082.

### New UI pages

- `/ad-ab-test-name-generator` — AI-powered A/B test name generator with variant labels, hypothesis, category, and description
- `/creative-hook-revamp-generator` — AI-powered hook revamp generator with revamped hooks, angles, emotional triggers, format changes, predicted lift, and reasoning
- `/ad-audience-segment-builder` — AI-powered audience segment builder for ad targeting with demographics, interests, behaviors, platform targeting, estimated reach, recommended ad format, and priority
- `/creative-concept-validator` — AI-powered creative concept validator with overall score, grade, platform fit, brand safety, engagement potential, clarity, originality, issues, strengths, recommendations, and verdict

### i18n, Dashboard, and Nav (TT10)

- Translations added to all 13 locales for 4 new namespaces: `adABTestNameGenerator`, `creativeHookRevampGenerator`, `adAudienceSegmentBuilder`, `creativeConceptValidator`.
- Dashboard "Quick Create" grid updated to 51 newest features (was 47).
- Nav overflow menu updated to 47 newest features (was 43).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2736+ (up from 2638). Total E2E tests: 1052+ (same — only TT10 page/API tests added, not full suite rerun for docs).

## 26. TT11-Series Features

The TT11 series added four more AI creative tools, documented in ADRs 083-086. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 64 and the total ADR count to 86.

### Ad Emotion Analyzer (`/ad-emotion-analyzer`)

- AI-powered emotional impact analyzer for ad content — analyzes dominant emotions, emotion scores, emotional journey, resonance, authenticity, and improvement recommendations.
- 3 credits. API: `POST /api/creative/ad-emotion-analyzer`. See ADR-083.

### Creative Format Converter (`/creative-format-converter`)

- AI-powered creative content converter between ad formats (long-form, short-form, image-ad, video-script, carousel, story) with platform optimizations.
- 4 credits. API: `POST /api/creative/creative-format-converter`. See ADR-084.

### Ad Budget Allocator (`/ad-budget-allocator`)

- AI-powered ad budget allocator across platforms — returns percentages, amounts, expected outcomes, and rationale.
- 4 credits. API: `POST /api/creative/ad-budget-allocator`. See ADR-085.

### Creative Trend Adapter (`/creative-trend-adapter`)

- AI-powered creative content adapter to current trends — returns relevance scores, timing advice, and longevity scoring.
- 3 credits. API: `POST /api/creative/creative-trend-adapter`. See ADR-086.

### New UI pages

- `/ad-emotion-analyzer` — AI-powered emotional impact analyzer for ad content with dominant emotions, scores, journey, resonance, authenticity, and recommendations
- `/creative-format-converter` — AI-powered creative content converter between ad formats with platform optimizations
- `/ad-budget-allocator` — AI-powered ad budget allocator across platforms with percentages, amounts, expected outcomes, and rationale
- `/creative-trend-adapter` — AI-powered creative content adapter to current trends with relevance scores, timing advice, and longevity scoring

### i18n, Dashboard, and Nav (TT11)

- Translations added to all 13 locales for 4 new namespaces: `adEmotionAnalyzer`, `creativeFormatConverter`, `adBudgetAllocator`, `creativeTrendAdapter`.
- Dashboard "Quick Create" grid updated to 55 newest features (was 51).
- Nav overflow menu updated to 51 newest features (was 47).

### Production deployment (TT11)

- All 4 pages deployed and healthy in production.
- Production version ID: `3ba042aa-79fd-474f-8059-f10f87aeb4ec`.
- TT11 page E2E tests: 64 passing.
- TT11 API E2E tests: 12 passing.
- TT11 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2830+ (up from 2736). Total E2E tests: 1052+ (same — only TT11 page/API tests added, not full suite rerun for docs).

## 27. TT12-Series Features

The TT12 series added four more AI creative tools, documented in ADRs 087-090. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 68 and the total ADR count to 90.

### Ad Creative Sequencer (`/ad-creative-sequencer`)

- AI-powered multi-touch campaign narrative sequencer — sequences multiple creatives into a coherent multi-touch campaign narrative with stages, transitions, and timing.
- 4 credits. API: `POST /api/creative/ad-creative-sequencer`. See ADR-087.

### Brand Story Architect (`/brand-story-architect`)

- AI-powered brand story arc builder — builds brand story arcs with acts, character roles, conflict, resolution, and ad-ready story beats.
- 5 credits. API: `POST /api/creative/brand-story-architect`. See ADR-088.

### Ad Localization Adapter (`/ad-localization-adapter`)

- AI-powered ad localization adapter — adapts ads for different regional/cultural markets with cultural notes, idiom adaptations, color/symbol considerations, and compliance flags.
- 4 credits. API: `POST /api/creative/ad-localization-adapter`. See ADR-089.

### Creative Performance Forecaster (`/creative-performance-forecaster`)

- AI-powered creative performance forecaster — forecasts creative performance with confidence intervals for CTR, engagement, conversion, and reach.
- 5 credits. API: `POST /api/creative/creative-performance-forecaster`. See ADR-090.

### New UI pages

- `/ad-creative-sequencer` — AI-powered multi-touch campaign narrative sequencer with stages, transitions, and timing
- `/brand-story-architect` — AI-powered brand story arc builder with acts, character roles, conflict, resolution, and ad-ready story beats
- `/ad-localization-adapter` — AI-powered ad localization adapter with cultural notes, idiom adaptations, color/symbol considerations, and compliance flags
- `/creative-performance-forecaster` — AI-powered creative performance forecaster with confidence intervals for CTR, engagement, conversion, and reach

### i18n, Dashboard, and Nav (TT12)

- Translations added to all 13 locales for 4 new namespaces: `adCreativeSequencer`, `brandStoryArchitect`, `adLocalizationAdapter`, `creativePerformanceForecaster`.
- Dashboard "Quick Create" grid updated to 59 newest features (was 55).
- Nav overflow menu updated to 55 newest features (was 51).

### Production deployment (TT12)

- All 4 pages deployed and healthy in production.
- Production version ID: `cc48c0a1-251a-4380-9340-17a6c1d53d21`.
- TT12 page E2E tests: 64 passing.
- TT12 API E2E tests: 12 passing.
- TT12 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 2938+ (up from 2830) — 108 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT12 page/API tests added, not full suite rerun for docs).

## 28. TT13-Series Features

The TT13 series added four more AI creative tools, documented in ADRs 091-094. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 72 and the total ADR count to 94.

### Ad Sentiment Tuner (`/ad-sentiment-tuner`)

- AI-powered ad sentiment tuner — tunes ad sentiment with before/after scores, word changes, and audience alignment.
- 3 credits. API: `POST /api/creative/ad-sentiment-tuner`. See ADR-091.

### Creative Hook Matrix Generator (`/creative-hook-matrix-generator`)

- AI-powered hook matrix generator — generates a matrix of hooks across emotional triggers and platforms with predicted scores.
- 5 credits. API: `POST /api/creative/creative-hook-matrix-generator`. See ADR-092.

### Ad Creative Rotator (`/ad-creative-rotator`)

- AI-powered creative rotator — generates creative variations with a rotation schedule and fatigue resistance scores.
- 4 credits. API: `POST /api/creative/ad-creative-rotator`. See ADR-093.

### Brand Voice Consistency Checker (`/brand-voice-consistency-checker`)

- AI-powered brand voice consistency checker — checks content for brand voice consistency with dimension scores, violations, and corrections.
- 4 credits. API: `POST /api/creative/brand-voice-consistency-checker`. See ADR-094.

### New UI pages

- `/ad-sentiment-tuner` — AI-powered ad sentiment tuner with before/after scores, word changes, and audience alignment
- `/creative-hook-matrix-generator` — AI-powered hook matrix generator producing a matrix of hooks across emotional triggers and platforms with predicted scores
- `/ad-creative-rotator` — AI-powered creative rotator generating creative variations with a rotation schedule and fatigue resistance scores
- `/brand-voice-consistency-checker` — AI-powered brand voice consistency checker with dimension scores, violations, and corrections

### i18n, Dashboard, and Nav (TT13)

- Translations added to all 13 locales for 4 new namespaces: `adSentimentTuner`, `creativeHookMatrixGenerator`, `adCreativeRotator`, `brandVoiceConsistencyChecker`.
- Dashboard "Quick Create" grid updated to 63 newest features (was 59).
- Nav overflow menu updated to 59 newest features (was 55).

### Production deployment (TT13)

- All 4 pages deployed and healthy in production.
- Production version ID: `ccf2c6a0-7e2b-4d00-bd7e-d832949a841d`.
- TT13 page E2E tests: 64 passing.
- TT13 API E2E tests: 12 passing.
- TT13 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 3049+ (up from 2938) — 84 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT13 page/API tests added, not full suite rerun for docs).

## 29. TT14-Series Features

The TT14 series added four more AI creative tools, documented in ADRs 095-098. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 76 and the total ADR count to 98.

### Ad Persona Matcher (`/ad-persona-matcher`)

- AI-powered ad persona matcher — matches ad content against audience personas with persona match cards, content adjustments, overall alignment, and best match recommendation.
- 4 credits. API: `POST /api/creative/ad-persona-matcher`. See ADR-095.

### Creative Concept Expander Pro (`/creative-concept-expander-pro`)

- AI-powered concept expander — expands a concept into a broader campaign ecosystem with variations, extensions, creative directions, and cross-platform adaptations. Supports shallow (3), standard (5), and deep (8) expansion depths.
- 5 credits. API: `POST /api/creative/creative-concept-expander-pro`. See ADR-096.

### Ad Competitive Intelligence (`/ad-competitive-intelligence`)

- AI-powered competitive intelligence — analyzes competitive landscape with competitor strengths/weaknesses, market positioning, positioning gaps, differentiation opportunities, and counter-strategies.
- 5 credits. API: `POST /api/creative/ad-competitive-intelligence`. See ADR-097.

### Creative Quality Scorer (`/creative-quality-scorer`)

- AI-powered creative quality scorer — scores creative across 7 quality dimensions with overall score, grade (F-A+), issues, strengths, fixes, and improvement suggestions.
- 3 credits. API: `POST /api/creative/creative-quality-scorer`. See ADR-098.

### New UI pages

- `/ad-persona-matcher` — AI-powered ad persona matcher with persona match cards, content adjustments, overall alignment, and best match recommendation
- `/creative-concept-expander-pro` — AI-powered concept expander producing variations, extensions, creative directions, and cross-platform adaptations with shallow/standard/deep expansion depths
- `/ad-competitive-intelligence` — AI-powered competitive intelligence with competitor strengths/weaknesses, market positioning, positioning gaps, differentiation opportunities, and counter-strategies
- `/creative-quality-scorer` — AI-powered creative quality scorer with 7-dimension scoring, overall score, grade (F-A+), issues, strengths, fixes, and improvement suggestions

### i18n, Dashboard, and Nav (TT14)

- Translations added to all 13 locales for 4 new namespaces: `adPersonaMatcher`, `creativeConceptExpanderPro`, `adCompetitiveIntelligence`, `creativeQualityScorer`.
- Dashboard "Quick Create" grid updated to 67 newest features (was 63).
- Nav overflow menu updated to 63 newest features (was 59).

### Production deployment (TT14)

- All 4 pages deployed and healthy in production.
- Production version ID: `86f127ee-e906-4cdd-b22b-307fc29f6243`.
- TT14 page E2E tests: 64 passing.
- TT14 API E2E tests: 12 passing.
- TT14 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 3160 (up from 3049) — 111 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT14 page/API tests added, not full suite rerun for docs).

## 30. TT15-Series Features

The TT15 series added four more AI creative tools, documented in ADRs 099-102. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 80 and the total ADR count to 102.

### Ad Audience Resonance Predictor (`/ad-audience-resonance-predictor`)

- AI-powered audience resonance predictor — predicts how well ad content resonates with audience segments with segment scores, emotional triggers, resonance factors, and audience fit analysis.
- 4 credits. API: `POST /api/creative/ad-audience-resonance-predictor`. See ADR-099.

### Creative Format Recommender (`/creative-format-recommender`)

- AI-powered format recommender — recommends the best creative formats (video, carousel, image, story, text) for a given product/brand and campaign goal with scores, rationale, best use cases, and platform tips.
- 3 credits. API: `POST /api/creative/creative-format-recommender`. See ADR-100.

### Ad Creative Lifecycle Manager (`/ad-creative-lifecycle-manager`)

- AI-powered lifecycle manager — manages ad creative lifecycle from launch to retirement with stage analysis, health indicators, refresh recommendations, performance predictions, and retirement signals.
- 5 credits. API: `POST /api/creative/ad-creative-lifecycle-manager`. See ADR-101.

### Creative Sentiment Journey Mapper (`/creative-sentiment-journey-mapper`)

- AI-powered sentiment journey mapper — maps the emotional/sentiment journey of ad creative content with beats, emotional arc, sentiment transitions, peak moments, and recommendations.
- 4 credits. API: `POST /api/creative/creative-sentiment-journey-mapper`. See ADR-102.

### New UI pages

- `/ad-audience-resonance-predictor` — AI-powered audience resonance predictor with segment scores, emotional triggers, resonance factors, and audience fit analysis
- `/creative-format-recommender` — AI-powered format recommender with ranked formats, top pick, reasoning, best use cases, and platform tips
- `/ad-creative-lifecycle-manager` — AI-powered lifecycle manager with stage analysis timeline, refresh recommendations, performance prediction, and retirement signals
- `/creative-sentiment-journey-mapper` — AI-powered sentiment journey mapper with beats timeline, emotional arc, transitions, and peak moments

### i18n, Dashboard, and Nav (TT15)

- Translations added to all 13 locales for 4 new namespaces: `adAudienceResonancePredictor`, `creativeFormatRecommender`, `adCreativeLifecycleManager`, `creativeSentimentJourneyMapper`.
- Dashboard "Quick Create" grid updated to 71 newest features (was 67).
- Nav overflow menu updated to 67 newest features (was 63).

### Production deployment (TT15)

- All 4 pages deployed and healthy in production.
- Production version ID: `e6a85b31-591b-445c-bd75-e872110023ab`.
- TT15 page E2E tests: 64 passing.
- TT15 API E2E tests: 12 passing.
- TT15 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 3315 (up from 3160) — 155 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT15 page/API tests added, not full suite rerun for docs).

## 31. TT16-Series Features

The TT16 series added four more AI creative tools, documented in ADRs 103-106. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 84 and the total ADR count to 106.

### Ad Creative A/B Test Simulator (`/ad-creative-ab-test-simulator`)

- AI-powered A/B test simulator — simulates A/B test outcomes before running them with predicted winner, confidence score, per-variant predicted metrics, statistical significance estimate, and key differences.
- 5 credits. API: `POST /api/creative/ad-creative-ab-test-simulator`. See ADR-103.

### Creative Visual Hierarchy Analyzer (`/creative-visual-hierarchy-analyzer`)

- AI-powered visual hierarchy analyzer — analyzes visual hierarchy of ad creative layouts with element priority, attention flow, focal points, balance assessment, and overall score.
- 4 credits. API: `POST /api/creative/creative-visual-hierarchy-analyzer`. See ADR-104.

### Ad Audience Pain Point Mapper (`/ad-audience-pain-point-mapper`)

- AI-powered pain point mapper — maps audience pain points to creative angles with severity, emotional impact, messaging recommendations, and prioritization.
- 4 credits. API: `POST /api/creative/ad-audience-pain-point-mapper`. See ADR-105.

### Creative Messaging Framework Builder (`/creative-messaging-framework-builder`)

- AI-powered messaging framework builder — builds comprehensive messaging frameworks with pillars, core messages, supporting points, proof points, tone guidelines, and elevator pitch.
- 5 credits. API: `POST /api/creative/creative-messaging-framework-builder`. See ADR-106.

### New UI pages

- `/ad-creative-ab-test-simulator` — AI-powered A/B test simulator with predicted winner, confidence score, variant comparison, and key differences
- `/creative-visual-hierarchy-analyzer` — AI-powered visual hierarchy analyzer with element priority, attention flow, focal points, and balance assessment
- `/ad-audience-pain-point-mapper` — AI-powered pain point mapper with severity badges, creative angles, and messaging recommendations
- `/creative-messaging-framework-builder` — AI-powered messaging framework builder with pillars, core messages, proof points, and tone guidelines

### i18n, Dashboard, and Nav (TT16)

- Translations added to all 13 locales for 4 new namespaces: `adCreativeAbTestSimulator`, `creativeVisualHierarchyAnalyzer`, `adAudiencePainPointMapper`, `creativeMessagingFrameworkBuilder`.
- Dashboard "Quick Create" grid updated to 75 newest features (was 71).
- Nav overflow menu updated to 71 newest features (was 67).

### Production deployment (TT16)

- All 4 pages deployed and healthy in production.
- Production version ID: `2ebf5529-12cb-4082-b25c-e411f629f504`.
- TT16 page E2E tests: 64 passing.
- TT16 API E2E tests: 12 passing.
- TT16 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 3476 (up from 3315) — 161 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT16 page/API tests added, not full suite rerun for docs).

## 32. TT17-Series Features

The TT17 series added four more AI creative tools, documented in ADRs 107-110. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 88 and the total ADR count to 110.

### Ad Creative Burnout Detector (`/ad-creative-burnout-detector`)

- AI-powered burnout detector — detects creative fatigue/burnout from content, product, days running, and platform; returns burnout level, risk score, fatigue indicators, decline predictions, refresh recommendations, and optimal refresh timing.
- 4 credits. API: `POST /api/creative/ad-creative-burnout-detector`. See ADR-107.

### Creative Ad Concept Synthesizer (`/creative-ad-concept-synthesizer`)

- AI-powered concept synthesizer — synthesizes multiple ad concepts into a unified creative direction with merged elements, creative direction, differentiation, and execution guidelines.
- 5 credits. API: `POST /api/creative/creative-ad-concept-synthesizer`. See ADR-108.

### Ad Audience Psychographic Profiler (`/ad-audience-psychographic-profiler`)

- AI-powered psychographic profiler — creates psychographic profiles of target audiences with dimensions, motivation drivers, content preferences, communication style, and messaging recommendations.
- 4 credits. API: `POST /api/creative/ad-audience-psychographic-profiler`. See ADR-109.

### Creative Ad Tone Calibrator (`/creative-ad-tone-calibrator`)

- AI-powered tone calibrator — calibrates ad creative tone to match brand and audience expectations with current tone analysis, alignment score, tone adjustments, word replacements, and calibrated content.
- 3 credits. API: `POST /api/creative/creative-ad-tone-calibrator`. See ADR-110.

### New UI pages

- `/ad-creative-burnout-detector` — AI-powered burnout detector with risk score gauge, fatigue indicators, decline predictions, and refresh recommendations
- `/creative-ad-concept-synthesizer` — AI-powered concept synthesizer with unified theme, merged elements, creative direction, and execution guidelines
- `/ad-audience-psychographic-profiler` — AI-powered psychographic profiler with dimension intensity bars, motivation drivers, and content preferences
- `/creative-ad-tone-calibrator` — AI-powered tone calibrator with alignment score gauge, tone gap bars, word replacements, and calibrated content

### i18n, Dashboard, and Nav (TT17)

- Translations added to all 13 locales for 4 new namespaces: `adCreativeBurnoutDetector`, `creativeAdConceptSynthesizer`, `adAudiencePsychographicProfiler`, `creativeAdToneCalibrator`.
- Dashboard "Quick Create" grid updated to 79 newest features (was 75).
- Nav overflow menu updated to 75 newest features (was 71).

### Production deployment (TT17)

- All 4 pages deployed and healthy in production.
- Production version ID: `cdcff232-db32-49cd-9e80-7ee09ff5fa22`.
- TT17 page E2E tests: 64 passing.
- TT17 API E2E tests: 12 passing.
- TT17 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 3635 (up from 3476) — 159 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT17 page/API tests added, not full suite rerun for docs).

## 33. TT18-Series Features

The TT18 series added four more AI creative tools, documented in ADRs 111-114. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 92 and the total ADR count to 114.

### Creative Ad Format Innovator (`/creative-ad-format-innovator`)

- AI-powered format innovator — innovates new ad formats by combining existing format elements in novel ways; returns innovative format concepts with novelty score, format elements, implementation difficulty, and expected impact.
- 5 credits. API: `POST /api/creative/creative-ad-format-innovator`. See ADR-111.

### Ad Creative Story Arc Designer (`/ad-creative-story-arc-designer`)

- AI-powered story arc designer — designs compelling story arcs for ad creative with acts, emotional beats, pacing guide, and key moments.
- 4 credits. API: `POST /api/creative/ad-creative-story-arc-designer`. See ADR-112.

### Creative Ad Persuasion Strategist (`/creative-ad-persuasion-strategist`)

- AI-powered persuasion strategist — develops persuasion strategies using Cialdini principles with techniques, psychological triggers, and ethical considerations.
- 4 credits. API: `POST /api/creative/creative-ad-persuasion-strategist`. See ADR-113.

### Ad Creative Hook Timing Optimizer (`/ad-creative-hook-timing-optimizer`)

- AI-powered hook timing optimizer — optimizes hook timing for maximum engagement with optimal placement, effectiveness score, timing analysis, and engagement predictions.
- 3 credits. API: `POST /api/creative/ad-creative-hook-timing-optimizer`. See ADR-114.

### New UI pages

- `/creative-ad-format-innovator` — AI-powered format innovator with novelty score bars, format elements, difficulty/impact badges, and platform fit
- `/ad-creative-story-arc-designer` — AI-powered story arc designer with acts timeline, emotional beats intensity bars, pacing guide, and key moments
- `/creative-ad-persuasion-strategist` — AI-powered persuasion strategist with principle relevance bars, technique strength badges, trigger intensity, and ethical considerations
- `/ad-creative-hook-timing-optimizer` — AI-powered hook timing optimizer with effectiveness gauge, timing analysis, engagement predictions, and recommendations

### i18n, Dashboard, and Nav (TT18)

- Translations added to all 13 locales for 4 new namespaces: `creativeAdFormatInnovator`, `adCreativeStoryArcDesigner`, `creativeAdPersuasionStrategist`, `adCreativeHookTimingOptimizer`.
- Dashboard "Quick Create" grid updated to 83 newest features (was 79).
- Nav overflow menu updated to 79 newest features (was 75).

### Production deployment (TT18)

- All 4 pages deployed and healthy in production.
- Production version ID: `6a946220-9ee4-43bf-acc7-b7e1219128fd`.
- TT18 page E2E tests: 64 passing.
- TT18 API E2E tests: 12 passing.
- TT18 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 3789 (up from 3635) — 154 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT18 page/API tests added, not full suite rerun for docs).

## 34. TT19-Series Features

The TT19 series added four more AI creative tools, documented in ADRs 115-118. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 96 and the total ADR count to 118.

### Creative Ad Metaphor Generator (`/creative-ad-metaphor-generator`)

- AI-powered metaphor generator — generates creative metaphors that make abstract product benefits tangible and memorable; returns metaphors with memorability score, visual suggestions, emotional resonance, and category.
- 3 credits. API: `POST /api/creative/creative-ad-metaphor-generator`. See ADR-115.

### Ad Creative Sensory Enhancer (`/ad-creative-sensory-enhancer`)

- AI-powered sensory enhancer — enhances ad content with sensory language appealing to the five senses; returns enhanced content, sensory score, additions, and sense-specific enhancements.
- 4 credits. API: `POST /api/creative/ad-creative-sensory-enhancer`. See ADR-116.

### Creative Ad Pattern Interrupt Designer (`/creative-ad-pattern-interrupt-designer`)

- AI-powered pattern interrupt designer — designs pattern interrupts that break through audience attention filters; returns interrupt concepts with attention scores, implementation guides, and expected lift.
- 4 credits. API: `POST /api/creative/creative-ad-pattern-interrupt-designer`. See ADR-117.

### Ad Creative Social Proof Architect (`/ad-creative-social-proof-architect`)

- AI-powered social proof architect — architects social proof elements that build trust and credibility; returns proof elements with credibility scores, strategies, and authenticity guidelines.
- 5 credits. API: `POST /api/creative/ad-creative-social-proof-architect`. See ADR-118.

### New UI pages

- `/creative-ad-metaphor-generator` — AI-powered metaphor generator with memorability score bars, visual suggestions, emotional resonance, and category badges
- `/ad-creative-sensory-enhancer` — AI-powered sensory enhancer with enhanced content box, sensory score gauge, sensory additions with impact badges, and sense enhancements before/after comparison
- `/creative-ad-pattern-interrupt-designer` — AI-powered pattern interrupt designer with attention score bars, type badges, implementation guides, and expected lift
- `/ad-creative-social-proof-architect` — AI-powered social proof architect with credibility bars, type badges, placement, authenticity notes, and strategies with impact badges

### i18n, Dashboard, and Nav (TT19)

- Translations added to all 13 locales for 4 new namespaces: `creativeAdMetaphorGenerator`, `adCreativeSensoryEnhancer`, `creativeAdPatternInterruptDesigner`, `adCreativeSocialProofArchitect`.
- Dashboard "Quick Create" grid updated to 87 newest features (was 83).
- Nav overflow menu updated to 83 newest features (was 79).

### Production deployment (TT19)

- All 4 pages deployed and healthy in production.
- Production version ID: `ff2a8233-e5de-428a-b0db-338d7913f8ee`.
- TT19 page E2E tests: 64 passing.
- TT19 API E2E tests: 12 passing.
- TT19 production audit: 20/20 passing (4 pages x 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 3937 (up from 3789) — 148 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT19 page/API tests added, not full suite rerun for docs).

## 35. TT20-Series Features

The TT20 series added four more AI creative tools, documented in ADRs 119-122. All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. This brings the total feature route count to 100 and the total ADR count to 122.

### Creative Ad Anticipation Builder (`/creative-ad-anticipation-builder`)

- AI-powered anticipation builder — builds anticipation and suspense elements for ad creative; returns hooks, suspense techniques, reveal strategies, tension curves, and anticipation score.
- 4 credits. API: `POST /api/creative/creative-ad-anticipation-builder`. See ADR-119.

### Ad Creative Contrast Amplifier (`/ad-creative-contrast-amplifier`)

- AI-powered contrast amplifier — amplifies contrast in ad content (before/after, problem/solution, etc.); returns amplified content, contrast score, contrast elements, and contrast pairs.
- 3 credits. API: `POST /api/creative/ad-creative-contrast-amplifier`. See ADR-120.

### Creative Ad Micro-Moment Designer (`/creative-ad-micro-moment-designer`)

- AI-powered micro-moment designer — designs micro-moments that capture attention in 1-3 seconds; returns moment timeline with attention scores, implementation guides, and emotional beats.
- 4 credits. API: `POST /api/creative/creative-ad-micro-moment-designer`. See ADR-121.

### Ad Creative Emotion Sequencer (`/ad-creative-emotion-sequencer`)

- AI-powered emotion sequencer — sequences emotions throughout ad content for maximum emotional impact; returns emotion beats, peaks, transition strategies, and resonance score.
- 5 credits. API: `POST /api/creative/ad-creative-emotion-sequencer`. See ADR-122.

### New UI pages

- `/creative-ad-anticipation-builder` — AI-powered anticipation builder with hooks, suspense techniques with effectiveness bars, reveal strategies, tension curve visualization, and anticipation score gauge
- `/ad-creative-contrast-amplifier` — AI-powered contrast amplifier with amplified content box, contrast score gauge, contrast elements with impact badges, and contrast pairs before/after comparison
- `/creative-ad-micro-moment-designer` — AI-powered micro-moment designer with timeline, type badges, attention score bars, implementation guides, and emotional beats
- `/ad-creative-emotion-sequencer` — AI-powered emotion sequencer with emotion sequence timeline, emotional peaks with intensity bars, transition strategies, and resonance score gauge

### i18n, Dashboard, and Nav (TT20)

- Translations added to all 13 locales for 4 new namespaces: `creativeAdAnticipationBuilder`, `adCreativeContrastAmplifier`, `creativeAdMicroMomentDesigner`, `adCreativeEmotionSequencer`.
- Dashboard "Quick Create" grid updated to 91 newest features (was 87).
- Nav overflow menu updated to 87 newest features (was 83).

### Production deployment (TT20)

- All 4 pages deployed and healthy in production.
- Production version ID: `99e96a78-beea-4e61-ada0-079f708daeb5`.
- TT20 page E2E tests: 64 passing.
- TT20 API E2E tests: 12 passing.
- TT20 production audit: 20/20 passing (4 pages x 5 checks: HTTP 200, 1 H1, main#main-content, skip link, API schema).

All four features have dry-run/fallback behavior when Atlas is local or the API key is missing, and use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions. Total unit tests now 4091 (up from 3937) — 154 new tests across 4 new test suites. Total E2E tests: 1052+ (same — only TT20 page/API tests added, not full suite rerun for docs).
