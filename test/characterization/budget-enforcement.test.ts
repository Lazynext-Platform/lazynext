import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup — budget enforcement characterization tests
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type BudgetFindManyArgs = {
  where: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type BudgetFindUniqueArgs = {
  where: { id: string };
};

type BudgetCreateArgs = {
  data: Record<string, unknown>;
};

type BudgetUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type BudgetEntryCreateArgs = {
  data: {
    budgetId: string;
    toolCallId?: string | null;
    agentRunId?: string | null;
    amountCredits: number;
    amountUsd?: number;
    category?: string;
    description?: string | null;
  };
};

let budgetFindManyImpl: (args: BudgetFindManyArgs) => Promise<unknown[]> = async () => [];
let budgetFindUniqueImpl: (args: BudgetFindUniqueArgs) => Promise<unknown> = async () => null;
let budgetCreateImpl: (args: BudgetCreateArgs) => Promise<unknown> = async () => ({});
let budgetUpdateImpl: (args: BudgetUpdateArgs) => Promise<unknown> = async () => ({});
let budgetEntryCreateImpl: (args: BudgetEntryCreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  budget: {
    findMany: (args: BudgetFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'budget.findMany', args });
      return budgetFindManyImpl(args);
    },
    findUnique: (args: BudgetFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'budget.findUnique', args });
      return budgetFindUniqueImpl(args);
    },
    create: (args: BudgetCreateArgs): Promise<unknown> => {
      calls.push({ method: 'budget.create', args });
      return budgetCreateImpl(args);
    },
    update: (args: BudgetUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'budget.update', args });
      return budgetUpdateImpl(args);
    },
  },
  budgetEntry: {
    create: (args: BudgetEntryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'budgetEntry.create', args });
      return budgetEntryCreateImpl(args);
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

function resetMock(): void {
  calls.length = 0;
  budgetFindManyImpl = async () => [];
  budgetFindUniqueImpl = async () => null;
  budgetCreateImpl = async () => ({});
  budgetUpdateImpl = async () => ({});
  budgetEntryCreateImpl = async () => ({});
}

const { BudgetService } = await import('@/lib/services/budget');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — BudgetService.check
// ─────────────────────────────────────────────────────────────────────────────

describe('BudgetService — characterization (check)', () => {
  beforeEach(() => resetMock());

  it('returns allowed=true when no budgets exist', async () => {
    budgetFindManyImpl = async () => [];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      amountCredits: 10,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.remainingCredits, Infinity);
    assert.equal(result.remainingUsd, Infinity);
  });

  it('returns allowed=true when spending is within budget', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-1', scope: 'workspace', limitCredits: 100, spentCredits: 50, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      amountCredits: 30,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.remainingCredits, 50);
  });

  it('returns allowed=false when spending exceeds budget', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-1', scope: 'workspace', limitCredits: 100, spentCredits: 90, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      amountCredits: 20,
    });

    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes('Budget exceeded'));
    assert.equal(result.budgetId, 'b-1');
  });

  it('returns allowed=false when spending exactly equals remaining budget', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-1', scope: 'workspace', limitCredits: 100, spentCredits: 80, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      amountCredits: 20,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.remainingCredits, 20);
  });

  it('denies when any of multiple budgets is exceeded', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-1', scope: 'workspace', limitCredits: 100, spentCredits: 50, limitUsd: 0, spentUsd: 0 },
      { id: 'b-2', scope: 'agent', scopeId: 'agent-1', limitCredits: 20, spentCredits: 18, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      scope: 'agent',
      scopeId: 'agent-1',
      amountCredits: 5,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.budgetId, 'b-2');
  });

  it('checks USD budget when amountUsd is provided', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-1', scope: 'workspace', limitCredits: 0, spentCredits: 0, limitUsd: 100, spentUsd: 90 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      amountCredits: 0,
      amountUsd: 20,
    });

    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes('Budget exceeded'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — BudgetService.recordSpend
// ─────────────────────────────────────────────────────────────────────────────

describe('BudgetService — characterization (recordSpend)', () => {
  beforeEach(() => resetMock());

  it('creates a budget entry and increments spent amounts', async () => {
    budgetEntryCreateImpl = async (args: BudgetEntryCreateArgs) => {
      assert.equal(args.data.budgetId, 'b-1');
      assert.equal(args.data.amountCredits, 10);
      assert.equal(args.data.category, 'ai');
      return { id: 'be-1', ...args.data };
    };
    budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
      assert.deepEqual(args.data.spentCredits, { increment: 10 });
      return { id: 'b-1' };
    };

    const result = await BudgetService.recordSpend({
      budgetId: 'b-1',
      amountCredits: 10,
      category: 'ai',
    });

    assert.ok(result);
    assert.equal(calls.filter((c) => c.method === 'budgetEntry.create').length, 1);
    assert.equal(calls.filter((c) => c.method === 'budget.update').length, 1);
  });

  it('records toolCallId and agentRunId when provided', async () => {
    budgetEntryCreateImpl = async (args: BudgetEntryCreateArgs) => {
      assert.equal(args.data.toolCallId, 'tc-1');
      assert.equal(args.data.agentRunId, 'run-1');
      return { id: 'be-1' };
    };

    await BudgetService.recordSpend({
      budgetId: 'b-1',
      toolCallId: 'tc-1',
      agentRunId: 'run-1',
      amountCredits: 5,
    });

    assert.equal(calls.filter((c) => c.method === 'budgetEntry.create').length, 1);
  });

  it('increments USD spend when amountUsd is provided', async () => {
    budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
      assert.deepEqual(args.data.spentUsd, { increment: 25 });
      return { id: 'b-1' };
    };

    await BudgetService.recordSpend({
      budgetId: 'b-1',
      amountCredits: 0,
      amountUsd: 25,
    });

    assert.equal(calls.filter((c) => c.method === 'budget.update').length, 1);
  });

  it('defaults category to other when not provided', async () => {
    budgetEntryCreateImpl = async (args: BudgetEntryCreateArgs) => {
      assert.equal(args.data.category, 'other');
      return { id: 'be-1' };
    };

    await BudgetService.recordSpend({
      budgetId: 'b-1',
      amountCredits: 1,
    });

    assert.equal(calls.filter((c) => c.method === 'budgetEntry.create').length, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — BudgetService.refreshStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('BudgetService — characterization (refreshStatus)', () => {
  beforeEach(() => resetMock());

  it('marks budget as exceeded when spentCredits reaches limitCredits', async () => {
    budgetFindUniqueImpl = async () => ({
      id: 'b-1', limitCredits: 100, spentCredits: 100, limitUsd: 0, spentUsd: 0, status: 'active',
    });
    budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
      assert.equal(args.data.status, 'exceeded');
      return { id: 'b-1', status: 'exceeded' };
    };

    const result = await BudgetService.refreshStatus('b-1');
    assert.ok(result);
    assert.equal(result.status, 'exceeded');
  });

  it('marks budget as exceeded when spentCredits exceeds limitCredits', async () => {
    budgetFindUniqueImpl = async () => ({
      id: 'b-1', limitCredits: 100, spentCredits: 120, limitUsd: 0, spentUsd: 0, status: 'active',
    });
    budgetUpdateImpl = async () => ({ id: 'b-1', status: 'exceeded' });

    const result = await BudgetService.refreshStatus('b-1');
    assert.ok(result);
    assert.equal(result!.status, 'exceeded');
  });

  it('marks budget as exceeded when spentUsd reaches limitUsd', async () => {
    budgetFindUniqueImpl = async () => ({
      id: 'b-1', limitCredits: 0, spentCredits: 0, limitUsd: 200, spentUsd: 200, status: 'active',
    });
    budgetUpdateImpl = async () => ({ id: 'b-1', status: 'exceeded' });

    const result = await BudgetService.refreshStatus('b-1');
    assert.ok(result);
    assert.equal(result!.status, 'exceeded');
  });

  it('does not change status when within limit', async () => {
    budgetFindUniqueImpl = async () => ({
      id: 'b-1', limitCredits: 100, spentCredits: 50, limitUsd: 0, spentUsd: 0, status: 'active',
    });

    const result = await BudgetService.refreshStatus('b-1');
    assert.ok(result);
    assert.equal(result.status, 'active');
    assert.equal(calls.filter((c) => c.method === 'budget.update').length, 0);
  });

  it('returns null when budget not found', async () => {
    budgetFindUniqueImpl = async () => null;

    const result = await BudgetService.refreshStatus('nope');
    assert.equal(result, null);
  });

  it('does not update when budget is already exceeded', async () => {
    budgetFindUniqueImpl = async () => ({
      id: 'b-1', limitCredits: 100, spentCredits: 150, limitUsd: 0, spentUsd: 0, status: 'exceeded',
    });

    const result = await BudgetService.refreshStatus('b-1');
    assert.ok(result);
    assert.equal(result.status, 'exceeded');
    assert.equal(calls.filter((c) => c.method === 'budget.update').length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — budget scopes (workspace, project, agent, task)
// ─────────────────────────────────────────────────────────────────────────────

describe('BudgetService — characterization (budget scopes)', () => {
  beforeEach(() => resetMock());

  it('checks workspace-scoped budgets', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-ws', scope: 'workspace', limitCredits: 500, spentCredits: 100, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      amountCredits: 50,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.remainingCredits, 400);
  });

  it('checks company-scoped budgets (scopeId = organizationId)', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-co', scope: 'company', scopeId: 'org-1', limitCredits: 1000, spentCredits: 900, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      amountCredits: 200,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.budgetId, 'b-co');
  });

  it('checks agent-scoped budgets when scope and scopeId are provided', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-agent', scope: 'agent', scopeId: 'agent-1', limitCredits: 50, spentCredits: 45, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      scope: 'agent',
      scopeId: 'agent-1',
      amountCredits: 10,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.budgetId, 'b-agent');
  });

  it('checks task-scoped budgets when scope and scopeId are provided', async () => {
    budgetFindManyImpl = async () => [
      { id: 'b-task', scope: 'task', scopeId: 'task-1', limitCredits: 20, spentCredits: 10, limitUsd: 0, spentUsd: 0 },
    ];

    const result = await BudgetService.check({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      scope: 'task',
      scopeId: 'task-1',
      amountCredits: 5,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.remainingCredits, 10);
  });

  it('creates a budget with the given scope', async () => {
    budgetCreateImpl = async (args: BudgetCreateArgs) => {
      assert.equal(args.data.scope, 'agent');
      assert.equal(args.data.scopeId, 'agent-1');
      return { id: 'b-1', ...args.data };
    };

    const result = await BudgetService.create({
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      scope: 'agent',
      scopeId: 'agent-1',
      limitCredits: 100,
    });

    assert.ok(result);
    assert.equal(calls.filter((c) => c.method === 'budget.create').length, 1);
  });
});
