# ADR-134: Ad Creative Pacing Variability Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users design ad creative content across platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to design pacing variability — the deliberate
alternation of fast and slow segments that sustains audience engagement and prevents
attention fatigue. Monotone pacing causes viewers to drop off, especially on
short-form platforms where attention resets are required every few seconds. Marketers
need a tool that designs a pacing plan: segment-by-segment speed and energy, speed
transitions with impact ratings, energy fluctuations with triggers, attention reset
points with re-engagement scores, and an overall variability score.

An "Ad Creative Pacing Variability Designer" that uses AI to design pacing variability
— producing pacing variations (segment, speed, duration, energy, purpose), speed
transitions (from/to speed, timing, method, impact), energy fluctuations (timing,
from/to energy, direction, trigger), attention resets (timing, method, description,
re-engagement score), a variability score (0-100), and recommendations — would give
users a concrete pacing blueprint before they produce the creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag
Generator (ADR-073), which demonstrated a self-contained analysis library with a
dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-pacing-variability-designer.ts`

A self-contained ad creative pacing variability designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce pacing
  variations, speed transitions, energy fluctuations, attention reset points, a
  variability score, and recommendations.
- Returns a `PacingVariabilityDesignerResult` with a `PacingVariabilityDesign` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  pacing design based on content length, target audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_PACING_VARIABILITY_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-hashtag-generator.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativePacingVariabilityDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

Supported speed levels: `very_slow`, `slow`, `medium`, `fast`, `very_fast`,
`variable`. Supported transition impacts: `low`, `medium`, `high`. Supported energy
directions: `up`, `down`. Supported platforms: `tiktok`, `instagram`, `youtube`,
`facebook`.

### 2. New API route `src/app/api/creative/ad-creative-pacing-variability-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/speed
  levels/impacts/directions (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK
  key binding and `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-pacing-variability-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input),
  and an optional platform selector.
- Displays results: variability score gauge, pacing variations with speed badges and
  energy bars, speed transitions with impact badges and speed-to-speed arrows, energy
  fluctuations with direction indicators (up/down) and from/to energy, attention
  resets with re-engagement scores, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, badges wrap, bars scale).

### 4. Translations

The page uses the `adCreativePacingVariabilityDesigner` namespace via `useI18n`.
Because the `t` function falls back to the key string when a translation is missing,
the page renders correctly without modifying `src/i18n/locales/en.ts` or any locale
files. Keys used: title, subtitle, signInPrompt, skipToContent, productOrBrand,
content, targetAudience, platform, generate, generating, variations, transitions,
energyFluctuations, attentionResets, variabilityScore, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-pacing-variability-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_PACING_VARIABILITY_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, VALID_SPEED_LEVELS, VALID_IMPACTS, VALID_DIRECTIONS,
  MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH, MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input,
  empty/undefined platform accepted).
- Dry-run mode (returns design with correct structure for variations/transitions/
  energyFluctuations/attentionResets, variabilityScore in 0-100 range, energy and
  re-engagement scores within bounds, recommendations present, works for all four
  platforms and without a platform, deterministic output, rejects invalid
  input/productOrBrand/targetAudience/platform, transition speeds reference
  variations, energy directions match deltas).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine
falls back to deterministic heuristic pacing design based on content length, target
audience, and platform:
- Seven pacing segments are generated (Hook, Introduction, Problem reveal, Solution
  showcase, Social proof, Benefit expansion, CTA build-up) with alternating speeds
  and deterministic energy values.
- Speed transitions are derived from adjacent variations, with impact based on the
  energy delta between segments.
- Energy fluctuations are derived from adjacent variations, with direction matching
  the energy delta.
- Three attention resets are inserted at 6s, 12s, and 18s with deterministic
  re-engagement scores.
- Variability score is derived from the count of unique speeds used.

This ensures the feature works in local development and degrades gracefully on LLM
failure.

## Consequences

- **Positive:** Provides a concrete pacing blueprint that alternates fast and slow
  segments to sustain engagement and reduce drop-off.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Attention reset points with re-engagement scores give marketers
  concrete guidance on when and how to recapture viewer attention.
- **Negative:** The heuristic fallback does not account for nuanced creative pacing
  factors that the LLM would catch (e.g., platform-specific editing norms,
  audience-specific attention spans).
- **Negative:** Pacing values in dry-run mode are deterministic approximations, not
  based on real creative analysis.

## Research Sources

Pacing variability methodology drawn from attention economy research, short-form
video engagement studies, and platform-native editing norms. The architecture follows
the patterns established in ADR-098 (Creative Quality Scorer) and ADR-073 (Ad Hashtag
Generator) for self-contained library design with dry-run fallback and
plan-tier-aware model selection.
