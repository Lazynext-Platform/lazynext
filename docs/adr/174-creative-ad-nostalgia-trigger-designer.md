# ADR-174: Creative Ad Nostalgia Trigger Designer

**Date:** 2026-10-28
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
nostalgia triggers that warm up the brand through shared cultural and personal
memory. Nostalgia triggers — the deliberate evocations of childhood, cultural,
era, personal, shared-experience, product, relationship, and achievement
memories that soften the heart and bond the viewer to the brand — are what make
ads emotionally resonant and lower the viewer's guard. Without a tool to design
these triggers, marketers rely on intuition, producing ads that fail to leverage
the specific nostalgic memories viewers respond to (childhood nostalgia,
cultural nostalgia, era nostalgia, personal memory, shared experience
nostalgia, product nostalgia, relationship nostalgia, achievement nostalgia)
and lose the emotional warmth that drives brand affinity.

A "Creative Ad Nostalgia Trigger Designer" that uses AI to design nostalgia
triggers in ad creative content — producing triggers with nostalgia type
(childhood nostalgia, cultural nostalgia, era nostalgia, personal memory,
shared experience nostalgia, product nostalgia, relationship nostalgia,
achievement nostalgia), memory anchor descriptions, emotional resonance
descriptions, bridge-to-present descriptions, nostalgia warmth scores (0-100),
emotional connection scores (0-100), and trigger pathway descriptions — would
give users a structured nostalgia blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the
Creative Ad Identity Alignment Designer (ADR-161), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-nostalgia-trigger-designer.ts`

A self-contained creative ad nostalgia trigger designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce nostalgia
  triggers with nostalgia type, memory anchor, emotional resonance, bridge to
  present, nostalgia warmth, emotional connection, and trigger pathway, plus
  recommendations.
- Returns a `NostalgiaTriggerDesignerResult` with a `NostalgiaStrategy` payload
  containing `triggers` (NostalgiaTrigger[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  triggers based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_NOSTALGIA_TRIGGER_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`creative-ad-identity-alignment-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdNostalgiaTriggerDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-nostalgia-trigger-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/nostalgia
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-nostalgia-trigger-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: trigger cards with type badges, memory anchor,
  emotional resonance, bridge to present, trigger pathway, nostalgia warmth
  bars, emotional connection bars, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdNostalgiaTriggerDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, triggers, memoryAnchor, emotionalResonance, bridgeToPresent,
triggerPathway, nostalgiaWarmth, emotionalConnection, recommendations, copy,
copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-nostalgia-trigger-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`CREATIVE_AD_NOSTALGIA_TRIGGER_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_NOSTALGIA_TYPES has 8
  nostalgia types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with triggers, correct trigger structure,
  valid nostalgia types, nostalgiaWarmth/emotionalConnection in 0-100 range,
  recommendations present, at least 3 triggers, works for all four platforms,
  works without platform, deterministic output, rejects invalid/missing input,
  distinct trigger types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic nostalgia triggers based on
content length, product, audience, and platform:
- Three nostalgia types are generated (childhood_nostalgia,
  cultural_nostalgia, era_nostalgia) with descriptions shaped by the product
  and audience.
- Nostalgia warmth and emotional connection scores are deterministic, derived
  from content length and trigger index, clamped to 0-100.
- Recommendations reference the nostalgia types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured nostalgia blueprint that helps marketers
  design ads with deliberate memory-evoking triggers for maximum emotional
  warmth and brand affinity.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Nostalgia warmth and emotional connection scores give marketers
  quantifiable metrics to compare nostalgia trigger effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced nostalgia
  context that the LLM would catch (e.g., generational memory differences,
  audience-specific cultural references).
- **Negative:** Nostalgia scores in dry-run mode are deterministic
  approximations, not based on real emotional analysis.

## Research Sources

Nostalgia trigger design methodology drawn from nostalgia research, emotional
advertising effectiveness frameworks, and memory-evocation psychology. The
architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-161
(Creative Ad Identity Alignment Designer) for plan-tier-aware model selection.
