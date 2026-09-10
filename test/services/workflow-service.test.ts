import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRecord {
  id: string;
  content: string;
  type: string;
  organizationId: string;
  workspaceId: string;
  tags: string | null;
  updatedAt: Date;
  createdAt: Date;
}

interface EventRecord {
  id: string;
  type: string;
  source: string;
  sourceId: string;
  organizationId: string;
  content: string;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<MemoryRecord[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRecord | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryDeleteImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;

let eventCountImpl: (args: unknown) => Promise<number> = async () => 0;

let workspaceFindFirstImpl: (args: unknown) => Promise<{ id: string } | null> = async () => null;

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<MemoryRecord[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<MemoryRecord | null> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<MemoryRecord> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<MemoryRecord> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<MemoryRecord> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  event: {
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'event.count', args });
      return eventCountImpl(args);
    },
  },
  workspace: {
    findFirst: (args: unknown): Promise<{ id: string } | null> => {
      calls.push({ method: 'workspace.findFirst', args });
      return workspaceFindFirstImpl(args);
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

function makeMemoryRecord(id: string, data: Record<string, unknown>, orgId = 'org-1', wsId = 'ws-1'): MemoryRecord {
  return {
    id,
    content: JSON.stringify(data),
    type: 'workflow_definition',
    organizationId: orgId,
    workspaceId: wsId,
    tags: JSON.stringify(['workflow', data.status || 'draft', 'manual']),
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRecord;
  memoryUpdateImpl = async () => ({}) as MemoryRecord;
  memoryDeleteImpl = async () => ({}) as MemoryRecord;
  eventCountImpl = async () => 0;
  workspaceFindFirstImpl = async () => null;
}

const { WorkflowService } = await import('@/lib/services/workflow-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a workflow with a memory record', async () => {
      workspaceFindFirstImpl = async () => ({ id: 'ws-1' });
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { workspaceId: string; organizationId: string; type: string; content: string } };
        assert.equal(a.data.type, 'workflow_definition');
        assert.equal(a.data.workspaceId, 'ws-1');
        return makeMemoryRecord('wf-1', { name: 'Test', nodes: [], edges: [], variables: [], config: {}, version: 1, status: 'draft' });
      };

      const wf = await WorkflowService.create('org-1', {
        name: 'Test',
        nodes: [],
        edges: [],
        createdBy: 'user-1',
      });

      assert.equal(wf.id, 'wf-1');
      assert.equal(wf.name, 'Test');
      assert.equal(wf.version, 1);
      assert.equal(wf.status, 'draft');
    });

    it('throws on empty name', async () => {
      await assert.rejects(
        () => WorkflowService.create('org-1', { name: '  ', nodes: [], edges: [], createdBy: 'u1' }),
        /name_required/,
      );
    });

    it('throws when no workspace is found', async () => {
      workspaceFindFirstImpl = async () => null;
      await assert.rejects(
        () => WorkflowService.create('org-1', { name: 'Test', nodes: [], edges: [], createdBy: 'u1' }),
        /no_workspace/,
      );
    });
  });

  describe('get', () => {
    it('returns a workflow by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('wf-1', { name: 'My WF', nodes: [{ id: 't1', type: 'trigger', name: 'T', config: { type: 'manual' }, position: { x: 0, y: 0 } }], edges: [], variables: [], config: {}, version: 2, status: 'published' });

      const wf = await WorkflowService.get('wf-1');
      assert.ok(wf);
      assert.equal(wf!.name, 'My WF');
      assert.equal(wf!.version, 2);
      assert.equal(wf!.status, 'published');
      assert.equal(wf!.nodes.length, 1);
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const wf = await WorkflowService.get('nope');
      assert.equal(wf, null);
    });

    it('returns null when type is not workflow_definition', async () => {
      memoryFindUniqueImpl = async () => ({
        ...makeMemoryRecord('wf-1', { name: 'X' }),
        type: 'something_else',
      });
      const wf = await WorkflowService.get('wf-1');
      assert.equal(wf, null);
    });
  });

  describe('list', () => {
    it('returns workflows for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('wf-1', { name: 'A', status: 'draft' }),
        makeMemoryRecord('wf-2', { name: 'B', status: 'published' }),
      ];

      const wfs = await WorkflowService.list('org-1');
      assert.equal(wfs.length, 2);
      assert.equal(wfs[0].name, 'A');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('wf-1', { name: 'A', status: 'draft' }),
        makeMemoryRecord('wf-2', { name: 'B', status: 'published' }),
      ];

      const wfs = await WorkflowService.list('org-1', { status: 'published' });
      assert.equal(wfs.length, 1);
      assert.equal(wfs[0].status, 'published');
    });

    it('filters by search term', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('wf-1', { name: 'Email Campaign', status: 'draft' }),
        makeMemoryRecord('wf-2', { name: 'Social Posts', status: 'draft' }),
      ];

      const wfs = await WorkflowService.list('org-1', { search: 'email' });
      assert.equal(wfs.length, 1);
      assert.equal(wfs[0].name, 'Email Campaign');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };
      const wfs = await WorkflowService.list('org-1');
      assert.deepEqual(wfs, []);
    });
  });

  describe('update', () => {
    it('updates name and increments version', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('wf-1', { name: 'Old', nodes: [], edges: [], variables: [], config: {}, version: 1, status: 'draft' });
      memoryUpdateImpl = async () => makeMemoryRecord('wf-1', { name: 'New', version: 2, status: 'draft' });

      const wf = await WorkflowService.update('wf-1', { name: 'New' });
      assert.ok(wf);
      assert.equal(wf!.name, 'New');
      assert.equal(wf!.version, 2);
    });

    it('returns null when workflow not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const wf = await WorkflowService.update('nope', { name: 'X' });
      assert.equal(wf, null);
    });
  });

  describe('delete', () => {
    it('deletes a workflow', async () => {
      memoryDeleteImpl = async () => ({}) as MemoryRecord;
      const result = await WorkflowService.delete('wf-1');
      assert.equal(result.ok, true);
      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('duplicate', () => {
    it('creates a copy with a new name', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('wf-1', { name: 'Original', nodes: [], edges: [], variables: [], config: {}, version: 1, status: 'draft' });
      workspaceFindFirstImpl = async () => ({ id: 'ws-1' });
      memoryCreateImpl = async () =>
        makeMemoryRecord('wf-2', { name: 'Original (Copy)', nodes: [], edges: [], variables: [], config: {}, version: 1, status: 'draft' });

      const wf = await WorkflowService.duplicate('wf-1', 'Original (Copy)', 'user-1');
      assert.ok(wf);
      assert.equal(wf!.name, 'Original (Copy)');
    });

    it('returns null when original not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const wf = await WorkflowService.duplicate('nope', 'Copy', 'u1');
      assert.equal(wf, null);
    });
  });

  describe('publish / unpublish', () => {
    it('publishes a workflow (sets status to published)', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('wf-1', { name: 'WF', nodes: [], edges: [], variables: [], config: {}, version: 1, status: 'draft' });
      memoryUpdateImpl = async () => makeMemoryRecord('wf-1', { name: 'WF', version: 2, status: 'published' });

      const wf = await WorkflowService.publish('wf-1');
      assert.ok(wf);
      assert.equal(wf!.status, 'published');
    });

    it('unpublishes a workflow (sets status to draft)', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('wf-1', { name: 'WF', nodes: [], edges: [], variables: [], config: {}, version: 1, status: 'published' });
      memoryUpdateImpl = async () => makeMemoryRecord('wf-1', { name: 'WF', version: 2, status: 'draft' });

      const wf = await WorkflowService.unpublish('wf-1');
      assert.ok(wf);
      assert.equal(wf!.status, 'draft');
    });
  });

  describe('validate', () => {
    it('validates a correct workflow', () => {
      const wf = {
        id: 'wf-1',
        name: 'Test',
        nodes: [
          { id: 't1', type: 'trigger' as const, name: 'Trigger', config: { type: 'manual' }, position: { x: 0, y: 0 } },
          { id: 'a1', type: 'action' as const, name: 'Action', config: { action: 'create_task' }, position: { x: 0, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'a1' }],
        variables: [],
        config: {},
        version: 1,
        status: 'draft' as const,
      };
      const result = WorkflowService.validate(wf);
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('reports missing trigger node', () => {
      const wf = {
        id: 'wf-1', name: 'Test',
        nodes: [{ id: 'a1', type: 'action' as const, name: 'A', config: { action: 'create_task' }, position: { x: 0, y: 0 } }],
        edges: [], variables: [], config: {}, version: 1, status: 'draft' as const,
      };
      const result = WorkflowService.validate(wf);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('missing_trigger_node'));
    });

    it('reports multiple trigger nodes', () => {
      const wf = {
        id: 'wf-1', name: 'Test',
        nodes: [
          { id: 't1', type: 'trigger' as const, name: 'T1', config: { type: 'manual' }, position: { x: 0, y: 0 } },
          { id: 't2', type: 'trigger' as const, name: 'T2', config: { type: 'manual' }, position: { x: 0, y: 0 } },
        ],
        edges: [], variables: [], config: {}, version: 1, status: 'draft' as const,
      };
      const result = WorkflowService.validate(wf);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('multiple_trigger_nodes'));
    });

    it('reports cycle detected', () => {
      const wf = {
        id: 'wf-1', name: 'Test',
        nodes: [
          { id: 't1', type: 'trigger' as const, name: 'T', config: { type: 'manual' }, position: { x: 0, y: 0 } },
          { id: 'a1', type: 'action' as const, name: 'A', config: { action: 'create_task' }, position: { x: 0, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 't1', target: 'a1' },
          { id: 'e2', source: 'a1', target: 't1' },
        ],
        variables: [], config: {}, version: 1, status: 'draft' as const,
      };
      const result = WorkflowService.validate(wf);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('cycle_detected'));
    });
  });

  describe('getStats', () => {
    it('aggregates stats by status and trigger type', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('wf-1', { name: 'A', status: 'draft', nodes: [{ id: 't', type: 'trigger', name: 'T', config: { type: 'manual' }, position: { x: 0, y: 0 } }] }),
        makeMemoryRecord('wf-2', { name: 'B', status: 'published', nodes: [{ id: 't', type: 'trigger', name: 'T', config: { type: 'schedule' }, position: { x: 0, y: 0 } }] }),
      ];
      eventCountImpl = async () => 42;

      const stats = await WorkflowService.getStats('org-1');
      assert.equal(stats.total, 2);
      assert.equal(stats.byStatus.draft, 1);
      assert.equal(stats.byStatus.published, 1);
      assert.equal(stats.byTriggerType.manual, 1);
      assert.equal(stats.byTriggerType.schedule, 1);
      assert.equal(stats.executionCount, 42);
    });

    it('returns zero stats when no workflows', async () => {
      memoryFindManyImpl = async () => [];
      eventCountImpl = async () => 0;
      const stats = await WorkflowService.getStats('org-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.executionCount, 0);
    });
  });

  describe('getVersions', () => {
    it('returns version history for a workflow', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('wf-1', { name: 'WF', nodes: [], edges: [], variables: [], config: {}, version: 3, status: 'published' });

      const versions = await WorkflowService.getVersions('wf-1');
      assert.equal(versions.length, 1);
      assert.equal(versions[0].version, 3);
      assert.equal(versions[0].status, 'published');
    });

    it('returns empty array when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const versions = await WorkflowService.getVersions('nope');
      assert.deepEqual(versions, []);
    });
  });
});
