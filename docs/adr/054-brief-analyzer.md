# ADR-054: Creative Brief Analyzer

**Date:** 2026-09-21
**Status:** Accepted

## Context

LazyNext's creative pipeline starts with a creative brief, but there was no automated way to
evaluate whether an existing brief was complete, well-structured, and likely to produce an
effective ad. Marketers frequently wrote briefs that were missing key sections (target audience,
value proposition, CTA, success metrics, etc.) or that contained vague, generic direction. These
gaps propagated downstream — scripts, storyboards, and generated creatives all suffered because the
source brief was incomplete. Manual review of briefs was slow and inconsistent across teams.

The existing creative intelligence modules (`brand-guardrails.ts`, `viral-analysis.ts`,
`performance-loop.ts`) demonstrated the pattern for AI-powered creative analysis: a self-contained
library with input validation, plan-tier-aware model selection, a dry-run fallback, and a credit-
deducting API route. The Creative Brief Analyzer feature follows the same architecture but
introduces a new analysis dimension — brief completeness and quality — with a structured section-
by-section reporting system.

## Decision

### 1. New library `src/lib/creative/brief-analyzer.ts`

A self-contained creative brief auditor that takes a brief text (and optional industry context)
as input. It evaluates the brief across nine standard sections:

- **target_audience:** who the creative is for
- **value_proposition:** why the product matters
- **hooks:** attention-grabbing opening
- **cta:** call-to-action
- **visual_direction:** look, style, aesthetic
- **platform_specs:** platform, format, duration
- **budget:** spend allocation
- **timeline:** deadlines and launch dates
- **success_metrics:** KPIs and goals

The library returns an overall score (0-100), a grade (F-A+), a section-by-section analysis (each
with a `present` flag and a quality of missing/weak/adequate/strong), a list of gaps (each with an
impact of high/medium/low and a recommendation), strengths, weaknesses, recommendations, and a
predicted effectiveness summary.

### 2. Dry-run heuristic fallback

When Atlas is unavailable (local mock server or missing API key), the library falls back to a
deterministic heuristic-based analysis. The heuristic checks for section-specific keywords in the
brief text, scores based on presence and length, and generates gaps, strengths, weaknesses, and
recommendations. Section quality is derived from keyword match count and brief length: more
matches and longer briefs yield stronger quality ratings. This ensures the UI always renders
meaningful results, even without a real LLM call.

### 3. Plan-tier-aware model selection

The library uses `getLLMModel(planTier)` to select the appropriate LLM model based on the user's
plan tier (free/starter/pro/elite), with the `CREATIVE_MODEL` env override taking precedence. This
matches the pattern used by `brand-guardrails.ts` and `viral-analysis.ts`.

### 4. New API route `POST /api/creative/brief-analyzer`

Follows the exact pattern of `/api/creative/brand-guardrails`: GET returns credit cost and schema
metadata (no auth required); POST authenticates the user, validates input, deducts credits, calls
the library, and refunds credits on failure. Uses `withAtlas` for BYOK key binding, `auth()` for
authentication, `safeError` for sanitized error responses, and `getUserPlanTier` for plan-tier
routing.

### 5. 4-credit cost (`BRIEF_ANALYZER_CREDIT_COST`)

Each brief analysis costs 4 credits. This matches Brand Guardrails (4 credits) because the
analysis scope is comparable — a single LLM call with structured JSON output analyzing one
document. It is lower than viral analysis (6 credits) because the analysis is narrower (brief
completeness vs. full virality prediction) but higher than simple operations (1-2 credits) because
it requires a full LLM call.

### 6. New UI page at `src/app/brief-analyzer/page.tsx`

A 'use client' component that provides a large textarea for the brief text and an optional
industry selector. The page is auth-gated with the `AuthModal` pattern, uses `useSession` and
`useI18n` (with the `briefAnalyzer` namespace), and renders results with: overall score with
grade, section-by-section analysis (present/quality with icons and colors), gaps with impact and
recommendations, strengths, weaknesses, recommendations list, and predicted effectiveness. A copy-
to-clipboard button exports the full analysis as formatted text. The page has exactly one `<h1>`
element ("Creative Brief Analyzer"), a `main` content landmark with `id="main-content"`, a skip
link, and is responsive across 375px-1920px viewports.

### 7. Translations

The `briefAnalyzer` namespace is referenced via `useI18n`'s `t()` function. Missing keys fall back
to the key string itself (per the i18n provider's fallback behavior), so the page renders
correctly even before locale files are updated. No shared locale files are modified by this
feature.

## Consequences

- **Positive:** Automates brief quality checking, catching missing sections and vague direction
  before creatives are generated, reducing wasted downstream effort.
- **Positive:** The dry-run heuristic ensures the feature works in local development and degrades
  gracefully when Atlas is unavailable.
- **Positive:** The structured section-by-section format (present/quality) makes it easy for
  marketers to see exactly which parts of their brief need work.
- **Positive:** The gaps list with impact levels helps marketers prioritize fixes — high-impact
  gaps (target audience, value proposition, CTA, hooks) are flagged first.
- **Negative:** The heuristic fallback is less accurate than the AI analysis — it uses simple
  keyword matching rather than semantic understanding of brief quality and specificity.
- **Negative:** 4 credits per analysis may add up for users analyzing many briefs in a batch
  workflow.

## Research Sources

Follows the architecture patterns established in ADR-044 (Brand Guardrails) and ADR-038 (Viral
Content Analyzer UI): self-contained library with validation, dry-run fallback, plan-tier-aware
model selection, credit-deducting API route with refund-on-failure, and auth-gated UI page with
structured results rendering. The nine-section brief structure is derived from standard creative
brief templates used in advertising and content marketing.
