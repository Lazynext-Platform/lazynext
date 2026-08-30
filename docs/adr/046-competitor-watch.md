# ADR-046: Competitor Watch

**Date:** 2026-09-06
**Status:** Accepted

## Context

LazyNext's e-commerce ad creative platform already included a competitor
intelligence API (`/api/creative/competitor-intel`) that provided high-level
competitive landscape data. However, there was no dedicated tool for
monitoring a specific competitor's ad creative in depth — extracting the
hooks, angles, CTAs, visual style, emotional triggers, and pricing strategy
from a competitor's ad, comparing that against the user's own brand
positioning, and generating actionable alerts when the competitor shifts
strategy or pricing.

Marketers need to react quickly when a competitor launches a new angle,
changes pricing, or deploys a new ad format. Without automated monitoring and
analysis, this requires manual review of competitor ads — slow, inconsistent,
and difficult to compare against the user's brand kit. A dedicated competitor
watch feature would close this gap: paste a competitor URL, get a structured
analysis, competitive gaps, recommended counter-strategies, and alerts.

The patterns were drawn from `viral-analysis.ts` (structured AI analysis with
plan-tier-aware model selection) and `reference-remix.ts` (self-contained
library with dry-run fallback, input validation, and credit-based API route).

## Decision

### 1. New library `src/lib/creative/competitor-watch.ts`

A self-contained competitor ad monitoring library that:
- Takes a competitor URL or ad URL as input.
- Fetches/analyzes the competitor's ad content via `atlasChat` from
  `src/lib/atlas.ts`.
- Extracts: hooks, angles, CTAs, visual style, emotional triggers, and
  pricing strategy.
- Compares against the user's brand positioning (if a brand kit is provided).
- Generates alerts when competitors use new strategies or change pricing.
- Returns: an analysis report, competitive gaps, recommended
  counter-strategies, and alerts.
- Has a dry-run fallback when Atlas is unavailable (returns deterministic
  heuristic analysis).
- Uses plan-tier-aware model selection via `getUserPlanTier` from
  `src/lib/plan-tier.ts`.

The library follows the exact patterns of `viral-analysis.ts` and
`reference-remix.ts`: self-contained types, helpers, system prompt, input
validation, dry-run detection, JSON extraction, and safe coercion of LLM
output.

### 2. New API route `src/app/api/creative/competitor-watch/route.ts`

Follows the exact pattern of `reference-remix/route.ts`:
- `GET`: returns credit cost and schema info.
- `POST`: authenticates the user via `auth()`, validates input, deducts
  credits, calls the library, and refunds credits on failure.
- Uses `withAtlas` from `@/lib/request-context` to wrap the handler.
- Uses `safeError` for error responses.

### 3. New UI page `src/app/competitor-watch/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/viral-analyzer/page.tsx`:
- Uses `useSession` from `next-auth/react` for auth gating.
- Uses `useI18n` from `@/i18n/provider` for translations.
- Shows an auth gate (with `AuthModal`) when unauthenticated.
- Has a form to input competitor URL, optional brand kit, product category,
  and platform.
- Displays results: analysis report, creative extraction (hooks, angles,
  CTAs, visual style, emotional triggers, pricing strategy), brand
  comparison, competitive gaps, counter-strategies, and alerts.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive (works at 375px and 1920px).
- Has exactly one `<h1>` element.

### 4. 5-credit cost (`COMPETITOR_WATCH_CREDIT_COST`)

Each analysis costs 5 credits. The UI displays the cost before execution so
users can make an informed decision, consistent with other credit-consuming
features.

### 5. Nav link with `Radar` icon

The `Eye` icon was already used for `/competitor-intel` in the nav header, so
the `Radar` icon (imported from `lucide-react`) was used for the new
`/competitor-watch` nav link to avoid icon collision.

### 6. Translations

A `competitorWatch` namespace was added as a top-level key in the
`enMessages` object in `src/i18n/locales/en.ts` with keys for all UI strings
used by the page.

### 7. Dry-run / fallback behavior

When Atlas is local (localhost/127.0.0.1) or `ATLASCLOUD_API_KEY` is missing,
the library returns a deterministic heuristic analysis instead of making a
real LLM call. This allows the UI and tests to exercise the full pipeline
without a real API key, matching the pattern established by
`reference-remix.ts`.

## Consequences

- **Positive:** Gives marketers a dedicated tool for deep competitor ad
  analysis with actionable alerts, closing the gap between surface-level
  competitor intel and concrete creative counter-strategies.
- **Positive:** The dry-run fallback ensures the feature works in local
  development and in tests without real API keys or credits.
- **Positive:** The self-contained library pattern keeps the surface area
  small — no modifications to `intelligence.ts`, `types.ts`, or `prompts.ts`.
- **Positive:** Plan-tier-aware model selection ensures free-tier users get
  cheaper models while pro/elite users get higher-quality analysis.
- **Negative:** The analysis is a snapshot at request time — it does not
  continuously monitor the competitor in the background. A marketer must
  re-run the watch to detect new changes.
- **Negative:** 5 credits per analysis may be steep for frequent monitoring
  of multiple competitors.

## Research Sources

Inspired by `viral-analysis.ts` (structured AI analysis with plan-tier-aware
model selection, ADR-008) and `reference-remix.ts` (self-contained library
with dry-run fallback and credit-based API route, ADR-033). Took the
self-contained library pattern — types, helpers, system prompt, validation,
and dry-run output all live in one module. Adapted to LazyNext's competitor
monitoring use case with creative extraction, brand comparison, competitive
gaps, counter-strategies, and alerts. Did NOT copy external code; the
implementation is a clean TypeScript module against LazyNext's existing
`atlasChat` and credit infrastructure.
