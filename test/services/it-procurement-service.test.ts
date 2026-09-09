import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown> };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };
type AggregateArgs = { where: Record<string, unknown>; _sum: Record<string, boolean> };

interface CallRecord { method: string; args?: unknown }
const calls: CallRecord[] = [];

let findManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let findUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let createImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let updateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let deleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let countImpl: (args: CountArgs) => Promise<number> = async () => 0;
let groupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];
let aggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { totalCost: 0 } });

const prismaMock = {
  iTProcurement: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'iTProcurement.findMany', args }); return findManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'iTProcurement.findUnique', args }); return findUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'iTProcurement.create', args }); return createImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'iTProcurement.update', args }); return updateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'iTProcurement.delete', args }); return deleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'iTProcurement.count', args }); return countImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'iTProcurement.groupBy', args }); return groupByImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'iTProcurement.aggregate', args }); return aggregateImpl(args); },
  },
};

mock.module('@/lib/prisma', { namedExports: { prisma: prismaMock } });
mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  findManyImpl = async () => [];
  findUniqueImpl = async () => null;
  createImpl = async () => ({});
  updateImpl = async () => ({});
  deleteImpl = async () => ({});
  countImpl = async () => 0;
  groupByImpl = async () => [];
  aggregateImpl = async () => ({ _sum: { totalCost: 0 } });
}

const { ITProcurementService } = await import('@/lib/services/it-procurement-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ITProcurementService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns procurement requests for an organization', async () => {
      findManyImpl = async () => [{ id: 'p1', requestName: 'New Laptops' }];
      const result = await ITProcurementService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'p1');
    });

    it('applies status and type filters', async () => {
      findManyImpl = async () => [];
      await ITProcurementService.list('org-1', { status: 'approved', type: 'renewal' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'approved');
      assert.equal(args.where.type, 'renewal');
    });
  });

  describe('get', () => {
    it('returns a procurement request by id', async () => {
      findUniqueImpl = async () => ({ id: 'p1', requestName: 'Test' });
      const result = await ITProcurementService.get('p1');
      assert.ok(result);
    });

    it('returns null when not found', async () => {
      findUniqueImpl = async () => null;
      const result = await ITProcurementService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates a procurement request with default status pending', async () => {
      createImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'pending');
        assert.equal(args.data.type, 'purchase');
        return { id: 'p1', ...args.data };
      };
      const result = await ITProcurementService.create({
        organizationId: 'org-1',
        requestName: 'New Laptops',
        requestedBy: 'u1',
      });
      assert.ok(result);
    });

    it('calculates total cost from items', async () => {
      createImpl = async (args: CreateArgs) => {
        assert.equal(args.data.totalCost, 3000); // 2 * 1000 + 1 * 1000
        return { id: 'p1', ...args.data };
      };
      await ITProcurementService.create({
        organizationId: 'org-1',
        requestName: 'Order',
        requestedBy: 'u1',
        items: [
          { name: 'Laptop', quantity: 2, unitPrice: 1000 },
          { name: 'Monitor', quantity: 1, unitPrice: 1000 },
        ],
      });
    });

    it('serializes items as JSON', async () => {
      createImpl = async (args: CreateArgs) => {
        assert.equal(args.data.items, JSON.stringify([{ name: 'Laptop', quantity: 1, unitPrice: 500 }]));
        return { id: 'p1', ...args.data };
      };
      await ITProcurementService.create({
        organizationId: 'org-1',
        requestName: 'Order',
        requestedBy: 'u1',
        items: [{ name: 'Laptop', quantity: 1, unitPrice: 500 }],
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.requestName, 'Updated');
        assert.equal(args.data.description, undefined);
        return { id: 'p1', ...args.data };
      };
      const result = await ITProcurementService.update('p1', { requestName: 'Updated' });
      assert.ok(result);
    });

    it('recalculates total cost when items updated', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.totalCost, 500);
        return { id: 'p1', ...args.data };
      };
      await ITProcurementService.update('p1', {
        items: [{ name: 'Mouse', quantity: 5, unitPrice: 100 }],
      });
    });
  });

  describe('delete', () => {
    it('deletes a procurement request', async () => {
      deleteImpl = async () => ({ id: 'p1' });
      const result = await ITProcurementService.delete('p1');
      assert.ok(result);
    });
  });

  describe('approve', () => {
    it('sets status to approved and records approver', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        assert.equal(args.data.approvedBy, 'u2');
        return { id: 'p1', ...args.data };
      };
      const result = await ITProcurementService.approve('p1', 'u2');
      assert.ok(result);
    });
  });

  describe('reject', () => {
    it('sets status to rejected and records approver', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'rejected');
        assert.equal(args.data.approvedBy, 'u2');
        return { id: 'p1', ...args.data };
      };
      const result = await ITProcurementService.reject('p1', 'u2');
      assert.ok(result);
    });
  });

  describe('markOrdered', () => {
    it('sets status to ordered and records orderedAt', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'ordered');
        assert.ok(args.data.orderedAt);
        return { id: 'p1', ...args.data };
      };
      const result = await ITProcurementService.markOrdered('p1');
      assert.ok(result);
    });
  });

  describe('markReceived', () => {
    it('sets status to received and records receivedAt', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'received');
        assert.ok(args.data.receivedAt);
        return { id: 'p1', ...args.data };
      };
      const result = await ITProcurementService.markReceived('p1');
      assert.ok(result);
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, and totalCost', async () => {
      countImpl = async () => 5;
      groupByImpl = async () => [{ status: 'pending', _count: 2 }, { status: 'approved', _count: 3 }];
      aggregateImpl = async () => ({ _sum: { totalCost: 15000 } });

      const result = await ITProcurementService.getStats('org-1');
      assert.equal(result.total, 5);
      assert.equal(result.byStatus.pending, 2);
      assert.equal(result.totalCost, 15000);
    });
  });
});
