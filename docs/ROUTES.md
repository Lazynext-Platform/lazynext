# Lazynext — Complete Route Map

**Date:** 2026-09-03
**Status:** Active (target architecture)
**Depends on:** `ARCHITECTURE-PHASE1.md`, `DISCOVERY-REPORT-PHASE0.md`

> This document defines the complete target route map for Lazynext OS. Routes are organized by category: public, auth, application (by module), admin, developer, API, MCP, and error pages. Legacy routes are listed with their redirect targets.

---

## 1. Public Routes (no shell, no auth)

### 1.1 Marketing

| Route | Purpose | Auth | Notes |
|---|---|---|---|
| `/` | Marketing landing page (new OS positioning) | Public | Replaces old 4-featured-app landing |
| `/pricing` | Plans + credit packs | Public | Rebuilt with subscription tiers + credit packs |

### 1.2 Legal

| Route | Purpose | Auth | Status |
|---|---|---|---|
| `/terms` | Terms of Service | Public | Rewrite for OS identity |
| `/privacy` | Privacy Policy | Public | Rewrite with GDPR/DPDP/CCPA |
| `/cookies` | Cookie Policy | Public | New |
| `/acceptable-use` | Acceptable Use Policy | Public | New |
| `/ai-policy` | AI/Generative AI Policy | Public | New (EU AI Act) |
| `/dpa` | Data Processing Agreement | Public | New (GDPR Art. 28) |
| `/subprocessors` | Subprocessor disclosure | Public | New |
| `/security` | Security documentation | Public | New |
| `/data-request` | Privacy rights request form | Public | New (GDPR/DPDP/CCPA) |

### 1.3 Support

| Route | Purpose | Auth | Status |
|---|---|---|---|
| `/help` | Help center + documentation | Public | New |
| `/help/contact` | Contact form | Public | New |
| `/status` | System status page | Public | Keep (exists at `/status`) |

---

## 2. Auth Routes (no shell, no auth)

| Route | Purpose | Auth | Status |
|---|---|---|---|
| `/login` | Login page (email + Google) | Public | New (replaces modal-only auth) |
| `/signup` | Signup page | Public | New |
| `/reset-password` | Password reset UI | Public | Keep (exists) |
| `/verify-email` | Email verification landing | Public | New |

### Auth flow routes

```
/signup → POST /api/internal/auth/signup → send verification email → /verify-email
/login → POST /api/auth/callback/credentials → /dashboard (or /verify-email)
/reset-password → POST /api/internal/auth/reset-request → send reset email
/reset-password?token=... → POST /api/internal/auth/reset-confirm → /login
/verify-email?token=... → POST /api/internal/auth/verify → /dashboard
```

---

## 3. Application Routes (authenticated, OS shell)

All routes below render inside the global shell (top bar, sidebar, command palette, notifications, account menu).

### 3.1 Dashboard

| Route | Purpose |
|---|---|
| `/dashboard` | Workspace home: activity overview, recent objects, pinned items, system status |
| `/dashboard/recent` | Recent objects across all modules |
| `/dashboard/pinned` | Pinned items |

### 3.2 Projects

| Route | Purpose |
|---|---|
| `/projects` | Project list (filterable by status) |
| `/projects/[id]` | Project detail (tabs: Overview, Tasks, Documents, Files, Conversations) |
| `/projects/[id]/tasks` | Project tasks (kanban/list/timeline) |
| `/projects/[id]/documents` | Project documents |
| `/projects/[id]/files` | Project files |
| `/projects/[id]/conversations` | Project conversations |

### 3.3 Tasks

| Route | Purpose |
|---|---|
| `/tasks` | Cross-project task view (all tasks, my tasks, by board/list/timeline) |
| `/tasks/[id]` | Task detail |

### 3.4 Documents

| Route | Purpose |
|---|---|
| `/documents` | Document/knowledge list |
| `/documents/[id]` | Document editor |
| `/documents/templates` | Document templates |

### 3.5 Files

| Route | Purpose |
|---|---|
| `/files` | File library |
| `/files/trash` | Deleted files (soft-delete recovery) |
| `/files/[id]` | File detail (metadata, versions, sharing) |

### 3.6 Creative Studio

| Route | Purpose |
|---|---|
| `/creative` | Studio home (consolidated 178 routes) |
| `/creative/pipelines` | 4 flagship pipelines (lazynext-studio, ad-reference, drama-studio, ad-skit) |
| `/creative/pipelines/[slug]` | Individual pipeline |
| `/creative/generators` | All generators (searchable, categorized) |
| `/creative/generators/[slug]` | Individual generator (consolidates 178 ad-creative routes) |
| `/creative/brand` | Brand kits, profiles, voice |
| `/creative/performance` | Performance analytics |
| `/creative/compliance` | Safety/approval workflows (Meta, Google) |
| `/creative/assets` | Creative asset library |
| `/creative/campaigns` | Ad campaigns |

### 3.7 Automations

| Route | Purpose |
|---|---|
| `/automations` | Automation list + builder |
| `/automations/[id]` | Automation detail (tabs: Overview, Runs, Logs) |
| `/automations/runs` | All automation runs |

### 3.8 AI Agents

| Route | Purpose |
|---|---|
| `/agents` | Agent list |
| `/agents/[id]` | Agent detail (tabs: Overview, Runs, Memory, Tools) |
| `/agents/runs` | All agent runs |
| `/agents/tools` | Tool registry |

### 3.9 Integrations

| Route | Purpose |
|---|---|
| `/integrations` | Integration catalog + connected integrations |
| `/integrations/[provider]` | Integration detail (connection status, scopes, actions) |

### 3.10 Calendar

| Route | Purpose |
|---|---|
| `/calendar` | Unified calendar (month/week/day/agenda views) |

### 3.11 People

| Route | Purpose |
|---|---|
| `/people` | Workspace members |
| `/people/teams` | Teams within workspace |
| `/people/contacts` | External contacts |

### 3.12 Conversations

| Route | Purpose |
|---|---|
| `/conversations` | Threaded discussions list |
| `/conversations/[id]` | Conversation thread |

### 3.13 Analytics

| Route | Purpose |
|---|---|
| `/analytics` | Cross-module analytics overview |
| `/analytics/usage` | Usage metrics (credits, API calls, storage, AI tokens) |
| `/analytics/performance` | Performance metrics |
| `/analytics/audit` | Audit log analytics |

### 3.14 Search

| Route | Purpose |
|---|---|
| `/search` | Global search results (authorization-filtered) |
| `/search?q=[query]` | Search with query parameter |

---

## 4. Settings Routes (authenticated, OS shell)

### 4.1 User settings (global, not workspace-scoped)

| Route | Purpose |
|---|---|
| `/settings` | Settings home (redirects to `/settings/profile`) |
| `/settings/profile` | Profile (name, avatar, bio) |
| `/settings/security` | Password, MFA, sessions, active devices |
| `/settings/notifications` | Per-event notification preferences |
| `/settings/appearance` | Theme (light/dark/system) |
| `/settings/locale` | Language, region, timezone |
| `/settings/privacy` | Data export, data deletion, consent management |

### 4.2 Workspace settings (workspace-scoped)

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

---

## 5. Admin Routes (authenticated, admin role, OS shell)

| Route | Purpose |
|---|---|
| `/admin` | Admin dashboard (platform overview: users, workspaces, revenue) |
| `/admin/users` | User administration (suspend, delete, role management) |
| `/admin/users/[id]` | User detail |
| `/admin/workspaces` | Workspace administration |
| `/admin/workspaces/[id]` | Workspace detail |
| `/admin/billing` | Billing administration (subscriptions, invoices) |
| `/admin/system` | System health, observability, config |
| `/admin/audit` | Global audit log |
| `/admin/feedback` | User feedback management |

---

## 6. Developer Routes (authenticated for management, public for docs)

| Route | Purpose | Auth |
|---|---|---|
| `/developers` | Developer platform home | Public |
| `/developers/api-keys` | API credential management (create, revoke) | Yes |
| `/developers/docs` | API documentation (OpenAPI) | Public |
| `/developers/mcp` | MCP endpoint info + connection guide | Public |
| `/developers/webhooks` | Webhook management (endpoints, deliveries) | Yes |
| `/developers/usage` | API usage metrics (calls, credits, errors) | Yes |

---

## 7. API Routes

### 7.1 Public API v1 (`/api/v1/*`)

Authenticated via Bearer token (API key from `ApiCredential`). Authorized via scopes. Tenant-isolated (workspace resolved from key + `X-Workspace-Id` header).

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/workspaces` | `workspace:read` | List user's workspaces |
| GET | `/api/v1/workspaces/{id}` | `workspace:read` | Get workspace |
| GET | `/api/v1/projects` | `project:read` | List projects |
| POST | `/api/v1/projects` | `project:write` | Create project |
| GET | `/api/v1/projects/{id}` | `project:read` | Get project |
| PATCH | `/api/v1/projects/{id}` | `project:write` | Update project |
| DELETE | `/api/v1/projects/{id}` | `project:write` | Delete project |
| GET | `/api/v1/projects/{id}/tasks` | `task:read` | List tasks in project |
| POST | `/api/v1/projects/{id}/tasks` | `task:write` | Create task in project |
| GET | `/api/v1/tasks/{id}` | `task:read` | Get task |
| PATCH | `/api/v1/tasks/{id}` | `task:write` | Update task |
| DELETE | `/api/v1/tasks/{id}` | `task:write` | Delete task |
| GET | `/api/v1/documents` | `document:read` | List documents |
| POST | `/api/v1/documents` | `document:write` | Create document |
| GET | `/api/v1/documents/{id}` | `document:read` | Get document |
| PATCH | `/api/v1/documents/{id}` | `document:write` | Update document |
| GET | `/api/v1/files` | `file:read` | List files |
| POST | `/api/v1/files` | `file:write` | Upload file |
| GET | `/api/v1/files/{id}` | `file:read` | Get file metadata |
| GET | `/api/v1/files/{id}/content` | `file:read` | Download file (signed URL) |
| GET | `/api/v1/creative/generators` | `creative:read` | List available generators |
| POST | `/api/v1/creative/generators/{slug}` | `creative:write` | Run a generator |
| GET | `/api/v1/creative/creations/{id}` | `creative:read` | Get creation status |
| GET | `/api/v1/automations` | `automation:read` | List automations |
| POST | `/api/v1/automations` | `automation:write` | Create automation |
| POST | `/api/v1/automations/{id}/run` | `automation:write` | Trigger automation |
| GET | `/api/v1/agents` | `agent:read` | List agents |
| POST | `/api/v1/agents/{id}/run` | `agent:write` | Run an agent |
| GET | `/api/v1/integrations` | `integration:read` | List integrations |
| POST | `/api/v1/integrations/{provider}/connect` | `integration:write` | Initiate OAuth |
| GET | `/api/v1/webhooks` | `webhook:read` | List webhook endpoints |
| POST | `/api/v1/webhooks` | `webhook:write` | Register webhook |
| GET | `/api/v1/usage` | `usage:read` | Get usage metrics |
| GET | `/api/v1/audit` | `audit:read` | Get audit log |

### API conventions

| Convention | Implementation |
|---|---|
| Versioning | URL path (`/api/v1/`); 12-month minimum sunset window |
| Authentication | Bearer token (API key) |
| Authorization | Scopes per endpoint (`workspace:read`, `project:write`, etc.) |
| Tenant isolation | Workspace resolved from key + `X-Workspace-Id` header |
| Rate limiting | Per-key, via Cloudflare rate limiter binding (distributed) |
| Idempotency | `Idempotency-Key` header on POST/PUT/PATCH |
| Pagination | Cursor-based (`?cursor=...&limit=...`) |
| Errors | `{ error: { code, message, requestId, details? } }` |
| Request IDs | `X-Request-Id` generated per request, echoed in response + logs |
| OpenAPI | Auto-generated from route schemas; served at `/developers/docs` |

### 7.2 Internal API (`/api/internal/*`)

Authenticated via session (NextAuth JWT). Used by the Next.js frontend only. Not publicly documented.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/internal/auth/signup` | Create user account |
| POST | `/api/internal/auth/verify` | Verify email token |
| POST | `/api/internal/auth/reset-request` | Request password reset |
| POST | `/api/internal/auth/reset-confirm` | Confirm password reset |
| POST | `/api/internal/auth/logout` | Logout (revoke session) |
| GET | `/api/internal/me` | Get current user |
| PATCH | `/api/internal/me` | Update current user |
| GET | `/api/internal/workspaces` | List user's workspaces |
| POST | `/api/internal/workspaces` | Create workspace |
| GET | `/api/internal/search?q=...` | Global search (authorization-filtered) |
| GET | `/api/internal/notifications` | List notifications |
| POST | `/api/internal/notifications/[id]/read` | Mark notification read |
| POST | `/api/internal/notifications/read-all` | Mark all notifications read |

*(Additional internal endpoints mirror the public API v1 but use session auth instead of API key auth. The frontend calls internal endpoints; external clients call v1.)*

### 7.3 Auth API (`/api/auth/*`)

NextAuth v5 routes (session-based).

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth catch-all (signin, signout, callback, session) |

### 7.4 Webhook API (`/api/webhook/*`)

Inbound webhooks from external services. Authenticated via signature verification.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/webhook/dodo` | Dodo Payments webhook | Dodo signature |
| POST | `/api/webhook/integrations/[provider]` | Integration webhooks (e.g., OAuth callbacks) | Provider signature |

### 7.5 MCP endpoint

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/mcp` | MCP server (Streamable HTTP, 2026-07-28 spec) | OAuth 2.1 / Bearer token |

### 7.6 System API

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | Unauthenticated health probe | Public |
| GET | `/api/observability` | Metrics | Admin |
| GET | `/api/geo` | IP geolocation | Public |

---

## 8. Error Pages

| Route | Purpose | Shell? |
|---|---|---|
| `/404` | Not found | No (minimal layout) |
| `/500` | Internal server error | No (minimal layout) |
| `/403` | Forbidden (authenticated but no permission) | Yes (shell) |
| `/401` | Unauthorized (redirects to `/login`) | No |
| `/error` | Generic error catch-all | No (minimal layout) |
| `/offline` | Offline / service unavailable | No (minimal layout) |

### Error page design

- **404/500/offline:** Minimal layout (Lazynext wordmark + error message + home link). Neo-Brutalist style: large mono uppercase error code, ink illustration, action button.
- **403:** Rendered inside shell. Shows "You don't have permission to access this workspace resource" + link to dashboard.
- **401:** Redirects to `/login?callbackUrl=[original]`.

---

## 9. Legacy Route Redirects

All legacy routes return **301 permanent redirects** to their new locations.

### 9.1 Ad-creative routes → Creative Studio

| Legacy route | New route | Treatment |
|---|---|---|
| `/lazynext-studio` | `/creative/pipelines/lazynext-studio` | 301 redirect |
| `/ad-reference` | `/creative/pipelines/ad-reference` | 301 redirect |
| `/drama-studio` | `/creative/pipelines/drama-studio` | 301 redirect |
| `/ad-skit` | `/creative/pipelines/ad-skit` | 301 redirect |
| `/ugc-studio` | `/creative/pipelines/ugc-studio` | 301 redirect |
| `/{ad-creative-feature}` (178 routes) | `/creative/generators/[slug]` | 301 redirect |
| `/{creative-ad-feature}` (35 routes) | `/creative/generators/[slug]` | 301 redirect |

### 9.2 Platform routes → new locations

| Legacy route | New route | Treatment |
|---|---|---|
| `/` (4 featured apps) | `/` (new OS marketing) | Rewrite (not redirect) |
| `/dashboard` (193-app grid) | `/dashboard` (OS home) | Rewrite (not redirect) |
| `/settings` | `/settings` (user settings) | Keep (user settings stay) |
| `/teams` | `/workspaces/[id]/members` | 301 redirect |
| `/teams/[id]` | `/workspaces/[id]/members` | 301 redirect |
| `/teams/join` | `/workspaces/[id]/members` | 301 redirect |
| `/mcp-server` | `/developers/mcp` | 301 redirect |
| `/assets` | `/creative/assets` | 301 redirect |
| `/editor` | `/creative` (editor as sub-feature) | 301 redirect |
| `/ads` | `/creative/campaigns` | 301 redirect |
| `/performance` | `/analytics/performance` | 301 redirect |
| `/analytics-hub` | `/analytics` | 301 redirect |
| `/pipeline` | `/automations` | 301 redirect |
| `/workflow-builder` | `/automations` | 301 redirect |
| `/approvals` | `/creative/compliance` | 301 redirect |
| `/calendar` | `/calendar` | Keep (same path, rebuilt) |
| `/smart-calendar` | `/calendar` | 301 redirect |
| `/publish` | `/integrations` (publishing as integration) | 301 redirect |
| `/skills` | `/agents/tools` | 301 redirect |
| `/skill-chains` | `/agents` | 301 redirect |
| `/templates` | `/documents/templates` | 301 redirect |
| `/share/[token]` | `/share/[token]` | Keep (generalized sharing) |
| `/my-work` | `/dashboard/recent` | 301 redirect |
| `/my-work/[id]` | `/creative/assets/[id]` | 301 redirect |
| `/observability` | `/admin/system` | 301 redirect |
| `/media-service-boundary` | `/admin/system` | 301 redirect |
| `/ml-insights` | `/analytics` | 301 redirect |
| `/testing-lab` | `/admin/system` | 301 redirect |
| `/reset-password` | `/reset-password` | Keep |

### 9.3 Legacy API routes

Legacy `/api/*` routes (323 files) are gradually migrated:
- `/api/creative/*` (229) → consolidated under `/api/v1/creative/*` and `/api/internal/creative/*`
- `/api/ads/*` → `/api/v1/creative/campaigns/*`
- `/api/teams/*` → `/api/v1/workspaces/*/members`
- `/api/auth/*` → keep (NextAuth)
- `/api/admin/*` → `/api/internal/admin/*`
- `/api/webhook/dodo` → keep (Dodo webhook)
- `/api/checkout`, `/api/redeem` → `/api/internal/billing/*`

During migration, legacy routes remain functional with deprecation headers. After cutover, they return 410 Gone with a `Location` header pointing to the new endpoint.

---

## 10. Route Count Summary

| Category | Count (target) |
|---|---|
| Public (marketing + legal + support) | 14 |
| Auth | 4 |
| Application (modules) | ~45 |
| Settings (user + workspace) | ~15 |
| Admin | 9 |
| Developer | 6 |
| API v1 (public) | ~30 |
| API internal | ~15+ |
| Auth API | 1 (catch-all) |
| Webhook API | 2 |
| MCP | 1 |
| System API | 3 |
| Error pages | 6 |
| **Total page routes** | **~100** (down from 214) |
| **Total API routes** | **~70** (down from 323) |

### Reduction rationale

The route count drops significantly because:
1. **178 ad-creative routes consolidate** into `/creative/generators/[slug]` (1 dynamic route).
2. **35 `creative-ad-*` routes merge** into the same dynamic route.
3. **Duplicate/near-duplicate features merge** (variant-matrix variants, competitor variants, brand-voice variants, calendar variants, trend variants, fatigue variants).
4. **Internal API routes consolidate** under a unified service layer (one business-logic layer, not per-route duplication).

---

## 11. Route Design Principles

1. **OS shell wraps all authenticated routes.** Public area (marketing, legal, auth) is outside the shell.
2. **Module routes live under `/{module}/...`.** Clean, meaningful URLs.
3. **Developer platform lives under `/developers/...`.**
4. **Admin lives under `/admin/...`.**
5. **API lives under `/api/v1/...` (public) and `/api/internal/...` (app-internal).**
6. **MCP lives at `/mcp` (single endpoint per Streamable HTTP spec).**
7. **Meaningful URLs.** No route names based on obsolete experiments.
8. **301 redirects for all legacy URLs.** No silent 404s for previously live routes.
9. **Trailing slashes.** No trailing slashes (Next.js App Router default).
10. **Dynamic segments use `[id]` or `[slug]`.** `[id]` for entities (projects, tasks), `[slug]` for human-readable identifiers (pipelines, generators, providers).

---

*This route map is a living document. It should be updated as routes are implemented, merged, or deprecated.*
