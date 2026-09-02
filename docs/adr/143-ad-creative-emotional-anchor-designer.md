# ADR-143: Ad Creative Emotional Anchor Designer

**Date:** 2026-10-03
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the recurring
emotional touchpoints that anchor the viewer's feelings throughout an ad. Emotional anchors —
the deliberate, repeating emotional beats (nostalgia, aspiration, fear, joy, belonging, pride,
trust, wonder) that hold a viewer's emotional attention — are what make ads memorable and
persuasive. Without a tool to design these anchors, marketers rely on intuition, producing
creative that lacks a consistent emotional through-line and fails to sustain viewer resonance
from open to close.

An "Ad Creative Emotional Anchor Designer" that uses AI to design emotional anchors in ad
creative content — producing anchors with anchor type (nostalgia, aspiration, fear, joy,
belonging, pride, trust, wonder), emotional trigger, anchor moment, viewer resonance, anchor
strength scores (0-100), emotional depth scores (0-100), and reinforcement strategy, plus
recommendations — would give users a structured emotional anchor blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative Tension
Release Designer (ADR-139), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-emotional-anchor-designer.ts`

A self-contained ad creative emotional anchor designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce emotional anchors with
  anchor type, emotional trigger, anchor moment, viewer resonance, anchor strength, emotional
  depth, and reinforcement strategy, plus recommendations.
- Returns an `EmotionalAnchorDesignerResult` with an `AnchorStrategy` payload containing
  `anchors` (EmotionalAnchor[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic anchors
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-tension-release-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeEmotionalAnchorDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-emotional-anchor-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-tension-release-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/anchor types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-emotional-anchor-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: anchor cards with type badges, emotional trigger, anchor moment, viewer
  resonance, reinforcement strategy, anchor strength bars, emotional depth bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Anchor, Heart, TrendingUp, Clock, Sparkles, Loader2, AlertCircle, Copy,
  Check.

### 4. Translations

The page uses the `adCreativeEmotionalAnchorDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, anchors, emotionalTrigger, anchorMoment, viewerResonance,
reinforcementStrategy, anchorStrength, emotionalDepth, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/ad-creative-emotional-anchor-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_ANCHOR_TYPES has 8 anchor types, max
  lengths for product/content/audience, system prompt is non-empty, model constant is a
  string).
- Type exports (EmotionalAnchor, AnchorStrategy, EmotionalAnchorDesignerResult, AnchorType
  structural checks).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with anchors, exactly 3 anchors, correct anchor structure,
  valid anchor types, anchorStrength/emotionalDepth in 0-100 range, recommendations present,
  works for all four platforms, works without platform, deterministic output, output varies
  with different content, recommendations reference product/audience, rejects
  invalid/missing input).
- parseDesignerJson behavior (dry-run fallback on empty anchors returns 3 anchors).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic emotional anchors based on content length, product,
audience, and platform:
- Three anchor types are generated (nostalgia_anchor, aspiration_anchor, trust_anchor) with
  descriptions shaped by the product and audience.
- Anchor strength and emotional depth scores are deterministic, derived from content length
  and anchor index, clamped to 0-100.
- Recommendations reference the anchor types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured emotional anchor blueprint that helps marketers design
  ads with deliberate recurring emotional touchpoints for maximum viewer resonance.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Anchor strength and emotional depth scores give marketers quantifiable metrics
  to compare anchor effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced emotional context that
  the LLM would catch (e.g., cultural resonance, audience-specific emotional triggers).
- **Negative:** Anchor scores in dry-run mode are deterministic approximations, not based on
  real emotional analysis.

## Research Sources

Emotional anchor design methodology drawn from emotional engagement theory, advertising
psychology research, and brand resonance frameworks. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library design with
dry-run fallback, ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection, and
ADR-139 (Ad Creative Tension Release Designer) for the emotional-rhythm designer pattern.
