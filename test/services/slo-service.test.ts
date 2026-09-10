import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type SLOCreateArgs = {
  data: {
    organizationId: string;
    name: string;
    description: string;
    metricName: string;
    target: number;
    targetPercentile: number;
    windowDays: number;
    status: string;
    errorBudget: number;
    errorBudgetUsed: number;
  };
};

type SLOFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type SLOFindUniqueArgs = {
  where: { id: string };
};

type SLOUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type SLODeleteArgs = {
  where: { id: string };
};

type TelemetryFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let sloCreateImpl: (args: SLOCreateArgs) => Promise<unknown> = async () => ({});
let sloFindManyImpl: (args: SLOFindManyArgs) => Promise<unknown[]> = async () => [];
let sloFindUniqueImpl: (args: SLOFindUniqueArgs) => Promise<unknown> = async () => null;
let sloUpdateImpl: (args: SLOUpdateArgs) => Promise<unknown> = async () => ({});
let sloDeleteImpl: (args: SLODeleteArgs) => Promise<unknown> = async () => ({});

let telemetryFindManyImpl: (args: TelemetryFindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  sLO: {
    create: (args: SLOCreateArgs): Promise<unknown> => {
      calls.push({ method: 'sLO.create', args });
      return sloCreateImpl(args);
    },
    findMany: (args: SLOFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'sLO.findMany', args });
      return sloFindManyImpl(args);
    },
    findUnique: (args: SLOFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'sLO.findUnique', args });
      return sloFindUniqueImpl(args);
    },
    update: (args: SLOUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'sLO.update', args });
      return sloUpdateImpl(args);
    },
    delete: (args: SLODeleteArgs): Promise<unknown> => {
      calls.push({ method: 'sLO.delete', args });
      return sloDeleteImpl(args);
    },
  },
  telemetryPoint: {
    findMany: (args: TelemetryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'telemetryPoint.findMany', args });
      return telemetryFindManyImpl(args);
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
  sloCreateImpl = async () => ({});
  sloFindManyImpl = async () => [];
  sloFindUniqueImpl = async () => null;
  sloUpdateImpl = async () => ({});
  sloDeleteImpl = async () => ({});
  telemetryFindManyImpl = async () => [];
}

const { SLOService } = await import('@/lib/services/slo-service');

// ─────────────────────────────────────────────────────────────────────────────
// SLOService
// ─────────────────────────────────────────────────────────────────────────────

describe('SLOService', () => {
  beforeEach(() => { resetMock(); });

  describe('createSLO', () => {
    it('creates an SLO with defaults', async () => {
      sloCreateImpl = async (args: SLOCreateArgs) => {
        assert.equal(args.data.targetPercentile, 99.0);
        assert.equal(args.data.windowDays, 30);
        assert.equal(args.data.errorBudget, 1.0);
        assert.equal(args.data.status, 'active');
        return { id: 's1', ...args.data };
      };

      const result = await SLOService.createSLO('org-1', {
        name: 'API Latency',
        metricName: 'api.response_time',
        target: 200,
      });

      assert.ok(result);
      assert.equal(result.id, 's1');
      assert.equal(calls[0].method, 'sLO.create');
    });

    it('passes through custom values', async () => {
      sloCreateImpl = async (args: SLOCreateArgs) => {
        assert.equal(args.data.targetPercentile, 90);
        assert.equal(args.data.windowDays, 7);
        assert.equal(args.data.errorBudget, 0.5);
        return { id: 's1', ...args.data };
      };

      await SLOService.createSLO('org-1', {
        name: 'API Latency',
        metricName: 'api.response_time',
        target: 200,
        targetPercentile: 90,
        windowDays: 7,
        errorBudget: 0.5,
      });
    });
  });

  describe('listSLOs', () => {
    it('lists SLOs for an organization', async () => {
      sloFindManyImpl = async () => ([{ id: 's1', name: 'SLO 1' }]);

      const result = await SLOService.listSLOs('org-1');

      assert.equal(result.length, 1);
      const args = calls[0].args as SLOFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      sloFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await SLOService.listSLOs('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getSLO', () => {
    it('returns an SLO by id', async () => {
      sloFindUniqueImpl = async () => ({ id: 's1', name: 'SLO 1' });

      const result = await SLOService.getSLO('s1');
      assert.ok(result);
      assert.equal(result.id, 's1');
    });

    it('returns null when SLO not found', async () => {
      sloFindUniqueImpl = async () => null;

      const result = await SLOService.getSLO('nope');
      assert.equal(result, null);
    });
  });

  describe('updateSLO', () => {
    it('updates only provided fields', async () => {
      sloUpdateImpl = async (args: SLOUpdateArgs) => {
        assert.equal(args.data.target, 300);
        return { id: 's1', ...args.data };
      };

      const result = await SLOService.updateSLO('s1', { target: 300 });
      assert.ok(result);
    });
  });

  describe('deleteSLO', () => {
    it('deletes an SLO', async () => {
      sloDeleteImpl = async (args: SLODeleteArgs) => {
        assert.equal(args.where.id, 's1');
        return { id: 's1' };
      };

      const result = await SLOService.deleteSLO('s1');
      assert.ok(result);
      assert.equal(calls[0].method, 'sLO.delete');
    });
  });

  describe('evaluateSLO', () => {
    it('sets status to met when percentile is within target', async () => {
      sloFindUniqueImpl = async () => ({
        id: 's1',
        organizationId: 'org-1',
        metricName: 'api.response_time',
        target: 200,
        targetPercentile: 99,
        windowDays: 30,
        errorBudget: 1.0,
        status: 'active',
      });
      // All values below 200 → p99 < 200 → met
      telemetryFindManyImpl = async () => {
        return [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => ({ value: v, timestamp: new Date() }));
      };
      sloUpdateImpl = async (args: SLOUpdateArgs) => {
        assert.equal(args.data.status, 'met');
        return { id: 's1', status: 'met' };
      };

      const result = await SLOService.evaluateSLO('s1');
      assert.ok(result);
      assert.equal(result.status, 'met');
    });

    it('sets status to breached when percentile exceeds target', async () => {
      sloFindUniqueImpl = async () => ({
        id: 's1',
        organizationId: 'org-1',
        metricName: 'api.response_time',
        target: 50,
        targetPercentile: 99,
        windowDays: 30,
        errorBudget: 1.0,
        status: 'active',
      });
      // Values exceed 50 → p99 > 50 → breached
      telemetryFindManyImpl = async () => {
        return [100, 200, 300, 400, 500].map((v) => ({ value: v, timestamp: new Date() }));
      };
      sloUpdateImpl = async (args: SLOUpdateArgs) => {
        assert.equal(args.data.status, 'breached');
        return { id: 's1', status: 'breached' };
      };

      const result = await SLOService.evaluateSLO('s1');
      assert.ok(result);
      assert.equal(result.status, 'breached');
    });

    it('calculates error budget usage', async () => {
      sloFindUniqueImpl = async () => ({
        id: 's1',
        organizationId: 'org-1',
        metricName: 'api.response_time',
        target: 100,
        targetPercentile: 99,
        windowDays: 30,
        errorBudget: 0.1, // 10% allowed
        status: 'active',
      });
      // 5 values, 2 exceed 100 → exceedFraction = 0.4 → budgetUsed = 0.4/0.1 = 4 → clamped to 1.0
      telemetryFindManyImpl = async () => {
        return [50, 80, 150, 200, 60].map((v) => ({ value: v, timestamp: new Date() }));
      };
      sloUpdateImpl = async (args: SLOUpdateArgs) => {
        assert.equal(args.data.errorBudgetUsed, 1.0); // clamped
        return { id: 's1', errorBudgetUsed: 1.0 };
      };

      const result = await SLOService.evaluateSLO('s1');
      assert.ok(result);
      assert.equal(result.errorBudgetUsed, 1.0);
    });

    it('returns null when SLO not found', async () => {
      sloFindUniqueImpl = async () => null;

      const result = await SLOService.evaluateSLO('nope');
      assert.equal(result, null);
    });
  });

  describe('getSLOSummary', () => {
    it('aggregates SLO counts and error budget', async () => {
      sloFindManyImpl = async () => ([
        { id: 's1', status: 'met', errorBudgetUsed: 0.3 },
        { id: 's2', status: 'breached', errorBudgetUsed: 1.0 },
        { id: 's3', status: 'active', errorBudgetUsed: 0.5 },
        { id: 's4', status: 'paused', errorBudgetUsed: 0.0 },
      ]);

      const summary = await SLOService.getSLOSummary('org-1');

      assert.equal(summary.total, 4);
      assert.equal(summary.met, 1);
      assert.equal(summary.breached, 1);
      assert.equal(summary.active, 1);
      assert.equal(summary.paused, 1);
      assert.ok(summary.avgErrorBudgetUsed > 0);
    });

    it('returns zero counts on error (safePrisma fallback)', async () => {
      sloFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await SLOService.getSLOSummary('org-1');
      assert.equal(summary.total, 0);
      assert.equal(summary.met, 0);
    });
  });
});
