# ADR-156: Creative Ad Offer Architecture Designer

**Date:** 2026-10-14
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to structure
the core offer, bonuses, premiums, and stack presentation for maximum perceived
value. Offer architecture — the deliberate structuring of the core offer, bonus
stacks, premium tiers, guarantee layers, fast-action bonuses, bundle components,
upgrade paths, and payment options — is what makes ads convert by inflating
perceived value and guiding the viewer through a compelling purchase pathway.
Without a tool to design these offer architectures, marketers rely on intuition,
producing ads that fail to leverage the specific offer components viewers need to
perceive exceptional value (core offers, bonus stacks, premium tiers, guarantee
layers, fast-action bonuses, bundle components, upgrade paths, payment options)
and lose conversions at the moment of decision.

A "Creative Ad Offer Architecture Designer" that uses AI to design offer
architectures in ad creative content — producing architectures with offer
component type (core offer, bonus stack, premium tier, guarantee layer,
fast-action bonus, bundle component, upgrade path, payment option), offer element
descriptions, value anchor descriptions, stack position descriptions, perceived
value scores (0-100), conversion lift scores (0-100), and offer pathway
descriptions — would give users a structured offer-building blueprint for their
creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the
Creative Ad Micro-Commitment Designer (ADR-153), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-offer-architecture-designer.ts`

A self-contained creative ad offer architecture designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce offer
  architectures with component type, offer element, value anchor, stack position,
  perceived value, conversion lift, and offer pathway, plus recommendations.
- Returns a `OfferArchitectureDesignerResult` with a `OfferStrategy` payload
  containing `architectures` (OfferArchitecture[]) and `recommendations`
  (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  architectures based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_OFFER_ARCHITECTURE_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`creative-ad-micro-commitment-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdOfferArchitectureDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-offer-architecture-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/offer
  component types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-offer-architecture-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: architecture cards with type badges, offer element,
  value anchor, stack position, offer pathway, perceived value bars,
  conversion lift bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdOfferArchitectureDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, architectures, offerElement, valueAnchor, stackPosition,
perceivedValue, conversionLift, offerPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/creative-ad-offer-architecture-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`CREATIVE_AD_OFFER_ARCHITECTURE_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_OFFER_COMPONENT_TYPES has 8
  offer component types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with architectures, correct architecture
  structure, valid offer component types, perceivedValue/conversionLift in 0-100
  range, recommendations present, at least 3 architectures, works for all four
  platforms, works without platform, deterministic output, rejects
  invalid/missing input, distinct architecture types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic offer architectures based on
content length, product, audience, and platform:
- Four offer component types are generated (core_offer, bonus_stack,
  premium_tier, guarantee_layer) with descriptions shaped by the product and
  audience.
- Perceived value and conversion lift scores are deterministic, derived
  from content length and architecture index, clamped to 0-100.
- Recommendations reference the architecture types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured offer-building blueprint that helps
  marketers design ads with deliberate offer components for maximum perceived
  value and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Perceived value and conversion lift scores give marketers
  quantifiable metrics to compare offer component effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced offer
  context that the LLM would catch (e.g., industry-specific pricing benchmarks,
  audience-specific value perceptions).
- **Negative:** Architecture scores in dry-run mode are deterministic
  approximations, not based on real offer analysis.

## Research Sources

Offer architecture design methodology drawn from pricing psychology, value
stack research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-153 (Creative Ad
Micro-Commitment Designer) for plan-tier-aware model selection.
