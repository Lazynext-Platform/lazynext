# ADR-074: Creative Scene Generator

**Date:** 2026-09-30
**Status:** Accepted

## Context

LazyNext users plan ad video shoots across TikTok, Instagram, YouTube, and Facebook and need
detailed scene-by-scene breakdowns before they get to set. A vague "show the product" direction
leads to wasted shoot time, missed shots, and inconsistent creative. Production teams need each
scene specified with shot type, camera angle, lighting, setting, props, actor notes,
dialogue/voiceover, duration, and mood — enough detail that a crew can execute without ambiguity.

A "Creative Scene Generator" that uses AI to generate detailed scene descriptions for ad video
shoots — each with shot type, camera angle, lighting, setting, props, actor notes, dialogue,
duration, and mood — would give users a ready-to-shoot storyboard grounded in platform best
practices and the creative concept before they ever call a crew.

The patterns were drawn from the Ad Thumbnail Generator (ADR-071) and the Ad Script Writer
(ADR-050), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-scene-generator.ts`

A self-contained creative scene generator engine that:
- Takes a product or brand, a platform, a concept (required), an optional scene count (3-8,
  default 5), and an optional location (studio/outdoor/home/office/retail).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate detailed scene descriptions
  with a scene number, shot type (wide/medium/close-up/overhead/panning), camera angle
  (eye-level/low/high/dutch), lighting (natural/studio/dramatic/soft), setting, props array,
  actor notes, dialogue/voiceover, duration (seconds), and mood.
- Returns a list of `SceneDescription` objects plus a `totalDuration` (sum of all scene
  durations).
- Has a dry-run fallback when Atlas is unavailable (uses platform-specific scene templates —
  e.g., TikTok favors fast-paced 3-5 second scenes with UGC energy; Instagram favors polished
  5-8 second aesthetic scenes; YouTube favors structured 10-15 second informative scenes;
  Facebook favors relatable 5-10 second benefit-led scenes). Location templates adjust the
  setting description for each scene.
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_SCENE_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-thumbnail-generator.ts` and `ad-script-writer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateCreativeSceneGeneratorInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/creative-scene-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-thumbnail-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/shot types/camera angles/
  lighting/locations (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-scene-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-thumbnail-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, concept input (required), scene count
  selector (3-8), and location selector (with an "any" option).
- Displays results: a total duration summary bar, scene cards with scene number, shot type badge,
  camera angle badge, lighting badge, duration, setting, props, actor notes, dialogue (in
  quotes), and mood; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, badges wrap, cards stack).

### 4. Translations

The page uses the `creativeSceneGenerator` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, concept, sceneCount, location, anyLocation, generate,
generating, setting, props, actorNotes, dialogue, mood, totalDuration, scenes, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/creative-scene-generator.test.ts`

Follows the pattern of `test/ad-thumbnail-generator.test.ts`. Tests cover:
- Credit cost (`CREATIVE_SCENE_GENERATOR_CREDIT_COST` is 5).
- Input validation (missing productOrBrand, missing/invalid platform, missing concept, over-length
  productOrBrand/concept, sceneCount out of range, invalid sceneCount type, invalid location,
  invalid dryRun type, valid minimal input).
- Dry-run mode (returns scenes with correct structure, requested count honored, defaults to 5,
  totalDuration equals sum of scene durations, scenes numbered sequentially, works for all four
  platforms, works for all five locations, rejects invalid input/platform/sceneCount).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic scene descriptions based on platform-specific templates:
- tiktok: fast-paced, 3-5 second scenes, UGC feel, trending energy (close-up hooks, quick demos,
  urgent CTAs).
- instagram: polished, 5-8 second scenes, aesthetic, aspirational mood (flat lays, golden-hour
  lifestyle, premium close-ups).
- youtube: structured, 10-15 second scenes, clear narrative, informative + engaging (intro,
  feature walkthrough, demonstration, results, CTA).
- facebook: clear, 5-10 second scenes, benefit-led, relatable and trustworthy (problem-solution,
  testimonials, practical demos).

Location templates adjust the setting description for each scene (studio, outdoor, home, office,
retail). Each dry-run scene includes a scene number, shot type, camera angle, lighting, setting,
props, actor notes, dialogue, duration, and mood.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates ambiguity in ad video production by providing scene-level detail
  (shot type, camera angle, lighting, props, actor notes, dialogue, duration, mood) before the
  shoot begins.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Total duration summary helps users estimate video length and plan shoot time.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  concept-specific nuances that the LLM would catch.
- **Negative:** 5 credits per generation is higher than lightweight tools (ad-hashtag-generator:
  2) but reflects the richer output (detailed multi-scene storyboards with production-level
  detail).

## Research Sources

Video production and storyboard best practices drawn from industry research (TikTok for Business,
Meta Business, YouTube Creator Academy) and film production literature. The architecture follows
the patterns established in ADR-071 (Ad Thumbnail Generator) for self-contained library design
with dry-run fallback and ADR-050 (Ad Script Writer) for multi-scene generation.
