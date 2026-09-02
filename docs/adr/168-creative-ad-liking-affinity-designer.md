# ADR-168: Creative Ad Liking Affinity Designer

**Date:** 2026-10-14
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the liking
affinities that lower viewer resistance. Liking affinities — similarity, compliments, shared
identity, humor, vulnerability, shared values, personality mirroring, and relatable struggle —
are what make viewers feel connected to a brand before any offer is made. Without a tool to
design these affinities, marketers rely on intuition, producing creative that either feels
transactional or fails to build the warmth needed to lower resistance.

A "Creative Ad Liking Affinity Designer" that uses AI to design liking affinity strategies in
ad creative content — producing affinities with affinity type (similarity_bond,
shared_experience, compliment_strategy, humor_connection, vulnerability_appeal,
shared_values, personality_mirror, relatable_struggle), similarity cue descriptions,
connection element descriptions, warmth signal descriptions, affinity strength scores
(0-100), resistance reduction scores (0-100), and affinity pathways — would give users a
structured affinity blueprint for their creative.

The patterns were drawn from the Creative Ad Micro-Commitment Designer (ADR-152) and the
Creative Ad Urgency Catalyst Designer (ADR-148), which demonstrated a self-contained analysis
library with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic
output.

## Decision

### 1. New library `src/lib/creative/creative-ad-liking-affinity-designer.ts`

A self-contained creative ad liking affinity designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce liking affinities
  with affinity type, similarity cue, connection element, warmth signal, affinity strength,
  resistance reduction, and affinity pathway, plus recommendations.
- Returns a `LikingAffinityDesignerResult` with an `AffinityStrategy` payload containing
  `affinities` (LikingAffinity[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic affinities
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_LIKING_AFFINITY_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-ad-micro-commitment-designer.ts` and
`creative-ad-urgency-catalyst-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdLikingAffinityDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-liking-affinity-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-ad-micro-commitment-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/affinity types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-liking-affinity-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-ad-micro-commitment-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: affinity cards with type badges, similarity cue, connection element,
  warmth signal, affinity pathway, affinity strength bars, resistance reduction bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Uses lucide icons (Heart, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdLikingAffinityDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, affinities, similarityCue, connectionElement, warmthSignal,
affinityStrength, resistanceReduction, affinityPathway, recommendations, copy, copied,
error, dryRunNotice.

### 5. Unit tests `test/creative-ad-liking-affinity-designer.test.ts`

Follows the pattern of `test/creative-ad-micro-commitment-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_LIKING_AFFINITY_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_AFFINITY_TYPES has 8 affinity types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with affinities, correct affinity structure, valid
  affinity types, affinityStrength/resistanceReduction in 0-100 range, recommendations
  present, exactly 3 affinities in a layered set, works for all four platforms, works
  without platform, deterministic output, rejects invalid/missing input, progressive
  strength).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic liking affinities based on content length, product,
audience, and platform:
- Three affinity types are generated in a layered set (similarity_bond,
  shared_experience, compliment_strategy) with descriptions shaped by the product and
  audience.
- Affinity strength and resistance reduction scores are deterministic, derived from content
  length and affinity index, clamped to 0-100.
- Recommendations reference the affinity types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured affinity blueprint that helps marketers design ads with
  deliberate liking strategies for maximum resistance reduction.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Affinity strength and resistance reduction scores give marketers
  quantifiable metrics to compare affinity effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced affinity context that
  the LLM would catch (e.g., audience-specific warmth signals, platform-specific affinity
  patterns).
- **Negative:** Affinity scores in dry-run mode are deterministic approximations, not based
  on real affinity analysis.

## Research Sources

Liking affinity strategy design methodology drawn from persuasion psychology, the liking
principle (similarity, compliments, cooperation, familiarity), and likability-based
influence frameworks. The architecture follows the patterns established in ADR-152
(Creative Ad Micro-Commitment Designer) for self-contained library design with dry-run
fallback and ADR-148 (Creative Ad Urgency Catalyst Designer) for plan-tier-aware model
selection.
