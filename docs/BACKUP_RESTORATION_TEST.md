# Backup Restoration Test Runbook

Procedure for testing backup restoration for Cloudflare D1, R2, and
application configuration. Grounded in `docs/BACKUP.md` and
`docs/DISASTER_RECOVERY.md`. A backup that has never been restored is
not a backup — it is a hope.

## Purpose and Scope

Validate that every backup mechanism in `docs/BACKUP.md` can be restored
within the RTO targets in `docs/DISASTER_RECOVERY.md`. Scope: D1
(point-in-time recovery + export/import), R2 (versioning + replication),
and configuration (DNS, TLS, secrets). All tests run against **staging**;
production is read-only for verification.

## Prerequisites

| Requirement | Detail |
|-------------|--------|
| Cloudflare dashboard access | Admin access to the `lazynext.com` zone and Workers |
| `wrangler` CLI | Authenticated via `npx wrangler login` |
| Git repository | Current checkout of `atlas-marketing-studio` |
| Secure secrets vault | Access to 1Password / Bitwarden for secret values |
| Staging D1 database | Separate D1 instance for restore testing |
| Staging R2 bucket | Separate R2 bucket for object restore testing |
| Test record fixture | Known row counts and a sentinel record for verification |

## D1 Restoration Procedure

### A. Point-in-Time Recovery

1. Record the current timestamp `T0` from production D1.
2. Insert a sentinel row into a non-critical table in staging:
   ```bash
   npx wrangler d1 execute lazynext-db-staging --remote \
     --command "INSERT INTO AuditLog (action, detail) VALUES ('restore-test', 'T0')"
   ```
3. Wait 5 minutes (matches the RPO target), then initiate a point-in-time
   restore of staging D1 to `T0` from the Cloudflare dashboard.
4. Confirm the sentinel row is absent; record the restore duration and
   verify it is within the 2-hour RTO (DC-8).

### B. Export / Import

1. Export the production D1 database and import into staging:
   ```bash
   npx wrangler d1 export lazynext-db --remote --output backup-$(date +%Y%m%d).sql
   npx wrangler d1 execute lazynext-db-staging --remote --file=backup-$(date +%Y%m%d).sql
   ```
2. Compare row counts per table via `sqlite_stat` and verify the
   `_prisma_migrations` table matches (schema parity).
3. Re-run pending migrations via `node scripts/apply-d1-migrations.mjs`.

## R2 Restoration Procedure

### A. Object Versioning

1. Upload a test object, then overwrite it (creates a new version):
   ```bash
   npx wrangler r2 object put atlas-lazynext-staging-media-test/restore-test.txt --file=./test-file.txt
   npx wrangler r2 object restore atlas-lazynext-staging-media-test/restore-test.txt --version-id=<version>
   ```
2. Download and verify the restored content matches the original.

### B. Cross-Region Replication

1. Verify replication status in the Cloudflare dashboard for the media
   bucket (`atlas-lazynext-studio-media`).
2. Confirm the replica bucket object count matches; download an object
   from the replica region and verify checksum parity.

## Configuration Restoration

### DNS

1. Export the production DNS zone:
   ```bash
   npx wrangler dns export lazynext.com --output dns-backup-$(date +%Y%m%d).txt
   ```
2. Import the zone file into a staging zone; verify record count parity
   and that the `lazynext.com` apex and subdomains resolve correctly.

### TLS Certificates

Cloudflare manages certificates automatically (verification only):
confirm `https://lazynext.com/` returns 200 with a valid cert and the
custom domain route in `wrangler.jsonc` is active.

### Secrets

1. Pick one non-destructive secret (e.g., `ALERT_WEBHOOK_SECRET`), generate
   a new value, and upload to staging:
   ```bash
   npx wrangler secret put ALERT_WEBHOOK_SECRET
   ```
2. Redeploy staging (`npm run cf:build && npm run cf:deploy`) and verify
   the application boots with health endpoint returning 200.
3. Document the impact of rotating `NEXTAUTH_SECRET` (session invalidation)
   and `TOKEN_ENCRYPTION_KEY` (token re-encryption) without executing them.

## Verification Checklist

| Check | Method | Expected Result |
|-------|--------|-----------------|
| D1 row counts | Compare prod vs staging `sqlite_stat` | Match within tolerance |
| D1 schema parity | Compare `_prisma_migrations` rows | Identical |
| D1 sentinel absence | Query staging for sentinel row | Absent after PITR |
| R2 object integrity | Compare checksums | Match |
| R2 replica parity | Compare object counts | Match |
| DNS record parity | Compare zone exports | Match |
| TLS certificate | `curl -I https://lazynext.com/` | 200, valid cert |
| Health endpoint | `GET /api/health` | 200, all checks `ok` |
| Auth flow | Login with test account | Success, JWT issued |
| App functionality | Create + retrieve a test record | Persisted and retrievable |

## Test Schedule

| Test | Frequency | Owner |
|------|-----------|-------|
| D1 restore from export | Monthly | On-call engineer |
| D1 point-in-time recovery | Monthly | On-call engineer |
| R2 object restore | Monthly | On-call engineer |
| DNS zone restore | Monthly | DevOps engineer |
| Secret re-provisioning | Quarterly | Security lead |
| Full disaster recovery | Semi-annually | Incident Commander |

## Sign-Off Template

```
Restoration Test Report — Date: YYYY-MM-DD
Tester: <name>   Environment: staging   Duration: <minutes>
Tests run: <list>
Issues found: <none / description>
Corrective actions: <none / action items>
RTO met: [ ] Yes  [ ] No
Sign-off: <name>, <role>, <date>
```

## Escalation Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| Incident Commander | _<placeholder>_ | _<placeholder>_ | Immediate |
| On-call engineer | _<placeholder>_ | _<placeholder>_ | 15 minutes |
| DevOps engineer | _<placeholder>_ | _<placeholder>_ | 30 minutes |
| Security lead | _<placeholder>_ | _<placeholder>_ | 15 minutes |
| Cloudflare support | _<placeholder>_ | _<placeholder>_ | As needed |

Populate placeholders before the first scheduled test; store the
completed contact list in the secure secrets vault, not in git.
