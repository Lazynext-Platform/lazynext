# ADR-117: Creative Ad Pattern Interrupt Designer

**Date:** 2026-10-20
**Status:** Accepted

## Context

LazyNext users create ad creative across multiple platforms but struggle to break through audience
attention filters. Audiences scroll past ads within the first second, and even well-produced
creative can fail to capture attention if it follows predictable patterns. Marketers need a tool
that designs "pattern interrupts" — deliberate creative techniques that disrupt the expected ad
rhythm and snap audiences back to attention. Examples include visual breaks, audio shifts, text
overlays, scene cuts, color flashes, motion stops, silence, and unexpected questions.

A "Creative Ad Pattern Interrupt Designer" that uses AI to design pattern interrupts for ad
creative — taking a product/brand, target audience, content context, and optional platform, then
producing interrupt concepts with interrupt type, description, attention capture score (0-100),
implementation guide, expected engagement lift, and timing — would give users a systematic way to
engineer attention-grabbing moments into their ads.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-pattern-interrupt-designer.ts`

A self-contained creative ad pattern interrupt designer engine that:
- Takes a product/brand, a target audience, a content context, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce pattern interrupt concepts
  with interrupt type, description, attention capture score (0-100), implementation guide,
  expected engagement lift, and timing.
- Returns an `InterruptDesignerResult` with an `InterruptStrategy` payload containing `interrupts`
  (PatternInterrupt[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic interrupts based
  on product, audience, context length, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_PATTERN_INTERRUPT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdPatternInterruptDesignerInput()` validation, deterministic dry-run output, and
a credit-cost constant.

Supported interrupt types: `visual_break`, `audio_shift`, `text_overlay`, `scene_cut`,
`color_flash`, `motion_stop`, `silence`, `unexpected_question`.

### 2. New API route `src/app/api/creative/creative-ad-pattern-interrupt-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/interrupt types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-pattern-interrupt-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), target audience (input), context (textarea), and an
  optional platform selector.
- Displays results: pattern interrupt cards with type badges, attention score bars,
  descriptions, implementation guides, expected lift, and timing; plus recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdPatternInterruptDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, targetAudience, context, platform, generate,
generating, interrupts, attentionScore, implementation, expectedLift, timing, recommendations,
copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-pattern-interrupt-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_PATTERN_INTERRUPT_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_INTERRUPT_TYPES, MAX_PRODUCT_LENGTH, MAX_AUDIENCE_LENGTH,
  MAX_CONTEXT_LENGTH).
- Input validation (missing productOrBrand, missing targetAudience, missing context, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted,
  undefined platform accepted, dryRun booleans accepted).
- Dry-run mode (returns strategy with interrupts, correct interrupt structure, attentionScore in
  0-100 range, at least 3 interrupts, recommendations present, works for all four platforms, works
  without a platform, varied interrupt types, deterministic output, rejects invalid
  input/audience/context, descriptions reference brand/audience, recommendations non-empty).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic pattern interrupt design based on product, audience, context length,
and platform:
- Five pattern interrupts are generated across varied types (visual_break, unexpected_question,
  audio_shift, color_flash, scene_cut).
- Attention scores are deterministic, derived from context length and interrupt index.
- Each interrupt includes a description, implementation guide, expected lift, and timing.
- Recommendations cover sequencing, A/B testing, and platform-specific timing.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to engineer attention-grabbing moments into ad creative,
  breaking through audience attention filters.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Implementation guides and expected lift give marketers concrete, actionable
  guidance rather than generic advice.
- **Negative:** The heuristic fallback does not account for nuanced creative context that the
  LLM would catch (e.g., audience-specific cultural references, platform-specific trends).
- **Negative:** Attention scores in dry-run mode are deterministic approximations, not based on
  real attention modeling.

## Research Sources

Pattern interrupt methodology drawn from attention economics research and advertising
effectiveness frameworks. The architecture follows the patterns established in ADR-098
(Creative Quality Scorer) for self-contained library design with dry-run fallback and ADR-073
(Ad Hashtag Generator) for plan-tier-aware model selection.
