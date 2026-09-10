# Lazynext — Permission Model

**Date:** 2026-09-04
**Status:** Design — to be implemented in Phase 9

---

## Permission Decision Model

A permission decision considers multiple factors:

```typescript
interface PermissionRequest {
  userId?: string;      // human user (if applicable)
  agentId?: string;     // agent (if applicable)
  companyId: string;    // company scope
  workspaceId: string;  // workspace scope
  role: string;         // user role or agent role
  toolId: string;       // tool being invoked
  action: string;       // action being performed
  resource: string;     // resource being accessed
  environment: string;  // local | staging | production
  risk: 'low' | 'medium' | 'high';
  budgetImpact: number; // estimated cost
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

type PermissionDecision = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'ALLOW_WITH_LIMIT';
```

## Permission Outcomes

| Outcome | Meaning |
|---|---|
| ALLOW | Action permitted, proceed |
| DENY | Action forbidden, block and audit |
| REQUIRE_APPROVAL | Action needs human approval before proceeding |
| ALLOW_WITH_LIMIT | Action permitted but with constraints (e.g., rate limit, budget cap) |

## Policy Evaluation

Policies are evaluated in order:
1. **Company policy** — company-level rules (e.g., "no external emails without approval")
2. **Workspace policy** — workspace-level rules
3. **Role policy** — role-based permissions (owner/admin/member/viewer/guest or agent role)
4. **Tool policy** — tool-specific rules (risk category, allowed agents)
5. **Resource policy** — resource-specific rules (e.g., "production deployment requires owner approval")
6. **Environment policy** — environment-specific rules (e.g., "no autonomous actions in production without explicit enable")
7. **Budget policy** — budget enforcement (deny if over budget)
8. **Risk policy** — risk-based approval gating

## Risk Classification

| Risk Level | Examples | Default Policy |
|---|---|---|
| Low | Read data, create tasks, write documents | ALLOW |
| Medium | Write to memory, create plans, trigger automations | ALLOW (autonomous) / REQUIRE_APPROVAL (assisted) |
| High | Deploy code, send emails, ad spend, delete data, publish content | REQUIRE_APPROVAL |

## Role-Based Permissions

### Human Roles

| Role | Permissions |
|---|---|
| Owner | All actions, all resources, can change policies |
| Admin | All actions except policy changes and billing changes |
| Member | Create/edit/delete own resources, read all workspace resources |
| Viewer | Read-only access to workspace resources |
| Guest | Limited read access to specific resources |

### Agent Roles

| Role | Default Permissions |
|---|---|
| CEO/Executive | Read all, create tasks/plans, delegate; high-risk requires approval |
| Engineering | Code operations, test runs; deployment requires approval |
| Strategy | Read all, create plans; external comms requires approval |
| Research | Read all, web search, write documents to knowledge base |
| Product | Read all, create tasks/documents; product changes require approval |
| Design/Creative | Creative generation, asset management; publishing requires approval |
| Growth | Campaign creation, analytics; ad spend requires approval |
| Sales | CRM read/write; outreach requires approval |
| Support | Ticket triage, response drafting; sending responses requires approval |
| Finance | Financial read, report creation; financial actions require approval |
| Operations | Workflow management; external comms requires approval |
| Security/Compliance | Security scans, audit reads; policy changes require approval |

## Audit

Every permission decision is audited:
- ALLOW → audit event (low priority)
- DENY → audit event (high priority — potential security incident)
- REQUIRE_APPROVAL → audit event + approval request created
- ALLOW_WITH_LIMIT → audit event with limit details

## Implementation

```typescript
// src/lib/services/permission.ts
export async function checkPermission(req: PermissionRequest): Promise<PermissionDecision> {
  // 1. Check company policy
  // 2. Check workspace policy
  // 3. Check role policy
  // 4. Check tool policy
  // 5. Check resource policy
  // 6. Check environment policy
  // 7. Check budget policy
  // 8. Check risk policy
  // Return decision
  // Audit the decision
}
```
