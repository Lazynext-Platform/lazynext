# ADR-064: Creative Angle Finder

**Date:** 2026-09-27
**Status:** Accepted

## Context

LazyNext users need fresh marketing angles for their products — but most default to the same one or
two framings (typically "benefit-led" and "social proof"), leaving high-performing psychological
triggers untapped. A skincare brand might lean only on "results" messaging and miss the
"underdog story," "FOMO," or "insider secret" angles that could resonate with different audience
segments. Discovering angles across the full spectrum of psychological triggers (fear, aspiration,
belonging, curiosity, urgency, social proof, novelty, authority, scarcity, transformation) is a
creative-strategy task that benefits from AI synthesis.

A "Creative Angle Finder" that uses AI to discover unique marketing angles — with name,
psychologicalTrigger, description, exampleHeadline, bestForPlatform, and uniquenessScore (0-100) —
would let users explore a diverse set of approaches in seconds rather than brainstorming by hand.
The uniquenessScore helps users prioritize angles that stand out from common marketing approaches.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a self-contained
analysis library with a dry-run fallback, and the Ad Caption Generator (ADR-062), which demonstrated
platform-specific generation.

## Decision

### 1. New library `src/lib/creative/angle-finder.ts`

A self-contained creative angle finder engine that:
- Takes a product/brand, a platform, and an optional target audience.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to discover 5-7 unique marketing angles
  spanning different psychological triggers, each with name, psychologicalTrigger, description,
  exampleHeadline, bestForPlatform, and uniquenessScore (0-100).
- Returns a list of `CreativeAngle`.
- Has a dry-run fallback when Atlas is unavailable (uses templated angles derived from the product
  and platform — spanning transformation, urgency, curiosity, social proof, aspiration, belonging,
  and authority triggers).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`ANGLE_FINDER_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection, `validateAngleFinderInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/angle-finder/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-format-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/angle-finder/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-format-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, and optional target audience input.
- Displays results: angle cards with name, psychologicalTrigger badge, description,
  exampleHeadline, bestForPlatform badge, and uniquenessScore; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (badges wrap, grid collapses).

### 4. Translations

The page uses the `angleFinder` namespace via `useI18n`. Because the `t` function falls back to the
key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, targetAudience, find, finding, exampleHeadline,
uniquenessScore, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/angle-finder.test.ts`

Follows the pattern of `test/ad-format-optimizer.test.ts`. Tests cover:
- Credit cost (`ANGLE_FINDER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, MAX_PRODUCT_LENGTH, MAX_AUDIENCE_LENGTH).
- Input validation (non-object input, missing productOrBrand, over-length productOrBrand, missing
  platform, invalid platform, invalid targetAudience type, over-length targetAudience, invalid
  dryRun type, valid minimal input).
- Dry-run mode (returns angles with correct structure, angles have varied psychological triggers,
  rejects invalid input/invalid-platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic templated angles derived from the product and platform:
- Seven angle templates spanning transformation, urgency, curiosity, social proof, aspiration,
  belonging, and authority triggers.
- Each angle has a uniquenessScore (55-78) reflecting how distinctive it is relative to common
  marketing approaches.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Lets users explore a diverse set of psychological angles in seconds rather than
  defaulting to the same one or two framings, unlocking high-performing triggers they might
  otherwise miss.
- **Positive:** The uniquenessScore helps users prioritize angles that stand out from common
  marketing approaches.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch (e.g., a B2B SaaS product may warrant
  authority-led angles over belonging-led ones).
- **Negative:** 4 credits per discovery may add up for users who iterate frequently; however, the
  cost is moderate relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Psychological trigger frameworks drawn from marketing psychology research (Cialdini's principles
of persuasion, emotional marketing triggers) and adapted to LazyNext's multi-platform e-commerce
ad context. The architecture follows the patterns established in ADR-055 (Ad Format Optimizer) for
self-contained library design with dry-run fallback and ADR-062 (Ad Caption Generator) for
platform-specific generation.
