# ADR-206: Creative Templates

**Date:** 2026-09-02
**Status:** Accepted

## Context

Built-in and user-saved pipeline templates for creative generation. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `templates` as a creative library in `src/lib/creative/templates.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- No credit cost (infrastructure module)
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/templates`

### API

- `GET /api/creative/templates` — returns credit cost and schema
- `POST /api/creative/templates` — executes the creative templates

## Consequences

- Adds no cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/templates.test.ts`
