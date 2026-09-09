-- ── Phase 4: Company Model & Core OS Primitives (additive) ──
-- Extends Organization → Company (additive fields)
-- Adds: Goal, Kpi, Plan, PlanTask, ToolDef, ToolCall, Approval, Budget,
--       BudgetEntry, Memory, Event, DetectedOpportunity, Recommendation
-- All new tables; Organization gets nullable fields only.

-- ── Extend Organization → Company (additive nullable fields) ──
ALTER TABLE "Organization" ADD COLUMN "description" TEXT;
ALTER TABLE "Organization" ADD COLUMN "mission" TEXT;
ALTER TABLE "Organization" ADD COLUMN "vision" TEXT;
ALTER TABLE "Organization" ADD COLUMN "strategy" TEXT;
ALTER TABLE "Organization" ADD COLUMN "industry" TEXT;
ALTER TABLE "Organization" ADD COLUMN "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN "targetMarket" TEXT;
ALTER TABLE "Organization" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "autonomyMode" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Organization" ADD COLUMN "defaultWorkspaceId" TEXT;

-- ── Goal: company goals/objectives ──
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'objective',
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "progress" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME,
    "parentGoalId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Goal_organizationId_idx" ON "Goal"("organizationId");
CREATE INDEX "Goal_workspaceId_idx" ON "Goal"("workspaceId");
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- ── Kpi: key performance indicators ──
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "goalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target" REAL NOT NULL DEFAULT 0,
    "current" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "direction" TEXT NOT NULL DEFAULT 'up',
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Kpi_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Kpi_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Kpi_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Kpi_organizationId_idx" ON "Kpi"("organizationId");
CREATE INDEX "Kpi_workspaceId_idx" ON "Kpi"("workspaceId");
CREATE INDEX "Kpi_goalId_idx" ON "Kpi"("goalId");

-- ── Plan: durable plans (objective, tasks, dependencies, priority) ──
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "estimatedCost" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "agentId" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Plan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Plan_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Plan_workspaceId_idx" ON "Plan"("workspaceId");
CREATE INDEX "Plan_organizationId_idx" ON "Plan"("organizationId");
CREATE INDEX "Plan_status_idx" ON "Plan"("status");

-- ── ToolDef: centralized tool registry ──
CREATE TABLE "ToolDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "description" TEXT NOT NULL,
    "inputSchema" TEXT NOT NULL DEFAULT '{}',
    "outputSchema" TEXT NOT NULL DEFAULT '{}',
    "authRequirements" TEXT NOT NULL DEFAULT '{}',
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "riskCategory" TEXT NOT NULL DEFAULT 'low',
    "budgetCategory" TEXT NOT NULL DEFAULT 'none',
    "timeoutSec" INTEGER NOT NULL DEFAULT 30,
    "retryPolicy" TEXT NOT NULL DEFAULT '{}',
    "auditRequired" BOOLEAN NOT NULL DEFAULT true,
    "allowedAgents" TEXT NOT NULL DEFAULT '[]',
    "allowedCompanies" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ToolDef_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ToolDef_workspaceId_idx" ON "ToolDef"("workspaceId");
CREATE INDEX "ToolDef_name_idx" ON "ToolDef"("name");

-- ── ToolCall: tool invocation records (audit trail) ──
CREATE TABLE "ToolCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "agentRunId" TEXT,
    "toolDefId" TEXT NOT NULL,
    "input" TEXT NOT NULL DEFAULT '{}',
    "output" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "costCredits" INTEGER NOT NULL DEFAULT 0,
    "riskScore" REAL NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "ToolCall_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ToolCall_toolDefId_fkey" FOREIGN KEY ("toolDefId") REFERENCES "ToolDef" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ToolCall_workspaceId_idx" ON "ToolCall"("workspaceId");
CREATE INDEX "ToolCall_agentRunId_idx" ON "ToolCall"("agentRunId");
CREATE INDEX "ToolCall_toolDefId_idx" ON "ToolCall"("toolDefId");
CREATE INDEX "ToolCall_status_idx" ON "ToolCall"("status");

-- ── Approval: centralized approval center ──
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentRunId" TEXT,
    "toolCallId" TEXT,
    "taskId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "estimatedCost" INTEGER NOT NULL DEFAULT 0,
    "affectedResources" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "approverId" TEXT,
    "decision" TEXT,
    "note" TEXT,
    "expiresAt" DATETIME,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Approval_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Approval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Approval_workspaceId_idx" ON "Approval"("workspaceId");
CREATE INDEX "Approval_organizationId_idx" ON "Approval"("organizationId");
CREATE INDEX "Approval_status_idx" ON "Approval"("status");
CREATE INDEX "Approval_expiresAt_idx" ON "Approval"("expiresAt");

-- ── Budget: multi-level spending controls ──
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "limitCredits" INTEGER NOT NULL DEFAULT 0,
    "spentCredits" INTEGER NOT NULL DEFAULT 0,
    "limitUsd" REAL NOT NULL DEFAULT 0,
    "spentUsd" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Budget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Budget_workspaceId_idx" ON "Budget"("workspaceId");
CREATE INDEX "Budget_organizationId_idx" ON "Budget"("organizationId");
CREATE INDEX "Budget_scope_idx" ON "Budget"("scope", "scopeId");
CREATE INDEX "Budget_status_idx" ON "Budget"("status");

-- ── BudgetEntry: individual spending records ──
CREATE TABLE "BudgetEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budgetId" TEXT NOT NULL,
    "toolCallId" TEXT,
    "agentRunId" TEXT,
    "amountCredits" INTEGER NOT NULL DEFAULT 0,
    "amountUsd" REAL NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BudgetEntry_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BudgetEntry_budgetId_idx" ON "BudgetEntry"("budgetId");
CREATE INDEX "BudgetEntry_agentRunId_idx" ON "BudgetEntry"("agentRunId");

-- ── Memory: company memory (facts/knowledge/decisions/etc.) ──
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "sourceId" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "owner" TEXT,
    "accessPolicy" TEXT NOT NULL DEFAULT 'workspace',
    "lifecycle" TEXT NOT NULL DEFAULT 'medium',
    "expiresAt" DATETIME,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "relatedMemoryIds" TEXT NOT NULL DEFAULT '[]',
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Memory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Memory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Memory_workspaceId_idx" ON "Memory"("workspaceId");
CREATE INDEX "Memory_organizationId_idx" ON "Memory"("organizationId");
CREATE INDEX "Memory_type_idx" ON "Memory"("type");
CREATE INDEX "Memory_tags_idx" ON "Memory"("tags");

-- ── Event: shared event model ──
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "actor" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "correlationId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Event_workspaceId_idx" ON "Event"("workspaceId");
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");
CREATE INDEX "Event_type_idx" ON "Event"("type");
CREATE INDEX "Event_correlationId_idx" ON "Event"("correlationId");
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- ── DetectedOpportunity: proactive opportunity identification ──
CREATE TABLE "DetectedOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "recommendedAction" TEXT,
    "expectedImpact" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "risk" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'open',
    "dismissedBy" TEXT,
    "dismissedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetectedOpportunity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetectedOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DetectedOpportunity_workspaceId_idx" ON "DetectedOpportunity"("workspaceId");
CREATE INDEX "DetectedOpportunity_status_idx" ON "DetectedOpportunity"("status");
CREATE INDEX "DetectedOpportunity_urgency_idx" ON "DetectedOpportunity"("urgency");

-- ── Recommendation: AI recommendations ──
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "expectedBenefit" TEXT,
    "risk" TEXT NOT NULL DEFAULT 'low',
    "cost" INTEGER NOT NULL DEFAULT 0,
    "nextAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "acceptedById" TEXT,
    "acceptedAt" DATETIME,
    "rejectedById" TEXT,
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Recommendation_workspaceId_idx" ON "Recommendation"("workspaceId");
CREATE INDEX "Recommendation_status_idx" ON "Recommendation"("status");
