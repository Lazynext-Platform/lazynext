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
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
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
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
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
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(
  id: string,
  content: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'rfq',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { RFQService } = await import('@/lib/services/rfq-service');

// ─────────────────────────────────────────────────────────────────────────────
// RFQService
// ─────────────────────────────────────────────────────────────────────────────

describe('RFQService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an RFQ with auto-generated number and open status', async () => {
      memoryFindManyImpl = async () => []; // 0 existing → seq 1
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'rfq');
        const content = JSON.parse(args.data.content);
        assert.ok(content.rfqNumber.startsWith('RFQ-'));
        assert.equal(content.status, 'open');
        assert.equal(content.title, 'Q1 Supplies');
        assert.deepEqual(content.quotes, []);
        return makeRow('rfq-1', content);
      };

      const rfq = await RFQService.create('org-1', {
        title: 'Q1 Supplies',
        items: [{ description: 'Widget', quantity: 10 }],
        createdBy: 'user-1',
      });

      assert.ok(rfq);
      assert.equal(rfq.id, 'rfq-1');
      assert.equal(rfq.status, 'open');
      assert.ok(rfq.rfqNumber.startsWith('RFQ-'));
      assert.equal(rfq.quotes.length, 0);
      assert.equal(calls[0].method, 'memory.findMany');
      assert.equal(calls[1].method, 'memory.create');
    });

    it('includes description and due date', async () => {
      memoryFindManyImpl = async () => [];
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.description, 'Need widgets');
        assert.equal(content.dueDate, '2025-02-15');
        return makeRow('rfq-2', content);
      };

      const rfq = await RFQService.create('org-1', {
        title: 'Supplies',
        description: 'Need widgets',
        items: [{ description: 'Widget', quantity: 5 }],
        dueDate: '2025-02-15',
        createdBy: 'user-1',
      });

      assert.equal(rfq.description, 'Need widgets');
      assert.equal(rfq.dueDate, '2025-02-15');
    });
  });

  describe('get', () => {
    it('returns an RFQ by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('rfq-1', {
          rfqNumber: 'RFQ-2025-0001', title: 'Supplies', description: '',
          items: [], status: 'open', dueDate: null, quotes: [],
        });

      const rfq = await RFQService.get('rfq-1');

      assert.ok(rfq);
      assert.equal(rfq.id, 'rfq-1');
      assert.equal(rfq.title, 'Supplies');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when RFQ not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const rfq = await RFQService.get('nope');
      assert.equal(rfq, null);
    });
  });

  describe('list', () => {
    it('returns RFQs for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('rfq-1', { rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null, quotes: [] }),
        makeRow('rfq-2', { rfqNumber: 'RFQ-2', title: 'B', description: '', items: [], status: 'closed', dueDate: null, quotes: [] }),
      ];

      const rfqs = await RFQService.list('org-1');

      assert.equal(rfqs.length, 2);
      assert.equal(rfqs[0].id, 'rfq-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('rfq-1', { rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null, quotes: [] }),
        makeRow('rfq-2', { rfqNumber: 'RFQ-2', title: 'B', description: '', items: [], status: 'closed', dueDate: null, quotes: [] }),
      ];

      const rfqs = await RFQService.list('org-1', { status: 'open' });

      assert.equal(rfqs.length, 1);
      assert.equal(rfqs[0].status, 'open');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('rfq-1', { rfqNumber: 'RFQ-0001', title: 'Widgets', description: '', items: [], status: 'open', dueDate: null, quotes: [] }),
        makeRow('rfq-2', { rfqNumber: 'RFQ-0002', title: 'Other', description: '', items: [], status: 'open', dueDate: null, quotes: [] }),
      ];

      const rfqs = await RFQService.list('org-1', { search: 'widget' });

      assert.equal(rfqs.length, 1);
      assert.equal(rfqs[0].title, 'Widgets');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const rfqs = await RFQService.list('org-1');
      assert.deepEqual(rfqs, []);
    });
  });

  describe('close', () => {
    it('closes an RFQ (status → closed)', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('rfq-1', { rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null, quotes: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'closed');
        return makeRow('rfq-1', content);
      };

      const rfq = await RFQService.close('rfq-1');

      assert.ok(rfq);
      assert.equal(rfq.status, 'closed');
    });

    it('returns null when RFQ not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const rfq = await RFQService.close('nope');
      assert.equal(rfq, null);
    });
  });

  describe('addQuote', () => {
    it('adds a quote to an RFQ', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('rfq-1', { rfqNumber: 'RFQ-1', title: 'A', description: '', items: [{ description: 'Widget', quantity: 10 }], status: 'open', dueDate: null, quotes: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.quotes.length, 1);
        assert.equal(content.quotes[0].vendorName, 'Vendor A');
        assert.equal(content.quotes[0].status, 'pending');
        assert.ok(content.quotes[0].id);
        return makeRow('rfq-1', content);
      };

      const rfq = await RFQService.addQuote('rfq-1', {
        vendorId: 'v-1',
        vendorName: 'Vendor A',
        items: [{ description: 'Widget', unitPrice: 5 }],
        totalQuote: 50,
      });

      assert.ok(rfq);
      assert.equal(rfq.quotes.length, 1);
      assert.equal(rfq.quotes[0].vendorName, 'Vendor A');
      assert.equal(rfq.quotes[0].status, 'pending');
    });

    it('returns null when RFQ not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const rfq = await RFQService.addQuote('nope', {
        vendorId: 'v-1', vendorName: 'V', items: [], totalQuote: 0,
      });
      assert.equal(rfq, null);
    });
  });

  describe('getQuotes', () => {
    it('returns quotes for an RFQ', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('rfq-1', {
          rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null,
          quotes: [
            { id: 'q-1', vendorId: 'v-1', vendorName: 'A', items: [], totalQuote: 100, validUntil: null, notes: '', status: 'pending', rejectionReason: null, createdAt: '2025-01-01' },
            { id: 'q-2', vendorId: 'v-2', vendorName: 'B', items: [], totalQuote: 80, validUntil: null, notes: '', status: 'pending', rejectionReason: null, createdAt: '2025-01-01' },
          ],
        });

      const quotes = await RFQService.getQuotes('rfq-1');

      assert.equal(quotes.length, 2);
      assert.equal(quotes[0].id, 'q-1');
    });

    it('returns empty array when RFQ not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const quotes = await RFQService.getQuotes('nope');
      assert.deepEqual(quotes, []);
    });
  });

  describe('acceptQuote', () => {
    it('accepts a quote and creates a PO', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('rfq-1', {
          rfqNumber: 'RFQ-1', title: 'A', description: '', items: [{ description: 'Widget', quantity: 10 }],
          status: 'open', dueDate: null,
          quotes: [
            { id: 'q-1', vendorId: 'v-1', vendorName: 'Vendor A', items: [{ description: 'Widget', unitPrice: 5 }], totalQuote: 50, validUntil: null, notes: '', status: 'pending', rejectionReason: null, createdAt: '2025-01-01' },
          ],
        });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.quotes[0].status, 'accepted');
        return makeRow('rfq-1', content);
      };
      // generatePONumber calls findMany (return empty → seq 1), then create for the PO
      memoryFindManyImpl = async () => [];
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        return makeRow('po-new', content, { type: 'purchase_order' });
      };

      const { rfq, po } = await RFQService.acceptQuote('rfq-1', 'q-1');

      assert.ok(rfq);
      assert.ok(po);
      assert.equal(rfq.quotes[0].status, 'accepted');
      assert.equal(po.vendorName, 'Vendor A');
    });

    it('returns null po when quote not found', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('rfq-1', {
          rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null, quotes: [],
        });

      const { rfq, po } = await RFQService.acceptQuote('rfq-1', 'nope');

      assert.ok(rfq);
      assert.equal(po, null);
    });
  });

  describe('rejectQuote', () => {
    it('rejects a quote with reason', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('rfq-1', {
          rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null,
          quotes: [
            { id: 'q-1', vendorId: 'v-1', vendorName: 'A', items: [], totalQuote: 100, validUntil: null, notes: '', status: 'pending', rejectionReason: null, createdAt: '2025-01-01' },
          ],
        });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.quotes[0].status, 'rejected');
        assert.equal(content.quotes[0].rejectionReason, 'Too expensive');
        return makeRow('rfq-1', content);
      };

      const rfq = await RFQService.rejectQuote('rfq-1', 'q-1', 'Too expensive');

      assert.ok(rfq);
      assert.equal(rfq.quotes[0].status, 'rejected');
      assert.equal(rfq.quotes[0].rejectionReason, 'Too expensive');
    });
  });

  describe('getOpen', () => {
    it('returns only open RFQs', async () => {
      memoryFindManyImpl = async () => [
        makeRow('rfq-1', { rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null, quotes: [] }),
        makeRow('rfq-2', { rfqNumber: 'RFQ-2', title: 'B', description: '', items: [], status: 'closed', dueDate: null, quotes: [] }),
      ];

      const open = await RFQService.getOpen('org-1');

      assert.equal(open.length, 1);
      assert.equal(open[0].status, 'open');
    });
  });

  describe('getStats', () => {
    it('aggregates RFQ stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('rfq-1', { rfqNumber: 'RFQ-1', title: 'A', description: '', items: [], status: 'open', dueDate: null, quotes: [{ id: 'q1', vendorId: 'v1', vendorName: 'A', items: [], totalQuote: 100, validUntil: null, notes: '', status: 'accepted', rejectionReason: null, createdAt: '2025-01-01' }, { id: 'q2', vendorId: 'v2', vendorName: 'B', items: [], totalQuote: 80, validUntil: null, notes: '', status: 'pending', rejectionReason: null, createdAt: '2025-01-01' }] }),
        makeRow('rfq-2', { rfqNumber: 'RFQ-2', title: 'B', description: '', items: [], status: 'closed', dueDate: null, quotes: [] }),
      ];

      const stats = await RFQService.getStats('org-1');

      assert.equal(stats.totalRFQs, 2);
      assert.equal(stats.byStatus.open, 1);
      assert.equal(stats.byStatus.closed, 1);
      assert.equal(stats.totalQuotesReceived, 2);
      assert.equal(stats.acceptedCount, 1);
    });

    it('returns zero stats when no RFQs', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await RFQService.getStats('org-1');

      assert.equal(stats.totalRFQs, 0);
      assert.equal(stats.totalQuotesReceived, 0);
    });
  });
});
