# ADR-149: Ad Creative Social Momentum Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the social
momentum that makes viewers feel they're joining a movement. Social momentum — the elements
that build social proof and community energy — is what makes ads feel alive and aspirational,
driving viewers to convert from observers into participants. Without a tool to design these
momentum builders, marketers rely on intuition, producing creative that lacks the social
signals and bandwagon elements that catalyze virality and community formation.

An "Ad Creative Social Momentum Designer" that uses AI to design social momentum in ad
creative content — producing momentum builders with momentum type (viral cascade, community
growth, trend adoption, influencer wave, user-generated wave, milestone celebration,
movement building, collective action), social signal, community evidence, bandwagon element,
momentum velocity (0-100), social proof strength (0-100), and momentum pathway — would give
users a structured social momentum blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative
Tension Release Designer (ADR-139), which demonstrated a self-contained analysis library
with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-social-momentum-designer.ts`

A self-contained ad creative social momentum designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce social momentum
  builders with momentum type, social signal, community evidence, bandwagon element,
  momentum velocity, social proof strength, and momentum pathway, plus recommendations.
- Returns a `SocialMomentumDesignerResult` with a `MomentumStrategy` payload containing
  `momentum` (SocialMomentum[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic momentum
  builders based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_SOCIAL_MOMENTUM_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-tension-release-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeSocialMomentumDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-social-momentum-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-tension-release-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/momentum types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-social-momentum-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: momentum cards with type badges, social signal, community evidence,
  bandwagon element, momentum velocity bars, social proof strength bars, momentum pathway,
  and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Users, TrendingUp, Sparkles, Loader2, AlertCircle, Copy, Check, Rocket.

### 4. Translations

The page uses the `adCreativeSocialMomentumDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, momentum, socialSignal, communityEvidence, bandwagonElement,
momentumVelocity, socialProofStrength, momentumPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-social-momentum-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_SOCIAL_MOMENTUM_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_MOMENTUM_TYPES has 8 momentum types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with momentum, correct momentum structure, valid momentum
  types, momentumVelocity/socialProofStrength in 0-100 range, recommendations present, at
  least 3 momentum builders, works for all four platforms, works without platform,
  deterministic output, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic social momentum builders based on content length, product,
audience, and platform:
- Three momentum types are generated (viral_cascade, community_growth, trend_adoption) with
  descriptions shaped by the product and audience.
- Momentum velocity and social proof strength scores are deterministic, derived from content
  length and momentum index, clamped to 0-100.
- Recommendations reference the momentum types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured social momentum blueprint that helps marketers design
  ads with deliberate social proof and bandwagon elements for maximum virality.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Momentum velocity and social proof strength scores give marketers
  quantifiable metrics to compare momentum builder effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced social context that
  the LLM would catch (e.g., platform-specific social dynamics, audience-specific social
  triggers).
- **Negative:** Momentum scores in dry-run mode are deterministic approximations, not based
  on real social analysis.

## Research Sources

Social momentum design methodology drawn from social proof theory, community formation
research, and viral marketing frameworks. The architecture follows the patterns established
in ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback
and ADR-139 (Ad Creative Tension Release Designer) for plan-tier-aware model selection.
