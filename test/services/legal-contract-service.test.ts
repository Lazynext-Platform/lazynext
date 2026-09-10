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
  };
  orderBy?: Record<string, unknown>;
  take?: number;
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
    type: 'legal_contract',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function contractContent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    title: 'Test Contract',
    type: 'nda',
    partyName: 'Acme Corp',
    partyType: 'company',
    effectiveDate: '2025-01-01T00:00:00.000Z',
    endDate: '2026-01-01T00:00:00.000Z',
    value: 50000,
    currency: 'USD',
    status: 'active',
    jurisdiction: 'California, USA',
    tags: [],
    ...overrides,
  };
}

const { LegalContractService } = await import('@/lib/services/legal-contract-service');

// ─────────────────────────────────────────────────────────────────────────────
// LegalContractService
// ─────────────────────────────────────────────────────────────────────────────

describe('LegalContractService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a contract with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'legal_contract');
        const content = JSON.parse(args.data.content);
        assert.equal(content.title, 'NDA with Acme');
        assert.equal(content.type, 'nda');
        assert.equal(content.partyName, 'Acme Corp');
        assert.equal(content.status, 'draft');
        assert.equal(content.currency, 'USD');
        return makeRow('c-1', content);
      };

      const contract = await LegalContractService.create('org-1', {
        title: 'NDA with Acme',
        type: 'nda',
        partyName: 'Acme Corp',
        effectiveDate: '2025-01-01',
        createdBy: 'user-1',
      });

      assert.ok(contract);
      assert.equal(contract.id, 'c-1');
      assert.equal(contract.title, 'NDA with Acme');
      assert.equal(contract.status, 'draft');
      assert.equal(contract.currency, 'USD');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a contract with custom status and value', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.status, 'active');
        assert.equal(content.value, 100000);
        return makeRow('c-2', content);
      };

      const contract = await LegalContractService.create('org-1', {
        title: 'Service Agreement',
        type: 'service_agreement',
        partyName: 'Tech Inc',
        effectiveDate: '2025-01-01',
        status: 'active',
        value: 100000,
        currency: 'EUR',
        createdBy: 'user-1',
      });

      assert.equal(contract.status, 'active');
      assert.equal(contract.value, 100000);
      assert.equal(contract.currency, 'EUR');
    });
  });

  describe('get', () => {
    it('returns a contract by id', async () => {
      memoryFindUniqueImpl = async () => makeRow('c-1', contractContent());

      const contract = await LegalContractService.get('c-1');

      assert.ok(contract);
      assert.equal(contract.id, 'c-1');
      assert.equal(contract.title, 'Test Contract');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when contract not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const contract = await LegalContractService.get('nope');
      assert.equal(contract, null);
    });
  });

  describe('list', () => {
    it('returns contracts for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ title: 'A' })),
        makeRow('c-2', contractContent({ title: 'B' })),
      ];

      const contracts = await LegalContractService.list('org-1');

      assert.equal(contracts.length, 2);
      assert.equal(contracts[0].id, 'c-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ type: 'nda' })),
        makeRow('c-2', contractContent({ type: 'employment' })),
      ];

      const contracts = await LegalContractService.list('org-1', { type: 'employment' });

      assert.equal(contracts.length, 1);
      assert.equal(contracts[0].type, 'employment');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ status: 'active' })),
        makeRow('c-2', contractContent({ status: 'draft' })),
      ];

      const contracts = await LegalContractService.list('org-1', { status: 'draft' });

      assert.equal(contracts.length, 1);
      assert.equal(contracts[0].status, 'draft');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ title: 'NDA Agreement', partyName: 'Acme' })),
        makeRow('c-2', contractContent({ title: 'Employment', partyName: 'Tech Inc' })),
      ];

      const contracts = await LegalContractService.list('org-1', { search: 'acme' });

      assert.equal(contracts.length, 1);
      assert.equal(contracts[0].partyName, 'Acme');
    });
  });

  describe('update', () => {
    it('updates a contract title and value', async () => {
      memoryFindUniqueImpl = async () => makeRow('c-1', contractContent());
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.title, 'Updated Title');
        assert.equal(content.value, 75000);
        return makeRow('c-1', content);
      };

      const contract = await LegalContractService.update('c-1', {
        title: 'Updated Title',
        value: 75000,
      });

      assert.ok(contract);
      assert.equal(contract.title, 'Updated Title');
      assert.equal(contract.value, 75000);
    });

    it('returns null when contract not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const contract = await LegalContractService.update('nope', { title: 'x' });
      assert.equal(contract, null);
    });
  });

  describe('delete', () => {
    it('deletes a contract', async () => {
      memoryDeleteImpl = async () => ({ id: 'c-1' });

      const result = await LegalContractService.delete('c-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await LegalContractService.delete('c-1');
      assert.equal(result, false);
    });
  });

  describe('changeStatus', () => {
    it('changes the contract status', async () => {
      memoryFindUniqueImpl = async () => makeRow('c-1', contractContent({ status: 'draft' }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'active');
        return makeRow('c-1', content);
      };

      const contract = await LegalContractService.changeStatus('c-1', 'active');

      assert.ok(contract);
      assert.equal(contract.status, 'active');
    });
  });

  describe('getExpiring', () => {
    it('returns active contracts expiring within N days', async () => {
      const nearFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ status: 'active', endDate: nearFuture })),
        makeRow('c-2', contractContent({ status: 'active', endDate: farFuture })),
        makeRow('c-3', contractContent({ status: 'draft', endDate: nearFuture })),
      ];

      const expiring = await LegalContractService.getExpiring('org-1', 30);

      assert.equal(expiring.length, 1);
      assert.equal(expiring[0].id, 'c-1');
    });
  });

  describe('getExpired', () => {
    it('returns contracts with past end dates', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const futureDate = new Date('2030-01-01').toISOString();
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ endDate: pastDate, status: 'active' })),
        makeRow('c-2', contractContent({ endDate: futureDate, status: 'active' })),
        makeRow('c-3', contractContent({ endDate: pastDate, status: 'terminated' })),
      ];

      const expired = await LegalContractService.getExpired('org-1');

      assert.equal(expired.length, 1);
      assert.equal(expired[0].id, 'c-1');
    });
  });

  describe('getByType', () => {
    it('groups contracts by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ type: 'nda' })),
        makeRow('c-2', contractContent({ type: 'nda' })),
        makeRow('c-3', contractContent({ type: 'vendor' })),
      ];

      const grouped = await LegalContractService.getByType('org-1');

      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped.nda.length, 2);
      assert.equal(grouped.vendor.length, 1);
    });
  });

  describe('getByStatus', () => {
    it('groups contracts by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ status: 'active' })),
        makeRow('c-2', contractContent({ status: 'draft' })),
      ];

      const grouped = await LegalContractService.getByStatus('org-1');

      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped.active.length, 1);
      assert.equal(grouped.draft.length, 1);
    });
  });

  describe('getStats', () => {
    it('aggregates contract stats', async () => {
      const nearFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      memoryFindManyImpl = async () => [
        makeRow('c-1', contractContent({ type: 'nda', status: 'active', value: 50000, endDate: nearFuture })),
        makeRow('c-2', contractContent({ type: 'vendor', status: 'draft', value: 30000, endDate: '2030-01-01T00:00:00.000Z' })),
      ];

      const stats = await LegalContractService.getStats('org-1');

      assert.equal(stats.totalContracts, 2);
      assert.equal(stats.byType.nda, 1);
      assert.equal(stats.byType.vendor, 1);
      assert.equal(stats.byStatus.active, 1);
      assert.equal(stats.byStatus.draft, 1);
      assert.equal(stats.activeCount, 1);
      assert.equal(stats.expiringCount, 1);
      assert.equal(stats.totalValue, 80000);
    });

    it('returns zero stats when no contracts', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await LegalContractService.getStats('org-1');

      assert.equal(stats.totalContracts, 0);
      assert.equal(stats.activeCount, 0);
      assert.equal(stats.totalValue, 0);
    });
  });
});
