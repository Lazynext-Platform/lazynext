import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type RetentionPolicyCreateArgs = {
  data: {
    organizationId: string;
    name: string;
    dataType: string;
    retentionDays: number;
    action: string;
    enabled: boolean;
  };
};

type RetentionPolicyFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type RetentionPolicyFindUniqueArgs = {
  where: { id: string };
};

type RetentionPolicyUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type RetentionPolicyDeleteArgs = {
  where: { id: string };
};

type TelemetryDeleteManyArgs = {
  where: { organizationId: string; timestamp: Record<string, unknown> };
};

type TraceDeleteManyArgs = {
  where: { organizationId: string; startedAt: Record<string, unknown> };
};

type SpanDeleteManyArgs = {
  where: { organizationId: string; startTime: Record<string, unknown> };
};

type MetricDeleteManyArgs = {
  where: { organizationId: string; timestamp: Record<string, unknown> };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let policyCreateImpl: (args: RetentionPolicyCreateArgs) => Promise<unknown> = async () => ({});
let policyFindManyImpl: (args: RetentionPolicyFindManyArgs) => Promise<unknown[]> = async () => [];
let policyFindUniqueImpl: (args: RetentionPolicyFindUniqueArgs) => Promise<unknown> = async () => null;
let policyUpdateImpl: (args: RetentionPolicyUpdateArgs) => Promise<unknown> = async () => ({});
let policyDeleteImpl: (args: RetentionPolicyDeleteArgs) => Promise<unknown> = async () => ({});

let telemetryDeleteManyImpl: (args: TelemetryDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });
let traceDeleteManyImpl: (args: TraceDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });
let spanDeleteManyImpl: (args: SpanDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });
let metricDeleteManyImpl: (args: MetricDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });

const prismaMock = {
  retentionPolicy: {
    create: (args: RetentionPolicyCreateArgs): Promise<unknown> => {
      calls.push({ method: 'retentionPolicy.create', args });
      return policyCreateImpl(args);
    },
    findMany: (args: RetentionPolicyFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'retentionPolicy.findMany', args });
      return policyFindManyImpl(args);
    },
    findUnique: (args: RetentionPolicyFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'retentionPolicy.findUnique', args });
      return policyFindUniqueImpl(args);
    },
    update: (args: RetentionPolicyUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'retentionPolicy.update', args });
      return policyUpdateImpl(args);
    },
    delete: (args: RetentionPolicyDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'retentionPolicy.delete', args });
      return policyDeleteImpl(args);
    },
  },
  telemetryPoint: {
    deleteMany: (args: TelemetryDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'telemetryPoint.deleteMany', args });
      return telemetryDeleteManyImpl(args);
    },
  },
  trace: {
    deleteMany: (args: TraceDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'trace.deleteMany', args });
      return traceDeleteManyImpl(args);
    },
  },
  span: {
    deleteMany: (args: SpanDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'span.deleteMany', args });
      return spanDeleteManyImpl(args);
    },
  },
  metric: {
    deleteMany: (args: MetricDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'metric.deleteMany', args });
      return metricDeleteManyImpl(args);
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
  policyCreateImpl = async () => ({});
  policyFindManyImpl = async () => [];
  policyFindUniqueImpl = async () => null;
  policyUpdateImpl = async () => ({});
  policyDeleteImpl = async () => ({});
  telemetryDeleteManyImpl = async () => ({ count: 0 });
  traceDeleteManyImpl = async () => ({ count: 0 });
  spanDeleteManyImpl = async () => ({ count: 0 });
  metricDeleteManyImpl = async () => ({ count: 0 });
}

const { RetentionService } = await import('@/lib/services/retention-service');

// ─────────────────────────────────────────────────────────────────────────────
// RetentionService
// ─────────────────────────────────────────────────────────────────────────────

describe('RetentionService', () => {
  beforeEach(() => { resetMock(); });

  describe('createPolicy', () => {
    it('creates a retention policy with defaults', async () => {
      policyCreateImpl = async (args: RetentionPolicyCreateArgs) => {
        assert.equal(args.data.retentionDays, 30);
        assert.equal(args.data.action, 'delete');
        assert.equal(args.data.enabled, true);
        return { id: 'rp1', ...args.data };
      };

      const result = await RetentionService.createPolicy('org-1', {
        name: 'Telemetry Retention',
        dataType: 'telemetry',
      });

      assert.ok(result);
      assert.equal(result.id, 'rp1');
      assert.equal(calls[0].method, 'retentionPolicy.create');
    });

    it('passes through custom values', async () => {
      policyCreateImpl = async (args: RetentionPolicyCreateArgs) => {
        assert.equal(args.data.retentionDays, 90);
        assert.equal(args.data.action, 'archive');
        assert.equal(args.data.enabled, false);
        return { id: 'rp1', ...args.data };
      };

      await RetentionService.createPolicy('org-1', {
        name: 'Long Retention',
        dataType: 'traces',
        retentionDays: 90,
        action: 'archive',
        enabled: false,
      });
    });
  });

  describe('listPolicies', () => {
    it('lists policies for an organization', async () => {
      policyFindManyImpl = async () => ([{ id: 'rp1', name: 'Policy 1' }]);

      const result = await RetentionService.listPolicies('org-1');

      assert.equal(result.length, 1);
      const args = calls[0].args as RetentionPolicyFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      policyFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await RetentionService.listPolicies('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getPolicy', () => {
    it('returns a policy by id', async () => {
      policyFindUniqueImpl = async () => ({ id: 'rp1', name: 'Policy 1' });

      const result = await RetentionService.getPolicy('rp1');
      assert.ok(result);
      assert.equal(result.id, 'rp1');
    });

    it('returns null when policy not found', async () => {
      policyFindUniqueImpl = async () => null;

      const result = await RetentionService.getPolicy('nope');
      assert.equal(result, null);
    });
  });

  describe('updatePolicy', () => {
    it('updates only provided fields', async () => {
      policyUpdateImpl = async (args: RetentionPolicyUpdateArgs) => {
        assert.equal(args.data.retentionDays, 60);
        return { id: 'rp1', ...args.data };
      };

      const result = await RetentionService.updatePolicy('rp1', { retentionDays: 60 });
      assert.ok(result);
    });
  });

  describe('deletePolicy', () => {
    it('deletes a policy', async () => {
      policyDeleteImpl = async (args: RetentionPolicyDeleteArgs) => {
        assert.equal(args.where.id, 'rp1');
        return { id: 'rp1' };
      };

      const result = await RetentionService.deletePolicy('rp1');
      assert.ok(result);
      assert.equal(calls[0].method, 'retentionPolicy.delete');
    });
  });

  describe('runRetention', () => {
    it('executes enabled policies and deletes old data', async () => {
      policyFindManyImpl = async () => ([
        { id: 'rp1', organizationId: 'org-1', name: 'Telemetry', dataType: 'telemetry', retentionDays: 30, enabled: true },
        { id: 'rp2', organizationId: 'org-1', name: 'Traces', dataType: 'traces', retentionDays: 14, enabled: true },
      ]);
      telemetryDeleteManyImpl = async () => ({ count: 50 });
      traceDeleteManyImpl = async () => ({ count: 10 });
      spanDeleteManyImpl = async () => ({ count: 5 });
      policyUpdateImpl = async () => ({});

      const result = await RetentionService.runRetention('org-1');

      assert.equal(result.policiesRun, 2);
      assert.equal(result.deleted.telemetry, 50);
      assert.equal(result.deleted.traces, 10);
      // lastRunAt should be updated
      const updateCalls = calls.filter((c) => c.method === 'retentionPolicy.update');
      assert.equal(updateCalls.length, 2);
    });

    it('skips disabled policies', async () => {
      policyFindManyImpl = async () => ([
        { id: 'rp1', organizationId: 'org-1', name: 'Telemetry', dataType: 'telemetry', retentionDays: 30, enabled: false },
      ]);

      const result = await RetentionService.runRetention('org-1');

      assert.equal(result.policiesRun, 0);
      const deleteCalls = calls.filter((c) => c.method === 'telemetryPoint.deleteMany');
      assert.equal(deleteCalls.length, 0);
    });

    it('handles empty policies', async () => {
      policyFindManyImpl = async () => [];

      const result = await RetentionService.runRetention('org-1');

      assert.equal(result.policiesRun, 0);
      assert.deepEqual(result.deleted, {});
    });
  });

  describe('getRetentionSummary', () => {
    it('summarizes policies with counts and last run', async () => {
      const lastRun = new Date('2024-01-15');
      policyFindManyImpl = async () => ([
        { id: 'rp1', dataType: 'telemetry', enabled: true, lastRunAt: lastRun },
        { id: 'rp2', dataType: 'traces', enabled: true, lastRunAt: null },
        { id: 'rp3', dataType: 'spans', enabled: false, lastRunAt: null },
      ]);

      const summary = await RetentionService.getRetentionSummary('org-1');

      assert.equal(summary.total, 3);
      assert.equal(summary.enabled, 2);
      assert.equal(summary.byDataType.telemetry, 1);
      assert.equal(summary.byDataType.traces, 1);
      assert.equal(summary.byDataType.spans, 1);
      assert.equal(summary.lastRunAt, lastRun);
    });

    it('returns zero counts on error (safePrisma fallback)', async () => {
      policyFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await RetentionService.getRetentionSummary('org-1');
      assert.equal(summary.total, 0);
      assert.equal(summary.enabled, 0);
      assert.equal(summary.lastRunAt, null);
    });
  });
});
