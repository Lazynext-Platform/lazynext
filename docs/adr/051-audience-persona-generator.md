# ADR-051: Audience Persona Generator

**Date:** 2026-09-02
**Status:** Accepted

## Context

Understanding the target audience is the foundation of effective e-commerce
advertising. Advertisers frequently lack detailed, actionable audience
personas — relying on vague demographics rather than the rich
psychographics, pain points, platform behavior, and buying motivations that
drive creative decisions. A persona generator that produces detailed,
structured personas from a product or brand description can close this gap
and feed downstream creative tools (briefs, hooks, scripts, storyboards).

## Decision

Add an AI-powered Audience Persona Generator that:

- Accepts a product or brand description (required), plus optional industry
  and target market context
- Generates 3-5 detailed audience personas, each including:
  - Demographics (age range, gender, location, income level, education)
  - Psychographics (values, interests, lifestyle, personality traits)
  - Pain points (with how the product solves each one)
  - Platform behavior (platform, usage pattern, content preferences,
    best time to reach)
  - Buying motivations
  - Objections
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to template-based personas (3 realistic personas) in dry-run
  mode or when Atlas is unavailable
- Costs 4 credits per generation

### API

- `GET /api/creative/audience-persona-generator` — returns credit cost,
  schema, and available industries
- `POST /api/creative/audience-persona-generator` — generates audience
  personas

### UI

- `/audience-persona-generator` — form with product/brand input, optional
  industry selector, optional target market, and structured persona cards
  with copy-to-clipboard

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, and `withAtlas` conventions
- Dry-run mode works with the local mock Atlas server
- No new Prisma models required
- Generated personas can inform downstream creative tools (briefs, hooks,
  scripts) via future cross-feature handoffs
