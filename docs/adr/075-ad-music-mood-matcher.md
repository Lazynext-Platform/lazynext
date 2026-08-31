# ADR-075: Ad Music Mood Matcher

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users produce video ads across TikTok, Instagram, YouTube, and Facebook and need background
music that fits the ad's tone, pacing, and platform conventions. Choosing music by ear is slow and
subjective — a track may feel right but have the wrong tempo for fast cuts, the wrong energy for a
calm product demo, or the wrong mood for a dramatic reveal. Marketers need music recommendations
that pair genre and sub-genre with mood, tempo (BPM), energy level, instrumentation, scene fit, and
license type so they can source the right track quickly without trial and error.

An "Ad Music Mood Matcher" that uses AI to match music genres and moods to ad content — each
recommendation carrying genre, sub-genre, mood, tempo BPM, energy level (1-10), instruments,
description, best-for-scene guidance, and license type — would give users ready-to-use music
directions grounded in platform best practices before they start sourcing tracks.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-music-mood-matcher.ts`

A self-contained ad music mood matcher engine that:
- Takes a product or brand, a platform, an optional ad mood (energetic, calm, inspirational,
  dramatic, playful, romantic, mysterious), an optional duration (5-120 seconds), and a count
  (1-6, default 3).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate music recommendations with a
  genre, sub-genre, mood, tempo BPM (number), energy level (1-10), instruments (string array),
  description, best-for-scene guidance, and license type.
- Returns a list of `MusicRecommendation` objects.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific music templates —
  e.g., TikTok favors trending, beat-driven electronic and hip-hop; Instagram favors aesthetic,
  mood-matching acoustic and chillwave; YouTube favors cinematic and flexible-duration tracks;
  Facebook favors broad-appeal, family-friendly pop and acoustic).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_MUSIC_MOOD_MATCHER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdMusicMoodMatcherInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-music-mood-matcher/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/moods (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-music-mood-matcher/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, ad mood selector, duration, and a count
  selector (1-6).
- Displays results: recommendation cards with genre/sub-genre, mood badge, BPM, energy level,
  instrument pills, description, best-for-scene, and license type; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, pills wrap, cards stack).

### 4. Translations

The page uses the `adMusicMoodMatcher` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, adMood, duration, count, generate, generating, energy,
bestForScene, licenseType, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-music-mood-matcher.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_MUSIC_MOOD_MATCHER_CREDIT_COST` is 3).
- Input validation (missing productOrBrand, missing/invalid platform, over-length productOrBrand,
  invalid adMood, duration out of range, count out of range, invalid count type, invalid dryRun
  type, valid minimal input).
- Dry-run mode (returns recommendations with correct structure, requested count honored, defaults
  to 3, works for all four platforms, rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic recommendations based on platform-specific templates:
- tiktok: trending, beat-driven electronic and hip-hop (Future Bass, Trap, Dance Pop, House,
  Lo-fi, Hyperpop).
- instagram: aesthetic, mood-matching acoustic and chillwave (Indie Folk, Chillwave, Indie Pop,
  Neo Soul, Ambient, Tropical House).
- youtube: cinematic and flexible-duration tracks (Epic Orchestral, Synthwave, Alternative Rock,
  Corporate, Drum & Bass, Singer-Songwriter).
- facebook: broad-appeal, family-friendly pop and acoustic (Mainstream Pop, Folk Pop, Uplifting
  Cinematic, Soft Rock, Corporate Pop, Smooth R&B).

Each dry-run recommendation includes genre, sub-genre, mood, tempo BPM, energy level, instruments,
description, best-for-scene, and license type.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in music selection by grounding recommendations in product,
  platform, mood, and pacing data — giving users ready-to-use music directions before sourcing
  tracks.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Tempo BPM and energy level metrics help users match music pacing to edit cuts.
- **Negative:** The heuristic fallback is generic and does not account for real-time music trends
  or audience-specific taste preferences that the LLM would catch.
- **Negative:** License type recommendations in dry-run mode are static approximations, not
  verified licensing availability.

## Research Sources

Music supervision best practices drawn from industry research (TikTok for Business, Meta Business,
YouTube Creator Academy) and advertising music literature. The architecture follows the patterns
established in ADR-073 (Ad Hashtag Generator) for self-contained library design with dry-run
fallback and ADR-071 (Ad Thumbnail Generator) for plan-tier-aware model selection.
