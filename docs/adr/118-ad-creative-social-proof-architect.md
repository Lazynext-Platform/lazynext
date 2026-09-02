# ADR-118: Ad Creative Social Proof Architect

**Date:** 2026-10-21
**Status:** Accepted

## Context

LazyNext users create ad creative content across multiple platforms but often lack a systematic
way to incorporate social proof — the psychological mechanism by which people look to others'
actions and endorsements to guide their own decisions. Social proof (testimonials, user counts,
ratings, expert endorsements, media coverage, peer proof, certifications, before/after comparisons)
is one of the most effective persuasion levers in advertising, yet marketers frequently apply it
haphazardly: fabricating testimonials, placing proof in the wrong part of the creative, or using
proof types that don't resonate with the target audience.

An "Ad Creative Social Proof Architect" that uses AI to architect social proof elements —
producing proof elements with credibility scores and placement recommendations, proof strategies
with implementation guidance and expected impact, and authenticity guidelines — would give users
a structured, compliant way to build trust into their ad creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Hashtag Generator
(ADR-073), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-social-proof-architect.ts`

A self-contained social proof architect engine that:
- Takes a product/brand, target audience, content/goal, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce social proof elements (with
  type, content, credibility score, placement, and authenticity note), proof strategies (with
  strategy, proof type, implementation, expected impact, and integration), and recommendations.
- Returns a `SocialProofArchitectResult` with a `ProofArchitecture` payload.
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic architecture
  based on product, audience, content length, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-hashtag-generator.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeSocialProofArchitectInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-social-proof-architect/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/proof types/impacts (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-social-proof-architect/page.tsx`

A `'use client'` component that follows the pattern of `src/app/creative-quality-scorer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), target audience (input), content (textarea), and an
  optional platform selector.
- Displays results: social proof elements with type badges, credibility bars, placement, and
  authenticity notes; strategies with impact badges, proof type, implementation, and integration;
  and recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, grid collapses, bars scale).

### 4. Translations

The page uses the `adCreativeSocialProofArchitect` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, targetAudience, content, platform, generate,
generating, elements, strategies, credibilityScore, placement, authenticityNote,
expectedImpact, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-social-proof-architect.test.ts`

Follows the pattern of `test/creative-quality-scorer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS, VALID_PROOF_TYPES, VALID_IMPACTS, MAX_*_LENGTH).
- Input validation (missing productOrBrand, missing targetAudience, missing content, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty/undefined platform
  accepted, dryRun boolean accepted).
- Dry-run mode (returns architecture with correct structure for elements/strategies, valid proof
  types, credibilityScore in 0-100 range, valid expectedImpact, recommendations present, works
  for all four platforms and without a platform, deterministic output, sufficient element and
  strategy counts, at least one high-impact strategy, rejects invalid/over-length input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic social proof architecture based on product, audience, content length,
and platform:
- Eight social proof elements are generated (one per proof type: testimonial, user_count, rating,
  expert_endorsement, media_coverage, peer_proof, certification, before_after).
- Each element has a credibility score (0-100) derived deterministically from content length and
  element index, a placement recommendation, and an authenticity note.
- Four proof strategies are generated with implementation guidance, expected impact, and
  integration notes.
- Five recommendations are generated covering prioritization, compliance, A/B testing, fatigue
  prevention, and quantitative/qualitative pairing.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured, compliant way to incorporate social proof into ad
  creative, with credibility scoring and authenticity guidelines that prevent fabricated or
  misleading claims.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Placement recommendations and integration guidance give marketers concrete,
  actionable direction rather than generic proof suggestions.
- **Negative:** The heuristic fallback does not account for nuanced social proof factors that
  the LLM would catch (e.g., audience-specific proof resonance, cultural trust signals).
- **Negative:** Credibility scores in dry-run mode are deterministic approximations, not based
  on real proof verification.

## Research Sources

Social proof architecture methodology drawn from persuasion psychology research (Cialdini's
principles of social proof and authority) and advertising effectiveness frameworks. The
architecture follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-073 (Ad Hashtag Generator) for
plan-tier-aware model selection.
