import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: { type?: string; organizationId?: string; workspaceId?: string };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type MemoryFindUniqueArgs = { where: { id: string } };
type MemoryCreateArgs = { data: Record<string, unknown> };
type MemoryUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type MemoryDeleteArgs = { where: { id: string } };

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
}

function makeTemplateRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'report_template',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { ReportTemplateService } = await import('@/lib/services/report-template-service');

// ─────────────────────────────────────────────────────────────────────────────
// ReportTemplateService
// ─────────────────────────────────────────────────────────────────────────────

describe('ReportTemplateService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a template with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'report_template');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'Sales Template');
        assert.equal(content.category, 'general');
        assert.equal(content.dataSource, 'invoices');
        assert.equal(content.isBuiltIn, false);
        assert.equal(content.icon, 'BarChart3');
        assert.deepEqual(content.tags, []);
        return makeTemplateRow('t-1', content);
      };

      const template = await ReportTemplateService.create('org-1', {
        name: 'Sales Template',
        dataSource: 'invoices',
        createdBy: 'user-1',
      });

      assert.ok(template);
      assert.equal(template.id, 't-1');
      assert.equal(template.name, 'Sales Template');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a built-in template with custom icon and tags', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.isBuiltIn, true);
        assert.equal(content.icon, 'TrendingUp');
        assert.deepEqual(content.tags, ['finance', 'monthly']);
        return makeTemplateRow('t-2', content);
      };

      const template = await ReportTemplateService.create('org-1', {
        name: 'Monthly Revenue',
        dataSource: 'invoices',
        category: 'finance',
        isBuiltIn: true,
        icon: 'TrendingUp',
        tags: ['finance', 'monthly'],
        createdBy: 'user-1',
      });

      assert.equal(template.isBuiltIn, true);
      assert.equal(template.icon, 'TrendingUp');
      assert.deepEqual(template.tags, ['finance', 'monthly']);
    });
  });

  describe('get', () => {
    it('returns a template by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeTemplateRow('t-1', { name: 'Test', description: '', category: 'general', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] });

      const template = await ReportTemplateService.get('t-1');

      assert.ok(template);
      assert.equal(template.id, 't-1');
      assert.equal(template.name, 'Test');
    });

    it('returns null when template not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const template = await ReportTemplateService.get('nope');
      assert.equal(template, null);
    });
  });

  describe('list', () => {
    it('returns templates for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeTemplateRow('t-1', { name: 'A', description: '', category: 'general', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] }),
        makeTemplateRow('t-2', { name: 'B', description: '', category: 'finance', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: true, icon: 'BarChart3', tags: [] }),
      ];

      const templates = await ReportTemplateService.list('org-1');

      assert.equal(templates.length, 2);
      assert.equal(templates[0].id, 't-1');
    });

    it('filters by category', async () => {
      memoryFindManyImpl = async () => [
        makeTemplateRow('t-1', { name: 'A', description: '', category: 'general', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] }),
        makeTemplateRow('t-2', { name: 'B', description: '', category: 'finance', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] }),
      ];

      const templates = await ReportTemplateService.list('org-1', { category: 'finance' });

      assert.equal(templates.length, 1);
      assert.equal(templates[0].category, 'finance');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeTemplateRow('t-1', { name: 'Revenue Template', description: '', category: 'finance', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] }),
        makeTemplateRow('t-2', { name: 'Task Template', description: '', category: 'general', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] }),
      ];

      const templates = await ReportTemplateService.list('org-1', { search: 'revenue' });

      assert.equal(templates.length, 1);
      assert.equal(templates[0].name, 'Revenue Template');
    });
  });

  describe('update', () => {
    it('updates template name and category', async () => {
      memoryFindUniqueImpl = async () =>
        makeTemplateRow('t-1', { name: 'old', description: '', category: 'general', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'new');
        assert.equal(content.category, 'finance');
        return makeTemplateRow('t-1', content);
      };

      const template = await ReportTemplateService.update('t-1', {
        name: 'new',
        category: 'finance',
      });

      assert.ok(template);
      assert.equal(template.name, 'new');
      assert.equal(template.category, 'finance');
    });

    it('returns null when template not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const template = await ReportTemplateService.update('nope', { name: 'x' });
      assert.equal(template, null);
    });
  });

  describe('delete', () => {
    it('deletes a template', async () => {
      memoryDeleteImpl = async () => ({ id: 't-1' });

      const result = await ReportTemplateService.delete('t-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await ReportTemplateService.delete('t-1');
      assert.equal(result, false);
    });
  });

  describe('instantiate', () => {
    it('returns a report definition from a template', async () => {
      memoryFindUniqueImpl = async () =>
        makeTemplateRow('t-1', {
          name: 'Sales Template', description: 'A sales report', category: 'finance',
          dataSource: 'invoices',
          columns: [{ field: 'number', label: 'Number' }],
          filters: [], groupBy: [],
          orderBy: { field: 'createdAt', direction: 'desc' },
          schedule: 'monthly', format: 'csv',
          isBuiltIn: false, icon: 'BarChart3', tags: [],
        });

      const definition = await ReportTemplateService.instantiate('t-1', {
        createdBy: 'user-1',
      });

      assert.ok(definition);
      assert.equal(definition.name, 'Sales Template');
      assert.equal(definition.dataSource, 'invoices');
      assert.equal(definition.schedule, 'monthly');
      assert.equal(definition.columns.length, 1);
    });

    it('overrides name and description', async () => {
      memoryFindUniqueImpl = async () =>
        makeTemplateRow('t-1', {
          name: 'Original', description: 'Original desc', category: 'general',
          dataSource: 'tasks', columns: [], filters: [], groupBy: [],
          orderBy: { field: 'createdAt', direction: 'desc' },
          schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [],
        });

      const definition = await ReportTemplateService.instantiate('t-1', {
        name: 'Custom Name',
        description: 'Custom desc',
        createdBy: 'user-1',
      });

      assert.ok(definition);
      assert.equal(definition.name, 'Custom Name');
      assert.equal(definition.description, 'Custom desc');
    });

    it('returns null when template not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const definition = await ReportTemplateService.instantiate('nope', {
        createdBy: 'user-1',
      });
      assert.equal(definition, null);
    });
  });

  describe('getStats', () => {
    it('aggregates template stats', async () => {
      memoryFindManyImpl = async () => [
        makeTemplateRow('t-1', { name: 'A', description: '', category: 'finance', dataSource: 'invoices', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: true, icon: 'BarChart3', tags: [] }),
        makeTemplateRow('t-2', { name: 'B', description: '', category: 'general', dataSource: 'tasks', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: false, icon: 'BarChart3', tags: [] }),
        makeTemplateRow('t-3', { name: 'C', description: '', category: 'finance', dataSource: 'expenses', columns: [], filters: [], groupBy: [], orderBy: { field: 'createdAt', direction: 'desc' }, schedule: 'none', format: 'csv', isBuiltIn: true, icon: 'BarChart3', tags: [] }),
      ];

      const stats = await ReportTemplateService.getStats('org-1');

      assert.equal(stats.totalTemplates, 3);
      assert.equal(stats.byCategory.finance, 2);
      assert.equal(stats.byCategory.general, 1);
      assert.equal(stats.byDataSource.invoices, 1);
      assert.equal(stats.byDataSource.tasks, 1);
      assert.equal(stats.byDataSource.expenses, 1);
      assert.equal(stats.builtInTemplates, 2);
    });

    it('returns zero stats when no templates', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await ReportTemplateService.getStats('org-1');

      assert.equal(stats.totalTemplates, 0);
      assert.equal(stats.builtInTemplates, 0);
    });
  });
});
