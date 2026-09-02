# ADR-087: Ad Creative Sequencer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users run multi-touch ad campaigns across TikTok, Instagram, YouTube, and Facebook and need
to sequence multiple creatives into a coherent narrative that moves audiences from awareness to
action. Picking creatives in isolation rarely accounts for how each touchpoint builds on the
previous one — a strong hook creative may grab attention but fail to hand off to a consideration
creative, or an offer reveal may arrive before the audience understands the problem. Marketers need
an ordered creative sequence with stage purposes, transitions, timing, and a narrative arc so each
creative reinforces the next toward the campaign goal.

An "Ad Creative Sequencer" that uses AI to design multi-touch creative sequences — each stage with a
name, purpose, creative brief, transition to the next stage, duration, and expected impact, plus an
overall narrative arc, total duration, touchpoint strategy, and recommendations — would give users
a ready-to-execute campaign blueprint grounded in funnel psychology and platform best practices.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-sequencer.ts`

A self-contained ad creative sequencer engine that:
- Takes a product or brand, a campaign goal (awareness, engagement, conversions, traffic,
  app_installs), an optional creative count (2-8, default 4), an optional platform, and a dryRun
  flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to design an ordered creative sequence
  with stages (order, name, purpose, creativeBrief, transitionToNext, durationDays,
  expectedImpact), a narrative arc, total duration, touchpoint strategy, and recommendations.
- Returns a `CreativeSequence` object wrapped in a `CreativeSequencerResult`.
- Has a dry-run fallback when Atlas is unavailable (uses campaign-goal-specific stage templates —
  e.g., awareness favors hook → problem → solution → reinforcement; conversions favors problem
  agitation → proof → offer → push → retargeting).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_SEQUENCER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeSequencerInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-creative-sequencer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/goals (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-sequencer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, campaign goal selector, creative count selector (2-8), and
  an optional platform selector (including an "any" option).
- Displays results: a narrative arc summary with total duration, ordered stage cards (each with
  order number, name, purpose, creative brief, expected impact, duration, and transition to next),
  a touchpoint strategy section, a recommendations list, and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, stage cards stack, pills wrap).

### 4. Translations

The page uses the `adCreativeSequencer` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, campaignGoal, creativeCount, platform, generate, generating,
narrativeArc, totalDuration, days, purpose, creativeBrief, expectedImpact, touchpointStrategy,
recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-creative-sequencer.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_SEQUENCER_CREDIT_COST` is 4).
- Input validation (missing productOrBrand, missing/invalid campaignGoal, over-length
  productOrBrand, creativeCount out of range, invalid creativeCount type, invalid platform,
  invalid dryRun type, valid minimal input).
- Dry-run mode (returns sequence with correct structure, requested count honored, defaults to 4,
  returns narrative arc/total duration/touchpoint strategy/recommendations, works for all five
  campaign goals, rejects invalid input/goal/count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic sequences based on campaign-goal-specific templates:
- awareness: Hook & Introduction → Problem Awareness → Solution Reveal → Brand Reinforcement →
  Engagement Invitation → Community Building → Recap & Teaser → Sustained Presence.
- engagement: Scroll-Stopper Hook → Value Delivery → Interactive Prompt → UGC Amplification →
  Challenge Launch → Challenge Highlights → Storytelling Deep Dive → Engagement Recap.
- conversions: Problem Agitation → Solution & Proof → Offer Reveal → Conversion Push →
  Retargeting → Last Chance → Post-Purchase Nurture → Advocacy Activation.
- traffic: Curiosity Hook → Value Teaser → Credibility Build → Destination Promise →
  Frequency Optimization → Click Retargeting → Evergreen Traffic → Traffic Recap.
- app_installs: App Hook → Core Benefit → Social Proof → Install Push → Install Retargeting →
  Feature Deep Dive → Limited Offer → User Onboarding.

Each dry-run stage includes an order, name, purpose, creative brief, transition to next, duration
in days, and expected impact. Brand-specific text is generated dynamically from the input. The
narrative arc, total duration, touchpoint strategy, and recommendations are also goal-specific.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in creative sequencing by grounding the sequence in campaign
  goal, product, and platform — giving users a ready-to-execute multi-touch blueprint.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Stage transitions and timing help users understand how creatives work together
  rather than in isolation.
- **Negative:** The heuristic fallback is generic and does not account for real-time audience
  data or competitive context that the LLM would catch.
- **Negative:** Duration and expected impact values in dry-run mode are static approximations, not
  based on live campaign data.

## Research Sources

Multi-touch campaign sequencing best practices drawn from industry research (Meta Business,
TikTok for Business, YouTube Creator Academy) and advertising psychology literature on funnel
stages and narrative arcs. The architecture follows the patterns established in ADR-073 (Ad
Hashtag Generator) for self-contained library design with dry-run fallback and ADR-067 (Ad CTA
Optimizer) for plan-tier-aware model selection.
