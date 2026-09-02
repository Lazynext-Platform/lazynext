# ADR-147: Ad Creative Trust Accelerator Designer

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the trust-building
techniques that rapidly establish viewer confidence in the brand and product. Trust accelerators —
the deliberate techniques that signal credibility, provide proof, and reduce perceived risk — are
what make ads persuasive and drive conversion. Without a tool to design these accelerators,
marketers rely on intuition, producing ads that fail to overcome viewer skepticism or establish
the credibility needed to convert.

An "Ad Creative Trust Accelerator Designer" that uses AI to design trust accelerators in ad
creative content — producing accelerators with accelerator type (authority endorsement, social
proof cascade, expert validation, user testimony, data-backed claim, transparency reveal,
guarantee offer, community consensus), trust signal descriptions, credibility marker
descriptions, proof element descriptions, trust velocity scores (0-100), credibility scores
(0-100), and acceleration pathway descriptions — would give users a structured trust-building
blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad Creative Tension
Release Designer (ADR-139), which demonstrated a self-contained analysis library with a dry-run
fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-trust-accelerator-designer.ts`

A self-contained ad creative trust accelerator designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce trust accelerators
  with accelerator type, trust signal, credibility marker, proof element, trust velocity,
  credibility score, and acceleration pathway, plus recommendations.
- Returns a `TrustAcceleratorDesignerResult` with an `AcceleratorStrategy` payload containing
  `accelerators` (TrustAccelerator[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic accelerators
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_TRUST_ACCELERATOR_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and `ad-creative-tension-release-designer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeTrustAcceleratorDesignerInput()` validation, deterministic dry-run output,
and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-trust-accelerator-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/creative-quality-scorer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/accelerator types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-trust-accelerator-designer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: accelerator cards with type badges, trust signal, credibility marker,
  proof element, acceleration pathway, trust velocity bars, credibility score bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeTrustAcceleratorDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, accelerators, trustSignal, credibilityMarker, proofElement,
trustVelocity, credibilityScore, accelerationPathway, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/ad-creative-trust-accelerator-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`AD_CREATIVE_TRUST_ACCELERATOR_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_ACCELERATOR_TYPES has 8 accelerator types,
  max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with accelerators, correct accelerator structure, valid
  accelerator types, trustVelocity/credibilityScore in 0-100 range, recommendations present,
  at least 3 accelerators, works for all four platforms, works without platform, deterministic
  output, rejects invalid/missing input, distinct accelerator types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic trust accelerators based on content length, product,
audience, and platform:
- Three accelerator types are generated (authority_endorsement, social_proof_cascade,
  data_backed_claim) with descriptions shaped by the product and audience.
- Trust velocity and credibility scores are deterministic, derived from content length
  and accelerator index, clamped to 0-100.
- Recommendations reference the accelerator types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured trust-building blueprint that helps marketers design
  ads with deliberate credibility signals and proof elements for maximum conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Trust velocity and credibility scores give marketers quantifiable metrics
  to compare accelerator effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced trust context that
  the LLM would catch (e.g., industry-specific credibility signals, audience-specific
  trust triggers).
- **Negative:** Accelerator scores in dry-run mode are deterministic approximations, not
  based on real trust analysis.

## Research Sources

Trust accelerator design methodology drawn from persuasion psychology, credibility research,
and advertising effectiveness frameworks. The architecture follows the patterns established in
ADR-098 (Creative Quality Scorer) for self-contained library design with dry-run fallback and
ADR-139 (Ad Creative Tension Release Designer) for plan-tier-aware model selection.
