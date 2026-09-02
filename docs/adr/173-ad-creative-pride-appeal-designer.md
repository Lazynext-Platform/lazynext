# ADR-173: Ad Creative Pride Appeal Designer

**Date:** 2026-10-21
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
pride appeals that tap into self-worth, status, accomplishment, and identity
pride. Pride appeals — the deliberate self-worth/status/accomplishment signals
that activate a viewer's sense of pride and motivate action — are what make ads
personally resonant and conversion-driving. Without a tool to design these
appeals, marketers rely on intuition, producing ads that fail to leverage the
specific pride types viewers respond to (achievement pride, status pride,
craftsmanship pride, heritage pride, identity pride, ownership pride,
transformation pride, recognition pride) and lose the emotional pull that drives
purchase.

An "Ad Creative Pride Appeal Designer" that uses AI to design pride appeals in ad
creative content — producing appeals with pride type (achievement pride, status
pride, craftsmanship pride, heritage pride, identity pride, ownership pride,
transformation pride, recognition pride), pride trigger descriptions,
achievement element descriptions, status signal descriptions, pride intensity
scores (0-100), self-worth boost scores (0-100), and appeal pathway
descriptions — would give users a structured pride-building blueprint for their
creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Scarcity Frame Designer (ADR-163), which demonstrated a self-contained
analysis library with a dry-run fallback, plan-tier-aware model selection, and
deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-pride-appeal-designer.ts`

A self-contained ad creative pride appeal designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce pride
  appeals with pride type, pride trigger, achievement element, status signal,
  pride intensity, self-worth boost, and appeal pathway, plus recommendations.
- Returns a `PrideAppealDesignerResult` with a `PrideStrategy` payload
  containing `appeals` (PrideAppeal[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  appeals based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_PRIDE_APPEAL_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-scarcity-frame-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativePrideAppealDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-pride-appeal-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-scarcity-frame-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/pride
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-pride-appeal-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-scarcity-frame-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: appeal cards with type badges, pride trigger, achievement
  element, status signal, appeal pathway, pride intensity bars, self-worth boost
  bars, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativePrideAppealDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, appeals, prideTrigger, achievementElement, statusSignal,
prideIntensity, selfWorthBoost, appealPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-pride-appeal-designer.test.ts`

Follows the pattern of `test/ad-creative-scarcity-frame-designer.test.ts`.
Tests cover:
- Credit cost (`AD_CREATIVE_PRIDE_APPEAL_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_PRIDE_TYPES has 8
  pride types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with appeals, correct appeal structure, valid
  pride types, prideIntensity/selfWorthBoost in 0-100 range, recommendations
  present, at least 3 appeals, works for all four platforms, works without
  platform, deterministic output, rejects invalid/missing input, distinct
  appeal types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic pride appeals based on content
length, product, audience, and platform:
- Three pride types are generated (achievement_pride, status_pride,
  craftsmanship_pride) with descriptions shaped by the product and audience.
- Pride intensity and self-worth boost scores are deterministic, derived from
  content length and appeal index, clamped to 0-100.
- Recommendations reference the pride types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured pride-building blueprint that helps
  marketers design ads with deliberate self-worth/status/accomplishment signals
  for maximum emotional resonance and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Pride intensity and self-worth boost scores give marketers
  quantifiable metrics to compare appeal effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced pride context
  that the LLM would catch (e.g., audience-specific pride triggers, cultural
  status markers, identity-specific accomplishment references).
- **Negative:** Appeal scores in dry-run mode are deterministic approximations,
  not based on real pride analysis.

## Research Sources

Pride appeal design methodology drawn from self-worth psychology, status
signaling research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-163 (Ad Creative
Scarcity Frame Designer) for plan-tier-aware model selection.
