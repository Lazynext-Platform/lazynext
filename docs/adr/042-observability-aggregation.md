# ADR-042: Production Observability Aggregation

**Date:** 2026-09-02
**Status:** Accepted
**Series:** QQ

## Context

LazyNext emits structured telemetry events via `console.log` (captured by
Cloudflare Workers) and has an alert system (`src/lib/observability/alerts.ts`)
that sends push-based notifications for critical failures. However, there was
no way to **aggregate and visualize** platform metrics — the only options were:

1. Cloudflare dashboard (Workers Logs, metrics) — external, not integrated
   into the LazyNext UI.
2. Manual D1 queries — ad-hoc, not repeatable.

The architecture audit listed "Production observability — telemetry events
are emitted but not aggregated or alerted on" as a known gap.

## Decision

**Add a first-party observability metrics API and dashboard page.**

### 1. Metrics API: `GET /api/observability/metrics`

Admin-only endpoint that aggregates data from existing D1 tables:

- **Pipelines**: total runs, completed, failed, running, success rate
  (from `WorkflowRun`)
- **Creations**: total, completed, failed, success rate (from `Creation`)
- **Workflow steps**: total, failed, step success rate (from `WorkflowStep`)
- **Credits**: granted, spent, refunded, net (from `CreditLedger`)
- **Users**: total, new in range (from `User`)

Supports `?range=24h|7d|30d` for time-windowed metrics.

All queries run in parallel via `Promise.all` for minimal latency. The
endpoint requires admin session (`ADMIN_EMAILS`) to prevent exposing
platform-wide metrics to non-admin users.

### 2. Observability Dashboard: `/observability`

Admin-only UI page that fetches metrics from the API and renders them in
card-based sections:

- Pipelines section (5 metric cards)
- Media Creations section (4 metric cards)
- Workflow Steps section (3 metric cards)
- Credits section (4 metric cards)
- Users section (2 metric cards)

Includes a time-range selector (24h / 7d / 30d) and auto-refreshes when the
range changes.

### 3. Cloudflare Workers Observability Enhancement

Updated `wrangler.jsonc` to enable invocation logs with head sampling rate
of 1 (100% sampling):

```jsonc
"observability": {
  "enabled": true,
  "logs": {
    "invocation_logs": true,
    "head_sampling_rate": 1
  }
}
```

This enables Cloudflare's built-in Workers Logs for structured log queries,
CPU time / wall time analysis, and invocation status tracking — complementing
the first-party metrics endpoint with platform-level observability.

### 4. Nav link

Added `/observability` to the nav header overflow menu with the `Activity`
icon.

## Consequences

### Positive

- Admins can view platform health metrics without leaving LazyNext or
  running manual D1 queries.
- Time-range filtering (24h / 7d / 30d) enables trend analysis.
- Success rates surface failures quickly — a drop below 90% is visually
  highlighted with warning colors.
- Credit flow (granted vs spent vs refunded vs net) provides financial
  visibility.
- Cloudflare Workers Logs provide deeper diagnostics (CPU time, wall time,
  invocation traces) for performance debugging.

### Negative

- The metrics endpoint runs ~14 D1 queries per request. At high admin
  usage this could add latency, but it's bounded by the admin-only access
  control.
- The dashboard is a snapshot, not real-time — it refreshes on demand,
  not via WebSocket or polling.

### Neutral

- The metrics endpoint is read-only and does not modify any data.
- The dashboard page follows existing patterns (AuthProvider, LoadingSpinner,
  useTranslations, responsive grid, accessible color coding).
