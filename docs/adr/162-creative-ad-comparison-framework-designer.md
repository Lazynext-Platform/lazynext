# ADR-162: Creative Ad Comparison Framework Designer

**Date:** 2026-10-12
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design structured "us vs. them"
or alternative-vs-product comparisons — the practice of positioning the product against alternatives
along a clear axis so the viewer's preference shifts toward the product. Comparison is one of the
most powerful persuasion levers in advertising: when an ad makes the alternative's weakness visible
and the product's advantage decisive, the choice feels obvious. Without a tool to design these
comparisons, marketers rely on ad-hoc contrasts that lack a clear axis, a measurable advantage, or a
pathway from recognizing the alternative's weakness to choosing the product.

A "Creative Ad Comparison Framework Designer" that uses AI to design comparison frameworks in ad
creative content — producing frameworks with comparison type (feature comparison, price comparison,
quality comparison, speed comparison, convenience comparison, outcome comparison, social comparison,
lifestyle comparison), comparison axis, product advantage, competitor weakness, advantage strength
(0-100), preference shift (0-100), and comparison pathway — would give users a structured
comparison blueprint for their creative.

The patterns were drawn from the Creative Ad Identity Alignment Designer (ADR-154) and the Creative
Ad Value Ladder Designer (ADR-150), which demonstrated a self-contained analysis library with a
dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-comparison-framework-designer.ts`

A self-contained creative ad comparison framework designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce comparison frameworks with
  comparison type, comparison axis, product advantage, competitor weakness, advantage strength,
  preference shift, and comparison pathway, plus recommendations.
- Returns a `ComparisonFrameworkDesignerResult` with a `ComparisonStrategy` payload containing
  `frameworks` (ComparisonFramework[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic frameworks
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_COMPARISON_FRAMEWORK_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-ad-identity-alignment-designer.ts` and
`creative-ad-value-ladder-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdComparisonFrameworkDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-comparison-framework-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/creative-ad-identity-alignment-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/comparison types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-comparison-framework-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-ad-identity-alignment-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: framework cards with type badges, comparison axis, product advantage,
  competitor weakness, comparison pathway, advantage strength bars, preference shift bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Scale, GitCompare, TrendingUp, Sparkles, Loader2, AlertCircle, Copy,
  Check. (All icons verified against the installed lucide-react types.)

### 4. Translations

The page uses the `creativeAdComparisonFrameworkDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, frameworks, comparisonAxis, productAdvantage, competitorWeakness, advantageStrength,
preferenceShift, comparisonPathway, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-comparison-framework-designer.test.ts`

Follows the pattern of `test/creative-ad-identity-alignment-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_COMPARISON_FRAMEWORK_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_COMPARISON_TYPES has 8 comparison types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted,
  non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with frameworks, correct framework structure, valid comparison
  types, advantageStrength/preferenceShift in 0-100 range, recommendations present, at least 3
  frameworks, exactly 3 deterministic frameworks, works for all four platforms, works without
  platform, deterministic output, comparison types progress through comparison layers, rejects
  invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic comparison frameworks based on content length, product, audience, and
platform:
- Three comparison types are generated (feature_comparison, price_comparison, outcome_comparison)
  with descriptions shaped by the product and audience.
- Advantage strength and preference shift scores are deterministic, derived from content length
  and framework index, clamped to 0-100.
- Recommendations reference the comparison types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured comparison blueprint that helps marketers design ads that
  make the product the obvious choice, shifting viewer preference decisively.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Advantage strength and preference shift scores give marketers quantifiable
  metrics to compare framework effectiveness and identify weak comparison axes.
- **Negative:** The heuristic fallback does not account for nuanced competitive dynamics that the
  LLM would catch (e.g., audience-specific competitor perceptions, market positioning, category
  context, indirect alternatives).
- **Negative:** Comparison scores in dry-run mode are deterministic approximations, not based on
  real competitive analysis.

## Research Sources

Comparison framework methodology drawn from comparative advertising research, consideration set
theory, choice architecture, and preference formation literature. The architecture follows the
patterns established in ADR-154 (Creative Ad Identity Alignment Designer) for self-contained
library design with dry-run fallback and ADR-150 (Creative Ad Value Ladder Designer) for
plan-tier-aware model selection.
