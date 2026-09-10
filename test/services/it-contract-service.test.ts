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
let aggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { value: 0 } });

const prismaMock = {
  iTContract: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'iTContract.findMany', args }); return findManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'iTContract.findUnique', args }); return findUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'iTContract.create', args }); return createImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'iTContract.update', args }); return updateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'iTContract.delete', args }); return deleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'iTContract.count', args }); return countImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'iTContract.groupBy', args }); return groupByImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'iTContract.aggregate', args }); return aggregateImpl(args); },
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
  aggregateImpl = async () => ({ _sum: { value: 0 } });
}

const { ITContractService } = await import('@/lib/services/it-contract-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ITContractService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns contracts for an organization', async () => {
      findManyImpl = async () => [{ id: 'c1', vendorName: 'AWS' }];
      const result = await ITContractService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
    });

    it('applies status filter', async () => {
      findManyImpl = async () => [];
      await ITContractService.list('org-1', { status: 'active' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'active');
    });
  });

  describe('get', () => {
    it('returns a contract by id', async () => {
      findUniqueImpl = async () => ({ id: 'c1', vendorName: 'AWS' });
      const result = await ITContractService.get('c1');
      assert.ok(result);
    });

    it('returns null when not found', async () => {
      findUniqueImpl = async () => null;
      const result = await ITContractService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates a contract with defaults', async () => {
      createImpl = async (args: CreateArgs) => {
        assert.equal(args.data.contractType, 'service');
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.value, 0);
        return { id: 'c1', ...args.data };
      };
      const result = await ITContractService.create({
        organizationId: 'org-1',
        vendorName: 'AWS',
        title: 'AWS Support',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        createdBy: 'u1',
      });
      assert.ok(result);
    });

    it('serializes metadata as JSON string', async () => {
      createImpl = async (args: CreateArgs) => {
        assert.equal(args.data.metadata, JSON.stringify({ tier: 'business' }));
        return { id: 'c1', ...args.data };
      };
      await ITContractService.create({
        organizationId: 'org-1',
        vendorName: 'AWS',
        title: 'AWS Support',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        createdBy: 'u1',
        metadata: { tier: 'business' },
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.vendorName, 'Updated');
        assert.equal(args.data.title, undefined);
        return { id: 'c1', ...args.data };
      };
      const result = await ITContractService.update('c1', { vendorName: 'Updated' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes a contract', async () => {
      deleteImpl = async () => ({ id: 'c1' });
      const result = await ITContractService.delete('c1');
      assert.ok(result);
    });
  });

  describe('getExpiringContracts', () => {
    it('returns contracts expiring within the given days', async () => {
      findManyImpl = async () => [{ id: 'c1', endDate: new Date() }];
      const result = await ITContractService.getExpiringContracts('org-1', 30);
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.endDate);
      assert.ok(args.where.status);
    });

    it('returns empty array on error', async () => {
      findManyImpl = async () => { throw new Error('fail'); };
      const result = await ITContractService.getExpiringContracts('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getRenewalAlerts', () => {
    it('returns contracts with upcoming renewal dates', async () => {
      findManyImpl = async () => [{ id: 'c1', renewalDate: new Date() }];
      const result = await ITContractService.getRenewalAlerts('org-1', 60);
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.renewalDate);
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, and totalActiveValue', async () => {
      countImpl = async () => 4;
      groupByImpl = async () => [{ status: 'active', _count: 3 }, { status: 'expired', _count: 1 }];
      aggregateImpl = async () => ({ _sum: { value: 50000 } });

      const result = await ITContractService.getStats('org-1');
      assert.equal(result.total, 4);
      assert.equal(result.byStatus.active, 3);
      assert.equal(result.totalActiveValue, 50000);
    });
  });
});
