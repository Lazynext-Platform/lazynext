# Disaster Recovery Plan

Lazynext Operating System disaster recovery plan defines RPO/RTO targets,
disaster classes, recovery procedures, roles, and verification steps.
This plan is tested semi-annually as part of the restoration testing
schedule (see `docs/BACKUP.md`).

## RPO and RTO Targets

| Metric | Target | Rationale |
|--------|--------|----------|
| RPO (Recovery Point Objective) | 5 minutes | Cron runs every 5 min; D1 point-in-time recovery granularity |
| RTO (Recovery Time Objective) | 30 minutes | Cloudflare Workers redeploy in <5 min; DNS/cert propagation <25 min |
| RTO (credential compromise) | 1 hour | Secret rotation + redeploy + user notification |
| RTO (data corruption) | 2 hours | D1 restore from backup + data verification |

## Disaster Classes

| Class | Disaster | Severity | RTO | Primary Recovery |
|-------|----------|----------|-----|------------------|
| DC-1 | Database failure (D1 unavailable) | SEV1 | 30 min | Failover to D1 replica; redeploy |
| DC-2 | Region failure (Cloudflare region down) | SEV1 | 30 min | Cloudflare automatic failover |
| DC-3 | Provider failure (Cloudflare platform outage) | SEV0 | 4 hours | Monitor status; communicate; cannot mitigate |
| DC-4 | Credential compromise (secret leaked) | SEV0 | 1 hour | Rotate all secrets; redeploy; notify users |
| DC-5 | Accidental deletion (table or R2 objects) | SEV1 | 2 hours | Restore from D1 export / R2 versioning |
| DC-6 | Ransomware / malicious encryption | SEV0 | 4 hours | Restore from clean backup; rotate secrets |
| DC-7 | Corrupted deployment (bad code live) | SEV2 | 10 min | `wrangler rollback` or redeploy previous version |
| DC-8 | Data corruption (schema or row-level) | SEV1 | 2 hours | D1 point-in-time restore to pre-corruption |
| DC-9 | Third-party outage (Atlas Cloud, Dodo, Google) | SEV2 | N/A | Enable dry-run/fallback mode; communicate |
| DC-10 | DNS failure (domain unreachable) | SEV1 | 30 min | Restore DNS zone in Cloudflare |

## Dependencies

The recovery order follows the dependency chain. Each layer depends on
the layer below it:

```
DNS + TLS certificates
  └── Cloudflare Workers (application runtime)
        ├── D1 database (binding: DB)
        ├── R2 media storage (binding: MEDIA_BUCKET)
        ├── Rate limiters (API_RATE_LIMITER, AI_RATE_LIMITER)
        ├── Secrets (wrangler secret)
        └── Cron triggers (*/5 * * * *)
              └── /api/publish/process-scheduled
```

## Roles and Responsibilities

| Role | Responsibility | Primary | Secondary |
|------|---------------|---------|-----------|
| Incident Commander | Coordinates recovery; makes go/no-go decisions | On-call lead | Engineering lead |
| Database Operator | Executes D1 restore and migration | On-call engineer | DevOps engineer |
| Deployment Operator | Executes `wrangler` deploy/rollback | On-call engineer | DevOps engineer |
| Security Officer | Rotates secrets; assesses compromise scope | Security lead | On-call lead |
| Communications Lead | Notifies users and stakeholders | Product lead | Incident Commander |
| Scribe | Documents timeline and actions | Any available team member | Incident Commander |

## Recovery Procedures

### DC-1: Database Failure (D1 Unavailable)

1. Confirm D1 is unreachable via `GET /api/health` (D1 check returns `fail`).
2. Check Cloudflare status page for D1 incidents.
3. If Cloudflare-side outage: wait for resolution; communicate to users.
4. If application-side issue: verify `wrangler.jsonc` D1 binding (`DB`,
   database `lazynext-db`, ID `2b14197d-49b0-4d11-85e4-821ba3648ae3`).
5. If binding is correct and D1 is down: failover is automatic via
   Cloudflare's managed D1 replication.
6. If data is corrupted: execute DC-8 procedure.
7. Verify recovery: `GET /api/health` returns 200 with `d1: ok`.

### DC-2: Region Failure

1. Cloudflare Workers automatically route around failed regions.
2. Confirm via Cloudflare status page.
3. Verify `https://lazynext.com/` returns 200.
4. If custom domain is unreachable, check DNS (DC-10).

### DC-3: Provider Failure (Cloudflare Platform Outage)

1. This is not recoverable from the application side.
2. Monitor `https://www.cloudflarestatus.com/`.
3. Communicate to users via status page and email.
4. When Cloudflare recovers, verify health endpoint and cron trigger.
5. Process any backlogged scheduled posts manually if cron was missed.

### DC-4: Credential Compromise

1. Identify which secret(s) were compromised.
2. Rotate ALL secrets (not just the compromised one) as a precaution:
   ```bash
   npx wrangler secret put ATLASCLOUD_API_KEY
   npx wrangler secret put NEXTAUTH_SECRET
   npx wrangler secret put CRON_SECRET
   npx wrangler secret put TOKEN_ENCRYPTION_KEY
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put DODO_PAYMENTS_API_KEY
   npx wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY
   ```
3. Redeploy: `npm run cf:deploy`.
4. Note: rotating `NEXTAUTH_SECRET` invalidates all sessions (users must
   re-login). Rotating `TOKEN_ENCRYPTION_KEY` requires re-encrypting
   stored OAuth tokens or users re-authenticating with each platform.
5. Audit access logs for unauthorized actions during the compromise window.
6. Notify affected users if personal data may have been exposed.

### DC-5: Accidental Deletion

1. Identify what was deleted (table rows, R2 objects).
2. For D1 row deletion: restore from the most recent D1 export or use
   point-in-time recovery to before the deletion.
   ```bash
   npx wrangler d1 restore lazynext-db --remote --file=backup-YYYYMMDD.sql
   ```
3. For R2 object deletion: restore from object versioning.
   ```bash
   npx wrangler r2 object restore atlas-lazynext-studio-media/<key> --version-id=<version>
   ```
4. Verify restored data integrity (row counts, object checksums).
5. Re-run any migrations if schema was affected.

### DC-7: Corrupted Deployment

1. Identify the bad deployment version.
2. Roll back to the previous known-good version:
   ```bash
   npx wrangler deployments list
   npx wrangler rollback --version <previous-version-id>
   ```
   Alternatively, revert the git commit and redeploy:
   ```bash
   git revert <bad-commit>
   npm run cf:build && npm run cf:deploy
   ```
3. Verify health endpoint returns 200.
4. Verify key user journeys (login, create, publish).

### DC-8: Data Corruption

1. Identify the corruption scope (table, rows, schema).
2. Determine the corruption timestamp from audit logs or D1 history.
3. Restore D1 to a point before corruption using point-in-time recovery.
4. Re-apply any migrations that occurred after the restore point.
5. Verify data integrity against known-good state.
6. Monitor for recurrence (the corruption cause must be identified and fixed).

### DC-10: DNS Failure

1. Verify DNS records in Cloudflare dashboard.
2. If records are missing or corrupted, restore from DNS zone export.
3. Verify `lazynext.com` resolves to the correct Cloudflare Workers IP.
4. Verify TLS certificate is active (Cloudflare managed certificates
   should auto-provision).

## Order of Operations

For multi-failure scenarios, recover in dependency order:

1. **DNS + TLS** — without DNS, nothing is reachable.
2. **Cloudflare Workers runtime** — the application cannot run without it.
3. **D1 database** — the application needs data to function.
4. **Secrets** — the application needs secrets for auth, encryption, and
   third-party APIs.
5. **R2 media storage** — media is non-critical for application boot.
6. **Cron triggers** — scheduled processing resumes after core services.
7. **Third-party integrations** — Atlas Cloud, Dodo Payments, Google Ads.

## Verification

After any recovery, verify the following:

| Check | Method | Expected Result |
|-------|--------|-----------------|
| Health endpoint | `GET /api/health` | 200, all checks `ok` |
| Homepage | `GET https://lazynext.com/` | 200 |
| Key pages | `/lazynext-studio`, `/ad-reference`, `/drama-studio` | 200 |
| Auth | Login with test account | Success, JWT issued |
| D1 connectivity | Create a test record | Persisted and retrievable |
| R2 media | Upload and retrieve a test file | 200, `Range` support (206) |
| Cron trigger | Check Cloudflare dashboard | Active, `*/5 * * * *` |
| Rate limiting | Send 61 rapid API requests | 61st returns 429 |
| Workers.dev URL | `https://lazynext.dry-hall-6a50.workers.dev/` | 200 |

## Rollback

If recovery actions make the situation worse, rollback is available at
multiple levels:

- **Deployment rollback**: `npx wrangler rollback`
- **Database rollback**: D1 point-in-time restore to pre-recovery state
- **DNS rollback**: Restore previous DNS zone export
- **Secret rollback**: Re-upload previous secret values (if retained)

## Communication

| Audience | Channel | Timing |
|----------|---------|--------|
| Internal team | Incident channel (Slack/Teams) | Immediately on detection |
| Users (status page) | Public status page | Within 15 minutes of SEV0/SEV1 |
| Users (in-app) | Banner notification | Within 30 minutes of SEV0/SEV1 |
| Stakeholders | Email | Post-incident summary within 24 hours |

## Escalation

| Severity | Escalation Path | Response Time |
|----------|----------------|---------------|
| SEV0 | Incident Commander → CTO → CEO | Immediate |
| SEV1 | On-call lead → Engineering lead | 15 minutes |
| SEV2 | On-call engineer → On-call lead | 30 minutes |
| SEV3 | On-call engineer (next business day) | 4 hours |

## Restoration Testing

This plan is tested semi-annually by executing a simulated disaster
against the staging environment. Test results are documented in
`docs/BACKUP.md` under the restoration testing schedule.
