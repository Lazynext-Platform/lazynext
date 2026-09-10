import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  tags: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<MemoryRow[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryDeleteImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<MemoryRow[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<MemoryRow | null> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<MemoryRow> => {
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

function makeMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'email_template',
    content: JSON.stringify({ name: 'Welcome', category: 'welcome', subject: 'Hello {{first_name}}', bodyHtml: '<h1>Hi {{first_name}}</h1>', bodyText: 'Hi {{first_name}}', variables: ['first_name'], isDefault: true, usageCount: 0 }),
    source: 'user',
    sourceId: 'user-1',
    confidence: 0.9,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '["email_template","welcome"]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRow;
  memoryUpdateImpl = async () => ({}) as MemoryRow;
  memoryDeleteImpl = async () => ({}) as MemoryRow;
}

const { EmailTemplateService } = await import('@/lib/services/email-template-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EmailTemplateService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a template memory record with type email_template', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'email_template');
        assert.ok(a.data.content.includes('"name":"Welcome"'));
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailTemplateService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { name: 'Welcome', category: 'welcome', subject: 'Hello', bodyHtml: '<h1>Hi</h1>' },
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('defaults category to general', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.category, 'general');
        return makeMemory({ content: a.data.content });
      };

      await EmailTemplateService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { name: 'Test', subject: 'Hi', bodyHtml: '<p>Hi</p>', category: 'general' },
      });
    });
  });

  describe('get', () => {
    it('returns a template by id', async () => {
      memoryFindUniqueImpl = async () => makeMemory();

      const result = await EmailTemplateService.get('mem-1');

      assert.ok(result);
      assert.equal(result.id, 'mem-1');
      assert.equal(result.name, 'Welcome');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await EmailTemplateService.get('nope');
      assert.equal(result, null);
    });

    it('returns null when type is not email_template', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ type: 'fact' });

      const result = await EmailTemplateService.get('mem-1');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      memoryFindUniqueImpl = async () => { throw new Error('DB down'); };

      const result = await EmailTemplateService.get('mem-1');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns templates for a workspace', async () => {
      memoryFindManyImpl = async () => [makeMemory({ id: 't1' }), makeMemory({ id: 't2' })];

      const result = await EmailTemplateService.list('ws-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 't1');
    });

    it('filters by category via tags contains', async () => {
      memoryFindManyImpl = async () => [];

      await EmailTemplateService.list('ws-1', { category: 'welcome' });

      const args = calls[0].args as { where: { tags: { contains: string } } };
      assert.equal(args.where.tags.contains, '"welcome"');
    });

    it('filters by search term', async () => {
      memoryFindManyImpl = async () => [
        makeMemory({ content: JSON.stringify({ name: 'Welcome Email', category: 'welcome', subject: 'Hi', bodyHtml: '', variables: [], isDefault: true, usageCount: 0 }) }),
        makeMemory({ content: JSON.stringify({ name: 'Newsletter', category: 'newsletter', subject: 'Hi', bodyHtml: '', variables: [], isDefault: false, usageCount: 0 }) }),
      ];

      const result = await EmailTemplateService.list('ws-1', { search: 'welcome' });
      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'Welcome Email');
    });

    it('returns empty array on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const result = await EmailTemplateService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates template fields by merging', async () => {
      memoryFindUniqueImpl = async () => makeMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.name, 'New Name');
        assert.equal(content.category, 'welcome');
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailTemplateService.update('mem-1', { name: 'New Name' });
      assert.ok(result);
      assert.equal(calls[1].method, 'memory.update');
    });

    it('throws if template not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => EmailTemplateService.update('nope', { name: 'X' }), /Template not found/);
    });
  });

  describe('delete', () => {
    it('deletes a template', async () => {
      memoryDeleteImpl = async () => makeMemory();

      const result = await EmailTemplateService.delete('mem-1');
      assert.ok(result);
      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('render', () => {
    it('replaces {{variable}} placeholders with values', async () => {
      memoryFindUniqueImpl = async () => makeMemory();
      memoryUpdateImpl = async () => makeMemory();

      const rendered = await EmailTemplateService.render('mem-1', { first_name: 'Alice' });

      assert.equal(rendered.subject, 'Hello Alice');
      assert.equal(rendered.bodyHtml, '<h1>Hi Alice</h1>');
      assert.equal(rendered.bodyText, 'Hi Alice');
    });

    it('leaves unknown placeholders empty', async () => {
      memoryFindUniqueImpl = async () => makeMemory();
      memoryUpdateImpl = async () => makeMemory();

      const rendered = await EmailTemplateService.render('mem-1', {});

      assert.equal(rendered.subject, 'Hello ');
      assert.equal(rendered.bodyHtml, '<h1>Hi </h1>');
    });

    it('throws if template not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => EmailTemplateService.render('nope', {}), /Template not found/);
    });

    it('increments usage count', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ content: JSON.stringify({ name: 'T', category: 'welcome', subject: 'Hi', bodyHtml: '', variables: [], isDefault: true, usageCount: 5 }) });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.usageCount, 6);
        return makeMemory({ content: a.data.content });
      };

      await EmailTemplateService.render('mem-1', {});
    });
  });

  describe('getCategories', () => {
    it('returns distinct categories from templates', async () => {
      memoryFindManyImpl = async () => [
        makeMemory({ content: JSON.stringify({ name: 'A', category: 'welcome', subject: 'S', bodyHtml: '', variables: [], isDefault: true, usageCount: 0 }) }),
        makeMemory({ content: JSON.stringify({ name: 'B', category: 'newsletter', subject: 'S', bodyHtml: '', variables: [], isDefault: false, usageCount: 0 }) }),
        makeMemory({ content: JSON.stringify({ name: 'C', category: 'welcome', subject: 'S', bodyHtml: '', variables: [], isDefault: false, usageCount: 0 }) }),
      ];

      const cats = await EmailTemplateService.getCategories('ws-1');
      assert.equal(cats.length, 2);
      assert.ok(cats.includes('welcome'));
      assert.ok(cats.includes('newsletter'));
    });
  });

  describe('getDefaults', () => {
    it('returns existing defaults without creating new ones', async () => {
      memoryFindManyImpl = async () => [makeMemory({ id: 'd1' })];

      const defaults = await EmailTemplateService.getDefaults('ws-1', 'org-1', 'user-1');
      assert.equal(defaults.length, 1);
      assert.equal((defaults[0] as MemoryRow).id, 'd1');
    });

    it('seeds default templates when none exist', async () => {
      memoryFindManyImpl = async () => [];
      let createCount = 0;
      memoryCreateImpl = async (args: unknown) => {
        createCount += 1;
        const a = args as { data: { content: string } };
        return makeMemory({ content: a.data.content });
      };

      const defaults = await EmailTemplateService.getDefaults('ws-1', 'org-1', 'user-1');
      assert.equal(defaults.length, 4);
      assert.equal(createCount, 4);
    });
  });

  describe('getStats', () => {
    it('aggregates template stats', async () => {
      memoryFindManyImpl = async () => [
        makeMemory({ content: JSON.stringify({ name: 'A', category: 'welcome', subject: 'S', bodyHtml: '', variables: [], isDefault: true, usageCount: 10 }) }),
        makeMemory({ content: JSON.stringify({ name: 'B', category: 'newsletter', subject: 'S', bodyHtml: '', variables: [], isDefault: false, usageCount: 5 }) }),
      ];

      const stats = await EmailTemplateService.getStats('ws-1');
      assert.equal(stats.total, 2);
      assert.equal(stats.defaults, 1);
      assert.equal(stats.totalUsage, 15);
      assert.equal(stats.byCategory.welcome, 1);
      assert.equal(stats.byCategory.newsletter, 1);
    });

    it('returns zero stats when no templates', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await EmailTemplateService.getStats('ws-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.totalUsage, 0);
    });
  });
});
