# ADR-120: Ad Creative Contrast Amplifier

**Date:** 2026-10-23
**Status:** Accepted

## Context

LazyNext users create ad content across multiple formats and platforms, but many creatives lack
the persuasive tension that drives attention and conversion. Contrast is one of the most powerful
persuasion levers in advertising — before/after, problem/solution, with/without,
expectation/reality, then/now, and ordinary/extraordinary framings create emotional tension that
captures attention and motivates action. Marketers currently amplify contrast manually and
inconsistently, missing opportunities to strengthen the transformation narrative.

An "Ad Creative Contrast Amplifier" that uses AI to amplify contrast in ad creative content —
producing amplified content, a contrast score (0-100), contrast elements with impact levels,
contrast pairs with emotional impact, and recommendations — would give users a systematic way to
strengthen the persuasive tension in their creatives before publishing.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-contrast-amplifier.ts`

A self-contained ad creative contrast amplifier engine that:
- Takes a product or brand, content, a contrast type (before_after, problem_solution,
  with_without, expectation_reality, then_now, ordinary_extraordinary — default before_after),
  and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce amplified content, a
  contrast score (0-100), contrast elements with impact, contrast pairs with emotional impact,
  and recommendations.
- Returns a `ContrastAmplifierResult` with a `ContrastAnalysis` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic amplification
  based on content length, contrast type, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST`).
- Includes a prompt-injection guard in the system prompt: input content is treated as data, not
  instructions.

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeContrastAmplifierInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-contrast-amplifier/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/contrast types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-contrast-amplifier/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), contrast type selector (6 types),
  and an optional platform selector.
- Displays results: amplified content box, contrast score gauge, contrast elements with impact
  badges and before/after comparison, contrast pairs with left/right comparison and emotional
  impact, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, gauge scales).

### 4. Translations

The page uses the `adCreativeContrastAmplifier` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, content, contrastType, platform, generate, generating,
amplifiedContent, contrastScore, elements, pairs, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/ad-creative-contrast-amplifier.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_CONTRAST_TYPES, VALID_IMPACTS, DEFAULT_CONTRAST_TYPE,
  MAX_CONTENT_LENGTH, MAX_PRODUCT_LENGTH).
- Input validation (missing productOrBrand, missing content, over-length fields, invalid
  contrastType, invalid platform, invalid dryRun type, valid minimal input, empty platform/
  contrastType accepted, missing input object).
- Dry-run mode (returns analysis with correct structure for elements/pairs, contrastScore in
  0-100 range, amplifiedContent non-empty, recommendations present and non-empty, works for all
  four platforms and all contrast types, defaults to before_after, references the brand,
  deterministic for same input, rejects invalid input/productOrBrand/contrastType/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic contrast amplification based on content length, contrast type, and
platform:
- Contrast score is derived from content length (35-90 range).
- Two contrast elements are generated with the chosen contrast type, before/after states, and
  impact levels based on the score.
- Two contrast pairs are generated with left/right labels and emotional impact descriptions.
- Five recommendations are generated covering hook timing, transformation clarity, platform
  formatting, A/B testing, and call-to-action pairing.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to amplify persuasive contrast in ad creatives, a key
  driver of attention and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Contrast elements with impact levels and contrast pairs with emotional impact
  give marketers concrete, actionable insight into how contrast is working in their creative.
- **Negative:** The heuristic fallback does not account for nuanced contrast factors that the
  LLM would catch (e.g., cultural context, audience-specific emotional resonance).
- **Negative:** Contrast scores in dry-run mode are deterministic approximations, not based on
  real creative analysis.

## Research Sources

Contrast amplification methodology drawn from advertising persuasion research and creative
contrast frameworks (before/after, problem/solution, with/without, expectation/reality,
then/now, ordinary/extraordinary). The architecture follows the patterns established in ADR-098
(Creative Quality Scorer) for self-contained library design with dry-run fallback and ADR-073
(Ad Hashtag Generator) for plan-tier-aware model selection.
