# ADR-119: Creative Ad Anticipation Builder

**Date:** 2026-10-22
**Status:** Accepted

## Context

LazyNext users build ad creative content across multiple platforms but often struggle to
generate the anticipation and suspense that keeps viewers engaged through a reveal. A flat
reveal — showing the product immediately — fails to hold attention. Marketers need a tool
that designs anticipation hooks, suspense techniques, reveal strategies, a tension curve,
and an overall anticipation score so their creative builds curiosity and delivers a
satisfying payoff.

A "Creative Ad Anticipation Builder" that uses AI to construct anticipation and suspense
elements for ad creative content — producing anticipation hooks (with timing, intensity,
and type), suspense techniques (with effectiveness scores), reveal strategies (with
buildup and payoff), a tension curve (with phased intensity), an anticipation score
(0-100), and recommendations — would give users a structured plan to maximize curiosity
before the reveal.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag
Generator (ADR-073), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-anticipation-builder.ts`

A self-contained creative ad anticipation builder engine that:
- Takes a product/brand, content/reveal, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce anticipation hooks,
  suspense techniques, reveal strategies, a tension curve, an anticipation score, and
  recommendations.
- Returns an `AnticipationBuilderResult` with an `AnticipationPlan` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  anticipation plans based on product, content, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_ANTICIPATION_BUILDER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-hashtag-generator.ts`: self-contained types, `extractJson`/`asStr`/`asNum` helpers,
`isDryRun()` detection, `validateCreativeAdAnticipationBuilderInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-anticipation-builder/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/intensities (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding
  and `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-anticipation-builder/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and
  an optional platform selector.
- Displays results: anticipation score gauge, anticipation hooks with intensity badges,
  suspense techniques with effectiveness bars, reveal strategies with buildup/payoff, a
  tension curve bar-chart visualization, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`,
  etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdAnticipationBuilder` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used:
title, subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience,
platform, generate, generating, hooks, techniques, revealStrategies, tensionCurve,
anticipationScore, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-anticipation-builder.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_ANTICIPATION_BUILDER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_INTENSITIES, MAX_*_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, undefined platform accepted, dryRun boolean accepted).
- Dry-run mode (returns plan with correct structure for hooks/techniques/
  revealStrategies/tensionCurve, anticipationScore in 0-100 range, recommendations
  present, works for all four platforms and without a platform, deterministic for
  identical input, score varies with content length, rejects invalid/missing/over-length
  input, tension curve phase ordering, peak phase highest intensity, technique
  effectiveness range).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic anticipation plans based on product, content, audience,
and platform:
- Three anticipation hooks are generated with varied timing, intensity, and type.
- Three suspense techniques are generated with effectiveness scores derived from content
  length.
- Two reveal strategies are generated with buildup and payoff.
- A five-phase tension curve (setup, build, peak, payoff, resolution) is generated with
  increasing then decreasing intensity.
- The anticipation score is derived from content length, clamped to 0-100.
- Four recommendations are generated referencing the brand, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM
failure.

## Consequences

- **Positive:** Provides a structured anticipation plan that helps marketers build
  curiosity and suspense before a product reveal, improving engagement and retention.
- **Positive:** The dry-run fallback ensures the feature is usable in local development
  and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** The tension curve visualization gives marketers an intuitive view of how
  intensity should ebb and flow across the creative.
- **Negative:** The heuristic fallback does not account for nuanced creative context that
  the LLM would catch (e.g., audience-specific suspense preferences, cultural
  anticipation norms).
- **Negative:** Dry-run anticipation scores are deterministic approximations, not based
  on real creative analysis.

## Research Sources

Anticipation and suspense design methodology drawn from advertising engagement research
and narrative tension frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback
and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
