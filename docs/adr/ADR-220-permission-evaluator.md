# ADR-220: 8-Layer Permission Policy Evaluator

**Date:** 2026-09-08
**Status:** Accepted
**Supersedes:** None

## Context

Permission checks across the platform were ad-hoc. Individual routes and
services performed their own authorization logic — some checked workspace
membership, some checked role, some checked tool availability, and some checked
none of these. There was no comprehensive, ordered policy stack that every
permission decision flowed through.

This inconsistency created two problems. First, authorization gaps were easy to
introduce: a new route could forget a check, and there was no single enforcement
point to catch it. Second, permission decisions were not auditable as a unit —
when a denial occurred, it was unclear which layer caused it, making debugging
and compliance reporting difficult.

## Decision

**Implement an 8-layer permission policy evaluator** in
`src/lib/services/permission-evaluator.ts` that every permission decision flows
through, in a fixed order:

1. **Company** — is the actor a member of the owning company/organization?
2. **Workspace** — does the actor have access to the target workspace?
3. **Role** — does the actor's role grant the requested action class?
4. **Tool** — is the requested tool registered and available to the actor?
5. **Resource** — does the actor have access to the specific resource instance?
6. **Environment** — is the execution environment permitted (e.g., production
   vs. sandbox, allowed regions)?
7. **Budget** — does the action fit within remaining budget envelopes?
8. **Risk** — does the action's risk classification fall within the allowed
   threshold for the current autonomy mode?

Each layer returns an explicit allow/deny with a reason. The evaluator short-
circuits on the first denial and returns a structured result naming the denying
layer, so every decision is fully auditable.

## Consequences

- All permission decisions now go through a single, comprehensive, auditable
  policy stack — no route or service can bypass it
- Every denial names the denying layer and reason, making authorization failures
  debuggable and compliance-reportable
- Adding a new authorization concern is a matter of adding or modifying a layer,
  not scattering checks across dozens of routes
- The fixed ordering means higher layers (company, workspace) are always
  evaluated before lower layers (budget, risk), preventing lower-layer leaks
  when tenancy checks would have denied
- There is a small per-request cost from running all eight layers, but
  short-circuiting on denial keeps it bounded
- External integrations that previously did their own auth must be migrated to
  route through the evaluator to remain compliant
