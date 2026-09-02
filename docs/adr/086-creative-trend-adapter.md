# ADR-086: Creative Trend Adapter

**Date:** 2026-10-13
**Status:** Accepted

## Context

LazyNext users create ad content across TikTok, Instagram, YouTube, and Facebook and need that
content to align with current trends to maximize reach and engagement. Static creative copy ages
quickly — a hook that resonated last week may feel stale today as trends shift. Marketers need a
way to adapt existing creative content to current trends while preserving the brand message,
along with guidance on which trends to lean into, when to publish for maximum trend alignment,
and how long the adapted content will stay relevant before it feels dated.

A "Creative Trend Adapter" that uses AI to adapt creative content to current trends — returning
trend-adapted content, identified trends, a trend relevance score, timing advice, suggested
hashtags, a risk-of-datedness assessment, a longevity score, and actionable recommendations —
would give users trend-aware content ready to publish across platforms.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-trend-adapter.ts`

A self-contained creative trend adapter engine that:
- Takes content (required, max 2000 chars), a product or brand (required, max 2000 chars), an
  optional platform (tiktok, instagram, youtube, facebook), and an optional trend category
  (viral, seasonal, cultural, industry, aesthetic).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to adapt the content to current trends,
  returning adapted content, identified trends, trend relevance (1-10), timing advice, suggested
  hashtags, risk of datedness (low/medium/high), longevity score (1-10), and recommendations.
- Returns a `TrendAdaptation` object wrapped in a `TrendAdapterResult`.
- Has a dry-run fallback when Atlas is unavailable (uses platform and category-specific templates
  — e.g., TikTok favors FYP and challenge language; Instagram favors aesthetic and community
  tags; viral trends have high relevance but high risk of datedness; aesthetic trends have lower
  risk and higher longevity).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`CREATIVE_TREND_ADAPTER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeTrendAdapterInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/creative-trend-adapter/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/categories/risk levels (no
  auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-trend-adapter/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content input, product/brand input, platform selector, and trend category
  selector.
- Displays results: adapted content, trend relevance / longevity / risk-of-datedness score cards,
  identified trends (pills), timing advice, suggested hashtags (pills), recommendations list, and
  a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, pills wrap, cards stack).
- Does NOT use `Image` from lucide-react.

### 4. Translations

The page uses the `creativeTrendAdapter` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, platform, trendCategory, generate, generating,
adaptedContent, identifiedTrends, trendRelevance, timingAdvice, suggestedHashtags,
riskOfDatedness, longevityScore, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-trend-adapter.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_TREND_ADAPTER_CREDIT_COST` is 3).
- Input validation (missing content, missing productOrBrand, over-length content/productOrBrand,
  invalid platform, invalid trendCategory, invalid dryRun type, valid minimal input, non-object
  input).
- Dry-run mode (returns adaptation with correct structure, works for all four platforms, works
  for all five trend categories, rejects invalid input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic trend adaptation based on platform and category-specific templates:
- tiktok: short, punchy, trend-native language; FYP and discovery hashtags; evening posting.
- instagram: visually-driven, aesthetic-forward; reels and community hashtags; midday/evening
  posting.
- youtube: descriptive, value-driven; shorts and trending hashtags; afternoon posting.
- facebook: conversational, community-oriented; relatable and shareable hashtags; afternoon
  posting.

Trend category templates adjust relevance, risk of datedness, and longevity:
- viral: high relevance (9), high risk, low longevity (3) — fast-moving trends.
- seasonal: medium relevance (7), medium risk, medium longevity (6) — time-bound trends.
- cultural: high relevance (8), medium risk, high longevity (7) — cultural moments.
- industry: medium relevance (7), low risk, high longevity (8) — vertical-specific trends.
- aesthetic: high relevance (8), low risk, high longevity (9) — visual style movements.

Each dry-run adaptation includes adapted content, identified trends, timing advice, suggested
hashtags, risk of datedness, longevity score, and recommendations. Brand-specific content is
generated dynamically from the input.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in trend alignment by adapting content to current trends
  with relevance scores, timing advice, and longevity assessments — giving users trend-aware
  content before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Risk-of-datedness and longevity scores help users decide how aggressively to
  chase short-lived trends versus evergreen content.
- **Negative:** The heuristic fallback is generic and does not account for real-time trending
  data or audience-specific nuances that the LLM would catch.
- **Negative:** Trend relevance and longevity scores in dry-run mode are static approximations,
  not live data.

## Research Sources

Trend adaptation best practices drawn from industry research (TikTok for Business, Meta Business,
YouTube Creator Academy) and social media marketing literature. The architecture follows the
patterns established in ADR-073 (Ad Hashtag Generator) for self-contained library design with
dry-run fallback and ADR-071 (Ad Thumbnail Generator) for plan-tier-aware model selection.
