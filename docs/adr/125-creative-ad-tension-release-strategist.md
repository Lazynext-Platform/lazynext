# ADR-125: Creative Ad Tension Release Strategist

**Date:** 2026-10-28
**Status:** Accepted

## Context

LazyNext users craft ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to design the emotional tension curve that drives audience
engagement. Effective ads don't simply present information — they build tension, hold it, and
release it in a way that produces emotional catharsis. Without a deliberate tension/release
strategy, creative content feels flat: hooks fail to grip, the middle sags, and the payoff
underwhelms. Marketers need a tool that maps the tension buildup and release cycles in their ad
content, identifies the release points and catharsis moments, scores the overall tension rhythm,
and recommends how to optimize the emotional arc.

A "Creative Ad Tension Release Strategist" that uses AI to design tension cycles — producing
tension cycles (with phase, buildup, peak, release, intensity, and duration), release points
(with timing, technique, description, and relief level), emotional catharsis moments (with
timing, trigger, emotional release, and impact), a tension rhythm score (0-100), and
recommendations — would give users a structured emotional arc strategy before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-tension-release-strategist.ts`

A self-contained creative ad tension release strategist engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce tension cycles, release
  points, emotional catharsis moments, a tension rhythm score (0-100), and recommendations.
- Returns a `TensionReleaseResult` with a `TensionStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic tension
  strategy based on content length, product/brand, target audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_TENSION_RELEASE_STRATEGIST_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdTensionReleaseStrategistInput()` validation, deterministic dry-run output,
and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-tension-release-strategist/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/relief levels (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-tension-release-strategist/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: rhythm score gauge, tension cycles with intensity bars, release points with
  relief badges, catharsis moments with impact bars, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdTensionReleaseStrategist` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, cycles, releasePoints, catharsisMoments, rhythmScore, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/creative-ad-tension-release-strategist.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_TENSION_RELEASE_STRATEGIST_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_RELIEF_LEVELS, MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted, non-string platform rejected).
- Dry-run mode (returns strategy with correct structure for cycles/releasePoints/
  catharsisMoments, rhythmScore in 0-100 range, recommendations present, works for all four
  platforms and without platform, deterministic for same input, cycles include all four phases,
  releasePoints include all three relief levels, catharsisMoments impact in range, rejects
  invalid/missing/over-length input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic tension strategy based on content length, product/brand, target
audience, and platform:
- Four tension cycles are generated (setup, escalation, climax, resolution), each with buildup,
  peak, release, intensity (0-100), and duration.
- Three release points are generated (contrast, reveal, payoff) with partial, full, and
  cathartic relief levels.
- Two catharsis moments are generated (mid-point and climax) with triggers, emotional release
  descriptions, and impact scores (0-100).
- Rhythm score is deterministic, derived from content length.
- Five recommendations are generated referencing the brand, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured emotional arc strategy that helps marketers design tension
  and release cycles that produce catharsis, rather than flat informational content.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Tension cycles with intensity, release points with relief levels, and catharsis
  moments with impact give marketers a concrete, actionable emotional arc blueprint.
- **Negative:** The heuristic fallback does not account for nuanced emotional context that the
  LLM would catch (e.g., cultural resonance, audience-specific emotional triggers).
- **Negative:** Tension cycle intensities and rhythm score in dry-run mode are deterministic
  approximations, not based on real emotional analysis.

## Research Sources

Tension and release cycle methodology drawn from narrative structure theory, emotional catharsis
research, and advertising effectiveness frameworks. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run
fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
