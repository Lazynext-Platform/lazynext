# ADR-158: Creative Ad Price Framing Designer

**Date:** 2026-10-21
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
price framing that anchors a product's price against a higher reference point,
cost-per-use, or value-per-outcome so the price feels fair, small, or worth it.
Price framings — the deliberate anchoring and reframing techniques that shift
the viewer's price perception — are what make ads convert at the moment of
purchase hesitation. Without a tool to design these framings, marketers rely on
intuition, producing ads that fail to leverage the specific framing techniques
viewers need to accept the price (reference anchor, cost per use, value per
outcome, payment breakdown, comparison anchor, sacrifice reframe, investment
frame, bundle savings) and lose conversions at the moment of price resistance.

A "Creative Ad Price Framing Designer" that uses AI to design price framings in
ad creative content — producing framings with framing type (reference anchor,
cost per use, value per outcome, payment breakdown, comparison anchor, sacrifice
reframe, investment frame, bundle savings), price anchor descriptions, reframe
technique descriptions, value comparison descriptions, anchor strength scores
(0-100), price acceptance scores (0-100), and framing pathway descriptions —
would give users a structured price-perception blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the
Creative Ad Identity Alignment Designer (ADR-154), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-price-framing-designer.ts`

A self-contained creative ad price framing designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce price
  framings with framing type, price anchor, reframe technique, value
  comparison, anchor strength, price acceptance, and framing pathway, plus
  recommendations.
- Returns a `PriceFramingDesignerResult` with a `PriceFramingStrategy` payload
  containing `framings` (PriceFraming[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic
  heuristic framings based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_PRICE_FRAMING_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`creative-ad-identity-alignment-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdPriceFramingDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-price-framing-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/creative-ad-identity-alignment-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/framing
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-price-framing-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-authority-positioning-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: framing cards with type badges, price anchor, reframe
  technique, value comparison, framing pathway, anchor strength bars, price
  acceptance bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses safe lucide icons: Sparkles, Loader2, AlertCircle, Copy, Check,
  TrendingUp.

### 4. Translations

The page uses the `creativeAdPriceFramingDesigner` namespace via `useI18n`.
Because the `t` function falls back to the key string when a translation is
missing, the page renders correctly without modifying `src/i18n/locales/en.ts`
or any locale files. Keys used: title, subtitle, signInPrompt, skipToContent,
productOrBrand, content, targetAudience, platform, generate, generating,
framings, priceAnchor, reframeTechnique, valueComparison, framingPathway,
anchorStrength, priceAcceptance, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/creative-ad-price-framing-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`CREATIVE_AD_PRICE_FRAMING_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_FRAMING_TYPES has 8 framing
  types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with framings, correct framing structure,
  valid framing types, anchorStrength/priceAcceptance in 0-100 range,
  recommendations present, at least 3 framings, works for all four platforms,
  works without platform, deterministic output, rejects invalid/missing input,
  distinct framing types, price anchor/reframe/value non-empty, framing pathway
  non-empty).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic price framings based on content
length, product, audience, and platform:
- Three framing types are generated (reference_anchor, cost_per_use,
  value_per_outcome) with descriptions shaped by the product and audience.
- Anchor strength and price acceptance scores are deterministic, derived from
  content length and framing index, clamped to 0-100.
- Recommendations reference the framing types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured price-perception blueprint that helps
  marketers design ads with deliberate price anchoring and reframing for maximum
  price acceptance and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Anchor strength and price acceptance scores give marketers
  quantifiable metrics to compare framing effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced pricing
  context that the LLM would catch (e.g., audience-specific price sensitivity,
  industry-specific anchor benchmarks).
- **Negative:** Framing scores in dry-run mode are deterministic
  approximations, not based on real price perception analysis.

## Research Sources

Price framing design methodology drawn from behavioral economics, price
anchoring research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-154 (Creative Ad
Identity Alignment Designer) for plan-tier-aware model selection.
