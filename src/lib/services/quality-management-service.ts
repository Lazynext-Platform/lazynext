import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type StandardType =
  | 'ISO 9001'
  | 'ISO 14001'
  | 'ISO 27001'
  | 'Six Sigma'
  | 'Lean'
  | 'custom';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type NonconformanceSeverity = 'minor' | 'major' | 'critical';
export type NonconformanceStatus = 'open' | 'investigating' | 'in_review' | 'closed';
export type CAPAType = 'corrective' | 'preventive' | 'both';
export type CAPAStatus = 'open' | 'in_progress' | 'pending_verification' | 'completed' | 'verified' | 'cancelled';
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/** Raw Memory row as stored in the database. */
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Parsed content payload for a quality standard Memory. */
interface StandardContent {
  name: string;
  standard: StandardType;
  description: string;
  requirements: string[];
  version: string;
  isActive: boolean;
}

/** Parsed content payload for an inspection Memory. */
interface InspectionContent {
  standardId: string | null;
  title: string;
  description: string;
  inspector: string;
  date: string;
  items: Array<{ name: string; passed: boolean; notes?: string }>;
  status: InspectionStatus;
  passRate: number;
  passedCount: number;
  failedCount: number;
  totalCount: number;
}

/** Parsed content payload for a nonconformance Memory. */
interface NonconformanceContent {
  inspectionId: string | null;
  title: string;
  description: string;
  severity: NonconformanceSeverity;
  category: string;
  status: NonconformanceStatus;
  detectedBy: string;
  detectedDate: string;
  affectedProduct: string;
  affectedProcess: string;
  resolution: string | null;
  closedAt: string | null;
}

/** Parsed content payload for a CAPA Memory. */
interface CAPAContent {
  nonconformanceId: string | null;
  title: string;
  description: string;
  type: CAPAType;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  assignedTo: string;
  dueDate: string | null;
  status: CAPAStatus;
  completedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  results: string | null;
}

/** Parsed content payload for an audit Memory. */
interface AuditContent {
  standardId: string | null;
  title: string;
  auditor: string;
  date: string;
  scope: string;
  criteria: string;
  status: AuditStatus;
  findings: Array<{ description: string; severity: NonconformanceSeverity; recommendation?: string }>;
  completedAt: string | null;
}

/** Parsed content payload for a root cause analysis Memory. */
interface RootCauseContent {
  nonconformanceId: string | null;
  problem: string;
  method: string;
  rootCause: string;
  contributingFactors: string[];
  recommendations: string[];
}

// ── Returned structures ──

export interface QualityStandard {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  standard: StandardType;
  description: string;
  requirements: string[];
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inspection {
  id: string;
  organizationId: string;
  workspaceId: string;
  standardId: string | null;
  title: string;
  description: string;
  inspector: string;
  date: string;
  items: Array<{ name: string; passed: boolean; notes?: string }>;
  status: InspectionStatus;
  passRate: number;
  passedCount: number;
  failedCount: number;
  totalCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Nonconformance {
  id: string;
  organizationId: string;
  workspaceId: string;
  inspectionId: string | null;
  title: string;
  description: string;
  severity: NonconformanceSeverity;
  category: string;
  status: NonconformanceStatus;
  detectedBy: string;
  detectedDate: string;
  affectedProduct: string;
  affectedProcess: string;
  resolution: string | null;
  closedAt: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CAPA {
  id: string;
  organizationId: string;
  workspaceId: string;
  nonconformanceId: string | null;
  title: string;
  description: string;
  type: CAPAType;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  assignedTo: string;
  dueDate: string | null;
  status: CAPAStatus;
  completedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  results: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityAudit {
  id: string;
  organizationId: string;
  workspaceId: string;
  standardId: string | null;
  title: string;
  auditor: string;
  date: string;
  scope: string;
  criteria: string;
  status: AuditStatus;
  findings: Array<{ description: string; severity: NonconformanceSeverity; recommendation?: string }>;
  completedAt: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RootCauseAnalysis {
  id: string;
  organizationId: string;
  workspaceId: string;
  nonconformanceId: string | null;
  problem: string;
  method: string;
  rootCause: string;
  contributingFactors: string[];
  recommendations: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Inputs ──

export interface CreateStandardInput {
  name: string;
  standard?: StandardType;
  description?: string;
  requirements?: string[];
  version?: string;
  isActive?: boolean;
}

export interface UpdateStandardInput {
  name?: string;
  standard?: StandardType;
  description?: string;
  requirements?: string[];
  version?: string;
  isActive?: boolean;
}

export interface ListStandardsOpts {
  standard?: StandardType;
  isActive?: boolean;
}

export interface InspectionItem {
  name: string;
  passed: boolean;
  notes?: string;
}

export interface CreateInspectionInput {
  standardId?: string;
  title: string;
  description?: string;
  inspector: string;
  date: string;
  items: InspectionItem[];
  status?: InspectionStatus;
}

export interface UpdateInspectionInput {
  standardId?: string;
  title?: string;
  description?: string;
  inspector?: string;
  date?: string;
  items?: InspectionItem[];
  status?: InspectionStatus;
}

export interface ListInspectionsOpts {
  standardId?: string;
  status?: InspectionStatus;
  inspector?: string;
}

export interface CompleteInspectionResults {
  items?: InspectionItem[];
  status?: InspectionStatus;
  notes?: string;
}

export interface CreateNonconformanceInput {
  inspectionId?: string;
  title: string;
  description?: string;
  severity?: NonconformanceSeverity;
  category?: string;
  detectedBy: string;
  detectedDate: string;
  affectedProduct?: string;
  affectedProcess?: string;
}

export interface UpdateNonconformanceInput {
  title?: string;
  description?: string;
  severity?: NonconformanceSeverity;
  category?: string;
  status?: NonconformanceStatus;
  affectedProduct?: string;
  affectedProcess?: string;
}

export interface ListNonconformancesOpts {
  status?: NonconformanceStatus;
  severity?: NonconformanceSeverity;
}

export interface CreateCAPAInput {
  nonconformanceId?: string;
  title: string;
  description?: string;
  type: CAPAType;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  assignedTo?: string;
  dueDate?: string;
  status?: CAPAStatus;
}

export interface UpdateCAPAInput {
  title?: string;
  description?: string;
  type?: CAPAType;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  assignedTo?: string;
  dueDate?: string;
  status?: CAPAStatus;
}

export interface ListCAPAsOpts {
  status?: CAPAStatus;
  type?: CAPAType;
}

export interface CompleteCAPAResults {
  results?: string;
  correctiveAction?: string;
  preventiveAction?: string;
}

export interface CreateAuditInput {
  standardId?: string;
  title: string;
  auditor: string;
  date: string;
  scope: string;
  criteria?: string;
  status?: AuditStatus;
}

export interface UpdateAuditInput {
  standardId?: string;
  title?: string;
  auditor?: string;
  date?: string;
  scope?: string;
  criteria?: string;
  status?: AuditStatus;
}

export interface ListAuditsOpts {
  status?: AuditStatus;
  standardId?: string;
}

export interface AuditFinding {
  description: string;
  severity: NonconformanceSeverity;
  recommendation?: string;
}

export interface CompleteAuditFindings {
  findings?: AuditFinding[];
  status?: AuditStatus;
}

export interface CreateRootCauseInput {
  nonconformanceId?: string;
  problem: string;
  method?: string;
  rootCause: string;
  contributingFactors: string[];
  recommendations: string[];
}

export interface ListRootCauseOpts {
  nonconformanceId?: string;
}

export interface QualityMetrics {
  inspectionPassRate: number;
  totalInspections: number;
  openNonconformances: number;
  openCAPAs: number;
  auditCompletionRate: number;
  totalAudits: number;
  criticalNonconformances: number;
}

export interface QualityStats {
  standardCount: number;
  activeStandardCount: number;
  inspectionCount: number;
  completedInspectionCount: number;
  nonconformanceCount: number;
  openNonconformanceCount: number;
  capaCount: number;
  openCAPACount: number;
  auditCount: number;
  completedAuditCount: number;
  rootCauseCount: number;
  inspectionPassRate: number;
  auditCompletionRate: number;
}

// ── Helpers ──

const fallbackStandardContent: StandardContent = {
  name: '',
  standard: 'custom',
  description: '',
  requirements: [],
  version: '1.0',
  isActive: true,
};

const fallbackInspectionContent: InspectionContent = {
  standardId: null,
  title: '',
  description: '',
  inspector: '',
  date: '',
  items: [],
  status: 'scheduled',
  passRate: 0,
  passedCount: 0,
  failedCount: 0,
  totalCount: 0,
};

const fallbackNonconformanceContent: NonconformanceContent = {
  inspectionId: null,
  title: '',
  description: '',
  severity: 'minor',
  category: '',
  status: 'open',
  detectedBy: '',
  detectedDate: '',
  affectedProduct: '',
  affectedProcess: '',
  resolution: null,
  closedAt: null,
};

const fallbackCAPAContent: CAPAContent = {
  nonconformanceId: null,
  title: '',
  description: '',
  type: 'corrective',
  rootCause: '',
  correctiveAction: '',
  preventiveAction: '',
  assignedTo: '',
  dueDate: null,
  status: 'open',
  completedAt: null,
  verifiedBy: null,
  verifiedAt: null,
  results: null,
};

const fallbackAuditContent: AuditContent = {
  standardId: null,
  title: '',
  auditor: '',
  date: '',
  scope: '',
  criteria: '',
  status: 'scheduled',
  findings: [],
  completedAt: null,
};

const fallbackRootCauseContent: RootCauseContent = {
  nonconformanceId: null,
  problem: '',
  method: '',
  rootCause: '',
  contributingFactors: [],
  recommendations: [],
};

function parseStandardContent(raw: string): StandardContent {
  if (!raw) return fallbackStandardContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      standard: (parsed.standard as StandardType) ?? 'custom',
      description: parsed.description ?? '',
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      version: parsed.version ?? '1.0',
      isActive: parsed.isActive !== undefined ? Boolean(parsed.isActive) : true,
    };
  } catch {
    return fallbackStandardContent;
  }
}

function parseInspectionContent(raw: string): InspectionContent {
  if (!raw) return fallbackInspectionContent;
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      standardId: parsed.standardId ?? null,
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      inspector: parsed.inspector ?? '',
      date: parsed.date ?? '',
      items,
      status: (parsed.status as InspectionStatus) ?? 'scheduled',
      passRate: Number(parsed.passRate) || 0,
      passedCount: Number(parsed.passedCount) || 0,
      failedCount: Number(parsed.failedCount) || 0,
      totalCount: Number(parsed.totalCount) || 0,
    };
  } catch {
    return fallbackInspectionContent;
  }
}

function parseNonconformanceContent(raw: string): NonconformanceContent {
  if (!raw) return fallbackNonconformanceContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      inspectionId: parsed.inspectionId ?? null,
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      severity: (parsed.severity as NonconformanceSeverity) ?? 'minor',
      category: parsed.category ?? '',
      status: (parsed.status as NonconformanceStatus) ?? 'open',
      detectedBy: parsed.detectedBy ?? '',
      detectedDate: parsed.detectedDate ?? '',
      affectedProduct: parsed.affectedProduct ?? '',
      affectedProcess: parsed.affectedProcess ?? '',
      resolution: parsed.resolution ?? null,
      closedAt: parsed.closedAt ?? null,
    };
  } catch {
    return fallbackNonconformanceContent;
  }
}

function parseCAPAContent(raw: string): CAPAContent {
  if (!raw) return fallbackCAPAContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      nonconformanceId: parsed.nonconformanceId ?? null,
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as CAPAType) ?? 'corrective',
      rootCause: parsed.rootCause ?? '',
      correctiveAction: parsed.correctiveAction ?? '',
      preventiveAction: parsed.preventiveAction ?? '',
      assignedTo: parsed.assignedTo ?? '',
      dueDate: parsed.dueDate ?? null,
      status: (parsed.status as CAPAStatus) ?? 'open',
      completedAt: parsed.completedAt ?? null,
      verifiedBy: parsed.verifiedBy ?? null,
      verifiedAt: parsed.verifiedAt ?? null,
      results: parsed.results ?? null,
    };
  } catch {
    return fallbackCAPAContent;
  }
}

function parseAuditContent(raw: string): AuditContent {
  if (!raw) return fallbackAuditContent;
  try {
    const parsed = JSON.parse(raw);
    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    return {
      standardId: parsed.standardId ?? null,
      title: parsed.title ?? '',
      auditor: parsed.auditor ?? '',
      date: parsed.date ?? '',
      scope: parsed.scope ?? '',
      criteria: parsed.criteria ?? '',
      status: (parsed.status as AuditStatus) ?? 'scheduled',
      findings,
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    return fallbackAuditContent;
  }
}

function parseRootCauseContent(raw: string): RootCauseContent {
  if (!raw) return fallbackRootCauseContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      nonconformanceId: parsed.nonconformanceId ?? null,
      problem: parsed.problem ?? '',
      method: parsed.method ?? '',
      rootCause: parsed.rootCause ?? '',
      contributingFactors: Array.isArray(parsed.contributingFactors) ? parsed.contributingFactors : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  } catch {
    return fallbackRootCauseContent;
  }
}

function toStandard(row: MemoryRow): QualityStandard {
  const content = parseStandardContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    standard: content.standard,
    description: content.description,
    requirements: content.requirements,
    version: content.version,
    isActive: content.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toInspection(row: MemoryRow): Inspection {
  const content = parseInspectionContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    standardId: content.standardId,
    title: content.title,
    description: content.description,
    inspector: content.inspector,
    date: content.date,
    items: content.items,
    status: content.status,
    passRate: content.passRate,
    passedCount: content.passedCount,
    failedCount: content.failedCount,
    totalCount: content.totalCount,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toNonconformance(row: MemoryRow): Nonconformance {
  const content = parseNonconformanceContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    inspectionId: content.inspectionId,
    title: content.title,
    description: content.description,
    severity: content.severity,
    category: content.category,
    status: content.status,
    detectedBy: content.detectedBy,
    detectedDate: content.detectedDate,
    affectedProduct: content.affectedProduct,
    affectedProcess: content.affectedProcess,
    resolution: content.resolution,
    closedAt: content.closedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCAPA(row: MemoryRow): CAPA {
  const content = parseCAPAContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    nonconformanceId: content.nonconformanceId,
    title: content.title,
    description: content.description,
    type: content.type,
    rootCause: content.rootCause,
    correctiveAction: content.correctiveAction,
    preventiveAction: content.preventiveAction,
    assignedTo: content.assignedTo,
    dueDate: content.dueDate,
    status: content.status,
    completedAt: content.completedAt,
    verifiedBy: content.verifiedBy,
    verifiedAt: content.verifiedAt,
    results: content.results,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAudit(row: MemoryRow): QualityAudit {
  const content = parseAuditContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    standardId: content.standardId,
    title: content.title,
    auditor: content.auditor,
    date: content.date,
    scope: content.scope,
    criteria: content.criteria,
    status: content.status,
    findings: content.findings,
    completedAt: content.completedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRootCause(row: MemoryRow): RootCauseAnalysis {
  const content = parseRootCauseContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    nonconformanceId: content.nonconformanceId,
    problem: content.problem,
    method: content.method,
    rootCause: content.rootCause,
    contributingFactors: content.contributingFactors,
    recommendations: content.recommendations,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Compute pass-rate metrics for a set of inspection items. */
function computeItemMetrics(items: InspectionItem[]): {
  passRate: number;
  passedCount: number;
  failedCount: number;
  totalCount: number;
} {
  const totalCount = items.length;
  const passedCount = items.filter((i) => i.passed).length;
  const failedCount = totalCount - passedCount;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 10000) / 100 : 0;
  return { passRate, passedCount, failedCount, totalCount };
}

// ── Quality Management Service ──

export const QualityManagementService = {
  // ── Standards ──

  async createStandard(
    organizationId: string,
    workspaceId: string,
    input: CreateStandardInput,
    createdBy: string,
  ): Promise<QualityStandard> {
    const content: StandardContent = {
      name: input.name,
      standard: input.standard ?? 'custom',
      description: input.description ?? '',
      requirements: Array.isArray(input.requirements) ? input.requirements : [],
      version: input.version ?? '1.0',
      isActive: input.isActive ?? true,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'quality_standard',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['quality_standard', content.standard]),
        createdBy,
      },
    });

    return toStandard(row as MemoryRow);
  },

  async getStandard(id: string): Promise<QualityStandard | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toStandard(row as MemoryRow);
  },

  async listStandards(
    organizationId: string,
    opts: ListStandardsOpts = {},
  ): Promise<QualityStandard[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'quality_standard',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let standards = rows.map((r) => toStandard(r as MemoryRow));

    if (opts.standard) {
      standards = standards.filter((s) => s.standard === opts.standard);
    }
    if (opts.isActive !== undefined) {
      standards = standards.filter((s) => s.isActive === opts.isActive);
    }

    return standards;
  },

  async updateStandard(id: string, input: UpdateStandardInput): Promise<QualityStandard | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseStandardContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.standard !== undefined) content.standard = input.standard;
    if (input.description !== undefined) content.description = input.description;
    if (input.requirements !== undefined) content.requirements = input.requirements;
    if (input.version !== undefined) content.version = input.version;
    if (input.isActive !== undefined) content.isActive = input.isActive;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['quality_standard', content.standard]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toStandard(row as MemoryRow);
  },

  async deleteStandard(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Inspections ──

  async createInspection(
    organizationId: string,
    workspaceId: string,
    input: CreateInspectionInput,
    createdBy: string,
  ): Promise<Inspection> {
    const items = Array.isArray(input.items) ? input.items : [];
    const metrics = computeItemMetrics(items);
    const content: InspectionContent = {
      standardId: input.standardId ?? null,
      title: input.title,
      description: input.description ?? '',
      inspector: input.inspector,
      date: input.date,
      items,
      status: input.status ?? 'scheduled',
      ...metrics,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'quality_inspection',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.standardId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['quality_inspection', content.status, content.inspector]),
        createdBy,
      },
    });

    return toInspection(row as MemoryRow);
  },

  async getInspection(id: string): Promise<Inspection | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toInspection(row as MemoryRow);
  },

  async listInspections(
    organizationId: string,
    opts: ListInspectionsOpts = {},
  ): Promise<Inspection[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'quality_inspection',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let inspections = rows.map((r) => toInspection(r as MemoryRow));

    if (opts.standardId) {
      inspections = inspections.filter((i) => i.standardId === opts.standardId);
    }
    if (opts.status) {
      inspections = inspections.filter((i) => i.status === opts.status);
    }
    if (opts.inspector) {
      inspections = inspections.filter((i) => i.inspector === opts.inspector);
    }

    return inspections;
  },

  async updateInspection(id: string, input: UpdateInspectionInput): Promise<Inspection | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseInspectionContent(existing.content);
    if (input.standardId !== undefined) content.standardId = input.standardId;
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.inspector !== undefined) content.inspector = input.inspector;
    if (input.date !== undefined) content.date = input.date;
    if (input.items !== undefined) {
      content.items = input.items;
      const metrics = computeItemMetrics(content.items);
      content.passRate = metrics.passRate;
      content.passedCount = metrics.passedCount;
      content.failedCount = metrics.failedCount;
      content.totalCount = metrics.totalCount;
    }
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['quality_inspection', content.status, content.inspector]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toInspection(row as MemoryRow);
  },

  async completeInspection(id: string, results: CompleteInspectionResults): Promise<Inspection | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseInspectionContent(existing.content);
    if (results.items !== undefined) {
      content.items = results.items;
      const metrics = computeItemMetrics(content.items);
      content.passRate = metrics.passRate;
      content.passedCount = metrics.passedCount;
      content.failedCount = metrics.failedCount;
      content.totalCount = metrics.totalCount;
    }
    content.status = results.status ?? (content.passRate >= 100 ? 'completed' : 'failed');

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['quality_inspection', content.status, content.inspector]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toInspection(row as MemoryRow);
  },

  // ── Nonconformances ──

  async createNonconformance(
    organizationId: string,
    workspaceId: string,
    input: CreateNonconformanceInput,
    createdBy: string,
  ): Promise<Nonconformance> {
    const content: NonconformanceContent = {
      inspectionId: input.inspectionId ?? null,
      title: input.title,
      description: input.description ?? '',
      severity: input.severity ?? 'minor',
      category: input.category ?? '',
      status: 'open',
      detectedBy: input.detectedBy,
      detectedDate: input.detectedDate,
      affectedProduct: input.affectedProduct ?? '',
      affectedProcess: input.affectedProcess ?? '',
      resolution: null,
      closedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'nonconformance',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.inspectionId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['nonconformance', content.status, content.severity]),
        createdBy,
      },
    });

    return toNonconformance(row as MemoryRow);
  },

  async getNonconformance(id: string): Promise<Nonconformance | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toNonconformance(row as MemoryRow);
  },

  async listNonconformances(
    organizationId: string,
    opts: ListNonconformancesOpts = {},
  ): Promise<Nonconformance[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'nonconformance',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let nonconformances = rows.map((r) => toNonconformance(r as MemoryRow));

    if (opts.status) {
      nonconformances = nonconformances.filter((n) => n.status === opts.status);
    }
    if (opts.severity) {
      nonconformances = nonconformances.filter((n) => n.severity === opts.severity);
    }

    return nonconformances;
  },

  async updateNonconformance(id: string, input: UpdateNonconformanceInput): Promise<Nonconformance | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseNonconformanceContent(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.severity !== undefined) content.severity = input.severity;
    if (input.category !== undefined) content.category = input.category;
    if (input.status !== undefined) content.status = input.status;
    if (input.affectedProduct !== undefined) content.affectedProduct = input.affectedProduct;
    if (input.affectedProcess !== undefined) content.affectedProcess = input.affectedProcess;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['nonconformance', content.status, content.severity]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toNonconformance(row as MemoryRow);
  },

  async closeNonconformance(id: string, resolution: string): Promise<Nonconformance | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseNonconformanceContent(existing.content);
    content.status = 'closed';
    content.resolution = resolution;
    content.closedAt = new Date().toISOString();
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['nonconformance', 'closed', content.severity]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toNonconformance(row as MemoryRow);
  },

  // ── CAPAs ──

  async createCAPA(
    organizationId: string,
    workspaceId: string,
    input: CreateCAPAInput,
    createdBy: string,
  ): Promise<CAPA> {
    const content: CAPAContent = {
      nonconformanceId: input.nonconformanceId ?? null,
      title: input.title,
      description: input.description ?? '',
      type: input.type,
      rootCause: input.rootCause ?? '',
      correctiveAction: input.correctiveAction ?? '',
      preventiveAction: input.preventiveAction ?? '',
      assignedTo: input.assignedTo ?? '',
      dueDate: input.dueDate ?? null,
      status: input.status ?? 'open',
      completedAt: null,
      verifiedBy: null,
      verifiedAt: null,
      results: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'capa',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.nonconformanceId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['capa', content.status, content.type]),
        createdBy,
      },
    });

    return toCAPA(row as MemoryRow);
  },

  async getCAPA(id: string): Promise<CAPA | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toCAPA(row as MemoryRow);
  },

  async listCAPAs(
    organizationId: string,
    opts: ListCAPAsOpts = {},
  ): Promise<CAPA[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'capa',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let capas = rows.map((r) => toCAPA(r as MemoryRow));

    if (opts.status) {
      capas = capas.filter((c) => c.status === opts.status);
    }
    if (opts.type) {
      capas = capas.filter((c) => c.type === opts.type);
    }

    return capas;
  },

  async updateCAPA(id: string, input: UpdateCAPAInput): Promise<CAPA | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCAPAContent(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.rootCause !== undefined) content.rootCause = input.rootCause;
    if (input.correctiveAction !== undefined) content.correctiveAction = input.correctiveAction;
    if (input.preventiveAction !== undefined) content.preventiveAction = input.preventiveAction;
    if (input.assignedTo !== undefined) content.assignedTo = input.assignedTo;
    if (input.dueDate !== undefined) content.dueDate = input.dueDate;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['capa', content.status, content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCAPA(row as MemoryRow);
  },

  async completeCAPA(id: string, results: CompleteCAPAResults): Promise<CAPA | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseCAPAContent(existing.content);
    if (results.correctiveAction !== undefined) content.correctiveAction = results.correctiveAction;
    if (results.preventiveAction !== undefined) content.preventiveAction = results.preventiveAction;
    content.results = results.results ?? content.results;
    content.status = 'pending_verification';
    content.completedAt = new Date().toISOString();
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['capa', 'pending_verification', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCAPA(row as MemoryRow);
  },

  async verifyCAPA(id: string, verifiedBy: string): Promise<CAPA | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseCAPAContent(existing.content);
    content.status = 'verified';
    content.verifiedBy = verifiedBy;
    content.verifiedAt = new Date().toISOString();
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['capa', 'verified', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCAPA(row as MemoryRow);
  },

  // ── Audits ──

  async createAudit(
    organizationId: string,
    workspaceId: string,
    input: CreateAuditInput,
    createdBy: string,
  ): Promise<QualityAudit> {
    const content: AuditContent = {
      standardId: input.standardId ?? null,
      title: input.title,
      auditor: input.auditor,
      date: input.date,
      scope: input.scope,
      criteria: input.criteria ?? '',
      status: input.status ?? 'scheduled',
      findings: [],
      completedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'quality_audit',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.standardId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['quality_audit', content.status]),
        createdBy,
      },
    });

    return toAudit(row as MemoryRow);
  },

  async getAudit(id: string): Promise<QualityAudit | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toAudit(row as MemoryRow);
  },

  async listAudits(
    organizationId: string,
    opts: ListAuditsOpts = {},
  ): Promise<QualityAudit[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'quality_audit',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let audits = rows.map((r) => toAudit(r as MemoryRow));

    if (opts.status) {
      audits = audits.filter((a) => a.status === opts.status);
    }
    if (opts.standardId) {
      audits = audits.filter((a) => a.standardId === opts.standardId);
    }

    return audits;
  },

  async updateAudit(id: string, input: UpdateAuditInput): Promise<QualityAudit | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseAuditContent(existing.content);
    if (input.standardId !== undefined) content.standardId = input.standardId;
    if (input.title !== undefined) content.title = input.title;
    if (input.auditor !== undefined) content.auditor = input.auditor;
    if (input.date !== undefined) content.date = input.date;
    if (input.scope !== undefined) content.scope = input.scope;
    if (input.criteria !== undefined) content.criteria = input.criteria;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['quality_audit', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toAudit(row as MemoryRow);
  },

  async completeAudit(id: string, findings: CompleteAuditFindings): Promise<QualityAudit | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseAuditContent(existing.content);
    if (findings.findings !== undefined) content.findings = findings.findings;
    content.status = findings.status ?? 'completed';
    content.completedAt = new Date().toISOString();
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['quality_audit', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toAudit(row as MemoryRow);
  },

  // ── Root Cause Analysis ──

  async createRootCauseAnalysis(
    organizationId: string,
    workspaceId: string,
    input: CreateRootCauseInput,
    createdBy: string,
  ): Promise<RootCauseAnalysis> {
    const content: RootCauseContent = {
      nonconformanceId: input.nonconformanceId ?? null,
      problem: input.problem,
      method: input.method ?? '',
      rootCause: input.rootCause,
      contributingFactors: Array.isArray(input.contributingFactors) ? input.contributingFactors : [],
      recommendations: Array.isArray(input.recommendations) ? input.recommendations : [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'root_cause_analysis',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.nonconformanceId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['root_cause_analysis']),
        createdBy,
      },
    });

    return toRootCause(row as MemoryRow);
  },

  async getRootCauseAnalysis(id: string): Promise<RootCauseAnalysis | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toRootCause(row as MemoryRow);
  },

  async listRootCauseAnalyses(
    organizationId: string,
    opts: ListRootCauseOpts = {},
  ): Promise<RootCauseAnalysis[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'root_cause_analysis',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let analyses = rows.map((r) => toRootCause(r as MemoryRow));

    if (opts.nonconformanceId) {
      analyses = analyses.filter((a) => a.nonconformanceId === opts.nonconformanceId);
    }

    return analyses;
  },

  // ── Metrics & Stats ──

  async getQualityMetrics(organizationId: string): Promise<QualityMetrics> {
    const [inspections, nonconformances, capas, audits] = await Promise.all([
      this.listInspections(organizationId),
      this.listNonconformances(organizationId),
      this.listCAPAs(organizationId),
      this.listAudits(organizationId),
    ]);

    const completedInspections = inspections.filter((i) => i.status === 'completed' || i.status === 'failed');
    const totalPassRate = completedInspections.reduce((sum, i) => sum + i.passRate, 0);
    const inspectionPassRate =
      completedInspections.length > 0
        ? Math.round((totalPassRate / completedInspections.length) * 100) / 100
        : 0;

    const openNonconformances = nonconformances.filter((n) => n.status !== 'closed').length;
    const criticalNonconformances = nonconformances.filter(
      (n) => n.severity === 'critical' && n.status !== 'closed',
    ).length;
    const openCAPAs = capas.filter(
      (c) => c.status !== 'completed' && c.status !== 'verified' && c.status !== 'cancelled',
    ).length;
    const completedAudits = audits.filter((a) => a.status === 'completed').length;
    const auditCompletionRate =
      audits.length > 0 ? Math.round((completedAudits / audits.length) * 10000) / 100 : 0;

    return {
      inspectionPassRate,
      totalInspections: inspections.length,
      openNonconformances,
      openCAPAs,
      auditCompletionRate,
      totalAudits: audits.length,
      criticalNonconformances,
    };
  },

  async getStats(organizationId: string): Promise<QualityStats> {
    const [standards, inspections, nonconformances, capas, audits, rootCauses, metrics] = await Promise.all([
      this.listStandards(organizationId),
      this.listInspections(organizationId),
      this.listNonconformances(organizationId),
      this.listCAPAs(organizationId),
      this.listAudits(organizationId),
      this.listRootCauseAnalyses(organizationId),
      this.getQualityMetrics(organizationId),
    ]);

    const activeStandardCount = standards.filter((s) => s.isActive).length;
    const completedInspectionCount = inspections.filter(
      (i) => i.status === 'completed' || i.status === 'failed',
    ).length;
    const openNonconformanceCount = nonconformances.filter((n) => n.status !== 'closed').length;
    const openCAPACount = capas.filter(
      (c) => c.status !== 'completed' && c.status !== 'verified' && c.status !== 'cancelled',
    ).length;
    const completedAuditCount = audits.filter((a) => a.status === 'completed').length;

    return {
      standardCount: standards.length,
      activeStandardCount,
      inspectionCount: inspections.length,
      completedInspectionCount,
      nonconformanceCount: nonconformances.length,
      openNonconformanceCount,
      capaCount: capas.length,
      openCAPACount,
      auditCount: audits.length,
      completedAuditCount,
      rootCauseCount: rootCauses.length,
      inspectionPassRate: metrics.inspectionPassRate,
      auditCompletionRate: metrics.auditCompletionRate,
    };
  },
};
