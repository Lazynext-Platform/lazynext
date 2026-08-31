# ADR-071: Ad Thumbnail Generator

**Date:** 2026-09-30
**Status:** Accepted

## Context

LazyNext users produce video ads across many platforms (TikTok, Instagram, YouTube, Facebook) and
frequently need thumbnail/cover images that stop the scroll and drive clicks. A random screenshot
or a plain product shot rarely performs — thumbnails need a compelling visual composition, a
punchy text overlay, the right text position, a font style that reads at small sizes, a color
scheme with sufficient contrast, an emotional hook, and ideally a predicted click-through rate so
marketers can prioritize concepts for production. Without a structured thumbnail concept tool,
users default to whatever frame looks okay, leaving click-through rate on the table.

An "Ad Thumbnail Generator" that uses AI to generate optimized thumbnail concepts — each with a
visual description, text overlay suggestion, text position, font style recommendation, color
scheme, emotion, and click-through prediction score — would give users ready-to-produce concepts
grounded in platform best practices before they shoot or design anything.

The patterns were drawn from the Ad Format Optimizer (ADR-055) and the Ad CTA Optimizer (ADR-067),
which demonstrated a self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-thumbnail-generator.ts`

A self-contained ad thumbnail generator engine that:
- Takes a product or brand, a platform, a video title or topic (at least one required), an optional
  style (bold/minimal/playful/dramatic/lifestyle), and a count (1-6, default 3).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate optimized thumbnail concepts
  with a title, visual description, text overlay, text position (top/center/bottom), font style,
  color scheme (primary/secondary/background), emotion, and predicted CTR (0-100).
- Returns a list of `ThumbnailConcept` objects.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific thumbnail templates —
  e.g., TikTok favors bold faces and high contrast; YouTube favors expressive faces with large
  text; Instagram favors polished aesthetic flat lays; Facebook favors clear benefit-led designs).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_THUMBNAIL_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdThumbnailGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-thumbnail-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-cta-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/styles/text positions (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-thumbnail-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, video title, video topic (at least one
  required), style selector (with an "any" option), and a count selector (1-6).
- Displays results: thumbnail concept cards with title, text position badge, color scheme swatches
  with hex labels, visual description, text overlay, font style, emotion, and predicted CTR; and a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, badges wrap, swatches wrap).

### 4. Translations

The page uses the `adThumbnailGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, videoTitle, videoTopic, style, anyStyle, count, generate,
generating, visualDescription, textOverlay, fontStyle, emotion, predictedCTR, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/ad-thumbnail-generator.test.ts`

Follows the pattern of `test/ad-cta-optimizer.test.ts`. Tests cover:
- Credit cost (`AD_THUMBNAIL_GENERATOR_CREDIT_COST` is 4).
- Input validation (missing productOrBrand, missing/invalid platform, missing videoTitle and
  videoTopic, over-length productOrBrand/videoTitle/videoTopic, invalid style, count out of range,
  invalid count type, invalid dryRun type, valid minimal input, videoTopic accepted when videoTitle
  missing).
- Dry-run mode (returns thumbnails with correct structure, requested count honored, defaults to 3,
  works for all four platforms, rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic thumbnail concepts based on platform-specific templates:
- tiktok: bold faces, high contrast, trend-aligned (Shock Face Hook, Trend Reveal, Urgent Deal,
  UGC Style, Bold Contrast, Question Hook).
- instagram: polished, aesthetic, cohesive (Aesthetic Flat Lay, Lifestyle Glow, Carousel Tease,
  Before & After, Minimal Product, Bold Quote).
- youtube: expressive faces, large text, high contrast (Expressive Face, Tutorial Tease, Vs
  Comparison, Result Reveal, Big Number, Question Hook).
- facebook: clear, benefit-led, readable (Benefit Lead, Customer Testimonial, Problem Solution,
  Limited Offer, Lifestyle Shot, Clear Demo).

Each dry-run thumbnail includes a title, visual description, text overlay, text position, font
style, color scheme, emotion, and predicted CTR score.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in thumbnail design by grounding generation in product,
  platform, style, and emotional triggers — giving users ready-to-produce concepts before shooting.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Predicted CTR scores help users prioritize which thumbnail concepts to produce and
  test first.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch.
- **Negative:** 4 credits per generation is higher than lightweight tools (ad-cta-optimizer: 3)
  but reflects the richer output (visual descriptions, color schemes, CTR predictions).

## Research Sources

Thumbnail best practices drawn from industry research (YouTube Creator Academy, TikTok for
Business, Meta Business) and CTR optimization literature. The architecture follows the patterns
established in ADR-055 (Ad Format Optimizer) for self-contained library design with dry-run
fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model selection.
