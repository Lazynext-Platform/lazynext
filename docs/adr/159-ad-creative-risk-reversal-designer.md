# ADR-159: Ad Creative Risk Reversal Designer

**Date:** 2026-10-17
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
risk reversals that remove purchase risk before it can block conversion. Risk
reversals — the deliberate guarantee, warranty, free-trial, and money-back
framing that removes purchase friction — are what make ads convert by shifting
the viewer's perception from spending to trying. Without a tool to design these
risk reversals, marketers rely on intuition, producing ads that fail to leverage
the specific reversal mechanisms viewers need to feel safe purchasing (money-back
guarantees, free trials, warranty coverage, satisfaction guarantees, risk-free
trials, deposit refunds, performance guarantees, cancellation freedom) and lose
conversions at the moment of hesitation.

An "Ad Creative Risk Reversal Designer" that uses AI to design risk reversals in
ad creative content — producing reversals with reversal type (money-back
guarantee, free trial, warranty coverage, satisfaction guarantee, risk-free
trial, deposit refund, performance guarantee, cancellation freedom), risk removed
descriptions, guarantee mechanism descriptions, trust signal descriptions, risk
reduction scores (0-100), buyer confidence scores (0-100), and reversal pathway
descriptions — would give users a structured risk-reversal blueprint for their
creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Objection Neutralizer Designer (ADR-151), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-risk-reversal-designer.ts`

A self-contained ad creative risk reversal designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce risk
  reversals with reversal type, risk removed, guarantee mechanism, trust signal,
  risk reduction, buyer confidence, and reversal pathway, plus recommendations.
- Returns a `RiskReversalDesignerResult` with a `ReversalStrategy` payload
  containing `reversals` (RiskReversal[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  reversals based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_RISK_REVERSAL_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-objection-neutralizer-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeRiskReversalDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-risk-reversal-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/reversal
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-risk-reversal-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: reversal cards with type badges, risk removed,
  guarantee mechanism, trust signal, reversal pathway, risk reduction bars,
  buyer confidence bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeRiskReversalDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, reversals, riskRemoved, guaranteeMechanism, trustSignal,
riskReduction, buyerConfidence, reversalPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-risk-reversal-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`AD_CREATIVE_RISK_REVERSAL_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_REVERSAL_TYPES has 8
  reversal types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with reversals, correct reversal structure,
  valid reversal types, riskReduction/buyerConfidence in 0-100 range,
  recommendations present, at least 3 reversals, works for all four platforms,
  works without platform, deterministic output, rejects invalid/missing input,
  distinct reversal types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic risk reversals based on
content length, product, audience, and platform:
- Three reversal types are generated (money_back_guarantee, free_trial,
  performance_guarantee) with descriptions shaped by the product and audience.
- Risk reduction and buyer confidence scores are deterministic, derived
  from content length and reversal index, clamped to 0-100.
- Recommendations reference the reversal types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured risk-reversal blueprint that helps
  marketers design ads with deliberate guarantee/warranty/trial framing for
  maximum conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Risk reduction and buyer confidence scores give marketers
  quantifiable metrics to compare reversal effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced risk
  context that the LLM would catch (e.g., industry-specific guarantee norms,
  audience-specific risk sensitivities).
- **Negative:** Reversal scores in dry-run mode are deterministic
  approximations, not based on real risk analysis.

## Research Sources

Risk reversal design methodology drawn from consumer psychology, purchase
friction research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-151 (Ad Creative
Objection Neutralizer Designer) for plan-tier-aware model selection.
