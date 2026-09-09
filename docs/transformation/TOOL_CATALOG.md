# Lazynext — Tool Catalog

**Date:** 2026-09-04
**Status:** Design — to be implemented in Phase 9

---

## Tool Registry

Every tool declares: name, version, description, input schema, output schema, auth requirements, permissions, risk category, budget category, timeout, retry policy, audit requirements, allowed agents, allowed companies.

### Core Tools (P0)

| Tool | Purpose | Risk | Budget | Timeout | Auth |
|---|---|---|---|---|---|
| read_company | Read company state, goals, KPIs | low | none | 5s | workspace membership |
| read_metrics | Read company metrics and analytics | low | none | 5s | workspace membership |
| create_task | Create a task in the task system | low | none | 5s | workspace membership |
| assign_task | Assign a task to an agent or person | low | none | 5s | workspace membership |
| create_plan | Create a durable plan | low | none | 10s | workspace membership |
| read_documents | Read workspace documents | low | none | 5s | workspace membership |
| write_document | Create/update a document | medium | none | 10s | workspace membership |
| search | Unified search across company objects | low | none | 5s | workspace membership |
| read_memory | Read company memory | low | none | 5s | workspace membership |
| write_memory | Write to company memory | medium | none | 10s | workspace membership |

### Research Tools (P1)

| Tool | Purpose | Risk | Budget | Timeout | Auth |
|---|---|---|---|---|---|
| web_search | Web search for research | low | API cost | 30s | API key |
| browser | Browser automation (sandboxed) | medium | compute cost | 120s | sandbox config |
| fetch_url | Fetch a URL (SSRF-validated) | medium | none | 30s | SSRF validation |

### Engineering Tools (P1)

| Tool | Purpose | Risk | Budget | Timeout | Auth |
|---|---|---|---|---|---|
| github | GitHub operations (repos, PRs, issues) | high | none | 60s | OAuth token |
| code_exec | Execute code in sandbox | high | compute cost | 120s | sandbox config |
| test_runner | Run tests | medium | compute cost | 300s | workspace membership |
| file_read | Read files from workspace | low | none | 5s | workspace membership |
| file_write | Write files to workspace | medium | none | 10s | workspace membership |

### Creative Tools (P1 — wrapping existing Creative Studio)

| Tool | Purpose | Risk | Budget | Timeout | Auth |
|---|---|---|---|---|---|
| atlas_generate | AI generation (image, video, LLM) | medium | credits | 120s | Atlas API key |
| brand_check | Check creative against brand guidelines | low | credits | 30s | Atlas API key |
| creative_tools | Access to creative tool registry | low | credits | 30s | Atlas API key |
| asset_manage | Manage creative assets | low | none | 10s | workspace membership |

### Growth Tools (P1)

| Tool | Purpose | Risk | Budget | Timeout | Auth |
|---|---|---|---|---|---|
| ad_platform | Manage ad campaigns (Meta/Google) | high | ad spend | 60s | OAuth token |
| analytics | Read analytics data | low | none | 10s | workspace membership |
| social_publish | Publish to social platforms | high | none | 60s | OAuth token |

### Business Tools (P2)

| Tool | Purpose | Risk | Budget | Timeout | Auth |
|---|---|---|---|---|---|
| crm | CRM operations (leads, contacts, accounts) | medium | none | 10s | workspace membership |
| email | Send emails | high | none | 30s | SMTP/API key |
| calendar | Calendar operations | medium | none | 10s | OAuth token |
| notifications | Send notifications | low | none | 5s | workspace membership |
| automation_trigger | Trigger an automation | medium | none | 10s | workspace membership |

### Security Tools (P2)

| Tool | Purpose | Risk | Budget | Timeout | Auth |
|---|---|---|---|---|---|
| security_scan | Run security scans | low | none | 60s | workspace membership |
| read_audit | Read audit events | low | none | 5s | workspace membership |
| read_policies | Read security policies | low | none | 5s | workspace membership |
| create_alert | Create a security alert | medium | none | 5s | workspace membership |

## Tool Definition Structure

```typescript
interface ToolDef {
  id: string;
  name: string;
  version: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  authRequirements: AuthRequirement;
  permissions: string[];
  riskCategory: 'low' | 'medium' | 'high';
  budgetCategory: 'none' | 'credits' | 'api_cost' | 'compute_cost' | 'ad_spend';
  timeout: number; // seconds
  retryPolicy: RetryPolicy;
  auditRequirements: AuditRequirement;
  allowedAgents: string[]; // agent role IDs
  allowedCompanies: string[]; // company IDs (empty = all)
}
```

## Tool Call Structure

```typescript
interface ToolCall {
  id: string;
  agentRunId: string;
  toolId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  error?: string;
  costCredits: number;
  riskScore: number;
  approved: boolean;
  approvedBy?: string;
  startedAt: Date;
  completedAt?: Date;
}
```
