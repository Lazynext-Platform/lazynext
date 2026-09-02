# ADR-088: Brand Story Architect

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users build ad campaigns across TikTok, Instagram, YouTube, and Facebook and need
compelling brand stories that resonate emotionally and translate into ad-ready creative. Crafting
a brand story arc from scratch — with acts, character roles, conflict, resolution, and actionable
story beats — is a skill most marketers lack. Without a structured narrative framework, ads tend to
be disjointed, emotionally flat, and ineffective at building brand affinity. Marketers need a tool
that takes a brand name, product, values, and a story type, then produces a complete story arc with
ad-ready beats that can be directly translated into creative briefs.

A "Brand Story Architect" that uses AI to build structured brand story arcs — with acts (each with
key beats and emotional tone), character roles, conflict, resolution, ad-ready story beats, a core
message, brand positioning, an emotional core, and recommendations — would give users a narrative
foundation for their entire campaign.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/brand-story-architect.ts`

A self-contained brand story architect engine that:
- Takes a brand name, a product or service, brand values, an optional story type (hero-journey,
  before-after, problem-solution, transformation, legacy, rebellion), an optional platform, and a
  dryRun flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to build a structured story arc with
  acts (name, summary, keyBeats, emotionalTone), character roles (role, description), conflict,
  resolution, story beats (beat, description, adApplication), core message, brand positioning,
  emotional core, and recommendations.
- Returns a `BrandStory` object wrapped in a `BrandStoryArchitectResult`.
- Has a dry-run fallback when Atlas is unavailable (uses story-type-specific templates — e.g.,
  hero-journey follows the classic 4-act structure; before-after uses a 3-act contrast structure;
  rebellion uses a 3-act defiance structure).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`BRAND_STORY_ARCHITECT_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateBrandStoryArchitectInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/brand-story-architect/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/story types (no auth required
  for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/brand-story-architect/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for brand name, product/service, brand values, optional story type selector
  (including an "auto" option), and an optional platform selector (including an "any" option).
- Displays results: core message, brand positioning, and emotional core summary; story arc acts
  (each with order number, name, emotional tone badge, summary, and key beats); conflict and
  resolution; character roles; ad-ready story beats (each with beat name, description, and ad
  application); recommendations list; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, cards stack, pills wrap).

### 4. Translations

The page uses the `brandStoryArchitect` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, brandName, productOrService, brandValues, storyType, platform, generate,
generating, coreMessage, brandPositioning, emotionalCore, storyArc, conflict, resolution,
characterRoles, storyBeats, adApplication, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/brand-story-architect.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`BRAND_STORY_ARCHITECT_CREDIT_COST` is 5).
- Input validation (missing brandName, missing productOrService, missing brandValues, over-length
  fields, invalid storyType, invalid platform, invalid dryRun type, valid minimal input).
- Dry-run mode (returns story with correct structure for acts, story beats, character roles;
  returns core message/brand positioning/emotional core/recommendations/conflict/resolution;
  works for all six story types; works without storyType; rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic story arcs based on story-type-specific templates:
- hero-journey: 4 acts (Ordinary World → Call to Adventure → Transformation → Return) with hero,
  mentor, and skeptic character roles.
- before-after: 3 acts (Before → Turning Point → After) with before-self, after-self, and bridge
  character roles.
- problem-solution: 3 acts (Problem → Solution → Outcome) with problem-holder and solution
  character roles.
- transformation: 3 acts (Old Self → Catalyst → New Self) with old-self, new-self, and catalyst
  character roles.
- legacy: 3 acts (Origins → Journey → Legacy) with founder, craftsperson, and inheritor character
  roles.
- rebellion: 3 acts (Status Quo → Rebellion → New Order) with rebel, establishment, and movement
  character roles.

Each dry-run story includes acts with key beats and emotional tones, character roles, conflict,
resolution, ad-ready story beats, core message, brand positioning, emotional core, and
recommendations. Brand-specific text is generated dynamically from the input.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates the blank-page problem in brand storytelling by providing a complete,
  structured narrative framework grounded in the brand's name, product, values, and chosen story
  type.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Ad-ready story beats with ad application guidance bridge the gap between narrative
  theory and practical ad creative production.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific nuances,
  industry context, or competitive landscape that the LLM would catch.
- **Negative:** Story arcs in dry-run mode are template-based and may feel formulaic without LLM
  customization.

## Research Sources

Brand storytelling frameworks drawn from advertising psychology literature (hero's journey,
before-after, problem-solution, transformation, legacy, rebellion narrative patterns) and
platform-specific storytelling best practices (TikTok for Business, Meta Business, YouTube
Creator Academy). The architecture follows the patterns established in ADR-073 (Ad Hashtag
Generator) for self-contained library design with dry-run fallback and ADR-067 (Ad CTA Optimizer)
for plan-tier-aware model selection.
