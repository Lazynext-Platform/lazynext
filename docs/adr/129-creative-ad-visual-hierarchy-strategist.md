# ADR-129: Creative Ad Visual Hierarchy Strategist

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users design ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to strategize the visual hierarchy — how elements are arranged
to guide viewer attention. Without a clear hierarchy, ads suffer from scattered attention, weak
focal points, and poor visual flow that reduces engagement and conversion. Marketers need a tool
that determines the optimal layering of visual elements (primary, secondary, tertiary, background,
accent, overlay), assigns attention weights to each element, identifies focal points with
attraction methods and retention times, maps the visual flow path the eye should follow, and scores
the overall hierarchy effectiveness.

A "Creative Ad Visual Hierarchy Strategist" that uses AI to strategize the visual hierarchy of ad
creative — producing hierarchy layers with type/position/size/z-index, attention weights with
reasoning and priority, focal points with attraction methods and retention times, a visual flow
map with direction/path/anchors, a hierarchy score (0-100), and recommendations — would give users
a comprehensive hierarchy strategy before they build or refine their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-visual-hierarchy-strategist.ts`

A self-contained creative ad visual hierarchy strategist engine that:
- Takes a product or brand, content, visual elements, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce hierarchy layers, attention
  weights, focal points, visual flow, a hierarchy score, and recommendations.
- Returns a `VisualHierarchyStrategistResult` with a `HierarchyStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic strategy based
  on the product, content, visual elements, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdVisualHierarchyStrategistInput()` validation, deterministic dry-run output,
and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-visual-hierarchy-strategist/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/layer types/sizes/priorities
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-visual-hierarchy-strategist/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), visual elements (input), and an
  optional platform selector.
- Displays results: hierarchy score gauge, hierarchy layers with type badges and position/size/
  z-index metadata, attention weights with bars and priority badges, focal points with attraction
  method and retention time, visual flow path with directional arrows, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale, flow path wraps).

### 4. Translations

The page uses the `creativeAdVisualHierarchyStrategist` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, visualElements, platform, generate,
generating, layers, attentionWeights, focalPoints, visualFlow, hierarchyScore, recommendations,
copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-visual-hierarchy-strategist.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_LAYER_TYPES, VALID_SIZES, VALID_PRIORITIES, MAX_* lengths).
- Input validation (missing productOrBrand, missing content, missing visualElements, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted).
- Dry-run mode (returns strategy with correct structure for layers/attentionWeights/focalPoints/
  visualFlow/recommendations, hierarchyScore in 0-100 range, works for all four platforms and
  without a platform, uses provided visual elements, falls back to defaults when few provided,
  deterministic for identical input, rejects invalid input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic visual hierarchy strategy based on the product, content, visual
elements, and platform:
- Visual elements are parsed from the input (comma/semicolon/newline separated); if fewer than
  three are provided, default elements are used (headline, product image, logo, cta button,
  background, overlay text).
- Six hierarchy layers are generated with types (primary, secondary, tertiary, background,
  accent, overlay), positions, sizes, and descending z-index values.
- Attention weights are derived deterministically from the base score and element index, with
  priorities (high, high, medium, low, medium, low).
- Focal points are generated for the first four elements with attraction methods and retention
  times.
- Visual flow direction is selected deterministically from content length (Z-pattern, F-pattern,
  center-outward, left-to-right), with a path through the elements and anchor points.
- Hierarchy score is derived from content and visual element lengths, clamped to 40-90.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic visual hierarchy strategy that guides viewer attention
  effectively, improving engagement and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Attention weights with reasoning and priority give marketers concrete guidance
  on where to focus visual emphasis.
- **Negative:** The heuristic fallback does not account for nuanced visual hierarchy factors that
  the LLM would catch (e.g., cultural reading patterns, platform-specific attention models).
- **Negative:** Layer positions and sizes in dry-run mode are deterministic approximations, not
  based on real creative analysis.

## Research Sources

Visual hierarchy and attention guidance methodology drawn from advertising design research,
Gestalt principles, and eye-tracking studies on ad creative effectiveness. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for self-contained library
design with dry-run fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model
selection.
