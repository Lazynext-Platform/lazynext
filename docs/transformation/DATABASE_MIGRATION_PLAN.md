# Lazynext — Database Migration Plan

**Date:** 2026-09-04
**Status:** Draft — migrations will be created phase-by-phase

---

## Migration Principles

1. **Additive first** — new nullable fields, new tables; no destructive changes without explicit migration
2. **Backup before destructive** — snapshot D1 before any column rename/drop
3. **Test locally** — all migrations tested against SQLite first
4. **Test on staging** — apply to staging D1 before production
5. **Verify record counts** — before/after counts must match
6. **Rollback documentation** — every migration has a rollback procedure
7. **Never use destructive reset commands against production** — no `prisma migrate reset`

## Migration Phases

### Phase 4 — Target Architecture & Domain Model

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_company_fields_to_organization | Organization | Additive | Add mission, vision, strategy, description, industry, website, targetMarket, logoUrl (all nullable) |
| add_company_goals | Goal (new) | Additive | Company goals (companyId, title, description, status, priority, dueDate) |
| add_company_kpis | Kpi (new) | Additive | KPIs (companyId, name, target, current, unit, period) |
| extend_task_model | Task | Additive | Add dependencies, estimatedCost, budget, timeout, retryPolicy, assignedAgentId, toolIds, inputs, outputs, verification, parentTaskId, childTaskIds |
| extend_agent_def | AgentDef | Additive | Add capabilities, permissions, memoryAccess, contextRules, budget, limits, executionPolicy, verificationPolicy |
| extend_agent_run | AgentRun | Additive | Add taskId, planId, toolCalls, outputs, verification, result, retryCount, idempotencyKey |
| extend_automation | Automation | Additive | Add conditions, verification, definitionJson (structured) |
| extend_scheduled_job | ScheduledJob | Additive | Add retryCount, maxRetries, backoffMs, deadLetterAt, idempotencyKey, ownerId |

### Phase 5 — Company Model

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_company_products | Product (new) | Additive | Company products |
| add_company_customers | Customer (new) | Additive | Company customers |
| add_company_initiatives | Initiative (new) | Additive | Company initiatives |

### Phase 7-8 — Agent Runtime & Planner

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_plan_model | Plan (new) | Additive | Durable plans |
| add_plan_task | PlanTask (new) | Additive | Plan→Task link |
| add_tool_def | ToolDef (new) | Additive | Tool registry |
| add_tool_call | ToolCall (new) | Additive | Tool invocation records |

### Phase 9 — Tool Registry & Permissions

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_permission_model | Permission (new) | Additive | Policy decisions |
| add_agent_tool_link | AgentTool (new, join) | Additive | Agent↔Tool link |

### Phase 10 — Memory/Context

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_memory_model | Memory (new) | Additive | Company memory |

### Phase 11 — Approval & Budget

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_approval_model | Approval (new) | Additive | Centralized approvals |
| add_budget_model | Budget (new) | Additive | Multi-level budgets |
| add_budget_entry | BudgetEntry (new) | Additive | Budget spending records |

### Phase 18 — Sales/CRM

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_lead | Lead (new) | Additive | Sales leads |
| add_crm_contact | CrmContact (new) | Additive | CRM contacts |
| add_crm_account | CrmAccount (new) | Additive | CRM accounts |
| add_opportunity | Opportunity (new) | Additive | Sales opportunities |

### Phase 19 — Customer Support

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_ticket | Ticket (new) | Additive | Support tickets |

### Phase 22-23 — Analytics & Experimentation

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_experiment | Experiment (new) | Additive | A/B experiments |

### Phase 24 — Opportunity/Recommendation

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_detected_opportunity | DetectedOpportunity (new) | Additive | Detected opportunities |
| add_recommendation | Recommendation (new) | Additive | AI recommendations |

### Phase 25 — Event System

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_event_model | Event (new) | Additive | Shared event model |

### Phase 26 — Integrations

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_integration_model | Integration (new) | Additive | Normalized integration |
| encrypt_platform_tokens | PlatformConnection | Refactor | Encrypt accessToken/refreshToken |

### Phase 27 — Security Hardening

| Migration | Tables | Type | Description |
|---|---|---|---|
| add_safety_tenancy | MetaSafetyAudit, MetaSafetyApproval, GoogleSafetyAudit, GoogleSafetyApproval | Additive | Add userId, workspaceId |
| add_verification_token_type | VerificationToken | Additive | Add type discriminator |
| add_workspace_to_creative | AdProduct, AdAvatar, BrandKit, BrandProfile, Asset, SharedLink, AdCampaign, CreativePerformance, EditingSkill, CustomComplianceRule, ScheduledPost, Hook | Additive | Add nullable workspaceId |

### Phase 28 — Multi-tenancy

| Migration | Tables | Type | Description |
|---|---|---|---|
| deprecate_team | Team, TeamMember, TeamInvitation, TeamActivity | Deprecate | Mark as deprecated (no drop yet) |

## Migration Template

For each migration:
```
1. Design: target schema
2. Migration: SQL (additive)
3. Backup: D1 snapshot
4. Staging migration: apply to staging
5. Data validation: record counts, integrity checks
6. Application compatibility: deploy app version that works with both schemas
7. Production migration: apply to prod
8. Post-migration validation: verify counts, queries, app behavior
```

## Rollback Procedures

- **Additive migrations:** Drop the added table/column (data loss only for new data)
- **Refactor migrations:** Restore from D1 snapshot
- **Deprecation migrations:** No rollback needed (tables remain)
