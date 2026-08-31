# ADR-091: Ad Sentiment Tuner

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users create ad content across TikTok, Instagram, YouTube, and Facebook and need to match
the sentiment of their copy to their brand voice and target audience. A single piece of ad copy
rarely works across all sentiments — a playful hook may underperform for an authoritative brand, and
an urgent CTA may feel out of place for an empathetic message. Marketers need a way to tune the
sentiment of existing ad content, see before/after sentiment scores, understand which words were
changed and why, and get recommendations for maintaining the desired tone.

An "Ad Sentiment Tuner" that uses AI to adjust the sentiment of ad content — returning
sentiment-adjusted copy with before/after sentiment scores, tone adjustments, specific word changes
with reasons, audience alignment scores, and actionable recommendations — would give users a
data-driven way to align their ad copy with their brand voice before publishing.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-sentiment-tuner.ts`

A self-contained ad sentiment tuner engine that:
- Takes ad content, a product or brand, a target sentiment (positive, neutral, urgent, playful,
  authoritative, empathetic), an optional platform, and a dry-run flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to tune the sentiment of the content,
  returning tuned content, before/after sentiment scores (-100 to 100), sentiment shift, tone
  adjustments, word changes with reasons, audience alignment (1-10), and recommendations.
- Returns a `SentimentTunerResult` with a `SentimentTuning` object.
- Has a dry-run fallback when Atlas is unavailable (uses sentiment-specific profiles with
  deterministic tuned content, word changes, and recommendations for each of the six target
  sentiments).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_SENTIMENT_TUNER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdSentimentTunerInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-sentiment-tuner/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/sentiments (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-sentiment-tuner/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content input, product/brand input, target sentiment selector (6 options), and an
  optional platform selector.
- Displays results: tuned content, before/after sentiment scores with shift indicator, audience
  alignment bar, tone adjustments list, word changes with original→replacement and reason,
  recommendations list, and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, pills wrap, rows wrap).

### 4. Translations

The page uses the `adSentimentTuner` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, targetSentiment, platform, tune, tuning, tunedContent,
beforeSentiment, afterSentiment, audienceAlignment, toneAdjustments, wordChanges, recommendations,
copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-sentiment-tuner.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_SENTIMENT_TUNER_CREDIT_COST` is 3).
- Input validation (missing content, missing productOrBrand, missing/invalid targetSentiment,
  over-length content/productOrBrand, invalid platform, invalid dryRun type, valid minimal input).
- Dry-run mode (returns tuning with correct structure, wordChanges structure, works for all six
  target sentiments, works with optional platform, rejects invalid input/targetSentiment/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic sentiment tuning based on sentiment-specific profiles:
- positive: shifts from problem-focused to solution-focused language with optimistic framing.
- neutral: removes emotional language in favor of factual, objective statements.
- urgent: adds time-sensitive language, scarcity cues, and high-intensity verbs.
- playful: injects humor, casual phrasing, and conversational tone.
- authoritative: strengthens claims with expert-level confidence and authority signals.
- empathetic: adds empathetic acknowledgments and supportive, human-centric phrasing.

Each dry-run profile includes tuned content, before/after sentiment scores, tone adjustments,
word changes with reasons, audience alignment, and recommendations.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in sentiment alignment by grounding tuning in content, brand,
  and target sentiment — giving users ready-to-use tuned copy with measurable sentiment shifts.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Word-level change tracking gives users transparency into what was adjusted and why.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific voice
  nuances that the LLM would catch.
- **Negative:** Sentiment scores in dry-run mode are static approximations, not real NLP analysis.

## Research Sources

Sentiment analysis and tone tuning best practices drawn from marketing psychology research and
ad copywriting literature. The architecture follows the patterns established in ADR-073 (Ad
Hashtag Generator) for self-contained library design with dry-run fallback and ADR-067 (Ad CTA
Optimizer) for plan-tier-aware model selection.
