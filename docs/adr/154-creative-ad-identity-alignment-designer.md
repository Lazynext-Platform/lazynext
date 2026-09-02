# ADR-154: Creative Ad Identity Alignment Designer

**Date:** 2026-10-12
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design identity alignment —
the practice of aligning product messaging with viewer identity so that buying feels like
self-expression rather than a transaction. Identity alignment is what turns a product into a
badge of belonging: when an ad mirrors a viewer's values, aspirations, or tribe, the purchase
becomes an act of self-definition. Without a tool to design these alignments, marketers rely on
guesswork, producing ad creative that fails to make the viewer feel seen and so misses the
deeper motivational layer that drives loyal, identity-driven purchases.

A "Creative Ad Identity Alignment Designer" that uses AI to design identity alignment in ad
creative content — producing alignments with alignment type (values mirror, aspirational self,
tribe membership, lifestyle fit, professional identity, creative identity, role model echo,
self-image reinforcement), identity anchor, self-expression cue, belonging element, alignment
strength (0-100), identity resonance (0-100), and alignment pathway — would give users a
structured identity alignment blueprint for their creative.

The patterns were drawn from the Creative Ad Value Ladder Designer (ADR-150) and the Ad Creative
Tension Release Designer (ADR-139), which demonstrated a self-contained analysis library with a
dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-identity-alignment-designer.ts`

A self-contained creative ad identity alignment designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce identity alignments with
  alignment type, identity anchor, self-expression cue, belonging element, alignment strength,
  identity resonance, and alignment pathway, plus recommendations.
- Returns an `IdentityAlignmentDesignerResult` with an `AlignmentStrategy` payload containing
  `alignments` (IdentityAlignment[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic alignments
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_IDENTITY_ALIGNMENT_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-ad-value-ladder-designer.ts` and
`ad-creative-tension-release-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdIdentityAlignmentDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-identity-alignment-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/creative-ad-value-ladder-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/alignment types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-identity-alignment-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-ad-value-ladder-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: alignment cards with type badges, identity anchor, self-expression cue,
  belonging element, alignment pathway, alignment strength bars, identity resonance bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: FingerprintPattern, TrendingUp, Sparkles, Loader2, AlertCircle, Copy,
  Check, Heart, User. (Note: `Fingerprint` is not a valid lucide-react export; `FingerprintPattern`
  is the correct identity-themed icon and was verified against the installed lucide-react types.)

### 4. Translations

The page uses the `creativeAdIdentityAlignmentDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, alignments, identityAnchor, selfExpressionCue, belongingElement, alignmentStrength,
identityResonance, alignmentPathway, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-identity-alignment-designer.test.ts`

Follows the pattern of `test/creative-ad-value-ladder-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_IDENTITY_ALIGNMENT_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_ALIGNMENT_TYPES has 8 alignment types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted,
  non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with alignments, correct alignment structure, valid alignment
  types, alignmentStrength/identityResonance in 0-100 range, recommendations present, at least 3
  alignments, exactly 3 deterministic alignments, works for all four platforms, works without
  platform, deterministic output, alignment types progress through identity layers, rejects
  invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic identity alignments based on content length, product, audience, and
platform:
- Three alignment types are generated (values_mirror, aspirational_self, tribe_membership) with
  descriptions shaped by the product and audience.
- Alignment strength and identity resonance scores are deterministic, derived from content
  length and alignment index, clamped to 0-100.
- Recommendations reference the alignment types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured identity alignment blueprint that helps marketers design
  ads that make buying feel like self-expression, deepening viewer connection and loyalty.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Alignment strength and identity resonance scores give marketers quantifiable
  metrics to compare alignment effectiveness and identify weak identity anchors.
- **Negative:** The heuristic fallback does not account for nuanced identity dynamics that the
  LLM would catch (e.g., audience-specific identity drivers, cultural context, brand
  positioning, intersectional identity considerations).
- **Negative:** Alignment scores in dry-run mode are deterministic approximations, not based on
  real identity resonance analysis.

## Research Sources

Identity alignment methodology drawn from self-congruity theory, social identity theory,
brand-as-identity frameworks, and self-expression consumption research. The architecture follows
the patterns established in ADR-150 (Creative Ad Value Ladder Designer) for self-contained
library design with dry-run fallback and ADR-139 (Ad Creative Tension Release Designer) for
plan-tier-aware model selection.
