import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type BudgetFindManyArgs = {
  where: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type BudgetFindUniqueArgs = {
  where: { id: string };
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

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let budgetFindManyImpl: (args: BudgetFindManyArgs) => Promise<unknown[]> = async () => [];
let budgetFindUniqueImpl: (args: BudgetFindUniqueArgs) => Promise<unknown> = async () => null;
let budgetUpdateImpl: (args: BudgetUpdateArgs) => Promise<unknown> = async () => ({});
let budgetEntryCreateImpl: (args: BudgetEntryCreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  budget: {
    findMany: (args: BudgetFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'budget.findMany', args });
      return budgetFindManyImpl(args);
    },
    create: (): Promise<unknown> => {
      calls.push({ method: 'budget.create' });
      return Promise.resolve({});
    },
    update: (args: BudgetUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'budget.update', args });
      return budgetUpdateImpl(args);
    },
    findUnique: (args: BudgetFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'budget.findUnique', args });
      return budgetFindUniqueImpl(args);
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
  budgetUpdateImpl = async () => ({});
  budgetEntryCreateImpl = async () => ({});
}

const { BudgetService } = await import('@/lib/services/budget');

describe('BudgetService', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('check', () => {
    it('allows spending when no budgets exist', async () => {
      budgetFindManyImpl = async () => [];

      const result = await BudgetService.check({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        amountCredits: 10,
      });

      assert.equal(result.allowed, true);
      assert.equal(result.remainingCredits, Infinity);
    });

    it('allows spending when within budget', async () => {
      budgetFindManyImpl = async () =>
        [
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

    it('denies spending when budget exceeded', async () => {
      budgetFindManyImpl = async () =>
        [
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

    it('checks multiple budgets and denies if any exceeded', async () => {
      budgetFindManyImpl = async () =>
        [
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
  });

  describe('recordSpend', () => {
    it('creates a budget entry and increments spent amounts', async () => {
      budgetEntryCreateImpl = async (args: BudgetEntryCreateArgs) => {
        assert.equal(args.data.budgetId, 'b-1');
        assert.equal(args.data.amountCredits, 10);
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
  });

  describe('refreshStatus', () => {
    it('marks budget as exceeded when over limit', async () => {
      budgetFindUniqueImpl = async () =>
        ({ id: 'b-1', limitCredits: 100, spentCredits: 100, limitUsd: 0, spentUsd: 0, status: 'active' });
      budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
        assert.equal(args.data.status, 'exceeded');
        return { id: 'b-1', status: 'exceeded' };
      };

      const result = await BudgetService.refreshStatus('b-1');
      assert.ok(result);
      assert.equal(result.status, 'exceeded');
    });

    it('does not change status when within limit', async () => {
      budgetFindUniqueImpl = async () =>
        ({ id: 'b-1', limitCredits: 100, spentCredits: 50, limitUsd: 0, spentUsd: 0, status: 'active' });
      budgetUpdateImpl = async () => {
        return { id: 'b-1' };
      };

      const result = await BudgetService.refreshStatus('b-1');
      assert.ok(result);
      assert.equal(result.status, 'active');
      assert.equal(calls.filter((c) => c.method === 'budget.update').length, 0);
    });
  });
});
