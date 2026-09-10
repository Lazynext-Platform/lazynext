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
let memoryFindFirstImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryDeleteImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;

// Entity mocks for snapshotEntities
let taskFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let goalFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let projectFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let eventFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let documentFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];

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
    findFirst: (args: unknown): Promise<MemoryRow | null> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  task: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
  },
  goal: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'goal.findMany', args });
      return goalFindManyImpl(args);
    },
  },
  project: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
    },
  },
  event: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
    },
  },
  document: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'document.findMany', args });
      return documentFindManyImpl(args);
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

function makeBackupMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'bk-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'backup_record',
    content: JSON.stringify({
      type: 'full',
      entities: ['task', 'goal'],
      status: 'completed',
      sizeBytes: 500,
      recordCount: 10,
      baseBackupId: null,
      snapshot: '',
    }),
    source: 'system',
    sourceId: null,
    confidence: 0.5,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '[]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeScheduleMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'sched-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'backup_schedule',
    content: JSON.stringify({
      frequency: 'daily',
      type: 'full',
      entities: ['task'],
      enabled: true,
      lastRunAt: null,
      nextRunAt: '2024-01-02T02:00:00.000Z',
      retentionDays: 30,
    }),
    source: 'system',
    sourceId: null,
    confidence: 0.5,
    owner: 'user-1',
    lifecycle: 'permanent',
    tags: '[]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRetentionMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'ret-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'backup_retention',
    content: JSON.stringify({ maxBackups: 50, retentionDays: 30, minKeep: 3 }),
    source: 'system',
    sourceId: null,
    confidence: 0.5,
    owner: 'user-1',
    lifecycle: 'permanent',
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
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRow;
  memoryUpdateImpl = async () => ({}) as MemoryRow;
  memoryDeleteImpl = async () => ({}) as MemoryRow;
  taskFindManyImpl = async () => [];
  goalFindManyImpl = async () => [];
  projectFindManyImpl = async () => [];
  eventFindManyImpl = async () => [];
  documentFindManyImpl = async () => [];
}

const { BackupService } = await import('@/lib/services/backup-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BackupService', () => {
  beforeEach(() => { resetMock(); });

  describe('createBackup', () => {
    it('creates a full backup with snapshot', async () => {
      taskFindManyImpl = async () => [{ id: 't1' }, { id: 't2' }];
      goalFindManyImpl = async () => [{ id: 'g1' }];
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'backup_record');
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'completed');
        assert.equal(content.recordCount, 3);
        return makeBackupMemory({ content: a.data.content });
      };

      const result = await BackupService.createBackup({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        type: 'full',
        entities: ['task', 'goal'],
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.recordCount, 3);
      assert.equal(result.status, 'completed');
    });

    it('creates an incremental backup without snapshotting', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.type, 'incremental');
        return makeBackupMemory({ content: a.data.content });
      };

      const result = await BackupService.createBackup({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        type: 'incremental',
        entities: [],
        createdBy: 'user-1',
      });

      assert.ok(result);
    });
  });

  describe('getBackup', () => {
    it('returns a backup by id', async () => {
      memoryFindUniqueImpl = async () => makeBackupMemory();

      const result = await BackupService.getBackup('bk-1');

      assert.ok(result);
      assert.equal(result!.id, 'bk-1');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await BackupService.getBackup('nonexistent');

      assert.equal(result, null);
    });

    it('returns null when type is not backup_record', async () => {
      memoryFindUniqueImpl = async () => makeBackupMemory({ type: 'email_list' });

      const result = await BackupService.getBackup('bk-1');

      assert.equal(result, null);
    });
  });

  describe('listBackups', () => {
    it('returns backups for a workspace', async () => {
      memoryFindManyImpl = async () => [makeBackupMemory(), makeBackupMemory({ id: 'bk-2' })];

      const result = await BackupService.listBackups('ws-1');

      assert.equal(result.length, 2);
    });
  });

  describe('deleteBackup', () => {
    it('deletes the backup memory record', async () => {
      memoryDeleteImpl = async () => makeBackupMemory();

      await BackupService.deleteBackup('bk-1');

      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('restore', () => {
    it('returns a dry-run restore plan', async () => {
      memoryFindUniqueImpl = async () => makeBackupMemory();

      const result = await BackupService.restore('bk-1');

      assert.ok(result);
      assert.equal(result!.dryRun, true);
      assert.equal(result!.backupId, 'bk-1');
      assert.equal(result!.steps.length, 2);
    });

    it('returns null when backup not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await BackupService.restore('nonexistent');

      assert.equal(result, null);
    });
  });

  describe('scheduleBackup', () => {
    it('creates a new backup schedule', async () => {
      memoryFindFirstImpl = async () => null;
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'backup_schedule');
        return makeScheduleMemory({ content: a.data.content });
      };

      const result = await BackupService.scheduleBackup({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        frequency: 'daily',
        type: 'full',
        entities: ['task'],
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.frequency, 'daily');
      assert.equal(result.enabled, true);
    });

    it('updates an existing schedule', async () => {
      memoryFindFirstImpl = async () => makeScheduleMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.frequency, 'weekly');
        return makeScheduleMemory({ content: a.data.content });
      };

      const result = await BackupService.scheduleBackup({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        frequency: 'weekly',
        type: 'full',
        entities: ['task'],
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.frequency, 'weekly');
    });
  });

  describe('getSchedule', () => {
    it('returns the backup schedule for a workspace', async () => {
      memoryFindFirstImpl = async () => makeScheduleMemory();

      const result = await BackupService.getSchedule('ws-1');

      assert.ok(result);
      assert.equal(result!.frequency, 'daily');
    });

    it('returns null when no schedule exists', async () => {
      memoryFindFirstImpl = async () => null;

      const result = await BackupService.getSchedule('ws-1');

      assert.equal(result, null);
    });
  });

  describe('updateSchedule', () => {
    it('updates an existing schedule', async () => {
      memoryFindFirstImpl = async () => makeScheduleMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.enabled, false);
        return makeScheduleMemory({ content: a.data.content });
      };

      const result = await BackupService.updateSchedule('ws-1', { enabled: false });

      assert.ok(result);
      assert.equal(result!.enabled, false);
    });

    it('returns null when no schedule exists', async () => {
      memoryFindFirstImpl = async () => null;

      const result = await BackupService.updateSchedule('ws-1', { enabled: false });

      assert.equal(result, null);
    });
  });

  describe('cancelSchedule', () => {
    it('deletes the schedule when it exists', async () => {
      memoryFindFirstImpl = async () => makeScheduleMemory();
      memoryDeleteImpl = async () => makeScheduleMemory();

      await BackupService.cancelSchedule('ws-1');

      assert.equal(calls.some((c) => c.method === 'memory.delete'), true);
    });

    it('does nothing when no schedule exists', async () => {
      memoryFindFirstImpl = async () => null;

      await BackupService.cancelSchedule('ws-1');

      assert.equal(calls.some((c) => c.method === 'memory.delete'), false);
    });
  });

  describe('getRetentionPolicy', () => {
    it('returns the retention policy when it exists', async () => {
      memoryFindFirstImpl = async () => makeRetentionMemory();

      const result = await BackupService.getRetentionPolicy('ws-1');

      assert.equal(result.maxBackups, 50);
      assert.equal(result.retentionDays, 30);
      assert.equal(result.minKeep, 3);
    });

    it('returns defaults when no policy exists', async () => {
      memoryFindFirstImpl = async () => null;

      const result = await BackupService.getRetentionPolicy('ws-1');

      assert.equal(result.maxBackups, 50);
      assert.equal(result.minKeep, 3);
    });
  });

  describe('setRetentionPolicy', () => {
    it('creates a new retention policy', async () => {
      memoryFindFirstImpl = async () => null;
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'backup_retention');
        return makeRetentionMemory({ content: a.data.content });
      };

      const result = await BackupService.setRetentionPolicy('ws-1', 'org-1', { maxBackups: 100 }, 'user-1');

      assert.equal(result.maxBackups, 100);
    });

    it('updates an existing retention policy', async () => {
      memoryFindFirstImpl = async () => makeRetentionMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.retentionDays, 60);
        return makeRetentionMemory({ content: a.data.content });
      };

      const result = await BackupService.setRetentionPolicy('ws-1', 'org-1', { retentionDays: 60 }, 'user-1');

      assert.equal(result.retentionDays, 60);
    });
  });

  describe('cleanupOldBackups', () => {
    it('deletes old backups beyond retention', async () => {
      memoryFindFirstImpl = async () => makeRetentionMemory({ content: JSON.stringify({ maxBackups: 50, retentionDays: 0, minKeep: 0 }) });
      const oldDate = new Date(Date.now() - 99999999999);
      memoryFindManyImpl = async () => [
        makeBackupMemory({ id: 'bk-old', createdAt: oldDate }),
        makeBackupMemory({ id: 'bk-new', createdAt: new Date() }),
      ];
      memoryDeleteImpl = async () => makeBackupMemory();

      const result = await BackupService.cleanupOldBackups('ws-1');

      assert.ok(result.deleted >= 1);
    });
  });

  describe('getBackupStats', () => {
    it('returns aggregate backup stats', async () => {
      memoryFindManyImpl = async () => [makeBackupMemory()];
      memoryFindFirstImpl = async () => makeScheduleMemory();

      const result = await BackupService.getBackupStats('ws-1');

      assert.equal(result.total, 1);
      assert.equal(result.completed, 1);
      assert.equal(result.scheduled, true);
    });
  });
});
