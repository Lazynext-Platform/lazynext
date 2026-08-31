# ADR-097: Ad Competitive Intelligence

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users running paid ad campaigns need to understand the competitive landscape to
differentiate their creative strategy. Without competitive intelligence, brands risk creating
ads that blend in with competitors, missing positioning gaps, and failing to exploit
differentiation opportunities. Marketers need a tool that analyzes competitors' estimated
strategies, strengths, and weaknesses, identifies positioning gaps and differentiation
opportunities, and generates counter-strategies — all grounded in the specific category and
platform context.

An "Ad Competitive Intelligence" tool that uses AI to analyze the competitive landscape —
producing per-competitor analysis (estimated strategy, strengths, weaknesses, market position),
positioning gaps, differentiation opportunities, counter-strategies, market positioning summary,
and recommendations — would give users a strategic blueprint for standing out.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-competitive-intelligence.ts`

A self-contained ad competitive intelligence engine that:
- Takes a product or brand, a category, comma-separated competitor names, and an optional
  platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce competitor analysis
  (estimated strategy, strengths, weaknesses, market position), positioning gaps,
  differentiation opportunities, counter-strategies, market positioning, and recommendations.
- Returns a `CompetitiveIntelligenceResult` with a `CompetitiveIntelligence` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic analysis
  based on competitors, category, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCompetitiveIntelligenceInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-competitive-intelligence/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-competitive-intelligence/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand, category, competitors (comma-separated), and an optional
  platform selector.
- Displays results: market positioning summary, competitor analysis cards (with strategy,
  strengths, weaknesses, market position badge), positioning gaps and differentiation
  opportunities in a two-column grid, counter-strategy cards, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses to single column, badges
  wrap).

### 4. Translations

The page uses the `adCompetitiveIntelligence` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, category, competitors, platform, generate,
generating, marketPositioning, competitorsAnalysis, estimatedStrategy, strengths, weaknesses,
positioningGaps, differentiationOpportunities, counterStrategies, recommendations, copy,
copied, dryRunNotice, error.

### 5. Unit tests `test/ad-competitive-intelligence.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST` is 5).
- Input validation (missing productOrBrand, missing category, missing competitors, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted).
- Dry-run mode (returns intelligence with correct structure for competitors/counter-strategies,
  positioningGaps/differentiationOpportunities/marketPositioning/recommendations present, one
  competitor per comma-separated name, works for all four platforms, rejects invalid
  input/competitors).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic competitive intelligence based on competitors, category, and
platform:
- Each competitor gets a rotating estimated strategy, strengths, weaknesses, and market
  position (leader/challenger/niche/follower).
- Positioning gaps highlight underexploited areas (emotional storytelling, sustainability,
  educational content, community-driven content).
- Differentiation opportunities are generated dynamically from the brand and category.
- Counter-strategies target the top competitors' weaknesses.
- Market positioning summarizes the competitive landscape.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Gives marketers a strategic blueprint for differentiating their ad creative
  against competitors, grounded in category and platform context.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Counter-strategies give marketers concrete, competitor-specific actions rather
  than generic advice.
- **Negative:** The heuristic fallback does not account for real competitor ad data or live
  market intelligence that the LLM would catch.
- **Negative:** Estimated strategies in dry-run mode are generic approximations, not based on
  real competitor analysis.

## Research Sources

Competitive intelligence methodology drawn from marketing strategy literature and competitive
analysis frameworks. The architecture follows the patterns established in ADR-073 (Ad Hashtag
Generator) for self-contained library design with dry-run fallback and ADR-071 (Ad Thumbnail
Generator) for plan-tier-aware model selection.
