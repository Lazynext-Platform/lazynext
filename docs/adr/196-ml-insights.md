# ADR-196: ML Insights

**Date:** 2026-09-02
**Status:** Accepted

## Context

Queries CreativePerformance records to generate ML-driven creative insights. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `ml-insights` as a creative library in `src/lib/creative/ml-insights.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 2 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/ml-insights`

### API

- `GET /api/creative/ml-insights` — returns credit cost and schema
- `POST /api/creative/ml-insights` — executes the ml insights

## Consequences

- Adds a 2-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/ml-insights.test.ts`
