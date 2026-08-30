# ADR-058: Creative A/B Test Planner

**Date:** 2026-09-01
**Status:** Accepted
**Cost:** 4 credits per generation

## Context

The platform already has an `/api/creative/ab-test/plan` route, but it is a lightweight
helper that returns a simple plan structure without AI-driven hypothesis generation,
statistical sample-size calculation, or structured variant design. E-commerce
advertisers need a more rigorous A/B test planner that:

- Generates a clear, falsifiable hypothesis.
- Designs 2–4 variants where each changes exactly one variable.
- Specifies metrics with targets and minimum detectable effects.
- Calculates a statistically grounded sample size per variant.
- Estimates test duration based on audience size and budget.
- Defines explicit success and failure criteria.
- Recommends audience segments for cross-tab analysis.

## Decision

Add a **Creative A/B Test Planner** as a first-class AI creative feature.

- **Route:** `/ab-test-planner`
- **API:** `/api/creative/ab-test-planner-v2` (suffixed `-v2` to avoid collision with the
  existing `/api/creative/ab-test/plan` route)
- **Library:** `src/lib/creative/ab-test-planner.ts`
- **Credit cost:** 4
- **ADR:** 058

### Inputs

- `baseCreative` (required, max 5000 chars) — the control creative description.
- `platform` (required, max 100 chars) — target ad platform.
- `goal` (required, max 500 chars) — the test objective.
- `audienceSize` (optional, > 0) — total reachable audience.
- `currentCTR` (optional, 0–100) — current CTR as a percentage.
- `budget` (optional, >= 0) — test budget in dollars.
- `dryRun` (optional) — deterministic fallback for local development and tests.

### Outputs

An `ABTestPlan` containing:

- `testName` — descriptive experiment name.
- `hypothesis` — the overall test hypothesis.
- `variants[]` — 2–4 variants (first is control), each with `id`, `name`, `description`,
  `changes[]`, and `hypothesis`.
- `metrics[]` — metrics to track, exactly one with `primary: true`. Each has `name`,
  `primary`, `target`, and `minimumDetectableEffect`.
- `sampleSizePerVariant` — statistically grounded sample size.
- `estimatedDurationDays` — estimated test duration.
- `confidenceLevel` — confidence level (e.g., 95).
- `statisticalPower` — statistical power (e.g., 0.8).
- `successCriteria[]`, `failureCriteria[]` — explicit decision criteria.
- `segmentRecommendations[]` — audience segments for cross-tab analysis.
- `notes[]` — additional guidance.

### Generation path

- Uses `atlasChat` from `@/lib/atlas` with `resolveModel` for plan-tier-aware model routing.
- Falls back to a deterministic dry-run template when `isDryRun()` is true or the provider
  is unavailable.
- Credit deduction happens before generation; refund on failure.

### UI

- Auth-gated page at `/ab-test-planner`.
- One `<h1>`, `main#main-content`, skip link, accessible labels.
- Variant cards with color-coded IDs.
- Metrics table with primary/target/MDE columns.
- Stat cards for sample size, duration, confidence, and power.
- Success/failure criteria lists.
- Copy-to-clipboard for the full plan.
- Localized via the `abTestPlanner` namespace across all 13 locales.

## Consequences

- Adds a rigorous pre-launch experiment design layer, complementing the existing
  lightweight `/api/creative/ab-test/plan` route and the post-launch Creative
  Performance Loop (ADR-037).
- Adds 1 new API route (`ab-test-planner-v2`), 1 new page, 1 library module, and 1 ADR.
- Unit tests cover validation, credit cost, and dry-run structure.
- E2E tests cover the unauthenticated page load and the authenticated API path.
