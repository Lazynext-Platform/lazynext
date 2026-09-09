import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memFindFirstImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    findFirst: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memFindFirstImpl(args); },
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

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memFindFirstImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { SupplyChainService } = await import('@/lib/services/supply-chain-service');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for building Memory rows
// ─────────────────────────────────────────────────────────────────────────────

function makeRow(id: string, type: string, content: Record<string, unknown>): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type,
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SupplyChainService', () => {
  beforeEach(() => { resetMock(); });

  // ── Suppliers ──

  describe('createSupplier', () => {
    it('creates a supplier with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'sc_supplier');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'Acme Corp');
        assert.equal(content.status, 'active');
        assert.equal(content.leadTimeDays, 0);
        return makeRow('s1', 'sc_supplier', content);
      };
      const result = await SupplyChainService.createSupplier('org-1', 'ws-1', { name: 'Acme Corp' }, 'user-1');
      assert.equal(result.name, 'Acme Corp');
      assert.equal(result.status, 'active');
    });

    it('creates a supplier with explicit fields', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.category, 'electronics');
        assert.equal(content.rating, 4.5);
        assert.equal(content.leadTimeDays, 14);
        assert.equal(content.status, 'pending');
        return makeRow('s1', 'sc_supplier', content);
      };
      const result = await SupplyChainService.createSupplier('org-1', 'ws-1', {
        name: 'Acme Corp', category: 'electronics', rating: 4.5, leadTimeDays: 14, status: 'pending',
      }, 'user-1');
      assert.equal(result.category, 'electronics');
      assert.equal(result.rating, 4.5);
      assert.equal(result.status, 'pending');
    });
  });

  describe('getSupplier', () => {
    it('returns a supplier by id', async () => {
      memFindUniqueImpl = async () => makeRow('s1', 'sc_supplier', { name: 'Acme', category: '', location: '', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'active' });
      const result = await SupplyChainService.getSupplier('s1');
      assert.ok(result);
      assert.equal(result!.name, 'Acme');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await SupplyChainService.getSupplier('nope');
      assert.equal(result, null);
    });
  });

  describe('listSuppliers', () => {
    it('lists suppliers for an organization', async () => {
      memFindManyImpl = async () => [
        makeRow('s1', 'sc_supplier', { name: 'A', category: 'electronics', location: 'US', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'active' }),
        makeRow('s2', 'sc_supplier', { name: 'B', category: 'raw', location: 'CN', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'inactive' }),
      ];
      const result = await SupplyChainService.listSuppliers('org-1');
      assert.equal(result.length, 2);
    });

    it('applies category, status, and location filters', async () => {
      memFindManyImpl = async () => [
        makeRow('s1', 'sc_supplier', { name: 'A', category: 'electronics', location: 'US', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'active' }),
        makeRow('s2', 'sc_supplier', { name: 'B', category: 'raw', location: 'CN', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'inactive' }),
      ];
      const result = await SupplyChainService.listSuppliers('org-1', { category: 'electronics', status: 'active', location: 'US' });
      assert.equal(result.length, 1);
      assert.equal(result[0].category, 'electronics');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await SupplyChainService.listSuppliers('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateSupplier', () => {
    it('updates only provided fields', async () => {
      memFindUniqueImpl = async () => makeRow('s1', 'sc_supplier', { name: 'Old', category: '', location: '', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'active' });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'New');
        assert.equal(content.status, 'active');
        return makeRow('s1', 'sc_supplier', content);
      };
      const result = await SupplyChainService.updateSupplier('s1', { name: 'New' });
      assert.ok(result);
      assert.equal(result!.name, 'New');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await SupplyChainService.updateSupplier('nope', { name: 'New' });
      assert.equal(result, null);
    });
  });

  describe('deleteSupplier', () => {
    it('deletes a supplier', async () => {
      memDeleteImpl = async () => ({ id: 's1' });
      const result = await SupplyChainService.deleteSupplier('s1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const result = await SupplyChainService.deleteSupplier('s1');
      assert.equal(result, false);
    });
  });

  // ── Shipments ──

  describe('createShipment', () => {
    it('creates a shipment with defaults and computed total', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'sc_shipment');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.supplierId, 's1');
        assert.equal(content.status, 'pending');
        assert.equal(content.totalValue, 150);
        assert.equal(content.items.length, 2);
        return makeRow('sh1', 'sc_shipment', content);
      };
      const result = await SupplyChainService.createShipment('org-1', 'ws-1', {
        supplierId: 's1', origin: 'Shanghai', destination: 'LA',
        items: [{ name: 'Widget', quantity: 10, unitCost: 5 }, { name: 'Gadget', quantity: 5, unitCost: 20 }],
      }, 'user-1');
      assert.equal(result.supplierId, 's1');
      assert.equal(result.status, 'pending');
      assert.equal(result.totalValue, 150);
      assert.equal(result.items.length, 2);
    });

    it('uses provided totalValue when given', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.totalValue, 999);
        return makeRow('sh1', 'sc_shipment', content);
      };
      const result = await SupplyChainService.createShipment('org-1', 'ws-1', {
        supplierId: 's1', origin: 'A', destination: 'B',
        items: [{ name: 'X', quantity: 1 }], totalValue: 999,
      }, 'user-1');
      assert.equal(result.totalValue, 999);
    });
  });

  describe('getShipment', () => {
    it('returns a shipment by id', async () => {
      memFindUniqueImpl = async () => makeRow('sh1', 'sc_shipment', { supplierId: 's1', origin: 'A', destination: 'B', carrier: 'DHL', trackingNumber: 'T1', status: 'in_transit', expectedArrival: '2025-06-01', items: [], totalValue: 100, currentLocation: 'Port', trackingNotes: '', lastUpdated: '2025-05-01' });
      const result = await SupplyChainService.getShipment('sh1');
      assert.ok(result);
      assert.equal(result!.origin, 'A');
      assert.ok(result!.expectedArrival);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await SupplyChainService.getShipment('nope');
      assert.equal(result, null);
    });
  });

  describe('listShipments', () => {
    it('applies status and carrier filters', async () => {
      memFindManyImpl = async () => [
        makeRow('sh1', 'sc_shipment', { supplierId: 's1', origin: 'A', destination: 'B', carrier: 'DHL', trackingNumber: '', status: 'in_transit', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' }),
        makeRow('sh2', 'sc_shipment', { supplierId: 's2', origin: 'C', destination: 'D', carrier: 'FedEx', trackingNumber: '', status: 'delivered', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' }),
      ];
      const result = await SupplyChainService.listShipments('org-1', { status: 'in_transit', carrier: 'DHL' });
      assert.equal(result.length, 1);
      assert.equal(result[0].carrier, 'DHL');
    });
  });

  describe('updateShipment', () => {
    it('updates shipment fields', async () => {
      memFindUniqueImpl = async () => makeRow('sh1', 'sc_shipment', { supplierId: 's1', origin: 'A', destination: 'B', carrier: '', trackingNumber: '', status: 'pending', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'delivered');
        return makeRow('sh1', 'sc_shipment', content);
      };
      const result = await SupplyChainService.updateShipment('sh1', { status: 'delivered' });
      assert.ok(result);
      assert.equal(result!.status, 'delivered');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await SupplyChainService.updateShipment('nope', { status: 'delivered' });
      assert.equal(result, null);
    });
  });

  describe('trackShipment', () => {
    it('tracks a shipment with status, location, and notes', async () => {
      memFindUniqueImpl = async () => makeRow('sh1', 'sc_shipment', { supplierId: 's1', origin: 'A', destination: 'B', carrier: '', trackingNumber: '', status: 'pending', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'in_transit');
        assert.equal(content.currentLocation, 'Port of LA');
        assert.equal(content.trackingNotes, 'In transit');
        assert.ok(content.lastUpdated);
        return makeRow('sh1', 'sc_shipment', content);
      };
      const result = await SupplyChainService.trackShipment('sh1', 'in_transit', 'Port of LA', 'In transit');
      assert.ok(result);
      assert.equal(result!.status, 'in_transit');
      assert.equal(result!.currentLocation, 'Port of LA');
      assert.equal(result!.trackingNotes, 'In transit');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await SupplyChainService.trackShipment('nope', 'in_transit');
      assert.equal(result, null);
    });
  });

  // ── Logistics Orders ──

  describe('createLogisticsOrder', () => {
    it('creates a logistics order with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'sc_logistics_order');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.orderDate, '2025-05-01');
        assert.equal(content.status, 'pending');
        assert.equal(content.freightMode, 'road');
        return makeRow('lo1', 'sc_logistics_order', content);
      };
      const result = await SupplyChainService.createLogisticsOrder('org-1', 'ws-1', {
        orderDate: '2025-05-01',
      }, 'user-1');
      assert.equal(result.status, 'pending');
      assert.equal(result.freightMode, 'road');
    });

    it('creates a logistics order with explicit fields', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.freightMode, 'air');
        assert.equal(content.cost, 5000);
        return makeRow('lo1', 'sc_logistics_order', content);
      };
      const result = await SupplyChainService.createLogisticsOrder('org-1', 'ws-1', {
        orderDate: '2025-05-01', freightMode: 'air', cost: 5000, destination: 'NYC',
      }, 'user-1');
      assert.equal(result.freightMode, 'air');
      assert.equal(result.cost, 5000);
    });
  });

  describe('getLogisticsOrder', () => {
    it('returns a logistics order by id', async () => {
      memFindUniqueImpl = async () => makeRow('lo1', 'sc_logistics_order', { shipmentId: '', supplierId: '', orderDate: '2025-05-01', expectedDelivery: '', freightMode: 'sea', cost: 1000, destination: 'LA', status: 'in_transit' });
      const result = await SupplyChainService.getLogisticsOrder('lo1');
      assert.ok(result);
      assert.equal(result!.freightMode, 'sea');
    });
  });

  describe('listLogisticsOrders', () => {
    it('applies status and freightMode filters', async () => {
      memFindManyImpl = async () => [
        makeRow('lo1', 'sc_logistics_order', { shipmentId: '', supplierId: '', orderDate: '2025-05-01', expectedDelivery: '', freightMode: 'air', cost: 0, destination: '', status: 'pending' }),
        makeRow('lo2', 'sc_logistics_order', { shipmentId: '', supplierId: '', orderDate: '2025-05-01', expectedDelivery: '', freightMode: 'sea', cost: 0, destination: '', status: 'delivered' }),
      ];
      const result = await SupplyChainService.listLogisticsOrders('org-1', { status: 'pending', freightMode: 'air' });
      assert.equal(result.length, 1);
    });
  });

  describe('updateLogisticsOrder', () => {
    it('updates logistics order fields', async () => {
      memFindUniqueImpl = async () => makeRow('lo1', 'sc_logistics_order', { shipmentId: '', supplierId: '', orderDate: '2025-05-01', expectedDelivery: '', freightMode: 'road', cost: 0, destination: '', status: 'pending' });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.cost, 2500);
        assert.equal(content.status, 'in_transit');
        return makeRow('lo1', 'sc_logistics_order', content);
      };
      const result = await SupplyChainService.updateLogisticsOrder('lo1', { cost: 2500, status: 'in_transit' });
      assert.ok(result);
      assert.equal(result!.cost, 2500);
      assert.equal(result!.status, 'in_transit');
    });
  });

  // ── Supplier Risks ──

  describe('createSupplierRisk', () => {
    it('creates a supplier risk with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'sc_supplier_risk');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.supplierId, 's1');
        assert.equal(content.riskType, 'financial');
        assert.equal(content.severity, 'high');
        assert.equal(content.status, 'open');
        return makeRow('r1', 'sc_supplier_risk', content);
      };
      const result = await SupplyChainService.createSupplierRisk('org-1', 'ws-1', {
        supplierId: 's1', riskType: 'financial', severity: 'high',
      }, 'user-1');
      assert.equal(result.riskType, 'financial');
      assert.equal(result.severity, 'high');
      assert.equal(result.status, 'open');
    });
  });

  describe('getSupplierRisk', () => {
    it('returns a supplier risk by id', async () => {
      memFindUniqueImpl = async () => makeRow('r1', 'sc_supplier_risk', { supplierId: 's1', riskType: 'operational', severity: 'medium', description: 'X', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null });
      const result = await SupplyChainService.getSupplierRisk('r1');
      assert.ok(result);
      assert.equal(result!.riskType, 'operational');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await SupplyChainService.getSupplierRisk('nope');
      assert.equal(result, null);
    });
  });

  describe('listSupplierRisks', () => {
    it('applies severity and status filters', async () => {
      memFindManyImpl = async () => [
        makeRow('r1', 'sc_supplier_risk', { supplierId: 's1', riskType: 'financial', severity: 'high', description: '', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }),
        makeRow('r2', 'sc_supplier_risk', { supplierId: 's2', riskType: 'quality', severity: 'low', description: '', mitigation: '', status: 'mitigated', mitigatedBy: '', mitigatedAt: null }),
      ];
      const result = await SupplyChainService.listSupplierRisks('org-1', { severity: 'high', status: 'open' });
      assert.equal(result.length, 1);
    });
  });

  describe('updateSupplierRisk', () => {
    it('updates supplier risk fields', async () => {
      memFindUniqueImpl = async () => makeRow('r1', 'sc_supplier_risk', { supplierId: 's1', riskType: 'financial', severity: 'medium', description: '', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.severity, 'critical');
        return makeRow('r1', 'sc_supplier_risk', content);
      };
      const result = await SupplyChainService.updateSupplierRisk('r1', { severity: 'critical' });
      assert.ok(result);
      assert.equal(result!.severity, 'critical');
    });
  });

  describe('mitigateSupplierRisk', () => {
    it('mitigates a supplier risk', async () => {
      memFindUniqueImpl = async () => makeRow('r1', 'sc_supplier_risk', { supplierId: 's1', riskType: 'financial', severity: 'high', description: '', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.mitigation, 'Diversify suppliers');
        assert.equal(content.mitigatedBy, 'user-1');
        assert.equal(content.status, 'mitigated');
        assert.ok(content.mitigatedAt);
        return makeRow('r1', 'sc_supplier_risk', content);
      };
      const result = await SupplyChainService.mitigateSupplierRisk('r1', 'Diversify suppliers', 'user-1');
      assert.ok(result);
      assert.equal(result!.mitigation, 'Diversify suppliers');
      assert.equal(result!.status, 'mitigated');
      assert.equal(result!.mitigatedBy, 'user-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await SupplyChainService.mitigateSupplierRisk('nope', 'X', 'user-1');
      assert.equal(result, null);
    });
  });

  // ── Metrics & Stats ──

  describe('getSupplyChainMetrics', () => {
    it('computes active/delayed shipments, avg lead time, and high-risk suppliers', async () => {
      memFindManyImpl = async (args: FindManyArgs) => {
        const type = (args.where as Record<string, unknown>).type;
        if (type === 'sc_shipment') {
          return [
            makeRow('sh1', 'sc_shipment', { supplierId: 's1', origin: '', destination: '', carrier: '', trackingNumber: '', status: 'in_transit', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' }),
            makeRow('sh2', 'sc_shipment', { supplierId: 's2', origin: '', destination: '', carrier: '', trackingNumber: '', status: 'delayed', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' }),
            makeRow('sh3', 'sc_shipment', { supplierId: 's3', origin: '', destination: '', carrier: '', trackingNumber: '', status: 'delivered', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' }),
          ];
        }
        if (type === 'sc_supplier') {
          return [
            makeRow('s1', 'sc_supplier', { name: 'A', category: '', location: '', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 10, status: 'active' }),
            makeRow('s2', 'sc_supplier', { name: 'B', category: '', location: '', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 20, status: 'active' }),
          ];
        }
        if (type === 'sc_supplier_risk') {
          return [
            makeRow('r1', 'sc_supplier_risk', { supplierId: 's1', riskType: 'financial', severity: 'critical', description: '', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }),
          ];
        }
        return [];
      };
      const result = await SupplyChainService.getSupplyChainMetrics('org-1');
      assert.equal(result.activeShipments, 1);
      assert.equal(result.delayedShipments, 1);
      assert.equal(result.avgLeadTime, 15);
      assert.equal(result.highRiskSuppliers, 1);
    });

    it('returns zeros when no data', async () => {
      memFindManyImpl = async () => [];
      const result = await SupplyChainService.getSupplyChainMetrics('org-1');
      assert.equal(result.activeShipments, 0);
      assert.equal(result.delayedShipments, 0);
      assert.equal(result.avgLeadTime, 0);
      assert.equal(result.highRiskSuppliers, 0);
    });
  });

  describe('getStats', () => {
    it('computes aggregate stats', async () => {
      memFindManyImpl = async (args: FindManyArgs) => {
        const type = (args.where as Record<string, unknown>).type;
        if (type === 'sc_supplier') {
          return [
            makeRow('s1', 'sc_supplier', { name: 'A', category: '', location: '', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'active' }),
            makeRow('s2', 'sc_supplier', { name: 'B', category: '', location: '', contactName: '', contactEmail: '', contactPhone: '', rating: 0, paymentTerms: '', leadTimeDays: 0, status: 'inactive' }),
          ];
        }
        if (type === 'sc_shipment') {
          return [
            makeRow('sh1', 'sc_shipment', { supplierId: 's1', origin: '', destination: '', carrier: '', trackingNumber: '', status: 'in_transit', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' }),
            makeRow('sh2', 'sc_shipment', { supplierId: 's2', origin: '', destination: '', carrier: '', trackingNumber: '', status: 'delayed', expectedArrival: '', items: [], totalValue: 0, currentLocation: '', trackingNotes: '', lastUpdated: '' }),
          ];
        }
        if (type === 'sc_logistics_order') {
          return [makeRow('lo1', 'sc_logistics_order', { shipmentId: '', supplierId: '', orderDate: '2025-05-01', expectedDelivery: '', freightMode: 'road', cost: 0, destination: '', status: 'pending' })];
        }
        if (type === 'sc_supplier_risk') {
          return [
            makeRow('r1', 'sc_supplier_risk', { supplierId: 's1', riskType: 'financial', severity: 'critical', description: '', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }),
            makeRow('r2', 'sc_supplier_risk', { supplierId: 's2', riskType: 'quality', severity: 'low', description: '', mitigation: '', status: 'mitigated', mitigatedBy: '', mitigatedAt: null }),
          ];
        }
        return [];
      };
      const result = await SupplyChainService.getStats('org-1');
      assert.equal(result.supplierCount, 2);
      assert.equal(result.activeSupplierCount, 1);
      assert.equal(result.shipmentCount, 2);
      assert.equal(result.activeShipmentCount, 1);
      assert.equal(result.delayedShipmentCount, 1);
      assert.equal(result.logisticsOrderCount, 1);
      assert.equal(result.supplierRiskCount, 2);
      assert.equal(result.openRiskCount, 1);
      assert.equal(result.criticalRiskCount, 1);
    });
  });
});
