# ADR-063: Ad Headline Generator

**Date:** 2026-09-27
**Status:** Accepted

## Context

LazyNext users need attention-grabbing ad headlines optimized for specific platforms — short,
curiosity-driven headlines for TikTok; lifestyle-framed, benefit-led headlines for Instagram;
search-intent-aligned headlines for YouTube; conversational, social-proof headlines for Facebook.
Today, users write headlines manually or adapt one headline across platforms, which ignores each
platform's character norms, hook conventions, and audience expectations. A headline that stops the
scroll on TikTok (curiosity + urgency, 40-80 chars) will underperform on Facebook (social proof +
benefit, 25-40 chars) if copy-pasted verbatim.

An "Ad Headline Generator" that uses AI to generate platform-specific ad headlines — with text,
platformFit, characterCount, predictedImpact (low/medium/high), and hookType
(curiosity/urgency/social_proof/benefit/question) — would let users produce on-platform headlines
in seconds rather than adapting generic headlines by hand. The hookType spread lets users A/B test
different psychological angles in a single request.

The patterns were drawn from the Ad Caption Generator (ADR-062), which demonstrated a
self-contained generation library with a dry-run fallback, and the Ad Format Optimizer (ADR-055),
which demonstrated plan-tier-aware model selection and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-headline-generator.ts`

A self-contained ad headline generator engine that:
- Takes a product/brand, a platform, an optional target audience, an optional tone, and an optional
  count (1-10, default 5).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate that many distinct
  platform-specific headlines with text, platformFit, characterCount, predictedImpact, and
  hookType.
- Returns a list of `AdHeadline`.
- Has a dry-run fallback when Atlas is unavailable (uses templated headlines derived from the
  product, platform, and tone — with a spread of hook types: curiosity, urgency, social_proof,
  benefit, question).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_HEADLINE_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-caption-generator.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdHeadlineGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-headline-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-caption-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-headline-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-caption-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, optional target audience input, optional
  tone input, and a count selector (1-10).
- Displays results: headline cards with text, hookType badge, predictedImpact, character count,
  platform badge, and platform-fit rating; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (badges wrap, grid collapses).

### 4. Translations

The page uses the `adHeadlineGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, targetAudience, tone, count, generate, generating,
predictedImpact, characterCount, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-headline-generator.test.ts`

Follows the pattern of `test/ad-caption-generator.test.ts`. Tests cover:
- Credit cost (`AD_HEADLINE_GENERATOR_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_HOOK_TYPES, VALID_IMPACTS, MAX_PRODUCT_LENGTH, MAX_TONE_LENGTH,
  MAX_AUDIENCE_LENGTH, MIN_COUNT, MAX_COUNT, DEFAULT_COUNT).
- Input validation (non-object input, missing productOrBrand, over-length productOrBrand, missing
  platform, invalid platform, invalid targetAudience type, over-length targetAudience, invalid
  tone type, over-length tone, count below minimum, count above maximum, invalid count type,
  invalid dryRun type, valid minimal input).
- Dry-run mode (returns headlines with correct structure, returns the requested count, defaults to
  DEFAULT_COUNT, characterCount matches text length, headlines have varied hook types, respects
  count of 1, rejects invalid input/invalid-platform/out-of-range-count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic templated headlines derived from the product, platform, and tone:
- Ten headline templates rotated based on the requested count, each with a distinct hookType
  (curiosity, urgency, social_proof, benefit, question) and predictedImpact.
- Platform-specific platformFit descriptors (TikTok/Instagram: Excellent, YouTube/Facebook: Good).

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Lets users produce on-platform headlines in seconds rather than adapting generic
  headlines by hand, respecting each platform's character norms and hook conventions.
- **Positive:** The count selector (1-10) and hookType spread let users generate a batch of
  psychologically-varied variants for A/B testing in a single request.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch (e.g., a luxury brand may warrant a more
  restrained hook style).
- **Negative:** 3 credits per generation may add up for users who generate many headline batches;
  however, the cost is low relative to analysis-heavy features (viral-analysis: 6, skill-chains:
  8).

## Research Sources

Platform headline best practices drawn from industry research (TikTok for Business headline
guidelines, Instagram ad headline optimization, YouTube ad headline guidance, Facebook ad headline
best practices) and adapted to LazyNext's multi-platform e-commerce ad context. The architecture
follows the patterns established in ADR-062 (Ad Caption Generator) for self-contained library
design with dry-run fallback and ADR-055 (Ad Format Optimizer) for plan-tier-aware model selection.
