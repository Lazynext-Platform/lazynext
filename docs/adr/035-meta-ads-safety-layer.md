# ADR-035: Meta Ads Safety Layer

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext already had ad platform integration with a dry-run mode (ADR-004), which prevented
real ad spend during testing. However, dry-run was a binary toggle — either everything was
simulated or everything was live. There were no formal guardrails for the live mode: no spend
caps, no mutation rate limits, no approval workflow for high-risk actions, and no audit trail.

Meta Ads mutations carry real financial risk. Creating a campaign with a misconfigured budget,
deleting the wrong ad set, or pushing a bad creative live can result in immediate and
irreversible spend. A single binary dry-run flag is insufficient for production use, where teams
need to run some operations live while maintaining guardrails against accidental spend.

A formal safety layer was needed: spend caps (daily and per-campaign), mutation rate limits,
blocking of destructive actions, an approval workflow for high-risk operations, and an audit log
of every action attempted.

## Decision

### 1. New module `src/lib/ads/meta-safety.ts`

A dedicated domain library with typed structures: `SafetyConfig`, `SafetyCheckResult`,
`ApprovalRequest`, `AuditEntry`, and `SpendCaps`. The module is pure logic — it does not perform
Meta API calls itself; it acts as a pre-action gate that other Meta Ads code consults before
executing any mutation.

### 2. Default safety config

The default config is conservative: `dryRun: true`, $100 daily spend cap, $50 per-campaign cap,
20 mutations per day, destructive actions (delete) blocked by default, and an 80% warning
threshold before caps are hit. Operators can override these via the config API, but the defaults
assume caution.

### 3. `checkSafety()` pre-action gate

Every Meta Ads mutation passes through `checkSafety()` before execution. The gate evaluates in
order: blocked actions → whitelist → mutation cap → spend caps → dry-run → approval. If any
check fails, the action is rejected with a typed `SafetyCheckResult` explaining why. If the
action requires approval (e.g., it exceeds a cap but is whitelisted), an `ApprovalRequest` is
created and the action is held until approved.

### 4. `checkSpendCaps()` with warning levels

A dedicated spend-cap check calculates current spend against daily and per-campaign caps and
returns a warning level (ok, warning, exceeded). The 80% warning threshold gives operators
visibility before a cap is hit, not just after.

### 5. In-memory audit log

A Map-based audit log records every action attempted (approved, rejected, or executed) via
`recordAuditEntry` and is queryable via `getAuditLog`. This provides a full trail of what was
attempted, by whom, and what the safety layer decided.

### 6. Approval workflow with 24h TTL

Approval requests are created for actions that require human sign-off. Pending approvals are
retrievable via `getPendingApprovals`, and can be approved or rejected via `approveRequest` /
`rejectRequest`. Requests expire after 24 hours, preventing stale approvals from authorizing
actions long after they were requested.

### 7. Two API routes

`/api/ads/meta-safety` supports GET (read current config) and POST (update config — admin
only). `/api/ads/meta-approve` supports GET (list pending approvals) and POST (approve or
reject — admin only). Both routes require admin privileges, ensuring that safety configuration
and approval decisions are restricted to authorized operators.

### 8. `validateSafetyConfig()` with bounds checking

A validation function enforces sane bounds on config values (e.g., caps must be positive,
mutation limits must be reasonable) before a config update is accepted, preventing
misconfiguration that would undermine the safety layer.

## Consequences

- **Positive:** Formal safety controls prevent accidental spend. The pre-action gate, spend
  caps, and destructive-action blocking provide defense in depth beyond a binary dry-run flag.
- **Positive:** The approval workflow ensures high-risk operations get human sign-off before
  execution, and the 24h TTL prevents stale approvals.
- **Positive:** The audit log provides a full trail of attempted actions for post-incident
  review.
- **Negative:** The audit log and approval queue are in-memory (Map-based), meaning they reset
  on deployment. Future work should persist these to D1 so that audit history and pending
  approvals survive redeploys.
- **Negative:** The safety layer adds latency to every Meta Ads mutation (the pre-action gate),
  though this is negligible compared to the Meta API call itself.

## Research Sources

Inspired by `meta-ads-mcp` (MIT license). Took the safety tool patterns — dry-run as a
configurable default rather than a binary flag, approval workflow for high-risk actions, spend
caps, and audit logging — and the tool contract concepts that separate safety checks from
execution. Adapted to LazyNext's TypeScript / Cloudflare Workers stack. Did NOT copy the
original Python MCP server code; the module is a clean TypeScript implementation against
LazyNext's existing ad platform infrastructure.
