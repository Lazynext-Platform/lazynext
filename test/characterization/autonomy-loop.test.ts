import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup — autonomy loop characterization tests
// Mocks prisma, atlas, and the supporting services so we can characterize the
// planner, plan lifecycle, memory, tool registry, and context engine.
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Prisma mock (memory-backed) ──
type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; include?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type FindFirstArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type UpdateManyArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memUpdateManyImpl: (args: UpdateManyArgs) => Promise<{ count: number }> = async () => ({ count: 0 });

let goalFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let projectFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => ({ id: 'proj-1' });
let projectCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({ id: 'proj-1' });
let taskCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({ id: 'task-1' });
let membershipFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => ({ userId: 'user-1' });

let planFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let planFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let planCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({ id: 'plan-1' });
let planUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});

let toolDefFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let toolDefFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let toolDefFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => null;
let toolDefCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let toolDefUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});

let toolCallCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({ id: 'tc-1' });
let toolCallUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let toolCallFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    updateMany: (args: UpdateManyArgs): Promise<{ count: number }> => { calls.push({ method: 'memory.updateMany', args }); return memUpdateManyImpl(args); },
  },
  goal: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'goal.findUnique', args }); return goalFindUniqueImpl(args); },
  },
  project: {
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'project.findFirst', args }); return projectFindFirstImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'project.create', args }); return projectCreateImpl(args); },
  },
  task: {
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'task.create', args }); return taskCreateImpl(args); },
  },
  membership: {
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'membership.findFirst', args }); return membershipFindFirstImpl(args); },
  },
  plan: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'plan.findMany', args }); return planFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'plan.findUnique', args }); return planFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'plan.create', args }); return planCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'plan.update', args }); return planUpdateImpl(args); },
  },
  toolDef: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'toolDef.findMany', args }); return toolDefFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'toolDef.findUnique', args }); return toolDefFindUniqueImpl(args); },
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'toolDef.findFirst', args }); return toolDefFindFirstImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'toolDef.create', args }); return toolDefCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'toolDef.update', args }); return toolDefUpdateImpl(args); },
  },
  toolCall: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'toolCall.findMany', args }); return toolCallFindManyImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'toolCall.create', args }); return toolCallCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'toolCall.update', args }); return toolCallUpdateImpl(args); },
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

// Mock atlasChat
let atlasChatImpl: (messages: unknown[], model?: string, maxTokens?: number, timeoutMs?: number) => Promise<string> =
  async () => '{"title":"Test Plan","reasoning":"Because","priority":"medium","riskLevel":"low","estimatedCost":10,"tasks":[{"title":"Task 1","description":"Do thing 1","priority":"high","estimatedCost":5,"riskLevel":"low","agentRole":"engineering"}]}';

mock.module('@/lib/atlas', {
  namedExports: {
    atlasChat: (messages: unknown[], model?: string, maxTokens?: number, timeoutMs?: number): Promise<string> => {
      calls.push({ method: 'atlasChat' });
      return atlasChatImpl(messages, model, maxTokens, timeoutMs);
    },
    DEFAULT_CHAT_MODEL: 'test-model',
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

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memUpdateManyImpl = async () => ({ count: 0 });
  goalFindUniqueImpl = async () => null;
  projectFindFirstImpl = async () => ({ id: 'proj-1' });
  projectCreateImpl = async () => ({ id: 'proj-1' });
  taskCreateImpl = async () => ({ id: 'task-1' });
  membershipFindFirstImpl = async () => ({ userId: 'user-1' });
  planFindManyImpl = async () => [];
  planFindUniqueImpl = async () => null;
  planCreateImpl = async () => ({ id: 'plan-1' });
  planUpdateImpl = async () => ({});
  toolDefFindManyImpl = async () => [];
  toolDefFindUniqueImpl = async () => null;
  toolDefFindFirstImpl = async () => null;
  toolDefCreateImpl = async () => ({});
  toolDefUpdateImpl = async () => ({});
  toolCallCreateImpl = async () => ({ id: 'tc-1' });
  toolCallUpdateImpl = async () => ({});
  toolCallFindManyImpl = async () => [];
  atlasChatImpl = async () => '{"title":"Test Plan","reasoning":"Because","priority":"medium","riskLevel":"low","estimatedCost":10,"tasks":[{"title":"Task 1","description":"Do thing 1","priority":"high","estimatedCost":5,"riskLevel":"low","agentRole":"engineering"}]}';
}

const { Planner } = await import('@/lib/services/planner');
const { PlanService } = await import('@/lib/services/plan');
const { MemoryService } = await import('@/lib/services/memory');
const { ToolRegistryService, ToolCallService } = await import('@/lib/services/tool-registry');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Planner can create plans
// ─────────────────────────────────────────────────────────────────────────────

describe('Autonomy Loop — characterization (Planner)', () => {
  beforeEach(() => resetMock());

  it('creates a plan with tasks from the LLM response', async () => {
    planCreateImpl = async (args: CreateArgs) => ({ id: 'plan-1', ...args.data });
    projectFindFirstImpl = async () => ({ id: 'proj-1' });

    const result = await Planner.plan({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      objective: 'Launch a new product',
      createdById: 'user-1',
    });

    assert.equal(result.planId, 'plan-1');
    assert.equal(result.title, 'Test Plan');
    assert.equal(result.reasoning, 'Because');
    assert.equal(result.estimatedCost, 10);
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].title, 'Task 1');
    assert.equal(result.tasks[0].agentRole, 'engineering');

    const taskCreateCalls = calls.filter((c) => c.method === 'task.create');
    assert.equal(taskCreateCalls.length, 1);
  });

  it('loads the goal when goalId is provided', async () => {
    goalFindUniqueImpl = async () => ({ title: 'Goal Title', description: 'Goal description' });
    planCreateImpl = async (args: CreateArgs) => ({ id: 'plan-1', ...args.data });
    projectFindFirstImpl = async () => ({ id: 'proj-1' });

    await Planner.plan({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      goalId: 'goal-1',
      objective: 'Achieve the goal',
    });

    const goalCalls = calls.filter((c) => c.method === 'goal.findUnique');
    assert.equal(goalCalls.length, 1);
  });

  it('creates a default project when none exists', async () => {
    projectFindFirstImpl = async () => null;
    projectCreateImpl = async (args: CreateArgs) => ({ id: 'proj-new', ...args.data });
    planCreateImpl = async (args: CreateArgs) => ({ id: 'plan-1', ...args.data });

    await Planner.plan({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      objective: 'Do something',
    });

    const projectCreateCalls = calls.filter((c) => c.method === 'project.create');
    assert.equal(projectCreateCalls.length, 1);
  });

  it('records a planning decision to memory', async () => {
    planCreateImpl = async (args: CreateArgs) => ({ id: 'plan-1', ...args.data });
    projectFindFirstImpl = async () => ({ id: 'proj-1' });

    await Planner.plan({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      objective: 'Do something',
    });

    const memoryCreateCalls = calls.filter((c) => c.method === 'memory.create');
    assert.ok(memoryCreateCalls.length >= 1);
  });

  it('throws when the LLM call fails', async () => {
    atlasChatImpl = async () => { throw new Error('LLM unavailable'); };

    await assert.rejects(
      () => Planner.plan({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        objective: 'Do something',
      }),
      /Planner LLM call failed/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Plans can be started and completed
// ─────────────────────────────────────────────────────────────────────────────

describe('Autonomy Loop — characterization (Plan lifecycle)', () => {
  beforeEach(() => resetMock());

  it('creates a plan with the given fields', async () => {
    planCreateImpl = async (args: CreateArgs) => ({ id: 'plan-1', ...args.data });

    const result = await PlanService.create({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      title: 'My Plan',
      objective: 'Achieve X',
      priority: 'high',
      riskLevel: 'medium',
      estimatedCost: 50,
      createdById: 'user-1',
    });

    assert.ok(result);
    assert.equal(result.id, 'plan-1');
    assert.equal(calls.filter((c) => c.method === 'plan.create').length, 1);
  });

  it('gets a plan by id', async () => {
    planFindUniqueImpl = async () => ({ id: 'plan-1', title: 'My Plan', status: 'draft' });

    const result = await PlanService.get('plan-1');
    assert.ok(result);
    assert.equal(result!.id, 'plan-1');
  });

  it('lists plans for a workspace', async () => {
    planFindManyImpl = async () => [
      { id: 'plan-1', title: 'Plan A', status: 'active' },
      { id: 'plan-2', title: 'Plan B', status: 'completed' },
    ];

    const list = await PlanService.list('ws-1');
    assert.equal(list.length, 2);
  });

  it('updates a plan status to active (started)', async () => {
    planUpdateImpl = async (args: UpdateArgs) => ({ id: 'plan-1', ...args.data });

    const result = await PlanService.update('plan-1', { status: 'active' });
    assert.ok(result);
    assert.equal(calls.filter((c) => c.method === 'plan.update').length, 1);
  });

  it('updates a plan status to completed', async () => {
    planUpdateImpl = async (args: UpdateArgs) => ({ id: 'plan-1', status: 'completed' });

    const result = await PlanService.update('plan-1', { status: 'completed' });
    assert.ok(result);
  });

  it('approves a plan (sets status to active with approver)', async () => {
    planUpdateImpl = async (args: UpdateArgs) => {
      assert.equal(args.data.status, 'active');
      assert.equal(args.data.approvedById, 'user-1');
      assert.ok(args.data.approvedAt);
      return { id: 'plan-1', status: 'active' };
    };

    const result = await PlanService.approve('plan-1', 'user-1');
    assert.ok(result);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Memory service can store and retrieve facts
// ─────────────────────────────────────────────────────────────────────────────

describe('Autonomy Loop — characterization (Memory)', () => {
  beforeEach(() => resetMock());

  it('stores a fact in memory', async () => {
    memCreateImpl = async (args: CreateArgs) => {
      assert.equal(args.data.type, 'fact');
      assert.equal(args.data.content, 'Company was founded in 2028');
      return { id: 'mem-1', ...args.data };
    };

    const result = await MemoryService.create({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      type: 'fact',
      content: 'Company was founded in 2028',
      confidence: 0.9,
      lifecycle: 'permanent',
      tags: ['history'],
      createdBy: 'user-1',
    });

    assert.ok(result);
    assert.equal(calls.filter((c) => c.method === 'memory.create').length, 1);
  });

  it('retrieves a fact by id', async () => {
    memFindUniqueImpl = async () => ({
      id: 'mem-1', type: 'fact', content: 'Company was founded in 2028', confidence: 0.9,
    });

    const result = await MemoryService.get('mem-1');
    assert.ok(result);
    assert.equal(result!.id, 'mem-1');
    assert.equal(result!.type, 'fact');
  });

  it('lists memories by workspace', async () => {
    memFindManyImpl = async () => [
      { id: 'mem-1', type: 'fact', content: 'Fact 1', confidence: 0.9 },
      { id: 'mem-2', type: 'decision', content: 'Decision 1', confidence: 0.8 },
    ];

    const list = await MemoryService.list('ws-1');
    assert.equal(list.length, 2);
  });

  it('verifies a memory (sets confidence to 1.0)', async () => {
    memUpdateImpl = async (args: UpdateArgs) => {
      assert.equal(args.data.verifiedBy, 'user-1');
      assert.equal(args.data.confidence, 1.0);
      return { id: 'mem-1', confidence: 1.0 };
    };

    const result = await MemoryService.verify('mem-1', 'user-1');
    assert.equal(result.confidence, 1.0);
  });

  it('assembles context for an agent run', async () => {
    memFindManyImpl = async () => [
      { id: 'mem-1', type: 'active_context', content: 'Current priority: launch v2', confidence: 1.0 },
      { id: 'mem-2', type: 'fact', content: 'Company uses Atlas Cloud', confidence: 0.9 },
    ];

    const result = await MemoryService.assembleContext({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      objective: 'Launch v2',
      maxMemories: 10,
    });

    assert.ok(result.memories);
    assert.equal(result.memories.length, 2);
    assert.ok(result.summary.includes('2 memories'));
  });

  it('expires stale memories', async () => {
    memUpdateManyImpl = async () => ({ count: 5 });

    const count = await MemoryService.expireStale();
    assert.equal(count, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Tool registry can register and list tools
// ─────────────────────────────────────────────────────────────────────────────

describe('Autonomy Loop — characterization (Tool Registry)', () => {
  beforeEach(() => resetMock());

  it('registers a new tool', async () => {
    toolDefCreateImpl = async (args: CreateArgs) => ({ id: 'tool-1', ...args.data });

    const result = await ToolRegistryService.register({
      workspaceId: 'ws-1',
      name: 'web_search',
      description: 'Search the web',
      riskCategory: 'low',
      budgetCategory: 'credits',
    });

    assert.ok(result);
    assert.equal(calls.filter((c) => c.method === 'toolDef.create').length, 1);
  });

  it('lists tools for a workspace', async () => {
    toolDefFindManyImpl = async () => [
      { id: 'tool-1', name: 'web_search', enabled: true, riskCategory: 'low' },
      { id: 'tool-2', name: 'send_email', enabled: true, riskCategory: 'medium' },
    ];

    const list = await ToolRegistryService.list('ws-1');
    assert.equal(list.length, 2);
  });

  it('lists only enabled tools when filter is set', async () => {
    toolDefFindManyImpl = async (args: FindManyArgs) => {
      const where = args.where as Record<string, unknown>;
      assert.equal(where.enabled, true);
      return [{ id: 'tool-1', name: 'web_search', enabled: true }];
    };

    const list = await ToolRegistryService.list('ws-1', { enabled: true });
    assert.equal(list.length, 1);
  });

  it('gets a tool by name', async () => {
    toolDefFindFirstImpl = async () => ({
      id: 'tool-1', name: 'web_search', enabled: true, allowedAgents: '[]',
    });

    const result = await ToolRegistryService.getByName('ws-1', 'web_search');
    assert.ok(result);
    assert.equal(result!.name, 'web_search');
  });

  it('returns null when tool not found by name', async () => {
    toolDefFindFirstImpl = async () => null;

    const result = await ToolRegistryService.getByName('ws-1', 'nope');
    assert.equal(result, null);
  });

  it('checks that an agent is allowed to use a tool (empty allowedAgents = all allowed)', async () => {
    toolDefFindUniqueImpl = async () => ({
      id: 'tool-1', name: 'web_search', enabled: true, allowedAgents: '[]',
    });

    const allowed = await ToolRegistryService.checkAgentAllowed('tool-1', 'custom');
    assert.equal(allowed, true);
  });

  it('checks that an agent is allowed when role is in allowedAgents', async () => {
    toolDefFindUniqueImpl = async () => ({
      id: 'tool-1', name: 'web_search', enabled: true, allowedAgents: JSON.stringify(['engineering', 'custom']),
    });

    const allowed = await ToolRegistryService.checkAgentAllowed('tool-1', 'custom');
    assert.equal(allowed, true);
  });

  it('checks that an agent is denied when role is not in allowedAgents', async () => {
    toolDefFindUniqueImpl = async () => ({
      id: 'tool-1', name: 'web_search', enabled: true, allowedAgents: JSON.stringify(['engineering']),
    });

    const allowed = await ToolRegistryService.checkAgentAllowed('tool-1', 'custom');
    assert.equal(allowed, false);
  });

  it('updates a tool definition', async () => {
    toolDefUpdateImpl = async (args: UpdateArgs) => ({ id: 'tool-1', ...args.data });

    const result = await ToolRegistryService.update('tool-1', { enabled: false });
    assert.ok(result);
    assert.equal(calls.filter((c) => c.method === 'toolDef.update').length, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Tool Call Service (audit trail)
// ─────────────────────────────────────────────────────────────────────────────

describe('Autonomy Loop — characterization (Tool Call Service)', () => {
  beforeEach(() => resetMock());

  it('starts a tool call (records the input)', async () => {
    toolCallCreateImpl = async (args: CreateArgs) => {
      assert.equal(args.data.toolDefId, 'tool-1');
      assert.equal(args.data.status, 'running');
      return { id: 'tc-1', ...args.data };
    };

    const result = await ToolCallService.start({
      workspaceId: 'ws-1',
      agentRunId: 'run-1',
      toolDefId: 'tool-1',
      input: { query: 'test' },
    });

    assert.ok(result);
    assert.equal(result.id, 'tc-1');
  });

  it('completes a tool call with output and cost', async () => {
    toolCallUpdateImpl = async (args: UpdateArgs) => {
      assert.equal(args.data.status, 'completed');
      assert.equal(args.data.costCredits, 5);
      return { id: 'tc-1', status: 'completed' };
    };

    const result = await ToolCallService.complete('tc-1', { result: 'done' }, 5);
    assert.ok(result);
  });

  it('fails a tool call with an error message', async () => {
    toolCallUpdateImpl = async (args: UpdateArgs) => {
      assert.equal(args.data.status, 'failed');
      assert.equal(args.data.error, 'Connection refused');
      return { id: 'tc-1', status: 'failed' };
    };

    const result = await ToolCallService.fail('tc-1', 'Connection refused');
    assert.ok(result);
  });

  it('lists tool calls for a workspace', async () => {
    toolCallFindManyImpl = async () => [
      { id: 'tc-1', status: 'completed', toolDef: { name: 'web_search', riskCategory: 'low' } },
    ];

    const list = await ToolCallService.list('ws-1');
    assert.equal(list.length, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Context engine can assemble context
// ─────────────────────────────────────────────────────────────────────────────

describe('Autonomy Loop — characterization (Context Engine)', () => {
  beforeEach(() => resetMock());

  it('assembles context with active_context, facts, and decisions', async () => {
    memFindManyImpl = async () => [
      { id: 'mem-1', type: 'active_context', content: 'Current priority: launch v2', confidence: 1.0 },
      { id: 'mem-2', type: 'fact', content: 'Company uses Atlas Cloud', confidence: 0.9 },
      { id: 'mem-3', type: 'decision', content: 'Chose D1 over Postgres', confidence: 0.8 },
    ];

    const result = await MemoryService.assembleContext({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      objective: 'Launch v2',
      maxMemories: 20,
    });

    assert.equal(result.memories.length, 3);
    assert.ok(result.summary.includes('3 memories'));
  });

  it('returns empty context when no memories exist', async () => {
    memFindManyImpl = async () => [];

    const result = await MemoryService.assembleContext({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
    });

    assert.equal(result.memories.length, 0);
    assert.ok(result.summary.includes('0 memories'));
  });

  it('respects maxMemories limit', async () => {
    memFindManyImpl = async (args: FindManyArgs) => {
      assert.equal(args.take, 5);
      return [
        { id: 'mem-1', type: 'fact', content: 'Fact 1', confidence: 0.9 },
      ];
    };

    const result = await MemoryService.assembleContext({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      maxMemories: 5,
    });

    assert.ok(result.memories.length <= 5);
  });

  it('uses default maxMemories of 20 when not specified', async () => {
    memFindManyImpl = async (args: FindManyArgs) => {
      assert.equal(args.take, 20);
      return [];
    };

    await MemoryService.assembleContext({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
    });
  });
});
