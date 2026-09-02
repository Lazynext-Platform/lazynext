# ADR-212: URL to Brief

**Date:** 2026-09-02
**Status:** Accepted

## Context

Converts a product or brand URL into a structured creative brief. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `url-to-brief` as a creative library in `src/lib/creative/url-to-brief.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 3 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/url-to-brief`

### API

- `GET /api/creative/url-to-brief` — returns credit cost and schema
- `POST /api/creative/url-to-brief` — executes the url to brief

## Consequences

- Adds a 3-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/url-to-brief.test.ts`
