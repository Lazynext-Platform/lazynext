# ADR-132: Ad Creative Callback Memory Designer

**Date:** 2026-10-17
**Status:** Accepted

## Context

LazyNext users create ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but rarely design callback elements — references back to earlier moments in the content
that reward attentive viewers. Callbacks (visual echoes, phrase recalls, prop reuses, sound motifs,
etc.) create recognition and narrative payoff that deepen engagement, boost brand recall, and
encourage repeat viewing. Marketers lack a systematic way to identify which earlier moments to
reference, how to reference them, where to place the callbacks, and how recognizable they should be.

An "Ad Creative Callback Memory Designer" that uses AI to design callback elements — producing a
strategy with callback elements (each with a callback type, original moment, callback reference,
payoff, recognition score 0-100, placement, and reward type) and actionable recommendations — would
give users a comprehensive callback blueprint before they produce the creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-callback-memory-designer.ts`

A self-contained ad creative callback memory designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce callback elements (with type,
  original moment, callback reference, payoff, recognition score, placement, and reward type) and
  recommendations.
- Returns a `CallbackMemoryDesignerResult` with a `CallbackStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic callbacks based on
  content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CREATIVE_CALLBACK_MEMORY_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeCallbackMemoryDesignerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

Supported constants:
- `VALID_PLATFORMS`: tiktok, instagram, youtube, facebook.
- `VALID_CALLBACK_TYPES`: visual_echo, phrase_recall, character_return, prop_reuse,
  setting_revisit, theme_callback, sound_motif, gesture_repeat.
- `VALID_REWARD_TYPES`: subtle, moderate, explicit.
- `MAX_PRODUCT_LENGTH`, `MAX_CONTENT_LENGTH`, `MAX_AUDIENCE_LENGTH`: 2000 chars each.

### 2. New API route `src/app/api/creative/ad-creative-callback-memory-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/callback types/reward types
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-callback-memory-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an optional
  platform selector.
- Displays results: callback element cards with type badges and reward type badges, recognition
  score bars, original moment / callback reference / payoff sections, placement, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeCallbackMemoryDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, callbacks, recognitionScore, originalMoment, callbackReference, payoff, placement,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-callback-memory-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_CALLBACK_MEMORY_DESIGNER_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, VALID_CALLBACK_TYPES, VALID_REWARD_TYPES, max lengths).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, non-string platform, invalid dryRun type, valid minimal input, empty/
  undefined platform accepted, dryRun boolean accepted, multiple errors collected).
- Dry-run mode (returns strategy with correct structure for callbacks, recognitionScore in 0-100
  range, recommendations present, produces multiple callback types, includes visual_echo and
  phrase_recall, includes a subtle reward type, works for all four platforms, works without a
  platform, deterministic output, rejects invalid input/productOrBrand/targetAudience/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic callbacks based on content length, product, audience, and platform:
- Four callback elements are generated (visual_echo, phrase_recall, prop_reuse, sound_motif) with
  original moments, callback references, payoffs, recognition scores, placements, and reward types.
- Recognition scores are deterministic, derived from content length and callback index, clamped to
  30-95.
- Five actionable recommendations cover placement, subtle callbacks, recognition testing, early
  recall, and reward-type variety.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic callback design blueprint that creates recognition and reward
  for attentive viewers, boosting engagement and brand recall.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Recognition scores and reward-type badges give marketers concrete guidance on how
  obvious each callback should be, balancing attentive-viewer reward with first-time-viewer
  accessibility.
- **Negative:** The heuristic fallback does not account for nuanced narrative context that the LLM
  would catch (e.g., which specific moments in the actual content are most callback-worthy).
- **Negative:** Recognition scores in dry-run mode are deterministic approximations, not based on
  real analysis of the creative content's narrative structure.

## Research Sources

Callback and narrative payoff methodology drawn from advertising effectiveness research, film
narrative callback techniques, and platform-specific engagement best practices (e.g., TikTok's
emphasis on repeat-viewable hooks, YouTube's longer narrative arcs). The architecture follows the
patterns established in ADR-098 (Creative Quality Scorer) for self-contained library design with
dry-run fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
