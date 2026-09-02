# ADR-193: Creator Campaign Kits

**Date:** 2026-09-02
**Status:** Accepted

## Context

Generates creator-ready campaign kits with briefs, talking points, and visual guidelines. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `creator-kits` as a creative library in `src/lib/creative/creator-kits.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 5 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/creator-kits`

### API

- `GET /api/creative/creator-kits` — returns credit cost and schema
- `POST /api/creative/creator-kits` — executes the creator campaign kits

## Consequences

- Adds a 5-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/creator-kits.test.ts`
