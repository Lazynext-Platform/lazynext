# ADR-188: Brief Intelligence

**Date:** 2026-09-02
**Status:** Accepted

## Context

Analyzes creative briefs for USP extraction, competitive advantages, and scoring. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `brief-intelligence` as a creative library in `src/lib/creative/brief-intelligence.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 4 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/brief-intelligence`

### API

- `GET /api/creative/brief-intelligence` — returns credit cost and schema
- `POST /api/creative/brief-intelligence` — executes the brief intelligence

## Consequences

- Adds a 4-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/brief-intelligence.test.ts`
