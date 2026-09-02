# ADR-111: Creative Ad Format Innovator

**Date:** 2026-10-14
**Status:** Accepted

## Context

LazyNext users create ad content across multiple formats (vertical video, image carousels, story
ads, influencer clips, text overlays), but format innovation is typically manual and incremental.
Marketers reuse the same formats repeatedly, leading to creative fatigue and diminishing returns.
There is no systematic way to remix and recombine existing format elements into novel, high-impact
ad formats tailored to a specific product, audience, and platform.

A "Creative Ad Format Innovator" that uses AI to innovate new ad formats by combining existing
format elements in novel ways — producing innovative format concepts with a format name,
description, novelty score (0-100), format elements (with source and innovation notes),
implementation difficulty (low/medium/high), expected impact (low/medium/high), platform fit,
and recommendations — would give users a structured way to break out of format ruts and discover
fresh creative approaches.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-format-innovator.ts`

A self-contained creative ad format innovator engine that:
- Takes a product/brand, a target audience, current formats (comma-separated string or string
  array), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce innovative format concepts
  by combining existing format elements in novel ways.
- Returns a `FormatInnovatorResult` with a `FormatInnovation` payload containing `formats`
  (InnovativeFormat[]) and `recommendations` (string[]).
- Each `InnovativeFormat` has: name, description, noveltyScore (0-100), formatElements
  (FormatElement[]), implementationDifficulty (low/medium/high), expectedImpact
  (low/medium/high), and platformFit (string[]).
- Each `FormatElement` has: element, source, and innovation (describing how the element is used
  in a novel way).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic format concepts
  based on product, audience, current formats, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST`).
- Includes a prompt injection guard in the system prompt.

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdFormatInnovatorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-format-innovator/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/difficulties/impacts (no
  auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`. Accepts `currentFormats` as either a
  comma-separated string or a string array.

### 3. New UI page `src/app/creative-ad-format-innovator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), target audience (input), current formats (textarea,
  comma-separated), and an optional platform selector.
- Displays results: innovative format cards with novelty score bars, format elements (with
  source and innovation), difficulty/impact badges, platform fit chips, and recommendations with
  a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, badges wrap, bars scale).

### 4. Translations

The page uses the `creativeAdFormatInnovator` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, targetAudience, currentFormats, platform, generate, generating,
formats, noveltyScore, formatElements, implementationDifficulty, expectedImpact, platformFit,
recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-ad-format-innovator.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, VALID_DIFFICULTIES, VALID_IMPACTS, MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH, MAX_FORMATS_LENGTH, MAX_FORMATS).
- Input validation (missing productOrBrand, missing targetAudience, over-length fields, too many
  formats, invalid currentFormats type, invalid platform, invalid dryRun type, valid minimal
  input, empty platform accepted, currentFormats as array accepted, undefined currentFormats
  accepted).
- Dry-run mode (returns innovation with correct structure for formats/formatElements,
  noveltyScore in 0-100 range, valid difficulty/impact, valid platformFit, recommendations
  present, at least 3 formats, at least 2 format elements each, works for all four platforms,
  works without currentFormats, works with currentFormats as array, rejects invalid
  input/missing targetAudience).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic format innovation based on product, audience, current formats, and
platform:
- Four innovative format concepts are generated (Branching Carousel Story, Dual-Perspective
  Countdown, Live Comment Remix, Scrubbable Transformation Loop).
- Each concept combines 3 format elements drawn from a pool of 10 elements (vertical video,
  countdown timer, swipeable carousel, text overlay, influencer clip, product close-up, user
  comment, audio sting, poll sticker, before/after split).
- Novelty scores are deterministic, derived from brand/audience length and concept index.
- Implementation difficulty and expected impact are preset per concept.
- Platform fit is preset per concept.
- Recommendations reference the generated format names, difficulties, and impacts.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to innovate new ad formats by recombining existing
  format elements, breaking marketers out of format ruts and creative fatigue.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Format elements with source and innovation notes give marketers transparency
  into how each concept is constructed, making the innovation actionable rather than opaque.
- **Positive:** Implementation difficulty and expected impact badges help marketers prioritize
  which formats to pilot first.
- **Negative:** The heuristic fallback does not account for nuanced format innovation that the
  LLM would produce (e.g., platform-specific format conventions, audience-specific resonance).
- **Negative:** Format concepts in dry-run mode are deterministic approximations, not based on
  real creative analysis of the provided current formats.

## Research Sources

Ad format innovation methodology drawn from creative advertising research and format remixing
frameworks. The architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-073 (Ad Hashtag
Generator) for plan-tier-aware model selection.
