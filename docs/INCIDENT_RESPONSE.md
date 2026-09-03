# Incident Response Plan

Lazynext Operating System incident response plan defines severity levels,
detection mechanisms, response procedures, escalation, and post-incident
review. The goal is to minimize user impact and restore normal operations
quickly while preserving evidence for root-cause analysis.

## Incident Severity Levels

| Severity | Definition | User Impact | Response Time | Examples |
|----------|------------|-------------|---------------|----------|
| SEV0 | Total or critical service outage | All users affected | Immediate | Cloudflare platform outage, credential compromise, data loss |
| SEV1 | Major degradation | Many users affected | 15 minutes | D1 unavailable, auth broken, payment failures |
| SEV2 | Partial degradation | Some users affected | 30 minutes | Single feature broken, third-party API outage, slow responses |
| SEV3 | Minor issue | Few users affected | 4 hours (business hours) | Cosmetic bug, non-critical feature degradation |

## Incident Detection

| Source | Mechanism | Latency |
|--------|-----------|---------|
| Health checks | `GET /api/health` polled every 1 minute | <2 minutes |
| Cloudflare analytics | Error rate and latency monitoring | <5 minutes |
| Cron monitoring | Scheduled handler error logging | <5 minutes |
| User reports | In-app feedback, email, status page | Variable |
| Alerting webhook | `ALERT_WEBHOOK_URL` notifications | <1 minute |
| Rate limit monitoring | Sudden spikes in rate limit hits | <5 minutes |

### Health Check Details

The `/api/health` endpoint checks D1 connectivity, token encryption,
cron secret, auth secret, and platform OAuth credentials. A 503
response triggers a SEV1 incident automatically.

## Response Procedures

### 1. Triage (0–5 minutes)

- Assign an Incident Commander (first responder).
- Determine severity (SEV0–SEV3) based on user impact.
- Create an incident channel (Slack/Teams) if SEV0 or SEV1.
- Assign a Scribe to document the timeline.
- Notify the on-call lead.

### 2. Investigate (5–15 minutes)

- Check `GET /api/health` for dependency status.
- Review Cloudflare analytics for error patterns.
- Check recent deployments (`npx wrangler deployments list`).
- Review Cloudflare status page (`cloudflarestatus.com`).
- Check third-party status pages (Atlas Cloud, Dodo Payments, Google).
- Examine structured logs for error patterns.

### 3. Mitigate (15–30 minutes)

Apply the fastest mitigation that reduces user impact, even if the root
cause is not yet identified:

| Situation | Mitigation |
|-----------|------------|
| Bad deployment | `npx wrangler rollback` to previous version |
| D1 unavailable | Wait for Cloudflare failover; communicate |
| Rate limit abuse | Increase limiter threshold or block offending IP |
| Third-party outage | Enable dry-run/fallback mode |
| Credential compromise | Rotate all secrets; redeploy |
| Data corruption | D1 point-in-time restore (see `docs/DISASTER_RECOVERY.md`) |
| DNS failure | Restore DNS zone from export |

### 4. Communicate (ongoing)

| Audience | SEV0 | SEV1 | SEV2 | SEV3 |
|----------|------|------|------|------|
| Internal team | Immediate | Immediate | 15 min | Next business day |
| Status page | 15 min | 15 min | 30 min | Not posted |
| In-app banner | 30 min | 30 min | As needed | Not shown |
| Email stakeholders | 1 hour | 4 hours | Post-incident | Post-incident |

### 5. Resolve (when mitigation is confirmed)

- Verify `GET /api/health` returns 200.
- Verify key user journeys (login, create, publish).
- Verify cron trigger is active.
- Remove in-app banner and update status page.
- Document resolution time.

## Escalation Matrix

| Severity | Escalation Path | Response Time |
|----------|----------------|---------------|
| SEV0 | On-call → Incident Commander → CTO → CEO | Immediate |
| SEV1 | On-call → On-call lead → Engineering lead | 15 minutes |
| SEV2 | On-call engineer → On-call lead | 30 minutes |
| SEV3 | On-call engineer (next business day) | 4 hours |

### Escalation Criteria

Escalate immediately if:
- Severity increases (SEV2 → SEV1 → SEV0).
- Mitigation attempts fail after 30 minutes.
- User complaints exceed threshold (>10 in 15 minutes).
- Data loss is suspected.
- Security compromise is suspected.

## Roles and Responsibilities

| Role | Responsibility | Assigned To |
|------|---------------|-------------|
| Incident Commander | Coordinates response; makes go/no-go decisions; owns communication | On-call lead |
| Technical Responder | Executes mitigation and recovery procedures | On-call engineer |
| Security Officer | Assesses security impact; rotates secrets if needed | Security lead |
| Communications Lead | Manages user-facing communication | Product lead |
| Scribe | Documents timeline, actions, and decisions | Any available team member |
| Executive Sponsor | Authorizes major actions (e.g., extended downtime) | CTO or CEO |

## Post-Incident Review

Within 24 hours of incident resolution, conduct a blameless
post-incident review:

### Review Document

| Section | Content |
|---------|---------|
| Summary | One-paragraph description of the incident |
| Timeline | Chronological log of detection, actions, and resolution |
| Impact | Users affected, duration, data impact |
| Root Cause | Technical root cause (not blame) |
| Contributing Factors | What made the incident possible or worse |
| What went well | Effective mitigation steps |
| What went poorly | Gaps in detection, response, or mitigation |
| Action items | Concrete improvements with owners and deadlines |

### Action Item Tracking

All action items are tracked to completion. Recurring incident patterns
trigger architectural review (ADR process).

## Communication Templates

### Status Page: Incident Detected

```
[INCIDENT] We are investigating an issue affecting {service}.
{description of impact}. We will provide an update within 15 minutes.
```

### Status Page: Mitigation Applied

```
[UPDATE] We have applied a mitigation for the {service} issue and are
monitoring the situation. {description of mitigation}. We will confirm
resolution shortly.
```

### Status Page: Resolved

```
[RESOLVED] The {service} issue has been resolved. {description of
resolution and duration}. We will publish a post-incident review within
24 hours.
```

### In-App Banner

```
We are experiencing issues with {feature}. Our team is investigating.
Thank you for your patience.
```

### Stakeholder Email

```
Subject: Incident Report — {date} — {severity}

Summary: {one-paragraph summary}
Impact: {users affected, duration}
Root Cause: {brief description}
Resolution: {what was done}
Action Items: {link to post-incident review}
```

## Contact Mechanisms

| Channel | Purpose | Availability |
|---------|---------|--------------|
| Incident channel (Slack/Teams) | Real-time coordination during incidents | 24/7 (on-call) |
| Alerting webhook | Automated alerts from monitoring | 24/7 |
| Status page | Public communication | 24/7 |
| Email | Stakeholder communication | Business hours |
| Phone/voice | SEV0 escalation | 24/7 (on-call) |

## Incident Metrics

Track the following metrics for continuous improvement:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mean Time to Detect (MTTD) | <5 minutes | Health check + alerting latency |
| Mean Time to Mitigate (MTTM) | <30 minutes | Detection to mitigation applied |
| Mean Time to Resolve (MTTR) | <2 hours | Detection to full resolution |
| Post-incident review completion | <24 hours | Resolution to review published |
| Action item completion rate | >90% | Action items closed within deadline |
