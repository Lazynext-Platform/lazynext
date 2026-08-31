# ADR-076: Ad Voiceover Script Generator

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users produce video ads across TikTok, Instagram, YouTube, and Facebook and need
voiceover scripts that are paced correctly, match the platform's delivery style, and include
direction for the narrator. Writing a voiceover script from scratch is time-consuming — the
marketer must estimate timing, choose the right tone, mark emphasis words, and insert natural
pauses. Without structured direction, voiceover recordings often need multiple takes and re-edits
because the pacing is off or the delivery doesn't match the ad's intent.

An "Ad Voiceover Script Generator" that uses AI to produce structured voiceover scripts — each
broken into timed segments with voice direction, emphasis markers, and pause cues, plus an overall
words-per-minute rate and tone notes — would give users a ready-to-record script grounded in
platform best practices.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Script Writer
(ADR-050), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-voiceover-script-generator.ts`

A self-contained ad voiceover script generator engine that:
- Takes a product or brand, a platform, an optional tone (friendly, professional, energetic, calm,
  authoritative, conversational), an optional duration (10-120 seconds, default 30), and an
  optional target audience (max 1000 chars).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate a structured voiceover
  script with a title, full script text, timed segments (each with segment number, text, timing,
  direction, emphasis array, and pause-after), total duration, words per minute, and tone notes.
- Returns a `VoiceoverScript` object.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific script templates —
  e.g., TikTok favors fast-paced, hook-first conversational scripts; Instagram favors polished,
  aesthetic, mood-matching scripts; YouTube favors clear, storytelling-supporting narration;
  Facebook favors broad-appeal, direct, family-friendly scripts).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-script-writer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdVoiceoverScriptGeneratorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-voiceover-script-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/tones (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-voiceover-script-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, tone selector, duration, and optional
  target audience.
- Displays results: script header (title, total duration, WPM, tone notes), full script text,
  segment breakdown cards (segment number, timing, text, direction, emphasis pills, pause
  after), and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, pills wrap, cards stack).

### 4. Translations

The page uses the `adVoiceoverScriptGenerator` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, tone, duration, targetAudience, generate, generating,
segments, segment, direction, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-voiceover-script-generator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST` is 4).
- Input validation (missing productOrBrand, missing/invalid platform, over-length
  productOrBrand/targetAudience, invalid tone, duration out of range, invalid dryRun type, valid
  minimal input).
- Dry-run mode (returns script with correct structure, works for all four platforms, respects
  requested duration, rejects invalid input/platform/duration).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic scripts based on platform-specific templates:
- tiktok: fast-paced, hook-first conversational scripts with 4 segments.
- instagram: polished, aesthetic, mood-matching scripts with 4 segments.
- youtube: clear, storytelling-supporting narration with 4 segments.
- facebook: broad-appeal, direct, family-friendly scripts with 4 segments.

Each dry-run script includes a title, full script text, timed segments with direction and
emphasis, total duration, words per minute, and tone notes.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates the blank-page problem for voiceover scripts by grounding generation in
  product, platform, tone, and pacing data — giving users a ready-to-record script.
- **Positive:** Structured segments with timing, direction, and emphasis markers reduce the number
  of recording takes and re-edits needed.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific voice
  guidelines or product-specific messaging nuances that the LLM would catch.
- **Negative:** Words-per-minute in dry-run mode is a calculated approximation, not a measured
  narration rate.

## Research Sources

Voiceover scriptwriting best practices drawn from industry research (TikTok for Business, Meta
Business, YouTube Creator Academy) and advertising production literature. The architecture
follows the patterns established in ADR-073 (Ad Hashtag Generator) for self-contained library
design with dry-run fallback and ADR-050 (Ad Script Writer) for multi-segment script generation.
