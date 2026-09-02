# ADR-210: Trend Intelligence

**Date:** 2026-09-02
**Status:** Accepted

## Context

Analyzes trending topics, hashtags, and creative patterns across platforms. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `trend-intelligence` as a creative library in `src/lib/creative/trend-intelligence.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 4 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/trend-intelligence`

### API

- `GET /api/creative/trend-intelligence` — returns credit cost and schema
- `POST /api/creative/trend-intelligence` — executes the trend intelligence

## Consequences

- Adds a 4-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/trend-intelligence.test.ts`
