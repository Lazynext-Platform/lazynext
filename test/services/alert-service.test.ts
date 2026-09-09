import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type AlertCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    description: string;
    severity: string;
    status: string;
    source: string;
    metricName: string | null;
    condition: string;
    threshold: number | null;
    metadata: string;
  };
};

type AlertFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};

type AlertFindUniqueArgs = {
  where: { id: string };
};

type AlertUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
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

let alertCreateImpl: (args: AlertCreateArgs) => Promise<unknown> = async () => ({});
let alertFindManyImpl: (args: AlertFindManyArgs) => Promise<unknown[]> = async () => [];
let alertFindUniqueImpl: (args: AlertFindUniqueArgs) => Promise<unknown> = async () => null;
let alertUpdateImpl: (args: AlertUpdateArgs) => Promise<unknown> = async () => ({});

let telemetryFindManyImpl: (args: TelemetryFindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  alert: {
    create: (args: AlertCreateArgs): Promise<unknown> => {
      calls.push({ method: 'alert.create', args });
      return alertCreateImpl(args);
    },
    findMany: (args: AlertFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'alert.findMany', args });
      return alertFindManyImpl(args);
    },
    findUnique: (args: AlertFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'alert.findUnique', args });
      return alertFindUniqueImpl(args);
    },
    update: (args: AlertUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'alert.update', args });
      return alertUpdateImpl(args);
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
  alertCreateImpl = async () => ({});
  alertFindManyImpl = async () => [];
  alertFindUniqueImpl = async () => null;
  alertUpdateImpl = async () => ({});
  telemetryFindManyImpl = async () => [];
}

const { AlertService } = await import('@/lib/services/alert-service');

// ─────────────────────────────────────────────────────────────────────────────
// AlertService
// ─────────────────────────────────────────────────────────────────────────────

describe('AlertService', () => {
  beforeEach(() => { resetMock(); });

  describe('createAlert', () => {
    it('creates an alert with defaults', async () => {
      alertCreateImpl = async (args: AlertCreateArgs) => {
        assert.equal(args.data.severity, 'warning');
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.source, 'system');
        assert.equal(args.data.condition, '{}');
        return { id: 'a1', ...args.data };
      };

      const result = await AlertService.createAlert('org-1', { name: 'High Latency' });

      assert.ok(result);
      assert.equal(result.id, 'a1');
      assert.equal(calls[0].method, 'alert.create');
    });

    it('serializes condition to JSON', async () => {
      alertCreateImpl = async (args: AlertCreateArgs) => {
        assert.ok(args.data.condition.includes('"operator"'));
        assert.ok(args.data.condition.includes('"threshold"'));
        return { id: 'a1' };
      };

      await AlertService.createAlert('org-1', {
        name: 'High Latency',
        condition: { operator: 'gt', threshold: 500, window: 5 },
      });
    });
  });

  describe('listAlerts', () => {
    it('lists alerts for an organization', async () => {
      alertFindManyImpl = async () => ([{ id: 'a1', name: 'Alert 1' }]);

      const result = await AlertService.listAlerts('org-1');

      assert.equal(result.length, 1);
      const args = calls[0].args as AlertFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status and severity filters', async () => {
      alertFindManyImpl = async () => [];

      await AlertService.listAlerts('org-1', { status: 'active', severity: 'critical' });

      const args = calls[0].args as AlertFindManyArgs;
      assert.equal(args.where.status, 'active');
      assert.equal(args.where.severity, 'critical');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      alertFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await AlertService.listAlerts('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getAlert', () => {
    it('returns an alert by id', async () => {
      alertFindUniqueImpl = async () => ({ id: 'a1', name: 'Alert 1' });

      const result = await AlertService.getAlert('a1');

      assert.ok(result);
      assert.equal(result.id, 'a1');
    });

    it('returns null when alert not found', async () => {
      alertFindUniqueImpl = async () => null;

      const result = await AlertService.getAlert('nope');
      assert.equal(result, null);
    });
  });

  describe('updateAlert', () => {
    it('updates only provided fields', async () => {
      alertUpdateImpl = async (args: AlertUpdateArgs) => {
        assert.equal(args.data.name, 'New Name');
        assert.equal(args.data.severity, 'critical');
        return { id: 'a1', ...args.data };
      };

      const result = await AlertService.updateAlert('a1', { name: 'New Name', severity: 'critical' });
      assert.ok(result);
      assert.equal(calls[0].method, 'alert.update');
    });
  });

  describe('evaluateAlert', () => {
    it('sets status to active and increments triggerCount when condition met', async () => {
      alertFindUniqueImpl = async () => ({
        id: 'a1',
        organizationId: 'org-1',
        metricName: 'api.response_time',
        condition: JSON.stringify({ operator: 'gt', threshold: 100, window: 5 }),
        threshold: 100,
        status: 'pending',
      });
      telemetryFindManyImpl = async () => {
        // lastValue = 200 which is > 100
        return [{ value: 200, timestamp: new Date() }];
      };
      alertUpdateImpl = async (args: AlertUpdateArgs) => {
        assert.equal(args.data.status, 'active');
        assert.deepEqual(args.data.triggerCount, { increment: 1 });
        assert.ok(args.data.lastTriggeredAt);
        return { id: 'a1', status: 'active', triggerCount: 1 };
      };

      const result = await AlertService.evaluateAlert('a1');

      assert.ok(result);
      assert.equal(result.status, 'active');
    });

    it('sets status to resolved when condition not met and was active', async () => {
      alertFindUniqueImpl = async () => ({
        id: 'a1',
        organizationId: 'org-1',
        metricName: 'api.response_time',
        condition: JSON.stringify({ operator: 'gt', threshold: 500, window: 5 }),
        threshold: 500,
        status: 'active',
      });
      telemetryFindManyImpl = async () => {
        // lastValue = 50 which is < 500
        return [{ value: 50, timestamp: new Date() }];
      };
      alertUpdateImpl = async (args: AlertUpdateArgs) => {
        assert.equal(args.data.status, 'resolved');
        assert.ok(args.data.resolvedAt);
        return { id: 'a1', status: 'resolved' };
      };

      const result = await AlertService.evaluateAlert('a1');

      assert.ok(result);
      assert.equal(result.status, 'resolved');
    });

    it('returns null when alert not found', async () => {
      alertFindUniqueImpl = async () => null;

      const result = await AlertService.evaluateAlert('nope');
      assert.equal(result, null);
    });

    it('returns alert unchanged when no metricName', async () => {
      alertFindUniqueImpl = async () => ({
        id: 'a1',
        organizationId: 'org-1',
        metricName: null,
        condition: '{}',
        status: 'active',
      });

      const result = await AlertService.evaluateAlert('a1');
      assert.ok(result);
      // No update should be called
      const updateCalls = calls.filter((c) => c.method === 'alert.update');
      assert.equal(updateCalls.length, 0);
    });
  });

  describe('evaluateAllAlerts', () => {
    it('evaluates all active alerts', async () => {
      alertFindManyImpl = async () => ([
        { id: 'a1', organizationId: 'org-1', metricName: 'm1', condition: '{"operator":"gt","threshold":100}', status: 'active' },
        { id: 'a2', organizationId: 'org-1', metricName: 'm2', condition: '{"operator":"gt","threshold":200}', status: 'active' },
      ]);
      alertFindUniqueImpl = async (args: AlertFindUniqueArgs) => {
        if (args.where.id === 'a1') return { id: 'a1', organizationId: 'org-1', metricName: 'm1', condition: '{"operator":"gt","threshold":100}', status: 'active' };
        return { id: 'a2', organizationId: 'org-1', metricName: 'm2', condition: '{"operator":"gt","threshold":200}', status: 'active' };
      };
      telemetryFindManyImpl = async () => [{ value: 50, timestamp: new Date() }];
      alertUpdateImpl = async (args: AlertUpdateArgs) => ({ id: args.where.id, status: 'resolved' });

      const results = await AlertService.evaluateAllAlerts('org-1');

      assert.equal(results.length, 2);
    });
  });

  describe('acknowledgeAlert', () => {
    it('sets acknowledgedBy', async () => {
      alertUpdateImpl = async (args: AlertUpdateArgs) => {
        assert.equal(args.data.acknowledgedBy, 'user-1');
        return { id: 'a1', acknowledgedBy: 'user-1' };
      };

      const result = await AlertService.acknowledgeAlert('a1', 'user-1');
      assert.ok(result);
    });
  });

  describe('resolveAlert', () => {
    it('sets status to resolved', async () => {
      alertUpdateImpl = async (args: AlertUpdateArgs) => {
        assert.equal(args.data.status, 'resolved');
        assert.ok(args.data.resolvedAt);
        return { id: 'a1', status: 'resolved' };
      };

      const result = await AlertService.resolveAlert('a1');
      assert.ok(result);
      assert.equal(result.status, 'resolved');
    });
  });

  describe('suppressAlert', () => {
    it('sets status to suppressed', async () => {
      alertUpdateImpl = async (args: AlertUpdateArgs) => {
        assert.equal(args.data.status, 'suppressed');
        return { id: 'a1', status: 'suppressed' };
      };

      const result = await AlertService.suppressAlert('a1', 60000);
      assert.ok(result);
      assert.equal(result.status, 'suppressed');
    });
  });

  describe('getAlertSummary', () => {
    it('aggregates counts by status and severity', async () => {
      alertFindManyImpl = async () => ([
        { id: 'a1', status: 'active', severity: 'critical', lastTriggeredAt: new Date() },
        { id: 'a2', status: 'active', severity: 'warning', lastTriggeredAt: null },
        { id: 'a3', status: 'resolved', severity: 'info', lastTriggeredAt: null },
      ]);

      const summary = await AlertService.getAlertSummary('org-1');

      assert.equal(summary.total, 3);
      assert.equal(summary.activeCount, 2);
      assert.equal(summary.criticalCount, 1);
      assert.equal(summary.warningCount, 1);
      assert.equal(summary.resolvedCount, 1);
      assert.equal(summary.byStatus.active, 2);
      assert.equal(summary.byStatus.resolved, 1);
      assert.equal(summary.bySeverity.critical, 1);
      assert.equal(summary.recentTriggers, 1);
    });

    it('returns zero counts on error (safePrisma fallback)', async () => {
      alertFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await AlertService.getAlertSummary('org-1');
      assert.equal(summary.total, 0);
      assert.equal(summary.activeCount, 0);
    });
  });
});
