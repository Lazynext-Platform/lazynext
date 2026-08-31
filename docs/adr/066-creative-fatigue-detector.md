# ADR-066: Creative Fatigue Detector

**Date:** 2026-09-27
**Status:** Accepted

## Context

LazyNext users run ads for days or weeks, but creatives fatigue over time — CTR declines, audiences
grow saturated, and the same hook stops stopping the scroll. Most users don't refresh creatives
proactively because they lack a clear signal of when fatigue has set in. By the time CTR has
collapsed, spend has already been wasted on a fatigued creative. Different platforms fatigue at
different rates (TikTok creatives fatigue fastest, YouTube slowest), and the signals vary: CTR
decline, days running, impression saturation, and frequency all contribute.

A "Creative Fatigue Detector" that uses AI to detect fatigue from performance metrics — with
fatigueScore (0-100), fatigueLevel (none/mild/moderate/severe/critical), recommendation
(refresh/monitor/keep), factors, suggestedActions, and estimatedRefreshUrgency
(immediate/within-week/within-month/no-rush) — would let users refresh creatives proactively
before spend is wasted, maximizing the productive life of each creative.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a self-contained
analysis library with a dry-run fallback, and the Brand Guardrails (ADR-044), which demonstrated
scored factor analysis with recommendations.

## Decision

### 1. New library `src/lib/creative/creative-fatigue-detector.ts`

A self-contained creative fatigue detector engine that:
- Takes a creative description, a platform, days running, current CTR, optional previous CTR, and
  impressions.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to detect creative fatigue and produce
  fatigueScore (0-100), fatigueLevel, recommendation, factors (with name, impact 0-100, detail),
  suggestedActions, and estimatedRefreshUrgency.
- Returns a `CreativeFatigueDetectorResult`.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic fatigue analysis based on CTR
  decline, days running vs. platform-specific thresholds, and impression saturation — e.g., a
  >30% CTR decline is a strong fatigue signal, TikTok creatives fatigue after ~10 days).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_FATIGUE_DETECTOR_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeFatigueDetectorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-fatigue-detector/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-format-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-fatigue-detector/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-format-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for creative description input, platform selector, days running, current CTR,
  optional previous CTR, and impressions inputs.
- Displays results: a fatigue score card with level, recommendation, and urgency badges; a
  factors list with name, impact, and detail; a suggested actions list; and a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (badges wrap, grid collapses).

### 4. Translations

The page uses the `creativeFatigueDetector` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, creativeDescription, platform, daysRunning, currentCTR, previousCTR, impressions,
detect, detecting, fatigueScore, recommendation, estimatedRefreshUrgency, factors,
suggestedActions, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-fatigue-detector.test.ts`

Follows the pattern of `test/ad-format-optimizer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_FATIGUE_DETECTOR_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_FATIGUE_LEVELS, VALID_RECOMMENDATIONS, VALID_URGENCIES,
  MAX_DESCRIPTION_LENGTH).
- Input validation (non-object input, missing creativeDescription, over-length
  creativeDescription, missing platform, invalid platform, invalid daysRunning (zero/negative/
  non-number), currentCTR out of range (negative/over 100/non-number), invalid previousCTR
  (negative/over 100), invalid impressions (zero/negative), invalid dryRun type, valid input
  without previousCTR).
- Dry-run mode (returns result with correct structure, factors with correct structure,
  suggestedActions as string array, high fatigue recommends refresh, low fatigue recommends
  keep/monitor, rejects invalid input/invalid-platform/invalid-daysRunning).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic fatigue analysis based on three weighted factors:
- Days Running (30% weight): platform-specific fatigue thresholds — TikTok ~10 days, Instagram
  ~15 days, YouTube/Facebook ~21 days. Impact scales with the ratio of days running to threshold.
- CTR Decline (40% weight when previous CTR provided): a >30% relative CTR decline is a strong
  signal. Without previous CTR, absolute CTR is used as a weaker proxy.
- Impression Saturation (30% weight): saturation risk increases above 100k impressions.

The fatigue score maps to levels (none <20, mild 20-39, moderate 40-59, severe 60-79, critical
80+), which drive the recommendation (refresh for severe/critical, monitor for moderate/mild,
keep for none) and urgency (immediate for critical, within-week for severe, within-month for
moderate, no-rush for mild/none).

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Lets users refresh creatives proactively before spend is wasted on fatigued
  creative, maximizing the productive life of each creative.
- **Positive:** The factor breakdown shows users exactly which signals are driving fatigue (CTR
  decline vs. days running vs. saturation), enabling targeted refresh decisions.
- **Positive:** The suggestedActions give users concrete next steps rather than just a score.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for creative-specific
  nuances that the LLM would catch (e.g., a particularly strong hook may resist fatigue longer
  than the platform threshold suggests).
- **Negative:** 4 credits per detection may add up for users who monitor many creatives;
  however, the cost is moderate relative to analysis-heavy features (viral-analysis: 6,
  skill-chains: 8).
- **Negative:** The detector relies on user-provided metrics (CTR, impressions); inaccurate or
  stale metrics will produce inaccurate fatigue assessments.

## Research Sources

Creative fatigue patterns drawn from industry research (Meta ad fatigue thresholds, TikTok creative
lifecycle studies, YouTube ad wear-out research) and adapted to LazyNext's multi-platform
e-commerce ad context. The architecture follows the patterns established in ADR-055 (Ad Format
Optimizer) for self-contained library design with dry-run fallback and ADR-044 (Brand Guardrails)
for scored factor analysis with recommendations.
