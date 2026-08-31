# ADR-114: Ad Creative Hook Timing Optimizer

**Date:** 2026-10-18
**Status:** Accepted

## Context

LazyNext users craft ad creative content with hooks designed to grab audience attention, but the
timing and placement of those hooks is often suboptimal. A hook that lands too late — even a great
one — loses 40-60% of the audience before the core message registers. Marketers lack a systematic
way to determine the optimal timing window for a hook, assess how effective the current placement
is, predict engagement at different timestamps, and get concrete recommendations for improving hook
timing. Platform-specific attention curves (TikTok's 1-3 second window, YouTube's 5-10 second
window) further complicate manual optimization.

An "Ad Creative Hook Timing Optimizer" that uses AI to analyze hook timing — producing an optimal
placement recommendation, an effectiveness score (0-100), a timing analysis with current placement,
optimal window, attention curve, and retention risk, engagement predictions at multiple timestamps,
and actionable recommendations — would give users a data-driven hook timing strategy before they
publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-hook-timing-optimizer.ts`

A self-contained ad creative hook timing optimizer engine that:
- Takes content, a product or brand, a hook type (question, statistic, story, shock, curiosity,
  bold_claim, problem, transformation — default curiosity), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce optimal hook placement, an
  effectiveness score (0-100), timing analysis, engagement predictions at different timestamps,
  and recommendations.
- Returns a `HookTimingOptimizerResult` with a `HookTiming` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic optimization
  based on content length, hook type, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeHookTimingOptimizerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-hook-timing-optimizer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/hook types/retention risks
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-hook-timing-optimizer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content, product/brand, hook type selector (8 types), and an optional platform
  selector.
- Displays results: optimal placement with effectiveness score gauge, timing analysis with
  retention risk badge, engagement predictions chart with dual bars (engagement + retention), and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeHookTimingOptimizer` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, content, productOrBrand, hookType, platform, generate, generating,
optimalPlacement, effectivenessScore, timingAnalysis, engagementPredictions, recommendations,
copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-hook-timing-optimizer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_HOOK_TYPES with 8 types, VALID_RETENTION_RISKS,
  DEFAULT_HOOK_TYPE, MAX_CONTENT_LENGTH, MAX_PRODUCT_LENGTH).
- Input validation (missing content, missing productOrBrand, over-length fields, invalid
  hookType, invalid platform, invalid dryRun type, valid minimal input, empty platform/hookType
  accepted).
- Dry-run mode (returns timing with correct structure for effectiveness score, timing analysis,
  engagement predictions, optimal placement, recommendations, works for all four platforms and
  all hook types, deterministic output, 5 predictions with timestamps, retention risk logic,
  rejects invalid input/productOrBrand/hookType/platform, works without platform and hookType).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic hook timing optimization based on content length, hook type, and
platform:
- Effectiveness score is derived from content length plus a per-hook-type boost (shock and
  transformation get the highest boosts).
- Optimal window is platform-specific (TikTok/Instagram/Facebook: 0-3s, YouTube: 0-10s, default:
  0-5s).
- Current placement is inferred from content length (long content = hook appears mid-content).
- Retention risk is derived from effectiveness score (>=70 low, >=45 medium, else high).
- Five engagement predictions are generated for timestamps 0s, 3s, 6s, 10s, 15s with a decay
  model.
- Five recommendations cover hook placement, secondary hooks, value proposition front-loading,
  A/B testing, and curiosity gaps.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a data-driven hook timing strategy that aligns hook placement with
  platform-specific attention curves, maximizing engagement.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Engagement predictions at multiple timestamps give marketers a concrete picture
  of where audience attention rises and falls.
- **Negative:** The heuristic fallback does not account for nuanced creative context that the
  LLM would catch (e.g., audience segment-specific attention patterns, content genre norms).
- **Negative:** Effectiveness scores in dry-run mode are deterministic approximations, not based
  on real engagement data.

## Research Sources

Hook timing and attention curve methodology drawn from short-form video engagement research and
platform-specific creative best practices. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
