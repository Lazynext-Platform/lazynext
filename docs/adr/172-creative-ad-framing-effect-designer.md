# ADR-172: Creative Ad Framing Effect Designer

**Date:** 2026-10-26
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
framing effects that shift perception and influence decisions. Framing effects —
the deliberate gain/loss, attribute, or goal framing of the same information to
shift how the viewer perceives an offer — are what make ads persuasive and steer
choices. Without a tool to design these frames, marketers rely on intuition,
producing ads that fail to leverage the specific framing perspectives viewers
respond to (gain frame, loss frame, attribute frame, goal frame, risk frame,
opportunity frame, progress frame, identity frame) and lose conversions at the
moment of evaluation.

A "Creative Ad Framing Effect Designer" that uses AI to design framing effects
in ad creative content — producing effects with framing type (gain frame, loss
frame, attribute frame, goal frame, risk frame, opportunity frame, progress
frame, identity frame), frame perspective descriptions, message frame
descriptions, perception shift descriptions, frame strength scores (0-100),
decision influence scores (0-100), and framing pathway descriptions — would
give users a structured framing blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the
Creative Ad Micro-Commitment Designer (ADR-159), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-framing-effect-designer.ts`

A self-contained creative ad framing effect designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce framing
  effects with framing type, frame perspective, message frame, perception
  shift, frame strength, decision influence, and framing pathway, plus
  recommendations.
- Returns a `FramingEffectDesignerResult` with a `FramingStrategy` payload
  containing `effects` (FramingEffect[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  effects based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_FRAMING_EFFECT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`creative-ad-micro-commitment-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdFramingEffectDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-framing-effect-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/framing
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-framing-effect-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: effect cards with type badges, frame perspective,
  message frame, perception shift, framing pathway, frame strength bars,
  decision influence bars, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdFramingEffectDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, effects, framePerspective, messageFrame, perceptionShift,
framingPathway, frameStrength, decisionInfluence, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/creative-ad-framing-effect-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`CREATIVE_AD_FRAMING_EFFECT_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_FRAMING_TYPES has 8
  framing types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with effects, correct effect structure, valid
  framing types, frameStrength/decisionInfluence in 0-100 range, recommendations
  present, at least 3 effects, works for all four platforms, works without
  platform, deterministic output, rejects invalid/missing input, distinct
  effect types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic framing effects based on
content length, product, audience, and platform:
- Three framing types are generated (gain_frame, loss_frame, attribute_frame)
  with descriptions shaped by the product and audience.
- Frame strength and decision influence scores are deterministic, derived
  from content length and effect index, clamped to 0-100.
- Recommendations reference the framing types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured framing blueprint that helps marketers
  design ads with deliberate gain/loss/attribute/goal frames for maximum
  perception shift and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Frame strength and decision influence scores give marketers
  quantifiable metrics to compare framing effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced framing
  context that the LLM would catch (e.g., audience-specific frame preferences,
  industry-specific framing conventions).
- **Negative:** Framing scores in dry-run mode are deterministic
  approximations, not based on real framing analysis.

## Research Sources

Framing effect design methodology drawn from prospect theory, framing effect
research, and advertising effectiveness frameworks. The architecture follows
the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-159 (Creative Ad
Micro-Commitment Designer) for plan-tier-aware model selection.
