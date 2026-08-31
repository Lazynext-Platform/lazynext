# ADR-070: Ad Color Palette Generator

**Date:** 2026-09-30
**Status:** Accepted

## Context

LazyNext users design ad creatives across many platforms and frequently need color palettes that
are both visually appealing and psychologically aligned with their campaign's emotional goal. A
random color pick rarely performs — color psychology dictates that energetic campaigns need warm,
high-contrast hues, while trust-focused campaigns need stable blues and greens. Additionally,
platform-specific norms (TikTok favors bold neon-on-dark, Instagram favors polished cohesive
tones) mean a palette that works on one platform may underperform on another. Without a structured
color strategy tool, marketers default to brand colors or whatever looks good, leaving engagement
and conversion on the table.

An "Ad Color Palette Generator" that uses AI to generate optimized color palettes — each with a
name, color array, primary/secondary/accent/background/text roles, emotion label, platform fit, and
a psychology description — would give users ready-to-apply palettes grounded in color theory and
platform best practices. By supporting an optional brand color, the tool can harmonize palettes
with existing brand identity.

The patterns were drawn from the Ad Format Optimizer (ADR-055) and the Ad CTA Optimizer (ADR-067),
which demonstrated a self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-color-palette-generator.ts`

A self-contained ad color palette generator engine that:
- Takes a product or brand, a platform, an optional emotion (energetic/calm/luxury/trust/playful/
  urgent), an optional brand color (hex), and a count (1-5, default 3).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate optimized color palettes with
  a name, colors array, primary/secondary/accent/background/text hex roles, emotion, platform fit,
  and a psychology description.
- Returns a list of `ColorPalette` objects.
- Has a dry-run fallback when Atlas is unavailable (uses emotion-specific palette templates —
  e.g., energetic favors warm reds and oranges; calm favors soft blues and greens; luxury favors
  black-and-gold combinations). When a brand color is provided, dry-run palettes incorporate it as
  the primary color.
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_COLOR_PALETTE_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdColorPaletteGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-color-palette-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-cta-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/emotions (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-color-palette-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, emotion selector (with an "any" option),
  optional brand color input (with live preview swatch), and a count selector (1-5).
- Displays results: palette cards with name, emotion badge, color swatches with hex labels,
  role labels (primary/secondary/accent/background/text) with mini swatches, platform fit, and
  psychology description; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, swatches wrap).

### 4. Translations

The page uses the `adColorPaletteGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, emotion, anyEmotion, brandColor, brandColorPreview, count,
generate, generating, primary, secondary, accent, background, text, platformFit, psychology, copy,
copied, dryRunNotice, error.

### 5. Unit tests `test/ad-color-palette-generator.test.ts`

Follows the pattern of `test/ad-cta-optimizer.test.ts`. Tests cover:
- Credit cost (`AD_COLOR_PALETTE_GENERATOR_CREDIT_COST` is 3).
- Input validation (missing productOrBrand, missing/invalid platform, invalid emotion, invalid
  brandColor type/length/format, count out of range, invalid count type, invalid dryRun type,
  valid minimal input).
- Dry-run mode (returns palettes with correct structure, valid hex colors, requested count honored,
  defaults to 3, emotion matches request, works for all six emotions, brand color incorporated,
  rejects invalid input/platform/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic palettes based on emotion-specific templates:
- energetic: warm reds, oranges, and neons (Volt Surge, Neon Pulse, Sunburst, Firecracker, Electric Pop).
- calm: soft blues, greens, and neutrals (Ocean Breeze, Sage Garden, Lavender Mist, Morning Fog, Soft Sand).
- luxury: deep tones with gold accents (Black Gold, Midnight Velvet, Burgundy Royale, Platinum, Emerald Elite).
- trust: blues and greens with clean whites (Corporate Blue, Green Seal, Steady Navy, Clean White, Reliable Teal).
- playful: bright multi-color, high-saturation (Candy Pop, Bubblegum, Rainbow Burst, Sunny Side, Pop Art).
- urgent: reds and oranges with high contrast (Red Alert, Countdown, Flash Sale, Last Chance, Hot Deal).

When a brand color is provided, dry-run palettes replace the primary color with the brand color
and adjust the colors array accordingly.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in color palette selection by grounding generation in emotion,
  platform, and color psychology — giving users ready-to-apply palettes before production.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Brand color harmonization ensures palettes respect existing brand identity while
  still optimizing for emotion and platform.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch.
- **Negative:** 3 credits per generation may add up for users who iterate frequently; however,
  the cost is low relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Color psychology and platform color best practices drawn from industry research (Meta Business,
TikTok for Business, YouTube Ads) and color theory literature. The architecture follows the
patterns established in ADR-055 (Ad Format Optimizer) for self-contained library design with
dry-run fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model selection.
