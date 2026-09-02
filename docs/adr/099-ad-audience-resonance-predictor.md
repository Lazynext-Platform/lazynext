# ADR-099: Ad Audience Resonance Predictor

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users create ad content targeting specific audience segments (e.g., Gen Z, busy parents,
fitness enthusiasts) but lack a systematic way to predict how well that content will resonate with
each segment before publishing. Generic creative review does not account for segment-specific
emotional triggers, cultural fit, or language preferences. Marketers need a tool that predicts
per-segment resonance scores, identifies the emotional triggers present in the content and which
segments they resonate with most, surfaces the factors driving (or limiting) resonance, summarizes
overall audience fit, and recommends improvements to lift resonance with weaker segments.

An "Ad Audience Resonance Predictor" that uses AI to predict audience resonance — producing
per-segment scores (0-100) with fit ratings and notes, emotional triggers with effectiveness and
target segments, resonance factors with impact and descriptions, an audience fit summary, and
recommendations — would give users a segment-aware resonance assessment before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-audience-resonance-predictor.ts`

A self-contained ad audience resonance predictor engine that:
- Takes content, a product or brand, audience segments (comma-, newline-, or
  semicolon-separated), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce per-segment resonance scores,
  emotional triggers, resonance factors, an audience fit analysis, and recommendations.
- Returns an `AudienceResonanceResult` with an `AudienceResonance` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic resonance scores
  based on content length, segments, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdAudienceResonancePredictorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-audience-resonance-predictor/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-audience-resonance-predictor/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content, product/brand, audience segments, and an optional platform selector.
- Displays results: segment scores with progress bars and fit badges, emotional triggers with
  effectiveness bars and segment tags, resonance factors with impact bars and descriptions, an
  audience fit summary, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale, tags wrap).
- RTL support via standard flex-wrap and `dir`-agnostic layout.

### 4. Translations

The page uses the `adAudienceResonancePredictor` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, audienceSegments, platform, generate, generating,
segmentScores, emotionalTriggers, resonanceFactors, audienceFit, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-audience-resonance-predictor.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST` is 4).
- Constants (`VALID_PLATFORMS`, `MAX_CONTENT_LENGTH`, `MAX_PRODUCT_LENGTH`,
  `MAX_AUDIENCE_LENGTH`).
- Input validation (missing content, missing productOrBrand, missing audienceSegments, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted,
  newline/semicolon-separated segments accepted, whitespace-only segments rejected).
- Dry-run mode (returns resonance with correct structure for segmentScores/emotionalTriggers/
  resonanceFactors, one segmentScore per input segment, audienceFit non-empty, recommendations
  non-empty, works for all four platforms and without a platform, handles single segment,
  newline- and semicolon-separated segments, deterministic scores, six standard resonance factors
  present, audienceFit mentions strongest and weakest segments, rejects invalid input/
  productOrBrand/audienceSegments).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic resonance scoring based on content length, segments, and platform:
- One segment score is generated per parsed segment, with a deterministic score derived from
  content length and segment index.
- Three emotional triggers (aspiration, urgency, social_proof) are generated with deterministic
  effectiveness scores.
- Six resonance factors (relevance, emotional_connection, language_tone, value_proposition,
  cultural_fit, platform_alignment) are scored with deterministic impact values.
- Audience fit summarizes the strongest and weakest segments.
- Recommendations target the weakest segment and lowest-impact factor.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a segment-aware resonance prediction that catches weak segment fit and
  missed emotional triggers before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Per-segment scores with fit ratings and notes give marketers concrete, segment-
  specific guidance rather than generic advice.
- **Negative:** The heuristic fallback does not account for nuanced audience resonance factors
  that the LLM would catch (e.g., cultural context, segment-specific language nuances).
- **Negative:** Segment scores in dry-run mode are deterministic approximations, not based on
  real audience analysis.

## Research Sources

Audience resonance prediction methodology drawn from advertising effectiveness research and
audience segmentation frameworks. The architecture follows the patterns established in ADR-098
(Creative Quality Scorer) for self-contained library design with dry-run fallback and ADR-073
(Ad Hashtag Generator) for plan-tier-aware model selection.
