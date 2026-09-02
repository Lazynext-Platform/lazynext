# ADR-124: Ad Creative Memory Anchor Builder

**Date:** 2026-10-15
**Status:** Accepted

## Context

LazyNext users create ad content across multiple platforms but struggle to make their creatives
memorable. Most ads are forgotten within seconds of viewing — the message, brand, and offer
vanish from the viewer's memory before they can act. Marketers need a way to design "anchor
moments" — distinctive, emotionally-bound elements (catchphrases, visual symbols, sound
triggers, gestures, color associations, character mascots, ritual sequences, surprise moments)
that stick with viewers long after viewing and can be triggered by everyday stimuli.

An "Ad Creative Memory Anchor Builder" that uses AI to design memorable anchor moments —
producing memory anchors with an anchor type, description, mnemonic device, retention score
(0-100), placement, recall trigger, and emotional binding, plus actionable recommendations for
deploying and reinforcing the anchors — would give users a systematic way to engineer
memorability into their ad creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-memory-anchor-builder.ts`

A self-contained memory anchor builder engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce memory anchors with an
  anchor type, description, mnemonic device, retention score (0-100), placement, recall
  trigger, and emotional binding, plus a list of recommendations.
- Returns an `AnchorBuilderResult` with an `AnchorStrategy` payload containing `anchors`
  (MemoryAnchor[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic anchors based
  on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CREATIVE_MEMORY_ANCHOR_BUILDER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeMemoryAnchorBuilderInput()` validation, deterministic dry-run output, and a
credit-cost constant.

Supported anchor types: `catchphrase`, `visual_symbol`, `sound_trigger`, `gesture`,
`color_association`, `character_mascot`, `ritual_sequence`, `surprise_moment`.

### 2. New API route `src/app/api/creative/ad-creative-memory-anchor-builder/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/anchor types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-memory-anchor-builder/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: memory anchor cards with type badges, retention score bars, mnemonic
  devices, placement, recall triggers, emotional bindings, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `adCreativeMemoryAnchorBuilder` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, anchors, retentionScore, mnemonicDevice, placement, recallTrigger,
emotionalBinding, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-memory-anchor-builder.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_MEMORY_ANCHOR_BUILDER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_ANCHOR_TYPES, MAX_PRODUCT_LENGTH, MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined
  platform accepted, non-string platform rejected).
- Dry-run mode (returns strategy with anchors, correct anchor structure, retentionScore in
  0-100 range, recommendations present, works for all four platforms and without a platform,
  deterministic output, includes catchphrase/visual_symbol/sound_trigger/surprise_moment/
  color_association anchor types, rejects invalid input/productOrBrand/targetAudience/non-object).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic memory anchors based on content length, product, audience, and
platform:
- Five memory anchors are generated covering catchphrase, visual_symbol, sound_trigger,
  surprise_moment, and color_association types.
- Retention scores are deterministic, derived from content length and anchor index.
- Each anchor includes a description, mnemonic device, placement, recall trigger, and emotional
  binding tailored to the product and audience.
- Five recommendations are generated for deploying and reinforcing the anchors.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to engineer memorability into ad creative, moving
  beyond subjective "make it catchy" advice to concrete, type-specific anchor designs.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Recall triggers and emotional bindings give marketers concrete, actionable
  guidance for post-viewing brand reinforcement rather than generic memorability tips.
- **Negative:** The heuristic fallback does not account for nuanced cultural or audience-specific
  memorability factors that the LLM would catch (e.g., local idioms, generational references).
- **Negative:** Retention scores in dry-run mode are deterministic approximations, not based on
  real memory research or audience testing.

## Research Sources

Memory anchor design methodology drawn from advertising memorability research, mnemonic device
theory, and emotional encoding frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
