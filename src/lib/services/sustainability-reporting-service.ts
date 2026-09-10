import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SustainabilityReportType = 'annual' | 'esg' | 'sustainability' | 'impact' | 'integrated' | 'climate' | 'diversity' | 'supply_chain';
export type SustainabilityReportStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
export type ReportingFrameworkType = 'gri' | 'sasb' | 'tcfd' | 'cdp' | 'un_gc' | 'sdg' | 'iso_26000' | 'csrd' | 'ifrs_sustainability';
export type ReportingFrameworkStatus = 'active' | 'adopted' | 'evaluating' | 'deprecated' | 'archived';
export type SustainabilityDisclosureType = 'environmental' | 'social' | 'governance' | 'climate' | 'diversity' | 'human_rights' | 'labor' | 'anti_corruption' | 'supply_chain';
export type SustainabilityDisclosureStatus = 'draft' | 'submitted' | 'verified' | 'published' | 'archived';
export type AssuranceEngagementType = 'limited' | 'reasonable' | 'verification' | 'audit' | 'review' | 'agreed_procedures';
export type AssuranceEngagementStatus = 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

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

export interface SustainabilityReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: SustainabilityReportType;
  description: string;
  status: SustainabilityReportStatus;
  period: string;
  framework: string;
  author: string;
  publishDate: Date | null;
  audience: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportingFramework {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ReportingFrameworkType;
  description: string;
  status: ReportingFrameworkStatus;
  version: string;
  requirements: string;
  adoptionDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SustainabilityDisclosure {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: SustainabilityDisclosureType;
  description: string;
  status: SustainabilityDisclosureStatus;
  framework: string;
  metric: string;
  value: string;
  unit: string;
  period: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssuranceEngagement {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AssuranceEngagementType;
  description: string;
  status: AssuranceEngagementStatus;
  provider: string;
  startDate: Date | null;
  endDate: Date | null;
  scope: string;
  opinion: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SustainabilityReportingMetrics {
  publishedReports: number;
  activeFrameworks: number;
  publishedDisclosures: number;
  completedAssurances: number;
  draftReports: number;
}

export interface SustainabilityReportingStats {
  reportCount: number;
  frameworkCount: number;
  disclosureCount: number;
  assuranceCount: number;
  byReportType: Record<string, number>;
  byReportStatus: Record<string, number>;
  byFrameworkType: Record<string, number>;
  byFrameworkStatus: Record<string, number>;
  byDisclosureType: Record<string, number>;
  byDisclosureStatus: Record<string, number>;
  byAssuranceType: Record<string, number>;
  byAssuranceStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateSustainabilityReportInput {
  name: string;
  type: SustainabilityReportType;
  description?: string;
  status?: SustainabilityReportStatus;
  period?: string;
  framework?: string;
  author?: string;
  publishDate?: string;
  audience?: string;
  notes?: string;
}

export interface UpdateSustainabilityReportInput {
  name?: string;
  type?: SustainabilityReportType;
  description?: string;
  status?: SustainabilityReportStatus;
  period?: string;
  framework?: string;
  author?: string;
  publishDate?: string;
  audience?: string;
  notes?: string;
}

export interface ListSustainabilityReportsOpts {
  type?: SustainabilityReportType;
  status?: SustainabilityReportStatus;
}

export interface CreateReportingFrameworkInput {
  name: string;
  type: ReportingFrameworkType;
  description?: string;
  status?: ReportingFrameworkStatus;
  version?: string;
  requirements?: string;
  adoptionDate?: string;
  notes?: string;
}

export interface UpdateReportingFrameworkInput {
  name?: string;
  type?: ReportingFrameworkType;
  description?: string;
  status?: ReportingFrameworkStatus;
  version?: string;
  requirements?: string;
  adoptionDate?: string;
  notes?: string;
}

export interface ListReportingFrameworksOpts {
  type?: ReportingFrameworkType;
  status?: ReportingFrameworkStatus;
}

export interface CreateSustainabilityDisclosureInput {
  name: string;
  type: SustainabilityDisclosureType;
  description?: string;
  status?: SustainabilityDisclosureStatus;
  framework?: string;
  metric?: string;
  value?: string;
  unit?: string;
  period?: string;
  notes?: string;
}

export interface UpdateSustainabilityDisclosureInput {
  name?: string;
  type?: SustainabilityDisclosureType;
  description?: string;
  status?: SustainabilityDisclosureStatus;
  framework?: string;
  metric?: string;
  value?: string;
  unit?: string;
  period?: string;
  notes?: string;
}

export interface ListSustainabilityDisclosuresOpts {
  type?: SustainabilityDisclosureType;
  status?: SustainabilityDisclosureStatus;
}

export interface CreateAssuranceEngagementInput {
  name: string;
  type: AssuranceEngagementType;
  description?: string;
  status?: AssuranceEngagementStatus;
  provider?: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
  opinion?: string;
  notes?: string;
}

export interface UpdateAssuranceEngagementInput {
  name?: string;
  type?: AssuranceEngagementType;
  description?: string;
  status?: AssuranceEngagementStatus;
  provider?: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
  opinion?: string;
  notes?: string;
}

export interface ListAssuranceEngagementsOpts {
  type?: AssuranceEngagementType;
  status?: AssuranceEngagementStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toSustainabilityReport(row: MemoryRow): SustainabilityReport {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as SustainabilityReportType) ?? 'annual',
    description: (c.description as string) ?? '',
    status: (c.status as SustainabilityReportStatus) ?? 'draft',
    period: (c.period as string) ?? '',
    framework: (c.framework as string) ?? '',
    author: (c.author as string) ?? '',
    publishDate: c.publishDate ? new Date(c.publishDate as string) : null,
    audience: (c.audience as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toReportingFramework(row: MemoryRow): ReportingFramework {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ReportingFrameworkType) ?? 'gri',
    description: (c.description as string) ?? '',
    status: (c.status as ReportingFrameworkStatus) ?? 'active',
    version: (c.version as string) ?? '',
    requirements: (c.requirements as string) ?? '',
    adoptionDate: c.adoptionDate ? new Date(c.adoptionDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSustainabilityDisclosure(row: MemoryRow): SustainabilityDisclosure {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as SustainabilityDisclosureType) ?? 'environmental',
    description: (c.description as string) ?? '',
    status: (c.status as SustainabilityDisclosureStatus) ?? 'draft',
    framework: (c.framework as string) ?? '',
    metric: (c.metric as string) ?? '',
    value: (c.value as string) ?? '',
    unit: (c.unit as string) ?? '',
    period: (c.period as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAssuranceEngagement(row: MemoryRow): AssuranceEngagement {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AssuranceEngagementType) ?? 'limited',
    description: (c.description as string) ?? '',
    status: (c.status as AssuranceEngagementStatus) ?? 'planned',
    provider: (c.provider as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    scope: (c.scope as string) ?? '',
    opinion: (c.opinion as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const SustainabilityReportingService = {
  // ── Sustainability Reports ──

  async createSustainabilityReport(organizationId: string, workspaceId: string, input: CreateSustainabilityReportInput, createdBy: string): Promise<SustainabilityReport> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      period: input.period ?? '',
      framework: input.framework ?? '',
      author: input.author ?? '',
      publishDate: input.publishDate ?? null,
      audience: input.audience ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'sustainability_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['sustainability_report', content.type, content.status]),
        createdBy,
      },
    });
    return toSustainabilityReport(row as MemoryRow);
  },

  async getSustainabilityReport(id: string): Promise<SustainabilityReport | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'sustainability_report') return null;
    return toSustainabilityReport(row as MemoryRow);
  },

  async listSustainabilityReports(organizationId: string, opts: ListSustainabilityReportsOpts = {}): Promise<SustainabilityReport[]> {
    const where: Record<string, unknown> = { organizationId, type: 'sustainability_report' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSustainabilityReport);
  },

  async updateSustainabilityReport(id: string, input: UpdateSustainabilityReportInput): Promise<SustainabilityReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.framework !== undefined && { framework: input.framework }),
      ...(input.author !== undefined && { author: input.author }),
      ...(input.publishDate !== undefined && { publishDate: input.publishDate }),
      ...(input.audience !== undefined && { audience: input.audience }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['sustainability_report', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSustainabilityReport(row as MemoryRow);
  },

  async deleteSustainabilityReport(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reviewSustainabilityReport(id: string, _reviewedBy: string): Promise<SustainabilityReport | null> {
    return SustainabilityReportingService.updateSustainabilityReport(id, { status: 'in_review' });
  },

  async approveSustainabilityReport(id: string, _approvedBy: string): Promise<SustainabilityReport | null> {
    return SustainabilityReportingService.updateSustainabilityReport(id, { status: 'approved' });
  },

  async publishSustainabilityReport(id: string, _publishedBy: string): Promise<SustainabilityReport | null> {
    return SustainabilityReportingService.updateSustainabilityReport(id, { status: 'published', publishDate: new Date().toISOString() });
  },

  async archiveSustainabilityReport(id: string, _archivedBy: string): Promise<SustainabilityReport | null> {
    return SustainabilityReportingService.updateSustainabilityReport(id, { status: 'archived' });
  },

  // ── Reporting Frameworks ──

  async createReportingFramework(organizationId: string, workspaceId: string, input: CreateReportingFrameworkInput, createdBy: string): Promise<ReportingFramework> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      version: input.version ?? '',
      requirements: input.requirements ?? '',
      adoptionDate: input.adoptionDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'reporting_framework',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['reporting_framework', content.type, content.status]),
        createdBy,
      },
    });
    return toReportingFramework(row as MemoryRow);
  },

  async getReportingFramework(id: string): Promise<ReportingFramework | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'reporting_framework') return null;
    return toReportingFramework(row as MemoryRow);
  },

  async listReportingFrameworks(organizationId: string, opts: ListReportingFrameworksOpts = {}): Promise<ReportingFramework[]> {
    const where: Record<string, unknown> = { organizationId, type: 'reporting_framework' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toReportingFramework);
  },

  async updateReportingFramework(id: string, input: UpdateReportingFrameworkInput): Promise<ReportingFramework | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.requirements !== undefined && { requirements: input.requirements }),
      ...(input.adoptionDate !== undefined && { adoptionDate: input.adoptionDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['reporting_framework', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toReportingFramework(row as MemoryRow);
  },

  async deleteReportingFramework(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async adoptReportingFramework(id: string, _adoptedBy: string): Promise<ReportingFramework | null> {
    return SustainabilityReportingService.updateReportingFramework(id, { status: 'adopted', adoptionDate: new Date().toISOString() });
  },

  async evaluateReportingFramework(id: string, _evaluatedBy: string): Promise<ReportingFramework | null> {
    return SustainabilityReportingService.updateReportingFramework(id, { status: 'evaluating' });
  },

  async deprecateReportingFramework(id: string, _deprecatedBy: string): Promise<ReportingFramework | null> {
    return SustainabilityReportingService.updateReportingFramework(id, { status: 'deprecated' });
  },

  async archiveReportingFramework(id: string, _archivedBy: string): Promise<ReportingFramework | null> {
    return SustainabilityReportingService.updateReportingFramework(id, { status: 'archived' });
  },

  // ── Sustainability Disclosures ──

  async createSustainabilityDisclosure(organizationId: string, workspaceId: string, input: CreateSustainabilityDisclosureInput, createdBy: string): Promise<SustainabilityDisclosure> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      framework: input.framework ?? '',
      metric: input.metric ?? '',
      value: input.value ?? '',
      unit: input.unit ?? '',
      period: input.period ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'sustainability_disclosure',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['sustainability_disclosure', content.type, content.status]),
        createdBy,
      },
    });
    return toSustainabilityDisclosure(row as MemoryRow);
  },

  async getSustainabilityDisclosure(id: string): Promise<SustainabilityDisclosure | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'sustainability_disclosure') return null;
    return toSustainabilityDisclosure(row as MemoryRow);
  },

  async listSustainabilityDisclosures(organizationId: string, opts: ListSustainabilityDisclosuresOpts = {}): Promise<SustainabilityDisclosure[]> {
    const where: Record<string, unknown> = { organizationId, type: 'sustainability_disclosure' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSustainabilityDisclosure);
  },

  async updateSustainabilityDisclosure(id: string, input: UpdateSustainabilityDisclosureInput): Promise<SustainabilityDisclosure | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.framework !== undefined && { framework: input.framework }),
      ...(input.metric !== undefined && { metric: input.metric }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['sustainability_disclosure', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSustainabilityDisclosure(row as MemoryRow);
  },

  async deleteSustainabilityDisclosure(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitSustainabilityDisclosure(id: string, _submittedBy: string): Promise<SustainabilityDisclosure | null> {
    return SustainabilityReportingService.updateSustainabilityDisclosure(id, { status: 'submitted' });
  },

  async verifySustainabilityDisclosure(id: string, _verifiedBy: string): Promise<SustainabilityDisclosure | null> {
    return SustainabilityReportingService.updateSustainabilityDisclosure(id, { status: 'verified' });
  },

  async publishSustainabilityDisclosure(id: string, _publishedBy: string): Promise<SustainabilityDisclosure | null> {
    return SustainabilityReportingService.updateSustainabilityDisclosure(id, { status: 'published' });
  },

  async archiveSustainabilityDisclosure(id: string, _archivedBy: string): Promise<SustainabilityDisclosure | null> {
    return SustainabilityReportingService.updateSustainabilityDisclosure(id, { status: 'archived' });
  },

  // ── Assurance Engagements ──

  async createAssuranceEngagement(organizationId: string, workspaceId: string, input: CreateAssuranceEngagementInput, createdBy: string): Promise<AssuranceEngagement> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      provider: input.provider ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      scope: input.scope ?? '',
      opinion: input.opinion ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'assurance_engagement',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['assurance_engagement', content.type, content.status]),
        createdBy,
      },
    });
    return toAssuranceEngagement(row as MemoryRow);
  },

  async getAssuranceEngagement(id: string): Promise<AssuranceEngagement | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'assurance_engagement') return null;
    return toAssuranceEngagement(row as MemoryRow);
  },

  async listAssuranceEngagements(organizationId: string, opts: ListAssuranceEngagementsOpts = {}): Promise<AssuranceEngagement[]> {
    const where: Record<string, unknown> = { organizationId, type: 'assurance_engagement' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAssuranceEngagement);
  },

  async updateAssuranceEngagement(id: string, input: UpdateAssuranceEngagementInput): Promise<AssuranceEngagement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.opinion !== undefined && { opinion: input.opinion }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['assurance_engagement', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAssuranceEngagement(row as MemoryRow);
  },

  async deleteAssuranceEngagement(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startAssuranceEngagement(id: string, _startedBy: string): Promise<AssuranceEngagement | null> {
    return SustainabilityReportingService.updateAssuranceEngagement(id, { status: 'in_progress', startDate: new Date().toISOString() });
  },

  async completeAssuranceEngagement(id: string, _completedBy: string): Promise<AssuranceEngagement | null> {
    return SustainabilityReportingService.updateAssuranceEngagement(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async failAssuranceEngagement(id: string, _failedBy: string): Promise<AssuranceEngagement | null> {
    return SustainabilityReportingService.updateAssuranceEngagement(id, { status: 'failed', endDate: new Date().toISOString() });
  },

  async cancelAssuranceEngagement(id: string, _cancelledBy: string): Promise<AssuranceEngagement | null> {
    return SustainabilityReportingService.updateAssuranceEngagement(id, { status: 'cancelled' });
  },

  // ── Metrics & Stats ──

  async getSustainabilityReportingMetrics(organizationId: string): Promise<SustainabilityReportingMetrics> {
    const [reports, frameworks, disclosures, assurances] = await Promise.all([
      SustainabilityReportingService.listSustainabilityReports(organizationId),
      SustainabilityReportingService.listReportingFrameworks(organizationId),
      SustainabilityReportingService.listSustainabilityDisclosures(organizationId),
      SustainabilityReportingService.listAssuranceEngagements(organizationId),
    ]);
    return {
      publishedReports: reports.filter((r) => r.status === 'published').length,
      activeFrameworks: frameworks.filter((f) => f.status === 'active' || f.status === 'adopted').length,
      publishedDisclosures: disclosures.filter((d) => d.status === 'published').length,
      completedAssurances: assurances.filter((a) => a.status === 'completed').length,
      draftReports: reports.filter((r) => r.status === 'draft').length,
    };
  },

  async getSustainabilityReportingStats(organizationId: string): Promise<SustainabilityReportingStats> {
    const [reports, frameworks, disclosures, assurances] = await Promise.all([
      SustainabilityReportingService.listSustainabilityReports(organizationId),
      SustainabilityReportingService.listReportingFrameworks(organizationId),
      SustainabilityReportingService.listSustainabilityDisclosures(organizationId),
      SustainabilityReportingService.listAssuranceEngagements(organizationId),
    ]);
    const byReportType: Record<string, number> = {};
    const byReportStatus: Record<string, number> = {};
    const byFrameworkType: Record<string, number> = {};
    const byFrameworkStatus: Record<string, number> = {};
    const byDisclosureType: Record<string, number> = {};
    const byDisclosureStatus: Record<string, number> = {};
    const byAssuranceType: Record<string, number> = {};
    const byAssuranceStatus: Record<string, number> = {};
    for (const r of reports) { byReportType[r.type] = (byReportType[r.type] ?? 0) + 1; byReportStatus[r.status] = (byReportStatus[r.status] ?? 0) + 1; }
    for (const f of frameworks) { byFrameworkType[f.type] = (byFrameworkType[f.type] ?? 0) + 1; byFrameworkStatus[f.status] = (byFrameworkStatus[f.status] ?? 0) + 1; }
    for (const d of disclosures) { byDisclosureType[d.type] = (byDisclosureType[d.type] ?? 0) + 1; byDisclosureStatus[d.status] = (byDisclosureStatus[d.status] ?? 0) + 1; }
    for (const a of assurances) { byAssuranceType[a.type] = (byAssuranceType[a.type] ?? 0) + 1; byAssuranceStatus[a.status] = (byAssuranceStatus[a.status] ?? 0) + 1; }
    return {
      reportCount: reports.length,
      frameworkCount: frameworks.length,
      disclosureCount: disclosures.length,
      assuranceCount: assurances.length,
      byReportType, byReportStatus, byFrameworkType, byFrameworkStatus, byDisclosureType, byDisclosureStatus, byAssuranceType, byAssuranceStatus,
    };
  },
};
