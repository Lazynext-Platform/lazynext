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
    type: 'vendor',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { VendorService } = await import('@/lib/services/vendor-service');

// ─────────────────────────────────────────────────────────────────────────────
// VendorService
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a vendor with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'vendor');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'Acme Corp');
        assert.equal(content.category, 'general');
        assert.equal(content.status, 'active');
        return makeRow('v-1', content);
      };

      const vendor = await VendorService.create('org-1', {
        name: 'Acme Corp',
        createdBy: 'user-1',
      });

      assert.ok(vendor);
      assert.equal(vendor.id, 'v-1');
      assert.equal(vendor.name, 'Acme Corp');
      assert.equal(vendor.category, 'general');
      assert.equal(vendor.status, 'active');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a vendor with category and contact info', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.category, 'marketing');
        assert.equal(content.contactName, 'Jane');
        assert.equal(content.email, 'jane@acme.com');
        return makeRow('v-2', content);
      };

      const vendor = await VendorService.create('org-1', {
        name: 'Acme',
        category: 'marketing',
        contactName: 'Jane',
        email: 'jane@acme.com',
        createdBy: 'user-1',
      });

      assert.equal(vendor.category, 'marketing');
      assert.equal(vendor.contactName, 'Jane');
      assert.equal(vendor.email, 'jane@acme.com');
    });
  });

  describe('get', () => {
    it('returns a vendor by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('v-1', { name: 'Acme', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] });

      const vendor = await VendorService.get('v-1');

      assert.ok(vendor);
      assert.equal(vendor.id, 'v-1');
      assert.equal(vendor.name, 'Acme');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when vendor not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const vendor = await VendorService.get('nope');
      assert.equal(vendor, null);
    });
  });

  describe('list', () => {
    it('returns vendors for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('v-1', { name: 'Acme', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
        makeRow('v-2', { name: 'Beta', category: 'marketing', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
      ];

      const vendors = await VendorService.list('org-1');

      assert.equal(vendors.length, 2);
      assert.equal(vendors[0].id, 'v-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by category', async () => {
      memoryFindManyImpl = async () => [
        makeRow('v-1', { name: 'Acme', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
        makeRow('v-2', { name: 'Beta', category: 'marketing', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
      ];

      const vendors = await VendorService.list('org-1', { category: 'marketing' });

      assert.equal(vendors.length, 1);
      assert.equal(vendors[0].category, 'marketing');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('v-1', { name: 'Acme', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
        makeRow('v-2', { name: 'Beta', category: 'general', status: 'inactive', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
      ];

      const vendors = await VendorService.list('org-1', { status: 'inactive' });

      assert.equal(vendors.length, 1);
      assert.equal(vendors[0].status, 'inactive');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('v-1', { name: 'Acme Corp', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
        makeRow('v-2', { name: 'Beta Inc', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
      ];

      const vendors = await VendorService.list('org-1', { search: 'acme' });

      assert.equal(vendors.length, 1);
      assert.equal(vendors[0].name, 'Acme Corp');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const vendors = await VendorService.list('org-1');
      assert.deepEqual(vendors, []);
    });
  });

  describe('update', () => {
    it('updates vendor name and category', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('v-1', { name: 'old', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'new');
        assert.equal(content.category, 'marketing');
        return makeRow('v-1', content);
      };

      const vendor = await VendorService.update('v-1', { name: 'new', category: 'marketing' });

      assert.ok(vendor);
      assert.equal(vendor.name, 'new');
      assert.equal(vendor.category, 'marketing');
    });

    it('returns null when vendor not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const vendor = await VendorService.update('nope', { name: 'x' });
      assert.equal(vendor, null);
    });
  });

  describe('delete', () => {
    it('deletes a vendor', async () => {
      memoryDeleteImpl = async () => ({ id: 'v-1' });

      const result = await VendorService.delete('v-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await VendorService.delete('v-1');
      assert.equal(result, false);
    });
  });

  describe('getByCategory', () => {
    it('groups vendors by category', async () => {
      memoryFindManyImpl = async () => [
        makeRow('v-1', { name: 'Acme', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
        makeRow('v-2', { name: 'Beta', category: 'marketing', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
        makeRow('v-3', { name: 'Gamma', category: 'marketing', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
      ];

      const grouped = await VendorService.getByCategory('org-1');

      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped['marketing'].length, 2);
      assert.equal(grouped['general'].length, 1);
    });
  });

  describe('getStats', () => {
    it('aggregates vendor stats', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where?.type === 'vendor') {
          return [
            makeRow('v-1', { name: 'Acme', category: 'general', status: 'active', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
            makeRow('v-2', { name: 'Beta', category: 'marketing', status: 'preferred', contactName: '', email: '', phone: '', website: '', address: '', taxId: '', paymentTerms: '', notes: '', tags: [] }),
          ];
        }
        if (args.where?.type === 'vendor_contract') {
          return [makeRow('c-1', { vendorId: 'v-1', status: 'active', value: 1000 }, { type: 'vendor_contract' })];
        }
        if (args.where?.type === 'vendor_spend') {
          return [makeRow('s-1', { amount: 500 }, { type: 'vendor_spend' })];
        }
        return [];
      };

      const stats = await VendorService.getStats('org-1');

      assert.equal(stats.totalVendors, 2);
      assert.equal(stats.byCategory['general'], 1);
      assert.equal(stats.byCategory['marketing'], 1);
      assert.equal(stats.byStatus.active, 1);
      assert.equal(stats.byStatus.preferred, 1);
      assert.equal(stats.activeContracts, 1);
      assert.equal(stats.totalSpend, 500);
    });

    it('returns zero stats when no vendors', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await VendorService.getStats('org-1');

      assert.equal(stats.totalVendors, 0);
      assert.equal(stats.activeContracts, 0);
      assert.equal(stats.totalSpend, 0);
    });
  });
});
