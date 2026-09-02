# ADR-113: Creative Ad Persuasion Strategist

**Date:** 2026-10-16
**Status:** Accepted

## Context

LazyNext users craft ad creative across many formats and platforms, but they
often lack a principled framework for making their creative *persuasive*. Marketers
intuitively use tactics like social proof or scarcity, but without a structured
strategy they miss opportunities, apply principles inconsistently, or risk
crossing into manipulative territory. There is no systematic tool that maps a
product, audience, and goal onto Cialdini's seven principles of persuasion
(reciprocity, scarcity, authority, consistency, liking, social proof, unity),
recommends concrete techniques, identifies psychological triggers with timing
and intensity, flags ethical considerations, and provides messaging
recommendations.

A "Creative Ad Persuasion Strategist" that uses AI to develop a persuasion
strategy — producing principles to apply (with relevance, application, and
expected effect), persuasion techniques (with the leveraging principle,
implementation, and strength), psychological triggers (with description,
timing, and intensity), ethical considerations, and messaging recommendations —
would give users a comprehensive, principled persuasion plan before they build
creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Hashtag Generator (ADR-073), which demonstrated a self-contained analysis
library with a dry-run fallback, plan-tier-aware model selection, and
deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-persuasion-strategist.ts`

A self-contained creative ad persuasion strategist engine that:
- Takes a product/brand, a target audience, content or a campaign goal, and an
  optional platform (tiktok, instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a
  persuasion strategy using Cialdini's principles: principles to apply,
  persuasion techniques, psychological triggers, ethical considerations, and
  messaging recommendations.
- Returns a `PersuasionStrategistResult` with a `PersuasionStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic
  heuristic strategy based on product, audience, content length, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-hashtag-generator.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdPersuasionStrategistInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-persuasion-strategist/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/principles/
  strengths (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-persuasion-strategist/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), target audience (input), content
  (textarea), and an optional platform selector.
- Displays results: persuasion principles with relevance bars, persuasion
  techniques with strength badges, psychological triggers with intensity bars,
  ethical considerations, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdPersuasionStrategist` namespace via `useI18n`.
Because the `t` function falls back to the key string when a translation is
missing, the page renders correctly without modifying `src/i18n/locales/en.ts`
or any locale files. Keys used: title, subtitle, signInPrompt, skipToContent,
productOrBrand, targetAudience, content, platform, generate, generating,
principles, techniques, triggers, ethicalConsiderations, recommendations,
copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-persuasion-strategist.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_PRINCIPLES, VALID_STRENGTHS, max lengths).
- Input validation (missing productOrBrand, missing targetAudience, missing
  content, over-length fields, invalid platform, invalid dryRun type, valid
  minimal input, empty/undefined platform accepted, multiple errors collected).
- Dry-run mode (returns strategy with correct structure for
  principles/techniques/triggers, seven principles, relevance/intensity in
  0-100 range, valid strengths, ethicalConsiderations/recommendations present,
  works for all four platforms and without a platform, deterministic for
  identical input, varies with different content, rejects invalid
  input/productOrBrand/targetAudience/platform, error message includes codes).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic persuasion strategy based on
product, audience, content length, and platform:
- All seven Cialdini principles are generated with deterministic relevance
  scores derived from content length and principle index.
- Four persuasion techniques are generated (testimonial montage, limited-time
  offer, expert endorsement, free value preview) mapped to principles.
- Three psychological triggers are generated (FOMO, curiosity gap, belonging)
  with deterministic intensity.
- Ethical considerations and messaging recommendations are templated from the
  product/audience/platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a principled, structured persuasion strategy that
  helps marketers apply Cialdini's principles consistently and ethically.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and
  avoids merge conflicts.
- **Positive:** Ethical considerations are a first-class output, encouraging
  honest persuasion and protecting brand reputation.
- **Negative:** The heuristic fallback does not account for nuanced audience
  psychology or cultural context that the LLM would catch.
- **Negative:** Principle relevance scores in dry-run mode are deterministic
  approximations, not based on real persuasion analysis.

## Research Sources

Persuasion methodology drawn from Robert Cialdini's principles of persuasion
(reciprocity, scarcity, authority, consistency, liking, social proof, unity).
The architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-073
(Ad Hashtag Generator) for plan-tier-aware model selection.
