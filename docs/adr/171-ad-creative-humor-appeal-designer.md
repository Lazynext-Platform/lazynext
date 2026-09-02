# ADR-171: Ad Creative Humor Appeal Designer

**Date:** 2026-10-21
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
humor appeals that make creative relatable and shareable. Humor appeals — the
deliberate comedic hooks, timing, and tone that capture attention and drive
sharing — are what make ads memorable and organically distributed. Without a tool
to design these appeals, marketers rely on intuition, producing ads that fail to
leverage the specific humor types viewers respond to (relatable observation,
exaggeration comedy, self-deprecating, absurdist humor, situational comedy,
irony/sarcasm, physical comedy, wordplay/pun) and lose the shareability that
amplifies reach.

An "Ad Creative Humor Appeal Designer" that uses AI to design humor appeals in ad
creative content — producing appeals with humor type (relatable observation,
exaggeration comedy, self-deprecating, absurdist humor, situational comedy,
irony sarcasm, physical comedy, wordplay pun), comedy hook descriptions, timing
element descriptions, punchline strategy descriptions, humor appeal scores
(0-100), shareability scores (0-100), and appeal pathway descriptions — would
give users a structured humor-building blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Objection Neutralizer Designer (ADR-151), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-humor-appeal-designer.ts`

A self-contained ad creative humor appeal designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce humor
  appeals with humor type, comedy hook, timing element, punchline strategy,
  humor appeal, shareability, and appeal pathway, plus recommendations.
- Returns a `HumorAppealDesignerResult` with a `HumorStrategy` payload
  containing `appeals` (HumorAppeal[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  appeals based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_HUMOR_APPEAL_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-objection-neutralizer-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeHumorAppealDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-humor-appeal-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/humor
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-humor-appeal-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: appeal cards with type badges, comedy hook, timing element,
  punchline strategy, appeal pathway, humor appeal bars, shareability bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeHumorAppealDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, appeals, comedyHook, timingElement, punchlineStrategy,
humorAppeal, shareability, appealPathway, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/ad-creative-humor-appeal-designer.test.ts`

Follows the pattern of `test/ad-creative-objection-neutralizer-designer.test.ts`.
Tests cover:
- Credit cost (`AD_CREATIVE_HUMOR_APPEAL_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_HUMOR_TYPES has 8
  humor types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with appeals, correct appeal structure, valid
  humor types, humorAppeal/shareability in 0-100 range, recommendations
  present, at least 3 appeals, works for all four platforms, works without
  platform, deterministic output, rejects invalid/missing input, distinct
  appeal types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic humor appeals based on content
length, product, audience, and platform:
- Three humor types are generated (relatable_observation, exaggeration_comedy,
  wordplay_pun) with descriptions shaped by the product and audience.
- Humor appeal and shareability scores are deterministic, derived from content
  length and appeal index, clamped to 0-100.
- Recommendations reference the humor types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured humor-building blueprint that helps
  marketers design ads with deliberate comedic hooks and timing for maximum
  shareability and organic distribution.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Humor appeal and shareability scores give marketers quantifiable
  metrics to compare appeal effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced humor context
  that the LLM would catch (e.g., audience-specific comedic preferences,
  cultural humor references, platform-specific timing norms).
- **Negative:** Appeal scores in dry-run mode are deterministic approximations,
  not based on real humor analysis.

## Research Sources

Humor appeal design methodology drawn from comedy theory, shareability research,
and advertising effectiveness frameworks. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library
design with dry-run fallback and ADR-151 (Ad Creative Objection Neutralizer
Designer) for plan-tier-aware model selection.
