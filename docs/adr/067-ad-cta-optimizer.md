# ADR-067: Ad CTA Optimizer

**Date:** 2026-09-29
**Status:** Accepted

## Context

LazyNext users craft ad copy across many platforms (TikTok, Instagram, YouTube, Facebook) and
frequently struggle with the call-to-action (CTA) — the single phrase that determines whether a
viewer clicks, signs up, or buys. A generic "Shop now" or "Learn more" leaves conversion on the
table, while a well-tuned CTA that matches the platform's energy, the campaign goal, and a
psychological trigger (scarcity, social proof, curiosity, FOMO) can lift conversion by double-digit
percentages. Marketers often default to whatever CTA they used last, without testing alternatives or
considering platform-specific best practices.

An "Ad CTA Optimizer" that uses AI to generate a batch of high-converting CTAs — each with an
urgency level, action verb, psychological trigger, predicted conversion lift, and best-for-platform
recommendation — would remove the guesswork and give users a ready-to-test CTA menu before they
launch.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a self-contained
analysis library with a dry-run fallback, plan-tier-aware model selection, and deterministic
heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-cta-optimizer.ts`

A self-contained ad CTA optimizer engine that:
- Takes a product/brand description, a platform, an optional goal, an optional current CTA, and a
  count (1-8, default 5).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate high-converting CTAs with an
  urgency level (low/medium/high/critical), action verb, psychological trigger, predicted
  conversion lift (e.g., "+5%"), and best-for-platform recommendation.
- Returns a list of `AdCTA` objects.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific CTA templates — e.g.,
  TikTok favors urgent, trend-aligned CTAs; Instagram favors aspirational, lifestyle CTAs).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CTA_OPTIMIZER_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts` and `creative-fatigue-detector.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCTAOptimizerInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-cta-optimizer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-fatigue-detector/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-cta-optimizer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-fatigue-detector/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, optional goal, optional current CTA, and a
  count selector (1-8).
- Displays results: CTA cards with text, urgency level badge, action verb, psychological trigger,
  predicted conversion lift, and best-for-platform badge; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, badges wrap).

### 4. Translations

The page uses the `adCtaOptimizer` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, goal, currentCTA, count, optimize, optimizing,
actionVerb, psychologicalTrigger, predictedConversionLift, bestForPlatform, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/ad-cta-optimizer.test.ts`

Follows the pattern of `test/creative-fatigue-detector.test.ts`. Tests cover:
- Credit cost (`AD_CTA_OPTIMIZER_CREDIT_COST` is 3).
- Input validation (missing productOrBrand, non-object input, missing/invalid platform, over-length
  productOrBrand/goal/currentCTA, count out of range, invalid count type, invalid dryRun type,
  valid minimal input).
- Dry-run mode (returns ctas with correct structure, requested count honored, defaults to 5,
  bestForPlatform matches requested platform, rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic CTAs based on platform-specific templates:
- TikTok: short, urgent, trend-aligned ("Get yours now", "Don't scroll past this").
- Instagram: aspirational, lifestyle ("Tap to shop", "Start your journey").
- YouTube: informational, value-driven ("Watch now", "Learn more").
- Facebook: direct, benefit-led ("Claim your discount", "Shop the sale").

Each dry-run CTA includes an urgency level, action verb, psychological trigger, predicted
conversion lift, and best-for-platform field.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in CTA selection by grounding generation in product, platform,
  goal, and psychological triggers — giving users a ready-to-test CTA menu before launch.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Predicted conversion lift and psychological trigger labels help users reason about
  why a CTA might outperform and pick variants for A/B testing.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch (e.g., a luxury brand may warrant a softer
  CTA even on TikTok).
- **Negative:** 3 credits per optimization may add up for users who iterate frequently; however,
  the cost is low relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

CTA best practices drawn from industry research (Meta Business, TikTok for Business, YouTube Ads)
and adapted to LazyNext's multi-platform e-commerce ad context. The architecture follows the
patterns established in ADR-055 (Ad Format Optimizer) for self-contained library design with
dry-run fallback and plan-tier-aware model selection.
