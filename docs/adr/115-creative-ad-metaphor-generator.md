# ADR-115: Creative Ad Metaphor Generator

**Date:** 2026-10-18
**Status:** Accepted

## Context

LazyNext users create ad content that often needs to communicate abstract product benefits
(speed, security, comfort, transformation) in a way that is instantly understandable and
memorable to a target audience. Abstract claims like "improves productivity" or "protects
your data" fail to resonate because they lack a concrete mental image. Marketers need a tool
that generates vivid metaphors and analogies — comparing the abstract benefit to something
tangible and familiar — so that audiences immediately "get it" and remember it.

A "Creative Ad Metaphor Generator" that uses AI to produce a collection of creative metaphors
— each with the metaphor text, an explanation of why it works, a visual suggestion for
depicting it in an ad, the emotional resonance it evokes, a memorability score (0-100), and
a category — plus actionable recommendations for using these metaphors in ad creative — would
give marketers a rich palette of concrete, memorable ways to express abstract benefits.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag
Generator (ADR-073), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-metaphor-generator.ts`

A self-contained creative ad metaphor generator engine that:
- Takes a product/brand, a benefit or concept to illustrate, a target audience, and an
  optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a collection of
  metaphors (each with metaphor text, explanation, visual suggestion, emotional resonance,
  memorability score, and category) plus recommendations.
- Returns a `MetaphorGeneratorResult` with a `MetaphorCollection` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic metaphor
  generation based on the product, benefit, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`CREATIVE_AD_METAPHOR_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdMetaphorGeneratorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-metaphor-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-metaphor-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand, benefit, target audience, and an optional platform selector.
- Displays results: metaphor cards with the metaphor text, memorability score bars, visual
  suggestions, emotional resonance, category badges, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `creativeAdMetaphorGenerator` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, benefit, targetAudience, platform,
generate, generating, metaphors, memorabilityScore, visualSuggestion, emotionalResonance,
category, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-metaphor-generator.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_METAPHOR_GENERATOR_CREDIT_COST` is 3).
- Constants (`VALID_PLATFORMS`, `MAX_PRODUCT_LENGTH`, `MAX_BENEFIT_LENGTH`,
  `MAX_AUDIENCE_LENGTH`).
- Input validation (missing productOrBrand, missing benefit, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, undefined platform accepted, dryRun boolean accepted, multiple
  invalid fields).
- Dry-run mode (returns collection with metaphors, correct metaphor structure, at least 4
  metaphors, recommendations present, memorabilityScore in 0-100 range, works for all four
  platforms, works without a platform, metaphors reference product/brand, varied categories,
  varied emotional resonance, deterministic for same input, recommendations reference
  platform, rejects invalid input/productOrBrand/benefit/targetAudience, non-empty visual
  suggestions, non-empty explanations).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic metaphor generation based on the product, benefit, audience,
and platform:
- Six metaphor templates are generated across six categories (everyday_object, nature,
  journey, transformation, contrast, sensory).
- Each metaphor includes a vivid comparison, an explanation, a visual suggestion, an
  emotional resonance, and a memorability score (40-95, deterministic).
- Metaphors are seeded by the combined length of the input fields for determinism.
- Recommendations reference the platform and provide actionable guidance.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides marketers with a rich palette of concrete, memorable metaphors that
  make abstract product benefits instantly understandable to target audiences.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Visual suggestions and emotional resonance give marketers concrete
  creative direction rather than just text.
- **Negative:** The heuristic fallback does not account for nuanced cultural context or
  audience-specific metaphor resonance that the LLM would catch.
- **Negative:** Metaphor memorability scores in dry-run mode are deterministic
  approximations, not based on real memorability research.

## Research Sources

Creative metaphor and analogy methodology drawn from advertising effectiveness research and
rhetorical theory. The architecture follows the patterns established in ADR-098 (Creative
Quality Scorer) for self-contained library design with dry-run fallback and ADR-073 (Ad
Hashtag Generator) for plan-tier-aware model selection.
