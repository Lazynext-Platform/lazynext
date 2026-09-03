# Disaster Recovery Drill Runbook

Procedure for performing a DR drill against the Lazynext Operating System.
Grounded in `docs/DISASTER_RECOVERY.md` and `docs/BACKUP.md`. Drills
validate that RPO/RTO targets are met and recovery procedures are actionable.

## Purpose and Scope

Validate the disaster recovery plan by simulating each disaster class
against a **staging** environment. Measure actual RPO/RTO against the
targets in `docs/DISASTER_RECOVERY.md`. Scope covers all disaster classes
(DC-1 through DC-10) and the full dependency chain:
`DNS + TLS → Workers → D1 → Secrets → R2 → Cron → Third-party`.
Production is never touched during a drill unless explicitly noted.

## Drill Types

| Type | Description | Scope | Frequency |
|------|-------------|-------|-----------|
| Tabletop | Walkthrough with the team; no system changes | All DCs | Quarterly |
| Partial failover | Execute one disaster class against staging | Single DC | Quarterly |
| Full failover | Full recovery plan end-to-end against staging | All DCs | Semi-annually |

## Pre-Drill Checklist

| Check | Detail | Done |
|-------|--------|------|
| Staging environment available | Staging D1, R2, and Worker deployed | [ ] |
| Wrangler CLI authenticated | `npx wrangler login` confirmed | [ ] |
| Backup available | Latest D1 export and R2 snapshot taken | [ ] |
| Team notified | Drill window communicated; no prod deploys | [ ] |
| Roles assigned | IC, Database Op, Deployment Op, Scribe | [ ] |
| Rollback plan ready | Previous deployment version + DNS export on hand | [ ] |
| Monitoring active | Health endpoint and Cloudflare status monitored | [ ] |
| Test fixtures ready | Sentinel records and test objects prepared | [ ] |

## Drill Procedure by Disaster Class

### DC-1: D1 Outage

1. Simulate: disable the D1 binding in staging `wrangler.jsonc` and redeploy;
   confirm `GET /api/health` returns `d1: fail`.
2. Re-enable the binding and redeploy; confirm health returns 200 with `d1: ok`.
3. **Measure**: time from binding restore to health check pass (RTO: 30 min).

### DC-5 / DC-8: Data Corruption or Accidental Deletion

1. Insert a corrupted sentinel row in staging D1; note timestamp `T0`.
2. Initiate point-in-time restore to before `T0`; verify the sentinel row
   is absent, known-good data is intact, and re-apply migrations after the
   restore point.
3. **Measure**: time from restore initiation to verification pass (RTO: 2 hours).

### R2 Outage (DC-5 media)

1. Simulate: remove the R2 binding in staging `wrangler.jsonc` and redeploy;
   confirm media upload fails gracefully.
2. Restore a deleted object from versioning, then re-enable the binding and
   redeploy:
   ```bash
   npx wrangler r2 object restore atlas-lazynext-staging-media-test/<key> --version-id=<version>
   ```
3. Verify upload and retrieval returns 200 (206 for `Range`).
4. **Measure**: time from binding restore to media upload success.

### Worker Deployment Failure (DC-7)

1. Deploy a deliberately broken build to staging (`npm run cf:build` with a
   syntax error, then `npm run cf:deploy`); confirm health returns 5xx.
2. Roll back to the previous deployment and confirm health returns 200:
   ```bash
   npx wrangler deployments list
   npx wrangler rollback --version <previous-version-id>
   ```
3. **Measure**: time from rollback command to health check pass (RTO: 10 min).

### DNS Failure (DC-10)

1. Export the staging DNS zone as a backup; remove a critical record and
   confirm the staging domain is unreachable.
2. Restore the zone from the export file; confirm the domain resolves.
3. **Measure**: time from zone restore to domain reachable (RTO: 30 min).

### Secret Compromise (DC-4)

1. Rotate one non-destructive secret in staging and redeploy:
   ```bash
   npx wrangler secret put ALERT_WEBHOOK_SECRET
   ```
2. Verify the application boots and health endpoint returns 200. Document
   the impact of rotating `NEXTAUTH_SECRET` (session invalidation) and
   `TOKEN_ENCRYPTION_KEY` (token re-encryption) without executing them.
3. **Measure**: time from secret rotation to health check pass (RTO: 1 hour).

## RPO/RTO Measurement Methodology

| Metric | Definition | Measurement Method |
|--------|------------|--------------------|
| RPO | Max acceptable data loss | Time between last known-good backup and disaster timestamp |
| RTO | Max acceptable downtime | Time from disaster declaration to health endpoint returning 200 |
| RTO (credential) | Time to rotate + redeploy | Time from first `wrangler secret put` to health check pass |
| RTO (data) | Time to restore + verify | Time from restore command to verification checklist pass |

Record disaster timestamp, recovery start, and recovery end for each drill.
Compare actuals to the targets:

| Scenario | RPO Target | RTO Target |
|----------|-----------|-----------|
| D1 outage (DC-1) | 5 min | 30 min |
| Data corruption (DC-8) | 5 min | 2 hours |
| Deployment failure (DC-7) | 0 | 10 min |
| DNS failure (DC-10) | 0 | 30 min |
| Credential compromise (DC-4) | 0 | 1 hour |

## Post-Drill Report Template

```
Disaster Recovery Drill Report — Date: YYYY-MM-DD
Drill type: [ ] Tabletop  [ ] Partial  [ ] Full   Environment: staging
Participants: <names>   Roles: IC: <>  DB Op: <>  Deploy Op: <>  Scribe: <>
Disaster classes tested: <list>

Results:
| DC | RPO actual | RPO target | RTO actual | RTO target | Pass/Fail |
|----|-----------|-----------|-----------|-----------|-----------|

Issues: <description>   Corrective actions: <items with owners/due dates>
Lessons learned: <notes>   Plan updates: [ ] Yes  [ ] No
Sign-off:  IC: <name>, <date>   Eng Lead: <name>, <date>
```

## Drill Schedule

| Quarter | Drill Type | Disaster Classes | Owner |
|---------|-----------|------------------|-------|
| Q1 | Partial failover | DC-1, DC-7 | On-call lead |
| Q2 | Partial failover | DC-4, DC-10 | On-call lead |
| Q3 | Partial failover | DC-5, DC-8 | On-call lead |
| Q4 | Full failover | All DCs | Incident Commander |

Tabletop drills run quarterly in addition to the schedule above.

## Success Criteria

A drill is successful when **all** are true: every tested DC meets its
RPO/RTO target; `GET /api/health` returns 200 with all checks `ok`; key
user journeys (login, create, publish) function; no production data was
affected; the post-drill report is signed off within 48 hours; and issues
have corrective actions filed with owners and due dates. If any criterion
fails, repeat the drill within 2 weeks after corrective actions.
