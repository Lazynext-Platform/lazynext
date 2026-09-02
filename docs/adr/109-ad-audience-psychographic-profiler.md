# ADR-109: Ad Audience Psychographic Profiler

**Date:** 2026-10-12
**Status:** Accepted

## Context

LazyNext users create ad content targeting specific audiences but often lack deep psychographic
insight into who those audiences are beyond basic demographics. Demographic targeting (age,
gender, location) is table stakes; the differentiator is understanding audiences' values,
interests, lifestyle, personality, and attitudes — the psychographic dimensions that drive
purchase decisions. Marketers need a tool that profiles a target audience psychographically,
identifies what motivates them, what content they prefer, how they want to be communicated with,
and what messaging will resonate.

An "Ad Audience Psychographic Profiler" that uses AI to create psychographic profiles of target
audiences — producing psychographic dimensions (values, interests, lifestyle, personality,
attitudes) with traits and intensity scores, motivation drivers with trigger words, content
preferences, communication style, and messaging recommendations — would give users the
psychographic depth needed to craft resonant ad creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-audience-psychographic-profiler.ts`

A self-contained ad audience psychographic profiler engine that:
- Takes a product/brand, a target audience description, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce psychographic dimensions,
  motivation drivers, content preferences, communication style, and messaging recommendations.
- Returns a `ProfilerResult` with a `PsychographicProfile` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic profile data
  based on product, audience description length, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_AUDIENCE_PSYCHOGRAPHIC_PROFILER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdAudiencePsychographicProfilerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-audience-psychographic-profiler/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-audience-psychographic-profiler/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand, target audience, and an optional platform selector.
- Displays results: psychographic dimensions with intensity bars and trait chips, motivation
  drivers with strength bars and trigger word chips, content preferences, communication style,
  messaging recommendations, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adAudiencePsychographicProfiler` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, targetAudience, platform, generate, generating,
dimensions, motivationDrivers, contentPreferences, communicationStyle, messagingRecommendations,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-audience-psychographic-profiler.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_AUDIENCE_PSYCHOGRAPHIC_PROFILER_CREDIT_COST` is 4).
- Constants (`VALID_PLATFORMS`, `MAX_PRODUCT_LENGTH`, `MAX_AUDIENCE_LENGTH`).
- Input validation (missing productOrBrand, missing targetAudience, over-length fields, invalid
  platform, invalid dryRun type, non-string fields, valid minimal input, empty platform
  accepted, all valid platforms accepted, dryRun true/false accepted).
- Dry-run mode (returns profile with correct structure for dimensions/motivationDrivers/
  contentPreferences, five psychographic dimensions present, traits non-empty, triggerWords
  non-empty, communicationStyle non-empty, messagingRecommendations/recommendations present,
  intensity/strength in 0-100 range, deterministic output, works for all four platforms and
  without a platform, rejects invalid input/targetAudience/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic psychographic profiling based on product, audience description
length, and platform:
- Five psychographic dimensions are profiled (values, interests, lifestyle, personality,
  attitudes), each with traits, intensity (0-100), and a description.
- Three motivation drivers are generated (aspiration, social_proof, convenience), each with
  strength (0-100), description, and trigger words.
- Three content preferences are generated (video, social, educational).
- Communication style, messaging recommendations, and recommendations are generated referencing
  the product and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides psychographic depth (values, interests, lifestyle, personality,
  attitudes) that goes beyond demographic targeting, enabling more resonant ad creative.
- **Positive:** Motivation drivers with trigger words give marketers concrete language cues to
  use in ad copy and landing pages.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback does not account for nuanced psychographic factors that
  the LLM would catch (e.g., cultural context, niche audience subcultures).
- **Negative:** Psychographic dimensions in dry-run mode are deterministic approximations, not
  based on real audience research data.

## Research Sources

Psychographic profiling methodology drawn from audience research frameworks and advertising
psychology. The architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-073 (Ad Hashtag
Generator) for plan-tier-aware model selection.
