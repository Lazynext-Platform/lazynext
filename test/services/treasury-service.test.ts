import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
    createdAt?: Record<string, unknown>;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
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

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'memory.count', args });
      return Promise.resolve(0);
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
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(
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

const { TreasuryService } =
  await import('@/lib/services/treasury-service');

// ─────────────────────────────────────────────────────────────────────────────
// TreasuryService
// ─────────────────────────────────────────────────────────────────────────────

describe('TreasuryService', () => {
  beforeEach(() => { resetMock(); });

  describe('createBankAccount', () => {
    it('creates a bank account with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'bank_account');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'Checking');
        assert.equal(content.bankName, 'Chase');
        assert.equal(content.currency, 'USD');
        assert.equal(content.balance, 0);
        assert.equal(content.type, 'checking');
        assert.equal(content.isActive, true);
        return makeRow('acct-1', 'bank_account', content);
      };

      const account = await TreasuryService.createBankAccount('org-1', 'ws-1', {
        name: 'Checking',
        bankName: 'Chase',
      }, 'user-1');

      assert.ok(account);
      assert.equal(account.id, 'acct-1');
      assert.equal(account.name, 'Checking');
      assert.equal(account.bankName, 'Chase');
      assert.equal(account.type, 'checking');
      assert.equal(account.isActive, true);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('stores provided balance, currency, and type', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.balance, 5000);
        assert.equal(content.currency, 'EUR');
        assert.equal(content.type, 'savings');
        return makeRow('acct-2', 'bank_account', content);
      };

      const account = await TreasuryService.createBankAccount('org-1', 'ws-1', {
        name: 'Savings',
        bankName: 'DB',
        balance: 5000,
        currency: 'EUR',
        type: 'savings',
      }, 'user-1');

      assert.equal(account.balance, 5000);
      assert.equal(account.currency, 'EUR');
      assert.equal(account.type, 'savings');
    });
  });

  describe('getBankAccount', () => {
    it('returns a bank account by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('acct-1', 'bank_account', {
          name: 'Checking', bankName: 'Chase', accountNumber: '123', currency: 'USD',
          balance: 1000, type: 'checking', isActive: true,
        });

      const account = await TreasuryService.getBankAccount('acct-1');

      assert.ok(account);
      assert.equal(account.id, 'acct-1');
      assert.equal(account.name, 'Checking');
      assert.equal(account.balance, 1000);
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when bank account not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const account = await TreasuryService.getBankAccount('nope');
      assert.equal(account, null);
    });
  });

  describe('listBankAccounts', () => {
    it('returns bank accounts for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('acct-1', 'bank_account', { name: 'A', bankName: 'Chase', accountNumber: '', currency: 'USD', balance: 100, type: 'checking', isActive: true }),
        makeRow('acct-2', 'bank_account', { name: 'B', bankName: 'Wells', accountNumber: '', currency: 'USD', balance: 200, type: 'savings', isActive: true }),
      ];

      const accounts = await TreasuryService.listBankAccounts('org-1');

      assert.equal(accounts.length, 2);
      assert.equal(accounts[0].id, 'acct-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('acct-1', 'bank_account', { name: 'A', bankName: '', accountNumber: '', currency: 'USD', balance: 0, type: 'checking', isActive: true }),
        makeRow('acct-2', 'bank_account', { name: 'B', bankName: '', accountNumber: '', currency: 'USD', balance: 0, type: 'savings', isActive: true }),
      ];

      const accounts = await TreasuryService.listBankAccounts('org-1', { type: 'savings' });

      assert.equal(accounts.length, 1);
      assert.equal(accounts[0].type, 'savings');
    });

    it('filters by isActive', async () => {
      memoryFindManyImpl = async () => [
        makeRow('acct-1', 'bank_account', { name: 'A', bankName: '', accountNumber: '', currency: 'USD', balance: 0, type: 'checking', isActive: true }),
        makeRow('acct-2', 'bank_account', { name: 'B', bankName: '', accountNumber: '', currency: 'USD', balance: 0, type: 'savings', isActive: false }),
      ];

      const accounts = await TreasuryService.listBankAccounts('org-1', { isActive: false });

      assert.equal(accounts.length, 1);
      assert.equal(accounts[0].isActive, false);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };
      const accounts = await TreasuryService.listBankAccounts('org-1');
      assert.deepEqual(accounts, []);
    });
  });

  describe('updateBankAccount', () => {
    it('updates bank account fields', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('acct-1', 'bank_account', { name: 'Old', bankName: 'Chase', accountNumber: '', currency: 'USD', balance: 100, type: 'checking', isActive: true });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'New Name');
        assert.equal(content.balance, 500);
        return makeRow('acct-1', 'bank_account', content);
      };

      const account = await TreasuryService.updateBankAccount('acct-1', { name: 'New Name', balance: 500 });

      assert.ok(account);
      assert.equal(account.name, 'New Name');
      assert.equal(account.balance, 500);
    });

    it('returns null when bank account not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const account = await TreasuryService.updateBankAccount('nope', { name: 'X' });
      assert.equal(account, null);
    });
  });

  describe('deleteBankAccount', () => {
    it('deletes a bank account', async () => {
      memoryDeleteImpl = async () => ({ id: 'acct-1' });
      const result = await TreasuryService.deleteBankAccount('acct-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('not found'); };
      const result = await TreasuryService.deleteBankAccount('nope');
      assert.equal(result, false);
    });
  });

  describe('recordCashPosition', () => {
    it('creates a cash position with account name lookup', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('acct-1', 'bank_account', { name: 'Checking', bankName: 'Chase', accountNumber: '', currency: 'USD', balance: 100, type: 'checking', isActive: true });
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'cash_position');
        const content = JSON.parse(args.data.content);
        assert.equal(content.accountId, 'acct-1');
        assert.equal(content.accountName, 'Checking');
        assert.equal(content.balance, 5000);
        assert.equal(content.date, '2025-01-15');
        return makeRow('pos-1', 'cash_position', content, { sourceId: 'acct-1' });
      };

      const position = await TreasuryService.recordCashPosition('org-1', 'ws-1', {
        accountId: 'acct-1',
        balance: 5000,
        date: '2025-01-15',
      }, 'user-1');

      assert.ok(position);
      assert.equal(position.id, 'pos-1');
      assert.equal(position.accountName, 'Checking');
      assert.equal(position.balance, 5000);
    });

    it('creates cash position with empty account name when account not found', async () => {
      memoryFindUniqueImpl = async () => null;
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.accountName, '');
        return makeRow('pos-2', 'cash_position', content);
      };

      const position = await TreasuryService.recordCashPosition('org-1', 'ws-1', {
        accountId: 'nope',
        balance: 100,
        date: '2025-01-01',
      }, 'user-1');

      assert.equal(position.accountName, '');
    });
  });

  describe('getCashPositions', () => {
    it('returns cash positions for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('pos-1', 'cash_position', { accountId: 'a1', accountName: 'A', balance: 100, date: '2025-01-01', notes: '' }),
        makeRow('pos-2', 'cash_position', { accountId: 'a2', accountName: 'B', balance: 200, date: '2025-01-02', notes: '' }),
      ];

      const positions = await TreasuryService.getCashPositions('org-1');

      assert.equal(positions.length, 2);
      assert.equal(positions[0].id, 'pos-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by accountId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('pos-1', 'cash_position', { accountId: 'a1', accountName: 'A', balance: 100, date: '2025-01-01', notes: '' }),
        makeRow('pos-2', 'cash_position', { accountId: 'a2', accountName: 'B', balance: 200, date: '2025-01-02', notes: '' }),
      ];

      const positions = await TreasuryService.getCashPositions('org-1', { accountId: 'a2' });

      assert.equal(positions.length, 1);
      assert.equal(positions[0].accountId, 'a2');
    });

    it('filters by date range', async () => {
      memoryFindManyImpl = async () => [
        makeRow('pos-1', 'cash_position', { accountId: 'a1', accountName: 'A', balance: 100, date: '2025-01-01', notes: '' }),
        makeRow('pos-2', 'cash_position', { accountId: 'a2', accountName: 'B', balance: 200, date: '2025-02-01', notes: '' }),
      ];

      const positions = await TreasuryService.getCashPositions('org-1', {
        fromDate: new Date('2025-01-15'),
        toDate: new Date('2025-03-01'),
      });

      assert.equal(positions.length, 1);
      assert.equal(positions[0].id, 'pos-2');
    });
  });

  describe('getCurrentCashPosition', () => {
    it('sums balances of active accounts', async () => {
      memoryFindManyImpl = async () => [
        makeRow('acct-1', 'bank_account', { name: 'A', bankName: '', accountNumber: '', currency: 'USD', balance: 1000, type: 'checking', isActive: true }),
        makeRow('acct-2', 'bank_account', { name: 'B', bankName: '', accountNumber: '', currency: 'USD', balance: 500, type: 'savings', isActive: true }),
        makeRow('acct-3', 'bank_account', { name: 'C', bankName: '', accountNumber: '', currency: 'USD', balance: 999, type: 'checking', isActive: false }),
      ];

      const total = await TreasuryService.getCurrentCashPosition('org-1');

      assert.equal(total, 1500);
    });
  });

  describe('createForecast', () => {
    it('creates a forecast with computed totals', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'cash_flow_forecast');
        const content = JSON.parse(args.data.content);
        assert.equal(content.period, '2025-01');
        assert.equal(content.totalInflows, 300);
        assert.equal(content.totalOutflows, 100);
        assert.equal(content.netFlow, 200);
        return makeRow('fc-1', 'cash_flow_forecast', content);
      };

      const forecast = await TreasuryService.createForecast('org-1', 'ws-1', {
        period: '2025-01',
        expectedInflows: [
          { source: 'sales', amount: 200, date: '2025-01-10' },
          { source: 'invest', amount: 100, date: '2025-01-15' },
        ],
        expectedOutflows: [
          { category: 'rent', amount: 100, date: '2025-01-05' },
        ],
      }, 'user-1');

      assert.ok(forecast);
      assert.equal(forecast.id, 'fc-1');
      assert.equal(forecast.totalInflows, 300);
      assert.equal(forecast.totalOutflows, 100);
      assert.equal(forecast.netFlow, 200);
    });
  });

  describe('getForecast', () => {
    it('returns a forecast by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('fc-1', 'cash_flow_forecast', {
          period: '2025-01', expectedInflows: [], expectedOutflows: [],
          notes: '', totalInflows: 0, totalOutflows: 0, netFlow: 0,
        });

      const forecast = await TreasuryService.getForecast('fc-1');

      assert.ok(forecast);
      assert.equal(forecast.id, 'fc-1');
      assert.equal(forecast.period, '2025-01');
    });

    it('returns null when forecast not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const forecast = await TreasuryService.getForecast('nope');
      assert.equal(forecast, null);
    });
  });

  describe('listForecasts', () => {
    it('returns forecasts for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('fc-1', 'cash_flow_forecast', { period: '2025-01', expectedInflows: [], expectedOutflows: [], notes: '', totalInflows: 0, totalOutflows: 0, netFlow: 0 }),
        makeRow('fc-2', 'cash_flow_forecast', { period: '2025-02', expectedInflows: [], expectedOutflows: [], notes: '', totalInflows: 0, totalOutflows: 0, netFlow: 0 }),
      ];

      const forecasts = await TreasuryService.listForecasts('org-1');

      assert.equal(forecasts.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by period', async () => {
      memoryFindManyImpl = async () => [
        makeRow('fc-1', 'cash_flow_forecast', { period: '2025-01', expectedInflows: [], expectedOutflows: [], notes: '', totalInflows: 0, totalOutflows: 0, netFlow: 0 }),
        makeRow('fc-2', 'cash_flow_forecast', { period: '2025-02', expectedInflows: [], expectedOutflows: [], notes: '', totalInflows: 0, totalOutflows: 0, netFlow: 0 }),
      ];

      const forecasts = await TreasuryService.listForecasts('org-1', { period: '2025-02' });

      assert.equal(forecasts.length, 1);
      assert.equal(forecasts[0].period, '2025-02');
    });
  });

  describe('deleteForecast', () => {
    it('deletes a forecast', async () => {
      memoryDeleteImpl = async () => ({ id: 'fc-1' });
      const result = await TreasuryService.deleteForecast('fc-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('not found'); };
      const result = await TreasuryService.deleteForecast('nope');
      assert.equal(result, false);
    });
  });

  describe('getCashFlowSummary', () => {
    it('sums inflows and outflows across forecasts', async () => {
      memoryFindManyImpl = async () => [
        makeRow('fc-1', 'cash_flow_forecast', {
          period: '2025-01',
          expectedInflows: [{ source: 'sales', amount: 200, date: '2025-01-10' }],
          expectedOutflows: [{ category: 'rent', amount: 100, date: '2025-01-05' }],
          notes: '', totalInflows: 200, totalOutflows: 100, netFlow: 100,
        }),
      ];

      const summary = await TreasuryService.getCashFlowSummary('org-1');

      assert.equal(summary.totalInflows, 200);
      assert.equal(summary.totalOutflows, 100);
      assert.equal(summary.net, 100);
    });

    it('filters by date range', async () => {
      memoryFindManyImpl = async () => [
        makeRow('fc-1', 'cash_flow_forecast', {
          period: '2025-01',
          expectedInflows: [
            { source: 'a', amount: 100, date: '2025-01-01' },
            { source: 'b', amount: 200, date: '2025-02-15' },
          ],
          expectedOutflows: [],
          notes: '', totalInflows: 300, totalOutflows: 0, netFlow: 300,
        }),
      ];

      const summary = await TreasuryService.getCashFlowSummary('org-1', {
        fromDate: new Date('2025-02-01'),
      });

      assert.equal(summary.totalInflows, 200);
      assert.equal(summary.totalOutflows, 0);
      assert.equal(summary.net, 200);
    });
  });

  describe('createPaymentApproval', () => {
    it('creates a payment approval with pending status', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'payment_approval');
        const content = JSON.parse(args.data.content);
        assert.equal(content.payee, 'Vendor Co');
        assert.equal(content.amount, 500);
        assert.equal(content.status, 'pending');
        assert.equal(content.approvedBy, '');
        return makeRow('pay-1', 'payment_approval', content);
      };

      const payment = await TreasuryService.createPaymentApproval('org-1', 'ws-1', {
        payee: 'Vendor Co',
        amount: 500,
        category: 'services',
      }, 'user-1');

      assert.ok(payment);
      assert.equal(payment.id, 'pay-1');
      assert.equal(payment.payee, 'Vendor Co');
      assert.equal(payment.amount, 500);
      assert.equal(payment.status, 'pending');
    });
  });

  describe('getPaymentApproval', () => {
    it('returns a payment approval by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('pay-1', 'payment_approval', {
          payee: 'Vendor', amount: 100, currency: 'USD', dueDate: '', category: '',
          description: '', bankAccountId: '', status: 'pending', approvedBy: '',
          approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '',
        });

      const payment = await TreasuryService.getPaymentApproval('pay-1');

      assert.ok(payment);
      assert.equal(payment.id, 'pay-1');
      assert.equal(payment.payee, 'Vendor');
    });

    it('returns null when payment not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const payment = await TreasuryService.getPaymentApproval('nope');
      assert.equal(payment, null);
    });
  });

  describe('listPaymentApprovals', () => {
    it('returns payment approvals for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('pay-1', 'payment_approval', { payee: 'A', amount: 100, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'pending', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
        makeRow('pay-2', 'payment_approval', { payee: 'B', amount: 200, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'approved', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
      ];

      const payments = await TreasuryService.listPaymentApprovals('org-1');

      assert.equal(payments.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('pay-1', 'payment_approval', { payee: 'A', amount: 100, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'pending', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
        makeRow('pay-2', 'payment_approval', { payee: 'B', amount: 200, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'approved', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
      ];

      const payments = await TreasuryService.listPaymentApprovals('org-1', { status: 'approved' });

      assert.equal(payments.length, 1);
      assert.equal(payments[0].status, 'approved');
    });
  });

  describe('approvePayment', () => {
    it('approves a payment and sets approvedBy', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('pay-1', 'payment_approval', { payee: 'Vendor', amount: 100, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'pending', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'approved');
        assert.equal(content.approvedBy, 'admin-1');
        assert.ok(content.approvedAt);
        return makeRow('pay-1', 'payment_approval', content);
      };

      const payment = await TreasuryService.approvePayment('pay-1', 'admin-1');

      assert.ok(payment);
      assert.equal(payment.status, 'approved');
      assert.equal(payment.approvedBy, 'admin-1');
      assert.ok(payment.approvedAt);
    });

    it('returns null when payment not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const payment = await TreasuryService.approvePayment('nope', 'admin-1');
      assert.equal(payment, null);
    });
  });

  describe('rejectPayment', () => {
    it('rejects a payment with reason and rejectedBy', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('pay-1', 'payment_approval', { payee: 'Vendor', amount: 100, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'pending', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'rejected');
        assert.equal(content.rejectedBy, 'admin-1');
        assert.equal(content.rejectionReason, 'Invalid invoice');
        assert.ok(content.rejectedAt);
        return makeRow('pay-1', 'payment_approval', content);
      };

      const payment = await TreasuryService.rejectPayment('pay-1', 'Invalid invoice', 'admin-1');

      assert.ok(payment);
      assert.equal(payment.status, 'rejected');
      assert.equal(payment.rejectedBy, 'admin-1');
      assert.equal(payment.rejectionReason, 'Invalid invoice');
    });

    it('returns null when payment not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const payment = await TreasuryService.rejectPayment('nope', 'reason', 'admin-1');
      assert.equal(payment, null);
    });
  });

  describe('getLiquidityAnalysis', () => {
    it('computes current cash, pending payments, and projected balance', async () => {
      // listBankAccounts (active) → getCurrentCashPosition
      // listPaymentApprovals (pending) → pending total
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where.type === 'bank_account') {
          return [
            makeRow('acct-1', 'bank_account', { name: 'A', bankName: '', accountNumber: '', currency: 'USD', balance: 1000, type: 'checking', isActive: true }),
            makeRow('acct-2', 'bank_account', { name: 'B', bankName: '', accountNumber: '', currency: 'USD', balance: 500, type: 'savings', isActive: true }),
          ];
        }
        if (args.where.type === 'payment_approval') {
          return [
            makeRow('pay-1', 'payment_approval', { payee: 'A', amount: 200, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'pending', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
            makeRow('pay-2', 'payment_approval', { payee: 'B', amount: 300, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'approved', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
          ];
        }
        return [];
      };

      const liquidity = await TreasuryService.getLiquidityAnalysis('org-1');

      assert.equal(liquidity.currentCash, 1500);
      assert.equal(liquidity.pendingPayments, 200);
      assert.equal(liquidity.projectedBalance, 1300);
      assert.equal(liquidity.pendingCount, 1);
    });
  });

  describe('getStats', () => {
    it('aggregates treasury stats', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where.type === 'bank_account') {
          return [
            makeRow('acct-1', 'bank_account', { name: 'A', bankName: '', accountNumber: '', currency: 'USD', balance: 1000, type: 'checking', isActive: true }),
            makeRow('acct-2', 'bank_account', { name: 'B', bankName: '', accountNumber: '', currency: 'USD', balance: 500, type: 'savings', isActive: false }),
          ];
        }
        if (args.where.type === 'cash_position') {
          return [makeRow('pos-1', 'cash_position', { accountId: 'a1', accountName: 'A', balance: 100, date: '', notes: '' })];
        }
        if (args.where.type === 'cash_flow_forecast') {
          return [makeRow('fc-1', 'cash_flow_forecast', { period: '2025-01', expectedInflows: [], expectedOutflows: [], notes: '', totalInflows: 0, totalOutflows: 0, netFlow: 0 })];
        }
        if (args.where.type === 'payment_approval') {
          return [
            makeRow('pay-1', 'payment_approval', { payee: 'A', amount: 200, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'pending', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
            makeRow('pay-2', 'payment_approval', { payee: 'B', amount: 100, currency: 'USD', dueDate: '', category: '', description: '', bankAccountId: '', status: 'approved', approvedBy: '', approvedAt: null, rejectedBy: '', rejectedAt: null, rejectionReason: '' }),
          ];
        }
        return [];
      };

      const stats = await TreasuryService.getStats('org-1');

      assert.equal(stats.bankAccountCount, 2);
      assert.equal(stats.activeAccountCount, 1);
      assert.equal(stats.cashPositionCount, 1);
      assert.equal(stats.forecastCount, 1);
      assert.equal(stats.paymentApprovalCount, 2);
      assert.equal(stats.pendingPaymentCount, 1);
      assert.equal(stats.totalCash, 1000);
      assert.equal(stats.pendingPayments, 200);
    });

    it('returns zero stats when no data', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await TreasuryService.getStats('org-1');

      assert.equal(stats.bankAccountCount, 0);
      assert.equal(stats.activeAccountCount, 0);
      assert.equal(stats.cashPositionCount, 0);
      assert.equal(stats.forecastCount, 0);
      assert.equal(stats.paymentApprovalCount, 0);
      assert.equal(stats.pendingPaymentCount, 0);
      assert.equal(stats.totalCash, 0);
      assert.equal(stats.pendingPayments, 0);
    });
  });
});
