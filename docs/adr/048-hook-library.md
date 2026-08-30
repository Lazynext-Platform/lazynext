# ADR-048: Hook Library

**Date:** 2026-08-31
**Status:** Accepted

## Context

Hooks are the most critical element of short-form ad creative — they
determine whether a viewer scrolls past or stays. Currently, hooks are
generated ad-hoc within individual features (multi-concept, creative
studio, pipeline) with no way to store, retrieve, or reuse successful hooks
across campaigns.

## Decision

Add an AI-powered Hook Library that:

- Generates hooks categorized by emotional trigger (fear, aspiration,
  humor, urgency, curiosity, social_proof)
- Tags each hook with platform suitability (tiktok, instagram, youtube,
  facebook)
- Assigns a predicted performance score (0-100) based on trigger type
  and platform
- Stores hooks in an in-memory store (Map) for retrieval and filtering
- Supports filtering by emotional trigger, platform, and minimum score
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to heuristic-based hooks in dry-run mode
- Costs 4 credits for generation, 0 credits for retrieval

### API

- `GET /api/creative/hook-library` — returns credit cost, schema, and
  optionally stored hooks with query filters
- `POST /api/creative/hook-library` — generates new hooks

### UI

- `/hook-library` — form for product context, trigger selector, platform
  selector, count, with filterable results grid and copy buttons

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, and `withAtlas` conventions
- In-memory store is per-instance (not persisted to D1) — hooks are
  ephemeral and reset on deploy. Future work could add a Prisma model
  for persistent storage
- Dry-run mode works with the local mock Atlas server
