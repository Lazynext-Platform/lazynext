# ADR-133: Creative Ad Climax Architect

**Date:** 2026-10-15
**Status:** Accepted

## Context

LazyNext users craft ad creative content across platforms (TikTok, Instagram, YouTube, Facebook)
but lack a systematic way to architect the climax — the peak moment of emotional and narrative
intensity that determines whether an ad lands or falls flat. A creative may have a strong hook and
clear messaging yet peak too early, too late, or not at all, leaving viewers unmoved at the moment
that matters most. Marketers need a tool that designs the climax structure, maps the buildup
sequence that escalates tension toward it, defines the peak moment (visual, audio, viewer impact),
plans the resolution and call-to-action that follows, scores overall climax effectiveness, and
recommends concrete improvements.

A "Creative Ad Climax Architect" that uses AI to architect the climax of ad creative content —
producing a climax structure (type, timing, duration, intensity), a buildup sequence with tension
levels per step, a peak moment with emotional intensity and sensory elements, a resolution with
emotional landing and CTA, a climax score (0-100), and actionable recommendations — would give
users a deliberate, repeatable climax design before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-climax-architect.ts`

A self-contained creative ad climax architect engine that:
- Takes a product or brand, content, a target audience, and an optional platform (tiktok,
  instagram, youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a climax architecture
  comprising a climax structure, buildup sequence, peak moment, resolution, climax score, and
  recommendations.
- Returns a `ClimaxArchitectResult` with a `ClimaxArchitecture` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic climax
  architecture based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asObj`/`asStrArr`/`asClimaxType` helpers,
`isDryRun()` detection, `validateCreativeAdClimaxArchitectInput()` validation, deterministic
dry-run output, and a credit-cost constant. Eight climax types are supported: emotional_peak,
action_crescendo, reveal_climax, transformation_peak, conflict_resolution, triumph_moment,
catharsis_peak, wonder_moment.

### 2. New API route `src/app/api/creative/creative-ad-climax-architect/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/climax types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-climax-architect/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: climax score gauge with a progress bar, climax structure card with type
  badge/timing/duration and an intensity bar, buildup sequence with per-step tension-level bars,
  peak moment card with emotional-intensity bar and visual/audio elements, resolution card with
  type badge/emotional landing/CTA, and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grids collapse, bars scale).

### 4. Translations

The page uses the `creativeAdClimaxArchitect` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, content, targetAudience, platform, generate, generating,
climaxScore, climaxStructure, timing, duration, intensity, buildupSequence, tensionLevel,
peakMoment, emotionalIntensity, visualElement, audioElement, viewerImpact, resolution,
emotionalLanding, callToAction, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/creative-ad-climax-architect.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_CLIMAX_TYPES has 8 climax types, max-length
  constants, system prompt is non-empty, model constant is non-empty).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, whitespace-only fields, invalid platform, non-string platform, invalid dryRun type,
  valid minimal input, empty/undefined platform accepted, dryRun boolean accepted, multiple
  errors collected).
- Dry-run mode (returns architecture with correct structure for structure/buildup/peak/resolution,
  climaxScore in 0-100 range, valid climax type, recommendations present, works for all four
  platforms and without a platform, deterministic for identical input, tension escalates
  non-decreasingly across buildup steps, rejects invalid input/productOrBrand/targetAudience).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic climax architecture based on content length, product, audience, and
platform:
- Climax type is selected deterministically from content length modulo the eight valid types.
- Intensity is derived from content length, clamped to 40-95.
- Four buildup steps (Hook, Rising tension, Complication, Pre-peak build) escalate tension
  non-decreasingly, each clamped to 20-90.
- Peak emotional intensity is intensity + 5, clamped to 50-98.
- Climax score is the average of structure intensity and peak emotional intensity, clamped to
  30-95.
- Resolution is a call-to-action type with an aspirational emotional landing.
- Five recommendations are generated referencing the climax type, platform, audience, and brand.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a deliberate, repeatable climax design that ensures ads peak at the
  right moment with the right emotional and sensory elements, rather than leaving the climax to
  chance.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** The buildup sequence with per-step tension levels gives marketers a concrete
  escalation blueprint, not just a single peak description.
- **Negative:** The heuristic fallback does not account for nuanced narrative context that the
  LLM would catch (e.g., brand-specific emotional arcs, audience-specific catharsis triggers).
- **Negative:** Climax type and intensity in dry-run mode are deterministic approximations, not
  based on real creative analysis.

## Research Sources

Climax architecture methodology drawn from narrative structure and advertising effectiveness
research on emotional peak-end theory and tension escalation. The architecture follows the
patterns established in ADR-098 (Creative Quality Scorer) for self-contained library design with
dry-run fallback and ADR-073 (Ad Hashtag Generator) for plan-tier-aware model selection.
