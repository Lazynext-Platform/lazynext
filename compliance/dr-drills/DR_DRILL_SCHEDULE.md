# DR Drill Schedule — Q4 2026

**Date created:** 2026-09-03
**Calendar file:** `compliance/dr-drills/dr-drill-schedule-2026.ics` (import to Google Calendar, Apple Calendar, Outlook)

---

## Scheduled Drills

### Q4 2026 — Partial Failover Drill

| Field | Value |
|---|---|
| **Date** | October 7, 2026 |
| **Time** | 10:00 – 12:00 UTC |
| **Duration** | 2 hours |
| **Type** | Partial failover (staging) |
| **Scope** | D1 export/import, Worker rollback, R2 versioning restore, DNS tabletop |

**Prerequisites (complete by October 1, 2026):**
- [ ] Create staging D1 database: `npx wrangler d1 create lazynext-db-staging`
- [ ] Create staging R2 bucket: `npx wrangler r2 bucket create lazynext-staging-media`
- [ ] Verify wrangler CLI authenticated
- [ ] Notify team of drill window
- [ ] Review `docs/DR_DRILL_PROCEDURE.md`

**Drill steps:**
1. Export production D1: `npx wrangler d1 export lazynext-db --remote --output /tmp/dr-staging-export.sql`
2. Import to staging D1: `npx wrangler d1 execute lazynext-db-staging --remote --file /tmp/dr-staging-export.sql`
3. Verify row counts match production
4. Deploy Worker to staging URL
5. Test R2 object versioning: upload → overwrite → restore previous version
6. Tabletop DNS failover discussion (no actual DNS changes)
7. Document results in `compliance/dr-drills/DR_DRILL_2026-10-07.md`

### December 2026 — Full Failover Drill (Semi-Annual)

| Field | Value |
|---|---|
| **Date** | December 2, 2026 |
| **Time** | 10:00 – 14:00 UTC |
| **Duration** | 4 hours |
| **Type** | Full failover (staging) |
| **Scope** | Full D1 failover, R2 failover, Worker deployment, DNS cutover simulation, secrets rotation |

**Prerequisites (complete by November 25, 2026):**
- [ ] All Q4 partial drill issues resolved
- [ ] Staging environment fully configured
- [ ] Backup R2 bucket created and synced
- [ ] Secrets rotation plan documented
- [ ] Team availability confirmed
- [ ] Full review of `docs/DR_DRILL_PROCEDURE.md`

---

## Recurring Schedule (2027)

| Quarter | Date | Type |
|---|---|---|
| Q1 2027 | January 13, 2027 | Partial failover |
| Q2 2027 | April 7, 2027 | Partial failover |
| Q3 2027 | July 7, 2027 | Partial failover |
| Q4 2027 | October 6, 2027 | Partial failover |
| Semi-annual | December 1, 2027 | Full failover |

---

## How to Import the Calendar

### Google Calendar
1. Open Google Calendar
2. Click the "+" next to "Other calendars"
3. Select "Import"
4. Upload `compliance/dr-drills/dr-drill-schedule-2026.ics`

### Apple Calendar
1. Open Calendar app
2. File → Import…
3. Select `compliance/dr-drills/dr-drill-schedule-2026.ics`

### Outlook
1. Open Outlook
2. File → Open & Export → Import/Export
3. Select "Import an iCalendar (.ics) file"
4. Select `compliance/dr-drills/dr-drill-schedule-2026.ics`

---

## Reminder Schedule

- **24 hours before:** Email reminder to team
- **1 hour before:** Desktop notification

Both reminders are configured in the .ics file.
