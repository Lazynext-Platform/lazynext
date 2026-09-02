# ADR-065: Ad Timing Optimizer

**Date:** 2026-09-27
**Status:** Accepted

## Context

LazyNext users run ads across TikTok, Instagram, YouTube, and Facebook, but many launch campaigns
without considering when their audience is actually active on each platform. A TikTok campaign
targeting Gen Z college students will underperform if the ads run at 9 AM on a Tuesday (when they're
in class) instead of 7 PM on a Friday (when evening scroll peaks). Each platform has distinct usage
patterns — TikTok peaks in evenings and weekends, Instagram peaks in mornings and evenings, YouTube
peaks in evenings and weekends, Facebook peaks in mornings and early afternoons — and these patterns
shift further based on audience demographics and timezone.

An "Ad Timing Optimizer" that uses AI to find optimal ad slots — with dayOfWeek, timeRange,
confidenceScore (0-100), expectedReach, reason, and audienceActivity (low/medium/high) — would let
users schedule ads when their audience is most likely to engage, maximizing reach without increasing
spend.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a self-contained
analysis library with a dry-run fallback, and the Smart Calendar (ADR-045), which demonstrated
time-based scheduling recommendations.

## Decision

### 1. New library `src/lib/creative/ad-timing-optimizer.ts`

A self-contained ad timing optimizer engine that:
- Takes a platform, an audience description, an optional timezone (default UTC), and an optional
  product category.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to find 5-8 optimal ad slots with
  dayOfWeek, timeRange, confidenceScore (0-100), expectedReach, reason, and audienceActivity
  (low/medium/high), plus a summary.
- Returns a list of `OptimalSlot` plus the resolved timezone and a summary string.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic platform usage patterns —
  e.g., TikTok evening peaks, Instagram morning peaks, YouTube weekend peaks, Facebook midday
  peaks).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_TIMING_OPTIMIZER_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdTimingOptimizerInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-timing-optimizer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-format-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-timing-optimizer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-format-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for platform selector, audience description input, optional timezone input, and
  optional product category input.
- Displays results: a summary card with the resolved timezone; slot cards with dayOfWeek,
  timeRange, confidenceScore, expectedReach, reason, and audienceActivity badge; and a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (badges wrap, grid collapses).

### 4. Translations

The page uses the `adTimingOptimizer` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, platform, audienceDescription, timezone, productCategory, optimize, optimizing,
summary, expectedReach, audienceActivity, confidenceScore, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-timing-optimizer.test.ts`

Follows the pattern of `test/ad-format-optimizer.test.ts`. Tests cover:
- Credit cost (`AD_TIMING_OPTIMIZER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, MAX_AUDIENCE_LENGTH, MAX_TIMEZONE_LENGTH, MAX_CATEGORY_LENGTH,
  DEFAULT_TIMEZONE).
- Input validation (non-object input, missing platform, invalid platform, missing
  audienceDescription, over-length audienceDescription, invalid timezone type, over-length
  timezone, invalid productCategory type, over-length productCategory, invalid dryRun type,
  valid minimal input).
- Dry-run mode (returns slots with correct structure, non-empty summary, defaults timezone to UTC,
  respects provided timezone, rejects invalid input/invalid-platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic slots based on platform usage patterns:
- TikTok: evening peaks (18:00-21:00) and lunch breaks (12:00-14:00); Friday night and Sunday
  evening strongest.
- Instagram: morning peaks (07:00-09:00) and evening peaks (18:00-21:00); Tuesday and Thursday
  strongest.
- YouTube: evening peaks (17:00-22:00) and weekend afternoons; Friday and Saturday strongest.
- Facebook: morning peaks (08:00-11:00) and early afternoon peaks (13:00-15:00); Wednesday
  strongest.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Lets users schedule ads when their audience is most likely to engage, maximizing
  reach without increasing spend.
- **Positive:** The timezone awareness ensures slots are relative to the audience's local time,
  not the advertiser's.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for audience-specific or
  category-specific nuances that the LLM would catch (e.g., a B2B audience may have different
  active hours than a Gen Z consumer audience).
- **Negative:** 3 credits per optimization may add up for users who iterate frequently; however,
  the cost is low relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Platform usage timing patterns drawn from industry research (TikTok for Business engagement
patterns, Instagram posting time studies, YouTube watch-time analytics, Facebook ad scheduling
best practices) and adapted to LazyNext's multi-platform e-commerce ad context. The architecture
follows the patterns established in ADR-055 (Ad Format Optimizer) for self-contained library
design with dry-run fallback and ADR-045 (Smart Calendar) for time-based scheduling
recommendations.
