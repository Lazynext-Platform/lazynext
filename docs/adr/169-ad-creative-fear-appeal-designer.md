# ADR-169: Ad Creative Fear Appeal Designer

**Date:** 2026-10-08
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the fear
appeals that drive action through the fear of loss, risk, or negative outcomes. Fear
appeals — when used ethically and paired with a clear protective action — are one of the
most powerful motivational drivers in advertising, but they must be deployed carefully to
avoid crossing into manipulation or causing viewer paralysis. Without a tool to design
these fear appeals, marketers either overuse exaggerated threats (damaging brand trust)
or miss genuine fear-based motivation opportunities that would have driven their audience
to act.

An "Ad Creative Fear Appeal Designer" that uses AI to design fear appeals in ad
creative content — producing appeals with fear type (health fear, financial fear, social
fear, safety fear, opportunity fear, status fear, regret fear, inaction fear), fear
trigger, consequence scenario, protective action, fear intensity (0-100), action
motivation (0-100), and appeal pathway — would give users a structured fear-appeal
blueprint that motivates without manipulation.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative
Scarcity Frame Designer (ADR-153), which demonstrated a self-contained analysis library
with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic
output.

## Decision

### 1. New library `src/lib/creative/ad-creative-fear-appeal-designer.ts`

A self-contained ad creative fear appeal designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce fear
  appeals with fear type, fear trigger, consequence scenario, protective action,
  fear intensity, action motivation, and appeal pathway, plus recommendations.
- Returns a `FearAppealDesignerResult` with a `FearAppealStrategy` payload containing
  `appeals` (FearAppeal[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic fear
  appeals based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_FEAR_APPEAL_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-scarcity-frame-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeFearAppealDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-fear-appeal-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-scarcity-frame-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/fear types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-fear-appeal-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-scarcity-frame-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: appeal cards with type badges, fear trigger, consequence scenario,
  protective action, fear intensity bars, action motivation bars, appeal pathway,
  and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: AlertTriangle, Shield, Sparkles, Loader2, AlertCircle, Copy, Check.

### 4. Translations

The page uses the `adCreativeFearAppealDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, appeals, fearTrigger, consequenceScenario, protectiveAction,
fearIntensity, actionMotivation, appealPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-fear-appeal-designer.test.ts`

Follows the pattern of `test/ad-creative-scarcity-frame-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_FEAR_APPEAL_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_FEAR_TYPES has 8 fear types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with appeals, correct appeal structure, valid fear
  types, fearIntensity/actionMotivation in 0-100 range, recommendations present, at
  least 3 fear appeals, works for all four platforms, works without platform,
  deterministic output, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic fear appeals based on content length, product,
audience, and platform:
- Three fear types are generated (financial_fear, opportunity_fear, regret_fear) with
  descriptions shaped by the product and audience.
- Fear intensity and action motivation scores are deterministic, derived from content
  length and appeal index, clamped to 0-100.
- Recommendations reference the fear types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured fear-appeal blueprint that helps marketers design
  ads with ethical fear-based motivation that drives action without manipulation.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Fear intensity and action motivation scores give marketers
  quantifiable metrics to compare appeal effectiveness.
- **Positive:** Protective actions explicitly guard against manipulative fear tactics,
  promoting ethical advertising practices.
- **Negative:** The heuristic fallback does not account for nuanced context that
  the LLM would catch (e.g., platform-specific fear dynamics, audience-specific
  fear triggers).
- **Negative:** Fear scores in dry-run mode are deterministic approximations, not based
  on real psychological analysis.

## Research Sources

Fear appeal methodology drawn from fear-drive theory, protection motivation theory, and
ethical persuasion frameworks. The architecture follows the patterns established
in ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback
and ADR-153 (Ad Creative Scarcity Frame Designer) for plan-tier-aware model selection.
