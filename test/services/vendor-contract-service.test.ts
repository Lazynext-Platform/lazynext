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

function makeRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'vendor_contract',
    content: JSON.stringify(content),
    sourceId: content.vendorId ?? null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { VendorContractService } = await import('@/lib/services/vendor-contract-service');

// ─────────────────────────────────────────────────────────────────────────────
// VendorContractService
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorContractService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a contract with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'vendor_contract');
        assert.equal(args.data.sourceId, 'vendor-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.title, 'Service Agreement');
        assert.equal(content.contractType, 'service');
        assert.equal(content.status, 'active');
        assert.equal(content.currency, 'USD');
        return makeRow('c-1', content);
      };

      const contract = await VendorContractService.create('org-1', {
        vendorId: 'vendor-1',
        title: 'Service Agreement',
        contractType: 'service',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        value: 50000,
        createdBy: 'user-1',
      });

      assert.ok(contract);
      assert.equal(contract.id, 'c-1');
      assert.equal(contract.title, 'Service Agreement');
      assert.equal(contract.contractType, 'service');
      assert.equal(contract.status, 'active');
      assert.equal(contract.value, 50000);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a contract with custom currency and status', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.currency, 'EUR');
        assert.equal(content.status, 'pending');
        return makeRow('c-2', content);
      };

      const contract = await VendorContractService.create('org-1', {
        vendorId: 'vendor-1',
        title: 'NDA',
        contractType: 'nda',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        value: 0,
        currency: 'EUR',
        status: 'pending',
        createdBy: 'user-1',
      });

      assert.equal(contract.currency, 'EUR');
      assert.equal(contract.status, 'pending');
    });
  });

  describe('get', () => {
    it('returns a contract by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('c-1', { vendorId: 'v-1', title: 'Agreement', contractType: 'service', startDate: '2025-01-01', endDate: '2025-12-31', value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' });

      const contract = await VendorContractService.get('c-1');

      assert.ok(contract);
      assert.equal(contract.id, 'c-1');
      assert.equal(contract.title, 'Agreement');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when contract not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const contract = await VendorContractService.get('nope');
      assert.equal(contract, null);
    });
  });

  describe('list', () => {
    it('returns contracts for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', { vendorId: 'v-1', title: 'A', contractType: 'service', startDate: '2025-01-01', endDate: '2025-12-31', value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
        makeRow('c-2', { vendorId: 'v-2', title: 'B', contractType: 'nda', startDate: '2025-01-01', endDate: '2025-12-31', value: 2000, currency: 'USD', status: 'pending', terms: '', renewalDate: '' }),
      ];

      const contracts = await VendorContractService.list('org-1');

      assert.equal(contracts.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by vendorId via sourceId', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where?.sourceId, 'v-1');
        return [
          makeRow('c-1', { vendorId: 'v-1', title: 'A', contractType: 'service', startDate: '2025-01-01', endDate: '2025-12-31', value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
        ];
      };

      const contracts = await VendorContractService.list('org-1', { vendorId: 'v-1' });

      assert.equal(contracts.length, 1);
      assert.equal(contracts[0].vendorId, 'v-1');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', { vendorId: 'v-1', title: 'A', contractType: 'service', startDate: '2025-01-01', endDate: '2025-12-31', value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
        makeRow('c-2', { vendorId: 'v-2', title: 'B', contractType: 'service', startDate: '2025-01-01', endDate: '2025-12-31', value: 2000, currency: 'USD', status: 'expired', terms: '', renewalDate: '' }),
      ];

      const contracts = await VendorContractService.list('org-1', { status: 'expired' });

      assert.equal(contracts.length, 1);
      assert.equal(contracts[0].status, 'expired');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', { vendorId: 'v-1', title: 'A', contractType: 'service', startDate: '2025-01-01', endDate: '2025-12-31', value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
        makeRow('c-2', { vendorId: 'v-2', title: 'B', contractType: 'nda', startDate: '2025-01-01', endDate: '2025-12-31', value: 2000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
      ];

      const contracts = await VendorContractService.list('org-1', { type: 'nda' });

      assert.equal(contracts.length, 1);
      assert.equal(contracts[0].contractType, 'nda');
    });
  });

  describe('update', () => {
    it('updates contract title and value', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('c-1', { vendorId: 'v-1', title: 'old', contractType: 'service', startDate: '2025-01-01', endDate: '2025-12-31', value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.title, 'new');
        assert.equal(content.value, 5000);
        return makeRow('c-1', content);
      };

      const contract = await VendorContractService.update('c-1', { title: 'new', value: 5000 });

      assert.ok(contract);
      assert.equal(contract.title, 'new');
      assert.equal(contract.value, 5000);
    });

    it('returns null when contract not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const contract = await VendorContractService.update('nope', { title: 'x' });
      assert.equal(contract, null);
    });
  });

  describe('delete', () => {
    it('deletes a contract', async () => {
      memoryDeleteImpl = async () => ({ id: 'c-1' });

      const result = await VendorContractService.delete('c-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await VendorContractService.delete('c-1');
      assert.equal(result, false);
    });
  });

  describe('getExpiring', () => {
    it('returns contracts expiring within N days', async () => {
      const now = new Date();
      const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      memoryFindManyImpl = async () => [
        makeRow('c-1', { vendorId: 'v-1', title: 'expiring', contractType: 'service', startDate: '2025-01-01', endDate: in15.toISOString(), value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
        makeRow('c-2', { vendorId: 'v-2', title: 'far', contractType: 'service', startDate: '2025-01-01', endDate: in60.toISOString(), value: 2000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
      ];

      const expiring = await VendorContractService.getExpiring('org-1', 30);

      assert.equal(expiring.length, 1);
      assert.equal(expiring[0].title, 'expiring');
    });
  });

  describe('getRenewalAlerts', () => {
    it('returns contracts needing renewal attention', async () => {
      const now = new Date();
      const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where?.sourceId) return [];
        return [
          makeRow('c-1', { vendorId: 'v-1', title: 'expiring', contractType: 'service', startDate: '2025-01-01', endDate: in15.toISOString(), value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
          makeRow('c-2', { vendorId: 'v-2', title: 'renewal', contractType: 'service', startDate: '2025-01-01', endDate: in15.toISOString(), value: 2000, currency: 'USD', status: 'renewal', terms: '', renewalDate: '' }),
        ];
      };

      const alerts = await VendorContractService.getRenewalAlerts('org-1');

      // Both should appear (one expiring, one in renewal status) — deduped
      assert.ok(alerts.length >= 1);
    });
  });

  describe('getStats', () => {
    it('aggregates contract stats', async () => {
      const now = new Date();
      const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      memoryFindManyImpl = async () => [
        makeRow('c-1', { vendorId: 'v-1', title: 'A', contractType: 'service', startDate: '2025-01-01', endDate: in15.toISOString(), value: 1000, currency: 'USD', status: 'active', terms: '', renewalDate: '' }),
        makeRow('c-2', { vendorId: 'v-2', title: 'B', contractType: 'nda', startDate: '2025-01-01', endDate: '2025-12-31', value: 2000, currency: 'USD', status: 'expired', terms: '', renewalDate: '' }),
      ];

      const stats = await VendorContractService.getStats('org-1');

      assert.equal(stats.totalContracts, 2);
      assert.equal(stats.byStatus.active, 1);
      assert.equal(stats.byStatus.expired, 1);
      assert.equal(stats.byType.service, 1);
      assert.equal(stats.byType.nda, 1);
      assert.equal(stats.totalValue, 3000);
      assert.equal(stats.expiringCount, 1);
    });

    it('returns zero stats when no contracts', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await VendorContractService.getStats('org-1');

      assert.equal(stats.totalContracts, 0);
      assert.equal(stats.totalValue, 0);
    });
  });
});
