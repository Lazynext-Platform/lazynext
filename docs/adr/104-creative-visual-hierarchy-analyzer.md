# ADR-104: Creative Visual Hierarchy Analyzer

**Date:** 2026-10-07
**Status:** Accepted

## Context

LazyNext users design ad creatives across multiple formats (video scripts, image ads, carousels,
stories, text ads) but lack a systematic way to evaluate the visual hierarchy of their layouts
before publishing. A creative may look appealing but suffer from a weak focal point, competing
elements, poor attention flow, or an unbalanced composition — all of which reduce viewer
comprehension and conversion. Marketers need a tool that analyzes a creative layout description
and produces element priority, attention flow, focal points, a balance assessment, an overall
hierarchy score, and recommendations for improving the visual hierarchy.

A "Creative Visual Hierarchy Analyzer" that uses AI to analyze the visual hierarchy of ad
creative layouts — producing element priority (1-10) with attention weight and effectiveness,
attention flow steps with direction and duration, focal points with strength and reason, a
balance assessment with score/symmetry/weight/notes, an overall score (0-100), and
recommendations — would give users a comprehensive hierarchy assessment before they finalize
their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-visual-hierarchy-analyzer.ts`

A self-contained creative visual hierarchy analyzer engine that:
- Takes a creative layout description, a product or brand, a content type (video-script,
  image-ad, carousel, story, text-ad — default text-ad), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce element priority, attention
  flow, focal points, a balance assessment, an overall score (0-100), and recommendations.
- Returns a `HierarchyAnalyzerResult` with a `HierarchyAnalysis` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic analysis based
  on layout length, content type, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeVisualHierarchyAnalyzerInput()` validation, deterministic dry-run output, and
a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-visual-hierarchy-analyzer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/content types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-visual-hierarchy-analyzer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for layout description (textarea), product/brand (input), content type selector,
  and an optional platform selector.
- Displays results: overall score, visual elements with priority bars and attention weight,
  attention flow steps with direction and duration, focal points with strength and reason,
  balance assessment with score/symmetry/weight/notes, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeVisualHierarchyAnalyzer` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, layoutDescription, productOrBrand, contentType, platform, generate,
generating, visualElements, attentionFlow, focalPoints, balance, overallScore, recommendations,
copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-visual-hierarchy-analyzer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_CONTENT_TYPES, DEFAULT_CONTENT_TYPE, MAX_LAYOUT_LENGTH,
  MAX_PRODUCT_LENGTH).
- Input validation (missing layoutDescription, whitespace-only layoutDescription, missing
  productOrBrand, over-length fields, invalid contentType, invalid platform, invalid dryRun
  type, valid minimal input, empty platform/contentType accepted, undefined optional fields
  accepted, dryRun boolean accepted).
- Dry-run mode (returns analysis with correct structure for elements/attentionFlow/focalPoints/
  balance, overallScore in 0-100 range, recommendations present, works for all four platforms
  and all content types, deterministic output, sequential priorities and steps, decreasing focal
  point strengths, rejects invalid input/productOrBrand/over-length/invalid contentType/invalid
  platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic visual hierarchy analysis based on layout length, content type, and
platform:
- Seven visual elements are generated (hero_image, headline, subheadline, cta_button, logo,
  supporting_text, product_shot) with sequential priorities (1-7), attention weights, roles,
  and effectiveness scores.
- Attention flow steps are generated for the top five elements with directions and durations.
- Focal points are generated for the top three elements with decreasing strengths and reasons.
- Balance assessment includes a score, symmetry, weight, and notes derived from layout length.
- Overall score is the average of the balance score and the mean element effectiveness.
- Recommendations are generated for improving the hierarchy.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic visual hierarchy assessment that catches weak focal
  points, competing elements, poor attention flow, and unbalanced compositions before
  publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Element priorities, attention flow, and focal points give marketers concrete,
  actionable guidance for restructuring their layouts.
- **Negative:** The heuristic fallback does not account for nuanced visual hierarchy factors
  that the LLM would catch (e.g., color theory, cultural reading patterns, platform-specific
  conventions).
- **Negative:** Element scores in dry-run mode are deterministic approximations, not based on
  real layout analysis.

## Research Sources

Visual hierarchy methodology drawn from design principles research (Gestalt principles, F-pattern
and Z-pattern reading, visual weight and balance theory) and advertising creative effectiveness
frameworks. The architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-073 (Ad Hashtag
Generator) for plan-tier-aware model selection.
