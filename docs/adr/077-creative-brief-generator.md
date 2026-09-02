# ADR-077: Creative Brief Generator

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users plan advertising campaigns and need creative briefs that align stakeholders, guide
production, and set measurable success criteria. Writing a creative brief from scratch is
time-consuming — the marketer must define the objective, describe the target audience, distill a
single key message, choose a tone, list deliverables, estimate a timeline, allocate budget, and
define success metrics. Without a structured brief, campaigns suffer from misaligned expectations,
unclear creative direction, and unmeasurable outcomes.

A "Creative Brief Generator" that uses AI to produce a complete, structured creative brief from
minimal input — product/brand and campaign goal — would give users a ready-to-use brief with
objective, target audience, key message, tone, deliverables, timeline, budget guidance, success
metrics, creative direction, and platform recommendations.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Brief Template Builder
(ADR-049), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-brief-generator.ts`

A self-contained creative brief generator engine that:
- Takes a product or brand (required, max 2000 chars), a campaign goal (required, max 500 chars),
  an optional platform (tiktok, instagram, youtube, facebook), an optional target audience (max
  1000 chars), and an optional budget level (low, medium, high).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate a complete creative brief
  with title, objective, target audience, key message, tone, deliverables (string array),
  timeline, budget guidance, success metrics (string array), creative direction, and platform
  recommendations (string array).
- Returns a `CreativeBrief` object.
- Has a dry-run fallback when Atlas is unavailable (uses platform- and budget-specific templates
  — e.g., low budget prioritizes organic TikTok/Instagram content; high budget invests in premium
  production across all platforms).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_BRIEF_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `brief-template-builder.ts`:
self-contained types, `extractJson`/`asStr`/`asStrArray` helpers, `isDryRun()` detection,
`validateCreativeBriefGeneratorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-brief-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/budgets (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-brief-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, campaign goal, platform selector (with an "any platform"
  option), target audience, and budget selector (with an "any budget" option).
- Displays results: a structured brief with sections for objective, target audience, key message,
  tone, deliverables list, timeline, budget guidance, success metrics list, creative direction,
  and platform recommendations list; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, lists wrap, sections stack).

### 4. Translations

The page uses the `creativeBriefGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, campaignGoal, platform, anyPlatform, targetAudience,
targetAudienceLabel, budget, anyBudget, generate, generating, objective, keyMessage, tone,
deliverables, timeline, budgetGuidance, successMetrics, creativeDirection,
platformRecommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-brief-generator.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_BRIEF_GENERATOR_CREDIT_COST` is 4).
- Input validation (missing productOrBrand, missing campaignGoal, over-length
  productOrBrand/campaignGoal/targetAudience, invalid platform, invalid budget, invalid dryRun
  type, valid minimal input).
- Dry-run mode (returns brief with correct structure, works for all four platforms, works for all
  three budget levels, works without optional fields, rejects invalid input/campaignGoal/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic briefs based on platform and budget templates:
- Platform-specific deliverables: TikTok favors short-form video and Spark Ads; Instagram favors
  Reels and Stories; YouTube favors pre-roll and Shorts; Facebook favors video and feed ads.
- Budget-specific guidance: low budget prioritizes organic content and UGC; medium budget
  balances paid production with organic; high budget invests in premium production.
- Multi-platform (default) generates deliverables and recommendations across all four platforms.

Each dry-run brief includes title, objective, target audience, key message, tone, deliverables,
timeline, budget guidance, success metrics, creative direction, and platform recommendations.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates the blank-page problem for creative briefs by grounding generation in
  product, goal, platform, audience, and budget data — giving users a ready-to-use brief.
- **Positive:** Structured sections with deliverables, timeline, and success metrics align
  stakeholders and set measurable expectations.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for industry-specific
  nuances or competitive landscape that the LLM would catch.
- **Negative:** Budget guidance in dry-run mode is a static approximation, not a real spend plan.

## Research Sources

Creative brief best practices drawn from industry research (advertising agency workflows, Meta
Business, TikTok for Business) and marketing strategy literature. The architecture follows the
patterns established in ADR-073 (Ad Hashtag Generator) for self-contained library design with
dry-run fallback and ADR-049 (Brief Template Builder) for industry-specific brief generation.
