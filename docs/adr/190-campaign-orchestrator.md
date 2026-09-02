# ADR-190: Campaign Orchestrator

**Date:** 2026-09-02
**Status:** Accepted

## Context

Orchestrates the full campaign lifecycle: goal, research, concepts, approvals, budget, publish, optimize. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `campaign-orchestrator` as a creative library in `src/lib/creative/campaign-orchestrator.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 8 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/campaign-orchestrator`

### API

- `GET /api/creative/campaign-orchestrator` — returns credit cost and schema
- `POST /api/creative/campaign-orchestrator` — executes the campaign orchestrator

## Consequences

- Adds a 8-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/campaign-orchestrator.test.ts`
