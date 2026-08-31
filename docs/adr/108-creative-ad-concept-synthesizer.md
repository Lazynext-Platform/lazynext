# ADR-108: Creative Ad Concept Synthesizer

**Date:** 2026-10-11
**Status:** Accepted

## Context

LazyNext users generate multiple ad concepts for a single product or campaign — different hooks,
angles, narratives, and formats — but rarely have a way to combine the strongest elements of each
into a single, cohesive creative direction. Marketers end up picking one concept and discarding the
rest, losing the value of the ideas that didn't make the cut. A fast-paced UGC hook, a cinematic
brand story, and a humorous skit may each have a winning element that, merged together, would
outperform any individual concept.

A "Creative Ad Concept Synthesizer" that uses AI to merge multiple ad concepts into a unified
creative direction — producing a unified theme, merged elements with source tracking (which concept
contributed each element) and priority, a creative direction (style, tone, visual approach,
narrative arc), differentiation, execution guidelines, and recommendations — would let users
preserve the best ideas across concepts and produce a single, stronger creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-concept-synthesizer.ts`

A self-contained creative ad concept synthesizer engine that:
- Takes concepts (a newline-separated string or an array of strings), a product or brand, and an
  optional platform (tiktok, instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a synthesized concept with a
  unified theme, merged elements (with source tracking and priority), creative direction,
  differentiation, execution guidelines, and recommendations.
- Returns a `SynthesizerResult` with a `ConceptSynthesis` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic synthesis based on
  the concepts, product/brand, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asStrArr` helpers, `isDryRun()` detection,
`validateCreativeAdConceptSynthesizerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-concept-synthesizer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError` for
  error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-concept-synthesizer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for concepts (textarea, one per line), product/brand, and an optional platform
  selector (any + the four supported platforms).
- Displays results: unified theme, merged elements with priority badges and source-concept tags,
  creative direction in a grid (style, tone, visual approach, narrative arc), differentiation,
  execution guidelines, and recommendations, with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses).

### 4. Translations

The page uses the `creativeAdConceptSynthesizer` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, concepts, productOrBrand, platform, generate, generating, unifiedTheme,
mergedElements, creativeDirection, differentiation, executionGuidelines, recommendations, copy,
copied, dryRunNotice, error.

### 5. Unit tests `test/creative-ad-concept-synthesizer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, MAX_CONCEPT_LENGTH, MAX_PRODUCT_LENGTH, MAX_CONCEPTS).
- Input validation (missing concepts, empty concepts array, missing productOrBrand, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted, newline-separated string concepts accepted, over-length concepts in array and string
  form rejected).
- Dry-run mode (returns synthesis with correct structure: unifiedTheme, mergedElements with
  element/sourceConcepts/role/priority, creativeDirection with style/tone/visualApproach/
  narrativeArc, differentiation, executionGuidelines, recommendations; works for all four
  platforms; works without a platform; deterministic for the same input and across all platforms;
  accepts newline-separated string concepts; reflects concept count in mergedElements; includes
  platform in unifiedTheme; rejects invalid input/productOrBrand/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic synthesis based on the concepts, product/brand, and platform:
- Each concept contributes one merged element with a rotating role (hook, value proposition, social
  proof, cta, emotional driver) and a priority derived from its index.
- When two or more concepts are provided, a synthesized shared "unified hook" element is prepended
  with priority 10 and source concepts referencing all inputs.
- The unified theme, creative direction (style varies by concept count), differentiation,
  execution guidelines, and recommendations are all derived deterministically from the inputs.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Lets users preserve the best ideas across multiple concepts instead of discarding
  them, producing a single stronger creative direction.
- **Positive:** Merged elements with source tracking and priority make it clear which concepts
  contributed which ideas and how central each is to the final creative.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules (`intelligence.ts`,
  `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`, `dashboard/page.tsx`) keeps the
  surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback does not account for nuanced creative synthesis that the LLM
  would produce (e.g., thematic blending, emotional arc optimization).
- **Negative:** Merged elements in dry-run mode are deterministic approximations, not based on real
  creative analysis of the concept content.

## Research Sources

Creative synthesis methodology drawn from advertising creative-direction research and concept-
merging frameworks. The architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-073 (Ad Hashtag Generator)
for plan-tier-aware model selection.
