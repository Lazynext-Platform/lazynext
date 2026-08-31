# ADR-150: Creative Ad Value Ladder Designer

**Date:** 2026-10-12
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the value ladder —
the progressive value steps that guide viewers from initial interest to deeper commitment. A
value ladder is the deliberate sequence of escalating value propositions, each reducing friction
and increasing perceived value, that moves a viewer from awareness through trial to loyalty.
Without a tool to design these ladders, marketers rely on intuition, producing ad creative that
fails to systematically progress viewers toward conversion and long-term engagement.

A "Creative Ad Value Ladder Designer" that uses AI to design value ladders in ad creative content
— producing steps with step type (awareness, interest, trial, commitment, adoption, expansion,
advocacy, loyalty), value proposition, commitment level, next step trigger, perceived value
(0-100), commitment friction (0-100), and ladder progression — would give users a structured
value progression blueprint for their creative.

The patterns were drawn from the Ad Creative Tension Release Designer (ADR-139) and the Creative
Quality Scorer (ADR-098), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-value-ladder-designer.ts`

A self-contained creative ad value ladder designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce value ladder steps with
  step type, value proposition, commitment level, next step trigger, perceived value, commitment
  friction, and ladder progression, plus recommendations.
- Returns a `ValueLadderDesignerResult` with a `LadderStrategy` payload containing `steps`
  (ValueLadderStep[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic steps based on
  content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_VALUE_LADDER_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `ad-creative-tension-release-designer.ts` and
`creative-quality-scorer.ts`: self-contained types, `extractJson`/`asStr`/`asNum` helpers,
`isDryRun()` detection, `validateCreativeAdValueLadderDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-value-ladder-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-tension-release-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/step types (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-value-ladder-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: step cards with type badges, value proposition, commitment level, next step
  trigger, ladder progression, perceived value bars, commitment friction bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Stairs, TrendingUp, Sparkles, Loader2, AlertCircle, Copy, Check, ArrowUp.

### 4. Translations

The page uses the `creativeAdValueLadderDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, steps, valueProposition, commitmentLevel, nextStepTrigger, perceivedValue,
commitmentFriction, ladderProgression, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-value-ladder-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_VALUE_LADDER_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_STEP_TYPES has 8 step types, max lengths for
  product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted,
  non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with steps, correct step structure, valid step types,
  perceivedValue/commitmentFriction in 0-100 range, recommendations present, at least 4 steps,
  exactly 4 deterministic steps, works for all four platforms, works without platform,
  deterministic output, step types progress through the ladder, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic value ladder steps based on content length, product, audience, and
platform:
- Four step types are generated (awareness_step, interest_step, trial_step, commitment_step)
  with descriptions shaped by the product and audience.
- Perceived value and commitment friction scores are deterministic, derived from content length
  and step index, clamped to 0-100.
- Recommendations reference the step types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured value progression blueprint that helps marketers design ads
  with deliberate value ladders that guide viewers from awareness to commitment.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Perceived value and commitment friction scores give marketers quantifiable
  metrics to compare step effectiveness and identify friction bottlenecks.
- **Negative:** The heuristic fallback does not account for nuanced value perception that the
  LLM would catch (e.g., audience-specific value drivers, cultural context, brand positioning).
- **Negative:** Step scores in dry-run mode are deterministic approximations, not based on real
  value analysis.

## Research Sources

Value ladder design methodology drawn from marketing funnel theory, customer journey mapping,
and conversion optimization frameworks. The architecture follows the patterns established in
ADR-139 (Ad Creative Tension Release Designer) for self-contained library design with dry-run
fallback and ADR-098 (Creative Quality Scorer) for plan-tier-aware model selection.
