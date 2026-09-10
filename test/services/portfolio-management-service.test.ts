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

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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
    type: 'portfolio_account',
    content: JSON.stringify({
      name: 'Growth Portfolio',
      type: 'investment',
      description: 'Main investment account',
      status: 'pending',
      custodian: 'Fidelity',
      manager: 'Alice',
      currency: 'USD',
      currentValue: 1000000,
      inceptionDate: '2028-01-01',
      benchmark: 'S&P 500',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['portfolio_account', 'investment', 'pending']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeHoldingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-h1',
    type: 'portfolio_holding',
    content: JSON.stringify({
      accountId: 'mem-1',
      symbol: 'AAPL',
      name: 'Apple Inc',
      type: 'equity',
      description: 'Tech stock',
      status: 'open',
      quantity: 100,
      avgCost: 150,
      currentPrice: 180,
      marketValue: 18000,
      currency: 'USD',
      sector: 'Technology',
      acquiredDate: '2028-01-01',
      notes: '',
    }),
    tags: JSON.stringify(['portfolio_holding', 'equity', 'open']),
    ...overrides,
  });
}

function makeTransactionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-tx1',
    type: 'portfolio_transaction',
    content: JSON.stringify({
      accountId: 'mem-1',
      holdingId: 'mem-h1',
      type: 'buy',
      amount: 15000,
      currency: 'USD',
      description: 'Buy AAPL',
      status: 'pending',
      executionDate: '2028-01-15',
      settlementDate: null,
      quantity: 100,
      price: 150,
      fees: 5,
      notes: '',
    }),
    tags: JSON.stringify(['portfolio_transaction', 'buy', 'pending']),
    ...overrides,
  });
}

function makeAllocationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-al1',
    type: 'portfolio_allocation',
    content: JSON.stringify({
      accountId: 'mem-1',
      type: 'strategic',
      description: 'Strategic allocation',
      status: 'draft',
      targetWeights: { equity: 60, bond: 40 },
      actualWeights: { equity: 55, bond: 45 },
      driftThreshold: 5,
      lastRebalanceDate: '2028-01-01',
      notes: '',
    }),
    tags: JSON.stringify(['portfolio_allocation', 'strategic', 'draft']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
}

const { PortfolioManagementService } = await import('@/lib/services/portfolio-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Accounts
// ─────────────────────────────────────────────────────────────────────────────

describe('PortfolioManagementService — Accounts', () => {
  beforeEach(() => resetMock());

  it('creates an account with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await PortfolioManagementService.createAccount('org-1', 'ws-1', {
      name: 'Retirement Fund', type: 'retirement',
    }, 'user-1');
    assert.strictEqual(a.name, 'Retirement Fund');
    assert.strictEqual(a.status, 'pending');
    assert.strictEqual(a.currentValue, 0);
  });

  it('creates an account with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await PortfolioManagementService.createAccount('org-1', 'ws-1', {
      name: 'Hedge Fund A', type: 'hedge_fund', description: 'Quant strategy',
      status: 'active', custodian: 'Goldman', manager: 'Bob', currency: 'EUR',
      currentValue: 5000000, inceptionDate: '2028-01-01', benchmark: 'HFRI',
      notes: 'High priority',
    }, 'user-1');
    assert.strictEqual(a.name, 'Hedge Fund A');
    assert.strictEqual(a.type, 'hedge_fund');
    assert.strictEqual(a.custodian, 'Goldman');
    assert.strictEqual(a.currentValue, 5000000);
    assert.strictEqual(a.status, 'active');
  });

  it('gets an account by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const a = await PortfolioManagementService.getAccount('mem-1');
    assert.ok(a);
    assert.strictEqual(a!.id, 'mem-1');
    assert.strictEqual(a!.name, 'Growth Portfolio');
  });

  it('returns null when account not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await PortfolioManagementService.getAccount('nope');
    assert.strictEqual(a, null);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'portfolio_holding' });
    const a = await PortfolioManagementService.getAccount('mem-1');
    assert.strictEqual(a, null);
  });

  it('lists accounts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'portfolio_account') return [makeRow()];
      return [];
    };
    const list = await PortfolioManagementService.listAccounts('org-1');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name, 'Growth Portfolio');
  });

  it('updates an account', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PortfolioManagementService.updateAccount('mem-1', { status: 'active' });
    assert.ok(a);
    assert.strictEqual(a!.status, 'active');
  });

  it('deletes an account', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PortfolioManagementService.deleteAccount('mem-1');
    assert.strictEqual(ok, true);
  });

  it('activateAccount sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PortfolioManagementService.activateAccount('mem-1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'active');
  });

  it('freezeAccount sets status to frozen', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PortfolioManagementService.freezeAccount('mem-1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'frozen');
  });

  it('suspendAccount sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PortfolioManagementService.suspendAccount('mem-1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'suspended');
  });

  it('liquidateAccount sets status to liquidated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PortfolioManagementService.liquidateAccount('mem-1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'liquidated');
  });

  it('closeAccount sets status to closed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PortfolioManagementService.closeAccount('mem-1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'closed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Holdings
// ─────────────────────────────────────────────────────────────────────────────

describe('PortfolioManagementService — Holdings', () => {
  beforeEach(() => resetMock());

  it('creates a holding with defaults', async () => {
    memCreateImpl = async (args) => makeHoldingRow({ content: args.data.content as string });
    const h = await PortfolioManagementService.createHolding('org-1', 'ws-1', {
      accountId: 'mem-1', symbol: 'MSFT', name: 'Microsoft', type: 'equity',
    }, 'user-1');
    assert.strictEqual(h.symbol, 'MSFT');
    assert.strictEqual(h.status, 'open');
    assert.strictEqual(h.quantity, 0);
  });

  it('creates a holding with full input', async () => {
    memCreateImpl = async (args) => makeHoldingRow({ content: args.data.content as string });
    const h = await PortfolioManagementService.createHolding('org-1', 'ws-1', {
      accountId: 'mem-1', symbol: 'GOOGL', name: 'Alphabet', type: 'equity',
      description: 'Search giant', status: 'open', quantity: 50, avgCost: 120,
      currentPrice: 140, marketValue: 7000, currency: 'USD', sector: 'Technology',
      acquiredDate: '2028-01-01', notes: 'Long term',
    }, 'user-1');
    assert.strictEqual(h.symbol, 'GOOGL');
    assert.strictEqual(h.quantity, 50);
    assert.strictEqual(h.sector, 'Technology');
  });

  it('gets a holding by id', async () => {
    memFindUniqueImpl = async () => makeHoldingRow();
    const h = await PortfolioManagementService.getHolding('mem-h1');
    assert.ok(h);
    assert.strictEqual(h!.symbol, 'AAPL');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeHoldingRow({ type: 'portfolio_account' });
    const h = await PortfolioManagementService.getHolding('mem-h1');
    assert.strictEqual(h, null);
  });

  it('lists holdings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'portfolio_holding') return [makeHoldingRow()];
      return [];
    };
    const list = await PortfolioManagementService.listHoldings('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates a holding', async () => {
    memFindUniqueImpl = async () => makeHoldingRow();
    memUpdateImpl = async (args) => makeHoldingRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await PortfolioManagementService.updateHolding('mem-h1', { currentPrice: 200 });
    assert.ok(h);
    assert.strictEqual(h!.currentPrice, 200);
  });

  it('deletes a holding', async () => {
    memDeleteImpl = async () => ({ id: 'mem-h1' });
    const ok = await PortfolioManagementService.deleteHolding('mem-h1');
    assert.strictEqual(ok, true);
  });

  it('closeHolding sets status to closed', async () => {
    memFindUniqueImpl = async () => makeHoldingRow();
    memUpdateImpl = async (args) => makeHoldingRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await PortfolioManagementService.closeHolding('mem-h1', 'user-1');
    assert.ok(h);
    assert.strictEqual(h!.status, 'closed');
  });

  it('sellHolding sets status to sold', async () => {
    memFindUniqueImpl = async () => makeHoldingRow();
    memUpdateImpl = async (args) => makeHoldingRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await PortfolioManagementService.sellHolding('mem-h1', 'user-1');
    assert.ok(h);
    assert.strictEqual(h!.status, 'sold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Transactions
// ─────────────────────────────────────────────────────────────────────────────

describe('PortfolioManagementService — Transactions', () => {
  beforeEach(() => resetMock());

  it('creates a transaction with defaults', async () => {
    memCreateImpl = async (args) => makeTransactionRow({ content: args.data.content as string });
    const tx = await PortfolioManagementService.createTransaction('org-1', 'ws-1', {
      accountId: 'mem-1', type: 'buy', amount: 5000,
    }, 'user-1');
    assert.strictEqual(tx.amount, 5000);
    assert.strictEqual(tx.status, 'pending');
    assert.strictEqual(tx.fees, 0);
  });

  it('creates a transaction with full input', async () => {
    memCreateImpl = async (args) => makeTransactionRow({ content: args.data.content as string });
    const tx = await PortfolioManagementService.createTransaction('org-1', 'ws-1', {
      accountId: 'mem-1', holdingId: 'mem-h1', type: 'sell', amount: 20000,
      currency: 'EUR', description: 'Sell AAPL', status: 'executed',
      executionDate: '2028-02-01', settlementDate: '2028-02-03',
      quantity: 100, price: 200, fees: 10, notes: 'Take profit',
    }, 'user-1');
    assert.strictEqual(tx.type, 'sell');
    assert.strictEqual(tx.currency, 'EUR');
    assert.strictEqual(tx.fees, 10);
  });

  it('gets a transaction by id', async () => {
    memFindUniqueImpl = async () => makeTransactionRow();
    const tx = await PortfolioManagementService.getTransaction('mem-tx1');
    assert.ok(tx);
    assert.strictEqual(tx!.amount, 15000);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTransactionRow({ type: 'portfolio_account' });
    const tx = await PortfolioManagementService.getTransaction('mem-tx1');
    assert.strictEqual(tx, null);
  });

  it('lists transactions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'portfolio_transaction') return [makeTransactionRow()];
      return [];
    };
    const list = await PortfolioManagementService.listTransactions('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates a transaction', async () => {
    memFindUniqueImpl = async () => makeTransactionRow();
    memUpdateImpl = async (args) => makeTransactionRow({ id: 'mem-tx1', content: args.data.content as string });
    const tx = await PortfolioManagementService.updateTransaction('mem-tx1', { status: 'executed' });
    assert.ok(tx);
    assert.strictEqual(tx!.status, 'executed');
  });

  it('deletes a transaction', async () => {
    memDeleteImpl = async () => ({ id: 'mem-tx1' });
    const ok = await PortfolioManagementService.deleteTransaction('mem-tx1');
    assert.strictEqual(ok, true);
  });

  it('executeTransaction sets status to executed', async () => {
    memFindUniqueImpl = async () => makeTransactionRow();
    memUpdateImpl = async (args) => makeTransactionRow({ id: 'mem-tx1', content: args.data.content as string });
    const tx = await PortfolioManagementService.executeTransaction('mem-tx1', 'user-1');
    assert.ok(tx);
    assert.strictEqual(tx!.status, 'executed');
    assert.ok(tx!.executionDate);
  });

  it('settleTransaction sets status to settled', async () => {
    memFindUniqueImpl = async () => makeTransactionRow();
    memUpdateImpl = async (args) => makeTransactionRow({ id: 'mem-tx1', content: args.data.content as string });
    const tx = await PortfolioManagementService.settleTransaction('mem-tx1', 'user-1');
    assert.ok(tx);
    assert.strictEqual(tx!.status, 'settled');
    assert.ok(tx!.settlementDate);
  });

  it('cancelTransaction sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeTransactionRow();
    memUpdateImpl = async (args) => makeTransactionRow({ id: 'mem-tx1', content: args.data.content as string });
    const tx = await PortfolioManagementService.cancelTransaction('mem-tx1', 'user-1');
    assert.ok(tx);
    assert.strictEqual(tx!.status, 'cancelled');
  });

  it('failTransaction sets status to failed', async () => {
    memFindUniqueImpl = async () => makeTransactionRow();
    memUpdateImpl = async (args) => makeTransactionRow({ id: 'mem-tx1', content: args.data.content as string });
    const tx = await PortfolioManagementService.failTransaction('mem-tx1', 'user-1');
    assert.ok(tx);
    assert.strictEqual(tx!.status, 'failed');
  });

  it('reverseTransaction sets status to reversed', async () => {
    memFindUniqueImpl = async () => makeTransactionRow();
    memUpdateImpl = async (args) => makeTransactionRow({ id: 'mem-tx1', content: args.data.content as string });
    const tx = await PortfolioManagementService.reverseTransaction('mem-tx1', 'user-1');
    assert.ok(tx);
    assert.strictEqual(tx!.status, 'reversed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Allocations
// ─────────────────────────────────────────────────────────────────────────────

describe('PortfolioManagementService — Allocations', () => {
  beforeEach(() => resetMock());

  it('creates an allocation with defaults', async () => {
    memCreateImpl = async (args) => makeAllocationRow({ content: args.data.content as string });
    const al = await PortfolioManagementService.createAllocation('org-1', 'ws-1', {
      accountId: 'mem-1', type: 'strategic',
    }, 'user-1');
    assert.strictEqual(al.type, 'strategic');
    assert.strictEqual(al.status, 'draft');
    assert.strictEqual(al.driftThreshold, 0);
  });

  it('creates an allocation with full input', async () => {
    memCreateImpl = async (args) => makeAllocationRow({ content: args.data.content as string });
    const al = await PortfolioManagementService.createAllocation('org-1', 'ws-1', {
      accountId: 'mem-1', type: 'tactical', description: 'Tactical tilt',
      status: 'active', targetWeights: { equity: 70, bond: 30 },
      actualWeights: { equity: 68, bond: 32 }, driftThreshold: 3,
      lastRebalanceDate: '2028-01-01', notes: 'Quarterly review',
    }, 'user-1');
    assert.strictEqual(al.type, 'tactical');
    assert.strictEqual(al.driftThreshold, 3);
    assert.strictEqual(al.targetWeights['equity'], 70);
  });

  it('gets an allocation by id', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    const al = await PortfolioManagementService.getAllocation('mem-al1');
    assert.ok(al);
    assert.strictEqual(al!.type, 'strategic');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAllocationRow({ type: 'portfolio_account' });
    const al = await PortfolioManagementService.getAllocation('mem-al1');
    assert.strictEqual(al, null);
  });

  it('lists allocations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'portfolio_allocation') return [makeAllocationRow()];
      return [];
    };
    const list = await PortfolioManagementService.listAllocations('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates an allocation', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-al1', content: args.data.content as string });
    const al = await PortfolioManagementService.updateAllocation('mem-al1', { status: 'active' });
    assert.ok(al);
    assert.strictEqual(al!.status, 'active');
  });

  it('deletes an allocation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-al1' });
    const ok = await PortfolioManagementService.deleteAllocation('mem-al1');
    assert.strictEqual(ok, true);
  });

  it('activateAllocation sets status to active', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-al1', content: args.data.content as string });
    const al = await PortfolioManagementService.activateAllocation('mem-al1', 'user-1');
    assert.ok(al);
    assert.strictEqual(al!.status, 'active');
  });

  it('reviewAllocation sets status to reviewed', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-al1', content: args.data.content as string });
    const al = await PortfolioManagementService.reviewAllocation('mem-al1', 'user-1');
    assert.ok(al);
    assert.strictEqual(al!.status, 'reviewed');
  });

  it('archiveAllocation sets status to archived', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-al1', content: args.data.content as string });
    const al = await PortfolioManagementService.archiveAllocation('mem-al1', 'user-1');
    assert.ok(al);
    assert.strictEqual(al!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('PortfolioManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getPortfolioManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'portfolio_account') return [
        makeRow({ content: JSON.stringify({ name: 'A1', type: 'investment', description: '', status: 'active', custodian: '', manager: '', currency: 'USD', currentValue: 500000, inceptionDate: null, benchmark: '', notes: '' }) }),
        makeRow({ id: 'a2', content: JSON.stringify({ name: 'A2', type: 'investment', description: '', status: 'pending', custodian: '', manager: '', currency: 'USD', currentValue: 300000, inceptionDate: null, benchmark: '', notes: '' }) }),
      ];
      if (t === 'portfolio_holding') return [
        makeHoldingRow({ content: JSON.stringify({ accountId: 'a1', symbol: 'X', name: 'X', type: 'equity', description: '', status: 'open', quantity: 0, avgCost: 0, currentPrice: 0, marketValue: 0, currency: 'USD', sector: '', acquiredDate: null, notes: '' }) }),
      ];
      if (t === 'portfolio_transaction') return [
        makeTransactionRow({ content: JSON.stringify({ accountId: 'a1', holdingId: null, type: 'buy', amount: 0, currency: 'USD', description: '', status: 'pending', executionDate: null, settlementDate: null, quantity: 0, price: 0, fees: 0, notes: '' }) }),
      ];
      if (t === 'portfolio_allocation') return [
        makeAllocationRow({ content: JSON.stringify({ accountId: 'a1', type: 'strategic', description: '', status: 'active', targetWeights: {}, actualWeights: {}, driftThreshold: 0, lastRebalanceDate: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await PortfolioManagementService.getPortfolioManagementMetrics('org-1');
    assert.strictEqual(m.activeAccounts, 1);
    assert.strictEqual(m.openHoldings, 1);
    assert.strictEqual(m.pendingTransactions, 1);
    assert.strictEqual(m.totalPortfolioValue, 800000);
    assert.strictEqual(m.activeAllocations, 1);
  });

  it('getPortfolioManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'portfolio_account') return [makeRow()];
      if (t === 'portfolio_holding') return [makeHoldingRow()];
      if (t === 'portfolio_transaction') return [makeTransactionRow()];
      if (t === 'portfolio_allocation') return [makeAllocationRow()];
      return [];
    };
    const s = await PortfolioManagementService.getPortfolioManagementStats('org-1');
    assert.strictEqual(s.accountCount, 1);
    assert.strictEqual(s.holdingCount, 1);
    assert.strictEqual(s.transactionCount, 1);
    assert.strictEqual(s.allocationCount, 1);
    assert.strictEqual(s.byAccountType['investment'], 1);
    assert.strictEqual(s.byHoldingStatus['open'], 1);
    assert.strictEqual(s.byTransactionStatus['pending'], 1);
    assert.strictEqual(s.byAllocationStatus['draft'], 1);
  });
});
