# ADR-081: Ad Audience Segment Builder

**Date:** 2026-10-06
**Status:** Accepted

## Context

LazyNext users run paid ad campaigns across TikTok, Instagram, YouTube, and Facebook and need
detailed audience segments to target effectively. Building audience segments manually requires
deep knowledge of platform targeting options, demographic nuances, interest and behavior
combinations, and reach estimation — skills that many marketers lack or don't have time to
apply systematically. Vague audience descriptions like "women 25-40" lead to wasted spend on
overly broad or poorly matched segments.

An "Ad Audience Segment Builder" that uses AI to generate detailed audience segments — each with
demographics (age, gender, location, income), interests, behaviors, platform-specific targeting
recommendations, estimated reach, recommended ad format, and priority — would give users
ready-to-use, platform-optimized targeting plans before they launch campaigns.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad Thumbnail Generator
(ADR-071), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-audience-segment-builder.ts`

A self-contained ad audience segment builder engine that:
- Takes a product or brand (max 2000 chars), a primary audience description (max 1000 chars),
  an optional platform (tiktok, instagram, youtube, facebook), and a segment count (2-6,
  default 3).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate audience segments with a
  segment name, demographics (ageRange, gender, location, income), interests, behaviors,
  platform targeting recommendations, estimated reach, recommended ad format, and priority.
- Returns an `AudienceSegment[]`.
- Has a dry-run fallback when Atlas is unavailable (uses audience-segment templates —
  e.g., Core Enthusiasts, Aspiring Beginners, Premium Buyers, Value-Seekers, Late Adopters,
  Social Proof Seekers — with platform-specific targeting recommendations).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-thumbnail-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum`/`asStrArray` helpers, `isDryRun()` detection,
`validateAdAudienceSegmentBuilderInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-audience-segment-builder/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-audience-segment-builder/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, primary audience input, optional platform selector, and
  a segment count selector (2-6).
- Displays results: detailed segment cards with segment name, priority badge, demographics grid,
  interests pills, behaviors pills, platform targeting pills, estimated reach, and recommended
  ad format; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, demographics grid collapses, pills wrap).

### 4. Translations

The page uses the `adAudienceSegmentBuilder` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, primaryAudience, platform, segmentCount, generate, generating,
ageRange, gender, location, income, interests, behaviors, platformTargeting, estimatedReach,
recommendedAdFormat, copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-audience-segment-builder.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST` is 4).
- Input validation (missing productOrBrand, missing primaryAudience, over-length
  productOrBrand/primaryAudience, invalid platform, segmentCount out of range, invalid
  segmentCount type, invalid dryRun type, valid minimal input).
- Dry-run mode (returns segments with correct structure, requested count honored, defaults to 3,
  works for all four platforms, rejects invalid input/platform/segmentCount).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic audience segments based on audience templates:
- Core Enthusiasts: engaged, research-driven buyers with mid-to-high income.
- Aspiring Beginners: younger, trend-following, impulse-buying segment.
- Premium Buyers: high-income, brand-conscious, quality-focused segment.
- Value-Seekers: comparison shoppers, deal-conscious, practical segment.
- Late Adopters: older, slow to adopt, trust-driven segment.
- Social Proof Seekers: review-driven, community-oriented, UGC-responsive segment.

Each dry-run segment includes demographics, interests, behaviors, platform-specific targeting
recommendations, estimated reach, recommended ad format, and priority. Interests are dynamically
shaped from the primary audience description.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in audience targeting by generating detailed, platform-
  specific segments with demographics, interests, behaviors, and targeting recommendations.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Priority labels (high/medium/low) help users allocate budget across segments
  strategically.
- **Negative:** The heuristic fallback is generic and does not account for real-time audience
  data or platform-specific algorithmic changes that the LLM would catch.
- **Negative:** Estimated reach values in dry-run mode are static approximations, not live data.

## Research Sources

Audience targeting best practices drawn from industry research (Meta Business, Google Ads,
TikTok for Business) and media planning literature. The architecture follows the patterns
established in ADR-073 (Ad Hashtag Generator) for self-contained library design with dry-run
fallback and ADR-071 (Ad Thumbnail Generator) for plan-tier-aware model selection.
