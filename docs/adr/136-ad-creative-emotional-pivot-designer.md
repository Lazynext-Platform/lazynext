# ADR-136: Ad Creative Emotional Pivot Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users design ad creative content across platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to design emotional pivot points — moments where the
emotional tone shifts dramatically to re-engage viewers, deepen emotional connection, and
drive action. Flat emotional arcs cause viewers to lose interest, especially on short-form
platforms where attention resets are required every few seconds. Marketers need a tool that
designs an emotional pivot strategy: pivot points with type, before/after emotions,
transition method, impact score, timing, viewer effect, and recommendations.

An "Ad Creative Emotional Pivot Designer" that uses AI to design emotional pivot points —
producing pivots (type, beforeEmotion, afterEmotion, transitionMethod, impactScore, timing,
viewerEffect) and recommendations — would give users a concrete emotional arc blueprint
before they produce the creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative
Pacing Variability Designer (ADR-134), which demonstrated a self-contained analysis library
with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-emotional-pivot-designer.ts`

A self-contained ad creative emotional pivot designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce emotional pivot points
  and recommendations.
- Returns an `EmotionalPivotDesignerResult` with a `PivotStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic emotional
  pivot design based on content length, target audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CREATIVE_EMOTIONAL_PIVOT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-pacing-variability-designer.ts`: self-contained types, `extractJson`/`asStr`/
`asNum` helpers, `isDryRun()` detection, `validateAdCreativeEmotionalPivotDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

Supported pivot types: `joy_to_sadness`, `tension_to_relief`, `fear_to_hope`,
`serious_to_playful`, `calm_to_excitement`, `nostalgia_to_aspiration`,
`frustration_to_satisfaction`, `curiosity_to_revelation`. Supported platforms: `tiktok`,
`instagram`, `youtube`, `facebook`.

### 2. New API route `src/app/api/creative/ad-creative-emotional-pivot-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/pivot types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-emotional-pivot-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-pacing-variability-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: pivot cards with type badges, before→after emotion flow with arrows,
  transition method, impact score bars, timing, viewer effect, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`,
  etc.).
- Responsive: works at 375px and 1920px (cards stack, badges wrap, bars scale).

### 4. Translations

The page uses the `adCreativeEmotionalPivotDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, pivots, beforeEmotion, afterEmotion, transitionMethod, impactScore,
timing, viewerEffect, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-emotional-pivot-designer.test.ts`

Follows the pattern of `test/ad-creative-pacing-variability-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_EMOTIONAL_PIVOT_DESIGNER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_PIVOT_TYPES, MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input,
  empty/undefined platform accepted).
- Dry-run mode (returns strategy with correct structure for pivots, impactScore in 0-100
  range, recommendations present, works for all four platforms and without a platform,
  deterministic output, pivot types are valid, beforeEmotion differs from afterEmotion,
  rejects invalid input/productOrBrand/targetAudience/platform, non-empty transition
  methods/viewer effects/timing).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic emotional pivot design based on content length, target
audience, and platform:
- Six emotional pivot points are generated with distinct pivot types
  (curiosity_to_revelation, frustration_to_satisfaction, tension_to_relief, fear_to_hope,
  nostalgia_to_aspiration, calm_to_excitement).
- Each pivot has deterministic before/after emotions, transition methods, impact scores,
  timings, and viewer effects shaped by the content length and brand.
- Five recommendations are generated referencing the audience, brand, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a concrete emotional arc blueprint that uses dramatic tonal shifts
  to re-engage viewers and drive action.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Impact scores and transition methods give marketers concrete, actionable
  guidance on how to execute each emotional pivot.
- **Negative:** The heuristic fallback does not account for nuanced emotional factors that
  the LLM would catch (e.g., cultural context, audience-specific emotional triggers).
- **Negative:** Pivot values in dry-run mode are deterministic approximations, not based on
  real creative analysis.

## Research Sources

Emotional pivot design methodology drawn from emotional advertising research, narrative arc
theory, and platform-native emotional engagement patterns. The architecture follows the
patterns established in ADR-098 (Creative Quality Scorer) and ADR-134 (Ad Creative Pacing
Variability Designer) for self-contained library design with dry-run fallback and
plan-tier-aware model selection.
