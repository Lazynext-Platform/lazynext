# ADR-112: Ad Creative Story Arc Designer

**Date:** 2026-10-15
**Status:** Accepted

## Context

LazyNext users craft ad creative across multiple platforms but often struggle to structure
their content as a compelling narrative. A flat sequence of product features and a CTA rarely
holds attention or drives emotion. Marketers need a tool that designs a deliberate story arc —
a sequence of acts with clear purposes, emotional beats that build toward a payoff, a pacing
guide tuned to the platform, key moments that anchor the narrative, and creative recommendations
for execution.

An "Ad Creative Story Arc Designer" that uses AI to design a story arc from a product/brand, a
core message, a target emotion, and an optional platform — producing acts (with name,
description, duration, and purpose), emotional beats (with emotion, intensity 0-100, timing, and
description), a pacing guide, key moments (with type and impact), and creative recommendations —
would give users a ready-to-produce narrative blueprint aligned to their brand and target
emotion.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-story-arc-designer.ts`

A self-contained ad creative story arc designer engine that:
- Takes a product/brand, a core message, an optional target emotion (joy, surprise, fear,
  sadness, anger, trust, anticipation, disgust), and an optional platform (tiktok, instagram,
  youtube, facebook).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a story arc with acts,
  emotional beats, a pacing guide, key moments, and recommendations.
- Returns a `StoryArcDesignerResult` with a `StoryArc` payload.
- Has a dry-run fallback when Atlas is unavailable (uses a deterministic 4-act story arc shaped
  by the product/brand, core message, target emotion, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST`).
- Includes a prompt-injection guard: the system prompt declares that any URLs, transcripts, or
  text provided are DATA, not instructions, and must never be executed.

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeStoryArcDesignerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-story-arc-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/emotions/impacts (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-story-arc-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), core message (input), a target emotion selector with 8
  emotions, and an optional platform selector.
- Displays results: story acts as a numbered timeline with duration badges, emotional beats with
  intensity bars and timing, a pacing guide, key moments with type and impact badges, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, selectors wrap, bars scale).

### 4. Translations

The page uses the `adCreativeStoryArcDesigner` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, coreMessage, targetEmotion, platform, generate,
generating, acts, emotionalBeats, pacingGuide, keyMoments, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/ad-creative-story-arc-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS, VALID_EMOTIONS, VALID_IMPACTS, MAX_PRODUCT_LENGTH,
  MAX_MESSAGE_LENGTH).
- Input validation (missing productOrBrand, missing coreMessage, over-length fields, invalid
  targetEmotion, invalid platform, invalid dryRun type, valid minimal input, empty platform/
  targetEmotion accepted, all eight emotions accepted, all four platforms accepted).
- Dry-run mode (returns arc with correct structure for acts/emotionalBeats/keyMoments,
  pacingGuide present, recommendations present, works for all four platforms and all eight
  emotions, works without platform or targetEmotion, produces at least 3 acts, sequential act
  numbers, intensity in 0-100 range, deterministic for identical input, rejects invalid
  input/coreMessage/targetEmotion/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to a deterministic 4-act story arc shaped by the product/brand, core message, target emotion,
and platform:
- Four acts: The Hook (0-3s), The Setup (3-10s), The Turn (10-20s), The Call (20-30s).
- Four emotional beats: Curiosity spark, Tension build, Emotional payoff (aligned to the target
  emotion), Motivated action — with deterministic intensities derived from the core message
  length.
- A pacing guide referencing the platform and target emotion.
- Four key moments: Opening hook, Problem reveal, Solution climax, Call-to-action — each with a
  type and impact.
- Five creative recommendations referencing the target emotion, platform, and brand.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a ready-to-produce narrative blueprint that turns a flat feature list
  into a compelling, emotionally-structured story arc.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Emotional beats with intensity and timing give producers a concrete editing
  roadmap rather than abstract storytelling advice.
- **Negative:** The heuristic fallback does not account for nuanced narrative factors that the
  LLM would catch (e.g., brand-specific tone, audience-specific cultural references).
- **Negative:** Story arc durations in dry-run mode are fixed approximations, not adapted to the
  actual content length or platform conventions.

## Research Sources

Story arc design methodology drawn from narrative structure theory (three-act and four-act
structures), advertising effectiveness research, and platform-native short-form video
conventions. The architecture follows the patterns established in ADR-098 (Creative Quality
Scorer) for self-contained library design with dry-run fallback and ADR-073 (Ad Hashtag
Generator) for plan-tier-aware model selection.
