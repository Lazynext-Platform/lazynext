import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type ToolDefFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type ToolDefFindUniqueArgs = { where: Record<string, unknown> };
type ToolDefFindFirstArgs = { where: Record<string, unknown> };
type ToolDefCreateArgs = { data: Record<string, unknown> };
type ToolDefUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

type ToolCallFindManyArgs = { where: Record<string, unknown>; include?: unknown; orderBy?: unknown; take?: number };
type ToolCallCreateArgs = { data: Record<string, unknown> };
type ToolCallUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

let toolDefFindManyImpl: (args: ToolDefFindManyArgs) => Promise<unknown[]> = async () => [];
let toolDefFindUniqueImpl: (args: ToolDefFindUniqueArgs) => Promise<unknown> = async () => null;
let toolDefFindFirstImpl: (args: ToolDefFindFirstArgs) => Promise<unknown> = async () => null;
let toolDefCreateImpl: (args: ToolDefCreateArgs) => Promise<unknown> = async () => ({});
let toolDefUpdateImpl: (args: ToolDefUpdateArgs) => Promise<unknown> = async () => ({});

let toolCallFindManyImpl: (args: ToolCallFindManyArgs) => Promise<unknown[]> = async () => [];
let toolCallCreateImpl: (args: ToolCallCreateArgs) => Promise<unknown> = async () => ({});
let toolCallUpdateImpl: (args: ToolCallUpdateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  toolDef: {
    findMany: (args: ToolDefFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'toolDef.findMany', args }); return toolDefFindManyImpl(args); },
    findUnique: (args: ToolDefFindUniqueArgs): Promise<unknown> => { calls.push({ method: 'toolDef.findUnique', args }); return toolDefFindUniqueImpl(args); },
    findFirst: (args: ToolDefFindFirstArgs): Promise<unknown> => { calls.push({ method: 'toolDef.findFirst', args }); return toolDefFindFirstImpl(args); },
    create: (args: ToolDefCreateArgs): Promise<unknown> => { calls.push({ method: 'toolDef.create', args }); return toolDefCreateImpl(args); },
    update: (args: ToolDefUpdateArgs): Promise<unknown> => { calls.push({ method: 'toolDef.update', args }); return toolDefUpdateImpl(args); },
  },
  toolCall: {
    findMany: (args: ToolCallFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'toolCall.findMany', args }); return toolCallFindManyImpl(args); },
    create: (args: ToolCallCreateArgs): Promise<unknown> => { calls.push({ method: 'toolCall.create', args }); return toolCallCreateImpl(args); },
    update: (args: ToolCallUpdateArgs): Promise<unknown> => { calls.push({ method: 'toolCall.update', args }); return toolCallUpdateImpl(args); },
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

function makeToolDefRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'tool-1',
    workspaceId: 'ws-1',
    name: 'web_search',
    version: '1.0.0',
    description: 'Search the web',
    inputSchema: '{}',
    outputSchema: '{}',
    authRequirements: '{}',
    permissions: JSON.stringify([]),
    riskCategory: 'low',
    budgetCategory: 'none',
    timeoutSec: 30,
    retryPolicy: '{}',
    auditRequired: true,
    enabled: true,
    allowedAgents: JSON.stringify([]),
    allowedCompanies: JSON.stringify([]),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeToolCallRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'call-1',
    workspaceId: 'ws-1',
    agentRunId: null,
    toolDefId: 'tool-1',
    input: JSON.stringify({ query: 'test' }),
    output: null,
    error: null,
    status: 'running',
    costCredits: 0,
    startedAt: new Date('2024-01-01'),
    completedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  toolDefFindManyImpl = async () => [];
  toolDefFindUniqueImpl = async () => null;
  toolDefFindFirstImpl = async () => null;
  toolDefCreateImpl = async () => ({});
  toolDefUpdateImpl = async () => ({});
  toolCallFindManyImpl = async () => [];
  toolCallCreateImpl = async () => ({});
  toolCallUpdateImpl = async () => ({});
}

const { ToolRegistryService, ToolCallService } = await import('@/lib/services/tool-registry');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — ToolRegistryService
// ─────────────────────────────────────────────────────────────────────────────

describe('ToolRegistryService', () => {
  beforeEach(() => resetMock());

  it('registers a tool with defaults', async () => {
    toolDefCreateImpl = async (args) => makeToolDefRow({ ...args.data as Record<string, unknown> });
    const t = await ToolRegistryService.register({
      name: 'new_tool', description: 'A new tool',
    });
    assert.equal(t.name, 'new_tool');
    assert.equal(t.version, '1.0.0');
    assert.equal(t.riskCategory, 'low');
    assert.equal(t.budgetCategory, 'none');
    assert.equal(t.timeoutSec, 30);
    assert.equal(t.auditRequired, true);
  });

  it('registers a tool with full input', async () => {
    toolDefCreateImpl = async (args) => makeToolDefRow({ ...args.data as Record<string, unknown> });
    const t = await ToolRegistryService.register({
      workspaceId: 'ws-1', name: 'send_email', version: '2.0.0',
      description: 'Send an email', inputSchema: '{"type":"object"}',
      outputSchema: '{"type":"object"}', authRequirements: '{"apiKey":true}',
      permissions: ['email:send'], riskCategory: 'high', budgetCategory: 'api_cost',
      timeoutSec: 60, retryPolicy: '{"maxRetries":3}', auditRequired: true,
      allowedAgents: ['director'], allowedCompanies: ['org-1'],
    });
    assert.equal(t.name, 'send_email');
    assert.equal(t.version, '2.0.0');
    assert.equal(t.riskCategory, 'high');
    assert.equal(t.budgetCategory, 'api_cost');
    assert.equal(t.timeoutSec, 60);
  });

  it('registers a tool with auditRequired false', async () => {
    toolDefCreateImpl = async (args) => makeToolDefRow({ ...args.data as Record<string, unknown> });
    const t = await ToolRegistryService.register({
      name: 'no_audit', description: 'No audit', auditRequired: false,
    });
    assert.equal(t.auditRequired, false);
  });

  it('gets a tool by id', async () => {
    toolDefFindUniqueImpl = async () => makeToolDefRow();
    const t = await ToolRegistryService.get('tool-1');
    assert.ok(t);
    assert.equal(t!.id, 'tool-1');
    assert.equal(t!.name, 'web_search');
  });

  it('returns null when tool not found', async () => {
    toolDefFindUniqueImpl = async () => null;
    const t = await ToolRegistryService.get('nope');
    assert.equal(t, null);
  });

  it('getByName returns an enabled tool', async () => {
    toolDefFindFirstImpl = async () => makeToolDefRow();
    const t = await ToolRegistryService.getByName('ws-1', 'web_search');
    assert.ok(t);
    assert.equal(t!.name, 'web_search');
  });

  it('getByName returns null when not found', async () => {
    toolDefFindFirstImpl = async () => null;
    const t = await ToolRegistryService.getByName('ws-1', 'nope');
    assert.equal(t, null);
  });

  it('lists tools by workspace', async () => {
    toolDefFindManyImpl = async () => [makeToolDefRow()];
    const list = await ToolRegistryService.list('ws-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'web_search');
  });

  it('lists tools with enabled filter', async () => {
    toolDefFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.enabled === true) return [makeToolDefRow()];
      return [];
    };
    const list = await ToolRegistryService.list('ws-1', { enabled: true });
    assert.equal(list.length, 1);
  });

  it('updates a tool', async () => {
    toolDefUpdateImpl = async (args) => makeToolDefRow({ id: 'tool-1', ...args.data as Record<string, unknown> });
    const t = await ToolRegistryService.update('tool-1', { enabled: false, riskCategory: 'high' });
    assert.equal(t.enabled, false);
    assert.equal(t.riskCategory, 'high');
  });

  it('checkAgentAllowed returns true when allowedAgents is empty (all allowed)', async () => {
    toolDefFindUniqueImpl = async () => makeToolDefRow({ allowedAgents: JSON.stringify([]) });
    const ok = await ToolRegistryService.checkAgentAllowed('tool-1', 'director');
    assert.equal(ok, true);
  });

  it('checkAgentAllowed returns true when agent role is in list', async () => {
    toolDefFindUniqueImpl = async () => makeToolDefRow({ allowedAgents: JSON.stringify(['director', 'writer']) });
    const ok = await ToolRegistryService.checkAgentAllowed('tool-1', 'director');
    assert.equal(ok, true);
  });

  it('checkAgentAllowed returns false when agent role is not in list', async () => {
    toolDefFindUniqueImpl = async () => makeToolDefRow({ allowedAgents: JSON.stringify(['director']) });
    const ok = await ToolRegistryService.checkAgentAllowed('tool-1', 'writer');
    assert.equal(ok, false);
  });

  it('checkAgentAllowed returns false when tool not found', async () => {
    toolDefFindUniqueImpl = async () => null;
    const ok = await ToolRegistryService.checkAgentAllowed('nope', 'director');
    assert.equal(ok, false);
  });

  it('checkAgentAllowed returns false when tool is disabled', async () => {
    toolDefFindUniqueImpl = async () => makeToolDefRow({ enabled: false });
    const ok = await ToolRegistryService.checkAgentAllowed('tool-1', 'director');
    assert.equal(ok, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — ToolCallService
// ─────────────────────────────────────────────────────────────────────────────

describe('ToolCallService', () => {
  beforeEach(() => resetMock());

  it('start records a tool call start with status running', async () => {
    toolCallCreateImpl = async (args) => makeToolCallRow({ ...args.data as Record<string, unknown> });
    const c = await ToolCallService.start({
      workspaceId: 'ws-1', toolDefId: 'tool-1', input: { query: 'test' },
    });
    assert.equal(c.status, 'running');
    assert.equal(c.toolDefId, 'tool-1');
  });

  it('start records agentRunId when provided', async () => {
    toolCallCreateImpl = async (args) => makeToolCallRow({ ...args.data as Record<string, unknown> });
    const c = await ToolCallService.start({
      workspaceId: 'ws-1', agentRunId: 'run-1', toolDefId: 'tool-1', input: {},
    });
    assert.equal(c.agentRunId, 'run-1');
  });

  it('complete sets status to completed and records output + cost', async () => {
    toolCallUpdateImpl = async (args) => makeToolCallRow({ id: 'call-1', ...args.data as Record<string, unknown> });
    const c = await ToolCallService.complete('call-1', { result: 'ok' }, 5);
    assert.equal(c.status, 'completed');
    assert.equal(c.costCredits, 5);
    assert.ok(c.completedAt);
  });

  it('complete defaults costCredits to 0', async () => {
    toolCallUpdateImpl = async (args) => makeToolCallRow({ id: 'call-1', ...args.data as Record<string, unknown> });
    const c = await ToolCallService.complete('call-1', { result: 'ok' });
    assert.equal(c.costCredits, 0);
  });

  it('fail sets status to failed and records error', async () => {
    toolCallUpdateImpl = async (args) => makeToolCallRow({ id: 'call-1', ...args.data as Record<string, unknown> });
    const c = await ToolCallService.fail('call-1', 'Something went wrong');
    assert.equal(c.status, 'failed');
    assert.equal(c.error, 'Something went wrong');
    assert.ok(c.completedAt);
  });

  it('timeout sets status to timeout', async () => {
    toolCallUpdateImpl = async (args) => makeToolCallRow({ id: 'call-1', ...args.data as Record<string, unknown> });
    const c = await ToolCallService.timeout('call-1');
    assert.equal(c.status, 'timeout');
    assert.ok(c.completedAt);
  });

  it('lists tool calls by workspace', async () => {
    toolCallFindManyImpl = async () => [makeToolCallRow()];
    const list = await ToolCallService.list('ws-1');
    assert.equal(list.length, 1);
  });

  it('lists tool calls with status filter', async () => {
    toolCallFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.status === 'failed') return [makeToolCallRow({ status: 'failed' })];
      return [];
    };
    const list = await ToolCallService.list('ws-1', { status: 'failed' });
    assert.equal(list.length, 1);
  });

  it('lists tool calls with agentRunId filter', async () => {
    toolCallFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.agentRunId === 'run-1') return [makeToolCallRow({ agentRunId: 'run-1' })];
      return [];
    };
    const list = await ToolCallService.list('ws-1', { agentRunId: 'run-1' });
    assert.equal(list.length, 1);
  });
});
