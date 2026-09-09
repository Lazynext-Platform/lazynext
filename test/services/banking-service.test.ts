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
    type: 'bank_account',
    content: JSON.stringify({
      accountName: 'Operating Account',
      accountNumber: '1234567890',
      bankName: 'Chase',
      routingNumber: '021000021',
      accountType: 'checking',
      currency: 'USD',
      balance: 100000,
      status: 'active',
      openedDate: '2024-01-01',
      description: 'Main operating account',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['bank_account', 'checking', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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

const { BankingService } = await import('@/lib/services/banking-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BankingService — Accounts', () => {
  beforeEach(() => resetMock());

  it('creates an account with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await BankingService.createAccount('org-1', 'ws-1', {
      accountName: 'Main Account', accountNumber: '123', bankName: 'Chase', accountType: 'checking',
    }, 'user-1');
    assert.equal(a.accountName, 'Main Account');
    assert.equal(a.status, 'active');
    assert.equal(a.currency, 'USD');
    assert.equal(a.balance, 0);
  });

  it('creates an account with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await BankingService.createAccount('org-1', 'ws-1', {
      accountName: 'Savings', accountNumber: '456', bankName: 'Wells Fargo',
      accountType: 'savings', currency: 'EUR', balance: 50000, status: 'active',
      routingNumber: '123', openedDate: '2024-06-01', description: 'Reserve',
    }, 'user-1');
    assert.equal(a.accountName, 'Savings');
    assert.equal(a.currency, 'EUR');
    assert.equal(a.balance, 50000);
    assert.equal(a.routingNumber, '123');
  });

  it('gets an account by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const a = await BankingService.getAccount('mem-1');
    assert.ok(a);
    assert.equal(a!.id, 'mem-1');
    assert.equal(a!.accountName, 'Operating Account');
  });

  it('returns null for non-account type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'something_else' });
    const a = await BankingService.getAccount('mem-1');
    assert.equal(a, null);
  });

  it('returns null when account not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await BankingService.getAccount('nope');
    assert.equal(a, null);
  });

  it('lists accounts by organization', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow({ id: 'mem-2', content: JSON.stringify({ accountName: 'Second', accountNumber: '2', bankName: 'B', accountType: 'savings', currency: 'USD', balance: 0, status: 'active', routingNumber: '', openedDate: '', description: '' }) })];
    const list = await BankingService.listAccounts('org-1');
    assert.equal(list.length, 2);
    assert.equal(list[0].accountName, 'Operating Account');
  });

  it('filters accounts by type', async () => {
    memFindManyImpl = async () => [
      makeRow({ content: JSON.stringify({ accountName: 'C', accountNumber: '1', bankName: 'B', accountType: 'checking', currency: 'USD', balance: 0, status: 'active', routingNumber: '', openedDate: '', description: '' }) }),
      makeRow({ id: 'm2', content: JSON.stringify({ accountName: 'S', accountNumber: '2', bankName: 'B', accountType: 'savings', currency: 'USD', balance: 0, status: 'active', routingNumber: '', openedDate: '', description: '' }) }),
    ];
    const list = await BankingService.listAccounts('org-1', { accountType: 'savings' });
    assert.equal(list.length, 1);
    assert.equal(list[0].accountType, 'savings');
  });

  it('updates an account', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string, updatedAt: new Date('2024-02-01') });
    const a = await BankingService.updateAccount('mem-1', { balance: 200000 });
    assert.ok(a);
    assert.equal(a!.balance, 200000);
  });

  it('deletes an account', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await BankingService.deleteAccount('mem-1');
    assert.equal(ok, true);
  });

  it('closes an account', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({ accountName: 'Op', accountNumber: '1', bankName: 'B', accountType: 'checking', currency: 'USD', balance: 0, status: 'closed', routingNumber: '', openedDate: '', description: '' }) });
    const a = await BankingService.closeAccount('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'closed');
  });
});

describe('BankingService — Transactions', () => {
  beforeEach(() => resetMock());

  it('creates a transaction with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'bank_transaction', content: args.data.content as string });
    const t = await BankingService.createTransaction('org-1', 'ws-1', {
      accountId: 'acc-1', type: 'debit', amount: 500, date: '2024-06-01',
    }, 'user-1');
    assert.equal(t.accountId, 'acc-1');
    assert.equal(t.type, 'debit');
    assert.equal(t.amount, 500);
    assert.equal(t.status, 'pending');
  });

  it('creates a transaction with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'bank_transaction', content: args.data.content as string });
    const t = await BankingService.createTransaction('org-1', 'ws-1', {
      accountId: 'acc-1', type: 'wire_in', amount: 10000, date: '2024-06-01',
      counterparty: 'Client A', reference: 'REF-001', status: 'posted', category: 'revenue',
    }, 'user-1');
    assert.equal(t.counterparty, 'Client A');
    assert.equal(t.status, 'posted');
    assert.equal(t.category, 'revenue');
  });

  it('gets a transaction by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'bank_transaction', content: JSON.stringify({
      accountId: 'a1', type: 'credit', amount: 100, description: '', date: '2024-01-01',
      counterparty: '', reference: '', status: 'posted', category: '',
    }) });
    const t = await BankingService.getTransaction('mem-1');
    assert.ok(t);
    assert.equal(t!.type, 'credit');
  });

  it('returns null for non-transaction type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'bank_account' });
    const t = await BankingService.getTransaction('mem-1');
    assert.equal(t, null);
  });

  it('lists transactions', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'bank_transaction', content: JSON.stringify({
      accountId: 'a1', type: 'debit', amount: 100, description: '', date: '2024-01-01',
      counterparty: '', reference: '', status: 'pending', category: '',
    }) })];
    const list = await BankingService.listTransactions('org-1');
    assert.equal(list.length, 1);
  });

  it('filters transactions by account', async () => {
    memFindManyImpl = async () => [
      makeRow({ type: 'bank_transaction', content: JSON.stringify({ accountId: 'a1', type: 'debit', amount: 100, description: '', date: '2024-01-01', counterparty: '', reference: '', status: 'pending', category: '' }) }),
      makeRow({ id: 'm2', type: 'bank_transaction', content: JSON.stringify({ accountId: 'a2', type: 'credit', amount: 200, description: '', date: '2024-01-01', counterparty: '', reference: '', status: 'pending', category: '' }) }),
    ];
    const list = await BankingService.listTransactions('org-1', { accountId: 'a2' });
    assert.equal(list.length, 1);
    assert.equal(list[0].accountId, 'a2');
  });

  it('updates a transaction', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'bank_transaction', content: JSON.stringify({
      accountId: 'a1', type: 'debit', amount: 100, description: '', date: '2024-01-01',
      counterparty: '', reference: '', status: 'pending', category: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'bank_transaction', content: args.data.content as string });
    const t = await BankingService.updateTransaction('mem-1', { amount: 250 });
    assert.ok(t);
    assert.equal(t!.amount, 250);
  });

  it('deletes a transaction', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await BankingService.deleteTransaction('mem-1');
    assert.equal(ok, true);
  });

  it('posts a transaction', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'bank_transaction', content: JSON.stringify({
      accountId: 'a1', type: 'debit', amount: 100, description: '', date: '2024-01-01',
      counterparty: '', reference: '', status: 'pending', category: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'bank_transaction', content: JSON.stringify({
      accountId: 'a1', type: 'debit', amount: 100, description: '', date: '2024-01-01',
      counterparty: '', reference: '', status: 'posted', category: '',
    }) });
    const t = await BankingService.postTransaction('mem-1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'posted');
  });
});

describe('BankingService — Reconciliations', () => {
  beforeEach(() => resetMock());

  it('creates a reconciliation with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'bank_reconciliation', content: args.data.content as string });
    const r = await BankingService.createReconciliation('org-1', 'ws-1', {
      accountId: 'acc-1', period: '2024-06', statementBalance: 100000,
    }, 'user-1');
    assert.equal(r.accountId, 'acc-1');
    assert.equal(r.period, '2024-06');
    assert.equal(r.statementBalance, 100000);
    assert.equal(r.status, 'in_progress');
  });

  it('gets a reconciliation by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'bank_reconciliation', content: JSON.stringify({
      accountId: 'a1', period: '2024-06', statementBalance: 1000, bookBalance: 1000, status: 'completed', notes: '',
    }) });
    const r = await BankingService.getReconciliation('mem-1');
    assert.ok(r);
    assert.equal(r!.period, '2024-06');
  });

  it('lists reconciliations', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'bank_reconciliation', content: JSON.stringify({
      accountId: 'a1', period: '2024-06', statementBalance: 1000, bookBalance: 1000, status: 'in_progress', notes: '',
    }) })];
    const list = await BankingService.listReconciliations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a reconciliation', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'bank_reconciliation', content: JSON.stringify({
      accountId: 'a1', period: '2024-06', statementBalance: 1000, bookBalance: 1000, status: 'in_progress', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'bank_reconciliation', content: args.data.content as string });
    const r = await BankingService.updateReconciliation('mem-1', { notes: 'Adjusted' });
    assert.ok(r);
  });

  it('completes a reconciliation', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'bank_reconciliation', content: JSON.stringify({
      accountId: 'a1', period: '2024-06', statementBalance: 1000, bookBalance: 1000, status: 'in_progress', notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'bank_reconciliation', content: JSON.stringify({
      accountId: 'a1', period: '2024-06', statementBalance: 1000, bookBalance: 1000, status: 'completed', notes: '',
    }) });
    const r = await BankingService.completeReconciliation('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });
});

describe('BankingService — Wire Transfers', () => {
  beforeEach(() => resetMock());

  it('creates a wire transfer with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'wire_transfer', content: args.data.content as string });
    const w = await BankingService.createWireTransfer('org-1', 'ws-1', {
      fromAccountId: 'acc-1', toAccountName: 'Vendor', toAccountNumber: '999',
      toRoutingNumber: '111', toBankName: 'BoA', amount: 5000,
    }, 'user-1');
    assert.equal(w.fromAccountId, 'acc-1');
    assert.equal(w.toAccountName, 'Vendor');
    assert.equal(w.amount, 5000);
    assert.equal(w.status, 'initiated');
    assert.equal(w.currency, 'USD');
  });

  it('creates a wire transfer with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'wire_transfer', content: args.data.content as string });
    const w = await BankingService.createWireTransfer('org-1', 'ws-1', {
      fromAccountId: 'acc-1', toAccountName: 'Vendor', toAccountNumber: '999',
      toRoutingNumber: '111', toBankName: 'BoA', amount: 5000,
      currency: 'EUR', purpose: 'Payment', recipientAddress: '123 St',
      intermediaryBank: 'MidBank', status: 'approved', initiatedDate: '2024-06-01', valueDate: '2024-06-03',
    }, 'user-1');
    assert.equal(w.currency, 'EUR');
    assert.equal(w.purpose, 'Payment');
    assert.equal(w.status, 'approved');
  });

  it('gets a wire transfer by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'wire_transfer', content: JSON.stringify({
      fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B',
      amount: 100, currency: 'USD', purpose: '', recipientAddress: '', intermediaryBank: '',
      status: 'sent', initiatedDate: '2024-01-01', valueDate: '',
    }) });
    const w = await BankingService.getWireTransfer('mem-1');
    assert.ok(w);
    assert.equal(w!.status, 'sent');
  });

  it('lists wire transfers', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'wire_transfer', content: JSON.stringify({
      fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B',
      amount: 100, currency: 'USD', purpose: '', recipientAddress: '', intermediaryBank: '',
      status: 'initiated', initiatedDate: '2024-01-01', valueDate: '',
    }) })];
    const list = await BankingService.listWireTransfers('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a wire transfer', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'wire_transfer', content: JSON.stringify({
      fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B',
      amount: 100, currency: 'USD', purpose: '', recipientAddress: '', intermediaryBank: '',
      status: 'initiated', initiatedDate: '2024-01-01', valueDate: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'wire_transfer', content: args.data.content as string });
    const w = await BankingService.updateWireTransfer('mem-1', { amount: 200 });
    assert.ok(w);
    assert.equal(w!.amount, 200);
  });

  it('approves a wire transfer', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'wire_transfer', content: JSON.stringify({
      fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B',
      amount: 100, currency: 'USD', purpose: '', recipientAddress: '', intermediaryBank: '',
      status: 'initiated', initiatedDate: '2024-01-01', valueDate: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'wire_transfer', content: JSON.stringify({
      fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B',
      amount: 100, currency: 'USD', purpose: '', recipientAddress: '', intermediaryBank: '',
      status: 'approved', initiatedDate: '2024-01-01', valueDate: '',
    }) });
    const w = await BankingService.approveWireTransfer('mem-1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'approved');
  });

  it('cancels a wire transfer with reason', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'wire_transfer', content: JSON.stringify({
      fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B',
      amount: 100, currency: 'USD', purpose: '', recipientAddress: '', intermediaryBank: '',
      status: 'initiated', initiatedDate: '2024-01-01', valueDate: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'wire_transfer', content: JSON.stringify({
      fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B',
      amount: 100, currency: 'USD', purpose: '[Cancelled by user-1: Error]', recipientAddress: '', intermediaryBank: '',
      status: 'cancelled', initiatedDate: '2024-01-01', valueDate: '',
    }) });
    const w = await BankingService.cancelWireTransfer('mem-1', 'Error', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'cancelled');
    assert.ok(w!.purpose.includes('Cancelled'));
  });
});

describe('BankingService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics', async () => {
    memFindManyImpl = async () => [
      makeRow({ type: 'bank_account', content: JSON.stringify({ accountName: 'A', accountNumber: '1', bankName: 'B', accountType: 'checking', currency: 'USD', balance: 50000, status: 'active', routingNumber: '', openedDate: '', description: '' }) }),
      makeRow({ type: 'bank_transaction', content: JSON.stringify({ accountId: 'a1', type: 'debit', amount: 100, description: '', date: '2024-01-01', counterparty: '', reference: '', status: 'pending', category: '' }) }),
      makeRow({ type: 'wire_transfer', content: JSON.stringify({ fromAccountId: 'a1', toAccountName: 'V', toAccountNumber: '1', toRoutingNumber: '2', toBankName: 'B', amount: 100, currency: 'USD', purpose: '', recipientAddress: '', intermediaryBank: '', status: 'initiated', initiatedDate: '2024-01-01', valueDate: '' }) }),
    ];
    const m = await BankingService.getBankingMetrics('org-1');
    assert.equal(m.totalBalance, 50000);
    assert.equal(m.pendingTransactions, 1);
    assert.equal(m.outstandingWires, 1);
  });

  it('returns stats with counts', async () => {
    memFindManyImpl = async () => [
      makeRow({ type: 'bank_account', content: JSON.stringify({ accountName: 'A', accountNumber: '1', bankName: 'B', accountType: 'checking', currency: 'USD', balance: 0, status: 'active', routingNumber: '', openedDate: '', description: '' }) }),
    ];
    const s = await BankingService.getBankingStats('org-1');
    assert.ok(s.accountCount >= 0);
    assert.ok(typeof s.activeAccountCount === 'number');
    assert.ok(typeof s.byAccountType === 'object');
  });
});
