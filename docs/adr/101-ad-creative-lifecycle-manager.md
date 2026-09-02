# ADR-101: Ad Creative Lifecycle Manager

**Date:** 2026-10-04
**Status:** Accepted

## Context

LazyNext users launch ad creatives across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to manage the full lifecycle of a creative from launch to
retirement. Creatives follow a predictable lifecycle — launch (testing fit), growth (scaling),
maturity (peak performance), decline (fatigue), and retirement (exhausted) — but marketers
often miss the optimal moments to refresh, scale, or retire a creative because they lack
stage-aware health indicators, timing guidance, and forward-looking performance predictions.
Running a creative too long leads to audience fatigue and rising costs; pulling it too early
leaves performance on the table.

An "Ad Creative Lifecycle Manager" that uses AI to analyze a creative's lifecycle position —
producing the current stage, a stage-by-stage analysis timeline with health indicators and
estimated durations, refresh recommendations with priority and timing, a performance
prediction, retirement signals, and actionable recommendations — would give users a
comprehensive lifecycle management view that maximizes creative ROI.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag
Generator (ADR-073), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-lifecycle-manager.ts`

A self-contained ad creative lifecycle manager engine that:
- Takes a product or brand, a creative description, a current lifecycle stage (launch, growth,
  maturity, decline, retirement — default launch), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce the current stage, a
  stage analysis timeline (with health, estimated duration, metrics, and notes per stage),
  refresh recommendations (with type, priority, description, and timing), a performance
  prediction, retirement signals, and recommendations.
- Returns a `LifecycleResult` with a lifecycle payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic lifecycle
  analysis based on product/brand, creative description, current stage, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeLifecycleManagerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-lifecycle-manager/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/stages/health indicators
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-lifecycle-manager/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), creative description (textarea), current stage
  selector, and an optional platform selector.
- Displays results: current stage badge, stage analysis timeline (with health, duration,
  metrics, and notes per phase), refresh recommendations (with priority and timing),
  performance prediction, retirement signals, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, timeline scales).

### 4. Translations

The page uses the `adCreativeLifecycleManager` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, creativeDescription, currentStage,
platform, generate, generating, currentStageLabel, stageAnalysis, refreshRecommendations,
performancePrediction, retirementSignals, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-creative-lifecycle-manager.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, VALID_STAGES, VALID_HEALTH, DEFAULT_STAGE, MAX_PRODUCT_LENGTH,
  MAX_CREATIVE_LENGTH).
- Input validation (missing productOrBrand, missing creativeDescription, over-length fields,
  invalid currentStage, invalid platform, invalid dryRun type, valid minimal input, empty
  platform/currentStage accepted).
- Dry-run mode (returns lifecycle with correct structure for stageAnalysis/
  refreshRecommendations, valid currentStage, performancePrediction/retirementSignals/
  recommendations present, works for all four platforms and all lifecycle stages, metrics
  numeric, estimatedDuration positive integer, deterministic output, reflects currentStage,
  defaults to launch, health varies across stages, high-priority refresh for decline stage,
  rejects invalid input/creativeDescription/currentStage/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic lifecycle analysis based on product/brand, creative description,
current stage, and platform:
- All five lifecycle stages are analyzed (launch, growth, maturity, decline, retirement).
- Each stage has a health indicator (healthy for launch/growth, warning for maturity, critical
  for decline/retirement), an estimated duration in days, metrics (CTR, CPA, ROAS, frequency),
  and notes.
- Refresh recommendations are generated with priority based on the current stage.
- Performance prediction is tailored to the current stage.
- Retirement signals are generated with concrete thresholds (CTR, CPA, frequency, ROAS,
  saturation).
- Recommendations are generated based on the current stage and health.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic, stage-aware lifecycle management view that helps
  marketers refresh, scale, and retire creatives at optimal moments, maximizing creative ROI.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Retirement signals with concrete thresholds give marketers clear, measurable
  triggers for when to retire a creative rather than relying on gut feel.
- **Negative:** The heuristic fallback does not account for nuanced lifecycle factors that the
  LLM would catch (e.g., platform-specific fatigue curves, audience-specific saturation
  patterns, seasonal effects).
- **Negative:** Stage durations and metrics in dry-run mode are deterministic approximations,
  not based on real campaign data.

## Research Sources

Ad creative lifecycle management methodology drawn from advertising fatigue research and
creative performance decay models. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
