# ADR-079: Ad A/B Test Name Generator

**Date:** 2026-10-06
**Status:** Accepted

## Context

LazyNext users run A/B tests across their paid ad campaigns — testing hooks, headlines, CTAs,
visuals, audiences, timing, and formats. A common pain point is naming these tests: vague names
like "Test 1" and "Test A vs B" make it impossible to recall what was tested or why, and
inconsistent naming across teams makes it hard to compare results or build a learning library.
Marketers need clear, descriptive names for each test variant that capture the hypothesis, test
category, and a brief description — so anyone reviewing the results can immediately understand what
was tested and why.

An "Ad A/B Test Name Generator" that uses AI to generate clear, descriptive names for A/B test
variants — each with a variant label, test name, hypothesis summary, test category, and
description — would give users ready-to-use, consistent test naming before they launch
experiments.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-ab-test-name-generator.ts`

A self-contained ad A/B test name generator engine that:
- Takes a product or brand, a test type (hook, headline, cta, visual, audience, timing, format),
  and an optional variant count (2-6, default 2).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate test variant names with a
  variant label (e.g., "Variant A"), test name, hypothesis, category, and description.
- Returns a `TestVariantName[]` plus a `testSeriesName`.
- Has a dry-run fallback when Atlas is unavailable (uses test-type-specific name templates —
  e.g., hook tests compare emotional vs curiosity hooks; headline tests compare benefit vs
  feature headlines; CTA tests compare urgency vs value CTAs).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 2 credits (`AD_AB_TEST_NAME_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdABTestNameGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-ab-test-name-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported test types (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-ab-test-name-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, test type selector (7 types), and a variant count selector
  (2-6).
- Displays results: a test series name header and detailed test variant cards with variant label,
  test name, category badge, hypothesis, and description; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, badges wrap).

### 4. Translations

The page uses the `adABTestNameGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, testType, variantCount, generate, generating, hypothesis,
description, testSeriesName, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-ab-test-name-generator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_AB_TEST_NAME_GENERATOR_CREDIT_COST` is 2).
- Input validation (missing productOrBrand, missing/invalid testType, over-length
  productOrBrand, variantCount out of range, invalid variantCount type, invalid dryRun type,
  valid minimal input).
- Dry-run mode (returns testNames with correct structure, requested count honored, defaults to 2,
  works for all seven test types, rejects invalid input/testType/variantCount).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic test names based on test-type-specific templates:
- hook: emotional vs curiosity, story vs data-driven, shock vs question, etc.
- headline: benefit vs feature, question vs statement, urgency vs social proof, etc.
- cta: urgency vs value, direct vs curiosity, first-person vs second-person, etc.
- visual: lifestyle vs product, text-heavy vs minimal, bright vs muted, etc.
- audience: lookalike vs interest, retargeting vs cold, broad vs narrow, etc.
- timing: morning vs evening, weekday vs weekend, high vs low frequency, etc.
- format: video vs carousel, static vs video, story vs feed, etc.

Each dry-run test name includes a variant label, test name, hypothesis, category, and
description. Brand-specific descriptions are generated dynamically from the input.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates vague, inconsistent test naming by generating clear, descriptive names
  that capture the hypothesis and category — making test results reviewable and comparable.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Test category labels (engagement, conversion, reach, retention, brand_awareness)
  help users organize and filter their testing library.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific
  nuances or past test history that the LLM would catch.
- **Negative:** Hypotheses in dry-run mode are template-based, not tailored to the specific
  product context beyond a brand name insertion.

## Research Sources

A/B testing best practices drawn from industry research (Meta Business, Google Ads, TikTok for
Business) and marketing experimentation literature. The architecture follows the patterns
established in ADR-073 (Ad Hashtag Generator) for self-contained library design with dry-run
fallback and ADR-071 (Ad Thumbnail Generator) for plan-tier-aware model selection.
