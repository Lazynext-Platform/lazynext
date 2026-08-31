# ADR-122: Ad Creative Emotion Sequencer

**Date:** 2026-10-25
**Status:** Accepted

## Context

LazyNext users craft ad creative content across multiple platforms but often sequence
emotions haphazardly — a hook may evoke curiosity, the body may drift, and the call-to-action
may land without emotional payoff. Without a deliberate emotional arc, ads fail to maximize
emotional impact and resonance with the audience. Marketers need a tool that sequences
emotions throughout ad creative content — mapping beats, identifying peaks/valleys, defining
transition strategies between emotions, scoring overall emotional resonance, and recommending
how to amplify the emotional journey.

An "Ad Creative Emotion Sequencer" that uses AI to sequence emotions throughout ad creative
content — producing an emotion sequence (with beats, arc, climax, resolution), emotional
peaks/valleys with buildup descriptions, transition strategies between consecutive emotions,
an emotional resonance score (0-100), and actionable recommendations — would give users a
deliberate, high-impact emotional arc before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag
Generator (ADR-073), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-emotion-sequencer.ts`

A self-contained ad creative emotion sequencer engine that:
- Takes a product/brand, content, a desired emotional journey, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce an emotion sequence
  (with beats, arc, climax, resolution), emotional peaks/valleys, transition strategies, an
  emotional resonance score, and recommendations.
- Returns an `EmotionSequencerResult` with an `EmotionAnalysis` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic emotion
  sequencing based on content length, desired journey keywords, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_EMOTION_SEQUENCER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeEmotionSequencerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-emotion-sequencer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/emotions (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-emotion-sequencer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), desired emotional journey
  (input), and an optional platform selector.
- Displays results: emotion sequence timeline with beats (numbered, with intensity bars,
  triggers, and durations), arc/climax/resolution summary, emotional peaks with intensity
  bars and buildup descriptions, transition strategies with from→to flow and techniques, a
  resonance score gauge, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `adCreativeEmotionSequencer` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, desiredJourney, platform,
generate, generating, sequence, peaks, transitions, resonanceScore, recommendations, copy,
copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-emotion-sequencer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_EMOTION_SEQUENCER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_EMOTIONS has 12 emotions, max lengths).
- Input validation (missing productOrBrand, missing content, missing desiredJourney,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, dryRun true accepted).
- Dry-run mode (returns analysis with correct structure for sequence/beats/peaks/transitions,
  resonanceScore in 0-100 range, arc/climax/resolution present, recommendations present,
  works for all four platforms, adapts emotions based on desired journey keywords for
  fear/sadness/excitement/trust, deterministic for same input, rejects invalid/missing
  required fields, transitions link consecutive beats, peaks have high intensity).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic emotion sequencing based on content length, desired journey
keywords, and platform:
- Emotions are selected based on keywords in the desired journey (fear, sadness, excitement,
  trust, anger, or a default curiosity→surprise→joy arc).
- Each beat gets a deterministic intensity derived from content length and beat index.
- Peaks are extracted from beats with intensity >= 70 (with a fallback peak if none qualify).
- Transitions link consecutive beats with rotating techniques (contrast cut, gradual build,
  punctuation pause, visual metaphor, audio swell).
- Resonance score is the average of beat intensities.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a deliberate, high-impact emotional arc that maximizes emotional
  resonance with the audience before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Transition strategies give marketers concrete techniques for moving between
  emotions without emotional whiplash.
- **Negative:** The heuristic fallback does not account for nuanced emotional context that the
  LLM would catch (e.g., cultural resonance, audience-specific emotional triggers).
- **Negative:** Beat intensities in dry-run mode are deterministic approximations, not based
  on real emotional analysis of the content.

## Research Sources

Emotional sequencing methodology drawn from advertising emotional impact research and
narrative emotional arc frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
