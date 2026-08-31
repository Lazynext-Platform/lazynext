# ADR-153: Ad Creative Scarcity Frame Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the scarcity
frames that motivate viewers to act. Scarcity framing — when authentic — is one of the most
powerful conversion drivers in advertising, but it must be deployed carefully to avoid
manipulative pressure that erodes trust. Without a tool to design these scarcity frames,
marketers either overuse artificial urgency (damaging brand credibility) or miss genuine
scarcity opportunities that would have motivated their audience.

An "Ad Creative Scarcity Frame Designer" that uses AI to design scarcity frames in ad
creative content — producing frames with frame type (limited quantity, limited time,
exclusive access, seasonal window, capacity constraint, edition rarity, waitlist demand,
price increase approaching), scarcity signal, urgency element, authenticity marker,
scarcity intensity (0-100), motivation strength (0-100), and frame pathway — would give
users a structured scarcity blueprint that motivates without manipulation.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative
Social Momentum Designer (ADR-149), which demonstrated a self-contained analysis library
with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-scarcity-frame-designer.ts`

A self-contained ad creative scarcity frame designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce scarcity
  frames with frame type, scarcity signal, urgency element, authenticity marker,
  scarcity intensity, motivation strength, and frame pathway, plus recommendations.
- Returns a `ScarcityFrameDesignerResult` with a `FrameStrategy` payload containing
  `frames` (ScarcityFrame[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic scarcity
  frames based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_SCARCITY_FRAME_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-social-momentum-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateAdCreativeScarcityFrameDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-scarcity-frame-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-social-momentum-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/frame types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-scarcity-frame-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-social-momentum-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: frame cards with type badges, scarcity signal, urgency element,
  authenticity marker, scarcity intensity bars, motivation strength bars, frame pathway,
  and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Hourglass, Timer, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp.

### 4. Translations

The page uses the `adCreativeScarcityFrameDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, frames, scarcitySignal, urgencyElement, authenticityMarker,
scarcityIntensity, motivationStrength, framePathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-scarcity-frame-designer.test.ts`

Follows the pattern of `test/ad-creative-social-momentum-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_SCARCITY_FRAME_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_FRAME_TYPES has 8 frame types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with frames, correct frame structure, valid frame
  types, scarcityIntensity/motivationStrength in 0-100 range, recommendations present, at
  least 3 scarcity frames, works for all four platforms, works without platform,
  deterministic output, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic scarcity frames based on content length, product,
audience, and platform:
- Three frame types are generated (limited_quantity, limited_time, exclusive_access) with
  descriptions shaped by the product and audience.
- Scarcity intensity and motivation strength scores are deterministic, derived from content
  length and frame index, clamped to 0-100.
- Recommendations reference the frame types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured scarcity blueprint that helps marketers design
  ads with authentic scarcity framing that motivates without manipulative pressure.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Scarcity intensity and motivation strength scores give marketers
  quantifiable metrics to compare frame effectiveness.
- **Positive:** Authenticity markers explicitly guard against manipulative scarcity tactics,
  promoting ethical advertising practices.
- **Negative:** The heuristic fallback does not account for nuanced context that
  the LLM would catch (e.g., platform-specific urgency dynamics, audience-specific
  scarcity triggers).
- **Negative:** Scarcity scores in dry-run mode are deterministic approximations, not based
  on real market analysis.

## Research Sources

Scarcity framing methodology drawn from scarcity theory, urgency-urgency research, and
ethical persuasion frameworks. The architecture follows the patterns established
in ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback
and ADR-149 (Ad Creative Social Momentum Designer) for plan-tier-aware model selection.
