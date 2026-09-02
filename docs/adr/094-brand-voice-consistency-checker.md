# ADR-094: Brand Voice Consistency Checker

**Date:** 2026-10-01
**Status:** Accepted

## Context

LazyNext users create ad content across TikTok, Instagram, YouTube, and Facebook and need to ensure
their copy is consistent with their brand voice. Inconsistent tone, vocabulary, or formality can
dilute brand identity and confuse audiences — slang that doesn't match a professional brand, all-caps
that feel aggressive for a warm brand, or overly casual language for a luxury brand. Marketers need a
way to check their content against a brand voice description, get scores across voice dimensions,
identify specific violations with corrections, and receive corrected content and recommendations.

A "Brand Voice Consistency Checker" that uses AI to analyze creative content against a brand voice
description — returning an overall consistency score (0-100), letter grade (F-A+), scores across
voice dimensions (tone, vocabulary, formality, personality, messaging, pacing), violations with
excerpts and suggestions, corrected content, alignment metrics, and recommendations — would give
users a data-driven way to maintain brand voice consistency before publishing.

The patterns were drawn from the Ad Hashtag Generator (ADR-073) and the Ad CTA Optimizer
(ADR-067), which demonstrated a self-contained analysis library with a dry-run fallback,
plan-tier-aware model selection, and deterministic heuristic output.

## Decision

### 1. New library `src/lib/creative/brand-voice-consistency-checker.ts`

A self-contained brand voice consistency checker engine that:
- Takes content, a brand name, a brand voice description, an optional platform, and a dry-run flag.
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to check the content for brand voice
  consistency, returning an overall consistency score (0-100), grade (F-A+), voice dimensions with
  scores and statuses, violations with excerpts/suggestions/severities, corrected content, alignment
  metrics (brand alignment, tone match, vocabulary alignment, all 1-10), and recommendations.
- Returns a `VoiceConsistencyResult` with a `VoiceConsistencyCheck` object.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic content analysis to detect
  all-caps, slang, and excessive punctuation, with deterministic dimension scores and violations).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST`).

The library mirrors the patterns in `ad-hashtag-generator.ts` and `ad-cta-optimizer.ts`:
self-contained types, `extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateBrandVoiceConsistencyCheckerInput()` validation, deterministic dry-run output, and a
credit-cost constant.

### 2. New API route `src/app/api/creative/brand-voice-consistency-checker/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-hashtag-generator/route.ts`:
- **GET**: returns credit cost, schema info, and supported platforms/grades/statuses/severities
  (no auth required for catalog metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/brand-voice-consistency-checker/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-cta-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for content input, brand name input, brand voice description input, and an optional
  platform selector.
- Displays results: overall consistency score with progress bar, letter grade with award icon,
  alignment metrics (brand alignment, tone match, vocabulary alignment), voice dimensions with
  score bars and status badges, violations with type/severity/excerpt/suggestion, corrected
  content, recommendations list, and a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-line`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (grid collapses, badges wrap, bars resize).

### 4. Translations

The page uses the `brandVoiceConsistencyChecker` namespace via `useI18n`. Because the `t` function
falls back to the key string when a translation is missing, the page renders correctly without
modifying `src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, content, brandName, brandVoiceDescription, platform, check, checking,
overallConsistency, grade, brandAlignment, toneMatch, vocabularyAlignment, voiceDimensions,
violations, excerpt, suggestion, correctedContent, recommendations, copy, copied, dryRunNotice,
error.

### 5. Unit tests `test/brand-voice-consistency-checker.test.ts`

Follows the pattern of `test/ad-hashtag-generator.test.ts`. Tests cover:
- Credit cost (`BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST` is 4).
- Input validation (missing content, missing brandName, missing brandVoiceDescription, over-length
  content/brandName/brandVoiceDescription, invalid platform, invalid dryRun type, valid minimal
  input).
- Dry-run mode (returns check with correct structure, voiceDimensions structure, violations
  structure, detects all-caps violations, detects slang violations, returns correctedContent, works
  with optional platform, rejects invalid input/brandVoiceDescription/platform).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to deterministic heuristic brand voice checking based on content analysis:
- Detects all-caps text as tone violations (suggests avoiding aggressive emphasis).
- Detects slang terms (yo, lol, btw, tbh, ngl, bruh, fam) as vocabulary violations.
- Detects excessive exclamation marks as formality violations.
- Generates corrected content by replacing all-caps with title case, slang with formal
  alternatives, and excessive punctuation with periods.
- Scores six voice dimensions (tone, vocabulary, formality, personality, messaging, pacing) with
  deterministic scores based on content characteristics.
- Computes overall consistency, grade, alignment metrics, and recommendations.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Eliminates guesswork in brand voice consistency by grounding analysis in content,
  brand name, and voice description — giving users actionable feedback before publishing.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Positive:** Violation-level feedback with excerpts and suggestions gives users specific,
  actionable corrections.
- **Negative:** The heuristic fallback is generic and does not account for brand-specific voice
  nuances that the LLM would catch.
- **Negative:** Dimension scores in dry-run mode are based on simple pattern matching, not deep
  semantic analysis.

## Research Sources

Brand voice and tone consistency best practices drawn from brand management research and content
marketing literature. The architecture follows the patterns established in ADR-073 (Ad Hashtag
Generator) for self-contained library design with dry-run fallback and ADR-067 (Ad CTA Optimizer)
for plan-tier-aware model selection.
