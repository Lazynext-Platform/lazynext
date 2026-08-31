# ADR-103: Ad Creative A/B Test Simulator

**Date:** 2026-10-06
**Status:** Accepted

## Context

LazyNext users create multiple ad creative variants but have no way to predict
which variant will win an A/B test before committing budget and impressions.
Running a real A/B test is expensive — it costs ad spend, takes days to reach
statistical significance, and delays launch if the losing variant underperforms.
Marketers need a tool that simulates A/B test outcomes upfront: given two
creative variants, a product/brand, a test objective, and an optional platform,
predict the winner, confidence, per-variant predicted metrics (CTR, engagement,
conversion), a statistical significance estimate, key differences, and
recommendations.

An "Ad Creative A/B Test Simulator" that uses AI to simulate A/B test outcomes
— producing a predicted winner (A/B/tie), confidence score (0-100), per-variant
predicted metrics with confidence, strengths, weaknesses, predicted scores, a
significance estimate, key differences, and recommendations — would let users
prioritize the strongest variant before spending budget.

The patterns were drawn from the Creative Quality Scorer (ADR-098), which
demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-ab-test-simulator.ts`

A self-contained A/B test simulator engine that:
- Takes two creative variants (variantA, variantB), a product or brand, a test
  objective (ctr, engagement, conversion, brand_awareness, retention — default
  ctr), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a predicted
  winner, confidence score, per-variant predicted metrics, a significance
  estimate, key differences, and recommendations.
- Returns an `AbTestSimulatorResult` with a `SimulationResult` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic
  heuristic predictions based on variant length, objective, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST`).
- Includes a prompt injection guard in the system prompt.

The library mirrors the patterns in `creative-quality-scorer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()`
detection, `validateAdCreativeAbTestSimulatorInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-ab-test-simulator/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/objectives
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-ab-test-simulator/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for variantA (textarea), variantB (textarea), product/brand
  (input), test objective selector, and an optional platform selector.
- Displays results: predicted winner badge, confidence score, variant A/B
  comparison cards with metrics/strengths/weaknesses, significance estimate,
  key differences, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses).

### 4. Translations

The page uses the `adCreativeAbTestSimulator` namespace via `useI18n`. Because
the `t` function falls back to the key string when a translation is missing,
the page renders correctly without modifying `src/i18n/locales/en.ts` or any
locale files. Keys used: title, subtitle, signInPrompt, skipToContent,
variantA, variantB, productOrBrand, testObjective, platform, generate,
generating, predictedWinner, confidenceScore, variantAPrediction,
variantBPrediction, strengths, weaknesses, keyDifferences,
significanceEstimate, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-ab-test-simulator.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, VALID_OBJECTIVES, DEFAULT_OBJECTIVE,
  MAX_VARIANT_LENGTH, MAX_PRODUCT_LENGTH).
- Input validation (missing variantA, missing variantB, missing productOrBrand,
  over-length fields, invalid testObjective, invalid platform, invalid dryRun
  type, valid minimal input, empty platform/testObjective accepted, both
  variants missing).
- Dry-run mode (returns simulation with correct structure for
  variants/metrics, predictedWinner in A/B/tie, confidenceScore in 0-100 range,
  strengths/weaknesses/significanceEstimate/keyDifferences/recommendations
  present, works for all four platforms and all objectives, predicts A/B/tie
  based on variant length, deterministic for same input, rejects invalid
  input/variantB/productOrBrand, includes ctr/engagement_rate/conversion_rate
  metrics).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic A/B test simulation based on
variant length, objective, and platform:
- Each variant receives a predicted score (0-100) derived from its length.
- The predicted winner is the variant with the higher score (tie if equal).
- Per-variant metrics include ctr, engagement_rate, and conversion_rate,
  derived from the predicted score.
- Confidence score is derived from the score difference between variants.
- Significance estimate is based on the score difference.
- Strengths and weaknesses are generated based on the predicted score.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Lets marketers prioritize the strongest creative variant before
  spending ad budget, reducing wasted spend on losing variants.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and
  avoids merge conflicts.
- **Positive:** Per-variant metrics with confidence values give marketers a
  quantitative basis for variant selection rather than gut feeling.
- **Negative:** The heuristic fallback does not account for nuanced creative
  factors that the LLM would catch (e.g., emotional resonance, audience
  specificity, cultural context).
- **Negative:** Predicted metrics in dry-run mode are deterministic
  approximations, not based on real creative analysis or historical
  performance data.

## Research Sources

A/B test simulation methodology drawn from advertising testing research and
conversion rate optimization frameworks. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library
design with dry-run fallback and plan-tier-aware model selection.
