# Lazynext — Information Architecture

**Date:** 2026-09-03
**Status:** Active
**Depends on:** `ARCHITECTURE-PHASE1.md`

> This document defines the complete information architecture for Lazynext OS: all navigation systems, the entity relationship model, and how users move through the platform.

---

## 1. Navigation Systems Overview

Lazynext has **seven distinct navigation systems**, each serving a different context:

| Navigation system | Context | Shell? | Auth required? |
|---|---|---|---|
| Marketing navigation | Public site (landing, pricing, legal) | No | No |
| Auth navigation | Login, signup, reset, verify | No | No |
| Global navigation (OS shell) | All authenticated app routes | Yes | Yes |
| Workspace navigation | Workspace-scoped settings + members | Yes | Yes |
| Module navigation | Within a module (e.g., Creative Studio sub-features) | Yes | Yes |
| Admin navigation | Admin control plane | Yes | Yes (admin role) |
| Developer navigation | Developer platform | Yes | Yes |
| Support navigation | Help, docs, status, contact | No | No |

---

## 2. Marketing Navigation (public, no shell)

The marketing site is outside the OS shell. It uses a simple top nav with the Lazynext wordmark and primary links.

| Link | Route | Purpose |
|---|---|---|
| Logo / Home | `/` | Marketing landing page (new OS positioning) |
| Product | `/#product` | Product overview section |
| Pricing | `/pricing` | Plans + credit packs |
| Developers | `/developers` | Developer platform home (publicly visible) |
| Status | `/status` | System status page |
| Login | `/login` | Login page |
| Get started | `/signup` | Signup page |

### Footer (marketing + legal)

| Link | Route | Category |
|---|---|---|
| Terms | `/terms` | Legal |
| Privacy | `/privacy` | Legal |
| Cookies | `/cookies` | Legal |
| Acceptable Use | `/acceptable-use` | Legal |
| AI Policy | `/ai-policy` | Legal |
| DPA | `/dpa` | Legal |
| Subprocessors | `/subprocessors` | Legal |
| Security | `/security` | Legal |
| Data Request | `/data-request` | Legal |
| Status | `/status` | System |

---

## 3. Auth Navigation (public, no shell)

Auth pages are outside the OS shell. They use a minimal layout with only the Lazynext wordmark.

| Route | Purpose | Notes |
|---|---|---|
| `/login` | Login page (email + Google) | Replaces modal-only auth |
| `/signup` | Signup page | Creates user + default workspace |
| `/reset-password` | Password reset UI | Token-based, 1h expiry |
| `/verify-email` | Email verification landing | Token-based, enforces verification |

### Auth flow

```
/signup → create user → send verification email → /verify-email → /dashboard
/login → authenticate → /dashboard (or /verify-email if unverified)
/reset-password → send reset email → /reset-password?token=... → /login
```

---

## 4. Global Navigation (OS Shell)

All authenticated routes render inside the global shell. The shell provides:

### 4.1 Shell components

| Component | Purpose |
|---|---|
| **Top bar** | Wordmark, workspace switcher, global search (Cmd+K), notifications, account menu |
| **Primary nav** | Module navigation (sidebar on desktop, hamburger on mobile) |
| **Command palette** | Global search + quick actions (Cmd+K) |
| **Notifications** | Notification dropdown (bell icon) |
| **Account menu** | Profile, settings, theme, locale, logout |
| **Workspace switcher** | Switch between workspaces; create new workspace |

### 4.2 Primary navigation items (sidebar)

| Nav item | Route | Module | Icon |
|---|---|---|---|
| Dashboard | `/dashboard` | Dashboard | Home |
| Projects | `/projects` | Projects | FolderKanban |
| Tasks | `/tasks` | Tasks | CheckSquare |
| Documents | `/documents` | Documents | FileText |
| Files | `/files` | Files | Folder |
| Creative Studio | `/creative` | Creative Studio | Sparkles |
| Automations | `/automations` | Automations | Zap |
| AI Agents | `/agents` | AI Agents | Bot |
| Integrations | `/integrations` | Integrations | Plug |
| Calendar | `/calendar` | Calendar | Calendar |
| People | `/people` | People | Users |
| Conversations | `/conversations` | Conversations | MessageSquare |
| Analytics | `/analytics` | Analytics | BarChart3 |
| Search | `/search` | Search | Search |

### 4.3 Secondary navigation items (bottom of sidebar)

| Nav item | Route | Module |
|---|---|---|
| Settings | `/settings` | Settings |
| Admin | `/admin` | Admin (admin role only) |
| Developers | `/developers` | Developer Platform |
| Help & Docs | `/help` | Support |

### 4.4 Account menu (dropdown)

| Item | Route |
|---|---|
| Profile | `/settings/profile` |
| Security | `/settings/security` |
| Notifications | `/settings/notifications` |
| Appearance | `/settings/appearance` |
| Language & Region | `/settings/locale` |
| Billing | `/workspaces/[current]/billing` |
| API Keys | `/developers/api-keys` |
| Logout | POST `/api/internal/auth/logout` |

---

## 5. Workspace Navigation

Workspace-scoped routes live under `/workspaces/[id]/...`. These are accessed via the workspace switcher in the top bar and the Settings module.

| Route | Purpose |
|---|---|
| `/workspaces` | Workspace list + switcher |
| `/workspaces/[id]` | Redirect to `/workspaces/[id]/settings` |
| `/workspaces/[id]/settings` | Workspace settings (name, slug, locale, timezone) |
| `/workspaces/[id]/members` | Members + roles + invitations |
| `/workspaces/[id]/billing` | Subscription, invoices, usage |
| `/workspaces/[id]/integrations` | Workspace integrations |
| `/workspaces/[id]/webhooks` | Webhook endpoints |
| `/workspaces/[id]/audit-log` | Audit log |

### Workspace switcher behavior

- Click workspace name in top bar → dropdown with all workspaces + "Create workspace" + "Manage workspaces"
- Switching workspace updates the global context; all module routes reflect the active workspace
- Active workspace is stored in session/cookie; resolved server-side on every request

---

## 6. Module Navigation

Each module has its own sub-navigation within the OS shell.

### 6.1 Dashboard

| Sub-nav | Route |
|---|---|
| Overview | `/dashboard` |
| Recent | `/dashboard/recent` |
| Pinned | `/dashboard/pinned` |

### 6.2 Creative Studio

| Sub-nav | Route |
|---|---|
| Studio home | `/creative` |
| Pipelines | `/creative/pipelines` |
| Generators | `/creative/generators` |
| Brand | `/creative/brand` |
| Performance | `/creative/performance` |
| Compliance | `/creative/compliance` |
| Assets | `/creative/assets` |
| Campaigns | `/creative/campaigns` |

### 6.3 Projects

| Sub-nav | Route |
|---|---|
| All projects | `/projects` |
| Active | `/projects?status=active` |
| Archived | `/projects?status=archived` |
| Project detail | `/projects/[id]` (tabs: Overview, Tasks, Documents, Files, Conversations) |

### 6.4 Tasks

| Sub-nav | Route |
|---|---|
| All tasks | `/tasks` |
| My tasks | `/tasks?assignee=me` |
| By board | `/tasks?view=kanban` |
| By list | `/tasks?view=list` |
| By timeline | `/tasks?view=timeline` |

### 6.5 Documents

| Sub-nav | Route |
|---|---|
| All documents | `/documents` |
| Recent | `/documents?sort=recent` |
| Templates | `/documents/templates` |
| Document editor | `/documents/[id]` |

### 6.6 Files

| Sub-nav | Route |
|---|---|
| All files | `/files` |
| Recent | `/files?sort=recent` |
| Shared | `/files?filter=shared` |
| Trash | `/files/trash` |

### 6.7 Automations

| Sub-nav | Route |
|---|---|
| All automations | `/automations` |
| Active | `/automations?status=active` |
| Runs | `/automations/runs` |
| Automation detail | `/automations/[id]` (tabs: Overview, Runs, Logs) |

### 6.8 AI Agents

| Sub-nav | Route |
|---|---|
| All agents | `/agents` |
| Runs | `/agents/runs` |
| Tools | `/agents/tools` |
| Agent detail | `/agents/[id]` (tabs: Overview, Runs, Memory, Tools) |

### 6.9 Integrations

| Sub-nav | Route |
|---|---|
| Catalog | `/integrations` |
| Connected | `/integrations?filter=connected` |
| Integration detail | `/integrations/[provider]` |

### 6.10 Calendar

| Sub-nav | Route |
|---|---|
| Month | `/calendar?view=month` |
| Week | `/calendar?view=week` |
| Day | `/calendar?view=day` |
| Agenda | `/calendar?view=agenda` |

### 6.11 People

| Sub-nav | Route |
|---|---|
| Members | `/people` |
| Teams | `/people/teams` |
| Contacts | `/people/contacts` |

### 6.12 Conversations

| Sub-nav | Route |
|---|---|
| All conversations | `/conversations` |
| Following | `/conversations?filter=following` |
| Conversation | `/conversations/[id]` |

### 6.13 Analytics

| Sub-nav | Route |
|---|---|
| Overview | `/analytics` |
| Usage | `/analytics/usage` |
| Performance | `/analytics/performance` |
| Audit | `/analytics/audit` |

---

## 7. Settings Navigation

Settings is split into **user settings** (global, not workspace-scoped) and **workspace settings** (workspace-scoped, under `/workspaces/[id]/...`).

### 7.1 User settings (`/settings/...`)

| Sub-nav | Route | Purpose |
|---|---|---|
| Profile | `/settings/profile` | Name, avatar, bio |
| Security | `/settings/security` | Password, MFA, sessions, active devices |
| Notifications | `/settings/notifications` | Per-event notification preferences |
| Appearance | `/settings/appearance` | Theme (light/dark/system) |
| Language & Region | `/settings/locale` | Language, region, timezone |
| Privacy | `/settings/privacy` | Data export, data deletion, consent management |

### 7.2 Workspace settings (`/workspaces/[id]/...`)

See §5 Workspace Navigation.

---

## 8. Admin Navigation

Admin routes are only visible to users with the `admin` role. They live under `/admin/...`.

| Nav item | Route | Purpose |
|---|---|---|
| Dashboard | `/admin` | Platform overview (users, workspaces, revenue) |
| Users | `/admin/users` | User administration (suspend, delete, role) |
| Workspaces | `/admin/workspaces` | Workspace administration |
| Billing | `/admin/billing` | Billing administration (subscriptions, invoices) |
| System | `/admin/system` | System health, observability, config |
| Audit | `/admin/audit` | Global audit log |
| Feedback | `/admin/feedback` | User feedback management |

---

## 9. Developer Navigation

Developer platform routes live under `/developers/...`. The home page (`/developers`) is publicly visible; management routes require auth.

| Nav item | Route | Auth | Purpose |
|---|---|---|---|
| Home | `/developers` | Public | Developer platform overview |
| API Keys | `/developers/api-keys` | Yes | API credential management (create, revoke) |
| Docs | `/developers/docs` | Public | API documentation (OpenAPI) |
| MCP | `/developers/mcp` | Public | MCP endpoint info + connection guide |
| Webhooks | `/developers/webhooks` | Yes | Webhook management (endpoints, deliveries) |
| Usage | `/developers/usage` | Yes | API usage metrics (calls, credits, errors) |

---

## 10. Support Navigation

Support routes are publicly accessible (no shell, no auth).

| Link | Route | Purpose |
|---|---|---|
| Help & Docs | `/help` | Help center + documentation |
| Status | `/status` | System status page |
| Contact | `/help/contact` | Contact form |
| Data Request | `/data-request` | Privacy rights request form |

---

## 11. Entity Relationships

### 11.1 Core entity model

```
User (identity)
  ├── Account (OAuth providers: Google, credentials)
  ├── Session (authenticated sessions)
  ├── Membership (user ↔ workspace relationship with role)
  │     └── Workspace (tenant boundary)
  │           ├── Organization (company entity; owns workspaces)
  │           ├── Team (sub-group within workspace)
  │           ├── Project (container for related work)
  │           │     ├── Task (unit of work)
  │           │     ├── Document (rich-text knowledge)
  │           │     └── File (stored binary)
  │           ├── Document (workspace-level docs)
  │           ├── File (workspace-level files)
  │           ├── Asset (creative/media asset)
  │           ├── Creation (AI generation job)
  │           ├── Automation (workflow definition)
  │           │     └── AutomationRun (execution)
  │           ├── Agent (AI agent definition)
  │           │     └── AgentRun (execution)
  │           ├── Integration (external service connection)
  │           │     └── Connection (OAuth/API credentials)
  │           ├── Conversation (threaded discussion)
  │           ├── WebhookEndpoint (user webhook)
  │           │     └── WebhookDelivery (delivery attempt)
  │           ├── ScheduledJob (cron/scheduled task)
  │           └── AuditEvent (security/business audit record)
  ├── ApiCredential (public API key + secret with scopes)
  └── Notification (user-facing notification)
```

### 11.2 Entity definitions

| Entity | Description | Scope |
|---|---|---|
| **User** | A person with an identity (email, OAuth, password) | Global |
| **Account** | Linked auth provider for a user (Google, credentials, future OIDC) | Per user |
| **Session** | An authenticated session (JWT + server-side revocation) | Per user |
| **Organization** | A company/team entity; owns workspaces | Global |
| **Workspace** | A tenant boundary; all business data is workspace-scoped | Per organization |
| **Team** | A sub-group within a workspace for project/task assignment | Per workspace |
| **Membership** | User ↔ Workspace relationship with a role | Per user + workspace |
| **Role** | Named role (owner, admin, member, viewer, guest) | Per membership |
| **Permission** | Granular action permission (e.g. `project:create`, `file:delete`) | Per role |
| **Project** | A container for related work (tasks, docs, files) | Per workspace |
| **Task** | A unit of work within a project | Per project |
| **Document** | A rich-text knowledge object | Per workspace or project |
| **File** | A stored binary asset with metadata | Per workspace or project |
| **Asset** | A generalized creative/media asset | Per workspace |
| **Creation** | An AI generation job | Per workspace |
| **Integration** | An external service connection (OAuth or API key) | Per workspace |
| **Connection** | Credential/token for an integration | Per integration |
| **Automation** | A workflow definition (trigger → steps → action) | Per workspace |
| **Agent** | An AI agent definition (model, tools, instructions, memory) | Per workspace |
| **AgentRun** | An execution of an agent | Per agent |
| **Tool** | A callable function exposed to agents | Global or per workspace |
| **ApiCredential** | A public API key + secret with scopes | Per user |
| **WebhookEndpoint** | A user-registered webhook URL + events | Per workspace |
| **WebhookDelivery** | A delivery attempt for a webhook event | Per endpoint |
| **Subscription** | A billing subscription (plan, status, renewal) | Per workspace |
| **Invoice** | A billing invoice | Per workspace |
| **UsageRecord** | A metered usage record (credits, API calls, AI tokens) | Per workspace + user |
| **ScheduledJob** | A cron/scheduled task | Per workspace |
| **AuditEvent** | A security/business-critical audit record | Per user + workspace |
| **Notification** | A user-facing notification | Per user |

### 11.3 Key relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| User → Account | 1:many | OAuth providers (Google, credentials) |
| User → Session | 1:many | Authenticated sessions; revocable |
| User → Membership | 1:many | User can be member of multiple workspaces |
| Organization → Workspace | 1:many | Company owns multiple workspaces |
| Workspace → Membership | 1:many | Workspace has multiple members |
| Workspace → Team | 1:many | Workspace has sub-groups |
| Workspace → Project | 1:many | Workspace contains projects |
| Project → Task | 1:many | Project contains tasks |
| Project → Document | 1:many | Project can contain docs |
| Project → File | 1:many | Project can contain files |
| Workspace → Integration | 1:many | Workspace has integrations |
| Integration → Connection | 1:many | Integration has credential connections |
| Workspace → Automation | 1:many | Workspace has automations |
| Automation → AutomationRun | 1:many | Automation has executions |
| Workspace → Agent | 1:many | Workspace has AI agents |
| Agent → AgentRun | 1:many | Agent has executions |
| Workspace → WebhookEndpoint | 1:many | Workspace has webhook endpoints |
| WebhookEndpoint → WebhookDelivery | 1:many | Endpoint has delivery attempts |
| Workspace → Subscription | 1:1 (active) | Workspace has one active subscription |
| Workspace → UsageRecord | 1:many | Workspace has usage records |
| User → ApiCredential | 1:many | User has API keys |
| User → Notification | 1:many | User has notifications |
| User → AuditEvent | 1:many | User's actions are audited |
| Workspace → AuditEvent | 1:many | Workspace events are audited |

---

## 12. Permission Model

### 12.1 Roles

| Role | Scope | Permissions |
|---|---|---|
| **Owner** | Workspace | Full control; can delete workspace; can transfer ownership |
| **Admin** | Workspace | Full control except workspace deletion/transfer |
| **Member** | Workspace | Create/edit own objects; view all workspace objects |
| **Viewer** | Workspace | Read-only access to workspace objects |
| **Guest** | Specific project | Limited access to assigned project only |

### 12.2 Permission format

Permissions use a `resource:action` format:

| Permission | Description |
|---|---|
| `workspace:read` | View workspace |
| `workspace:write` | Modify workspace settings |
| `workspace:delete` | Delete workspace |
| `project:create` | Create projects |
| `project:read` | View projects |
| `project:write` | Modify projects |
| `project:delete` | Delete projects |
| `task:create` | Create tasks |
| `task:read` | View tasks |
| `task:write` | Modify tasks |
| `task:delete` | Delete tasks |
| `document:create` | Create documents |
| `document:read` | View documents |
| `document:write` | Modify documents |
| `document:delete` | Delete documents |
| `file:read` | View/download files |
| `file:write` | Upload/modify files |
| `file:delete` | Delete files |
| `creative:read` | View creative assets |
| `creative:write` | Generate/modify creative assets |
| `automation:read` | View automations |
| `automation:write` | Create/modify/run automations |
| `agent:read` | View agents |
| `agent:write` | Create/modify/run agents |
| `integration:read` | View integrations |
| `integration:write` | Connect/modify integrations |
| `webhook:read` | View webhook endpoints |
| `webhook:write` | Create/modify webhook endpoints |
| `usage:read` | View usage metrics |
| `audit:read` | View audit log |
| `member:read` | View workspace members |
| `member:write` | Invite/modify members |
| `member:delete` | Remove members |

### 12.3 Role → permission mapping

| Permission | Owner | Admin | Member | Viewer | Guest |
|---|---|---|---|---|---|
| `workspace:read` | ✓ | ✓ | ✓ | ✓ | — |
| `workspace:write` | ✓ | ✓ | — | — | — |
| `workspace:delete` | ✓ | — | — | — | — |
| `project:*` | ✓ | ✓ | ✓ | read | project-scoped |
| `task:*` | ✓ | ✓ | ✓ | read | project-scoped |
| `document:*` | ✓ | ✓ | ✓ | read | project-scoped |
| `file:*` | ✓ | ✓ | ✓ | read | project-scoped |
| `creative:*` | ✓ | ✓ | ✓ | read | — |
| `automation:*` | ✓ | ✓ | ✓ | read | — |
| `agent:*` | ✓ | ✓ | ✓ | read | — |
| `integration:*` | ✓ | ✓ | — | — | — |
| `webhook:*` | ✓ | ✓ | — | — | — |
| `usage:read` | ✓ | ✓ | — | — | — |
| `audit:read` | ✓ | ✓ | — | — | — |
| `member:*` | ✓ | ✓ | — | — | — |

---

## 13. Navigation Principles

1. **Shell wraps all authenticated routes.** The global shell (top bar, sidebar, command palette, notifications, account menu) is present on every authenticated page.
2. **Public area is outside the shell.** Marketing, legal, auth, and status pages use a minimal layout.
3. **Module routes live under `/{module}/...`.** Clean, meaningful URLs. No route names based on obsolete experiments.
4. **Workspace context is implicit.** The active workspace is resolved server-side from session/cookie, not from the URL (except for workspace settings under `/workspaces/[id]/...`).
5. **Search is global.** Cmd+K opens the command palette with global search across all objects (respecting authorization).
6. **Mobile navigation.** Sidebar collapses to a hamburger menu on narrow screens. All modules accessible.
7. **Keyboard navigation.** All navigation is keyboard-accessible. Cmd+K for command palette. Tab/arrow keys for nav.
8. **Breadcrumb trail.** Each page shows a breadcrumb (Workspace > Module > Sub-page > Detail) for context.
9. **Active state.** Active nav item is visually distinct (accent background in Neo-Brutalist style).
10. **No more than 2 levels of nav.** Primary nav (sidebar) + module sub-nav (tabs/breadcrumbs). No deeper nesting in navigation.

---

*This IA is a living document. It should be updated as modules are built and navigation patterns evolve.*
