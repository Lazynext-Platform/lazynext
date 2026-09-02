# ADR-090: Creative Performance Forecaster

**Date:** 2026-10-06
**Status:** Accepted

## Context

LazyNext users create ad creatives across TikTok, Instagram, YouTube, and Facebook and need to
predict how a creative will perform before they commit budget. Launching a creative blind wastes
spend on underperforming variants and delays learning. Marketers need a forecast of predicted
metrics — click-through rate, engagement rate, conversion rate, and reach — with confidence
intervals so they can set realistic expectations, compare variants, and decide where to allocate
budget. They also need a risk assessment, the key drivers behind the forecast, and actionable
optimization suggestions to improve the creative before it goes live.

A "Creative Performance Forecaster" that uses AI to forecast creative performance with confidence
intervals — returning predicted CTR, engagement, conversion, and reach ranges, an overall score,
a letter grade, a confidence level, a risk assessment, key drivers, and optimization suggestions —
would give users a data-grounded preview of expected performance before they spend.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Performance Predictor
(ADR-064), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-performance-forecaster.ts`

A self-contained creative performance forecaster engine that:
- Takes creative content, a product or brand, a platform (tiktok/instagram/youtube/facebook), an
  optional campaign goal (awareness/engagement/conversions/traffic/app_installs), an optional
  budget tier (small/medium/large), and a dryRun flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to forecast predicted metrics with
  confidence intervals (low/mid/high), an overall score (0-100), a letter grade (F-A+), a
  confidence level (0-100), a risk assessment, key drivers, and optimization suggestions.
- Returns a `PerformanceForecasterResult` with a `PerformanceForecast` and a `dryRun` flag.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific benchmark data and
  budget-tier adjustments — e.g., TikTok favors higher engagement; large budgets scale reach but
  increase fatigue risk).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-performance-predictor.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asMetricRange`/`asGrade` helpers, `isDryRun()`
detection, `validateCreativePerformanceForecasterInput()` validation, deterministic dry-run output,
and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-performance-forecaster/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/goals/budget tiers/grades (no
  auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-performance-forecaster/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for creative content, product/brand, platform selector (required), campaign goal
  selector (optional), and budget tier selector (optional).
- Displays results: overall score / grade / confidence summary cards, predicted metric ranges
  (CTR, engagement, conversion, reach) with low/mid/high, risk assessment, key drivers, and
  optimization suggestions; and a copy-to-clipboard button that copies the full forecast as text.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, cards stack, lists wrap).
- Does not use `Image` from lucide-react.

### 4. Translations

The page uses the `creativePerformanceForecaster` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, creativeContent, productOrBrand, platform, campaignGoal, budgetTier,
none, generate, generating, overallScore, grade, confidence, predictedMetrics, predictedCTR,
predictedEngagement, predictedConversion, predictedReach, riskAssessment, keyDrivers,
optimizationSuggestions, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-performance-forecaster.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST` is 5).
- Input validation (missing creativeContent, missing/over-length productOrBrand, missing/invalid
  platform, invalid campaignGoal, invalid budgetTier, invalid dryRun type, valid minimal input,
  valid input with all optional fields, non-object input).
- Dry-run mode (returns forecast with correct structure, works for all four platforms, adjusts
  reach based on budget tier, defaults budget tier to medium, rejects invalid input/platform/
  productOrBrand).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic forecasts based on platform-specific benchmarks and budget-tier
adjustments:
- tiktok: CTR 0.8-2.2%, engagement 6-16%, conversion 1.2-3.2%, reach 30-150K; favors UGC-style
  hooks and trend-aligned audio.
- instagram: CTR 0.5-1.8%, engagement 3-10%, conversion 0.8-2.5%, reach 20-120K; favors visual
  aesthetics and Reels discovery.
- youtube: CTR 0.3-1.3%, engagement 1.5-6%, conversion 0.6-2.0%, reach 40-200K; favors compelling
  thumbnails and strong opening hooks.
- facebook: CTR 0.6-1.8%, engagement 1.5-6%, conversion 1.0-3.2%, reach 50-250K; favors emotional
  storytelling and social proof.

Budget tier multiplies reach (small 0.7x, medium 1.0x, large 1.4x), adjusts the overall score
(small -3, medium 0, large +3), and sets confidence (small 55, medium 70, large 82). Each budget
tier has its own risk assessment describing variance, data sufficiency, and fatigue risk.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates blind spending by giving users a data-grounded preview of expected
  creative performance with confidence intervals before they commit budget.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Confidence intervals and risk assessment help users set realistic expectations and
  compare variants quantitatively.
- **Negative:** The heuristic fallback is generic and does not account for real-time performance
  data or audience-specific nuances that the LLM would catch.
- **Negative:** Predicted reach values in dry-run mode are static approximations, not live data.

## Research Sources

Creative performance forecasting benchmarks drawn from industry research (TikTok for Business,
Meta Business, YouTube Creator Academy, Facebook Business) and digital advertising literature.
The architecture follows the patterns established in ADR-073 (Ad Hashtag Generator) for
self-contained library design with dry-run fallback and ADR-064 (Ad Performance Predictor) for
confidence-interval-based performance forecasting.
