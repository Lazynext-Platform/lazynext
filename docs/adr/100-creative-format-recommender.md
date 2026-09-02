# ADR-100: Creative Format Recommender

**Date:** 2026-10-08
**Status:** Accepted

## Context

LazyNext users create ad content across multiple platforms but often default to a single creative
format (typically image or video) without considering which format best fits their campaign goal,
target audience, and platform. Choosing the wrong format wastes budget — an image ad may underperform
for an engagement goal on TikTok where short-form video thrives, while a text ad may be ideal for a
conversion goal on a search-aligned platform. Marketers need a tool that recommends the best creative
formats (video, carousel, image, story, text) for a given product/brand and goal, with scores,
rationale, best use cases, and platform-specific tips.

A "Creative Format Recommender" that uses AI to recommend creative formats — producing a ranked list
of formats with scores (0-100), rationale, best use cases, platform-specific tips, a top pick,
overall reasoning, and actionable recommendations — would give users a data-driven starting point
for format selection before they invest in production.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-format-recommender.ts`

A self-contained creative format recommender engine that:
- Takes a product or brand, a campaign goal (awareness, consideration, conversion, engagement,
  retention), a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce format recommendations with
  scores, rationale, best use cases, platform-specific tips, a top pick, reasoning, and
  recommendations.
- Returns a `FormatRecommenderResult` with a `recommendation` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic recommendations
  based on campaign goal, target audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeFormatRecommenderInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-format-recommender/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/formats/goals (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-format-recommender/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), campaign goal (selector), target audience (input), and an
  optional platform selector.
- Displays results: top pick badge, reasoning, ranked format cards with scores, rationale, best
  use cases, platform tips, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeFormatRecommender` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, campaignGoal, targetAudience, platform, generate, generating,
formats, topPick, reasoning, bestUseCases, platformTips, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/creative-format-recommender.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_FORMATS, VALID_GOALS, DEFAULT_GOAL, MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing campaignGoal, invalid campaignGoal, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type, valid minimal input,
  empty platform accepted).
- Dry-run mode (returns recommendation with correct structure for formats, scores in 0-100 range,
  formats sorted by score descending, topPick matches highest-scoring format, reasoning and
  recommendations present, works for all four platforms and all campaign goals, bestUseCases and
  platformTips are non-empty strings, rejects invalid input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic format recommendations based on campaign goal, target audience, and
platform:
- All five formats (video, carousel, image, story, text) are scored.
- Goal-based bias maps adjust base scores per format (e.g., video scores high for awareness,
  story scores high for engagement, carousel scores high for consideration).
- Scores are deterministic, derived from goal bias and audience length.
- Formats are sorted by score descending.
- Top pick is the highest-scoring format.
- Each format includes rationale, best use cases, and platform-specific tips referencing the
  product/brand and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a data-driven starting point for creative format selection, reducing
  wasted budget on ill-fitting formats.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Platform-specific tips give marketers actionable guidance for each format on the
  target platform.
- **Negative:** The heuristic fallback does not account for nuanced format-fit factors that the
  LLM would catch (e.g., seasonal trends, competitive landscape, audience sub-segments).
- **Negative:** Format scores in dry-run mode are deterministic approximations, not based on
  real performance data or audience analysis.

## Research Sources

Creative format effectiveness methodology drawn from advertising format performance research and
platform-native best practices. The architecture follows the patterns established in ADR-098
(Creative Quality Scorer) for self-contained library design with dry-run fallback and ADR-073
(Ad Hashtag Generator) for plan-tier-aware model selection.
