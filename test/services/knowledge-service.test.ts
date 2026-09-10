import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── KnowledgeDocument ──

type DocFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type DocFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
};

type DocCreateArgs = {
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
};

type DocUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
};

type DocDeleteArgs = {
  where: { id: string };
};

let docFindManyImpl: (args: DocFindManyArgs) => Promise<unknown[]> = async () => [];
let docFindUniqueImpl: (args: DocFindUniqueArgs) => Promise<unknown> = async () => null;
let docCreateImpl: (args: DocCreateArgs) => Promise<unknown> = async () => ({});
let docUpdateImpl: (args: DocUpdateArgs) => Promise<unknown> = async () => ({});
let docDeleteImpl: (args: DocDeleteArgs) => Promise<unknown> = async () => ({});

// ── KnowledgeVersion ──

type VersionFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type VersionFindFirstArgs = {
  where: Record<string, unknown>;
};

type VersionCreateArgs = {
  data: Record<string, unknown>;
};

type VersionCountArgs = {
  where: Record<string, unknown>;
};

let versionFindManyImpl: (args: VersionFindManyArgs) => Promise<unknown[]> = async () => [];
let versionFindFirstImpl: (args: VersionFindFirstArgs) => Promise<unknown> = async () => null;
let versionCreateImpl: (args: VersionCreateArgs) => Promise<unknown> = async () => ({});
let versionCountImpl: (args: VersionCountArgs) => Promise<number> = async () => 0;

// ── KnowledgeLink ──

type LinkFindManyArgs = {
  where: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type LinkCreateArgs = {
  data: Record<string, unknown>;
};

type LinkDeleteArgs = {
  where: { id: string };
};

type LinkCountArgs = {
  where: Record<string, unknown>;
};

let linkFindManyImpl: (args: LinkFindManyArgs) => Promise<unknown[]> = async () => [];
let linkCreateImpl: (args: LinkCreateArgs) => Promise<unknown> = async () => ({});
let linkDeleteImpl: (args: LinkDeleteArgs) => Promise<unknown> = async () => ({});
let linkCountImpl: (args: LinkCountArgs) => Promise<number> = async () => 0;

// ── KnowledgeSearchIndex ──

type IndexFindManyArgs = {
  where: Record<string, unknown>;
  take?: number;
};

type IndexCreateArgs = {
  data: Record<string, unknown>;
};

type IndexDeleteManyArgs = {
  where: Record<string, unknown>;
};

let indexFindManyImpl: (args: IndexFindManyArgs) => Promise<unknown[]> = async () => [];
let indexCreateImpl: (args: IndexCreateArgs) => Promise<unknown> = async () => ({});
let indexDeleteManyImpl: (args: IndexDeleteManyArgs) => Promise<{ count: number }> = async () => ({ count: 0 });

// ── Memory ──

let memoryFindManyImpl: (args: { where: Record<string, unknown>; take?: number }) => Promise<unknown[]> = async () => [];

// ── ResearchSession ──

let researchFindManyImpl: (args: { where: Record<string, unknown>; take?: number }) => Promise<unknown[]> = async () => [];

const prismaMock = {
  knowledgeDocument: {
    findMany: (args: DocFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'knowledgeDocument.findMany', args });
      return docFindManyImpl(args);
    },
    findUnique: (args: DocFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeDocument.findUnique', args });
      return docFindUniqueImpl(args);
    },
    create: (args: DocCreateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeDocument.create', args });
      return docCreateImpl(args);
    },
    update: (args: DocUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeDocument.update', args });
      return docUpdateImpl(args);
    },
    delete: (args: DocDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeDocument.delete', args });
      return docDeleteImpl(args);
    },
  },
  knowledgeVersion: {
    findMany: (args: VersionFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'knowledgeVersion.findMany', args });
      return versionFindManyImpl(args);
    },
    findFirst: (args: VersionFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeVersion.findFirst', args });
      return versionFindFirstImpl(args);
    },
    create: (args: VersionCreateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeVersion.create', args });
      return versionCreateImpl(args);
    },
    count: (args: VersionCountArgs): Promise<number> => {
      calls.push({ method: 'knowledgeVersion.count', args });
      return versionCountImpl(args);
    },
  },
  knowledgeLink: {
    findMany: (args: LinkFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'knowledgeLink.findMany', args });
      return linkFindManyImpl(args);
    },
    create: (args: LinkCreateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeLink.create', args });
      return linkCreateImpl(args);
    },
    delete: (args: LinkDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeLink.delete', args });
      return linkDeleteImpl(args);
    },
    count: (args: LinkCountArgs): Promise<number> => {
      calls.push({ method: 'knowledgeLink.count', args });
      return linkCountImpl(args);
    },
  },
  knowledgeSearchIndex: {
    findMany: (args: IndexFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'knowledgeSearchIndex.findMany', args });
      return indexFindManyImpl(args);
    },
    create: (args: IndexCreateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeSearchIndex.create', args });
      return indexCreateImpl(args);
    },
    deleteMany: (args: IndexDeleteManyArgs): Promise<{ count: number }> => {
      calls.push({ method: 'knowledgeSearchIndex.deleteMany', args });
      return indexDeleteManyImpl(args);
    },
  },
  memory: {
    findMany: (args: { where: Record<string, unknown>; take?: number }): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
  },
  researchSession: {
    findMany: (args: { where: Record<string, unknown>; take?: number }): Promise<unknown[]> => {
      calls.push({ method: 'researchSession.findMany', args });
      return researchFindManyImpl(args);
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
  docFindManyImpl = async () => [];
  docFindUniqueImpl = async () => null;
  docCreateImpl = async () => ({});
  docUpdateImpl = async () => ({});
  docDeleteImpl = async () => ({});
  versionFindManyImpl = async () => [];
  versionFindFirstImpl = async () => null;
  versionCreateImpl = async () => ({});
  versionCountImpl = async () => 0;
  linkFindManyImpl = async () => [];
  linkCreateImpl = async () => ({});
  linkDeleteImpl = async () => ({});
  linkCountImpl = async () => 0;
  indexFindManyImpl = async () => [];
  indexCreateImpl = async () => ({});
  indexDeleteManyImpl = async () => ({ count: 0 });
  memoryFindManyImpl = async () => [];
  researchFindManyImpl = async () => [];
}

const { KnowledgeService } = await import('@/lib/services/knowledge-service');

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — create
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.create', () => {
  beforeEach(() => { resetMock(); });

  it('creates a document with auto-generated slug', async () => {
    let createdData: Record<string, unknown> | null = null;
    docCreateImpl = async (args: DocCreateArgs) => {
      createdData = args.data;
      return {
        id: 'doc-1',
        ...args.data,
        versions: [{ id: 'ver-1', version: 1 }],
      };
    };

    const result = await KnowledgeService.create('org-1', {
      title: 'Marketing Guide',
      content: '# Marketing\n\nStrategy content',
      authorId: 'user-1',
    });

    assert.ok(result);
    assert.equal(createdData!.slug, 'marketing-guide');
    assert.equal(createdData!.version, 1);
    assert.equal(createdData!.status, 'draft');
    assert.equal(createdData!.authorId, 'user-1');
  });

  it('creates an initial version snapshot', async () => {
    docCreateImpl = async (args: DocCreateArgs) => {
      // Verify nested version create
      const versions = args.data.versions as { create: Record<string, unknown> };
      assert.equal(versions.create.version, 1);
      assert.equal(versions.create.content, 'test content');
      assert.equal(versions.create.changeSummary, 'Initial version');
      return {
        id: 'doc-1',
        ...args.data,
        versions: [{ id: 'ver-1', version: 1 }],
      };
    };

    await KnowledgeService.create('org-1', {
      title: 'Test Doc',
      content: 'test content',
      authorId: 'user-1',
    });
  });

  it('uses provided slug when given', async () => {
    let createdData: Record<string, unknown> | null = null;
    docCreateImpl = async (args: DocCreateArgs) => {
      createdData = args.data;
      return { id: 'doc-1', ...args.data, versions: [{ id: 'ver-1', version: 1 }] };
    };

    await KnowledgeService.create('org-1', {
      title: 'Custom Title',
      slug: 'custom-slug',
      authorId: 'user-1',
    });

    assert.equal(createdData!.slug, 'custom-slug');
  });

  it('sets publishedAt when status is published', async () => {
    let createdData: Record<string, unknown> | null = null;
    docCreateImpl = async (args: DocCreateArgs) => {
      createdData = args.data;
      return { id: 'doc-1', ...args.data, versions: [{ id: 'ver-1', version: 1 }] };
    };

    await KnowledgeService.create('org-1', {
      title: 'Published Doc',
      authorId: 'user-1',
      status: 'published',
    });

    assert.ok(createdData!.publishedAt instanceof Date);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — get
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.get', () => {
  beforeEach(() => { resetMock(); });

  it('returns a document with versions and children', async () => {
    docFindUniqueImpl = async () => ({
      id: 'doc-1', title: 'Test', versions: [], children: [],
    });

    const result = await KnowledgeService.get('doc-1');
    assert.ok(result);
    assert.equal(result!.id, 'doc-1');
  });

  it('returns null when document not found', async () => {
    docFindUniqueImpl = async () => null;
    const result = await KnowledgeService.get('nope');
    assert.equal(result, null);
  });

  it('returns null on error (safePrisma fallback)', async () => {
    docFindUniqueImpl = async () => { throw new Error('fail'); };
    const result = await KnowledgeService.get('doc-1');
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — list
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.list', () => {
  beforeEach(() => { resetMock(); });

  it('lists documents for an organization', async () => {
    docFindManyImpl = async () => [{ id: 'd1', title: 'Doc 1' }, { id: 'd2', title: 'Doc 2' }];

    const result = await KnowledgeService.list('org-1');
    assert.equal(result.length, 2);
  });

  it('applies status filter', async () => {
    docFindManyImpl = async (args: DocFindManyArgs) => {
      assert.equal(args.where.status, 'published');
      return [];
    };

    await KnowledgeService.list('org-1', { status: 'published' });
  });

  it('applies workspace filter', async () => {
    docFindManyImpl = async (args: DocFindManyArgs) => {
      assert.equal(args.where.workspaceId, 'ws-1');
      return [];
    };

    await KnowledgeService.list('org-1', { workspaceId: 'ws-1' });
  });

  it('applies parentId null filter for root documents', async () => {
    docFindManyImpl = async (args: DocFindManyArgs) => {
      assert.equal(args.where.parentId, null);
      return [];
    };

    await KnowledgeService.list('org-1', { parentId: null });
  });

  it('applies search filter', async () => {
    docFindManyImpl = async (args: DocFindManyArgs) => {
      const or = args.where.OR as unknown[];
      assert.ok(or.length > 0);
      return [];
    };

    await KnowledgeService.list('org-1', { search: 'marketing' });
  });

  it('returns empty array on error (safePrisma fallback)', async () => {
    docFindManyImpl = async () => { throw new Error('DB down'); };
    const result = await KnowledgeService.list('org-1');
    assert.deepEqual(result, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — update
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.update', () => {
  beforeEach(() => { resetMock(); });

  it('creates a new version and increments version number', async () => {
    docFindUniqueImpl = async () => ({
      id: 'doc-1', title: 'Old', content: 'old content', excerpt: 'old',
      version: 1, tags: '[]', status: 'draft', publishedAt: null,
    });
    versionCreateImpl = async (args: VersionCreateArgs) => {
      assert.equal(args.data.version, 2);
      assert.equal(args.data.content, 'new content');
      return { id: 'ver-2', version: 2, content: 'new content' };
    };
    docUpdateImpl = async (args: DocUpdateArgs) => {
      assert.equal(args.data.version, 2);
      assert.equal(args.data.content, 'new content');
      return { id: 'doc-1', ...args.data, versions: [] };
    };

    const result = await KnowledgeService.update('doc-1', {
      content: 'new content',
      editorId: 'user-1',
    });

    assert.ok(result);
  });

  it('returns null when document not found', async () => {
    docFindUniqueImpl = async () => null;
    const result = await KnowledgeService.update('nope', { editorId: 'user-1' });
    assert.equal(result, null);
  });

  it('sets publishedAt when transitioning to published', async () => {
    docFindUniqueImpl = async () => ({
      id: 'doc-1', title: 'Doc', content: 'content', excerpt: '',
      version: 1, tags: '[]', status: 'draft', publishedAt: null,
    });
    versionCreateImpl = async () => ({ id: 'ver-2', version: 2 });
    docUpdateImpl = async (args: DocUpdateArgs) => {
      assert.ok(args.data.publishedAt instanceof Date);
      return { id: 'doc-1', ...args.data, versions: [] };
    };

    await KnowledgeService.update('doc-1', {
      status: 'published',
      editorId: 'user-1',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — delete
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.delete', () => {
  beforeEach(() => { resetMock(); });

  it('deletes a document and its search index entries', async () => {
    indexDeleteManyImpl = async () => ({ count: 1 });
    docDeleteImpl = async () => ({ id: 'doc-1' });

    const result = await KnowledgeService.delete('doc-1');
    assert.ok(result);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — getVersions / getVersion
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.getVersions', () => {
  beforeEach(() => { resetMock(); });

  it('returns version history ordered by version desc', async () => {
    versionFindManyImpl = async () => [
      { id: 'v3', version: 3 },
      { id: 'v2', version: 2 },
      { id: 'v1', version: 1 },
    ];

    const result = await KnowledgeService.getVersions('doc-1');
    assert.equal(result.length, 3);
    assert.equal(result[0].version, 3);
  });

  it('returns empty array on error', async () => {
    versionFindManyImpl = async () => { throw new Error('fail'); };
    const result = await KnowledgeService.getVersions('doc-1');
    assert.deepEqual(result, []);
  });
});

describe('KnowledgeService.getVersion', () => {
  beforeEach(() => { resetMock(); });

  it('returns a specific version', async () => {
    versionFindFirstImpl = async () => ({ id: 'v2', version: 2, content: 'old' });
    const result = await KnowledgeService.getVersion('doc-1', 2);
    assert.ok(result);
    assert.equal(result!.version, 2);
  });

  it('returns null when version not found', async () => {
    versionFindFirstImpl = async () => null;
    const result = await KnowledgeService.getVersion('doc-1', 99);
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — restoreVersion
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.restoreVersion', () => {
  beforeEach(() => { resetMock(); });

  it('creates a new version with old content', async () => {
    versionFindFirstImpl = async () => ({
      id: 'v1', version: 1, content: 'old content', excerpt: 'old excerpt',
    });
    docFindUniqueImpl = async () => ({
      id: 'doc-1', version: 3, content: 'current', excerpt: 'current',
    });
    versionCreateImpl = async (args: VersionCreateArgs) => {
      assert.equal(args.data.content, 'old content');
      assert.equal(args.data.version, 4);
      assert.ok(String(args.data.changeSummary).includes('Restored from version 1'));
      return { id: 'v4', version: 4 };
    };
    docUpdateImpl = async (args: DocUpdateArgs) => {
      assert.equal(args.data.content, 'old content');
      assert.equal(args.data.version, 4);
      return { id: 'doc-1', ...args.data };
    };

    const result = await KnowledgeService.restoreVersion('doc-1', 1, 'user-1');
    assert.ok(result);
  });

  it('returns null when version not found', async () => {
    versionFindFirstImpl = async () => null;
    const result = await KnowledgeService.restoreVersion('doc-1', 99, 'user-1');
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — getChildren / getTree
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.getChildren', () => {
  beforeEach(() => { resetMock(); });

  it('returns child documents', async () => {
    docFindManyImpl = async () => [
      { id: 'c1', title: 'Child 1' },
      { id: 'c2', title: 'Child 2' },
    ];

    const result = await KnowledgeService.getChildren('parent-1');
    assert.equal(result.length, 2);
  });
});

describe('KnowledgeService.getTree', () => {
  beforeEach(() => { resetMock(); });

  it('builds a nested tree structure', async () => {
    docFindManyImpl = async () => [
      { id: 'root1', title: 'Root 1', slug: 'root-1', parentId: null, status: 'published', workspaceId: null, updatedAt: new Date() },
      { id: 'child1', title: 'Child 1', slug: 'child-1', parentId: 'root1', status: 'draft', workspaceId: null, updatedAt: new Date() },
      { id: 'root2', title: 'Root 2', slug: 'root-2', parentId: null, status: 'published', workspaceId: null, updatedAt: new Date() },
    ];

    const tree = await KnowledgeService.getTree('org-1');
    assert.equal(tree.length, 2); // root1 and root2
    assert.equal(tree[0].id, 'root1');
    assert.equal(tree[0].children.length, 1);
    assert.equal(tree[0].children[0].id, 'child1');
  });

  it('returns empty array on error', async () => {
    docFindManyImpl = async () => { throw new Error('fail'); };
    const tree = await KnowledgeService.getTree('org-1');
    assert.deepEqual(tree, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — addLink / removeLink / getLinks / getBacklinks
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.addLink', () => {
  beforeEach(() => { resetMock(); });

  it('creates a link between documents', async () => {
    linkCreateImpl = async (args: LinkCreateArgs) => {
      assert.equal(args.data.sourceId, 'doc-1');
      assert.equal(args.data.targetId, 'doc-2');
      assert.equal(args.data.linkType, 'reference');
      return { id: 'link-1', ...args.data };
    };
    docFindUniqueImpl = async () => ({ id: 'doc-1', links: '[]' });

    const result = await KnowledgeService.addLink('org-1', {
      sourceId: 'doc-1',
      targetId: 'doc-2',
      createdBy: 'user-1',
    });

    assert.ok(result);
  });

  it('updates the source document links JSON array', async () => {
    linkCreateImpl = async () => ({ id: 'link-1' });
    docFindUniqueImpl = async () => ({ id: 'doc-1', links: '[]' });
    docUpdateImpl = async (args: DocUpdateArgs) => {
      const links = JSON.parse(args.data.links as string);
      assert.ok(Array.isArray(links));
      assert.equal(links[0].targetId, 'doc-2');
      return { id: 'doc-1' };
    };

    await KnowledgeService.addLink('org-1', {
      sourceId: 'doc-1',
      targetId: 'doc-2',
      label: 'See also',
      createdBy: 'user-1',
    });
  });
});

describe('KnowledgeService.removeLink', () => {
  beforeEach(() => { resetMock(); });

  it('deletes a link by id', async () => {
    linkDeleteImpl = async (args: LinkDeleteArgs) => {
      assert.equal(args.where.id, 'link-1');
      return { id: 'link-1' };
    };

    const result = await KnowledgeService.removeLink('link-1');
    assert.ok(result);
  });
});

describe('KnowledgeService.getLinks', () => {
  beforeEach(() => { resetMock(); });

  it('returns outgoing and incoming links', async () => {
    linkFindManyImpl = async (args: LinkFindManyArgs) => {
      if (args.where.sourceId) return [{ id: 'l1', sourceId: 'doc-1', targetId: 'doc-2' }];
      if (args.where.targetId) return [{ id: 'l2', sourceId: 'doc-3', targetId: 'doc-1' }];
      return [];
    };

    const result = await KnowledgeService.getLinks('doc-1');
    assert.equal(result.outgoing.length, 1);
    assert.equal(result.incoming.length, 1);
  });
});

describe('KnowledgeService.getBacklinks', () => {
  beforeEach(() => { resetMock(); });

  it('returns documents that link to the target', async () => {
    linkFindManyImpl = async () => [
      { id: 'l1', sourceId: 'src-1', targetId: 'doc-1', linkType: 'reference', label: '' },
    ];
    docFindManyImpl = async () => [
      { id: 'src-1', title: 'Source Doc', slug: 'source-doc', status: 'published' },
    ];

    const result = await KnowledgeService.getBacklinks('doc-1');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'src-1');
    assert.equal(result[0].title, 'Source Doc');
  });

  it('returns empty array when no backlinks', async () => {
    linkFindManyImpl = async () => [];
    const result = await KnowledgeService.getBacklinks('doc-1');
    assert.deepEqual(result, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — search
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.search', () => {
  beforeEach(() => { resetMock(); });

  it('returns ranked search results', async () => {
    indexFindManyImpl = async () => [
      {
        id: 'idx-1', organizationId: 'org-1', documentId: 'doc-1',
        entityType: 'document', title: 'Marketing Guide',
        content: 'Comprehensive marketing strategy guide',
        tags: '["marketing"]', keywords: '["marketing","strategy"]', relevanceScore: 0,
      },
    ];

    const results = await KnowledgeService.search('org-1', 'marketing');
    assert.ok(results.length > 0);
    assert.equal(results[0].entityType, 'document');
    assert.ok(results[0].relevance > 0);
  });

  it('returns empty for empty query', async () => {
    const results = await KnowledgeService.search('org-1', '');
    assert.deepEqual(results, []);
  });

  it('returns empty when index is empty', async () => {
    indexFindManyImpl = async () => [];
    const results = await KnowledgeService.search('org-1', 'marketing');
    assert.deepEqual(results, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — getTags
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.getTags', () => {
  beforeEach(() => { resetMock(); });

  it('returns unique tags with counts sorted by frequency', async () => {
    docFindManyImpl = async () => [
      { tags: '["marketing","strategy"]' },
      { tags: '["marketing","content"]' },
      { tags: '["marketing"]' },
    ];

    const tags = await KnowledgeService.getTags('org-1');
    assert.equal(tags.length, 3);
    assert.equal(tags[0].tag, 'marketing');
    assert.equal(tags[0].count, 3);
  });

  it('returns empty array on error', async () => {
    docFindManyImpl = async () => { throw new Error('fail'); };
    const tags = await KnowledgeService.getTags('org-1');
    assert.deepEqual(tags, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — getStats
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.getStats', () => {
  beforeEach(() => { resetMock(); });

  it('returns aggregated stats', async () => {
    docFindManyImpl = async (args: DocFindManyArgs) => {
      // The first call selects all docs, the second call is for recent activity
      if (args.orderBy) {
        return [{ id: 'd1', title: 'Recent', updatedAt: new Date(), status: 'published' }];
      }
      return [
        { id: 'd1', status: 'draft', workspaceId: 'ws-1', updatedAt: new Date(), title: 'Doc 1' },
        { id: 'd2', status: 'published', workspaceId: 'ws-1', updatedAt: new Date(), title: 'Doc 2' },
        { id: 'd3', status: 'draft', workspaceId: null, updatedAt: new Date(), title: 'Doc 3' },
      ];
    };
    versionCountImpl = async () => 5;
    linkCountImpl = async () => 3;

    const stats = await KnowledgeService.getStats('org-1');
    assert.equal(stats.totalDocuments, 3); // First findMany returns all docs
    assert.equal(stats.totalVersions, 5);
    assert.equal(stats.totalLinks, 3);
    assert.ok(stats.byStatus);
    assert.ok(stats.byWorkspace);
    assert.ok(Array.isArray(stats.recentActivity));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — getWikiPath
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.getWikiPath', () => {
  beforeEach(() => { resetMock(); });

  it('returns the path from root to the document', async () => {
    let callCount = 0;
    docFindUniqueImpl = async () => {
      callCount++;
      if (callCount === 1) return { id: 'child', title: 'Child', slug: 'child', parentId: 'parent' };
      if (callCount === 2) return { id: 'parent', title: 'Parent', slug: 'parent', parentId: 'root' };
      if (callCount === 3) return { id: 'root', title: 'Root', slug: 'root', parentId: null };
      return null;
    };

    const path = await KnowledgeService.getWikiPath('child');
    assert.equal(path.length, 3);
    assert.equal(path[0].title, 'Root');
    assert.equal(path[1].title, 'Parent');
    assert.equal(path[2].title, 'Child');
  });

  it('returns single node for root document', async () => {
    docFindUniqueImpl = async () => ({
      id: 'root', title: 'Root', slug: 'root', parentId: null,
    });

    const path = await KnowledgeService.getWikiPath('root');
    assert.equal(path.length, 1);
    assert.equal(path[0].title, 'Root');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — moveDocument
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService.moveDocument', () => {
  beforeEach(() => { resetMock(); });

  it('moves a document to a new parent', async () => {
    docFindUniqueImpl = async () => ({
      id: 'new-parent', title: 'New Parent', slug: 'new-parent', parentId: null,
    });
    docUpdateImpl = async (args: DocUpdateArgs) => {
      assert.equal(args.data.parentId, 'new-parent');
      return { id: 'doc-1', ...args.data };
    };

    const result = await KnowledgeService.moveDocument('doc-1', 'new-parent');
    assert.ok(result);
  });

  it('moves a document to root (null parent)', async () => {
    docUpdateImpl = async (args: DocUpdateArgs) => {
      assert.equal(args.data.parentId, null);
      return { id: 'doc-1', ...args.data };
    };

    const result = await KnowledgeService.moveDocument('doc-1', null);
    assert.ok(result);
  });

  it('throws when trying to make a document its own parent', async () => {
    await assert.rejects(
      KnowledgeService.moveDocument('doc-1', 'doc-1'),
      /Cannot make a document its own parent/,
    );
  });

  it('throws when moving under a descendant', async () => {
    let callCount = 0;
    docFindUniqueImpl = async () => {
      callCount++;
      // getWikiPath for 'child' returns [{ id: 'child' }, { id: 'doc-1' }]
      // which means doc-1 is an ancestor of child
      if (callCount === 1) return { id: 'child', title: 'Child', slug: 'child', parentId: 'doc-1' };
      if (callCount === 2) return { id: 'doc-1', title: 'Doc 1', slug: 'doc-1', parentId: null };
      return null;
    };

    await assert.rejects(
      KnowledgeService.moveDocument('doc-1', 'child'),
      /Cannot move a document under its own descendant/,
    );
  });
});
