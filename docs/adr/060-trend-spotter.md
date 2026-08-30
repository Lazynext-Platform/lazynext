# ADR-060: Trend Spotter

**Date:** 2026-09-26
**Status:** Accepted

## Context

LazyNext users building creatives for a niche need to know what is trending right now — which
topics, hashtags, and content styles are gaining momentum on a given platform — so they can ride
the wave before it crests. Today this research is manual: marketers scroll TikTok, Instagram,
YouTube, and Facebook looking for trends, guess at momentum, and often arrive too late as a trend
declines. A trend that is rising on TikTok (sounds, challenges, transitions) may move fast (days),
while a YouTube trend (search-driven topics, format shifts) may last weeks. Missing the window
means lost reach and wasted spend on content that already feels stale.

A "Trend Spotter" that uses AI to identify trending topics and hashtags for a niche and platform —
with topic, hashtag, momentum (rising/stable/declining), volume, platform, a suggested angle for
a brand in that niche, and time-to-act — would let users act on trends while they are still
actionable.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a
self-contained analysis library with a dry-run fallback, and the Competitor Watch (ADR-046),
which demonstrated self-contained helpers and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/trend-spotter.ts`

A self-contained trend spotter engine that:
- Takes a niche, a platform, and an optional region.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to identify 5-8 trending topics and
  hashtags with momentum, volume, platform, a suggested angle, and time-to-act.
- Returns a list of `Trend` plus the niche, platform, and a summary paragraph.
- Has a dry-run fallback when Atlas is unavailable (uses templated trends derived from the niche
  and platform — routines, transformations, myths, budget, collabs — with rising/stable/declining
  momentum).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`TREND_SPOTTER_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts`: self-contained types,
`extractJson`/`asStr` helpers, `isDryRun()` detection, `validateTrendSpotterInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/trend-spotter/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-format-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/trend-spotter/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-format-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for niche input, platform selector, and optional region.
- Displays results: a summary card, then ranked trend cards with topic, hashtag, momentum badge,
  volume, platform, time-to-act, and suggested angle; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (badges wrap, grid collapses).

### 4. Translations

The page uses the `trendSpotter` namespace via `useI18n`. Because the `t` function falls back to
the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, niche, platform, region, spot, spotting, summary, suggestedAngle, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/trend-spotter.test.ts`

Follows the pattern of `test/ad-format-optimizer.test.ts`. Tests cover:
- Credit cost (`TREND_SPOTTER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, MAX_NICHE_LENGTH).
- Input validation (non-object input, missing niche, over-length niche, missing platform,
  invalid platform, invalid region type, invalid dryRun type, valid minimal input).
- Dry-run mode (returns trends with correct structure, non-empty summary, echoes niche and
  platform, sorts by momentum rising-first, includes at least one rising trend, trends use the
  requested platform, rejects invalid input/invalid-platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic templated trends derived from the niche and platform:
- Rising: "{niche} routines" and "{niche} before and after" (3-5 days / 1 week).
- Stable: "{niche} myths debunked" and "{niche} on a budget" (2 weeks).
- Declining: "{niche} creator collabs" (1 month).

Hashtags are derived from the niche slug. This ensures the feature works in local development and
degrades gracefully on LLM failure.

## Consequences

- **Positive:** Lets users act on trends while they are still actionable, with a clear time-to-act
  window per trend.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Momentum badges (rising/stable/declining) let users prioritize at a glance.
- **Negative:** The heuristic fallback is generic and does not reflect real-time trend data that
  the LLM (with web access) would surface.
- **Negative:** 5 credits per spot may add up for users who check trends frequently; however, the
  cost is moderate relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Trend lifecycle patterns drawn from industry research (TikTok for Business trend frameworks,
Meta trend reports, YouTube Culture & Trends) and adapted to LazyNext's multi-platform
e-commerce ad context. The architecture follows the patterns established in ADR-055 (Ad Format
Optimizer) for self-contained library design with dry-run fallback and ADR-046 (Competitor Watch)
for deterministic heuristic output.
