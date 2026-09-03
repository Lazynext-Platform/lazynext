# Deployment Guide

Lazynext Operating System deploys exclusively to Cloudflare Workers using
OpenNext, with Cloudflare D1 for the database and Cloudflare R2 for media
storage. This guide covers the full deployment lifecycle from initial
setup to production verification.

## Architecture

| Component | Technology | Binding | Configuration |
|-----------|-----------|---------|---------------|
| Application runtime | Cloudflare Workers | — | `wrangler.jsonc` |
| Build system | OpenNext for Cloudflare | — | `@opennextjs/cloudflare` |
| Database | Cloudflare D1 | `DB` | `wrangler.jsonc` → `d1_databases` |
| Media storage | Cloudflare R2 | `MEDIA_BUCKET` | `wrangler.jsonc` → `r2_buckets` |
| Rate limiting | Cloudflare Rate Limiting | `API_RATE_LIMITER`, `AI_RATE_LIMITER` | `wrangler.jsonc` → `ratelimits` |
| Cron triggers | Cloudflare Cron | — | `wrangler.jsonc` → `triggers.crons` |
| Custom domain | Cloudflare DNS | — | `wrangler.jsonc` → `routes` |
| Worker entry | `worker-entry.mjs` | — | `wrangler.jsonc` → `main` |

## wrangler.jsonc Configuration

The checked-in `wrangler.jsonc` is the canonical infrastructure definition:

```jsonc
{
  "name": "lazynext",
  "main": "worker-entry.mjs",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat", "no_handle_cross_request_promise_resolution"],
  "d1_databases": [
    { "binding": "DB", "database_name": "lazynext-db", "database_id": "2b14197d-49b0-4d11-85e4-821ba3648ae3" }
  ],
  "r2_buckets": [],
  "ratelimits": [
    { "name": "API_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 60, "period": 60 } },
    { "name": "AI_RATE_LIMITER", "namespace_id": "1002", "simple": { "limit": 10, "period": 60 } }
  ],
  "observability": { "enabled": true, "logs": { "invocation_logs": true, "head_sampling_rate": 1 } },
  "routes": [
    { "pattern": "lazynext.com", "custom_domain": true }
  ],
  "triggers": { "crons": ["*/5 * * * *"] }
}
```

### Key bindings

- **D1 binding `DB`**: The database binding name must remain exactly `DB`.
  The Prisma D1 adapter (`@prisma/adapter-d1`) references this binding.
- **R2 binding `MEDIA_BUCKET`**: The media storage binding name must
  remain exactly `MEDIA_BUCKET`. (Note: the R2 bucket is configured at
  deploy time; the `r2_buckets` array in the checked-in config may be
  empty if the bucket is created separately.)
- **Rate limiters**: `API_RATE_LIMITER` (60 req/min) for general API
  routes; `AI_RATE_LIMITER` (10 req/min) for AI generation routes.
- **Cron trigger**: `*/5 * * * *` — fires every 5 minutes, invoking the
  `scheduled` handler in `worker-entry.mjs` which calls
  `/api/publish/process-scheduled` with `CRON_SECRET`.

## Initial Setup

### Create Cloudflare resources

```bash
npx wrangler login
npx wrangler d1 create lazynext-db
npx wrangler r2 bucket create atlas-lazynext-studio-media
```

Copy the returned D1 `database_id` into `wrangler.jsonc`, keeping the
binding name `DB`. Add the R2 bucket to `r2_buckets` with binding
`MEDIA_BUCKET`.

### Generate and apply D1 schema

```bash
DATABASE_URL="file:./prisma/dev.db" npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  --output /tmp/atlas-marketing-studio-init.sql

npx wrangler d1 execute lazynext-db --remote --file=/tmp/atlas-marketing-studio-init.sql -y
```

### Apply ongoing migrations

```bash
node scripts/apply-d1-migrations.mjs
```

This script tracks applied migrations in the `_prisma_migrations` table
and only applies pending ones (idempotent).

## Secret Management

Secrets are set via `wrangler secret put` and are encrypted at rest by
Cloudflare. They are never stored in git or `wrangler.jsonc`.

### Required secrets

```bash
npx wrangler secret put ATLASCLOUD_API_KEY
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put NEXTAUTH_URL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler secret put ALERT_WEBHOOK_URL
npx wrangler secret put ALERT_WEBHOOK_SECRET
```

### Dodo Payments secrets (if billing enabled)

```bash
npx wrangler secret put DODO_PAYMENTS_API_KEY
npx wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY
npx wrangler secret put DODO_PAYMENTS_ENVIRONMENT    # test_mode or live_mode

npm run setup:dodo    # Create products and get product IDs

npx wrangler secret put DODO_PRODUCT_STARTER
npx wrangler secret put DODO_PRODUCT_PRO
npx wrangler secret put DODO_PRODUCT_ELITE
```

Configure the webhook URL in the Dodo dashboard:
`https://lazynext.com/api/webhook/dodo` (subscribe to `payment.succeeded`).

## Build Commands

| Command | Purpose | Target |
|---------|---------|--------|
| `npm run cf:prepare` | Generate Prisma clients, prepare platform entry modules | Pre-build |
| `npm run cf:build` | OpenNext build for Cloudflare Workers | Build |
| `npm run cf:deploy` | Deploy to Cloudflare Workers | Deploy |
| `npm run cf:preview` | Deploy to a preview/staging URL | Staging |
| `npm run build` | Standard Next.js production build | Local verification |

### Full deployment sequence

```bash
# 1. Type check
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Unit tests
npm test

# 4. Cloudflare build
npm run cf:build

# 5. Deploy
npm run cf:deploy
```

## worker-entry.mjs

The `worker-entry.mjs` file wraps the OpenNext worker and adds a
`scheduled` handler for cron triggers. The scheduled handler uses
`http://localhost` for the internal subrequest URL (avoiding DNS/egress
issues) and invokes `/api/publish/process-scheduled` with the
`CRON_SECRET` header for authentication.

The cron handler uses an atomic claim pattern (`updateMany` with
`WHERE status='scheduled'`) to prevent duplicate publishes from
concurrent cron invocations.

## Staging and Preview

Staging deployments use `npm run cf:preview`, which deploys to a
preview URL on `workers.dev`. This allows testing changes against
production D1 and R2 without affecting the live `lazynext.com` domain.

```bash
npm run cf:preview    # Deploy to preview URL
```

Seed example media to the local preview bucket:

```bash
node scripts/seed-example-media.mjs --local
```

## Bundle Size Checks

Bundle size is verified during `cf:build`. Cloudflare Workers has a
compressed size limit (3 MB for paid plans). The build output reports
the bundle size; if it exceeds the limit, the build fails.

Optimizations that keep the bundle small:
- `experimental.optimizePackageImports: ['lucide-react']` in `next.config.mjs`
- Dynamic locale loading (only active locale in bundle)
- Tree-shaking of unused creative libraries

## Post-Deployment Verification

After deployment, verify:

| Check | URL | Expected |
|-------|-----|----------|
| Homepage | `https://lazynext.com/` | 200 |
| Studio | `https://lazynext.com/lazynext-studio` | 200 |
| Ad Reference | `https://lazynext.com/ad-reference` | 200 |
| Drama Studio | `https://lazynext.com/drama-studio` | 200 |
| Workers.dev | `https://lazynext.dry-hall-6a50.workers.dev/` | 200 |
| Health | `https://lazynext.com/api/health` | 200, all checks `ok` |
| Media capabilities | `https://lazynext.com/api/media-storage/capabilities` | `{"provider":"r2","configured":true}` |
| Unauthenticated upload | `POST /api/lazynext-studio/media` | 401 |
| R2 Range support | `GET /api/lazynext-studio/media/<key>` with Range header | 206 |
| Cron trigger | Cloudflare dashboard | Active, `*/5 * * * *` |

## Route Rename Note

The `/marketing-studio` route was renamed to `/lazynext-studio`. For
existing deployments with saved creations, run a one-time SQL update:

```bash
npx wrangler d1 execute lazynext-db --remote --command \
  "UPDATE Creation SET templateId = 'lazynext-studio' WHERE templateId = 'marketing-studio';" -y
```

Old R2 object keys under the `marketing-studio-media` prefix are not
affected; only the bucket binding name in `wrangler.jsonc` changed.
