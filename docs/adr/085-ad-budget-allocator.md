# ADR-085: Ad Budget Allocator

**Date:** 2026-10-07
**Status:** Accepted

## Context

LazyNext users run paid ad campaigns across TikTok, Instagram, YouTube, and Facebook, but deciding
how to split budget across platforms is a persistent challenge. Allocate too much to one platform
and you miss audience diversity; spread too thin and no platform gets enough spend to exit the
learning phase. The optimal split depends on the campaign goal (awareness, engagement, conversions,
traffic, app installs), the product, and platform-specific cost and performance characteristics.
Without a data-driven allocation tool, marketers rely on gut feel, which often leads to wasted spend
and suboptimal results.

An "Ad Budget Allocator" that uses AI to allocate budget across platforms — producing per-platform
allocations with percentages, amounts, expected reach/clicks/conversions, rationale, a recommended
split summary, optimization notes, and risk factors — would give users a strategic budget plan
before they start spending.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Creative Concept Validator
(ADR-082), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-budget-allocator.ts`

A self-contained ad budget allocator engine that:
- Takes a product or brand (max 2000 chars), a total budget (string like "$10,000", max 100 chars),
  a campaign goal (awareness, engagement, conversions, traffic, app_installs), and an optional array
  of platforms (tiktok, instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to allocate the budget and produce
  per-platform allocations with percentage, amount, expected reach/clicks/conversions, and
  rationale, plus a recommended split summary, optimization notes, and risk factors.
- Returns a `BudgetAllocation` object wrapped in a `BudgetAllocatorResult`.
- Has a dry-run fallback when Atlas is unavailable (uses goal-based default split percentages,
  normalizes to sum to 100, and computes expected outcomes based on platform-specific estimates).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_BUDGET_ALLOCATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `creative-concept-validator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asStrArray`/`asCampaignGoal` helpers,
`isDryRun()` detection, `validateAdBudgetAllocatorInput()` validation, deterministic dry-run output,
and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-budget-allocator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/goals (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError` for
  error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-budget-allocator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-concept-validator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, total budget input, campaign goal selector, and a multi-select
  platform toggle (defaults to all platforms).
- Displays results: a summary card with total budget and recommended split, per-platform allocation
  cards with percentage bars, expected reach/clicks/conversions, and rationale, optimization notes,
  and risk factors; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (allocation cards stack, percentage bars are full-width,
  expected outcome grid wraps).

### 4. Translations

The page uses the `adBudgetAllocator` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, totalBudget, campaignGoal, platforms, allocate, allocating,
recommendedSplit, platformAllocations, expectedReach, expectedClicks, expectedConversions,
optimizationNotes, riskFactors, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-budget-allocator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_BUDGET_ALLOCATOR_CREDIT_COST` is 4).
- Input validation (missing productOrBrand, missing/invalid totalBudget, over-length
  productOrBrand/budget, missing/invalid campaignGoal, invalid platforms array, invalid platform in
  array, invalid dryRun type, valid minimal input).
- Dry-run mode (returns allocation with correct structure, platform allocations have correct
  structure, percentages sum to 100, works for all campaign goals, works with specific platforms,
  works without platforms, rejects invalid input/campaignGoal).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic allocation based on the campaign goal:
- awareness: favors TikTok (35%) and YouTube (25%) for low CPM and broad reach.
- engagement: favors TikTok (40%) and Instagram (35%) for high engagement rates.
- conversions: favors Facebook (30%) and YouTube (25%) for strong intent signals.
- traffic: favors TikTok (35%) and Instagram (30%) for high CTR potential.
- app_installs: favors Facebook (35%) and TikTok (30%) for app install ad formats.

Percentages are normalized to sum to exactly 100 across the selected platforms. Expected reach,
clicks, and conversions are estimated based on per-$1000 platform benchmarks. Optimization notes and
risk factors are generated based on the campaign goal and budget size.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in budget allocation by providing a goal-aware, platform-
  specific split with expected outcomes and rationale.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Risk factors and optimization notes help users avoid common budget allocation
  pitfalls before they start spending.
- **Negative:** The heuristic fallback uses static per-platform benchmarks that may not reflect
  real-time market conditions or audience-specific cost variations.
- **Negative:** Expected outcomes in dry-run mode are approximations, not predictions based on
  historical campaign data.

## Research Sources

Ad budget allocation best practices drawn from industry research (Meta Business, TikTok for
Business, Google Ads) and media buying literature. The architecture follows the patterns established
in ADR-073 (Ad Hashtag Generator) for self-contained library design with dry-run fallback and
ADR-082 (Creative Concept Validator) for multi-field output parsing.
