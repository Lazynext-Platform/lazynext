# ADR-083: Ad Emotion Analyzer

**Date:** 2026-10-07
**Status:** Accepted

## Context

LazyNext users create ad content across TikTok, Instagram, YouTube, and Facebook, but emotional
impact is one of the hardest dimensions to assess objectively. An ad may look polished but fail to
evoke the emotions that drive action — curiosity, excitement, trust, urgency, empathy. Without a
systematic emotional analysis step, users risk publishing ads that are emotionally flat, inauthentic,
or misaligned with their audience. Marketers need a way to measure the emotional pull of their ad
content, understand the emotional journey, and get actionable recommendations to strengthen it.

An "Ad Emotion Analyzer" that uses AI to analyze the emotional impact of ad content — producing an
overall emotional impact score (0-100), dominant emotions, per-emotion scores, an emotional journey
narrative, audience resonance (1-10), authenticity (1-10), and recommendations — would give users
a data-driven emotional assessment before publishing.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Creative Concept Validator
(ADR-082), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-emotion-analyzer.ts`

A self-contained ad emotion analyzer engine that:
- Takes ad content (max 2000 chars), a product or brand (max 2000 chars), and an optional platform
  (tiktok, instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to analyze the emotional impact and
  produce a report with an overall emotional impact score (0-100), dominant emotions, emotion
  scores (0-100 per emotion), emotional journey narrative, audience resonance (1-10), authenticity
  (1-10), and recommendations.
- Returns an `EmotionAnalysis` object wrapped in an `EmotionAnalyzerResult`.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic scoring based on content
  characteristics — questions, exclamations, CTAs, stories, urgency, positive/negative sentiment,
  platform alignment).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_EMOTION_ANALYZER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `creative-concept-validator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asStrArray`/`asRecordNum` helpers,
`isDryRun()` detection, `validateAdEmotionAnalyzerInput()` validation, deterministic dry-run
output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-emotion-analyzer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError` for
  error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-emotion-analyzer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-concept-validator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for ad content input, product/brand input, and an optional platform selector.
- Displays results: an overall emotional impact bar, dominant emotion pills, emotional journey
  narrative, per-emotion score bars, audience resonance and authenticity score bars,
  recommendations list; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (score bars are full-width, pills wrap, cards stack).

### 4. Translations

The page uses the `adEmotionAnalyzer` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, adContent, productOrBrand, platform, analyze, analyzing, dominantEmotions,
emotionalJourney, emotionScores, audienceResonance, authenticity, recommendations, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/ad-emotion-analyzer.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_EMOTION_ANALYZER_CREDIT_COST` is 3).
- Input validation (missing adContent, missing productOrBrand, over-length
  adContent/productOrBrand, invalid platform, invalid dryRun type, valid minimal input).
- Dry-run mode (returns analysis with correct structure, emotion scores are 0-100, works for all
  four platforms, works without platform, rejects invalid input/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic emotion analysis based on content characteristics:
- Questions boost curiosity.
- Exclamations and positive words boost excitement.
- Stories boost trust and empathy.
- Urgency words boost urgency.
- Negative words add fear and boost empathy.
- Platform-specific adjustments (TikTok favors excitement + empathy; Instagram favors aspiration;
  YouTube favors curiosity + trust; Facebook favors empathy + trust).

The dry-run analysis includes an overall emotional impact score, dominant emotions, per-emotion
scores, emotional journey, audience resonance, authenticity, and recommendations. Scores are
dynamically computed from the ad content text.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in emotional assessment by providing a data-driven, multi-
  dimensional emotional analysis before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Per-emotion scores and the emotional journey narrative help users understand not
  just *how much* emotion their ad evokes, but *which* emotions and *how they flow*.
- **Negative:** The heuristic fallback is generic and does not account for nuanced audience
  psychology or cultural context that the LLM would catch.
- **Negative:** Emotion scores in dry-run mode are based on simple text heuristics, not deep
  semantic emotional analysis.

## Research Sources

Emotional marketing best practices drawn from industry research (Meta Business, TikTok for Business,
YouTube Creator Academy) and advertising psychology literature. The architecture follows the
patterns established in ADR-073 (Ad Hashtag Generator) for self-contained library design with
dry-run fallback and ADR-082 (Creative Concept Validator) for multi-dimensional scoring.
