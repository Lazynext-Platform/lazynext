# ADR-093: Ad Creative Rotator

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users run paid ad campaigns across TikTok, Instagram, YouTube, and Facebook and need to
rotate creative variations to combat ad fatigue. Showing the same creative to the same audience
leads to declining CTR and rising CPC over time. Marketers need a systematic way to generate
variations of their base ad content — with different hooks, angles, tones, formats, visuals, and
CTAs — along with fatigue resistance scores, a rotation schedule, and diversification analysis to
plan their creative rotation strategy.

An "Ad Creative Rotator" that uses AI to generate creative variations — each with a variation type,
fatigue resistance score (0-100), best-for-audience segment, and estimated lifespan in days — along
with a week-by-week rotation schedule, fatigue analysis, diversification score, and
recommendations — would give users a data-driven rotation plan before fatigue sets in.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-rotator.ts`

A self-contained ad creative rotator engine that:
- Takes base content, a product or brand, an optional variation count (3-10, default 5), an
  optional platform, and a dry-run flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate creative variations with
  different variation types (hook, angle, tone, format, visual, cta), each with a fatigue
  resistance score (0-100), best-for-audience, and estimated lifespan in days.
- Returns a `CreativeRotatorResult` with a `CreativeRotation` containing variations, rotation
  schedule, fatigue analysis, diversification score, and recommendations.
- Has a dry-run fallback when Atlas is unavailable (uses variation type templates with
  deterministic fatigue resistance scores and rotation schedules).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_ROTATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeRotatorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-creative-rotator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/variation types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-rotator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for base content input, product/brand input, variation count selector (3-10), and an
  optional platform selector.
- Displays results: diversification score bar, fatigue analysis, variation cards with type badge
  and fatigue resistance score, rotation schedule with week-by-week plan, recommendations list,
  and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, badges wrap, cards stack).

### 4. Translations

The page uses the `adCreativeRotator` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, baseContent, productOrBrand, variationCount, platform, rotate, rotating,
diversificationScore, fatigueAnalysis, bestForAudience, estimatedLifespan, rotationSchedule,
week, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-creative-rotator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_ROTATOR_CREDIT_COST` is 4).
- Input validation (missing baseContent, missing productOrBrand, over-length
  baseContent/productOrBrand, variationCount out of range, invalid variationCount type, invalid
  platform, invalid dryRun type, valid minimal input).
- Dry-run mode (returns variations with correct structure, requested count honored, defaults to 5,
  returns rotationSchedule/fatigueAnalysis/diversificationScore/recommendations, works with
  optional platform, rejects invalid input/variationCount/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic variation generation based on variation type templates:
- hook: pattern interrupts and attention-grabbers.
- angle: different marketing angles and value propositions.
- tone: different tones and sentiments.
- format: different content formats (listicle, story, testimonial).
- visual: visual and design change suggestions.
- cta: different call-to-action variations.

Each dry-run variation includes an id, content, variation type, fatigue resistance score (65-99),
best-for-audience, and estimated lifespan in days. The rotation schedule distributes variations
across weeks with strategic rotation guidance.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic creative rotation plan to combat ad fatigue, reducing
  guesswork in variation generation and scheduling.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Fatigue resistance scores and estimated lifespans help users plan rotation
  timing proactively.
- **Negative:** The heuristic fallback is generic and does not account for campaign-specific
  performance data that the LLM would catch.
- **Negative:** Fatigue resistance scores in dry-run mode are static approximations, not based on
  real performance data.

## Research Sources

Ad fatigue and creative rotation best practices drawn from digital advertising research (Meta
Business, Google Ads, TikTok for Business) and campaign management literature. The architecture
follows the patterns established in ADR-073 (Ad Hashtag Generator) for self-contained library
design with dry-run fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model selection.
