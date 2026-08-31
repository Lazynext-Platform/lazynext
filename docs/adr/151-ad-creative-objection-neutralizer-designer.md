# ADR-151: Ad Creative Objection Neutralizer Designer

**Date:** 2026-10-05
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the objection-handling
techniques that preempt and neutralize likely viewer objections before they arise. Objection
neutralizers — the deliberate techniques that surface, address, and defuse viewer skepticism — are
what make ads persuasive and reduce drop-off. Without a tool to design these neutralizers,
marketers rely on intuition, producing ads that fail to overcome the specific objections viewers
hold (price, trust, complexity, time, switching cost, quality, relevance, risk) and lose
conversions at the moment of hesitation.

An "Ad Creative Objection Neutralizer Designer" that uses AI to design objection neutralizers in
ad creative content — producing neutralizers with objection type (price concern, trust doubt,
complexity fear, time investment, switching cost, quality skepticism, relevance doubt, risk
aversion), objection trigger descriptions, neutralization technique descriptions, preemptive
evidence descriptions, neutralization strength scores (0-100), objection resolution scores
(0-100), and neutralization pathway descriptions — would give users a structured
objection-handling blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative Trust
Accelerator Designer (ADR-147), which demonstrated a self-contained analysis library with a
dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-objection-neutralizer-designer.ts`

A self-contained ad creative objection neutralizer designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce objection neutralizers
  with objection type, objection trigger, neutralization technique, preemptive evidence,
  neutralization strength, objection resolution, and neutralization pathway, plus recommendations.
- Returns a `ObjectionNeutralizerDesignerResult` with a `NeutralizerStrategy` payload containing
  `neutralizers` (ObjectionNeutralizer[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic neutralizers
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_OBJECTION_NEUTRALIZER_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-trust-accelerator-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeObjectionNeutralizerDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/objection types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-objection-neutralizer-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-trust-accelerator-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: neutralizer cards with type badges, objection trigger, neutralization
  technique, preemptive evidence, neutralization pathway, neutralization strength bars,
  objection resolution bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeObjectionNeutralizerDesigner` namespace via `useI18n`. Because the
`t` function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, neutralizers, objectionTrigger, neutralizationTechnique,
preemptiveEvidence, neutralizationStrength, objectionResolution, neutralizationPathway,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-objection-neutralizer-designer.test.ts`

Follows the pattern of `test/ad-creative-trust-accelerator-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_OBJECTION_NEUTRALIZER_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_OBJECTION_TYPES has 8 objection types,
  max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with neutralizers, correct neutralizer structure, valid
  objection types, neutralizationStrength/objectionResolution in 0-100 range, recommendations
  present, at least 3 neutralizers, works for all four platforms, works without platform,
  deterministic output, rejects invalid/missing input, distinct neutralizer types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic objection neutralizers based on content length, product,
audience, and platform:
- Three objection types are generated (price_concern, trust_doubt, risk_aversion) with
  descriptions shaped by the product and audience.
- Neutralization strength and objection resolution scores are deterministic, derived from
  content length and neutralizer index, clamped to 0-100.
- Recommendations reference the neutralizer types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured objection-handling blueprint that helps marketers design
  ads with deliberate preemptive neutralization of viewer objections for maximum conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Neutralization strength and objection resolution scores give marketers
  quantifiable metrics to compare neutralizer effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced objection context that
  the LLM would catch (e.g., industry-specific objection triggers, audience-specific
  skepticism patterns).
- **Negative:** Neutralizer scores in dry-run mode are deterministic approximations, not
  based on real objection analysis.

## Research Sources

Objection neutralizer design methodology drawn from persuasion psychology, objection-handling
research, and advertising effectiveness frameworks. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library design with
dry-run fallback and ADR-147 (Ad Creative Trust Accelerator Designer) for plan-tier-aware
model selection.
