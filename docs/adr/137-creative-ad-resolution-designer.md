# ADR-137: Creative Ad Resolution Designer

**Date:** 2026-10-15
**Status:** Accepted

## Context

LazyNext users design ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to design the resolution structure — how the narrative tension
resolves and the emotional landing for viewers. The resolution is the payoff that determines
whether viewers feel satisfied, remember the ad, and respond to the call-to-action. A weak
resolution leaves viewers hanging, an abrupt CTA feels jarring, and an unresolved narrative
undermines memorability.

Marketers need a tool that designs the resolution structure (circular return, linear complete,
open-ended, twist reveal, emotional catharsis, call-back resolution, transformation complete,
mystery solved), the emotional closure (primary emotion, closure method, viewer feeling,
emotional depth), the call-to-action bridge (bridge method, transition phrase, CTA placement,
naturalness), a satisfaction score (0-100), a memorability score (0-100), and actionable
recommendations.

A "Creative Ad Resolution Designer" that uses AI to design resolution structures — producing a
resolution structure, emotional closure, CTA bridge, satisfaction score, memorability score, and
recommendations — would give users a comprehensive resolution design before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-resolution-designer.ts`

A self-contained creative ad resolution designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a resolution structure,
  emotional closure, call-to-action bridge, satisfaction score, memorability score, and
  recommendations.
- Returns a `ResolutionDesignerResult` with a `ResolutionDesign` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic resolution
  design based on content length, audience length, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_RESOLUTION_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdResolutionDesignerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-resolution-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/resolution types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-resolution-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: resolution structure card (type badge, timing, description, narrative
  completion bar), emotional closure card (primary emotion, closure method, viewer feeling,
  emotional depth bar), CTA bridge card (bridge method, CTA placement, transition phrase,
  naturalness bar), satisfaction score gauge, memorability score gauge, and recommendations
  with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `creativeAdResolutionDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, structure, closure, ctaBridge, satisfactionScore, memorabilityScore,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-resolution-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_RESOLUTION_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_RESOLUTION_TYPES, MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, undefined platform accepted).
- Dry-run mode (returns design with correct structure for structure/closure/ctaBridge,
  satisfactionScore in 0-100 range, memorabilityScore in 0-100 range, valid resolution type,
  recommendations present, works for all four platforms, works without a platform, deterministic
  for same input, rejects invalid input/productOrBrand/targetAudience/non-object).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic resolution design based on content length, audience length, and
platform:
- Resolution type is selected deterministically from the eight valid types based on content and
  audience length.
- Primary emotion, closure method, bridge method, transition phrase, and CTA placement are
  selected deterministically from curated lists.
- Satisfaction and memorability scores are derived from content and audience length.
- Narrative completion, emotional depth, and naturalness are derived from the satisfaction and
  memorability scores.
- Recommendations reference the brand, platform, resolution type, and primary emotion.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic resolution design that ensures narrative tension resolves
  and the emotional landing lands for viewers.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** The CTA bridge with naturalness scoring helps marketers avoid jarring
  transitions from resolution to call-to-action.
- **Negative:** The heuristic fallback does not account for nuanced narrative factors that the
  LLM would catch (e.g., cultural context, audience-specific emotional resonance).
- **Negative:** Resolution type and scores in dry-run mode are deterministic approximations,
  not based on real narrative analysis.

## Research Sources

Narrative resolution and emotional closure methodology drawn from storytelling theory and
advertising effectiveness research. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
