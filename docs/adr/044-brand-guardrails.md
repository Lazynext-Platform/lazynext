# ADR-044: Brand Guardrails

**Date:** 2026-09-15
**Status:** Accepted

## Context

LazyNext's creative pipeline generates ad creatives (briefs, scripts, storyboards) using AI, but
there was no automated check to ensure the generated content stayed consistent with a brand's
guidelines. Marketers had to manually review each creative for brand voice (tone, keywords,
forbidden words), visual consistency (colors, fonts, logo placement), and messaging compliance
(claims, disclaimers, CTA guidelines). This manual review was slow, error-prone, and did not scale
across multiple brands or high-volume creative generation.

The existing creative intelligence modules (`viral-analysis.ts`, `performance-loop.ts`,
`multi-concept.ts`) demonstrated the pattern for AI-powered creative analysis: a self-contained
library with input validation, plan-tier-aware model selection, a dry-run fallback, and a credit-
deducting API route. The Brand Guardrails feature follows the same architecture but introduces a
new analysis dimension — brand consistency — with a structured violation reporting system.

## Decision

### 1. New library `src/lib/creative/brand-guardrails.ts`

A self-contained brand consistency checker that takes a creative brief, optional script and
storyboard, and a brand kit as input. It checks three dimensions:

- **Brand voice consistency:** tone alignment, keyword usage, forbidden word detection.
- **Visual consistency:** brand colors, fonts, and logo placement in the storyboard.
- **Messaging compliance:** approved claims, required disclaimers, and CTA guideline adherence.

The library returns a score (0-100), a grade (F-A+), a list of violations (each with a severity of
critical/warning/info, a message, detail, and recommendation), and a list of actionable
recommendations. The score is a weighted average: voice (40%), visual (30%), messaging (30%).

### 2. Dry-run heuristic fallback

When Atlas is unavailable (local mock server or missing API key), the library falls back to a
deterministic heuristic-based analysis. The heuristic checks for forbidden words in the combined
creative text, verifies brand keyword presence, checks for tone word usage, looks for brand colors
and fonts in the storyboard, and validates disclaimer and CTA presence. This ensures the UI always
renders meaningful results, even without a real LLM call.

### 3. Plan-tier-aware model selection

The library uses `getLLMModel(planTier)` to select the appropriate LLM model based on the user's
plan tier (free/starter/pro/elite), with the `CREATIVE_MODEL` env override taking precedence. This
matches the pattern used by `viral-analysis.ts` and `performance-loop.ts`.

### 4. New API route `POST /api/creative/brand-guardrails`

Follows the exact pattern of `/api/creative/performance-loop`: GET returns credit cost and schema
metadata (no auth required); POST authenticates the user, validates input, deducts credits, calls
the library, and refunds credits on failure. Uses `withAtlas` for BYOK key binding, `auth()` for
authentication, `safeError` for sanitized error responses, and `getUserPlanTier` for plan-tier
routing.

### 5. 4-credit cost (`BRAND_GUARDRAILS_CREDIT_COST`)

Each brand guardrails check costs 4 credits. This is lower than viral analysis (6 credits) because
the analysis is narrower in scope (brand consistency vs. full virality analysis) but higher than
simple operations (1-2 credits) because it requires a full LLM call with structured JSON output.

### 6. New UI page at `src/app/brand-guardrails/page.tsx`

A 'use client' component that provides a form for entering brand kit details (brand name, tone,
keywords, forbidden words, colors, fonts) and creative content (brief, script, storyboard). The
page is auth-gated with the `AuthModal` pattern, uses `useSession` and `useI18n`, and renders
results with score, grade, sub-scores (voice/visual/messaging), violations list with severity
colors and icons, and recommendations. The page has exactly one `<h1>` element and is responsive
across 375px-1920px viewports.

### 7. Nav link and translations

A nav link (`/brand-guardrails`, label "Guardrails", Shield icon) is added to the `NAV_LINKS` array
in `Shell.tsx`. The `brandGuardrails` namespace is added to `src/i18n/locales/en.ts` with keys for
all UI labels.

## Consequences

- **Positive:** Automates brand consistency checking, reducing manual review time and catching
  violations before creatives go to production.
- **Positive:** The dry-run heuristic ensures the feature works in local development and degrades
  gracefully when Atlas is unavailable.
- **Positive:** The structured violation format (category, severity, message, detail,
  recommendation) makes it easy for marketers to understand and fix issues.
- **Positive:** The three-dimensional scoring (voice, visual, messaging) gives marketers a clear
  picture of where the creative deviates from brand guidelines.
- **Negative:** The heuristic fallback is less accurate than the AI analysis — it uses simple
  string matching rather than semantic understanding of tone and context.
- **Negative:** 4 credits per check may add up for users running guardrails on many creatives in a
  batch workflow.

## Research Sources

Follows the architecture patterns established in ADR-037 (Creative Performance Loop) and ADR-038
(Viral Content Analyzer UI): self-contained library with validation, dry-run fallback, plan-tier-
aware model selection, credit-deducting API route with refund-on-failure, and auth-gated UI page
with structured results rendering. The brand consistency analysis dimension is inspired by brand
guideline management systems in enterprise creative platforms.
