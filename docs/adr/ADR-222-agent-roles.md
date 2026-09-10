# ADR-222: Agent Role Definitions

**Date:** 2026-09-08
**Status:** Accepted
**Supersedes:** None

## Context

All agents were generic. An agent definition carried a name and a model, but no
role-specific configuration — every agent had access to the same tools, the same
permissions, the same risk thresholds, and the same autonomy mode. An agent
tasked with sending customer support emails had the same tool surface and
autonomy latitude as an agent tasked with managing production ad spend.

This created two problems. First, it was unsafe: a generic agent could invoke
high-risk tools (ad platform mutations, billing actions) even when its job only
required low-risk operations (reading CRM records). Second, it was ineffective:
agents lacked role-specific tool curation, so they had to reason over the entire
tool registry rather than a focused, role-appropriate subset, degrading planning
quality and increasing the chance of irrelevant tool selection.

## Decision

**Define 12 agent roles** in `src/lib/services/agent-roles.ts`, each with a
specific configuration:

1. **CEO** — strategic oversight, high autonomy, full read access, limited write
2. **Strategy** — planning and goal alignment, assisted autonomy
3. **Research** — web discovery and fact extraction, autonomous read
4. **Product** — ideas, requirements, roadmaps, assisted autonomy
5. **Engineering** — software development loop, manual high-risk actions
6. **Design** — creative asset production, assisted autonomy
7. **Growth** — marketing and ad management, gated high-risk mutations
8. **Sales** — CRM and pipeline management, autonomous write to CRM
9. **Support** — ticket triage and resolution, autonomous write to support
10. **Finance** — invoices, expenses, budgets, manual high-risk actions
11. **Operations** — internal workflows, vendors, scheduling, assisted autonomy
12. **Security** — audits, compliance, incident response, manual autonomy

Each role definition specifies: the curated set of allowed tools, the permission
scope (which resource classes it may read/write), the risk level threshold it may
operate under, and the default autonomy mode. The permission evaluator
(ADR-220) and autonomy loop (ADR-219) consume these role definitions to scope
every decision an agent makes.

## Consequences

- Agents are now specialized by role with appropriate scoping — a Support agent
  cannot invoke ad-platform mutation tools, and a Growth agent's high-risk
  actions are gated by the role's risk threshold
- Role-specific tool curation improves planning quality because agents reason
  over a focused, relevant tool subset rather than the entire registry
- The 12 roles map directly to the agent workforce already described in the
  product, giving each workforce member a concrete, enforceable configuration
- Adding a new role is a localized change to `agent-roles.ts`; the permission
  evaluator and autonomy loop pick up the new role automatically
- Roles constrain but do not replace human oversight — high-risk roles default
  to manual/assisted autonomy, preserving founder/admin control over dangerous
  operations
- Role definitions must be kept in sync as new tools are registered; a tool not
  assigned to any role is effectively unreachable by agents, which is the
  desired safe default
