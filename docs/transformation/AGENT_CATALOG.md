# Lazynext — Agent Catalog

**Date:** 2026-09-04
**Status:** Design — to be implemented in Phase 7

---

## Agent Workforce

All agents share a common runtime (AgentDef → AgentRun → ToolCalls → Outputs → Verification → Result). Agents differ in their system instructions, capabilities, permissions, tools, and memory access.

### Phase 1 Agents (P0 — build first)

| Agent | Role | Capabilities | Tools | Permissions | Memory |
|---|---|---|---|---|---|
| CEO/Executive | Company context, priorities, strategy, delegation, progress review | planning, delegation, review | read_company, read_metrics, create_task, assign_task, create_plan | low-risk actions autonomous; high-risk require approval | company context, goals, decisions, outcomes |
| Engineering | Code, debugging, tests, architecture, PRs, deployment | code_edit, test_run, git_ops, deploy | github, code_exec, file_read, file_write, test_runner | code changes autonomous; deployment requires approval | codebase context, past decisions, test results |

### Phase 2 Agents (P1)

| Agent | Role | Capabilities | Tools | Permissions | Memory |
|---|---|---|---|---|---|
| Strategy | Market strategy, positioning, competitive analysis | research, analysis, planning | web_search, browser, read_company, create_plan | read-only autonomous; plan creation requires approval | market data, competitor analysis, strategic decisions |
| Research | Web research, market intelligence, evidence gathering | research, fact_extraction, citation | web_search, browser, read_documents, write_document | read-only autonomous; writing to knowledge requires approval | research findings, sources, citations |
| Product | Product planning, requirements, prioritization, experiments | product_planning, requirements, prioritization | read_company, create_task, create_document, read_metrics | read-only autonomous; task creation autonomous within plan | product context, customer feedback, experiment results |
| Design/Creative | Brand, visuals, campaigns, content, creative production | creative_generation, brand_check, content_review | atlas_generate, brand_check, creative_tools, asset_manage | creative generation autonomous; publishing requires approval | brand guidelines, creative history, performance data |
| Growth | Marketing, campaigns, acquisition, content, advertising | campaign_planning, content_creation, ad_management | atlas_generate, ad_platform, analytics, social_publish | campaign creation autonomous; ad spend requires approval | campaign history, performance data, audience insights |

### Phase 3 Agents (P2)

| Agent | Role | Capabilities | Tools | Permissions | Memory |
|---|---|---|---|---|---|
| Sales | Leads, CRM, outreach, qualification, pipeline | lead_management, outreach, qualification | crm, email, calendar, read_company | outreach requires approval (communication policy) | lead data, pipeline state, outreach history |
| Support | Customer questions, triage, resolution, escalation | ticket_triage, response_drafting, knowledge_retrieval | crm, knowledge_search, email, read_tickets | response drafting autonomous; sending requires approval | support history, resolution patterns, customer sentiment |
| Finance | Financial analysis, budgets, invoices, expense analysis | financial_analysis, budget_tracking, invoice_review | read_billing, read_budgets, analytics, create_report | read-only autonomous; financial actions require approval | financial data, budget history, cost patterns |
| Operations | Operational workflows, scheduling, vendor processes, coordination | workflow_management, scheduling, coordination | calendar, task_manage, automation_trigger, notifications | workflow management autonomous; external comms require approval | operational history, process patterns, schedules |
| Security/Compliance | Security checks, policy checks, risk detection, compliance | security_scan, policy_check, risk_assessment, audit | security_scan, read_audit, read_policies, create_alert | read-only autonomous; policy changes require approval | security history, policy decisions, risk patterns |

## Agent Definition Structure

```typescript
interface AgentDef {
  id: string;
  workspaceId: string;
  name: string;
  role: string; // ceo | engineering | strategy | research | ...
  systemInstructions: string;
  capabilities: string[]; // what the agent can do
  permissions: string[]; // what the agent is allowed to do
  toolIds: string[]; // available tools
  memoryAccess: 'full' | 'scoped' | 'none';
  contextRules: ContextRule[]; // what context to assemble
  modelProvider: string;
  modelName: string;
  budget: BudgetConfig; // spending limits
  limits: AgentLimits; // concurrency, timeout, rate
  executionPolicy: ExecutionPolicy; // retry, backoff, verification
  verificationPolicy: VerificationPolicy; // how to verify outputs
}
```

## Agent Run Structure

```typescript
interface AgentRun {
  id: string;
  agentId: string;
  taskId?: string;
  planId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  toolCalls: ToolCall[];
  verification?: VerificationResult;
  result?: RunResult;
  tokensUsed: number;
  costCredits: number;
  retryCount: number;
  idempotencyKey?: string;
  startedAt: Date;
  completedAt?: Date;
}
```
