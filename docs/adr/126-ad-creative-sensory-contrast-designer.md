# ADR-126: Ad Creative Sensory Contrast Designer

**Date:** 2026-10-29
**Status:** Accepted

## Context

LazyNext users craft ad creative content across multiple platforms but rarely design
sensory contrasts deliberately. Ads that maintain a uniform sensory register — uniformly
loud, uniformly bright, uniformly fast — fail to jolt the viewer and lose attention.
Sensory contrast (loud→quiet, bright→dark, fast→slow, warm→cold) is one of the most
effective pattern-interrupt techniques in advertising, yet marketers lack a tool that
systematically designs these contrasts throughout ad creative content. Marketers need a
tool that, given a product/brand, content, a contrast dimension, and an optional platform,
produces sensory contrast elements (with before/after states, transitions, impact levels,
and descriptions), contrast pairs, a sensory impact score, and actionable recommendations
for maximizing sensory impact.

An "Ad Creative Sensory Contrast Designer" that uses AI to design sensory contrasts in ad
creative content — producing sensory contrast elements (with dimension, before/after
states, transition, impact, description), contrast pairs (with left/right poles,
dimension, and sensory effect), a sensory impact score (0-100), and recommendations —
would give users a deliberate, high-impact sensory contrast plan before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative
Emotion Sequencer (ADR-122), which demonstrated a self-contained analysis library with a
dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-sensory-contrast-designer.ts`

A self-contained ad creative sensory contrast designer engine that:
- Takes a product/brand, content, a contrast dimension (loud_quiet, bright_dark, fast_slow,
  warm_cold, sharp_soft, chaotic_calm, vibrant_muted, dense_sparse — default loud_quiet),
  and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce sensory contrast
  elements, contrast pairs, a sensory impact score, and recommendations.
- Returns a `SensoryContrastDesignerResult` with a `SensoryContrastDesign` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic sensory
  contrast design based on content length, contrast dimension, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-emotion-sequencer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeSensoryContrastDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-sensory-contrast-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/contrast
  dimensions/impacts (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding
  and `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-sensory-contrast-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-emotion-sequencer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), a contrast dimension selector
  (8 dimensions), and an optional platform selector.
- Displays results: sensory contrast cards with dimension badges, impact badges,
  before/after states, transition descriptions, contrast pairs with left→right flow and
  sensory effects, an impact score gauge, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`,
  etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `adCreativeSensoryContrastDesigner` namespace via `useI18n`. Because the
`t` function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used:
title, subtitle, signInPrompt, skipToContent, productOrBrand, content, contrastDimension,
platform, generate, generating, contrasts, pairs, impactScore, recommendations, copy,
copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-sensory-contrast-designer.test.ts`

Follows the pattern of `test/ad-creative-emotion-sequencer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_CONTRAST_DIMENSIONS has 8 dimensions,
  VALID_IMPACTS has 3 impacts, default dimension, max lengths).
- Input validation (missing productOrBrand, missing content, over-length fields, invalid
  contrastDimension, invalid platform, invalid dryRun type, valid minimal input, empty
  platform/contrastDimension accepted, dryRun true accepted).
- Dry-run mode (returns design with correct structure for contrasts/pairs, impactScore in
  0-100 range, recommendations present, works for all four platforms and all contrast
  dimensions, defaults to loud_quiet when dimension omitted, deterministic for same input,
  contrasts use requested dimension, at least one high-impact contrast, pairs reference
  valid dimensions, impact score increases with longer content, rejects invalid/missing
  required fields).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic sensory contrast design based on content length, contrast
dimension, and platform:
- Dimension-specific poles (left/right, before/after states) are selected for each of the
  8 contrast dimensions.
- Four contrast elements are generated with rotating transitions and impact levels.
- Three contrast pairs are generated (the primary dimension pair plus two cross-dimension
  pairs for silence/sound and motion/stillness).
- Impact score is derived from content length and dimension index, clamped to 0-100.
- Five recommendations are generated referencing the brand, dimension, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a deliberate, high-impact sensory contrast plan that maximizes
  sensory impact and recaptures viewer attention before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development
  and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Contrast pairs with sensory effects give marketers concrete techniques
  for executing each contrast rather than abstract advice.
- **Negative:** The heuristic fallback does not account for nuanced sensory context that
  the LLM would catch (e.g., platform-specific sensory conventions, audience sensory
  preferences).
- **Negative:** Contrast elements in dry-run mode are deterministic approximations, not
  based on real sensory analysis of the content.

## Research Sources

Sensory contrast methodology drawn from advertising pattern-interrupt research and
sensory marketing frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback
and ADR-122 (Ad Creative Emotion Sequencer) for plan-tier-aware model selection.
