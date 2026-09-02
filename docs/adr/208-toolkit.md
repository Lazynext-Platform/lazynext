# ADR-208: Creative Toolkit

**Date:** 2026-09-02
**Status:** Accepted

## Context

Shared helpers for model resolution, dry-run detection, JSON extraction, and value coercion. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `toolkit` as a creative library in `src/lib/creative/toolkit.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- No credit cost (infrastructure module)
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/toolkit`

### API

- `GET /api/creative/toolkit` — returns credit cost and schema
- `POST /api/creative/toolkit` — executes the creative toolkit

## Consequences

- Adds no cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/toolkit.test.ts`
