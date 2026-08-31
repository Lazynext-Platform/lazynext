# ADR-164: Creative Ad Loss Aversion Framing Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
loss aversion frameworks that motivate viewers to act. Loss aversion framing —
highlighting what the user loses by not acting — is one of the most powerful
conversion drivers in advertising, grounded in prospect theory and the
well-documented psychological principle that losses loom larger than gains.
Without a tool to design these loss aversion frameworks, marketers either
underuse loss framing (missing a potent motivator) or deploy it ineffectively
(vague, unquantified, or overwhelming).

A "Creative Ad Loss Aversion Framing Designer" that uses AI to design loss
aversion frameworks in ad creative content — producing frameworks with loss type
(opportunity loss, time loss, money loss, status loss, relationship loss, health
loss, growth loss, peace of mind loss), loss scenario, what they lose, cost of
inaction, loss salience (0-100), urgency intensity (0-100), and loss aversion
pathway — would give users a structured loss aversion blueprint that frames
messages around what the user loses by not acting.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Scarcity Frame Designer (ADR-153), which demonstrated a self-contained
analysis library with a dry-run fallback, plan-tier-aware model selection, and
deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-loss-aversion-framing-designer.ts`

A self-contained creative ad loss aversion framing designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce loss
  aversion frameworks with loss type, loss scenario, what they lose, cost of
  inaction, loss salience, urgency intensity, and loss aversion pathway, plus
  recommendations.
- Returns a `LossAversionFrameworkDesignerResult` with a `LossAversionStrategy`
  payload containing `frameworks` (LossAversionFramework[]) and
  `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic
  heuristic loss aversion frameworks based on content length, product,
  audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_LOSS_AVERSION_FRAMING_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-scarcity-frame-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum`/`asObj`/`asStrArr` helpers, `isDryRun()` detection,
`validateCreativeAdLossAversionFramingDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-loss-aversion-framing-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-scarcity-frame-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/loss types
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-loss-aversion-framing-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-scarcity-frame-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: framework cards with type badges, loss scenario, what they
  lose, cost of inaction, loss salience bars, urgency intensity bars, loss
  aversion pathway, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: AlertTriangle, TrendingDown, Sparkles, Loader2,
  AlertCircle, Copy, Check, Clock.

### 4. Translations

The page uses the `creativeAdLossAversionFramingDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, frameworks, lossScenario, whatTheyLose, costOfInaction,
lossSalience, urgencyIntensity, lossAversionPathway, recommendations, copy,
copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-loss-aversion-framing-designer.test.ts`

Follows the pattern of `test/ad-creative-scarcity-frame-designer.test.ts`.
Tests cover:
- Credit cost (`CREATIVE_AD_LOSS_AVERSION_FRAMING_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_LOSS_TYPES has 8 loss types,
  max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected).
- Dry-run mode (returns strategy with frameworks, correct framework structure,
  valid loss types, lossSalience/urgencyIntensity in 0-100 range,
  recommendations present, at least 3 loss aversion frameworks, works for all
  four platforms, works without platform, deterministic output, includes the
  three deterministic loss types, non-empty loss scenarios/costs/pathways,
  rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic loss aversion frameworks based on
content length, product, audience, and platform:
- Three loss types are generated (opportunity_loss, time_loss, money_loss) with
  descriptions shaped by the product and audience.
- Loss salience and urgency intensity scores are deterministic, derived from
  content length and framework index, clamped to 0-100.
- Recommendations reference the loss types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured loss aversion blueprint that helps
  marketers design ads that frame messages around what the user loses by not
  acting, leveraging the well-documented power of loss aversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Loss salience and urgency intensity scores give marketers
  quantifiable metrics to compare framework effectiveness.
- **Positive:** Eight distinct loss types give marketers a rich vocabulary to
  match the loss frame to the audience's specific fears and motivations.
- **Negative:** The heuristic fallback does not account for nuanced context that
  the LLM would catch (e.g., platform-specific loss dynamics, audience-specific
  loss triggers).
- **Negative:** Loss salience and urgency intensity scores in dry-run mode are
  deterministic approximations, not based on real audience research.

## Research Sources

Loss aversion framing methodology drawn from prospect theory (Kahneman &
Tversky), loss-aversion research, and ethical persuasion frameworks. The
architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-153 (Ad
Creative Scarcity Frame Designer) for plan-tier-aware model selection and the
exact self-contained library pattern.
