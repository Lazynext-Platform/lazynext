import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'presentation' | 'spreadsheet' | 'graphic' | '3d_model' | 'font' | 'template' | 'archive' | 'other';
export type AssetStatus = 'active' | 'archived' | 'deleted' | 'pending_review' | 'restricted';
export type PermissionType = 'view' | 'download' | 'edit' | 'delete' | 'share' | 'admin';
export type PermissionLevel = 'public' | 'internal' | 'restricted' | 'confidential';
export type CollectionType = 'project' | 'campaign' | 'brand' | 'department' | 'event' | 'product' | 'custom';

// ── Interfaces ──

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
  accessPolicy: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DigitalAsset {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AssetType;
  url: string;
  description: string;
  tags: string[];
  status: AssetStatus;
  fileSize: number;
  fileType: string;
  checksum: string;
  uploadedBy: string;
  owner: string;
  license: string;
  expiryDate: Date | null;
  metadata: Record<string, unknown>;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetCollection {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CollectionType;
  description: string;
  assetIds: string[];
  status: AssetStatus;
  owner: string;
  color: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetVersion {
  id: string;
  organizationId: string;
  workspaceId: string;
  assetId: string;
  version: string;
  url: string;
  fileSize: number;
  fileType: string;
  checksum: string;
  uploadedBy: string;
  changeLog: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetPermission {
  id: string;
  organizationId: string;
  workspaceId: string;
  assetId: string | null;
  collectionId: string | null;
  type: PermissionType;
  level: PermissionLevel;
  grantedTo: string;
  grantedBy: string;
  grantedDate: Date | null;
  expiresDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DAMMetrics {
  totalAssets: number;
  activeAssets: number;
  collections: number;
  storageUsed: number;
  restrictedAssets: number;
}

export interface DAMStats {
  assetCount: number;
  activeAssetCount: number;
  collectionCount: number;
  versionCount: number;
  permissionCount: number;
  byAssetType: Record<string, number>;
  byAssetStatus: Record<string, number>;
  byCollectionType: Record<string, number>;
  byPermissionType: Record<string, number>;
  byPermissionLevel: Record<string, number>;
}

// ── Input / Options ──

export interface CreateAssetInput {
  name: string;
  type: AssetType;
  url?: string;
  description?: string;
  tags?: string[];
  status?: AssetStatus;
  fileSize?: number;
  fileType?: string;
  checksum?: string;
  uploadedBy?: string;
  owner?: string;
  license?: string;
  expiryDate?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  type?: AssetType;
  url?: string;
  description?: string;
  tags?: string[];
  status?: AssetStatus;
  fileSize?: number;
  fileType?: string;
  checksum?: string;
  uploadedBy?: string;
  owner?: string;
  license?: string;
  expiryDate?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}

export interface ListAssetsOpts {
  type?: AssetType;
  status?: AssetStatus;
  owner?: string;
}

export interface CreateCollectionInput {
  name: string;
  type: CollectionType;
  description?: string;
  assetIds?: string[];
  status?: AssetStatus;
  owner?: string;
  color?: string;
  notes?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  type?: CollectionType;
  description?: string;
  assetIds?: string[];
  status?: AssetStatus;
  owner?: string;
  color?: string;
  notes?: string;
}

export interface ListCollectionsOpts {
  type?: CollectionType;
  status?: AssetStatus;
}

export interface CreateVersionInput {
  assetId: string;
  version: string;
  url?: string;
  fileSize?: number;
  fileType?: string;
  checksum?: string;
  uploadedBy?: string;
  changeLog?: string;
  notes?: string;
}

export interface UpdateVersionInput {
  version?: string;
  url?: string;
  fileSize?: number;
  fileType?: string;
  checksum?: string;
  uploadedBy?: string;
  changeLog?: string;
  notes?: string;
}

export interface ListVersionsOpts {
  assetId?: string;
}

export interface CreatePermissionInput {
  assetId?: string;
  collectionId?: string;
  type: PermissionType;
  level: PermissionLevel;
  grantedTo?: string;
  grantedBy?: string;
  grantedDate?: string;
  expiresDate?: string;
  notes?: string;
}

export interface UpdatePermissionInput {
  type?: PermissionType;
  level?: PermissionLevel;
  grantedTo?: string;
  grantedBy?: string;
  grantedDate?: string;
  expiresDate?: string;
  notes?: string;
}

export interface ListPermissionsOpts {
  assetId?: string;
  collectionId?: string;
  type?: PermissionType;
  level?: PermissionLevel;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toAsset(row: MemoryRow): DigitalAsset {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AssetType) ?? 'other',
    url: (c.url as string) ?? '',
    description: (c.description as string) ?? '',
    tags: (c.tags as string[]) ?? [],
    status: (c.status as AssetStatus) ?? 'active',
    fileSize: (c.fileSize as number) ?? 0,
    fileType: (c.fileType as string) ?? '',
    checksum: (c.checksum as string) ?? '',
    uploadedBy: (c.uploadedBy as string) ?? '',
    owner: (c.owner as string) ?? '',
    license: (c.license as string) ?? '',
    expiryDate: c.expiryDate ? new Date(c.expiryDate as string) : null,
    metadata: (c.metadata as Record<string, unknown>) ?? {},
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCollection(row: MemoryRow): AssetCollection {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CollectionType) ?? 'custom',
    description: (c.description as string) ?? '',
    assetIds: (c.assetIds as string[]) ?? [],
    status: (c.status as AssetStatus) ?? 'active',
    owner: (c.owner as string) ?? '',
    color: (c.color as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toVersion(row: MemoryRow): AssetVersion {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    assetId: (c.assetId as string) ?? '',
    version: (c.version as string) ?? '',
    url: (c.url as string) ?? '',
    fileSize: (c.fileSize as number) ?? 0,
    fileType: (c.fileType as string) ?? '',
    checksum: (c.checksum as string) ?? '',
    uploadedBy: (c.uploadedBy as string) ?? '',
    changeLog: (c.changeLog as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPermission(row: MemoryRow): AssetPermission {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    assetId: (c.assetId as string) ?? null,
    collectionId: (c.collectionId as string) ?? null,
    type: (c.type as PermissionType) ?? 'view',
    level: (c.level as PermissionLevel) ?? 'internal',
    grantedTo: (c.grantedTo as string) ?? '',
    grantedBy: (c.grantedBy as string) ?? '',
    grantedDate: c.grantedDate ? new Date(c.grantedDate as string) : null,
    expiresDate: c.expiresDate ? new Date(c.expiresDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const DAMService = {
  // ── Assets ──

  async createAsset(organizationId: string, workspaceId: string, input: CreateAssetInput, createdBy: string): Promise<DigitalAsset> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      url: input.url ?? '',
      description: input.description ?? '',
      tags: input.tags ?? [],
      status: input.status ?? 'active',
      fileSize: input.fileSize ?? 0,
      fileType: input.fileType ?? '',
      checksum: input.checksum ?? '',
      uploadedBy: input.uploadedBy ?? '',
      owner: input.owner ?? '',
      license: input.license ?? '',
      expiryDate: input.expiryDate ?? null,
      metadata: input.metadata ?? {},
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'digital_asset',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['digital_asset', content.type, content.status]),
        createdBy,
      },
    });
    return toAsset(row as MemoryRow);
  },

  async getAsset(id: string): Promise<DigitalAsset | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'digital_asset') return null;
    return toAsset(row as MemoryRow);
  },

  async listAssets(organizationId: string, opts: ListAssetsOpts = {}): Promise<DigitalAsset[]> {
    const where: Record<string, unknown> = { organizationId, type: 'digital_asset' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.owner) conditions.push({ content: { contains: `"owner":"${opts.owner}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAsset);
  },

  async updateAsset(id: string, input: UpdateAssetInput): Promise<DigitalAsset | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const assetType = input.type !== undefined ? input.type : (c.type as AssetType);
    const assetStatus = input.status !== undefined ? input.status : (c.status as AssetStatus);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.fileSize !== undefined && { fileSize: input.fileSize }),
      ...(input.fileType !== undefined && { fileType: input.fileType }),
      ...(input.checksum !== undefined && { checksum: input.checksum }),
      ...(input.uploadedBy !== undefined && { uploadedBy: input.uploadedBy }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.license !== undefined && { license: input.license }),
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['digital_asset', assetType, assetStatus]) },
    }), null);
    if (!row) return null;
    return toAsset(row as MemoryRow);
  },

  async deleteAsset(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async archiveAsset(id: string, _archivedBy: string): Promise<DigitalAsset | null> {
    return DAMService.updateAsset(id, { status: 'archived' });
  },

  async restrictAsset(id: string, _restrictedBy: string): Promise<DigitalAsset | null> {
    return DAMService.updateAsset(id, { status: 'restricted' });
  },

  // ── Collections ──

  async createCollection(organizationId: string, workspaceId: string, input: CreateCollectionInput, createdBy: string): Promise<AssetCollection> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      assetIds: input.assetIds ?? [],
      status: input.status ?? 'active',
      owner: input.owner ?? '',
      color: input.color ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'asset_collection',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['asset_collection', content.type, content.status]),
        createdBy,
      },
    });
    return toCollection(row as MemoryRow);
  },

  async getCollection(id: string): Promise<AssetCollection | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'asset_collection') return null;
    return toCollection(row as MemoryRow);
  },

  async listCollections(organizationId: string, opts: ListCollectionsOpts = {}): Promise<AssetCollection[]> {
    const where: Record<string, unknown> = { organizationId, type: 'asset_collection' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCollection);
  },

  async updateCollection(id: string, input: UpdateCollectionInput): Promise<AssetCollection | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const collectionType = input.type !== undefined ? input.type : (c.type as CollectionType);
    const collectionStatus = input.status !== undefined ? input.status : (c.status as AssetStatus);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.assetIds !== undefined && { assetIds: input.assetIds }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['asset_collection', collectionType, collectionStatus]) },
    }), null);
    if (!row) return null;
    return toCollection(row as MemoryRow);
  },

  async deleteCollection(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Versions ──

  async createVersion(organizationId: string, workspaceId: string, input: CreateVersionInput, createdBy: string): Promise<AssetVersion> {
    const content = {
      assetId: input.assetId,
      version: input.version.trim(),
      url: input.url ?? '',
      fileSize: input.fileSize ?? 0,
      fileType: input.fileType ?? '',
      checksum: input.checksum ?? '',
      uploadedBy: input.uploadedBy ?? '',
      changeLog: input.changeLog ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'asset_version',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.assetId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['asset_version', content.version]),
        createdBy,
      },
    });
    return toVersion(row as MemoryRow);
  },

  async getVersion(id: string): Promise<AssetVersion | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'asset_version') return null;
    return toVersion(row as MemoryRow);
  },

  async listVersions(organizationId: string, opts: ListVersionsOpts = {}): Promise<AssetVersion[]> {
    const where: Record<string, unknown> = { organizationId, type: 'asset_version' };
    const conditions: unknown[] = [];
    if (opts.assetId) conditions.push({ content: { contains: `"assetId":"${opts.assetId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVersion);
  },

  async updateVersion(id: string, input: UpdateVersionInput): Promise<AssetVersion | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const versionStr = input.version !== undefined ? input.version.trim() : (c.version as string);
    const content = {
      ...c,
      ...(input.version !== undefined && { version: input.version.trim() }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.fileSize !== undefined && { fileSize: input.fileSize }),
      ...(input.fileType !== undefined && { fileType: input.fileType }),
      ...(input.checksum !== undefined && { checksum: input.checksum }),
      ...(input.uploadedBy !== undefined && { uploadedBy: input.uploadedBy }),
      ...(input.changeLog !== undefined && { changeLog: input.changeLog }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['asset_version', versionStr]) },
    }), null);
    if (!row) return null;
    return toVersion(row as MemoryRow);
  },

  async deleteVersion(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Permissions ──

  async createPermission(organizationId: string, workspaceId: string, input: CreatePermissionInput, createdBy: string): Promise<AssetPermission> {
    const content = {
      assetId: input.assetId ?? null,
      collectionId: input.collectionId ?? null,
      type: input.type,
      level: input.level,
      grantedTo: input.grantedTo ?? '',
      grantedBy: input.grantedBy ?? '',
      grantedDate: input.grantedDate ?? null,
      expiresDate: input.expiresDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'asset_permission',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.assetId ?? input.collectionId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['asset_permission', content.type, content.level]),
        createdBy,
      },
    });
    return toPermission(row as MemoryRow);
  },

  async getPermission(id: string): Promise<AssetPermission | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'asset_permission') return null;
    return toPermission(row as MemoryRow);
  },

  async listPermissions(organizationId: string, opts: ListPermissionsOpts = {}): Promise<AssetPermission[]> {
    const where: Record<string, unknown> = { organizationId, type: 'asset_permission' };
    const conditions: unknown[] = [];
    if (opts.assetId) conditions.push({ content: { contains: `"assetId":"${opts.assetId}"` } });
    if (opts.collectionId) conditions.push({ content: { contains: `"collectionId":"${opts.collectionId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.level) conditions.push({ content: { contains: `"level":"${opts.level}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPermission);
  },

  async updatePermission(id: string, input: UpdatePermissionInput): Promise<AssetPermission | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const permType = input.type !== undefined ? input.type : (c.type as PermissionType);
    const permLevel = input.level !== undefined ? input.level : (c.level as PermissionLevel);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.level !== undefined && { level: input.level }),
      ...(input.grantedTo !== undefined && { grantedTo: input.grantedTo }),
      ...(input.grantedBy !== undefined && { grantedBy: input.grantedBy }),
      ...(input.grantedDate !== undefined && { grantedDate: input.grantedDate }),
      ...(input.expiresDate !== undefined && { expiresDate: input.expiresDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['asset_permission', permType, permLevel]) },
    }), null);
    if (!row) return null;
    return toPermission(row as MemoryRow);
  },

  async deletePermission(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getDAMMetrics(organizationId: string): Promise<DAMMetrics> {
    const assets = await DAMService.listAssets(organizationId);
    const collections = await DAMService.listCollections(organizationId);
    const totalAssets = assets.length;
    const activeAssets = assets.filter((a) => a.status === 'active').length;
    const restrictedAssets = assets.filter((a) => a.status === 'restricted').length;
    const storageUsed = assets.reduce((sum, a) => sum + (a.fileSize || 0), 0);
    return { totalAssets, activeAssets, collections: collections.length, storageUsed, restrictedAssets };
  },

  async getDAMStats(organizationId: string): Promise<DAMStats> {
    const [assets, collections, versions, permissions] = await Promise.all([
      DAMService.listAssets(organizationId),
      DAMService.listCollections(organizationId),
      DAMService.listVersions(organizationId),
      DAMService.listPermissions(organizationId),
    ]);
    const byAssetType: Record<string, number> = {};
    const byAssetStatus: Record<string, number> = {};
    const byCollectionType: Record<string, number> = {};
    const byPermissionType: Record<string, number> = {};
    const byPermissionLevel: Record<string, number> = {};
    for (const a of assets) { byAssetType[a.type] = (byAssetType[a.type] ?? 0) + 1; byAssetStatus[a.status] = (byAssetStatus[a.status] ?? 0) + 1; }
    for (const col of collections) { byCollectionType[col.type] = (byCollectionType[col.type] ?? 0) + 1; }
    for (const p of permissions) { byPermissionType[p.type] = (byPermissionType[p.type] ?? 0) + 1; byPermissionLevel[p.level] = (byPermissionLevel[p.level] ?? 0) + 1; }
    return {
      assetCount: assets.length,
      activeAssetCount: assets.filter((a) => a.status === 'active').length,
      collectionCount: collections.length,
      versionCount: versions.length,
      permissionCount: permissions.length,
      byAssetType, byAssetStatus, byCollectionType, byPermissionType, byPermissionLevel,
    };
  },
};
