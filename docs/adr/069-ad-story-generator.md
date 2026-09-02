# ADR-069: Ad Story Generator

**Date:** 2026-09-30
**Status:** Accepted

## Context

LazyNext users generate ad creatives across many platforms and frequently need compelling narrative
structures — not just hooks and visuals, but full emotional arcs that carry a viewer from attention
to action. A flat product demo rarely converts as well as a story with tension, transformation, and
resolution. However, crafting structured ad stories with well-paced acts, visual notes, voiceover,
and emotional beats is a skill most marketers haven't mastered — and doing it from scratch for every
ad is time-consuming.

An "Ad Story Generator" that uses AI to generate structured ad narratives with emotional arcs —
broken into acts with visual notes, voiceover, emotion beats, and per-act durations — would give
users a production-ready story blueprint they can hand to a creative team or feed into the
storyboard generator. By supporting five story types (transformation, journey, conflict, resolution,
aspiration), the tool adapts to different campaign goals and emotional strategies.

The patterns were drawn from the Ad Format Optimizer (ADR-055) and the Ad CTA Optimizer (ADR-067),
which demonstrated a self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-story-generator.ts`

A self-contained ad story generator engine that:
- Takes a product or brand, a platform, a story type (transformation/journey/conflict/resolution/
  aspiration), an optional target audience, and an optional duration (15-90 seconds, default 30).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate a structured ad story with a
  title, logline, 3-5 acts (each with act number, title, description, visual notes, voiceover,
  emotion beat, and duration), an emotional arc description, a key message, and CTA integration
  guidance.
- Returns a single `AdStory` object.
- Has a dry-run fallback when Atlas is unavailable (uses story-type-specific templates with
  weighted act durations that sum to the requested total — e.g., transformation has a struggle →
  discovery → change → reveal → invitation arc).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_STORY_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdStoryGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-story-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-cta-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/story types (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-story-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, story type selector, optional target
  audience, and a duration selector (15-90 seconds).
- Displays results: a story header with title and logline, act cards with act number, title,
  description, visual notes, voiceover, emotion beat, and duration; a story summary with emotional
  arc, key message, and CTA integration; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, tags wrap).

### 4. Translations

The page uses the `adStoryGenerator` namespace via `useI18n`. Because the `t` function falls back
to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, storyType, targetAudience, duration, generate, generating,
act, visualNotes, voiceover, emotionBeat, emotionalArc, keyMessage, ctaIntegration, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/ad-story-generator.test.ts`

Follows the pattern of `test/ad-cta-optimizer.test.ts`. Tests cover:
- Credit cost (`AD_STORY_GENERATOR_CREDIT_COST` is 5).
- Input validation (missing productOrBrand, missing/invalid platform, missing/invalid storyType,
  non-object input, over-length productOrBrand/targetAudience, duration out of range, invalid
  duration type, invalid dryRun type, valid minimal input).
- Dry-run mode (returns story with correct structure, acts with correct structure, sequential act
  numbers, act durations sum to total, defaults to 30 seconds, works for all five story types,
  rejects invalid input/platform/storyType/duration).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic stories based on story-type-specific templates:
- transformation: struggle → discovery → change → reveal → invitation (25/20/30/15/10%).
- journey: spark → first step → path → arrival → call (20/25/30/15/10%).
- conflict: want → barrier → breakthrough → victory → challenge (20/25/30/15/10%).
- resolution: pain → escalation → relief → resolution → solution (20/25/30/15/10%).
- aspiration: dream → gap → bridge → future → step (20/20/25/25/10%).

Each dry-run story includes a title, logline, 5 acts with visual notes, voiceover, emotion beats,
and weighted durations that sum to the requested total, plus an emotional arc, key message, and
CTA integration guidance.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates the blank-page problem for ad storytelling by generating structured,
  production-ready narrative blueprints with emotional arcs.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Five story types cover the most common narrative strategies, adapting to different
  campaign goals and emotional approaches.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch.
- **Negative:** 5 credits per story may add up for users who iterate frequently; however, the cost
  is moderate relative to analysis-heavy features (viral-analysis: 6, skill-chains: 8).

## Research Sources

Ad storytelling best practices drawn from industry research (Meta Business, TikTok for Business,
YouTube Ads) and narrative structure theory (three-act structure, emotional arcs). The architecture
follows the patterns established in ADR-055 (Ad Format Optimizer) for self-contained library design
with dry-run fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model selection.
