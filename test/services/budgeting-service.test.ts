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
  select?: Record<string, unknown>;
};

type BudgetFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type BudgetCreateArgs = {
  data: Record<string, unknown>;
};

type BudgetUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type BudgetDeleteArgs = {
  where: { id: string };
};

type BudgetCountArgs = {
  where: Record<string, unknown>;
};

type BudgetAggregateArgs = {
  where: Record<string, unknown>;
  _sum?: Record<string, unknown>;
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

type BudgetEntryFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type BudgetEntryAggregateArgs = {
  where: Record<string, unknown>;
  _sum?: Record<string, unknown>;
};

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    sourceId?: string;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let budgetFindManyImpl: (args: BudgetFindManyArgs) => Promise<unknown[]> = async () => [];
let budgetFindUniqueImpl: (args: BudgetFindUniqueArgs) => Promise<unknown> = async () => null;
let budgetCreateImpl: (args: BudgetCreateArgs) => Promise<unknown> = async () => ({});
let budgetUpdateImpl: (args: BudgetUpdateArgs) => Promise<unknown> = async () => ({});
let budgetDeleteImpl: (args: BudgetDeleteArgs) => Promise<unknown> = async () => ({});
let budgetCountImpl: (args: BudgetCountArgs) => Promise<number> = async () => 0;
let budgetAggregateImpl: (args: BudgetAggregateArgs) => Promise<unknown> = async () => ({});

let budgetEntryCreateImpl: (args: BudgetEntryCreateArgs) => Promise<unknown> = async () => ({});
let budgetEntryFindManyImpl: (args: BudgetEntryFindManyArgs) => Promise<unknown[]> = async () => [];
let budgetEntryAggregateImpl: (args: BudgetEntryAggregateArgs) => Promise<unknown> = async () => ({});
let budgetEntryCountImpl: (args: unknown) => Promise<number> = async () => 0;

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> = async () => null;
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> = async () => ({});
let memoryCountImpl: (args: unknown) => Promise<number> = async () => 0;

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
    delete: (args: BudgetDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'budget.delete', args });
      return budgetDeleteImpl(args);
    },
    count: (args: BudgetCountArgs): Promise<number> => {
      calls.push({ method: 'budget.count', args });
      return budgetCountImpl(args);
    },
    aggregate: (args: BudgetAggregateArgs): Promise<unknown> => {
      calls.push({ method: 'budget.aggregate', args });
      return budgetAggregateImpl(args);
    },
  },
  budgetEntry: {
    create: (args: BudgetEntryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'budgetEntry.create', args });
      return budgetEntryCreateImpl(args);
    },
    findMany: (args: BudgetEntryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'budgetEntry.findMany', args });
      return budgetEntryFindManyImpl(args);
    },
    aggregate: (args: BudgetEntryAggregateArgs): Promise<unknown> => {
      calls.push({ method: 'budgetEntry.aggregate', args });
      return budgetEntryAggregateImpl(args);
    },
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'budgetEntry.count', args });
      return budgetEntryCountImpl(args);
    },
  },
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'memory.count', args });
      return memoryCountImpl(args);
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
  budgetDeleteImpl = async () => ({});
  budgetCountImpl = async () => 0;
  budgetAggregateImpl = async () => ({});
  budgetEntryCreateImpl = async () => ({});
  budgetEntryFindManyImpl = async () => [];
  budgetEntryAggregateImpl = async () => ({});
  budgetEntryCountImpl = async () => 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  memoryCountImpl = async () => 0;
}

function makeBudgetRow(
  id: string,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    scope: 'company',
    scopeId: null,
    period: 'monthly',
    limitCredits: 0,
    spentCredits: 0,
    limitUsd: 0,
    spentUsd: 0,
    currency: 'USD',
    status: 'active',
    startDate: new Date('2025-01-01'),
    endDate: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeMemoryRow(
  id: string,
  type: string,
  content: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type,
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { BudgetingService } =
  await import('@/lib/services/budgeting-service');

// ─────────────────────────────────────────────────────────────────────────────
// BudgetingService
// ─────────────────────────────────────────────────────────────────────────────

describe('BudgetingService', () => {
  beforeEach(() => { resetMock(); });

  describe('createBudget', () => {
    it('creates a budget with defaults', async () => {
      budgetCreateImpl = async (args: BudgetCreateArgs) => {
        assert.equal(args.data.scope, 'company');
        assert.equal(args.data.period, 'monthly');
        assert.equal(args.data.limitUsd, 5000);
        assert.equal(args.data.spentUsd, 0);
        assert.equal(args.data.status, 'active');
        return makeBudgetRow('b-1', { limitUsd: 5000 });
      };

      const budget = await BudgetingService.createBudget('org-1', 'ws-1', {
        scope: 'company',
        period: 'monthly',
        limitUsd: 5000,
        startDate: new Date('2025-01-01'),
      });

      assert.ok(budget);
      assert.equal(budget.id, 'b-1');
      assert.equal(budget.scope, 'company');
      assert.equal(budget.period, 'monthly');
      assert.equal(budget.limitUsd, 5000);
      assert.equal(budget.status, 'active');
      assert.equal(calls[0].method, 'budget.create');
    });

    it('stores department/category metadata in memory when provided', async () => {
      let memoryCreated = false;
      budgetCreateImpl = async () => makeBudgetRow('b-2', { limitUsd: 1000 });
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        memoryCreated = true;
        assert.equal(args.data.type, 'budget_metadata');
        const content = JSON.parse(args.data.content);
        assert.equal(content.department, 'Engineering');
        assert.equal(content.category, 'Cloud');
        return makeMemoryRow('m-1', 'budget_metadata', content);
      };

      const budget = await BudgetingService.createBudget('org-1', 'ws-1', {
        scope: 'workspace',
        period: 'monthly',
        limitUsd: 1000,
        startDate: new Date('2025-01-01'),
        department: 'Engineering',
        category: 'Cloud',
      });

      assert.ok(budget);
      assert.ok(memoryCreated);
    });
  });

  describe('getBudget', () => {
    it('returns a budget by id with entries and metadata', async () => {
      budgetFindUniqueImpl = async () => makeBudgetRow('b-1', {
        limitUsd: 5000, spentUsd: 1000,
        entries: [{ id: 'e-1', budgetId: 'b-1', toolCallId: null, agentRunId: null, amountCredits: 0, amountUsd: 100, category: 'cloud', description: null, createdAt: new Date('2025-01-02') }],
      });
      memoryFindFirstImpl = async () =>
        makeMemoryRow('m-1', 'budget_metadata', { budgetId: 'b-1', department: 'Eng', category: 'Cloud' }, { sourceId: 'b-1' });

      const budget = await BudgetingService.getBudget('b-1');

      assert.ok(budget);
      assert.equal(budget.id, 'b-1');
      assert.equal(budget.department, 'Eng');
      assert.equal(budget.category, 'Cloud');
      assert.ok(budget.entries);
      assert.equal(budget.entries!.length, 1);
      assert.equal(calls[0].method, 'budget.findUnique');
    });

    it('returns null when budget not found', async () => {
      budgetFindUniqueImpl = async () => null;
      const budget = await BudgetingService.getBudget('nope');
      assert.equal(budget, null);
    });
  });

  describe('listBudgets', () => {
    it('returns budgets for an organization', async () => {
      budgetFindManyImpl = async () => [
        makeBudgetRow('b-1', { limitUsd: 1000 }),
        makeBudgetRow('b-2', { limitUsd: 2000 }),
      ];

      const budgets = await BudgetingService.listBudgets('org-1');

      assert.equal(budgets.length, 2);
      assert.equal(budgets[0].id, 'b-1');
      assert.equal(calls[0].method, 'budget.findMany');
    });

    it('filters by scope and status', async () => {
      budgetFindManyImpl = async (args: BudgetFindManyArgs) => {
        assert.equal(args.where.scope, 'company');
        assert.equal(args.where.status, 'active');
        return [makeBudgetRow('b-1', { scope: 'company', status: 'active' })];
      };

      const budgets = await BudgetingService.listBudgets('org-1', { scope: 'company', status: 'active' });

      assert.equal(budgets.length, 1);
    });

    it('filters by department via memory lookup', async () => {
      budgetFindManyImpl = async () => [
        makeBudgetRow('b-1', { limitUsd: 1000 }),
        makeBudgetRow('b-2', { limitUsd: 2000 }),
      ];
      memoryFindManyImpl = async () => [
        makeMemoryRow('m-1', 'budget_metadata', { budgetId: 'b-1', department: 'Eng', category: '' }),
      ];

      const budgets = await BudgetingService.listBudgets('org-1', { department: 'Eng' });

      assert.equal(budgets.length, 1);
      assert.equal(budgets[0].id, 'b-1');
      assert.equal(budgets[0].department, 'Eng');
    });
  });

  describe('updateBudget', () => {
    it('updates budget fields', async () => {
      budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
        assert.equal(args.data.limitUsd, 10000);
        assert.equal(args.data.status, 'paused');
        return makeBudgetRow('b-1', { limitUsd: 10000, status: 'paused' });
      };

      const budget = await BudgetingService.updateBudget('b-1', { limitUsd: 10000, status: 'paused' });

      assert.ok(budget);
      assert.equal(budget.limitUsd, 10000);
      assert.equal(budget.status, 'paused');
    });

    it('returns null when budget not found', async () => {
      budgetUpdateImpl = async () => null;
      const budget = await BudgetingService.updateBudget('nope', { limitUsd: 1 });
      assert.equal(budget, null);
    });
  });

  describe('deleteBudget', () => {
    it('deletes a budget', async () => {
      budgetDeleteImpl = async () => ({ id: 'b-1' });
      const result = await BudgetingService.deleteBudget('b-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      budgetDeleteImpl = async () => { throw new Error('not found'); };
      const result = await BudgetingService.deleteBudget('nope');
      assert.equal(result, false);
    });
  });

  describe('approveBudget', () => {
    it('approves a budget (sets status active) and stores approval in memory', async () => {
      let memoryCreated = false;
      budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
        assert.equal(args.data.status, 'active');
        return makeBudgetRow('b-1', { status: 'active' });
      };
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        memoryCreated = true;
        assert.equal(args.data.type, 'budget_approval');
        const content = JSON.parse(args.data.content);
        assert.equal(content.approvedBy, 'admin-1');
        return makeMemoryRow('m-1', 'budget_approval', content);
      };

      const budget = await BudgetingService.approveBudget('b-1', 'admin-1');

      assert.ok(budget);
      assert.equal(budget.status, 'active');
      assert.ok(memoryCreated);
    });

    it('returns null when budget not found', async () => {
      budgetUpdateImpl = async () => null;
      const budget = await BudgetingService.approveBudget('nope', 'admin-1');
      assert.equal(budget, null);
    });
  });

  describe('recordSpending', () => {
    it('creates a budget entry and increments spent totals', async () => {
      let budgetUpdated = false;
      budgetEntryCreateImpl = async (args: BudgetEntryCreateArgs) => {
        assert.equal(args.data.budgetId, 'b-1');
        assert.equal(args.data.amountUsd, 250);
        assert.equal(args.data.amountCredits, 10);
        assert.equal(args.data.category, 'cloud');
        return {
          id: 'e-1', budgetId: 'b-1', toolCallId: null, agentRunId: null,
          amountCredits: 10, amountUsd: 250, category: 'cloud', description: null,
          createdAt: new Date('2025-01-02'),
        };
      };
      budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
        budgetUpdated = true;
        assert.deepEqual(args.data.spentUsd, { increment: 250 });
        assert.deepEqual(args.data.spentCredits, { increment: 10 });
        return makeBudgetRow('b-1', { spentUsd: 250, spentCredits: 10 });
      };

      const entry = await BudgetingService.recordSpending('b-1', {
        amountUsd: 250,
        amountCredits: 10,
        category: 'cloud',
      });

      assert.ok(entry);
      assert.equal(entry.id, 'e-1');
      assert.equal(entry.amountUsd, 250);
      assert.equal(entry.amountCredits, 10);
      assert.ok(budgetUpdated);
    });
  });

  describe('getBudgetVsActual', () => {
    it('computes budget vs actual with utilization', async () => {
      budgetFindManyImpl = async () => [
        makeBudgetRow('b-1', { limitUsd: 1000, spentUsd: 400, limitCredits: 100, spentCredits: 40, scope: 'company', period: 'monthly', status: 'active' }),
      ];

      const results = await BudgetingService.getBudgetVsActual('org-1');

      assert.equal(results.length, 1);
      assert.equal(results[0].budgetId, 'b-1');
      assert.equal(results[0].limitUsd, 1000);
      assert.equal(results[0].spentUsd, 400);
      assert.equal(results[0].remainingUsd, 600);
      assert.equal(results[0].utilizationPct, 40);
      assert.equal(results[0].remainingCredits, 60);
    });

    it('handles zero limit (utilization 0)', async () => {
      budgetFindManyImpl = async () => [
        makeBudgetRow('b-1', { limitUsd: 0, spentUsd: 100 }),
      ];

      const results = await BudgetingService.getBudgetVsActual('org-1');

      assert.equal(results[0].utilizationPct, 0);
    });
  });

  describe('createForecast', () => {
    it('creates a forecast stored in memory', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'budget_forecast');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'Q1 Forecast');
        assert.equal(content.period, '2025-Q1');
        assert.equal(content.scenarios.length, 1);
        return makeMemoryRow('f-1', 'budget_forecast', content);
      };

      const forecast = await BudgetingService.createForecast('org-1', 'ws-1', {
        name: 'Q1 Forecast',
        period: '2025-Q1',
        scenarios: [{ name: 'Base', type: 'realistic', revenue: 100000, expenses: 60000 }],
      }, 'user-1');

      assert.ok(forecast);
      assert.equal(forecast.id, 'f-1');
      assert.equal(forecast.name, 'Q1 Forecast');
      assert.equal(forecast.scenarios.length, 1);
    });
  });

  describe('getForecast', () => {
    it('returns a forecast by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRow('f-1', 'budget_forecast', {
          name: 'Q1', period: '2025-Q1', scenarios: [],
        });

      const forecast = await BudgetingService.getForecast('f-1');

      assert.ok(forecast);
      assert.equal(forecast.id, 'f-1');
      assert.equal(forecast.name, 'Q1');
    });

    it('returns null when forecast not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const forecast = await BudgetingService.getForecast('nope');
      assert.equal(forecast, null);
    });
  });

  describe('listForecasts', () => {
    it('returns forecasts for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRow('f-1', 'budget_forecast', { name: 'A', period: '2025-Q1', scenarios: [] }),
        makeMemoryRow('f-2', 'budget_forecast', { name: 'B', period: '2025-Q2', scenarios: [] }),
      ];

      const forecasts = await BudgetingService.listForecasts('org-1');

      assert.equal(forecasts.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by period', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRow('f-1', 'budget_forecast', { name: 'A', period: '2025-Q1', scenarios: [] }),
        makeMemoryRow('f-2', 'budget_forecast', { name: 'B', period: '2025-Q2', scenarios: [] }),
      ];

      const forecasts = await BudgetingService.listForecasts('org-1', { period: '2025-Q2' });

      assert.equal(forecasts.length, 1);
      assert.equal(forecasts[0].period, '2025-Q2');
    });
  });

  describe('deleteForecast', () => {
    it('deletes a forecast', async () => {
      memoryDeleteImpl = async () => ({ id: 'f-1' });
      const result = await BudgetingService.deleteForecast('f-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('not found'); };
      const result = await BudgetingService.deleteForecast('nope');
      assert.equal(result, false);
    });
  });

  describe('createScenario', () => {
    it('creates a scenario stored in memory', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'budget_scenario');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'Optimistic');
        assert.equal(content.type, 'optimistic');
        assert.equal(content.revenue, 200000);
        assert.equal(content.expenses, 80000);
        return makeMemoryRow('s-1', 'budget_scenario', content);
      };

      const scenario = await BudgetingService.createScenario('org-1', 'ws-1', {
        name: 'Optimistic',
        type: 'optimistic',
        period: '2025-Q1',
        revenue: 200000,
        expenses: 80000,
      }, 'user-1');

      assert.ok(scenario);
      assert.equal(scenario.id, 's-1');
      assert.equal(scenario.name, 'Optimistic');
      assert.equal(scenario.type, 'optimistic');
      assert.equal(scenario.revenue, 200000);
    });
  });

  describe('getScenarios', () => {
    it('returns scenarios for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRow('s-1', 'budget_scenario', { name: 'A', type: 'optimistic', period: '2025-Q1', revenue: 100, expenses: 50 }),
        makeMemoryRow('s-2', 'budget_scenario', { name: 'B', type: 'pessimistic', period: '2025-Q2', revenue: 80, expenses: 60 }),
      ];

      const scenarios = await BudgetingService.getScenarios('org-1');

      assert.equal(scenarios.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRow('s-1', 'budget_scenario', { name: 'A', type: 'optimistic', period: '', revenue: 0, expenses: 0 }),
        makeMemoryRow('s-2', 'budget_scenario', { name: 'B', type: 'pessimistic', period: '', revenue: 0, expenses: 0 }),
      ];

      const scenarios = await BudgetingService.getScenarios('org-1', { type: 'pessimistic' });

      assert.equal(scenarios.length, 1);
      assert.equal(scenarios[0].type, 'pessimistic');
    });

    it('filters by period', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRow('s-1', 'budget_scenario', { name: 'A', type: 'optimistic', period: '2025-Q1', revenue: 0, expenses: 0 }),
        makeMemoryRow('s-2', 'budget_scenario', { name: 'B', type: 'pessimistic', period: '2025-Q2', revenue: 0, expenses: 0 }),
      ];

      const scenarios = await BudgetingService.getScenarios('org-1', { period: '2025-Q1' });

      assert.equal(scenarios.length, 1);
      assert.equal(scenarios[0].period, '2025-Q1');
    });
  });

  describe('deleteScenario', () => {
    it('deletes a scenario', async () => {
      memoryDeleteImpl = async () => ({ id: 's-1' });
      const result = await BudgetingService.deleteScenario('s-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('not found'); };
      const result = await BudgetingService.deleteScenario('nope');
      assert.equal(result, false);
    });
  });

  describe('getVarianceAnalysis', () => {
    it('computes variance and variance percentage', async () => {
      budgetFindManyImpl = async () => [
        makeBudgetRow('b-1', { limitUsd: 1000, spentUsd: 1200, limitCredits: 100, spentCredits: 120, scope: 'company', period: 'monthly' }),
      ];

      const results = await BudgetingService.getVarianceAnalysis('org-1');

      assert.equal(results.length, 1);
      assert.equal(results[0].budgetId, 'b-1');
      assert.equal(results[0].budgetUsd, 1000);
      assert.equal(results[0].actualUsd, 1200);
      assert.equal(results[0].variance, 200);
      assert.equal(results[0].variancePct, 20);
    });

    it('handles zero budget (variancePct 0)', async () => {
      budgetFindManyImpl = async () => [
        makeBudgetRow('b-1', { limitUsd: 0, spentUsd: 100 }),
      ];

      const results = await BudgetingService.getVarianceAnalysis('org-1');

      assert.equal(results[0].variancePct, 0);
    });
  });

  describe('getRollingForecast', () => {
    it('generates rolling forecast points based on historical spend', async () => {
      const now = new Date();
      const janKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      budgetFindManyImpl = async () => [
        makeBudgetRow('b-1', { spentUsd: 1000, startDate: new Date(now.getFullYear(), now.getMonth(), 1), period: 'monthly' }),
        makeBudgetRow('b-2', { spentUsd: 2000, startDate: new Date(now.getFullYear(), now.getMonth(), 1), period: 'monthly' }),
      ];

      const forecast = await BudgetingService.getRollingForecast('org-1', { months: 3 });

      assert.equal(forecast.length, 3);
      assert.ok(forecast[0].projectedSpend > 0);
      assert.equal(forecast[0].basedOnMonths, 1);
      // Each point should have a period string
      assert.ok(forecast[0].period.length > 0);
    });

    it('returns zero projected spend when no history', async () => {
      budgetFindManyImpl = async () => [];

      const forecast = await BudgetingService.getRollingForecast('org-1', { months: 6 });

      assert.equal(forecast.length, 6);
      assert.equal(forecast[0].projectedSpend, 0);
      assert.equal(forecast[0].basedOnMonths, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates budgeting stats', async () => {
      budgetFindManyImpl = async () => [
        { limitUsd: 5000, spentUsd: 1000 },
        { limitUsd: 3000, spentUsd: 500 },
      ];
      budgetCountImpl = async () => 2;
      memoryCountImpl = async (args: unknown) => {
        const a = args as { where: { type: string } };
        if (a.where.type === 'budget_forecast') return 3;
        if (a.where.type === 'budget_scenario') return 5;
        return 0;
      };

      const stats = await BudgetingService.getStats('org-1');

      assert.equal(stats.budgetCount, 2);
      assert.equal(stats.forecastCount, 3);
      assert.equal(stats.scenarioCount, 5);
      assert.equal(stats.totalBudgeted, 8000);
      assert.equal(stats.totalSpent, 1500);
    });

    it('returns zero stats when no data', async () => {
      budgetFindManyImpl = async () => [];
      budgetCountImpl = async () => 0;
      memoryCountImpl = async () => 0;

      const stats = await BudgetingService.getStats('org-1');

      assert.equal(stats.budgetCount, 0);
      assert.equal(stats.forecastCount, 0);
      assert.equal(stats.scenarioCount, 0);
      assert.equal(stats.totalBudgeted, 0);
      assert.equal(stats.totalSpent, 0);
    });
  });
});
