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

let taskFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let taskFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let taskCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let taskUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let taskDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let taskCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let taskGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

let memoryFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  onboardingTask: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'onboardingTask.findMany', args }); return taskFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'onboardingTask.findUnique', args }); return taskFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'onboardingTask.create', args }); return taskCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'onboardingTask.update', args }); return taskUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'onboardingTask.delete', args }); return taskDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'onboardingTask.count', args }); return taskCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'onboardingTask.groupBy', args }); return taskGroupByImpl(args); },
  },
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memoryFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memoryFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memoryCreateImpl(args); },
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
  taskFindManyImpl = async () => [];
  taskFindUniqueImpl = async () => null;
  taskCreateImpl = async () => ({});
  taskUpdateImpl = async () => ({});
  taskDeleteImpl = async () => ({});
  taskCountImpl = async () => 0;
  taskGroupByImpl = async () => [];
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
}

const { OnboardingService } = await import('@/lib/services/onboarding-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('OnboardingService', () => {
  beforeEach(() => { resetMock(); });

  describe('createTask', () => {
    it('creates a task with defaults', async () => {
      taskCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.category, 'general');
        assert.equal(args.data.status, 'pending');
        assert.equal(args.data.order, 0);
        return { id: 't1', ...args.data };
      };
      const result = await OnboardingService.createTask('org-1', { employeeId: 'e1', title: 'Sign paperwork' });
      assert.ok(result);
    });

    it('truncates long titles', async () => {
      taskCreateImpl = async (args: CreateArgs) => {
        assert.ok((args.data.title as string).length <= 300);
        return { id: 't1', ...args.data };
      };
      await OnboardingService.createTask('org-1', { employeeId: 'e1', title: 'x'.repeat(400) });
    });
  });

  describe('getTask', () => {
    it('returns a task by id', async () => {
      taskFindUniqueImpl = async () => ({ id: 't1', title: 'Test' });
      const result = await OnboardingService.getTask('t1');
      assert.ok(result);
    });

    it('returns null when not found', async () => {
      taskFindUniqueImpl = async () => null;
      const result = await OnboardingService.getTask('nope');
      assert.equal(result, null);
    });
  });

  describe('listTasks', () => {
    it('lists tasks for an organization', async () => {
      taskFindManyImpl = async () => [{ id: 't1' }];
      const result = await OnboardingService.listTasks('org-1');
      assert.equal(result.length, 1);
    });

    it('applies employeeId, category, and status filters', async () => {
      taskFindManyImpl = async () => [];
      await OnboardingService.listTasks('org-1', { employeeId: 'e1', category: 'it_setup', status: 'completed' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.employeeId, 'e1');
      assert.equal(args.where.category, 'it_setup');
      assert.equal(args.where.status, 'completed');
    });
  });

  describe('updateTask', () => {
    it('updates only provided fields', async () => {
      taskUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'in_progress');
        assert.equal(args.data.title, undefined);
        return { id: 't1', ...args.data };
      };
      const result = await OnboardingService.updateTask('t1', { status: 'in_progress' });
      assert.ok(result);
    });
  });

  describe('deleteTask', () => {
    it('deletes a task', async () => {
      taskDeleteImpl = async () => ({ id: 't1' });
      const result = await OnboardingService.deleteTask('t1');
      assert.ok(result);
    });
  });

  describe('completeTask', () => {
    it('marks a task as completed with completedAt', async () => {
      taskUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'completed');
        assert.ok(args.data.completedAt);
        return { id: 't1', ...args.data };
      };
      const result = await OnboardingService.completeTask('t1');
      assert.ok(result);
    });
  });

  describe('skipTask', () => {
    it('marks a task as skipped', async () => {
      taskUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'skipped');
        return { id: 't1', ...args.data };
      };
      const result = await OnboardingService.skipTask('t1');
      assert.ok(result);
    });

    it('appends skip reason to description when provided', async () => {
      taskFindUniqueImpl = async () => ({ id: 't1', description: 'Original' });
      taskUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'skipped');
        assert.ok((args.data.description as string).includes('Skipped: N/A'));
        return { id: 't1', ...args.data };
      };
      const result = await OnboardingService.skipTask('t1', 'N/A');
      assert.ok(result);
    });
  });

  describe('getByEmployee', () => {
    it('returns all tasks for an employee', async () => {
      taskFindManyImpl = async () => [{ id: 't1' }, { id: 't2' }];
      const result = await OnboardingService.getByEmployee('e1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.employeeId, 'e1');
    });
  });

  describe('getProgress', () => {
    it('returns completion percentage', async () => {
      taskFindManyImpl = async () => [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'in_progress' },
      ];
      const result = await OnboardingService.getProgress('e1');
      assert.equal(result.total, 4);
      assert.equal(result.completed, 2);
      assert.equal(result.percentage, 50);
    });

    it('returns 0% when no tasks exist', async () => {
      taskFindManyImpl = async () => [];
      const result = await OnboardingService.getProgress('e1');
      assert.equal(result.total, 0);
      assert.equal(result.percentage, 0);
    });
  });

  describe('createTemplate', () => {
    it('creates a template stored in memory', async () => {
      memoryCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'onboarding_template');
        assert.equal(args.data.organizationId, 'org-1');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'Standard Onboarding');
        assert.equal(content.tasks.length, 2);
        return { id: 'mem1', ...args.data };
      };
      const result = await OnboardingService.createTemplate('org-1', 'ws-1', {
        name: 'Standard Onboarding',
        tasks: [
          { title: 'Sign paperwork', category: 'paperwork' },
          { title: 'Setup laptop', category: 'it_setup' },
        ],
      }, 'user1');
      assert.ok(result);
    });
  });

  describe('applyTemplate', () => {
    it('creates tasks from a template', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'mem1',
        content: JSON.stringify({
          name: 'Standard',
          tasks: [{ title: 'Task A', description: '', category: 'general', order: 0 }],
        }),
      });
      taskCreateImpl = async (args: CreateArgs) => ({ id: 't1', ...args.data });

      const result = await OnboardingService.applyTemplate('org-1', 'e1', 'mem1');
      assert.equal(result.length, 1);
    });

    it('throws when template not found', async () => {
      memoryFindUniqueImpl = async () => null;
      await assert.rejects(() => OnboardingService.applyTemplate('org-1', 'e1', 'nope'), /template_not_found/);
    });
  });

  describe('getTemplates', () => {
    it('returns templates from memory', async () => {
      memoryFindManyImpl = async () => [
        { id: 'mem1', content: JSON.stringify({ name: 'T1', description: 'D1', tasks: [] }) },
      ];
      const result = await OnboardingService.getTemplates('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'T1');
    });
  });

  describe('getStats', () => {
    it('returns total, byCategory, byStatus, and completionRate', async () => {
      taskCountImpl = async (args: CountArgs) => {
        const where = args.where as Record<string, unknown>;
        if (where && where.status === 'completed') return 7;
        return 10;
      };
      taskGroupByImpl = async (args: GroupByArgs) => {
        if (args.by[0] === 'category') return [{ category: 'it_setup', _count: 4 }, { category: 'paperwork', _count: 6 }];
        return [{ status: 'completed', _count: 7 }, { status: 'pending', _count: 3 }];
      };

      const result = await OnboardingService.getStats('org-1');
      assert.equal(result.total, 10);
      assert.equal(result.byCategory.it_setup, 4);
      assert.equal(result.byStatus.completed, 7);
      assert.equal(result.completionRate, 70);
    });
  });
});
