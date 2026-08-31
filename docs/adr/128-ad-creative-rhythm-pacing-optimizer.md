# ADR-128: Ad Creative Rhythm Pacing Optimizer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to optimize the rhythm and pacing of that content for maximum
engagement. Pacing is a critical engagement driver — a creative may have a strong message but
lose viewers because the opening hook is too slow, the value reveal lacks a beat drop, or the
call-to-action arrives at the wrong tempo. Marketers need a tool that analyzes their creative
content and produces rhythm patterns, pacing segments, beat drops, tempo changes, a rhythm score,
and actionable recommendations.

An "Ad Creative Rhythm Pacing Optimizer" that uses AI to optimize the rhythm and pacing of ad
creative content — producing rhythm patterns (with BPM, energy, and duration), pacing segments
(with start/end times, tempo, energy, and purpose), beat drops (with timing, buildup, drop, and
impact), tempo changes (with from/to tempo, timing, transition, and reason), a rhythm score
(0-100), and recommendations — would give users a comprehensive pacing blueprint before they
produce or refine their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-rhythm-pacing-optimizer.ts`

A self-contained ad creative rhythm pacing optimizer engine that:
- Takes a product or brand, content, a target audience, and an optional platform (tiktok,
  instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce rhythm patterns, pacing
  segments, beat drops, tempo changes, a rhythm score (0-100), and recommendations.
- Returns a `RhythmPacingOptimizerResult` with a `RhythmOptimization` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic optimization
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CREATIVE_RHYTHM_PACING_OPTIMIZER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeRhythmPacingOptimizerInput()` validation, deterministic dry-run output, and a
credit-cost constant. It includes a prompt injection guard in the system prompt instructing the
LLM to treat all input as data, never instructions.

### 2. New API route `src/app/api/creative/ad-creative-rhythm-pacing-optimizer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/tempos/impacts (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-rhythm-pacing-optimizer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: rhythm score gauge, rhythm patterns with energy bars and BPM badges, pacing
  segments timeline with tempo and energy, beat drops with impact badges, tempo changes flow,
  and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeRhythmPacingOptimizer` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, patterns, segments, beatDrops, tempoChanges, rhythmScore, recommendations, copy,
copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-rhythm-pacing-optimizer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_RHYTHM_PACING_OPTIMIZER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_TEMPOS, VALID_IMPACTS, MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH, MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted, undefined dryRun accepted).
- Dry-run mode (returns optimization with correct structure for patterns/segments/beatDrops/
  tempoChanges, rhythmScore in 0-100 range, recommendations present, works for all four
  platforms and without a platform, deterministic for identical input, energy values within
  0-100, rejects invalid/missing/over-length input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic rhythm optimization based on content length, product, audience, and
platform:
- Three rhythm patterns (Opening Hook Pulse, Build-Up Crescendo, Sustained Engagement Groove)
  with BPM, energy, and duration.
- Four pacing segments (fast hook, accelerating build-up, medium core, decelerating CTA) with
  start/end times, tempo, energy, and purpose.
- Three beat drops (product reveal, secondary benefit, final CTA) with timing, buildup, drop,
  and impact.
- Three tempo changes (fast→accelerating, accelerating→medium, medium→decelerating) with
  timing, transition, and reason.
- A rhythm score derived from content length.
- Five actionable recommendations referencing the platform and brand.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic, multi-layered pacing blueprint that optimizes hooks,
  beat drops, and tempo transitions for maximum engagement.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Beat drops with impact levels and tempo changes with transitions give marketers
  concrete, actionable pacing guidance rather than generic advice.
- **Negative:** The heuristic fallback does not account for nuanced rhythm factors that the LLM
  would catch (e.g., audience-specific pacing preferences, cultural rhythm expectations).
- **Negative:** Rhythm patterns and BPM values in dry-run mode are deterministic approximations,
  not based on real creative analysis.

## Research Sources

Rhythm and pacing optimization methodology drawn from advertising engagement research and
creative pacing frameworks. The architecture follows the patterns established in ADR-098
(Creative Quality Scorer) for self-contained library design with dry-run fallback and ADR-073
(Ad Hashtag Generator) for plan-tier-aware model selection.
