# ADR-161: Ad Creative Testimonial Architecture Designer

**Date:** 2026-10-19
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
testimonial selection, placement, and case-study structure that builds trust and
drives conversion. Testimonial architectures — the deliberate proof structures
that establish credibility through authentic customer voices — are what make ads
persuasive by providing the social proof viewers need to believe a product works.
Without a tool to design these testimonial architectures, marketers rely on
intuition, producing ads that fail to leverage the specific proof types viewers
need to trust a brand (before/after testimonials, transformation testimonials,
expert endorsements, peer reviews, case studies, social proof compilations, video
testimonials, quantified results) and lose conversions at the moment of doubt.

An "Ad Creative Testimonial Architecture Designer" that uses AI to design
testimonial architectures in ad creative content — producing architectures with
testimonial type (before/after testimonial, transformation testimonial, expert
endorsement, peer review, case study, social proof compilation, video
testimonial, quantified result), testimonial angle descriptions, proof element
descriptions, placement strategy descriptions, credibility scores (0-100),
persuasion impact scores (0-100), and testimonial pathway descriptions — would
give users a structured proof-building blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Scarcity Frame Designer (ADR-157), which demonstrated a self-contained
analysis library with a dry-run fallback, plan-tier-aware model selection, and
deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-testimonial-architecture-designer.ts`

A self-contained ad creative testimonial architecture designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce testimonial
  architectures with testimonial type, testimonial angle, proof element,
  placement strategy, credibility score, persuasion impact, and testimonial
  pathway, plus recommendations.
- Returns a `TestimonialArchitectureDesignerResult` with a
  `TestimonialStrategy` payload containing `architectures`
  (TestimonialArchitecture[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  architectures based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_TESTIMONIAL_ARCHITECTURE_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-scarcity-frame-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeTestimonialArchitectureDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-testimonial-architecture-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/testimonial
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-testimonial-architecture-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: architecture cards with type badges, testimonial angle,
  proof element, placement strategy, testimonial pathway, credibility score
  bars, persuasion impact bars, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeTestimonialArchitectureDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, architectures, testimonialAngle, proofElement,
placementStrategy, credibilityScore, persuasionImpact, testimonialPathway,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-testimonial-architecture-designer.test.ts`

Follows the pattern of `test/ad-creative-authority-positioning-designer.test.ts`.
Tests cover:
- Credit cost (`AD_CREATIVE_TESTIMONIAL_ARCHITECTURE_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_TESTIMONIAL_TYPES has 8
  testimonial types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with architectures, correct architecture
  structure, valid testimonial types, credibilityScore/persuasionImpact in 0-100
  range, recommendations present, at least 3 architectures, works for all four
  platforms, works without platform, deterministic output, rejects
  invalid/missing input, distinct architecture types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic testimonial architectures based on
content length, product, audience, and platform:
- Three testimonial types are generated (before_after_testimonial,
  expert_endorsement, quantified_result) with descriptions shaped by the product
  and audience.
- Credibility score and persuasion impact scores are deterministic, derived
  from content length and architecture index, clamped to 0-100.
- Recommendations reference the architecture types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured proof-building blueprint that helps
  marketers design ads with deliberate testimonial selection and placement for
  maximum trust and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Credibility score and persuasion impact scores give marketers
  quantifiable metrics to compare testimonial effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced testimonial
  context that the LLM would catch (e.g., industry-specific credibility
  hierarchies, audience-specific proof preferences).
- **Negative:** Architecture scores in dry-run mode are deterministic
  approximations, not based on real testimonial analysis.

## Research Sources

Testimonial architecture design methodology drawn from social proof psychology,
credibility research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-157 (Ad Creative
Scarcity Frame Designer) for plan-tier-aware model selection.
