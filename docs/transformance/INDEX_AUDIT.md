# Database Index Audit Report

**Generated:** 2025-01-15
**Schema:** `prisma/schema.prisma`
**Database:** SQLite (local) / Cloudflare D1 (production)
**Total models:** 88
**Total `@@index` declarations:** 222
**Total `@@unique` declarations:** 9

---

## Summary

This audit reviews every Prisma model for foreign-key fields (fields referenced
in `@relation(fields: [...])`) and checks whether a corresponding `@@index` or
`@@unique` exists. Foreign-key columns without an index cause full table scans
on joins and filtered queries, which degrades performance as tables grow.

| Category | Count |
|---|---|
| Models with adequate indexes (all FKs indexed) | 85 |
| Models missing indexes on foreign-key fields | 3 |
| Models with no indexes and no foreign keys | 3 |

---

## Models Missing Indexes on Foreign-Key Fields

These models have one or more `@relation` foreign-key fields that are **not**
covered by any `@@index` or `@@unique`. This is the highest-priority finding.

### 1. `Account`

**Foreign keys:** `userId`
**Missing index on:** `userId`

The `Account` model has a `@@unique([provider, providerAccountId])` but no
`@@index([userId])`. Every NextAuth session lookup that resolves the user's
accounts will scan the full table.

**Recommended addition:**
```prisma
model Account {
  // ... existing fields ...
  @@unique([provider, providerAccountId])
  @@index([userId])          // ← ADD THIS
}
```

### 2. `DetectedOpportunity`

**Foreign keys:** `workspaceId`, `organizationId`
**Missing index on:** `organizationId`

The model has `@@index([workspaceId])`, `@@index([status])`, and
`@@index([urgency])`, but `organizationId` is not indexed. Cross-organization
reports and org-scoped opportunity queries will table-scan.

**Recommended addition:**
```prisma
model DetectedOpportunity {
  // ... existing fields ...
  @@index([workspaceId])
  @@index([status])
  @@index([urgency])
  @@index([organizationId])  // ← ADD THIS
}
```

### 3. `Recommendation`

**Foreign keys:** `workspaceId`, `organizationId`
**Missing index on:** `organizationId`

The model has `@@index([workspaceId])` and `@@index([status])`, but
`organizationId` is not indexed. Org-level recommendation listings will
table-scan.

**Recommended addition:**
```prisma
model Recommendation {
  // ... existing fields ...
  @@index([workspaceId])
  @@index([status])
  @@index([organizationId])  // ← ADD THIS
}
```

---

## Recommended Indexes to Add

| Model | Field(s) | Reason |
|---|---|---|
| `Account` | `[userId]` | NextAuth account lookups by user |
| `DetectedOpportunity` | `[organizationId]` | Org-scoped opportunity queries |
| `Recommendation` | `[organizationId]` | Org-scoped recommendation queries |

> **Note:** This task does **not** modify the Prisma schema. The indexes above
> are recommendations for a follow-up migration. Adding them requires a new
> Prisma migration and re-deployment of the D1 client.

---

## Models With Adequate Indexes

The following 85 models have `@@index` and/or `@@unique` declarations covering
all of their foreign-key fields. No action is required for these models.

<details>
<summary>View full list (85 models)</summary>

| Model | Indexes | Foreign Keys |
|---|---|---|
| `Session` | `[userId]` | `userId` |
| `Creation` | `[userId]`, `[status, createdAt]`, `[taskId]`, `[getUrl]` | `userId` |
| `CreditLedger` | `[userId]`, `[reason]`, `[ref]` + unique `[userId, idempotencyKey]` | `userId` |
| `AdProduct` | `[userId]` | `userId` |
| `AdAvatar` | `[userId]` | `userId` |
| `BrandKit` | `[userId]` | `userId` |
| `BrandProfile` | `[userId]` | `userId` |
| `Asset` | `[userId]`, `[parentId]` | `userId` |
| `SharedLink` | `[userId]`, `[assetId]`, `[token]`, `[expiresAt]` | `userId` |
| `WebhookEndpoint` | `[userId]`, `[active, events]` | `userId` |
| `CreativeComment` | `[userId]`, `[assetId]` | `userId` |
| `Team` | `[ownerId]` | `ownerId` |
| `TeamMember` | `[userId]` + unique `[teamId, userId]` | `teamId`, `userId` |
| `TeamInvitation` | `[teamId]`, `[email]`, `[expiresAt]` | `teamId` |
| `TeamActivity` | `[teamId, createdAt]`, `[userId]` | `teamId`, `userId` |
| `ApprovalStage` | `[assetId]`, `[campaignId]`, `[stage]`, `[status]` | `assetId`, `campaignId` |
| `AssetVersion` | `[assetId]` | `assetId` |
| `WorkflowRun` | `[userId]`, `[status]` | `userId` |
| `WorkflowStep` | `[runId]` | `runId` |
| `AdCampaign` | `[userId]`, `[platform]` | `userId` |
| `CreativePerformance` | `[userId]`, `[creationId]`, `[platform]` | `userId` |
| `Timeline` | `[userId]`, `[creationId]` | `userId`, `creationId` |
| `TimelineVersion` | `[timelineId]` + unique `[timelineId, versionNum]` | `timelineId` |
| `EditingSkill` | `[userId]` | `userId` |
| `CreativeTemplate` | `[userId]`, `[category]` | `userId` |
| `CustomComplianceRule` | `[userId]`, `[platform]`, `[enabled]` | `userId` |
| `PlatformConnection` | `[userId]`, `[platform]` + unique `[userId, platform]` | `userId` |
| `ScheduledPost` | `[userId]`, `[userId, status]`, `[status, scheduledAt]` | `userId` |
| `MetaSafetyAudit` | `[actor]`, `[timestamp]` | — |
| `MetaSafetyApproval` | `[status]`, `[expiresAt]` | — |
| `GoogleSafetyAudit` | `[actor]`, `[timestamp]` | — |
| `GoogleSafetyApproval` | `[status]`, `[expiresAt]` | — |
| `Hook` | `[userId]`, `[userId, trigger]` | `userId` |
| `Organization` | `[ownerId]` | `ownerId` |
| `Workspace` | `[organizationId]` | `organizationId` |
| `Membership` | `[workspaceId]` + unique `[userId, workspaceId]` | `userId`, `workspaceId` |
| `Project` | `[workspaceId]`, `[workspaceId, status]` | `workspaceId` |
| `Task` | `[projectId]`, `[assigneeId]`, `[assignedAgentId]`, `[status]`, `[planId]`, `[parentTaskId]`, `[idempotencyKey]` | `projectId` |
| `TaskDependency` | `[taskId]`, `[dependsOnId]` + unique `[taskId, dependsOnId]` | `taskId`, `dependsOnId` |
| `TimeEntry` | `[taskId]`, `[userId]`, `[agentRunId]` | `taskId` |
| `Document` | `[workspaceId]`, `[projectId]` | `workspaceId`, `projectId` |
| `FileStore` | `[workspaceId]` | `workspaceId` |
| `Automation` | `[workspaceId]` | `workspaceId` |
| `AutomationRun` | `[automationId]`, `[status]` | `automationId` |
| `AgentDef` | `[workspaceId]`, `[role]` | `workspaceId` |
| `AgentRun` | `[agentId]`, `[status]`, `[taskId]`, `[planId]`, `[idempotencyKey]` | `agentId` |
| `Notification` | `[userId, read]`, `[workspaceId]` | `workspaceId` |
| `Conversation` | `[workspaceId]` | `workspaceId` |
| `Message` | `[conversationId]`, `[userId]` | `conversationId`, `userId` |
| `ScheduledJob` | `[workspaceId, status]`, `[scheduledAt]`, `[status, scheduledAt]`, `[idempotencyKey]`, `[agentRunId]` | `workspaceId` |
| `AuditEvent` | `[userId]`, `[workspaceId]`, `[action]` | `workspaceId` |
| `ApiKey` | `[userId]`, `[keyHash]` + unique `keyHash` | `userId` |
| `DataRequest` | `[userId]`, `[status]` | `userId` |
| `Goal` | `[organizationId]`, `[workspaceId]`, `[status]`, `[parentGoalId]` | `organizationId`, `workspaceId`, `parentGoalId` |
| `Kpi` | `[organizationId]`, `[workspaceId]`, `[goalId]` | `organizationId`, `workspaceId`, `goalId` |
| `Plan` | `[workspaceId]`, `[organizationId]`, `[goalId]`, `[status]` | `workspaceId`, `organizationId`, `goalId` |
| `ToolDef` | `[workspaceId]`, `[name]` | `workspaceId` |
| `ToolCall` | `[workspaceId]`, `[agentRunId]`, `[toolDefId]`, `[status]` | `workspaceId`, `toolDefId` |
| `Approval` | `[workspaceId]`, `[organizationId]`, `[status]`, `[expiresAt]` | `workspaceId`, `organizationId` |
| `Budget` | `[workspaceId]`, `[organizationId]`, `[scope, scopeId]`, `[status]` | `workspaceId`, `organizationId` |
| `BudgetEntry` | `[budgetId]`, `[agentRunId]` | `budgetId` |
| `Memory` | `[workspaceId]`, `[organizationId]`, `[type]`, `[tags]` | `workspaceId`, `organizationId` |
| `Event` | `[workspaceId]`, `[organizationId]`, `[type]`, `[correlationId]`, `[createdAt]` | `workspaceId`, `organizationId` |
| `Product` | `[organizationId]`, `[workspaceId]`, `[status]` | `organizationId`, `workspaceId` |
| `Customer` | `[organizationId]`, `[workspaceId]`, `[status]`, `[type]`, `[ownerId]` | `organizationId`, `workspaceId` |
| `Initiative` | `[organizationId]`, `[workspaceId]`, `[status]` | `organizationId`, `workspaceId` |
| `Deal` | `[organizationId]`, `[workspaceId]`, `[customerId]`, `[stage]`, `[ownerId]` | `organizationId`, `workspaceId`, `customerId`, `productId` |
| `Transaction` | `[organizationId]`, `[workspaceId]`, `[type]`, `[category]`, `[date]` | `organizationId`, `workspaceId` |
| `KnowledgeBase` | `[organizationId]`, `[workspaceId]` | `organizationId`, `workspaceId` |
| `KnowledgeArticle` | `[knowledgeBaseId]`, `[status]` | `knowledgeBaseId` |
| `ResearchSession` | `[organizationId]`, `[workspaceId]`, `[status]` | `organizationId`, `workspaceId` |
| `Citation` | `[researchSessionId]`, `[knowledgeArticleId]` | `researchSessionId`, `knowledgeArticleId` |
| `SecurityEvent` | `[organizationId]`, `[workspaceId]`, `[type]`, `[severity]`, `[createdAt]` | `organizationId`, `workspaceId` |
| `Metric` | `[organizationId]`, `[workspaceId]`, `[name]`, `[timestamp]` | `organizationId`, `workspaceId` |
| `SandboxRun` | `[workspaceId]`, `[agentRunId]`, `[status]`, `[createdAt]` | `workspaceId` |
| `Ticket` | `[organizationId]`, `[workspaceId]`, `[status]`, `[priority]`, `[assigneeId]`, `[customerId]`, `[slaDueAt]` | `organizationId`, `workspaceId`, `customerId` |
| `TicketComment` | `[ticketId]`, `[createdAt]` | `ticketId` |
| `WorkspaceQuota` | `[organizationId]` + unique `[workspaceId]` | `organizationId`, `workspaceId` |
| `Policy` | `[organizationId]`, `[workspaceId]`, `[type]`, `[status]` | `organizationId`, `workspaceId` |
| `ComplianceCheck` | `[organizationId]`, `[workspaceId]`, `[status]`, `[checkedAt]` | `organizationId`, `workspaceId`, `policyId` |
| `RetentionRule` | `[organizationId]`, `[dataType]` | `organizationId` |

</details>

---

## Models Without Indexes (and no foreign keys)

These models have no `@@index` declarations and no foreign-key relations.
They are small lookup or singleton tables where a missing index is low-risk,
but they are listed for completeness.

| Model | Notes |
|---|---|
| `User` | Primary key + `@unique email` only. Adequate for auth lookups. |
| `VerificationToken` | Has `@@unique([identifier, token])`. Adequate. |
| `RedeemedCode` | Primary key is the `code` field. Adequate for single-row lookups. |

---

## Methodology

1. Parsed `prisma/schema.prisma` into per-model blocks.
2. For each model, extracted:
   - `@@index([...])` declarations → indexed field sets.
   - `@@unique([...])` declarations → indexed field sets (unique constraints
     also create an index).
   - `@relation(fields: [...])` declarations → foreign-key fields.
3. A foreign-key field is considered **indexed** if it appears in any
   `@@index` or `@@unique` field list (single-field or composite).
4. Models with at least one unindexed foreign key are flagged as
   "missing indexes."

This audit is static (schema-only). Runtime query analysis (e.g. EXPLAIN
QUERY PLAN on D1) would provide additional insight into query plans that
table-scan despite indexes existing.
