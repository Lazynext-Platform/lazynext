import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

// Mock child_process.execSync so triggerBuild/triggerDeploy don't actually shell out
let execSyncImpl: (cmd: string, opts?: Record<string, unknown>) => string = () => 'mocked build output';
mock.module('child_process', {
  namedExports: {
    execSync: (cmd: string, opts?: Record<string, unknown>): string => execSyncImpl(cmd, opts),
  },
});

// Mock global fetch so checkHealth doesn't make real HTTP requests
const originalFetch = globalThis.fetch;
let fetchImpl: (url: string, opts?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> =
  async () => ({ ok: true, status: 200, json: async () => ({}) });
(globalThis as { fetch: typeof fetch }).fetch = ((url: string, opts?: Record<string, unknown>) => fetchImpl(url, opts)) as typeof fetch;

type DeploymentFindManyArgs = {
  where: {
    workspaceId: string;
    status?: string;
    environment?: string;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};

type DeploymentFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

type DeploymentFindFirstArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

type DeploymentCreateArgs = {
  data: Record<string, unknown>;
};

type DeploymentUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type WorkspaceFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let deploymentFindManyImpl: (args: DeploymentFindManyArgs) => Promise<unknown[]> =
  async () => [];
let deploymentFindUniqueImpl: (args: DeploymentFindUniqueArgs) => Promise<unknown> =
  async () => null;
let deploymentFindFirstImpl: (args: DeploymentFindFirstArgs) => Promise<unknown> =
  async () => null;
let deploymentCreateImpl: (args: DeploymentCreateArgs) => Promise<unknown> =
  async () => ({});
let deploymentUpdateImpl: (args: DeploymentUpdateArgs) => Promise<unknown> =
  async () => ({});

let workspaceFindUniqueImpl: (args: WorkspaceFindUniqueArgs) => Promise<unknown> =
  async () => ({ id: 'ws-1', organizationId: 'org-1' });

const prismaMock = {
  deployment: {
    findMany: (args: DeploymentFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'deployment.findMany', args });
      return deploymentFindManyImpl(args);
    },
    findUnique: (args: DeploymentFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'deployment.findUnique', args });
      return deploymentFindUniqueImpl(args);
    },
    findFirst: (args: DeploymentFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'deployment.findFirst', args });
      return deploymentFindFirstImpl(args);
    },
    create: (args: DeploymentCreateArgs): Promise<unknown> => {
      calls.push({ method: 'deployment.create', args });
      return deploymentCreateImpl(args);
    },
    update: (args: DeploymentUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'deployment.update', args });
      return deploymentUpdateImpl(args);
    },
  },
  workspace: {
    findUnique: (args: WorkspaceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
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
  deploymentFindManyImpl = async () => [];
  deploymentFindUniqueImpl = async () => null;
  deploymentFindFirstImpl = async () => null;
  deploymentCreateImpl = async () => ({});
  deploymentUpdateImpl = async () => ({});
  workspaceFindUniqueImpl = async () => ({ id: 'ws-1', organizationId: 'org-1' });
  execSyncImpl = () => 'mocked build output';
  fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({}) });
}

const { DeploymentService } = await import('@/lib/services/deployment');

// ─────────────────────────────────────────────────────────────────────────────
// DeploymentService
// ─────────────────────────────────────────────────────────────────────────────

describe('DeploymentService', () => {
  beforeEach(() => { resetMock(); });

  describe('listDeployments', () => {
    it('returns deployments for a workspace', async () => {
      deploymentFindManyImpl = async () =>
        ([{ id: 'd1', environment: 'production', status: 'live' }]);

      const result = await DeploymentService.listDeployments('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'd1');
      assert.equal(calls[0].method, 'deployment.findMany');
      const args = calls[0].args as DeploymentFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies status and environment filters', async () => {
      deploymentFindManyImpl = async () => [];

      await DeploymentService.listDeployments('ws-1', { status: 'live', environment: 'production' });

      const args = calls[0].args as DeploymentFindManyArgs;
      assert.equal(args.where.status, 'live');
      assert.equal(args.where.environment, 'production');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      deploymentFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await DeploymentService.listDeployments('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getDeployment', () => {
    it('returns a deployment by id', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', environment: 'production', status: 'live' });

      const result = await DeploymentService.getDeployment('d1');

      assert.ok(result);
      assert.equal(result.id, 'd1');
      assert.equal(calls[0].method, 'deployment.findUnique');
    });

    it('returns null when deployment not found', async () => {
      deploymentFindUniqueImpl = async () => null;

      const result = await DeploymentService.getDeployment('nope');
      assert.equal(result, null);
    });
  });

  describe('createDeployment', () => {
    it('creates a deployment with defaults', async () => {
      deploymentCreateImpl = async (args: DeploymentCreateArgs) => {
        assert.equal(args.data.environment, 'production');
        assert.equal(args.data.trigger, 'manual');
        assert.equal(args.data.status, 'pending');
        assert.equal(args.data.organizationId, 'org-1');
        return { id: 'd1', ...args.data };
      };

      const result = await DeploymentService.createDeployment('ws-1', {});

      assert.ok(result);
      assert.equal(result.id, 'd1');
      assert.ok(calls.some((c) => c.method === 'deployment.create'));
    });

    it('throws when workspace not found', async () => {
      workspaceFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DeploymentService.createDeployment('nope', {}),
        /Workspace not found/,
      );
    });

    it('passes through optional fields when provided', async () => {
      deploymentCreateImpl = async (args: DeploymentCreateArgs) => {
        assert.equal(args.data.environment, 'staging');
        assert.equal(args.data.trigger, 'coding_loop');
        assert.equal(args.data.prNumber, 42);
        assert.equal(args.data.branch, 'fix/issue-42');
        return { id: 'd1', ...args.data };
      };

      const result = await DeploymentService.createDeployment('ws-1', {
        environment: 'staging',
        trigger: 'coding_loop',
        prNumber: 42,
        branch: 'fix/issue-42',
      });

      assert.ok(result);
    });
  });

  describe('updateDeployment', () => {
    it('updates only provided fields', async () => {
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        assert.equal(args.data.status, 'live');
        assert.equal(args.data.environment, undefined);
        return { id: 'd1', ...args.data };
      };

      const result = await DeploymentService.updateDeployment('d1', { status: 'live' });
      assert.ok(result);
      assert.equal(calls[0].method, 'deployment.update');
    });
  });

  describe('updateStatus', () => {
    it('updates status and appends to buildLog when building', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', status: 'pending', buildLog: '', deployLog: '', startedAt: null });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        assert.equal(args.data.status, 'building');
        assert.ok(typeof args.data.buildLog === 'string');
        assert.ok(args.data.buildLog.includes('Build started'));
        assert.ok(args.data.startedAt instanceof Date);
        return { id: 'd1', ...args.data };
      };

      const result = await DeploymentService.updateStatus('d1', 'building', 'Build started');
      assert.ok(result);
    });

    it('sets completedAt when transitioning to a terminal status', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', status: 'deploying', buildLog: '', deployLog: '', startedAt: new Date() });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        assert.equal(args.data.status, 'live');
        assert.ok(args.data.completedAt instanceof Date);
        return { id: 'd1', ...args.data };
      };

      await DeploymentService.updateStatus('d1', 'live', 'Deploy succeeded');
    });

    it('throws when deployment not found', async () => {
      deploymentFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DeploymentService.updateStatus('nope', 'building'),
        /Deployment not found/,
      );
    });
  });

  describe('triggerBuild', () => {
    it('marks deployment as building and runs cf:build', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', status: 'pending', buildLog: '', deployLog: '', startedAt: null });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        return { id: 'd1', ...args.data };
      };
      execSyncImpl = () => 'Build completed successfully';

      const result = await DeploymentService.triggerBuild('d1');

      assert.equal(result.deploymentId, 'd1');
      assert.equal(result.status, 'building');
      assert.equal(result.command, 'npm run cf:build');
    });

    it('marks deployment as failed when build command fails', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', status: 'pending', buildLog: '', deployLog: '', startedAt: null });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        return { id: 'd1', ...args.data };
      };
      execSyncImpl = () => { throw new Error('Build failed'); };

      const result = await DeploymentService.triggerBuild('d1');

      assert.equal(result.deploymentId, 'd1');
      assert.equal(result.status, 'failed');
    });
  });

  describe('triggerDeploy', () => {
    it('marks deployment as deploying and runs cf:deploy', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', status: 'building', buildLog: 'log', deployLog: '', startedAt: new Date() });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        return { id: 'd1', ...args.data };
      };
      execSyncImpl = () => 'Deploy completed successfully';

      const result = await DeploymentService.triggerDeploy('d1');

      assert.equal(result.deploymentId, 'd1');
      assert.equal(result.status, 'live');
      assert.equal(result.command, 'npm run cf:deploy');
    });

    it('marks deployment as failed when deploy command fails', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', status: 'building', buildLog: 'log', deployLog: '', startedAt: new Date() });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        return { id: 'd1', ...args.data };
      };
      execSyncImpl = () => { throw new Error('Deploy failed'); };

      const result = await DeploymentService.triggerDeploy('d1');

      assert.equal(result.deploymentId, 'd1');
      assert.equal(result.status, 'failed');
    });
  });

  describe('checkHealth', () => {
    it('returns healthy when healthCheckUrl responds ok', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', healthCheckUrl: 'https://example.com/health', status: 'live' });
      deploymentUpdateImpl = async () => ({ id: 'd1' });
      fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({}) });

      const result = await DeploymentService.checkHealth('d1');

      assert.equal(result.deploymentId, 'd1');
      assert.equal(result.healthStatus, 'healthy');
      assert.equal(result.healthCheckUrl, 'https://example.com/health');
    });

    it('returns unknown when no healthCheckUrl is configured', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', healthCheckUrl: null, status: 'live' });
      deploymentUpdateImpl = async () => ({ id: 'd1' });

      const result = await DeploymentService.checkHealth('d1');

      assert.equal(result.deploymentId, 'd1');
      assert.equal(result.healthStatus, 'unknown');
    });

    it('returns unhealthy when fetch fails', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', healthCheckUrl: 'https://example.com/health', status: 'live' });
      deploymentUpdateImpl = async () => ({ id: 'd1' });
      fetchImpl = async () => { throw new Error('Connection refused'); };

      const result = await DeploymentService.checkHealth('d1');

      assert.equal(result.deploymentId, 'd1');
      assert.equal(result.healthStatus, 'unhealthy');
    });

    it('throws when deployment not found', async () => {
      deploymentFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DeploymentService.checkHealth('nope'),
        /Deployment not found/,
      );
    });
  });

  describe('rollback', () => {
    it('marks current deployment as rolled_back and creates a new rollback deployment', async () => {
      let findUniqueCount = 0;
      deploymentFindUniqueImpl = async () => {
        findUniqueCount++;
        if (findUniqueCount === 1) {
          return {
            id: 'd1',
            workspaceId: 'ws-1',
            organizationId: 'org-1',
            environment: 'production',
            status: 'failed',
            deployLog: '',
            branch: 'main',
            commitSha: 'abc123',
            triggeredBy: 'user-1',
          };
        }
        return null;
      };
      deploymentFindFirstImpl = async () => ({
        id: 'd0',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        environment: 'production',
        status: 'live',
        branch: 'main',
        commitSha: 'prev123',
      });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        assert.equal(args.data.status, 'rolled_back');
        return { id: 'd1', ...args.data };
      };
      deploymentCreateImpl = async (args: DeploymentCreateArgs) => {
        assert.equal(args.data.status, 'deploying');
        assert.equal(args.data.rollbackFromId, 'd0');
        assert.equal(args.data.commitSha, 'prev123');
        return { id: 'd2', ...args.data };
      };

      const result = await DeploymentService.rollback('d1');

      assert.equal(result.id, 'd2');
      assert.equal(result.rollbackFromId, 'd0');
    });

    it('throws when deployment not found', async () => {
      deploymentFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DeploymentService.rollback('nope'),
        /Deployment not found/,
      );
    });
  });

  describe('cancelDeployment', () => {
    it('marks deployment as cancelled with completedAt', async () => {
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        assert.equal(args.data.status, 'cancelled');
        assert.ok(args.data.completedAt instanceof Date);
        return { id: 'd1', ...args.data };
      };

      const result = await DeploymentService.cancelDeployment('d1');
      assert.ok(result);
      assert.equal(calls[0].method, 'deployment.update');
    });
  });

  describe('getDeploymentStats', () => {
    it('aggregates counts by status and environment and computes success rate', async () => {
      deploymentFindManyImpl = async () => ([
        { status: 'live', environment: 'production', startedAt: new Date(1000), completedAt: new Date(2000) },
        { status: 'live', environment: 'production', startedAt: new Date(1000), completedAt: new Date(3000) },
        { status: 'failed', environment: 'staging', startedAt: new Date(1000), completedAt: new Date(1500) },
        { status: 'pending', environment: 'preview', startedAt: null, completedAt: null },
      ]);

      const stats = await DeploymentService.getDeploymentStats('ws-1');

      assert.equal(stats.total, 4);
      assert.equal(stats.byStatus.live, 2);
      assert.equal(stats.byStatus.failed, 1);
      assert.equal(stats.byStatus.pending, 1);
      assert.equal(stats.byEnvironment.production, 2);
      assert.equal(stats.byEnvironment.staging, 1);
      assert.equal(stats.byEnvironment.preview, 1);
      // 2 live out of 3 completed = 67%
      assert.equal(stats.successRate, 67);
      // durations: 1000, 2000, 500 → avg = 1166.67 → 1167
      assert.ok(stats.avgDurationMs > 0);
    });

    it('returns zero stats when no deployments', async () => {
      deploymentFindManyImpl = async () => [];

      const stats = await DeploymentService.getDeploymentStats('ws-1');

      assert.equal(stats.total, 0);
      assert.equal(stats.successRate, 0);
      assert.equal(stats.avgDurationMs, 0);
    });

    it('returns empty stats on error (safePrisma fallback)', async () => {
      deploymentFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await DeploymentService.getDeploymentStats('ws-1');
      assert.equal(stats.total, 0);
    });
  });

  describe('getActiveDeployment', () => {
    it('returns the current live deployment for an environment', async () => {
      deploymentFindFirstImpl = async () =>
        ({ id: 'd1', environment: 'production', status: 'live' });

      const result = await DeploymentService.getActiveDeployment('ws-1', 'production');

      assert.ok(result);
      assert.equal(result.id, 'd1');
      assert.equal(calls[0].method, 'deployment.findFirst');
    });

    it('returns null when no active deployment', async () => {
      deploymentFindFirstImpl = async () => null;

      const result = await DeploymentService.getActiveDeployment('ws-1', 'staging');
      assert.equal(result, null);
    });
  });

  describe('linkToCodingLoop', () => {
    it('links a deployment to a coding loop task and PR', async () => {
      deploymentFindUniqueImpl = async () =>
        ({ id: 'd1', buildLog: '', prNumber: null, trigger: 'manual' });
      deploymentUpdateImpl = async (args: DeploymentUpdateArgs) => {
        assert.equal(args.data.prNumber, 42);
        assert.equal(args.data.trigger, 'coding_loop');
        assert.ok(typeof args.data.buildLog === 'string');
        assert.ok(args.data.buildLog.includes('task task-1'));
        return { id: 'd1', ...args.data };
      };

      const result = await DeploymentService.linkToCodingLoop('d1', 'task-1', 42);

      assert.ok(result);
      assert.equal(calls[0].method, 'deployment.findUnique');
      assert.equal(calls[1].method, 'deployment.update');
    });

    it('throws when deployment not found', async () => {
      deploymentFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DeploymentService.linkToCodingLoop('nope', 'task-1', 42),
        /Deployment not found/,
      );
    });
  });
});
