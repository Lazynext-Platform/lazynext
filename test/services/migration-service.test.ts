import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  tags: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<MemoryRow[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<MemoryRow[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<MemoryRow | null> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
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

function makeMigrationMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'mig-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'migration_plan',
    content: JSON.stringify({
      name: 'CSV to Tasks',
      sourceType: 'csv',
      targetType: 'task',
      mappings: [
        { sourceField: 'title', targetField: 'title', required: true },
        { sourceField: 'description', targetField: 'description' },
      ],
      status: 'draft',
      recordCount: 0,
      migratedCount: 0,
      errorCount: 0,
    }),
    source: 'system',
    sourceId: null,
    confidence: 0.5,
    owner: 'user-1',
    lifecycle: 'medium',
    tags: '[]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRow;
  memoryUpdateImpl = async () => ({}) as MemoryRow;
}

const { MigrationService } = await import('@/lib/services/migration-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MigrationService', () => {
  beforeEach(() => { resetMock(); });

  describe('createMigration', () => {
    it('creates a migration plan memory record with type migration_plan', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'migration_plan');
        const content = JSON.parse(a.data.content);
        assert.equal(content.name, 'CSV to Tasks');
        assert.equal(content.status, 'draft');
        return makeMigrationMemory({ content: a.data.content });
      };

      const result = await MigrationService.createMigration({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        name: 'CSV to Tasks',
        sourceType: 'csv',
        targetType: 'task',
        mappings: [{ sourceField: 'title', targetField: 'title', required: true }],
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.name, 'CSV to Tasks');
      assert.equal(result.status, 'draft');
      assert.equal(calls[0].method, 'memory.create');
    });
  });

  describe('getMigration', () => {
    it('returns a migration by id', async () => {
      memoryFindUniqueImpl = async () => makeMigrationMemory();

      const result = await MigrationService.getMigration('mig-1');

      assert.ok(result);
      assert.equal(result!.id, 'mig-1');
      assert.equal(result!.name, 'CSV to Tasks');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await MigrationService.getMigration('nonexistent');

      assert.equal(result, null);
    });

    it('returns null when type is not migration_plan', async () => {
      memoryFindUniqueImpl = async () => makeMigrationMemory({ type: 'backup_record' });

      const result = await MigrationService.getMigration('mig-1');

      assert.equal(result, null);
    });
  });

  describe('listMigrations', () => {
    it('returns migrations for a workspace', async () => {
      memoryFindManyImpl = async () => [
        makeMigrationMemory(),
        makeMigrationMemory({ id: 'mig-2' }),
      ];

      const result = await MigrationService.listMigrations('ws-1');

      assert.equal(result.length, 2);
    });
  });

  describe('executeMigration', () => {
    it('executes a valid migration and marks it completed', async () => {
      memoryFindUniqueImpl = async () => makeMigrationMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'completed');
        assert.ok(content.migratedCount > 0);
        return makeMigrationMemory({ content: a.data.content });
      };

      const result = await MigrationService.executeMigration('mig-1');

      assert.ok(result);
      assert.equal(result!.status, 'completed');
      assert.ok(result!.migratedCount > 0);
    });

    it('marks migration as failed when validation fails', async () => {
      memoryFindUniqueImpl = async () => makeMigrationMemory({
        content: JSON.stringify({
          name: 'Bad Migration',
          sourceType: 'csv',
          targetType: 'task',
          mappings: [],
          status: 'draft',
          recordCount: 0,
          migratedCount: 0,
          errorCount: 0,
        }),
      });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'failed');
        return makeMigrationMemory({ content: a.data.content });
      };

      const result = await MigrationService.executeMigration('mig-1');

      assert.ok(result);
      assert.equal(result!.status, 'failed');
    });

    it('returns null when migration not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await MigrationService.executeMigration('nonexistent');

      assert.equal(result, null);
    });
  });

  describe('getMappingTemplates', () => {
    it('returns built-in mapping templates', async () => {
      const result = await MigrationService.getMappingTemplates();

      assert.ok(result.length >= 3);
      assert.ok(result.some((t) => t.id === 'tpl-csv-to-tasks'));
      assert.ok(result.some((t) => t.id === 'tpl-contacts-to-customers'));
      assert.ok(result.some((t) => t.id === 'tpl-goals-to-kpis'));
    });
  });

  describe('validateMapping', () => {
    it('returns valid=true for proper mappings', () => {
      const result = MigrationService.validateMapping([
        { sourceField: 'title', targetField: 'title', required: true },
        { sourceField: 'desc', targetField: 'description' },
      ]);

      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
      assert.equal(result.mappedFields, 2);
    });

    it('returns errors for empty mappings', () => {
      const result = MigrationService.validateMapping([]);

      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it('warns about duplicate target fields', () => {
      const result = MigrationService.validateMapping([
        { sourceField: 'a', targetField: 'title' },
        { sourceField: 'b', targetField: 'title' },
      ]);

      assert.ok(result.warnings.length > 0);
      assert.ok(result.warnings[0].includes('Duplicate'));
    });
  });

  describe('getStats', () => {
    it('returns aggregate migration stats', async () => {
      memoryFindManyImpl = async () => [
        makeMigrationMemory({ content: JSON.stringify({ name: 'M1', sourceType: 'csv', targetType: 'task', mappings: [], status: 'draft', recordCount: 0, migratedCount: 0, errorCount: 0 }) }),
        makeMigrationMemory({ id: 'mig-2', content: JSON.stringify({ name: 'M2', sourceType: 'csv', targetType: 'task', mappings: [], status: 'completed', recordCount: 20, migratedCount: 20, errorCount: 0 }) }),
      ];

      const result = await MigrationService.getStats('ws-1');

      assert.equal(result.total, 2);
      assert.equal(result.draft, 1);
      assert.equal(result.completed, 1);
      assert.equal(result.totalMigrated, 20);
    });
  });
});
