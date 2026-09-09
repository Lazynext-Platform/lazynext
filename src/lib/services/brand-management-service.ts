import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type GuidelineCategory = 'visual' | 'voice' | 'messaging' | 'logo' | 'color' | 'typography' | 'imagery' | 'tone' | 'positioning' | 'values';
export type GuidelineStatus = 'draft' | 'active' | 'archived' | 'under_review';
export type AssetType = 'logo' | 'image' | 'video' | 'document' | 'template' | 'font' | 'color_palette' | 'icon_set' | 'other';
export type AssetStatus = 'active' | 'deprecated' | 'archived' | 'pending_approval';
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type AuditFrequency = 'quarterly' | 'semi_annual' | 'annual' | 'biennial' | 'ad_hoc';
export type ConsistencyStatus = 'compliant' | 'minor_issue' | 'major_issue' | 'non_compliant';
export type ConsistencySeverity = 'low' | 'medium' | 'high' | 'critical';

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

export interface BrandGuideline {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  category: GuidelineCategory;
  description: string;
  guidelines: string;
  version: string;
  status: GuidelineStatus;
  effectiveDate: Date | null;
  reviewedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandAsset {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AssetType;
  url: string;
  description: string;
  tags: string[];
  status: AssetStatus;
  version: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandAudit {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  frequency: AuditFrequency;
  description: string;
  scope: string;
  startDate: Date | null;
  endDate: Date | null;
  status: AuditStatus;
  leadAuditor: string;
  findings: string;
  score: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandConsistency {
  id: string;
  organizationId: string;
  workspaceId: string;
  auditId: string | null;
  assetId: string | null;
  guidelineId: string | null;
  title: string;
  status: ConsistencyStatus;
  severity: ConsistencySeverity;
  description: string;
  recommendation: string;
  detectedDate: Date | null;
  detectedBy: string;
  resolvedDate: Date | null;
  resolvedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandManagementMetrics {
  activeGuidelines: number;
  activeAssets: number;
  pendingAudits: number;
  complianceIssues: number;
}

export interface BrandManagementStats {
  guidelineCount: number;
  assetCount: number;
  auditCount: number;
  consistencyCount: number;
  byGuidelineCategory: Record<string, number>;
  byGuidelineStatus: Record<string, number>;
  byAssetType: Record<string, number>;
  byAssetStatus: Record<string, number>;
  byAuditStatus: Record<string, number>;
  byConsistencyStatus: Record<string, number>;
  byConsistencySeverity: Record<string, number>;
}

// ── Input / Options ──

export interface CreateGuidelineInput {
  title: string;
  category: GuidelineCategory;
  description?: string;
  guidelines?: string;
  version?: string;
  status?: GuidelineStatus;
  effectiveDate?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface UpdateGuidelineInput {
  title?: string;
  category?: GuidelineCategory;
  description?: string;
  guidelines?: string;
  version?: string;
  status?: GuidelineStatus;
  effectiveDate?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface ListGuidelinesOpts {
  category?: GuidelineCategory;
  status?: GuidelineStatus;
}

export interface CreateAssetInput {
  name: string;
  type: AssetType;
  url?: string;
  description?: string;
  tags?: string[];
  status?: AssetStatus;
  version?: string;
  fileSize?: number;
  fileType?: string;
  uploadedBy?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  type?: AssetType;
  url?: string;
  description?: string;
  tags?: string[];
  status?: AssetStatus;
  version?: string;
  fileSize?: number;
  fileType?: string;
  notes?: string;
}

export interface ListAssetsOpts {
  type?: AssetType;
  status?: AssetStatus;
}

export interface CreateAuditInput {
  title: string;
  frequency: AuditFrequency;
  description?: string;
  scope?: string;
  startDate?: string;
  endDate?: string;
  status?: AuditStatus;
  leadAuditor?: string;
  findings?: string;
  score?: number;
  notes?: string;
}

export interface UpdateAuditInput {
  title?: string;
  frequency?: AuditFrequency;
  description?: string;
  scope?: string;
  startDate?: string;
  endDate?: string;
  status?: AuditStatus;
  leadAuditor?: string;
  findings?: string;
  score?: number;
  notes?: string;
}

export interface ListAuditsOpts {
  status?: AuditStatus;
  frequency?: AuditFrequency;
}

export interface CreateConsistencyInput {
  auditId?: string;
  assetId?: string;
  guidelineId?: string;
  title: string;
  status: ConsistencyStatus;
  severity: ConsistencySeverity;
  description?: string;
  recommendation?: string;
  detectedDate?: string;
  detectedBy?: string;
  resolvedDate?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface UpdateConsistencyInput {
  auditId?: string;
  assetId?: string;
  guidelineId?: string;
  title?: string;
  status?: ConsistencyStatus;
  severity?: ConsistencySeverity;
  description?: string;
  recommendation?: string;
  detectedDate?: string;
  detectedBy?: string;
  resolvedDate?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface ListConsistenciesOpts {
  auditId?: string;
  status?: ConsistencyStatus;
  severity?: ConsistencySeverity;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toGuideline(row: MemoryRow): BrandGuideline {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    category: (c.category as GuidelineCategory) ?? 'visual',
    description: (c.description as string) ?? '',
    guidelines: (c.guidelines as string) ?? '',
    version: (c.version as string) ?? '1.0',
    status: (c.status as GuidelineStatus) ?? 'draft',
    effectiveDate: c.effectiveDate ? new Date(c.effectiveDate as string) : null,
    reviewedBy: (c.reviewedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAsset(row: MemoryRow): BrandAsset {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AssetType) ?? 'other',
    url: (c.url as string) ?? '',
    description: (c.description as string) ?? '',
    tags: (c.tags as string[]) ?? [],
    status: (c.status as AssetStatus) ?? 'active',
    version: (c.version as string) ?? '1.0',
    fileSize: (c.fileSize as number) ?? 0,
    fileType: (c.fileType as string) ?? '',
    uploadedBy: (c.uploadedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAudit(row: MemoryRow): BrandAudit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    frequency: (c.frequency as AuditFrequency) ?? 'annual',
    description: (c.description as string) ?? '',
    scope: (c.scope as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    status: (c.status as AuditStatus) ?? 'planned',
    leadAuditor: (c.leadAuditor as string) ?? '',
    findings: (c.findings as string) ?? '',
    score: (c.score as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toConsistency(row: MemoryRow): BrandConsistency {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    auditId: (c.auditId as string) ?? null,
    assetId: (c.assetId as string) ?? null,
    guidelineId: (c.guidelineId as string) ?? null,
    title: (c.title as string) ?? '',
    status: (c.status as ConsistencyStatus) ?? 'minor_issue',
    severity: (c.severity as ConsistencySeverity) ?? 'medium',
    description: (c.description as string) ?? '',
    recommendation: (c.recommendation as string) ?? '',
    detectedDate: c.detectedDate ? new Date(c.detectedDate as string) : null,
    detectedBy: (c.detectedBy as string) ?? '',
    resolvedDate: c.resolvedDate ? new Date(c.resolvedDate as string) : null,
    resolvedBy: (c.resolvedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const BrandManagementService = {
  // ── Guidelines ──

  async createGuideline(organizationId: string, workspaceId: string, input: CreateGuidelineInput, createdBy: string): Promise<BrandGuideline> {
    const content = {
      title: input.title.trim(),
      category: input.category,
      description: input.description ?? '',
      guidelines: input.guidelines ?? '',
      version: input.version ?? '1.0',
      status: input.status ?? 'draft',
      effectiveDate: input.effectiveDate ?? null,
      reviewedBy: input.reviewedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'brand_guideline',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['brand_guideline', content.category, content.status]),
        createdBy,
      },
    });
    return toGuideline(row as MemoryRow);
  },

  async getGuideline(id: string): Promise<BrandGuideline | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'brand_guideline') return null;
    return toGuideline(row as MemoryRow);
  },

  async listGuidelines(organizationId: string, opts: ListGuidelinesOpts = {}): Promise<BrandGuideline[]> {
    const where: Record<string, unknown> = { organizationId, type: 'brand_guideline' };
    const conditions: unknown[] = [];
    if (opts.category) conditions.push({ content: { contains: `"category":"${opts.category}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toGuideline);
  },

  async updateGuideline(id: string, input: UpdateGuidelineInput): Promise<BrandGuideline | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const title = input.title !== undefined ? input.title.trim() : (c.title as string);
    const category = input.category !== undefined ? input.category : (c.category as GuidelineCategory);
    const status = input.status !== undefined ? input.status : (c.status as GuidelineStatus);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.guidelines !== undefined && { guidelines: input.guidelines }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
      ...(input.reviewedBy !== undefined && { reviewedBy: input.reviewedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['brand_guideline', category, status]) },
    }), null);
    if (!row) return null;
    return toGuideline(row as MemoryRow);
  },

  async deleteGuideline(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateGuideline(id: string, _activatedBy: string): Promise<BrandGuideline | null> {
    return BrandManagementService.updateGuideline(id, { status: 'active' });
  },

  async archiveGuideline(id: string, _archivedBy: string): Promise<BrandGuideline | null> {
    return BrandManagementService.updateGuideline(id, { status: 'archived' });
  },

  // ── Assets ──

  async createAsset(organizationId: string, workspaceId: string, input: CreateAssetInput, createdBy: string): Promise<BrandAsset> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      url: input.url ?? '',
      description: input.description ?? '',
      tags: input.tags ?? [],
      status: input.status ?? 'active',
      version: input.version ?? '1.0',
      fileSize: input.fileSize ?? 0,
      fileType: input.fileType ?? '',
      uploadedBy: input.uploadedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'brand_asset',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['brand_asset', content.type, content.status]),
        createdBy,
      },
    });
    return toAsset(row as MemoryRow);
  },

  async getAsset(id: string): Promise<BrandAsset | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'brand_asset') return null;
    return toAsset(row as MemoryRow);
  },

  async listAssets(organizationId: string, opts: ListAssetsOpts = {}): Promise<BrandAsset[]> {
    const where: Record<string, unknown> = { organizationId, type: 'brand_asset' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAsset);
  },

  async updateAsset(id: string, input: UpdateAssetInput): Promise<BrandAsset | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const type = input.type !== undefined ? input.type : (c.type as AssetType);
    const status = input.status !== undefined ? input.status : (c.status as AssetStatus);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.fileSize !== undefined && { fileSize: input.fileSize }),
      ...(input.fileType !== undefined && { fileType: input.fileType }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['brand_asset', type, status]) },
    }), null);
    if (!row) return null;
    return toAsset(row as MemoryRow);
  },

  async deleteAsset(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async deprecateAsset(id: string, _deprecatedBy: string): Promise<BrandAsset | null> {
    return BrandManagementService.updateAsset(id, { status: 'deprecated' });
  },

  // ── Audits ──

  async createAudit(organizationId: string, workspaceId: string, input: CreateAuditInput, createdBy: string): Promise<BrandAudit> {
    const content = {
      title: input.title.trim(),
      frequency: input.frequency,
      description: input.description ?? '',
      scope: input.scope ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: input.status ?? 'planned',
      leadAuditor: input.leadAuditor ?? '',
      findings: input.findings ?? '',
      score: input.score ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'brand_audit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['brand_audit', content.frequency, content.status]),
        createdBy,
      },
    });
    return toAudit(row as MemoryRow);
  },

  async getAudit(id: string): Promise<BrandAudit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'brand_audit') return null;
    return toAudit(row as MemoryRow);
  },

  async listAudits(organizationId: string, opts: ListAuditsOpts = {}): Promise<BrandAudit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'brand_audit' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.frequency) conditions.push({ content: { contains: `"frequency":"${opts.frequency}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAudit);
  },

  async updateAudit(id: string, input: UpdateAuditInput): Promise<BrandAudit | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const frequency = input.frequency !== undefined ? input.frequency : (c.frequency as AuditFrequency);
    const status = input.status !== undefined ? input.status : (c.status as AuditStatus);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.leadAuditor !== undefined && { leadAuditor: input.leadAuditor }),
      ...(input.findings !== undefined && { findings: input.findings }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['brand_audit', frequency, status]) },
    }), null);
    if (!row) return null;
    return toAudit(row as MemoryRow);
  },

  async deleteAudit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startAudit(id: string, _startedBy: string): Promise<BrandAudit | null> {
    return BrandManagementService.updateAudit(id, { status: 'in_progress' });
  },

  async completeAudit(id: string, score: number, _completedBy: string): Promise<BrandAudit | null> {
    return BrandManagementService.updateAudit(id, { status: 'completed', score });
  },

  // ── Consistencies ──

  async createConsistency(organizationId: string, workspaceId: string, input: CreateConsistencyInput, createdBy: string): Promise<BrandConsistency> {
    const content = {
      auditId: input.auditId ?? null,
      assetId: input.assetId ?? null,
      guidelineId: input.guidelineId ?? null,
      title: input.title.trim(),
      status: input.status,
      severity: input.severity,
      description: input.description ?? '',
      recommendation: input.recommendation ?? '',
      detectedDate: input.detectedDate ?? null,
      detectedBy: input.detectedBy ?? '',
      resolvedDate: input.resolvedDate ?? null,
      resolvedBy: input.resolvedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'brand_consistency',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.auditId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['brand_consistency', content.status, content.severity]),
        createdBy,
      },
    });
    return toConsistency(row as MemoryRow);
  },

  async getConsistency(id: string): Promise<BrandConsistency | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'brand_consistency') return null;
    return toConsistency(row as MemoryRow);
  },

  async listConsistencies(organizationId: string, opts: ListConsistenciesOpts = {}): Promise<BrandConsistency[]> {
    const where: Record<string, unknown> = { organizationId, type: 'brand_consistency' };
    const conditions: unknown[] = [];
    if (opts.auditId) conditions.push({ content: { contains: `"auditId":"${opts.auditId}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.severity) conditions.push({ content: { contains: `"severity":"${opts.severity}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toConsistency);
  },

  async updateConsistency(id: string, input: UpdateConsistencyInput): Promise<BrandConsistency | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const status = input.status !== undefined ? input.status : (c.status as ConsistencyStatus);
    const severity = input.severity !== undefined ? input.severity : (c.severity as ConsistencySeverity);
    const content = {
      ...c,
      ...(input.auditId !== undefined && { auditId: input.auditId }),
      ...(input.assetId !== undefined && { assetId: input.assetId }),
      ...(input.guidelineId !== undefined && { guidelineId: input.guidelineId }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.recommendation !== undefined && { recommendation: input.recommendation }),
      ...(input.detectedDate !== undefined && { detectedDate: input.detectedDate }),
      ...(input.detectedBy !== undefined && { detectedBy: input.detectedBy }),
      ...(input.resolvedDate !== undefined && { resolvedDate: input.resolvedDate }),
      ...(input.resolvedBy !== undefined && { resolvedBy: input.resolvedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['brand_consistency', status, severity]) },
    }), null);
    if (!row) return null;
    return toConsistency(row as MemoryRow);
  },

  async deleteConsistency(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async resolveConsistency(id: string, resolvedBy: string): Promise<BrandConsistency | null> {
    const c = await BrandManagementService.updateConsistency(id, {
      status: 'compliant',
      resolvedDate: new Date().toISOString(),
      resolvedBy,
    });
    return c;
  },

  // ── Metrics & Stats ──

  async getBrandManagementMetrics(organizationId: string): Promise<BrandManagementMetrics> {
    const [guidelines, assets, audits, consistencies] = await Promise.all([
      BrandManagementService.listGuidelines(organizationId),
      BrandManagementService.listAssets(organizationId),
      BrandManagementService.listAudits(organizationId),
      BrandManagementService.listConsistencies(organizationId),
    ]);
    const activeGuidelines = guidelines.filter((g) => g.status === 'active').length;
    const activeAssets = assets.filter((a) => a.status === 'active').length;
    const pendingAudits = audits.filter((a) => a.status === 'planned' || a.status === 'in_progress').length;
    const complianceIssues = consistencies.filter((c) => c.status !== 'compliant').length;
    return { activeGuidelines, activeAssets, pendingAudits, complianceIssues };
  },

  async getBrandManagementStats(organizationId: string): Promise<BrandManagementStats> {
    const [guidelines, assets, audits, consistencies] = await Promise.all([
      BrandManagementService.listGuidelines(organizationId),
      BrandManagementService.listAssets(organizationId),
      BrandManagementService.listAudits(organizationId),
      BrandManagementService.listConsistencies(organizationId),
    ]);
    const byGuidelineCategory: Record<string, number> = {};
    const byGuidelineStatus: Record<string, number> = {};
    const byAssetType: Record<string, number> = {};
    const byAssetStatus: Record<string, number> = {};
    const byAuditStatus: Record<string, number> = {};
    const byConsistencyStatus: Record<string, number> = {};
    const byConsistencySeverity: Record<string, number> = {};
    for (const g of guidelines) {
      byGuidelineCategory[g.category] = (byGuidelineCategory[g.category] ?? 0) + 1;
      byGuidelineStatus[g.status] = (byGuidelineStatus[g.status] ?? 0) + 1;
    }
    for (const a of assets) {
      byAssetType[a.type] = (byAssetType[a.type] ?? 0) + 1;
      byAssetStatus[a.status] = (byAssetStatus[a.status] ?? 0) + 1;
    }
    for (const a of audits) {
      byAuditStatus[a.status] = (byAuditStatus[a.status] ?? 0) + 1;
    }
    for (const c of consistencies) {
      byConsistencyStatus[c.status] = (byConsistencyStatus[c.status] ?? 0) + 1;
      byConsistencySeverity[c.severity] = (byConsistencySeverity[c.severity] ?? 0) + 1;
    }
    return {
      guidelineCount: guidelines.length,
      assetCount: assets.length,
      auditCount: audits.length,
      consistencyCount: consistencies.length,
      byGuidelineCategory, byGuidelineStatus,
      byAssetType, byAssetStatus,
      byAuditStatus,
      byConsistencyStatus, byConsistencySeverity,
    };
  },
};
