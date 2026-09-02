# ADR-130: Ad Creative Sound Design Strategist

**Date:** 2026-10-15
**Status:** Accepted

## Context

LazyNext users create ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but often neglect the audio layer — a critical component of ad performance. Sound design
(music, sound effects, voiceover, ambient textures, foley, and strategic silence) drives emotional
resonance, attention retention, and brand recall. Marketers lack a systematic way to strategize the
complete sound architecture of their ad creative before production.

An "Ad Creative Sound Design Strategist" that uses AI to design the complete sound architecture —
producing sound layers (with type, description, timing, volume, duration, and purpose), audio cues
(with type, timing, description, emotional impact, and transition), a music strategy (genre, tempo,
energy, key moment, fade strategy), voiceover direction (tone, pace, emphasis, pauses, personality),
a sound design score (0-100), and recommendations — would give users a comprehensive sound design
blueprint before they produce audio.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-sound-design-strategist.ts`

A self-contained ad creative sound design strategist engine that:
- Takes a product or brand, content, a mood, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce sound layers, audio cues, a
  music strategy, voiceover direction, a sound design score, and recommendations.
- Returns a `SoundDesignStrategistResult` with a `SoundDesignStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic sound design based
  on mood, content length, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeSoundDesignStrategistInput()` validation, deterministic dry-run output, and a
credit-cost constant.

Supported constants:
- `VALID_PLATFORMS`: tiktok, instagram, youtube, facebook.
- `VALID_MOODS`: energetic, calm, mysterious, playful, dramatic, uplifting, melancholic, tense,
  joyful, epic.
- `VALID_LAYER_TYPES`: music, sfx, voiceover, ambient, foley, silence.
- `VALID_EMOTIONAL_IMPACTS`: low, medium, high.
- `MAX_PRODUCT_LENGTH`, `MAX_CONTENT_LENGTH`, `MAX_MOOD_LENGTH`: 2000 chars each.

### 2. New API route `src/app/api/creative/ad-creative-sound-design-strategist/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/moods/layer types/emotional
  impacts (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-sound-design-strategist/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), mood (input), and an optional platform
  selector.
- Displays results: sound design score gauge, sound layers with type badges and volume bars, audio
  cues with impact badges, music strategy card with energy bar, voiceover direction card, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `adCreativeSoundDesignStrategist` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, mood, platform, generate, generating, layers,
cues, musicStrategy, voiceoverDirection, soundDesignScore, recommendations, copy, copied, error,
dryRunNotice (plus sub-labels: purpose, transition, genre, tempo, energy, keyMoment, fadeStrategy,
tone, pace, emphasis, pauses, personality).

### 5. Unit tests `test/ad-creative-sound-design-strategist.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, VALID_MOODS, VALID_LAYER_TYPES, VALID_EMOTIONAL_IMPACTS, max lengths).
- Input validation (missing productOrBrand, missing content, missing mood, over-length fields,
  invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform accepted).
- Dry-run mode (returns strategy with correct structure for layers/cues/musicStrategy/
  voiceoverDirection, soundDesignScore in 0-100 range, recommendations present, works for all four
  platforms and all moods, produces multiple layer types, includes music/voiceover/silence layers,
  silence layer has volume 0, deterministic output, rejects invalid input/productOrBrand/mood).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic sound design based on mood, content length, and platform:
- Six sound layers are generated (music, voiceover, sfx, ambient, foley, silence) with timing,
  volume, duration, and purpose.
- Four audio cues mark key moments (intro stinger, product reveal, emotional beat, CTA punch) with
  emotional impact and transitions.
- Music strategy includes genre, tempo (mapped per mood), energy, key moment, and fade strategy.
- Voiceover direction includes tone, pace, emphasis, pauses, and personality.
- Sound design score is derived from content length and mood.
- Five actionable recommendations cover mixing, layering, foley sync, silence, and mobile testing.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a comprehensive sound design blueprint that covers music, sfx, voiceover,
  ambient, foley, and silence — ensuring the audio layer is intentional, not an afterthought.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Audio cues with emotional impact and transitions give producers concrete timing
  markers for mixing rather than vague guidance.
- **Negative:** The heuristic fallback does not account for nuanced audio-visual synchronization
  that the LLM would catch (e.g., matching foley to specific visual cuts in the actual footage).
- **Negative:** Layer volumes and scores in dry-run mode are deterministic approximations, not
  based on real audio analysis of the creative content.

## Research Sources

Sound design methodology drawn from advertising audio research, film sound design principles, and
platform-specific audio best practices (e.g., TikTok's emphasis on the first-second hook, YouTube's
longer narrative arcs). The architecture follows the patterns established in ADR-098 (Creative
Quality Scorer) for self-contained library design with dry-run fallback and ADR-073 (Ad Hashtag
Generator) for plan-tier-aware model selection.
