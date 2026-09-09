import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: unknown;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
  select?: unknown;
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

type TaskFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type InvoiceFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type ExpenseFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type ProjectFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> = async () => ({});

let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> = async () => [];
let invoiceFindManyImpl: (args: InvoiceFindManyArgs) => Promise<unknown[]> = async () => [];
let expenseFindManyImpl: (args: ExpenseFindManyArgs) => Promise<unknown[]> = async () => [];
let projectFindManyImpl: (args: ProjectFindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  task: {
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
  },
  invoice: {
    findMany: (args: InvoiceFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'invoice.findMany', args });
      return invoiceFindManyImpl(args);
    },
  },
  expense: {
    findMany: (args: ExpenseFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'expense.findMany', args });
      return expenseFindManyImpl(args);
    },
  },
  project: {
    findMany: (args: ProjectFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
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
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  taskFindManyImpl = async () => [];
  invoiceFindManyImpl = async () => [];
  expenseFindManyImpl = async () => [];
  projectFindManyImpl = async () => [];
}

function makeReportRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'custom_report',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { ReportBuilderService } = await import('@/lib/services/report-builder-service');

// ─────────────────────────────────────────────────────────────────────────────
// ReportBuilderService
// ─────────────────────────────────────────────────────────────────────────────

describe('ReportBuilderService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a report with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'custom_report');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'My Report');
        assert.equal(content.dataSource, 'tasks');
        assert.equal(content.schedule, 'none');
        assert.equal(content.format, 'csv');
        assert.equal(content.isPublic, false);
        assert.deepEqual(content.columns, []);
        assert.deepEqual(content.filters, []);
        assert.deepEqual(content.executions, []);
        return makeReportRow('r-1', content);
      };

      const report = await ReportBuilderService.create('org-1', {
        name: 'My Report',
        dataSource: 'tasks',
        createdBy: 'user-1',
      });

      assert.ok(report);
      assert.equal(report.id, 'r-1');
      assert.equal(report.name, 'My Report');
      assert.equal(report.dataSource, 'tasks');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a report with custom schedule and format', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.schedule, 'weekly');
        assert.equal(content.format, 'json');
        return makeReportRow('r-2', content);
      };

      const report = await ReportBuilderService.create('org-1', {
        name: 'Weekly Report',
        dataSource: 'invoices',
        schedule: 'weekly',
        format: 'json',
        createdBy: 'user-1',
      });

      assert.equal(report.schedule, 'weekly');
      assert.equal(report.format, 'json');
    });
  });

  describe('get', () => {
    it('returns a report by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeReportRow('r-1', {
          name: 'Test', description: '', dataSource: 'tasks', columns: [], filters: [],
          groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' },
          schedule: 'none', format: 'csv', isPublic: false, executions: [],
        });

      const report = await ReportBuilderService.get('r-1');

      assert.ok(report);
      assert.equal(report.id, 'r-1');
      assert.equal(report.name, 'Test');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when report not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const report = await ReportBuilderService.get('nope');
      assert.equal(report, null);
    });
  });

  describe('list', () => {
    it('returns reports for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeReportRow('r-1', { name: 'A', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] }),
        makeReportRow('r-2', { name: 'B', description: '', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'daily', format: 'json', isPublic: false, executions: [] }),
      ];

      const reports = await ReportBuilderService.list('org-1');

      assert.equal(reports.length, 2);
      assert.equal(reports[0].id, 'r-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by dataSource', async () => {
      memoryFindManyImpl = async () => [
        makeReportRow('r-1', { name: 'A', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] }),
        makeReportRow('r-2', { name: 'B', description: '', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] }),
      ];

      const reports = await ReportBuilderService.list('org-1', { dataSource: 'invoices' });

      assert.equal(reports.length, 1);
      assert.equal(reports[0].dataSource, 'invoices');
    });

    it('filters by schedule', async () => {
      memoryFindManyImpl = async () => [
        makeReportRow('r-1', { name: 'A', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'daily', format: 'csv', isPublic: false, executions: [] }),
        makeReportRow('r-2', { name: 'B', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] }),
      ];

      const reports = await ReportBuilderService.list('org-1', { schedule: 'daily' });

      assert.equal(reports.length, 1);
      assert.equal(reports[0].schedule, 'daily');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeReportRow('r-1', { name: 'Revenue Report', description: '', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] }),
        makeReportRow('r-2', { name: 'Task Report', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] }),
      ];

      const reports = await ReportBuilderService.list('org-1', { search: 'revenue' });

      assert.equal(reports.length, 1);
      assert.equal(reports[0].name, 'Revenue Report');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const reports = await ReportBuilderService.list('org-1');
      assert.deepEqual(reports, []);
    });
  });

  describe('update', () => {
    it('updates report name and description', async () => {
      memoryFindUniqueImpl = async () =>
        makeReportRow('r-1', { name: 'old', description: 'old desc', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'new');
        assert.equal(content.description, 'new desc');
        return makeReportRow('r-1', content);
      };

      const report = await ReportBuilderService.update('r-1', {
        name: 'new',
        description: 'new desc',
      });

      assert.ok(report);
      assert.equal(report.name, 'new');
    });

    it('returns null when report not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const report = await ReportBuilderService.update('nope', { name: 'x' });
      assert.equal(report, null);
    });
  });

  describe('delete', () => {
    it('deletes a report', async () => {
      memoryDeleteImpl = async () => ({ id: 'r-1' });

      const result = await ReportBuilderService.delete('r-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await ReportBuilderService.delete('r-1');
      assert.equal(result, false);
    });
  });

  describe('duplicate', () => {
    it('creates a copy with (Copy) suffix', async () => {
      memoryFindUniqueImpl = async () =>
        makeReportRow('r-1', { name: 'Original', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] });
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'Original (Copy)');
        assert.deepEqual(content.executions, []);
        return makeReportRow('r-2', content);
      };

      const report = await ReportBuilderService.duplicate('r-1', 'user-2');

      assert.ok(report);
      assert.equal(report.id, 'r-2');
      assert.equal(report.name, 'Original (Copy)');
    });

    it('returns null when report not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const report = await ReportBuilderService.duplicate('nope', 'user-1');
      assert.equal(report, null);
    });
  });

  describe('execute', () => {
    it('executes a tasks data source report', async () => {
      memoryFindUniqueImpl = async () =>
        makeReportRow('r-1', {
          name: 'Task Report', description: '', dataSource: 'tasks',
          columns: [{ field: 'title', label: 'Title' }],
          filters: [], groupBy: [],
          orderBy: { field: 'createdAt', direction: 'desc' },
          schedule: 'none', format: 'csv', isPublic: false, executions: [],
        });
      taskFindManyImpl = async () => [
        { id: 't-1', title: 'Task A', createdAt: new Date('2025-01-01') },
        { id: 't-2', title: 'Task B', createdAt: new Date('2025-01-02') },
      ];
      memoryUpdateImpl = async () => ({ id: 'r-1' });

      const result = await ReportBuilderService.execute('r-1', 'user-1');

      assert.ok(result);
      assert.equal(result.reportId, 'r-1');
      assert.equal(result.totalCount, 2);
      assert.equal(result.rows[0].Title, 'Task A');
    });

    it('executes an invoices data source report', async () => {
      memoryFindUniqueImpl = async () =>
        makeReportRow('r-1', {
          name: 'Invoice Report', description: '', dataSource: 'invoices',
          columns: [{ field: 'number', label: 'Number' }, { field: 'total', label: 'Total' }],
          filters: [], groupBy: [],
          orderBy: { field: 'createdAt', direction: 'desc' },
          schedule: 'none', format: 'csv', isPublic: false, executions: [],
        });
      invoiceFindManyImpl = async () => [
        { id: 'inv-1', number: 'INV-2025-0001', total: 1000, createdAt: new Date('2025-01-01') },
      ];
      memoryUpdateImpl = async () => ({ id: 'r-1' });

      const result = await ReportBuilderService.execute('r-1', 'user-1');

      assert.ok(result);
      assert.equal(result.totalCount, 1);
      assert.equal(result.rows[0].Number, 'INV-2025-0001');
      assert.equal(result.rows[0].Total, 1000);
    });

    it('returns null when report not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await ReportBuilderService.execute('nope', 'user-1');
      assert.equal(result, null);
    });
  });

  describe('getStats', () => {
    it('aggregates report stats', async () => {
      memoryFindManyImpl = async () => [
        makeReportRow('r-1', { name: 'A', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'daily', format: 'csv', isPublic: false, executions: [{ id: 'e1', executedAt: new Date(), rowCount: 10, durationMs: 100, executedBy: 'u1' }] }),
        makeReportRow('r-2', { name: 'B', description: '', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isPublic: false, executions: [] }),
        makeReportRow('r-3', { name: 'C', description: '', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'weekly', format: 'csv', isPublic: false, executions: [{ id: 'e2', executedAt: new Date(), rowCount: 5, durationMs: 50, executedBy: 'u1' }] }),
      ];

      const stats = await ReportBuilderService.getStats('org-1');

      assert.equal(stats.totalReports, 3);
      assert.equal(stats.byDataSource.tasks, 2);
      assert.equal(stats.byDataSource.invoices, 1);
      assert.equal(stats.bySchedule.daily, 1);
      assert.equal(stats.bySchedule.weekly, 1);
      assert.equal(stats.totalExecutions, 2);
      assert.equal(stats.scheduledReports, 2);
    });

    it('returns zero stats when no reports', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await ReportBuilderService.getStats('org-1');

      assert.equal(stats.totalReports, 0);
      assert.equal(stats.scheduledReports, 0);
    });
  });
});
