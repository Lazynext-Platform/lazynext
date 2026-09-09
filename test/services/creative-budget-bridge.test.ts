import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type BudgetFindFirstArgs = {
  where: Record<string, unknown>;
  select?: Record<string, boolean>;
};

type BudgetCreateArgs = {
  data: Record<string, unknown>;
  select?: Record<string, boolean>;
};

type BudgetUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type BudgetEntryCreateArgs = {
  data: {
    budgetId: string;
    amountCredits: number;
    amountUsd: number;
    category: string;
    description: string;
  };
  select?: Record<string, boolean>;
};

type BudgetEntryFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, boolean>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type EventCreateArgs = {
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let budgetFindFirstImpl: (args: BudgetFindFirstArgs) => Promise<unknown> =
  async () => null;
let budgetCreateImpl: (args: BudgetCreateArgs) => Promise<unknown> =
  async () => ({ id: 'budget-1', limitCredits: 0, spentCredits: 0 });
let budgetUpdateImpl: (args: BudgetUpdateArgs) => Promise<unknown> =
  async () => ({});

let budgetEntryCreateImpl: (args: BudgetEntryCreateArgs) => Promise<unknown> =
  async () => ({ id: 'entry-1', budgetId: 'budget-1', amountCredits: 0, category: 'creative', description: '', createdAt: new Date() });
let budgetEntryFindManyImpl: (args: BudgetEntryFindManyArgs) => Promise<unknown[]> =
  async () => [];

let eventCreateImpl: (args: EventCreateArgs) => Promise<unknown> =
  async () => ({ id: 'event-1' });

const prismaMock = {
  budget: {
    findFirst: (args: BudgetFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'budget.findFirst', args });
      return budgetFindFirstImpl(args);
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
    findMany: (args: BudgetEntryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'budgetEntry.findMany', args });
      return budgetEntryFindManyImpl(args);
    },
  },
  event: {
    create: (args: EventCreateArgs): Promise<unknown> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
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

// Mock the EventService module
mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: (args: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'EventService.emit', args });
        return eventCreateImpl({ data: args });
      },
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  budgetFindFirstImpl = async () => null;
  budgetCreateImpl = async () => ({ id: 'budget-1', limitCredits: 0, spentCredits: 0 });
  budgetUpdateImpl = async () => ({});
  budgetEntryCreateImpl = async () => ({
    id: 'entry-1',
    budgetId: 'budget-1',
    amountCredits: 0,
    category: 'creative',
    description: '',
    createdAt: new Date(),
  });
  budgetEntryFindManyImpl = async () => [];
  eventCreateImpl = async () => ({ id: 'event-1' });
}

const { CreativeBudgetBridge } = await import('@/lib/services/creative-budget-bridge');

// ─────────────────────────────────────────────────────────────────────────────
// CreativeBudgetBridge
// ─────────────────────────────────────────────────────────────────────────────

describe('CreativeBudgetBridge', () => {
  beforeEach(() => { resetMock(); });

  describe('recordCreativeSpend', () => {
    it('creates a budget entry with category creative', async () => {
      budgetFindFirstImpl = async () => ({ id: 'budget-1', limitCredits: 0, spentCredits: 0 });
      const captured: { entry: BudgetEntryCreateArgs | null } = { entry: null };
      budgetEntryCreateImpl = async (args: BudgetEntryCreateArgs) => {
        captured.entry = args;
        return {
          id: 'entry-1',
          budgetId: args.data.budgetId,
          amountCredits: args.data.amountCredits,
          category: args.data.category,
          description: args.data.description,
          createdAt: new Date(),
        };
      };

      const result = await CreativeBudgetBridge.recordCreativeSpend('ws-1', 'org-1', {
        userId: 'user-1',
        amount: 5,
        description: 'Generated brief',
        creativeType: 'brief',
      });

      assert.ok(result);
      assert.equal(result.category, 'creative');
      assert.ok(captured.entry);
      assert.equal(captured.entry!.data.category, 'creative');
      assert.equal(captured.entry!.data.amountCredits, 5);
    });

    it('creates a budget if none exists', async () => {
      budgetFindFirstImpl = async () => null;
      let budgetCreated = false;
      budgetCreateImpl = async (args: BudgetCreateArgs) => {
        budgetCreated = true;
        assert.equal(args.data.scope, 'integration');
        assert.equal(args.data.scopeId, 'creative');
        return { id: 'new-budget', limitCredits: 0, spentCredits: 0 };
      };

      await CreativeBudgetBridge.recordCreativeSpend('ws-1', 'org-1', {
        userId: 'user-1',
        amount: 3,
        description: 'Generated hooks',
        creativeType: 'hooks',
      });

      assert.ok(budgetCreated);
    });

    it('updates budget spentCredits', async () => {
      budgetFindFirstImpl = async () => ({ id: 'budget-1', limitCredits: 100, spentCredits: 10 });
      const captured: { args: BudgetUpdateArgs | null } = { args: null };
      budgetUpdateImpl = async (args: BudgetUpdateArgs) => {
        captured.args = args;
        return {};
      };

      await CreativeBudgetBridge.recordCreativeSpend('ws-1', 'org-1', {
        userId: 'user-1',
        amount: 5,
        description: 'Generated script',
        creativeType: 'script',
      });

      assert.ok(captured.args);
      assert.equal(captured.args!.where.id, 'budget-1');
      const data = captured.args!.data as Record<string, unknown>;
      const increment = data.spentCredits as { increment: number };
      assert.equal(increment.increment, 5);
    });

    it('emits an event for the spend', async () => {
      budgetFindFirstImpl = async () => ({ id: 'budget-1', limitCredits: 0, spentCredits: 0 });
      const captured: { event: Record<string, unknown> | null } = { event: null };
      eventCreateImpl = async (args) => {
        captured.event = args.data as Record<string, unknown>;
        return { id: 'event-1' };
      };

      await CreativeBudgetBridge.recordCreativeSpend('ws-1', 'org-1', {
        userId: 'user-1',
        amount: 2,
        description: 'Scored creative',
        creativeType: 'score',
        sourceId: 'creation-1',
      });

      assert.ok(captured.event);
      assert.equal(captured.event!.type, 'creative.budget.spend');
    });

    it('includes creativeType in description', async () => {
      budgetFindFirstImpl = async () => ({ id: 'budget-1', limitCredits: 0, spentCredits: 0 });
      let entryDesc = '';
      budgetEntryCreateImpl = async (args: BudgetEntryCreateArgs) => {
        entryDesc = args.data.description;
        return {
          id: 'entry-1',
          budgetId: args.data.budgetId,
          amountCredits: args.data.amountCredits,
          category: args.data.category,
          description: args.data.description,
          createdAt: new Date(),
        };
      };

      await CreativeBudgetBridge.recordCreativeSpend('ws-1', 'org-1', {
        userId: 'user-1',
        amount: 3,
        description: 'My description',
        creativeType: 'storyboard',
      });

      assert.ok(entryDesc.startsWith('storyboard:'));
      assert.ok(entryDesc.includes('My description'));
    });
  });

  describe('getCreativeBudgetSummary', () => {
    it('returns zero summary when no budget exists', async () => {
      budgetFindFirstImpl = async () => null;

      const summary = await CreativeBudgetBridge.getCreativeBudgetSummary('ws-1', 'org-1');

      assert.equal(summary.totalSpent, 0);
      assert.equal(summary.spentThisMonth, 0);
      assert.equal(summary.entryCount, 0);
      assert.deepEqual(summary.byCreativeType, {});
      assert.deepEqual(summary.trend, []);
    });

    it('aggregates total spent and by creative type', async () => {
      budgetFindFirstImpl = async () => ({ id: 'budget-1' });
      budgetEntryFindManyImpl = async () => [
        { id: 'e1', amountCredits: 5, description: 'brief: Generated brief', createdAt: new Date() },
        { id: 'e2', amountCredits: 3, description: 'hooks: Generated hooks', createdAt: new Date() },
        { id: 'e3', amountCredits: 2, description: 'brief: Another brief', createdAt: new Date() },
      ];

      const summary = await CreativeBudgetBridge.getCreativeBudgetSummary('ws-1', 'org-1');

      assert.equal(summary.totalSpent, 10);
      assert.equal(summary.byCreativeType.brief, 7);
      assert.equal(summary.byCreativeType.hooks, 3);
      assert.equal(summary.entryCount, 3);
    });

    it('calculates spent this month correctly', async () => {
      budgetFindFirstImpl = async () => ({ id: 'budget-1' });
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      budgetEntryFindManyImpl = async () => [
        { id: 'e1', amountCredits: 5, description: 'brief: test', createdAt: now },
        { id: 'e2', amountCredits: 10, description: 'hooks: test', createdAt: lastMonth },
      ];

      const summary = await CreativeBudgetBridge.getCreativeBudgetSummary('ws-1', 'org-1');

      assert.equal(summary.spentThisMonth, 5);
    });

    it('returns trend with last 10 entries', async () => {
      budgetFindFirstImpl = async () => ({ id: 'budget-1' });
      const entries = Array.from({ length: 15 }, (_, i) => ({
        id: `e${i}`,
        amountCredits: i + 1,
        description: `brief: entry ${i}`,
        createdAt: new Date(2024, 0, i + 1),
      }));
      budgetEntryFindManyImpl = async () => entries;

      const summary = await CreativeBudgetBridge.getCreativeBudgetSummary('ws-1', 'org-1');

      assert.equal(summary.trend.length, 10);
      // Trend should be chronological (reversed from desc order)
      assert.equal(summary.trend[0].amount, 10); // entry 14 desc -> reversed = entry 5
    });
  });

  describe('checkCreativeBudget', () => {
    it('allows spend when no budget exists', async () => {
      budgetFindFirstImpl = async () => null;

      const result = await CreativeBudgetBridge.checkCreativeBudget('ws-1', 'org-1', 50);

      assert.equal(result.allowed, true);
      assert.equal(result.remaining, Infinity);
      assert.equal(result.limit, 0);
    });

    it('allows spend when limit is 0 (unlimited)', async () => {
      budgetFindFirstImpl = async () => ({ id: 'b1', limitCredits: 0, spentCredits: 100 });

      const result = await CreativeBudgetBridge.checkCreativeBudget('ws-1', 'org-1', 50);

      assert.equal(result.allowed, true);
      assert.equal(result.remaining, Infinity);
      assert.equal(result.limit, 0);
    });

    it('allows spend when within limit', async () => {
      budgetFindFirstImpl = async () => ({ id: 'b1', limitCredits: 100, spentCredits: 30 });

      const result = await CreativeBudgetBridge.checkCreativeBudget('ws-1', 'org-1', 50);

      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 70);
      assert.equal(result.limit, 100);
    });

    it('denies spend when over limit', async () => {
      budgetFindFirstImpl = async () => ({ id: 'b1', limitCredits: 100, spentCredits: 80 });

      const result = await CreativeBudgetBridge.checkCreativeBudget('ws-1', 'org-1', 50);

      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 20);
      assert.equal(result.limit, 100);
      assert.ok(result.reason);
    });
  });
});
