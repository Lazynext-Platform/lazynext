# ADR-138: Ad Creative Viewer Reward Designer

**Date:** 2026-10-16
**Status:** Accepted

## Context

LazyNext users design ad creative content across multiple platforms (TikTok, Instagram, YouTube,
Facebook) but lack a systematic way to design viewer reward systems — the elements that give
viewers a sense of satisfaction, discovery, or emotional payoff for watching. A creative that
rewards attentive viewing drives rewatches, shares, and deeper brand affinity, but most ad
creative treats the viewer as a passive recipient. Marketers need a tool that designs reward
elements (easter eggs, hidden details, callback payoffs, pattern completions, mystery reveals,
emotional payoffs, insight moments, humor rewards), discovery moments, satisfaction triggers, and
rewatch incentives, then scores the overall strength of the reward design and recommends
improvements.

An "Ad Creative Viewer Reward Designer" that uses AI to design viewer reward systems — producing
reward elements with satisfaction levels and timing, discovery moments with reveal mechanisms,
satisfaction triggers with emotions and intensity, rewatch incentives with methods, an overall
reward score (0-100), and actionable recommendations — would give users a structured way to bake
attention-rewarding elements into their creative before they publish.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Creative Ad Climax
Architect (ADR-133), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-viewer-reward-designer.ts`

A self-contained viewer reward designer engine that:
- Takes a product or brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce reward elements, discovery
  moments, satisfaction triggers, rewatch incentives, a reward score (0-100), and
  recommendations.
- Returns a `ViewerRewardDesignerResult` with a `RewardDesign` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic reward design
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_VIEWER_REWARD_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `creative-ad-climax-architect.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asStrArr` helpers, `isDryRun()` detection,
`validateAdCreativeViewerRewardDesignerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-viewer-reward-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/reward types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-viewer-reward-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand, content, target audience, and an optional platform selector
  (tiktok, instagram, youtube, facebook, or any).
- Displays results: a reward score gauge, reward element cards with type badges and satisfaction
  bars, discovery moment cards with reveal mechanisms, satisfaction trigger cards with emotion
  and intensity, rewatch incentive cards with method and value, and recommendations with a
  copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeViewerRewardDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, rewardScore, rewards, viewerAction, payoff, timing, discoveries, when, howRevealed,
triggers, emotion, rewatchIncentives, method, recommendations, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-creative-viewer-reward-designer.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_VIEWER_REWARD_DESIGNER_CREDIT_COST` is 5).
- Constants (`VALID_PLATFORMS` length 4, `VALID_REWARD_TYPES` length 8, max length constants).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, non-string platform, invalid dryRun type, valid minimal input,
  undefined/empty platform accepted, dryRun true accepted, multiple errors collected).
- Dry-run mode (returns design with correct structure for rewards/discoveries/triggers/
  rewatchIncentives, rewardScore in 0-100 range, rewardScore equals the average of the four
  sub-scores, recommendations present, works for all four platforms and without a platform,
  deterministic output for the same input, reward types drawn from VALID_REWARD_TYPES, rejects
  invalid input/productOrBrand/targetAudience).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic reward design based on content length, product, audience, and
platform:
- Four reward elements are generated from the first four `VALID_REWARD_TYPES`, each with a
  description, viewer action, payoff, satisfaction level (40-95), and timing.
- Two discovery moments are generated with reveal mechanisms and discovery joy (50-95).
- Three satisfaction triggers are generated with emotions and intensity (50-95).
- Two rewatch incentives are generated with methods and rewatch value (55-95).
- The reward score is the rounded average of the four sub-score averages (rewards, discoveries,
  triggers, rewatch incentives).
- Five recommendations are generated referencing the brand, platform, and audience.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a systematic way to bake attention-rewarding elements into ad creative,
  driving rewatches, shares, and deeper brand affinity.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Reward elements with satisfaction levels and timing give marketers concrete,
  placement-aware guidance rather than generic advice.
- **Negative:** The heuristic fallback does not account for nuanced creative context that the LLM
  would catch (e.g., audience-specific reward resonance, cultural references).
- **Negative:** Reward scores in dry-run mode are deterministic approximations derived from
  content length, not based on real creative analysis.

## Research Sources

Viewer reward system design methodology drawn from attention-economy advertising research and
rewatch-driven engagement frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-133 (Creative Ad Climax Architect) for plan-tier-aware model selection.
