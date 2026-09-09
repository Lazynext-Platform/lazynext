import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type SandboxRunFindManyArgs = {
  where: { workspaceId: string; status?: string };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type SandboxRunFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

type SandboxRunCreateArgs = {
  data: {
    workspaceId: string;
    agentRunId?: string | null;
    taskId?: string | null;
    language: string;
    code: string;
    status: string;
    timeoutSec: number;
  };
};

type SandboxRunUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type SandboxRunCountArgs = {
  where: { workspaceId: string; createdAt?: { gte?: Date } };
};

type WorkspaceQuotaFindUniqueArgs = {
  where: { workspaceId: string };
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let sandboxRunFindManyImpl: (args: SandboxRunFindManyArgs) => Promise<unknown[]> =
  async () => [];
let sandboxRunFindUniqueImpl: (args: SandboxRunFindUniqueArgs) => Promise<unknown> =
  async () => null;
let sandboxRunCreateImpl: (args: SandboxRunCreateArgs) => Promise<unknown> =
  async () => ({});
let sandboxRunUpdateImpl: (args: SandboxRunUpdateArgs) => Promise<unknown> =
  async () => ({});
let sandboxRunCountImpl: (args: SandboxRunCountArgs) => Promise<number> =
  async () => 0;
let workspaceQuotaFindUniqueImpl: (args: WorkspaceQuotaFindUniqueArgs) => Promise<unknown> =
  async () => null;

// Mock exec — mutable function that simulates child_process.exec
type ExecCallback = (err: Error | null, stdout: string, stderr: string) => void;
type ExecResult = { stdout: string; stderr: string };
let execImpl: (command: string, options: Record<string, unknown>, callback: ExecCallback) => void =
  (_cmd, _opts, cb) => cb(null, '', '');

const prismaMock = {
  sandboxRun: {
    findMany: (args: SandboxRunFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'sandboxRun.findMany', args });
      return sandboxRunFindManyImpl(args);
    },
    findUnique: (args: SandboxRunFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'sandboxRun.findUnique', args });
      return sandboxRunFindUniqueImpl(args);
    },
    create: (args: SandboxRunCreateArgs): Promise<unknown> => {
      calls.push({ method: 'sandboxRun.create', args });
      return sandboxRunCreateImpl(args);
    },
    update: (args: SandboxRunUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'sandboxRun.update', args });
      return sandboxRunUpdateImpl(args);
    },
    count: (args: SandboxRunCountArgs): Promise<number> => {
      calls.push({ method: 'sandboxRun.count', args });
      return sandboxRunCountImpl(args);
    },
  },
  workspaceQuota: {
    findUnique: (args: WorkspaceQuotaFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspaceQuota.findUnique', args });
      return workspaceQuotaFindUniqueImpl(args);
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

// Mock node:child_process — provide exec as a mutable function
// The sandbox service uses promisify(exec), so exec must follow the standard
// (err, stdout, stderr) callback signature and provide [promisify.custom]
// so promisify returns { stdout, stderr } instead of an array.
const execFn = ((
  command: string,
  options: Record<string, unknown> | ExecCallback,
  callback?: ExecCallback,
): unknown => {
  // Handle 2-arg form: exec(command, callback)
  if (typeof options === 'function') {
    return execImpl(command, {}, options as ExecCallback);
  }
  return execImpl(command, options || {}, callback as ExecCallback);
}) as ((command: string, options: Record<string, unknown>, callback: ExecCallback) => void) & {
  [promisify.custom]: (command: string, options?: Record<string, unknown>) => Promise<ExecResult>;
};

execFn[promisify.custom] = (command: string, options?: Record<string, unknown>) =>
  new Promise<ExecResult>((resolve, reject) => {
    execImpl(command, options || {}, (err, stdout, stderr) => {
      if (err) {
        (err as Error & ExecResult).stdout = stdout;
        (err as Error & ExecResult).stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

mock.module('node:child_process', {
  namedExports: { exec: execFn },
});

function resetMock(): void {
  calls.length = 0;
  sandboxRunFindManyImpl = async () => [];
  sandboxRunFindUniqueImpl = async () => null;
  sandboxRunCreateImpl = async () => ({});
  sandboxRunUpdateImpl = async () => ({});
  sandboxRunCountImpl = async () => 0;
  workspaceQuotaFindUniqueImpl = async () => null;
  execImpl = (_cmd, _opts, cb) => cb(null, '', '');
}

const { SandboxService } = await import('@/lib/services/sandbox');

// ─────────────────────────────────────────────────────────────────────────────
// SandboxService
// ─────────────────────────────────────────────────────────────────────────────

describe('SandboxService', () => {
  beforeEach(() => { resetMock(); });

  describe('listRuns', () => {
    it('returns runs for a workspace', async () => {
      sandboxRunFindManyImpl = async () =>
        ([{ id: 'r1', language: 'javascript', status: 'completed' }]);

      const result = await SandboxService.listRuns('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'r1');
      assert.equal(calls[0].method, 'sandboxRun.findMany');
      const args = calls[0].args as SandboxRunFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies status filter', async () => {
      sandboxRunFindManyImpl = async () => [];

      await SandboxService.listRuns('ws-1', { status: 'completed' });

      const args = calls[0].args as SandboxRunFindManyArgs;
      assert.equal(args.where.status, 'completed');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      sandboxRunFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await SandboxService.listRuns('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getRun', () => {
    it('returns a run by id', async () => {
      sandboxRunFindUniqueImpl = async () =>
        ({ id: 'r1', language: 'javascript', status: 'completed' });

      const result = await SandboxService.getRun('r1');

      assert.ok(result);
      assert.equal(result.id, 'r1');
      assert.equal(calls[0].method, 'sandboxRun.findUnique');
    });

    it('returns null when run not found', async () => {
      sandboxRunFindUniqueImpl = async () => null;

      const result = await SandboxService.getRun('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      sandboxRunFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await SandboxService.getRun('r1');
      assert.equal(result, null);
    });
  });

  describe('createRun', () => {
    it('creates a run record with defaults', async () => {
      sandboxRunCreateImpl = async (args: SandboxRunCreateArgs) => {
        assert.equal(args.data.status, 'pending');
        assert.equal(args.data.timeoutSec, 30);
        assert.equal(args.data.language, 'javascript');
        return { id: 'r1', ...args.data };
      };

      const result = await SandboxService.createRun('ws-1', {
        language: 'javascript',
        code: 'console.log("hi")',
      });

      assert.ok(result);
      assert.equal(result.id, 'r1');
      assert.equal(calls[0].method, 'sandboxRun.create');
    });

    it('clamps timeout to max 60s', async () => {
      sandboxRunCreateImpl = async (args: SandboxRunCreateArgs) => {
        assert.equal(args.data.timeoutSec, 60);
        return { id: 'r1', ...args.data };
      };

      await SandboxService.createRun('ws-1', {
        language: 'javascript',
        code: 'console.log("hi")',
        timeoutSec: 120,
      });
    });

    it('clamps timeout to min 1s', async () => {
      sandboxRunCreateImpl = async (args: SandboxRunCreateArgs) => {
        assert.equal(args.data.timeoutSec, 1);
        return { id: 'r1', ...args.data };
      };

      await SandboxService.createRun('ws-1', {
        language: 'javascript',
        code: 'console.log("hi")',
        timeoutSec: 0,
      });
    });

    it('passes agentRunId and taskId when provided', async () => {
      sandboxRunCreateImpl = async (args: SandboxRunCreateArgs) => {
        assert.equal(args.data.agentRunId, 'ar-1');
        assert.equal(args.data.taskId, 't-1');
        return { id: 'r1', ...args.data };
      };

      await SandboxService.createRun('ws-1', {
        language: 'javascript',
        code: 'console.log("hi")',
        agentRunId: 'ar-1',
        taskId: 't-1',
      });
    });
  });

  describe('executeCode', () => {
    it('returns stdout on success', async () => {
      execImpl = (_cmd, _opts, cb) => cb(null, 'Hello World\n', '');

      const result = await SandboxService.executeCode({
        language: 'javascript',
        code: "console.log('Hello World')",
      });

      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('Hello World'));
      assert.equal(result.stderr, '');
      assert.ok(result.durationMs >= 0);
    });

    it('returns stderr and non-zero exit on failure', async () => {
      execImpl = (_cmd, _opts, cb) =>
        cb(new Error('Command failed with exit code 1'), '', 'SyntaxError: unexpected token');

      const result = await SandboxService.executeCode({
        language: 'javascript',
        code: 'syntax error here',
      });

      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stderr.includes('SyntaxError'));
    });

    it('returns timeout exit code (124) when killed', async () => {
      execImpl = (_cmd, _opts, cb) => {
        const err = new Error('Process killed') as Error & { killed: boolean; signal: string; code: number | null };
        err.killed = true;
        err.signal = 'SIGTERM';
        err.code = null;
        cb(err, '', '');
      };

      const result = await SandboxService.executeCode({
        language: 'javascript',
        code: 'while(true) {}',
        timeoutSec: 1,
      });

      assert.equal(result.exitCode, 124);
      assert.ok(result.stderr.includes('timed out'));
    });
  });

  describe('run', () => {
    it('creates a record, executes code, and updates the record', async () => {
      let createdId = '';
      sandboxRunCreateImpl = async (args: SandboxRunCreateArgs) => {
        const rec = { id: 'r-run-1', ...args.data, stdout: '', stderr: '', exitCode: null, durationMs: null, completedAt: null };
        createdId = rec.id;
        return rec;
      };
      sandboxRunUpdateImpl = async (args: SandboxRunUpdateArgs) => {
        assert.equal(args.where.id, createdId);
        return { id: createdId, ...args.data };
      };
      execImpl = (_cmd, _opts, cb) => cb(null, '42\n', '');

      const result = await SandboxService.run('ws-1', {
        language: 'javascript',
        code: "console.log(42)",
      });

      assert.ok(result);
      assert.equal(result.status, 'completed');
      assert.ok((result.stdout as string).includes('42'));
      assert.equal(result.exitCode, 0);
      // Should have called create, then update (running), then update (result)
      const createCalls = calls.filter((c) => c.method === 'sandboxRun.create');
      const updateCalls = calls.filter((c) => c.method === 'sandboxRun.update');
      assert.equal(createCalls.length, 1);
      assert.equal(updateCalls.length, 2);
    });

    it('marks status as failed when exit code is non-zero', async () => {
      sandboxRunCreateImpl = async (args: SandboxRunCreateArgs) =>
        ({ id: 'r-fail-1', ...args.data, stdout: '', stderr: '', exitCode: null, durationMs: null, completedAt: null });
      sandboxRunUpdateImpl = async (args: SandboxRunUpdateArgs) =>
        ({ id: 'r-fail-1', ...args.data });
      execImpl = (_cmd, _opts, cb) => {
        const err = new Error('failed') as Error & { code: number };
        err.code = 1;
        cb(err, '', 'Error: something broke');
      };

      const result = await SandboxService.run('ws-1', {
        language: 'javascript',
        code: 'throw new Error("broke")',
      });

      assert.equal(result.status, 'failed');
    });
  });

  describe('cancelRun', () => {
    it('marks a pending run as cancelled', async () => {
      sandboxRunFindUniqueImpl = async () =>
        ({ id: 'r1', workspaceId: 'ws-1', status: 'pending' });
      sandboxRunUpdateImpl = async (args: SandboxRunUpdateArgs) => {
        assert.equal(args.data.status, 'cancelled');
        return { id: 'r1', ...args.data };
      };

      const result = await SandboxService.cancelRun('r1');
      assert.ok(result);
      assert.equal(result.status, 'cancelled');
    });

    it('returns null when run not found', async () => {
      sandboxRunFindUniqueImpl = async () => null;

      const result = await SandboxService.cancelRun('nope');
      assert.equal(result, null);
    });

    it('returns existing record without updating if already terminal', async () => {
      sandboxRunFindUniqueImpl = async () =>
        ({ id: 'r1', workspaceId: 'ws-1', status: 'completed' });

      const result = await SandboxService.cancelRun('r1');
      assert.ok(result);
      assert.equal(result.status, 'completed');
      // Should not have called update
      const updateCalls = calls.filter((c) => c.method === 'sandboxRun.update');
      assert.equal(updateCalls.length, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates stats from runs', async () => {
      sandboxRunFindManyImpl = async () => ([
        { status: 'completed', language: 'javascript', durationMs: 100 },
        { status: 'completed', language: 'javascript', durationMs: 200 },
        { status: 'failed', language: 'python', durationMs: 50 },
      ]);

      const stats = await SandboxService.getStats('ws-1');

      assert.equal(stats.total, 3);
      assert.equal(stats.byStatus.completed, 2);
      assert.equal(stats.byStatus.failed, 1);
      assert.equal(stats.byLanguage.javascript, 2);
      assert.equal(stats.byLanguage.python, 1);
      assert.ok(stats.successRate > 66 && stats.successRate < 67);
      assert.equal(stats.avgDurationMs, 117); // Math.round((100+200+50)/3)
    });

    it('returns zero stats when no runs', async () => {
      sandboxRunFindManyImpl = async () => [];

      const stats = await SandboxService.getStats('ws-1');

      assert.equal(stats.total, 0);
      assert.equal(stats.successRate, 0);
      assert.equal(stats.avgDurationMs, 0);
    });

    it('returns empty stats on error (safePrisma fallback)', async () => {
      sandboxRunFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await SandboxService.getStats('ws-1');
      assert.equal(stats.total, 0);
    });
  });

  describe('checkQuota', () => {
    it('allows when under limit', async () => {
      workspaceQuotaFindUniqueImpl = async () =>
        ({ maxSandboxRunsPerDay: 50 });
      sandboxRunCountImpl = async () => 10;

      const quota = await SandboxService.checkQuota('ws-1');

      assert.equal(quota.allowed, true);
      assert.equal(quota.used, 10);
      assert.equal(quota.limit, 50);
      assert.equal(quota.remaining, 40);
    });

    it('denies when over limit', async () => {
      workspaceQuotaFindUniqueImpl = async () =>
        ({ maxSandboxRunsPerDay: 50 });
      sandboxRunCountImpl = async () => 50;

      const quota = await SandboxService.checkQuota('ws-1');

      assert.equal(quota.allowed, false);
      assert.equal(quota.used, 50);
      assert.equal(quota.remaining, 0);
    });

    it('uses default limit when no quota record exists', async () => {
      workspaceQuotaFindUniqueImpl = async () => null;
      sandboxRunCountImpl = async () => 0;

      const quota = await SandboxService.checkQuota('ws-1');

      assert.equal(quota.allowed, true);
      assert.equal(quota.limit, 50);
      assert.equal(quota.remaining, 50);
    });
  });
});
