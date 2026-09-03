# Observability Architecture

Lazynext Operating System implements a layered observability strategy
covering structured logs, metrics, health monitoring, error tracking,
security event monitoring, and audit logs. The system is designed to
provide actionable signal without exposing secrets.

## Observability Stack

| Layer | Provider | Mechanism | Status |
|-------|----------|-----------|--------|
| Structured logs | Cloudflare Workers | `console.log` with JSON payloads; `observability.enabled` in `wrangler.jsonc` | Enabled |
| Invocation logs | Cloudflare Workers | `invocation_logs: true`, `head_sampling_rate: 1` (100% sampling) | Enabled |
| Metrics | Cloudflare Workers Analytics | Built-in request, CPU, and error metrics | Automatic |
| Health checks | Application | `GET /api/health` endpoint | Public, no auth |
| Rate-limit metrics | Cloudflare Rate Limiting | `API_RATE_LIMITER`, `AI_RATE_LIMITER` namespaces | Active |
| Alerting | Webhook | `ALERT_WEBHOOK_URL` + `ALERT_WEBHOOK_SECRET` | Configurable |

## Structured Logging

All server-side logs are emitted as JSON objects with consistent fields.
The `wrangler.jsonc` configuration enables Workers observability with
full (100%) head sampling so no requests are dropped from logs:

```jsonc
"observability": {
  "enabled": true,
  "logs": {
    "invocation_logs": true,
    "head_sampling_rate": 1
  }
}
```

### Standard log fields

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | Severity level (see below) |
| `message` | string | Human-readable summary |
| `requestId` | string | Unique request identifier |
| `correlationId` | string | Cross-request correlation ID |
| `route` | string | API route or page path |
| `userId` | string | Authenticated user ID (if available) |
| `duration` | number | Request duration in milliseconds |
| `timestamp` | string | ISO 8601 timestamp |
| `error` | object | Sanitized error details (no raw stack traces to client) |

## Severity Levels

| Level | Numeric | Usage |
|-------|---------|-------|
| `DEBUG` | 10 | Verbose diagnostic output (dev only) |
| `INFO` | 20 | Normal operations (request received, cron executed) |
| `WARN` | 30 | Degraded behavior (rate limit hit, retrying, fallback used) |
| `ERROR` | 40 | Operation failed but service continues (API error, DB query failed) |
| `CRITICAL` | 50 | Service unavailable (D1 unreachable, auth secret missing) |

Production deployments filter out `DEBUG` logs. `WARN` and above are
retained for alerting.

## Request IDs and Correlation IDs

Every request is assigned a unique `requestId` at the edge. For
multi-step workflows (e.g., creative pipelines, cron-triggered post
processing), a `correlationId` propagates across sub-requests so that
a single user action can be traced through all downstream calls.

The cron handler in `worker-entry.mjs` generates a correlation ID for
each scheduled invocation and passes it to the internal subrequest to
`/api/publish/process-scheduled`, allowing scheduled-post processing
to be traced end-to-end.

## Health Monitoring

### `/api/health` Endpoint

The `GET /api/health` endpoint is public (no authentication required)
and returns HTTP 200 when healthy or HTTP 503 when degraded. It performs
the following checks:

| Check | Description | Failure Action |
|-------|-------------|----------------|
| D1 connectivity | Executes a simple query against the D1 binding | Return 503, log CRITICAL |
| Token encryption | Verifies `TOKEN_ENCRYPTION_KEY` is configured in production | Return 503, log CRITICAL |
| Cron secret | Verifies `CRON_SECRET` is set | Return 503, log WARN |
| Auth secret | Verifies `NEXTAUTH_SECRET` is set | Return 503, log CRITICAL |
| Platform OAuth credentials | Checks Google client ID/secret presence | Return 503, log WARN |

### Response shape

```json
{
  "status": "healthy" | "degraded",
  "checks": {
    "d1": "ok" | "fail",
    "tokenEncryption": "ok" | "fail",
    "cronSecret": "ok" | "fail",
    "authSecret": "ok" | "fail",
    "oauth": "ok" | "fail"
  },
  "timestamp": "2026-08-30T14:30:00.000Z"
}
```

External uptime monitors (e.g., Cloudflare Workers analytics, UptimeRobot)
should poll this endpoint at 1-minute intervals and alert on non-200
responses.

## Error Tracking

### Error Sanitization

Raw error messages are never sent to clients. The `safeError()` helper in
`src/lib/security.ts` maps caught exceptions to controlled error codes.
The pipeline error classifier (`src/lib/pipeline-error-classifier.ts`)
maps raw errors to semantic codes:

| Code | Meaning |
|------|---------|
| `rate_limited` | Upstream or internal rate limit hit |
| `insufficient_credits` | User lacks credits for the operation |
| `timeout` | Request or upstream call timed out |
| `network` | Network failure reaching upstream |
| `auth` | Authentication or authorization failure |
| `server` | Internal server error |
| `unknown` | Unclassified error |

Raw error messages and stack traces are retained for server-side logging
only.

## Security Event Monitoring

| Event Type | Trigger | Log Level |
|------------|---------|-----------|
| Authentication failure | Invalid credentials, expired JWT | WARN |
| Authorization failure | Access to resource without permission | WARN |
| Rate limit exceeded | API or AI rate limit hit | WARN |
| OAuth token exchange failure | `invalid_grant`, `invalid_client`, `redirect_uri_mismatch` | ERROR |
| Token decryption failure | AES-256-GCM decrypt fails | CRITICAL |
| Media key enumeration attempt | Repeated 404s on media endpoints | WARN |
| Webhook signature mismatch | Dodo webhook signature validation fails | ERROR |

## Audit Logs

Audit-worthy actions are persisted to D1 with a 24h-TTL for high-volume
events (ad platform safety actions) and permanent retention for
administrative actions:

- Ad platform mutations (Meta Safety, Google Safety) — 24h TTL audit log
- Admin dashboard actions (credit reconciliation, user management)
- OAuth connect/disconnect events
- Scheduled post creation and cancellation

## Alerting

Alerts are delivered via webhook (`ALERT_WEBHOOK_URL` with
`ALERT_WEBHOOK_SECRET` for authentication). Alert conditions include:

- Health endpoint returns 503
- Error rate exceeds threshold (configurable)
- D1 connectivity failures
- Token encryption misconfiguration in production
- Cron execution failures

## Secret Handling

**Never log secrets.** The following must never appear in logs, error
responses, or client-facing data:

- `NEXTAUTH_SECRET`, `CRON_SECRET`, `TOKEN_ENCRYPTION_KEY`
- `ATLASCLOUD_API_KEY`, `GOOGLE_CLIENT_SECRET`
- `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`
- OAuth access tokens and refresh tokens (log token presence, not values)
- User passwords and password hashes
- JWT session tokens

The `safeError()` helper and pipeline error classifier ensure that raw
exception messages — which may contain secret values in stack traces —
are not leaked to clients or logged at INFO level.
