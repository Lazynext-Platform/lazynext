# ADR-142: Creative Ad Transformation Arc Designer

**Date:** 2026-10-15
**Status:** Accepted

## Context

LazyNext users create ad content across multiple platforms, but they lack a systematic way to
design the transformation arc — the before/after journey of the subject or viewer that gives
creative content its emotional pull. A compelling transformation arc (from a relatable "before"
state, through a catalyst and progressive stages, to an aspirational "after" state) is what makes
viewers identify with the subject and feel the product's value. Without a structured arc, ad
creative often feels flat, listless, or fails to create the emotional resonance that drives
conversion.

Marketers need a tool that takes a product or brand, the creative content, a target audience, and
an optional platform, then designs a complete transformation arc: the before state, the catalyst
that triggers change, the transformation stages with their emotional shifts and progress levels,
the after state, the overall emotional journey, and a viewer identification score that predicts how
strongly the target audience will identify with the transformation. This gives marketers a
blueprint for structuring their creative content around a compelling before/after journey.

A "Creative Ad Transformation Arc Designer" that uses AI to design transformation arcs — producing
an arc type (personal growth, status change, problem solution, limitation freedom, invisible
visible, doubt confidence, chaos order, ordinary extraordinary), before/after states, a catalyst,
transformation stages with emotional shifts and progress levels, an emotional journey summary, a
viewer identification score (0-100), and recommendations — would give users a structured
transformation blueprint for their creative content.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-transformation-arc-designer.ts`

A self-contained creative ad transformation arc designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform (tiktok,
  instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a transformation arc with a
  before state, catalyst, transformation stages, after state, emotional journey, and viewer
  identification score, plus recommendations.
- Returns a `TransformationArcDesignerResult` with an `ArcStrategy` payload containing a
  `TransformationArc` and `recommendations`.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic arc design based
  on product, content length, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_TRANSFORMATION_ARC_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdTransformationArcDesignerInput()` validation, deterministic dry-run output, and
a credit-cost constant.

Supported arc types:
- `personal_growth`: subject grows or improves as a person
- `status_change`: subject's social or professional status changes
- `problem_solution`: subject moves from having a problem to having it solved
- `limitation_freedom`: subject moves from being limited to being free
- `invisible_visible`: subject moves from being unseen to being recognized
- `doubt_confidence`: subject moves from self-doubt to confidence
- `chaos_order`: subject moves from chaos/disorder to order/control
- `ordinary_extraordinary`: subject moves from ordinary to extraordinary

### 2. New API route `src/app/api/creative/creative-ad-transformation-arc-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/arc types (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError` for
  error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-transformation-arc-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: arc card with type badge and viewer identification score gauge, before state
  card, catalyst card, transformation stages with progress bars and emotional shifts, after state
  card, emotional journey card, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdTransformationArcDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, arc, beforeState, catalyst, stages, afterState, emotionalJourney,
viewerIdentificationScore, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-ad-transformation-arc-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_TRANSFORMATION_ARC_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, VALID_ARC_TYPES, MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted,
  whitespace-only fields rejected).
- Dry-run mode (returns strategy with correct structure for arc/stages, valid arc type,
  beforeState/catalyst/afterState/emotionalJourney strings, viewerIdentificationScore in 0-100
  range, recommendations present, works for all four platforms and without a platform, deterministic
  output for same input, arc type varies with content length, rejects invalid
  input/productOrBrand/targetAudience/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic transformation arc design based on product, content length, audience, and
platform:
- Arc type is selected by content length modulo the number of valid arc types.
- Viewer identification score is derived from content and audience length.
- Four transformation stages (Awareness, Decision, Action, Transformation) with increasing progress
  levels (20, 45, 70, 95).
- Before state, catalyst, after state, and emotional journey are selected from per-type templates.
- Recommendations cover opening with the before state, making the catalyst vivid, pacing stages,
  ending on the after state, weaving the emotional journey, A/B testing identification, and
  platform-specific optimization.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured transformation arc blueprint that gives creative content
  emotional pull and viewer identification.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** The eight arc types cover the most common transformation patterns in advertising,
  giving marketers a vocabulary for structuring their creative.
- **Positive:** The viewer identification score gives a quantifiable measure of how strongly the
  target audience will connect with the transformation.
- **Negative:** The heuristic fallback does not account for nuanced audience psychology or cultural
  context that the LLM would catch.
- **Negative:** Transformation stages in dry-run mode are fixed (Awareness, Decision, Action,
  Transformation) rather than tailored to the specific product or content.

## Research Sources

Transformation arc methodology drawn from narrative advertising research, hero's journey
frameworks, and before/after storytelling patterns in direct-response marketing. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for self-contained library
design with dry-run fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model
selection.
