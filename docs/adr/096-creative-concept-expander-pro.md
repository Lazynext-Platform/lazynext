# ADR-096: Creative Concept Expander Pro

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users often start with a single creative concept — a hook, a visual idea, or a narrative
angle — but struggle to scale it into a full campaign ecosystem. A single concept needs
variations to test different angles, extensions to sustain engagement post-launch, and
cross-platform adaptations to maximize reach. Doing this manually is time-consuming and often
misses opportunities for differentiation and ecosystem thinking. Marketers need a tool that takes
one concept and expands it into a structured campaign ecosystem with variations, extensions,
cross-platform adaptations, and a map of how everything connects.

A "Creative Concept Expander Pro" that uses AI to expand a single concept into a full campaign
ecosystem — with variations (each with a format, platform, and differentiation angle),
extensions (sequels, spinoffs, remixes), cross-platform adaptations, an ecosystem map, creative
directions, and recommendations — would give users a ready-to-deploy campaign blueprint.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-concept-expander-pro.ts`

A self-contained creative concept expander engine that:
- Takes a concept, a product or brand, an optional expansion depth (shallow/standard/deep,
  default standard), and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce variations, extensions,
  cross-platform adaptations, an ecosystem map, creative directions, and recommendations.
- Returns a `ConceptExpanderProResult` with a `ConceptExpansion` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic expansion
  based on concept, depth, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeConceptExpanderProInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-concept-expander-pro/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/depths (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-concept-expander-pro/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for concept, product/brand, expansion depth selector, and an optional platform
  selector.
- Displays results: core concept, ecosystem map, variation cards, extension cards,
  cross-platform adaptation cards, creative directions, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, badges wrap).

### 4. Translations

The page uses the `creativeConceptExpanderPro` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, concept, productOrBrand, expansionDepth, platform, generate,
generating, coreConcept, ecosystemMap, variations, differentiationAngle, extensions,
application, crossPlatformAdaptations, creativeDirections, recommendations, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/creative-concept-expander-pro.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST` is 5).
- Input validation (missing concept, missing productOrBrand, over-length fields, invalid
  expansionDepth, invalid platform, invalid dryRun type, valid minimal input, empty platform
  accepted).
- Dry-run mode (returns expansion with correct structure for variations/extensions/adaptations,
  ecosystemMap/creativeDirections/recommendations present, depth-specific counts honored,
  works for all four platforms, rejects invalid input/productOrBrand).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic expansion based on concept, depth, and platform:
- shallow: 3 variations, 2 extensions, 2 cross-platform adaptations.
- standard: 5 variations, 3 extensions, 3 cross-platform adaptations.
- deep: 8 variations, 5 extensions, 4 cross-platform adaptations.
- Variations use rotating formats and differentiation angles.
- Extensions use rotating types (sequel, spinoff, remix, behind-the-scenes, user-generated).
- Cross-platform adaptations are generated for the specified platform or all four.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Transforms a single concept into a structured campaign ecosystem, saving
  marketers hours of manual planning and ideation.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Expansion depth control lets users balance comprehensiveness against cost.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific
  nuances or real-time trends that the LLM would catch.
- **Negative:** Deep expansion (8 variations) may produce overlapping angles in dry-run mode.

## Research Sources

Campaign ecosystem design drawn from creative strategy literature and cross-platform content
marketing best practices. The architecture follows the patterns established in ADR-073 (Ad
Hashtag Generator) for self-contained library design with dry-run fallback and ADR-071 (Ad
Thumbnail Generator) for plan-tier-aware model selection.
