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

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'digital_asset',
    content: JSON.stringify({
      name: 'Brand Logo',
      type: 'image',
      url: 'https://cdn.example.com/logo.png',
      description: 'Primary brand logo',
      tags: ['brand', 'logo'],
      status: 'active',
      fileSize: 102400,
      fileType: 'png',
      checksum: 'abc123',
      uploadedBy: 'designer',
      owner: 'marketing',
      license: 'proprietary',
      expiryDate: '2028-01-01',
      metadata: { width: 1920, height: 1080 },
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['digital_asset', 'image', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeCollectionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'asset_collection',
    content: JSON.stringify({
      name: 'Summer Campaign Assets',
      type: 'campaign',
      description: 'Assets for summer campaign',
      assetIds: ['mem-1'],
      status: 'active',
      owner: 'marketing',
      color: '#ff6600',
      notes: '',
    }),
    tags: JSON.stringify(['asset_collection', 'campaign', 'active']),
    ...overrides,
  });
}

function makeVersionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-v1',
    type: 'asset_version',
    content: JSON.stringify({
      assetId: 'mem-1',
      version: '1.0',
      url: 'https://cdn.example.com/logo-v1.png',
      fileSize: 51200,
      fileType: 'png',
      checksum: 'def456',
      uploadedBy: 'designer',
      changeLog: 'Initial version',
      notes: '',
    }),
    tags: JSON.stringify(['asset_version', '1.0']),
    ...overrides,
  });
}

function makePermissionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'asset_permission',
    content: JSON.stringify({
      assetId: 'mem-1',
      collectionId: null,
      type: 'view',
      level: 'internal',
      grantedTo: 'team-marketing',
      grantedBy: 'admin',
      grantedDate: '2028-01-01',
      expiresDate: '2028-12-31',
      notes: '',
    }),
    tags: JSON.stringify(['asset_permission', 'view', 'internal']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
}

const { DAMService } = await import('@/lib/services/dam-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assets
// ─────────────────────────────────────────────────────────────────────────────

describe('DAMService — Assets', () => {
  beforeEach(() => resetMock());

  it('creates an asset with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await DAMService.createAsset('org-1', 'ws-1', {
      name: 'Hero Image', type: 'image',
    }, 'user-1');
    assert.equal(a.name, 'Hero Image');
    assert.equal(a.status, 'active');
    assert.equal(a.fileSize, 0);
    assert.equal(a.tags.length, 0);
  });

  it('creates an asset with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await DAMService.createAsset('org-1', 'ws-1', {
      name: 'Promo Video', type: 'video', url: 'https://cdn.example.com/promo.mp4',
      description: 'Summer promo', tags: ['summer', 'promo'], status: 'pending_review',
      fileSize: 5000000, fileType: 'mp4', checksum: 'xyz789',
      uploadedBy: 'editor', owner: 'marketing', license: 'CC-BY',
      expiryDate: '2028-06-01', metadata: { duration: 30 }, notes: 'High priority',
    }, 'user-1');
    assert.equal(a.name, 'Promo Video');
    assert.equal(a.type, 'video');
    assert.equal(a.url, 'https://cdn.example.com/promo.mp4');
    assert.equal(a.status, 'pending_review');
    assert.equal(a.fileSize, 5000000);
    assert.equal(a.license, 'CC-BY');
  });

  it('gets an asset by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const a = await DAMService.getAsset('mem-1');
    assert.ok(a);
    assert.equal(a!.id, 'mem-1');
    assert.equal(a!.name, 'Brand Logo');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'asset_collection' });
    const a = await DAMService.getAsset('mem-1');
    assert.equal(a, null);
  });

  it('returns null when asset not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await DAMService.getAsset('nope');
    assert.equal(a, null);
  });

  it('lists assets by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'digital_asset') return [makeRow()];
      return [];
    };
    const list = await DAMService.listAssets('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Brand Logo');
  });

  it('updates an asset', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await DAMService.updateAsset('mem-1', { status: 'archived' });
    assert.ok(a);
    assert.equal(a!.status, 'archived');
  });

  it('updates asset name and owner', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await DAMService.updateAsset('mem-1', { name: 'Updated Logo', owner: 'design' });
    assert.ok(a);
    assert.equal(a!.name, 'Updated Logo');
    assert.equal(a!.owner, 'design');
  });

  it('deletes an asset', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await DAMService.deleteAsset('mem-1');
    assert.equal(ok, true);
  });

  it('archiveAsset sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await DAMService.archiveAsset('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'archived');
  });

  it('restrictAsset sets status to restricted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await DAMService.restrictAsset('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'restricted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Collections
// ─────────────────────────────────────────────────────────────────────────────

describe('DAMService — Collections', () => {
  beforeEach(() => resetMock());

  it('creates a collection with defaults', async () => {
    memCreateImpl = async (args) => makeCollectionRow({ content: args.data.content as string });
    const c = await DAMService.createCollection('org-1', 'ws-1', {
      name: 'Brand Assets', type: 'brand',
    }, 'user-1');
    assert.equal(c.name, 'Brand Assets');
    assert.equal(c.status, 'active');
    assert.equal(c.assetIds.length, 0);
  });

  it('creates a collection with full input', async () => {
    memCreateImpl = async (args) => makeCollectionRow({ content: args.data.content as string });
    const c = await DAMService.createCollection('org-1', 'ws-1', {
      name: 'Q3 Campaign', type: 'campaign', description: 'Q3 assets',
      assetIds: ['a1', 'a2'], status: 'active', owner: 'marketing',
      color: '#0066ff', notes: 'Priority',
    }, 'user-1');
    assert.equal(c.name, 'Q3 Campaign');
    assert.equal(c.type, 'campaign');
    assert.equal(c.assetIds.length, 2);
    assert.equal(c.color, '#0066ff');
  });

  it('gets a collection by id', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    const c = await DAMService.getCollection('mem-c1');
    assert.ok(c);
    assert.equal(c!.name, 'Summer Campaign Assets');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCollectionRow({ type: 'digital_asset' });
    const c = await DAMService.getCollection('mem-c1');
    assert.equal(c, null);
  });

  it('lists collections by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_collection') return [makeCollectionRow()];
      return [];
    };
    const list = await DAMService.listCollections('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a collection', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    memUpdateImpl = async (args) => makeCollectionRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await DAMService.updateCollection('mem-c1', { name: 'Updated Collection' });
    assert.ok(c);
    assert.equal(c!.name, 'Updated Collection');
  });

  it('deletes a collection', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await DAMService.deleteCollection('mem-c1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Versions
// ─────────────────────────────────────────────────────────────────────────────

describe('DAMService — Versions', () => {
  beforeEach(() => resetMock());

  it('creates a version with defaults', async () => {
    memCreateImpl = async (args) => makeVersionRow({ content: args.data.content as string });
    const v = await DAMService.createVersion('org-1', 'ws-1', {
      assetId: 'mem-1', version: '2.0',
    }, 'user-1');
    assert.equal(v.version, '2.0');
    assert.equal(v.assetId, 'mem-1');
    assert.equal(v.fileSize, 0);
  });

  it('creates a version with full input', async () => {
    memCreateImpl = async (args) => makeVersionRow({ content: args.data.content as string });
    const v = await DAMService.createVersion('org-1', 'ws-1', {
      assetId: 'mem-1', version: '2.0', url: 'https://cdn.example.com/v2.png',
      fileSize: 204800, fileType: 'png', checksum: 'ghi012',
      uploadedBy: 'editor', changeLog: 'Updated colors', notes: 'Review needed',
    }, 'user-1');
    assert.equal(v.version, '2.0');
    assert.equal(v.fileSize, 204800);
    assert.equal(v.changeLog, 'Updated colors');
  });

  it('gets a version by id', async () => {
    memFindUniqueImpl = async () => makeVersionRow();
    const v = await DAMService.getVersion('mem-v1');
    assert.ok(v);
    assert.equal(v!.version, '1.0');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeVersionRow({ type: 'digital_asset' });
    const v = await DAMService.getVersion('mem-v1');
    assert.equal(v, null);
  });

  it('lists versions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_version') return [makeVersionRow()];
      return [];
    };
    const list = await DAMService.listVersions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a version', async () => {
    memFindUniqueImpl = async () => makeVersionRow();
    memUpdateImpl = async (args) => makeVersionRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await DAMService.updateVersion('mem-v1', { changeLog: 'Fixed typo' });
    assert.ok(v);
    assert.equal(v!.changeLog, 'Fixed typo');
  });

  it('deletes a version', async () => {
    memDeleteImpl = async () => ({ id: 'mem-v1' });
    const ok = await DAMService.deleteVersion('mem-v1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Permissions
// ─────────────────────────────────────────────────────────────────────────────

describe('DAMService — Permissions', () => {
  beforeEach(() => resetMock());

  it('creates a permission with defaults', async () => {
    memCreateImpl = async (args) => makePermissionRow({ content: args.data.content as string });
    const p = await DAMService.createPermission('org-1', 'ws-1', {
      type: 'view', level: 'internal',
    }, 'user-1');
    assert.equal(p.type, 'view');
    assert.equal(p.level, 'internal');
    assert.equal(p.grantedTo, '');
  });

  it('creates a permission with full input', async () => {
    memCreateImpl = async (args) => makePermissionRow({ content: args.data.content as string });
    const p = await DAMService.createPermission('org-1', 'ws-1', {
      assetId: 'mem-1', type: 'edit', level: 'restricted',
      grantedTo: 'team-design', grantedBy: 'admin',
      grantedDate: '2028-01-01', expiresDate: '2028-12-31', notes: 'Temporary',
    }, 'user-1');
    assert.equal(p.type, 'edit');
    assert.equal(p.level, 'restricted');
    assert.equal(p.grantedTo, 'team-design');
    assert.equal(p.assetId, 'mem-1');
  });

  it('creates a permission for a collection', async () => {
    memCreateImpl = async (args) => makePermissionRow({ content: args.data.content as string });
    const p = await DAMService.createPermission('org-1', 'ws-1', {
      collectionId: 'mem-c1', type: 'download', level: 'confidential',
    }, 'user-1');
    assert.equal(p.collectionId, 'mem-c1');
    assert.equal(p.type, 'download');
    assert.equal(p.level, 'confidential');
  });

  it('gets a permission by id', async () => {
    memFindUniqueImpl = async () => makePermissionRow();
    const p = await DAMService.getPermission('mem-p1');
    assert.ok(p);
    assert.equal(p!.type, 'view');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePermissionRow({ type: 'digital_asset' });
    const p = await DAMService.getPermission('mem-p1');
    assert.equal(p, null);
  });

  it('lists permissions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_permission') return [makePermissionRow()];
      return [];
    };
    const list = await DAMService.listPermissions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a permission', async () => {
    memFindUniqueImpl = async () => makePermissionRow();
    memUpdateImpl = async (args) => makePermissionRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await DAMService.updatePermission('mem-p1', { level: 'public' });
    assert.ok(p);
    assert.equal(p!.level, 'public');
  });

  it('deletes a permission', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await DAMService.deletePermission('mem-p1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('DAMService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getDAMMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'digital_asset') return [
        makeRow({ content: JSON.stringify({ name: 'A1', type: 'image', status: 'active', fileSize: 1000, tags: [], url: '', description: '', fileType: '', checksum: '', uploadedBy: '', owner: '', license: '', expiryDate: null, metadata: {}, notes: '' }) }),
        makeRow({ id: 'a2', content: JSON.stringify({ name: 'A2', type: 'video', status: 'restricted', fileSize: 2000, tags: [], url: '', description: '', fileType: '', checksum: '', uploadedBy: '', owner: '', license: '', expiryDate: null, metadata: {}, notes: '' }) }),
        makeRow({ id: 'a3', content: JSON.stringify({ name: 'A3', type: 'document', status: 'archived', fileSize: 500, tags: [], url: '', description: '', fileType: '', checksum: '', uploadedBy: '', owner: '', license: '', expiryDate: null, metadata: {}, notes: '' }) }),
      ];
      if (t === 'asset_collection') return [makeCollectionRow()];
      return [];
    };
    const m = await DAMService.getDAMMetrics('org-1');
    assert.equal(m.totalAssets, 3);
    assert.equal(m.activeAssets, 1);
    assert.equal(m.collections, 1);
    assert.equal(m.storageUsed, 3500);
    assert.equal(m.restrictedAssets, 1);
  });

  it('getDAMStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'digital_asset') return [makeRow()];
      if (t === 'asset_collection') return [makeCollectionRow()];
      if (t === 'asset_version') return [makeVersionRow()];
      if (t === 'asset_permission') return [makePermissionRow()];
      return [];
    };
    const s = await DAMService.getDAMStats('org-1');
    assert.equal(s.assetCount, 1);
    assert.equal(s.activeAssetCount, 1);
    assert.equal(s.collectionCount, 1);
    assert.equal(s.versionCount, 1);
    assert.equal(s.permissionCount, 1);
    assert.equal(s.byAssetType['image'], 1);
    assert.equal(s.byAssetStatus['active'], 1);
    assert.equal(s.byCollectionType['campaign'], 1);
    assert.equal(s.byPermissionType['view'], 1);
    assert.equal(s.byPermissionLevel['internal'], 1);
  });
});
