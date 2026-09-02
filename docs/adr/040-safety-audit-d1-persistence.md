# ADR-040: Safety Audit Log D1 Persistence

**Date:** 2026-08-30
**Status:** Accepted

## Context

The Meta Ads Safety Layer (ADR-035) and Google Ads Safety Layer (ADR-036) originally stored
audit log entries and pending approval requests in in-memory `Map` structures. This approach
works for single-instance local development and unit testing but fails in production:

1. **Multi-instance workers:** Cloudflare Workers can spin up multiple isolates. In-memory state
   is not shared across isolates — an approval created in one isolate is invisible to another.
2. **No durability:** Worker isolates are ephemeral. If a worker restarts, all in-memory audit
   logs and pending approvals are lost, violating the safety audit trail requirement.
3. **No historical queries:** In-memory storage cannot answer "how many mutations were approved
   yesterday?" or "what was the spend delta on campaign X last week?" without persistent storage.

The safety layers need durable, queryable storage for audit logs and approval state to be
production-grade.

## Decision

Persist safety audit logs and approval state to Cloudflare D1 via Prisma, with in-memory fallback
for local development and unit testing.

### New Prisma Models

Four new models added to `prisma/schema.prisma`:

- `MetaSafetyAudit` — action, actor, timestamp, dryRun, approved, payload (JSON), result, spendDelta
- `MetaSafetyApproval` — action, payload, status, createdAt, expiresAt (24h TTL), approvedBy, approvedAt
- `GoogleSafetyAudit` — same schema as Meta, separate table
- `GoogleSafetyApproval` — same schema as Meta, separate table

Each model has indexes on the most common query patterns (actor/timestamp for audits,
status/expiresAt for approvals).

### D1-First, In-Memory Fallback

The persistence layer follows a "D1 first, fall back to in-memory" strategy:

1. **Lazy Prisma import:** `getPrisma()` performs a dynamic `await import('@/lib/prisma')` so the
   module has no database dependency at import time. This keeps the module importable in the Node
   test runner, which does not have D1/SQLite configured.
2. **Try/catch on all D1 operations:** Every D1 read/write is wrapped in try/catch. If D1 is
   unavailable (local dev without database, test runner), the operation silently falls back to
   the existing in-memory `Map`/array storage.
3. **API routes try D1 first:** The GET endpoints for safety config and pending approvals attempt
   to read from D1 first. If D1 returns data, it's used. If D1 returns nothing or throws, the
   in-memory path serves the response.
4. **Best-effort writes:** The POST endpoints for approval actions call both the in-memory
   function and the D1 persistence function. The D1 write is best-effort (`.catch(() => undefined)`)
   so a D1 failure does not block the approval action.

### What Stays In-Memory

Safety **configuration** (dryRun flag, budget caps, blocked actions, etc.) remains in-memory.
Configuration is set at deploy time via environment variables and admin API calls. It does not
need persistence because:
- It changes infrequently (admin-only updates)
- It can be reconstructed from environment defaults
- Persisting it would introduce a configuration sync problem across isolates

Only the **audit trail** (what happened) and **approval state** (what's pending) are persisted.

## Consequences

### Positive

- **Multi-instance production:** Audit logs and approvals are visible across all worker isolates.
- **Durability:** Audit trail survives worker restarts.
- **Queryable:** Admin dashboards can query historical audit data via D1.
- **Backward compatible:** All existing unit tests pass unchanged — in-memory fallback activates
  automatically in the test runner.
- **No new dependencies:** Uses existing Prisma + D1 infrastructure.

### Negative

- **D1 write latency:** Each audit entry and approval request now incurs a D1 write. This adds
  ~5-10ms per safety action. Acceptable given that safety actions are low-frequency (max 20/day
  by default).
- **Schema migration required:** The 4 new tables must be created in D1 before the persistence
  layer activates. Applied via `wrangler d1 execute --remote`.
- **Dual storage during transition:** In-memory and D1 are both written to. This is intentional
  for backward compatibility but means in-memory state may diverge from D1 if a worker restarts.
  The API routes prefer D1 data when available, so this divergence is self-correcting.

## Implementation

- `src/lib/ads/meta-safety.ts` — added `persistAuditEntry`, `getAuditLogFromDB`,
  `getAuditSummaryFromDB`, `persistApprovalRequest`, `updateApprovalStatusInDB`,
  `getPendingApprovalsFromDB`
- `src/lib/ads/google-safety.ts` — same 6 functions for Google models
- `src/app/api/ads/meta-safety/route.ts` — GET tries D1 first
- `src/app/api/ads/meta-approve/route.ts` — GET/POST try D1 first
- `src/app/api/ads/google-safety/route.ts` — GET tries D1 first
- `src/app/api/ads/google-approve/route.ts` — GET/POST try D1 first
- `prisma/schema.prisma` — 4 new models

## Related ADRs

- ADR-035: Meta Ads Safety Layer (original in-memory implementation)
- ADR-036: Google Ads Safety Layer (original in-memory implementation)
- ADR-004: Ad Platform Providers with Dry-Run Mode (safety layer foundation)
