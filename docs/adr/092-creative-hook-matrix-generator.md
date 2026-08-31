# ADR-092: Creative Hook Matrix Generator

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users create short-form video and social ad content and need hooks that grab attention
across different emotional triggers and platform formats. A single hook rarely works across all
audiences — curiosity may drive clicks on TikTok while aspiration resonates better on Instagram.
Marketers need a systematic way to generate a matrix of hooks across emotional triggers (curiosity,
fear, aspiration, humor, urgency, social proof, etc.) and platform formats, with predicted
performance scores to prioritize testing.

A "Creative Hook Matrix Generator" that uses AI to generate a grid of hooks — each with an emotional
trigger, platform, predicted performance score (0-100), best use case, and character count — along
with top picks, platform distribution, and recommendations — would give users a comprehensive hook
testing framework before they invest in production.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-hook-matrix-generator.ts`

A self-contained creative hook matrix generator engine that:
- Takes a product or brand, an audience, an optional hook count (6-24, default 12), an optional
  platform, and a dry-run flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate a matrix of hooks across
  emotional triggers and platform formats, each with an id, hook text, emotional trigger, platform,
  predicted score (0-100), best use case, and character count.
- Returns a `HookMatrixResult` with a `HookMatrix` containing hooks, emotional triggers, top picks,
  platform distribution, and recommendations.
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific hook templates across
  10 emotional triggers with deterministic predicted scores).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateHookMatrixGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/creative-hook-matrix-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-hook-matrix-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, audience input, hook count selector (6-24), and an optional
  platform selector.
- Displays results: emotional triggers badges, platform distribution, hook cards with top-pick
  highlighting (star icon), predicted score, best use case, character count, recommendations list,
  and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, badges wrap, cards stack).

### 4. Translations

The page uses the `creativeHookMatrixGenerator` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, audience, hookCount, platform, generate, generating,
emotionalTriggers, platformDistribution, predictedScore, bestUseCase, characterCount,
recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-hook-matrix-generator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST` is 5).
- Input validation (missing productOrBrand, missing audience, over-length productOrBrand/audience,
  hookCount out of range, invalid hookCount type, invalid platform, invalid dryRun type, valid
  minimal input).
- Dry-run mode (returns hooks with correct structure, requested count honored, defaults to 12,
  returns emotionalTriggers/topPicks/platformDistribution/recommendations, works with optional
  platform, rejects invalid input/hookCount/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic hook generation based on platform-specific templates:
- tiktok: pattern interrupts, bold claims, "stop scrolling" hooks.
- instagram: aspirational, aesthetic, lifestyle-aligned hooks.
- youtube: value-driven, question-based, curiosity hooks.
- facebook: relatable, benefit-led, community-oriented hooks.

Each dry-run hook includes an id, hook text, emotional trigger (from 10 triggers), platform,
predicted score (60-100), best use case, and character count. Top picks are selected by highest
predicted score.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic hook testing framework across emotional triggers and
  platforms, reducing guesswork in hook selection.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Predicted scores and top picks help users prioritize which hooks to test first.
- **Negative:** The heuristic fallback is generic and does not account for audience-specific
  nuances that the LLM would catch.
- **Negative:** Predicted scores in dry-run mode are static approximations, not real performance
  data.

## Research Sources

Hook generation and emotional trigger best practices drawn from short-form video marketing
research (TikTok for Business, Meta Creative Shop, YouTube Creator Academy) and advertising
psychology literature. The architecture follows the patterns established in ADR-073 (Ad Hashtag
Generator) for self-contained library design with dry-run fallback and ADR-067 (Ad CTA Optimizer)
for plan-tier-aware model selection.
