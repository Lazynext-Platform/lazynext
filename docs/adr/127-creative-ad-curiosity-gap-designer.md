# ADR-127: Creative Ad Curiosity Gap Designer

**Date:** 2026-10-30
**Status:** Accepted

## Context

LazyNext users craft ad creative content across multiple platforms but rarely
design curiosity gaps deliberately. A curiosity gap is the space between what
viewers know and what they want to know — the knowledge asymmetry that compels
a viewer to keep watching until the resolution. Ads that fail to open a
curiosity gap lose viewers within the first few seconds; ads that open one but
resolve it too early or too weakly squander the engagement they built.
Marketers lack a tool that systematically designs these gaps — choosing a gap
type (information gap, mystery box, partial reveal, question hook, countdown
tease, transformation tease, secret reveal, what-happens-next), crafting the
opening that establishes the known state, the tease that creates the unknown,
the resolution timing that maximizes watch-through, and the payoff that
delivers a satisfying answer.

A "Creative Ad Curiosity Gap Designer" that uses AI to design curiosity gaps in
ad creative content — producing curiosity gaps (with type, opening, tease,
resolution timing, curiosity score, engagement strategy, and payoff) and
recommendations — would give users a deliberate, high-engagement curiosity plan
before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Memory Anchor Builder (ADR-124), which demonstrated a self-contained
analysis library with a dry-run fallback, plan-tier-aware model selection, and
deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-curiosity-gap-designer.ts`

A self-contained creative ad curiosity gap designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce curiosity
  gaps (with type, opening, tease, resolution timing, curiosity score,
  engagement strategy, and payoff) and recommendations.
- Returns a `CuriosityGapDesignerResult` with a `GapStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic
  heuristic curiosity gap design based on content length, audience, and
  platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_CURIOSITY_GAP_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-memory-anchor-builder.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdCuriosityGapDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-curiosity-gap-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/gap types
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-curiosity-gap-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-memory-anchor-builder/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: curiosity gap cards with type badges, curiosity score bars,
  opening/tease sections in a two-column grid, resolution timing, engagement
  strategy, payoff sections, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars
  scale).

### 4. Translations

The page uses the `creativeAdCuriosityGapDesigner` namespace via `useI18n`.
Because the `t` function falls back to the key string when a translation is
missing, the page renders correctly without modifying `src/i18n/locales/en.ts`
or any locale files. Keys used: title, subtitle, signInPrompt, skipToContent,
productOrBrand, content, targetAudience, platform, generate, generating, gaps,
curiosityScore, opening, tease, payoff, resolutionTiming, engagementStrategy,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-curiosity-gap-designer.test.ts`

Follows the pattern of `test/ad-creative-memory-anchor-builder.test.ts`. Tests
cover:
- Credit cost (`CREATIVE_AD_CURIOSITY_GAP_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_GAP_TYPES has 8 gap types,
  max lengths).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, undefined platform accepted,
  non-string platform rejected, dryRun true accepted).
- Dry-run mode (returns strategy with correct structure for gaps, curiosityScore
  in 0-100 range, recommendations present, works for all four platforms and
  without a platform, deterministic for same input, gaps include question_hook/
  mystery_box/partial_reveal/transformation_tease/secret_reveal types, all gap
  types valid, curiosity score increases with longer content, produces at least
  5 gaps, recommendations reference the brand, rejects invalid/missing required
  fields).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic curiosity gap design based on
content length, audience, and platform:
- Five curiosity gaps are generated using rotating gap types (question_hook,
  mystery_box, partial_reveal, transformation_tease, secret_reveal).
- Each gap has a type-specific opening, tease, resolution timing, engagement
  strategy, and payoff shaped by the brand, audience, and platform.
- Curiosity scores are deterministic, derived from content length and gap
  index, clamped to 0-100.
- Five recommendations are generated referencing the brand, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a deliberate, high-engagement curiosity gap plan that
  maximizes watch-through and compels viewers to stay until the payoff.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and
  avoids merge conflicts.
- **Positive:** Gap types with engagement strategies and payoffs give marketers
  concrete techniques for executing each curiosity gap rather than abstract
  advice.
- **Negative:** The heuristic fallback does not account for nuanced curiosity
  triggers that the LLM would catch (e.g., audience-specific knowledge gaps,
  platform-specific pacing conventions).
- **Negative:** Curiosity scores in dry-run mode are deterministic
  approximations, not based on real curiosity analysis of the content.

## Research Sources

Curiosity gap methodology drawn from advertising engagement research and
information-gap theory. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with
dry-run fallback and ADR-124 (Ad Creative Memory Anchor Builder) for
target-audience-aware plan-tier model selection.
