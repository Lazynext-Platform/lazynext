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
import { GitHubService } from '@/lib/services/github';
import { isUrlSafe, detectPromptInjection } from '@/lib/security';
import { CompanyEmailService } from '@/lib/services/company-email';
import { CalendarService } from '@/lib/services/calendar-service';
import { AnalyticsService } from '@/lib/services/analytics-service';

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
  const url = String(input.url || '');
  if (!url) return { error: 'missing_url' };
  if (!isUrlSafe(url)) return { error: 'blocked_url', reason: 'URL failed SSRF validation' };

  const maxBytes = Number(input.maxBytes) || 500_000;
  const timeoutMs = Number(input.timeoutMs) || 10_000;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Lazynext/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentLength = Number(res.headers.get('content-length') || 0);

    // Stream-read up to maxBytes to avoid unbounded memory usage
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        contentType,
        url: res.url,
        content: text.slice(0, maxBytes),
        truncated: text.length > maxBytes,
      };
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    let truncated = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (totalBytes + value.length > maxBytes) {
        chunks.push(value.slice(0, maxBytes - totalBytes));
        truncated = true;
        break;
      }
      chunks.push(value);
      totalBytes += value.length;
    }

    const decoder = new TextDecoder();
    const content = chunks.map(c => decoder.decode(c)).join('');

    return {
      ok: res.ok,
      status: res.status,
      contentType,
      url: res.url,
      contentLength: contentLength || totalBytes,
      content,
      truncated,
    };
  } catch (e) {
    return {
      error: 'fetch_failed',
      message: e instanceof Error ? e.message : 'Unknown fetch error',
    };
  }
});

// ── Engineering Tools (github wired; code_exec/test_runner need sandbox config) ──

const githubExecutor: ToolExecutor = withErrorHandling('github', async (input, context) => {
  const userId = context.userId;
  if (!userId) return { error: 'no_user_context', message: 'GitHub operations require an authenticated user' };

  const action = String(input.action || '');
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');

  // Check GitHub connection
  const { connected, username } = await GitHubService.isConnected(userId);
  if (!connected) {
    return {
      dryRun: true,
      tool: 'github',
      status: 'not_connected',
      message: 'Connect a GitHub account via /api/github/connect to enable GitHub operations.',
    };
  }

  switch (action) {
    case 'list_repos': {
      const repos = await GitHubService.listRepos(userId, Number(input.page) || 1, Number(input.perPage) || 30);
      return { ok: true, repos, count: repos.length };
    }
    case 'list_issues': {
      if (!owner || !repo) return { error: 'missing_params', message: 'owner and repo are required' };
      const issues = await GitHubService.listIssues(userId, owner, repo, (String(input.state || 'open') as 'open' | 'closed' | 'all'));
      return { ok: true, issues, count: issues.length };
    }
    case 'get_issue': {
      if (!owner || !repo || !input.issueNumber) return { error: 'missing_params', message: 'owner, repo, and issueNumber are required' };
      const issue = await GitHubService.getIssue(userId, owner, repo, Number(input.issueNumber));
      return issue ? { ok: true, issue } : { ok: false, error: 'issue_not_found' };
    }
    case 'create_issue': {
      if (!owner || !repo || !input.title) return { error: 'missing_params', message: 'owner, repo, and title are required' };
      const issue = await GitHubService.createIssue(userId, owner, repo, {
        title: String(input.title),
        body: String(input.body || ''),
        labels: Array.isArray(input.labels) ? input.labels.map(String) : [],
        assignees: Array.isArray(input.assignees) ? input.assignees.map(String) : [],
      });
      return issue ? { ok: true, issue } : { ok: false, error: 'create_failed' };
    }
    case 'list_prs': {
      if (!owner || !repo) return { error: 'missing_params', message: 'owner and repo are required' };
      const prs = await GitHubService.listPRs(userId, owner, repo, (String(input.state || 'open') as 'open' | 'closed' | 'all'));
      return { ok: true, prs, count: prs.length };
    }
    case 'get_pr': {
      if (!owner || !repo || !input.prNumber) return { error: 'missing_params', message: 'owner, repo, and prNumber are required' };
      const pr = await GitHubService.getPR(userId, owner, repo, Number(input.prNumber));
      return pr ? { ok: true, pr } : { ok: false, error: 'pr_not_found' };
    }
    case 'create_pr': {
      if (!owner || !repo || !input.title || !input.head || !input.base) return { error: 'missing_params', message: 'owner, repo, title, head, and base are required' };
      const pr = await GitHubService.createPR(userId, owner, repo, {
        title: String(input.title),
        body: String(input.body || ''),
        head: String(input.head),
        base: String(input.base),
        draft: Boolean(input.draft),
      });
      return pr ? { ok: true, pr } : { ok: false, error: 'create_failed' };
    }
    case 'merge_pr': {
      if (!owner || !repo || !input.prNumber) return { error: 'missing_params', message: 'owner, repo, and prNumber are required' };
      const result = await GitHubService.mergePR(userId, owner, repo, Number(input.prNumber), {
        commitTitle: String(input.commitTitle || ''),
        commitMessage: String(input.commitMessage || ''),
        method: String(input.method || 'squash') as 'merge' | 'squash' | 'rebase',
      });
      return result;
    }
    case 'get_file': {
      if (!owner || !repo || !input.path) return { error: 'missing_params', message: 'owner, repo, and path are required' };
      const file = await GitHubService.getFile(userId, owner, repo, String(input.path), input.ref ? String(input.ref) : undefined);
      return file ? { ok: true, content: file.content, sha: file.sha } : { ok: false, error: 'file_not_found' };
    }
    case 'create_or_update_file': {
      if (!owner || !repo || !input.path || !input.content || !input.branch) return { error: 'missing_params', message: 'owner, repo, path, content, and branch are required' };
      const result = await GitHubService.createOrUpdateFile(userId, owner, repo, {
        path: String(input.path),
        message: String(input.message || `Update ${input.path}`),
        content: String(input.content),
        branch: String(input.branch),
        sha: input.sha ? String(input.sha) : undefined,
      });
      return result;
    }
    case 'create_branch': {
      if (!owner || !repo || !input.branchName) return { error: 'missing_params', message: 'owner, repo, and branchName are required' };
      const result = await GitHubService.createBranch(userId, owner, repo, String(input.branchName), String(input.fromBranch || 'main'));
      return result;
    }
    case 'list_branches': {
      if (!owner || !repo) return { error: 'missing_params', message: 'owner and repo are required' };
      const branches = await GitHubService.listBranches(userId, owner, repo);
      return { ok: true, branches, count: branches.length };
    }
    case 'status': {
      return { ok: true, connected: true, username };
    }
    default:
      return {
        error: 'unknown_action',
        message: `Unknown GitHub action: ${action}`,
        supportedActions: ['list_repos', 'list_issues', 'get_issue', 'create_issue', 'list_prs', 'get_pr', 'create_pr', 'merge_pr', 'get_file', 'create_or_update_file', 'create_branch', 'list_branches', 'status'],
      };
  }
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

const analyticsExecutor: ToolExecutor = withErrorHandling('analytics', async (input, context) => {
  const action = asStr(input.action) || 'stats';
  switch (action) {
    case 'stats': {
      const stats = await AnalyticsService.getDashboardStats(context.organizationId);
      return { stats } as Record<string, unknown>;
    }
    case 'kpis': {
      const kpis = await AnalyticsService.getKPIs(context.organizationId);
      return { kpis } as Record<string, unknown>;
    }
    case 'trend': {
      const metric = asStr(input.metric) as 'tasks_completed' | 'goals_progress' | 'agent_executions' | 'projects_active' | 'revenue';
      if (!metric) return { error: 'missing_params', message: 'metric is required' };
      const trend = await AnalyticsService.getTrend(
        context.organizationId,
        metric,
        { granularity: (asStr(input.granularity) || 'day') as 'day' | 'week' | 'month' },
      );
      return { trend } as Record<string, unknown>;
    }
    case 'list_dashboards': {
      const dashboards = await AnalyticsService.listDashboards(context.organizationId);
      return { dashboards, count: dashboards.length } as Record<string, unknown>;
    }
    case 'get_dashboard': {
      const dashboardId = asStr(input.dashboardId);
      if (!dashboardId) return { error: 'missing_params', message: 'dashboardId is required' };
      const dashboard = await AnalyticsService.getDashboard(dashboardId);
      return dashboard ? { dashboard } as Record<string, unknown> : { error: 'not_found' };
    }
    default:
      return { error: 'unknown_action', message: `Unknown analytics action: ${action}`, supportedActions: ['stats', 'kpis', 'trend', 'list_dashboards', 'get_dashboard'] };
  }
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

const emailExecutor: ToolExecutor = withErrorHandling('email', async (input, context) => {
  const action = asStr(input.action) || 'send';
  switch (action) {
    case 'send': {
      const to = asStr(input.to);
      const subject = asStr(input.subject);
      if (!to || !subject) return { error: 'missing_params', message: 'to and subject are required' };
      const result = await CompanyEmailService.send({
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        email: {
          to,
          subject,
          body: asStr(input.body) || '',
          fromName: asStr(input.fromName),
          replyTo: asStr(input.replyTo),
        },
      });
      return result as unknown as Record<string, unknown>;
    }
    default:
      return { error: 'unknown_action', message: `Unknown email action: ${action}`, supportedActions: ['send'] };
  }
});

const calendarExecutor: ToolExecutor = withErrorHandling('calendar', async (input, context) => {
  const action = asStr(input.action) || 'list';
  switch (action) {
    case 'list': {
      const events = await CalendarService.list(context.organizationId, {
        limit: asNum(input.limit) || 50,
      });
      return { events, count: events.length };
    }
    case 'get': {
      const eventId = asStr(input.eventId);
      if (!eventId) return { error: 'missing_params', message: 'eventId is required' };
      const event = await CalendarService.get(eventId);
      return event ? { event } : { error: 'not_found' };
    }
    case 'create': {
      const title = asStr(input.title);
      const startStr = asStr(input.start);
      if (!title || !startStr) return { error: 'missing_params', message: 'title and start are required' };
      const event = await CalendarService.create(context.organizationId, {
        title,
        description: asStr(input.description),
        type: asStr(input.type) || 'meeting',
        startDate: new Date(startStr),
        endDate: new Date(asStr(input.end) || startStr),
        location: asStr(input.location),
        organizerId: asStr(input.organizerId) || context.userId || 'system',
      });
      return { event };
    }
    case 'update': {
      const eventId = asStr(input.eventId);
      if (!eventId) return { error: 'missing_params', message: 'eventId is required' };
      const updateInput: Record<string, unknown> = {};
      if (asStr(input.title)) updateInput.title = asStr(input.title);
      if (asStr(input.description)) updateInput.description = asStr(input.description);
      if (asStr(input.location)) updateInput.location = asStr(input.location);
      if (asStr(input.start)) updateInput.startDate = new Date(asStr(input.start)!);
      if (asStr(input.end)) updateInput.endDate = new Date(asStr(input.end)!);
      const event = await CalendarService.update(eventId, updateInput as never);
      return event ? { event } : { error: 'not_found' };
    }
    case 'delete': {
      const eventId = asStr(input.eventId);
      if (!eventId) return { error: 'missing_params', message: 'eventId is required' };
      await CalendarService.delete(eventId);
      return { ok: true };
    }
    case 'upcoming': {
      const events = await CalendarService.getUpcoming(context.organizationId, {
        limit: asNum(input.limit) || 10,
      });
      return { events, count: events.length };
    }
    default:
      return { error: 'unknown_action', message: `Unknown calendar action: ${action}`, supportedActions: ['list', 'get', 'create', 'update', 'delete', 'upcoming'] };
  }
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
  const action = asStr(input.action) || 'prompt_injection';
  switch (action) {
    case 'prompt_injection': {
      const text = asStr(input.text);
      if (!text) return { error: 'missing_params', message: 'text is required' };
      const patterns = (detectPromptInjection(text) as { patterns: string[] }).patterns;
      return { ok: true, patterns, flagged: patterns.length > 0 };
    }
    case 'url_safety': {
      const url = asStr(input.url);
      if (!url) return { error: 'missing_params', message: 'url is required' };
      return { ok: true, safe: isUrlSafe(url) };
    }
    default:
      return { error: 'unknown_action', message: `Unknown security_scan action: ${action}`, supportedActions: ['prompt_injection', 'url_safety'] };
  }
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
