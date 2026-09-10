import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type TimeOffFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type TimeOffFindUniqueArgs = {
  where: { id: string };
};

type TimeOffCreateArgs = {
  data: Record<string, unknown>;
};

type TimeOffUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let timeOffFindManyImpl: (args: TimeOffFindManyArgs) => Promise<unknown[]> =
  async () => [];
let timeOffFindUniqueImpl: (args: TimeOffFindUniqueArgs) => Promise<unknown> =
  async () => null;
let timeOffCreateImpl: (args: TimeOffCreateArgs) => Promise<unknown> =
  async () => ({});
let timeOffUpdateImpl: (args: TimeOffUpdateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  timeOffRequest: {
    findMany: (args: TimeOffFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'timeOffRequest.findMany', args });
      return timeOffFindManyImpl(args);
    },
    findUnique: (args: TimeOffFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'timeOffRequest.findUnique', args });
      return timeOffFindUniqueImpl(args);
    },
    create: (args: TimeOffCreateArgs): Promise<unknown> => {
      calls.push({ method: 'timeOffRequest.create', args });
      return timeOffCreateImpl(args);
    },
    update: (args: TimeOffUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'timeOffRequest.update', args });
      return timeOffUpdateImpl(args);
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
  timeOffFindManyImpl = async () => [];
  timeOffFindUniqueImpl = async () => null;
  timeOffCreateImpl = async () => ({});
  timeOffUpdateImpl = async () => ({});
}

const { TimeOffService } = await import('@/lib/services/time-off-service');

// ─────────────────────────────────────────────────────────────────────────────
// TimeOffService
// ─────────────────────────────────────────────────────────────────────────────

describe('TimeOffService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a time-off request with default type and status', async () => {
      timeOffCreateImpl = async (args: TimeOffCreateArgs) => {
        assert.equal(args.data.type, 'vacation');
        assert.equal(args.data.status, 'pending');
        return { id: 't1', ...args.data };
      };

      const start = new Date('2024-06-01');
      const end = new Date('2024-06-05');
      const result = await TimeOffService.create({
        organizationId: 'org-1',
        employeeId: 'e1',
        startDate: start,
        endDate: end,
      });

      assert.ok(result);
      assert.equal(result.id, 't1');
    });

    it('calculates days from start and end dates', async () => {
      timeOffCreateImpl = async (args: TimeOffCreateArgs) => {
        assert.equal(args.data.days, 5);
        return { id: 't1', days: args.data.days };
      };

      await TimeOffService.create({
        organizationId: 'org-1',
        employeeId: 'e1',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-05'),
      });
    });
  });

  describe('get', () => {
    it('returns a request by id', async () => {
      timeOffFindUniqueImpl = async () => ({ id: 't1', type: 'vacation' });

      const result = await TimeOffService.get('t1');
      assert.ok(result);
      assert.equal(result.id, 't1');
    });

    it('returns null when not found', async () => {
      timeOffFindUniqueImpl = async () => null;

      const result = await TimeOffService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error', async () => {
      timeOffFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await TimeOffService.get('t1');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns requests for an organization', async () => {
      timeOffFindManyImpl = async () => ([{ id: 't1' }]);

      const result = await TimeOffService.list('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as TimeOffFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies employeeId, status, and type filters', async () => {
      timeOffFindManyImpl = async () => [];

      await TimeOffService.list('org-1', { employeeId: 'e1', status: 'pending', type: 'sick' });

      const args = calls[0].args as TimeOffFindManyArgs;
      assert.equal(args.where.employeeId, 'e1');
      assert.equal(args.where.status, 'pending');
      assert.equal(args.where.type, 'sick');
    });

    it('applies date range filter', async () => {
      timeOffFindManyImpl = async () => [];

      await TimeOffService.list('org-1', { dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') } });

      const args = calls[0].args as TimeOffFindManyArgs;
      assert.ok(args.where.startDate);
      assert.ok(args.where.endDate);
    });

    it('returns empty array on error', async () => {
      timeOffFindManyImpl = async () => { throw new Error('fail'); };

      const result = await TimeOffService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('approve', () => {
    it('sets status to approved with approver and timestamp', async () => {
      timeOffUpdateImpl = async (args: TimeOffUpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        assert.equal(args.data.approverId, 'u1');
        assert.ok(args.data.approvedAt instanceof Date);
        return { id: 't1', status: 'approved' };
      };

      const result = await TimeOffService.approve('t1', 'u1');
      assert.ok(result);
    });
  });

  describe('deny', () => {
    it('sets status to denied with approver', async () => {
      timeOffUpdateImpl = async (args: TimeOffUpdateArgs) => {
        assert.equal(args.data.status, 'denied');
        assert.equal(args.data.approverId, 'u1');
        return { id: 't1', status: 'denied' };
      };

      await TimeOffService.deny('t1', 'u1');
    });
  });

  describe('cancel', () => {
    it('sets status to cancelled', async () => {
      timeOffUpdateImpl = async (args: TimeOffUpdateArgs) => {
        assert.equal(args.data.status, 'cancelled');
        return { id: 't1', status: 'cancelled' };
      };

      await TimeOffService.cancel('t1');
    });
  });

  describe('getByEmployee', () => {
    it('returns requests for an employee', async () => {
      timeOffFindManyImpl = async () => ([{ id: 't1' }, { id: 't2' }]);

      const result = await TimeOffService.getByEmployee('e1');
      assert.equal(result.length, 2);
      const args = calls[0].args as TimeOffFindManyArgs;
      assert.equal(args.where.employeeId, 'e1');
    });

    it('returns empty array on error', async () => {
      timeOffFindManyImpl = async () => { throw new Error('fail'); };

      const result = await TimeOffService.getByEmployee('e1');
      assert.deepEqual(result, []);
    });
  });

  describe('getBalance', () => {
    it('calculates used, remaining, and byType from approved requests', async () => {
      timeOffFindManyImpl = async () => ([
        { days: 3, type: 'vacation' },
        { days: 2, type: 'sick' },
      ]);

      const balance = await TimeOffService.getBalance('e1', 20);
      assert.equal(balance.allowance, 20);
      assert.equal(balance.used, 5);
      assert.equal(balance.remaining, 15);
      assert.equal(balance.byType.vacation, 3);
      assert.equal(balance.byType.sick, 2);
    });

    it('returns full allowance when no approved requests', async () => {
      timeOffFindManyImpl = async () => [];

      const balance = await TimeOffService.getBalance('e1', 20);
      assert.equal(balance.used, 0);
      assert.equal(balance.remaining, 20);
    });
  });

  describe('getStats', () => {
    it('aggregates time-off stats', async () => {
      timeOffFindManyImpl = async () => ([
        { status: 'pending', type: 'vacation', days: 3 },
        { status: 'approved', type: 'vacation', days: 5 },
        { status: 'denied', type: 'sick', days: 1 },
      ]);

      const stats = await TimeOffService.getStats('org-1');
      assert.equal(stats.total, 3);
      assert.equal(stats.pending, 1);
      assert.equal(stats.approved, 1);
      assert.equal(stats.denied, 1);
      assert.equal(stats.totalDays, 9);
    });

    it('returns zero stats on error', async () => {
      timeOffFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await TimeOffService.getStats('org-1');
      assert.equal(stats.total, 0);
    });
  });
});
