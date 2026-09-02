# ADR-016: Batch Creative Generation

## Date
2026-08-28

## Status
Accepted

## Context
A/B testing creative variants requires generating multiple options in parallel so users can compare and select the best-performing version. The existing creative API endpoints (hooks, angles, scripts, score) generate one result per call, but there was no UI or orchestration layer to fire multiple generations and present them side-by-side for comparison.

## Decision
1. Batch generation fires N parallel `fetch()` calls (2–5 variants) to existing API endpoints using `Promise.allSettled`
2. Partial success is acceptable — if some variants fail, the successful ones are still displayed
3. A comparison grid renders all generated variants with per-variant scoring
4. Cards in the grid are sorted by score (highest first)
5. A "Use This" button on each card selects that variant as the active result, promoting it into the main creative workspace
6. No new API routes are created — the batch layer reuses the existing single-generation endpoints (`/api/creative/hooks`, `/api/creative/angles`, `/api/creative/scripts`, `/api/creative/score`)

## Consequences
- Up to 5x credit cost per batch (one credit charge per variant per endpoint)
- No new API routes needed — the batch orchestration is entirely client-side, reusing existing endpoints
- `Promise.allSettled` ensures one variant failure does not reject the entire batch
- Enables data-driven creative selection — users pick the highest-scored variant rather than accepting a single generation
- The comparison grid adds UI complexity but provides significant value for A/B testing workflows
