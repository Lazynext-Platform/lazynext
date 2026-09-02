# ADR-176: Creative Ad Endowment Effect Designer

**Date:** 2026-10-30
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
endowment effects that make a product feel already "theirs" before purchase.
Endowment effects — the deliberate ownership/preview/trial/personalization cues
that trigger loss aversion and retention — are what make ads sticky and reduce
abandonment after the viewer has invested attention. Without a tool to design
these effects, marketers rely on intuition, producing ads that fail to leverage
the specific ownership signals viewers need to feel a stake (trial ownership,
preview access, personalization stake, customization investment, usage
investment, emotional attachment, social investment, identity investment) and
lose conversions at the moment of indifference.

A "Creative Ad Endowment Effect Designer" that uses AI to design endowment
effects in ad creative content — producing effects with endowment type (trial
ownership, preview access, personalization stake, customization investment,
usage investment, emotional attachment, social investment, identity investment),
ownership cue descriptions, personalization element descriptions, loss aversion
trigger descriptions, ownership feeling scores (0-100), retention strength
scores (0-100), and endowment pathway descriptions — would give users a
structured ownership-building blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Authority Positioning Designer (ADR-167), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-endowment-effect-designer.ts`

A self-contained ad creative endowment effect designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce endowment
  effects with endowment type, ownership cue, personalization element, loss
  aversion trigger, ownership feeling, retention strength, and endowment
  pathway, plus recommendations.
- Returns a `EndowmentEffectDesignerResult` with a `EndowmentStrategy` payload
  containing `effects` (EndowmentEffect[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  effects based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_ENDOWMENT_EFFECT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-authority-positioning-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdEndowmentEffectDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-endowment-effect-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-authority-positioning-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/endowment
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-endowment-effect-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-authority-positioning-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: effect cards with type badges, ownership cue,
  personalization element, loss aversion trigger, endowment pathway, ownership
  feeling bars, retention strength bars, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Safe lucide icons: Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp.

### 4. Translations

The page uses the `creativeAdEndowmentEffectDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, effects, ownershipCue, personalizationElement,
lossAversionTrigger, ownershipFeeling, retentionStrength, endowmentPathway,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-endowment-effect-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`CREATIVE_AD_ENDOWMENT_EFFECT_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_ENDOWMENT_TYPES has 8
  endowment types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with effects, correct effect structure, valid
  endowment types, ownershipFeeling/retentionStrength in 0-100 range,
  recommendations present, at least 3 effects, works for all four platforms,
  works without platform, deterministic output, rejects invalid/missing input,
  distinct effect types, includes trial_ownership/preview_access/personalization_stake,
  recommendations are non-empty, ownership cues reference the audience).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic endowment effects based on
content length, product, audience, and platform:
- Three endowment types are generated (trial_ownership, preview_access,
  personalization_stake) with descriptions shaped by the product and audience.
- Ownership feeling and retention strength scores are deterministic, derived
  from content length and effect index, clamped to 0-100.
- Recommendations reference the effect types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured ownership-building blueprint that helps
  marketers design ads with deliberate endowment cues for maximum retention and
  conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Ownership feeling and retention strength scores give marketers
  quantifiable metrics to compare endowment effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced endowment
  context that the LLM would catch (e.g., industry-specific ownership cues,
  audience-specific personalization preferences).
- **Negative:** Endowment scores in dry-run mode are deterministic
  approximations, not based on real ownership analysis.

## Research Sources

Endowment effect design methodology drawn from behavioral economics, loss
aversion research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-167 (Ad Creative
Authority Positioning Designer) for plan-tier-aware model selection.
