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

let incidentFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let incidentFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let incidentCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let incidentUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let incidentDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let incidentCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let incidentGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  iTSMIncident: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'itsmIncident.findMany', args }); return incidentFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'itsmIncident.findUnique', args }); return incidentFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'itsmIncident.create', args }); return incidentCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'itsmIncident.update', args }); return incidentUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'itsmIncident.delete', args }); return incidentDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'itsmIncident.count', args }); return incidentCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'itsmIncident.groupBy', args }); return incidentGroupByImpl(args); },
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
  incidentFindManyImpl = async () => [];
  incidentFindUniqueImpl = async () => null;
  incidentCreateImpl = async () => ({});
  incidentUpdateImpl = async () => ({});
  incidentDeleteImpl = async () => ({});
  incidentCountImpl = async () => 0;
  incidentGroupByImpl = async () => [];
}

const { ITSMService } = await import('@/lib/services/itsm-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ITSMService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns incidents for an organization', async () => {
      incidentFindManyImpl = async () => [{ id: 'i1', title: 'Server down' }];

      const result = await ITSMService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'i1');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status, priority, category, and type filters', async () => {
      incidentFindManyImpl = async () => [];

      await ITSMService.list('org-1', { status: 'open', priority: 'urgent', category: 'network', type: 'incident' });

      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'open');
      assert.equal(args.where.priority, 'urgent');
      assert.equal(args.where.category, 'network');
      assert.equal(args.where.type, 'incident');
    });

    it('applies search filter with OR clause', async () => {
      incidentFindManyImpl = async () => [];

      await ITSMService.list('org-1', { search: 'server' });

      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.OR);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      incidentFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await ITSMService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns an incident by id', async () => {
      incidentFindUniqueImpl = async () => ({ id: 'i1', title: 'Test' });

      const result = await ITSMService.get('i1');
      assert.ok(result);
      assert.equal(result.id, 'i1');
    });

    it('returns null when not found', async () => {
      incidentFindUniqueImpl = async () => null;
      const result = await ITSMService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates an incident with defaults', async () => {
      incidentCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'incident');
        assert.equal(args.data.priority, 'medium');
        assert.equal(args.data.status, 'open');
        assert.equal(args.data.severity, 'minor');
        assert.equal(args.data.category, 'general');
        assert.equal(args.data.tags, JSON.stringify([]));
        return { id: 'i1', ...args.data };
      };

      const result = await ITSMService.create({
        organizationId: 'org-1',
        title: 'Server down',
        reportedById: 'u1',
      });
      assert.ok(result);
      assert.equal(result.id, 'i1');
    });

    it('serializes tags as JSON array string', async () => {
      incidentCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.tags, JSON.stringify(['urgent', 'prod']));
        return { id: 'i1', ...args.data };
      };

      await ITSMService.create({
        organizationId: 'org-1',
        title: 'Test',
        reportedById: 'u1',
        tags: ['urgent', 'prod'],
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.title, 'Updated');
        assert.equal(args.data.description, undefined);
        return { id: 'i1', ...args.data };
      };

      const result = await ITSMService.update('i1', { title: 'Updated' });
      assert.ok(result);
    });

    it('serializes tags on update', async () => {
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.tags, JSON.stringify(['x']));
        return { id: 'i1', ...args.data };
      };

      await ITSMService.update('i1', { tags: ['x'] });
    });
  });

  describe('delete', () => {
    it('deletes an incident', async () => {
      incidentDeleteImpl = async () => ({ id: 'i1' });

      const result = await ITSMService.delete('i1');
      assert.ok(result);
      assert.equal(calls[0].method, 'itsmIncident.delete');
    });
  });

  describe('assignIncident', () => {
    it('assigns an incident to a user', async () => {
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.assignedToId, 'u1');
        return { id: 'i1', ...args.data };
      };

      const result = await ITSMService.assignIncident('i1', 'u1');
      assert.ok(result);
    });
  });

  describe('changeIncidentStatus', () => {
    it('sets resolvedAt when status is resolved', async () => {
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'resolved');
        assert.ok(args.data.resolvedAt instanceof Date);
        assert.equal(args.data.closedAt, undefined);
        return { id: 'i1', ...args.data };
      };

      await ITSMService.changeIncidentStatus('i1', 'resolved');
    });

    it('sets closedAt and resolvedAt when status is closed', async () => {
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'closed');
        assert.ok(args.data.closedAt instanceof Date);
        assert.ok(args.data.resolvedAt instanceof Date);
        return { id: 'i1', ...args.data };
      };

      await ITSMService.changeIncidentStatus('i1', 'closed');
    });
  });

  describe('escalateIncident', () => {
    it('increases priority from medium to high', async () => {
      incidentFindUniqueImpl = async () => ({ id: 'i1', priority: 'medium' });
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.priority, 'high');
        return { id: 'i1', ...args.data };
      };

      const result = await ITSMService.escalateIncident('i1') as { priority: string };
      assert.equal(result.priority, 'high');
    });

    it('keeps urgent priority at the top', async () => {
      incidentFindUniqueImpl = async () => ({ id: 'i1', priority: 'urgent' });
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.priority, 'urgent');
        return { id: 'i1', ...args.data };
      };

      const result = await ITSMService.escalateIncident('i1') as { priority: string };
      assert.equal(result.priority, 'urgent');
    });

    it('throws when incident not found', async () => {
      incidentFindUniqueImpl = async () => null;
      await assert.rejects(() => ITSMService.escalateIncident('nope'), /incident_not_found/);
    });
  });

  describe('resolveIncident', () => {
    it('sets status to resolved and resolvedAt', async () => {
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'resolved');
        assert.ok(args.data.resolvedAt instanceof Date);
        assert.equal(args.data.resolution, 'fixed');
        return { id: 'i1', ...args.data };
      };

      await ITSMService.resolveIncident('i1', 'fixed');
    });
  });

  describe('closeIncident', () => {
    it('sets status to closed with closedAt and resolvedAt', async () => {
      incidentUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'closed');
        assert.ok(args.data.closedAt instanceof Date);
        assert.ok(args.data.resolvedAt instanceof Date);
        return { id: 'i1', ...args.data };
      };

      await ITSMService.closeIncident('i1');
    });
  });

  describe('getSLABreaches', () => {
    it('returns incidents past SLA due date that are not resolved/closed', async () => {
      incidentFindManyImpl = async () => [{ id: 'i1', title: 'breach' }];

      const result = await ITSMService.getSLABreaches('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.slaDueAt);
      assert.ok(args.where.status);
    });
  });

  describe('getByStatus / getByPriority / getByCategory', () => {
    it('getByStatus filters by status', async () => {
      incidentFindManyImpl = async () => [{ id: 'i1' }];
      const result = await ITSMService.getByStatus('org-1', 'open');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'open');
    });

    it('getByPriority filters by priority', async () => {
      incidentFindManyImpl = async () => [];
      await ITSMService.getByPriority('org-1', 'urgent');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.priority, 'urgent');
    });

    it('getByCategory filters by category', async () => {
      incidentFindManyImpl = async () => [];
      await ITSMService.getByCategory('org-1', 'network');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.category, 'network');
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, byPriority, and slaBreaches counts', async () => {
      incidentCountImpl = async () => 10;
      incidentGroupByImpl = async (args: GroupByArgs) => {
        if (args.by[0] === 'status') return [{ status: 'open', _count: 4 }, { status: 'resolved', _count: 6 }];
        return [{ priority: 'urgent', _count: 2 }, { priority: 'medium', _count: 8 }];
      };
      incidentFindManyImpl = async () => [{ id: 'i1' }, { id: 'i2' }];

      const result = await ITSMService.getStats('org-1');
      assert.equal(result.total, 10);
      assert.equal(result.byStatus.open, 4);
      assert.equal(result.byStatus.resolved, 6);
      assert.equal(result.byPriority.urgent, 2);
      assert.equal(result.byPriority.medium, 8);
      assert.equal(result.slaBreaches, 2);
    });
  });
});
