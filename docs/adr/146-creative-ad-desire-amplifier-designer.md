# ADR-146: Creative Ad Desire Amplifier Designer

**Date:** 2026-10-08
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the desire
amplifiers that intensify viewer desire for the product or outcome. Desire amplifiers — the
techniques that escalate craving and urgency — are what make ads convert by turning passive
interest into active purchase impulse. Without a tool to design these amplifiers, marketers
rely on intuition, producing creative that fails to generate sufficient desire or urgency to
drive action.

A "Creative Ad Desire Amplifier Designer" that uses AI to design desire amplifiers in ad
creative content — producing amplifiers with amplifier type (scarcity, social proof,
aspiration, exclusivity, transformation, pleasure, status, FOMO), desire trigger descriptions,
escalation technique descriptions, craving builder descriptions, desire intensity scores
(0-100), urgency level scores (0-100), and amplification pathway descriptions, plus
recommendations — would give users a structured desire amplification blueprint for their
creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative
Tension Release Designer (ADR-139), which demonstrated a self-contained analysis library with
a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-desire-amplifier-designer.ts`

A self-contained creative ad desire amplifier designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce desire amplifiers with
  amplifier type, desire trigger, escalation technique, craving builder, desire intensity,
  urgency level, and amplification pathway, plus recommendations.
- Returns a `DesireAmplifierDesignerResult` with an `AmplifierStrategy` payload containing
  `amplifiers` (DesireAmplifier[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic amplifiers
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-tension-release-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdDesireAmplifierDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-desire-amplifier-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-tension-release-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/amplifier types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-desire-amplifier-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: amplifier cards with type badges, desire trigger, escalation technique,
  craving builder, amplification pathway, desire intensity bars, urgency level bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses lucide icons (Flame, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp, Zap).
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdDesireAmplifierDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, amplifiers, desireTrigger, escalationTechnique, cravingBuilder,
amplificationPathway, desireIntensity, urgencyLevel, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/creative-ad-desire-amplifier-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_AMPLIFIER_TYPES has 8 amplifier types,
  max lengths for product/content/audience, system prompt and model re-export).
- Type exports (AmplifierType, DesireAmplifier, AmplifierStrategy,
  DesireAmplifierDesignerResult are usable at runtime).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected, valid dryRun boolean).
- Dry-run mode (returns strategy with amplifiers, exactly 3 amplifiers, correct amplifier
  structure, valid amplifier types, desireIntensity/urgencyLevel in 0-100 range,
  recommendations present, works for all four platforms, works without platform,
  deterministic output, varies with content length, rejects invalid/missing input).
- parseDesignerJson behavior (exercised via generateDesireAmplifiers dry-run path which
  returns deterministic heuristic amplifiers).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic desire amplifiers based on content length, product,
audience, and platform:
- Three amplifier types are generated (scarcity_amplifier, social_proof_amplifier,
  aspiration_amplifier) with descriptions shaped by the product and audience.
- Desire intensity and urgency level scores are deterministic, derived from content length
  and amplifier index, clamped to 0-100.
- Recommendations reference the amplifier types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured desire amplification blueprint that helps marketers
  design ads with deliberate craving and urgency escalation for maximum conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Desire intensity and urgency level scores give marketers quantifiable metrics
  to compare amplifier effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced desire context that the
  LLM would catch (e.g., cultural resonance, audience-specific craving triggers).
- **Negative:** Amplifier scores in dry-run mode are deterministic approximations, not based
  on real desire analysis.

## Research Sources

Desire amplifier design methodology drawn from consumer psychology, persuasion theory, and
advertising effectiveness frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-139 (Ad Creative Tension Release Designer) for plan-tier-aware model selection and
credit-cost-based access control.
