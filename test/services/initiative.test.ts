import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type InitiativeFindManyArgs = {
  where: { workspaceId: string };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type InitiativeFindUniqueArgs = {
  where: { id: string };
};

type InitiativeCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    description?: string | null;
    status: string;
    priority: string;
    startDate?: Date | null;
    endDate?: Date | null;
    budget: number;
    currency: string;
    ownerId?: string | null;
  };
};

type InitiativeUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let initiativeFindManyImpl: (args: InitiativeFindManyArgs) => Promise<unknown[]> =
  async () => [];
let initiativeFindUniqueImpl: (args: InitiativeFindUniqueArgs) => Promise<unknown> =
  async () => null;
let initiativeCreateImpl: (args: InitiativeCreateArgs) => Promise<unknown> =
  async () => ({});
let initiativeUpdateImpl: (args: InitiativeUpdateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  initiative: {
    findMany: (args: InitiativeFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'initiative.findMany', args });
      return initiativeFindManyImpl(args);
    },
    findUnique: (args: InitiativeFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'initiative.findUnique', args });
      return initiativeFindUniqueImpl(args);
    },
    create: (args: InitiativeCreateArgs): Promise<unknown> => {
      calls.push({ method: 'initiative.create', args });
      return initiativeCreateImpl(args);
    },
    update: (args: InitiativeUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'initiative.update', args });
      return initiativeUpdateImpl(args);
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
  initiativeFindManyImpl = async () => [];
  initiativeFindUniqueImpl = async () => null;
  initiativeCreateImpl = async () => ({});
  initiativeUpdateImpl = async () => ({});
}

const { InitiativeService } = await import('@/lib/services/initiative');

describe('InitiativeService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns initiatives for a workspace', async () => {
      initiativeFindManyImpl = async () =>
        ([{ id: 'i1', name: 'Q1 Campaign', priority: 'high' }]);

      const result = await InitiativeService.list('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'i1');
      assert.equal(calls[0].method, 'initiative.findMany');
      const args = calls[0].args as InitiativeFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      initiativeFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await InitiativeService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns an initiative by id', async () => {
      initiativeFindUniqueImpl = async () =>
        ({ id: 'i1', name: 'Campaign', status: 'active' });

      const result = await InitiativeService.get('i1');

      assert.ok(result);
      assert.equal(result.id, 'i1');
      assert.equal(calls[0].method, 'initiative.findUnique');
    });

    it('returns null when initiative not found', async () => {
      initiativeFindUniqueImpl = async () => null;

      const result = await InitiativeService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      initiativeFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await InitiativeService.get('i1');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates an initiative with defaults', async () => {
      initiativeCreateImpl = async (args: InitiativeCreateArgs) => {
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.priority, 'medium');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.budget, 0);
        return { id: 'i1', ...args.data };
      };

      const result = await InitiativeService.create({
        organizationId: 'org-1',
        name: 'Q1 Campaign',
      });

      assert.ok(result);
      assert.equal(result.id, 'i1');
      assert.equal(calls[0].method, 'initiative.create');
    });

    it('truncates long names to 300 characters', async () => {
      initiativeCreateImpl = async (args: InitiativeCreateArgs) => {
        assert.ok(args.data.name.length <= 300);
        return { id: 'i1', name: args.data.name };
      };

      await InitiativeService.create({
        organizationId: 'org-1',
        name: 'A'.repeat(500),
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      initiativeUpdateImpl = async (args: InitiativeUpdateArgs) => {
        assert.equal(args.data.name, 'Updated Campaign');
        assert.equal(args.data.budget, undefined);
        return { id: 'i1', ...args.data };
      };

      const result = await InitiativeService.update('i1', { name: 'Updated Campaign' });
      assert.ok(result);
      assert.equal(calls[0].method, 'initiative.update');
    });

    it('sets ownerId to null when empty string provided', async () => {
      initiativeUpdateImpl = async (args: InitiativeUpdateArgs) => {
        assert.equal(args.data.ownerId, null);
        return { id: 'i1', ownerId: null };
      };

      await InitiativeService.update('i1', { ownerId: '' });
    });
  });
});
