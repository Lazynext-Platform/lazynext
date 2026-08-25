# Dual-platform deployment

Lazynext uses one business codebase with platform-specific
database and media adapters selected before each build.

| Target | Database | Media storage | Selection |
|---|---|---|---|
| Cloudflare | D1 through `@prisma/adapter-d1` | R2 binding `MEDIA_BUCKET` | `npm run cf:*` forces `DEPLOY_TARGET=cloudflare` |
| Vercel | Neon Postgres through `@prisma/adapter-neon` | Public Vercel Blob | Vercel injects `VERCEL=1` |

`scripts/generate-prisma-clients.mjs` keeps `prisma/schema.prisma` as the
canonical model and generates both a D1 client and a PostgreSQL/Neon client.
`scripts/prepare-platform.mjs` then creates the platform entry modules consumed
by the application.

## Cloudflare Workers: D1 and R2

The checked-in `wrangler.jsonc` points at the hosted demo resources and
includes a custom domain route for `lazynext.com`. For a fork, create your
own resources:

```bash
npx wrangler login
npx wrangler d1 create atlas-marketing-studio
npx wrangler r2 bucket create atlas-lazynext-studio-media
```

Copy the returned D1 `database_id` and both resource names into
`wrangler.jsonc`, keeping the binding names exactly:

- D1: `DB`
- R2: `MEDIA_BUCKET`

Generate the initial SQLite/D1 schema and apply it to the remote database:

```bash
DATABASE_URL="file:./prisma/dev.db" npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  --output /tmp/atlas-marketing-studio-init.sql

npx wrangler d1 execute atlas-marketing-studio \
  --remote \
  --file=/tmp/atlas-marketing-studio-init.sql \
  -y
```

Configure application secrets:

```bash
npx wrangler secret put ATLASCLOUD_API_KEY
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put NEXTAUTH_URL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Add Dodo Payments or Atlas redeem-provider secrets if that payment path is enabled,
then build and deploy:

```bash
# Dodo Payments secrets (if PAYMENT_PROVIDER=dodo)
npx wrangler secret put DODO_PAYMENTS_API_KEY
npx wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY
npx wrangler secret put DODO_PAYMENTS_ENVIRONMENT    # test_mode or live_mode

# Create products and get product IDs
npm run setup:dodo

# Set product IDs as secrets
npx wrangler secret put DODO_PRODUCT_STARTER
npx wrangler secret put DODO_PRODUCT_PRO
npx wrangler secret put DODO_PRODUCT_ELITE

# Configure webhook URL in Dodo dashboard:
#   https://lazynext.com/api/webhook/dodo
#   Subscribe to: payment.succeeded
```

Seed the studio preset reference images (product/avatar shots used by the
one-click "Remix this" recipes and the avatar dropdown) into the media bucket.
The source frames are committed under `public/examples/marketing/reference/`:

```bash
node scripts/seed-example-media.mjs          # remote bucket from wrangler.jsonc
node scripts/seed-example-media.mjs --local  # local preview bucket (cf:preview)
```

Then build and deploy:

```bash
npm run cf:build
npm run cf:deploy
```

The storage capability endpoint should report:

```json
{"provider":"r2","configured":true,"directUpload":false}
```

## Vercel: Neon and Public Blob

1. Import the GitHub repository into Vercel.
2. Create or connect a Neon Postgres database.
3. Create a **Public** Vercel Blob store and connect it to the project.
4. Configure application/auth/payment variables from `.env.example`.
5. Set `CLOUDFLARE_MEDIA_BASE_URL` when existing database rows still contain
   `/api/lazynext-studio/media/<key>` R2 paths.

Required runtime variables:

```env
DATABASE_URL="postgresql://...pooler.../db?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
ATLASCLOUD_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-project.vercel.app"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Initialize an empty Neon database once from a trusted environment:

```bash
DEPLOY_TARGET=vercel npm run db:push:vercel
```

Vercel's Build Command is:

```bash
npm run build
```

The storage capability endpoint should report:

```json
{"provider":"vercel-blob","configured":true,"directUpload":true}
```

Reference videos and completed reels use browser-to-Blob multipart uploads, so
large media bodies do not pass through a Vercel Function. New Blob URLs are
stored directly in creation records.

## Existing R2 media on Vercel

Vercel does not automatically copy D1 records or R2 objects. During a staged
migration, configure:

```env
CLOUDFLARE_MEDIA_BASE_URL="https://your-worker.workers.dev"
```

The legacy media route redirects old R2 paths to the Cloudflare deployment, and
server-side image analysis can read those assets through that base URL. Remove
the variable only after old objects and database URLs have been migrated.

## Verification

Run both builds before publishing:

```bash
npx tsc --noEmit
DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/db" \
  BLOB_READ_WRITE_TOKEN="vercel_blob_rw_build_only" \
  npm run build:vercel
npm run cf:build
```

The placeholder variables above are only for build-time module validation; they
do not connect to a database or Blob store.

After deployment, verify:

- `https://lazynext.com/`, `/lazynext-studio`, `/ad-reference`, and `/drama-studio` return `200`.
- `https://lazynext.dry-hall-6a50.workers.dev/` (workers.dev URL) also returns `200`.
- `/api/media-storage/capabilities` reports the expected provider.
- unauthenticated upload/save requests return `401`.
- Cloudflare R2 media supports `Range` requests (`206`).
- Vercel direct upload succeeds for an authenticated user.

## Data migration boundary

- D1 users, credits, sessions, and creation history are not copied to Neon.
- R2 media is not copied to Vercel Blob.
- SQLite/D1 SQL cannot be applied to PostgreSQL.

For a production migration, use a maintenance window and separately validate
row counts, relationships, credit-ledger balances, object counts, and media URL
rewrites.

## Route rename: marketing-studio -> lazynext-studio

The `/marketing-studio` route was renamed to `/lazynext-studio` (and
`/api/marketing-studio/*` to `/api/lazynext-studio/*`). The `templateId` value
stored in the `Creation` table changed from `'marketing-studio'` to
`'lazynext-studio'`.

For existing deployments with saved creations, run a one-time SQL update so old
records appear in the My Work page:

```sql
-- Neon (PostgreSQL)
UPDATE "Creation" SET "templateId" = 'lazynext-studio' WHERE "templateId" = 'marketing-studio';
```

```bash
# Cloudflare D1
npx wrangler d1 execute lazynext-studio --remote --command \
  "UPDATE Creation SET templateId = 'lazynext-studio' WHERE templateId = 'marketing-studio';" -y
```

Old R2 object keys under the `marketing-studio-media` prefix are not affected;
only the bucket binding name in `wrangler.jsonc` changed. If you keep the
existing bucket, update `wrangler.jsonc` to point at your existing bucket name.
