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

let changeFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let changeFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let changeCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let changeUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let changeDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let changeCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let changeGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  changeRequest: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'changeRequest.findMany', args }); return changeFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'changeRequest.findUnique', args }); return changeFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'changeRequest.create', args }); return changeCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'changeRequest.update', args }); return changeUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'changeRequest.delete', args }); return changeDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'changeRequest.count', args }); return changeCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'changeRequest.groupBy', args }); return changeGroupByImpl(args); },
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
  changeFindManyImpl = async () => [];
  changeFindUniqueImpl = async () => null;
  changeCreateImpl = async () => ({});
  changeUpdateImpl = async () => ({});
  changeDeleteImpl = async () => ({});
  changeCountImpl = async () => 0;
  changeGroupByImpl = async () => [];
}

const { ChangeManagementService } = await import('@/lib/services/change-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ChangeManagementService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns change requests for an organization', async () => {
      changeFindManyImpl = async () => [{ id: 'c1', title: 'Deploy v2' }];

      const result = await ChangeManagementService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status, type, and priority filters', async () => {
      changeFindManyImpl = async () => [];

      await ChangeManagementService.list('org-1', { status: 'approved', type: 'standard', priority: 'high' });

      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'approved');
      assert.equal(args.where.type, 'standard');
      assert.equal(args.where.priority, 'high');
    });

    it('applies search filter with OR clause', async () => {
      changeFindManyImpl = async () => [];

      await ChangeManagementService.list('org-1', { search: 'deploy' });

      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.OR);
    });
  });

  describe('get', () => {
    it('returns a change request by id', async () => {
      changeFindUniqueImpl = async () => ({ id: 'c1', title: 'Deploy' });

      const result = await ChangeManagementService.get('c1');
      assert.ok(result);
      assert.equal(result.id, 'c1');
    });

    it('returns null when not found', async () => {
      changeFindUniqueImpl = async () => null;
      const result = await ChangeManagementService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates a change request with defaults', async () => {
      changeCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'standard');
        assert.equal(args.data.status, 'requested');
        assert.equal(args.data.priority, 'medium');
        assert.equal(args.data.riskLevel, 'low');
        assert.equal(args.data.affectedSystems, JSON.stringify([]));
        return { id: 'c1', ...args.data };
      };

      const result = await ChangeManagementService.create({
        organizationId: 'org-1',
        title: 'Deploy v2',
        requestedById: 'u1',
      });
      assert.ok(result);
      assert.equal(result.id, 'c1');
    });

    it('serializes affectedSystems as JSON array', async () => {
      changeCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.affectedSystems, JSON.stringify(['db', 'api']));
        return { id: 'c1', ...args.data };
      };

      await ChangeManagementService.create({
        organizationId: 'org-1',
        title: 'Test',
        requestedById: 'u1',
        affectedSystems: ['db', 'api'],
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      changeUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.title, 'Updated');
        assert.equal(args.data.description, undefined);
        return { id: 'c1', ...args.data };
      };

      const result = await ChangeManagementService.update('c1', { title: 'Updated' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes a change request', async () => {
      changeDeleteImpl = async () => ({ id: 'c1' });

      const result = await ChangeManagementService.delete('c1');
      assert.ok(result);
      assert.equal(calls[0].method, 'changeRequest.delete');
    });
  });

  describe('approveChangeRequest', () => {
    it('sets status to approved with approver and timestamp', async () => {
      changeUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        assert.equal(args.data.approvedById, 'u1');
        assert.ok(args.data.approvedAt instanceof Date);
        return { id: 'c1', ...args.data };
      };

      const result = await ChangeManagementService.approveChangeRequest('c1', 'u1');
      assert.ok(result);
    });
  });

  describe('rejectChangeRequest', () => {
    it('sets status to rejected', async () => {
      changeUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'rejected');
        return { id: 'c1', ...args.data };
      };

      const result = await ChangeManagementService.rejectChangeRequest('c1');
      assert.ok(result);
    });
  });

  describe('implementChangeRequest', () => {
    it('sets status to in_progress with implementedAt', async () => {
      changeUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'in_progress');
        assert.ok(args.data.implementedAt instanceof Date);
        return { id: 'c1', ...args.data };
      };

      const result = await ChangeManagementService.implementChangeRequest('c1');
      assert.ok(result);
    });
  });

  describe('completeChangeRequest', () => {
    it('sets status to implemented with completedAt', async () => {
      changeUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'implemented');
        assert.ok(args.data.completedAt instanceof Date);
        return { id: 'c1', ...args.data };
      };

      const result = await ChangeManagementService.completeChangeRequest('c1');
      assert.ok(result);
    });
  });

  describe('cancelChangeRequest', () => {
    it('sets status to cancelled', async () => {
      changeUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'cancelled');
        return { id: 'c1', ...args.data };
      };

      const result = await ChangeManagementService.cancelChangeRequest('c1');
      assert.ok(result);
    });
  });

  describe('getByStatus / getByType', () => {
    it('getByStatus filters by status', async () => {
      changeFindManyImpl = async () => [{ id: 'c1' }];
      const result = await ChangeManagementService.getByStatus('org-1', 'approved');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'approved');
    });

    it('getByType filters by type', async () => {
      changeFindManyImpl = async () => [];
      await ChangeManagementService.getByType('org-1', 'emergency');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.type, 'emergency');
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, and byType counts', async () => {
      changeCountImpl = async () => 8;
      changeGroupByImpl = async (args: GroupByArgs) => {
        if (args.by[0] === 'status') return [{ status: 'approved', _count: 3 }, { status: 'requested', _count: 5 }];
        return [{ type: 'standard', _count: 6 }, { type: 'emergency', _count: 2 }];
      };

      const result = await ChangeManagementService.getStats('org-1');
      assert.equal(result.total, 8);
      assert.equal(result.byStatus.approved, 3);
      assert.equal(result.byStatus.requested, 5);
      assert.equal(result.byType.standard, 6);
      assert.equal(result.byType.emergency, 2);
    });
  });
});
