# ADR-107: Ad Creative Burnout Detector

**Date:** 2026-10-08
**Status:** Accepted

## Context

LazyNext users run ad creatives across multiple platforms (TikTok, Instagram, YouTube, Facebook)
for extended periods, but lack a systematic way to detect creative burnout and fatigue before it
impacts performance. A creative that performed well at launch can silently degrade as frequency
fatigue, message staleness, hook decay, CTA fatigue, visual fatigue, audience saturation, and
competitive pressure accumulate over time. Marketers typically discover burnout only after metrics
decline — by which point budget has already been wasted.

An "Ad Creative Burnout Detector" that uses AI to analyze creative content, a product or brand,
the number of days the creative has been running, and an optional platform — producing a burnout
level (healthy/warning/elevated/critical), risk score (0-100), fatigue indicators with severity
and detection status, performance decline predictions, refresh recommendations with priority and
expected lift, optimal refresh timing, and actionable recommendations — would give users early
warning before performance drops.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-burnout-detector.ts`

A self-contained ad creative burnout detector engine that:
- Takes content, a product or brand, the number of days the creative has been running
  (0-365), and an optional platform (tiktok, instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a burnout level, risk score,
  fatigue indicators, decline predictions, refresh recommendations, optimal refresh timing, and
  recommendations.
- Returns a `BurnoutDetectorResult` with a `BurnoutAnalysis` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic burnout analysis
  based on days running, content length, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeBurnoutDetectorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-burnout-detector/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/burnout levels/refresh
  priorities (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-burnout-detector/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content, product/brand, days running (number input), and an optional platform
  selector (with an "any" option plus the four supported platforms).
- Displays results: risk score with burnout level badge and progress bar, fatigue indicator cards
  with severity bars and detected/clear status, decline prediction cards with trend and timeframe,
  refresh recommendation cards with priority and expected lift, optimal refresh timing, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeBurnoutDetector` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, daysRunning, platform, generate, generating, riskScore,
burnoutLevel, fatigueIndicators, declinePredictions, refreshRecommendations, optimalRefreshTiming,
recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-creative-burnout-detector.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_BURNOUT_LEVELS, VALID_REFRESH_PRIORITIES, MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH, MAX_DAYS).
- Input validation (missing content, whitespace-only content, over-length content, missing
  productOrBrand, whitespace-only productOrBrand, over-length productOrBrand, missing/invalid/
  non-finite/non-number daysRunning, negative daysRunning, daysRunning over MAX_DAYS, invalid
  platform, non-string platform, invalid dryRun type, valid minimal input, empty/undefined
  platform accepted, daysRunning of 0 and MAX_DAYS accepted).
- Dry-run mode (returns analysis with correct structure for fatigueIndicators/declinePredictions/
  refreshRecommendations, riskScore in 0-100 range, valid burnoutLevel, optimalRefreshTiming
  present, recommendations present, works for all four platforms and without a platform,
  deterministic output, riskScore increases with longer daysRunning, fixed counts for indicators/
  predictions/recommendations, rejects invalid input/productOrBrand/daysRunning/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic burnout analysis based on days running, content length, and platform:
- A risk score (0-100) is derived from days running and content length, clamped to 5-95.
- Burnout level is derived from the risk score (critical 75+, elevated 50-74, warning 25-49,
  healthy 0-24).
- Seven fatigue indicators are generated (frequency_fatigue, message_staleness, hook_decay,
  cta_fatigue, visual_fatigue, audience_saturation, competitive_pressure), each with a severity
  (0-100) and detected flag (true when severity >= 40).
- Three decline predictions are generated (click_through_rate, cost_per_click, conversion_rate),
  each with a current trend and predicted decline percentage.
- Three refresh recommendations are generated (hook_refresh, visual_update, message_variation),
  each with a priority (low/medium/high) and expected lift percentage.
- Optimal refresh timing is derived from the risk score.
- Four actionable recommendations are generated based on detected indicators and high-priority
  refresh recommendations.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides early warning of creative burnout before performance declines, letting
  marketers refresh creatives proactively rather than reactively.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Fatigue indicators with severity and detected status, plus decline predictions
  with timeframes, give marketers concrete, actionable insight into which aspects of the creative
  are fatiguing and when to expect impact.
- **Negative:** The heuristic fallback does not account for nuanced burnout factors that the LLM
  would catch (e.g., audience-specific saturation, competitive counter-moves, seasonal context).
- **Negative:** Risk scores in dry-run mode are deterministic approximations based on days
  running and content length, not based on real performance data or creative analysis.

## Research Sources

Creative burnout and ad fatigue methodology drawn from advertising effectiveness research and
frequency fatigue frameworks. The architecture follows the patterns established in ADR-098
(Creative Quality Scorer) for self-contained library design with dry-run fallback and ADR-073
(Ad Hashtag Generator) for plan-tier-aware model selection.
