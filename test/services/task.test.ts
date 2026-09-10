import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock types ──
type TaskFindManyArgs = { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number };
type TaskFindUniqueArgs = { where: { id: string }; include?: Record<string, unknown> };
type TaskCreateArgs = { data: Record<string, unknown> };
type TaskUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type TaskDependencyFindManyArgs = { where: Record<string, unknown>; include?: Record<string, unknown>; select?: Record<string, unknown> };
type TaskDependencyCreateArgs = { data: Record<string, unknown> };
type TaskDependencyDeleteManyArgs = { where: Record<string, unknown> };
type TimeEntryCreateArgs = { data: Record<string, unknown> };
type TimeEntryFindUniqueArgs = { where: { id: string } };
type TimeEntryFindManyArgs = { where: Record<string, unknown>; orderBy?: Record<string, unknown>; select?: Record<string, unknown> };
type TimeEntryUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type ProjectFindManyArgs = { where: Record<string, unknown>; select: Record<string, unknown> };

let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> = async () => [];
let taskFindUniqueImpl: (args: TaskFindUniqueArgs) => Promise<unknown> = async () => null;
let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> = async () => ({ id: 'task-1' });
let taskUpdateImpl: (args: TaskUpdateArgs) => Promise<unknown> = async () => ({});
let taskDepFindManyImpl: (args: TaskDependencyFindManyArgs) => Promise<unknown[]> = async () => [];
let taskDepCreateImpl: (args: TaskDependencyCreateArgs) => Promise<unknown> = async () => ({ id: 'dep-1' });
let taskDepDeleteManyImpl: (args: TaskDependencyDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });
let timeEntryCreateImpl: (args: TimeEntryCreateArgs) => Promise<unknown> = async () => ({ id: 'te-1' });
let timeEntryFindUniqueImpl: (args: TimeEntryFindUniqueArgs) => Promise<unknown> = async () => null;
let timeEntryFindManyImpl: (args: TimeEntryFindManyArgs) => Promise<unknown[]> = async () => [];
let timeEntryUpdateImpl: (args: TimeEntryUpdateArgs) => Promise<unknown> = async () => ({});
let projectFindManyImpl: (args: ProjectFindManyArgs) => Promise<unknown[]> = async () => [{ id: 'proj-1' }];

const calls: { method: string; args?: unknown }[] = [];

const prismaMock = {
  task: {
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
    findUnique: (args: TaskFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'task.findUnique', args });
      return taskFindUniqueImpl(args);
    },
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
    update: (args: TaskUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'task.update', args });
      return taskUpdateImpl(args);
    },
  },
  taskDependency: {
    findMany: (args: TaskDependencyFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'taskDependency.findMany', args });
      return taskDepFindManyImpl(args);
    },
    create: (args: TaskDependencyCreateArgs): Promise<unknown> => {
      calls.push({ method: 'taskDependency.create', args });
      return taskDepCreateImpl(args);
    },
    deleteMany: (args: TaskDependencyDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'taskDependency.deleteMany', args });
      return taskDepDeleteManyImpl(args);
    },
  },
  timeEntry: {
    create: (args: TimeEntryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'timeEntry.create', args });
      return timeEntryCreateImpl(args);
    },
    findUnique: (args: TimeEntryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'timeEntry.findUnique', args });
      return timeEntryFindUniqueImpl(args);
    },
    findMany: (args: TimeEntryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'timeEntry.findMany', args });
      return timeEntryFindManyImpl(args);
    },
    update: (args: TimeEntryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'timeEntry.update', args });
      return timeEntryUpdateImpl(args);
    },
  },
  project: {
    findMany: (args: ProjectFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
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

const { TaskService } = await import('@/lib/services/task');

function resetMock(): void {
  calls.length = 0;
  taskFindManyImpl = async () => [];
  taskFindUniqueImpl = async () => null;
  taskCreateImpl = async () => ({ id: 'task-1' });
  taskUpdateImpl = async () => ({});
  taskDepFindManyImpl = async () => [];
  taskDepCreateImpl = async () => ({ id: 'dep-1' });
  taskDepDeleteManyImpl = async () => ({ count: 0 });
  timeEntryCreateImpl = async () => ({ id: 'te-1' });
  timeEntryFindUniqueImpl = async () => null;
  timeEntryFindManyImpl = async () => [];
  timeEntryUpdateImpl = async () => ({});
  projectFindManyImpl = async () => [{ id: 'proj-1' }];
}

describe('TaskService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns empty array when no projects exist', async () => {
      projectFindManyImpl = async () => [];
      const tasks = await TaskService.list('ws-1');
      assert.equal(tasks.length, 0);
    });

    it('returns tasks for workspace projects', async () => {
      taskFindManyImpl = async () => [
        { id: 'task-1', title: 'Task 1', status: 'todo' },
        { id: 'task-2', title: 'Task 2', status: 'in_progress' },
      ];
      const tasks = await TaskService.list('ws-1');
      assert.equal(tasks.length, 2);
    });

    it('passes filters to findMany', async () => {
      taskFindManyImpl = async () => [{ id: 'task-1', status: 'blocked' }];
      const tasks = await TaskService.list('ws-1', { status: 'blocked' });
      assert.equal(tasks.length, 1);
    });
  });

  describe('get', () => {
    it('returns task with dependencies and time entries', async () => {
      taskFindUniqueImpl = async () => ({
        id: 'task-1',
        title: 'Test Task',
        dependencies: [],
        dependents: [],
        timeEntries: [],
      });
      const task = await TaskService.get('task-1');
      assert.ok(task);
    });

    it('returns null when task not found', async () => {
      taskFindUniqueImpl = async () => null;
      const task = await TaskService.get('nonexistent');
      assert.equal(task, null);
    });
  });

  describe('create', () => {
    it('creates a task with required fields', async () => {
      const task = await TaskService.create({
        projectId: 'proj-1',
        title: 'New Task',
      });
      assert.ok(task.id);
    });
  });

  describe('updateStatus', () => {
    it('allows starting when no dependencies', async () => {
      taskDepFindManyImpl = async () => [];
      const result = await TaskService.updateStatus('task-1', 'in_progress');
      assert.equal(result.ok, true);
    });

    it('blocks starting when dependencies are uncompleted', async () => {
      taskDepFindManyImpl = async () => [
        { dependsOn: { id: 'dep-1', status: 'todo' } },
      ];
      const result = await TaskService.updateStatus('task-1', 'in_progress');
      assert.equal(result.ok, false);
      assert.ok(result.error);
    });

    it('allows starting when all dependencies are done', async () => {
      taskDepFindManyImpl = async () => [
        { dependsOn: { id: 'dep-1', status: 'done' } },
      ];
      const result = await TaskService.updateStatus('task-1', 'in_progress');
      assert.equal(result.ok, true);
    });

    it('allows status changes without dependency check for non-in_progress', async () => {
      const result = await TaskService.updateStatus('task-1', 'done');
      assert.equal(result.ok, true);
    });
  });

  describe('addDependency', () => {
    it('rejects self-dependency', async () => {
      const result = await TaskService.addDependency('task-1', 'task-1');
      assert.equal(result.ok, false);
      assert.ok(result.error?.includes('itself'));
    });

    it('rejects circular dependency', async () => {
      // Simulate: task-2 depends on task-1, so task-1 can't depend on task-2
      taskDepFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.taskId === 'task-2') {
          return [{ dependsOnId: 'task-1' }];
        }
        return [];
      };
      const result = await TaskService.addDependency('task-1', 'task-2');
      assert.equal(result.ok, false);
      assert.ok(result.error?.includes('Circular'));
    });

    it('adds valid dependency', async () => {
      taskDepFindManyImpl = async () => [];
      const result = await TaskService.addDependency('task-1', 'task-2');
      assert.equal(result.ok, true);
    });
  });

  describe('removeDependency', () => {
    it('removes a dependency', async () => {
      await TaskService.removeDependency('task-1', 'task-2');
      const deleteCalls = calls.filter((c) => c.method === 'taskDependency.deleteMany');
      assert.equal(deleteCalls.length, 1);
    });
  });

  describe('startTimeEntry', () => {
    it('creates a time entry', async () => {
      const entry = await TaskService.startTimeEntry('task-1', 'user-1');
      assert.ok(entry.id);
    });
  });

  describe('stopTimeEntry', () => {
    it('stops an active time entry', async () => {
      timeEntryFindUniqueImpl = async () => ({
        id: 'te-1',
        startedAt: new Date(Date.now() - 3600 * 1000),
        endedAt: null,
      });
      await TaskService.stopTimeEntry('te-1');
      const updateCalls = calls.filter((c) => c.method === 'timeEntry.update');
      assert.equal(updateCalls.length, 1);
    });

    it('does nothing for already stopped entry', async () => {
      timeEntryFindUniqueImpl = async () => ({
        id: 'te-1',
        startedAt: new Date(),
        endedAt: new Date(),
      });
      await TaskService.stopTimeEntry('te-1');
      const updateCalls = calls.filter((c) => c.method === 'timeEntry.update');
      assert.equal(updateCalls.length, 0);
    });
  });

  describe('getTotalTime', () => {
    it('sums duration of completed entries', async () => {
      timeEntryFindManyImpl = async () => [
        { durationSec: 3600 },
        { durationSec: 1800 },
      ];
      const total = await TaskService.getTotalTime('task-1');
      assert.equal(total, 5400);
    });

    it('returns 0 when no entries', async () => {
      timeEntryFindManyImpl = async () => [];
      const total = await TaskService.getTotalTime('task-1');
      assert.equal(total, 0);
    });
  });

  describe('delete', () => {
    it('soft deletes a task', async () => {
      await TaskService.delete('task-1');
      const updateCalls = calls.filter((c) => c.method === 'task.update');
      assert.equal(updateCalls.length, 1);
      const data = (updateCalls[0].args as TaskUpdateArgs).data as Record<string, unknown>;
      assert.ok(data.deletedAt);
      assert.equal(data.status, 'cancelled');
    });
  });
});
