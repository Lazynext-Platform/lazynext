/**
 * Tool Executors — concrete executor functions for the agent runtime's tool
 * registry.
 *
 * Each executor implements the `ToolExecutor` interface from `agent-runtime`:
 *   (input, context) => Promise<Record<string, unknown>>
 *
 * Tools that have a backing service (CompanyService, TaskService, MemoryService,
 * CRM/Audit/Permission/Notification/Alert services, etc.) call the service
 * directly. Tools that require external configuration (web search, browser,
 * GitHub, code execution, ad platforms, etc.) return a structured dry-run
 * response indicating the tool is registered but needs external service
 * configuration.
 *
 * Registration is performed via `registerToolExecutors(map)`, which is invoked
 * once at module load time from `agent-runtime.ts`. A standalone
 * `toolExecutorsMap` Record is also exported for direct use/testing.
 */

import type { ToolExecutor, ToolExecutionContext } from '@/lib/services/agent-runtime';
import { CompanyService } from '@/lib/services/company';
import { KpiService } from '@/lib/services/kpi-service';
import { TaskService } from '@/lib/services/task';
import { PlanService } from '@/lib/services/plan';
import { Planner } from '@/lib/services/planner';
import { MemoryService } from '@/lib/services/memory';
import { KnowledgeSearch } from '@/lib/services/knowledge-search';
import { DocumentManagementService } from '@/lib/services/document-management-service';
import { CustomerService } from '@/lib/services/crm';
import { AuditService } from '@/lib/services/audit';
import { PermissionService } from '@/lib/services/permission-service';
import { NotificationService } from '@/lib/services/notification-service';
import { AlertService } from '@/lib/services/alert-service';
import { AutomationService } from '@/lib/services/automation';

// ── Helpers ──

/**
 * Build a structured dry-run response for tools that are registered but need
 * external service configuration before they can execute for real.
 */
function placeholder(
  toolName: string,
  input: Record<string, unknown>,
  note: string,
): Record<string, unknown> {
  return {
    dryRun: true,
    tool: toolName,
    status: 'not_configured',
    message: `Tool '${toolName}' is registered but requires external service configuration.`,
    note,
    input,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wrap an executor in uniform error handling. Any thrown error is converted to
 * a structured error object so the agent runtime never crashes on a tool
 * failure.
 */
function withErrorHandling(
  toolName: string,
  fn: (input: Record<string, unknown>, context: ToolExecutionContext) => Promise<Record<string, unknown>>,
): ToolExecutor {
  return async (input, context) => {
    try {
      return await fn(input, context);
    } catch (e) {
      return {
        error: true,
        tool: toolName,
        message: e instanceof Error ? e.message : 'tool_execution_failed',
      };
    }
  };
}

/** Coerce an unknown input value to a string, returning undefined if absent. */
function asStr(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

/** Coerce an unknown input value to a number, returning undefined if invalid. */
function asNum(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Coerce an unknown input value to a string array. */
function asStrArr(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const arr = value.map((v) => String(v)).filter((s) => s.length > 0);
  return arr.length > 0 ? arr : undefined;
}

// ── Core Tools ──

const readCompanyExecutor: ToolExecutor = withErrorHandling('read_company', async (_input, context) => {
  const company = await CompanyService.get(context.organizationId);
  if (!company) {
    return { error: true, message: 'Company not found', companyId: context.organizationId };
  }
  return { company };
});

const readMetricsExecutor: ToolExecutor = withErrorHandling('read_metrics', async (_input, context) => {
  const [metrics, definitions] = await Promise.all([
    KpiService.getKpiMetrics(context.organizationId),
    KpiService.listKpiDefinitions(context.organizationId),
  ]);
  return { metrics, definitions };
});

const createTaskExecutor: ToolExecutor = withErrorHandling('create_task', async (input, context) => {
  const projectId = asStr(input.projectId);
  const title = asStr(input.title);
  if (!projectId || !title) {
    return { error: true, message: 'projectId and title are required' };
  }
  const dueDateStr = asStr(input.dueDate);
  const task = await TaskService.create({
    projectId,
    title,
    description: asStr(input.description),
    priority: asStr(input.priority),
    status: asStr(input.status),
    dueDate: dueDateStr ? new Date(dueDateStr) : undefined,
    assigneeId: asStr(input.assigneeId),
    parentTaskId: asStr(input.parentTaskId),
    planId: asStr(input.planId),
    estimatedCost: asNum(input.estimatedCost),
    riskLevel: asStr(input.riskLevel),
  });
  return { task };
});

const assignTaskExecutor: ToolExecutor = withErrorHandling('assign_task', async (input, _context) => {
  const taskId = asStr(input.taskId);
  const assigneeId = asStr(input.assigneeId);
  if (!taskId || !assigneeId) {
    return { error: true, message: 'taskId and assigneeId are required' };
  }
  const task = await TaskService.update(taskId, { assigneeId });
  return { task };
});

const createPlanExecutor: ToolExecutor = withErrorHandling('create_plan', async (input, context) => {
  const title = asStr(input.title);
  const objective = asStr(input.objective);
  if (!title || !objective) {
    return { error: true, message: 'title and objective are required' };
  }

  // If the caller requests LLM-assisted planning, delegate to the Planner.
  const usePlanner = input.usePlanner === true || input.autonomous === true;
  if (usePlanner) {
    const plan = await Planner.plan({
      workspaceId: context.workspaceId,
      organizationId: context.organizationId,
      goalId: asStr(input.goalId),
      objective,
      createdById: context.userId,
      agentId: asStr(input.agentId),
    });
    return { plan };
  }

  const plan = await PlanService.create({
    workspaceId: context.workspaceId,
    organizationId: context.organizationId,
    goalId: asStr(input.goalId),
    title,
    objective,
    reasoning: asStr(input.reasoning),
    priority: asStr(input.priority),
    riskLevel: asStr(input.riskLevel),
    estimatedCost: asNum(input.estimatedCost),
    createdById: context.userId,
    agentId: asStr(input.agentId),
  });
  return { plan };
});

const readDocumentsExecutor: ToolExecutor = withErrorHandling('read_documents', async (input, context) => {
  const documents = await DocumentManagementService.listDocuments(context.organizationId, {
    category: asStr(input.category) as never,
    classification: asStr(input.classification) as never,
    tags: asStrArr(input.tags),
  });
  return { documents };
});

const writeDocumentExecutor: ToolExecutor = withErrorHandling('write_document', async (input, context) => {
  const title = asStr(input.title);
  const content = asStr(input.content);
  if (!title || !content) {
    return { error: true, message: 'title and content are required' };
  }
  const document = await DocumentManagementService.createDocument(
    context.organizationId,
    context.workspaceId,
    {
      title,
      content,
      description: asStr(input.description),
      category: asStr(input.category) as never,
      classification: asStr(input.classification) as never,
      tags: asStrArr(input.tags),
    },
    context.userId || context.agentRunId,
  );
  return { document };
});

const searchExecutor: ToolExecutor = withErrorHandling('search', async (input, context) => {
  const query = asStr(input.query);
  if (!query) {
    return { error: true, message: 'query is required' };
  }
  const limit = asNum(input.limit) ?? 20;

  // Build a lightweight search index from workspace memories and rank them
  // using the shared KnowledgeSearch scorer.
  const memories = await MemoryService.list(context.workspaceId, {}, 200);
  const index = memories.map((m) => ({
    id: (m as { id: string }).id,
    organizationId: context.organizationId,
    entityType: 'memory',
    title: ((m as { type?: string }).type || 'memory').slice(0, 80),
    content: (m as { content?: string }).content || '',
    keywords: KnowledgeSearch.extractKeywords((m as { content?: string }).content || '', 10),
    tags: asStrArr((m as { tags?: string }).tags) || [],
    relevanceScore: 0,
  }));
  const results = KnowledgeSearch.search(index, query, {
    limit,
    entityType: asStr(input.entityType),
    tags: asStrArr(input.tags),
  });
  return { results, count: results.length };
});

const readMemoryExecutor: ToolExecutor = withErrorHandling('read_memory', async (input, context) => {
  const memoryId = asStr(input.memoryId);
  if (memoryId) {
    const memory = await MemoryService.get(memoryId);
    if (!memory) return { error: true, message: 'Memory not found' };
    return { memory };
  }
  const memories = await MemoryService.list(
    context.workspaceId,
    {
      type: asStr(input.type) as never,
      tags: asStrArr(input.tags),
    },
    asNum(input.limit) ?? 50,
  );
  return { memories };
});

const writeMemoryExecutor: ToolExecutor = withErrorHandling('write_memory', async (input, context) => {
  const type = asStr(input.type) as never;
  const content = asStr(input.content);
  if (!type || !content) {
    return { error: true, message: 'type and content are required' };
  }
  const memory = await MemoryService.create({
    workspaceId: context.workspaceId,
    organizationId: context.organizationId,
    type,
    content,
    source: asStr(input.source) || 'agent',
    sourceId: asStr(input.sourceId) || context.agentRunId,
    confidence: asNum(input.confidence),
    owner: asStr(input.owner),
    lifecycle: asStr(input.lifecycle) as never,
    tags: asStrArr(input.tags),
    createdBy: context.userId || context.agentRunId,
  });
  return { memory };
});

// ── Research Tools (placeholders — need external API configuration) ──

const webSearchExecutor: ToolExecutor = withErrorHandling('web_search', async (input, _context) => {
  return placeholder(
    'web_search',
    input,
    'Configure a web search API provider (e.g. Brave, Serper, or Google Custom Search) to enable live results.',
  );
});

const browserExecutor: ToolExecutor = withErrorHandling('browser', async (input, _context) => {
  return placeholder(
    'browser',
    input,
    'Configure a sandboxed browser automation provider (e.g. Playwright in a sandbox) to enable browser actions.',
  );
});

const fetchUrlExecutor: ToolExecutor = withErrorHandling('fetch_url', async (input, _context) => {
  return placeholder(
    'fetch_url',
    input,
    'Configure an SSRF-validated HTTP fetcher service to enable URL fetching.',
  );
});

// ── Engineering Tools (placeholders — need sandbox/OAuth configuration) ──

const githubExecutor: ToolExecutor = withErrorHandling('github', async (input, _context) => {
  return placeholder(
    'github',
    input,
    'Configure a GitHub OAuth token and repository access to enable GitHub operations.',
  );
});

const codeExecExecutor: ToolExecutor = withErrorHandling('code_exec', async (input, _context) => {
  return placeholder(
    'code_exec',
    input,
    'Configure a sandboxed code execution environment to enable code execution.',
  );
});

const testRunnerExecutor: ToolExecutor = withErrorHandling('test_runner', async (input, _context) => {
  return placeholder(
    'test_runner',
    input,
    'Configure a test runner sandbox to enable running tests.',
  );
});

const fileReadExecutor: ToolExecutor = withErrorHandling('file_read', async (input, _context) => {
  return placeholder(
    'file_read',
    input,
    'Configure a workspace file storage backend (e.g. R2 or media storage) to enable file reads.',
  );
});

const fileWriteExecutor: ToolExecutor = withErrorHandling('file_write', async (input, _context) => {
  return placeholder(
    'file_write',
    input,
    'Configure a workspace file storage backend (e.g. R2 or media storage) to enable file writes.',
  );
});

// ── Creative Tools (placeholders — wrap existing Creative Studio) ──

const atlasGenerateExecutor: ToolExecutor = withErrorHandling('atlas_generate', async (input, _context) => {
  return placeholder(
    'atlas_generate',
    input,
    'Configure an Atlas Cloud API key to enable AI generation (image, video, LLM).',
  );
});

const brandCheckExecutor: ToolExecutor = withErrorHandling('brand_check', async (input, _context) => {
  return placeholder(
    'brand_check',
    input,
    'Configure an Atlas Cloud API key to enable brand consistency checks.',
  );
});

const creativeToolsExecutor: ToolExecutor = withErrorHandling('creative_tools', async (input, _context) => {
  return placeholder(
    'creative_tools',
    input,
    'Configure an Atlas Cloud API key to enable access to the creative tool registry.',
  );
});

const assetManageExecutor: ToolExecutor = withErrorHandling('asset_manage', async (input, _context) => {
  return placeholder(
    'asset_manage',
    input,
    'Configure a digital asset management backend to enable asset management.',
  );
});

// ── Growth Tools (placeholders — need OAuth tokens) ──

const adPlatformExecutor: ToolExecutor = withErrorHandling('ad_platform', async (input, _context) => {
  return placeholder(
    'ad_platform',
    input,
    'Configure Meta/Google Ads OAuth tokens and safety layer to enable ad platform operations.',
  );
});

const analyticsExecutor: ToolExecutor = withErrorHandling('analytics', async (input, _context) => {
  return placeholder(
    'analytics',
    input,
    'Configure an analytics provider (e.g. GA4) to enable analytics reads.',
  );
});

const socialPublishExecutor: ToolExecutor = withErrorHandling('social_publish', async (input, _context) => {
  return placeholder(
    'social_publish',
    input,
    'Configure social platform OAuth tokens to enable publishing.',
  );
});

// ── Business Tools ──

const crmExecutor: ToolExecutor = withErrorHandling('crm', async (input, context) => {
  const action = asStr(input.action) || 'list';
  switch (action) {
    case 'get': {
      const customerId = asStr(input.customerId);
      if (!customerId) return { error: true, message: 'customerId is required for get' };
      const customer = await CustomerService.get(customerId);
      return { customer };
    }
    case 'create': {
      const name = asStr(input.name);
      if (!name) return { error: true, message: 'name is required for create' };
      const customer = await CustomerService.create({
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        name,
        email: asStr(input.email),
        phone: asStr(input.phone),
        company: asStr(input.company),
        type: asStr(input.type),
        status: asStr(input.status),
        source: asStr(input.source),
        value: asNum(input.value),
        currency: asStr(input.currency),
        notes: asStr(input.notes),
        ownerId: asStr(input.ownerId),
      });
      return { customer };
    }
    case 'update': {
      const customerId = asStr(input.customerId);
      if (!customerId) return { error: true, message: 'customerId is required for update' };
      const customer = await CustomerService.update(customerId, {
        name: asStr(input.name),
        email: asStr(input.email),
        phone: asStr(input.phone),
        company: asStr(input.company),
        type: asStr(input.type),
        status: asStr(input.status),
        source: asStr(input.source),
        value: asNum(input.value),
        currency: asStr(input.currency),
        notes: asStr(input.notes),
        ownerId: asStr(input.ownerId),
      });
      return { customer };
    }
    case 'list':
    default: {
      const customers = await CustomerService.list(context.workspaceId, {
        status: asStr(input.status),
        type: asStr(input.type),
      });
      return { customers };
    }
  }
});

const emailExecutor: ToolExecutor = withErrorHandling('email', async (input, _context) => {
  return placeholder(
    'email',
    input,
    'Configure an SMTP or email API provider to enable email sending.',
  );
});

const calendarExecutor: ToolExecutor = withErrorHandling('calendar', async (input, _context) => {
  return placeholder(
    'calendar',
    input,
    'Configure a calendar OAuth token (e.g. Google Calendar) to enable calendar operations.',
  );
});

const notificationsExecutor: ToolExecutor = withErrorHandling('notifications', async (input, context) => {
  const title = asStr(input.title);
  if (!title) {
    return { error: true, message: 'title is required' };
  }
  const body = asStr(input.body);
  const type = asStr(input.type) || 'system';

  // If a specific user is targeted, create a direct notification.
  const userId = asStr(input.userId) || context.userId;
  if (userId) {
    const notification = await NotificationService.create({
      userId,
      workspaceId: context.workspaceId,
      type,
      title,
      body,
      category: asStr(input.category) as never,
      priority: asStr(input.priority) as never,
      actionUrl: asStr(input.actionUrl),
      metadata: input.metadata as Record<string, unknown> | undefined,
      createdBy: context.userId || context.agentRunId,
    });
    return { notification };
  }

  // Otherwise broadcast to all workspace members.
  const result = await NotificationService.createForWorkspace(context.workspaceId, {
    type,
    title,
    body,
    category: asStr(input.category) as never,
    priority: asStr(input.priority) as never,
    actionUrl: asStr(input.actionUrl),
    metadata: input.metadata as Record<string, unknown> | undefined,
    createdBy: context.userId || context.agentRunId,
  });
  return { broadcast: result };
});

const automationTriggerExecutor: ToolExecutor = withErrorHandling('automation_trigger', async (input, context) => {
  const type = asStr(input.type) || asStr(input.trigger);
  if (!type) {
    return { error: true, message: 'type (event name) is required' };
  }
  const runs = await AutomationService.dispatchEvent({
    id: `tool-trigger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: context.workspaceId,
    type,
    actor: context.userId || context.agentRunId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    correlationId: context.agentRunId,
  });
  return { triggered: runs.length, runs };
});

// ── Security Tools ──

const securityScanExecutor: ToolExecutor = withErrorHandling('security_scan', async (input, _context) => {
  return placeholder(
    'security_scan',
    input,
    'Configure a security scanning backend to enable security scans.',
  );
});

const readAuditExecutor: ToolExecutor = withErrorHandling('read_audit', async (input, context) => {
  const limit = asNum(input.limit) ?? 50;
  const events = await AuditService.listForWorkspace(context.workspaceId, limit);
  return { events };
});

const readPoliciesExecutor: ToolExecutor = withErrorHandling('read_policies', async (input, context) => {
  const policies = await PermissionService.listPermissionPolicies(context.organizationId, {
    status: asStr(input.status) as never,
    workspaceId: context.workspaceId,
  } as never);
  return { policies };
});

const createAlertExecutor: ToolExecutor = withErrorHandling('create_alert', async (input, context) => {
  const name = asStr(input.name);
  if (!name) {
    return { error: true, message: 'name is required' };
  }
  const alert = await AlertService.createAlert(context.organizationId, {
    workspaceId: context.workspaceId,
    name,
    description: asStr(input.description),
    severity: asStr(input.severity),
    source: asStr(input.source),
    metricName: asStr(input.metricName),
    condition: input.condition as Record<string, unknown> | undefined,
    threshold: asNum(input.threshold),
    metadata: input.metadata as Record<string, unknown> | undefined,
  });
  return { alert };
});

// ── Executor Map ──

/**
 * A standalone record of all concrete tool executors, keyed by tool name.
 * Useful for direct use in tests or alternate runtimes.
 */
export const toolExecutorsMap: Record<string, ToolExecutor> = {
  // Core
  read_company: readCompanyExecutor,
  read_metrics: readMetricsExecutor,
  create_task: createTaskExecutor,
  assign_task: assignTaskExecutor,
  create_plan: createPlanExecutor,
  read_documents: readDocumentsExecutor,
  write_document: writeDocumentExecutor,
  search: searchExecutor,
  read_memory: readMemoryExecutor,
  write_memory: writeMemoryExecutor,

  // Research
  web_search: webSearchExecutor,
  browser: browserExecutor,
  fetch_url: fetchUrlExecutor,

  // Engineering
  github: githubExecutor,
  code_exec: codeExecExecutor,
  test_runner: testRunnerExecutor,
  file_read: fileReadExecutor,
  file_write: fileWriteExecutor,

  // Creative
  atlas_generate: atlasGenerateExecutor,
  brand_check: brandCheckExecutor,
  creative_tools: creativeToolsExecutor,
  asset_manage: assetManageExecutor,

  // Growth
  ad_platform: adPlatformExecutor,
  analytics: analyticsExecutor,
  social_publish: socialPublishExecutor,

  // Business
  crm: crmExecutor,
  email: emailExecutor,
  calendar: calendarExecutor,
  notifications: notificationsExecutor,
  automation_trigger: automationTriggerExecutor,

  // Security
  security_scan: securityScanExecutor,
  read_audit: readAuditExecutor,
  read_policies: readPoliciesExecutor,
  create_alert: createAlertExecutor,
};

/**
 * Register all concrete tool executors into the provided map (the agent
 * runtime's `toolExecutors` map). Call once at module load time.
 *
 * Example:
 *   registerToolExecutors(toolExecutors); // from agent-runtime.ts
 */
export function registerToolExecutors(map: Map<string, ToolExecutor>): void {
  for (const [name, executor] of Object.entries(toolExecutorsMap)) {
    map.set(name, executor);
  }
}
