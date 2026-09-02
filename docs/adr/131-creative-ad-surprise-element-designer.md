# ADR-131: Creative Ad Surprise Element Designer

**Date:** 2026-10-16
**Status:** Accepted

## Context

LazyNext users create ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but often rely on predictable narrative structures that lose viewer attention mid-roll.
Surprise elements — unexpected twists, hidden details, sudden reveals, role reversals, genre shifts,
fourth-wall breaks, unexpected characters, and surprise collaborations — are proven to delight
viewers, drive rewatching, and re-engage audiences at attention-drop points. Marketers lack a
systematic way to design and place these surprise elements in their ad creative before production.

A "Creative Ad Surprise Element Designer" that uses AI to design surprise elements — producing
elements (with surprise type, setup, reveal, delight score, execution guide, viewer reaction, and
timing) and recommendations — would give users a comprehensive surprise strategy blueprint before
they produce their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative Sound Design
Strategist (ADR-130), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-surprise-element-designer.ts`

A self-contained creative ad surprise element designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce surprise elements and
  recommendations.
- Returns a `SurpriseElementDesignerResult` with a `SurpriseStrategy` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic surprise elements
  based on product, content length, target audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_SURPRISE_ELEMENT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-creative-sound-design-strategist.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeAdSurpriseElementDesignerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

Supported constants:
- `VALID_PLATFORMS`: tiktok, instagram, youtube, facebook.
- `VALID_SURPRISE_TYPES`: unexpected_twist, hidden_detail, sudden_reveal, role_reversal,
  genre_shift, breaking_fourth_wall, unexpected_character, surprise_collaboration.
- `MAX_PRODUCT_LENGTH`, `MAX_CONTENT_LENGTH`, `MAX_AUDIENCE_LENGTH`: 2000 chars each.

### 2. New API route `src/app/api/creative/creative-ad-surprise-element-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/surprise types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-surprise-element-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: surprise element cards with type badges, delight score bars, setup/reveal
  sections, execution guides, viewer reactions, timing, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `creativeAdSurpriseElementDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, elements, delightScore, setup, reveal, executionGuide, viewerReaction, timing,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-surprise-element-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_SURPRISE_ELEMENT_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_SURPRISE_TYPES, max lengths).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted).
- Dry-run mode (returns strategy with correct structure for elements, delightScore in 0-100 range,
  valid surprise types, recommendations present, works for all four platforms, produces multiple
  elements covering multiple surprise types, includes specific surprise types, deterministic
  output, different output for different content, recommendations reference platform, works
  without platform, rejects invalid input/productOrBrand/targetAudience).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back to
deterministic heuristic surprise elements based on product, content length, target audience, and
platform:
- Four surprise elements are generated (unexpected_twist, sudden_reveal, breaking_fourth_wall,
  hidden_detail) with setup, reveal, delight score, execution guide, viewer reaction, and timing.
- Delight scores are deterministic, derived from content length.
- Five actionable recommendations cover timing, setup believability, A/B testing, rewatch cues,
  and brand alignment.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic surprise element strategy that re-engages viewers at
  attention-drop points and drives rewatching, sharing, and engagement.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Execution guides give creators concrete production guidance rather than vague
  surprise concepts.
- **Negative:** The heuristic fallback does not account for nuanced creative context that the LLM
  would catch (e.g., audience-specific surprise expectations, cultural resonance of twists).
- **Negative:** Delight scores in dry-run mode are deterministic approximations, not based on real
  audience response prediction.

## Research Sources

Surprise element design methodology drawn from advertising engagement research, narrative surprise
theory, and platform-specific attention retention patterns (e.g., TikTok's mid-roll re-engagement
window, YouTube's longer narrative arcs). The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-130 (Ad Creative Sound Design Strategist) for multi-element strategy output.
