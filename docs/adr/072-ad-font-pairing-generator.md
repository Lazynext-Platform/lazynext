# ADR-072: Ad Font Pairing Generator

**Date:** 2026-09-30
**Status:** Accepted

## Context

LazyNext users design ad creatives across many platforms and frequently need font pairings that are
both aesthetically pleasing and readable at small sizes. A random font pick rarely performs —
typography dictates that modern campaigns need clean geometric sans-serifs, luxury campaigns need
elegant high-contrast serifs, and playful campaigns need rounded, friendly fonts. Additionally,
platform-specific norms (TikTok favors bold, high-contrast fonts for fast-scrolling feeds; YouTube
favors high-readability fonts for thumbnails) mean a pairing that works on one platform may
underperform on another. Without a structured font pairing tool, marketers default to whatever
fonts they used last, leaving brand consistency and readability on the table.

An "Ad Font Pairing Generator" that uses AI to generate font pairing recommendations — each with a
heading font, body font, style description, mood, readability score, platform fit, and use case —
would give users ready-to-apply pairings grounded in typographic best practices.

The patterns were drawn from the Ad Format Optimizer (ADR-055) and the Ad CTA Optimizer (ADR-067),
which demonstrated a self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-font-pairing-generator.ts`

A self-contained ad font pairing generator engine that:
- Takes a product or brand, a platform, an optional mood (modern/classic/playful/luxury/bold/
  minimal), and a count (1-5, default 3).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate font pairing recommendations
  with a name, heading font, body font, style description, mood, readability score (0-100),
  platform fit array, and use case.
- Returns a list of `FontPairing` objects.
- Has a dry-run fallback when Atlas is unavailable (uses mood-specific pairing templates —
  e.g., modern favors geometric sans-serifs like Montserrat + Inter; classic favors editorial
  serifs like Playfair Display + Lora; luxury favors high-contrast serifs like Cormorant Garamond
  + Jost).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_FONT_PAIRING_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdFontPairingGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-font-pairing-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-cta-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/moods (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-font-pairing-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, mood selector (with an "any" option),
  and a count selector (1-5).
- Displays results: pairing cards with name, mood badge, font preview, heading font, body font,
  style description, readability score, platform fit, and use case; and a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, badges wrap).

### 4. Translations

The page uses the `adFontPairingGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, mood, anyMood, count, generate, generating, headingFont,
bodyFont, styleDescription, readabilityScore, platformFit, useCase, copy, copied, dryRunNotice,
error.

### 5. Unit tests `test/ad-font-pairing-generator.test.ts`

Follows the pattern of `test/ad-cta-optimizer.test.ts`. Tests cover:
- Credit cost (`AD_FONT_PAIRING_GENERATOR_CREDIT_COST` is 3).
- Input validation (missing productOrBrand, missing/invalid platform, invalid mood, count out of
  range, invalid count type, invalid dryRun type, valid minimal input).
- Dry-run mode (returns pairings with correct structure, requested count honored, defaults to 3,
  mood matches request, works for all six moods, rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic font pairings based on mood-specific templates:
- modern: geometric sans-serifs (Geometric Clean, Urban Edge, Swiss Style, Tech Forward, Neo Minimal).
- classic: editorial serifs (Editorial Elegance, Traditional Press, Vintage Charm, Timeless Duo, Scholarly).
- playful: rounded, friendly fonts (Fun Rounded, Bubbly Pop, Casual Cool, Comic Vibe, Sweet & Soft).
- luxury: elegant high-contrast serifs (Gold Standard, Boutique, Refined Pair, Velvet, Couture).
- bold: heavy, impactful fonts (Impact Max, Heavy Hitter, Power Duo, Statement, Force).
- minimal: ultra-clean, lightweight fonts (Clean Slate, Whitespace, Light & Airy, Pure Form, Subtle).

Each dry-run pairing includes a name, heading font, body font, style description, mood, readability
score, platform fit array, and use case.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in font pairing selection by grounding generation in mood,
  platform, and typographic best practices — giving users ready-to-apply pairings.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Readability scores help users reason about which pairings will perform at small
  sizes on mobile feeds.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific font
  licensing or custom typefaces that the LLM would consider.
- **Negative:** 3 credits per generation may add up for users who iterate frequently; however,
  the cost is low relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Typography and font pairing best practices drawn from industry research (Google Fonts, Adobe Type,
platform design guidelines) and typographic theory. The architecture follows the patterns
established in ADR-055 (Ad Format Optimizer) for self-contained library design with dry-run
fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model selection.
