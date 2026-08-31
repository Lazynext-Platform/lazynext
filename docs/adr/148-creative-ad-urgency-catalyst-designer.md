# ADR-148: Creative Ad Urgency Catalyst Designer

**Date:** 2026-10-10
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the urgency
catalysts that drive immediate action without being pushy. Urgency catalysts — the elements
that create immediate action urgency (time scarcity, opportunity windows, event tie-ins,
stock pressure, price deadlines, social FOMO, consequence forecasts, momentum riding) — are
what make ads convert viewers into actors. Without a tool to design these catalysts,
marketers rely on intuition, producing urgency that either feels manipulative or fails to
motivate action.

A "Creative Ad Urgency Catalyst Designer" that uses AI to design urgency catalysts in ad
creative content — producing catalysts with catalyst type (time scarcity, opportunity
window, event tie-in, stock pressure, price deadline, social FOMO, consequence forecast,
momentum riding), urgency trigger descriptions, time pressure element descriptions, action
driver descriptions, urgency intensity scores (0-100), action probability scores (0-100),
and catalyst pathways — would give users a structured urgency blueprint for their creative.

The patterns were drawn from the Ad Creative Tension Release Designer (ADR-139) and the
Creative Quality Scorer (ADR-098), which demonstrated a self-contained analysis library
with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-urgency-catalyst-designer.ts`

A self-contained creative ad urgency catalyst designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce urgency catalysts
  with catalyst type, urgency trigger, time pressure element, action driver, urgency
  intensity, action probability, and catalyst pathway, plus recommendations.
- Returns a `UrgencyCatalystDesignerResult` with a `CatalystStrategy` payload containing
  `catalysts` (UrgencyCatalyst[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic catalysts
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_URGENCY_CATALYST_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `ad-creative-tension-release-designer.ts` and
`creative-quality-scorer.ts`: self-contained types, `extractJson`/`asStr`/`asNum` helpers,
`isDryRun()` detection, `validateCreativeAdUrgencyCatalystDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-urgency-catalyst-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-tension-release-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/catalyst types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-urgency-catalyst-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: catalyst cards with type badges, urgency trigger, time pressure element,
  action driver, catalyst pathway, urgency intensity bars, action probability bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Uses lucide icons (Zap, Clock, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdUrgencyCatalystDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, catalysts, urgencyTrigger, timePressureElement, actionDriver,
urgencyIntensity, actionProbability, catalystPathway, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/creative-ad-urgency-catalyst-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_URGENCY_CATALYST_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_CATALYST_TYPES has 8 catalyst types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with catalysts, correct catalyst structure, valid catalyst
  types, urgencyIntensity/actionProbability in 0-100 range, recommendations present, at
  least 3 catalysts, works for all four platforms, works without platform, deterministic
  output, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic urgency catalysts based on content length, product,
audience, and platform:
- Three catalyst types are generated (time_scarcity, opportunity_window, social_fomo) with
  descriptions shaped by the product and audience.
- Urgency intensity and action probability scores are deterministic, derived from content
  length and catalyst index, clamped to 0-100.
- Recommendations reference the catalyst types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured urgency blueprint that helps marketers design ads with
  deliberate urgency catalysts for maximum conversion without being pushy.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Urgency intensity and action probability scores give marketers quantifiable
  metrics to compare catalyst effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced urgency context that
  the LLM would catch (e.g., cultural resonance, audience-specific urgency triggers).
- **Negative:** Catalyst scores in dry-run mode are deterministic approximations, not based
  on real urgency analysis.

## Research Sources

Urgency catalyst design methodology drawn from behavioral economics, conversion psychology,
and advertising effectiveness frameworks. The architecture follows the patterns established
in ADR-139 (Ad Creative Tension Release Designer) for self-contained library design with
dry-run fallback and ADR-098 (Creative Quality Scorer) for plan-tier-aware model selection.
