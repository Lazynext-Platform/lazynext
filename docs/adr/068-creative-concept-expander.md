# ADR-068: Creative Concept Expander

**Date:** 2026-09-30
**Status:** Accepted

## Context

LazyNext users often start with a single seed creative concept — a rough idea for an ad direction —
but struggle to flesh it out into multiple distinct, production-ready creative directions. A single
concept like "a before-and-after reveal" can branch into dozens of variations depending on the
platform, tone, visual style, and unique angle. Without a structured expansion step, marketers tend
to commit to their first idea, leaving creative diversity — and A/B testing opportunities — on the
table.

A "Creative Concept Expander" that uses AI to take a seed concept and expand it into multiple fully
fleshed-out creative directions — each with a title, description, hook, visual direction, tone,
format, unique angle, and estimated production difficulty — would give users a ready-to-produce
menu of creative options before they invest in production.

The patterns were drawn from the Ad Format Optimizer (ADR-055) and the Ad CTA Optimizer (ADR-067),
which demonstrated a self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/concept-expander.ts`

A self-contained creative concept expander engine that:
- Takes a seed concept, a platform, a product or brand, an optional target audience, and a count
  (3-8, default 5).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to expand the seed concept into multiple
  distinct creative directions, each with a title, description, hook, visual direction, tone,
  format, unique angle, and estimated production difficulty (easy/medium/hard).
- Returns a list of `ExpandedConcept` objects.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific concept templates —
  e.g., TikTok favors trend remixes and creator POV; Instagram favors lifestyle carousels and
  aesthetic reels).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CONCEPT_EXPANDER_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateConceptExpanderInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/concept-expander/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-cta-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/concept-expander/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for seed concept input, product/brand input, platform selector, optional target
  audience, and a count selector (3-8).
- Displays results: concept cards with title, description, hook, visual direction, unique angle,
  tone, format, and production difficulty badge; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, tags wrap).

### 4. Translations

The page uses the `conceptExpander` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, seedConcept, productOrBrand, platform, targetAudience, count, expand, expanding,
hook, visualDirection, uniqueAngle, tone, format, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/concept-expander.test.ts`

Follows the pattern of `test/ad-cta-optimizer.test.ts`. Tests cover:
- Credit cost (`CONCEPT_EXPANDER_CREDIT_COST` is 4).
- Input validation (missing seedConcept, missing productOrBrand, non-object input, missing/invalid
  platform, over-length seedConcept/productOrBrand/targetAudience, count out of range, invalid
  count type, invalid dryRun type, valid minimal input).
- Dry-run mode (returns concepts with correct structure, requested count honored, defaults to 5,
  rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic concepts based on platform-specific templates:
- TikTok: trend remixes, before-and-after reveals, creator POV, myth busters, challenge formats.
- Instagram: lifestyle carousels, aesthetic reels, story sequences, creator collabs, grid aesthetics.
- YouTube: deep dive demos, story ads, comparison videos, bumper ads, tutorial series.
- Facebook: benefit spotlights, customer stories, offer carousels, problem-solution, collection ads.

Each dry-run concept includes a title, description, hook, visual direction, tone, format, unique
angle, and estimated production difficulty.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates creative dead-ends by expanding a single seed concept into multiple
  production-ready directions — giving users a diverse menu before committing to production.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Production difficulty labels help users reason about resource requirements before
  committing to a direction.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch.
- **Negative:** 4 credits per expansion may add up for users who iterate frequently; however,
  the cost is moderate relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Creative concept expansion best practices drawn from industry research (Meta Business, TikTok for
Business, YouTube Ads) and adapted to LazyNext's multi-platform e-commerce ad context. The
architecture follows the patterns established in ADR-055 (Ad Format Optimizer) for self-contained
library design with dry-run fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model
selection.
