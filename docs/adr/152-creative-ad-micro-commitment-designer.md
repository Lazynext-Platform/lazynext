# ADR-152: Creative Ad Micro-Commitment Designer

**Date:** 2026-10-14
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the micro-commitment
chains that lead viewers toward conversion. Micro-commitments — progressive small commitments
(attention, engagement, click, signup, trial, preference, social, purchase) — are what move
viewers step-by-step from passive scrolling to conversion. Without a tool to design these chains,
marketers rely on intuition, producing commitment paths that either ask too much too soon or fail
to build momentum toward the final conversion action.

A "Creative Ad Micro-Commitment Designer" that uses AI to design micro-commitment chains in ad
creative content — producing commitments with commitment type (attention, engagement, click,
signup, trial, preference, social, purchase), commitment trigger descriptions, friction level
descriptions, next commitment cue descriptions, commitment momentum scores (0-100), conversion
probability scores (0-100), and commitment pathways — would give users a structured commitment
blueprint for their creative.

The patterns were drawn from the Creative Ad Urgency Catalyst Designer (ADR-148) and the
Ad Creative Tension Release Designer (ADR-139), which demonstrated a self-contained analysis
library with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic
output.

## Decision

### 1. New library `src/lib/creative/creative-ad-micro-commitment-designer.ts`

A self-contained creative ad micro-commitment designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce micro-commitments
  with commitment type, commitment trigger, friction level, next commitment cue, commitment
  momentum, conversion probability, and commitment pathway, plus recommendations.
- Returns a `MicroCommitmentDesignerResult` with a `CommitmentStrategy` payload containing
  `commitments` (MicroCommitment[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic commitments
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_MICRO_COMMITMENT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-ad-urgency-catalyst-designer.ts` and
`ad-creative-tension-release-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdMicroCommitmentDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-micro-commitment-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-ad-urgency-catalyst-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/commitment types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-micro-commitment-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-ad-urgency-catalyst-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: commitment cards with type badges, commitment trigger, friction level,
  next commitment cue, commitment pathway, commitment momentum bars, conversion probability
  bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Uses lucide icons (MousePointerClick, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp,
  ArrowRight).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdMicroCommitmentDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, commitments, commitmentTrigger, frictionLevel, nextCommitmentCue,
commitmentMomentum, conversionProbability, commitmentPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/creative-ad-micro-commitment-designer.test.ts`

Follows the pattern of `test/creative-ad-urgency-catalyst-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_MICRO_COMMITMENT_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_COMMITMENT_TYPES has 8 commitment types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with commitments, correct commitment structure, valid
  commitment types, commitmentMomentum/conversionProbability in 0-100 range, recommendations
  present, exactly 4 commitments in a progressive chain, works for all four platforms, works
  without platform, deterministic output, rejects invalid/missing input, progressive momentum).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic micro-commitments based on content length, product,
audience, and platform:
- Four commitment types are generated in a progressive chain (attention_commitment,
  engagement_commitment, click_commitment, signup_commitment) with descriptions shaped by the
  product and audience.
- Commitment momentum and conversion probability scores are deterministic, derived from content
  length and commitment index, clamped to 0-100.
- Recommendations reference the commitment types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured commitment blueprint that helps marketers design ads with
  deliberate micro-commitment chains for maximum conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Commitment momentum and conversion probability scores give marketers
  quantifiable metrics to compare commitment effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced commitment context that
  the LLM would catch (e.g., audience-specific friction points, platform-specific commitment
  patterns).
- **Negative:** Commitment scores in dry-run mode are deterministic approximations, not based
  on real commitment analysis.

## Research Sources

Micro-commitment chain design methodology drawn from behavioral economics, conversion psychology,
and progressive commitment frameworks. The architecture follows the patterns established
in ADR-148 (Creative Ad Urgency Catalyst Designer) for self-contained library design with
dry-run fallback and ADR-139 (Ad Creative Tension Release Designer) for plan-tier-aware model
selection.
