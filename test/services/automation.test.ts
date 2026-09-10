import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type AutomationFindManyArgs = {
  where: { workspaceId: string; enabled?: boolean; trigger?: string };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};

type AutomationFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type AutomationCreateArgs = {
  data: {
    workspaceId: string;
    name: string;
    trigger: string;
    definition: string;
    enabled: boolean;
  };
};

type AutomationUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type AutomationDeleteArgs = {
  where: { id: string };
};

type AutomationCountArgs = {
  where: { workspaceId: string; enabled?: boolean };
};

type AutomationRunFindManyArgs = {
  where: { automationId?: string; automation?: { workspaceId: string }; startedAt?: { gte: Date }; status?: string };
  orderBy?: Record<string, unknown>;
  take?: number;
  include?: Record<string, unknown>;
};

type AutomationRunFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type AutomationRunCreateArgs = {
  data: {
    automationId: string;
    status: string;
    startedAt: Date;
  };
};

type AutomationRunCountArgs = {
  where: {
    automation?: { workspaceId: string };
    startedAt?: { gte: Date };
    status?: string;
  };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let automationFindManyImpl: (args: AutomationFindManyArgs) => Promise<unknown[]> =
  async () => [];
let automationFindUniqueImpl: (args: AutomationFindUniqueArgs) => Promise<unknown> =
  async () => null;
let automationCreateImpl: (args: AutomationCreateArgs) => Promise<unknown> =
  async () => ({});
let automationUpdateImpl: (args: AutomationUpdateArgs) => Promise<unknown> =
  async () => ({});
let automationDeleteImpl: (args: AutomationDeleteArgs) => Promise<unknown> =
  async () => ({});

let automationCountImpl: (args: AutomationCountArgs) => Promise<number> =
  async () => 0;

let runFindManyImpl: (args: AutomationRunFindManyArgs) => Promise<unknown[]> =
  async () => [];
let runFindUniqueImpl: (args: AutomationRunFindUniqueArgs) => Promise<unknown> =
  async () => null;
let runCreateImpl: (args: AutomationRunCreateArgs) => Promise<unknown> =
  async () => ({});
let runCountImpl: (args: AutomationRunCountArgs) => Promise<number> =
  async () => 0;

const prismaMock = {
  automation: {
    findMany: (args: AutomationFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'automation.findMany', args });
      return automationFindManyImpl(args);
    },
    findUnique: (args: AutomationFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'automation.findUnique', args });
      return automationFindUniqueImpl(args);
    },
    create: (args: AutomationCreateArgs): Promise<unknown> => {
      calls.push({ method: 'automation.create', args });
      return automationCreateImpl(args);
    },
    update: (args: AutomationUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'automation.update', args });
      return automationUpdateImpl(args);
    },
    delete: (args: AutomationDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'automation.delete', args });
      return automationDeleteImpl(args);
    },
    count: (args: AutomationCountArgs): Promise<number> => {
      calls.push({ method: 'automation.count', args });
      return automationCountImpl(args);
    },
  },
  automationRun: {
    findMany: (args: AutomationRunFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'automationRun.findMany', args });
      return runFindManyImpl(args);
    },
    findUnique: (args: AutomationRunFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'automationRun.findUnique', args });
      return runFindUniqueImpl(args);
    },
    create: (args: AutomationRunCreateArgs): Promise<unknown> => {
      calls.push({ method: 'automationRun.create', args });
      return runCreateImpl(args);
    },
    count: (args: AutomationRunCountArgs): Promise<number> => {
      calls.push({ method: 'automationRun.count', args });
      return runCountImpl(args);
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
  automationFindManyImpl = async () => [];
  automationFindUniqueImpl = async () => null;
  automationCreateImpl = async () => ({});
  automationUpdateImpl = async () => ({});
  automationDeleteImpl = async () => ({});
  automationCountImpl = async () => 0;
  runFindManyImpl = async () => [];
  runFindUniqueImpl = async () => null;
  runCreateImpl = async () => ({});
  runCountImpl = async () => 0;
}

const { AutomationService } = await import('@/lib/services/automation');

// ─────────────────────────────────────────────────────────────────────────────
// AutomationService
// ─────────────────────────────────────────────────────────────────────────────

describe('AutomationService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns automations for a workspace with run counts', async () => {
      automationFindManyImpl = async () =>
        ([{ id: 'a1', name: 'Notify', trigger: 'task.created', _count: { runs: 3 } }]);

      const result = await AutomationService.list('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'a1');
      assert.equal(calls[0].method, 'automation.findMany');
      const args = calls[0].args as AutomationFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      automationFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await AutomationService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns a single automation with runs and counts', async () => {
      automationFindUniqueImpl = async () =>
        ({ id: 'a1', name: 'Notify', runs: [{ id: 'r1' }], _count: { runs: 1 } });

      const result = await AutomationService.get('a1');

      assert.ok(result);
      assert.equal(result.id, 'a1');
      assert.equal(calls[0].method, 'automation.findUnique');
    });

    it('returns null when automation not found', async () => {
      automationFindUniqueImpl = async () => null;

      const result = await AutomationService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      automationFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await AutomationService.get('a1');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates an automation with defaults', async () => {
      automationCreateImpl = async (args: AutomationCreateArgs) => {
        assert.equal(args.data.workspaceId, 'ws-1');
        assert.equal(args.data.name, 'Notify');
        assert.equal(args.data.trigger, 'task.created');
        assert.equal(args.data.enabled, true);
        return { id: 'a1', ...args.data };
      };

      const result = await AutomationService.create('ws-1', {
        name: 'Notify',
        trigger: 'task.created',
      });

      assert.ok(result);
      assert.equal(result.id, 'a1');
      assert.equal(calls[0].method, 'automation.create');
    });

    it('throws when name is missing', async () => {
      await assert.rejects(
        () => AutomationService.create('ws-1', { trigger: 'task.created' }),
        /name_and_trigger_required/,
      );
    });

    it('throws when trigger is missing', async () => {
      await assert.rejects(
        () => AutomationService.create('ws-1', { name: 'Notify' }),
        /name_and_trigger_required/,
      );
    });

    it('truncates long names to 200 characters', async () => {
      automationCreateImpl = async (args: AutomationCreateArgs) => {
        assert.ok(args.data.name.length <= 200);
        return { id: 'a1', name: args.data.name };
      };

      await AutomationService.create('ws-1', {
        name: 'A'.repeat(500),
        trigger: 'task.created',
      });
    });

    it('respects enabled=false', async () => {
      automationCreateImpl = async (args: AutomationCreateArgs) => {
        assert.equal(args.data.enabled, false);
        return { id: 'a1', enabled: false };
      };

      await AutomationService.create('ws-1', {
        name: 'Notify',
        trigger: 'task.created',
        enabled: false,
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      automationUpdateImpl = async (args: AutomationUpdateArgs) => {
        assert.equal(args.data.name, 'New Name');
        assert.equal(args.data.enabled, undefined);
        return { id: 'a1', ...args.data };
      };

      const result = await AutomationService.update('a1', { name: 'New Name' });
      assert.ok(result);
      assert.equal(calls[0].method, 'automation.update');
    });

    it('updates enabled boolean', async () => {
      automationUpdateImpl = async (args: AutomationUpdateArgs) => {
        assert.equal(args.data.enabled, false);
        return { id: 'a1', enabled: false };
      };

      await AutomationService.update('a1', { enabled: false });
    });
  });

  describe('delete', () => {
    it('deletes an automation', async () => {
      automationDeleteImpl = async () => ({});

      const result = await AutomationService.delete('a1');
      assert.equal(result.ok, true);
      assert.equal(calls[0].method, 'automation.delete');
    });
  });

  describe('listRuns', () => {
    it('returns runs for an automation', async () => {
      runFindManyImpl = async () =>
        ([{ id: 'r1', status: 'completed', startedAt: new Date() }]);

      const result = await AutomationService.listRuns('a1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'r1');
      assert.equal(calls[0].method, 'automationRun.findMany');
      const args = calls[0].args as AutomationRunFindManyArgs;
      assert.equal(args.where.automationId, 'a1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      runFindManyImpl = async () => { throw new Error('fail'); };

      const result = await AutomationService.listRuns('a1');
      assert.deepEqual(result, []);
    });
  });

  describe('getRun', () => {
    it('returns a run by id with automation', async () => {
      runFindUniqueImpl = async () =>
        ({ id: 'r1', status: 'completed', automation: { id: 'a1' } });

      const result = await AutomationService.getRun('r1');

      assert.ok(result);
      assert.equal(result.id, 'r1');
      assert.equal(calls[0].method, 'automationRun.findUnique');
    });

    it('returns null when run not found', async () => {
      runFindUniqueImpl = async () => null;

      const result = await AutomationService.getRun('nope');
      assert.equal(result, null);
    });
  });

  describe('dispatchEvent', () => {
    it('creates runs for matching enabled automations', async () => {
      automationFindManyImpl = async () =>
        ([{ id: 'a1' }, { id: 'a2' }]);
      runCreateImpl = async (args: AutomationRunCreateArgs) => ({
        id: `run-${args.data.automationId}`,
        status: 'pending',
      });

      const runs = await AutomationService.dispatchEvent({
        id: 'e1',
        workspaceId: 'ws-1',
        type: 'task.created',
      });

      assert.equal(runs.length, 2);
      assert.equal(runs[0].id, 'run-a1');
      assert.equal(runs[1].id, 'run-a2');
      // findMany was called with enabled + trigger filter
      const findArgs = calls[0].args as AutomationFindManyArgs;
      assert.equal(findArgs.where.enabled, true);
      assert.equal(findArgs.where.trigger, 'task.created');
    });

    it('returns empty when no workspaceId on event', async () => {
      const runs = await AutomationService.dispatchEvent({
        id: 'e1',
        workspaceId: null,
        type: 'task.created',
      });
      assert.deepEqual(runs, []);
    });

    it('returns empty when no matching automations', async () => {
      automationFindManyImpl = async () => [];

      const runs = await AutomationService.dispatchEvent({
        id: 'e1',
        workspaceId: 'ws-1',
        type: 'unknown.event',
      });
      assert.deepEqual(runs, []);
    });

    it('filters out failed run creations', async () => {
      automationFindManyImpl = async () => ([{ id: 'a1' }, { id: 'a2' }]);
      runCreateImpl = async (args: AutomationRunCreateArgs) => {
        if (args.data.automationId === 'a2') throw new Error('fail');
        return { id: 'run-a1', status: 'pending' };
      };

      const runs = await AutomationService.dispatchEvent({
        id: 'e1',
        workspaceId: 'ws-1',
        type: 'task.created',
      });

      assert.equal(runs.length, 1);
      assert.equal(runs[0].id, 'run-a1');
    });
  });

  describe('getStats', () => {
    it('aggregates total, enabled, runs24h, and success rate', async () => {
      automationCountImpl = async (args: AutomationCountArgs) => {
        if (args.where.enabled === true) return 3;
        return 5; // total
      };
      runCountImpl = async (args: AutomationRunCountArgs) => {
        if (args.where.status === 'completed') return 8;
        return 10; // recentRuns
      };

      const stats = await AutomationService.getStats('ws-1');

      assert.equal(stats.total, 5);
      assert.equal(stats.enabled, 3);
      assert.equal(stats.runs24h, 10);
      assert.equal(stats.successRate, 80);
    });

    it('returns 0 success rate when no recent runs', async () => {
      automationCountImpl = async () => 0;
      runCountImpl = async () => 0;

      const stats = await AutomationService.getStats('ws-1');

      assert.equal(stats.total, 0);
      assert.equal(stats.enabled, 0);
      assert.equal(stats.runs24h, 0);
      assert.equal(stats.successRate, 0);
    });

    it('returns zeroed stats on error (safePrisma fallback)', async () => {
      automationCountImpl = async () => { throw new Error('fail'); };
      runCountImpl = async () => { throw new Error('fail'); };

      const stats = await AutomationService.getStats('ws-1');

      assert.equal(stats.total, 0);
      assert.equal(stats.enabled, 0);
      assert.equal(stats.runs24h, 0);
      assert.equal(stats.successRate, 0);
    });
  });
});
