# ADR-165: Ad Creative Anchoring Effect Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the anchoring
frameworks that shape price and value perception. Anchoring — the cognitive bias where the
first reference point exposed heavily influences perceived value — is one of the most powerful
persuasion levers in advertising, but it must be deployed credibly to avoid eroding trust.
Without a tool to design these anchoring frameworks, marketers either omit anchoring
opportunities (leaving value perception unshaped) or use fabricated comparisons that damage
brand credibility when scrutinized.

An "Ad Creative Anchoring Effect Designer" that uses AI to design anchoring frameworks in ad
creative content — producing frameworks with anchor type (price anchor, value anchor,
competitor anchor, premium anchor, historical anchor, aspirational anchor, social anchor,
scarcity anchor), anchor reference, anchor value, perceived value shift, anchor strength
(0-100), perception shift (0-100), and anchoring pathway — would give users a structured
anchoring blueprint that shapes value perception authentically.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative
Scarcity Frame Designer (ADR-153), which demonstrated a self-contained analysis library
with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-anchoring-effect-designer.ts`

A self-contained ad creative anchoring effect designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce anchoring
  frameworks with anchor type, anchor reference, anchor value, perceived value shift,
  anchor strength, perception shift, and anchoring pathway, plus recommendations.
- Returns an `AnchoringFrameworkDesignerResult` with an `AnchoringStrategy` payload
  containing `frameworks` (AnchoringFramework[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  anchoring frameworks based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_ANCHORING_EFFECT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-scarcity-frame-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeAnchoringEffectDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-anchoring-effect-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-scarcity-frame-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/anchor types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-anchoring-effect-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-scarcity-frame-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: framework cards with type badges, anchor reference, anchor value,
  perceived value shift, anchor strength bars, perception shift bars, anchoring pathway,
  and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Anchor, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp, Scale.

### 4. Translations

The page uses the `adCreativeAnchoringEffectDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, frameworks, anchorReference, anchorValue, perceivedValueShift,
anchorStrength, perceptionShift, anchoringPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-anchoring-effect-designer.test.ts`

Follows the pattern of `test/ad-creative-scarcity-frame-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_ANCHORING_EFFECT_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_ANCHOR_TYPES has 8 anchor types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with frameworks, correct framework structure, valid anchor
  types, anchorStrength/perceptionShift in 0-100 range, recommendations present, at
  least 3 anchoring frameworks, works for all four platforms, works without platform,
  deterministic output, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic anchoring frameworks based on content length, product,
audience, and platform:
- Three anchor types are generated (price_anchor, competitor_anchor, premium_anchor) with
  descriptions shaped by the product and audience.
- Anchor strength and perception shift scores are deterministic, derived from content
  length and framework index, clamped to 0-100.
- Recommendations reference the anchor types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured anchoring blueprint that helps marketers design
  ads with credible reference anchors that shape value perception authentically.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Anchor strength and perception shift scores give marketers
  quantifiable metrics to compare anchor effectiveness.
- **Positive:** Anchor references explicitly ground comparisons in verifiable points,
  promoting ethical advertising practices.
- **Negative:** The heuristic fallback does not account for nuanced context that
  the LLM would catch (e.g., platform-specific anchoring dynamics, audience-specific
  reference sensitivity).
- **Negative:** Anchoring scores in dry-run mode are deterministic approximations, not based
  on real market analysis.

## Research Sources

Anchoring effect methodology drawn from behavioral economics, price perception research, and
persuasion frameworks. The architecture follows the patterns established in ADR-098
(Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-153 (Ad Creative Scarcity Frame Designer) for plan-tier-aware model selection.
