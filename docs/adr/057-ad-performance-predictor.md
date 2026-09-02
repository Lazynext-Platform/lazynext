# ADR-057: Ad Performance Predictor

**Date:** 2026-09-01
**Status:** Accepted
**Cost:** 5 credits per generation

## Context

E-commerce advertisers need to forecast ad creative performance before spending budget on production and media. The Creative Performance Loop (ADR-025) ingests post-launch metrics, but there is no pre-launch prediction layer that scores a creative concept against platform norms, audience expectations, and historical patterns before a single dollar is committed.

Research inputs from the supplied repositories surfaced several ad-performance scoring and creative-quality heuristics. None of them are wired into LazyNext's product surface today, and none combine a structured prediction (CTR, engagement, conversion, virality) with actionable strengths, risks, and recommendations in a single API.

## Decision

Add an **Ad Performance Predictor** as a first-class AI creative feature.

- **Route:** `/ad-performance-predictor`
- **API:** `/api/creative/ad-performance-predictor`
- **Library:** `src/lib/creative/ad-performance-predictor.ts`
- **Credit cost:** 5
- **ADR:** 057

### Inputs

- `briefOrConcept` (required, max 5000 chars) — the creative brief or concept text.
- `platform` (required) — one of the supported ad platforms.
- `productCategory` (optional) — product category hint.
- `targetAudience` (optional) — audience description.
- `dryRun` (optional) — deterministic fallback for local development and tests.

### Outputs

A `PerformancePrediction` containing:

- `overallScore` (0–100)
- `grade` (F → A+)
- `predictedCTR`, `predictedEngagement`, `conversionLikelihood` (string ranges)
- `viralityScore` (0–100)
- `metrics[]` — individual metric predictions with confidence levels
- `factors[]` — positive/negative/neutral factor impacts
- `strengths[]`, `risks[]`, `recommendations[]`
- `estimatedReach`, `bestPostingTime`

### Generation path

- Uses `atlasChat` from `@/lib/atlas` with `resolveModel` for plan-tier-aware model routing.
- Falls back to a deterministic dry-run template when `isDryRun()` is true or the provider is unavailable.
- Credit deduction happens before generation; refund on failure.

### UI

- Auth-gated page at `/ad-performance-predictor`.
- One `<h1>`, `main#main-content`, skip link, accessible labels.
- Copy-to-clipboard for the full prediction.
- Localized via the `adPerformancePredictor` namespace across all 13 locales.

## Consequences

- Adds a pre-launch scoring layer to the creative workflow, complementing the post-launch Creative Performance Loop.
- Adds 1 new API route, 1 new page, 1 library module, and 1 ADR.
- Unit tests cover validation, credit cost, grade calculation, and dry-run structure.
- E2E tests cover the unauthenticated page load and the authenticated API path.
