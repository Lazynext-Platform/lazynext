# ADR-059: Creative Hook Tester

**Date:** 2026-09-26
**Status:** Accepted

## Context

LazyNext users routinely write multiple ad hooks for the same product and need to decide which
hook to lead with before they spend on production and media. Today this decision is made by gut
feel: a marketer drafts 5-10 hooks and picks a favorite, with no data-backed prediction of which
hook will actually stop the scroll, drive click-through, and sustain engagement on a given
platform. A hook that works on TikTok (pattern interrupt, curiosity gap in the first 3 seconds)
may underperform on YouTube (benefit-driven, search-intent aligned) or Facebook (social proof,
relatable pain point). Picking the wrong hook wastes budget and depresses CTR across the whole
campaign.

A "Creative Hook Tester" that uses AI to score 2-10 hooks against a product, audience, and
platform — with a 0-100 performance score, predicted CTR lift, an engagement prediction,
strengths, weaknesses, and an improvement suggestion — would remove the guesswork and help users
rank their hooks before they commit to production.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a
self-contained analysis library with a ranked-output schema, a single bestPick, and a dry-run
fallback, and the Competitor Watch (ADR-046), which demonstrated self-contained helpers and
deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/hook-tester.ts`

A self-contained hook tester engine that:
- Takes an array of hooks (2-10, each max 200 chars), a product/brand, an optional target
  audience, and a platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to score each hook 0-100, predict CTR
  lift, describe expected engagement, list strengths and weaknesses, and suggest one
  improvement.
- Returns a ranked list of `HookTestResult` plus a single `bestPick` hook string.
- Has a dry-run fallback when Atlas is unavailable (uses keyword and platform heuristics — e.g.,
  curiosity words like "secret"/"nobody" boost score, TikTok rewards "pov"/"viral", YouTube
  rewards "tutorial"/"guide").
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`HOOK_TESTER_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection, `validateHookTesterInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/hook-tester/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-format-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/hook-tester/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-format-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, optional target audience, platform selector, and a
  dynamic hook list (add/remove, 2-10 hooks, each max 200 chars).
- Displays results: ranked hook cards with score, predicted CTR lift, engagement prediction,
  strengths, weaknesses, and improvement suggestion; a highlighted best pick; and a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, tags wrap).

### 4. Translations

The page uses the `hookTester` namespace via `useI18n`. Because the `t` function falls back to
the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, targetAudience, platform, hooks, addHook, removeHook, test,
testing, bestPick, predictedCtrLift, strengths, weaknesses, improvement, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/hook-tester.test.ts`

Follows the pattern of `test/ad-format-optimizer.test.ts`. Tests cover:
- Credit cost (`HOOK_TESTER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, MIN_HOOKS, MAX_HOOKS, MAX_HOOK_LENGTH).
- Input validation (non-object input, missing hooks, too few hooks, too many hooks, over-length
  hook, missing productOrBrand, missing platform, invalid platform, invalid dryRun type, valid
  minimal input, invalid targetAudience type).
- Dry-run mode (returns rankedHooks with correct structure, has a bestPick present in the
  rankedHooks, score-descending ranking, bestPick is the top hook, covers every submitted hook,
  curiosity keywords boost score, rejects invalid input/too-few-hooks/invalid-platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic scores based on keyword and platform signals:
- Curiosity words ("secret", "nobody", "truth") boost score by +12.
- Pattern interrupts ("stop", "wait", "never") boost score by +10.
- Numbers and "how"/"why" phrasing boost score by +8.
- Benefit words ("free", "guarantee", "proven") boost score by +6.
- Over-long hooks (>120 chars) lose 6 points; too-brief hooks (<10 chars) lose 8 points.
- Platform adjustments: TikTok rewards "pov"/"viral"/"trend", Instagram rewards
  "aesthetic"/"lifestyle", YouTube rewards "tutorial"/"guide"/"review", Facebook rewards
  "love"/"hate"/"honest".

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in hook selection by grounding predictions in product,
  audience, and platform — before production spend is committed.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Per-hook strengths, weaknesses, and improvement suggestions let users iterate on
  weak hooks rather than discarding them entirely.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch (e.g., a hook referencing a trending meme
  may outperform its keyword score).
- **Negative:** 3 credits per test may add up for users who test many hook sets; however, the
  cost is low relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Hook performance patterns drawn from industry research (TikTok for Business hook frameworks,
Meta creative best practices, YouTube ad headline guidance) and adapted to LazyNext's
multi-platform e-commerce ad context. The architecture follows the patterns established in
ADR-055 (Ad Format Optimizer) for ranked-output schema with a single bestPick and dry-run
fallback, and ADR-046 (Competitor Watch) for self-contained library design.
