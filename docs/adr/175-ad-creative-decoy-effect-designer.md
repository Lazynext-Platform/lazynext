# ADR-175: Ad Creative Decoy Effect Designer

**Date:** 2026-10-21
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
decoy effects that steer viewers toward the target offer. Decoy effects — the
deliberate asymmetric third options that make the target offer look best — are
what make ads persuasive at the decision moment and drive preference for the
intended choice. Without a tool to design these effects, marketers rely on
intuition, producing ads that fail to leverage the specific decoy types viewers
respond to (price decoy, feature decoy, quality decoy, quantity decoy, premium
decoy, bundle decoy, competitor decoy, asymmetric decoy) and lose the anchoring
advantage that increases target-option preference.

An "Ad Creative Decoy Effect Designer" that uses AI to design decoy effects in ad
creative content — producing effects with decoy type (price decoy, feature decoy,
quality decoy, quantity decoy, premium decoy, bundle decoy, competitor decoy,
asymmetric decoy), decoy option descriptions, target option descriptions,
asymmetry element descriptions, decoy influence scores (0-100), target preference
scores (0-100), and decoy pathway descriptions — would give users a structured
decoy-design blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Objection Neutralizer Designer (ADR-151), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-decoy-effect-designer.ts`

A self-contained ad creative decoy effect designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce decoy
  effects with decoy type, decoy option, target option, asymmetry element,
  decoy influence, target preference, and decoy pathway, plus recommendations.
- Returns a `DecoyEffectDesignerResult` with a `DecoyStrategy` payload
  containing `effects` (DecoyEffect[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  effects based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_DECOY_EFFECT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-objection-neutralizer-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeDecoyEffectDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-decoy-effect-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/decoy
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-decoy-effect-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: effect cards with type badges, decoy option, target option,
  asymmetry element, decoy pathway, decoy influence bars, target preference
  bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeDecoyEffectDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, effects, decoyOption, targetOption, asymmetryElement,
decoyInfluence, targetPreference, decoyPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-decoy-effect-designer.test.ts`

Follows the pattern of `test/ad-creative-objection-neutralizer-designer.test.ts`.
Tests cover:
- Credit cost (`AD_CREATIVE_DECOY_EFFECT_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_DECOY_TYPES has 8
  decoy types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with effects, correct effect structure, valid
  decoy types, decoyInfluence/targetPreference in 0-100 range, recommendations
  present, at least 3 effects, works for all four platforms, works without
  platform, deterministic output, rejects invalid/missing input, distinct
  effect types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic decoy effects based on content
length, product, audience, and platform:
- Three decoy types are generated (price_decoy, premium_decoy, feature_decoy)
  with descriptions shaped by the product and audience.
- Decoy influence and target preference scores are deterministic, derived from
  content length and effect index, clamped to 0-100.
- Recommendations reference the decoy types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured decoy-design blueprint that helps
  marketers design ads with deliberate asymmetric options for maximum target
  preference and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Decoy influence and target preference scores give marketers
  quantifiable metrics to compare decoy effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced decoy context
  that the LLM would catch (e.g., audience-specific price sensitivity,
  category-specific anchoring norms, competitor-specific positioning).
- **Negative:** Effect scores in dry-run mode are deterministic approximations,
  not based on real decoy analysis.

## Research Sources

Decoy effect design methodology drawn from behavioral economics, choice
architecture research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-151 (Ad Creative
Objection Neutralizer Designer) for plan-tier-aware model selection.
