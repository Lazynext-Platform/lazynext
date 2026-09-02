# ADR-182: Mental Accounting Designer

**Date:** 2026-09-02
**Status:** Accepted

## Context

Leverages mental accounting biases to frame pricing favorably. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `ad-creative-mental-accounting-designer` as a creative library in `src/lib/creative/ad-creative-mental-accounting-designer.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 3 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/ad-creative-mental-accounting-designer`

### API

- `GET /api/creative/ad-creative-mental-accounting-designer` — returns credit cost and schema
- `POST /api/creative/ad-creative-mental-accounting-designer` — executes the mental accounting designer

## Consequences

- Adds a 3-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/ad-creative-mental-accounting-designer.test.ts`
