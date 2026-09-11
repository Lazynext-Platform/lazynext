# ADR-228: Live Activity Feed

**Date:** 2026-09-15
**Status:** Accepted
**Supersedes:** None

## Context

There was no real-time visibility into what was happening across the company.
Users had to manually check dashboards or poll APIs. The `openpolsia` reference
provided a live SSE activity feed.

## Decision

**Add a live activity feed** with two components:

1. **Activity Feed Service** (`src/lib/services/activity-feed.ts`) —
   queries the existing `Event` model (already populated by all services)
   and formats events as SSE. Supports pagination via cursor, type filtering,
   and statistics (total, last 24h, by type).

2. **SSE API route** (`GET /api/activity-feed`) —
   streams events to authenticated clients via Server-Sent Events.
   Sends recent events on connection, then polls for new events every 2
   seconds (Cloudflare Workers have a 30s subrequest limit, so persistent
   connections aren't feasible). Sends keepalive comments every 15 seconds.

3. **UI page** (`/activity-feed`) —
   renders the live stream with color-coded event types, relative timestamps,
   and connection status indicator.

The feed reuses the existing `Event` model — no new schema changes needed.
All services that emit events (agent runtime, bootstrapper, email, sites,
etc.) automatically appear in the feed.

## Consequences

- Real-time visibility into all company activity.
- No schema changes (reuses Event model).
- SSE with polling fallback works on Cloudflare Workers.
- 8 new tests (SSE formatting + event coloring).
