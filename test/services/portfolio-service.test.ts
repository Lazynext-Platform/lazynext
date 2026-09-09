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

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'portfolio_holding',
    content: JSON.stringify({
      name: 'AAPL',
      assetClass: 'equity',
      ticker: 'AAPL',
      isin: 'US0378331005',
      quantity: 100,
      purchasePrice: 150,
      currentPrice: 180,
      purchaseDate: '2028-01-01',
      currency: 'USD',
      status: 'active',
      sector: 'Technology',
      country: 'US',
      rating: 'A',
      notes: 'Core holding',
      soldPrice: null,
      soldDate: null,
      soldBy: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['portfolio_holding', 'equity', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2028-01-01'),
    updatedAt: new Date('2028-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { PortfolioService } = await import('@/lib/services/portfolio-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PortfolioService — Holdings', () => {
  beforeEach(() => resetMock());

  it('creates a holding with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const h = await PortfolioService.createHolding('org-1', 'ws-1', {
      name: 'MSFT', assetClass: 'equity', quantity: 50, purchasePrice: 300, purchaseDate: '2028-01-01',
    }, 'user-1');
    assert.equal(h.name, 'MSFT');
    assert.equal(h.status, 'active');
    assert.equal(h.currency, 'USD');
    assert.equal(h.currentPrice, 300);
    assert.equal(h.ticker, '');
    assert.equal(h.sector, '');
  });

  it('creates a holding with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const h = await PortfolioService.createHolding('org-1', 'ws-1', {
      name: 'GOOGL', assetClass: 'equity', ticker: 'GOOGL', isin: 'US02079K3059',
      quantity: 25, purchasePrice: 140, currentPrice: 155, purchaseDate: '2028-02-01',
      currency: 'EUR', status: 'pending', sector: 'Technology', country: 'US',
      rating: 'AA', notes: 'Watchlist',
    }, 'user-1');
    assert.equal(h.name, 'GOOGL');
    assert.equal(h.ticker, 'GOOGL');
    assert.equal(h.isin, 'US02079K3059');
    assert.equal(h.currency, 'EUR');
    assert.equal(h.status, 'pending');
    assert.equal(h.currentPrice, 155);
    assert.equal(h.sector, 'Technology');
    assert.equal(h.rating, 'AA');
    assert.equal(h.notes, 'Watchlist');
  });

  it('gets a holding by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const h = await PortfolioService.getHolding('mem-1');
    assert.ok(h);
    assert.equal(h!.id, 'mem-1');
    assert.equal(h!.name, 'AAPL');
  });

  it('returns null for non-holding type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'something_else' });
    const h = await PortfolioService.getHolding('mem-1');
    assert.equal(h, null);
  });

  it('returns null when holding not found', async () => {
    memFindUniqueImpl = async () => null;
    const h = await PortfolioService.getHolding('nope');
    assert.equal(h, null);
  });

  it('lists holdings by organization', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_holding') return [];
      return [makeRow(), makeRow({ id: 'mem-2', content: JSON.stringify({ name: 'MSFT', assetClass: 'equity', ticker: '', isin: '', quantity: 10, purchasePrice: 300, currentPrice: 310, purchaseDate: '2028-01-01', currency: 'USD', status: 'active', sector: '', country: '', rating: '', notes: '', soldPrice: null, soldDate: null, soldBy: '' }) })];
    };
    const list = await PortfolioService.listHoldings('org-1');
    assert.equal(list.length, 2);
    assert.equal(list[0].name, 'AAPL');
  });

  it('filters holdings by assetClass', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_holding') return [];
      const rows = [
        makeRow({ content: JSON.stringify({ name: 'A', assetClass: 'equity', ticker: '', isin: '', quantity: 10, purchasePrice: 100, currentPrice: 110, purchaseDate: '2028-01-01', currency: 'USD', status: 'active', sector: '', country: '', rating: '', notes: '', soldPrice: null, soldDate: null, soldBy: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'B', assetClass: 'fixed_income', ticker: '', isin: '', quantity: 10, purchasePrice: 100, currentPrice: 100, purchaseDate: '2028-01-01', currency: 'USD', status: 'active', sector: '', country: '', rating: '', notes: '', soldPrice: null, soldDate: null, soldBy: '' }) }),
      ];
      const conditions = (where.AND as Array<Record<string, unknown>> | undefined);
      if (!conditions) return rows;
      return rows.filter((r) => {
        const c = JSON.parse(r.content as string);
        return conditions.every((cond) => {
          const contentCond = cond.content as Record<string, unknown> | undefined;
          if (!contentCond) return true;
          const contains = contentCond.contains as string;
          if (contains.includes('assetClass')) return c.assetClass === contains.match(/"assetClass":"([^"]+)"/)?.[1];
          return true;
        });
      });
    };
    const list = await PortfolioService.listHoldings('org-1', { assetClass: 'fixed_income' });
    assert.equal(list.length, 1);
    assert.equal(list[0].assetClass, 'fixed_income');
  });

  it('updates a holding', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string, updatedAt: new Date('2028-03-01') });
    const h = await PortfolioService.updateHolding('mem-1', { quantity: 200 });
    assert.ok(h);
    assert.equal(h!.quantity, 200);
  });

  it('deletes a holding', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PortfolioService.deleteHolding('mem-1');
    assert.equal(ok, true);
  });

  it('sells a holding', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const h = await PortfolioService.sellHolding('mem-1', 200, '2028-06-01', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'sold');
    assert.equal(h!.soldPrice, 200);
    assert.equal(h!.soldBy, 'user-1');
  });

  it('returns null when selling non-existent holding', async () => {
    memFindUniqueImpl = async () => null;
    const h = await PortfolioService.sellHolding('nope', 200, '2028-06-01', 'user-1');
    assert.equal(h, null);
  });
});

describe('PortfolioService — Transactions', () => {
  beforeEach(() => resetMock());

  it('creates a transaction with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'portfolio_transaction', content: args.data.content as string });
    const t = await PortfolioService.createTransaction('org-1', 'ws-1', {
      type: 'buy', amount: 5000, transactionDate: '2028-01-01',
    }, 'user-1');
    assert.equal(t.type, 'buy');
    assert.equal(t.amount, 5000);
    assert.equal(t.quantity, 0);
    assert.equal(t.price, 0);
    assert.equal(t.currency, 'USD');
    assert.equal(t.fees, 0);
  });

  it('creates a transaction with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'portfolio_transaction', content: args.data.content as string });
    const t = await PortfolioService.createTransaction('org-1', 'ws-1', {
      holdingId: 'h-1', type: 'sell', quantity: 50, price: 200, amount: 10000,
      currency: 'EUR', transactionDate: '2028-03-01', fees: 25, notes: 'Partial sell',
    }, 'user-1');
    assert.equal(t.holdingId, 'h-1');
    assert.equal(t.type, 'sell');
    assert.equal(t.quantity, 50);
    assert.equal(t.price, 200);
    assert.equal(t.amount, 10000);
    assert.equal(t.currency, 'EUR');
    assert.equal(t.fees, 25);
    assert.equal(t.notes, 'Partial sell');
  });

  it('gets a transaction by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_transaction', content: JSON.stringify({
      holdingId: 'h-1', type: 'dividend', quantity: 0, price: 0, amount: 100, currency: 'USD',
      transactionDate: '2028-01-01', fees: 0, notes: '',
    }) });
    const t = await PortfolioService.getTransaction('mem-1');
    assert.ok(t);
    assert.equal(t!.type, 'dividend');
    assert.equal(t!.amount, 100);
  });

  it('returns null for non-transaction type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_holding' });
    const t = await PortfolioService.getTransaction('mem-1');
    assert.equal(t, null);
  });

  it('lists transactions', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_transaction') return [];
      return [makeRow({ type: 'portfolio_transaction', content: JSON.stringify({ holdingId: null, type: 'buy', quantity: 10, price: 150, amount: 1500, currency: 'USD', transactionDate: '2028-01-01', fees: 0, notes: '' }) })];
    };
    const list = await PortfolioService.listTransactions('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].type, 'buy');
  });

  it('filters transactions by type', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_transaction') return [];
      const rows = [
        makeRow({ type: 'portfolio_transaction', content: JSON.stringify({ holdingId: null, type: 'buy', quantity: 10, price: 150, amount: 1500, currency: 'USD', transactionDate: '2028-01-01', fees: 0, notes: '' }) }),
        makeRow({ id: 'm2', type: 'portfolio_transaction', content: JSON.stringify({ holdingId: null, type: 'sell', quantity: 10, price: 200, amount: 2000, currency: 'USD', transactionDate: '2028-01-01', fees: 0, notes: '' }) }),
      ];
      const conditions = (where.AND as Array<Record<string, unknown>> | undefined);
      if (!conditions) return rows;
      return rows.filter((r) => {
        const c = JSON.parse(r.content as string);
        return conditions.every((cond) => {
          const contentCond = cond.content as Record<string, unknown> | undefined;
          if (!contentCond) return true;
          const contains = contentCond.contains as string;
          if (contains.includes('type')) return c.type === contains.match(/"type":"([^"]+)"/)?.[1];
          return true;
        });
      });
    };
    const list = await PortfolioService.listTransactions('org-1', { type: 'sell' });
    assert.equal(list.length, 1);
    assert.equal(list[0].type, 'sell');
  });

  it('updates a transaction', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_transaction', content: JSON.stringify({
      holdingId: null, type: 'buy', quantity: 10, price: 150, amount: 1500, currency: 'USD',
      transactionDate: '2028-01-01', fees: 0, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'portfolio_transaction', content: args.data.content as string });
    const t = await PortfolioService.updateTransaction('mem-1', { amount: 2000 });
    assert.ok(t);
    assert.equal(t!.amount, 2000);
  });

  it('deletes a transaction', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PortfolioService.deleteTransaction('mem-1');
    assert.equal(ok, true);
  });
});

describe('PortfolioService — Allocations', () => {
  beforeEach(() => resetMock());

  it('creates an allocation with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'portfolio_allocation', content: args.data.content as string });
    const a = await PortfolioService.createAllocation('org-1', 'ws-1', {
      name: 'Conservative', strategy: 'conservative', targetWeights: { equity: 30, fixed_income: 70 },
    }, 'user-1');
    assert.equal(a.name, 'Conservative');
    assert.equal(a.strategy, 'conservative');
    assert.equal(a.status, 'active');
    assert.equal(a.driftThreshold, 0);
    assert.deepEqual(a.currentWeights, {});
  });

  it('creates an allocation with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'portfolio_allocation', content: args.data.content as string });
    const a = await PortfolioService.createAllocation('org-1', 'ws-1', {
      name: 'Growth', strategy: 'aggressive', targetWeights: { equity: 80, fixed_income: 20 },
      currentWeights: { equity: 75, fixed_income: 25 }, driftThreshold: 5,
      status: 'drifted', notes: 'Needs rebalance',
    }, 'user-1');
    assert.equal(a.name, 'Growth');
    assert.equal(a.strategy, 'aggressive');
    assert.equal(a.driftThreshold, 5);
    assert.equal(a.status, 'drifted');
    assert.deepEqual(a.currentWeights, { equity: 75, fixed_income: 25 });
    assert.equal(a.notes, 'Needs rebalance');
  });

  it('gets an allocation by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_allocation', content: JSON.stringify({
      name: 'Balanced', strategy: 'balanced', targetWeights: { equity: 60, fixed_income: 40 },
      currentWeights: { equity: 55, fixed_income: 45 }, driftThreshold: 3, status: 'active',
      lastRebalancedAt: null, rebalancedBy: '', notes: '',
    }) });
    const a = await PortfolioService.getAllocation('mem-1');
    assert.ok(a);
    assert.equal(a!.name, 'Balanced');
    assert.equal(a!.strategy, 'balanced');
  });

  it('returns null for non-allocation type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_holding' });
    const a = await PortfolioService.getAllocation('mem-1');
    assert.equal(a, null);
  });

  it('lists allocations', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_allocation') return [];
      return [makeRow({ type: 'portfolio_allocation', content: JSON.stringify({ name: 'A', strategy: 'balanced', targetWeights: {}, currentWeights: {}, driftThreshold: 0, status: 'active', lastRebalancedAt: null, rebalancedBy: '', notes: '' }) })];
    };
    const list = await PortfolioService.listAllocations('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'A');
  });

  it('filters allocations by strategy', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_allocation') return [];
      const rows = [
        makeRow({ type: 'portfolio_allocation', content: JSON.stringify({ name: 'A', strategy: 'conservative', targetWeights: {}, currentWeights: {}, driftThreshold: 0, status: 'active', lastRebalancedAt: null, rebalancedBy: '', notes: '' }) }),
        makeRow({ id: 'm2', type: 'portfolio_allocation', content: JSON.stringify({ name: 'B', strategy: 'aggressive', targetWeights: {}, currentWeights: {}, driftThreshold: 0, status: 'active', lastRebalancedAt: null, rebalancedBy: '', notes: '' }) }),
      ];
      const conditions = (where.AND as Array<Record<string, unknown>> | undefined);
      if (!conditions) return rows;
      return rows.filter((r) => {
        const c = JSON.parse(r.content as string);
        return conditions.every((cond) => {
          const contentCond = cond.content as Record<string, unknown> | undefined;
          if (!contentCond) return true;
          const contains = contentCond.contains as string;
          if (contains.includes('strategy')) return c.strategy === contains.match(/"strategy":"([^"]+)"/)?.[1];
          return true;
        });
      });
    };
    const list = await PortfolioService.listAllocations('org-1', { strategy: 'aggressive' });
    assert.equal(list.length, 1);
    assert.equal(list[0].strategy, 'aggressive');
  });

  it('updates an allocation', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_allocation', content: JSON.stringify({
      name: 'A', strategy: 'balanced', targetWeights: { equity: 60 }, currentWeights: { equity: 55 },
      driftThreshold: 3, status: 'active', lastRebalancedAt: null, rebalancedBy: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'portfolio_allocation', content: args.data.content as string });
    const a = await PortfolioService.updateAllocation('mem-1', { driftThreshold: 5 });
    assert.ok(a);
    assert.equal(a!.driftThreshold, 5);
  });

  it('deletes an allocation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PortfolioService.deleteAllocation('mem-1');
    assert.equal(ok, true);
  });

  it('rebances an allocation', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_allocation', content: JSON.stringify({
      name: 'A', strategy: 'balanced', targetWeights: { equity: 60 }, currentWeights: { equity: 55 },
      driftThreshold: 3, status: 'active', lastRebalancedAt: null, rebalancedBy: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'portfolio_allocation', content: args.data.content as string });
    const a = await PortfolioService.rebalanceAllocation('mem-1', 'user-1');
    assert.ok(a);
    assert.ok(a!.lastRebalancedAt);
    assert.equal(a!.rebalancedBy, 'user-1');
  });

  it('returns null when rebalancing non-existent allocation', async () => {
    memFindUniqueImpl = async () => null;
    const a = await PortfolioService.rebalanceAllocation('nope', 'user-1');
    assert.equal(a, null);
  });
});

describe('PortfolioService — Risks', () => {
  beforeEach(() => resetMock());

  it('creates a risk with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'portfolio_risk', content: args.data.content as string });
    const r = await PortfolioService.createRisk('org-1', 'ws-1', {
      name: 'Portfolio Risk', assessmentDate: '2028-01-01', riskLevel: 'medium',
    }, 'user-1');
    assert.equal(r.riskLevel, 'medium');
    assert.equal(r.status, 'within_limits');
    assert.equal(r.varAmount, 0);
    assert.equal(r.beta, 0);
    assert.equal(r.sharpeRatio, 0);
    assert.equal(r.volatility, 0);
    assert.equal(r.mitigationPlan, '');
  });

  it('creates a risk with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'portfolio_risk', content: args.data.content as string });
    const r = await PortfolioService.createRisk('org-1', 'ws-1', {
      name: 'Market Risk', assessmentDate: '2028-01-01', riskLevel: 'high', status: 'warning',
      varAmount: 50000, beta: 1.2, sharpeRatio: 0.8, maxDrawdown: 15, volatility: 25,
      concentration: 30, mitigationPlan: 'Hedge with options', notes: 'Quarterly review',
    }, 'user-1');
    assert.equal(r.name, 'Market Risk');
    assert.equal(r.riskLevel, 'high');
    assert.equal(r.status, 'warning');
    assert.equal(r.varAmount, 50000);
    assert.equal(r.beta, 1.2);
    assert.equal(r.sharpeRatio, 0.8);
    assert.equal(r.maxDrawdown, 15);
    assert.equal(r.volatility, 25);
    assert.equal(r.concentration, 30);
    assert.equal(r.mitigationPlan, 'Hedge with options');
    assert.equal(r.notes, 'Quarterly review');
  });

  it('gets a risk by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_risk', content: JSON.stringify({
      name: 'R', riskLevel: 'low', status: 'within_limits', varAmount: 1000, beta: 0.5,
      sharpeRatio: 1.5, maxDrawdown: 5, volatility: 10, concentration: 20,
      assessmentDate: '2028-01-01', mitigationPlan: '', notes: '',
    }) });
    const r = await PortfolioService.getRisk('mem-1');
    assert.ok(r);
    assert.equal(r!.riskLevel, 'low');
    assert.equal(r!.status, 'within_limits');
  });

  it('returns null for non-risk type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_holding' });
    const r = await PortfolioService.getRisk('mem-1');
    assert.equal(r, null);
  });

  it('lists risks', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_risk') return [];
      return [makeRow({ type: 'portfolio_risk', content: JSON.stringify({ name: 'R', riskLevel: 'medium', status: 'within_limits', varAmount: 0, beta: 0, sharpeRatio: 0, maxDrawdown: 0, volatility: 0, concentration: 0, assessmentDate: '2028-01-01', mitigationPlan: '', notes: '' }) })];
    };
    const list = await PortfolioService.listRisks('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].riskLevel, 'medium');
  });

  it('filters risks by riskLevel', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_risk') return [];
      const rows = [
        makeRow({ type: 'portfolio_risk', content: JSON.stringify({ name: 'R1', riskLevel: 'low', status: 'within_limits', varAmount: 0, beta: 0, sharpeRatio: 0, maxDrawdown: 0, volatility: 0, concentration: 0, assessmentDate: '2028-01-01', mitigationPlan: '', notes: '' }) }),
        makeRow({ id: 'm2', type: 'portfolio_risk', content: JSON.stringify({ name: 'R2', riskLevel: 'high', status: 'warning', varAmount: 0, beta: 0, sharpeRatio: 0, maxDrawdown: 0, volatility: 0, concentration: 0, assessmentDate: '2028-01-01', mitigationPlan: '', notes: '' }) }),
      ];
      const conditions = (where.AND as Array<Record<string, unknown>> | undefined);
      if (!conditions) return rows;
      return rows.filter((r) => {
        const c = JSON.parse(r.content as string);
        return conditions.every((cond) => {
          const contentCond = cond.content as Record<string, unknown> | undefined;
          if (!contentCond) return true;
          const contains = contentCond.contains as string;
          if (contains.includes('riskLevel')) return c.riskLevel === contains.match(/"riskLevel":"([^"]+)"/)?.[1];
          return true;
        });
      });
    };
    const list = await PortfolioService.listRisks('org-1', { riskLevel: 'high' });
    assert.equal(list.length, 1);
    assert.equal(list[0].riskLevel, 'high');
  });

  it('updates a risk', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_risk', content: JSON.stringify({
      name: 'R', riskLevel: 'medium', status: 'within_limits', varAmount: 1000, beta: 0.5,
      sharpeRatio: 1.5, maxDrawdown: 5, volatility: 10, concentration: 20,
      assessmentDate: '2028-01-01', mitigationPlan: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'portfolio_risk', content: args.data.content as string });
    const r = await PortfolioService.updateRisk('mem-1', { riskLevel: 'high', status: 'warning' });
    assert.ok(r);
    assert.equal(r!.riskLevel, 'high');
    assert.equal(r!.status, 'warning');
  });

  it('deletes a risk', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PortfolioService.deleteRisk('mem-1');
    assert.equal(ok, true);
  });
});

describe('PortfolioService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics for active holdings', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_holding') return [];
      return [
        makeRow({ content: JSON.stringify({ name: 'A', assetClass: 'equity', ticker: '', isin: '', quantity: 100, purchasePrice: 150, currentPrice: 180, purchaseDate: '2028-01-01', currency: 'USD', status: 'active', sector: '', country: '', rating: '', notes: '', soldPrice: null, soldDate: null, soldBy: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'B', assetClass: 'equity', ticker: '', isin: '', quantity: 50, purchasePrice: 100, currentPrice: 120, purchaseDate: '2028-01-01', currency: 'USD', status: 'active', sector: '', country: '', rating: '', notes: '', soldPrice: null, soldDate: null, soldBy: '' }) }),
      ];
    };
    const m = await PortfolioService.getPortfolioMetrics('org-1');
    assert.equal(m.totalValue, 24000);
    assert.equal(m.totalCost, 20000);
    assert.equal(m.totalGainLoss, 4000);
    assert.equal(m.totalGainLossPercent, 20);
    assert.equal(m.activeHoldings, 2);
  });

  it('excludes sold holdings from metrics', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.type !== 'portfolio_holding') return [];
      return [
        makeRow({ content: JSON.stringify({ name: 'A', assetClass: 'equity', ticker: '', isin: '', quantity: 100, purchasePrice: 150, currentPrice: 180, purchaseDate: '2028-01-01', currency: 'USD', status: 'active', sector: '', country: '', rating: '', notes: '', soldPrice: null, soldDate: null, soldBy: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'B', assetClass: 'equity', ticker: '', isin: '', quantity: 50, purchasePrice: 100, currentPrice: 120, purchaseDate: '2028-01-01', currency: 'USD', status: 'sold', sector: '', country: '', rating: '', notes: '', soldPrice: 130, soldDate: '2028-06-01', soldBy: 'user-1' }) }),
      ];
    };
    const m = await PortfolioService.getPortfolioMetrics('org-1');
    assert.equal(m.activeHoldings, 1);
    assert.equal(m.totalValue, 18000);
  });

  it('returns stats with counts', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      const t = where.type as string;
      if (t === 'portfolio_holding') return [makeRow({ content: JSON.stringify({ name: 'A', assetClass: 'equity', ticker: '', isin: '', quantity: 100, purchasePrice: 150, currentPrice: 180, purchaseDate: '2028-01-01', currency: 'USD', status: 'active', sector: '', country: '', rating: '', notes: '', soldPrice: null, soldDate: null, soldBy: '' }) })];
      if (t === 'portfolio_transaction') return [makeRow({ type: 'portfolio_transaction', content: JSON.stringify({ holdingId: null, type: 'buy', quantity: 100, price: 150, amount: 15000, currency: 'USD', transactionDate: '2028-01-01', fees: 0, notes: '' }) })];
      if (t === 'portfolio_allocation') return [makeRow({ type: 'portfolio_allocation', content: JSON.stringify({ name: 'A', strategy: 'balanced', targetWeights: {}, currentWeights: {}, driftThreshold: 0, status: 'active', lastRebalancedAt: null, rebalancedBy: '', notes: '' }) })];
      if (t === 'portfolio_risk') return [makeRow({ type: 'portfolio_risk', content: JSON.stringify({ name: 'R', riskLevel: 'medium', status: 'within_limits', varAmount: 0, beta: 0, sharpeRatio: 0, maxDrawdown: 0, volatility: 0, concentration: 0, assessmentDate: '2028-01-01', mitigationPlan: '', notes: '' }) })];
      return [];
    };
    const s = await PortfolioService.getPortfolioStats('org-1');
    assert.equal(s.holdingCount, 1);
    assert.equal(s.activeHoldingCount, 1);
    assert.equal(s.transactionCount, 1);
    assert.equal(s.allocationCount, 1);
    assert.equal(s.riskCount, 1);
    assert.equal(s.byAssetClass.equity, 1);
    assert.equal(s.byHoldingStatus.active, 1);
    assert.equal(s.byTransactionType.buy, 1);
    assert.equal(s.byRiskLevel.medium, 1);
  });

  it('returns empty stats when no data', async () => {
    memFindManyImpl = async () => [];
    const s = await PortfolioService.getPortfolioStats('org-1');
    assert.equal(s.holdingCount, 0);
    assert.equal(s.transactionCount, 0);
    assert.equal(s.allocationCount, 0);
    assert.equal(s.riskCount, 0);
    assert.deepEqual(s.byAssetClass, {});
  });
});
