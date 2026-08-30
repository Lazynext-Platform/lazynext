# ADR-062: Ad Caption Generator

**Date:** 2026-09-26
**Status:** Accepted

## Context

LazyNext users need platform-specific ad captions — short, punchy, emoji-rich captions for TikTok;
lifestyle-framed, hashtag-heavy captions for Instagram; benefit-driven, search-aligned captions for
YouTube; conversational, social-proof captions for Facebook. Today, users write captions manually
or adapt one caption across platforms, which ignores each platform's character limits, hashtag
norms, emoji conventions, and CTA styles. A caption that works on TikTok (150 chars, trend-aware,
casual) will underperform on YouTube (benefit-driven, fewer emojis) if copy-pasted verbatim.

An "Ad Caption Generator" that uses AI to generate platform-specific ad captions — with text,
hashtags, emojis, a CTA, a character count, and a platform-fit descriptor — would let users
produce on-platform copy in seconds rather than adapting generic captions by hand.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a
self-contained generation library with a dry-run fallback, and the Ad Copy Generator (ADR-047),
which demonstrated platform-specific copy generation.

## Decision

### 1. New library `src/lib/creative/ad-caption-generator.ts`

A self-contained ad caption generator engine that:
- Takes a product/brand, a platform, an optional tone, and an optional count (1-5, default 3).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to generate that many distinct
  platform-specific captions with text, hashtags, emojis, a CTA, a character count, and a
  platform-fit descriptor.
- Returns a list of `AdCaption`.
- Has a dry-run fallback when Atlas is unavailable (uses templated captions derived from the
  product, platform, and tone — with platform-specific emojis, CTAs, and hashtags).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 3 credits (`AD_CAPTION_GENERATOR_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateAdCaptionGeneratorInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/ad-caption-generator/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-format-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms (no auth required for
  catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/ad-caption-generator/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-format-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for product/brand input, platform selector, optional tone input, and a count
  selector (1-5).
- Displays results: caption cards with text, emojis, hashtags, CTA, character count, platform
  badge, and platform-fit rating; and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (hashtags wrap, grid collapses).

### 4. Translations

The page uses the `adCaptionGenerator` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, productOrBrand, platform, tone, count, generate, generating, cta, characterCount,
copy, copied, dryRunNotice, error.

### 5. Unit tests `test/ad-caption-generator.test.ts`

Follows the pattern of `test/ad-format-optimizer.test.ts`. Tests cover:
- Credit cost (`AD_CAPTION_GENERATOR_CREDIT_COST` is 3).
- Constants (VALID_PLATFORMS, MAX_PRODUCT_LENGTH, MAX_TONE_LENGTH, MIN_COUNT, MAX_COUNT,
  DEFAULT_COUNT).
- Input validation (non-object input, missing productOrBrand, over-length productOrBrand, missing
  platform, invalid platform, invalid tone type, over-length tone, count below minimum, count
  above maximum, invalid count type, invalid dryRun type, valid minimal input).
- Dry-run mode (returns captions with correct structure, returns the requested count, defaults to
  DEFAULT_COUNT, characterCount matches text length, captions include hashtags and emojis,
  respects count of 1, rejects invalid input/invalid-platform/out-of-range-count).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic templated captions derived from the product, platform, and tone:
- Platform-specific emojis: TikTok (🔥✨👀💃), Instagram (🌸✨📸💖), YouTube (▶️🔔💯🚀),
  Facebook (👍💬🌟🙌).
- Platform-specific CTAs: TikTok ("Try it now 👀"), Instagram ("Shop link in bio ✨"),
  YouTube ("Watch now and subscribe 🔔"), Facebook ("Learn more today").
- Five caption templates rotated based on the requested count, each with relevant hashtags.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Lets users produce on-platform copy in seconds rather than adapting generic
  captions by hand, respecting each platform's character limits, hashtag norms, and emoji
  conventions.
- **Positive:** The count selector (1-5) lets users generate a batch of variants for A/B testing
  in a single request.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for product-specific or
  audience-specific nuances that the LLM would catch (e.g., a luxury brand may warrant a more
  restrained emoji set).
- **Negative:** 3 credits per generation may add up for users who generate many caption batches;
  however, the cost is low relative to analysis-heavy features (viral-analysis: 6, skill-chains:
  8).

## Research Sources

Platform caption best practices drawn from industry research (TikTok for Business caption
guidelines, Instagram caption optimization, YouTube ad copy guidance, Facebook ad copy best
practices) and adapted to LazyNext's multi-platform e-commerce ad context. The architecture
follows the patterns established in ADR-055 (Ad Format Optimizer) for self-contained library
design with dry-run fallback and ADR-047 (Ad Copy Generator) for platform-specific copy
generation.
