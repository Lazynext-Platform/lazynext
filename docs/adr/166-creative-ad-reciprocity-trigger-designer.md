# ADR-166: Creative Ad Reciprocity Trigger Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
reciprocity frameworks that trigger reciprocity and motivate viewers to act.
Reciprocity — the principle of value-first giving — is one of the most powerful
conversion drivers in advertising, but it must be deployed authentically to
avoid feeling transactional or manipulative. Without a tool to design these
reciprocity frameworks, marketers either skip value-first giving entirely
(missing conversion opportunities) or deliver low-value "gifts" that fail to
trigger genuine reciprocity.

A "Creative Ad Reciprocity Trigger Designer" that uses AI to design reciprocity
frameworks in ad creative content — producing frameworks with reciprocity type
(free value, educational gift, tool access, content gift, community access,
expert advice, exclusive resource, personalized help), gift description,
recipient value, implied reciprocity, gift impact (0-100), reciprocity
likelihood (0-100), and reciprocity pathway — would give users a structured
reciprocity blueprint that triggers genuine reciprocation without manipulation.

The patterns were drawn from the Ad Creative Scarcity Frame Designer (ADR-153)
and the Ad Creative Social Momentum Designer (ADR-149), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-reciprocity-trigger-designer.ts`

A self-contained creative ad reciprocity trigger designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce reciprocity
  frameworks with reciprocity type, gift description, recipient value, implied
  reciprocity, gift impact, reciprocity likelihood, and reciprocity pathway,
  plus recommendations.
- Returns a `ReciprocityFrameworkDesignerResult` with a `ReciprocityStrategy`
  payload containing `frameworks` (ReciprocityFramework[]) and `recommendations`
  (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  reciprocity frameworks based on content length, product, audience, and
  platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_RECIPROCITY_TRIGGER_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `ad-creative-scarcity-frame-designer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()`
detection, `validateCreativeAdReciprocityTriggerDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-reciprocity-trigger-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-scarcity-frame-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/reciprocity
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-reciprocity-trigger-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-scarcity-frame-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: framework cards with type badges, gift description,
  recipient value, implied reciprocity, gift impact bars, reciprocity
  likelihood bars, reciprocity pathway, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Gift, Heart, Sparkles, Loader2, AlertCircle, Copy, Check,
  TrendingUp.

### 4. Translations

The page uses the `creativeAdReciprocityTriggerDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, frameworks, giftDescription, recipientValue,
impliedReciprocity, giftImpact, reciprocityLikelihood, reciprocityPathway,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-reciprocity-trigger-designer.test.ts`

Follows the pattern of `test/ad-creative-scarcity-frame-designer.test.ts`.
Tests cover:
- Credit cost (`CREATIVE_AD_RECIPROCITY_TRIGGER_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_RECIPROCITY_TYPES has 8
  reciprocity types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected).
- Dry-run mode (returns strategy with frameworks, correct framework structure,
  valid reciprocity types, giftImpact/reciprocityLikelihood in 0-100 range,
  recommendations present, at least 3 reciprocity frameworks, works for all
  four platforms, works without platform, deterministic output, rejects
  invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic reciprocity frameworks based on
content length, product, audience, and platform:
- Three reciprocity types are generated (free_value, educational_gift,
  tool_access) with descriptions shaped by the product and audience.
- Gift impact and reciprocity likelihood scores are deterministic, derived from
  content length and framework index, clamped to 0-100.
- Recommendations reference the reciprocity types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured reciprocity blueprint that helps
  marketers design ads with value-first giving that triggers genuine
  reciprocation without manipulation.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and
  avoids merge conflicts.
- **Positive:** Gift impact and reciprocity likelihood scores give marketers
  quantifiable metrics to compare framework effectiveness.
- **Positive:** Implied reciprocity descriptions explicitly guard against
  manipulative giving tactics, promoting ethical advertising practices.
- **Negative:** The heuristic fallback does not account for nuanced context that
  the LLM would catch (e.g., platform-specific value dynamics, audience-specific
  reciprocity triggers).
- **Negative:** Reciprocity scores in dry-run mode are deterministic
  approximations, not based on real audience analysis.

## Research Sources

Reciprocity framework methodology drawn from reciprocity theory, value-first
giving research, and ethical persuasion frameworks. The architecture follows
the patterns established in ADR-153 (Ad Creative Scarcity Frame Designer) for
self-contained library design with dry-run fallback and ADR-149 (Ad Creative
Social Momentum Designer) for plan-tier-aware model selection.
