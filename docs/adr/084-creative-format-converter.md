# ADR-084: Creative Format Converter

**Date:** 2026-10-07
**Status:** Accepted

## Context

LazyNext users create ad content in one format but often need it in another. A long-form blog post
needs to become a punchy TikTok script. An image ad needs to become a swipeable Instagram carousel.
A video script needs to become a story sequence. Manually reformatting creative content for each
platform and format is time-consuming and error-prone — the core message can get lost, the tone may
not fit the target format, and platform-specific conventions may be missed. Marketers need a way to
convert creative content between formats while preserving the value proposition and adapting to the
target format's conventions.

A "Creative Format Converter" that uses AI to convert content between six ad formats (long-form,
short-form, image-ad, video-script, carousel, story) — producing converted content with format
notes, adaptations, character count, estimated duration, and platform optimizations — would give
users a one-click reformatting tool that preserves the message while adapting the medium.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Creative Concept Validator
(ADR-082), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-format-converter.ts`

A self-contained creative format converter engine that:
- Takes content (max 2000 chars), a product or brand (max 2000 chars), a source format, a target
  format (both from: long-form, short-form, image-ad, video-script, carousel, story), and an
  optional platform (tiktok, instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to convert the content into the target
  format and produce converted content, format notes, adaptations, character count, estimated
  duration, and platform optimizations.
- Returns a `FormatConversion` object wrapped in a `FormatConverterResult`.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic conversion templates based on
  the target format and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_FORMAT_CONVERTER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `creative-concept-validator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asStrArray`/`asAdFormat` helpers,
`isDryRun()` detection, `validateCreativeFormatConverterInput()` validation, deterministic dry-run
output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-format-converter/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/formats (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError` for
  error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-format-converter/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-concept-validator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content input, product/brand input, source format selector, target format
  selector, and an optional platform selector.
- Displays results: converted content in a pre-formatted block with duration and character count,
  format notes, adaptations, and platform optimizations; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (format buttons wrap, content blocks stack).

### 4. Translations

The page uses the `creativeFormatConverter` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, sourceFormat, targetFormat, platform, convert, converting,
convertedContent, formatNotes, adaptations, platformOptimizations, copy, copied, dryRunNotice,
error.

### 5. Unit tests `test/creative-format-converter.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_FORMAT_CONVERTER_CREDIT_COST` is 4).
- Input validation (missing content, missing productOrBrand, missing/invalid sourceFormat,
  missing/invalid targetFormat, over-length content/productOrBrand, invalid platform, invalid
  dryRun type, valid minimal input).
- Dry-run mode (returns conversion with correct structure, works for all target formats, works for
  all four platforms, works without platform, rejects invalid input/sourceFormat).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic format conversion based on the target format:
- short-form: distills to a punchy hook + benefit + CTA with emoji.
- long-form: expands with proof points, benefit bullets, and a closing CTA.
- image-ad: structures into headline, body, and CTA overlay text.
- video-script: creates a shot-by-shot script with timing (hook → problem → solution → proof →
  CTA).
- carousel: breaks into a 5-slide narrative arc with a visual CTA.
- story: creates a 3-frame vertical story with tap-to-advance elements.

Platform optimizations are added when a platform is specified (TikTok favors authentic UGC tone;
Instagram favors visual-first aesthetic; YouTube favors value-driven skippable-aware; Facebook
favors relatable community-oriented).

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates manual reformatting by providing one-click conversion between six ad
  formats while preserving the core message.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Format notes and adaptations help users understand *how* the content was converted,
  not just the result.
- **Negative:** The heuristic fallback produces generic templates that lack the nuance of LLM-
  generated conversions.
- **Negative:** Conversions in dry-run mode do not account for the full semantic meaning of the
  source content.

## Research Sources

Ad format best practices drawn from industry research (Meta Business, TikTok for Business, YouTube
Creator Academy) and creative production literature. The architecture follows the patterns
established in ADR-073 (Ad Hashtag Generator) for self-contained library design with dry-run
fallback and ADR-082 (Creative Concept Validator) for multi-field output parsing.
