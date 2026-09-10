# Lazynext — Target Architecture

**Date:** 2026-09-04
**Status:** Draft — to be refined through phased implementation

---

## 1. Target Product Vision

Lazynext = **The Autonomous Company Operating System**

> The user defines the direction. Lazynext plans, executes, measures, learns, and continues the work.

One coherent operating system — not a collection of tools. The user creates a Company, and the system understands, plans, executes, measures, learns, and replans autonomously within policy.

## 2. Conceptual Hierarchy

```
USER
→ ORGANIZATION
→ COMPANY
→ WORKSPACE
→ TEAM
→ PEOPLE / AGENTS / SYSTEMS
```

- **User:** Identity, auth, preferences
- **Organization:** Billing entity, owns companies
- **Company:** Core operating entity (mission, vision, strategy, goals, KPIs, products, customers, leads, projects, tasks, agents, tools, integrations, finance, workflows, automations, memory)
- **Workspace:** Tenancy boundary for company data
- **Team:** Group of people + agents within a workspace
- **People/Agents/Systems:** Actors that do work

## 3. Architecture Layers

### Control Plane
- UI (Next.js App Router)
- API (internal + public v1)
- Auth (NextAuth + MFA)
- Company state (Organization/Company/Workspace)
- Configuration (settings, policies, feature flags)

### Execution Plane
- Agent runtime (durable runs, tool calling, verification)
- Workers (background jobs, scheduled jobs)
- Browser sandbox (secure browser execution)
- Code sandbox (secure code execution)
- Long-running autonomous loops

### Data Plane
- Relational DB (Cloudflare D1 / SQLite)
- Object storage (Cloudflare R2)
- Search/vector (future — may use D1 FTS or external)
- Analytics (aggregated metrics)

## 4. Shared Primitives (One Canonical Implementation Each)

| Primitive | Current State | Target |
|---|---|---|
| Task System | Basic (Task model, Kanban) | Full (dependencies, priority, budget, retry, agent assignment, verification) |
| Agent Runtime | Thin (AgentDef/AgentRun CRUD) | Full (durable runs, tool calling, context engine, verification, memory) |
| Permission System | Per-route auth() checks | Policy-based (user/agent/tool/action/resource/risk → ALLOW/DENY/REQUIRE_APPROVAL) |
| Event System | None | Shared event model (timestamp, type, company, actor, resource, metadata, correlation ID) |
| Automation Engine | Thin (Automation/AutomationRun CRUD) | Full (trigger→conditions→plan→actions→verification→result, durable, auditable) |
| Notification System | Implemented (Notification model) | Extend for agent activity, approval requests, opportunities |
| Audit System | Implemented (AuditEvent model) | Extend for all agent/tool actions |
| Company Context | None | Company model with full operating entity |
| Search System | Partial (/search page) | Unified search across all company objects with access controls |
| Billing Model | Credit packs + Dodo | Extend with subscriptions, usage tracking, budgets |
| Integration Framework | Partial (PlatformConnection) | Normalized (provider, connection, credential status, health, rate-limit) |
| Tool Registry | None | Centralized (name, schema, permissions, risk, budget, audit) |
| Memory System | None | Company memory (facts/knowledge/decisions/preferences/outcomes/lessons) |
| Approval Center | Partial (ApprovalStage) | Centralized (action, agent, risk, cost, approver, decision) |
| Budget System | None | Multi-level (company/workspace/agent/task/integration/campaign/period) |
| Planner | None | Durable planning (objective, tasks, dependencies, priority, owner, tools, risk, verification) |

## 5. Module Taxonomy

The product is organized into modules, each building on the shared primitives:

### Core OS
- Dashboard (Company Control Center)
- Company (mission, vision, strategy, goals, KPIs)
- Work (projects, tasks, initiatives)
- Knowledge (documents, files, memory, search)
- Agents (agent workforce, runtime, activity feed)
- Automations (trigger→action engine)
- Approvals (centralized approval center)
- Integrations (normalized connection framework)
- Settings (profile, security, billing, locale, notifications)
- Admin (user management, audit, observability)
- Developer Platform (public API v1, MCP server, API keys)

### Execution
- Autonomous Loop (OBSERVE→UNDERSTAND→...→CONTINUE)
- Planner (durable planning)
- Tool Registry (centralized tools)
- Budget (spending controls)
- Sandbox (browser + code execution)

### Business Modules
- Growth (marketing, campaigns, content, social, advertising, SEO, email)
  - Creative Studio (existing — repositioned under Growth→Marketing)
- Customers (CRM, support, communications)
- Finance (billing, invoices, expenses, budgets)
- Operations (internal workflows, scheduling, vendors)
- Intelligence (research, analytics, experimentation, opportunities, recommendations)
- Engineering (GitHub integration, deployment, software dev loop)

## 6. Navigation (Target)

Primary navigation organized around OS concepts:
- Home (Company Control Center)
- Company (mission, strategy, goals, KPIs)
- Work (projects, tasks)
- Agents (workforce, activity, approvals)
- Growth (campaigns, Creative Studio, content)
- Customers (CRM, support)
- Finance (billing, budgets)
- Automations
- Knowledge (documents, search, memory)
- Analytics
- Integrations
- Settings

## 7. Agent Workforce (Target)

| Agent | Role | Priority |
|---|---|---|
| CEO/Executive | Company context, priorities, strategy, delegation | P0 |
| Strategy | Market strategy, positioning, competitive analysis | P1 |
| Research | Web research, market intelligence, evidence gathering | P1 |
| Product | Product planning, requirements, prioritization | P1 |
| Engineering | Code, tests, PRs, deployment | P1 |
| Design/Creative | Brand, visuals, campaigns, content | P1 |
| Growth | Marketing, campaigns, acquisition, advertising | P1 |
| Sales | Leads, CRM, outreach, pipeline | P2 |
| Support | Customer questions, triage, resolution | P2 |
| Finance | Financial analysis, budgets, invoices | P2 |
| Operations | Operational workflows, scheduling | P2 |
| Security/Compliance | Security checks, policy, risk detection | P2 |

## 8. Autonomous Loop (Target)

```
OBSERVE → UNDERSTAND → PRIORITIZE → PLAN → SELECT AGENT → SELECT TOOLS
→ CHECK POLICIES → REQUEST APPROVAL IF REQUIRED → EXECUTE → VERIFY
→ MEASURE → RECORD RESULT → UPDATE MEMORY → REPLAN → CONTINUE
```

Must survive: process restarts, worker crashes, transient API failures, rate limits, partial completion, duplicate execution, deployment interruptions.

Uses: idempotency, durable state, exponential backoff, dead-letter handling.

## 9. Autonomy Modes

| Mode | Behavior |
|---|---|
| Manual | User explicitly starts each action |
| Assisted | AI proposes, waits for confirmation |
| Autonomous | AI executes authorized actions automatically |
| Timed Continuous | User defines duration/window; system runs until time/budget/policy limit |

## 10. Migration Strategy

- **Preserve** all existing Creative Studio functionality — reposition under Growth
- **Preserve** all existing auth, billing, i18n, security work
- **Extend** Organization → Company model (additive)
- **Extend** Task/Agent/Automation models (additive fields)
- **Deprecate** Team model (migrate to Organization/Workspace)
- **Add** new models (Company, Goal, Kpi, Plan, ToolDef, ToolCall, Permission, Approval, Budget, Memory, etc.)
- **Consolidate** ~178 ad-creative routes into organized Creative Studio modules
- **Rebuild** MCP server against 2026-07-28 spec
- **Add** autonomous execution loop, planner, tool registry, budget, approval center
- **Add** business modules (CRM, support, finance, operations, research, analytics)

All changes are **additive first** — no destructive migrations without backup, test, and rollback.
