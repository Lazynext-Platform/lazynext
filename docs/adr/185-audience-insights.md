# ADR-185: Audience Insights

**Date:** 2026-09-02
**Status:** Accepted

## Context

Analyzes target audiences with demographics, psychographics, and behavioral patterns. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `audience-insights` as a creative library in `src/lib/creative/audience-insights.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 4 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/audience-insights`

### API

- `GET /api/creative/audience-insights` — returns credit cost and schema
- `POST /api/creative/audience-insights` — executes the audience insights

## Consequences

- Adds a 4-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/audience-insights.test.ts`
