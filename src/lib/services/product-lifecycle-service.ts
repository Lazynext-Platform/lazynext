import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ProductStatus = 'concept' | 'development' | 'testing' | 'launched' | 'mature' | 'declining' | 'end_of_life' | 'discontinued';
export type PhaseType = 'ideation' | 'research' | 'design' | 'development' | 'testing' | 'launch' | 'growth' | 'maturity' | 'decline' | 'retirement';
export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type VersionStatus = 'draft' | 'released' | 'deprecated' | 'beta' | 'rc' | 'eol';
export type EolStatus = 'planned' | 'announced' | 'in_effect' | 'completed' | 'cancelled';
export type EolReason = 'end_of_life' | 'end_of_support' | 'replaced' | 'obsolete' | 'strategic' | 'compliance' | 'security';

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

export interface ProductItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  status: ProductStatus;
  owner: string;
  startDate: Date | null;
  targetLaunchDate: Date | null;
  actualLaunchDate: Date | null;
  budget: number;
  priority: string;
  tags: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecyclePhase {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  name: string;
  type: PhaseType;
  description: string;
  status: PhaseStatus;
  startDate: Date | null;
  endDate: Date | null;
  owner: string;
  deliverables: string[];
  dependencies: string[];
  milestones: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVersion {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  version: string;
  status: VersionStatus;
  releaseDate: Date | null;
  description: string;
  changes: string[];
  features: string[];
  bugFixes: string[];
  breakingChanges: string[];
  downloadUrl: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EndOfLife {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  versionId: string | null;
  reason: EolReason;
  status: EolStatus;
  announcementDate: Date | null;
  effectiveDate: Date | null;
  endOfSupportDate: Date | null;
  migrationPath: string;
  replacement: string;
  description: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductLifecycleMetrics {
  activeProducts: number;
  productsByStage: Record<string, number>;
  upcomingLaunches: number;
  eolItems: number;
}

export interface ProductLifecycleStats {
  productCount: number;
  phaseCount: number;
  versionCount: number;
  eolCount: number;
  activeProductCount: number;
  byProductStatus: Record<string, number>;
  byPhaseType: Record<string, number>;
  byPhaseStatus: Record<string, number>;
  byVersionStatus: Record<string, number>;
  byEolStatus: Record<string, number>;
  byEolReason: Record<string, number>;
}

// ── Input / Options ──

export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
  status?: ProductStatus;
  owner?: string;
  startDate?: string;
  targetLaunchDate?: string;
  actualLaunchDate?: string;
  budget?: number;
  priority?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  status?: ProductStatus;
  owner?: string;
  startDate?: string;
  targetLaunchDate?: string;
  actualLaunchDate?: string;
  budget?: number;
  priority?: string;
  tags?: string[];
  notes?: string;
}

export interface ListProductsOpts {
  status?: ProductStatus;
  category?: string;
  owner?: string;
}

export interface CreatePhaseInput {
  productId: string;
  name: string;
  type: PhaseType;
  description?: string;
  status?: PhaseStatus;
  startDate?: string;
  endDate?: string;
  owner?: string;
  deliverables?: string[];
  dependencies?: string[];
  milestones?: string[];
  notes?: string;
}

export interface UpdatePhaseInput {
  name?: string;
  type?: PhaseType;
  description?: string;
  status?: PhaseStatus;
  startDate?: string;
  endDate?: string;
  owner?: string;
  deliverables?: string[];
  dependencies?: string[];
  milestones?: string[];
  notes?: string;
}

export interface ListPhasesOpts {
  productId?: string;
  type?: PhaseType;
  status?: PhaseStatus;
}

export interface CreateVersionInput {
  productId: string;
  version: string;
  status?: VersionStatus;
  releaseDate?: string;
  description?: string;
  changes?: string[];
  features?: string[];
  bugFixes?: string[];
  breakingChanges?: string[];
  downloadUrl?: string;
  notes?: string;
}

export interface UpdateVersionInput {
  version?: string;
  status?: VersionStatus;
  releaseDate?: string;
  description?: string;
  changes?: string[];
  features?: string[];
  bugFixes?: string[];
  breakingChanges?: string[];
  downloadUrl?: string;
  notes?: string;
}

export interface ListVersionsOpts {
  productId?: string;
  status?: VersionStatus;
}

export interface CreateEolInput {
  productId: string;
  versionId?: string;
  reason: EolReason;
  status?: EolStatus;
  announcementDate?: string;
  effectiveDate?: string;
  endOfSupportDate?: string;
  migrationPath?: string;
  replacement?: string;
  description?: string;
  notes?: string;
}

export interface UpdateEolInput {
  reason?: EolReason;
  status?: EolStatus;
  announcementDate?: string;
  effectiveDate?: string;
  endOfSupportDate?: string;
  migrationPath?: string;
  replacement?: string;
  description?: string;
  notes?: string;
}

export interface ListEolsOpts {
  productId?: string;
  status?: EolStatus;
  reason?: EolReason;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toProduct(row: MemoryRow): ProductItem {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    description: (c.description as string) ?? '',
    category: (c.category as string) ?? '',
    status: (c.status as ProductStatus) ?? 'concept',
    owner: (c.owner as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    targetLaunchDate: c.targetLaunchDate ? new Date(c.targetLaunchDate as string) : null,
    actualLaunchDate: c.actualLaunchDate ? new Date(c.actualLaunchDate as string) : null,
    budget: (c.budget as number) ?? 0,
    priority: (c.priority as string) ?? 'medium',
    tags: (c.tags as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPhase(row: MemoryRow): LifecyclePhase {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    productId: (c.productId as string) ?? '',
    name: (c.name as string) ?? '',
    type: (c.type as PhaseType) ?? 'ideation',
    description: (c.description as string) ?? '',
    status: (c.status as PhaseStatus) ?? 'not_started',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    owner: (c.owner as string) ?? '',
    deliverables: (c.deliverables as string[]) ?? [],
    dependencies: (c.dependencies as string[]) ?? [],
    milestones: (c.milestones as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toVersion(row: MemoryRow): ProductVersion {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    productId: (c.productId as string) ?? '',
    version: (c.version as string) ?? '',
    status: (c.status as VersionStatus) ?? 'draft',
    releaseDate: c.releaseDate ? new Date(c.releaseDate as string) : null,
    description: (c.description as string) ?? '',
    changes: (c.changes as string[]) ?? [],
    features: (c.features as string[]) ?? [],
    bugFixes: (c.bugFixes as string[]) ?? [],
    breakingChanges: (c.breakingChanges as string[]) ?? [],
    downloadUrl: (c.downloadUrl as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEol(row: MemoryRow): EndOfLife {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    productId: (c.productId as string) ?? '',
    versionId: (c.versionId as string) ?? null,
    reason: (c.reason as EolReason) ?? 'end_of_life',
    status: (c.status as EolStatus) ?? 'planned',
    announcementDate: c.announcementDate ? new Date(c.announcementDate as string) : null,
    effectiveDate: c.effectiveDate ? new Date(c.effectiveDate as string) : null,
    endOfSupportDate: c.endOfSupportDate ? new Date(c.endOfSupportDate as string) : null,
    migrationPath: (c.migrationPath as string) ?? '',
    replacement: (c.replacement as string) ?? '',
    description: (c.description as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const ProductLifecycleService = {
  // ── Products ──

  async createProduct(organizationId: string, workspaceId: string, input: CreateProductInput, createdBy: string): Promise<ProductItem> {
    const content = {
      name: input.name.trim(),
      description: input.description ?? '',
      category: input.category ?? '',
      status: input.status ?? 'concept',
      owner: input.owner ?? '',
      startDate: input.startDate ?? null,
      targetLaunchDate: input.targetLaunchDate ?? null,
      actualLaunchDate: input.actualLaunchDate ?? null,
      budget: input.budget ?? 0,
      priority: input.priority ?? 'medium',
      tags: input.tags ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'product_item',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['product_item', content.status, content.priority]),
        createdBy,
      },
    });
    return toProduct(row as MemoryRow);
  },

  async getProduct(id: string): Promise<ProductItem | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'product_item') return null;
    return toProduct(row as MemoryRow);
  },

  async listProducts(organizationId: string, opts: ListProductsOpts = {}): Promise<ProductItem[]> {
    const where: Record<string, unknown> = { organizationId, type: 'product_item' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.category) conditions.push({ content: { contains: `"category":"${opts.category}"` } });
    if (opts.owner) conditions.push({ content: { contains: `"owner":"${opts.owner}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toProduct);
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<ProductItem | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const status = input.status !== undefined ? input.status : (c.status as ProductStatus);
    const priority = input.priority !== undefined ? input.priority : (c.priority as string);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.targetLaunchDate !== undefined && { targetLaunchDate: input.targetLaunchDate }),
      ...(input.actualLaunchDate !== undefined && { actualLaunchDate: input.actualLaunchDate }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['product_item', status, priority]) },
    }), null);
    if (!row) return null;
    return toProduct(row as MemoryRow);
  },

  async deleteProduct(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async launchProduct(id: string, _launchedBy: string): Promise<ProductItem | null> {
    return ProductLifecycleService.updateProduct(id, { status: 'launched', actualLaunchDate: new Date().toISOString() });
  },

  async retireProduct(id: string, _retiredBy: string): Promise<ProductItem | null> {
    return ProductLifecycleService.updateProduct(id, { status: 'end_of_life' });
  },

  // ── Phases ──

  async createPhase(organizationId: string, workspaceId: string, input: CreatePhaseInput, createdBy: string): Promise<LifecyclePhase> {
    const content = {
      productId: input.productId,
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'not_started',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      owner: input.owner ?? '',
      deliverables: input.deliverables ?? [],
      dependencies: input.dependencies ?? [],
      milestones: input.milestones ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'lifecycle_phase',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.productId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lifecycle_phase', content.type, content.status]),
        createdBy,
      },
    });
    return toPhase(row as MemoryRow);
  },

  async getPhase(id: string): Promise<LifecyclePhase | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lifecycle_phase') return null;
    return toPhase(row as MemoryRow);
  },

  async listPhases(organizationId: string, opts: ListPhasesOpts = {}): Promise<LifecyclePhase[]> {
    const where: Record<string, unknown> = { organizationId, type: 'lifecycle_phase' };
    const conditions: unknown[] = [];
    if (opts.productId) conditions.push({ content: { contains: `"productId":"${opts.productId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPhase);
  },

  async updatePhase(id: string, input: UpdatePhaseInput): Promise<LifecyclePhase | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const type = input.type !== undefined ? input.type : (c.type as PhaseType);
    const status = input.status !== undefined ? input.status : (c.status as PhaseStatus);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.deliverables !== undefined && { deliverables: input.deliverables }),
      ...(input.dependencies !== undefined && { dependencies: input.dependencies }),
      ...(input.milestones !== undefined && { milestones: input.milestones }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lifecycle_phase', type, status]) },
    }), null);
    if (!row) return null;
    return toPhase(row as MemoryRow);
  },

  async deletePhase(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startPhase(id: string, _startedBy: string): Promise<LifecyclePhase | null> {
    return ProductLifecycleService.updatePhase(id, { status: 'in_progress' });
  },

  async completePhase(id: string, _completedBy: string): Promise<LifecyclePhase | null> {
    return ProductLifecycleService.updatePhase(id, { status: 'completed' });
  },

  async holdPhase(id: string, _holdBy: string): Promise<LifecyclePhase | null> {
    return ProductLifecycleService.updatePhase(id, { status: 'on_hold' });
  },

  // ── Versions ──

  async createVersion(organizationId: string, workspaceId: string, input: CreateVersionInput, createdBy: string): Promise<ProductVersion> {
    const content = {
      productId: input.productId,
      version: input.version.trim(),
      status: input.status ?? 'draft',
      releaseDate: input.releaseDate ?? null,
      description: input.description ?? '',
      changes: input.changes ?? [],
      features: input.features ?? [],
      bugFixes: input.bugFixes ?? [],
      breakingChanges: input.breakingChanges ?? [],
      downloadUrl: input.downloadUrl ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'product_version',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.productId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['product_version', content.status]),
        createdBy,
      },
    });
    return toVersion(row as MemoryRow);
  },

  async getVersion(id: string): Promise<ProductVersion | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'product_version') return null;
    return toVersion(row as MemoryRow);
  },

  async listVersions(organizationId: string, opts: ListVersionsOpts = {}): Promise<ProductVersion[]> {
    const where: Record<string, unknown> = { organizationId, type: 'product_version' };
    const conditions: unknown[] = [];
    if (opts.productId) conditions.push({ content: { contains: `"productId":"${opts.productId}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVersion);
  },

  async updateVersion(id: string, input: UpdateVersionInput): Promise<ProductVersion | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const status = input.status !== undefined ? input.status : (c.status as VersionStatus);
    const content = {
      ...c,
      ...(input.version !== undefined && { version: input.version.trim() }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.releaseDate !== undefined && { releaseDate: input.releaseDate }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.changes !== undefined && { changes: input.changes }),
      ...(input.features !== undefined && { features: input.features }),
      ...(input.bugFixes !== undefined && { bugFixes: input.bugFixes }),
      ...(input.breakingChanges !== undefined && { breakingChanges: input.breakingChanges }),
      ...(input.downloadUrl !== undefined && { downloadUrl: input.downloadUrl }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['product_version', status]) },
    }), null);
    if (!row) return null;
    return toVersion(row as MemoryRow);
  },

  async deleteVersion(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async releaseVersion(id: string, _releasedBy: string): Promise<ProductVersion | null> {
    return ProductLifecycleService.updateVersion(id, { status: 'released', releaseDate: new Date().toISOString() });
  },

  async deprecateVersion(id: string, _deprecatedBy: string): Promise<ProductVersion | null> {
    return ProductLifecycleService.updateVersion(id, { status: 'deprecated' });
  },

  // ── End of Life ──

  async createEol(organizationId: string, workspaceId: string, input: CreateEolInput, createdBy: string): Promise<EndOfLife> {
    const content = {
      productId: input.productId,
      versionId: input.versionId ?? null,
      reason: input.reason,
      status: input.status ?? 'planned',
      announcementDate: input.announcementDate ?? null,
      effectiveDate: input.effectiveDate ?? null,
      endOfSupportDate: input.endOfSupportDate ?? null,
      migrationPath: input.migrationPath ?? '',
      replacement: input.replacement ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'end_of_life',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.productId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['end_of_life', content.reason, content.status]),
        createdBy,
      },
    });
    return toEol(row as MemoryRow);
  },

  async getEol(id: string): Promise<EndOfLife | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'end_of_life') return null;
    return toEol(row as MemoryRow);
  },

  async listEols(organizationId: string, opts: ListEolsOpts = {}): Promise<EndOfLife[]> {
    const where: Record<string, unknown> = { organizationId, type: 'end_of_life' };
    const conditions: unknown[] = [];
    if (opts.productId) conditions.push({ content: { contains: `"productId":"${opts.productId}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.reason) conditions.push({ content: { contains: `"reason":"${opts.reason}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEol);
  },

  async updateEol(id: string, input: UpdateEolInput): Promise<EndOfLife | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const reason = input.reason !== undefined ? input.reason : (c.reason as EolReason);
    const status = input.status !== undefined ? input.status : (c.status as EolStatus);
    const content = {
      ...c,
      ...(input.reason !== undefined && { reason: input.reason }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.announcementDate !== undefined && { announcementDate: input.announcementDate }),
      ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
      ...(input.endOfSupportDate !== undefined && { endOfSupportDate: input.endOfSupportDate }),
      ...(input.migrationPath !== undefined && { migrationPath: input.migrationPath }),
      ...(input.replacement !== undefined && { replacement: input.replacement }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['end_of_life', reason, status]) },
    }), null);
    if (!row) return null;
    return toEol(row as MemoryRow);
  },

  async deleteEol(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async announceEol(id: string, _announcedBy: string): Promise<EndOfLife | null> {
    return ProductLifecycleService.updateEol(id, { status: 'announced', announcementDate: new Date().toISOString() });
  },

  async effectEol(id: string, _effectedBy: string): Promise<EndOfLife | null> {
    return ProductLifecycleService.updateEol(id, { status: 'in_effect', effectiveDate: new Date().toISOString() });
  },

  async completeEol(id: string, _completedBy: string): Promise<EndOfLife | null> {
    return ProductLifecycleService.updateEol(id, { status: 'completed' });
  },

  // ── Metrics & Stats ──

  async getProductLifecycleMetrics(organizationId: string): Promise<ProductLifecycleMetrics> {
    const products = await ProductLifecycleService.listProducts(organizationId);
    const eols = await ProductLifecycleService.listEols(organizationId);
    const activeProducts = products.filter((p) => p.status !== 'end_of_life' && p.status !== 'discontinued').length;
    const productsByStage: Record<string, number> = {};
    for (const p of products) { productsByStage[p.status] = (productsByStage[p.status] ?? 0) + 1; }
    const now = new Date();
    const upcomingLaunches = products.filter(
      (p) => p.targetLaunchDate && p.targetLaunchDate > now && (p.status === 'concept' || p.status === 'development' || p.status === 'testing'),
    ).length;
    const eolItems = eols.filter((e) => e.status === 'planned' || e.status === 'announced' || e.status === 'in_effect').length;
    return { activeProducts, productsByStage, upcomingLaunches, eolItems };
  },

  async getProductLifecycleStats(organizationId: string): Promise<ProductLifecycleStats> {
    const [products, phases, versions, eols] = await Promise.all([
      ProductLifecycleService.listProducts(organizationId),
      ProductLifecycleService.listPhases(organizationId),
      ProductLifecycleService.listVersions(organizationId),
      ProductLifecycleService.listEols(organizationId),
    ]);
    const byProductStatus: Record<string, number> = {};
    const byPhaseType: Record<string, number> = {};
    const byPhaseStatus: Record<string, number> = {};
    const byVersionStatus: Record<string, number> = {};
    const byEolStatus: Record<string, number> = {};
    const byEolReason: Record<string, number> = {};
    for (const p of products) { byProductStatus[p.status] = (byProductStatus[p.status] ?? 0) + 1; }
    for (const ph of phases) { byPhaseType[ph.type] = (byPhaseType[ph.type] ?? 0) + 1; byPhaseStatus[ph.status] = (byPhaseStatus[ph.status] ?? 0) + 1; }
    for (const v of versions) { byVersionStatus[v.status] = (byVersionStatus[v.status] ?? 0) + 1; }
    for (const e of eols) { byEolStatus[e.status] = (byEolStatus[e.status] ?? 0) + 1; byEolReason[e.reason] = (byEolReason[e.reason] ?? 0) + 1; }
    return {
      productCount: products.length,
      phaseCount: phases.length,
      versionCount: versions.length,
      eolCount: eols.length,
      activeProductCount: products.filter((p) => p.status !== 'end_of_life' && p.status !== 'discontinued').length,
      byProductStatus, byPhaseType, byPhaseStatus, byVersionStatus, byEolStatus, byEolReason,
    };
  },
};
