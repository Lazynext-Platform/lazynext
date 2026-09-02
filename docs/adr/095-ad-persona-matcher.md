# ADR-095: Ad Persona Matcher

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users create ad content that needs to resonate with multiple audience personas, but
guessing whether a given piece of content aligns with each persona's values, needs, and
preferences is error-prone. A single ad may need to appeal to beauty enthusiasts, busy moms, and
eco-conscious shoppers simultaneously — each with different motivations and communication
preferences. Marketers need a way to score how well their content matches each persona, understand
the alignment gaps, and get specific content adjustments to improve resonance per segment.

An "Ad Persona Matcher" that uses AI to analyze ad content against a list of persona descriptions
— producing per-persona match scores (0-100), alignment analysis, content adjustments, and
resonance ratings (1-10), plus an overall alignment score and recommendations — would give users
actionable insight before they publish.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-persona-matcher.ts`

A self-contained ad persona matcher engine that:
- Takes content, a product or brand, comma-separated persona descriptions, and an optional
  platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce per-persona match scores
  (0-100), alignment analysis, content adjustments (string[]), and resonance ratings (1-10),
  plus a best-match persona, overall alignment (0-100), and recommendations.
- Returns a `PersonaMatcherResult` with a `PersonaMatching` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic persona matches
  based on persona descriptions and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_PERSONA_MATCHER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdPersonaMatcherInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-persona-matcher/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-persona-matcher/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content, product/brand, personas (comma-separated), and an optional platform
  selector.
- Displays results: overall alignment score with best-match persona, persona match cards with
  match score, resonance, alignment analysis, and content adjustments; and a recommendations
  section with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, badges wrap).

### 4. Translations

The page uses the `adPersonaMatcher` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, personas, platform, generate, generating,
overallAlignment, bestMatch, contentAdjustments, recommendations, copy, copied, dryRunNotice,
error.

### 5. Unit tests `test/ad-persona-matcher.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_PERSONA_MATCHER_CREDIT_COST` is 4).
- Input validation (missing content, missing productOrBrand, missing personas, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted).
- Dry-run mode (returns persona matches with correct structure, one match per persona,
  overallAlignment and bestMatchPersona present, recommendations present, works for all four
  platforms, rejects invalid input/personas).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic persona matches based on persona descriptions and platform:
- Each persona gets a deterministic match score (35-95) derived from persona length and index.
- Resonance is derived from the match score (3-10).
- Content adjustments are generated dynamically from the persona name and brand.
- Best-match persona is the one with the highest score.
- Overall alignment is the average of all persona match scores.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in persona alignment by scoring content against each persona
  with specific, actionable adjustments — giving users targeted improvements before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Per-persona content adjustments give marketers concrete, segment-specific
  guidance rather than generic advice.
- **Negative:** The heuristic fallback does not account for real audience data or nuanced
  persona psychographics that the LLM would catch.
- **Negative:** Match scores in dry-run mode are deterministic approximations, not based on
  real audience research.

## Research Sources

Persona matching best practices drawn from audience research methodology and marketing
psychology literature. The architecture follows the patterns established in ADR-073 (Ad Hashtag
Generator) for self-contained library design with dry-run fallback and ADR-071 (Ad Thumbnail
Generator) for plan-tier-aware model selection.
