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
    type: 'purchase_order',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { PurchaseOrderService, calculateTotals } =
  await import('@/lib/services/purchase-order-service');

// ─────────────────────────────────────────────────────────────────────────────
// PurchaseOrderService
// ─────────────────────────────────────────────────────────────────────────────

describe('PurchaseOrderService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a PO with auto-generated number and calculated totals', async () => {
      // generatePONumber calls findMany first
      memoryFindManyImpl = async () => []; // 0 existing → seq 1
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'purchase_order');
        const content = JSON.parse(args.data.content);
        assert.ok(content.poNumber.startsWith('PO-'));
        assert.equal(content.status, 'draft');
        assert.equal(content.subtotal, 100);
        assert.equal(content.tax, 10);
        assert.equal(content.total, 110);
        return makeRow('po-1', content);
      };

      const po = await PurchaseOrderService.create('org-1', {
        vendorId: 'v-1',
        vendorName: 'Acme',
        items: [
          { description: 'Widget', quantity: 10, unitPrice: 10, taxRate: 0.1 },
        ],
        createdBy: 'user-1',
      });

      assert.ok(po);
      assert.equal(po.id, 'po-1');
      assert.equal(po.status, 'draft');
      assert.equal(po.subtotal, 100);
      assert.equal(po.tax, 10);
      assert.equal(po.total, 110);
      assert.ok(po.poNumber.startsWith('PO-'));
      assert.equal(calls[0].method, 'memory.findMany');
      assert.equal(calls[1].method, 'memory.create');
    });

    it('includes notes and expected delivery date', async () => {
      memoryFindManyImpl = async () => [];
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.notes, 'Urgent');
        assert.equal(content.expectedDeliveryDate, '2025-02-01');
        return makeRow('po-2', content);
      };

      const po = await PurchaseOrderService.create('org-1', {
        vendorId: 'v-1',
        vendorName: 'Acme',
        items: [{ description: 'Item', quantity: 1, unitPrice: 50 }],
        expectedDeliveryDate: '2025-02-01',
        notes: 'Urgent',
        createdBy: 'user-1',
      });

      assert.equal(po.notes, 'Urgent');
      assert.equal(po.expectedDeliveryDate, '2025-02-01');
    });
  });

  describe('get', () => {
    it('returns a PO by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('po-1', {
          poNumber: 'PO-2025-0001', vendorId: 'v-1', vendorName: 'Acme',
          items: [{ description: 'Widget', quantity: 2, unitPrice: 10 }],
          subtotal: 20, tax: 0, total: 20, status: 'draft',
          expectedDeliveryDate: null, receivedDate: null, receivedItems: [],
          approvedBy: null, rejectionReason: null, notes: '',
        });

      const po = await PurchaseOrderService.get('po-1');

      assert.ok(po);
      assert.equal(po.id, 'po-1');
      assert.equal(po.poNumber, 'PO-2025-0001');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when PO not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const po = await PurchaseOrderService.get('nope');
      assert.equal(po, null);
    });
  });

  describe('list', () => {
    it('returns POs for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-2', { poNumber: 'PO-2', vendorId: 'v-2', vendorName: 'B', items: [], subtotal: 0, tax: 0, total: 0, status: 'approved', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
      ];

      const pos = await PurchaseOrderService.list('org-1');

      assert.equal(pos.length, 2);
      assert.equal(pos[0].id, 'po-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-2', { poNumber: 'PO-2', vendorId: 'v-2', vendorName: 'B', items: [], subtotal: 0, tax: 0, total: 0, status: 'approved', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
      ];

      const pos = await PurchaseOrderService.list('org-1', { status: 'approved' });

      assert.equal(pos.length, 1);
      assert.equal(pos[0].status, 'approved');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('po-1', { poNumber: 'PO-0001', vendorId: 'v-1', vendorName: 'Acme', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-2', { poNumber: 'PO-0002', vendorId: 'v-2', vendorName: 'Beta', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
      ];

      const pos = await PurchaseOrderService.list('org-1', { search: 'acme' });

      assert.equal(pos.length, 1);
      assert.equal(pos[0].vendorName, 'Acme');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const pos = await PurchaseOrderService.list('org-1');
      assert.deepEqual(pos, []);
    });
  });

  describe('submit', () => {
    it('submits a PO (status → pending_approval)', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'pending_approval');
        return makeRow('po-1', content);
      };

      const po = await PurchaseOrderService.submit('po-1');

      assert.ok(po);
      assert.equal(po.status, 'pending_approval');
    });

    it('returns null when PO not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const po = await PurchaseOrderService.submit('nope');
      assert.equal(po, null);
    });
  });

  describe('approve', () => {
    it('approves a PO and sets approvedBy', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'pending_approval', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'approved');
        assert.equal(content.approvedBy, 'user-2');
        return makeRow('po-1', content);
      };

      const po = await PurchaseOrderService.approve('po-1', 'user-2');

      assert.ok(po);
      assert.equal(po.status, 'approved');
      assert.equal(po.approvedBy, 'user-2');
    });
  });

  describe('send', () => {
    it('sends a PO (status → sent)', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'approved', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: 'u1', rejectionReason: null, notes: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'sent');
        return makeRow('po-1', content);
      };

      const po = await PurchaseOrderService.send('po-1');

      assert.ok(po);
      assert.equal(po.status, 'sent');
    });
  });

  describe('receive', () => {
    it('receives goods (status → received, sets receivedDate and items)', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [{ description: 'Widget', quantity: 10, unitPrice: 5 }], subtotal: 50, tax: 0, total: 50, status: 'sent', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: 'u1', rejectionReason: null, notes: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'received');
        assert.ok(content.receivedDate);
        assert.equal(content.receivedItems.length, 1);
        return makeRow('po-1', content);
      };

      const po = await PurchaseOrderService.receive('po-1', {
        receivedItems: [{ description: 'Widget', quantityReceived: 10, condition: 'good' }],
      });

      assert.ok(po);
      assert.equal(po.status, 'received');
      assert.ok(po.receivedDate);
      assert.equal(po.receivedItems.length, 1);
    });
  });

  describe('cancel', () => {
    it('cancels a PO (status → cancelled)', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'cancelled');
        return makeRow('po-1', content);
      };

      const po = await PurchaseOrderService.cancel('po-1');

      assert.ok(po);
      assert.equal(po.status, 'cancelled');
    });
  });

  describe('getByStatus', () => {
    it('groups POs by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-2', { poNumber: 'PO-2', vendorId: 'v-2', vendorName: 'B', items: [], subtotal: 0, tax: 0, total: 0, status: 'approved', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-3', { poNumber: 'PO-3', vendorId: 'v-3', vendorName: 'C', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
      ];

      const grouped = await PurchaseOrderService.getByStatus('org-1');

      assert.equal(grouped.draft.length, 2);
      assert.equal(grouped.approved.length, 1);
      assert.equal(grouped.received.length, 0);
    });
  });

  describe('getPendingApprovals', () => {
    it('returns only pending_approval POs', async () => {
      memoryFindManyImpl = async () => [
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 0, tax: 0, total: 0, status: 'pending_approval', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-2', { poNumber: 'PO-2', vendorId: 'v-2', vendorName: 'B', items: [], subtotal: 0, tax: 0, total: 0, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
      ];

      const pending = await PurchaseOrderService.getPendingApprovals('org-1');

      assert.equal(pending.length, 1);
      assert.equal(pending[0].status, 'pending_approval');
    });
  });

  describe('getStats', () => {
    it('aggregates PO stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 100, tax: 0, total: 100, status: 'approved', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-2', { poNumber: 'PO-2', vendorId: 'v-2', vendorName: 'B', items: [], subtotal: 200, tax: 0, total: 200, status: 'pending_approval', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
      ];

      const stats = await PurchaseOrderService.getStats('org-1');

      assert.equal(stats.totalPOs, 2);
      assert.equal(stats.totalValue, 300);
      assert.equal(stats.pendingCount, 1);
      assert.equal(stats.avgPOValue, 150);
      assert.equal(stats.byStatus.approved, 1);
      assert.equal(stats.byStatus.pending_approval, 1);
    });

    it('returns zero stats when no POs', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await PurchaseOrderService.getStats('org-1');

      assert.equal(stats.totalPOs, 0);
      assert.equal(stats.avgPOValue, 0);
    });
  });

  describe('getTotalSpend', () => {
    it('sums totals for approved/sent/received POs', async () => {
      memoryFindManyImpl = async () => [
        makeRow('po-1', { poNumber: 'PO-1', vendorId: 'v-1', vendorName: 'A', items: [], subtotal: 100, tax: 0, total: 100, status: 'approved', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-2', { poNumber: 'PO-2', vendorId: 'v-2', vendorName: 'B', items: [], subtotal: 200, tax: 0, total: 200, status: 'received', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
        makeRow('po-3', { poNumber: 'PO-3', vendorId: 'v-3', vendorName: 'C', items: [], subtotal: 50, tax: 0, total: 50, status: 'draft', expectedDeliveryDate: null, receivedDate: null, receivedItems: [], approvedBy: null, rejectionReason: null, notes: '' }),
      ];

      const spend = await PurchaseOrderService.getTotalSpend('org-1');

      // draft is not counted
      assert.equal(spend, 300);
    });
  });

  describe('helpers', () => {
    it('calculateTotals computes subtotal, tax, and total', () => {
      const { subtotal, tax, total } = calculateTotals([
        { description: 'A', quantity: 10, unitPrice: 10, taxRate: 0.1 },
        { description: 'B', quantity: 5, unitPrice: 20 },
      ]);
      assert.equal(subtotal, 200);
      assert.equal(tax, 10);
      assert.equal(total, 210);
    });

    it('calculateTotals handles zero tax rate', () => {
      const { subtotal, tax, total } = calculateTotals([
        { description: 'A', quantity: 2, unitPrice: 50 },
      ]);
      assert.equal(subtotal, 100);
      assert.equal(tax, 0);
      assert.equal(total, 100);
    });
  });
});
