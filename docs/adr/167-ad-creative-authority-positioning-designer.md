# ADR-167: Ad Creative Authority Positioning Designer

**Date:** 2026-10-21
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the
authority/credential signals that build trust and credibility before the viewer can
raise doubt. Authority positionings — the deliberate expert/authority/credential
signals that establish expertise, transfer trust, and boost credibility — are what
make ads persuasive and reduce skepticism. Without a tool to design these
positionings, marketers rely on intuition, producing ads that fail to leverage the
specific authority signals viewers need to trust a brand (expert credentials,
industry leadership, award recognition, media features, certifications, experience
proof, endorsements, thought leadership) and lose conversions at the moment of
doubt.

An "Ad Creative Authority Positioning Designer" that uses AI to design authority
positionings in ad creative content — producing positionings with authority type
(expert credential, industry leadership, award recognition, media featured,
certification proof, experience proof, endorsement authority, thought leadership),
authority signal descriptions, credential element descriptions, trust transfer
descriptions, authority strength scores (0-100), credibility boost scores (0-100),
and positioning pathway descriptions — would give users a structured
authority-building blueprint for their creative.

The patterns were drawn from the Creative Quality Scorer (ADR-098) and the Ad
Creative Objection Neutralizer Designer (ADR-151), which demonstrated a
self-contained analysis library with a dry-run fallback, plan-tier-aware model
selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-creative-authority-positioning-designer.ts`

A self-contained ad creative authority positioning designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce authority
  positionings with authority type, authority signal, credential element, trust
  transfer, authority strength, credibility boost, and positioning pathway, plus
  recommendations.
- Returns a `AuthorityPositioningDesignerResult` with a `AuthorityStrategy` payload
  containing `positionings` (AuthorityPositioning[]) and `recommendations`
  (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic
  positionings based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from
  `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_CREATIVE_AUTHORITY_POSITIONING_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-quality-scorer.ts` and
`ad-creative-objection-neutralizer-designer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCreativeAuthorityPositioningDesignerInput()` validation, deterministic
dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/ad-creative-authority-positioning-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/ad-creative-objection-neutralizer-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/authority
  types (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input,
  deducts credits, calls the library, refunds on failure. Uses `withAtlas` for
  BYOK key binding and `safeError` for error responses. Exports
  `maxDuration = 60`.

### 3. New UI page `src/app/ad-creative-authority-positioning-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-objection-neutralizer-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one
  `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience
  (input), and an optional platform selector.
- Displays results: positioning cards with type badges, authority signal,
  credential element, trust transfer, positioning pathway, authority strength
  bars, credibility boost bars, and recommendations with a copy-to-clipboard
  button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`,
  `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `adCreativeAuthorityPositioningDesigner` namespace via
`useI18n`. Because the `t` function falls back to the key string when a
translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, positionings, authoritySignal, credentialElement,
trustTransfer, authorityStrength, credibilityBoost, positioningPathway,
recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/ad-creative-authority-positioning-designer.test.ts`

Follows the pattern of `test/ad-creative-objection-neutralizer-designer.test.ts`.
Tests cover:
- Credit cost (`AD_CREATIVE_AUTHORITY_POSITIONING_DESIGNER_CREDIT_COST` is 4).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_AUTHORITY_TYPES has 8
  authority types, max lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing
  targetAudience, over-length fields, invalid platform, invalid dryRun type,
  valid minimal input, empty platform accepted, non-string platform, multiple
  errors collected, whitespace-only fields).
- Dry-run mode (returns strategy with positionings, correct positioning
  structure, valid authority types, authorityStrength/credibilityBoost in 0-100
  range, recommendations present, at least 3 positionings, works for all four
  platforms, works without platform, deterministic output, rejects
  invalid/missing input, distinct positioning types).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the
engine falls back to deterministic heuristic authority positionings based on
content length, product, audience, and platform:
- Three authority types are generated (expert_credential, media_featured,
  experience_proof) with descriptions shaped by the product and audience.
- Authority strength and credibility boost scores are deterministic, derived
  from content length and positioning index, clamped to 0-100.
- Recommendations reference the positioning types, product, audience, and
  platform.

This ensures the feature works in local development and degrades gracefully on
LLM failure.

## Consequences

- **Positive:** Provides a structured authority-building blueprint that helps
  marketers design ads with deliberate expert/credential signals for maximum
  trust and conversion.
- **Positive:** The dry-run fallback ensures the feature is usable in local
  development and degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`,
  `appCatalog.ts`, `dashboard/page.tsx`) keeps the surface area small and avoids
  merge conflicts.
- **Positive:** Authority strength and credibility boost scores give marketers
  quantifiable metrics to compare positioning effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced authority
  context that the LLM would catch (e.g., industry-specific credential
  hierarchies, audience-specific authority preferences).
- **Negative:** Positioning scores in dry-run mode are deterministic
  approximations, not based on real authority analysis.

## Research Sources

Authority positioning design methodology drawn from persuasion psychology,
credibility research, and advertising effectiveness frameworks. The architecture
follows the patterns established in ADR-098 (Creative Quality Scorer) for
self-contained library design with dry-run fallback and ADR-151 (Ad Creative
Objection Neutralizer Designer) for plan-tier-aware model selection.
