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
- Stores hooks in D1 (via Prisma `Hook` model) so they survive deploys and
  are scoped per user (`userId`); retrieval and filtering query the database
- Supports filtering by emotional trigger, platform, and minimum score
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to heuristic-based hooks in dry-run mode (dry-run hooks are
  still persisted to D1 so the flow is testable end-to-end)
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
- Hooks are persisted to D1 via the Prisma `Hook` model (with `userId`
  ownership and indexes on `[userId]` and `[userId, trigger]`). The
  `generateHooks` and `getHooks` functions take a `userId` parameter so
  users can only read their own hooks. Persistence is best-effort: if the
  database is unavailable (e.g. unit tests without a mocked client),
  writes/reads fail gracefully and generated hooks are still returned
- The UI page fetches stored hooks via `GET /api/creative/hook-library`
  (which carries the session and enforces ownership) on mount
- Dry-run mode works with the local mock Atlas server
