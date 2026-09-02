# ADR-055: Ad Format Optimizer

**Date:** 2026-09-22
**Status:** Accepted

## Context

LazyNext users generate creatives across many formats (single image, carousel, video, story, reel,
collection) and platforms (TikTok, Instagram, YouTube, Facebook). Choosing the right format for a
given product, audience, platform, budget, and campaign goal is a common source of analysis
paralysis: a low-budget TikTok launch should lean on reels, while a high-budget YouTube campaign
should lean on video, and a catalog-heavy Facebook retargeting push should lean on collection ads.
Marketers frequently default to whatever format they produced last, leaving reach and conversion on
the table.

An "Ad Format Optimizer" that uses AI to rank the six supported ad formats — with a 0-100 fit
score, rationale, production complexity, estimated cost range, and per-platform fit scores — would
remove the guesswork and help users pick the format most likely to perform before they spend on
production.

The patterns were drawn from the Competitor Watch (ADR-046), which demonstrated a self-contained
analysis library with a dry-run fallback, and the Smart Calendar (ADR-045), which demonstrated
plan-tier-aware model selection and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-format-optimizer.ts`

A self-contained ad format optimizer engine that:
- Takes a product/brand description, optional target audience, platforms, budget tier, and goals.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to rank the six ad formats
  (single_image, carousel, video, story, reel, collection) with a 0-100 score, rationale,
  production complexity, estimated cost range, and per-platform fit scores.
- Returns a ranked list of `FormatRecommendation` plus a single `bestPick` and a high-level
  `reasoning` paragraph.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic platform-fit and budget
  multipliers — e.g., low budget + tiktok favors reel, high budget + youtube favors video).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_FORMAT_OPTIMIZER_CREDIT_COST`).

The library mirrors the patterns in `competitor-watch.ts` and `smart-calendar.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdFormatOptimizerInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-format-optimizer/route.ts`

Follows the exact pattern of `src/app/api/creative/competitor-watch/route.ts`:
- **GET**: returns credit cost, schema info, and available formats (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses.

### 3. New UI page `src/app/ad-format-optimizer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/competitor-watch/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, optional target audience, platform checkboxes, budget
  selector, and goal checkboxes.
- Displays results: ranked format recommendations with score, rationale, best-for tags,
  production complexity, estimated cost, and platform fit scores; a highlighted best pick with
  reasoning; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, tags wrap).

### 4. Translations

The page uses the `adFormatOptimizer` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, targetAudience, platforms, budget, goals, optimize, optimizing,
bestPick, complexity, estimatedCost, score, bestFor, platformFit, copy, copied, dryRunNotice,
error.

### 5. Unit tests `test/ad-format-optimizer.test.ts`

Follows the pattern of `test/smart-calendar.test.ts`. Tests cover:
- Credit cost (`AD_FORMAT_OPTIMIZER_CREDIT_COST` is 4).
- Input validation (missing productOrBrand, non-object input, invalid platform, invalid budget,
  invalid goal, invalid dryRun type, over-length productOrBrand, valid minimal input).
- Dry-run mode (returns recommendations with correct structure, has a bestPick present in the
  recommendations, non-empty reasoning, score-descending ranking, bestPick is the top
  recommendation, low budget + tiktok favors reel over video, high budget + youtube favors
  video, platformFit covers all requested platforms, defaults platforms when none provided,
  rejects invalid input/platform/budget).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic recommendations based on platform-fit base scores and budget
multipliers:
- TikTok: reel (95) and video (85) dominate; single_image underperforms (35).
- Instagram: reel (90) and story (85) strongest; carousel (80) for product detail.
- YouTube: video (95) strongest; story not applicable (30).
- Facebook: collection (85), carousel (80), and video (80) strong.
- Low budget multiplies cheaper formats (single_image, story, reel) up and expensive ones
  (video, collection) down; high budget does the inverse.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in ad format selection by grounding recommendations in
  product, audience, platform, budget, and goals — before production spend is committed.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Per-platform fit scores let users see at a glance which formats work where,
  enabling cross-platform strategy decisions.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch (e.g., a luxury brand may warrant video
  even at low budget).
- **Negative:** 4 credits per optimization may add up for users who iterate frequently; however,
  the cost is moderate relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Platform-format best practices drawn from industry research (Meta Business, TikTok for Business,
YouTube Ads) and adapted to LazyNext's multi-platform e-commerce ad context. The architecture
follows the patterns established in ADR-046 (Competitor Watch) for self-contained library design
with dry-run fallback and ADR-045 (Smart Calendar) for plan-tier-aware model selection.
