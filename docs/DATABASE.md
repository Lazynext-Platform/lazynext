# Lazynext — Database Architecture

**Version:** 1.0.0
**Status:** Active
**Basis:** `prisma/schema.prisma`, `research/ARCHITECTURE-PHASE1.md`

---

## 1. Overview

Lazynext uses **Prisma 7** as its ORM with a **SQLite** schema that generates the Cloudflare D1 client in production and a `better-sqlite3` client in local development. The schema defines **37 models** (tables) covering identity, tenancy, work objects, creative studio, AI/agents, integrations, automations, developer platform, billing, and audit.

### Driver adapter pattern

The database client is selected at build time via `scripts/prepare-platform.mjs` based on `BUILD_TARGET`:

| Environment | Driver | Implementation |
|---|---|---|
| Production | Cloudflare D1 | `src/lib/prisma.cloudflare.ts` |
| Local dev | `better-sqlite3` | `src/lib/prisma.local.ts` |

Both implementations export the same `PrismaClient` interface, so application code is driver-agnostic. The Prisma generator uses `engineType = "client"` with the D1 driver adapter for production.

```prisma
generator client {
  provider   = "prisma-client-js"
  engineType = "client"
}

datasource db {
  provider  = "sqlite"
}
```

---

## 2. Tenancy Model

### 2.1 User-scoped with workspace/organization layer

Lazynext uses a **three-tier tenancy model**: Organization → Workspace → Business Data.

- **Organization** — A company/team entity; owns workspaces. Has an `ownerId` (User relation), `slug` (unique), and `plan` (free | pro | team | enterprise).
- **Workspace** — The **tenant boundary**. All business-data models have a `workspaceId`. User-scoped data (preferences, sessions) does not. Has `organizationId` (cascade delete), `slug` (unique), `defaultLocale`, and `timezone`.
- **Membership** — The User ↔ Workspace relationship with a role (`owner | admin | member | viewer | guest`). Enforced via `@@unique([userId, workspaceId])`.

### 2.2 Tenancy enforcement

Every business-data query is filtered by `workspaceId`. The workspace context is resolved **server-side** from authentication — never from client input. This prevents tenant escape and IDOR/BOLA attacks (see API_SECURITY.md).

### 2.3 Current schema (pre-Phase-3)

The current production schema is **user-scoped** (models have `userId`, not `workspaceId`). The Phase 1 architecture defines the target workspace-scoped model. Migration is additive: new models are added alongside old, data is backfilled, dual-write runs during transition, then old models are removed.

---

## 3. Schema Overview (37 Models)

### 3.1 Identity (4 models)

| Model | Purpose | Key fields |
|---|---|---|
| `User` | A person with identity | `id`, `email`, `name`, `password` (bcrypt), `credits`, `locale`, `country`, `currency`, `notificationPrefs` |
| `Account` | NextAuth OAuth account | `userId`, `provider`, `providerAccountId`, `refresh_token`, `access_token` |
| `Session` | NextAuth session | `sessionToken`, `userId`, `expires` |
| `VerificationToken` | Email/password reset tokens | `identifier`, `token`, `expires` |

### 3.2 Tenancy (5 models)

| Model | Purpose | Key fields |
|---|---|---|
| `Organization` | Company/team entity | `name`, `slug`, `ownerId`, `plan` |
| `Workspace` | Tenant boundary | `organizationId`, `name`, `slug`, `defaultLocale`, `timezone` |
| `Membership` | User ↔ Workspace + role | `userId`, `workspaceId`, `role` |
| `Team` | Sub-group within workspace | `workspaceId`, `name` |
| `TeamMember` | User ↔ Team | `teamId`, `userId`, `role` |

### 3.3 Work objects (4 models)

| Model | Purpose | Key fields |
|---|---|---|
| `Project` | Container for related work | `workspaceId`, `name`, `description`, `status`, `createdById` |
| `Task` | Unit of work within a project | `projectId`, `assigneeId`, `title`, `status`, `priority`, `dueDate` |
| `Document` | Rich-text knowledge object | `workspaceId`, `projectId?`, `title`, `content`, `version`, `createdById` |
| `File` | Stored binary asset | `workspaceId`, `projectId?`, `name`, `mimeType`, `size`, `storageKey` (R2 key) |

### 3.4 Creative Studio (10 models)

| Model | Purpose |
|---|---|
| `Creation` | AI generation task (pending → processing → completed) |
| `Asset` | Unified asset system with lineage (`parentId` self-relation), versions, tags |
| `AssetVersion` | Versioned asset snapshot |
| `AdProduct` | Reusable product anchor (cross-scene consistency) |
| `AdAvatar` | Digital human avatar |
| `BrandKit` | Brand colors, fonts, tone |
| `BrandProfile` | Extracted brand profile (domain, industry, positioning) |
| `CreativeTemplate` | Pre-built and user-saved templates (brief, hooks, angles, script, skill-bundle) |
| `CreativeComment` | Threaded comments on assets (with @mentions) |
| `SharedLink` | Shareable asset link with optional password + expiry |

### 3.5 AI / Agents (4 models)

| Model | Purpose |
|---|---|
| `Agent` | AI agent definition (model, tools, instructions) |
| `AgentRun` | Agent execution record (status, input, output, tokensUsed) |
| `Tool` | Callable function exposed to agents (wraps domain services) |
| `EditingSkill` | User-defined editing skill bundles |

### 3.6 Integrations & Publishing (4 models)

| Model | Purpose |
|---|---|
| `Integration` | External service connection (OAuth or API key) |
| `Connection` | Credential/token for an integration (encrypted) |
| `PlatformConnection` | Publishing OAuth tokens (TikTok, YouTube, Instagram, etc.) |
| `ScheduledPost` | Scheduled social media post |

### 3.7 Automations (3 models)

| Model | Purpose |
|---|---|
| `Automation` | Workflow definition (trigger → steps → action) |
| `AutomationRun` | Automation execution record |
| `WorkflowRun` / `WorkflowStep` | Durable step tracking with optimistic locking (`version` field) |

### 3.8 Developer Platform (4 models)

| Model | Purpose |
|---|---|
| `ApiCredential` | Public API key + hashed secret with scopes |
| `ApiKey` | API key record (Phase 3) |
| `WebhookEndpoint` | User-registered webhook URL + events + HMAC secret |
| `WebhookDelivery` | Delivery attempt for a webhook event |

### 3.9 Billing & Usage (4 models)

| Model | Purpose |
|---|---|
| `CreditLedger` | Credit ledger entries (+grant / -spend) with idempotency keys |
| `Subscription` | Billing subscription (plan, status, renewal) |
| `Invoice` | Billing invoice (amount in cents) |
| `UsageRecord` | Metered usage (ai_generation, api_call, storage, credits) |

### 3.10 Audit, Events & Notifications (4 models)

| Model | Purpose |
|---|---|
| `AuditEvent` | Security/business-critical audit record (action, target, IP, userAgent) |
| `Notification` | User-facing notification |
| `ScheduledJob` | Cron/scheduled task (pending → running → completed → failed) |
| `RedeemedCode` | Prevents Atlas redeem code reuse |

### 3.11 Additional models

`TeamInvitation`, `TeamActivity`, `ApprovalStage`, `AdCampaign`, `CreativePerformance`, `Timeline`, `TimelineVersion`, `CustomComplianceRule`, `Hook`, `Message`, `DataRequest`.

---

## 4. Design Principles

1. **Workspace is the tenancy boundary.** Every business-data model has a `workspaceId`. User-scoped data (preferences, sessions) does not.
2. **Soft-delete** (`deletedAt DateTime?`) on all business-critical models.
3. **Audit fields** (`createdAt`, `updatedAt`) on every model.
4. **Relations over scalar IDs.** No `parentId`/`assetId` as raw strings — use Prisma relations. (The `Asset` model uses a self-relation `"AssetLineage"` for parent/child lineage.)
5. **Enum-like fields use Prisma enums** where D1 supports them; otherwise constrained strings with validation (e.g. `status String @default("active")`).
6. **OAuth tokens encrypted** at the application layer (not plain strings).
7. **Role/permission stored in DB**, not env strings.
8. **Cascade policy:** User deletion → `Restrict` for audit data, `SetNull` for ownership transfer, `Cascade` only for truly owned ephemeral data.

---

## 5. Soft-Delete Strategy

All business-critical models include a `deletedAt DateTime?` field. When a record is "deleted," `deletedAt` is set to the current timestamp instead of removing the row. Queries that read business data filter `WHERE deletedAt IS NULL` (or the Prisma equivalent).

### Hard-delete schedule

Soft-deleted records are hard-deleted after a retention period (see §9 Retention). A scheduled cleanup job (`ScheduledJob` with `type: "cleanup"`) scans for records where `deletedAt < now() - retentionPeriod` and removes them.

### User deletion

User deletion follows the cascade policy:
- **Audit data** (`AuditEvent`): `Restrict` — audit records are preserved; `userId` is nullable.
- **Ownership transfer** (`Project.createdById`, `Workspace.ownerId`): `SetNull` where the relation allows it.
- **Ephemeral data** (`Session`, `Account`, `Creation`): `Cascade` — truly owned by the user.

---

## 6. Audit Fields

Every model includes:

| Field | Type | Default | Purpose |
|---|---|---|---|
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last modification timestamp |
| `deletedAt` | `DateTime?` | `null` | Soft-delete timestamp (business models only) |

The `AuditEvent` model additionally records `userId`, `workspaceId`, `action`, `targetType`, `targetId`, `metadata` (JSON), `ip`, and `userAgent` for security-sensitive actions.

---

## 7. Relations vs Scalar IDs

The schema uses **Prisma relations** instead of raw scalar ID fields wherever a foreign key exists:

```prisma
// Correct — relation
model Project {
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdById String
  tasks       Task[]
}

// Avoid — raw scalar ID (legacy pattern being migrated away)
// model Project {
//   workspaceId String  // no relation, just a string
// }
```

### Self-relation example (Asset lineage)

```prisma
model Asset {
  id       String  @id @default(cuid())
  parentId String?
  parent   Asset?  @relation("AssetLineage", fields: [parentId], references: [id])
  children Asset[] @relation("AssetLineage")
}
```

---

## 8. Cascade Policy

| Parent → Child | onDelete | Rationale |
|---|---|---|
| `User` → `Account` | `Cascade` | OAuth accounts are truly owned by the user |
| `User` → `Session` | `Cascade` | Sessions are ephemeral |
| `User` → `Creation` | `Cascade` | Creations are owned by the user |
| `User` → `AuditEvent` | `Restrict` | Audit records must survive user deletion |
| `Organization` → `Workspace` | `Cascade` | Workspaces belong to the org |
| `Workspace` → `Membership` | `Cascade` | Memberships belong to the workspace |
| `Workspace` → `Project` | `Cascade` | Projects belong to the workspace |
| `Project` → `Task` | `Cascade` | Tasks belong to the project |
| `Asset` → `AssetVersion` | `Cascade` | Versions are owned by the asset |
| `Creation` → `Timeline` | `SetNull` | Timeline may survive creation deletion |
| `Team` → `TeamMember` | `Cascade` | Memberships belong to the team |

---

## 9. Indexes, Migrations, Backup & Retention

### 9.1 Indexes

Every model with a foreign key or frequently-queried field has an explicit `@@index`. Examples:

```prisma
model Creation {
  @@index([userId])
  @@index([status, createdAt])
  @@index([taskId])
}

model AuditEvent {
  @@index([userId])
  @@index([workspaceId])
  @@index([action])
}

model ScheduledJob {
  @@index([workspaceId, status])
  @@index([scheduledAt])
}
```

Composite indexes are used for common query patterns (e.g. `@@index([status, createdAt])` for paginated status queries, `@@index([workspaceId, type])` for usage records).

### 9.2 Migrations

- **Additive-first:** New models are added alongside old models. No destructive changes in a single migration.
- **Data backfill:** Scripts populate new fields/models (e.g. creating `Organization` + `Workspace` + `Membership` for each existing user).
- **Dual-write period:** New code writes to both old and new models; reads from new.
- **Cutover:** Switch reads to new models; remove old models in the next migration.
- **Migration tool:** `prisma migrate` for local SQLite; D1 migrations applied via wrangler for production.

### 9.3 Backup

| Data | Backup strategy |
|---|---|
| D1 (production) | Cloudflare D1 automated backups + point-in-time recovery |
| R2 (object storage) | R2 lifecycle policies; versioned objects for critical assets |
| Local dev (`dev.db`) | Developer-managed; not backed up |

D1 backups are scheduled daily with a retention window defined in the Cloudflare dashboard. Critical operations (schema migrations, data backfills) are preceded by a manual backup snapshot.

### 9.4 Retention

| Data category | Retention period | Enforcement |
|---|---|---|
| Active business data | Indefinite (until user deletes) | Soft-delete on user action |
| Soft-deleted records | 90 days | Scheduled cleanup job hard-deletes after 90 days |
| Audit events | 2 years (security) | Scheduled cleanup job |
| Session records | Until expiry | `expires` field; cleanup on access |
| Usage records | 13 months (billing) | Scheduled cleanup job |
| Webhook deliveries | 30 days | Scheduled cleanup job |
| Verification tokens | Until expiry | `expires` field; cleanup on access |

Retention is enforced via `ScheduledJob` records with `type: "cleanup"` that run on cron triggers. Each cleanup job scans for records past their retention period and hard-deletes them.

---

*End of Database Architecture document.*
