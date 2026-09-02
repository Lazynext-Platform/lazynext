# ADR-191: Competitor Intelligence

**Date:** 2026-09-02
**Status:** Accepted

## Context

Monitors competitor ads and generates competitive gap analysis and counter-strategies. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `competitor-intel` as a creative library in `src/lib/creative/competitor-intel.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 5 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/competitor-intel`

### API

- `GET /api/creative/competitor-intel` — returns credit cost and schema
- `POST /api/creative/competitor-intel` — executes the competitor intelligence

## Consequences

- Adds a 5-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/competitor-intel.test.ts`
