# ADR-089: Ad Localization Adapter

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users run ad campaigns across global markets and need to adapt their ad content for
different regional and cultural contexts. Direct translation rarely works — idioms, humor, color
symbolism, compliance requirements, and tone all vary significantly across markets. An ad that
performs well in the US may fall flat or even offend in Japan, China, or MENA. Marketers need a
tool that takes ad content, a source market, and a target market, then produces localized content
with cultural notes, idiom adaptations, color/symbol considerations, compliance flags, tone
adjustments, a market-specific CTA, and actionable recommendations.

An "Ad Localization Adapter" that uses AI to adapt ads for different regional and cultural markets
— producing localized content, cultural notes, idiom adaptations, color/symbol considerations,
compliance flags, tone adjustment, a market-specific CTA, and recommendations — would give users
culturally-aware, compliant ad content ready for global deployment.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/ad-localization-adapter.ts`

A self-contained ad localization adapter engine that:
- Takes ad content, a product or brand, a source market (us, uk, eu, cn, jp, kr, in, br, sea,
  mena, latam), a target market (same set), an optional platform, and a dryRun flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce localized content with
  cultural notes, idiom adaptations (original, localized, reason), color/symbol considerations,
  compliance flags, tone adjustment, a market-specific CTA, and recommendations.
- Returns a `Localization` object wrapped in a `LocalizationAdapterResult`.
- Has a dry-run fallback when Atlas is unavailable (uses target-market-specific templates — e.g.,
  US favors direct/aspirational tone; UK favors understated/witty tone; Japan favors
  polite/detail-oriented tone; MENA favors respectful/family-centric tone).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`AD_LOCALIZATION_ADAPTER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdLocalizationAdapterInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-localization-adapter/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/markets (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-localization-adapter/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-hashtag-generator/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content input, product/brand input, source market dropdown, target market
  dropdown, and an optional platform selector (including an "any" option).
- Displays results: localized content, tone adjustment and market-specific CTA (side-by-side),
  cultural notes, idiom adaptations (with original → localized and reason), color/symbol
  considerations, compliance flags (highlighted with warning styling), recommendations list,
  and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, cards stack, pills wrap).

### 4. Translations

The page uses the `adLocalizationAdapter` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, productOrBrand, sourceMarket, targetMarket, platform, generate,
generating, localizedContent, toneAdjustment, marketSpecificCTA, culturalNotes,
idiomAdaptations, colorSymbolConsiderations, complianceFlags, recommendations, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/ad-localization-adapter.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`AD_LOCALIZATION_ADAPTER_CREDIT_COST` is 4).
- Input validation (missing content, missing productOrBrand, missing/invalid sourceMarket,
  missing/invalid targetMarket, over-length fields, invalid platform, invalid dryRun type, valid
  minimal input).
- Dry-run mode (returns localization with correct structure for all fields, idiom adaptations
  with correct structure, works for all eleven target markets, rejects invalid/missing input).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic localization based on target-market-specific templates:
- us: direct, confident, aspirational tone; FTC compliance; red/white/blue considerations.
- uk: understated, witty, self-deprecating tone; ASA compliance; British English idioms.
- eu: formal, quality-focused, transparent tone; GDPR compliance; sustainability emphasis.
- cn: collectivist, status-conscious tone; China Advertising Law compliance; red/gold colors.
- jp: polite, detail-oriented, quality-focused tone; keigo; white/red colors; number taboos.
- kr: trendy, fast-paced, K-culture aligned tone; 공정위 compliance; pastel/gradient colors.
- in: warm, family-oriented, value-conscious tone; ASCI compliance; festival alignment.
- br: warm, playful, energetic tone; CONAR compliance; Brazilian Portuguese; bright colors.
- sea: friendly, value-driven, mobile-first tone; halal considerations; per-country localization.
- mena: respectful, family-centric, values-driven tone; Islamic compliance; green/gold colors.
- latam: passionate, community-driven, expressive tone; per-country compliance; warm colors.

Each dry-run localization includes localized content, cultural notes, idiom adaptations,
color/symbol considerations, compliance flags, tone adjustment, market-specific CTA, and
recommendations. Brand-specific text is generated dynamically from the input.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates the risks of direct translation by providing culturally-aware,
  compliant localization grounded in market-specific best practices.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Compliance flags and color/symbol considerations help users avoid costly cultural
  and regulatory mistakes before launching in new markets.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific nuances
  or real-time regulatory changes that the LLM would catch.
- **Negative:** Market-specific CTAs in dry-run mode are static templates, not optimized for the
  specific product or campaign context.

## Research Sources

Cross-cultural advertising localization best practices drawn from industry research (Meta
Business international guides, TikTok for Business global marketing, Google Ads localization
guidelines) and cross-cultural communication literature. The architecture follows the patterns
established in ADR-073 (Ad Hashtag Generator) for self-contained library design with dry-run
fallback and ADR-067 (Ad CTA Optimizer) for plan-tier-aware model selection.
