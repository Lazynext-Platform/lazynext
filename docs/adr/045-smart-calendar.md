# ADR-045: Smart Calendar

**Date:** 2026-09-15
**Status:** Accepted

## Context

LazyNext already had a manual content calendar (`/calendar`) that let users schedule posts by
dragging creatives onto dates. However, the manual calendar did not suggest *when* to post —
users had to know or guess the optimal posting times for each platform (TikTok, Instagram,
YouTube, Facebook, LinkedIn, X). This is a common pain point for e-commerce marketers managing
multi-platform ad campaigns: each platform has different peak engagement windows, and the
optimal time also depends on the audience timezone, content type (video, image, carousel), and
historical performance data.

A "Smart Calendar" that uses AI to suggest optimal posting times — grounded in platform best
practices, audience timezone, content format, and the user's own CreativePerformance history —
would eliminate the guesswork and improve campaign reach.

The patterns were drawn from the Creative Performance Loop (ADR-037), which demonstrated
querying historical CreativePerformance records and feeding them to the Atlas LLM, and the
Viral Content Analyzer (ADR-038), which demonstrated a self-contained analysis library with a
dry-run fallback.

## Decision

### 1. New library `src/lib/creative/smart-calendar.ts`

A self-contained smart calendar engine that:
- Takes a list of creatives (with platform, format, audience metadata) and a date range.
- Generates a posting schedule with optimal times per platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM for optimal posting times based on
  platform best practices, audience timezone, content type, and historical performance data
  (queried via the CreativePerformance Prisma model).
- Returns a schedule with: date, time, platform, creativeId, expectedReach, confidence,
  timeOfDay, and rationale.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic time slots per platform).
- Uses plan-tier-aware model selection via `getUserPlanTier` from `src/lib/plan-tier.ts`.
- Cost: 3 credits (`SMART_CALENDAR_COST`).

The library mirrors the patterns in `viral-analysis.ts` and `performance-loop.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateSmartCalendarInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/smart-calendar/route.ts`

Follows the exact pattern of `src/app/api/creative/skill-chain-builder/route.ts`:
- **GET**: returns credit cost and schema info (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses.

### 3. New UI page `src/app/smart-calendar/page.tsx`

A `'use client'` component that follows the exact pattern of `src/app/viral-analyzer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form to select date range, platforms, and creatives (add/remove creative rows).
- Displays results: a schedule table with date, time, platform, creative, expected reach, and
  confidence; summary stats (total posts, average confidence, timezone, platform count); and an
  optimal-times legend (morning/afternoon/evening).
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, table scrolls horizontally).

The new page is at `/smart-calendar` (a different route from the existing `/calendar`), and
focuses on AI-suggested optimal posting times rather than manual scheduling.

### 4. Nav link

Added `{ href: '/smart-calendar', label: 'Smart Calendar', icon: CalendarClock, hideOnMd: true }`
to the `NAV_LINKS` array in `src/components/Shell.tsx`. `CalendarClock` is imported from
`lucide-react` (added to the existing import).

### 5. Translations

Added a `smartCalendar` namespace to `src/i18n/locales/en.ts` as a top-level key (after
`brandGuardrails`) with keys for: title, subtitle, signInPrompt, generate, generating, schedule,
platform, time, expectedReach, confidence, dateRange, startDate, endDate, platforms, creatives,
noSchedule, optimalTimes, morning, afternoon, evening, timezone, totalPosts, date, creative,
dryRunNotice, error.

### 6. Unit tests `test/smart-calendar.test.ts`

Follows the pattern of `test/skill-chain-builder.test.ts`. Tests cover:
- Input validation (missing fields, invalid platform/format, date range checks, creative count).
- Dry-run mode (deterministic schedule generation without LLM calls).
- Schedule generation logic (date distribution, platform assignment, sorting, breakdown).
- Optimal time heuristics (`getOptimalTimeSlot`, `PLATFORM_OPTIMAL_SLOTS`, `generateDateRange`).

### 7. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic time slots based on platform best practices:
- TikTok: morning (09:00) / evening (18:00)
- Instagram: afternoon (12:00) / evening (18:00)
- YouTube: afternoon (12:00) / evening (18:00)
- Facebook: morning (09:00) / afternoon (12:00)
- LinkedIn: morning (09:00) / afternoon (12:00)
- X: morning (09:00) / afternoon (12:00) / evening (18:00)

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in multi-platform posting schedules by grounding
  recommendations in platform best practices, audience timezone, content type, and historical
  performance data.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`) keeps the surface area small.
- **Positive:** Historical performance integration (via CreativePerformance) means the schedule
  improves as the user runs more campaigns — the loop closes naturally.
- **Negative:** The heuristic fallback is generic and does not account for audience-specific
  patterns that the LLM would catch (e.g., a B2B audience on LinkedIn may prefer early morning).
- **Negative:** 3 credits per schedule generation may add up for users who regenerate
  frequently; however, the cost is lower than analysis-heavy features (viral-analysis: 6,
  skill-chains: 8) because the scheduling logic is lighter.

## Research Sources

Platform best-practice posting times drawn from industry research (Sprout Social, Hootsuite,
Later) and adapted to LazyNext's multi-platform e-commerce ad context. The architecture follows
the patterns established in ADR-037 (Creative Performance Loop) for historical data integration
and ADR-038 (Viral Content Analyzer) for self-contained library design with dry-run fallback.
