# ADR-116: Ad Creative Sensory Enhancer

**Date:** 2026-10-19
**Status:** Accepted

## Context

LazyNext users create ad creative content across multiple platforms but often produce copy that
is flat and emotionally distant. Ads that engage the five senses (visual, auditory, tactile,
olfactory, gustatory) are more memorable and persuasive, yet most marketers lack a systematic way
to inject vivid sensory language into their content. A tool that takes existing ad copy, a
product or brand, a target sense, and an optional platform — then enhances the content with
sensory additions, sense-specific before/after enhancements, a sensory score, and recommendations
— would help users craft more immersive, high-converting creative.

An "Ad Creative Sensory Enhancer" that uses AI to enhance ad creative content with sensory
language — producing enhanced content, a sensory score (0-100), sensory additions with impact
levels and positions, sense-specific enhancements with before/after comparisons, and
recommendations — would give users a concrete sensory upgrade path before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-sensory-enhancer.ts`

A self-contained ad creative sensory enhancer engine that:
- Takes content, a product or brand, an optional target sense (visual, auditory, tactile,
  olfactory, gustatory — default visual), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce enhanced content, a sensory
  score (0-100), sensory additions (with sense, text, position, impact), sense-specific
  enhancements (with sense, before, after, improvement), and recommendations.
- Returns a `SensoryEnhancerResult` with a `SensoryAnalysis` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic enhancement
  based on content length, target sense, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_SENSORY_ENHANCER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeSensoryEnhancerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-sensory-enhancer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/senses/impacts (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-sensory-enhancer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content, product/brand, target sense selector (5 senses), and an optional
  platform selector.
- Displays results: enhanced content box, sensory score gauge with progress bar, sensory
  additions with impact badges and position labels, sense enhancements with before/after
  comparison and improvement notes, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `adCreativeSensoryEnhancer` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, targetSense, platform, generate, generating,
enhancedContent, sensoryScore, additions, enhancements, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/ad-creative-sensory-enhancer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_SENSORY_ENHANCER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_SENSES, VALID_IMPACTS, DEFAULT_SENSE, MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH).
- Input validation (missing content, missing productOrBrand, over-length fields, invalid
  targetSense, invalid platform, invalid dryRun type, valid minimal input, empty platform/
  targetSense accepted).
- Dry-run mode (returns analysis with correct structure for enhancedContent/additions/
  enhancements/recommendations, sensoryScore in 0-100 range, works for all four platforms and
  all five senses, enhanced content includes original content, additions reference target
  sense, sensoryScore is deterministic, rejects invalid input/productOrBrand/targetSense,
  recommendations mention the target sense, additions include position labels).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic sensory enhancement based on content length, target sense, and
platform:
- Sense-specific descriptor pools (visual, auditory, tactile, olfactory, gustatory) provide
  vivid sensory words.
- Enhanced content prepends and appends sensory descriptors around the original content.
- Sensory score is derived from content length (clamped 35-92).
- Three sensory additions are generated (opening, middle, cta) with impact levels.
- One sense enhancement shows a before/after comparison with an improvement note.
- Five recommendations reference the target sense and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to inject vivid sensory language into ad creative,
  making content more immersive and memorable.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Before/after enhancements give marketers concrete examples of how sensory
  language transforms their copy, rather than abstract advice.
- **Negative:** The heuristic fallback does not account for nuanced sensory associations that
  the LLM would catch (e.g., brand-specific scent profiles, cultural sensory references).
- **Negative:** Sensory scores in dry-run mode are deterministic approximations, not based on
  real sensory language analysis.

## Research Sources

Sensory language and advertising effectiveness methodology drawn from sensory marketing research
and multi-sensory advertising frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
