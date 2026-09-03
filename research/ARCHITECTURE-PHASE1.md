# Lazynext — Phase 1 Target Architecture

**Date:** 2026-09-03
**Status:** Draft for approval (Plan mode — no code changes made)
**Depends on:** `DISCOVERY-REPORT-PHASE0.md`
**Spec basis:** MCP `2026-07-28` (read from modelcontextprotocol.io on 2026-09-03), Neo-Brutalist design principles (NN/G, neubrutalism.com, alexmayhew.dev)

---

## 1. Target Product Definition

### 1.1 Product concept

> **Lazynext is a unified operating system for people, teams, organizations, workflows, information, tools, applications, automation, AI, integrations, data, and digital work.**

The product is structured as a **platform OS** with a global shell and a set of **modules** (applications that run inside the OS). Each module is a first-class application with its own navigation, data, and actions, but all modules share the OS shell, identity layer, permission system, workspace context, search, command palette, and design system.

This is not a "dashboard with links." It is a coherent platform where:
- The **shell** provides global navigation, workspace switching, search, command palette, notifications, account, theme, locale, and session controls.
- **Modules** are the actual work surfaces (Creative Studio, Projects, Documents, Automations, AI Agents, Integrations, Admin, Developer Platform, etc.).
- A single **domain model** and **service layer** underpin all modules, the public API, and the MCP server — there is one business-logic layer, not three.

### 1.2 Module taxonomy (full vision)

The user chose the **full vision**. The following modules are justified by the OS concept. Each has a clear reason to exist. No module is added merely to lengthen a feature list.

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

### 1.3 Platform primitives (domain concepts)

These are the stable, reusable concepts that underpin all modules:

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
| **Asset** | A generalized creative/media asset (from old `Asset` model) |
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

## 2. Target Domain Model & Prisma Schema

### 2.1 Design principles

1. **Workspace is the tenancy boundary.** Every business-data model has a `workspaceId`. User-scoped data (preferences, sessions) does not.
2. **Soft-delete** (`deletedAt DateTime?`) on all business-critical models.
3. **Audit fields** (`createdAt`, `updatedAt`) on every model.
4. **Relations over scalar IDs.** No more `parentId`/`assetId` as raw strings — use Prisma relations.
5. **Enum-like fields use Prisma enums** where D1 supports them; otherwise constrained strings with validation.
6. **OAuth tokens encrypted** at the application layer (not plain strings).
7. **Role/permission stored in DB**, not env strings.
8. **Cascade policy:** User deletion → `Restrict` for audit data, `SetNull` for ownership transfer, `Cascade` only for truly owned ephemeral data.

### 2.2 Schema overview (key models)

```prisma
// ── Identity ──
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  name          String?
  image         String?
  password      String?  // bcrypt hash
  locale        String   @default("en")
  theme         String   @default("system") // light|dark|system
  status        String   @default("active") // active|suspended|deleted
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  accounts      Account[]
  sessions      Session[]
  memberships   Membership[]
  apiCredentials ApiCredential[]
  auditEvents   AuditEvent[]
  notifications Notification[]
}

model Account { /* NextAuth OAuth — add @@index([userId]) */ }
model Session { /* NextAuth session — add @@index([userId]) */ }
model VerificationToken {
  // ADD: purpose String  // "email_verification" | "password_reset"
}

// ── Tenancy ──
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  plan      String   @default("free") // free|pro|team|enterprise
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  workspaces Workspace[]
}

model Workspace {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name            String
  slug            String   @unique
  defaultLocale   String   @default("en")
  timezone        String   @default("UTC")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  memberships     Membership[]
  teams           Team[]
  projects        Project[]
  documents       Document[]
  files           File[]
  assets          Asset[]
  conversations   Conversation[]
  integrations    Integration[]
  automations     Automation[]
  agents          Agent[]
  webhookEndpoints WebhookEndpoint[]
  scheduledJobs   ScheduledJob[]
  // ... all business data
}

model Membership {
  id           String   @id @default(cuid())
  userId       String
  workspaceId  String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  role         String   @default("member") // owner|admin|member|viewer|guest
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@unique([userId, workspaceId])
  @@index([workspaceId])
}

model Team {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  members     TeamMember[]
  @@index([workspaceId])
}

// ── Work objects ──
model Project {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  description String?
  status      String   @default("active")
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  tasks       Task[]
  documents   Document[]
  files       File[]
  @@index([workspaceId])
  @@index([workspaceId, status])
}

model Task {
  id          String   @id @default(cuid())
  projectId   String
  assigneeId  String?
  title       String
  status      String   @default("todo") // todo|in_progress|done|cancelled
  priority    String   @default("medium")
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  @@index([projectId])
  @@index([assigneeId])
}

model Document {
  id          String   @id @default(cuid())
  workspaceId String
  projectId   String?
  title       String
  content     String   // rich text / markdown
  version     Int      @default(1)
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  @@index([workspaceId])
  @@index([projectId])
}

model File {
  id          String   @id @default(cuid())
  workspaceId String
  projectId   String?
  name        String
  mimeType    String
  size        Int
  storageKey  String   // R2 key
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  @@index([workspaceId])
}

// ── Creative Studio (consolidated) ──
model Asset {
  id          String   @id @default(cuid())
  workspaceId String
  type        String   // image|video|audio|script|brief|brand_profile
  parentId    String?  // self-relation for lineage
  parent      Asset?   @relation("AssetLineage", fields: [parentId], references: [id])
  children    Asset[]  @relation("AssetLineage")
  // ... creative-specific fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  @@index([workspaceId])
  @@index([parentId])
}

model Creation {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String   // initiated by
  templateId  String?  // relation to CreativeTemplate
  status      String   @default("pending")
  // ... generation fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  @@index([workspaceId])
  @@index([userId])
  @@index([workspaceId, status])
}

// ── AI / Agents ──
model Agent {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  modelProvider String
  modelName   String
  instructions String
  toolIds     String[] // tools this agent can call
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([workspaceId])
}

model AgentRun {
  id          String   @id @default(cuid())
  agentId     String
  workspaceId String
  status      String   // running|completed|failed|cancelled
  input       String
  output      String?
  tokensUsed  Int      @default(0)
  startedAt   DateTime @default(now())
  completedAt DateTime?
  @@index([agentId])
  @@index([workspaceId, status])
}

model Tool {
  id          String   @id @default(cuid())
  workspaceId String?  // null = global/built-in
  name        String
  description String
  inputSchema String   // JSON schema
  handler     String   // service method reference
  @@index([workspaceId])
}

// ── Integrations ──
model Integration {
  id          String   @id @default(cuid())
  workspaceId String
  provider    String   // google|meta|tiktok|linkedin|github|slack|...
  type        String   // oauth|api_key
  status      String   @default("active") // active|expired|revoked|error
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  connections Connection[]
  @@index([workspaceId])
  @@unique([workspaceId, provider])
}

model Connection {
  id            String   @id @default(cuid())
  integrationId String
  accessToken   String   // encrypted at app layer
  refreshToken  String?  // encrypted
  expiresAt     DateTime?
  scopes        String[]
  @@index([integrationId])
}

// ── Automations ──
model Automation {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  trigger     String   // event type or cron expression
  enabled     Boolean  @default(true)
  definition  String   // JSON: steps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  runs        AutomationRun[]
  @@index([workspaceId])
}

model AutomationRun {
  id          String   @id @default(cuid())
  automationId String
  status      String   // pending|running|completed|failed
  startedAt   DateTime @default(now())
  completedAt DateTime?
  @@index([automationId])
}

// ── Developer Platform ──
model ApiCredential {
  id          String   @id @default(cuid())
  userId      String
  name        String
  keyId       String   @unique // public key id
  keyHash     String   // hashed secret
  scopes      String[]
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
  @@index([userId])
}

model WebhookEndpoint {
  id          String   @id @default(cuid())
  workspaceId String
  url         String
  events      String[]
  secret      String   // HMAC signing secret
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([workspaceId])
}

model WebhookDelivery {
  id          String   @id @default(cuid())
  endpointId  String
  event       String
  payload     String
  status      String   // pending|delivered|failed
  attempts    Int      @default(0)
  createdAt   DateTime @default(now())
  @@index([endpointId])
}

// ── Billing ──
model Subscription {
  id          String   @id @default(cuid())
  workspaceId String
  plan        String   // free|pro|team|enterprise
  status      String   // active|past_due|canceled|trialing
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([workspaceId])
}

model Invoice {
  id          String   @id @default(cuid())
  workspaceId String
  amount      Int      // cents
  currency    String   @default("USD")
  status      String   // paid|open|void|uncollectible
  providerId  String?  // Dodo invoice id
  createdAt   DateTime @default(now())
  @@index([workspaceId])
}

model UsageRecord {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  type        String   // ai_generation|api_call|storage|credits
  amount      Int
  ref         String?
  createdAt   DateTime @default(now())
  @@index([workspaceId, type])
  @@index([userId])
}

// ── Audit & Events ──
model AuditEvent {
  id          String   @id @default(cuid())
  userId      String?
  workspaceId String?
  action      String   // auth.login, user.create, role.update, ...
  targetType  String?
  targetId    String?
  metadata    String?  // JSON
  ip          String?
  userAgent   String?
  createdAt   DateTime @default(now())
  @@index([userId])
  @@index([workspaceId])
  @@index([action])
}

model Notification {
  id          String   @id @default(cuid())
  userId      String
  type        String
  title       String
  body        String?
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
  @@index([userId, read])
}

model ScheduledJob {
  id          String   @id @default(cuid())
  workspaceId String
  type        String
  payload     String   // JSON
  scheduledAt DateTime
  status      String   @default("pending") // pending|running|completed|failed
  createdAt   DateTime @default(now())
  @@index([workspaceId, status])
  @@index([scheduledAt])
}
```

### 2.3 Migration notes (old → new)

| Old model | New model | Treatment |
|---|---|---|
| `User` | `User` + `Membership` | Add `status`, `deletedAt`, `updatedAt`; split workspace membership out |
| `Team` | `Organization` + `Workspace` + `Team` | Promote to proper tenancy; `ownerId` becomes relation |
| `Creation` | `Creation` (workspace-scoped) | Add `workspaceId`, `deletedAt`; `templateId` becomes relation |
| `Asset` | `Asset` (workspace-scoped) | Add `workspaceId`, self-relation for `parentId` |
| `CreditLedger` | `UsageRecord` + `Subscription` + `Invoice` | Generalize billing |
| `PlatformConnection` | `Integration` + `Connection` | Encrypt tokens; workspace-scoped |
| `ScheduledPost` | `ScheduledJob` | Generalize |
| `WorkflowRun/Step` | `Automation` + `AutomationRun` | Generalize; add proper FK |
| `MetaSafetyAudit/Approval` etc. | `AuditEvent` + module-specific | Add `workspaceId`, `userId` |
| `Hook` | `KnowledgeObject` (module-specific) | Workspace-scoped |
| `CreativeComment` | `Conversation` + messages | Generalize; proper relations |
| (none) | `ApiCredential`, `WebhookDelivery` | New for developer platform |

---

## 3. Target Route Map

### 3.1 Design principles

- **OS shell** wraps all authenticated routes.
- **Public area** (marketing, legal, auth) is outside the shell.
- **Module routes** live under `/{module}/...`.
- **Developer platform** lives under `/developers/...`.
- **Admin** lives under `/admin/...`.
- **API** lives under `/api/v1/...` (public) and `/api/internal/...` (app-internal).
- **MCP** lives at `/mcp` (single endpoint per Streamable HTTP spec).
- Meaningful URLs; no route names based on obsolete experiments.

### 3.2 Public area (no shell)

| Route | Purpose | Auth |
|---|---|---|
| `/` | Marketing landing page (new OS positioning) | Public |
| `/login` | Login page (email + Google) | Public |
| `/signup` | Signup page | Public |
| `/reset-password` | Password reset UI | Public |
| `/verify-email` | Email verification landing | Public |
| `/pricing` | Plans + credit packs | Public |
| `/terms` | Terms of Service | Public |
| `/privacy` | Privacy Policy | Public |
| `/cookies` | Cookie Policy | Public |
| `/acceptable-use` | Acceptable Use Policy | Public |
| `/ai-policy` | AI/Generative AI Policy | Public |
| `/dpa` | Data Processing Agreement | Public |
| `/subprocessors` | Subprocessor disclosure | Public |
| `/security` | Security documentation | Public |
| `/data-request` | Privacy rights request form | Public |
| `/status` | System status page | Public |

### 3.3 Authenticated OS shell

All routes below render inside the global shell (nav, workspace selector, search, command palette, notifications, account menu).

| Route | Module | Purpose |
|---|---|---|
| `/dashboard` | Dashboard | Workspace home |
| `/projects` | Projects | Project list |
| `/projects/[id]` | Projects | Project detail (tasks, docs, files) |
| `/tasks` | Tasks | Cross-project task view |
| `/documents` | Documents | Document/knowledge list |
| `/documents/[id]` | Documents | Document editor |
| `/files` | Files | File library |
| `/creative` | Creative Studio | Studio home (consolidated 178 routes) |
| `/creative/pipelines` | Creative Studio | 4 flagship pipelines |
| `/creative/generators` | Creative Studio | All generators (searchable, categorized) |
| `/creative/brand` | Creative Studio | Brand kits, profiles, voice |
| `/creative/performance` | Creative Studio | Performance analytics |
| `/creative/compliance` | Creative Studio | Safety/approval workflows |
| `/creative/assets` | Creative Studio | Creative asset library |
| `/creative/campaigns` | Creative Studio | Ad campaigns |
| `/automations` | Automations | Automation list + builder |
| `/automations/[id]` | Automations | Automation detail/runs |
| `/agents` | AI Agents | Agent list |
| `/agents/[id]` | AI Agents | Agent detail + runs |
| `/integrations` | Integrations | Integration catalog + connections |
| `/calendar` | Calendar | Unified calendar |
| `/people` | People | Members + contacts |
| `/conversations` | Conversations | Threaded discussions |
| `/analytics` | Analytics | Cross-module analytics |
| `/search` | Search | Global search results |
| `/settings` | Settings | User preferences |
| `/settings/profile` | Settings | Profile |
| `/settings/security` | Settings | Password, MFA, sessions |
| `/settings/notifications` | Settings | Notification preferences |
| `/settings/locale` | Settings | Language, region, timezone |
| `/settings/appearance` | Settings | Theme |
| `/workspaces` | Settings | Workspace list + switcher |
| `/workspaces/[id]/settings` | Settings | Workspace settings |
| `/workspaces/[id]/members` | Settings | Members + roles |
| `/workspaces/[id]/billing` | Settings | Subscription, invoices, usage |
| `/workspaces/[id]/integrations` | Settings | Workspace integrations |
| `/workspaces/[id]/webhooks` | Settings | Webhook endpoints |
| `/workspaces/[id]/audit-log` | Settings | Audit log |
| `/admin` | Admin | Admin dashboard |
| `/admin/users` | Admin | User administration |
| `/admin/workspaces` | Admin | Workspace administration |
| `/admin/billing` | Admin | Billing administration |
| `/admin/system` | Admin | System health |
| `/admin/audit` | Admin | Global audit log |
| `/developers` | Developer Platform | Developer home |
| `/developers/api-keys` | Developer Platform | API credential management |
| `/developers/docs` | Developer Platform | API documentation |
| `/developers/mcp` | Developer Platform | MCP endpoint info + connection guide |
| `/developers/webhooks` | Developer Platform | Webhook management |
| `/developers/usage` | Developer Platform | API usage metrics |

### 3.4 API routes

| Prefix | Purpose | Auth |
|---|---|---|
| `/api/v1/*` | Public versioned API | API key + scopes |
| `/api/internal/*` | App-internal API (used by frontend) | Session |
| `/api/auth/*` | NextAuth + auth flows | Mixed |
| `/api/webhook/*` | Inbound webhooks (Dodo, integrations) | Signature |
| `/mcp` | MCP server endpoint (Streamable HTTP) | OAuth 2.1 / Bearer |

### 3.5 Old → new route migration

| Old route | New route | Treatment |
|---|---|---|
| `/` (4 featured apps) | `/` (new OS marketing) | Rewrite |
| `/dashboard` (193-app grid) | `/dashboard` (OS home) | Rewrite |
| `/lazynext-studio`, `/ad-reference`, `/drama-studio`, `/ad-skit` | `/creative/pipelines/[slug]` | Consolidate |
| 178 `/{ad-creative-feature}` routes | `/creative/generators/[slug]` | Consolidate into Creative Studio |
| `/settings` | `/settings` + `/workspaces/[id]/settings` | Split user vs workspace settings |
| `/admin` | `/admin/*` | Expand |
| `/mcp-server` (page) | `/developers/mcp` | Move to developer platform |
| `/terms`, `/privacy` | Keep + add `/cookies`, `/acceptable-use`, `/ai-policy`, `/dpa`, `/subprocessors`, `/security`, `/data-request` | Expand legal |
| `/teams/*` | `/workspaces/[id]/members` | Merge into workspace settings |

---

## 4. Public API v1 + Gateway Architecture

### 4.1 Principles

- **Versioned:** `/api/v1/...`. Version in URL path. Deprecation policy: 12-month minimum sunset window.
- **Authenticated:** Bearer token (API key from `ApiCredential`). Keys are hashed, revocable, expirable.
- **Authorized:** Scopes (`workspace:read`, `project:write`, `file:delete`, etc.). Per-endpoint scope checks.
- **Tenant-isolated:** Every request resolves a workspace context from the key + `X-Workspace-Id` header.
- **Rate-limited:** Per-key rate limits at the gateway (Cloudflare rate limiter binding, not in-memory).
- **Idempotency:** `Idempotency-Key` header on POST/PUT/PATCH for mutation endpoints.
- **Pagination:** Cursor-based (`?cursor=...&limit=...`).
- **Consistent errors:** `{ error: { code, message, requestId, details? } }` with stable codes.
- **Request IDs:** `X-Request-Id` generated per request, echoed in response + logs.
- **OpenAPI:** Auto-generated from route schemas; served at `/developers/docs`.

### 4.2 Gateway layer

```
Client → /api/v1/*
  → Gateway middleware (src/proxy.ts or dedicated)
    → Authenticate (validate API key, resolve user + workspace)
    → Authorize (check scopes for endpoint)
    → Rate limit (Cloudflare rate limiter binding)
    → Validate request (schema validation)
    → Route to handler
      → Handler calls Application Service
        → Service calls Domain Logic + Persistence
      → Handler returns result
    → Gateway wraps response (request ID, error format)
```

### 4.3 Endpoint inventory (v1, initial)

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/workspaces` | `workspace:read` | List user's workspaces |
| GET | `/api/v1/workspaces/{id}` | `workspace:read` | Get workspace |
| GET | `/api/v1/projects` | `project:read` | List projects |
| POST | `/api/v1/projects` | `project:write` | Create project |
| GET | `/api/v1/projects/{id}` | `project:read` | Get project |
| PATCH | `/api/v1/projects/{id}` | `project:write` | Update project |
| DELETE | `/api/v1/projects/{id}` | `project:write` | Delete project |
| GET | `/api/v1/projects/{id}/tasks` | `task:read` | List tasks |
| POST | `/api/v1/projects/{id}/tasks` | `task:write` | Create task |
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

### 4.4 One business-logic layer

```
UI (Next.js pages)
  → calls /api/internal/* (session auth)
API Gateway (/api/v1/*) (API key auth)
MCP Adapter (/mcp) (OAuth/Bearer)
  → all three call the SAME Application Services (src/lib/services/*)
    → Domain Logic + Prisma + Providers
```

No duplicate business logic. The Application Service layer (`src/lib/services/`) is the single source of truth for all domain operations. UI routes, public API handlers, and MCP tools are thin adapters that call services.

---

## 5. MCP Server Architecture (2026-07-28 Conformance)

### 5.1 Spec research summary (read 2026-09-03)

The `2026-07-28` revision is a **stable release** with these breaking changes from the current `2024-11-05` implementation:

1. **Stateless protocol:** No `initialize`/`initialized` handshake. No `Mcp-Session-Id` header. Every request carries protocol version + client capabilities in `_meta`.
2. **`server/discover` RPC:** Replaces `initialize`. Servers MUST implement this to advertise supported versions, capabilities, and identity. Clients MAY call it before any other request.
3. **Per-request metadata:** `_meta` carries `io.modelcontextprotocol/protocolVersion` (required), `io.modelcontextprotocol/clientInfo`, `io.modelcontextprotocol/clientCapabilities` (required), `io.modelcontextprotocol/logLevel`.
4. **HTTP headers:** `MCP-Protocol-Version` (must match `_meta`), `Mcp-Method`, `Mcp-Name` (for routing/authorization by gateways).
5. **Streamable HTTP transport:** Single POST endpoint. No GET stream. No SSE resumability (`Last-Event-ID` removed). Server responds with `application/json` or `text/event-stream`.
6. **MRTR (Multi Round-Trip Requests):** Server returns `InputRequiredResult` (`resultType: "input_required"`) with `inputRequests`. Client retries with `inputResponses`. Replaces server-initiated requests (sampling/elicitation/roots).
7. **`resultType` field required** on all results: `"complete"` or `"input_required"`.
8. **`subscriptions/listen`:** Replaces `resources/subscribe`/`unsubscribe` + GET stream. Long-lived POST-response SSE stream for change notifications.
9. **Removed:** `ping`, `logging/setLevel`, `notifications/roots/list_changed`. Log level is per-request via `_meta`.
10. **Tasks extension:** `io.modelcontextprotocol/tasks` — polling via `tasks/get`, `tasks/update` for client input.
11. **Authorization:** OAuth 2.1 + Protected Resource Metadata (RFC 9728) + Authorization Server Metadata (RFC 8414). Dynamic Client Registration deprecated; Client ID Metadata Documents preferred. RFC 9207 `iss` validation required.
12. **Cache hints:** `ttlMs` + `cacheScope` on list results (`tools/list`, `resources/list`, `prompts/list`).
13. **Deprecated:** Roots, Sampling, Logging features (still functional during deprecation window).
14. **Error codes:** `-32020` HeaderMismatch, `-32021` MissingRequiredClientCapability, `-32022` UnsupportedProtocolVersion.

### 5.2 Lazynext MCP Server design

**Endpoint:** `https://lazynext.com/mcp` (single POST endpoint, Streamable HTTP)

**Protocol version:** `2026-07-28` (modern; no legacy `initialize` support)

**Transport:** Streamable HTTP only (no stdio — this is a remote server)

**Authorization:** OAuth 2.1 resource server. Lazynext acts as resource server; the Lazynext auth system acts as authorization server. Protected Resource Metadata at `/.well-known/oauth-protected-resource`. API keys (Bearer tokens) also accepted for non-interactive clients.

**Capabilities advertised:**
- `tools` (with `listChanged: true`)
- `resources` (with `listChanged: true`)
- `prompts`
- `extensions: ["io.modelcontextprotocol/tasks"]`

**RPCs implemented:**

| RPC | Purpose |
|---|---|
| `server/discover` | Advertise versions, capabilities, server info |
| `tools/list` | List all Lazynext tools (with `ttlMs`, `cacheScope`, deterministic order) |
| `tools/call` | Invoke a tool (calls Application Service) |
| `resources/list` | List Lazynext resources (projects, tasks, documents, files, etc.) |
| `resources/read` | Read a resource by URI |
| `resources/templates/list` | List resource URI templates |
| `prompts/list` | List prompts (predefined workflows) |
| `prompts/get` | Get a prompt |
| `subscriptions/listen` | Long-lived SSE stream for change notifications |
| `tasks/get` | Poll a long-running task |
| `tasks/update` | Client provides input to a task |

**Tools exposed (wrapping Application Services):**

| Tool | Service | Scope |
|---|---|---|
| `project.create` | `ProjectService.create` | `project:write` |
| `project.list` | `ProjectService.list` | `project:read` |
| `task.create` | `TaskService.create` | `task:write` |
| `task.list` | `TaskService.list` | `task:read` |
| `task.update` | `TaskService.update` | `task:write` |
| `document.create` | `DocumentService.create` | `document:write` |
| `document.read` | `DocumentService.read` | `document:read` |
| `document.search` | `DocumentService.search` | `document:read` |
| `file.upload` | `FileService.upload` | `file:write` |
| `file.list` | `FileService.list` | `file:read` |
| `creative.generate` | `CreativeService.generate` | `creative:write` |
| `creative.list_generators` | `CreativeService.listGenerators` | `creative:read` |
| `automation.run` | `AutomationService.run` | `automation:write` |
| `automation.list` | `AutomationService.list` | `automation:read` |
| `agent.run` | `AgentService.run` | `agent:write` |
| `agent.list` | `AgentService.list` | `agent:read` |
| `integration.list` | `IntegrationService.list` | `integration:read` |
| `search.global` | `SearchService.search` | (various) |

**Architecture:**

```
MCP Client (Claude, Cursor, etc.)
  → POST /mcp
    → MCP Gateway middleware
      → Validate MCP-Protocol-Version header
      → Authenticate (Bearer token / OAuth)
      → Authorize (check scope for Mcp-Method + Mcp-Name)
      → Rate limit
      → Route to MCP handler
        → MCP handler parses JSON-RPC request
        → Calls Application Service (SAME layer as UI + API)
        → Returns result with resultType
    → Gateway wraps response (headers, SSE if streaming)
```

**Key conformance requirements:**
- Validate `Origin` header on all connections (DNS rebinding protection).
- `MCP-Protocol-Version` header must match `_meta.io.modelcontextprotocol/protocolVersion` or return 400.
- Return `UnsupportedProtocolVersionError` (`-32022`) for unknown versions.
- `tools/list` returns deterministic order with `ttlMs` + `cacheScope`.
- Long-running operations use Tasks extension (`tasks/get` polling) or MRTR (`input_required`).
- `subscriptions/listen` for change notifications (SSE stream with keep-alive comments).
- `X-Accel-Buffering: no` header on SSE responses.
- No `initialize`, no `Mcp-Session-Id`, no GET stream, no `Last-Event-ID`.

---

## 6. Threat Model

### 6.1 Assets

| Asset | Classification | Protection |
|---|---|---|
| User credentials (passwords) | Highly sensitive | bcrypt hash; never logged |
| OAuth tokens | Highly sensitive | Encrypted at rest; never exposed client-side |
| API keys | Sensitive | Hashed; revocable; never displayed after creation |
| Session JWTs | Sensitive | httpOnly, secure, SameSite cookies; server-side revocation |
| PII (email, name) | Confidential | Access-controlled; minimized; retention policy |
| Creative content | Confidential | Workspace-scoped; authorization on every access |
| Payment data | N/A (Dodo handles) | No card storage; webhook signature verification |
| Audit logs | Confidential | Tamper-resistant (append-only); access-controlled |

### 6.2 Threats & mitigations

| Threat | Vector | Mitigation |
|---|---|---|
| **IDOR/BOLA** | Object ID manipulation | Every query filtered by `workspaceId` + authorization check; centralized `requireAuth()` + `requireWorkspace()` + `requirePermission()` helpers |
| **Tenant escape** | Cross-workspace access | Workspace context resolved server-side from auth, never from client input; every DB query includes `workspaceId` |
| **Privilege escalation** | Role manipulation | Roles in DB with server-side enforcement; admin actions require `role: admin` check in service layer, not just UI |
| **Auth bypass** | Missing `auth()` call | Centralized auth wrapper; lint rule forbidding route handlers without `requireAuth()` |
| **Session theft** | Stolen JWT | Server-side session revocation (token version in DB); short-lived refresh tokens; MFA for sensitive actions |
| **CSRF** | Cross-site POST | SameSite cookies + CSRF tokens for state-changing mutations |
| **XSS** | Unescaped content | React auto-escaping; CSP with nonces (remove `unsafe-inline`); sanitize user-generated rich text |
| **SSRF** | Webhook URL / outbound fetch | DNS resolution + IP re-validation; block private/metadata IPs; allowlist for outbound |
| **Webhook forgery** | Fake webhook POST | HMAC signature verification (Dodo SDK + user webhooks) |
| **Rate limit bypass** | Distributed requests | Cloudflare rate limiter binding (distributed, not in-memory) |
| **Brute force** | Login attempts | Distributed lockout (Durable Object or D1-backed); CAPTCHA (Turnstile) on login after risk |
| **Account enumeration** | Signup/reset responses | Constant-time responses; generic error messages |
| **Mass assignment** | Extra body fields | Explicit field allowlists per endpoint; schema validation |
| **Open redirect** | Redirect params | Allowlist of redirect targets |
| **File upload abuse** | Malicious files | MIME + magic byte + extension validation; size limits; filename normalization; isolated processing; virus scan strategy |
| **Secret leakage** | Source maps, debug endpoints, logs | `productionSourceMap: false`; no debug routes in prod; structured logger with redaction |
| **Supply chain** | Vulnerable deps | `npm audit` in CI; pin versions; minimum-release-age policy; lockfile integrity |
| **Injection (SQL/NoSQL)** | Prisma query input | Prisma parameterized queries; no raw SQL without validation |
| **Replay attacks** | Webhook/event replay | Nonce/timestamp validation; idempotency keys |

### 6.3 Security architecture changes from current

| Current | Target |
|---|---|
| No middleware auth | Centralized `requireAuth()` + `requireWorkspace()` + `requirePermission()` in a shared handler wrapper |
| In-memory rate limiting | Cloudflare rate limiter binding (distributed) |
| In-memory account lockout | D1-backed or Durable Object lockout (distributed) |
| JWT not revocable | Token version in DB; session revocation |
| No MFA | TOTP-based MFA for credentials users; required for admin |
| Email verification not enforced | Required before credit spend / workspace creation |
| Admin = env email | Admin role in DB; admin audit trail |
| OAuth tokens plain strings | Encrypted at app layer |
| No CSRF tokens | CSRF tokens for state-changing mutations |
| Permissive CSP (`unsafe-inline`) | CSP with nonces |
| No `productionSourceMap: false` | Explicit `false` + build-time map stripping |
| No CAPTCHA | Cloudflare Turnstile on signup, login (risk-based), password reset |
| No SAST/secret-scan in CI | Add to CI pipeline |

---

## 7. Neo-Brutalist Design System Spec

### 7.1 Design philosophy

> **Explicitness over subtlety. Personality over invisibility. Memorable structure over perfect polish.**

The Lazynext Neo-Brutalist system is deliberate, not careless. It uses brutalist elements (hard shadows, thick borders) with thoughtful typography, intentional color, and careful usability. It is **not** raw/ugly brutalism — it is a productized, commercially usable design grammar.

### 7.2 Color tokens

**Light theme:**
| Token | Value | Purpose |
|---|---|---|
| `--canvas` | `#f4f1ea` | Page background (warm paper) |
| `--ink` | `#0a0a0a` | Primary text, borders (pure black ink) |
| `--surface` | `#ffffff` | Card/panel background |
| `--surface-alt` | `#f0ede5` | Secondary surface |
| `--accent` | `#ff2d2d` | Signal accent (hot red — used sparingly) |
| `--accent-secondary` | `#0066ff` | Secondary accent (electric blue) |
| `--success` | `#0a7c2e` | Success state |
| `--warning` | `#b88600` | Warning state |
| `--danger` | `#c20a0a` | Error/destructive state |
| `--muted` | `#6b6b6b` | Secondary text |

**Dark theme:**
| Token | Value | Purpose |
|---|---|---|
| `--canvas` | `#0a0a0a` | Page background |
| `--ink` | `#f4f1ea` | Primary text, borders (inverted) |
| `--surface` | `#161616` | Card/panel background |
| `--surface-alt` | `#1e1e1e` | Secondary surface |
| `--accent` | `#ff2d2d` | Signal accent (same) |
| `--accent-secondary` | `#3a8eff` | Secondary accent (brighter for dark) |
| `--success` | `#22c55e` | Success state (brighter) |
| `--warning` | `#eab308` | Warning state (brighter) |
| `--danger` | `#ef4444` | Error state (brighter) |
| `--muted` | `#999999` | Secondary text |

**System theme:** Default. Detects OS preference via `prefers-color-scheme`. No flash (inline pre-hydration script sets `data-theme` before render — reuse existing architecture).

### 7.3 Typography

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `"Archivo Black", "Inter", system-ui` | Headings, hero text |
| `--font-sans` | `"Inter", system-ui, -apple-system, sans-serif` | Body text |
| `--font-mono` | `"JetBrains Mono", "Space Mono", ui-monospace, monospace` | Labels, metadata, code, technical elements |

**Type scale (modular, 1.25 ratio):**
| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `--text-xs` | 12px | 400 | 1.4 | Mono labels, metadata |
| `--text-sm` | 14px | 400 | 1.5 | Body small, captions |
| `--text-base` | 16px | 400 | 1.6 | Body |
| `--text-lg` | 18px | 600 | 1.5 | Subheadings |
| `--text-xl` | 20px | 700 | 1.4 | Section headings |
| `--text-2xl` | 24px | 700 | 1.3 | Page headings |
| `--text-3xl` | 30px | 800 | 1.2 | Hero heading |
| `--text-4xl` | 36px | 800 | 1.1 | Display heading |
| `--text-5xl` | 48px | 900 | 1.05 | Marketing display |

**Rules:**
- Headings: uppercase, tight tracking (`letter-spacing: -0.02em`), heavy weights.
- Mono labels: uppercase, `letter-spacing: 0.05em`, `--text-xs`.
- Body: clean sans-serif, comfortable line height.
- No gradients on text. No gradient text fills.

### 7.4 Borders & shadows

| Token | Value | Usage |
|---|---|---|
| `--border-width` | `2px` | Standard border |
| `--border-width-thick` | `3px` | Emphasized border |
| `--border-color` | `var(--ink)` | All borders use ink color |
| `--shadow-hard` | `4px 4px 0 0 var(--ink)` | Standard hard offset shadow |
| `--shadow-hard-lg` | `6px 6px 0 0 var(--ink)` | Large hard shadow (hover/active) |
| `--shadow-hard-sm` | `2px 2px 0 0 var(--ink)` | Small hard shadow |
| `--shadow-none` | `none` | No shadow |

**Rules:**
- **No blur on shadows.** Shadows are hard offset (`0 blur`).
- **No soft shadows.** No `box-shadow` with blur radius.
- **No gradients.** Flat colors only.
- **No glassmorphism.** No `backdrop-filter`, no transparency on surfaces.
- Borders are structural elements, not subtle separators.

### 7.5 Corner radii

| Token | Value | Usage |
|---|---|---|
| `--radius-none` | `0` | Default — square corners |
| `--radius-sm` | `2px` | Subtle rounding (inputs) |
| `--radius-md` | `4px` | Buttons, small cards |
| `--radius-pill` | `9999px` | Pills, badges, tags |

**Rule:** Default to square corners. Use `--radius-md` sparingly for interactive elements. Never use large radii (no `16px`+ rounding).

### 7.6 Spacing

4px base grid:
| Token | Value |
|---|---|
| `--space-0` | 0 |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### 7.7 Component primitives

Each primitive supports: keyboard, themes, localization, accessibility, responsive.

| Primitive | Spec |
|---|---|
| **Button** | `--radius-md`, `2px` border, hard shadow on hover (`--shadow-hard` → `--shadow-hard-lg`), pressed state (shadow → `--shadow-none` + translate 2px), 3 variants (primary=accent bg, secondary=surface, danger=danger bg), disabled state (muted, no shadow) |
| **Input** | `2px` border, `--radius-sm`, transparent bg, focus state = `--border-width-thick` + accent border, no glow |
| **Card** | `--surface` bg, `2px` border, `--shadow-hard`, `--radius-md` |
| **Dialog** | Overlay = solid `--ink` at 80% opacity (no blur), dialog = `--surface` bg, `3px` border, `--shadow-hard-lg`, `--radius-md`, focus trap, ESC to close |
| **Toast** | `--surface` bg, `2px` border, `--shadow-hard`, `--radius-md`, top-right stack |
| **Badge/Pill** | `--radius-pill`, `2px` border, flat bg, mono uppercase label |
| **Table** | `2px` border between rows, no zebra striping, mono headers uppercase |
| **Nav** | Boxed items with `2px` border, active item = accent bg + ink text |
| **Tooltip** | `--ink` bg, `--canvas` text, `--radius-sm`, `2px` border, no shadow |
| **Tabs** | Boxed tabs with `2px` border, active = accent underline (3px) |
| **Switch** | Square toggle, `2px` border, on = accent bg, off = surface |
| **Checkbox** | Square, `2px` border, checked = accent bg + ink checkmark |
| **Menu/Dropdown** | `--surface` bg, `2px` border, `--shadow-hard`, `--radius-md` |
| **Command palette** | Dialog-style, mono search input, keyboard navigable results |
| **Skeleton** | `--surface-alt` bg, no shimmer animation (respect reduced motion) |
| **Empty state** | Large mono uppercase label, ink illustration (geometric), action button |

### 7.8 Motion

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | `100ms` | Hover, focus |
| `--duration-normal` | `200ms` | Dialog open, tab switch |
| `--easing` | `cubic-bezier(0, 0, 0.2, 1)` | Standard |

**Rules:**
- Motion is restrained and functional.
- Button press: `transform: translate(2px, 2px)` + shadow removal, `--duration-fast`.
- Dialog: fade + slight translate, `--duration-normal`.
- No parallax. No float. No shimmer (unless reduced-motion is not requested).
- **`prefers-reduced-motion: reduce`** → all transitions set to `0ms`; no transforms.

### 7.9 Grid & layout

- 12-column grid on desktop, fluid down to single column on mobile.
- `--breakpoint-xs: 400px` (keep from current).
- Standard breakpoints: `xs: 400px`, `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`.
- Max content width: `1200px` for app, `800px` for marketing prose.
- Visible structure: borders define sections, not whitespace alone.

---

## 8. Migration Plan (Old → New)

### 8.1 Principles

- Do not silently destroy user data.
- Provide redirects for legacy URLs.
- Archive incompatible data.
- Run old and new in parallel during transition where feasible.

### 8.2 Data migration

| Old data | Treatment |
|---|---|
| Users | Migrate to new `User` model; create default `Organization` + `Workspace` per user; create `Membership` with `role: owner` |
| Creations | Migrate to workspace-scoped `Creation`; set `workspaceId` from user's default workspace |
| Assets | Migrate to workspace-scoped `Asset`; fix `parentId` self-relation |
| CreditLedger | Migrate to `UsageRecord`; create `Subscription` (free plan) for each workspace |
| PlatformConnection | Migrate to `Integration` + `Connection`; encrypt tokens |
| ScheduledPost | Migrate to `ScheduledJob` |
| WorkflowRun/Step | Migrate to `Automation` + `AutomationRun` |
| Teams | Migrate to `Organization` (owner) + `Workspace`; `TeamMember` → `Membership` |
| AdCampaign, CreativePerformance | Migrate to workspace-scoped models |
| MetaSafetyAudit/Approval etc. | Migrate to `AuditEvent` + workspace-scoped approval models |
| Hook | Migrate to `KnowledgeObject` (Creative Studio module) |
| CreativeComment | Migrate to `Conversation` + messages |

### 8.3 Route migration

- Legacy `/lazynext-studio`, `/ad-reference`, `/drama-studio`, `/ad-skit` → 301 redirect to `/creative/pipelines/[slug]`.
- Legacy `/{ad-creative-feature}` (178 routes) → 301 redirect to `/creative/generators/[slug]`.
- Legacy `/teams/*` → 301 redirect to `/workspaces/[id]/members`.
- Legacy `/mcp-server` → 301 redirect to `/developers/mcp`.
- Legacy `/settings` → keep (user settings); workspace settings move to `/workspaces/[id]/settings`.

### 8.4 Migration execution

1. **Schema migration:** Add new models alongside old (additive). Run `prisma migrate`.
2. **Data backfill:** Script to populate `Organization`, `Workspace`, `Membership` for each existing user; set `workspaceId` on all business data.
3. **Dual-write period:** New code writes to both old and new models; reads from new.
4. **Cutover:** Switch reads to new models; remove old models in next migration.
5. **Route redirects:** Add 301 redirects for all legacy URLs.

---

## 9. Deployment Architecture

### 9.1 Current → target

| Aspect | Current | Target |
|---|---|---|
| Runtime | Cloudflare Workers (OpenNext) | Keep (viable for OS architecture) |
| DB | D1 | Keep; add proper R2 binding in wrangler |
| Storage | R2 (S3 API, hardcoded endpoint) | Keep; bind R2 in wrangler; remove hardcoded endpoint |
| Rate limiting | In-memory + unused wrangler namespaces | Wire Cloudflare rate limiter bindings (distributed) |
| Background jobs | Cron `*/5` + in-request processing | Keep cron for scheduled jobs; evaluate Durable Objects for long-running |
| Secrets | `.dev.vars` + wrangler secrets | Keep; add startup validation for required secrets |
| Environments | local + production | Add staging (`lazynext-staging.workers.dev` or subdomain) |

### 9.2 Environment separation

| Env | Purpose | DB | URL |
|---|---|---|---|
| local | Development | SQLite (`dev.db`) | `localhost:3100` |
| test | CI | Ephemeral SQLite | N/A |
| staging | Pre-prod validation | D1 (staging) | `staging.lazynext.com` |
| production | Live | D1 (prod) | `lazynext.com` |

---

## 10. CI/CD Target

| Job | Runs | Blocks deploy? |
|---|---|---|
| lint | All PRs | Yes |
| typecheck | All PRs | Yes |
| unit tests | All PRs | Yes |
| integration tests | All PRs | Yes |
| E2E tests (Playwright) | All PRs | **Yes** (remove `continue-on-error`) |
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

## 11. Testing Strategy

| Level | Scope | Tool | Target coverage |
|---|---|---|---|
| Unit | Domain logic, services, utils | Node test runner | 80%+ of service layer |
| Integration | DB, auth, API (with test DB) | Node test runner + test DB | All service methods |
| E2E | User journeys (browser) | Playwright | All critical journeys |
| Security | Authz boundaries, IDOR, input | Custom + automated | All API endpoints |
| Accessibility | WCAG 2.2 AA | axe-core in Playwright | All pages |
| Contract | API schema conformance | OpenAPI validation | All public API endpoints |
| MCP conformance | Protocol behavior | Custom MCP test client | All MCP RPCs |

### 11.1 Critical E2E journeys

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

## 12. Legal/Compliance Architecture

### 12.1 Documents to implement

| Document | Required? | Basis |
|---|---|---|
| Terms of Service | Yes | Core contract |
| Privacy Policy | Yes | GDPR/DPDP/CCPA |
| Cookie Policy | Yes | ePrivacy/cookie laws |
| Acceptable Use Policy | Yes | Platform liability |
| AI/Generative AI Policy | Yes | EU AI Act transparency; product uses AI |
| API Terms | Yes | Public API |
| Developer Terms | Yes | Developer platform |
| MCP Terms | Yes | MCP server is public |
| DPA | Yes (if EU customers) | GDPR Art. 28 |
| Subprocessor Disclosure | Yes | GDPR transparency |
| Security Documentation | Yes | Enterprise/customer trust |
| Refund/Cancellation Policy | Yes | Consumer protection |
| Copyright/Takedown Process | Yes | DMCA/platform liability |

### 12.2 Technical controls for compliance

| Control | Implementation |
|---|---|
| Legal acceptance recording | `LegalAcceptance` model: userId, documentVersion, timestamp, documentType |
| Versioned legal docs | Each doc has a version + `lastUpdated` date; stored in repo + rendered |
| Data export | `/settings/privacy` → export all user data as JSON/ZIP |
| Data deletion | `/settings/privacy` → request deletion; soft-delete → hard-delete after retention period |
| Consent management | Cookie consent banner (non-essential cookies only after consent) |
| Audit trail | `AuditEvent` for all security-sensitive actions |
| Retention policy | Documented per data category; enforced via scheduled cleanup jobs |

### 12.3 Jurisdictional notes

- **India (DPDP):** Consent-based; data principal rights; breach notification. Implement consent + rights request workflow.
- **EU (GDPR):** Lawful basis; DPA; subprocessor list; data subject rights; 72h breach notification. [Requires qualified legal counsel for final language]
- **US (CCPA/CPRA):** "Do Not Sell/Share" notice; privacy rights request process. [Applies if CA customers]
- **EU AI Act:** AI system transparency; synthetic media disclosure. [Requires legal counsel for classification]

> **Disclaimer:** Legal documents require review by qualified legal counsel in each target jurisdiction. This architecture defines the *technical controls* to support compliance; it does not constitute legal advice.

---

## 13. Open Questions & External Dependencies

| # | Question | Resolution needed |
|---|---|---|
| 1 | Are `next@16`, `react@19`, `typescript@6/7`, `prisma@7`, `eslint@10` real published packages? | Registry verification |
| 2 | Is the R2 bucket intentionally unbound in wrangler? | Cloudflare dashboard access |
| 3 | What is the Atlas Cloud contractual relationship? | Business/legal |
| 4 | Dodo Payments jurisdiction + terms | Business/legal |
| 5 | Are there production secrets in git history? | Git history scan (needs `git log --all -p` review) |
| 6 | Does the deployed bundle ship source maps? | Production bundle inspection |
| 7 | Final legal document language | Qualified legal counsel |
| 8 | D1 FK enforcement behavior | D1 documentation / test |

---

## 14. Implementation Order (Phases 2–12)

| Phase | Scope | Depends on |
|---|---|---|
| **2 — Foundation** | Neo-Brutalist design system (tokens, primitives), OS app shell, auth pages (`/login`, `/signup`), i18n copy refresh, theme system rebuild | Phase 1 (this doc) |
| **3 — Core OS** | Workspace/org/membership/role system, dashboard, navigation, search, command palette, settings | Phase 2 |
| **4 — Application modules** | Projects, Tasks, Documents, Files, Calendar, People, Conversations, Automations, AI Agents, Integrations, Analytics | Phase 3 |
| **4b — Creative Studio consolidation** | Consolidate 178 routes into Creative Studio module | Phase 3 |
| **5 — Public API** | `/api/v1/*` + gateway + API keys + OpenAPI | Phase 3 |
| **6 — MCP** | `/mcp` endpoint, `2026-07-28` conformance, tools wrapping services | Phase 5 |
| **7 — Security hardening** | MFA, session revocation, CSRF, CSP nonces, CAPTCHA, distributed rate limiting, SAST in CI | Phase 3 |
| **8 — Legal/compliance** | All legal docs, consent, rights workflows, audit logging | Phase 3 |
| **9 — Quality pass** | Performance, accessibility (WCAG 2.2 AA), globalization, responsive | Phase 4 |
| **10 — Testing** | Unit + integration + E2E + security + accessibility + MCP conformance | Phase 6 |
| **11 — Migration** | Data migration, route redirects, dual-write | Phase 4 |
| **12 — Production readiness** | Staging env, observability, backup/recovery, rollback, final audit | Phase 10 |

---

*End of Phase 1 Architecture Document. This is a draft for approval. No code has been changed. The next step is user approval of this architecture, after which Phase 2 (Foundation) implementation begins.*
