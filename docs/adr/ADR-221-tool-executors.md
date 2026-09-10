# ADR-221: Concrete Tool Executors for Agent Runtime

**Date:** 2026-09-08
**Status:** Accepted
**Supersedes:** None

## Context

All agent tool calls were dry-run. The tool registry declared tools and recorded
tool calls, but no concrete execution backed them — when an agent invoked a tool,
the runtime logged the call and returned a stub result without performing any
real operation. This made the agent runtime safe for development and
demonstration but incapable of actually doing work.

To deliver on the Autonomous Company Operating System promise, agents needed the
ability to execute real operations: read and write CRM records, create tasks,
query analytics, send notifications, manage budgets, and so on. At the same
time, many tools correspond to external services (ad platforms, billing
providers, email) that are not yet wired or are gated behind approval/safety
layers, so a blanket "execute everything" approach was unsafe.

## Decision

**Register 32 concrete tool executors** in
`src/lib/services/tool-executors.ts`, split into two categories:

- **15 real executors** — backed by actual service-layer operations for
  internal platform capabilities (CRM, tasks, goals, KPIs, budgets, approvals,
  memory, events, analytics, research, product, support, finance, operations,
  recommendations). These perform real reads and writes against the service
  layer, subject to the permission evaluator and budget/approval gating.

- **17 placeholder executors** — stubs for external-service tools (ad platform
  mutations, billing actions, email sending, external API integrations) that
  return a structured "not-yet-wired" result. These exist so the agent runtime
  and tool registry have a complete, typed surface, and so external integrations
  can be promoted from placeholder to real by replacing only the executor body.

Every executor conforms to a uniform interface (input → structured result) and
is invoked through the tool-call pipeline, which enforces permission evaluation
and audit logging before execution.

## Consequences

- Agents can now execute real operations via tools, transforming the runtime
  from a simulation into a working autonomous execution platform
- The split between real and placeholder executors keeps unsafe external
  operations inert while internal capabilities are fully functional
- Promoting an external integration from placeholder to real is a localized
  change (replace the executor body), with no changes to the agent runtime,
  tool registry, or permission pipeline
- Real executors that perform writes are subject to permission evaluation,
  budget enforcement, and approval gating, so autonomous writes cannot bypass
  controls
- The 17 placeholder executors must be tracked as follow-up work; their
  presence in the registry could mislead consumers into believing the
  capability is live, so results clearly indicate "not-yet-wired" status
