# ADR-049: Brief Template Builder

**Date:** 2026-08-31
**Status:** Accepted

## Context

Creating a creative brief from scratch is a barrier for many e-commerce
advertisers. Different industries have different best practices, audience
expectations, and compliance considerations. A template builder with
industry-specific presets can significantly reduce the time to a
production-ready creative brief.

## Decision

Add an AI-powered Brief Template Builder that:

- Accepts an industry (beauty, tech, food, fashion, fitness, home,
  finance, travel), product category, and optional brand kit
- Generates a creative brief template with:
  - Target audience persona
  - Key value propositions (3-5)
  - Recommended hooks (3-5)
  - Recommended angles (3-5)
  - Visual direction suggestions
  - Platform-specific recommendations
  - Compliance considerations
- Includes 8 industry-specific presets for dry-run fallback
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to preset-based templates in dry-run mode
- Costs 4 credits per generation

### API

- `GET /api/creative/brief-template-builder` — returns credit cost,
  schema, and available industry presets
- `POST /api/creative/brief-template-builder` — generates a brief template

### UI

- `/brief-template-builder` — form with industry selector, product
  category, optional brand kit/product URL, and structured results
  display with copy-to-clipboard

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, and `withAtlas` conventions
- Industry presets are hardcoded in the library (not user-editable)
- Dry-run mode works with the local mock Atlas server
- No new Prisma models required
