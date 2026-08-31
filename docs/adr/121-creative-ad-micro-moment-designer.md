# ADR-121: Creative Ad Micro-Moment Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users create ad creative content across multiple platforms but often struggle to
capture attention in the critical first 1-3 seconds. Research shows that modern ad viewers
scroll past content within seconds, and the difference between a high-performing ad and a
forgotten one often comes down to small, impactful "micro-moments" — a visual pop, a text
reveal, a sound cue, an expression change — that arrest attention and evoke an emotional
beat. Marketers currently design these moments intuitively, without a systematic framework
for sequencing them, scoring their attention-capture power, or implementing them in
production.

A "Creative Ad Micro-Moment Designer" that uses AI to design a sequence of micro-moments
in ad creative content — each with a type (visual_pop, text_reveal, sound_cue,
expression_change, scene_shift, color_burst, motion_accel, pause_beat), timestamp, duration,
description, attention capture score (0-100), implementation guide, and emotional beat —
plus recommendations for sequencing and optimization, would give users a concrete,
production-ready attention-capture plan tailored to their product, content, audience, and
platform.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag
Generator (ADR-073), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-micro-moment-designer.ts`

A self-contained creative ad micro-moment designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a sequence of
  micro-moments (each with a type, timestamp, duration, description, attention capture
  score, implementation guide, and emotional beat) plus recommendations.
- Returns a `MomentDesignerResult` with a `MomentSequence` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  micro-moment generation based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_MICRO_MOMENT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-hashtag-generator.ts`: self-contained types, `extractJson`/`asStr`/`asNum` helpers,
`isDryRun()` detection, `validateCreativeAdMicroMomentDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-micro-moment-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/moment types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-micro-moment-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: a micro-moment timeline with timestamps, type badges, attention score
  bars, descriptions, implementation guides, emotional beats, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`,
  etc.).
- Responsive: works at 375px and 1920px (timeline cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `creativeAdMicroMomentDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, moments, attentionScore, implementation, emotionalBeat,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-micro-moment-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_MICRO_MOMENT_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_MOMENT_TYPES, MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, undefined platform accepted, non-string platform, dryRun booleans).
- Dry-run mode (returns sequence with correct structure for moments, attentionScore in
  0-100 range, 4-8 moments, recommendations present, works for all four platforms and
  without a platform, deterministic for same input, moment types from valid set, first
  moment highest attention, rejects invalid/missing/over-length input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic micro-moment generation based on content length, product,
audience, and platform:
- 4-8 micro-moments are generated, with the count derived from content length.
- Moment types cycle through the eight valid types (visual_pop, text_reveal, sound_cue,
  expression_change, scene_shift, color_burst, motion_accel, pause_beat).
- Timestamps are spaced at 0.5s intervals starting at 0:00.
- Attention scores are deterministic, decreasing across moments with the first moment
  highest.
- Emotional beats cycle through curiosity, surprise, delight, urgency, recognition,
  aspiration, tension, relief.
- Recommendations are generated based on the moment count, types, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic, production-ready micro-moment design that captures
  attention in the critical first 1-3 seconds.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Implementation guides and emotional beats give marketers concrete,
  actionable guidance rather than generic advice.
- **Negative:** The heuristic fallback does not account for nuanced creative context that
  the LLM would catch (e.g., audience-specific cultural resonance, platform-native trends).
- **Negative:** Moment attention scores in dry-run mode are deterministic approximations,
  not based on real creative analysis.

## Research Sources

Micro-moment and attention-capture methodology drawn from advertising effectiveness
research and short-form video creative frameworks. The architecture follows the patterns
established in ADR-098 (Creative Quality Scorer) for self-contained library design with
dry-run fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
