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
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let allocFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let allocFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let allocCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let allocUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let allocDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let allocCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let allocGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  resourceAllocation: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'resourceAllocation.findMany', args }); return allocFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'resourceAllocation.findUnique', args }); return allocFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'resourceAllocation.create', args }); return allocCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'resourceAllocation.update', args }); return allocUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'resourceAllocation.delete', args }); return allocDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'resourceAllocation.count', args }); return allocCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'resourceAllocation.groupBy', args }); return allocGroupByImpl(args); },
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
  allocFindManyImpl = async () => [];
  allocFindUniqueImpl = async () => null;
  allocCreateImpl = async () => ({});
  allocUpdateImpl = async () => ({});
  allocDeleteImpl = async () => ({});
  allocCountImpl = async () => 0;
  allocGroupByImpl = async () => [];
}

const { CapacityService } = await import('@/lib/services/capacity-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CapacityService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns allocations for an organization', async () => {
      allocFindManyImpl = async () => [{ id: 'a1', userId: 'u1' }];

      const result = await CapacityService.list('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status, userId, and projectId filters', async () => {
      allocFindManyImpl = async () => [];

      await CapacityService.list('org-1', { status: 'active', userId: 'u1', projectId: 'p1' });

      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'active');
      assert.equal(args.where.userId, 'u1');
      assert.equal(args.where.projectId, 'p1');
    });
  });

  describe('get', () => {
    it('returns an allocation by id', async () => {
      allocFindUniqueImpl = async () => ({ id: 'a1', userId: 'u1' });

      const result = await CapacityService.get('a1');
      assert.ok(result);
      assert.equal(result.id, 'a1');
    });

    it('returns null when not found', async () => {
      allocFindUniqueImpl = async () => null;
      const result = await CapacityService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates an allocation with defaults', async () => {
      allocCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.role, 'member');
        assert.equal(args.data.allocatedHours, 0);
        assert.equal(args.data.maxHours, 40);
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.notes, '');
        return { id: 'a1', ...args.data };
      };

      const result = await CapacityService.create({
        organizationId: 'org-1',
        userId: 'u1',
        startDate: new Date('2024-01-01'),
      });
      assert.ok(result);
      assert.equal(result.id, 'a1');
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      allocUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.allocatedHours, 20);
        assert.equal(args.data.role, undefined);
        return { id: 'a1', ...args.data };
      };

      const result = await CapacityService.update('a1', { allocatedHours: 20 });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes an allocation', async () => {
      allocDeleteImpl = async () => ({ id: 'a1' });

      const result = await CapacityService.delete('a1');
      assert.ok(result);
      assert.equal(calls[0].method, 'resourceAllocation.delete');
    });
  });

  describe('changeAllocationStatus', () => {
    it('updates the allocation status', async () => {
      allocUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'paused');
        return { id: 'a1', ...args.data };
      };

      const result = await CapacityService.changeAllocationStatus('a1', 'paused');
      assert.ok(result);
    });
  });

  describe('getUserAllocations', () => {
    it('returns active allocations for a user', async () => {
      allocFindManyImpl = async () => [{ id: 'a1', userId: 'u1' }];

      const result = await CapacityService.getUserAllocations('org-1', 'u1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.userId, 'u1');
      assert.equal(args.where.status, 'active');
    });
  });

  describe('getProjectAllocations', () => {
    it('returns active allocations for a project', async () => {
      allocFindManyImpl = async () => [{ id: 'a1', projectId: 'p1' }];

      const result = await CapacityService.getProjectAllocations('org-1', 'p1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.projectId, 'p1');
      assert.equal(args.where.status, 'active');
    });
  });

  describe('getUserUtilization', () => {
    it('computes utilization as allocatedHours/maxHours*100', async () => {
      allocFindManyImpl = async () => [
        { userId: 'u1', allocatedHours: 20, maxHours: 40 },
        { userId: 'u1', allocatedHours: 10, maxHours: 40 },
      ];

      const result = await CapacityService.getUserUtilization('org-1', 'u1');
      assert.equal(result.userId, 'u1');
      assert.equal(result.allocatedHours, 30);
      assert.equal(result.maxHours, 80);
      assert.equal(result.utilization, 37.5);
      assert.equal(result.allocationCount, 2);
    });

    it('returns 0 utilization when no allocations', async () => {
      allocFindManyImpl = async () => [];

      const result = await CapacityService.getUserUtilization('org-1', 'u1');
      assert.equal(result.allocatedHours, 0);
      assert.equal(result.maxHours, 40);
      assert.equal(result.utilization, 0);
      assert.equal(result.allocationCount, 0);
    });
  });

  describe('getTeamUtilization', () => {
    it('aggregates utilization across all users', async () => {
      allocFindManyImpl = async () => [
        { userId: 'u1', allocatedHours: 40, maxHours: 40 },
        { userId: 'u2', allocatedHours: 20, maxHours: 40 },
      ];

      const result = await CapacityService.getTeamUtilization('org-1');
      assert.equal(result.users.length, 2);
      assert.equal(result.users[0].utilization, 100);
      assert.equal(result.users[1].utilization, 50);
      assert.equal(result.totalAllocated, 60);
      assert.equal(result.totalMax, 80);
      assert.equal(result.averageUtilization, 75);
    });
  });

  describe('getOverallocatedUsers', () => {
    it('returns users with utilization > 100', async () => {
      allocFindManyImpl = async () => [
        { userId: 'u1', allocatedHours: 50, maxHours: 40 },
        { userId: 'u2', allocatedHours: 20, maxHours: 40 },
      ];

      const result = await CapacityService.getOverallocatedUsers('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].userId, 'u1');
      assert.ok(result[0].utilization > 100);
    });
  });

  describe('getUnderutilizedUsers', () => {
    it('returns users with utilization < 60', async () => {
      allocFindManyImpl = async () => [
        { userId: 'u1', allocatedHours: 50, maxHours: 40 },
        { userId: 'u2', allocatedHours: 20, maxHours: 40 },
      ];

      const result = await CapacityService.getUnderutilizedUsers('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].userId, 'u2');
      assert.ok(result[0].utilization < 60);
    });
  });

  describe('getProjectCapacity', () => {
    it('computes capacity for a project', async () => {
      allocFindManyImpl = async () => [
        { allocatedHours: 20, maxHours: 40 },
        { allocatedHours: 10, maxHours: 40 },
      ];

      const result = await CapacityService.getProjectCapacity('org-1', 'p1');
      assert.equal(result.projectId, 'p1');
      assert.equal(result.allocationCount, 2);
      assert.equal(result.totalAllocated, 30);
      assert.equal(result.totalMax, 80);
      assert.equal(result.utilization, 37.5);
    });
  });

  describe('getWorkloadByProject', () => {
    it('groups allocated hours by project', async () => {
      allocFindManyImpl = async () => [
        { projectId: 'p1', allocatedHours: 20, userId: 'u1' },
        { projectId: 'p1', allocatedHours: 10, userId: 'u2' },
        { projectId: null, allocatedHours: 5, userId: 'u3' },
      ];

      const result = await CapacityService.getWorkloadByProject('org-1');
      assert.equal(result.length, 2);
      const p1 = result.find((r) => r.projectId === 'p1');
      assert.ok(p1);
      assert.equal(p1.allocatedHours, 30);
      assert.equal(p1.userCount, 2);
    });
  });

  describe('getBottlenecks', () => {
    it('returns overallocated users with multiple projects', async () => {
      // First call: getOverallocatedUsers -> getTeamUtilization -> findMany
      // Second call: findMany for all active allocations
      allocFindManyImpl = async () => [
        { userId: 'u1', allocatedHours: 50, maxHours: 40, projectId: 'p1' },
        { userId: 'u1', allocatedHours: 50, maxHours: 40, projectId: 'p2' },
        { userId: 'u2', allocatedHours: 20, maxHours: 40, projectId: 'p1' },
      ];

      const result = await CapacityService.getBottlenecks('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].userId, 'u1');
      assert.equal(result[0].projectCount, 2);
    });
  });

  describe('getForecast', () => {
    it('generates a weekly forecast', async () => {
      const now = new Date();
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      allocFindManyImpl = async () => [
        { allocatedHours: 20, maxHours: 40, startDate: past, endDate: null },
        { allocatedHours: 10, maxHours: 40, startDate: past, endDate: null },
      ];

      const result = await CapacityService.getForecast('org-1', 4);
      assert.equal(result.length, 4);
      assert.equal(result[0].week, 1);
      assert.equal(result[0].allocatedHours, 30);
      assert.ok(result[0].utilization > 0);
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, overallocatedCount, and underutilizedCount', async () => {
      allocCountImpl = async () => 15;
      allocGroupByImpl = async () => [{ status: 'active', _count: 10 }, { status: 'completed', _count: 5 }];
      // findMany for getOverallocatedUsers and getUnderutilizedUsers (each calls getTeamUtilization)
      allocFindManyImpl = async () => [
        { userId: 'u1', allocatedHours: 50, maxHours: 40 },
        { userId: 'u2', allocatedHours: 15, maxHours: 40 },
      ];

      const result = await CapacityService.getStats('org-1');
      assert.equal(result.total, 15);
      assert.equal(result.byStatus.active, 10);
      assert.equal(result.byStatus.completed, 5);
      assert.equal(result.overallocatedCount, 1);
      assert.equal(result.underutilizedCount, 1);
    });
  });
});
