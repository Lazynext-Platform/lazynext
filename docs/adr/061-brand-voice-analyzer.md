# ADR-061: Brand Voice Analyzer

**Date:** 2026-09-26
**Status:** Accepted

## Context

LazyNext users produce creatives across many channels and need their brand voice to stay
consistent — the same tone, vocabulary, and sentence structure whether the copy is a TikTok
caption, an email, or a YouTube ad. Today, brand voice is documented informally (a style guide
that lives in a doc) or not at all, so creatives drift: a playful brand suddenly sounds stiff, an
authoritative brand slips into slang, and consistency erodes across touchpoints. Without a
data-backed voice profile, marketers cannot onboard new writers quickly or audit whether a piece
of content is on-brand.

A "Brand Voice Analyzer" that uses AI to analyze a sample of a brand's content and produce a
voice profile — tone (formal/casual/playful/authoritative), personality traits, vocabulary level,
sentence structure, do/don't lists, a consistency score (0-100), and a letter grade — would give
users a portable, actionable voice definition they can apply to every creative.

The patterns were drawn from the Ad Format Optimizer (ADR-055), which demonstrated a
self-contained analysis library with a dry-run fallback, and the Brand Guardrails (ADR-044),
which demonstrated brand-consistency scoring with a grade.

## Decision

### 1. New library `src/lib/creative/brand-voice-analyzer.ts`

A self-contained brand voice analyzer engine that:
- Takes a brand name and a sample content string (min 100 chars, max 10,000 chars).
- Uses `atlasChat` from `src/lib/atlas.ts` to ask the LLM to produce a voice profile with tone,
  personality traits, vocabulary level, sentence structure, do/don't lists, a consistency score
  (0-100), and a letter grade (F-A+).
- Returns a `VoiceProfile` plus the brand name.
- Has a dry-run fallback when Atlas is unavailable (uses heuristic tone detection from keyword
  markers — e.g., "henceforth"/"pursuant" → formal, "lol"/"omg"/"!!" → playful,
  "must"/"guaranteed"/"leading" → authoritative — plus vocabulary and sentence-structure
  analysis).
- Uses plan-tier-aware model selection via `getLLMModel` from `src/lib/providers/model-helpers`.
- Cost: 4 credits (`BRAND_VOICE_ANALYZER_CREDIT_COST`).

The library mirrors the patterns in `ad-format-optimizer.ts`: self-contained types,
`extractJson`/`asStr`/`asNum` helpers, `isDryRun()` detection,
`validateBrandVoiceAnalyzerInput()` validation, deterministic dry-run output, and a credit-cost
constant.

### 2. New API route `src/app/api/creative/brand-voice-analyzer/route.ts`

Follows the exact pattern of `src/app/api/creative/ad-format-optimizer/route.ts`:
- **GET**: returns credit cost, schema info, and supported tones (no auth required for catalog
  metadata).
- **POST**: authenticates user via `auth()` from `@/../auth`, validates input, deducts credits,
  calls the library, refunds on failure. Uses `withAtlas` for BYOK key binding and `safeError`
  for error responses. Exports `maxDuration = 60`.

### 3. New UI page `src/app/brand-voice-analyzer/page.tsx`

A `'use client'` component that follows the pattern of `src/app/ad-format-optimizer/page.tsx`:
- Uses `useSession` from `next-auth/react` and `useI18n` from `@/i18n/provider`.
- Shows an auth gate (with `AuthModal`) when unauthenticated, with exactly one `<h1>`.
- Has a form for brand name input and a sample content textarea (with a live character counter
  enforcing the 100-char minimum).
- Displays results: a voice profile header with tone badge, consistency score, and grade;
  vocabulary level and sentence structure; personality trait tags; and side-by-side do/don't
  lists. Includes a copy-to-clipboard button.
- Includes a skip link and a `main` content landmark with `id="main-content"`.
- Uses existing Tailwind CSS patterns (`bg-app`, `text-fg`, `border-border`, `bg-bg-card`, etc.).
- Responsive: works at 375px and 1920px (do/don't grid collapses, tags wrap).

### 4. Translations

The page uses the `brandVoiceAnalyzer` namespace via `useI18n`. Because the `t` function falls
back to the key string when a translation is missing, the page renders correctly without modifying
`src/i18n/locales/en.ts` or any locale files. Keys used: title, subtitle, signInPrompt,
skipToContent, brandName, sampleContent, minChars, analyze, analyzing, consistencyScore,
vocabularyLevel, sentenceStructure, personalityTraits, doList, dontList, copy, copied,
dryRunNotice, error.

### 5. Unit tests `test/brand-voice-analyzer.test.ts`

Follows the pattern of `test/ad-format-optimizer.test.ts`. Tests cover:
- Credit cost (`BRAND_VOICE_ANALYZER_CREDIT_COST` is 4).
- Constants (VALID_TONES, MAX_BRAND_NAME_LENGTH, MIN_SAMPLE_LENGTH, MAX_SAMPLE_LENGTH).
- Input validation (non-object input, missing brandName, over-length brandName, missing
  sampleContent, under-minimum sampleContent, over-maximum sampleContent, invalid dryRun type,
  valid input).
- Dry-run mode (returns voiceProfile with correct structure, echoes brand name, detects formal
  tone from formal markers, detects playful tone from exclamation markers, detects authoritative
  tone from assertive markers, consistencyScore within 0-100, rejects invalid input/short
  sample).

### 6. Dry-run fallback

When Atlas is unavailable (local mock server or no `ATLASCLOUD_API_KEY`), the engine falls back
to a deterministic heuristic voice profile based on tone markers, vocabulary, and sentence
structure in the sample content:
- Formal: "henceforth", "therefore", "furthermore", "pursuant" → formal tone.
- Playful: "lol", "omg", "yay", "woohoo", repeated "!!" → playful tone.
- Authoritative: "must", "always", "never", "guaranteed", "proven", "leading" → authoritative
  tone.
- Vocabulary level derived from average word length (simple/accessible/moderate/elevated).
- Sentence structure derived from average sentence length (short punchy/varied/long complex).
- Consistency score boosted when tone markers are repeated consistently.

This ensures the feature works in local development and degrades gracefully on LLM failure.

## Consequences

- **Positive:** Gives users a portable, actionable voice definition they can apply to every
  creative, reducing voice drift across channels.
- **Positive:** The do/don't lists provide concrete guidance for onboarding new writers.
- **Positive:** The dry-run fallback ensures the feature is usable in local development and
  degrades gracefully when the LLM is unavailable.
- **Positive:** Self-contained library with no modifications to shared modules
  (`intelligence.ts`, `types.ts`, `prompts.ts`, `en.ts`, `Shell.tsx`, `appCatalog.ts`,
  `dashboard/page.tsx`) keeps the surface area small and avoids merge conflicts.
- **Negative:** The heuristic fallback is generic and does not account for industry-specific or
  audience-specific voice nuances that the LLM would catch.
- **Negative:** 4 credits per analysis may add up for users who analyze many content samples;
  however, the cost is moderate relative to analysis-heavy features (viral-analysis: 6,
  skill-chains: 8).

## Research Sources

Brand voice analysis frameworks drawn from industry research (brand voice archetype models,
content style guide best practices) and adapted to LazyNext's multi-channel e-commerce ad
context. The architecture follows the patterns established in ADR-055 (Ad Format Optimizer) for
self-contained library design with dry-run fallback and ADR-044 (Brand Guardrails) for
brand-consistency scoring with a letter grade.
