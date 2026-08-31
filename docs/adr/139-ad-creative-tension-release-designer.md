# ADR-139: Ad Creative Tension Release Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the emotional
rhythm of tension and release that drives viewer engagement. Tension-release cycles — the
deliberate pattern of building tension and releasing it — are what make ads emotionally
compelling and keep viewers watching through to the end. Without a tool to design these
cycles, marketers rely on intuition, producing inconsistent emotional pacing that fails to
sustain attention or deliver cathartic payoff.

An "Ad Creative Tension Release Designer" that uses AI to design tension-release cycles in
ad creative content — producing cycles with cycle type (slow build/sudden release, rapid
escalation/catharsis, wave pattern, spiral escalation, plateau break, rhythmic pulse,
tension plateau/release, crescendo finale), tension build descriptions, release moment
descriptions, emotional relief descriptions, catharsis scores (0-100), viewer satisfaction
scores (0-100), and timing — would give users a structured emotional rhythm blueprint for
their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag
Generator (ADR-073), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-tension-release-designer.ts`

A self-contained ad creative tension release designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce tension-release cycles
  with cycle type, tension build, release moment, emotional relief, catharsis score, viewer
  satisfaction, and timing, plus recommendations.
- Returns a `TensionReleaseDesignerResult` with a `ReleaseStrategy` payload containing
  `cycles` (TensionReleaseCycle[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic cycles
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_TENSION_RELEASE_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeTensionReleaseDesignerInput()` validation, deterministic dry-run output,
and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-tension-release-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/cycle types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-tension-release-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: cycle cards with type badges, tension build, release moment, emotional
  relief, catharsis score bars, viewer satisfaction bars, timing, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeTensionReleaseDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, cycles, tensionBuild, releaseMoment, emotionalRelief, catharsisScore,
viewerSatisfaction, timing, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-tension-release-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_TENSION_RELEASE_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_CYCLE_TYPES has 8 cycle types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with cycles, correct cycle structure, valid cycle types,
  catharsisScore/viewerSatisfaction in 0-100 range, recommendations present, at least 3
  cycles, works for all four platforms, works without platform, deterministic output,
  rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic tension-release cycles based on content length, product,
audience, and platform:
- Three cycle types are generated (slow_build_sudden_release, rapid_escalation_catharsis,
  wave_pattern) with descriptions shaped by the product and audience.
- Catharsis and viewer satisfaction scores are deterministic, derived from content length
  and cycle index, clamped to 0-100.
- Recommendations reference the cycle types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured emotional rhythm blueprint that helps marketers design
  ads with deliberate tension-release pacing for maximum engagement.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Catharsis and viewer satisfaction scores give marketers quantifiable metrics
  to compare cycle effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced emotional context that
  the LLM would catch (e.g., cultural resonance, audience-specific emotional triggers).
- **Negative:** Cycle scores in dry-run mode are deterministic approximations, not based on
  real emotional analysis.

## Research Sources

Tension-release cycle design methodology drawn from narrative pacing theory, emotional
engagement research, and advertising effectiveness frameworks. The architecture follows the
patterns established in ADR-098 (Creative Quality Scorer) for self-contained library design
with dry-run fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
