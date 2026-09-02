# ADR-073: Ad Hashtag Generator

**Date:** 2026-09-30
**Status:** Accepted

## Context

LazyNext users run paid ad campaigns across TikTok, Instagram, YouTube, and Facebook and need
hashtags that maximize reach and engagement without wasting spend on oversaturated tags. Picking
hashtags by gut feel rarely balances reach against competition — a trending tag may have massive
volume but be so saturated the ad gets buried, while a niche tag may have an engaged audience but
too little volume to move the needle. Marketers need hashtags categorized by type (branded,
trending, niche, community, campaign) with estimated reach and competition level so they can mix
broad and targeted tags strategically.

An "Ad Hashtag Generator" that uses AI to generate platform-optimized hashtags — each with a type
classification, estimated reach, competition level, and a recommended flag — would give users
ready-to-use hashtag sets grounded in platform best practices before they publish.

The patterns were drawn from the Ad Thumbnail Generator (ADR-071) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-hashtag-generator.ts`

A self-contained ad hashtag generator engine that:
- Takes a product or brand, a platform, an optional niche, and a count (5-30, default 15).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate platform-optimized hashtags
  with a tag, type (branded/trending/niche/community/campaign), estimated reach (e.g., "10K-50K"),
  competition level (low/medium/high), and a recommended boolean.
- Returns a list of `HashtagSuggestion` objects.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific hashtag templates —
  e.g., TikTok favors FYP and discovery tags; Instagram favors community + branded tags; YouTube
  favors descriptive + niche tags; Facebook favors branded + campaign tags).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 2 credits (`AD_HASHTAG_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-thumbnail-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdHashtagGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-hashtag-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-thumbnail-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/types/competition levels (no
  auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-hashtag-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-thumbnail-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, optional niche, and a count selector
  (5-30).
- Displays results: a hashtag pill cloud (recommended tags highlighted) and detailed hashtag rows
  with type badge, estimated reach, competition level, and recommended indicator; and a
  copy-to-clipboard button that copies all hashtags as a space-separated string.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, pills wrap, rows wrap).

### 4. Translations

The page uses the `adHashtagGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, niche, count, generate, generating, recommended, copy,
copied, dryRunNotice, error.

### 5. Unit tests `test/ad-hashtag-generator.test.ts`

Follows the pattern of `test/ad-thumbnail-generator.test.ts`. Tests cover:
- Credit cost (`AD_HASHTAG_GENERATOR_CREDIT_COST` is 2).
- Input validation (missing productOrBrand, missing/invalid platform, over-length
  productOrBrand/niche, count out of range, invalid count type, invalid dryRun type, valid
  minimal input).
- Dry-run mode (returns hashtags with correct structure, requested count honored, defaults to 15,
  works for all four platforms, rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic hashtags based on platform-specific templates:
- tiktok: FYP, discovery, and trend-aligned tags (fyp, foryou, tiktokmademebuyit, tiktokfinds,
  tiktokshop).
- instagram: community + branded + aesthetic tags (instagood, reels, smallbusiness,
  instashopping).
- youtube: descriptive + niche + review tags (review, shorts, unboxing, productreview).
- facebook: branded + campaign + deal tags (deals, sale, smallbusiness, supportsmall).

Each dry-run hashtag includes a tag, type, estimated reach, competition level, and recommended
flag. Brand-specific and niche-specific tags are generated dynamically from the input.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in hashtag selection by grounding generation in product,
  platform, niche, and competition data — giving users ready-to-use hashtag sets before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Type classification and competition levels help users balance broad reach with
  targeted engagement.
- **Negative:** The heuristic fallback is generic and does not account for real-time trending
  data or audience-specific nuances that the LLM would catch.
- **Negative:** Estimated reach values in dry-run mode are static approximations, not live data.

## Research Sources

Hashtag best practices drawn from industry research (TikTok for Business, Meta Business, YouTube
Creator Academy) and social media marketing literature. The architecture follows the patterns
established in ADR-071 (Ad Thumbnail Generator) for self-contained library design with dry-run
fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model selection.
