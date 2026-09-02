# ADR-036: Google Ads Safety Layer

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext's Meta Ads integration gained a formal safety layer in ADR-035 — dry-run as a
configurable default, spend caps, mutation rate limits, destructive-action blocking, an approval
workflow, and an audit log. The Google Ads integration, however, still relied on the original
binary dry-run flag from ADR-004. It had none of the guardrails that production ad operations
require: no per-day or per-campaign spend caps, no mutation rate limits, no blocking of
destructive actions, and no human approval step before high-risk mutations went live.

Google Ads mutations carry the same financial risk as Meta Ads. Creating a campaign with a
misconfigured budget, deleting the wrong ad group, or pausing the wrong campaign can result in
immediate and irreversible spend. A binary dry-run flag is insufficient for production use, where
teams need to run some operations live while maintaining guardrails against accidental spend.

A parallel safety layer was needed for Google Ads, mirroring ADR-035 so operators have
consistent controls across both ad platforms. The patterns were drawn from the
`google-meta-ads-ga4-mcp` project, which demonstrated safety tool contracts across both Meta and
Google ad platforms.

## Decision

### 1. New module `src/lib/ads/google-safety.ts`

A dedicated domain library with typed structures mirroring the Meta safety layer: `SafetyConfig`,
`SafetyCheckResult`, `ApprovalRequest`, `AuditEntry`, and `SpendCaps`. The module is pure logic —
it does not perform Google Ads API calls itself; it acts as a pre-action gate that other Google
Ads code consults before executing any mutation.

### 2. `SafetyConfig` with dry-run, caps, and action lists

The config supports `dryRun`, `requireApproval`, daily and per-campaign spend caps, a daily
mutation cap, an action whitelist, and an action blacklist. Operators can override these via the
config API, but the defaults assume caution.

### 3. Two API routes

`/api/ads/google-safety` supports GET (read current config) and POST (update config — admin
only). `/api/ads/google-approve` supports GET (list pending approvals) and POST (approve or
reject — admin only). Both routes require admin privileges for mutations, ensuring that safety
configuration and approval decisions are restricted to authorized operators.

### 4. Admin-only configuration updates; authenticated read access

Read access to the current safety config is available to any authenticated user, so operators can
see the active guardrails. Configuration updates and approval decisions are restricted to admin
users, matching the Meta safety layer's authorization model.

### 5. Default safety config

The default config is conservative: `dryRun: true`, `requireApproval: true`, $200 daily spend
cap, $100 per-campaign cap. These caps are higher than the Meta defaults to reflect Google Ads'
typical budget scale, but the defaults still assume caution with dry-run and approval enabled.

### 6. Blocked destructive actions

The following actions are blocked by default: `delete_campaign`, `delete_adgroup`, `delete_ad`,
and `delete_budget`. These are irreversible and carry high risk; operators must explicitly
unblock them via config if they need to perform deletions in a controlled workflow.

### 7. 24-hour approval TTL with in-memory audit log

Approval requests are created for actions that require human sign-off. Pending approvals are
retrievable and can be approved or rejected. Requests expire after 24 hours, preventing stale
approvals from authorizing actions long after they were requested. A Map-based audit log records
every action attempted (approved, rejected, or executed) and is queryable for post-incident
review.

### 8. UI page at `/google-safety`

A new page with a `GoogleSafetyDashboard` component renders the current config, spend-cap
utilization, pending approvals, and the audit log. This gives operators a single view of the
Google Ads safety state, mirroring the Meta Safety dashboard.

## Consequences

- **Positive:** Formal safety controls prevent accidental Google Ads spend. The pre-action gate,
  spend caps, and destructive-action blocking provide defense in depth beyond a binary dry-run
  flag, consistent with the Meta Ads Safety Layer.
- **Positive:** The approval workflow ensures high-risk operations get human sign-off before
  execution, and the 24h TTL prevents stale approvals. The audit log provides a full trail of
  attempted actions for post-incident review.
- **Negative:** The audit log and approval queue are in-memory (Map-based), meaning they reset
  on deployment; future work should persist these to D1 so audit history and pending approvals
  survive redeploys — the same limitation noted in ADR-035. The safety layer also adds latency to
  every Google Ads mutation (the pre-action gate), though this is negligible compared to the
  Google Ads API call itself.

## Research Sources

Inspired by `google-meta-ads-ga4-mcp` (MIT license, issue #30) and `meta-ads-mcp` (MIT license,
issue #29). Took the safety tool patterns — dry-run as a configurable default, approval workflow
for high-risk actions, spend caps, and audit logging — and the tool contract concepts that
separate safety checks from execution across both Meta and Google ad platforms. Adapted to
LazyNext's TypeScript / Cloudflare Workers stack, mirroring ADR-035. Did NOT copy the original
Python MCP server code; the module is a clean TypeScript implementation against LazyNext's existing Google Ads infrastructure.
