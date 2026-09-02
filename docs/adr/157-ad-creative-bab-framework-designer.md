# ADR-157: Ad Creative BAB Framework Designer

**Date:** 2026-10-21
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
Before-After-Bridge (BAB) transformation narratives that move viewers from a
painful "before" state to a desired "after" state via the product as the bridge.
BAB frameworks — the deliberate transformation narratives that contrast the
viewer's current limitation against the desired outcome connected by the product
— are what make ads persuasive and drive action. Without a tool to design these
frameworks, marketers rely on intuition, producing ads that fail to leverage the
specific transformation types viewers need to feel the contrast and desire
(status, capability, emotional, financial, time, social, health, lifestyle
transformations) and lose conversions at the moment of indifference.

An "Ad Creative BAB Framework Designer" that uses AI to design BAB frameworks in
ad creative content — producing frameworks with transformation type (status
transformation, capability transformation, emotional transformation, financial
transformation, time transformation, social transformation, health
transformation, lifestyle transformation), before state descriptions, after
state descriptions, bridge mechanism descriptions, contrast strength scores
(0-100), desire trigger scores (0-100), and BAB pathway descriptions — would
give users a structured transformation-narrative blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Scarcity Frame Designer (ADR-153), which demonstrated a self-contained
analysis library with a dry-run fallback, plan-tier-aware model selection, and
deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-bab-framework-designer.ts`

A self-contained ad creative BAB framework designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce BAB
  frameworks with transformation type, before state, after state, bridge
  mechanism, contrast strength, desire trigger, and BAB pathway, plus
  recommendations.
- Returns a `BABFrameworkDesignerResult` with a `BABStrategy` payload containing
  `frameworks` (BABFramework[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic
  heuristic frameworks based on content length, product, audience, and
  platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_BAB_FRAMEWORK_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-scarcity-frame-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeBABFrameworkDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-bab-framework-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-scarcity-frame-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported
  platforms/transformation types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-bab-framework-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-authority-positioning-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: framework cards with type badges, before state, after
  state, bridge mechanism, BAB pathway, contrast strength bars, desire trigger
  bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses safe lucide icons: Sparkles, Loader2, AlertCircle, Copy, Check,
  TrendingUp.

### 4. Translations

The page uses the `adCreativeBabFrameworkDesigner` namespace via `useI18n`.
Because the `t` function falls back to the key string when a translation is
missing, the page renders correctly without modifying `src/i18n/locales/en.ts`
or any locale files. Keys used: title, subtitle, signInPrompt, skipToContent,
productOrBrand, content, targetAudience, platform, generate, generating,
frameworks, beforeState, afterState, bridgeMechanism, babPathway,
contrastStrength, desireTrigger, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/ad-creative-bab-framework-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`AD_CREATIVE_BAB_FRAMEWORK_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_TRANSFORMATION_TYPES has 8
  transformation types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with frameworks, correct framework structure,
  valid transformation types, contrastStrength/desireTrigger in 0-100 range,
  recommendations present, at least 3 frameworks, works for all four platforms,
  works without platform, deterministic output, rejects invalid/missing input,
  distinct framework types, before/after/bridge states non-empty, BAB pathway
  arrow notation).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic BAB frameworks based on content
length, product, audience, and platform:
- Three transformation types are generated (status_transformation,
  capability_transformation, emotional_transformation) with descriptions shaped
  by the product and audience.
- Contrast strength and desire trigger scores are deterministic, derived from
  content length and framework index, clamped to 0-100.
- Recommendations reference the framework types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured transformation-narrative blueprint that
  helps marketers design ads with deliberate before-after-bridge contrast for
  maximum desire and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Contrast strength and desire trigger scores give marketers
  quantifiable metrics to compare framework effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced
  transformation context that the LLM would catch (e.g., audience-specific
  desire triggers, industry-specific before-state pain points).
- **Negative:** Framework scores in dry-run mode are deterministic
  approximations, not based on real transformation analysis.

## Research Sources

BAB framework design methodology drawn from copywriting psychology,
transformation narrative research, and advertising effectiveness frameworks.
The architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-153 (Ad
Creative Scarcity Frame Designer) for plan-tier-aware model selection.
