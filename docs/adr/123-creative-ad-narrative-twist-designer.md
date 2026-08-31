# ADR-123: Creative Ad Narrative Twist Designer

**Date:** 2026-10-26
**Status:** Accepted

## Context

LazyNext users create ad content across multiple platforms but often struggle to craft narratives
that surprise and re-engage viewers. Linear, predictable ad storytelling leads to drop-off —
viewers disengage when they can anticipate the outcome within the first few seconds. Marketers
need a tool that designs unexpected narrative twists (reversals, misdirection, reveals,
perspective shifts, time jumps, identity reveals, expectation flips, context shifts) that subvert
viewer expectations, create memorable shareable moments, and re-engage audiences who would
otherwise scroll past.

A "Creative Ad Narrative Twist Designer" that uses AI to design twist concepts for ad creative
content — producing twist type, setup, twist, payoff, surprise score (0-100), emotional impact
(low/medium/high), implementation guide, and recommendations — would give users a systematic way
to inject surprise into their ad narratives before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-narrative-twist-designer.ts`

A self-contained creative ad narrative twist designer engine that:
- Takes a product/brand, content/story, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce twist concepts with twist
  type, setup, twist, payoff, surprise score, emotional impact, implementation guide, and
  recommendations.
- Returns a `TwistDesignerResult` with a `TwistStrategy` payload containing `twists`
  (NarrativeTwist[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic twist concepts
  based on product/brand, content, target audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_NARRATIVE_TWIST_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdNarrativeTwistDesignerInput()` validation, deterministic dry-run output, and
a credit-cost constant.

Supported twist types: `reversal`, `misdirection`, `reveal`, `perspective_shift`, `time_jump`,
`identity_reveal`, `expectation_flip`, `context_shift`.

### 2. New API route `src/app/api/creative/creative-ad-narrative-twist-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/twist types/emotional
  impacts (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-narrative-twist-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: twist cards with type badges, surprise score bars, setup/twist/payoff
  sections, implementation guides, emotional impact badges, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdNarrativeTwistDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, twists, surpriseScore, setup, twist, payoff, implementation, emotionalImpact,
recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-ad-narrative-twist-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_NARRATIVE_TWIST_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_TWIST_TYPES, VALID_EMOTIONAL_IMPACTS, MAX_*_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted, non-string platform rejected).
- Dry-run mode (returns strategy with twists and correct structure, surpriseScore in 0-100
  range, valid twist types, valid emotional impacts, recommendations present, works for all four
  platforms and without a platform, deterministic output, rejects invalid/missing/over-length
  input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic twist concepts based on product/brand, content, target audience, and
platform:
- Four twist concepts are generated covering reversal, misdirection, reveal, and
  perspective_shift types.
- Surprise scores are deterministic, derived from content length and twist index.
- Each twist includes setup, twist, payoff, implementation guide, and emotional impact.
- Recommendations reference the top-scoring twist and platform-specific pacing guidance.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to inject surprise into ad narratives, reducing
  viewer drop-off and increasing re-engagement.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Implementation guides give marketers concrete, actionable execution guidance
  rather than abstract twist descriptions.
- **Negative:** The heuristic fallback does not account for nuanced narrative context that the
  LLM would catch (e.g., cultural resonance, audience-specific surprise thresholds).
- **Negative:** Twist concepts in dry-run mode are deterministic approximations, not based on
  real narrative analysis of the provided content.

## Research Sources

Narrative twist design methodology drawn from storytelling theory, advertising surprise
effectiveness research, and creative narrative frameworks. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run
fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
