import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };
type AggregateArgs = { where: Record<string, unknown>; _sum: Record<string, true> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let tsFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let tsFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let tsCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let tsUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let tsDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let tsCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let tsGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];
let tsAggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { totalHours: 0, billableHours: 0 } });

let teFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let teCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  timesheet: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'timesheet.findMany', args }); return tsFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'timesheet.findUnique', args }); return tsFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'timesheet.create', args }); return tsCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'timesheet.update', args }); return tsUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'timesheet.delete', args }); return tsDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'timesheet.count', args }); return tsCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'timesheet.groupBy', args }); return tsGroupByImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'timesheet.aggregate', args }); return tsAggregateImpl(args); },
  },
  timeEntry: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'timeEntry.findMany', args }); return teFindManyImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'timeEntry.create', args }); return teCreateImpl(args); },
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
  tsFindManyImpl = async () => [];
  tsFindUniqueImpl = async () => null;
  tsCreateImpl = async () => ({});
  tsUpdateImpl = async () => ({});
  tsDeleteImpl = async () => ({});
  tsCountImpl = async () => 0;
  tsGroupByImpl = async () => [];
  tsAggregateImpl = async () => ({ _sum: { totalHours: 0, billableHours: 0 } });
  teFindManyImpl = async () => [];
  teCreateImpl = async () => ({});
}

const { TimesheetService } = await import('@/lib/services/timesheet-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TimesheetService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a timesheet with defaults', async () => {
      tsCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.totalHours, 0);
        assert.equal(args.data.billableHours, 0);
        assert.equal(args.data.notes, '');
        return { id: 'ts1', ...args.data };
      };

      const result = await TimesheetService.create('org-1', {
        userId: 'u1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-07'),
      });
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'ts1');
    });

    it('stores workspaceId and notes', async () => {
      tsCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.workspaceId, 'ws1');
        assert.equal(args.data.notes, 'My notes');
        return { id: 'ts1', ...args.data };
      };

      await TimesheetService.create('org-1', {
        userId: 'u1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-07'),
        workspaceId: 'ws1',
        notes: 'My notes',
      });
    });
  });

  describe('get', () => {
    it('returns a timesheet by id', async () => {
      tsFindUniqueImpl = async () => ({ id: 'ts1', status: 'draft' });
      const result = await TimesheetService.get('ts1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'ts1');
    });

    it('returns null when not found', async () => {
      tsFindUniqueImpl = async () => null;
      const result = await TimesheetService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns timesheets for an organization', async () => {
      tsFindManyImpl = async () => [{ id: 'ts1', status: 'draft' }];
      const result = await TimesheetService.list('org-1');
      assert.equal(result.length, 1);
    });

    it('applies userId and status filters', async () => {
      tsFindManyImpl = async () => [];
      await TimesheetService.list('org-1', { userId: 'u1', status: 'approved' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.userId, 'u1');
      assert.equal(args.where.status, 'approved');
    });

    it('applies date range filter', async () => {
      tsFindManyImpl = async () => [];
      await TimesheetService.list('org-1', { dateStart: new Date('2024-01-01'), dateEnd: new Date('2024-01-31') });
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.periodStart);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      tsFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await TimesheetService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      tsUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.notes, 'Updated');
        assert.equal(args.data.status, undefined);
        return { id: 'ts1', ...args.data };
      };
      const result = await TimesheetService.update('ts1', { notes: 'Updated' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes a timesheet', async () => {
      tsDeleteImpl = async () => ({ id: 'ts1' });
      const result = await TimesheetService.delete('ts1');
      assert.ok(result);
      assert.equal(calls[0].method, 'timesheet.delete');
    });
  });

  describe('submit', () => {
    it('sets status to submitted and sets submittedAt', async () => {
      tsUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'submitted');
        assert.ok(args.data.submittedAt);
        return { id: 'ts1', ...args.data };
      };
      const result = await TimesheetService.submit('ts1');
      assert.ok(result);
    });
  });

  describe('approve', () => {
    it('sets status to approved and sets approvedBy', async () => {
      tsUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        assert.equal(args.data.approvedBy, 'mgr1');
        assert.ok(args.data.approvedAt);
        return { id: 'ts1', ...args.data };
      };
      const result = await TimesheetService.approve('ts1', 'mgr1');
      assert.ok(result);
    });
  });

  describe('reject', () => {
    it('sets status to rejected with reason', async () => {
      tsUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'rejected');
        assert.equal(args.data.rejectedReason, 'Missing hours');
        return { id: 'ts1', ...args.data };
      };
      const result = await TimesheetService.reject('ts1', 'mgr1', 'Missing hours');
      assert.ok(result);
    });
  });

  describe('addTimeEntry', () => {
    it('creates a time entry and recalculates totals', async () => {
      tsFindUniqueImpl = async () => ({ id: 'ts1', userId: 'u1', periodStart: new Date('2024-01-01'), periodEnd: new Date('2024-01-07') });
      teCreateImpl = async (args: CreateArgs) => ({ id: 'te1', ...args.data });
      teFindManyImpl = async () => [{ durationSec: 3600, description: 'Work [billable]' }];
      tsUpdateImpl = async (args: UpdateArgs) => ({ id: 'ts1', ...args.data });

      const result = await TimesheetService.addTimeEntry('ts1', {
        taskId: 'task1',
        durationSec: 3600,
        startedAt: new Date('2024-01-02'),
        billable: true,
      });
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'te1');
    });

    it('throws when timesheet not found', async () => {
      tsFindUniqueImpl = async () => null;
      await assert.rejects(() => TimesheetService.addTimeEntry('nope', {
        taskId: 'task1', durationSec: 3600, startedAt: new Date('2024-01-02'),
      }), /timesheet_not_found/);
    });
  });

  describe('recalculateTotals', () => {
    it('recalculates total and billable hours from entries', async () => {
      tsFindUniqueImpl = async () => ({ id: 'ts1', userId: 'u1', periodStart: new Date('2024-01-01'), periodEnd: new Date('2024-01-07') });
      teFindManyImpl = async () => [
        { durationSec: 3600, description: 'Work [billable]' },
        { durationSec: 1800, description: 'Meeting' },
      ];
      tsUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.totalHours, 1.5);
        assert.equal(args.data.billableHours, 1);
        return { id: 'ts1', ...args.data };
      };
      const result = await TimesheetService.recalculateTotals('ts1');
      assert.ok(result);
    });

    it('throws when timesheet not found', async () => {
      tsFindUniqueImpl = async () => null;
      await assert.rejects(() => TimesheetService.recalculateTotals('nope'), /timesheet_not_found/);
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, totalHours, billableHours, avgHoursPerTimesheet', async () => {
      tsCountImpl = async () => 5;
      tsGroupByImpl = async () => [{ status: 'approved', _count: 3 }, { status: 'draft', _count: 2 }];
      tsAggregateImpl = async () => ({ _sum: { totalHours: 100, billableHours: 80 } });

      const result = await TimesheetService.getStats('org-1');
      assert.equal(result.total, 5);
      assert.equal(result.byStatus.approved, 3);
      assert.equal(result.byStatus.draft, 2);
      assert.equal(result.totalHours, 100);
      assert.equal(result.billableHours, 80);
      assert.equal(result.avgHoursPerTimesheet, 20);
    });

    it('returns zero avg when no timesheets', async () => {
      tsCountImpl = async () => 0;
      tsAggregateImpl = async () => ({ _sum: { totalHours: 0, billableHours: 0 } });
      const result = await TimesheetService.getStats('org-1');
      assert.equal(result.avgHoursPerTimesheet, 0);
    });
  });

  describe('getByUser', () => {
    it('returns timesheets for a user', async () => {
      tsFindManyImpl = async () => [{ id: 'ts1', userId: 'u1' }];
      const result = await TimesheetService.getByUser('u1');
      assert.equal(result.length, 1);
    });

    it('applies status filter', async () => {
      tsFindManyImpl = async () => [];
      await TimesheetService.getByUser('u1', { status: 'approved' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'approved');
    });
  });
});
