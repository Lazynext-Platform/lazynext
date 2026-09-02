# ADR-141: Ad Creative Curiosity Loop Designer

**Date:** 2026-10-14
**Status:** Accepted

## Context

LazyNext users create ad content across multiple platforms but often struggle to keep viewers
watching until the end. The hardest part of short-form video and ad creative is sustaining
curiosity — opening a question or mystery that compels the viewer to stay until the payoff.
Marketers need a tool that designs curiosity loops deliberately: an opening question, a mystery
element, a reveal timing, a payoff, a curiosity retention score, and a viewer hook — rather than
relying on intuition or guesswork.

An "Ad Creative Curiosity Loop Designer" that uses AI to design curiosity loops in ad creative
content — producing multiple loops with a loop type (open question, mystery box, before/after,
transformation tease, secret reveal, countdown hook, contradiction, unexpected result), opening
question, mystery element, reveal timing, payoff, curiosity retention score (0-100), and viewer
hook, plus actionable recommendations — would give users a systematic way to build retention into
their creative before publishing.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-curiosity-loop-designer.ts`

A self-contained ad creative curiosity loop designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce curiosity loops with a loop
  type, opening question, mystery element, reveal timing, payoff, curiosity retention score, and
  viewer hook, plus recommendations.
- Returns a `CuriosityLoopDesignerResult` with a `LoopStrategy` payload containing `loops`
  (`CuriosityLoop[]`) and `recommendations` (`string[]`).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic loop design
  based on product, content, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_CURIOSITY_LOOP_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeCuriosityLoopDesignerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-curiosity-loop-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/loop types (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-curiosity-loop-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: loop cards with type badges, opening question, mystery element, reveal
  timing, payoff, curiosity retention score bars, viewer hook, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeCuriosityLoopDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, loops, openingQuestion, mysteryElement, revealTiming, payoff, curiosityRetentionScore,
viewerHook, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-curiosity-loop-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_CURIOSITY_LOOP_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_LOOP_TYPES, MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted).
- Dry-run mode (returns strategy with loops, correct loop structure, curiosityRetentionScore in
  0-100 range, recommendations present, works for all four platforms and without a platform,
  produces at least 3 loops, loop types from valid set, deterministic output, rejects invalid
  input/productOrBrand/targetAudience/platform, recommendations reference platform, scores vary
  across loops).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic curiosity loop design based on product, content, audience, and
platform:
- Three curiosity loops are generated (open_question, mystery_box, before_after).
- Curiosity retention scores are deterministic, derived from content length and loop index.
- Each loop includes an opening question, mystery element, reveal timing, payoff, and viewer
  hook shaped by the product and audience.
- Five recommendations are generated referencing the platform and audience.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to design curiosity loops that retain viewers until the
  end, improving ad performance and watch time.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Multiple loop types give marketers variety to test which curiosity mechanism
  retains their audience longest.
- **Negative:** The heuristic fallback does not account for nuanced creative context that the LLM
  would catch (e.g., audience-specific curiosity triggers, cultural references).
- **Negative:** Curiosity retention scores in dry-run mode are deterministic approximations, not
  based on real creative analysis.

## Research Sources

Curiosity loop design methodology drawn from advertising retention research, open-loop
storytelling frameworks, and curiosity gap theory. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run
fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
