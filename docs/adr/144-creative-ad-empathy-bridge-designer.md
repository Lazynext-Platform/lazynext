# ADR-144: Creative Ad Empathy Bridge Designer

**Date:** 2026-10-06
**Status:** Accepted

## Context

LazyNext users craft ad creative content but lack a systematic way to design the empathy
bridges that connect the viewer's emotional world to the product's world. Empathy bridges —
the deliberate emotional connections that make a viewer feel "this brand understands me" —
are what transform an ad from a pitch into a relatable story. Without a tool to design these
bridges, marketers rely on intuition, producing ads that fail to forge genuine emotional
connections and lose viewers before the message lands.

A "Creative Ad Empathy Bridge Designer" that uses AI to design empathy bridges in ad creative
content — producing bridges with bridge type (shared experience, pain point mirror, aspiration
link, value alignment, lifestyle reflection, emotional memory, identity connection,
transformation witness), viewer perspective, brand perspective, connection point, empathy
strength scores (0-100), emotional resonance scores (0-100), and bridge strategy — would give
users a structured emotional connection blueprint for their creative.

The patterns were drawn from the Ad Creative Tension Release Designer (ADR-139) and the
Creative Quality Scorer (ADR-098), which demonstrated a self-contained analysis library with
a dry-run fallback, plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/creative-ad-empathy-bridge-designer.ts`

A self-contained creative ad empathy bridge designer engine that:
- Takes a product/brand, content, a target audience, and an optional platform.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce empathy bridges with
  bridge type, viewer perspective, brand perspective, connection point, empathy strength,
  emotional resonance, and bridge strategy, plus recommendations.
- Returns an `EmpathyBridgeDesignerResult` with a `BridgeStrategy` payload containing
  `bridges` (EmpathyBridge[]) and `recommendations` (string[]).
- Has a dry-run fallback when Atlas is unavailable (uses deterministic heuristic bridges
  based on content length, product, audience, and platform).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 5 credits (`CREATIVE_AD_EMPATHY_BRIDGE_DESIGNER_CREDIT_COST`).

The library mirrors the patterns in `ad-creative-tension-release-designer.ts` and
`creative-quality-scorer.ts`: self-contained types, `extractJson`/`asStr`/`asNum` helpers,
`isDryRun()` detection, `validateCreativeAdEmpathyBridgeDesignerInput()` validation,
deterministic dry-run output, and a credit-cost constant.

### 2. New API route `src/app/api/creative/creative-ad-empathy-bridge-designer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-creative-tension-release-designer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/bridge types (no auth
  required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts
  credits, calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and
  `safeError` for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/creative-ad-empathy-bridge-designer/page.tsx`

A `'use client'` component that follows the pattern of
`src/app/ad-creative-tension-release-designer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand (input), content (textarea), target audience (input), and an
  optional platform selector.
- Displays results: bridge cards with type badges, viewer perspective, brand perspective,
  connection point, bridge strategy, empathy strength bars, emotional resonance bars, and
  recommendations with a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Uses lucide icons: Heart, Sparkles, Loader2, AlertCircle, Copy, Check, TrendingUp, Users.
- Responsive: works at 375px and 1920px (cards stack, bars scale).

### 4. Translations

The page uses the `creativeAdEmpathyBridgeDesigner` namespace via `useI18n`. Because the `t`
function falls back to the key string when a translation is missing, the page renders
correctly without modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title,
subtitle, signInPrompt, skipToContent, productOrBrand, content, targetAudience, platform,
generate, generating, bridges, viewerPerspective, brandPerspective, connectionPoint,
empathyStrength, emotionalResonance, bridgeStrategy, recommendations, copy, copied, error,
dryRunNotice.

### 5. Unit tests `test/creative-ad-empathy-bridge-designer.test.ts`

Follows the pattern of `test/ad-creative-tension-release-designer.test.ts`. Tests cover:
- Credit cost (`CREATIVE_AD_EMPATHY_BRIDGE_DESIGNER_CREDIT_COST` is 5).
- Constants (VALID_PLATFORMS has 4 platforms, VALID_BRIDGE_TYPES has 8 bridge types, max
  lengths for product/content/audience).
- Input validation (missing productOrBrand, missing content, missing targetAudience,
  over-length fields, invalid platform, invalid dryRun type, valid minimal input, empty
  platform accepted, non-string platform, multiple errors collected).
- Dry-run mode (returns strategy with bridges, correct bridge structure, valid bridge types,
  empathyStrength/emotionalResonance in 0-100 range, recommendations present, at least 3
  bridges, works for all four platforms, works without platform, deterministic output,
  rejects invalid/missing input, bridge type coverage, descriptive bridge strategy).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls
back to deterministic heuristic empathy bridges based on content length, product, audience,
and platform:
- Three bridge types are generated (shared_experience, pain_point_mirror, aspiration_link)
  with descriptions shaped by the product and audience.
- Empathy strength and emotional resonance scores are deterministic, derived from content
  length and bridge index, clamped to 0-100.
- Recommendations reference the bridge types, product, audience, and platform.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Provides a structured emotional connection blueprint that helps marketers
  design ads with deliberate empathy bridges for maximum viewer resonance.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Empathy strength and emotional resonance scores give marketers quantifiable
  metrics to compare bridge effectiveness.
- **Negative:** The heuristic fallback does not account for nuanced emotional context that
  the LLM would catch (e.g., cultural resonance, audience-specific emotional triggers).
- **Negative:** Bridge scores in dry-run mode are deterministic approximations, not based on
  real emotional analysis.

## Research Sources

Empathy bridge design methodology drawn from emotional connection theory, advertising
psychology research, and brand resonance frameworks. The architecture follows the patterns
established in ADR-139 (Ad Creative Tension Release Designer) for self-contained library
design with dry-run fallback and ADR-098 (Creative Quality Scorer) for plan-tier-aware model
selection.
