# ADR-160: Creative Ad FAB Framework Designer

**Date:** 2026-10-14
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to translate product features
into advantages and benefits that resonate with their audience. The FAB (Feature, Advantage,
Benefit) framework is a proven copywriting structure that connects what a product does (feature),
why it is better than alternatives (advantage), and what the user gains (benefit). Without a tool
to design these frameworks, marketers rely on intuition, producing messaging that lists features
without translating them into compelling, audience-specific benefits.

A "Creative Ad FAB Framework Designer" that uses AI to translate product features into advantages
and emotional/functional benefits — producing frameworks with benefit type (functional, emotional,
social, financial, time, status, safety, convenience), feature descriptions, advantage
descriptions, benefit statements, feature appeal scores (0-100), benefit resonance scores
(0-100), and FAB pathways — would give users a structured benefit blueprint for their creative.

The patterns were drawn from the Creative Ad Micro-Commitment Designer (ADR-152) and the
Creative Ad Urgency Catalyst Designer (ADR-148), which demonstrated a self-contained analysis
library with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic
output.

## Decision

### 1. New library `src/lib/creative/creative-ad-fab-framework-designer.ts`

A self-contained creative ad FAB framework designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce FAB frameworks
  with benefit type, feature, advantage, benefit statement, feature appeal, benefit
  resonance, and FAB pathway, plus recommendations.
- Returns a `FABFrameworkDesignerResult` with a `FABStrategy` payload containing
  `frameworks` (FABFramework[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic frameworks
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_FAB_FRAMEWORK_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-ad-micro-commitment-designer.ts` and
`creative-ad-urgency-catalyst-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdFABFrameworkDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-fab-framework-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-ad-micro-commitment-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/benefit types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-fab-framework-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-ad-micro-commitment-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: framework cards with benefit type badges, feature, advantage,
  benefit statement, FAB pathway, feature appeal bars, benefit resonance bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Uses lucide icons (Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp, Star, Award).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdFABFrameworkDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, frameworks, feature, advantage, benefitStatement, featureAppeal,
benefitResonance, fabPathway, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-fab-framework-designer.test.ts`

Follows the pattern of `test/creative-ad-micro-commitment-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_FAB_FRAMEWORK_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_BENEFIT_TYPES has 8 benefit types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with frameworks, correct framework structure, valid
  benefit types, featureAppeal/benefitResonance in 0-100 range, recommendations
  present, exactly 3 frameworks with distinct benefit types, works for all four platforms,
  works without platform, deterministic output, rejects invalid/missing input, progressive
  appeal, non-empty benefit statements and pathways, recommendation count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic FAB frameworks based on content length, product,
audience, and platform:
- Three benefit types are generated (functional_benefit, emotional_benefit,
  convenience_benefit) with descriptions shaped by the product and audience.
- Feature appeal and benefit resonance scores are deterministic, derived from content
  length and framework index, clamped to 0-100.
- Recommendations reference the benefit types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured benefit blueprint that helps marketers translate features
  into compelling advantages and benefits for maximum resonance.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Feature appeal and benefit resonance scores give marketers
  quantifiable metrics to compare benefit effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced benefit context that
  the LLM would catch (e.g., audience-specific emotional triggers, platform-specific
  benefit framing).
- **Negative:** Benefit scores in dry-run mode are deterministic approximations, not based
  on real benefit analysis.

## Research Sources

FAB framework methodology drawn from copywriting and marketing psychology, feature-benefit
translation frameworks, and benefit segmentation theory. The architecture follows the patterns
established in ADR-152 (Creative Ad Micro-Commitment Designer) for self-contained library
design with dry-run fallback and ADR-148 (Creative Ad Urgency Catalyst Designer) for
plan-tier-aware model selection.
