# ADR-180: Hook Story Offer Designer

**Date:** 2026-09-02
**Status:** Accepted

## Context

Generates ads using the Hook-Story-Offer copywriting framework. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `ad-creative-hook-story-offer-designer` as a creative library in `src/lib/creative/ad-creative-hook-story-offer-designer.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 3 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/ad-creative-hook-story-offer-designer`

### API

- `GET /api/creative/ad-creative-hook-story-offer-designer` — returns credit cost and schema
- `POST /api/creative/ad-creative-hook-story-offer-designer` — executes the hook story offer designer

## Consequences

- Adds a 3-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/ad-creative-hook-story-offer-designer.test.ts`
