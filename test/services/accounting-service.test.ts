import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  select?: unknown;
  include?: unknown;
};
type FindUniqueArgs = {
  where: Record<string, unknown>;
  include?: unknown;
};
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type UpdateManyArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type AggregateArgs = { where: Record<string, unknown>; _sum?: unknown };
type FindFirstArgs = { where: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// GLAccount
let glAccountFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let glAccountFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let glAccountCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let glAccountUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let glAccountDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let glAccountCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// JournalEntry
let journalEntryFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let journalEntryFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let journalEntryCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let journalEntryUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let journalEntryUpdateManyImpl: (args: UpdateManyArgs) => Promise<unknown> = async () => ({});
let journalEntryCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// JournalLine
let journalLineFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let journalLineCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let journalLineAggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { debit: 0, credit: 0 } });
let journalLineCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// Memory
let memoryFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memoryCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// Workspace (used in closePeriod)
let workspaceFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => null;

const prismaMock = {
  gLAccount: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'gLAccount.findUnique', args }); return glAccountFindUniqueImpl(args); },
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'gLAccount.findMany', args }); return glAccountFindManyImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'gLAccount.create', args }); return glAccountCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'gLAccount.update', args }); return glAccountUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'gLAccount.delete', args }); return glAccountDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'gLAccount.count', args }); return glAccountCountImpl(args); },
  },
  journalEntry: {
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'journalEntry.findUnique', args }); return journalEntryFindUniqueImpl(args); },
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'journalEntry.findMany', args }); return journalEntryFindManyImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'journalEntry.create', args }); return journalEntryCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'journalEntry.update', args }); return journalEntryUpdateImpl(args); },
    updateMany: (args: UpdateManyArgs): Promise<unknown> => { calls.push({ method: 'journalEntry.updateMany', args }); return journalEntryUpdateManyImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'journalEntry.count', args }); return journalEntryCountImpl(args); },
  },
  journalLine: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'journalLine.findMany', args }); return journalLineFindManyImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'journalLine.create', args }); return journalLineCreateImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'journalLine.aggregate', args }); return journalLineAggregateImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'journalLine.count', args }); return journalLineCountImpl(args); },
  },
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memoryFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memoryFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memoryCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memoryUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memoryDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memoryCountImpl(args); },
  },
  workspace: {
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'workspace.findFirst', args }); return workspaceFindFirstImpl(args); },
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
  glAccountFindUniqueImpl = async () => null;
  glAccountFindManyImpl = async () => [];
  glAccountCreateImpl = async () => ({});
  glAccountUpdateImpl = async () => ({});
  glAccountDeleteImpl = async () => ({});
  glAccountCountImpl = async () => 0;
  journalEntryFindUniqueImpl = async () => null;
  journalEntryFindManyImpl = async () => [];
  journalEntryCreateImpl = async () => ({});
  journalEntryUpdateImpl = async () => ({});
  journalEntryUpdateManyImpl = async () => ({});
  journalEntryCountImpl = async () => 0;
  journalLineFindManyImpl = async () => [];
  journalLineCreateImpl = async () => ({});
  journalLineAggregateImpl = async () => ({ _sum: { debit: 0, credit: 0 } });
  journalLineCountImpl = async () => 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  memoryCountImpl = async () => 0;
  workspaceFindFirstImpl = async () => null;
}

const { AccountingService } = await import('@/lib/services/accounting-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AccountingService', () => {
  beforeEach(() => { resetMock(); });

  describe('createAccount', () => {
    it('creates a GL account with defaults', async () => {
      glAccountCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.organizationId, 'org-1');
        assert.equal(args.data.code, '1000');
        assert.equal(args.data.name, 'Cash');
        assert.equal(args.data.type, 'asset');
        assert.equal(args.data.subtype, '');
        assert.equal(args.data.openingBalance, 0);
        assert.equal(args.data.currency, 'USD');
        return { id: 'a1', ...args.data };
      };

      const result = await AccountingService.createAccount('org-1', {
        code: '1000',
        name: 'Cash',
        type: 'asset',
      });
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'a1');
    });

    it('throws when account code already exists', async () => {
      glAccountFindUniqueImpl = async () => ({ id: 'existing', code: '1000' });

      await assert.rejects(
        () => AccountingService.createAccount('org-1', { code: '1000', name: 'Cash', type: 'asset' }),
        /account_code_already_exists/,
      );
    });

    it('passes through provided subtype, openingBalance, and currency', async () => {
      glAccountCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.subtype, 'current');
        assert.equal(args.data.openingBalance, 500);
        assert.equal(args.data.currency, 'EUR');
        return { id: 'a2' };
      };

      await AccountingService.createAccount('org-1', {
        code: '1100',
        name: 'Bank',
        type: 'asset',
        subtype: 'current',
        openingBalance: 500,
        currency: 'EUR',
      });
    });
  });

  describe('getAccount', () => {
    it('returns an account by id', async () => {
      glAccountFindUniqueImpl = async () => ({ id: 'a1', code: '1000', name: 'Cash' });
      const result = await AccountingService.getAccount('a1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'a1');
    });

    it('returns null when not found', async () => {
      glAccountFindUniqueImpl = async () => null;
      const result = await AccountingService.getAccount('nope');
      assert.equal(result, null);
    });
  });

  describe('listAccounts', () => {
    it('lists accounts for an organization ordered by code', async () => {
      glAccountFindManyImpl = async () => ([{ id: 'a1' }, { id: 'a2' }]);
      const result = await AccountingService.listAccounts('org-1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.deepEqual(args.orderBy, { code: 'asc' });
    });

    it('applies type and isActive filters', async () => {
      glAccountFindManyImpl = async () => [];
      await AccountingService.listAccounts('org-1', { type: 'asset', isActive: true });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.type, 'asset');
      assert.equal(args.where.isActive, true);
    });

    it('returns empty array on error', async () => {
      glAccountFindManyImpl = async () => { throw new Error('fail'); };
      const result = await AccountingService.listAccounts('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateAccount', () => {
    it('updates only provided fields', async () => {
      glAccountUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.name, 'Cash Updated');
        assert.equal(args.data.code, undefined);
        return { id: 'a1', ...args.data };
      };
      const result = await AccountingService.updateAccount('a1', { name: 'Cash Updated' });
      assert.ok(result);
    });
  });

  describe('deleteAccount', () => {
    it('deletes an account with no journal lines', async () => {
      journalLineCountImpl = async () => 0;
      glAccountDeleteImpl = async () => ({ id: 'a1' });
      await AccountingService.deleteAccount('a1');
      assert.equal(calls[0].method, 'journalLine.count');
      assert.equal(calls[1].method, 'gLAccount.delete');
    });

    it('throws when account has journal lines', async () => {
      journalLineCountImpl = async () => 5;
      await assert.rejects(
        () => AccountingService.deleteAccount('a1'),
        /account_has_journal_lines/,
      );
    });
  });

  describe('getAccountBalance', () => {
    it('computes balance for an asset account (debit-normal)', async () => {
      glAccountFindUniqueImpl = async () => ({
        id: 'a1', code: '1000', name: 'Cash', type: 'asset', openingBalance: 100,
      });
      journalLineFindManyImpl = async () => ([
        { debit: 500, credit: 200 },
      ]);
      const result = await AccountingService.getAccountBalance('org-1', 'a1');
      // balance = openingBalance(100) + (debitTotal(500) - creditTotal(200)) = 400
      assert.equal(result.balance, 400);
      assert.equal(result.debitTotal, 500);
      assert.equal(result.creditTotal, 200);
    });

    it('computes balance for a liability account (credit-normal)', async () => {
      glAccountFindUniqueImpl = async () => ({
        id: 'a2', code: '2000', name: 'AP', type: 'liability', openingBalance: 0,
      });
      journalLineFindManyImpl = async () => ([
        { debit: 100, credit: 600 },
      ]);
      const result = await AccountingService.getAccountBalance('org-1', 'a2');
      // balance = 0 + (creditTotal(600) - debitTotal(100)) = 500
      assert.equal(result.balance, 500);
    });

    it('throws when account not found', async () => {
      glAccountFindUniqueImpl = async () => null;
      await assert.rejects(
        () => AccountingService.getAccountBalance('org-1', 'nope'),
        /account_not_found/,
      );
    });
  });

  describe('getChartOfAccounts', () => {
    it('returns balances for all accounts', async () => {
      const accounts = [
        { id: 'a1', code: '1000', name: 'Cash', type: 'asset', openingBalance: 0 },
        { id: 'a2', code: '2000', name: 'AP', type: 'liability', openingBalance: 0 },
      ];
      glAccountFindManyImpl = async () => accounts;
      glAccountFindUniqueImpl = async (args: FindUniqueArgs) =>
        accounts.find((a) => a.id === args.where.id) ?? null;
      journalLineFindManyImpl = async () => [];
      const result = await AccountingService.getChartOfAccounts('org-1');
      assert.equal(result.length, 2);
      assert.equal(result[0].code, '1000');
    });
  });

  describe('createJournalEntry', () => {
    it('creates a balanced journal entry with auto entry number', async () => {
      journalEntryCountImpl = async () => 3;
      journalEntryCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.entryNumber, 'JE-0004');
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.isReversed, false);
        assert.ok((args.data.lines as { create: unknown[] }).create.length === 2);
        return { id: 'je1', ...args.data };
      };
      const result = await AccountingService.createJournalEntry(
        'org-1', null,
        { lines: [{ accountId: 'a1', debit: 100, credit: 0 }, { accountId: 'a2', debit: 0, credit: 100 }] },
        'user-1',
      );
      assert.ok(result);
    });

    it('throws when debits do not equal credits', async () => {
      await assert.rejects(
        () => AccountingService.createJournalEntry(
          'org-1', null,
          { lines: [{ accountId: 'a1', debit: 100, credit: 0 }, { accountId: 'a2', debit: 0, credit: 50 }] },
          'user-1',
        ),
        /journal_entry_not_balanced/,
      );
    });

    it('throws when fewer than two lines', async () => {
      await assert.rejects(
        () => AccountingService.createJournalEntry(
          'org-1', null,
          { lines: [{ accountId: 'a1', debit: 100, credit: 100 }] },
          'user-1',
        ),
        /journal_entry_requires_at_least_two_lines/,
      );
    });

    it('throws when period is closed', async () => {
      memoryFindManyImpl = async () => ([
        { content: JSON.stringify({ period: '2024-01' }) },
      ]);
      const date = new Date('2024-01-15');
      await assert.rejects(
        () => AccountingService.createJournalEntry(
          'org-1', null,
          { date, lines: [{ accountId: 'a1', debit: 100, credit: 0 }, { accountId: 'a2', debit: 0, credit: 100 }] },
          'user-1',
        ),
        /period_is_closed/,
      );
    });
  });

  describe('getJournalEntry', () => {
    it('returns an entry with lines and accounts', async () => {
      journalEntryFindUniqueImpl = async () => ({
        id: 'je1', entryNumber: 'JE-0001', lines: [{ id: 'l1', account: { id: 'a1' } }],
      });
      const result = await AccountingService.getJournalEntry('je1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'je1');
    });

    it('returns null when not found', async () => {
      journalEntryFindUniqueImpl = async () => null;
      const result = await AccountingService.getJournalEntry('nope');
      assert.equal(result, null);
    });
  });

  describe('listJournalEntries', () => {
    it('lists entries with filters', async () => {
      journalEntryFindManyImpl = async () => ([{ id: 'je1' }]);
      const result = await AccountingService.listJournalEntries('org-1', { status: 'posted', period: '2024-01' });
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.status, 'posted');
      assert.equal(args.where.period, '2024-01');
    });

    it('applies date range filter', async () => {
      journalEntryFindManyImpl = async () => [];
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      await AccountingService.listJournalEntries('org-1', { fromDate: from, toDate: to });
      const args = calls[0].args as FindManyArgs;
      assert.deepEqual(args.where.date, { gte: from, lte: to });
    });
  });

  describe('postJournalEntry', () => {
    it('posts a draft entry', async () => {
      journalEntryFindUniqueImpl = async () => ({ id: 'je1', status: 'draft' });
      journalEntryUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'posted');
        return { id: 'je1', status: 'posted' };
      };
      const result = await AccountingService.postJournalEntry('je1');
      assert.equal((result as { status: string }).status, 'posted');
    });

    it('throws when entry not found', async () => {
      journalEntryFindUniqueImpl = async () => null;
      await assert.rejects(
        () => AccountingService.postJournalEntry('nope'),
        /journal_entry_not_found/,
      );
    });

    it('throws when already posted', async () => {
      journalEntryFindUniqueImpl = async () => ({ id: 'je1', status: 'posted' });
      await assert.rejects(
        () => AccountingService.postJournalEntry('je1'),
        /journal_entry_already_posted/,
      );
    });
  });

  describe('reverseJournalEntry', () => {
    it('creates a reversal entry with swapped debits/credits', async () => {
      journalEntryFindUniqueImpl = async () => ({
        id: 'je1', organizationId: 'org-1', workspaceId: null, entryNumber: 'JE-0001',
        reference: 'ref-1', isReversed: false,
        lines: [{ accountId: 'a1', debit: 100, credit: 0, description: 'orig' }],
      });
      journalEntryCountImpl = async () => 5;
      journalEntryCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'posted');
        assert.equal(args.data.reversedBy, 'je1');
        const lines = (args.data.lines as { create: Array<{ debit: number; credit: number }> }).create;
        assert.equal(lines[0].debit, 0); // swapped
        assert.equal(lines[0].credit, 100); // swapped
        return { id: 'je2', ...args.data };
      };
      const result = await AccountingService.reverseJournalEntry('je1', 'mistake');
      assert.ok(result);
    });

    it('throws when entry not found', async () => {
      journalEntryFindUniqueImpl = async () => null;
      await assert.rejects(
        () => AccountingService.reverseJournalEntry('nope', 'reason'),
        /journal_entry_not_found/,
      );
    });

    it('throws when already reversed', async () => {
      journalEntryFindUniqueImpl = async () => ({
        id: 'je1', organizationId: 'org-1', isReversed: true, lines: [],
      });
      await assert.rejects(
        () => AccountingService.reverseJournalEntry('je1', 'reason'),
        /journal_entry_already_reversed/,
      );
    });
  });

  describe('getTrialBalance', () => {
    it('returns trial balance with totals', async () => {
      const accounts = [
        { id: 'a1', code: '1000', name: 'Cash', type: 'asset', subtype: 'current', openingBalance: 0 },
        { id: 'a2', code: '2000', name: 'AP', type: 'liability', subtype: 'current', openingBalance: 0 },
      ];
      glAccountFindManyImpl = async () => accounts;
      glAccountFindUniqueImpl = async (args: FindUniqueArgs) =>
        accounts.find((a) => a.id === args.where.id) ?? null;
      journalLineFindManyImpl = async (args: FindManyArgs) => {
        const accountId = args.where.accountId as string;
        if (accountId === 'a1') return [{ debit: 500, credit: 0 }];
        return [];
      };
      const result = await AccountingService.getTrialBalance('org-1');
      assert.equal(result.lines.length, 2);
      assert.equal(result.totalDebits, 500);
      assert.equal(result.totalCredits, 0);
    });
  });

  describe('getFinancialStatements', () => {
    it('returns balance sheet, income statement, and cash flow', async () => {
      const accounts = [
        { id: 'a1', code: '1000', name: 'Cash', type: 'asset', subtype: 'current', openingBalance: 0 },
        { id: 'a2', code: '4000', name: 'Revenue', type: 'revenue', subtype: 'sales', openingBalance: 0 },
      ];
      glAccountFindManyImpl = async () => accounts;
      glAccountFindUniqueImpl = async (args: FindUniqueArgs) =>
        accounts.find((a) => a.id === args.where.id) ?? null;
      journalLineFindManyImpl = async (args: FindManyArgs) => {
        const accountId = args.where.accountId as string;
        if (accountId === 'a1') return [{ debit: 1000, credit: 0 }];
        if (accountId === 'a2') return [{ debit: 0, credit: 1000 }];
        return [];
      };
      const result = await AccountingService.getFinancialStatements('org-1');
      assert.ok(result.balanceSheet);
      assert.ok(result.incomeStatement);
      assert.ok(result.cashFlowSummary);
      assert.equal(result.balanceSheet.totalAssets, 1000);
      assert.equal(result.incomeStatement.totalRevenue, 1000);
    });
  });

  describe('getGeneralLedger', () => {
    it('returns posted journal lines mapped to ledger lines', async () => {
      journalLineFindManyImpl = async () => ([
        {
          journalEntryId: 'je1',
          accountId: 'a1',
          debit: 100,
          credit: 0,
          description: 'line desc',
          account: { id: 'a1', code: '1000', name: 'Cash' },
          journalEntry: { id: 'je1', entryNumber: 'JE-0001', date: new Date('2024-01-01'), description: 'entry', reference: 'ref', status: 'posted' },
        },
      ]);
      const result = await AccountingService.getGeneralLedger('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].entryNumber, 'JE-0001');
      assert.equal(result[0].accountCode, '1000');
      assert.equal(result[0].debit, 100);
    });

    it('returns empty array on error', async () => {
      journalLineFindManyImpl = async () => { throw new Error('fail'); };
      const result = await AccountingService.getGeneralLedger('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('closePeriod', () => {
    it('posts draft entries and records closed period in memory', async () => {
      workspaceFindFirstImpl = async () => ({ id: 'ws-1' });
      memoryCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'closed_period');
        const content = JSON.parse(args.data.content as string) as { period: string };
        assert.equal(content.period, '2024-01');
        return { id: 'm1' };
      };
      const result = await AccountingService.closePeriod('org-1', '2024-01');
      assert.ok(result);
      // Should have called updateMany to post drafts
      assert.ok(calls.some((c) => c.method === 'journalEntry.updateMany'));
      // Should have created a memory record
      assert.ok(calls.some((c) => c.method === 'memory.create'));
    });
  });

  describe('getPeriodStatus', () => {
    it('returns true when period is closed', async () => {
      memoryFindManyImpl = async () => ([
        { content: JSON.stringify({ period: '2024-01' }) },
      ]);
      const result = await AccountingService.getPeriodStatus('org-1', '2024-01');
      assert.equal(result, true);
    });

    it('returns false when period is not closed', async () => {
      memoryFindManyImpl = async () => ([
        { content: JSON.stringify({ period: '2023-12' }) },
      ]);
      const result = await AccountingService.getPeriodStatus('org-1', '2024-01');
      assert.equal(result, false);
    });

    it('returns false on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };
      const result = await AccountingService.getPeriodStatus('org-1', '2024-01');
      assert.equal(result, false);
    });
  });

  describe('getStats', () => {
    it('aggregates accounting stats', async () => {
      glAccountCountImpl = async () => 10;
      journalEntryCountImpl = async (args: CountArgs) => {
        if ((args.where as { status?: string }).status === 'posted') return 8;
        if ((args.where as { status?: string }).status === 'draft') return 2;
        return 10;
      };
      memoryCountImpl = async () => 1;
      journalEntryFindManyImpl = async () => ([
        { lines: [{ debit: 500, credit: 500 }] },
      ]);
      const stats = await AccountingService.getStats('org-1');
      assert.equal(stats.accountCount, 10);
      assert.equal(stats.journalEntryCount, 10);
      assert.equal(stats.postedEntryCount, 8);
      assert.equal(stats.draftEntryCount, 2);
      assert.equal(stats.closedPeriods, 1);
      assert.equal(stats.totalDebits, 500);
      assert.equal(stats.totalCredits, 500);
    });
  });
});
