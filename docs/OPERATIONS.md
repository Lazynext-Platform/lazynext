# Operations Guide

Lazynext Operating System runs on Cloudflare Workers with D1 and R2
backends. This guide covers day-to-day operations: health monitoring,
cron jobs, rate limiting, caching, DNS, certificates, feature flags,
and administration.

## Production Environment

| Component | Value |
|-----------|-------|
| Worker name | `lazynext` |
| Custom domain | `lazynext.com` |
| Workers.dev URL | `https://lazynext.dry-hall-6a50.workers.dev/` |
| D1 database | `lazynext-db` (binding `DB`) |
| R2 bucket | `atlas-lazynext-studio-media` (binding `MEDIA_BUCKET`) |
| Cron trigger | `*/5 * * * *` (every 5 minutes) |
| Compatibility date | `2026-08-01` |
| Compatibility flags | `nodejs_compat`, `no_handle_cross_request_promise_resolution` |

## Health Monitoring

### Health Endpoint

`GET /api/health` is a public (no auth) endpoint that checks the
critical dependencies and returns 200 (healthy) or 503 (degraded).

| Check | What It Verifies |
|-------|------------------|
| D1 connectivity | Database is reachable and queryable |
| Token encryption | `TOKEN_ENCRYPTION_KEY` is configured (production hard-fail) |
| Cron secret | `CRON_SECRET` is set |
| Auth secret | `NEXTAUTH_SECRET` is set |
| Platform OAuth | Google client ID/secret are present |

### Monitoring Schedule

| Monitor | Frequency | Alert Condition |
|---------|-----------|-----------------|
| Health endpoint | 1 minute | Non-200 response |
| Cron execution | Per invocation (5 min) | Handler returns error |
| Error rate | Continuous | >5% of requests |
| D1 query latency | Continuous | p99 > 1000ms |
| Rate limit hits | Continuous | Sudden spike (possible abuse) |

## Cron Jobs

### Scheduled Post Processing

| Property | Value |
|----------|-------|
| Schedule | `*/5 * * * *` (every 5 minutes) |
| Handler | `worker-entry.mjs` → `scheduled` |
| Internal endpoint | `/api/publish/process-scheduled` |
| Authentication | `CRON_SECRET` header |
| Atomic claim | `updateMany` with `WHERE status='scheduled'` prevents duplicate processing |

The cron handler claims scheduled posts atomically before processing,
preventing duplicate publishes from concurrent invocations. Posts that
fail processing are marked with an error code (not raw error text) and
can be retried or refunded.

### Cron Handler Internals

The `worker-entry.mjs` scheduled handler uses `http://localhost` for
the internal subrequest URL (instead of the public domain) to avoid
DNS/egress issues. The subrequest includes the `CRON_SECRET` header
for authentication.

## Rate Limiting

Rate limiting is enforced via Cloudflare Rate Limiting bindings defined
in `wrangler.jsonc`:

| Limiter | Binding | Limit | Scope |
|---------|---------|-------|-------|
| API rate limiter | `API_RATE_LIMITER` | 60 req/min per IP | General API routes |
| AI rate limiter | `AI_RATE_LIMITER` | 10 req/min per IP | AI generation routes |
| Media endpoint | Application-level | 120 req/min per IP | `/api/lazynext-studio/media/[key]` |
| Share link views | Application-level | 30 req/min per IP | `/api/creative/share/[token]` |
| Share password attempts | Application-level | 10 req/min per IP | `/api/creative/share/[token]` |

E2E tests bypass rate limiting via `E2E_NO_RATE_LIMIT=1` environment
variable to ensure deterministic test results.

## Cache Headers

API routes set appropriate cache headers:

| Route Type | Cache Strategy | Headers |
|------------|---------------|---------|
| Static assets | Long-lived | `Cache-Control: public, max-age=31536000, immutable` |
| API (read, user-specific) | No cache | `Cache-Control: no-store` |
| API (read, public) | Short cache | `Cache-Control: public, max-age=60` |
| Health endpoint | No cache | `Cache-Control: no-store` |
| Media (R2) | Conditional | ETag + `Cache-Control: public, max-age=3600` |

## CDN

Cloudflare's CDN sits in front of the Workers runtime. Static assets
served from the `ASSETS` binding (`.open-next/assets` directory) are
cached at the edge. The CDN handles:

- Edge caching of static assets
- Gzip/Brotli compression
- HTTP/2 and HTTP/3
- TLS termination (managed certificates)
- DDoS protection (Cloudflare built-in)

## DNS

DNS is managed through Cloudflare. The custom domain `lazynext.com` is
configured as a custom domain route in `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "lazynext.com", "custom_domain": true }
]
```

Cloudflare automatically provisions the TLS certificate for the custom
domain. No manual certificate management is required.

### DNS Records

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `lazynext.com` | A/AAAA | Cloudflare Workers | Root domain |
| `www.lazynext.com` | CNAME | `lazynext.com` | WWW redirect |
| Dodo webhook | — | `https://lazynext.com/api/webhook/dodo` | Payment webhooks |

## Certificate Management

TLS certificates are managed automatically by Cloudflare for the custom
domain. Certificates are renewed automatically with no operator
intervention. The certificate covers `lazynext.com` and `*.lazynext.com`.

## Feature Flags

Feature flags are managed via environment variables (Cloudflare Workers
secrets). This allows toggling features without code changes:

| Flag | Purpose | Default |
|------|---------|---------|
| `PAYMENT_PROVIDER` | Selects billing provider (`dodo` or disabled) | `dodo` |
| `DODO_PAYMENTS_ENVIRONMENT` | Dodo mode (`test_mode` or `live_mode`) | `test_mode` |
| `E2E_NO_RATE_LIMIT` | Bypasses rate limiting (E2E only) | Not set in prod |
| `BUILD_TARGET` | Build target (`local` or `cloudflare`) | `cloudflare` |

Dry-run mode is available for ad platform integrations (Meta Ads, Google
Ads) without a flag — the system automatically uses dry-run when API
credentials are missing or when explicitly configured.

## Admin Dashboard

The admin dashboard is accessible to users whose email is listed in
`ADMIN_EMAILS`. The test account (`test@lazynext.local`) is included.

### Admin capabilities

| Function | Description |
|----------|-------------|
| Credit reconciliation | Audit and correct user credit balances with ledger entries |
| User management | View users, organizations, and workspaces |
| Platform health | View system health and cron status |
| Feature overview | Browse all ~158 features via `CategorizedAppGrid` |

### Credit Reconciliation

The admin credit reconciliation endpoint uses a sequential write +
compensation pattern (not `prisma.$transaction`, which D1 does not
reliably support): update balance → create ledger entry → if ledger
fails, reverse balance update.

## User / Organization / Workspace Administration

Lazynext uses a three-tier hierarchy:

| Entity | Description | D1 Tables |
|--------|-------------|-----------|
| User | Individual authenticated user | `User`, `Account`, `Session` |
| Organization | Team or company | `Organization`, `OrganizationMember` |
| Workspace | Project space within an org | `Workspace`, `WorkspaceMember` |

Team joining uses sequential writes with a compensation pattern for D1
compatibility (no `prisma.$transaction`).

## Support System

| Channel | Purpose | Mechanism |
|---------|---------|-----------|
| In-app feedback | User bug reports and feature requests | Feedback collection form |
| Email | Direct support | Configured support email |
| Status page | Incident communication | Public status page |
| Admin dashboard | Internal support tools | Admin-only access |

## Feedback Collection

User feedback is collected through an in-app form and stored in D1.
Feedback is reviewed by the product team and prioritized for the
backlog. Critical feedback (bugs affecting production) triggers an
incident response (see `docs/INCIDENT_RESPONSE.md`).

## Operational Checklist

### Daily

- [ ] Check `GET /api/health` returns 200
- [ ] Review error rate in Cloudflare analytics
- [ ] Verify cron trigger executed successfully (Cloudflare dashboard)

### Weekly

- [ ] Review rate limit hit patterns for abuse
- [ ] Check D1 storage usage
- [ ] Review user feedback queue
- [ ] Verify backup exports completed

### Monthly

- [ ] Test D1 restore from export (see `docs/BACKUP.md`)
- [ ] Review and rotate any long-lived secrets
- [ ] Update dependency versions (`npm audit`)
- [ ] Review observability log volume and sampling
