import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup — agent runtime characterization tests
// Mocks the LLM, budget, approval, tool registry, memory, and event services
// so we can characterize the runtime's tool-call gating behavior in isolation.
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type AgentDefFindUniqueArgs = { where: { id: string } };
type AgentRunCreateArgs = { data: Record<string, unknown> };
type AgentRunUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type AgentRunFindFirstArgs = { where: Record<string, unknown> };
type AgentRunFindUniqueArgs = { where: { id: string } };

let agentDefFindUniqueImpl: (args: AgentDefFindUniqueArgs) => Promise<unknown> = async () => null;
let agentRunCreateImpl: (args: AgentRunCreateArgs) => Promise<unknown> = async () => ({ id: 'run-1' });
let agentRunUpdateImpl: (args: AgentRunUpdateArgs) => Promise<unknown> = async () => ({});
let agentRunFindFirstImpl: (args: AgentRunFindFirstArgs) => Promise<unknown> = async () => null;
let agentRunFindUniqueImpl: (args: AgentRunFindUniqueArgs) => Promise<unknown> = async () => null;

const prismaMock = {
  agentDef: {
    findUnique: (args: AgentDefFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'agentDef.findUnique', args });
      return agentDefFindUniqueImpl(args);
    },
  },
  agentRun: {
    create: (args: AgentRunCreateArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.create', args });
      return agentRunCreateImpl(args);
    },
    update: (args: AgentRunUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.update', args });
      return agentRunUpdateImpl(args);
    },
    findFirst: (args: AgentRunFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.findFirst', args });
      return agentRunFindFirstImpl(args);
    },
    findUnique: (args: AgentRunFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.findUnique', args });
      return agentRunFindUniqueImpl(args);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

// Mock atlasChat — default returns a plain response (no tool calls)
let atlasChatImpl: (messages: unknown[], model: string, maxTokens: number, timeoutMs: number) => Promise<string> =
  async () => 'I have completed the task.';

mock.module('@/lib/atlas', {
  namedExports: {
    atlasChat: (messages: unknown[], model: string, maxTokens: number, timeoutMs: number): Promise<string> => {
      calls.push({ method: 'atlasChat', args: { model, maxTokens } });
      return atlasChatImpl(messages, model, maxTokens, timeoutMs);
    },
    DEFAULT_CHAT_MODEL: 'test-model',
  },
});

// Mock MemoryService
mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
      create: async () => ({ id: 'mem-1' }),
      createEpisodic: async () => ({ id: 'epi-1' }),
      listEpisodic: async () => [],
    },
  },
});

// Mock EventService
mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: async (input: Record<string, unknown>) => {
        calls.push({ method: 'EventService.emit', args: input });
        return { id: 'evt-1' };
      },
    },
  },
});

// Mock BudgetService — trackable so we can assert budget checks and spend recording
let budgetCheckImpl: (input: Record<string, unknown>) => Promise<unknown> =
  async () => ({ allowed: true, remainingCredits: Infinity, remainingUsd: Infinity });
let budgetRecordSpendImpl: (input: Record<string, unknown>) => Promise<unknown> =
  async () => ({ id: 'be-1' });

mock.module('@/lib/services/budget', {
  namedExports: {
    BudgetService: {
      check: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'BudgetService.check', args: input });
        return budgetCheckImpl(input);
      },
      recordSpend: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'BudgetService.recordSpend', args: input });
        return budgetRecordSpendImpl(input);
      },
    },
  },
});

// Mock ApprovalService — trackable so we can assert approval requests for high-risk tools
let approvalRequestImpl: (input: Record<string, unknown>) => Promise<unknown> =
  async () => ({ id: 'apr-1', status: 'pending' });

mock.module('@/lib/services/approval', {
  namedExports: {
    ApprovalService: {
      request: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'ApprovalService.request', args: input });
        return approvalRequestImpl(input);
      },
    },
  },
});

// Mock ToolRegistryService — trackable so we can control tool definitions
let toolGetByNameImpl: (workspaceId: string, name: string) => Promise<unknown> = async () => null;
let toolGetImpl: (toolId: string) => Promise<unknown> = async () => null;
let toolCheckAgentAllowedImpl: (toolId: string, agentRole: string) => Promise<boolean> = async () => true;

mock.module('@/lib/services/tool-registry', {
  namedExports: {
    ToolRegistryService: {
      getByName: (workspaceId: string, name: string): Promise<unknown> => {
        calls.push({ method: 'ToolRegistryService.getByName', args: { workspaceId, name } });
        return toolGetByNameImpl(workspaceId, name);
      },
      get: (toolId: string): Promise<unknown> => {
        calls.push({ method: 'ToolRegistryService.get', args: { toolId } });
        return toolGetImpl(toolId);
      },
      checkAgentAllowed: (toolId: string, agentRole: string): Promise<boolean> => {
        calls.push({ method: 'ToolRegistryService.checkAgentAllowed', args: { toolId, agentRole } });
        return toolCheckAgentAllowedImpl(toolId, agentRole);
      },
    },
    ToolCallService: {
      start: (input: Record<string, unknown>) => {
        calls.push({ method: 'ToolCallService.start', args: input });
        return Promise.resolve({ id: 'tc-1' });
      },
      complete: (toolCallId: string, output: Record<string, unknown>, costCredits: number) => {
        calls.push({ method: 'ToolCallService.complete', args: { toolCallId, costCredits } });
        return Promise.resolve({});
      },
      fail: (toolCallId: string, error: string) => {
        calls.push({ method: 'ToolCallService.fail', args: { toolCallId, error } });
        return Promise.resolve({});
      },
    },
  },
});

// Mock PermissionEvaluator — always allow so characterization tests focus on legacy behavior
mock.module('@/lib/services/permission-evaluator', {
  namedExports: {
    PermissionEvaluator: {
      checkPermission: async () => ({
        decision: 'allow',
        reason: 'mocked allow',
        layers: [],
        evaluatedAt: new Date(),
      }),
      recordDecision: async () => {},
    },
  },
});

// Mock AutonomyLoopService — no-op for characterization tests
mock.module('@/lib/services/autonomy-loop', {
  namedExports: {
    AutonomyLoopService: {
      createLoop: async () => ({ agentId: 'agent-1', currentState: 'idle', mode: 'manual', iteration: 0, lastStateChange: new Date(), paused: false, stopped: false }),
      runIteration: async () => ({ agentId: 'agent-1', currentState: 'idle', mode: 'manual', iteration: 0, lastStateChange: new Date(), paused: false, stopped: false }),
      getLoopState: async () => null,
      pause: async () => null,
      resume: async () => null,
      stop: async () => null,
    },
  },
});

// Mock agent-roles — return empty for unknown roles so legacy behavior is preserved
mock.module('@/lib/services/agent-roles', {
  namedExports: {
    getRoleDefinition: () => null,
    getSystemPromptForRole: () => '',
    getToolsForRole: () => [],
    getAllRoles: () => [],
    AgentRoleDefinitions: {},
  },
});

const { AgentRuntime, registerToolExecutor, unregisterToolExecutor } = await import('@/lib/services/agent-runtime');

function makeAgent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    role: 'custom',
    enabled: true,
    instructions: 'You are a test agent.',
    modelName: 'test-model',
    capabilities: '[]',
    verificationPolicy: '{}',
    timeoutSec: 30,
    ...overrides,
  };
}

function makeToolDef(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'tool-1',
    workspaceId: 'ws-1',
    name: 'web_search',
    enabled: true,
    riskCategory: 'low',
    budgetCategory: 'none',
    timeoutSec: 30,
    allowedAgents: '[]',
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  agentDefFindUniqueImpl = async () => null;
  agentRunCreateImpl = async () => ({ id: 'run-1' });
  agentRunUpdateImpl = async () => ({});
  agentRunFindFirstImpl = async () => null;
  agentRunFindUniqueImpl = async () => null;
  atlasChatImpl = async () => 'I have completed the task.';
  budgetCheckImpl = async () => ({ allowed: true, remainingCredits: Infinity, remainingUsd: Infinity });
  budgetRecordSpendImpl = async () => ({ id: 'be-1' });
  approvalRequestImpl = async () => ({ id: 'apr-1', status: 'pending' });
  toolGetByNameImpl = async () => null;
  toolGetImpl = async () => null;
  toolCheckAgentAllowedImpl = async () => true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests — AgentRunInput → AgentRunResult
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentRuntime — characterization (AgentRunInput → AgentRunResult)', () => {
  beforeEach(() => resetMock());

  it('produces a completed AgentRunResult for a successful run', async () => {
    agentDefFindUniqueImpl = async () => makeAgent();
    agentRunCreateImpl = async () => ({ id: 'run-1' });
    atlasChatImpl = async () => 'Task completed successfully.';

    const result = await AgentRuntime.run({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      objective: 'Do something',
    });

    assert.equal(result.id, 'run-1');
    assert.equal(result.status, 'completed');
    assert.ok(result.output);
    assert.ok((result.output as Record<string, unknown>).response);
    assert.equal(result.toolCalls.length, 0);
    assert.ok(result.tokensUsed > 0);
  });

  it('produces a failed AgentRunResult when the agent is not found', async () => {
    agentDefFindUniqueImpl = async () => null;

    const result = await AgentRuntime.run({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentId: 'nonexistent',
      objective: 'Do something',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'Agent not found or disabled');
    assert.equal(result.output, null);
    assert.equal(result.toolCalls.length, 0);
  });

  it('produces a failed AgentRunResult when the LLM call throws', async () => {
    agentDefFindUniqueImpl = async () => makeAgent();
    agentRunCreateImpl = async () => ({ id: 'run-1' });
    atlasChatImpl = async () => { throw new Error('LLM unavailable'); };

    const result = await AgentRuntime.run({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      objective: 'Do something',
    });

    assert.equal(result.status, 'failed');
    assert.ok(result.error?.includes('LLM call failed'));
  });

  it('returns existing run when idempotency key matches a completed run', async () => {
    agentDefFindUniqueImpl = async () => makeAgent();
    agentRunFindFirstImpl = async () => ({
      id: 'existing-run',
      status: 'completed',
      output: '{"result":"done"}',
      toolCalls: '[]',
      tokensUsed: 100,
      costCredits: 5,
      verification: null,
    });

    const result = await AgentRuntime.run({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      objective: 'Do something',
      idempotencyKey: 'key-123',
    });

    assert.equal(result.id, 'existing-run');
    assert.equal(result.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — tool calls checked against budget before execution
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentRuntime — characterization (budget checks before tool execution)', () => {
  beforeEach(() => resetMock());

  it('checks the budget before executing a tool call', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'credits' });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'web_search',
      toolInput: { query: 'test' },
      correlationId: 'corr-1',
    });

    const budgetChecks = calls.filter((c) => c.method === 'BudgetService.check');
    assert.equal(budgetChecks.length, 1);
    assert.equal(result.status, 'completed');
  });

  it('fails the tool call when budget check returns allowed=false', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'credits' });
    budgetCheckImpl = async () => ({ allowed: false, reason: 'Budget exceeded', budgetId: 'b-1', remainingCredits: 0, remainingUsd: 0 });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'web_search',
      toolInput: { query: 'test' },
      correlationId: 'corr-1',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.costCredits, 0);
    // No tool call should have been started
    const starts = calls.filter((c) => c.method === 'ToolCallService.start');
    assert.equal(starts.length, 0);
  });

  it('fails the tool call when the tool definition is not found', async () => {
    toolGetByNameImpl = async () => null;

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'missing_tool',
      toolInput: {},
      correlationId: 'corr-1',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.costCredits, 0);
  });

  it('fails the tool call when the agent role is not allowed', async () => {
    toolGetByNameImpl = async () => makeToolDef();
    toolCheckAgentAllowedImpl = async () => false;

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'web_search',
      toolInput: {},
      correlationId: 'corr-1',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.costCredits, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — high-risk tools trigger approval requests
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentRuntime — characterization (high-risk tools trigger approval)', () => {
  beforeEach(() => resetMock());

  it('requests approval for high-risk tools and marks approved=false', async () => {
    toolGetByNameImpl = async () => makeToolDef({ riskCategory: 'high', budgetCategory: 'credits' });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'deploy_code',
      toolInput: { target: 'prod' },
      correlationId: 'corr-1',
    });

    const approvalRequests = calls.filter((c) => c.method === 'ApprovalService.request');
    assert.equal(approvalRequests.length, 1);
    assert.equal(result.status, 'completed');
    assert.equal(result.approved, false);
  });

  it('does not request approval for low-risk tools', async () => {
    toolGetByNameImpl = async () => makeToolDef({ riskCategory: 'low', budgetCategory: 'credits' });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'web_search',
      toolInput: { query: 'test' },
      correlationId: 'corr-1',
    });

    const approvalRequests = calls.filter((c) => c.method === 'ApprovalService.request');
    assert.equal(approvalRequests.length, 0);
    assert.equal(result.approved, true);
  });

  it('does not request approval for medium-risk tools', async () => {
    toolGetByNameImpl = async () => makeToolDef({ riskCategory: 'medium', budgetCategory: 'credits' });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'send_email',
      toolInput: { to: 'user@example.com' },
      correlationId: 'corr-1',
    });

    const approvalRequests = calls.filter((c) => c.method === 'ApprovalService.request');
    assert.equal(approvalRequests.length, 0);
    assert.equal(result.approved, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — budget spend recorded after tool execution
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentRuntime — characterization (budget spend recorded after execution)', () => {
  beforeEach(() => resetMock());

  it('records budget spend after a successful tool call with credits', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'credits' });
    budgetCheckImpl = async () => ({ allowed: true, budgetId: 'b-1', remainingCredits: 100, remainingUsd: 0 });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'web_search',
      toolInput: { query: 'test' },
      correlationId: 'corr-1',
    });

    const spendCalls = calls.filter((c) => c.method === 'BudgetService.recordSpend');
    assert.equal(spendCalls.length, 1);
    assert.equal(result.status, 'completed');
    assert.equal(result.costCredits, 1);
  });

  it('does not record spend for tools with budgetCategory=none', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'none' });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'web_search',
      toolInput: { query: 'test' },
      correlationId: 'corr-1',
    });

    const spendCalls = calls.filter((c) => c.method === 'BudgetService.recordSpend');
    assert.equal(spendCalls.length, 0);
    assert.equal(result.costCredits, 0);
  });

  it('uses a registered tool executor when available', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'credits' });
    let executorCalled = false;
    registerToolExecutor('web_search', async (input) => {
      executorCalled = true;
      return { results: [input] };
    });

    try {
      const result = await AgentRuntime.executeToolCall({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        agentRunId: 'run-1',
        agentRole: 'custom',
        toolName: 'web_search',
        toolInput: { query: 'test' },
        correlationId: 'corr-1',
      });

      assert.equal(executorCalled, true);
      assert.equal(result.status, 'completed');
      assert.ok(result.output);
    } finally {
      unregisterToolExecutor('web_search');
    }
  });

  it('returns a dry-run response when no executor is registered', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'none' });

    const result = await AgentRuntime.executeToolCall({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentRole: 'custom',
      toolName: 'web_search',
      toolInput: { query: 'test' },
      correlationId: 'corr-1',
    });

    assert.equal(result.status, 'completed');
    assert.ok(result.output);
    assert.equal((result.output as Record<string, unknown>).dryRun, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — failed tool calls do not record spend
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentRuntime — characterization (failed tool calls do not record spend)', () => {
  beforeEach(() => resetMock());

  it('does not record spend when the tool executor throws', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'credits' });
    registerToolExecutor('web_search', async () => {
      throw new Error('Tool execution failed');
    });

    try {
      const result = await AgentRuntime.executeToolCall({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        agentRunId: 'run-1',
        agentRole: 'custom',
        toolName: 'web_search',
        toolInput: { query: 'test' },
        correlationId: 'corr-1',
      });

      assert.equal(result.status, 'failed');
      assert.equal(result.costCredits, 0);
      const spendCalls = calls.filter((c) => c.method === 'BudgetService.recordSpend');
      assert.equal(spendCalls.length, 0);
      const failCalls = calls.filter((c) => c.method === 'ToolCallService.fail');
      assert.equal(failCalls.length, 1);
    } finally {
      unregisterToolExecutor('web_search');
    }
  });

  it('records ToolCallService.fail with the error message', async () => {
    toolGetByNameImpl = async () => makeToolDef({ budgetCategory: 'credits' });
    registerToolExecutor('web_search', async () => {
      throw new Error('Connection refused');
    });

    try {
      await AgentRuntime.executeToolCall({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        agentRunId: 'run-1',
        agentRole: 'custom',
        toolName: 'web_search',
        toolInput: { query: 'test' },
        correlationId: 'corr-1',
      });

      const failCalls = calls.filter((c) => c.method === 'ToolCallService.fail');
      assert.equal(failCalls.length, 1);
      const args = failCalls[0].args as { toolCallId: string; error: string };
      assert.equal(args.error, 'Connection refused');
    } finally {
      unregisterToolExecutor('web_search');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — runtime handles errors gracefully
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentRuntime — characterization (graceful error handling)', () => {
  beforeEach(() => resetMock());

  it('returns a failed result when the LLM call fails during a run', async () => {
    agentDefFindUniqueImpl = async () => makeAgent();
    agentRunCreateImpl = async () => ({ id: 'run-1' });
    atlasChatImpl = async () => { throw new Error('Atlas timeout'); };

    const result = await AgentRuntime.run({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      objective: 'Do something',
    });

    assert.equal(result.status, 'failed');
    assert.ok(result.error?.includes('LLM call failed'));
    assert.equal(result.toolCalls.length, 0);
  });

  it('marks the run as failed in the database when execution throws', async () => {
    agentDefFindUniqueImpl = async () => makeAgent();
    agentRunCreateImpl = async () => ({ id: 'run-1' });
    atlasChatImpl = async () => { throw new Error('LLM down'); };

    let updatedData: Record<string, unknown> | null = null;
    agentRunUpdateImpl = async (args: AgentRunUpdateArgs) => {
      updatedData = args.data as Record<string, unknown>;
      return {};
    };

    await AgentRuntime.run({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      objective: 'Do something',
    });

    assert.ok(updatedData);
    assert.equal((updatedData as Record<string, unknown>).status, 'failed');
  });

  it('cancelRun updates the run status to cancelled', async () => {
    let updatedData: Record<string, unknown> | null = null;
    agentRunUpdateImpl = async (args: AgentRunUpdateArgs) => {
      updatedData = args.data as Record<string, unknown>;
      return {};
    };

    await AgentRuntime.cancelRun('run-1');
    assert.ok(updatedData);
    assert.equal((updatedData as Record<string, unknown>).status, 'cancelled');
  });

  it('resumeRun returns null when the run is not in a failed/retrying state', async () => {
    agentRunFindUniqueImpl = async () => ({ id: 'run-1', status: 'completed', agentId: 'agent-1', input: '{}', retryCount: 0 });

    const result = await AgentRuntime.resumeRun('run-1');
    assert.equal(result, null);
  });
});
