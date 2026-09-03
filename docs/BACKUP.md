# Backup Architecture

Lazynext Operating System runs on Cloudflare's managed infrastructure.
Backup strategy leverages Cloudflare-native capabilities supplemented by
application-level configuration backups. The guiding principle is:
**backups are not complete until restoration is tested.**

## Infrastructure Overview

| Component | Provider | Backup Mechanism | Retention |
|-----------|----------|------------------|-----------|
| Database | Cloudflare D1 | Point-in-time recovery + export | 30 days |
| Media storage | Cloudflare R2 | Versioning + cross-region replication | 90 days |
| Configuration | Git repository | Version-controlled `wrangler.jsonc`, schema, env example | Indefinite (git history) |
| Secrets | Cloudflare Workers secrets | Manual re-provisioning from secure vault | N/A |
| DNS | Cloudflare DNS | Zone export | Indefinite |
| TLS certificates | Cloudflare (managed) | Automatic renewal | N/A |

## Cloudflare D1 Backups

### Point-in-Time Recovery

Cloudflare D1 maintains automatic backups that support point-in-time
recovery. The D1 database (`lazynext-db`, binding `DB`) is backed up
continuously, allowing restoration to a specific timestamp within the
retention window.

### Export Backups

In addition to managed backups, periodic full exports provide an
off-platform copy of the database:

```bash
# Export the full D1 database to a SQL file
npx wrangler d1 export lazynext-db --remote --output backup-$(date +%Y%m%d).sql
```

Exports should be stored in a separate Cloudflare R2 bucket or
downloaded to secure off-platform storage.

### Schema Backups

The canonical schema is defined in `prisma/schema.prisma` and is
version-controlled in git. D1 migrations are tracked in the
`_prisma_migrations` table and applied via
`scripts/apply-d1-migrations.mjs`, which is idempotent (only applies
pending migrations).

## R2 Object Backups

Media files are stored in Cloudflare R2. The backup strategy for R2
includes:

- **Versioning**: R2 bucket versioning retains previous object versions,
  allowing recovery from accidental overwrites or deletions.
- **Cross-region replication**: Objects are replicated to a secondary
  region for geographic resilience.
- **Periodic export**: Large or critical media objects can be exported
  to a separate bucket or downloaded for off-platform storage.

```bash
# List objects in the media bucket
npx wrangler r2 object list atlas-lazynext-studio-media

# Download a specific object for backup
npx wrangler r2 object get atlas-lazynext-studio-media/<key> ./backup/<key>
```

## Configuration Backups

### Infrastructure Definitions

All infrastructure definitions are version-controlled in git:

| File | Purpose |
|------|---------|
| `wrangler.jsonc` | Worker config, D1 binding, rate limits, cron, routes |
| `prisma/schema.prisma` | Database schema (37 tables) |
| `prisma/migrations/` | Migration SQL files |
| `next.config.mjs` | Next.js configuration |
| `package.json` / `package-lock.json` | Dependency versions |
| `.env.example` | Environment variable template (no secrets) |

### DNS

DNS records are managed through Cloudflare DNS. The zone can be exported
as a BIND-format file for backup:

```bash
npx wrangler dns export lazynext.com --output dns-backup-$(date +%Y%m%d).txt
```

### TLS Certificates

TLS certificates for `lazynext.com` are managed automatically by
Cloudflare. No manual backup is required; certificates are renewed
automatically. The custom domain route is defined in `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "lazynext.com", "custom_domain": true }
]
```

## Secrets Recovery Strategy

Cloudflare Workers secrets (environment variables set via
`wrangler secret put`) are NOT backed up automatically. They must be
re-provisioned manually from a secure secrets vault.

### Required Secrets

| Secret | Purpose | Recovery Source |
|--------|---------|-----------------|
| `ATLASCLOUD_API_KEY` | Atlas Cloud AI generation API | Atlas Cloud dashboard |
| `NEXTAUTH_SECRET` | NextAuth JWT signing | Generate new secret; invalidates sessions |
| `NEXTAUTH_URL` | Auth callback URL | Set to `https://lazynext.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google Cloud Console |
| `CRON_SECRET` | Cron handler authentication | Generate new secret; update cron handler |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM token encryption | Generate new key; requires re-encrypting stored tokens |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments billing | Dodo dashboard |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Dodo webhook validation | Dodo dashboard |
| `DODO_PAYMENTS_ENVIRONMENT` | Dodo mode (test/live) | Set to `live_mode` or `test_mode` |
| `DODO_PRODUCT_STARTER` | Dodo product ID | Dodo dashboard |
| `DODO_PRODUCT_PRO` | Dodo product ID | Dodo dashboard |
| `DODO_PRODUCT_ELITE` | Dodo product ID | Dodo dashboard |
| `ALERT_WEBHOOK_URL` | Alerting webhook | Monitoring service |
| `ALERT_WEBHOOK_SECRET` | Alerting webhook auth | Generate new secret |

### Recovery Procedure

1. Access the secure secrets vault (e.g., 1Password, Bitwarden).
2. For each secret, either retrieve the stored value or generate a new one.
3. Upload secrets to Cloudflare Workers:
   ```bash
   npx wrangler secret put ATLASCLOUD_API_KEY
   # ... repeat for each secret
   ```
4. If `TOKEN_ENCRYPTION_KEY` is rotated, stored OAuth tokens must be
   re-encrypted or users must re-authenticate with each platform.
5. If `NEXTAUTH_SECRET` is rotated, all active JWT sessions are
   invalidated; users must re-login.

## Retention Policy

| Data Type | Retention Period | Rationale |
|-----------|-----------------|-----------|
| D1 point-in-time recovery | 30 days | Sufficient for detecting data corruption |
| D1 export files | 90 days | Quarterly compliance window |
| R2 object versions | 90 days | Recovery from accidental deletion |
| Git history | Indefinite | Full audit trail of configuration changes |
| Audit logs (admin) | Indefinite | Compliance requirement |
| Audit logs (ad safety) | 24 hours | High volume; operational only |

## 3-2-1 Resilience Strategy

The 3-2-1 backup principle is applied as follows:

- **3** copies of data: primary (D1/R2), managed backup (Cloudflare),
  export backup (R2 bucket or off-platform).
- **2** different storage media: Cloudflare managed storage + downloaded
  SQL/object files on local or separate cloud storage.
- **1** copy off-platform: D1 exports and critical R2 objects are
  periodically downloaded to off-platform storage (e.g., local disk,
  separate cloud provider).

## Restoration Testing

**A backup that has never been restored is not a backup — it is a hope.**

Restoration must be tested on a regular schedule:

| Test | Frequency | Procedure |
|------|-----------|-----------|
| D1 restore from export | Monthly | Import SQL into a staging D1 instance; verify row counts and schema |
| R2 object restore | Monthly | Download a versioned object; verify integrity |
| Secret re-provisioning | Quarterly | Rotate one secret in staging; verify application starts |
| Full disaster recovery | Semi-annually | Execute the full DISASTER_RECOVERY.md plan against staging |

Each restoration test must be documented with: date, tester, duration,
issues encountered, and corrective actions.
