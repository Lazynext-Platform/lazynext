# Lazynext — Technical Architecture

**Version:** 1.0.0
**Status:** Active — Phase 1 approved
**Basis:** `research/ARCHITECTURE-PHASE1.md`, `AGENTS.md`

---

## 1. Overview

Lazynext is a **unified operating system** for people, teams, organizations, workflows, information, tools, applications, automation, AI, integrations, data, and digital work. The product is structured as a **platform OS** with a global shell and a set of **modules** (applications that run inside the OS). Each module is a first-class application with its own navigation, data, and actions, but all modules share the OS shell, identity layer, permission system, workspace context, search, command palette, and design system.

This is not a "dashboard with links." It is a coherent platform where:
- The **shell** provides global navigation, workspace switching, search, command palette, notifications, account, theme, locale, and session controls.
- **Modules** are the actual work surfaces (Creative Studio, Projects, Documents, Automations, AI Agents, Integrations, Admin, Developer Platform, etc.).
- A single **domain model** and **service layer** underpin all modules, the public API, and the MCP server — there is one business-logic layer, not three.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 | App Router, React Server Components |
| UI runtime | React 19 | Concurrent features, Server Components |
| Language | TypeScript 6 | Strict mode, path aliases |
| Styling | Tailwind CSS 4 | Utility-first, design tokens as CSS custom properties |
| ORM | Prisma 7 | Client engine type; D1 driver adapter (prod) / better-sqlite3 (local) |
| Database (prod) | Cloudflare D1 | SQLite at the edge; 37 tables |
| Database (local) | SQLite via `better-sqlite3` | `src/lib/prisma.local.ts` |
| Object storage (prod) | Cloudflare R2 | S3-compatible; bound in wrangler |
| Object storage (local) | File-based (`.dev-media/`) | `src/lib/media-storage.local.ts` |
| Runtime (prod) | Cloudflare Workers | Via OpenNext (`@opennextjs/cloudflare`) |
| Auth | NextAuth | JWT session, Google + Credentials providers |
| AI generation | Atlas Cloud API | Prod API + mock server (port 3099) for local dev |
| Billing | Dodo Payments | Webhook-based; no card storage |
| Ad platforms | Meta + Google Ads | Dry-run mode (ADR-004) |
| Testing | Node test runner + Playwright | 6188+ unit tests; 1052+ E2E tests |
| CI/CD | GitHub Actions | lint, typecheck, unit, integration, E2E, build, deploy |

### Build targets

The `scripts/prepare-platform.mjs` script selects the correct Prisma and media-storage implementations based on `BUILD_TARGET`:
- `BUILD_TARGET=local` → SQLite + file-based storage
- `BUILD_TARGET=cloudflare` → D1 + R2

```bash
npm run dev          # local dev, port 3100, BUILD_TARGET=local
npm run cf:build     # Cloudflare/OpenNext build
npm run cf:deploy    # Deploy to Cloudflare Workers
```

---

## 3. Deployment Topology

### 3.1 Runtime

Lazynext runs on **Cloudflare Workers** via OpenNext. The Next.js application is compiled to a Worker bundle that serves both the UI and the API. D1 is the database; R2 is object storage. Rate limiting uses Cloudflare rate limiter bindings (distributed, not in-memory).

```
Client (browser / API consumer / MCP client)
  → Cloudflare edge (Worker)
    → Next.js App Router (UI + API routes)
      → Application Services (src/lib/services/*)
        → Prisma → D1 (database)
        → R2 (object storage)
        → Atlas Cloud (AI generation)
        → Dodo (billing webhooks)
        → Ad platforms (Meta / Google Ads)
```

### 3.2 Environment separation

| Env | Purpose | DB | URL |
|---|---|---|---|
| local | Development | SQLite (`dev.db`) | `localhost:3100` |
| test | CI | Ephemeral SQLite | N/A |
| staging | Pre-prod validation | D1 (staging) | `staging.lazynext.com` |
| production | Live | D1 (prod) | `lazynext.com` |

### 3.3 Background jobs

Cron triggers (`*/5`) handle scheduled jobs. Long-running operations are evaluated for Durable Objects. In-request processing is used where the operation fits within Worker CPU/time limits.

---

## 4. Layered Architecture

The system follows a strict layered architecture. Each layer depends only on the layer below it. No layer skips or reaches upward.

```
┌─────────────────────────────────────────────────────────┐
│  TRANSPORT LAYER                                        │
│  Next.js pages (UI)  ·  /api/v1/* (REST)  ·  /mcp (MCP) │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  AUTH LAYER                                              │
│  requireAuth() · requireWorkspace() · requirePermission()│
│  Session (UI) · API key + scopes (REST) · OAuth/Bearer   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  DOMAIN LAYER                                            │
│  Business logic, validation, domain rules, policies      │
│  (src/lib/domain/*)                                      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  SERVICES LAYER                                          │
│  Application Services — single source of truth           │
│  (src/lib/services/*)                                    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  PERSISTENCE LAYER                                       │
│  Prisma 7 → D1 (prod) / SQLite (local)                   │
│  R2 (object storage)                                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  INTEGRATION LAYER                                       │
│  Atlas Cloud (AI) · Dodo (billing) · Meta/Google (ads)   │
│  OAuth providers · Webhook senders                       │
└─────────────────────────────────────────────────────────┘
```

### Layer responsibilities

| Layer | Responsibility | Does NOT |
|---|---|---|
| Transport | Parse request, call service, format response | Contain business logic |
| Auth | Resolve identity, workspace, permissions | Make domain decisions |
| Domain | Enforce business rules, validation, invariants | Touch the database directly |
| Services | Orchestrate domain + persistence + integrations | Contain transport-specific logic |
| Persistence | Store and retrieve data via Prisma | Contain business rules |
| Integration | Call external APIs (Atlas, Dodo, ad platforms) | Contain domain logic |

---

## 5. Shared Platform Core — One Business Logic Layer

> **There is one business-logic layer, not three.**

The Application Service layer (`src/lib/services/*`) is the **single source of truth** for all domain operations. Three transport surfaces — the web UI, the public REST API, and the MCP server — are thin adapters that call the same services.

```
UI (Next.js pages)
  → calls /api/internal/* (session auth)
API Gateway (/api/v1/*) (API key auth)
MCP Adapter (/mcp) (OAuth/Bearer)
  → all three call the SAME Application Services (src/lib/services/*)
    → Domain Logic + Prisma + Providers
```

No duplicate business logic. If a rule changes (e.g. "viewers cannot delete projects"), it changes in **one place** — the service — and all three surfaces inherit the change. This eliminates the class of bugs where the UI allows an action that the API blocks, or vice versa.

### Service examples

| Service | Methods | Called by |
|---|---|---|
| `ProjectService` | `create`, `list`, `get`, `update`, `delete` | UI, API `/api/v1/projects`, MCP `create_project` |
| `TaskService` | `create`, `list`, `get`, `update`, `delete` | UI, API `/api/v1/tasks`, MCP `create_task` |
| `DocumentService` | `create`, `list`, `get`, `update`, `search` | UI, API `/api/v1/documents`, MCP `get_document` |
| `CreativeService` | `generate`, `listGenerators`, `getCreation` | UI, API `/api/v1/creative/*`, MCP `creative.generate` |
| `SearchService` | `search` | UI, MCP `search` |

---

## 6. Module Structure

Lazynext is an OS with modules. Each module is a first-class application with its own navigation, data, and actions, but all modules share the OS shell.

| Module | Purpose | Why it exists |
|---|---|---|
| **Dashboard** | Landing surface after login: overview of workspace activity, recent objects, pinned items, system status | Every OS needs a home screen |
| **Creative Studio** | Consolidates all 178 ad-creative routes into one module with sub-features (pipelines, generators, brand, performance, compliance) | Preserves the existing product value; stops being the entire product |
| **Projects** | Project management: projects contain tasks, documents, files, conversations | Core OS primitive for organizing work |
| **Tasks** | Task management within projects and standalone; kanban/list/timeline views | Productivity primitive |
| **Documents** | Rich-text documents and knowledge base; wiki-like | Information primitive |
| **Files** | File/asset management with storage, sharing, versioning | Data primitive |
| **Automations** | Workflow builder + automation rules; triggers → actions; scheduled jobs | Automation is a core OS capability |
| **AI Agents** | Agent definitions, tool calling, runs, memory, evaluation | AI as a platform capability, not the whole product |
| **Integrations** | OAuth connections, API credentials, webhook endpoints, integration catalog | Platform extensibility |
| **Calendar** | Unified calendar across projects, scheduled posts, automations | Time-based coordination |
| **People** | Contacts, team members, organization members, presence | Collaboration primitive |
| **Conversations** | Threaded discussions (replaces ad-creative comments, generalized) | Communication primitive |
| **Analytics** | Cross-module analytics dashboards; usage, performance, audit | Insight primitive |
| **Search** | Global search across all objects (respects authorization) | OS-level discoverability |
| **Settings** | User preferences, workspace settings, org settings, billing, security, privacy | Control primitive |
| **Admin** | User/org/workspace administration, roles, permissions, audit logs, system health | Control plane |
| **Developer Platform** | API keys, API docs, MCP endpoint, webhooks, usage metrics | Developer surface |
| **Legal** | Terms, privacy, cookie policy, AUP, AI policy, DPA, subprocessors, data rights | Compliance surface |

### Route map

- **OS shell** wraps all authenticated routes.
- **Public area** (marketing, legal, auth) is outside the shell.
- **Module routes** live under `/{module}/...`.
- **Developer platform** lives under `/developers/...`.
- **Admin** lives under `/admin/...`.
- **API** lives under `/api/v1/...` (public) and `/api/internal/...` (app-internal).
- **MCP** lives at `/mcp` (single endpoint per Streamable HTTP spec).

---

## 7. Platform Primitives

These are the stable, reusable domain concepts that underpin all modules:

| Primitive | Description |
|---|---|
| **User** | A person with an identity (email, OAuth, password) |
| **Identity** | Linked auth providers for a user (Google, credentials, future OIDC) |
| **Session** | An authenticated session (JWT + server-side revocation) |
| **Organization** | A company/team entity; owns workspaces |
| **Workspace** | A tenant boundary; all data is workspace-scoped |
| **Team** | A sub-group within a workspace for project/task assignment |
| **Membership** | User ↔ Workspace relationship with a role |
| **Role** | Named role (owner, admin, member, viewer, guest) |
| **Permission** | Granular action permission (e.g. `project:create`, `file:delete`) |
| **Policy** | Rule over permissions (e.g. "viewers cannot delete") |
| **Project** | A container for related work (tasks, docs, files) |
| **Task** | A unit of work within a project |
| **Document** | A rich-text knowledge object |
| **File** | A stored binary asset with metadata |
| **Asset** | A generalized creative/media asset |
| **KnowledgeObject** | Base for searchable content (docs, briefs, scripts) |
| **Conversation** | A threaded discussion |
| **Integration** | An external service connection (OAuth or API key) |
| **Connection** | Credential/token for an integration |
| **Automation** | A workflow definition (trigger → steps → action) |
| **Agent** | An AI agent definition (model, tools, instructions, memory) |
| **AgentRun** | An execution of an agent |
| **Tool** | A callable function exposed to agents (wraps domain services) |
| **ApiCredential** | A public API key + secret with scopes |
| **WebhookEndpoint** | A user-registered webhook URL + events |
| **WebhookDelivery** | A delivery attempt for a webhook event |
| **Event** | A system event (audit, domain, notification) |
| **Notification** | A user-facing notification |
| **AuditEvent** | A security/business-critical audit record |
| **Subscription** | A billing subscription (plan, status, renewal) |
| **Invoice** | A billing invoice |
| **UsageRecord** | A metered usage record (credits, API calls, AI tokens) |
| **ScheduledJob** | A cron/scheduled task |
| **SearchIndex** | Logical search index entry (authorization-filtered) |

---

## 8. CI/CD

| Job | Runs | Blocks deploy? |
|---|---|---|
| lint | All PRs | Yes |
| typecheck | All PRs | Yes |
| unit tests | All PRs | Yes |
| integration tests | All PRs | Yes |
| E2E tests (Playwright) | All PRs | Yes |
| build | All PRs | Yes |
| dependency audit (`npm audit`) | All PRs + daily | Yes (high/critical) |
| secret scan | All PRs | Yes |
| SAST | All PRs | Yes |
| license check | All PRs | Yes |
| bundle size | All PRs | Warning (not blocking) |
| accessibility scan | All PRs | Warning |
| deploy (staging) | main push | After all checks pass |
| deploy (production) | Tagged release | Manual + after staging validation |

---

## 9. Testing Strategy

| Level | Scope | Tool | Target coverage |
|---|---|---|---|
| Unit | Domain logic, services, utils | Node test runner | 80%+ of service layer |
| Integration | DB, auth, API (with test DB) | Node test runner + test DB | All service methods |
| E2E | User journeys (browser) | Playwright | All critical journeys |
| Security | Authz boundaries, IDOR, input | Custom + automated | All API endpoints |
| Accessibility | WCAG 2.2 AA | axe-core in Playwright | All pages |
| Contract | API schema conformance | OpenAPI validation | All public API endpoints |
| MCP conformance | Protocol behavior | Custom MCP test client | All MCP RPCs |

### Critical E2E journeys

- Landing → signup → email verify → onboarding (create workspace)
- Login → dashboard → navigate modules
- Create project → create task → complete task
- Create document → edit → search
- Creative Studio: run generator → check status → view result
- Settings: switch theme → switch locale → switch workspace
- Admin: view users → suspend user → view audit log
- Developer: create API key → call API → view usage
- MCP: discover → list tools → call tool → poll task
- Mobile: all above at 375px width
- Keyboard: all above without mouse

---

*End of Technical Architecture document.*
