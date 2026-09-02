# ADR-078: Ad Placement Strategist

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users run paid ad campaigns across multiple platforms and need to decide where to place
their ads for maximum impact. Choosing placements by intuition rarely balances audience fit against
cost — a high-CPM placement may have excellent audience alignment, while a low-CPM placement may
waste spend on the wrong audience. Marketers need placement recommendations that pair platform,
placement type, and format with audience fit scores, cost estimates (CPM), reach estimates,
expected performance, and priority ranking, plus budget allocation guidance, a timeline, and risk
assessment.

An "Ad Placement Strategist" that uses AI to recommend optimal ad placement strategies across
platforms — each recommendation carrying platform, placement type, format, audience fit (1-10),
estimated CPM, estimated reach, expected performance, and priority — would give users a
data-grounded placement plan before they start spending.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Budget Optimizer
(ADR-006), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-placement-strategist.ts`

A self-contained ad placement strategist engine that:
- Takes a product or brand (required, max 2000 chars), a target audience (required, max 1000
  chars), an optional budget level (low, medium, high, default medium), and an optional goals
  array (awareness, engagement, conversions, traffic, app_installs).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate a comprehensive placement
  strategy with a summary, placements array (each with platform, placement type, format, audience
  fit 1-10, estimated CPM, estimated reach, expected performance, priority), budget allocation,
  timeline, and risks.
- Returns a `PlacementStrategy` object.
- Has a dry-run fallback when Atlas is unavailable (uses budget- and goal-specific templates —
  e.g., low budget prioritizes high-organic-reach placements like TikTok In-Feed; high budget
  spreads across all platforms with premium placements).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_PLACEMENT_STRATEGIST_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `budget-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdPlacementStrategistInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-placement-strategist/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported budgets/goals (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-placement-strategist/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, target audience, budget selector, and multi-select goals.
- Displays results: a summary, placement cards (platform, placement type, format, audience fit,
  CPM, reach, expected performance, priority badge), budget allocation, timeline, risks list, and
  a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, pills wrap, cards stack).

### 4. Translations

The page uses the `adPlacementStrategist` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, targetAudience, budget, goals, generate, generating, placements,
audienceFit, reach, budgetAllocation, timeline, risks, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-placement-strategist.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_PLACEMENT_STRATEGIST_CREDIT_COST` is 5).
- Input validation (missing productOrBrand, missing targetAudience, over-length
  productOrBrand/targetAudience, invalid budget, invalid goals (non-array and invalid value),
  invalid dryRun type, valid minimal input).
- Dry-run mode (returns strategy with correct structure, works for all three budget levels, low
  budget produces fewer placements than high budget, works with goals, works without optional
  fields, rejects invalid input/targetAudience/budget).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic strategies based on budget and goal templates:
- low budget: filters to high-priority placements only (TikTok In-Feed, Instagram Reels) —
  prioritizing cost-efficient, high-organic-reach placements.
- medium budget: includes high and medium priority placements across 3-4 platforms.
- high budget: includes all placements across all platforms with premium positioning.

Each dry-run strategy includes a summary, placements with full metadata, budget allocation,
timeline, and risks.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in ad placement by grounding recommendations in product,
  audience, budget, and goal data — giving users a data-grounded placement plan before spending.
- **Positive:** Audience fit scores and CPM estimates help users balance cost against targeting
  quality.
- **Positive:** Risk assessment and budget allocation guidance reduce common campaign pitfalls
  (ad fatigue, budget pacing, audience saturation).
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for real-time platform
  performance data or competitive bidding landscapes that the LLM would catch.
- **Negative:** CPM and reach estimates in dry-run mode are static approximations, not live
  auction data.

## Research Sources

Ad placement and media planning best practices drawn from industry research (Meta Business, TikTok
for Business, Google Ads, YouTube Creator Academy) and digital advertising literature. The
architecture follows the patterns established in ADR-073 (Ad Hashtag Generator) for self-contained
library design with dry-run fallback and ADR-006 (Performance Learning Loop / Budget Optimizer)
for budget-aware strategy generation.
