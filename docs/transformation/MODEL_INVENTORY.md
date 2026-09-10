# Lazynext — Model Inventory

**Date:** 2026-09-04
**Source:** `prisma/schema.prisma` (55 models, 20 migrations)

---

## Model Classification

Each model is classified: **KEEP** (retain as-is), **MERGE** (consolidate), **REFACTOR** (modify), **REPLACE** (swap for new model), **DEPRECATE** (mark for removal), **DELETE** (remove), **UNKNOWN** (needs investigation).

### NextAuth Models (4)

| Model | Purpose | Tenancy | Classification | Notes |
|---|---|---|---|---|
| User | Identity, credits, locale, MFA | global | REFACTOR | Add role column, companyId; extend for OS |
| Account | OAuth provider link | userId | KEEP | Add index on userId |
| Session | NextAuth session | userId | KEEP | Add index on userId; revocation supported |
| VerificationToken | Email/reset tokens | none | REFACTOR | Add type discriminator (email vs reset) |

### Creative Studio / Ad-Platform Models (33)

| Model | Purpose | Tenancy | Classification | Notes |
|---|---|---|---|---|
| Creation | AI generation job | userId | KEEP | Core creative generation record |
| CreditLedger | Credit transactions | userId | KEEP | Idempotency key unique per user |
| RedeemedCode | Promo codes | userId (scalar) | KEEP | Add relation to User |
| AdProduct | Product asset | userId | KEEP | Add workspace scoping |
| AdAvatar | Avatar/persona | userId | KEEP | Add workspace scoping |
| BrandKit | Brand visuals | userId | KEEP | Add workspace scoping |
| BrandProfile | Extracted brand profile | userId | KEEP | Add workspace scoping |
| Asset | Generic creative asset | userId | KEEP | Add workspace scoping; parentId self-relation |
| AssetVersion | Version history | assetId | REFACTOR | Add unique on (assetId, version) |
| SharedLink | Public share | userId | KEEP | Add workspace scoping |
| WebhookEndpoint | User webhook | userId | KEEP | Add workspace scoping |
| CreativeComment | Threaded comments | userId | MERGE | Generalize into Conversation/Message |
| Team | Team/workspace | ownerId (scalar) | DEPRECATE | Replaced by Organization/Workspace |
| TeamMember | Membership | teamId+userId | DEPRECATE | Replaced by Membership |
| TeamInvitation | Pending invite | teamId | DEPRECATE | Replaced by workspace invite flow |
| TeamActivity | Audit feed | teamId+userId | DEPRECATE | Replaced by AuditEvent |
| ApprovalStage | Approval workflow | assetId/campaignId | REFACTOR | Generalize into Approval center |
| WorkflowRun | Durable workflow | userId | REFACTOR | Generalize for autonomous loop |
| WorkflowStep | Step state | runId (scalar) | REFACTOR | Add relation to WorkflowRun |
| AdCampaign | Ad campaign | userId | KEEP | Add workspace scoping |
| CreativePerformance | Performance stats | userId | KEEP | Add workspace scoping |
| Timeline | Video editor | userId | KEEP | Creative Studio asset |
| TimelineVersion | Timeline snapshot | timelineId | KEEP | |
| EditingSkill | User editing skill | userId | KEEP | Add workspace scoping |
| CreativeTemplate | Brief/hook templates | userId? | KEEP | |
| CustomComplianceRule | Compliance rules | userId | KEEP | Add workspace scoping |
| PlatformConnection | OAuth tokens | userId | REFACTOR | Encrypt tokens; add workspace scoping |
| ScheduledPost | Scheduled post | userId | KEEP | Add workspace scoping |
| MetaSafetyAudit | Meta safety log | **none** | REFACTOR | Add userId/workspaceId tenancy |
| MetaSafetyApproval | Meta approval | **none** | REFACTOR | Add userId/workspaceId tenancy |
| GoogleSafetyAudit | Google safety log | **none** | REFACTOR | Add userId/workspaceId tenancy |
| GoogleSafetyApproval | Google approval | **none** | REFACTOR | Add userId/workspaceId tenancy |
| Hook | AI ad hooks | userId | KEEP | Add workspace scoping |

### OS Platform Models (18) — added in Phase 3

| Model | Purpose | Tenancy | Classification | Notes |
|---|---|---|---|---|
| Organization | Company/team entity | ownerId | REFACTOR | Promote to Company model; add mission/vision/strategy/goals/KPIs |
| Workspace | Tenancy boundary | organizationId | KEEP | Core tenancy primitive |
| Membership | User↔Workspace role | userId+workspaceId | KEEP | |
| Project | Work container | workspaceId | REFACTOR | Extend for OS (initiatives, campaigns) |
| Task | Unit of work | projectId | REFACTOR | Extend for autonomous execution (dependencies, budget, retry, agent assignment) |
| Document | Rich-text knowledge | workspaceId | KEEP | |
| FileStore | Stored binary | workspaceId | KEEP | |
| Automation | Workflow definition | workspaceId | REFACTOR | Extend for trigger→conditions→plan→actions→verification |
| AutomationRun | Automation execution | automationId | REFACTOR | Extend for durable execution |
| AgentDef | AI agent definition | workspaceId | REFACTOR | Extend for capabilities, permissions, tools, memory, budget, limits, execution policy |
| AgentRun | Agent execution | agentId | REFACTOR | Extend for durable runs, tool calls, outputs, verification, result |
| Notification | User notification | userId+workspaceId | KEEP | |
| Conversation | Chat thread | workspaceId | KEEP | |
| Message | Chat message | conversationId | KEEP | |
| ScheduledJob | Cron/one-shot job | workspaceId | REFACTOR | Extend for durable job engine (retries, backoff, dead-letter) |
| AuditEvent | Security audit | userId?+workspaceId? | KEEP | |
| ApiKey | Public API key | userId | KEEP | |
| DataRequest | GDPR request | userId? | KEEP | |

## New Models Required (for Target OS)

| Model | Purpose | Priority |
|---|---|---|
| Company | Core operating entity (mission, vision, strategy, goals, KPIs, products, customers) | P0 |
| Goal | Company goal/objective | P0 |
| Kpi | Key performance indicator | P1 |
| Plan | Durable plan (objective, tasks, dependencies, priority) | P0 |
| ToolDef | Tool registry entry (name, schema, permissions, risk, budget) | P0 |
| ToolCall | Tool invocation record (agent, input, output, audit) | P0 |
| Permission | Policy-based permission decision | P0 |
| Approval | Centralized approval request | P0 |
| Budget | Multi-level budget (company/workspace/agent/task) | P1 |
| BudgetEntry | Budget spending record | P1 |
| Memory | Company memory (facts/knowledge/decisions/preferences/outcomes/lessons) | P1 |
| Lead | Sales lead | P2 |
| Contact | CRM contact | P2 |
| Account | CRM account (rename conflict with NextAuth Account) | P2 |
| Opportunity | Sales opportunity | P2 |
| Ticket | Customer support ticket | P2 |
| Experiment | A/B experiment | P2 |
| Opportunity_ | Detected opportunity (rename to avoid conflict) | P2 |
| Recommendation | AI recommendation | P2 |
| Event | Shared event model | P1 |
| Integration | Normalized integration (provider, connection, health) | P1 |
| Subscription | Billing subscription | P2 |
| Invoice | Billing invoice | P2 |
| Deployment | Deployment record | P2 |
| Repository | Connected GitHub repo | P2 |

**Note:** Model names with conflicts (e.g., `Account` exists in NextAuth) will need prefixed names (e.g., `CrmAccount`).

## Data Model Issues to Fix

1. **Team model is a duplicate concept** — Organization/Workspace already provide tenancy. Team/TeamMember/TeamInvitation/TeamActivity should be deprecated and migrated.
2. **Safety models lack tenancy** — MetaSafetyAudit/Approval and GoogleSafetyAudit/Approval are global tables with no userId/workspaceId.
3. **OAuth tokens stored as plain strings** in PlatformConnection — must be encrypted.
4. **Many creative models lack workspace scoping** — they're user-scoped only.
5. **Scalar ID fields lack relations** — WorkflowStep.runId, RedeemedCode.userId, SharedLink.assetId, etc.
6. **No soft-delete on creative models** — OS models have `deletedAt`, creative models don't.
7. **JSON stored inconsistently** — some `Json`, some `String` with `"[]"`/`"{}"` defaults.
8. **Enum-like fields are plain Strings** — no referential integrity.
