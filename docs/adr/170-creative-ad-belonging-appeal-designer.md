# ADR-170: Creative Ad Belonging Appeal Designer

**Date:** 2026-10-12
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design belonging appeals —
the practice of framing the product as membership in a desirable in-group or tribe so that buying
feels like belonging rather than a transaction. Belonging appeals are what turn a product into a
ticket into a community: when an ad signals that purchasing grants entry to a tribe, an insider
circle, or a shared-values group, the purchase becomes an act of joining. Without a tool to design
these appeals, marketers rely on guesswork, producing ad creative that fails to make the viewer
feel included and so misses the deeper social-belonging layer that drives loyal, identity-driven
purchases.

A "Creative Ad Belonging Appeal Designer" that uses AI to design belonging appeals in ad creative
content — producing appeals with belonging type (community membership, tribe identity, insider
access, shared values group, lifestyle community, professional network, cultural belonging,
aspirational group), group identity, membership signal, inclusion element, belonging strength
(0-100), identity reinforcement (0-100), and appeal pathway — would give users a structured
belonging appeal blueprint for their creative.

The patterns were drawn from the Creative Ad Identity Alignment Designer (ADR-154) and the Ad
Creative Value Ladder Designer (ADR-150), which demonstrated a self-contained analysis library
with a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-belonging-appeal-designer.ts`

A self-contained creative ad belonging appeal designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce belonging appeals with
  belonging type, group identity, membership signal, inclusion element, belonging strength,
  identity reinforcement, and appeal pathway, plus recommendations.
- Returns a `BelongingAppealDesignerResult` with a `BelongingStrategy` payload containing
  `appeals` (BelongingAppeal[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic appeals
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_BELONGING_APPEAL_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `creative-ad-identity-alignment-designer.ts` and
`creative-ad-value-ladder-designer.ts`: self-contained types, `extractJson`/`asStr`/`asNum`
helpers, `isDryRun()` detection, `validateCreativeAdBelongingAppealDesignerInput()`
validation, deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-belonging-appeal-designer/route.ts`

Follows the exact pattern of
`src/app/api/creative/creative-ad-identity-alignment-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/belonging types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-belonging-appeal-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/creative-ad-identity-alignment-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: appeal cards with type badges, group identity, membership signal,
  inclusion element, appeal pathway, belonging strength bars, identity reinforcement bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (cards stack, bars scale).
- Uses lucide icons: Users, TrendingUp, Sparkles, Loader2, AlertCircle, Copy, Check, Heart.
  (All icons verified against the installed lucide-react types.)

### 4. Translations

The page uses the `creativeAdBelongingAppealDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders correctly
without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle,
signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform, generate,
generating, appeals, groupIdentity, membershipSignal, inclusionElement, belongingStrength,
identityReinforcement, appealPathway, recommendations, copy, copied, error, dryRunNotice.

### 5. Unit tests `test/creative-ad-belonging-appeal-designer.test.ts`

Follows the pattern of `test/creative-ad-identity-alignment-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_BELONGING_APPEAL_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_BELONGING_TYPES has 8 belonging types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience, over-length
  fields, invalid platform, invalid dryRun type, valid minimal input, empty platform accepted,
  non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with appeals, correct appeal structure, valid belonging
  types, belongingStrength/identityReinforcement in 0-100 range, recommendations present, at
  least 3 appeals, exactly 3 deterministic appeals, works for all four platforms, works without
  platform, deterministic output, appeal types progress through belonging layers, rejects
  invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic belonging appeals based on content length, product, audience, and
platform:
- Three belonging types are generated (community_membership, tribe_identity, insider_access)
  with descriptions shaped by the product and audience.
- Belonging strength and identity reinforcement scores are deterministic, derived from content
  length and appeal index, clamped to 0-100.
- Recommendations reference the belonging types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured belonging appeal blueprint that helps marketers design
  ads that make buying feel like joining, deepening viewer connection and loyalty.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Belonging strength and identity reinforcement scores give marketers quantifiable
  metrics to compare appeal effectiveness and identify weak group identities.
- **Negative:** The heuristic fallback does not account for nuanced belonging dynamics that the
  LLM would catch (e.g., audience-specific tribal drivers, cultural context, brand positioning,
  intersectional belonging considerations).
- **Negative:** Appeal scores in dry-run mode are deterministic approximations, not based on
  real belonging resonance analysis.

## Research Sources

Belonging appeal methodology drawn from social identity theory, in-group favoritism research,
tribal marketing frameworks, and belongingness consumption research. The architecture follows
the patterns established in ADR-154 (Creative Ad Identity Alignment Designer) for self-contained
library design with dry-run fallback and ADR-150 (Creative Ad Value Ladder Designer) for
plan-tier-aware model selection.
