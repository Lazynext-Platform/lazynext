# LazyNext Architecture Audit — 2026-09

> **Status:** Current as of 2026-09-02 (post-Q series).
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

28 Prisma models. Key models for the creative pipeline:

- **User** — id, email, name, credits, password (bcrypt), image
- **WorkflowRun** — persists pipeline state as JSON (`state` column)
- **CreativeTemplate** — built-in (userId=null) and user-saved templates
- **Timeline** / **TimelineVersion** — editor persistence
- **CreativePerformance** — performance learning loop data
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

Credit handling:
- Credits are deducted before stage execution.
- Failed stages refund credits via `refundSync`.
- `approve` re-run of publish does not charge additional credits.

### Asset persistence (`src/lib/creative/asset-persist.ts`)

- `persistAsset()` — saves a single asset to D1.
- `persistPipelineAssets()` — persists a parent `creative_package` asset + child assets for each stage output.
- `derivePipelineChildAssets()` — derives child asset specs from pipeline state.
- Child assets are created for: media_generation (storyboard), audio (script), edit (script), compliance (score), publish (variants).
- Brief, script, storyboard, and score stages do NOT create child assets.
- Persistence failures are logged via `logToolExecution` telemetry (not silently swallowed).

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

- 13 locales: en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id.
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

- **410 unauthenticated tests** — smoke tests, page loads, auth prompts, responsive, RTL.
- **7+ authenticated pipeline tests** — session, pipeline creation, templates, page loads.
- **12+ authenticated user flow tests** — dashboard, my-work, settings, admin, credits, full pipeline execution, A/B.
- Total: 429+ tests (417 unauthenticated + 12+ authenticated).

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
npm run lint    # ESLint — 0 errors, ~8 warnings (Q series reduced from 11)
npm test        # Node test runner — 1412+ tests
npx playwright test  # E2E — 429+ tests
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
- **Production observability** — telemetry events are emitted but not aggregated or alerted on.
- **Creative Studio chain mode unification** — chain mode has its own step-by-step loop; could be unified with pipeline API to leverage auto-advance and PipelineStageError.
- **Edit stage real rendering** — produces EDL only; no actual video output or clip editor integration.
- **Publish stage real integrations** — no real ad-platform API credentials; dry-run returns `dry_run` status.

### Resolved in recent series

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
