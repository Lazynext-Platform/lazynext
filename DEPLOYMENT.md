# Cloudflare deployment

Lazynext deploys exclusively to Cloudflare Workers using OpenNext, with
Cloudflare D1 for the database and Cloudflare R2 for media storage.

| Target | Database | Media storage | Selection |
|---|---|---|---|
| Cloudflare | D1 through `@prisma/adapter-d1` | R2 binding `MEDIA_BUCKET` | `npm run cf:*` forces `DEPLOY_TARGET=cloudflare` |

`scripts/generate-prisma-clients.mjs` uses `prisma/schema.prisma` as the
canonical model and generates the D1 client.
`scripts/prepare-platform.mjs` creates the platform entry modules consumed
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

## Verification

Run the build before publishing:

```bash
npx tsc --noEmit
npm run cf:build
```

After deployment, verify:

- `https://lazynext.com/`, `/lazynext-studio`, `/ad-reference`, and `/drama-studio` return `200`.
- `https://lazynext.dry-hall-6a50.workers.dev/` (workers.dev URL) also returns `200`.
- `/api/media-storage/capabilities` reports the expected provider.
- unauthenticated upload/save requests return `401`.
- Cloudflare R2 media supports `Range` requests (`206`).

## Route rename: marketing-studio -> lazynext-studio

The `/marketing-studio` route was renamed to `/lazynext-studio` (and
`/api/marketing-studio/*` to `/api/lazynext-studio/*`). The `templateId` value
stored in the `Creation` table changed from `'marketing-studio'` to
`'lazynext-studio'`.

For existing deployments with saved creations, run a one-time SQL update so old
records appear in the My Work page:

```bash
# Cloudflare D1
npx wrangler d1 execute lazynext-studio --remote --command \
  "UPDATE Creation SET templateId = 'lazynext-studio' WHERE templateId = 'marketing-studio';" -y
```

Old R2 object keys under the `marketing-studio-media` prefix are not affected;
only the bucket binding name in `wrangler.jsonc` changed. If you keep the
existing bucket, update `wrangler.jsonc` to point at your existing bucket name.
