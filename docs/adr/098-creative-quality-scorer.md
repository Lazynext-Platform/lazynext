# ADR-098: Creative Quality Scorer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users create ad content across multiple formats (video scripts, image ads, carousels,
stories, text ads) but lack a systematic way to evaluate creative quality before publishing.
Subjective review is inconsistent — a creative may look good but have a weak hook, unclear
messaging, or an ineffective CTA. Marketers need a tool that scores creative content across
multiple quality dimensions (hook strength, clarity, emotional resonance, brand alignment, CTA
effectiveness, platform fit, originality), identifies issues with severity and fixes, highlights
strengths, and provides actionable improvement suggestions.

A "Creative Quality Scorer" that uses AI to score creative content across multiple dimensions —
producing an overall score (0-100), grade (F-A+), per-dimension scores with status and notes,
issues with severity and fixes, strengths, improvement suggestions, a quality breakdown map, and
recommendations — would give users a comprehensive quality assessment before they publish.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-quality-scorer.ts`

A self-contained creative quality scorer engine that:
- Takes content, a product or brand, an optional content type (video-script, image-ad, carousel,
  story, text-ad — default text-ad), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce an overall score (0-100),
  grade (F-A+), dimension breakdowns, issues, strengths, improvement suggestions, a quality
  breakdown map, and recommendations.
- Returns a `QualityScorerResult` with a `QualityScoring` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic scoring based
  on content length, content type, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`CREATIVE_QUALITY_SCORER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeQualityScorerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-quality-scorer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/content types/grades/
  severities (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-quality-scorer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content, product/brand, content type selector, and an optional platform
  selector.
- Displays results: overall score with grade badge, dimension bars with scores and notes, issue
  cards with severity and fixes, strengths and improvement suggestions in a two-column grid, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `creativeQualityScorer` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, content, productOrBrand, contentType, platform, generate,
generating, overallScore, grade, dimensions, issues, fix, strengths, improvementSuggestions,
recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-quality-scorer.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_QUALITY_SCORER_CREDIT_COST` is 3).
- Input validation (missing content, missing productOrBrand, over-length fields, invalid
  contentType, invalid platform, invalid dryRun type, valid minimal input, empty platform/
  contentType accepted).
- Dry-run mode (returns scoring with correct structure for dimensions/issues, overallScore in
  0-100 range, valid grade, strengths/improvementSuggestions/qualityBreakdown/recommendations
  present, works for all four platforms and all content types, rejects invalid
  input/productOrBrand).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic quality scoring based on content length, content type, and platform:
- Seven quality dimensions are scored (hook_strength, clarity, emotional_resonance,
  brand_alignment, cta_effectiveness, platform_fit, originality).
- Scores are deterministic, derived from content length and dimension index.
- Overall score is the average of dimension scores.
- Grade is derived from the overall score (A+ 95+, A 85-94, B 75-84, C 60-74, D 40-59, F 0-39).
- Issues are generated for dimensions scoring below 60, with severity based on score.
- Strengths are generated for dimensions scoring 70+.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic, multi-dimensional quality assessment that catches weak
  hooks, unclear messaging, and ineffective CTAs before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Issues with severity and fixes give marketers concrete, actionable guidance
  rather than generic advice.
- **Negative:** The heuristic fallback does not account for nuanced creative quality factors
  that the LLM would catch (e.g., cultural context, audience-specific resonance).
- **Negative:** Dimension scores in dry-run mode are deterministic approximations, not based on
  real creative analysis.

## Research Sources

Creative quality assessment methodology drawn from advertising effectiveness research and
creative evaluation frameworks. The architecture follows the patterns established in ADR-073
(Ad Hashtag Generator) for self-contained library design with dry-run fallback and ADR-071 (Ad
Thumbnail Generator) for plan-tier-aware model selection.
