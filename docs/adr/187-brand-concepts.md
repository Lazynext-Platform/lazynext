# ADR-187: Brand Concepts

**Date:** 2026-09-02
**Status:** Accepted

## Context

Generates multi-concept creative directions from brand intelligence. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `brand-concepts` as a creative library in `src/lib/creative/brand-concepts.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 5 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/brand-concepts`

### API

- `GET /api/creative/brand-concepts` — returns credit cost and schema
- `POST /api/creative/brand-concepts` — executes the brand concepts

## Consequences

- Adds a 5-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/brand-concepts.test.ts`
