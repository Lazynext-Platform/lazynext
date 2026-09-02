# ADR-082: Creative Concept Validator

**Date:** 2026-10-06
**Status:** Accepted

## Context

LazyNext users generate creative concepts for their ad campaigns, but not all concepts are ready
for production. A concept may have brand safety risks, poor platform fit, low engagement
potential, unclear messaging, or lack originality. Without a systematic validation step, users
risk spending budget on creatives that underperform or, worse, violate platform policies or brand
guidelines. Marketers need a way to validate concepts against best practices, platform
requirements, and brand safety before investing in production.

A "Creative Concept Validator" that uses AI to validate creative concepts — producing a
comprehensive report with an overall score, letter grade, dimensional scores (platform fit,
brand safety, engagement potential, clarity, originality), issues with severity and suggestions,
strengths, recommendations, and a verdict — would give users a go/no-go decision tool before
production.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-concept-validator.ts`

A self-contained creative concept validator engine that:
- Takes a concept (max 2000 chars), a product or brand (max 2000 chars), an optional platform
  (tiktok, instagram, youtube, facebook), and an optional target audience (max 1000 chars).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to validate the concept and produce a
  report with an overall score (0-100), grade (F-A+), platform fit (1-10), brand safety (1-10),
  engagement potential (1-10), clarity (1-10), originality (1-10), issues (with severity,
  description, suggestion), strengths, recommendations, and a verdict.
- Returns a `ConceptValidation` object wrapped in a `ConceptValidatorResult`.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic scoring based on concept
  characteristics — question format, numbers, CTAs, emojis, concept length, platform alignment).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asStrArray`/`asSeverity` helpers,
`isDryRun()` detection, `validateCreativeConceptValidatorInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-concept-validator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/severities (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-concept-validator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for concept input, product/brand input, optional platform selector, and optional
  target audience input.
- Displays results: an overall score and grade header, a verdict, dimensional score bars
  (platform fit, brand safety, engagement potential, clarity, originality), issues with severity
  badges and suggestions, strengths list, recommendations list; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (score bars are full-width, cards stack, badges wrap).

### 4. Translations

The page uses the `creativeConceptValidator` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, concept, productOrBrand, platform, targetAudience, validate, validating,
overallScore, grade, platformFit, brandSafety, engagementPotential, clarity, originality, issues,
suggestion, strengths, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-concept-validator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST` is 5).
- Input validation (missing concept, missing productOrBrand, over-length
  concept/productOrBrand/targetAudience, invalid platform, invalid dryRun type, valid minimal
  input).
- Dry-run mode (returns validation with correct structure, issues have valid severities, works
  for all four platforms, works without platform/audience, rejects invalid input/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic validation based on concept characteristics:
- Question format boosts engagement potential.
- Numbers/specificity boost clarity.
- CTAs boost engagement potential.
- Emojis boost engagement potential.
- Very short or very long concepts reduce clarity.
- Platform-specific adjustments (TikTok favors short + questions; Instagram favors emojis;
  YouTube favors numbers; Facebook favors CTAs).

The dry-run validation includes an overall score, grade, dimensional scores, issues (with
severity, description, suggestion), strengths, recommendations, and a verdict. Scores are
dynamically computed from the concept text.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in concept validation by providing a comprehensive,
  multi-dimensional assessment before production investment.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Issue severity labels (high/medium/low) with actionable suggestions help users
  prioritize fixes before production.
- **Negative:** The heuristic fallback is generic and does not account for nuanced brand
  guidelines or competitive landscape analysis that the LLM would catch.
- **Negative:** Scores in dry-run mode are based on simple text heuristics, not deep creative
  analysis.

## Research Sources

Creative validation best practices drawn from industry research (Meta Business, Google Ads,
TikTok for Business) and advertising effectiveness literature. The architecture follows the
patterns established in ADR-073 (Ad Hashtag Generator) for self-contained library design with
dry-run fallback and ADR-071 (Ad Thumbnail Generator) for plan-tier-aware model selection.
