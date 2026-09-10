import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  take?: number;
};

type FindUniqueArgs = {
  where: { id: string };
};

type CountArgs = {
  where: Record<string, unknown>;
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source?: string;
    sourceId?: string | null;
    confidence: number;
    owner?: string | null;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => ({});

let taskFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let goalFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let projectFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];

let taskCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let goalCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let projectCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: FindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  task: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'task.count', args });
      return taskCountImpl(args);
    },
  },
  goal: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'goal.findMany', args });
      return goalFindManyImpl(args);
    },
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'goal.count', args });
      return goalCountImpl(args);
    },
  },
  project: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
    },
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'project.count', args });
      return projectCountImpl(args);
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
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  taskFindManyImpl = async () => [];
  goalFindManyImpl = async () => [];
  projectFindManyImpl = async () => [];
  taskCountImpl = async () => 0;
  goalCountImpl = async () => 0;
  projectCountImpl = async () => 0;
}

const { DataExportService } = await import('@/lib/services/data-export-service');

// ─────────────────────────────────────────────────────────────────────────────
// DataExportService
// ─────────────────────────────────────────────────────────────────────────────

describe('DataExportService', () => {
  beforeEach(() => { resetMock(); });

  describe('createExport', () => {
    it('creates an export record with pending status', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'data_export');
        const config = JSON.parse(args.data.content);
        assert.equal(config.format, 'json');
        assert.equal(config.status, 'pending');
        assert.deepEqual(config.entities, ['task', 'goal']);
        return {
          id: 'exp-1',
          ...args.data,
          createdAt: new Date(),
        };
      };

      const result = await DataExportService.createExport({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        format: 'json',
        entities: ['task', 'goal'],
        createdBy: 'user-1',
      });

      assert.equal(result.id, 'exp-1');
      assert.equal(result.status, 'pending');
      assert.equal(result.format, 'json');
    });

    it('stores configuration in the content field as JSON', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const config = JSON.parse(args.data.content);
        assert.equal(config.format, 'csv');
        assert.deepEqual(config.entities, ['project']);
        assert.equal(config.filters.status, 'active');
        return { id: 'exp-2', ...args.data, createdAt: new Date() };
      };

      await DataExportService.createExport({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        format: 'csv',
        entities: ['project'],
        filters: { status: 'active' },
        createdBy: 'user-1',
      });
    });
  });

  describe('getExport', () => {
    it('returns an export record by id', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'exp-1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        type: 'data_export',
        content: JSON.stringify({ format: 'json', entities: ['task'], status: 'completed', recordCount: 5, sizeBytes: 100 }),
        tags: '[]',
        sourceId: null,
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      const result = await DataExportService.getExport('exp-1');
      assert.ok(result);
      assert.equal(result.id, 'exp-1');
      assert.equal(result.status, 'completed');
    });

    it('returns null when export not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await DataExportService.getExport('nope');
      assert.equal(result, null);
    });

    it('returns null when record is not a data_export type', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'mem-1',
        type: 'fact',
        content: '{}',
        tags: '[]',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        sourceId: null,
        createdBy: 'user-1',
        createdAt: new Date(),
      });
      const result = await DataExportService.getExport('mem-1');
      assert.equal(result, null);
    });
  });

  describe('listExports', () => {
    it('lists exports for a workspace', async () => {
      memoryFindManyImpl = async () => ([
        { id: 'exp-1', type: 'data_export', content: JSON.stringify({ format: 'json', entities: ['task'], status: 'completed' }), tags: '[]', workspaceId: 'ws-1', organizationId: 'org-1', sourceId: null, createdBy: 'u1', createdAt: new Date() },
        { id: 'exp-2', type: 'data_export', content: JSON.stringify({ format: 'csv', entities: ['goal'], status: 'pending' }), tags: '[]', workspaceId: 'ws-1', organizationId: 'org-1', sourceId: null, createdBy: 'u1', createdAt: new Date() },
      ]);

      const result = await DataExportService.listExports('ws-1');
      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'exp-1');
      assert.equal(result[1].format, 'csv');
    });

    it('returns empty array on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await DataExportService.listExports('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('runExport', () => {
    it('queries entities and formats as JSON', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'exp-1',
        type: 'data_export',
        content: JSON.stringify({ format: 'json', entities: ['task'], status: 'pending', filters: {} }),
        tags: '[]',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        sourceId: null,
        createdBy: 'u1',
        createdAt: new Date(),
      });
      taskFindManyImpl = async () => ([{ id: 't1', title: 'Task 1' }]);

      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const config = JSON.parse(args.data.content as string);
        assert.equal(config.status, 'completed');
        assert.equal(config.recordCount, 1);
        return {
          id: 'exp-1',
          type: 'data_export',
          content: args.data.content,
          tags: args.data.tags,
          workspaceId: 'ws-1',
          organizationId: 'org-1',
          sourceId: null,
          createdBy: 'u1',
          createdAt: new Date(),
        };
      };

      const result = await DataExportService.runExport('exp-1');
      assert.ok(result);
      assert.equal(result.status, 'completed');
      assert.equal(result.recordCount, 1);
    });

    it('formats as CSV', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'exp-2',
        type: 'data_export',
        content: JSON.stringify({ format: 'csv', entities: ['task'], status: 'pending', filters: {} }),
        tags: '[]',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        sourceId: null,
        createdBy: 'u1',
        createdAt: new Date(),
      });
      taskFindManyImpl = async () => ([{ id: 't1', title: 'Task 1', status: 'todo' }]);

      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const data = args.data.tags as string;
        assert.ok(data.includes('# task'));
        assert.ok(data.includes('id,title,status'));
        return {
          id: 'exp-2', type: 'data_export', content: args.data.content, tags: data,
          workspaceId: 'ws-1', organizationId: 'org-1', sourceId: null, createdBy: 'u1', createdAt: new Date(),
        };
      };

      const result = await DataExportService.runExport('exp-2');
      assert.ok(result);
      assert.equal(result.status, 'completed');
    });

    it('formats as SQL', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'exp-3',
        type: 'data_export',
        content: JSON.stringify({ format: 'sql', entities: ['task'], status: 'pending', filters: {} }),
        tags: '[]',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        sourceId: null,
        createdBy: 'u1',
        createdAt: new Date(),
      });
      taskFindManyImpl = async () => ([{ id: 't1', title: 'Task 1' }]);

      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const data = args.data.tags as string;
        assert.ok(data.includes('INSERT INTO task'));
        return {
          id: 'exp-3', type: 'data_export', content: args.data.content, tags: data,
          workspaceId: 'ws-1', organizationId: 'org-1', sourceId: null, createdBy: 'u1', createdAt: new Date(),
        };
      };

      const result = await DataExportService.runExport('exp-3');
      assert.ok(result);
      assert.equal(result.status, 'completed');
    });

    it('returns null when export not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await DataExportService.runExport('nope');
      assert.equal(result, null);
    });
  });

  describe('deleteExport', () => {
    it('deletes an export record', async () => {
      memoryDeleteImpl = async (args: FindUniqueArgs) => {
        assert.equal(args.where.id, 'exp-1');
        return { id: 'exp-1' };
      };

      await DataExportService.deleteExport('exp-1');
      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('getExportableEntities', () => {
    it('returns all entities with counts', async () => {
      taskCountImpl = async () => 10;
      goalCountImpl = async () => 5;
      projectCountImpl = async () => 3;

      const result = await DataExportService.getExportableEntities('ws-1');
      assert.ok(result.length >= 3);
      const taskEntity = result.find((e) => e.name === 'task');
      assert.ok(taskEntity);
      assert.equal(taskEntity.count, 10);
    });
  });

  describe('getEntityCount', () => {
    it('returns count for tasks', async () => {
      taskCountImpl = async () => 42;
      const count = await DataExportService.getEntityCount('task', 'ws-1');
      assert.equal(count, 42);
    });

    it('returns 0 on error', async () => {
      taskCountImpl = async () => { throw new Error('fail'); };
      const count = await DataExportService.getEntityCount('task', 'ws-1');
      assert.equal(count, 0);
    });
  });

  describe('getExportStats', () => {
    it('aggregates export stats', async () => {
      memoryFindManyImpl = async () => ([
        { id: 'e1', type: 'data_export', content: JSON.stringify({ format: 'json', entities: [], status: 'completed', sizeBytes: 100 }), tags: '[]', workspaceId: 'ws-1', organizationId: 'org-1', sourceId: null, createdBy: 'u1', createdAt: new Date() },
        { id: 'e2', type: 'data_export', content: JSON.stringify({ format: 'csv', entities: [], status: 'pending', sizeBytes: 200 }), tags: '[]', workspaceId: 'ws-1', organizationId: 'org-1', sourceId: null, createdBy: 'u1', createdAt: new Date() },
      ]);

      const stats = await DataExportService.getExportStats('ws-1');
      assert.equal(stats.total, 2);
      assert.equal(stats.completed, 1);
      assert.equal(stats.pending, 1);
      assert.equal(stats.totalSizeBytes, 300);
      assert.equal(stats.byFormat.json, 1);
      assert.equal(stats.byFormat.csv, 1);
    });
  });
});
