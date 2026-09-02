# ADR-199: Product Image Generator

**Date:** 2026-09-02
**Status:** Accepted

## Context

Generates product images with AI using Atlas generation capabilities. This capability
is part of the LazyNext creative intelligence platform and supports the product
goal of providing one intelligent AI e-commerce creative studio.

## Decision

Implement `product-image` as a creative library in `src/lib/creative/product-image.ts`
that:

- Uses the shared creative toolkit (`src/lib/creative/toolkit.ts`) for model
  resolution, dry-run detection, and JSON extraction
- Uses plan-tier-aware model selection via the provider registry
- Falls back to deterministic dry-run output when Atlas is unavailable or
  API key is missing
- Costs 3 credits per generation
- Uses existing auth, credit deduction/refund, and `safeError` conventions
- Exposes API routes under `/api/creative/product-image`

### API

- `GET /api/creative/product-image` — returns credit cost and schema
- `POST /api/creative/product-image` — executes the product image generator

## Consequences

- Adds a 3-credit cost to user accounts when used
- Dry-run mode ensures the feature works without Atlas credentials
- Follows the established pattern of 189 creative libraries using the shared toolkit
- Covered by unit tests in `test/product-image.test.ts`
