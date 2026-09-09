import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock types ──
type ScheduledJobFindManyArgs = { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number };
type ScheduledJobUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type ScheduledJobUpdateManyArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type ScheduledJobCreateArgs = { data: Record<string, unknown> };
type ScheduledJobFindFirstArgs = { where: Record<string, unknown> };
type ScheduledJobCountArgs = { where: Record<string, unknown> };
type WorkspaceFindUniqueArgs = { where: { id: string }; select: Record<string, unknown> };
type TaskFindUniqueArgs = { where: { id: string } };
type TaskUpdateArgs = { where: { id: string }; data: Record<string, unknown> };

let scheduledJobFindManyImpl: (args: ScheduledJobFindManyArgs) => Promise<unknown[]> = async () => [];
let scheduledJobUpdateImpl: (args: ScheduledJobUpdateArgs) => Promise<unknown> = async () => ({});
let scheduledJobUpdateManyImpl: (args: ScheduledJobUpdateManyArgs) => Promise<{ count: number }> = async () => ({ count: 0 });
let scheduledJobCreateImpl: (args: ScheduledJobCreateArgs) => Promise<{ id: string }> = async () => ({ id: 'job-1' });
let scheduledJobFindFirstImpl: (args: ScheduledJobFindFirstArgs) => Promise<unknown> = async () => null;
let scheduledJobCountImpl: (args: ScheduledJobCountArgs) => Promise<number> = async () => 0;
let workspaceFindUniqueImpl: (args: WorkspaceFindUniqueArgs) => Promise<unknown> = async () => ({ organizationId: 'org-1' });
let taskFindUniqueImpl: (args: TaskFindUniqueArgs) => Promise<unknown> = async () => null;
let taskUpdateImpl: (args: TaskUpdateArgs) => Promise<unknown> = async () => ({});

const calls: { method: string; args?: unknown }[] = [];

const prismaMock = {
  scheduledJob: {
    findMany: (args: ScheduledJobFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'scheduledJob.findMany', args });
      return scheduledJobFindManyImpl(args);
    },
    update: (args: ScheduledJobUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'scheduledJob.update', args });
      return scheduledJobUpdateImpl(args);
    },
    updateMany: (args: ScheduledJobUpdateManyArgs): Promise<{ count: number }> => {
      calls.push({ method: 'scheduledJob.updateMany', args });
      return scheduledJobUpdateManyImpl(args);
    },
    create: (args: ScheduledJobCreateArgs): Promise<{ id: string }> => {
      calls.push({ method: 'scheduledJob.create', args });
      return scheduledJobCreateImpl(args);
    },
    findFirst: (args: ScheduledJobFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'scheduledJob.findFirst', args });
      return scheduledJobFindFirstImpl(args);
    },
    count: (args: ScheduledJobCountArgs): Promise<number> => {
      calls.push({ method: 'scheduledJob.count', args });
      return scheduledJobCountImpl(args);
    },
  },
  workspace: {
    findUnique: (args: WorkspaceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
    },
  },
  task: {
    findUnique: (args: TaskFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'task.findUnique', args });
      return taskFindUniqueImpl(args);
    },
    update: (args: TaskUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'task.update', args });
      return taskUpdateImpl(args);
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

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: async () => ({ id: 'evt-1' }),
    },
  },
});

mock.module('@/lib/services/budget', {
  namedExports: {
    BudgetService: {
      check: async () => ({ allowed: true, remainingCredits: Infinity, remainingUsd: Infinity }),
      refreshStatus: async () => ({ id: 'b-1', status: 'active' }),
    },
  },
});

mock.module('@/lib/services/approval', {
  namedExports: {
    ApprovalService: {
      request: async () => ({ id: 'apr-1', status: 'pending' }),
      expireStale: async () => 0,
    },
  },
});

mock.module('@/lib/services/agent-runtime', {
  namedExports: {
    AgentRuntime: {
      run: async () => ({ id: 'run-1', status: 'completed', output: {}, toolCalls: [], tokensUsed: 100, costCredits: 5 }),
    },
  },
});

const { DurableExecutionEngine } = await import('@/lib/services/durable-execution');

function resetMock(): void {
  calls.length = 0;
  scheduledJobFindManyImpl = async () => [];
  scheduledJobUpdateImpl = async () => ({});
  scheduledJobUpdateManyImpl = async () => ({ count: 0 });
  scheduledJobCreateImpl = async () => ({ id: 'job-1' });
  scheduledJobFindFirstImpl = async () => null;
  scheduledJobCountImpl = async () => 0;
  workspaceFindUniqueImpl = async () => ({ organizationId: 'org-1' });
  taskFindUniqueImpl = async () => null;
  taskUpdateImpl = async () => ({});
}

describe('DurableExecutionEngine', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('processPendingJobs', () => {
    it('returns zero stats when no pending jobs', async () => {
      const result = await DurableExecutionEngine.processPendingJobs();
      assert.equal(result.processed, 0);
      assert.equal(result.completed, 0);
      assert.equal(result.failed, 0);
    });

    it('processes completed jobs', async () => {
      scheduledJobFindManyImpl = async () => [
        { id: 'job-1', workspaceId: 'ws-1', type: 'approval.expire_stale', payload: '{}', retryCount: 0, maxRetries: 3, backoffMs: 1000, idempotencyKey: null },
      ];

      const result = await DurableExecutionEngine.processPendingJobs();
      assert.equal(result.processed, 1);
      assert.equal(result.completed, 1);
      assert.equal(result.failed, 0);
    });

    it('retries failed jobs with exponential backoff', async () => {
      scheduledJobFindManyImpl = async () => [
        { id: 'job-1', workspaceId: 'ws-1', type: 'unknown_type', payload: '{}', retryCount: 0, maxRetries: 3, backoffMs: 1000, idempotencyKey: null },
      ];

      const result = await DurableExecutionEngine.processPendingJobs();
      assert.equal(result.processed, 1);
      assert.equal(result.failed, 1);
      assert.equal(result.retried, 1);
      assert.equal(result.deadLettered, 0);
    });

    it('moves jobs to dead-letter after max retries', async () => {
      scheduledJobFindManyImpl = async () => [
        { id: 'job-1', workspaceId: 'ws-1', type: 'unknown_type', payload: '{}', retryCount: 2, maxRetries: 3, backoffMs: 1000, idempotencyKey: null },
      ];

      const result = await DurableExecutionEngine.processPendingJobs();
      assert.equal(result.processed, 1);
      assert.equal(result.failed, 1);
      assert.equal(result.deadLettered, 1);
      assert.equal(result.retried, 0);
    });

    it('skips idempotent jobs that already completed', async () => {
      scheduledJobFindManyImpl = async () => [
        { id: 'job-1', workspaceId: 'ws-1', type: 'test', payload: '{}', retryCount: 0, maxRetries: 3, backoffMs: 1000, idempotencyKey: 'key-123' },
      ];
      scheduledJobFindFirstImpl = async () => ({ id: 'job-0', status: 'completed' });

      const result = await DurableExecutionEngine.processPendingJobs();
      assert.equal(result.processed, 1);
      assert.equal(result.completed, 1);
    });
  });

  describe('scheduleJob', () => {
    it('creates a scheduled job', async () => {
      const id = await DurableExecutionEngine.scheduleJob({
        workspaceId: 'ws-1',
        type: 'agent.run',
        payload: { agentId: 'a-1', objective: 'test' },
      });

      assert.equal(id, 'job-1');
      const createCalls = calls.filter((c) => c.method === 'scheduledJob.create');
      assert.equal(createCalls.length, 1);
    });
  });

  describe('recoverCrashedJobs', () => {
    it('resets crashed jobs to pending', async () => {
      scheduledJobUpdateManyImpl = async () => ({ count: 3 });

      const count = await DurableExecutionEngine.recoverCrashedJobs();
      assert.equal(count, 3);
    });
  });

  describe('getStats', () => {
    it('returns job statistics', async () => {
      let countCallCount = 0;
      scheduledJobCountImpl = async () => {
        countCallCount++;
        return countCallCount; // Returns 1, 2, 3, 4, 5 for pending, running, completed, failed, deadLettered
      };

      const stats = await DurableExecutionEngine.getStats('ws-1');
      assert.equal(stats.pending, 1);
      assert.equal(stats.running, 2);
      assert.equal(stats.completed, 3);
      assert.equal(stats.failed, 4);
      assert.equal(stats.deadLettered, 5);
    });
  });
});
