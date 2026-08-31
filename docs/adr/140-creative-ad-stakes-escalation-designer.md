# ADR-140: Creative Ad Stakes Escalation Designer

**Date:** 2026-10-18
**Status:** Accepted

## Context

LazyNext users design ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to design escalating stakes throughout their narrative — the
building tension and consequence that keeps viewers hooked as the story progresses. A creative that
holds steady stakes throughout loses viewers; one that escalates stakes incrementally — from
baseline setup through rising tension, complication, peak stakes, consequence reveal, and
transformation — drives retention, emotional investment, and conversion. Most ad creative treats
stakes as a static element rather than a designed escalation curve. Marketers need a tool that
designs stakes levels across escalation stages, each with a stakes description, consequence,
tension level, emotional weight, viewer investment, and timing, then recommends improvements.

A "Creative Ad Stakes Escalation Designer" that uses AI to design escalating stakes throughout ad
creative content — producing stakes levels across six escalation stages (initial_setup,
rising_tension, complication, peak_stakes, consequence_reveal, transformation), each with a
description, consequence, tension level (0-100), emotional weight (0-100), viewer investment
(0-100), and timing, plus actionable recommendations — would give users a structured way to bake
escalating tension and consequence into their creative before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative Viewer
Reward Designer (ADR-138), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-stakes-escalation-designer.ts`

A self-contained stakes escalation designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce stakes levels across
  escalation stages and recommendations.
- Returns a `StakesEscalationDesignerResult` with an `EscalationStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic stakes escalation
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_STAKES_ESCALATION_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-viewer-reward-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`/
`asStrArr` helpers, `isDryRun()` detection, `validateCreativeAdStakesEscalationDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-stakes-escalation-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-viewer-reward-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/escalation stages (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-stakes-escalation-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-viewer-reward-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand, content, target audience, and an optional platform selector
  (tiktok, instagram, youtube, facebook, or any).
- Displays results: stakes level cards with stage badges, description, consequence, tension level
  bars, emotional weight bars, viewer investment bars, timing, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdStakesEscalationDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, stakes, description, consequence, tensionLevel, emotionalWeight, viewerInvestment,
timing, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-ad-stakes-escalation-designer.test.ts`

Follows the pattern of `test/ad-creative-viewer-reward-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_STAKES_ESCALATION_DESIGNER_CREDIT_COST` is 5).
- Constants (`VALID_PLATFORMS` length 4, `VALID_ESCALATION_STAGES` length 6, max length constants).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, non-string platform, invalid dryRun type, valid minimal input,
  undefined/empty platform accepted, dryRun true accepted, multiple errors collected).
- Dry-run mode (returns strategy with correct structure for stakes, stages drawn from
  VALID_ESCALATION_STAGES, all six escalation stages present, recommendations present, works for
  all four platforms and without a platform, deterministic output for the same input, tension
  levels peak at the peak_stakes stage, emotional weight and viewer investment in 0-100 range,
  rejects invalid input/productOrBrand/targetAudience).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic stakes escalation based on content length, product, audience, and
platform:
- Six stakes levels are generated, one for each escalation stage (initial_setup, rising_tension,
  complication, peak_stakes, consequence_reveal, transformation).
- Each stakes level has a description, consequence, tension level (0-100), emotional weight
  (0-100), viewer investment (0-100), and timing.
- Tension, emotional weight, and viewer investment escalate across stages, peaking at the
  peak_stakes stage, then easing for the consequence_reveal and transformation stages.
- Five recommendations are generated referencing the brand, platform, and audience.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to bake escalating tension and consequence into ad
  creative, driving retention, emotional investment, and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Stakes levels with tension, emotional weight, and viewer investment metrics give
  marketers concrete, placement-aware guidance rather than generic advice.
- **Negative:** The heuristic fallback does not account for nuanced creative context that the LLM
  would catch (e.g., audience-specific stake resonance, cultural references).
- **Negative:** Tension, emotional weight, and viewer investment scores in dry-run mode are
  deterministic approximations derived from content length, not based on real creative analysis.

## Research Sources

Stakes escalation design methodology drawn from narrative tension frameworks and advertising
engagement research. The architecture follows the patterns established in ADR-098 (Creative
Quality Scorer) for self-contained library design with dry-run fallback and ADR-138 (Ad Creative
Viewer Reward Designer) for plan-tier-aware model selection.
