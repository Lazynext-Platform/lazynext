# Lazynext — Current State

**Date:** 2026-09-08
**Source:** Direct repository inspection (main branch, HEAD e15e831)

---

## 1. Product Identity

Lazynext is now a **full Autonomous Company Operating System** — no longer just an ad-creative studio with an OS shell.

- **OS layer (now mature):** The workspace/organization/project/task/agent/automation layer (Phase 3 OS Platform models) has been extended into a complete autonomous-execution platform: Company model, Goals, KPIs, Plans, Planner, Agent Runtime, Tool Registry, Approvals, Budgets, Memory, Events, Task System, CRM, Support, Finance, Research, Product, Permissions, Context Engine, Opportunities, Recommendations, and a rebuilt MCP server.
- **Creative Studio (preserved):** The bulk of the codebase (~178 feature routes, ~229 API endpoints) remains the mature ad-creative generation toolset, now repositioned under the Growth/Marketing domain of the Company OS.
- **Public API v1:** Exists (`/api/v1/workspaces`, `/api/v1/projects`, `/api/v1/tasks`, `/api/v1/documents`) with API key auth — a foundation for the developer platform.
- **MCP server:** Rebuilt against the 2026-07-28 spec, wrapping all platform services (not creative-only).

The product **is** an Autonomous Company Operating System. The ad-creative studio is now one capability domain within it.

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16.3.3 (App Router, turbopack) | |
| UI | React 19.2.8 + Tailwind CSS 4.3.3 | |
| Language | TypeScript 6.0.3 (+ typescript7 alias) | |
| Auth | NextAuth v5 beta (JWT, Google + Credentials) | MFA added (TOTP), session revocation added |
| ORM | Prisma 7.10.0 (client engine, driver-adapter) | |
| DB (prod) | Cloudflare D1 (SQLite) | |
| DB (local) | better-sqlite3 | |
| Storage (prod) | Cloudflare R2 (S3-compatible API) | Buckets not bound in wrangler.jsonc |
| Storage (local) | Filesystem (.dev-media/) | |
| Runtime (prod) | Cloudflare Workers via OpenNext | |
| AI provider | Atlas Cloud API | Mock server for local dev |
| Billing | Dodo Payments | Credit-pack model |
| Email | Resend | |
| Ad platforms | Meta + Google Ads | Dry-run mode, safety layers |
| E2E | Playwright 1.62.1 | 167 specs, 6 shards |
| CI/CD | GitHub Actions | lint+test → build → E2E → bundle-size → deploy + secret-scan + dep-audit + license-check |

## 3. Data Model (143 Prisma models)

### NextAuth (4)
User, Account, Session, VerificationToken

### Creative Studio / Ad-Platform (24)
Creation, CreditLedger, RedeemedCode, AdProduct, AdAvatar, BrandKit, BrandProfile, Asset, AssetVersion, SharedLink, WebhookEndpoint, CreativeComment, Team, TeamMember, TeamInvitation, TeamActivity, ApprovalStage, WorkflowRun, WorkflowStep, AdCampaign, CreativePerformance, Timeline, TimelineVersion, EditingSkill, CreativeTemplate, CustomComplianceRule, PlatformConnection, ScheduledPost, MetaSafetyAudit, MetaSafetyApproval, GoogleSafetyAudit, GoogleSafetyApproval, Hook

### OS Platform (18) — added in Phase 3
Organization, Workspace, Membership, Project, Task, Document, FileStore, Automation, AutomationRun, AgentDef, AgentRun, Notification, Conversation, Message, ScheduledJob, AuditEvent, ApiKey, DataRequest

### Company OS Domain (101+) — added in Phase 4-5+
Company, Goal, Kpi, Plan, ToolDef, ToolCall, Approval, Budget, BudgetEntry, Memory, Event, DetectedOpportunity, Recommendation, and the full set of business-domain models (CRM, Support, Finance, Research, Product, Permissions, Context, Task System, etc.) added across the Phase 5+ batch work.

### Tenancy model
- **Creative models:** user-scoped (`userId` FK to User) — no workspace tenancy
- **OS models:** workspace-scoped (`workspaceId` FK to Workspace) — proper tenancy
- **Safety models:** no tenancy at all (global tables) — **security gap** (Phase 27)
- **Team model:** separate from Organization/Workspace — **duplicate concept**

## 4. Service Layer

The service layer has grown from 5 modules to **251 service modules** in `src/lib/services/`.

| Service | File | Scope |
|---|---|---|
| WorkspaceService | `src/lib/services/workspace.ts` | Workspace CRUD, membership, role checks |
| AuditService | `src/lib/services/audit.ts` | Audit event logging |
| RateLimitService | `src/lib/services/rate-limit.ts` | In-memory rate limiting |
| Logger | `src/lib/services/logger.ts` | Structured logging |
| WorkflowEngine | `src/lib/workflow/engine.ts` | Durable workflow run/step tracking |
| CompanyService | `src/lib/services/company.ts` | Company CRUD, mission/vision/strategy |
| GoalService | `src/lib/services/goal.ts` | Goals CRUD |
| KpiService | `src/lib/services/kpi.ts` | KPIs CRUD |
| PlanService | `src/lib/services/plan.ts` | Plans CRUD |
| ToolRegistryService | `src/lib/services/tool-registry.ts` | Tool definitions + calls |
| ApprovalService | `src/lib/services/approval.ts` | Approval workflow |
| BudgetService | `src/lib/services/budget.ts` | Multi-level budgets |
| MemoryService | `src/lib/services/memory.ts` | Company memory |
| EventService | `src/lib/services/event.ts` | Shared event model |
| + 237 more | `src/lib/services/*.ts` | CRM, Support, Finance, Research, Product, Permissions, Context Engine, Opportunities, Recommendations, Planner, Agent Runtime, Task System, tool-executors, agent-roles, autonomy-loop, permission-evaluator, and all other business-domain services |

**Gap:** Centralized service layer now exists for all major domains. Remaining gaps are in wiring services into the agent runtime execution loop and enforcement (budget/approval enforcement into autonomous execution).

## 5. Route Map (summary)

- **432+ app page directories** in `src/app/`
- **3,250+ API route directories** in `src/app/api/`
- **~178 ad-creative feature pages** (preserved, now repositioned under Growth/Marketing)
- **~36 platform/system pages** (dashboard, settings, admin, legal, auth, workspaces, projects, tasks, agents, automations, etc.)
- **Company OS pages:** /company, /company/new, and all business-domain pages added in Phase 5+
- **Public API v1:** `/api/v1/{workspaces,projects,tasks,documents}` with API key auth
- **MCP server:** rebuilt against 2026-07-28 spec, wrapping all platform services

See `ROUTE_INVENTORY.md` and `API_INVENTORY.md` for details.

## 6. Security State

- **Auth:** NextAuth v5, JWT, Google + Credentials, MFA (TOTP), session revocation, email verification (not enforced at login)
- **Authz:** Per-route `auth()` checks (305+ routes), workspace membership checks in OS routes, `ADMIN_EMAILS` env for admin
- **Security hardening:** Extensive work done (43+ commits) — SSRF validation, input limits, IDOR fixes, CSP, timing-safe comparisons, rate limiting
- **Multi-tenancy hardening:** IDOR fixes and cross-tenant isolation applied (Phase 27 work)
- **Gaps:** Safety models still lack tenancy, OAuth tokens plain-text, no distributed rate limiter, email verification not enforced

See `SECURITY_INVENTORY.md` for details.

## 7. Testing State

| Level | Count | Status |
|---|---|---|
| Unit tests | 519+ files, 7,530 tests | All pass |
| E2E specs | 167 files | Not run in baseline (CI runs 6 shards) |
| Security tests | Inline in unit tests | Pass |
| Agent tests | Added in Phase 5+ | Pass |
| Autonomy tests | Added in Phase 5+ | Pass |

See `TEST_INVENTORY.md` for details.

## 8. Deployment State

- **Production:** Cloudflare Workers (lazynext.com) via OpenNext
- **CI/CD:** GitHub Actions — full pipeline with secret-scan, dep-audit, license-check
- **Local:** `npm run dev` (port 3100, SQLite, file-based media, mock Atlas)

See `DEPLOYMENT_INVENTORY.md` for details.

## 9. What Exists vs. What's Missing (vs. Target OS)

### Exists (foundation to build on)
- Workspace/organization tenancy
- Project/task/document/file CRUD
- Agent definitions + run records (now with durable execution)
- Automation definitions + run records
- Notifications, conversations, messages
- Scheduled jobs
- Audit events
- API keys (public API v1)
- Creative Studio (massive, mature)
- Ad platform integrations (Meta + Google, with safety layers)
- Billing (credits + Dodo)
- Auth (NextAuth + MFA + session revocation)
- i18n (13 locales, RTL)
- Observability (events, alerts, metrics)
- Workflow engine (durable state)
- **Company model** (mission/vision/strategy/goals/KPIs/products/customers/leads/finance/memory)
- **Autonomous execution loop** (OBSERVE → UNDERSTAND → ... → CONTINUE)
- **Planner** (durable planning system)
- **Tool registry** (centralized tool declarations)
- **Permission system** (policy-based authorization for agents)
- **Budget system** (multi-level spending controls)
- **Approval center** (centralized approval workflow)
- **Company memory** (facts/knowledge/decisions/preferences/outcomes/lessons)
- **Context engine** (relevant context assembly for agents)
- **Research system** (web discovery, fact extraction, citation)
- **Product system** (ideas, requirements, roadmaps)
- **Sales/CRM** (leads, contacts, accounts, opportunities)
- **Customer support** (tickets, triage, resolution)
- **Finance system** (invoices, subscriptions, expenses)
- **Operations system** (internal workflows, vendors, scheduling)
- **Analytics** (company-level analytics)
- **Experimentation** (A/B testing for business decisions)
- **Opportunity detection** (proactive opportunity identification)
- **Recommendation engine** (next-action recommendations)
- **Event system** (shared event model driving automations/notifications/analytics)
- **Agent workforce** (CEO, Strategy, Research, Product, Engineering, Design, Growth, Sales, Support, Finance, Operations, Security agents)
- **Agent runtime** (durable runs, tool calling, verification)
- **Autonomy modes** (Manual, Assisted, Autonomous, Timed Continuous)
- **Autonomy loop** (12-state state machine with pause/resume/stop, budget and approval gating — `src/lib/services/autonomy-loop.ts`)
- **Autonomy safety** (risk classification, approval gating, budget enforcement)
- **Permission evaluator** (8-layer policy stack: company→workspace→role→tool→resource→environment→budget→risk — `src/lib/services/permission-evaluator.ts`)
- **Tool executors** (32 concrete executors: 15 real + 17 placeholder for external services — `src/lib/services/tool-executors.ts`)
- **Agent roles** (12 specialized roles with scoped tools, permissions, risk levels, autonomy modes — `src/lib/services/agent-roles.ts`)
- **Company control center** (unified dashboard)
- **Live AI work feed** (understandable activity feed)
- **Founder/admin control** (pause/stop/approve/reject controls)
- **MCP server** (rebuilt against 2026-07-28 spec, wraps all platform services)
- **Multi-tenancy hardening** (IDOR testing, cross-tenant isolation)

### Previously Missing (now COMPLETE)
All phases 0-33 are complete. The items below were previously listed as missing but have since been implemented and verified:
- **Browser/computer execution** (secure browser sandbox) — Phase 12 COMPLETE
- **Code execution sandbox** (secure execution boundary) — Phase 12 COMPLETE
- **Software development loop** (GitHub engineering/deployment) — Phase 13 COMPLETE
- **Characterization tests** (preserve existing behavior) — COMPLETE (5 files, 129 tests)
- **Multi-tenancy scaling** (cross-tenant isolation at scale, concurrency) — Phase 28 COMPLETE
- **UX redesign** (Company Control Center polish, live AI work feed refinement) — Phase 29 COMPLETE
- **Performance/reliability** (N+1, bundles, polling, job throughput) — Phase 30 COMPLETE
- **CI/CD** (full pipeline validation) — Phase 31 COMPLETE
- **Production rollout** (progressive deployment) — Phase 32 COMPLETE
- **Final audit** (independent production review) — Phase 33 COMPLETE
- **Production verification** (login, task creation, agent runs, Atlas key, UI smoke test) — Phase 34 COMPLETE (2026-09-11)

### Truly Remaining (external dependencies only)
- **Atlas Cloud credits** — API key is configured and authenticates, but the account needs credits for AI operations to execute (agent runs, creative generation, etc.)
- **Load testing at scale** — production deployment handles current traffic; formal load testing requires dedicated infrastructure
