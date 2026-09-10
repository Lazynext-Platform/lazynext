import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let automationFindUniqueImpl: (args: { where: { id: string } }) => Promise<unknown> = async () => null;
let automationRunCreateImpl: (args: unknown) => Promise<unknown> = async () => ({ id: 'run-1', automationId: 'a-1', status: 'running', startedAt: new Date() });
let automationRunUpdateImpl: (args: unknown) => Promise<unknown> = async (args) => {
  const data = (args as { data: { status?: string } }).data;
  return { id: 'run-1', status: data.status ?? 'completed', completedAt: new Date() };
};
let automationRunCountImpl: (args: unknown) => Promise<number> = async () => 0;
let automationRunFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let workspaceFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => ({ organizationId: 'org-1' });
let taskCreateImpl: (args: unknown) => Promise<unknown> = async () => ({ id: 'task-1' });
let notificationCreateImpl: (args: unknown) => Promise<unknown> = async () => ({ id: 'notif-1' });

const prismaMock = {
  automation: {
    findUnique: (args: { where: { id: string } }): Promise<unknown> => {
      calls.push({ method: 'automation.findUnique', args });
      return automationFindUniqueImpl(args);
    },
    findFirst: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'automation.findFirst', args });
      return automationFindUniqueImpl({ where: { id: (args as { where: { id: string } }).where.id } });
    },
  },
  automationRun: {
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'automationRun.create', args });
      return automationRunCreateImpl(args);
    },
    update: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'automationRun.update', args });
      return automationRunUpdateImpl(args);
    },
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'automationRun.count', args });
      return automationRunCountImpl(args);
    },
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'automationRun.findMany', args });
      return automationRunFindManyImpl(args);
    },
  },
  workspace: {
    findUnique: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
    },
  },
  task: {
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
  },
  notification: {
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'notification.create', args });
      return notificationCreateImpl(args);
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

// Mock global.fetch for api_call / webhook actions
const fetchMock = mock.fn(async () => ({ ok: true, status: 200 } as { ok: boolean; status: number }));
globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

function resetMock(): void {
  calls.length = 0;
  fetchMock.mock.resetCalls();
  automationFindUniqueImpl = async () => null;
  automationRunCreateImpl = async () => ({ id: 'run-1', automationId: 'a-1', status: 'running', startedAt: new Date() });
  automationRunUpdateImpl = async (args) => {
    const data = (args as { data: { status?: string } }).data;
    return { id: 'run-1', status: data.status ?? 'completed', completedAt: new Date() };
  };
  automationRunCountImpl = async () => 0;
  automationRunFindManyImpl = async () => [];
  workspaceFindUniqueImpl = async () => ({ organizationId: 'org-1' });
  taskCreateImpl = async () => ({ id: 'task-1' });
  notificationCreateImpl = async () => ({ id: 'notif-1' });
}

const { AutomationDispatcher } = await import('@/lib/automation/dispatcher');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AutomationDispatcher', () => {
  beforeEach(() => { resetMock(); });

  describe('dispatch', () => {
    it('throws when automation not found', async () => {
      automationFindUniqueImpl = async () => null;
      await assert.rejects(() => AutomationDispatcher.dispatch('nope', 'trigger', {}), /automation_not_found/);
    });

    it('throws when automation is disabled', async () => {
      automationFindUniqueImpl = async () => ({
        id: 'a-1',
        workspaceId: 'ws-1',
        name: 'Test',
        trigger: 'trigger',
        enabled: false,
        definition: '{"actions":[]}',
      });
      await assert.rejects(() => AutomationDispatcher.dispatch('a-1', 'trigger', {}), /automation_disabled/);
    });

    it('creates a run and completes with no actions', async () => {
      automationFindUniqueImpl = async () => ({
        id: 'a-1',
        workspaceId: 'ws-1',
        name: 'Test',
        trigger: 'trigger',
        enabled: true,
        definition: '{"actions":[]}',
      });

      const run = await AutomationDispatcher.dispatch('a-1', 'trigger', {});
      assert.ok(run);
      assert.equal(run.status, 'completed');
      // Should have created a run and updated it.
      assert.ok(calls.some((c) => c.method === 'automationRun.create'));
      assert.ok(calls.some((c) => c.method === 'automationRun.update'));
    });

    it('marks run as failed when an action errors', async () => {
      automationFindUniqueImpl = async () => ({
        id: 'a-1',
        workspaceId: 'ws-1',
        name: 'Test',
        trigger: 'trigger',
        enabled: true,
        definition: '{"actions":[{"type":"api_call","config":{}}]}',
      });

      const run = await AutomationDispatcher.dispatch('a-1', 'trigger', {}, {
        maxAttempts: 1, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false,
      });
      assert.equal(run.status, 'failed');
    });

    it('throws on trigger mismatch', async () => {
      automationFindUniqueImpl = async () => ({
        id: 'a-1',
        workspaceId: 'ws-1',
        name: 'Test',
        trigger: 'expected',
        enabled: true,
        definition: '{"trigger":"expected","actions":[]}',
      });

      await assert.rejects(() => AutomationDispatcher.dispatch('a-1', 'wrong', {}), /trigger_mismatch/);
    });
  });

  describe('executeAction', () => {
    const ctx = {
      workspaceId: 'ws-1',
      organizationId: 'org-1',
      automationId: 'a-1',
      runId: 'run-1',
      trigger: 'test',
      payload: { foo: 'bar' },
    };

    it('executes webhook action successfully', async () => {
      fetchMock.mock.mockImplementation(async () => ({ ok: true, status: 200 }));
      const result = await AutomationDispatcher.executeAction(
        { type: 'webhook', config: { url: 'https://example.com/hook', event: 'test' } },
        ctx,
      );
      assert.equal(result.ok, true);
    });

    it('returns error when webhook url missing', async () => {
      const result = await AutomationDispatcher.executeAction(
        { type: 'webhook', config: {} },
        ctx,
      );
      assert.equal(result.ok, false);
      assert.match(result.error!, /webhook_url_required/);
    });

    it('executes api_call action successfully', async () => {
      fetchMock.mock.mockImplementation(async () => ({ ok: true, status: 200 }));
      const result = await AutomationDispatcher.executeAction(
        { type: 'api_call', config: { url: 'https://api.example.com', method: 'POST' } },
        ctx,
      );
      assert.equal(result.ok, true);
    });

    it('returns error when api_call url missing', async () => {
      const result = await AutomationDispatcher.executeAction(
        { type: 'api_call', config: {} },
        ctx,
      );
      assert.equal(result.ok, false);
      assert.match(result.error!, /api_url_required/);
    });

    it('executes create_task action successfully', async () => {
      const result = await AutomationDispatcher.executeAction(
        { type: 'create_task', config: { title: 'New task', projectId: 'p-1' } },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.ok(calls.some((c) => c.method === 'task.create'));
    });

    it('returns error when task title missing', async () => {
      const result = await AutomationDispatcher.executeAction(
        { type: 'create_task', config: { projectId: 'p-1' } },
        ctx,
      );
      assert.equal(result.ok, false);
      assert.match(result.error!, /task_title_required/);
    });

    it('executes send_notification action successfully', async () => {
      const result = await AutomationDispatcher.executeAction(
        { type: 'send_notification', config: { userId: 'u-1', title: 'Hello' } },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.ok(calls.some((c) => c.method === 'notification.create'));
    });

    it('returns error for unknown action type', async () => {
      const result = await AutomationDispatcher.executeAction(
        { type: 'unknown' as never, config: {} },
        ctx,
      );
      assert.equal(result.ok, false);
      assert.match(result.error!, /unknown_action_type/);
    });
  });

  describe('validateAutomation', () => {
    it('returns valid for a well-formed automation', () => {
      const result = AutomationDispatcher.validateAutomation({
        enabled: true,
        trigger: 'test',
        definition: '{"actions":[{"type":"webhook","config":{"url":"https://x.com"}}]}',
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('returns error when trigger missing', () => {
      const result = AutomationDispatcher.validateAutomation({
        enabled: true,
        trigger: '',
        definition: '{}',
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('trigger_required'));
    });
  });

  describe('getDispatchStats', () => {
    it('returns aggregated stats', async () => {
      automationRunCountImpl = async (args: unknown) => {
        const where = (args as { where: { status?: string } }).where;
        if (where.status === 'completed') return 8;
        if (where.status === 'failed') return 2;
        if (where.status === 'running') return 1;
        if (where.status === 'pending') return 0;
        return 10; // total
      };

      const stats = await AutomationDispatcher.getDispatchStats('a-1');
      assert.equal(stats.total, 10);
      assert.equal(stats.completed, 8);
      assert.equal(stats.failed, 2);
      assert.equal(stats.running, 1);
      assert.equal(stats.successRate, 80);
    });
  });

  describe('getFailedDispatches', () => {
    it('returns failed runs for an org', async () => {
      automationRunFindManyImpl = async () => [
        {
          id: 'r-1',
          automationId: 'a-1',
          status: 'failed',
          startedAt: new Date(),
          completedAt: new Date(),
          automation: { id: 'a-1', name: 'Test' },
        },
      ];

      const result = await AutomationDispatcher.getFailedDispatches('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].status, 'failed');
      assert.equal(result[0].automationName, 'Test');
    });
  });
});
