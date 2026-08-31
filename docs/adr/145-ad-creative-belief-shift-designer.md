# ADR-145: Ad Creative Belief Shift Designer

**Date:** 2026-10-07
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the cognitive
journey that moves viewers from their current beliefs to new beliefs about the product or
category. Belief shifts — the deliberate reframing of what a viewer believes — are what make
ads persuasive and durable. Without a tool to design these shifts, marketers rely on intuition,
producing ads that fail to change minds or leave lasting impressions.

An "Ad Creative Belief Shift Designer" that uses AI to design belief shifts in ad creative
content — producing shifts with shift type (myth busting, paradigm shift, assumption challenge,
reputation reframe, comparison shift, evidence revelation, authority transfer, experience
reframe), current belief, target belief, evidence anchor, shift strength scores (0-100),
conviction level scores (0-100), and shift pathway descriptions — would give users a structured
cognitive blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative Tension
Release Designer (ADR-139), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-belief-shift-designer.ts`

A self-contained ad creative belief shift designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce belief shifts with shift
  type, current belief, target belief, evidence anchor, shift strength, conviction level, and
  shift pathway, plus recommendations.
- Returns a `BeliefShiftDesignerResult` with a `ShiftStrategy` payload containing `shifts`
  (`BeliefShift[]`) and `recommendations` (`string[]`).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic shifts based
  on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_BELIEF_SHIFT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-tension-release-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeBeliefShiftDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-belief-shift-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/shift types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-belief-shift-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: shift cards with type badges, current belief, target belief, evidence
  anchor, shift pathway, shift strength bars, conviction level bars, and recommendations with
  a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses lucide icons (Brain, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp, Target).
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeBeliefShiftDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, shifts, currentBelief, targetBelief, evidenceAnchor, shiftPathway,
shiftStrength, convictionLevel, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-belief-shift-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_BELIEF_SHIFT_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_SHIFT_TYPES has 8 shift types, max
  lengths for product/content/audience, system prompt is non-empty, model constant is a
  string).
- Type exports (ShiftType, BeliefShift, ShiftStrategy, BeliefShiftDesignerResult interfaces
  are structurally valid).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected, whitespace-only product
  rejected).
- Dry-run mode (returns strategy with shifts, exactly 3 shifts, correct shift structure,
  valid shift types, shiftStrength/convictionLevel in 0-100 range, recommendations present,
  works for all four platforms, works without platform, deterministic output, output varies
  with different content, recommendations reference product/platform, shifts reference
  brand/audience, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic belief shifts based on content length, product, audience, and
platform:
- Three shift types are generated (myth_busting, paradigm_shift, evidence_revelation) with
  descriptions shaped by the product and audience.
- Shift strength and conviction level scores are deterministic, derived from content length
  and shift index, clamped to 0-100.
- Recommendations reference the shift types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured cognitive blueprint that helps marketers design ads with
  deliberate belief shifts for maximum persuasion and lasting impression.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Shift strength and conviction level scores give marketers quantifiable metrics
  to compare shift effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced cognitive context that
  the LLM would catch (e.g., cultural beliefs, audience-specific mental models).
- **Negative:** Shift scores in dry-run mode are deterministic approximations, not based on
  real belief-change analysis.

## Research Sources

Belief-shift design methodology drawn from persuasion theory, cognitive reframing research,
and advertising effectiveness frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback,
ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection, and ADR-139 (Ad Creative
Tension Release Designer) for the emotional/cognitive design tool pattern.
