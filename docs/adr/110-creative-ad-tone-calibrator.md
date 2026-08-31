# ADR-110: Creative Ad Tone Calibrator

**Date:** 2026-10-13
**Status:** Accepted

## Context

LazyNext users write ad creative content across many tones — professional, casual, playful,
authoritative, empathetic, urgent, inspirational, humorous — but have no systematic way to
measure how well their current content matches a desired tone. Subjective judgment is
inconsistent: copy that reads as "professional" to one writer may feel "authoritative" or "cold"
to another. Marketers need a tool that analyzes the current tone of their ad content across
multiple tone dimensions (formality, energy, warmth, assertiveness, playfulness, urgency),
computes a tone alignment score (0-100), identifies the gaps between current and desired tone,
and produces concrete adjustments, word replacements, calibrated content, and recommendations
for achieving the desired tone.

A "Creative Ad Tone Calibrator" that uses AI to calibrate the tone of ad creative content —
producing a current tone analysis across six dimensions, a tone alignment score (0-100), tone
adjustments with impact, word replacements with reasons, calibrated (rewritten) content, and
actionable recommendations — would give users a concrete path from their current copy to
on-tone, brand-aligned creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-tone-calibrator.ts`

A self-contained creative ad tone calibrator engine that:
- Takes content, a product or brand, a desired tone (professional, casual, playful,
  authoritative, empathetic, urgent, inspirational, humorous), and an optional platform
  (tiktok, instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a current tone analysis
  across six tone dimensions, a tone alignment score (0-100), tone adjustments, word
  replacements, calibrated content, and recommendations.
- Returns a `ToneCalibratorResult` with a `ToneCalibration` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic calibration
  based on content length, desired tone, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdToneCalibratorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-tone-calibrator/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/tones (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-tone-calibrator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content, product/brand, a desired tone selector (8 options), and an optional
  platform selector.
- Displays results: alignment score gauge, current tone dimensions with gap bars (current →
  desired), tone adjustments with impact, word replacements table (original/replacement/reason),
  calibrated content box, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, table scrolls horizontally, bars scale).
- RTL support via standard Tailwind utilities (no hardcoded left/right margins).

### 4. Translations

The page uses the `creativeAdToneCalibrator` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, content, productOrBrand, desiredTone, platform, calibrate,
calibrating, alignmentScore, desiredToneLabel, currentTone, toneAdjustments, current, suggested,
wordReplacements, original, replacement, reason, calibratedContent, recommendations, copy,
copied, dryRunNotice, error.

### 5. Unit tests `test/creative-ad-tone-calibrator.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_TONES has 8 tones, MAX_CONTENT_LENGTH and
  MAX_PRODUCT_LENGTH are 2000).
- Input validation (missing content, missing productOrBrand, over-length fields, missing
  desiredTone, invalid desiredTone, invalid platform, invalid dryRun type, valid minimal input,
  empty/undefined platform accepted).
- Dry-run mode (returns calibration with correct structure for currentTone/alignmentScore/
  desiredTone/toneAdjustments/wordReplacements/calibratedContent/recommendations, alignmentScore
  in 0-100 range, works for all four platforms and all eight tones, deterministic output,
  calibratedContent applies word replacements, rejects invalid input/productOrBrand/desiredTone/
  platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic tone calibration based on content length, desired tone, and platform:
- Six tone dimensions are scored (formality, energy, warmth, assertiveness, playfulness,
  urgency), each with a currentScore (0-100), desiredScore (0-100), and gap.
- Desired scores vary by tone attribute (e.g., professional → high formality, low playfulness;
  playful → low formality, high playfulness).
- Alignment score is the average closeness (100 - |gap|) across dimensions.
- Tone adjustments are generated for dimensions with |gap| >= 15, with impact equal to |gap|.
- Word replacements are generated for common transactional/superlative words ("buy", "amazing"),
  with replacements shaped by the desired tone.
- Calibrated content applies the word replacements to the original content.
- Recommendations reference the number of dimensions to adjust, word replacements to apply, and
  the platform/brand context.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic, multi-dimensional tone calibration that closes the gap
  between current copy and a desired tone before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Word replacements and calibrated content give marketers a concrete starting
  point rather than abstract advice.
- **Negative:** The heuristic fallback does not account for nuanced tone factors that the LLM
  would catch (e.g., cultural context, audience-specific tone expectations, sarcasm).
- **Negative:** Dimension scores in dry-run mode are deterministic approximations, not based on
  real linguistic tone analysis.

## Research Sources

Tone calibration methodology drawn from brand voice and tone research, advertising tone
frameworks, and content style guide conventions. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run
fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
