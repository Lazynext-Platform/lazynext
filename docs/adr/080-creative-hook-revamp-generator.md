# ADR-080: Creative Hook Revamp Generator

**Date:** 2026-10-06
**Status:** Accepted

## Context

LazyNext users generate ad hooks for their campaigns, but a single hook rarely performs optimally
on the first try. Marketers often need to iterate on an existing hook — making it bolder, shorter,
more question-oriented, more story-driven, more data-backed, or more contrarian — to find the
version that maximizes scroll-stop rate and engagement. Manually brainstorming revamps is
time-consuming and often misses creative angles that a systematic approach would surface.

A "Creative Hook Revamp Generator" that takes an existing hook and generates revamped versions
with different angles, emotional triggers, and format changes — each with a predicted lift and
reasoning — would give users a structured way to iterate on hooks and discover higher-performing
variants.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-hook-revamp-generator.ts`

A self-contained creative hook revamp generator engine that:
- Takes an original hook (max 500 chars), a product or brand (max 2000 chars), an optional
  platform (tiktok, instagram, youtube, facebook), an optional revamp style (bolder, shorter,
  question, story, data-driven, contrarian), and a count (3-8, default 5).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate revamped hooks with a
  revamped hook text, angle, emotional trigger, format change, predicted lift (e.g., "+15%"),
  and reasoning.
- Returns a `HookRevamp[]`.
- Has a dry-run fallback when Atlas is unavailable (uses revamp-style-specific templates —
  e.g., bolder adds pattern-interrupt prefixes; shorter condenses to essential words; question
  reframes as provocative questions; story transforms into narrative openings; data-driven adds
  statistics and specificity; contrarian takes unexpected angles).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeHookRevampGeneratorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-hook-revamp-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/styles (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-hook-revamp-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for original hook input, product/brand input, optional platform selector, optional
  revamp style selector, and a count selector (3-8).
- Displays results: detailed revamp cards with revamped hook text, angle badge, emotional trigger
  badge, predicted lift indicator, format change, and reasoning; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, badges wrap).

### 4. Translations

The page uses the `creativeHookRevampGenerator` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, originalHook, productOrBrand, platform, revampStyle, count, generate, generating,
formatChange, reasoning, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-hook-revamp-generator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST` is 3).
- Input validation (missing originalHook, missing productOrBrand, over-length
  originalHook/productOrBrand, invalid platform, invalid revampStyle, count out of range,
  invalid count type, invalid dryRun type, valid minimal input).
- Dry-run mode (returns revamps with correct structure, requested count honored, defaults to 5,
  works for all six revamp styles, rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic revamps based on revamp-style-specific templates:
- bolder: pattern interrupts, exclusivity framing, transformation language, warning prefixes.
- shorter: condensing to 4-7 words, removing filler, adding POV framing.
- question: did-you-know, hypothetical, exclusivity, mistake-checking, wonder questions.
- story: personal discovery, surprise narrative, transformation arc, against-the-odds.
- data-driven: statistical surprises, quantified outcomes, evidence-based, scarcity stats.
- contrarian: challenges, reversals, counterintuitive advice, authority challenges.

Each dry-run revamp includes a revamped hook, angle, emotional trigger, format change, predicted
lift, and reasoning. Hooks are dynamically shaped from the original hook input.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates manual hook iteration by systematically generating revamps across
  multiple creative dimensions — giving users a structured way to discover higher-performing
  variants.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Predicted lift estimates and reasoning help users prioritize which revamps to
  test first.
- **Negative:** The heuristic fallback is generic and does not account for platform-specific
  algorithmic nuances or audience-specific responses that the LLM would catch.
- **Negative:** Predicted lift values in dry-run mode are static approximations, not based on
  real performance data.

## Research Sources

Hook optimization best practices drawn from industry research (TikTok for Business, Meta
Business, YouTube Creator Academy) and creative advertising literature. The architecture follows
the patterns established in ADR-073 (Ad Hashtag Generator) for self-contained library design
with dry-run fallback and ADR-071 (Ad Thumbnail Generator) for plan-tier-aware model selection.
