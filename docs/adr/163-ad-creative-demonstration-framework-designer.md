# ADR-163: Ad Creative Demonstration Framework Designer

**Date:** 2026-10-05
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to plan the demonstration beats
that show the product working and prove the outcome. Demonstration frameworks — the deliberate
how-to-use, product-in-action, and result-demonstration sequences — are what make ads believable
and convert skeptics into buyers. Without a tool to design these frameworks, marketers rely on
intuition, producing ads that fail to show the product in action or prove the result, losing
viewers who need visual proof before they commit.

An "Ad Creative Demonstration Framework Designer" that uses AI to design demonstration frameworks
in ad creative content — producing frameworks with demo type (how to use, product in action,
result demonstration, before after demo, problem solution demo, feature showcase, comparison demo,
transformation demo), demo scenario descriptions, visual proof element descriptions, result reveal
descriptions, demonstration clarity scores (0-100), belief shift scores (0-100), and demonstration
pathway descriptions — would give users a structured demonstration blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative Objection
Neutralizer Designer (ADR-151), which demonstrated a self-contained analysis library with a
dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-demonstration-framework-designer.ts`

A self-contained ad creative demonstration framework designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce demonstration frameworks
  with demo type, demo scenario, visual proof element, result reveal, demonstration clarity,
  belief shift, and demonstration pathway, plus recommendations.
- Returns a `DemonstrationFrameworkDesignerResult` with a `DemonstrationStrategy` payload
  containing `frameworks` (DemonstrationFramework[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic frameworks
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_DEMONSTRATION_FRAMEWORK_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-objection-neutralizer-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeDemonstrationFrameworkDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-demonstration-framework-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/demo types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-demonstration-framework-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: framework cards with type badges, demo scenario, visual proof element,
  result reveal, demonstration pathway, demonstration clarity bars, belief shift bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeDemonstrationFrameworkDesigner` namespace via `useI18n`. Because the
`t` function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, frameworks, demoScenario, visualProofElement, resultReveal,
demonstrationClarity, beliefShift, demonstrationPathway, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/ad-creative-demonstration-framework-designer.test.ts`

Follows the pattern of `test/ad-creative-objection-neutralizer-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_DEMONSTRATION_FRAMEWORK_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_DEMO_TYPES has 8 demo types,
  max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with frameworks, correct framework structure, valid
  demo types, demonstrationClarity/beliefShift in 0-100 range, recommendations
  present, at least 3 frameworks, works for all four platforms, works without platform,
  deterministic output, rejects invalid/missing input, distinct framework types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic demonstration frameworks based on content length, product,
audience, and platform:
- Three demo types are generated (how_to_use, before_after_demo, result_demonstration) with
  descriptions shaped by the product and audience.
- Demonstration clarity and belief shift scores are deterministic, derived from
  content length and framework index, clamped to 0-100.
- Recommendations reference the framework types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured demonstration blueprint that helps marketers design
  ads with deliberate visual proof and result reveals for maximum conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Demonstration clarity and belief shift scores give marketers
  quantifiable metrics to compare framework effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced demonstration context that
  the LLM would catch (e.g., industry-specific proof elements, audience-specific result
  expectations).
- **Negative:** Framework scores in dry-run mode are deterministic approximations, not
  based on real demonstration analysis.

## Research Sources

Demonstration framework design methodology drawn from advertising effectiveness research,
product demonstration psychology, and visual proof persuasion frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for self-contained
library design with dry-run fallback and ADR-151 (Ad Creative Objection Neutralizer Designer)
for plan-tier-aware model selection.
